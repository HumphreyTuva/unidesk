import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtGuard, Roles } from '../auth/guards';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private ai: AiService) {}

  // Lets the app hide the assistant tab when no key is set.
  @Get('status') status() { return { enabled: this.ai.enabled() }; }

  // Sign-in is required (it costs money per question), plus a per-minute limit here and a daily one in the service.
  @Post('ask') @UseGuards(JwtGuard) @Throttle({ default: { limit: 8, ttl: 60_000 } })
  ask(@Req() req: any, @Body() b: { messages: unknown; conversationId?: string }) { return this.ai.ask(req.user.id, b?.messages, b?.conversationId); }

  // A student's own saved chats.
  @Get('conversations') @UseGuards(JwtGuard) mine(@Req() req: any) { return this.ai.myConversations(req.user.id); }
  @Get('conversations/:id') @UseGuards(JwtGuard) one(@Req() req: any, @Param('id') id: string) { return this.ai.myConversation(req.user.id, id); }
  @Delete('conversations/:id') @UseGuards(JwtGuard) remove(@Req() req: any, @Param('id') id: string) { return this.ai.deleteMine(req.user.id, id); }
}

// Admins read every student's chats to see what students ask and where the assistant falls short.
@Controller('admin/ai')
@UseGuards(JwtGuard)
export class AdminAiController {
  constructor(private ai: AiService) {}
  @Get('conversations') @Roles('ADMIN') list(@Query() q: { q?: string; take?: string; skip?: string }) { return this.ai.adminConversations(q); }
  @Get('conversations/:id') @Roles('ADMIN') one(@Param('id') id: string) { return this.ai.adminConversation(id); }
}
