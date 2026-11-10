import { Body, Controller, Get, Param, Post, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { JwtGuard, Roles } from '../auth/guards';
import { PapersService } from './papers.service';
import { UploadPaperDto } from './dto';

type Upload = { buffer: Buffer };

// Every route here needs the ADMIN role, checked against the database by JwtGuard.
@Controller('admin')
@UseGuards(JwtGuard)
export class AdminPapersController {
  constructor(private papers: PapersService) {}

  // multipart/form-data: file (PDF), preview (JPEG, made in the admin's browser), plus the fields in UploadPaperDto.
  @Post('papers') @Roles('ADMIN')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'file', maxCount: 1 }, { name: 'preview', maxCount: 1 }, { name: 'pages', maxCount: 30 }], { limits: { fileSize: 20 * 1024 * 1024 } }))
  upload(@Body() dto: UploadPaperDto, @UploadedFiles() files: { file?: Upload[]; preview?: Upload[]; pages?: Upload[] }) {
    return this.papers.upload(dto, files?.file?.[0], files?.preview?.[0], files?.pages ?? []);
  }

  @Get('paper-requests') @Roles('ADMIN', 'SUPPORT')
  requests() {
    return this.papers.openRequests();
  }

  // Dismiss every open request for one unit (for example, a mistyped code).
  @Post('paper-requests/:unitCode/reject') @Roles('ADMIN')
  reject(@Param('unitCode') unitCode: string) {
    return this.papers.rejectUnitRequests(unitCode);
  }
}
