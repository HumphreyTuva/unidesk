import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma.service';
import { UniversityService } from '../common/university.service';
import { SettingsService } from '../settings/settings.service';
import { StorageService } from '../storage/storage.service';
import { normalizePhone } from '../common/phone';
import { sniffImage } from '../common/image';

const text = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().replace(/\s+\n/g, '\n').slice(0, max) : null);
const need = (v: unknown, max: number, msg: string) => { const t = text(v, max); if (!t) throw new BadRequestException(msg); return t; };

export type ClubInput = { name?: unknown; category?: unknown; description?: unknown; contact?: unknown; meetingTimes?: unknown };
export type ListingInput = { title?: unknown; description?: unknown; price?: unknown; contactPhone?: unknown };

@Injectable()
export class CampusService {
  constructor(private db: PrismaService, private uni: UniversityService, private settings: SettingsService, private storage: StorageService) {}

  // ================= clubs =================
  private clubOut(c: any) {
    return { id: c.id, name: c.name, category: c.category, description: c.description, contact: c.contact, meetingTimes: c.meetingTimes, members: c._count?.members ?? 0 };
  }

  async clubs() {
    const universityId = await this.uni.defaultId();
    const rows = await this.db.club.findMany({ where: { universityId, approved: true }, include: { _count: { select: { members: true } } }, orderBy: { name: 'asc' }, take: 200 });
    return rows.map(c => this.clubOut(c));
  }
  async myClubIds(userId: string) {
    return (await this.db.clubMember.findMany({ where: { userId }, select: { clubId: true } })).map(m => m.clubId);
  }
  async join(userId: string, clubId: string) {
    const c = await this.db.club.findUnique({ where: { id: clubId } });
    if (!c || !c.approved) throw new NotFoundException('Club not found.');
    await this.db.clubMember.upsert({ where: { clubId_userId: { clubId, userId } }, update: {}, create: { clubId, userId } });
    return { ok: true };
  }
  async leave(userId: string, clubId: string) {
    await this.db.clubMember.deleteMany({ where: { clubId, userId } });
    return { ok: true };
  }
  // Any student can suggest a club; it stays hidden until an admin approves it.
  async suggestClub(userId: string, i: ClubInput) {
    const pending = await this.db.club.count({ where: { createdById: userId, approved: false } });
    if (pending >= 3) throw new ConflictException('You already have 3 clubs waiting for approval.');
    const universityId = await this.uni.defaultId();
    await this.db.club.create({
      data: {
        universityId, createdById: userId, approved: false,
        name: need(i.name, 80, 'Give the club a name.'), category: text(i.category, 40), description: text(i.description, 400),
        contact: need(i.contact, 120, 'Add a way to contact the club (phone, email or Instagram).'), meetingTimes: text(i.meetingTimes, 120),
      },
    });
    return { ok: true };
  }
  async adminClubs() {
    const universityId = await this.uni.defaultId();
    const rows = await this.db.club.findMany({ where: { universityId }, include: { _count: { select: { members: true } } }, orderBy: [{ approved: 'asc' }, { createdAt: 'desc' }], take: 300 });
    return rows.map(c => ({ ...this.clubOut(c), approved: c.approved }));
  }
  async adminCreateClub(i: ClubInput) {
    const universityId = await this.uni.defaultId();
    await this.db.club.create({ data: { universityId, approved: true, name: need(i.name, 80, 'Give the club a name.'), category: text(i.category, 40), description: text(i.description, 400), contact: text(i.contact, 120), meetingTimes: text(i.meetingTimes, 120) } });
    return { ok: true };
  }
  async adminUpdateClub(id: string, i: ClubInput & { approved?: unknown }) {
    const data: any = {};
    if (i.name !== undefined) data.name = need(i.name, 80, 'Give the club a name.');
    for (const [k, max] of [['category', 40], ['description', 400], ['contact', 120], ['meetingTimes', 120]] as const) if ((i as any)[k] !== undefined) data[k] = text((i as any)[k], max);
    if (typeof i.approved === 'boolean') data.approved = i.approved;
    await this.db.club.update({ where: { id }, data }).catch(() => { throw new NotFoundException('Club not found.'); });
    return { ok: true };
  }
  async adminDeleteClub(id: string) {
    await this.db.club.delete({ where: { id } }).catch(() => { throw new NotFoundException('Club not found.'); });
    return { ok: true };
  }

  // ================= marketplace =================
  async info() {
    const s = await this.settings.all();
    return { fee: s.listingFee, days: s.listingDays };
  }

  // Ads whose time is up stop showing straight away; this also records it so the owner can renew.
  private async expireOld() {
    await this.db.listing.updateMany({ where: { status: 'LIVE', expiresAt: { lt: new Date() } }, data: { status: 'EXPIRED' } });
  }

  private publicOut(l: any) {
    return { id: l.id, title: l.title, description: l.description, price: l.price, image: !!l.imageKey, phone: l.contactPhone, expiresAt: l.expiresAt };
  }

  async market(q?: string) {
    await this.expireOld();
    const universityId = await this.uni.defaultId();
    const term = (q ?? '').trim().slice(0, 40);
    const rows = await this.db.listing.findMany({
      where: { universityId, status: 'LIVE', ...(term ? { OR: [{ title: { contains: term, mode: 'insensitive' } }, { description: { contains: term, mode: 'insensitive' } }] } : {}) },
      orderBy: { createdAt: 'desc' }, take: 100,
    });
    return rows.map(l => this.publicOut(l));
  }

