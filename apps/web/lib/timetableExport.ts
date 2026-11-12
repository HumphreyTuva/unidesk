// Draws a timetable onto a canvas and returns a PNG. Design ideas (weekly grid, poster cards, dark poster,
// colour categories, custom sizes) come from the Ratiba timetable project.

export type Cat = 'elearning' | 'lab' | 'campus' | 'other' | 'exam';
export type ExItem = { code: string; time: string; meta: string; cat: Cat; clash: boolean; start?: number; end?: number };
export type ExDay = { title: string; items: ExItem[] };
export type ExText = { title: string; subtitle: string; footer: string };
export type Design = 'auto' | 'grid' | 'poster' | 'dark';

export const CAT: Record<Cat, { label: string; bg: string; border: string; dbg: string }> = {
  elearning: { label: 'E-learning', bg: '#DFF0E4', border: '#5C9270', dbg: '#1d3a2b' },
  lab: { label: 'Lab / practical', bg: '#DDEBF9', border: '#3B7FC4', dbg: '#1a3350' },
  campus: { label: 'On campus', bg: '#FBEAD3', border: '#E08A2C', dbg: '#4a3418' },
  other: { label: 'Other venue', bg: '#EAE1F7', border: '#8A63C4', dbg: '#33284d' },
  exam: { label: 'Exam', bg: '#E6ECFB', border: '#1B3A8A', dbg: '#1c2a55' },
};
export const CLASH = { bg: '#FBE2DF', border: '#E2574C', dbg: '#521f1c' };

export const SIZE_PRESETS = [
  { id: 'wide', label: 'Wide', width: 2400, height: 1200 },
  { id: 'square', label: 'Square', width: 1080, height: 1080 },
  { id: 'story', label: 'Phone story', width: 1080, height: 1920 },
  { id: 'hd', label: 'HD landscape', width: 2560, height: 1440 },
  { id: 'poster', label: 'Poster square', width: 2160, height: 2160 },
];
export const DESIGNS: { id: Design; label: string; note: string }[] = [
  { id: 'auto', label: 'Auto', note: 'Grid or poster, whichever fits the size' },
  { id: 'grid', label: 'Weekly grid', note: 'Days down, hours across' },
  { id: 'poster', label: 'Poster', note: 'Bold cards by day' },
  { id: 'dark', label: 'Dark poster', note: 'Dark with glowing accents' },
];
export const MIN_SIDE = 128, MAX_SIDE = 4096;
export const clampSide = (n: number) => Math.min(MAX_SIDE, Math.max(MIN_SIDE, Math.round(Number.isFinite(n) ? n : 1080)));

type Theme = { paper: string; surface: string; ink: string; soft: string; line: string; accent: string; dark: boolean };
const LIGHT: Theme = { paper: '#F5F7FC', surface: '#FFFFFF', ink: '#0F1F4D', soft: '#5B6478', line: '#DDE3F0', accent: '#1B3A8A', dark: false };
const DARK: Theme = { paper: '#0B1230', surface: '#141C45', ink: '#F2F5FF', soft: '#9AA7D6', line: '#26316B', accent: '#5CC8FF', dark: true };

