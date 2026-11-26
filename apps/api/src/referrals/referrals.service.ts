import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma.service';
import { SettingsService } from '../settings/settings.service';
import { REFERRAL_CAP, REFERRAL_PER_FRIEND } from './constants';

const newCode = () => randomBytes(5).toString('hex').slice(0, 8); // 8 lowercase hex characters

@Injectable()
export class ReferralsService {
  constructor(private db: PrismaService, private settings: SettingsService) {}

  // The student's own code, made the first time it is needed.
  async codeFor(userId: string): Promise<string> {
    const u = await this.db.user.findUnique({ where: { id: userId }, select: { refCode: true } });
    if (u?.refCode) return u.refCode;
    for (let i = 0; i < 5; i++) {
      const code = newCode();
      try {
        await this.db.user.update({ where: { id: userId }, data: { refCode: code } });
        return code;
      } catch { /* the code was taken: try another */ }
    }
    throw new Error('Could not make an invite code');
  }

  async me(userId: string) {
    const [code, invited, bonus] = await Promise.all([
      this.codeFor(userId),
      this.db.user.count({ where: { referredById: userId, deletedAt: null } }),
      this.settings.referralBonus(userId),
    ]);
    return { code, invited, counted: bonus.counted, bonus: bonus.bonus, perFriend: REFERRAL_PER_FRIEND, cap: REFERRAL_CAP };
  }
}
