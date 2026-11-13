import { Injectable, Logger } from '@nestjs/common';

export type Mail = { to: string; subject: string; html: string; text: string };

// Sends email through Resend (https://resend.com) using plain HTTPS, no extra package.
// Without RESEND_API_KEY nothing is sent and nothing breaks: the in-app "Your requests" list still works.
@Injectable()
export class MailService {
  private log = new Logger('Mail');

  enabled() { return !!process.env.RESEND_API_KEY?.trim(); }

  // Up to 100 emails per call. Never throws: a mail problem must not break an upload.
  async sendMany(mails: Mail[]): Promise<void> {
    if (!this.enabled() || !mails.length) return;
    const from = (process.env.MAIL_FROM || 'UniDesk <onboarding@resend.dev>').trim();
    for (let i = 0; i < mails.length; i += 100) {
      const chunk = mails.slice(i, i + 100);
      try {
        const res = await fetch('https://api.resend.com/emails/batch', {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`, 'content-type': 'application/json' },
          body: JSON.stringify(chunk.map(m => ({ from, to: [m.to], subject: m.subject, html: m.html, text: m.text }))),
          signal: AbortSignal.timeout(20_000),
        });
        if (!res.ok) this.log.error(`Resend returned ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`);
        else this.log.log(`Sent ${chunk.length} email(s).`);
      } catch (e: any) {
        this.log.error(`Email send failed: ${e?.name ?? 'Error'}: ${String(e?.message ?? e).slice(0, 200)}`);
      }
    }
  }
}
