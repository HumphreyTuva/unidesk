import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma.service';
import { UniversityService } from '../common/university.service';
import { StorageService } from '../storage/storage.service';
import { normalizeUnitCode } from '../common/unit-code';
import { sniffImage as sniff } from '../common/image';

export const normRoom = normalizeUnitCode; // "oml 5" and "OML5" are the same room
const MAX_STEPS = 8;

const num = (v: unknown, lo: number, hi: number, what: string) => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < lo || n > hi) throw new BadRequestException(`${what} is not valid.`);
  return n;
};
const text = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

export type BuildingInput = { name?: unknown; zone?: unknown; landmark?: unknown; lat?: unknown; lng?: unknown; rooms?: unknown };

@Injectable()
export class VenuesService {
  constructor(private db: PrismaService, private uni: UniversityService, private storage: StorageService) {}

  private shape(b: any) {
    return {
      id: b.id, name: b.name, zone: b.zone, landmark: b.landmark, lat: b.lat, lng: b.lng,
      rooms: (b.rooms ?? []).map((r: any) => r.code).sort(),
      hasSteps: (b.steps?.length ?? 0) > 0,
    };
  }

  // ---- students ----
  // Finds a building by room code ("OML5") or by name/zone. Room codes match from the start, so "OML" lists the whole building.
  async search(q: string) {
    const universityId = await this.uni.defaultId();
    const term = (q ?? '').trim().slice(0, 40);
    const include = { rooms: true, steps: { select: { id: true } } };
    if (!term) {
      const all = await this.db.building.findMany({ where: { universityId }, include, orderBy: { name: 'asc' }, take: 200 });
      return all.map(b => this.shape(b));
    }
    const code = normRoom(term);
    const found = await this.db.building.findMany({
      where: {
        universityId,
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { zone: { contains: term, mode: 'insensitive' } },
          { rooms: { some: { code: { startsWith: code } } } },
        ],
      },
      include, orderBy: { name: 'asc' }, take: 30,
    });
    return found.map(b => this.shape(b));
  }

  async detail(id: string) {
    const b = await this.db.building.findUnique({ where: { id }, include: { rooms: true, steps: { orderBy: { position: 'asc' } } } });
    if (!b) throw new NotFoundException('Venue not found.');
    return { ...this.shape(b), steps: b.steps.map(s => ({ id: s.id, caption: s.caption, photo: !!s.photoKey })) };
  }

  async photo(stepId: string) {
    const s = await this.db.walkthroughStep.findUnique({ where: { id: stepId } });
    if (!s?.photoKey) throw new NotFoundException();
    const f = await this.storage.get(s.photoKey);
    const ext = s.photoKey.split('.').pop();
    return { ...f, type: ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg' };
  }

  // ---- admin ----
  private parseRooms(v: unknown): string[] {
    const raw = Array.isArray(v) ? v.map(String) : typeof v === 'string' ? v.split(/[,;\n]+/) : [];
    const codes = [...new Set(raw.map(normRoom).filter(Boolean))];
    if (codes.length > 300) throw new BadRequestException('Too many room codes for one building.');
    for (const c of codes) if (!/^[A-Z0-9]{1,12}$/.test(c)) throw new BadRequestException(`“${c}” is not a valid room code (letters and numbers only).`);
    return codes;
  }

  async create(input: BuildingInput) {
    const name = text(input.name, 80);
    if (!name) throw new BadRequestException('Give the building a name.');
    const universityId = await this.uni.defaultId();
    const rooms = this.parseRooms(input.rooms);
    const b = await this.db.building.create({
      data: {
        universityId, name, zone: text(input.zone, 80), landmark: text(input.landmark, 140),
        lat: num(input.lat, -90, 90, 'Latitude'), lng: num(input.lng, -180, 180, 'Longitude'),
        rooms: { create: rooms.map(code => ({ code })) },
      },
      include: { rooms: true, steps: true },
    });
    return this.shape(b);
  }

  async update(id: string, input: BuildingInput) {
    const cur = await this.db.building.findUnique({ where: { id } });
    if (!cur) throw new NotFoundException('Venue not found.');
    const data: any = {};
    if (input.name !== undefined) { const n = text(input.name, 80); if (!n) throw new BadRequestException('Give the building a name.'); data.name = n; }
    if (input.zone !== undefined) data.zone = text(input.zone, 80);
    if (input.landmark !== undefined) data.landmark = text(input.landmark, 140);
    if (input.lat !== undefined) data.lat = num(input.lat, -90, 90, 'Latitude');
    if (input.lng !== undefined) data.lng = num(input.lng, -180, 180, 'Longitude');
    if ((data.lat === null) !== (data.lng === null) && 'lat' in data && 'lng' in data) throw new BadRequestException('Give both latitude and longitude, or neither.');
    await this.db.$transaction(async tx => {
      if (input.rooms !== undefined) {
        const codes = this.parseRooms(input.rooms);
        await tx.roomCode.deleteMany({ where: { buildingId: id, code: { notIn: codes } } });
        await tx.roomCode.createMany({ data: codes.map(code => ({ buildingId: id, code })), skipDuplicates: true });
      }
      if (Object.keys(data).length) await tx.building.update({ where: { id }, data });
    });
    return this.shape(await this.db.building.findUnique({ where: { id }, include: { rooms: true, steps: { select: { id: true } } } }));
  }

  async remove(id: string) {
    const steps = await this.db.walkthroughStep.findMany({ where: { buildingId: id } });
    await this.db.building.delete({ where: { id } }).catch(() => { throw new NotFoundException('Venue not found.'); });
    void steps; // photo files are tiny and may be shared if re-uploaded; they are left in storage
    return { ok: true };
  }

  // One building per line: "Name; Zone; CODE1, CODE2". Existing buildings with the same name get the new codes added.
  async importLines(textBlock: string) {
    const lines = (textBlock ?? '').split('\n').map(l => l.trim()).filter(Boolean).slice(0, 500);
    if (!lines.length) throw new BadRequestException('Paste at least one line.');
    const universityId = await this.uni.defaultId();
    let created = 0, updated = 0;
    const problems: string[] = [];
    for (const [i, line] of lines.entries()) {
      const [name, zone, codes] = line.split(';').map(x => x.trim());
      if (!name) { problems.push(`Line ${i + 1}: no name.`); continue; }
      try {
        const rooms = this.parseRooms(codes ?? '');
        const existing = await this.db.building.findFirst({ where: { universityId, name: { equals: name, mode: 'insensitive' } } });
        if (existing) {
          await this.db.roomCode.createMany({ data: rooms.map(code => ({ buildingId: existing.id, code })), skipDuplicates: true });
          updated++;
        } else {
          await this.db.building.create({ data: { universityId, name: name.slice(0, 80), zone: zone ? zone.slice(0, 80) : null, rooms: { create: rooms.map(code => ({ code })) } } });
          created++;
        }
      } catch (e: any) { problems.push(`Line ${i + 1}: ${e.message}`); }
    }
    return { created, updated, problems };
  }

  async addStep(buildingId: string, caption: unknown, file?: { buffer: Buffer }) {
    const b = await this.db.building.findUnique({ where: { id: buildingId }, include: { steps: true } });
    if (!b) throw new NotFoundException('Venue not found.');
    if (b.steps.length >= MAX_STEPS) throw new BadRequestException(`A venue can have up to ${MAX_STEPS} steps.`);
    const cap = text(caption, 160);
    if (!cap) throw new BadRequestException('Write a short caption, e.g. “Turn left at the fountain”.');
    let photoKey: string | null = null;
    if (file) {
      const kind = sniff(file.buffer);
      if (!kind) throw new BadRequestException('The photo must be a JPG, PNG or WebP image.');
      photoKey = `venues/${randomUUID()}.${kind.ext}`;
      await this.storage.put(photoKey, file.buffer, kind.type);
    }
    const position = b.steps.reduce((m, s) => Math.max(m, s.position), 0) + 1;
    const s = await this.db.walkthroughStep.create({ data: { buildingId, position, caption: cap, photoKey } });
    return { id: s.id };
  }

  async removeStep(stepId: string) {
    await this.db.walkthroughStep.delete({ where: { id: stepId } }).catch(() => { throw new NotFoundException('Step not found.'); });
    return { ok: true };
  }

  // Swaps a step with its neighbour. Positions are renumbered so they never collide.
  async moveStep(stepId: string, dir: 'up' | 'down') {
    const s = await this.db.walkthroughStep.findUnique({ where: { id: stepId } });
    if (!s) throw new NotFoundException('Step not found.');
    const all = await this.db.walkthroughStep.findMany({ where: { buildingId: s.buildingId }, orderBy: { position: 'asc' } });
    const i = all.findIndex(x => x.id === stepId), j = dir === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= all.length) return { ok: true };
    [all[i], all[j]] = [all[j], all[i]];
    await this.db.$transaction(all.map((x, n) => this.db.walkthroughStep.update({ where: { id: x.id }, data: { position: n + 1 } })));
    return { ok: true };
  }

  async adminList() {
    const universityId = await this.uni.defaultId();
    const all = await this.db.building.findMany({ where: { universityId }, include: { rooms: true, steps: { select: { id: true } } }, orderBy: { name: 'asc' } });
    return all.map(b => ({ ...this.shape(b), stepCount: b.steps.length }));
  }
}
