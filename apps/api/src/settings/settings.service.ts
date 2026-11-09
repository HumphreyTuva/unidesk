import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

// Settings the admin controls. These are the only keys that exist, so nobody can write arbitrary rows.
export const SETTING_KEYS = ['payments_enabled', 'paper_price', 'listing_fee', 'listing_days'] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];

const DEFAULTS: Record<SettingKey, string> = { payments_enabled: 'false', paper_price: '20', listing_fee: '200', listing_days: '30' };

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

  async all() {
    const rows = await this.db.setting.findMany({ where: { key: { in: [...SETTING_KEYS] } } });
    const m = new Map<string, string>(rows.map((r: { key: string; value: string }) => [r.key, r.value] as [string, string]));
    const v = (k: SettingKey) => m.get(k) ?? DEFAULTS[k];
    return { paymentsEnabled: v('payments_enabled') === 'true', paperPrice: parseInt(v('paper_price'), 10), listingFee: parseInt(v('listing_fee'), 10), listingDays: parseInt(v('listing_days'), 10) };
  }

  async set(key: SettingKey, value: string) {
    await this.db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
}
