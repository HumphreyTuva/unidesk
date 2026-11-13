// Email-safe HTML: tables, inline styles and an absolute logo address, because mail apps ignore stylesheets and relative links.
const esc = (t: string) => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export type ReadyPaper = { unitCode: string; title: string; year: number; sitting?: string | null; school?: string | null };

export function paperReadyEmail(opts: { hi: string; paper: ReadyPaper; link: string; site: string }) {
  const { hi, paper, link, site } = opts;
  const showTitle = paper.title.trim().toLowerCase() !== paper.unitCode.toLowerCase();
  const details = [paper.year ? String(paper.year) : '', paper.sitting ?? '', paper.school ?? ''].map(s => s.trim()).filter(Boolean).join(' · ');

  const text = [
    `Hi ${opts.hi},`,
    '',
    `Good news: the past paper you requested is now on UniDesk.`,
    '',
    `${paper.unitCode}${showTitle ? ` ${paper.title}` : ''}${details ? ` (${details})` : ''}`,
    '',
    `Open it here: ${link}`,
    '',
    `You got this email because you requested this paper on UniDesk (${site}).`,
    `UniDesk is an independent student app, not the official KU portal.`,
  ].join('\n');

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Your past paper is ready</title></head>
<body style="margin:0;padding:0;background:#EEF2FA;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(paper.unitCode)} is now on UniDesk. Tap to open it.&#8199;&zwnj;&#8199;&zwnj;&#8199;&zwnj;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#EEF2FA" style="background:#EEF2FA;">
<tr><td align="center" style="padding:28px 12px;">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;">
    <tr><td align="left" style="padding:0 4px 14px;">
      <a href="${site}" style="text-decoration:none;"><img src="${site}/icons/email-logo.png" width="150" alt="UniDesk" style="display:block;width:150px;height:auto;border:0;"></a>
    </td></tr>
    <tr><td bgcolor="#FFFFFF" style="background:#FFFFFF;border-radius:18px;border:1px solid #DDE3F0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td height="6" bgcolor="#F5A200" style="height:6px;line-height:6px;font-size:0;background:#F5A200;border-radius:18px 18px 0 0;">&nbsp;</td></tr>
        <tr><td style="padding:30px 30px 8px;font-family:Arial,Helvetica,sans-serif;color:#0F1F4D;">
          <p style="margin:0 0 6px;font-size:13px;font-weight:bold;letter-spacing:.06em;text-transform:uppercase;color:#1B3A8A;">Past paper ready</p>
          <h1 style="margin:0 0 14px;font-size:24px;line-height:1.25;color:#0F1F4D;">Good news, ${esc(hi)}. Your paper is here.</h1>
          <p style="margin:0 0 20px;font-size:16px;line-height:1.55;color:#33415F;">You asked us for <b>${esc(paper.unitCode)}</b> and we have just added it. You can read it in the app straight away.</p>
        </td></tr>
        <tr><td style="padding:0 30px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#EEF2FA" style="background:#EEF2FA;border-radius:14px;border-left:5px solid #1B3A8A;">
            <tr><td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif;">
              <div style="font-size:22px;font-weight:bold;color:#0F1F4D;">${esc(paper.unitCode)}</div>
              ${showTitle ? `<div style="margin-top:4px;font-size:15px;color:#33415F;">${esc(paper.title)}</div>` : ''}
              ${details ? `<div style="margin-top:6px;font-size:13px;color:#5B6478;">${esc(details)}</div>` : ''}
            </td></tr>
          </table>
        </td></tr>
        <tr><td align="left" style="padding:0 30px 30px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td bgcolor="#1B3A8A" style="background:#1B3A8A;border-radius:12px;">
              <a href="${link}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#FFFFFF;text-decoration:none;">Open the paper</a>
            </td>
          </tr></table>
          <p style="margin:14px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5B6478;">Button not working? Copy this link into your browser:<br><a href="${link}" style="color:#1B3A8A;word-break:break-all;">${esc(link)}</a></p>
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:18px 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#5B6478;" align="center">
      You got this email because you requested this paper on <a href="${site}" style="color:#1B3A8A;">UniDesk</a>.<br>
      UniDesk is an independent student app for Kenyatta University students, not the official KU portal.<br>
      <a href="${site}/papers" style="color:#1B3A8A;">Browse past papers</a> &nbsp;·&nbsp; <a href="${site}/faq" style="color:#1B3A8A;">Help</a>
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`;
  return { text, html };
}
