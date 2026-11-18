import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { hashPassword, verifyPassword } from '../common/password';
import { USERNAME_RE, adminEmails, looksLikeEmail, normalizeEmail, normalizeUsername } from '../common/identity';
import { LoginDto, RegisterDto } from './dto';
import { createHash } from 'crypto';
import { MailService } from '../mail/mail.service';
import { passwordResetEmail } from '../mail/templates';

// One fixed hash so a login for a name that does not exist takes about as long as one that does.
const DUMMY_HASH = 'scrypt$00000000000000000000000000000000$' + '00'.repeat(64);

@Injectable()
export class AuthService {
  constructor(private db: PrismaService, private jwt: JwtService, private mail: MailService) {}

  private publicUser(u: { id: string; name: string | null; email: string | null; username: string | null; usernameDisplay: string | null; role: string; school?: string | null }) {
    return { id: u.id, name: u.name, email: u.email, username: u.usernameDisplay || u.username, role: u.role, school: u.school ?? null };
  }

  async session(user: { id: string; role: string; name: string | null; email: string | null; username: string | null; usernameDisplay: string | null; school?: string | null }) {
    const token = await this.jwt.signAsync({ sub: user.id, role: user.role });
    return { token, user: this.publicUser(user) };
  }

  // The app is for one university for now. New accounts join it; a second university is added later by seeding another row.
  private async defaultUniversityId() {
    const uni = await this.db.university.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!uni) throw new BadRequestException('The app is not set up yet. Run the database seed.');
    return uni.id;
  }

  async register(dto: RegisterDto) {
    const email = dto.email ? normalizeEmail(dto.email) : undefined;
    const username = dto.username ? normalizeUsername(dto.username) : undefined;
    if (!email && !username) throw new BadRequestException('Enter an email or choose a username');
    if (username && !USERNAME_RE.test(username)) throw new BadRequestException('Username must be 3-20 letters, numbers, dots or underscores');

    // Admin emails can only be claimed through Google, so nobody can register an admin's address first.
    if (email && adminEmails().includes(email)) throw new BadRequestException('Please use "Continue with Google" for this email.');

    if (email && (await this.db.user.findUnique({ where: { email } }))) throw new ConflictException('That email is already registered. Try signing in.');
    if (username && (await this.db.user.findUnique({ where: { username } }))) throw new ConflictException('That username is taken. Try another.');

    const user = await this.db.user.create({
      data: {
        universityId: await this.defaultUniversityId(),
        email,
        username,
        usernameDisplay: dto.username?.trim(),
        name: dto.name?.trim() || null,
        passwordHash: await hashPassword(dto.password),
        // Nothing has confirmed this email yet. If the real owner later signs in with Google, that account takes over (see googleSignIn).
        emailVerified: false,
      },
    });
    return this.session(user);
  }

  async login(dto: LoginDto) {
    const id = dto.identifier.trim();
    const user = looksLikeEmail(id)
      ? await this.db.user.findUnique({ where: { email: normalizeEmail(id) } })
      : await this.db.user.findUnique({ where: { username: normalizeUsername(id) } });
    const ok = await verifyPassword(dto.password, user?.passwordHash ?? DUMMY_HASH);
    // The same message for "no such account" and "wrong password" so nobody can probe which accounts exist.
    if (!user || user.deletedAt || !ok) throw new UnauthorizedException('Incorrect email/username or password');
    return this.session(user);
  }

  // Google sign-in: the browser sends a signed ID token. Google confirms it, we check it was issued for OUR app
  // and that the email is verified, then find or create the account by email.
  async googleSignIn(credential: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) throw new BadRequestException('Google sign-in is not set up yet');
    const fail = new BadRequestException('Google sign-in failed. Please try again.');

    let g: any;
    try {
      const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential));
      if (!r.ok) throw fail;
      g = await r.json();
    } catch {
      throw fail;
    }
    const okIssuer = ['accounts.google.com', 'https://accounts.google.com'].includes(g.iss);
    if (g.aud !== clientId || !okIssuer || String(g.email_verified) !== 'true' || !g.email || !g.sub) throw fail;

    const email = normalizeEmail(g.email);
    const isAdmin = adminEmails().includes(email);
    const existing = await this.db.user.findUnique({ where: { email } });

    if (!existing) {
      const user = await this.db.user.create({
        data: {
          universityId: await this.defaultUniversityId(),
          email,
          emailVerified: true,
          googleId: String(g.sub),
          name: g.name || null,
          role: isAdmin ? 'ADMIN' : 'STUDENT',
        },
      });
      return this.session(user);
    }
    if (existing.deletedAt) throw fail;

    // If the account was created with a password and the email was never confirmed, someone else may have typed this
    // address in. Google has now proved it belongs to this person, so we drop that password and link the Google account.
    const user = await this.db.user.update({
      where: { id: existing.id },
      data: {
        googleId: existing.googleId ?? String(g.sub),
        emailVerified: true,
        passwordHash: existing.emailVerified ? existing.passwordHash : null,
        ...(isAdmin ? { role: 'ADMIN' as const } : {}),
        name: existing.name ?? g.name ?? null,
      },
    });
    return this.session(user);
  }

  async me(userId: string) {
    const u = await this.db.user.findUnique({ where: { id: userId } });
    if (!u || u.deletedAt) throw new UnauthorizedException();
    return this.publicUser(u);
  }

  // ---- forgot password ----
  // The link holds a signed token that expires in 30 minutes and stops working once the password changes
  // (it carries a fingerprint of the current password). It is signed with its own secret, so it can never be used as a login cookie.
  private resetSecret() { return (process.env.JWT_SECRET || 'dev-secret') + ':reset'; }
  private fingerprint(hash: string | null) { return createHash('sha256').update(hash ?? '').digest('hex').slice(0, 16); }

  // Always answers the same way, so nobody can use this to find out who has an account.
  async forgotPassword(identifierRaw: string) {
    const id = identifierRaw.trim();
    const user = looksLikeEmail(id)
      ? await this.db.user.findUnique({ where: { email: normalizeEmail(id) } })
      : await this.db.user.findUnique({ where: { username: normalizeUsername(id) } });
    // Admin addresses sign in with Google only, so they never get a password link.
    if (user && !user.deletedAt && user.email && !adminEmails().includes(user.email)) {
      const token = await this.jwt.signAsync({ sub: user.id, purpose: 'reset', fp: this.fingerprint(user.passwordHash) }, { secret: this.resetSecret(), expiresIn: '30m' });
      const site = (process.env.SITE_URL || 'https://unidesk.co.ke').replace(/\/$/, '');
      const link = `${site}/reset-password?token=${encodeURIComponent(token)}`;
      void this.mail.sendMany([{ to: user.email, ...passwordResetEmail({ hi: (user.name || '').split(' ')[0] || 'there', link, site }) }]);
    }
    return { ok: true };
  }

  async resetPassword(token: string, password: string) {
    const bad = new BadRequestException('This reset link is invalid or has expired. Please ask for a new one.');
    let payload: { sub: string; purpose: string; fp: string };
    try { payload = await this.jwt.verifyAsync(token, { secret: this.resetSecret() }); } catch { throw bad; }
    if (payload.purpose !== 'reset') throw bad;
    const user = await this.db.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.deletedAt || payload.fp !== this.fingerprint(user.passwordHash)) throw bad;
    const updated = await this.db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password), emailVerified: true } });
    return this.session(updated);
  }
}

