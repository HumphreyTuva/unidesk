import { BadRequestException, ConflictException, HttpException, HttpStatus, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SettingsService } from '../settings/settings.service';
import { normalizePhone } from '../common/phone';
import { MpesaService } from './mpesa.service';

const FRIENDLY: Record<number, string> = {
  1: 'Your M-Pesa balance was not enough.',
  1032: 'You cancelled the payment.',
  1037: 'The M-Pesa prompt timed out. Please try again.',
  2001: 'The M-Pesa PIN was wrong.',
};
const reasonFor = (code: number | null, desc?: string) => (code != null && FRIENDLY[code]) || desc || 'The payment was not completed.';

@Injectable()
export class PaymentsService implements OnModuleInit {
  constructor(private db: PrismaService, private mpesa: MpesaService, private settings: SettingsService) {}

  // Safety net: every 20 s, ask Safaricom about payments still waiting (last 20 minutes), so a paper is never left locked
  // just because a callback was missed (for example, the server was asleep) or the student closed the page.
  onModuleInit() {
    if (!this.mpesa.live) return;
    const t = setInterval(() => this.sweep().catch(e => console.error('payment sweep failed', e)), 20_000);
    (t as any).unref?.();
  }
  private async sweep() {
    const pending = await this.db.payment.findMany({
      where: { status: 'PENDING', checkoutRequestId: { not: null }, createdAt: { gt: new Date(Date.now() - 20 * 60_000) } },
      take: 20,
    });
    for (const p of pending) {
      if (Date.now() - p.createdAt.getTime() < 8000) continue;
      await this.reconcile(p).catch(() => {});
    }
  }

