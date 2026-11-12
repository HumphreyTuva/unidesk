import { Body, Controller, Delete, Get, Param, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BadRequestException } from '@nestjs/common';
import { JwtGuard, Roles } from '../auth/guards';
import { TimetableService } from './timetable.service';

const kindOf = (k: string) => {
  const v = (k ?? '').toUpperCase();
  if (v !== 'CLASS' && v !== 'EXAM') throw new BadRequestException('kind must be class or exam.');
  return v as 'CLASS' | 'EXAM';
};

// Students: no sign-in needed to build a timetable (it only reads the published sheet).
@Controller('timetable')
export class TimetableController {
  constructor(private t: TimetableService) {}

  @Get('info') info() { return this.t.info(); }

  @Get(':kind/units') units(@Param('kind') kind: string, @Query('q') q: string) { return this.t.units(kindOf(kind), q); }

  @Post('class') generateClass(@Body() b: { codes: unknown; choices?: Record<string, string> }) { return this.t.generateClass(b?.codes, b?.choices); }

  @Post('exam') generateExam(@Body() b: { codes: unknown }) { return this.t.generateExam(b?.codes); }
}

// Admin only. The server checks the ADMIN role on every request.
@Controller('admin/timetables')
@UseGuards(JwtGuard)
export class AdminTimetableController {
  constructor(private t: TimetableService) {}

  @Get() @Roles('ADMIN') list() { return this.t.list(); }

  // multipart/form-data: kind (class|exam), label, file (.html)
  @Post() @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  upload(@Body() b: { kind: string; label: string }, @UploadedFile() file?: { buffer: Buffer }) {
    const label = (b?.label ?? '').trim().slice(0, 80);
    if (!label) throw new BadRequestException('Give it a name, for example "Semester 1, 2026/2027".');
    return this.t.upload(kindOf(b?.kind), label, file);
  }

  @Post(':id/publish') @Roles('ADMIN') publish(@Param('id') id: string) { return this.t.publish(id); }
  @Post(':id/unpublish') @Roles('ADMIN') unpublish(@Param('id') id: string) { return this.t.unpublish(id); }
  @Delete(':id') @Roles('ADMIN') remove(@Param('id') id: string) { return this.t.remove(id); }
}
