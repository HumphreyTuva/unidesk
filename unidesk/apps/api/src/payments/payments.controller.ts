import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { timingSafeEqual } from 'crypto';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { JwtGuard } from '../auth/guards';
import { MpesaService } from './mpesa.service';
import { PaymentsService } from './payments.service';

class PayPaperDto {
  @IsString() @MaxLength(40) paperId: string;
  @IsString() @MinLength(9) @MaxLength(20) phone: string;
}

class PayListingDto {
  @IsString() @MaxLength(40) listingId: string;
  @IsString() @MinLength(9) @MaxLength(20) phone: string;
}

const ACK = { ResultCode: 0, ResultDesc: 'Accepted' }; // always answer 200 so Safaricom does not keep retrying

const sameSecret = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

@Controller('payments')
export class PaymentsController {
  constructor(private payments: PaymentsService, private mpesa: MpesaService) {}

  @Post('paper') @UseGuards(JwtGuard) @Throttle({ default: { limit: 8, ttl: 600_000 } })
  pay(@Req() req: any, @Body() dto: PayPaperDto) {
    return this.payments.startPaperPayment(req.user.id, dto.paperId, dto.phone);
  }

  @Post('listing') @UseGuards(JwtGuard) @Throttle({ default: { limit: 8, ttl: 600_000 } })
  payListing(@Req() req: any, @Body() dto: PayListingDto) {
    return this.payments.startListingPayment(req.user.id, dto.listingId, dto.phone);
  }

  @Get(':id/status') @UseGuards(JwtGuard) @SkipThrottle()
  status(@Req() req: any, @Param('id') id: string) {
    return this.payments.status(req.user.id, id);
  }

  // Safaricom calls this. The secret in the URL keeps strangers from posting fake confirmations.
  @Post('mpesa/callback') @HttpCode(200) @SkipThrottle()
  async callback(@Query('secret') secret: string, @Body() body: any) {
    if (this.mpesa.live && !(process.env.MPESA_CALLBACK_SECRET && sameSecret(String(secret ?? ''), process.env.MPESA_CALLBACK_SECRET))) {
      console.error('M-Pesa callback rejected: bad or missing secret');
      return ACK;
    }
    await this.payments.handleCallback(body).catch(e => console.error('M-Pesa callback error', e));
    return ACK;
  }
}
