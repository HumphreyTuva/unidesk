import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';

export const COOKIE = 'unidesk_token';
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

// Reads the sign-in cookie (or an Authorization: Bearer header for tools), then loads the account from the database.
// The role always comes from the database, so changing a role or deleting an account takes effect immediately.
@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private jwt: JwtService, private reflector: Reflector, private db: PrismaService) {}

  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const token = req.cookies?.[COOKIE] || bearer;
    if (!token) throw new UnauthorizedException();

    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException();
    }
    const user = await this.db.user.findUnique({ where: { id: payload.sub }, select: { id: true, role: true, deletedAt: true } });
    if (!user || user.deletedAt) throw new UnauthorizedException();
    req.user = { id: user.id, role: user.role };

    const roles = this.reflector.get<string[]>('roles', ctx.getHandler());
    if (roles?.length && !roles.includes(user.role)) throw new ForbiddenException();
    return true;
  }
}