  async listing(id: string) {
    await this.expireOld();
    const l = await this.db.listing.findUnique({ where: { id } });
    if (!l || l.status !== 'LIVE') throw new NotFoundException('This ad is not available.');
    return this.publicOut(l);
  }

  // Only live ads have a public image; owners and admins see theirs through the same address, so check who is asking.
  async image(id: string, viewer?: { id: string; role: string }) {
    const l = await this.db.listing.findUnique({ where: { id } });
    if (!l?.imageKey) throw new NotFoundException();
    const allowed = l.status === 'LIVE' || (viewer && (viewer.role === 'ADMIN' || viewer.id === l.userId));
    if (!allowed) throw new NotFoundException();
    const f = await this.storage.get(l.imageKey);
    const ext = l.imageKey.split('.').pop();
    return { ...f, type: ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg', isPublic: l.status === 'LIVE' };
  }

  async create(userId: string, i: ListingInput, file?: { buffer: Buffer }) {
    const open = await this.db.listing.count({ where: { userId, status: { in: ['DRAFT', 'PENDING_REVIEW'] } } });
    if (open >= 5) throw new ConflictException('You have 5 ads waiting. Finish or delete one first.');
    const phone = normalizePhone(String(i.contactPhone ?? ''));
    if (!phone) throw new BadRequestException('Enter the phone number customers should call, like 0712 345 678.');
    let price: number | null = null;
    if (i.price !== undefined && i.price !== null && String(i.price).trim() !== '') {
      price = Number(i.price);
      if (!Number.isInteger(price) || price < 0 || price > 10_000_000) throw new BadRequestException('Price must be a whole number in KSh.');
    }
    let imageKey: string | null = null;
    if (file) {
      const k = sniffImage(file.buffer);
      if (!k) throw new BadRequestException('The picture must be a JPG, PNG or WebP image.');
      imageKey = `market/${randomUUID()}.${k.ext}`;
      await this.storage.put(imageKey, file.buffer, k.type);
    }
    const universityId = await this.uni.defaultId();
    const l = await this.db.listing.create({
      data: { universityId, userId, title: need(i.title, 80, 'Give your ad a title.'), description: text(i.description, 500), price, imageKey, contactPhone: phone },
    });
    return { id: l.id };
  }

  async mine(userId: string) {
    await this.expireOld();
    const rows = await this.db.listing.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 });
    return rows.map(l => ({ id: l.id, title: l.title, price: l.price, image: !!l.imageKey, status: l.status, expiresAt: l.expiresAt, rejectReason: l.rejectReason }));
  }

  // The fee is only needed if one is set. With no fee the ad goes straight to review.
  async submitFree(userId: string, id: string) {
    const l = await this.db.listing.findUnique({ where: { id } });
    if (!l || l.userId !== userId) throw new NotFoundException('Ad not found.');
    if ((await this.settings.all()).listingFee >= 1) throw new BadRequestException('This ad needs its fee paid first.');
    await this.db.listing.updateMany({ where: { id, status: { in: ['DRAFT', 'EXPIRED'] } }, data: { status: 'PENDING_REVIEW', rejectReason: null } });
    return { ok: true };
  }

  async removeMine(userId: string, id: string) {
    const r = await this.db.listing.deleteMany({ where: { id, userId, payments: { none: { status: 'SUCCESS' } } } });
    if (r.count) return { ok: true };
    // A paid ad is kept for the records; it is just taken down.
    const t = await this.db.listing.updateMany({ where: { id, userId }, data: { status: 'EXPIRED', expiresAt: new Date() } });
    if (!t.count) throw new NotFoundException('Ad not found.');
    return { ok: true };
  }

  // ---- admin ----
  async adminListings(status?: string) {
    await this.expireOld();
    const st = ['PENDING_REVIEW', 'LIVE', 'REJECTED', 'EXPIRED'].includes(status ?? '') ? (status as any) : 'PENDING_REVIEW';
    const rows = await this.db.listing.findMany({
      where: { status: st }, orderBy: { createdAt: 'desc' }, take: 100,
      include: { payments: { where: { status: 'SUCCESS' }, select: { amount: true, mpesaReceipt: true }, take: 1, orderBy: { createdAt: 'desc' } } },
    });
    return rows.map(l => ({ id: l.id, title: l.title, description: l.description, price: l.price, image: !!l.imageKey, phone: l.contactPhone, status: l.status, expiresAt: l.expiresAt, paid: l.payments[0] ?? null }));
  }
  async approve(id: string) {
    const days = (await this.settings.all()).listingDays;
    const r = await this.db.listing.updateMany({ where: { id, status: 'PENDING_REVIEW' }, data: { status: 'LIVE', expiresAt: new Date(Date.now() + (days > 0 ? days : 30) * 86_400_000), rejectReason: null } });
    if (!r.count) throw new ConflictException('This ad is not waiting for review.');
    return { ok: true };
  }
  async reject(id: string, reason: unknown) {
    const r = await this.db.listing.updateMany({ where: { id, status: { in: ['PENDING_REVIEW', 'LIVE'] } }, data: { status: 'REJECTED', rejectReason: need(reason, 200, 'Say why, so the business knows what to fix.') } });
    if (!r.count) throw new ConflictException('This ad cannot be rejected now.');
    return { ok: true };
  }
}
