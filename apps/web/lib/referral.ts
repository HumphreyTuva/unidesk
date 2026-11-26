// A friend's invite link looks like unidesk.co.ke/?ref=abc12345. The code is kept on this phone until the new student signs up.
const KEY = 'unidesk_ref';
const OK = /^[a-z0-9]{4,16}$/i;

export function captureRef() {
  try {
    const r = new URLSearchParams(window.location.search).get('ref');
    if (r && OK.test(r)) localStorage.setItem(KEY, r.toLowerCase());
  } catch {}
}
export function getRef(): string | undefined {
  try { const r = localStorage.getItem(KEY); return r && OK.test(r) ? r : undefined; } catch { return undefined; }
}
export function clearRef() { try { localStorage.removeItem(KEY); } catch {} }
