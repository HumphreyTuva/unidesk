import { BadRequestException, Body, Controller, ForbiddenException, Get, NotFoundException, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PrismaService } from '../prisma.service';
import { UniversityService } from '../common/university.service';
import { JwtGuard, Roles } from '../auth/guards';

class RoleDto { @IsIn(['STUDENT', 'SUPPORT', 'ADMIN']) role!: 'STUDENT' | 'SUPPORT' | 'ADMIN'; }
class ListQuery {
  @IsOptional() @IsString() @MaxLength(80) q?: string;
  @IsOptional() @IsString() take?: string;
  @IsOptional() @IsString() skip?: string;
  @IsOptional() @IsIn(['all', 'blocked', 'staff']) filter?: 'all' | 'blocked' | 'staff';
}

const DAY = 86_400_000;
const NAIROBI = 3 * 3_600_000; // UTC+3, no daylight saving

// Admin only. Passwords and password hashes are never selected here.
@Controller('admin/users')
@UseGuards(JwtGuard)
export class AdminUsersController {
  constructor(private db: PrismaService, private uni: UniversityService) {}

  @Get('summary') @Roles('ADMIN')
  async summary() {
    const universityId = await this.uni.defaultId();
    const now = Date.now();
    const where = { universityId };
    const [total, blocked, staff, google, withPassword, recent] = await Promise.all([
      this.db.user.count({ where }),
      this.db.user.count({ where: { ...where, deletedAt: { not: null } } }),
      this.db.user.count({ where: { ...where, role: { in: ['ADMIN', 'SUPPORT'] } } }),
      this.db.user.count({ where: { ...where, googleId: { not: null } } }),
      this.db.user.count({ where: { ...where, passwordHash: { not: null } } }),
      this.db.user.findMany({ where: { ...where, createdAt: { gte: new Date(now - 30 * DAY) } }, select: { createdAt: true } }),
    ]);
    // Signups per day for the last 14 days, by Nairobi calendar day.
    const dayKey = (t: number) => new Date(t + NAIROBI).toISOString().slice(0, 10);
    const byDay: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) byDay[dayKey(now - i * DAY)] = 0;
    for (const u of recent) { const k = dayKey(u.createdAt.getTime()); if (k in byDay) byDay[k]++; }
    const today = byDay[dayKey(now)] ?? 0;
    const last7 = recent.filter(u => u.createdAt.getTime() >= now - 7 * DAY).length;
    return { total, today, last7, last30: recent.length, blocked, staff, google, password: withPassword, byDay: Object.entries(byDay).map(([date, count]) => ({ date, count })) };
  }

  @Get() @Roles('ADMIN')
  async list(@Query() q: ListQuery) {
    const universityId = await this.uni.defaultId();
    const take = Math.min(100, Math.max(1, Number(q.take) || 30));
    const skip = Math.max(0, Number(q.skip) || 0);
    const term = (q.q ?? '').trim();
    const where: any = { universityId };
    if (term) where.OR = [
      { email: { contains: term.toLowerCase() } },
      { username: { contains: term.toLowerCase() } },
      { name: { contains: term, mode: 'insensitive' } },
    ];
    if (q.filter === 'blocked') where.deletedAt = { not: null };
    if (q.filter === 'staff') where.role = { in: ['ADMIN', 'SUPPORT'] };
    const [total, rows] = await Promise.all([
      this.db.user.count({ where }),
      this.db.user.findMany({
        where, orderBy: { createdAt: 'desc' }, take, skip,
        select: {
          id: true, name: true, email: true, username: true, usernameDisplay: true, role: true, createdAt: true, deletedAt: true, googleId: true, passwordHash: true,
          _count: { select: { paperRequests: true, paperAccess: true, payments: true, threads: true } },
        },
      }),
    ]);
    const items = rows.map(u => ({
      id: u.id, name: u.name, email: u.email, username: u.usernameDisplay || u.username, role: u.role, joined: u.createdAt, blocked: !!u.deletedAt,
      via: u.googleId && u.passwordHash ? 'Google + password' : u.googleId ? 'Google' : 'Password',
      requests: u._count.paperRequests, downloads: u._count.paperAccess, payments: u._count.payments, chats: u._count.threads,
    }));
    return { total, items };
  }

  @Put(':id/role') @Roles('ADMIN')
  async setRole(@Param('id') id: string, @Body() dto: RoleDto, @Req() req: any) {
    if (id === req.user.id) throw new ForbiddenException('You cannot change your own role.');
    const user = await this.db.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) throw new NotFoundException('Account not found.');
    await this.db.user.update({ where: { id }, data: { role: dto.role } });
    return { ok: true };
  }

  // Blocking sets deletedAt, which the sign-in check and the guard already treat as "no access". Nothing is deleted, so it can be undone.
  @Post(':id/block') @Roles('ADMIN')
  async block(@Param('id') id: string, @Req() req: any) {
    if (id === req.user.id) throw new ForbiddenException('You cannot block your own account.');
    const user = await this.db.user.findUnique({ where: { id }, select: { id: true, role: true } });
    if (!user) throw new NotFoundException('Account not found.');
    if (user.role === 'ADMIN') throw new BadRequestException('Make this account a student first, then block it.');
    await this.db.user.update({ where: { id }, data: { deletedAt: new Date() } });
    return { ok: true };
  }

  @Post(':id/unblock') @Roles('ADMIN')
  async unblock(@Param('id') id: string) {
    const user = await this.db.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) throw new NotFoundException('Account not found.');
    await this.db.user.update({ where: { id }, data: { deletedAt: null } });
    return { ok: true };
  }
}
