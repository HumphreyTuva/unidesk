import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { COOKIE, JwtGuard } from './guards';
import { GoogleDto, LoginDto, RegisterDto } from './dto';

const cookieOptions = () => ({
  httpOnly: true, // JavaScript on the page can never read this cookie
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 7 * 24 * 3600 * 1000,
});

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  private send(res: Response, s: { token: string; user: unknown }) {
    res.cookie(COOKIE, s.token, cookieOptions());
    return { user: s.user };
  }

  @Post('register') @Throttle({ default: { limit: 10, ttl: 600_000 } })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    return this.send(res, await this.auth.register(dto));
  }

  @Post('login') @HttpCode(200) @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.send(res, await this.auth.login(dto));
  }

  @Post('google') @HttpCode(200) @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async google(@Body() dto: GoogleDto, @Res({ passthrough: true }) res: Response) {
    return this.send(res, await this.auth.googleSignIn(dto.credential));
  }

  @Post('logout') @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(COOKIE, { path: '/' });
    return { ok: true };
  }

  @Get('me') @UseGuards(JwtGuard)
  me(@Req() req: any) {
    return this.auth.me(req.user.id);
  }
}
