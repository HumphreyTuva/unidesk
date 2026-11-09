import { Body, Controller, Delete, Get, Param, Post, Put, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtGuard, Roles } from '../auth/guards';
import { VenuesService, type BuildingInput } from './venues.service';

// Open to everyone: finding a lecture room should not need an account.
@Controller('venues')
export class VenuesController {
  constructor(private v: VenuesService) {}

  @Get() search(@Query('q') q: string) { return this.v.search(q); }
  @Get('steps/:id/photo')
  async photo(@Param('id') id: string, @Res() res: Response) {
    const f = await this.v.photo(id);
    res.setHeader('Content-Type', f.type);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    f.stream.pipe(res);
  }
  @Get(':id') detail(@Param('id') id: string) { return this.v.detail(id); }
}

@Controller('admin/venues')
@UseGuards(JwtGuard)
export class AdminVenuesController {
  constructor(private v: VenuesService) {}

  @Get() @Roles('ADMIN') list() { return this.v.adminList(); }
  @Post() @Roles('ADMIN') create(@Body() b: BuildingInput) { return this.v.create(b ?? {}); }
  @Post('import') @Roles('ADMIN') import(@Body() b: { text: string }) { return this.v.importLines(b?.text); }
  @Put(':id') @Roles('ADMIN') update(@Param('id') id: string, @Body() b: BuildingInput) { return this.v.update(id, b ?? {}); }
  @Delete(':id') @Roles('ADMIN') remove(@Param('id') id: string) { return this.v.remove(id); }

  // multipart/form-data: caption, photo (optional image up to 6 MB)
  @Post(':id/steps') @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 6 * 1024 * 1024 } }))
  addStep(@Param('id') id: string, @Body() b: { caption: string }, @UploadedFile() photo?: { buffer: Buffer }) { return this.v.addStep(id, b?.caption, photo); }
  @Delete('steps/:stepId') @Roles('ADMIN') removeStep(@Param('stepId') s: string) { return this.v.removeStep(s); }
  @Post('steps/:stepId/up') @Roles('ADMIN') up(@Param('stepId') s: string) { return this.v.moveStep(s, 'up'); }
  @Post('steps/:stepId/down') @Roles('ADMIN') down(@Param('stepId') s: string) { return this.v.moveStep(s, 'down'); }
}
