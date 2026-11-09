import { Body, Controller, Delete, Get, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { IsString, IsUrl, MaxLength, MinLength } from 'class-validator';
import { JwtGuard, Roles } from '../auth/guards';
import { PrismaService } from '../prisma.service';
import { UniversityService } from '../common/university.service';

class CreateLinkDto {
  @IsString() @MinLength(2) @MaxLength(60) title: string;
  // https only, so a Quick Link can never be a javascript: or http: address.
  @IsUrl({ protocols: ['https'], require_protocol: true }, { message: 'Enter a full link starting with https://' }) @MaxLength(300) url: string;
}

@Controller()
export class LinksController {
  constructor(private db: PrismaService, private uni: UniversityService) {}

  @Get('quick-links')
  async list() {
    return this.db.quickLink.findMany({
      where: { universityId: await this.uni.defaultId() },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, title: true, url: true },
    });
  }

  @Post('admin/quick-links') @UseGuards(JwtGuard) @Roles('ADMIN')
  async create(@Body() dto: CreateLinkDto) {
    const universityId = await this.uni.defaultId();
    const last = await this.db.quickLink.aggregate({ where: { universityId }, _max: { position: true } });
    return this.db.quickLink.create({
      data: { universityId, title: dto.title.trim(), url: dto.url.trim(), position: (last._max.position ?? 0) + 1 },
      select: { id: true, title: true, url: true },
    });
  }

  @Delete('admin/quick-links/:id') @UseGuards(JwtGuard) @Roles('ADMIN')
  async remove(@Param('id') id: string) {
    const r = await this.db.quickLink.deleteMany({ where: { id, universityId: await this.uni.defaultId() } });
    if (!r.count) throw new NotFoundException();
    return { ok: true };
  }
}
