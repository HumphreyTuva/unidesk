import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UniversityService } from '../common/university.service';
import { normalizeUnitCode } from '../common/unit-code';
import { TableError } from './html-table';
import { parseClassTimetable } from './parse-class';
import { parseExamTimetable } from './parse-exam';
import { generateClasses, listExams, type ClassRow, type ExamRow } from './logic';

type Kind = 'CLASS' | 'EXAM';
const MAX_CODES = 30;

@Injectable()
export class TimetableService {
  constructor(private db: PrismaService, private uni: UniversityService) {}

  // ---- admin ----
  // The upload is saved unpublished so the admin can read the report first, then publish it.
  async upload(kind: Kind, label: string, file?: { buffer: Buffer }) {
    if (!file) throw new BadRequestException('Attach the timetable file (Google Sheets "Web page (.html)" export).');
    const html = file.buffer.toString('utf8');
    let parsed;
    try {
      parsed = kind === 'CLASS' ? parseClassTimetable(html) : parseExamTimetable(html);
    } catch (e) {
      if (e instanceof TableError) throw new BadRequestException(e.message);
      throw e;
    }
    if (!parsed.sessions.length) throw new BadRequestException(parsed.report.warnings[0] ?? 'Nothing could be read from that file.');
    const universityId = await this.uni.defaultId();
    const source = await this.db.$transaction(async tx => {
      const src = await tx.timetableSource.create({ data: { universityId, kind, label, parseReport: parsed.report as any } });
      if (kind === 'CLASS') {
        await tx.classSession.createMany({
          data: (parsed.sessions as ReturnType<typeof parseClassTimetable>['sessions']).map(s => ({
            sourceId: src.id, programme: s.programme, code: s.code, day: s.day, startHour: s.startHour, endHour: s.endHour,
            venue: s.venue || null, elearning: s.elearning, rawLabel: s.rawLabel,
          })),
        });
      } else {
        await tx.examSession.createMany({
          data: (parsed.sessions as ReturnType<typeof parseExamTimetable>['sessions']).map(s => ({
            sourceId: src.id, code: s.code, date: new Date(s.date), slot: s.slot, startMin: s.startMin, endMin: s.endMin,
            students: s.students, venues: s.venues,
          })),
        });
      }
      return src;
    }, { timeout: 30_000 });
    return { id: source.id, report: parsed.report };
  }

  async list() {
    const universityId = await this.uni.defaultId();
    return this.db.timetableSource.findMany({
      where: { universityId }, orderBy: { createdAt: 'desc' },
      select: { id: true, kind: true, label: true, published: true, active: true, parseReport: true, createdAt: true },
    });
  }

  // Publishing makes it the one students see for that kind; the previous one is kept so it can be switched back to.
  async publish(id: string) {
    const src = await this.db.timetableSource.findUnique({ where: { id } });
    if (!src) throw new NotFoundException('Timetable not found.');
    await this.db.$transaction([
      this.db.timetableSource.updateMany({ where: { universityId: src.universityId, kind: src.kind, active: true }, data: { active: false } }),
      this.db.timetableSource.update({ where: { id }, data: { active: true, published: true } }),
    ]);
    return { ok: true };
  }

  async unpublish(id: string) {
    await this.db.timetableSource.update({ where: { id }, data: { active: false } }).catch(() => { throw new NotFoundException('Timetable not found.'); });
    return { ok: true };
  }

  async remove(id: string) {
    const src = await this.db.timetableSource.findUnique({ where: { id } });
    if (!src) throw new NotFoundException('Timetable not found.');
    if (src.active) throw new ConflictException('Students are using this timetable. Publish another one first, or unpublish it.');
    await this.db.timetableSource.delete({ where: { id } }); // sessions are removed with it (onDelete: Cascade)
    return { ok: true };
  }

  // ---- students ----
  private async active(kind: Kind) {
    const universityId = await this.uni.defaultId();
    return this.db.timetableSource.findFirst({ where: { universityId, kind, active: true }, select: { id: true, label: true } });
  }

  async info() {
    const [c, e] = await Promise.all([this.active('CLASS'), this.active('EXAM')]);
    return { class: c ? { label: c.label } : null, exam: e ? { label: e.label } : null };
  }

  // Unit search: codes starting with what was typed. Only returns codes, never students' data.
  async units(kind: Kind, q: string) {
    const src = await this.active(kind);
    if (!src) return { label: null, codes: [] as string[] };
    const prefix = normalizeUnitCode(q ?? '').slice(0, 12);
    if (prefix.length < 2) return { label: src.label, codes: [] };
    const where = { sourceId: src.id, code: { startsWith: prefix } };
    const rows = kind === 'CLASS'
      ? await this.db.classSession.findMany({ where, distinct: ['code'], select: { code: true }, orderBy: { code: 'asc' }, take: 20 })
      : await this.db.examSession.findMany({ where, distinct: ['code'], select: { code: true }, orderBy: { code: 'asc' }, take: 20 });
    return { label: src.label, codes: rows.map(r => r.code) };
  }

  private cleanCodes(codes: unknown): string[] {
    if (!Array.isArray(codes)) throw new BadRequestException('Send a list of unit codes.');
    const out = [...new Set(codes.map(c => normalizeUnitCode(String(c))).filter(Boolean))];
    if (!out.length) throw new BadRequestException('Add at least one unit.');
    if (out.length > MAX_CODES) throw new BadRequestException(`Up to ${MAX_CODES} units at a time.`);
    return out;
  }

  async generateClass(codes: unknown, choices?: Record<string, string>) {
    const list = this.cleanCodes(codes);
    const src = await this.active('CLASS');
    if (!src) throw new NotFoundException('The class timetable is not available yet.');
    const rows = await this.db.classSession.findMany({ where: { sourceId: src.id, code: { in: list } } });
    const mapped: ClassRow[] = rows.map(r => ({ id: r.id, programme: r.programme, code: r.code, day: r.day, startHour: r.startHour, endHour: r.endHour, venue: r.venue, elearning: r.elearning }));
    const result = generateClasses(mapped, choices && typeof choices === 'object' ? choices : {});
    const found = new Set(mapped.map(r => r.code));
    return { label: src.label, ...result, notFound: list.filter(c => !found.has(c)) };
  }

  async generateExam(codes: unknown) {
    const list = this.cleanCodes(codes);
    const src = await this.active('EXAM');
    if (!src) throw new NotFoundException('The exam timetable is not available yet.');
    const rows = await this.db.examSession.findMany({ where: { sourceId: src.id, code: { in: list } } });
    const mapped: ExamRow[] = rows.map(r => ({ id: r.id, code: r.code, date: r.date.toISOString().slice(0, 10), slot: r.slot, startMin: r.startMin, endMin: r.endMin, students: r.students, venues: r.venues }));
    const found = new Set(mapped.map(r => r.code));
    return { label: src.label, ...listExams(mapped), notFound: list.filter(c => !found.has(c)) };
  }
}
