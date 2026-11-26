import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/guards';
import { ReferralsService } from './referrals.service';

@Controller('referrals')
export class ReferralsController {
  constructor(private r: ReferralsService) {}
  @Get('me') @UseGuards(JwtGuard) me(@Req() req: any) { return this.r.me(req.user.id); }
}