  // ---- paper downloads ----
  async startPaperPayment(userId: string, paperId: string, phoneRaw: string) {
    if (!(await this.settings.paymentsEnabled())) throw new BadRequestException('Nothing to pay for right now.');
    const phone = normalizePhone(phoneRaw);
    if (!phone) throw new BadRequestException('Enter a valid Safaricom number, like 0712 345 678');

    const paper = await this.db.paper.findUnique({ where: { id: paperId } });
    if (!paper || !paper.published) throw new NotFoundException('Paper not found');
    if (await this.db.paperAccess.findUnique({ where: { userId_paperId: { userId, paperId } } })) throw new ConflictException('You already have this paper.');

    const amount = await this.settings.paperPrice();
    if (amount < 1) throw new BadRequestException('Nothing to pay for right now.');

    // A prompt was just sent for this paper: reuse it instead of buzzing the phone again.
    const recent = await this.db.payment.findFirst({
      where: { userId, paperId, purpose: 'PAPER_DOWNLOAD', status: 'PENDING', createdAt: { gt: new Date(Date.now() - 90_000) } },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) return { paymentId: recent.id, amount: recent.amount };

    // Stops anyone from triggering a stream of M-Pesa prompts: at most 6 attempts per account every 10 minutes.
    const attempts = await this.db.payment.count({ where: { userId, createdAt: { gt: new Date(Date.now() - 10 * 60_000) } } });
    if (attempts >= 6) throw new HttpException('Too many payment attempts. Please wait a few minutes and try again.', HttpStatus.TOO_MANY_REQUESTS);

    const checkoutRequestId = await this.mpesa.stkPush(phone, amount, paper.unitCode, 'UniDesk paper');
    const payment = await this.db.payment.create({ data: { userId, purpose: 'PAPER_DOWNLOAD', paperId, amount, phone, checkoutRequestId } });
    return { paymentId: payment.id, amount };
  }

  // ---- marketplace listings ----
  // Advertising always has a fee (set by the admin). It is separate from the paper-download switch, which only affects papers.
  async startListingPayment(userId: string, listingId: string, phoneRaw: string) {
    const phone = normalizePhone(phoneRaw);
    if (!phone) throw new BadRequestException('Enter a valid Safaricom number, like 0712 345 678');
    const listing = await this.db.listing.findUnique({ where: { id: listingId } });
    if (!listing || listing.userId !== userId) throw new NotFoundException('Listing not found');
    if (!['DRAFT', 'EXPIRED'].includes(listing.status)) throw new ConflictException('This ad does not need a payment right now.');
    const amount = (await this.settings.all()).listingFee;
    if (!(amount >= 1)) throw new BadRequestException('Nothing to pay for right now.');

    const recent = await this.db.payment.findFirst({
      where: { userId, listingId, purpose: 'MARKET_LISTING', status: 'PENDING', createdAt: { gt: new Date(Date.now() - 90_000) } },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) return { paymentId: recent.id, amount: recent.amount };
    const attempts = await this.db.payment.count({ where: { userId, createdAt: { gt: new Date(Date.now() - 10 * 60_000) } } });
    if (attempts >= 6) throw new HttpException('Too many payment attempts. Please wait a few minutes and try again.', HttpStatus.TOO_MANY_REQUESTS);

    const checkoutRequestId = await this.mpesa.stkPush(phone, amount, 'UniDesk ad', 'UniDesk advert');
    const payment = await this.db.payment.create({ data: { userId, purpose: 'MARKET_LISTING', listingId, amount, phone, checkoutRequestId } });
    return { paymentId: payment.id, amount };
  }

  // The student's page asks this every few seconds. It also checks with Safaricom, so it works even if the callback never arrives.
  async status(userId: string, paymentId: string) {
    const p = await this.db.payment.findUnique({ where: { id: paymentId } });
    if (!p || p.userId !== userId) throw new NotFoundException();
    const now = p.status === 'PENDING' ? await this.reconcile(p) : p;
    return { status: now.status, reason: now.status === 'FAILED' ? now.failureReason ?? 'The payment was not completed.' : undefined, paperId: now.paperId, listingId: now.listingId };
  }

  private async reconcile(p: { id: string; status: string; checkoutRequestId: string | null }) {
    if (p.status === 'PENDING' && p.checkoutRequestId) {
      const q = await this.mpesa.stkQuery(p.checkoutRequestId);
      if (q.resultCode === 0) await this.settle(p.id, true);
      else if (q.resultCode !== null) await this.settle(p.id, false, undefined, reasonFor(q.resultCode, q.desc));
    }
    return this.db.payment.findUniqueOrThrow({ where: { id: p.id } });
  }

  // Safaricom calls this. Three checks before anything is unlocked: the secret in the URL (checked by the controller),
  // the amount, and a direct confirmation from Safaricom's own query.
  async handleCallback(body: any) {
    const cb = body?.Body?.stkCallback;
    if (!cb?.CheckoutRequestID) return;
    const payment = await this.db.payment.findUnique({ where: { checkoutRequestId: String(cb.CheckoutRequestID) } });
    if (!payment || payment.status === 'SUCCESS') return;

    if (Number(cb.ResultCode) === 0) {
      const items: Array<{ Name: string; Value: unknown }> = cb.CallbackMetadata?.Item ?? [];
      const amount = Number(items.find(i => i.Name === 'Amount')?.Value);
      const receipt = String(items.find(i => i.Name === 'MpesaReceiptNumber')?.Value ?? '') || undefined;
      const confirmed = (await this.mpesa.stkQuery(payment.checkoutRequestId!)).resultCode === 0;
      if (amount === payment.amount && confirmed) await this.settle(payment.id, true, receipt);
      else console.log('M-Pesa callback not settled yet', { amountOk: amount === payment.amount, confirmed }); // the 20-second sweep retries
    } else if (payment.status === 'PENDING') {
      await this.settle(payment.id, false, undefined, reasonFor(Number(cb.ResultCode), cb.ResultDesc));
    }
  }

  // Safe to call twice: a payment can succeed only once. A waiting payment can become paid or failed.
  // A failed one can still be rescued by a real success (a late callback), but never the other way round.
  private async settle(paymentId: string, ok: boolean, receipt?: string, reason?: string) {
    await this.db.$transaction(async tx => {
      const claim = await tx.payment.updateMany({
        where: { id: paymentId, status: ok ? { in: ['PENDING', 'FAILED'] } : 'PENDING' },
        data: { status: ok ? 'SUCCESS' : 'FAILED', completedAt: new Date(), ...(receipt ? { mpesaReceipt: receipt } : {}), failureReason: ok ? null : reason ?? null },
      });
      if (!claim.count || !ok) return;
      const p = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
      if (p.purpose === 'PAPER_DOWNLOAD' && p.paperId) {
        await tx.paperAccess.upsert({
          where: { userId_paperId: { userId: p.userId, paperId: p.paperId } },
          update: {},
          create: { userId: p.userId, paperId: p.paperId },
        });
      } else if (p.purpose === 'MARKET_LISTING' && p.listingId) {
        // A paid ad (new, or renewed after it expired) goes to the admin for review. It is not visible until approved.
        await tx.listing.updateMany({ where: { id: p.listingId, status: { in: ['DRAFT', 'EXPIRED'] } }, data: { status: 'PENDING_REVIEW', rejectReason: null } });
      }
    });
  }

  // ---- admin ----
  async recent() {
    const rows = await this.db.payment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { paper: { select: { unitCode: true, year: true } } },
    });
    const sums = await this.db.payment.aggregate({ where: { status: 'SUCCESS' }, _sum: { amount: true }, _count: true });
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const today = await this.db.payment.aggregate({ where: { status: 'SUCCESS', completedAt: { gte: startOfDay } }, _sum: { amount: true }, _count: true });
    return {
      totals: { amount: sums._sum.amount ?? 0, count: sums._count, todayAmount: today._sum.amount ?? 0, todayCount: today._count },
      items: rows.map(p => ({ id: p.id, status: p.status, amount: p.amount, phone: p.phone, receipt: p.mpesaReceipt, reason: p.failureReason, what: p.paper ? `${p.paper.unitCode} ${p.paper.year}` : p.purpose === 'MARKET_LISTING' ? 'Advert' : p.purpose, createdAt: p.createdAt })),
    };
  }
}
