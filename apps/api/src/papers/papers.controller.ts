import { Body, Controller, Get, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { JwtGuard } from '../auth/guards';
import { PapersService } from './papers.service';
import { CreateRequestDto, ListPapersQuery } from './dto';

@Controller()
export class PapersController {
  constructor(private papers: PapersService) {}

  // Browsing and previews are open to everyone. Downloading and requesting need an account.
  @Get('papers')
  list(@Query() q: ListPapersQuery) {
    return this.papers.list(q);
  }

  @Get('papers/:id')
  detail(@Param('id') id: string) {
    return this.papers.detail(id);
  }

  @Get('papers/:id/pages/:n')
  async page(@Param('id') id: string, @Param('n') n: string, @Res() res: Response) {
    const f = await this.papers.page(id, parseInt(n, 10));
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    f.stream.pipe(res);
  }

  @Get('papers/:id/preview')
  async preview(@Param('id') id: string, @Res() res: Response) {
    const f = await this.papers.preview(id);
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    f.stream.pipe(res);
  }

  // "May I download this?" Returns { ok: true }, or 402 with the price when payments are on and the paper is not unlocked.
  @Get('papers/:id/access') @UseGuards(JwtGuard)
  async access(@Req() req: any, @Param('id') id: string) {
    await this.papers.assertCanDownload(req.user.id, id);
    return { ok: true };
  }

  @Get('papers/:id/download') @UseGuards(JwtGuard) @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async download(@Req() req: any, @Param('id') id: string, @Res() res: Response) {
    const f = await this.papers.file(req.user.id, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${f.filename}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    if (f.size) res.setHeader('Content-Length', String(f.size));
    f.stream.pipe(res);
  }

  @Post('paper-requests') @UseGuards(JwtGuard) @Throttle({ default: { limit: 10, ttl: 600_000 } })
  request(@Req() req: any, @Body() dto: CreateRequestDto) {
    return this.papers.createRequest(req.user.id, dto.unitCode, dto.note);
  }

  @Get('paper-requests/mine') @UseGuards(JwtGuard)
  mine(@Req() req: any) {
    return this.papers.myRequests(req.user.id);
  }
}
