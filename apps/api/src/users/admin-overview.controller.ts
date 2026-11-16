import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UniversityService } from '../common/university.service';
import { JwtGuard, Roles } from '../auth/guards';

// Small counts for the admin's badges: what is waiting for them. Support staff only see chat and requests.
@Controller('admin/overview')
@UseGuards(JwtGuard)
export class AdminOverviewController {
  constructor(private db: PrismaService, private uni: UniversityService) {}

  @Get() @Roles('ADMIN', 'SUPPORT')
  async counts(@Req() req: any) {
    const universityId = await this.uni.defaultId();
    const admin = req.user?.role === 'ADMIN';
    const [threads, requests, ads, clubs] = await Promise.all([
      // A chat needs a reply when it is open and the student wrote last.
      this.db.chatThread.findMany({ where: { closed: false }, select: { messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { fromStaff: true } } }, take: 500 }),
      this.db.paperRequest.count({ where: { universityId, status: 'OPEN' } }),
      admin ? this.db.listing.count({ where: { universityId, status: 'PENDING_REVIEW' } }) : 0,
      admin ? this.db.club.count({ where: { universityId, approved: false } }) : 0,
    ]);
    const chat = threads.filter(t => t.messages[0] && !t.messages[0].fromStaff).length;
    return { chat, requests, campus: ads + clubs, total: chat + requests + ads + clubs };
  }
}
