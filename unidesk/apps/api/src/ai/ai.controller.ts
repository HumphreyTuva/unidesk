import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtGuard } from '../auth/guards';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private ai: AiService) {}

  // Lets the app hide the assistant tab when no key is set.
  @Get('status') status() { return { enabled: this.ai.enabled() }; }

  // Sign-in is required (it costs money per question), plus a per-minute limit here and a daily one in the service.
  @Post('ask') @UseGuards(JwtGuard) @Throttle({ default: { limit: 8, ttl: 60_000 } })
  ask(@Req() req: any, @Body() b: { messages: unknown }) { return this.ai.ask(req.user.id, b?.messages); }
}
