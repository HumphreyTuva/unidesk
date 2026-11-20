import { BadRequestException, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { DAYS, Due, ReminderClass, classKey, dueNow, eatDateKey, payloadFor, toEat } from './due';

type SubInput = { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
type ScheduleInput = { enabled?: unknown; minsBefore?: unknown; weeks?: unknown; classes?: unknown };

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// Push reminders for classes. Needs VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY (see README). Without them the feature is off and nothing breaks.
// Every minute it looks at each student's weekly classes and sends a push when one is about to start.
@Injectable()
export class RemindersService implements OnModuleInit, OnModuleDestroy {
  private log = new Logger('Reminders');
  private timer?: NodeJS.Timeout;
  private wp: any = null;
  private pub = '';
  private running = false;

  constructor(private db: PrismaService) {}

  onModuleInit() {
    const pub = process.env.VAPID_PUBLIC_KEY?.trim();
    const priv = process.env.VAPID_PRIVATE_KEY?.trim();
    if (!pub || !priv) { this.log.warn('Push reminders are off. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to turn them on.'); return; }
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const wp = require('web-push');
      wp.setVapidDetails(process.env.VAPID_SUBJECT?.trim() || 'mailto:support@unidesk.co.ke', pub, priv);
      this.wp = wp; this.pub = pub;
    } catch (e: any) {
      this.log.error(`Push reminders are off: could not load web-push (${String(e?.message ?? e).slice(0, 120)}).`);
      return;
    }
    this.timer = setInterval(() => { this.tick().catch(e => this.log.error(`Reminder check failed: ${String(e?.message ?? e).slice(0, 200)}`)); }, 60_000);
    this.timer.unref?.();
    this.log.log('Push reminders are on.');
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  publicKey(): string | null { return this.wp ? this.pub : null; }

  // ---- what students call -------------------------------------------------

  async subscribe(userId: string, b: SubInput, userAgent?: string) {
    if (!this.wp) throw new BadRequestException('Reminders are not available right now.');
    const endpoint = str(b?.endpoint, 1000), p256dh = str(b?.keys?.p256dh, 200), auth = str(b?.keys?.auth, 100);
    if (!/^https:\/\//.test(endpoint) || !p256dh || !auth) throw new BadRequestException('That notification setup is not valid. Please try again.');
    // One endpoint belongs to one account: if someone else signs in on the same phone, it moves to them.
    await this.db.pushSubscription.upsert({
      where: { endpoint },
      create: { userId, endpoint, p256dh, auth, userAgent: userAgent?.slice(0, 200) },
      update: { userId, p256dh, auth, userAgent: userAgent?.slice(0, 200) },
    });
    // A few phones per student is plenty.
    const subs = await this.db.pushSubscription.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, select: { id: true } });
    if (subs.length > 5) await this.db.pushSubscription.deleteMany({ where: { id: { in: subs.slice(5).map(s => s.id) } } });
    return { ok: true };
  }

  async unsubscribe(userId: string, endpoint: unknown) {
    const e = str(endpoint, 1000);
    if (e) await this.db.pushSubscription.deleteMany({ where: { userId, endpoint: e } });
    return { ok: true };
  }

  async setSchedule(userId: string, b: ScheduleInput) {
    const enabled = b?.enabled !== false;
    const minsBefore = Math.round(Number(b?.minsBefore));
    const weeks = Math.round(Number(b?.weeks));
    if (!(minsBefore >= 1 && minsBefore <= 1440)) throw new BadRequestException('Choose between 1 and 1440 minutes before class.');
    if (!(weeks >= 1 && weeks <= 30)) throw new BadRequestException('Choose between 1 and 30 weeks.');
    if (!Array.isArray(b?.classes) || b.classes.length > 60) throw new BadRequestException('Too many classes.');
    const classes: ReminderClass[] = [];
    for (const raw of b.classes as any[]) {
      const code = str(raw?.code, 20), day = str(raw?.day, 12);
      const start = Number(raw?.start), end = Number(raw?.end);
      if (!code || !DAYS.includes(day) || !(start >= 0 && start < 24) || !(end > start && end <= 24)) continue;
      classes.push({ key: classKey({ code, day, start }), code, day, start, end, venue: str(raw?.venue, 60) || null, online: raw?.online === true, note: str(raw?.note, 200) });
    }
    const today = new Date(`${eatDateKey(new Date())}T00:00:00Z`);
    const endsOn = new Date(today.getTime() + weeks * 7 * 86_400_000);
    await this.db.classReminder.upsert({
      where: { userId },
      create: { userId, enabled, minsBefore, endsOn, classes: classes as any },
      update: { enabled, minsBefore, endsOn, classes: classes as any },
    });
    return { ok: true, classes: classes.length };
  }

  async status(userId: string) {
    const [subs, row] = await Promise.all([
      this.db.pushSubscription.count({ where: { userId } }),
      this.db.classReminder.findUnique({ where: { userId }, select: { enabled: true, minsBefore: true, endsOn: true, classes: true } }),
    ]);
    return {
      available: !!this.wp,
      devices: subs,
      enabled: !!row?.enabled && subs > 0,
      minsBefore: row?.minsBefore ?? 30,
      endsOn: row?.endsOn ?? null,
      classes: Array.isArray(row?.classes) ? (row!.classes as unknown[]).length : 0,
    };
  }

  async test(userId: string) {
    if (!this.wp) throw new BadRequestException('Reminders are not available right now.');
    const subs = await this.db.pushSubscription.findMany({ where: { userId }, select: { id: true, endpoint: true, p256dh: true, auth: true } });
    if (!subs.length) throw new BadRequestException('Turn on reminders on this phone first.');
    const r = await this.send(subs, { title: 'UniDesk reminders are working', body: 'You will get a reminder like this before each class.', url: '/guide/timetable', tag: 'unidesk-test' });
    if (!r.ok) throw new BadRequestException('We could not reach this phone. Turn reminders off and on again.');
    return { ok: true };
  }

  // ---- the minute-by-minute check ---------------------------------------

  async tick(now = new Date()) {
    if (!this.wp || this.running) return;
    this.running = true;
    try {
      const today = new Date(`${eatDateKey(now)}T00:00:00Z`);
      const rows = await this.db.classReminder.findMany({
        where: { enabled: true, endsOn: { gte: today }, user: { deletedAt: null, pushSubscriptions: { some: {} } } },
        select: { userId: true, minsBefore: true, classes: true, user: { select: { pushSubscriptions: { select: { id: true, endpoint: true, p256dh: true, auth: true } } } } },
      });
      for (const r of rows) {
        const classes = Array.isArray(r.classes) ? (r.classes as unknown as ReminderClass[]) : [];
        for (const d of dueNow(classes, r.minsBefore, now)) await this.deliver(r.userId, r.user.pushSubscriptions, d);
      }
      // Tidy the "already sent" log about once an hour.
      if (toEat(now).getUTCMinutes() === 0) await this.db.reminderSent.deleteMany({ where: { sentAt: { lt: new Date(now.getTime() - 2 * 86_400_000) } } });
    } finally {
      this.running = false;
    }
  }

  private async deliver(userId: string, subs: { id: string; endpoint: string; p256dh: string; auth: string }[], d: Due) {
    const key = `${userId}|${d.cls.key}|${d.dateKey}`;
    // The unique key means only one send per class per day, even if two servers run at once.
    const made = await this.db.reminderSent.createMany({ data: [{ key }], skipDuplicates: true });
    if (made.count === 0) return;
    const r = await this.send(subs, payloadFor(d));
    // Nothing got through and no phone was removed: let the next minute try again (within the late window).
    if (!r.ok && !r.gone) await this.db.reminderSent.deleteMany({ where: { key } }).catch(() => {});
  }

  private async send(subs: { id: string; endpoint: string; p256dh: string; auth: string }[], payload: object) {
    let ok = 0, gone = 0;
    for (const s of subs) {
      try {
        await this.wp.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 600, urgency: 'high' });
        ok++;
      } catch (e: any) {
        // 404 and 410 mean the phone no longer wants notifications: forget it.
        if (e?.statusCode === 404 || e?.statusCode === 410) { gone++; await this.db.pushSubscription.deleteMany({ where: { id: s.id } }).catch(() => {}); }
        else this.log.warn(`Push to one phone failed (${e?.statusCode ?? e?.name ?? 'error'}).`);
      }
    }
    return { ok: ok > 0, gone: gone > 0 };
  }
}
