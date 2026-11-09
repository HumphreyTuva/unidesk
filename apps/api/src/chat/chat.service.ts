import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

const MAX_BODY = 1000;
const PAGE = 200;

const clean = (v: unknown) => {
  const t = typeof v === 'string' ? v.replace(/\r\n/g, '\n').trim() : '';
  if (!t) throw new BadRequestException('Type a message first.');
  if (t.length > MAX_BODY) throw new BadRequestException(`Messages can be up to ${MAX_BODY} characters.`);
  return t;
};
const since = (v?: string) => { const d = v ? new Date(v) : null; return d && !isNaN(+d) ? d : undefined; };
const out = (m: { id: string; fromStaff: boolean; body: string; createdAt: Date }) => ({ id: m.id, fromStaff: m.fromStaff, body: m.body, at: m.createdAt.toISOString() });

// Support chat. Students only ever touch their own open thread; staff routes are role-guarded in the controller.
// The page polls every few seconds with `since`, which works on every host and phone and survives a sleeping server.
@Injectable()
export class ChatService {
  constructor(private db: PrismaService) {}

  // ---- student ----
  async mine(userId: string, sinceIso?: string) {
    const thread = await this.db.chatThread.findFirst({ where: { userId, closed: false }, orderBy: { createdAt: 'desc' } });
    if (!thread) return { open: false, messages: [] };
    const msgs = await this.db.chatMessage.findMany({
      where: { threadId: thread.id, ...(since(sinceIso) ? { createdAt: { gt: since(sinceIso) } } : {}) },
      orderBy: { createdAt: 'asc' }, take: PAGE,
    });
    return { open: true, messages: msgs.map(out) };
  }

  async send(userId: string, body: unknown) {
    const text = clean(body);
    let thread = await this.db.chatThread.findFirst({ where: { userId, closed: false } });
    if (!thread) thread = await this.db.chatThread.create({ data: { userId } });
    // A student cannot flood a thread while waiting: at most 40 unanswered messages.
    const last = await this.db.chatMessage.findMany({ where: { threadId: thread.id }, orderBy: { createdAt: 'desc' }, take: 40, select: { fromStaff: true } });
    if (last.length === 40 && last.every(m => !m.fromStaff)) throw new BadRequestException('Please wait for a reply from support.');
    const m = await this.db.chatMessage.create({ data: { threadId: thread.id, senderId: userId, fromStaff: false, body: text } });
    await this.db.chatThread.update({ where: { id: thread.id }, data: { updatedAt: new Date() } });
    return out(m);
  }

  // ---- staff ----
  private who(u: { usernameDisplay: string | null; name: string | null; email: string | null }) {
    return u.name || u.usernameDisplay || (u.email ? u.email.split('@')[0] : 'Student');
  }

  async threads() {
    const rows = await this.db.chatThread.findMany({
      where: { closed: false }, orderBy: { updatedAt: 'desc' }, take: 100,
      include: { user: { select: { usernameDisplay: true, name: true, email: true } }, messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    // Threads waiting on staff come first, oldest waiting first.
    return rows
      .map(t => ({ id: t.id, who: this.who(t.user), last: t.messages[0]?.body.slice(0, 80) ?? '', at: t.updatedAt.toISOString(), waiting: !!t.messages[0] && !t.messages[0].fromStaff }))
      .sort((a, b) => Number(b.waiting) - Number(a.waiting) || (a.waiting ? a.at.localeCompare(b.at) : b.at.localeCompare(a.at)));
  }

  async thread(id: string, sinceIso?: string) {
    const t = await this.db.chatThread.findUnique({ where: { id }, include: { user: { select: { usernameDisplay: true, name: true, email: true } } } });
    if (!t) throw new NotFoundException('Conversation not found.');
    const msgs = await this.db.chatMessage.findMany({
      where: { threadId: id, ...(since(sinceIso) ? { createdAt: { gt: since(sinceIso) } } : {}) },
      orderBy: { createdAt: 'asc' }, take: PAGE,
    });
    return { id: t.id, who: this.who(t.user), closed: t.closed, messages: msgs.map(out) };
  }

  async reply(staffId: string, id: string, body: unknown) {
    const text = clean(body);
    const t = await this.db.chatThread.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Conversation not found.');
    if (t.closed) throw new BadRequestException('This conversation is closed.');
    const m = await this.db.chatMessage.create({ data: { threadId: id, senderId: staffId, fromStaff: true, body: text } });
    await this.db.chatThread.update({ where: { id }, data: { updatedAt: new Date() } });
    return out(m);
  }

  async close(id: string) {
    await this.db.chatThread.update({ where: { id }, data: { closed: true } }).catch(() => { throw new NotFoundException('Conversation not found.'); });
    return { ok: true };
  }
}
