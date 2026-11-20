import { Body, Controller, Get, Post, Put, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtGuard } from '../auth/guards';
import { RemindersService } from './reminders.service';

// Class reminders. Anyone signed in can manage their own; nobody can touch another student's.
@Controller('reminders')
export class RemindersController {
  constructor(private r: RemindersService) {}

  // The public half of the push key. null means reminders are switched off on the server.
  @Get('key') key() { return { publicKey: this.r.publicKey() }; }

  @Get('me') @UseGuards(JwtGuard) me(@Req() req: any) { return this.r.status(req.user.id); }

  @Post('subscribe') @UseGuards(JwtGuard)
  subscribe(@Req() req: any, @Body() b: any) { return this.r.subscribe(req.user.id, b, req.headers['user-agent']); }

  @Post('unsubscribe') @UseGuards(JwtGuard)
  unsubscribe(@Req() req: any, @Body() b: { endpoint?: string }) { return this.r.unsubscribe(req.user.id, b?.endpoint); }

  @Put('schedule') @UseGuards(JwtGuard)
  schedule(@Req() req: any, @Body() b: any) { return this.r.setSchedule(req.user.id, b); }

  @Post('test') @UseGuards(JwtGuard) @Throttle({ default: { limit: 5, ttl: 60_000 } })
  test(@Req() req: any) { return this.r.test(req.user.id); }
}
