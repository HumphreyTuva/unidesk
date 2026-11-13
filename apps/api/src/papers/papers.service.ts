import { BadRequestException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma.service';
import { StorageService } from '../storage/storage.service';
import { SettingsService } from '../settings/settings.service';
import { UniversityService } from '../common/university.service';
import { UNIT_CODE_RE, normalizeUnitCode } from '../common/unit-code';
import { MailService } from '../mail/mail.service';
import { ListPapersQuery, UpdatePaperDto, UploadPaperDto } from './dto';

const isPdf = (b: Buffer) => b.length > 5 && b.subarray(0, 5).toString('latin1') === '%PDF-';
const isJpeg = (b: Buffer) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;

@Injectable()
export class PapersService {
  constructor(
    private db: PrismaService,
    private storage: StorageService,
    private settings: SettingsService,
    private uni: UniversityService,
    private mail: MailService,
  ) {}

  // What students see. Nothing here ever mentions price or payment.
  private card(p: { id: string; unitCode: string; title: string; year: number; sitting: string | null; school: string | null; previewKey: string | null; pageCount: number; createdAt?: Date }) {
    return { id: p.id, unitCode: p.unitCode, title: p.title, year: p.year, sitting: p.sitting, school: p.school, hasPreview: !!p.previewKey, pageCount: p.pageCount, addedAt: p.createdAt };
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

  // How many pages this visitor may read. While payments are off everything is readable and nothing hints at payment.
  // When payments are on, the admin's reading setting applies, and a student who has unlocked the paper reads all of it.
  private async readablePages(paper: { id: string; pageCount: number }, userId?: string) {
    if (paper.pageCount === 0) return 0;
    if (!(await this.settings.paymentsEnabled())) return paper.pageCount;
    const r = await this.settings.reading();
    if (r.mode === 'full') return paper.pageCount;
    if (userId && (await this.db.paperAccess.findUnique({ where: { userId_paperId: { userId, paperId: paper.id } } }))) return paper.pageCount;
    return Math.min(paper.pageCount, r.mode === 'first' ? r.freePages : 1);
  }

  async detail(id: string, userId?: string) {
    const p = await this.published(id);
    return { ...this.card(p), readablePages: await this.readablePages(p, userId) };
  }

  async preview(id: string) {
    const p = await this.published(id);
    if (!p.previewKey) throw new NotFoundException();
    return this.storage.get(p.previewKey);
  }

  // Reading in the app is open to everyone: these are plain images of each page. The PDF itself is never exposed here.
  async page(id: string, n: number, userId?: string) {
    const p = await this.published(id);
    if (!Number.isInteger(n) || n < 1 || n > p.pageCount) throw new NotFoundException();
    if (n > (await this.readablePages(p, userId))) throw new HttpException({ code: 'LOCKED', message: 'This page opens when you download the paper.' }, 403);
    return this.storage.get(`pages/${p.id}/${n}.jpg`);
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
    return this.db.paperRequest.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50, select: { id: true, unitCode: true, status: true, paperId: true, createdAt: true, paper: { select: { title: true, year: true, published: true } } } });
  }

  // ---- admin ----
  async upload(dto: UploadPaperDto, file?: { buffer: Buffer }, preview?: { buffer: Buffer }, pages: { buffer: Buffer }[] = []) {
    const unitCode = normalizeUnitCode(dto.unitCode);
    if (!UNIT_CODE_RE.test(unitCode)) throw new BadRequestException('Unit code should look like ICS2201');
    if (!file || !isPdf(file.buffer)) throw new BadRequestException('Upload the paper as a PDF file');
    if (preview && !isJpeg(preview.buffer)) throw new BadRequestException('The preview must be a JPEG image');

    if (pages.length > 30) throw new BadRequestException('Up to 30 pages can be shown in the app.');
    if (pages.some(pg => !isJpeg(pg.buffer))) throw new BadRequestException('Page images must be JPEG.');

    const id = randomUUID();
    const fileKey = `papers/${id}.pdf`;
    const previewKey = preview ? `previews/${id}.jpg` : null;
    await this.storage.put(fileKey, file.buffer, 'application/pdf');
    if (preview && previewKey) await this.storage.put(previewKey, preview.buffer, 'image/jpeg');
    for (const [i, pg] of pages.entries()) await this.storage.put(`pages/${id}/${i + 1}.jpg`, pg.buffer, 'image/jpeg');

    const universityId = await this.uni.defaultId();
    const paper = await this.db.paper.create({
      data: { id, universityId, unitCode, title: dto.title.trim(), year: dto.year, sitting: dto.sitting?.trim() || null, school: dto.school?.trim() || null, fileKey, previewKey, pageCount: pages.length },
    });

    // Anyone who asked for this unit gets their request marked as fulfilled, and an email if mail is set up.
    const waiting = await this.db.paperRequest.findMany({ where: { universityId, unitCode, status: 'OPEN' }, select: { user: { select: { email: true, name: true, deletedAt: true } } } });
    await this.db.paperRequest.updateMany({ where: { universityId, unitCode, status: 'OPEN' }, data: { status: 'FULFILLED', paperId: paper.id } });
    void this.notifyReady(paper, waiting.map(w => w.user));
    return this.card(paper);
  }

  // One email per student, however many times they asked. Runs in the background and never fails the upload.
  private async notifyReady(paper: { id: string; unitCode: string; title: string; year: number }, users: { email: string | null; name: string | null; deletedAt: Date | null }[]) {
    try {
      if (!this.mail.enabled()) return;
      const site = (process.env.SITE_URL || 'https://unidesk.co.ke').replace(/\/$/, '');
      const link = `${site}/papers/${paper.id}`;
      const esc = (t: string) => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
      const seen = new Set<string>();
      const mails = users.flatMap(u => {
        const to = u.email?.trim().toLowerCase();
        if (!to || u.deletedAt || seen.has(to)) return [];
        seen.add(to);
        const hi = u.name?.trim().split(/\s+/)[0] || 'there';
        const what = `${paper.unitCode} ${paper.title} (${paper.year})`;
        return [{
          to,
          subject: `Your past paper is ready: ${paper.unitCode}`,
          text: `Hi ${hi},\n\nYou asked for ${paper.unitCode} on UniDesk. It is now available: ${what}.\n\nOpen it here: ${link}\n\nUniDesk is an independent student app, not the official KU portal.`,
          html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#0F1F4D"><h2 style="margin:0 0 12px">Your past paper is ready</h2><p>Hi ${esc(hi)},</p><p>You asked for <b>${esc(paper.unitCode)}</b> on UniDesk. It is now available: ${esc(what)}.</p><p><a href="${link}" style="display:inline-block;background:#1B3A8A;color:#fff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:12px">Open the paper</a></p><p style="font-size:12px;color:#5B6478">UniDesk is an independent student app, not the official KU portal. You got this email because you requested this paper.</p></div>`,
        }];
      });
      await this.mail.sendMany(mails);
    } catch { /* never block an upload */ }
  }

  // Everything in the library, hidden papers included, for the Manage papers screen.
  async adminList(q?: string) {
    const term = q?.trim();
    const where: any = { universityId: await this.uni.defaultId() };
    if (term) where.OR = [{ unitCode: { contains: normalizeUnitCode(term) } }, { title: { contains: term, mode: 'insensitive' } }];
    const rows = await this.db.paper.findMany({ where, orderBy: [{ createdAt: 'desc' }], take: 200 });
    return rows.map(p => ({ id: p.id, unitCode: p.unitCode, title: p.title, year: p.year, sitting: p.sitting, school: p.school, published: p.published, pageCount: p.pageCount, downloads: p.downloads, hasPreview: !!p.previewKey, createdAt: p.createdAt }));
  }

  async adminUpdate(id: string, dto: UpdatePaperDto) {
    const p = await this.db.paper.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Paper not found');
    const data: any = {};
    if (dto.unitCode !== undefined) {
      const unitCode = normalizeUnitCode(dto.unitCode);
      if (!UNIT_CODE_RE.test(unitCode)) throw new BadRequestException('Unit code should look like ICS2201');
      data.unitCode = unitCode;
    }
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.year !== undefined) data.year = dto.year;
    if (dto.sitting !== undefined) data.sitting = dto.sitting.trim() || null;
    if (dto.school !== undefined) data.school = dto.school.trim() || null;
    if (dto.published !== undefined) data.published = dto.published;
    const updated = await this.db.paper.update({ where: { id }, data });
    return { id: updated.id, unitCode: updated.unitCode, title: updated.title, year: updated.year, sitting: updated.sitting, school: updated.school, published: updated.published };
  }

  // Swap in a corrected PDF, and/or fresh page images (for example after the reader was improved). Anything not sent is kept.
  async adminReplaceFiles(id: string, file?: { buffer: Buffer }, preview?: { buffer: Buffer }, pages: { buffer: Buffer }[] = []) {
    const p = await this.db.paper.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Paper not found');
    if (file && !isPdf(file.buffer)) throw new BadRequestException('Upload the paper as a PDF file');
    if (preview && !isJpeg(preview.buffer)) throw new BadRequestException('The preview must be a JPEG image');
    if (pages.length > 30) throw new BadRequestException('Up to 30 pages can be shown in the app.');
    if (pages.some(pg => !isJpeg(pg.buffer))) throw new BadRequestException('Page images must be JPEG.');
    if (!file && !preview && !pages.length) throw new BadRequestException('Nothing to replace. Choose the PDF.');

    const data: any = {};
    if (file) await this.storage.put(p.fileKey, file.buffer, 'application/pdf');
    if (preview) {
      const previewKey = p.previewKey ?? `previews/${p.id}.jpg`;
      await this.storage.put(previewKey, preview.buffer, 'image/jpeg');
      data.previewKey = previewKey;
    }
    if (pages.length) {
      for (const [i, pg] of pages.entries()) await this.storage.put(`pages/${p.id}/${i + 1}.jpg`, pg.buffer, 'image/jpeg');
      // The new PDF may be shorter: remove page images that no longer exist.
      for (let n = pages.length + 1; n <= p.pageCount; n++) await this.storage.remove(`pages/${p.id}/${n}.jpg`);
      data.pageCount = pages.length;
    }
    if (Object.keys(data).length) await this.db.paper.update({ where: { id }, data });
    return { ok: true, pageCount: data.pageCount ?? p.pageCount };
  }

  // Deleting is permanent. A paper that has payment records is kept (the money history must stay), so the admin hides it instead.
  async adminDelete(id: string) {
    const p = await this.db.paper.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Paper not found');
    if (await this.db.payment.count({ where: { paperId: id } })) {
      throw new HttpException({ code: 'HAS_PAYMENTS', message: 'Students have paid for this paper, so it cannot be deleted. Hide it instead.' }, 409);
    }
    await this.db.paperAccess.deleteMany({ where: { paperId: id } });
    await this.db.paperRequest.updateMany({ where: { paperId: id }, data: { paperId: null } });
    await this.db.paper.delete({ where: { id } });
    // Files last: if one fails the paper is already gone from the app and stray files are harmless.
    await this.storage.remove(p.fileKey);
    if (p.previewKey) await this.storage.remove(p.previewKey);
    for (let n = 1; n <= p.pageCount; n++) await this.storage.remove(`pages/${p.id}/${n}.jpg`);
    return { ok: true };
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
