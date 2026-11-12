import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { JwtGuard, Roles } from '../auth/guards';
import { CampusService, type ClubInput, type ListingInput } from './campus.service';

@Controller('campus')
export class CampusController {
  constructor(private c: CampusService, private guard: JwtGuard) {}

  // ---- clubs ----
  @Get('clubs') clubs() { return this.c.clubs(); }
  @Get('clubs/mine') @UseGuards(JwtGuard) mine(@Req() req: any) { return this.c.myClubIds(req.user.id); }
  @Post('clubs') @UseGuards(JwtGuard) @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  suggest(@Req() req: any, @Body() b: ClubInput) { return this.c.suggestClub(req.user.id, b ?? {}); }
  @Post('clubs/:id/join') @UseGuards(JwtGuard) join(@Req() req: any, @Param('id') id: string) { return this.c.join(req.user.id, id); }
  @Delete('clubs/:id/join') @UseGuards(JwtGuard) leave(@Req() req: any, @Param('id') id: string) { return this.c.leave(req.user.id, id); }

  // ---- marketplace (public reading) ----
  @Get('market/info') info() { return this.c.info(); }
  @Get('market') market(@Query('q') q?: string) { return this.c.market(q); }
  @Get('market/mine') @UseGuards(JwtGuard) myAds(@Req() req: any) { return this.c.mine(req.user.id); }
  @Get('market/:id') one(@Param('id') id: string) { return this.c.listing(id); }

  // Pictures of live ads are public. A picture of an ad that is not live yet is shown only to its owner and admins.
  @Get('market/:id/image')
  async image(@Req() req: any, @Param('id') id: string, @Res() res: Response) {
    let viewer: { id: string; role: string } | undefined;
    try { await this.guard.canActivate({ switchToHttp: () => ({ getRequest: () => req }), getHandler: () => () => {} } as any); viewer = req.user; } catch { viewer = undefined; }
    const f = await this.c.image(id, viewer);
    res.setHeader('Content-Type', f.type);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', f.isPublic ? 'public, max-age=3600' : 'private, no-store');
    f.stream.pipe(res);
  }

  // ---- marketplace (advertisers) ----
  @Post('market') @UseGuards(JwtGuard) @Throttle({ default: { limit: 10, ttl: 3_600_000 } })
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: 4 * 1024 * 1024 } }))
  create(@Req() req: any, @Body() b: ListingInput, @UploadedFile() image?: { buffer: Buffer }) { return this.c.create(req.user.id, b ?? {}, image); }
  @Post('market/:id/submit') @UseGuards(JwtGuard) submit(@Req() req: any, @Param('id') id: string) { return this.c.submitFree(req.user.id, id); }
  @Delete('market/:id') @UseGuards(JwtGuard) remove(@Req() req: any, @Param('id') id: string) { return this.c.removeMine(req.user.id, id); }
}

@Controller('admin/campus')
@UseGuards(JwtGuard)
export class AdminCampusController {
  constructor(private c: CampusService) {}

  @Get('clubs') @Roles('ADMIN') clubs() { return this.c.adminClubs(); }
  @Post('clubs') @Roles('ADMIN') createClub(@Body() b: ClubInput) { return this.c.adminCreateClub(b ?? {}); }
  @Put('clubs/:id') @Roles('ADMIN') updateClub(@Param('id') id: string, @Body() b: any) { return this.c.adminUpdateClub(id, b ?? {}); }
  @Delete('clubs/:id') @Roles('ADMIN') deleteClub(@Param('id') id: string) { return this.c.adminDeleteClub(id); }

  @Get('listings') @Roles('ADMIN') listings(@Query('status') s?: string) { return this.c.adminListings(s); }
  @Post('listings/:id/approve') @Roles('ADMIN') approve(@Param('id') id: string) { return this.c.approve(id); }
  @Post('listings/:id/reject') @Roles('ADMIN') reject(@Param('id') id: string, @Body() b: { reason: string }) { return this.c.reject(id, b?.reason); }
}