export const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h >= 12 ? 'PM' : 'AM'}`;

function fit(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t + '…';
}
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function colours(it: ExItem, t: Theme) {
  const c = it.clash ? CLASH : CAT[it.cat];
  return { bg: t.dark ? c.dbg : c.bg, border: c.border };
}
function draw(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, font: string, color: string, maxW: number, align: CanvasTextAlign = 'left') {
  ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  ctx.fillText(fit(ctx, text, maxW), x, y);
}

function header(ctx: CanvasRenderingContext2D, W: number, t: Theme, text: ExText, F: string, left: number, top: number) {
  draw(ctx, left, top + 30, text.title || 'My timetable', `800 30px ${F}`, t.ink, W - left * 2);
  draw(ctx, left, top + 52, (text.subtitle || '').toUpperCase(), `700 12px ${F}`, t.dark ? t.accent : t.accent, W - left * 2);
  return top + 70;
}
function footer(ctx: CanvasRenderingContext2D, W: number, H: number, t: Theme, text: ExText, F: string, left: number) {
  draw(ctx, left, H - 14, text.footer || 'Made with UniDesk · unidesk.co.ke', `600 11px ${F}`, t.soft, W - left * 2);
}
function legend(ctx: CanvasRenderingContext2D, items: ExDay[], t: Theme, F: string, x: number, y: number, maxX: number) {
  const used = new Set<Cat>(); let clash = false;
  items.forEach(d => d.items.forEach(i => { used.add(i.cat); if (i.clash) clash = true; }));
  const entries: { label: string; c: { bg: string; border: string } }[] = [...used].map(k => ({ label: CAT[k].label, c: { bg: t.dark ? CAT[k].dbg : CAT[k].bg, border: CAT[k].border } }));
  if (clash) entries.push({ label: 'Clash', c: { bg: t.dark ? CLASH.dbg : CLASH.bg, border: CLASH.border } });
  let cx = x;
  for (const e of entries) {
    ctx.font = `600 11px ${F}`;
    const w = ctx.measureText(e.label).width + 26;
    if (cx + w > maxX) break;
    rr(ctx, cx, y - 10, 14, 14, 4); ctx.fillStyle = e.c.bg; ctx.fill(); ctx.strokeStyle = e.c.border; ctx.lineWidth = 2; ctx.stroke();
    draw(ctx, cx + 20, y + 1, e.label, `600 11px ${F}`, t.soft, 200);
    cx += w + 14;
  }
}

// ---------- grid ----------
function drawGrid(ctx: CanvasRenderingContext2D, days: ExDay[], W: number, H: number, text: ExText, F: string) {
  const t = LIGHT;
  ctx.fillStyle = t.paper; ctx.fillRect(0, 0, W, H);
  const pad = 28;
  let y = header(ctx, W, t, text, F, pad, pad);
  const all = days.flatMap(d => d.items);
  const first = Math.min(...all.map(i => i.start ?? 8)), last = Math.max(...all.map(i => i.end ?? 17));
  const h0 = Math.max(6, Math.floor(first)), h1 = Math.min(22, Math.ceil(last));
  const cols = Math.max(1, h1 - h0);
  const dayW = 96, headH = 34;
  const gridW = W - pad * 2, colW = (gridW - dayW) / cols;
  const availH = H - y - pad - 40 - headH;
  // lanes per day so overlapping sessions sit on separate lines
  const laid = days.map(d => {
    const lanes: number[] = []; // end hour per lane
    const placed = d.items.slice().sort((a, b) => (a.start ?? 0) - (b.start ?? 0)).map(it => {
      let l = lanes.findIndex(e => e <= (it.start ?? 0));
      if (l < 0) { l = lanes.length; lanes.push(0); }
      lanes[l] = it.end ?? 0;
      return { it, lane: l };
    });
    return { d, placed, n: Math.max(1, lanes.length) };
  });
  const totalLanes = laid.reduce((s, l) => s + l.n, 0);
  const laneH = Math.min(78, Math.max(34, (availH - laid.length * 6) / totalLanes));
  // header row of hours
  ctx.fillStyle = t.surface; rr(ctx, pad, y, gridW, headH, 10); ctx.fill();
  for (let i = 0; i < cols; i++) draw(ctx, pad + dayW + i * colW + colW / 2, y + 22, hourLabel(h0 + i), `700 11px ${F}`, t.soft, colW - 4, 'center');
  y += headH + 6;
  for (const { d, placed, n } of laid) {
    const rowH = n * laneH;
    ctx.fillStyle = t.surface; rr(ctx, pad, y, gridW, rowH, 10); ctx.fill();
    ctx.strokeStyle = t.line; ctx.lineWidth = 1;
    for (let i = 1; i < cols; i++) { ctx.beginPath(); ctx.moveTo(pad + dayW + i * colW, y + 4); ctx.lineTo(pad + dayW + i * colW, y + rowH - 4); ctx.stroke(); }
    draw(ctx, pad + 14, y + rowH / 2 + 5, d.title, `800 14px ${F}`, t.ink, dayW - 18);
    for (const { it, lane } of placed) {
      const x = pad + dayW + ((it.start ?? h0) - h0) * colW + 2, w = ((it.end ?? h1) - (it.start ?? h0)) * colW - 4;
      const yy = y + lane * laneH + 3, hh = laneH - 6;
      const c = colours(it, t);
      rr(ctx, x, yy, w, hh, 8); ctx.fillStyle = c.bg; ctx.fill(); ctx.strokeStyle = c.border; ctx.lineWidth = 2; ctx.stroke();
      draw(ctx, x + 8, yy + hh * 0.42, it.code, `800 ${Math.min(15, hh * 0.3)}px ${F}`, t.ink, w - 14);
      if (it.meta) draw(ctx, x + 8, yy + hh * 0.74, it.meta, `600 ${Math.min(11, hh * 0.22)}px ${F}`, t.soft, w - 14);
    }
    y += rowH + 6;
  }
  legend(ctx, days, t, F, pad, H - 14 - 22, W - pad);
  footer(ctx, W, H, t, text, F, pad);
}

// ---------- poster / dark poster (cards per day) ----------
function drawPoster(ctx: CanvasRenderingContext2D, days: ExDay[], W: number, H: number, text: ExText, F: string, t: Theme, colN: number) {
  ctx.fillStyle = t.paper; ctx.fillRect(0, 0, W, H);
  if (t.dark) {
    const g = ctx.createRadialGradient(W * 0.85, 0, 10, W * 0.85, 0, W * 0.7);
    g.addColorStop(0, 'rgba(92,200,255,.28)'); g.addColorStop(1, 'rgba(92,200,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  const pad = 28, gap = 14, headH = 40, rowH = 58;
  const top = header(ctx, W, t, text, F, pad, pad);
  const cardW = (W - pad * 2 - gap * (colN - 1)) / colN;
  const colsY = Array(colN).fill(top);
  const bottom = H - 50;
  days.forEach(d => {
    const i = colsY.indexOf(Math.min(...colsY));
    const x = pad + i * (cardW + gap), y = colsY[i];
    const h = headH + Math.max(1, d.items.length) * (rowH + 8) + 6;
    rr(ctx, x, y, cardW, h, 16); ctx.fillStyle = t.surface; ctx.fill(); ctx.strokeStyle = t.line; ctx.lineWidth = 1.5; ctx.stroke();
    draw(ctx, x + 16, y + 27, d.title, `800 17px ${F}`, t.ink, cardW - 32);
    d.items.forEach((it, k) => {
      const yy = y + headH + k * (rowH + 8), c = colours(it, t);
      rr(ctx, x + 10, yy, cardW - 20, rowH, 12); ctx.fillStyle = c.bg; ctx.fill(); ctx.strokeStyle = c.border; ctx.lineWidth = 2; ctx.stroke();
      draw(ctx, x + 22, yy + 22, it.time, `800 12px ${F}`, t.dark ? t.accent : c.border, cardW - 44);
      draw(ctx, x + 22, yy + 41, it.code, `800 16px ${F}`, t.ink, cardW * 0.45);
      if (it.meta) draw(ctx, x + cardW - 22, yy + 41, it.meta, `600 12px ${F}`, t.soft, cardW * 0.4, 'right');
    });
    colsY[i] = y + h + gap;
  });
  legend(ctx, days, t, F, pad, H - 14 - 22, W - pad);
  footer(ctx, W, H, t, text, F, pad);
  return Math.max(...colsY) - gap <= bottom ? 1 : bottom / (Math.max(...colsY) - gap);
}

function needsShrink(days: ExDay[], colN: number, top = 98): number {
  const cols = Array(colN).fill(top);
  days.forEach(d => { const i = cols.indexOf(Math.min(...cols)); cols[i] += 40 + Math.max(1, d.items.length) * 66 + 6 + 14; });
  return Math.max(...cols) - 14;
}

export function pickDesign(design: Design, days: ExDay[], w: number, h: number): Exclude<Design, 'auto'> {
  if (design !== 'auto') return design;
  const hasHours = days.length > 0 && days.every(d => d.items.every(i => i.start !== undefined && i.end !== undefined));
  return hasHours && w >= h * 1.1 ? 'grid' : 'poster';
}

export function renderTimetablePng(days: ExDay[], opts: { width: number; height: number; design: Design; text: ExText; font: string }): Promise<Blob> {
  const width = clampSide(opts.width), height = clampSide(opts.height);
  const design = pickDesign(opts.design, days, width, height);
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('This browser cannot draw the image.'));
  // Lay out in a logical space about 1000 units wide, then scale to the real pixels. If the content is too tall, scale down a bit more.
  let S = width / 1000, colN = 1;
  if (design !== 'grid') {
    // Try 1 to 3 columns and keep the one that fills the picture best (never smaller than needed, never more than 1.8x bigger).
    let best = -1;
    for (let n = 1; n <= Math.min(3, Math.max(1, days.length)); n++) {
      const k = Math.min(1.8, (height * 1000 / width) / (needsShrink(days, n) + 50));
      const score = k >= 1 ? 1 + 1 / n * 0 + k : k; // fits: prefer the biggest text; does not fit: prefer the least shrinking
      if (score > best) { best = score; colN = n; S = (width / 1000) * k; }
    }
  } else {
    S = Math.max(Math.min(width / 1000, height / 520), 0.2) || 1;
  }
  const W = width / S, H = height / S;
  ctx.scale(S, S);
  if (design === 'grid') drawGrid(ctx, days, W, H, opts.text, opts.font);
  else drawPoster(ctx, days, W, H, opts.text, opts.font, design === 'dark' ? DARK : LIGHT, colN);
  return new Promise((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new Error('Could not make the image.'))), 'image/png'));
}
