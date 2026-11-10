import { BadRequestException, Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { JwtGuard, Roles } from '../auth/guards';
import { SettingsService } from '../settings/settings.service';
import { MpesaService } from './mpesa.service';
import { PaymentsService } from './payments.service';

class UpdateSettingsDto {
  @IsOptional() @IsBoolean() paymentsEnabled?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5000) paperPrice?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50000) listingFee?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(365) listingDays?: number;
  @IsOptional() @IsIn(['full', 'first', 'preview']) readingMode?: 'full' | 'first' | 'preview';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10) freePages?: number;
}

@Controller('admin')
@UseGuards(JwtGuard)
export class AdminPaymentsController {
  constructor(private settings: SettingsService, private payments: PaymentsService, private mpesa: MpesaService) {}

  @Get('settings') @Roles('ADMIN')
  async get() {
    return { ...(await this.settings.all()), mpesaMode: this.mpesa.mode };
  }

  @Put('settings') @Roles('ADMIN')
  async update(@Body() dto: UpdateSettingsDto) {
    // Test mode approves every payment by itself, so on a real server it must never be allowed to charge students.
    if (dto.paymentsEnabled && !this.mpesa.live && process.env.NODE_ENV === 'production') {
      throw new BadRequestException('M-Pesa is not connected on this server yet, so payments cannot be switched on.');
    }
    if (dto.paymentsEnabled) {
      const price = dto.paperPrice ?? (await this.settings.all()).paperPrice;
      if (!(price >= 1)) throw new BadRequestException('Set a paper price before switching payments on.');
    }
    if (dto.paymentsEnabled !== undefined) await this.settings.set('payments_enabled', String(dto.paymentsEnabled));
    if (dto.paperPrice !== undefined) await this.settings.set('paper_price', String(dto.paperPrice));
    if (dto.listingFee !== undefined) await this.settings.set('listing_fee', String(dto.listingFee));
    if (dto.listingDays !== undefined) await this.settings.set('listing_days', String(dto.listingDays));
    if (dto.readingMode !== undefined) await this.settings.set('reading_mode', dto.readingMode);
    if (dto.freePages !== undefined) await this.settings.set('free_pages', String(dto.freePages));
    return { ...(await this.settings.all()), mpesaMode: this.mpesa.mode };
  }

  @Get('payments') @Roles('ADMIN')
  recent() {
    return this.payments.recent();
  }
}
