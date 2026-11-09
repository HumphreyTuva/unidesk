import { BadRequestException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma.service';
import { StorageService } from '../storage/storage.service';
import { SettingsService } from '../settings/settings.service';
import { UniversityService } from '../common/university.service';
import { UNIT_CODE_RE, normalizeUnitCode } from '../common/unit-code';
import { ListPapersQuery, UploadPaperDto } from './dto';

const isPdf = (b: Buffer) => b.length > 5 && b.subarray(0, 5).toString('latin1') === '%PDF-';
const isJpeg = (b: Buffer) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;

@Injectable()
export class PapersService {
  constructor(
    private db: PrismaService,
    private storage: StorageService,
    private settings: SettingsService,
    private uni: UniversityService,
  ) {}

  // What students see. Nothing here ever mentions price or payment.
  private card(p: { id: string; unitCode: string; title: string; year: number; sitting: string | null; school: string | null; previewKey: string | null }) {
    return { id: p.id, unitCode: p.unitCode, title: p.title, year: p.year, sitting: p.sitting, school: p.school, hasPreview: !!p.previewKey };
  }

  async list(q: ListPapersQuery) {
    const take = q.take ?? 20;
    const term = q.q?.trim();
    const where: any = { universityId: await this.uni.defaultId(), published: true };
    if (q.year) where.year = q.year;
    if (q.school) where.school = q.school;
    if (term) where.OR = [{ unitCode: { contains: normalizeUnitCode(term) } }, { title: { contains: term, mode: 'insensitive' } }];

    const rows = await this.db.paper.findMany({
      where,
      orderBy: [{ year: 'desc' }, { unitCode: 'asc' }, { id: 'asc' }],
      take: take + 1,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
    });
    const more = rows.length > take;
    const items = rows.slice(0, take);
    return { items: items.map(p => this.card(p)), nextCursor: more ? items[items.length - 1].id : null };
  }

  private async published(id: string) {
    const p = await this.db.paper.findUnique({ where: { id } });
    if (!p || !p.published) throw new NotFoundException('Paper not found');
    return p;
  }

  async detail(id: string) {
    return this.card(await this.published(id));
  }

  async preview(id: string) {
    const p = await this.published(id);
    if (!p.previewKey) throw new NotFoundException();
    return this.storage.get(p.previewKey);
  }

  // The one place that decides whether a student may download.
  // While payments are off, everyone may and nothing about payment is ever mentioned.
  // Once the admin turns payments on, a student who has not unlocked the paper gets 402 with the price, only when they try to download.
  async assertCanDownload(userId: string, paperId: string) {
    const paper = await this.published(paperId);
    if (!(await this.settings.paymentsEnabled())) return paper;
    const unlocked = await this.db.paperAccess.findUnique({ where: { userId_paperId: { userId, paperId } } });
    if (unlocked) return paper;
    throw new HttpException({ code: 'PAYMENT_REQUIRED', message: 'Payment is needed to download this paper.', amount: await this.settings.paperPrice() }, 402);
  }

  async file(userId: string, paperId: string) {
    const paper = await this.assertCanDownload(userId, paperId);
    const f = await this.storage.get(paper.fileKey);
    await this.db.paper.update({ where: { id: paper.id }, data: { downloads: { increment: 1 } } });
    // A paper downloaded while it was free stays theirs if payments are switched on later.
    await this.db.paperAccess.upsert({ where: { userId_paperId: { userId, paperId } }, update: {}, create: { userId, paperId } });
    return { ...f, filename: `${paper.unitCode}-${paper.year}.pdf` };
  }

  // ---- requests ----
  async createRequest(userId: string, unitCodeRaw: string, note?: string) {
    const unitCode = normalizeUnitCode(unitCodeRaw);
    if (!UNIT_CODE_RE.test(unitCode)) throw new BadRequestException('Enter a unit code like ICS2201');
    const universityId = await this.uni.defaultId();

    // Already have this paper? Say so instead of creating a request.
    const have = await this.db.paper.findFirst({ where: { universityId, unitCode, published: true }, select: { id: true } });
    if (have) return { status: 'EXISTS' as const, paperId: have.id };

    const open = await this.db.paperRequest.findFirst({ where: { userId, unitCode, status: 'OPEN' } });
    if (open) return { status: 'ALREADY_REQUESTED' as const };
    await this.db.paperRequest.create({ data: { universityId, userId, unitCode, note: note?.trim() || null } });
    return { status: 'REQUESTED' as const };
  }

  myRequests(userId: string) {
    return this.db.paperRequest.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50, select: { id: true, unitCode: true, status: true, paperId: true, createdAt: true } });
  }

  // ---- admin ----
  async upload(dto: UploadPaperDto, file?: { buffer: Buffer }, preview?: { buffer: Buffer }) {
    const unitCode = normalizeUnitCode(dto.unitCode);
    if (!UNIT_CODE_RE.test(unitCode)) throw new BadRequestException('Unit code should look like ICS2201');
    if (!file || !isPdf(file.buffer)) throw new BadRequestException('Upload the paper as a PDF file');
    if (preview && !isJpeg(preview.buffer)) throw new BadRequestException('The preview must be a JPEG image');

    const id = randomUUID();
    const fileKey = `papers/${id}.pdf`;
    const previewKey = preview ? `previews/${id}.jpg` : null;
    await this.storage.put(fileKey, file.buffer, 'application/pdf');
    if (preview && previewKey) await this.storage.put(previewKey, preview.buffer, 'image/jpeg');

    const universityId = await this.uni.defaultId();
    const paper = await this.db.paper.create({
      data: { id, universityId, unitCode, title: dto.title.trim(), year: dto.year, sitting: dto.sitting?.trim() || null, school: dto.school?.trim() || null, fileKey, previewKey },
    });

    // Anyone who asked for this unit gets their request marked as fulfilled.
    await this.db.paperRequest.updateMany({ where: { universityId, unitCode, status: 'OPEN' }, data: { status: 'FULFILLED', paperId: paper.id } });
    return this.card(paper);
  }

  async openRequests() {
    const rows = await this.db.paperRequest.findMany({
      where: { status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
      take: 300,
      include: { user: { select: { name: true, username: true, email: true } } },
    });
    // Group by unit so the admin sees which papers are wanted most.
    type Group = { unitCode: string; count: number; latest: Date; notes: string[] };
    const byUnit = new Map<string, Group>();
    for (const r of rows) {
      const g: Group = byUnit.get(r.unitCode) ?? { unitCode: r.unitCode, count: 0, latest: r.createdAt, notes: [] };
      g.count++;
      if (r.note && g.notes.length < 3) g.notes.push(r.note);
      byUnit.set(r.unitCode, g);
    }
    return [...byUnit.values()].sort((a, b) => b.count - a.count || +b.latest - +a.latest);
  }

  async rejectUnitRequests(unitCode: string) {
    const r = await this.db.paperRequest.updateMany({ where: { unitCode: normalizeUnitCode(unitCode), status: 'OPEN' }, data: { status: 'REJECTED' } });
    return { updated: r.count };
  }
}
