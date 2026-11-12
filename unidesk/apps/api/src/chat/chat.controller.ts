import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtGuard, Roles } from '../auth/guards';
import { ChatService } from './chat.service';

@Controller('chat')
@UseGuards(JwtGuard)
export class ChatController {
  constructor(private chat: ChatService) {}

  // The polling call: cheap, so it gets a roomier limit than sending.
  @Get() @Throttle({ default: { limit: 60, ttl: 60_000 } })
  mine(@Req() req: any, @Query('since') since?: string) { return this.chat.mine(req.user.id, since); }

  @Post('messages') @Throttle({ default: { limit: 15, ttl: 60_000 } })
  send(@Req() req: any, @Body() b: { body: string }) { return this.chat.send(req.user.id, b?.body); }
}

@Controller('admin/chat')
@UseGuards(JwtGuard)
export class AdminChatController {
  constructor(private chat: ChatService) {}

  @Get('threads') @Roles('ADMIN', 'SUPPORT') @Throttle({ default: { limit: 60, ttl: 60_000 } })
  threads() { return this.chat.threads(); }

  @Get('threads/:id') @Roles('ADMIN', 'SUPPORT') @Throttle({ default: { limit: 60, ttl: 60_000 } })
  thread(@Param('id') id: string, @Query('since') since?: string) { return this.chat.thread(id, since); }

  @Post('threads/:id/messages') @Roles('ADMIN', 'SUPPORT')
  reply(@Req() req: any, @Param('id') id: string, @Body() b: { body: string }) { return this.chat.reply(req.user.id, id, b?.body); }

  @Post('threads/:id/close') @Roles('ADMIN', 'SUPPORT')
  close(@Param('id') id: string) { return this.chat.close(id); }
}
