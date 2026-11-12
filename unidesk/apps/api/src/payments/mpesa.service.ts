import { Injectable, InternalServerErrorException } from '@nestjs/common';

// MPESA_MODE=mock (default): fakes the prompt and approves it after a few seconds. For testing on your computer only.
// MPESA_MODE=live: talks to Safaricom Daraja. Sandbox: MPESA_BASE_URL=https://sandbox.safaricom.co.ke (default). Production: https://api.safaricom.co.ke
//
// Buy Goods Till (the default): BusinessShortCode = the till's store/head-office number (MPESA_SHORTCODE),
// PartyB = the till number customers pay to (MPESA_PARTY_B), transaction type CustomerBuyGoodsOnline.
// Paybill instead: MPESA_TRANSACTION_TYPE=CustomerPayBillOnline and leave MPESA_PARTY_B empty.
const REQUIRED_LIVE = ['MPESA_KEY', 'MPESA_SECRET', 'MPESA_SHORTCODE', 'MPESA_PASSKEY', 'MPESA_CALLBACK_URL', 'MPESA_CALLBACK_SECRET'];

@Injectable()
export class MpesaService {
  get live() { return process.env.MPESA_MODE === 'live'; }
  get mode(): 'live' | 'mock' { return this.live ? 'live' : 'mock'; }
  private get base() { return (process.env.MPESA_BASE_URL || 'https://sandbox.safaricom.co.ke').replace(/\/$/, ''); }

  constructor() {
    if (this.live) {
      const missing = REQUIRED_LIVE.filter(k => !process.env[k]);
      if (missing.length) throw new Error(`MPESA_MODE=live but these are not set: ${missing.join(', ')}`);
    }
  }

  private async token() {
    const auth = Buffer.from(`${process.env.MPESA_KEY}:${process.env.MPESA_SECRET}`).toString('base64');
    const r = await fetch(`${this.base}/oauth/v1/generate?grant_type=client_credentials`, { headers: { Authorization: `Basic ${auth}` } });
    if (!r.ok) {
      console.error('M-Pesa auth failed', r.status);
      throw new InternalServerErrorException('M-Pesa is temporarily unavailable. Please try again shortly.');
    }
    return (await r.json()).access_token as string;
  }

  private creds() {
    const timestamp = new Date(Date.now() + 3 * 3600_000).toISOString().replace(/\D/g, '').slice(0, 14); // Nairobi time, as Daraja expects
    const shortcode = process.env.MPESA_SHORTCODE!;
    return { timestamp, shortcode, password: Buffer.from(shortcode + process.env.MPESA_PASSKEY + timestamp).toString('base64') };
  }

  // Sends the "enter your PIN" prompt to the customer's phone. Returns Safaricom's CheckoutRequestID.
  async stkPush(phone: string, amount: number, reference: string, description: string): Promise<string> {
    if (!this.live) {
      // Mock mode approves every payment, so it must never run on a real server.
      if (process.env.NODE_ENV === 'production') throw new InternalServerErrorException('Payments are not configured on this server.');
      return `MOCK-${Date.now()}`;
    }
    const { timestamp, shortcode, password } = this.creds();
    const type = process.env.MPESA_TRANSACTION_TYPE || 'CustomerBuyGoodsOnline';
    const r = await fetch(`${this.base}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${await this.token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: type,
        Amount: amount,
        PartyA: phone,
        PartyB: process.env.MPESA_PARTY_B || shortcode,
        PhoneNumber: phone,
        CallBackURL: process.env.MPESA_CALLBACK_URL,
        AccountReference: reference.slice(0, 12),
        TransactionDesc: description.slice(0, 20),
      }),
    });
    const d = await r.json().catch(() => ({}));
    if (d.ResponseCode !== '0') {
      console.error('M-Pesa STK push failed', r.status, d?.errorCode, d?.errorMessage || d?.ResponseDescription);
      throw new InternalServerErrorException('Could not send the M-Pesa prompt. Check the phone number and try again.');
    }
    return d.CheckoutRequestID as string;
  }

  // Asks Safaricom directly what happened. resultCode: 0 = paid, another number = failed or cancelled, null = still waiting or unknown.
  async stkQuery(checkoutRequestId: string): Promise<{ resultCode: number | null; desc?: string }> {
    if (!this.live) {
      const started = Number(checkoutRequestId.replace('MOCK-', ''));
      return Date.now() - started > 4000 ? { resultCode: 0 } : { resultCode: null };
    }
    try {
      const { timestamp, shortcode, password } = this.creds();
      const r = await fetch(`${this.base}/mpesa/stkpushquery/v1/query`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${await this.token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ BusinessShortCode: shortcode, Password: password, Timestamp: timestamp, CheckoutRequestID: checkoutRequestId }),
      });
      const d = await r.json().catch(() => ({}));
      if (d.ResultCode === undefined) return { resultCode: null };
      const code = Number(d.ResultCode);
      // 4999 = "still under processing": the customer has not finished yet. Keep waiting; this is not a failure.
      if (code === 4999 || /still under processing|being processed/i.test(String(d.ResultDesc || ''))) return { resultCode: null };
      return { resultCode: code, desc: d.ResultDesc };
    } catch (e) {
      console.error('M-Pesa query error', e);
      return { resultCode: null };
    }
  }
}
