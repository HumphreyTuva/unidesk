import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { REFERRAL_CAP, REFERRAL_PER_FRIEND } from '../referrals/constants';

// Settings the admin controls. These are the only keys that exist, so nobody can write arbitrary rows.
export const SETTING_KEYS = ['payments_enabled', 'paper_price', 'listing_fee', 'listing_days', 'reading_mode', 'free_pages', 'free_downloads'] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];

const DEFAULTS: Record<SettingKey, string> = { payments_enabled: 'false', paper_price: '20', listing_fee: '200', listing_days: '30', reading_mode: 'full', free_pages: '2', free_downloads: '8' };

@Injectable()
export class SettingsService {
  constructor(private db: PrismaService) {}

  async get(key: SettingKey): Promise<string> {
    const row = await this.db.setting.findUnique({ where: { key } });
    return row?.value ?? DEFAULTS[key];
  }
  async paymentsEnabled(): Promise<boolean> {
    return (await this.get('payments_enabled')) === 'true';
  }
  async paperPrice(): Promise<number> {
    const n = parseInt(await this.get('paper_price'), 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  // Free downloads each student gets while payments are off. 0 = no limit. Default 8.
  async freeDownloads(): Promise<number> {
    const n = parseInt(await this.get('free_downloads'), 10);
    return Number.isFinite(n) && n >= 0 ? n : 8;
  }

  // Has this student used up their free downloads? Counts papers they hold that they did not pay for.
  // Only applies when real M-Pesa is connected (or outside production), so students are never asked to pay through a test setup.
  async limitStatus(userId: string): Promise<{ reached: boolean; limit: number }> {
    const base = await this.freeDownloads();
    if (base === 0) return { reached: false, limit: base };
    const limit = base + (await this.referralBonus(userId)).bonus;
    if (process.env.NODE_ENV === 'production' && process.env.MPESA_MODE !== 'live') return { reached: false, limit };
    const [held, paid] = await Promise.all([
      this.db.paperAccess.count({ where: { userId } }),
      this.db.payment.findMany({ where: { userId, purpose: 'PAPER_DOWNLOAD', status: 'SUCCESS', paperId: { not: null } }, distinct: ['paperId'], select: { paperId: true } }),
    ]);
    return { reached: held - paid.length >= limit, limit };
  }

  // Extra free downloads earned by inviting friends. A friend counts once they have joined with the student's link and opened a paper.
  async referralBonus(userId: string): Promise<{ counted: number; bonus: number }> {
    const counted = await this.db.user.count({ where: { referredById: userId, deletedAt: null, paperAccess: { some: {} } } });
    return { counted, bonus: Math.min(REFERRAL_CAP, counted * REFERRAL_PER_FRIEND) };
  }

  // How much of a paper students can read in the app: 'full' (every page), 'first' (the first few pages) or 'preview' (page 1 only).
  async reading(): Promise<{ mode: 'full' | 'first' | 'preview'; freePages: number }> {
    const m = await this.get('reading_mode');
    const n = parseInt(await this.get('free_pages'), 10);
    return { mode: m === 'first' || m === 'preview' ? m : 'full', freePages: Number.isFinite(n) && n >= 1 ? n : 2 };
  }

  async all() {
    const rows = await this.db.setting.findMany({ where: { key: { in: [...SETTING_KEYS] } } });
    const m = new Map<string, string>(rows.map((r: { key: string; value: string }) => [r.key, r.value] as [string, string]));
    const v = (k: SettingKey) => m.get(k) ?? DEFAULTS[k];
    return { paymentsEnabled: v('payments_enabled') === 'true', paperPrice: parseInt(v('paper_price'), 10), listingFee: parseInt(v('listing_fee'), 10), listingDays: parseInt(v('listing_days'), 10), readingMode: (['full', 'first', 'preview'].includes(v('reading_mode')) ? v('reading_mode') : 'full') as 'full' | 'first' | 'preview', freePages: parseInt(v('free_pages'), 10) || 2, freeDownloads: Math.max(0, parseInt(v('free_downloads'), 10) || 0) };
  }

  async set(key: SettingKey, value: string) {
    await this.db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
}
