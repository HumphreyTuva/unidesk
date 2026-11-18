// Draws a timetable onto a canvas and returns a PNG. Design ideas (weekly grid, poster cards, dark poster,
// colour categories, custom sizes) come from the Ratiba timetable project.

export type Cat = 'elearning' | 'lab' | 'campus' | 'other' | 'exam';
export type ExItem = { code: string; time: string; meta: string; cat: Cat; clash: boolean; start?: number; end?: number };
export type ExDay = { title: string; items: ExItem[] };
export type ExText = { title: string; subtitle: string; footer: string };
export type Design = 'auto' | 'grid' | 'poster' | 'dark' | 'vivid' | 'bands';

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
  { id: 'vivid', label: 'Vivid', note: 'A bold colour for each day, on dark' },
  { id: 'bands', label: 'Colour bands', note: 'Light, with a coloured header for each day' },
];
export const MIN_SIDE = 128, MAX_SIDE = 4096;
export const clampSide = (n: number) => Math.min(MAX_SIDE, Math.max(MIN_SIDE, Math.round(Number.isFinite(n) ? n : 1080)));

type Theme = { paper: string; surface: string; ink: string; soft: string; line: string; accent: string; dark: boolean };
const LIGHT: Theme = { paper: '#F5F7FC', surface: '#FFFFFF', ink: '#0F1F4D', soft: '#5B6478', line: '#DDE3F0', accent: '#1B3A8A', dark: false };
const DARK: Theme = { paper: '#0B1230', surface: '#141C45', ink: '#F2F5FF', soft: '#9AA7D6', line: '#26316B', accent: '#5CC8FF', dark: true };

const VIVID: Theme = { paper: '#060C2E', surface: '#0B1440', ink: '#FFFFFF', soft: '#C3CCF2', line: '#2B3A8C', accent: '#FFC933', dark: true };
const BANDS: Theme = { paper: '#F2F5FC', surface: '#FFFFFF', ink: '#0F1F4D', soft: '#46526F', line: '#D5DCEC', accent: '#1B3A8A', dark: false };

// One colour per weekday (deep enough for white text). `tint` is a soft version for light designs.
const DAY_COLOURS = [
  { main: '#1D4ED8', deep: '#1E3A8A', tint: '#E3EBFF' }, // Monday
  { main: '#6D28D9', deep: '#4C1D95', tint: '#EDE5FD' }, // Tuesday
  { main: '#15803D', deep: '#14532D', tint: '#DDF3E5' }, // Wednesday
  { main: '#C2570C', deep: '#7C2D12', tint: '#FDEBD9' }, // Thursday
  { main: '#0E7490', deep: '#164E63', tint: '#D9F1F6' }, // Friday
  { main: '#BE185D', deep: '#831843', tint: '#FBE1EC' }, // Saturday
  { main: '#B91C1C', deep: '#7F1D1D', tint: '#FBE0E0' }, // Sunday
];
const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
function dayColour(title: string, i: number) {
  const k = WEEKDAYS.findIndex(d => title.toLowerCase().includes(d));
  return DAY_COLOURS[(k >= 0 ? k : i) % DAY_COLOURS.length];
}
const alpha = (hex: string, a: number) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

// Text that shrinks (down to 70%) before it is cut with an ellipsis, so times and codes stay readable.
function drawFit(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, weight: number, size: number, F: string, color: string, maxW: number, align: CanvasTextAlign = 'left') {
  let sz = size;
  ctx.font = `${weight} ${sz}px ${F}`;
  while (sz > size * 0.7 && ctx.measureText(text).width > maxW) { sz -= 0.5; ctx.font = `${weight} ${sz}px ${F}`; }
  draw(ctx, x, y, text, `${weight} ${sz}px ${F}`, color, maxW, align);
}

// A small calendar icon for the vivid day headers.
function calIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = r * 0.14; ctx.lineCap = 'round';
  const w = r * 1.05, h = r * 0.95, x = cx - w / 2, y = cy - h / 2 + r * 0.08;
  rr(ctx, x, y, w, h, r * 0.18); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y + h * 0.3); ctx.lineTo(x + w, y + h * 0.3); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + w * 0.3, y - r * 0.18); ctx.lineTo(x + w * 0.3, y + r * 0.12); ctx.moveTo(x + w * 0.7, y - r * 0.18); ctx.lineTo(x + w * 0.7, y + r * 0.12); ctx.stroke();
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) ctx.fillRect(x + w * (0.2 + i * 0.27), y + h * (0.48 + j * 0.25), r * 0.12, r * 0.12);
  ctx.restore();
}

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
function legend(ctx: CanvasRenderingContext2D, items: ExDay[], t: Theme, F: string, x: number, y: number, maxX: number, onlyClash = false) {
  const used = new Set<Cat>(); let clash = false;
  items.forEach(d => d.items.forEach(i => { if (!onlyClash) used.add(i.cat); if (i.clash) clash = true; }));
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
  // Rows stretch to use the whole height; the boxes and their text grow with them.
  const laneH = Math.min(150, Math.max(34, (availH - laid.length * 6) / totalLanes));
  const tx = Math.min(1.6, Math.max(1, laneH / 52));
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
      draw(ctx, x + 8, yy + hh * 0.42, it.code, `800 ${Math.min(15 * tx, hh * 0.3)}px ${F}`, t.ink, w - 14);
      if (it.meta) draw(ctx, x + 8, yy + hh * 0.74, it.meta, `600 ${Math.min(11 * tx, hh * 0.22)}px ${F}`, t.soft, w - 14);
    }
    y += rowH + 6;
  }
  legend(ctx, days, t, F, pad, H - 14 - 22, W - pad);
  footer(ctx, W, H, t, text, F, pad);
}

// ---------- poster / dark poster (cards per day) ----------
// Cards sit in rows. Every row is stretched so the whole picture is used (no empty strip at the bottom), cards in a row share
// one height, and a last row with fewer cards shares the width between them (a lone day spans the full width).
const NAT = { headH: 40, itemH: 58, gap: 8, tail: 6 };
const rowsOf = (days: ExDay[], colN: number) => { const rows: ExDay[][] = []; for (let i = 0; i < days.length; i += colN) rows.push(days.slice(i, i + colN)); return rows; };
const natRowH = (row: ExDay[]) => NAT.headH + Math.max(1, ...row.map(d => d.items.length)) * (NAT.itemH + NAT.gap) + NAT.tail;

function drawPoster(ctx: CanvasRenderingContext2D, days: ExDay[], W: number, H: number, text: ExText, F: string, t: Theme, colN: number, style: 'classic' | 'vivid' | 'bands' = 'classic') {
  ctx.fillStyle = t.paper; ctx.fillRect(0, 0, W, H);
  if (style === 'vivid') {
    const bg = ctx.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#050A26'); bg.addColorStop(0.55, '#0A1B6B'); bg.addColorStop(1, '#050A24');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    const g1 = ctx.createRadialGradient(W * 0.9, 0, 10, W * 0.9, 0, W * 0.6); g1.addColorStop(0, 'rgba(56,189,248,.32)'); g1.addColorStop(1, 'rgba(56,189,248,0)');
    ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);
    const g2 = ctx.createRadialGradient(0, H, 10, 0, H, W * 0.7); g2.addColorStop(0, 'rgba(124,58,237,.30)'); g2.addColorStop(1, 'rgba(124,58,237,0)');
    ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
  } else if (t.dark) {
    const g = ctx.createRadialGradient(W * 0.85, 0, 10, W * 0.85, 0, W * 0.7);
    g.addColorStop(0, 'rgba(92,200,255,.28)'); g.addColorStop(1, 'rgba(92,200,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  const pad = 28, gap = 14;
  const top = header(ctx, W, t, text, F, pad, pad);
  const bottom = H - 62; // room for the legend and footer, with a little air above them
  const rows = rowsOf(days, colN);
  const nat = rows.map(natRowH);
  const f = Math.max(0.6, (bottom - top - gap * (rows.length - 1)) / nat.reduce((a, b) => a + b, 0));
  const rowHs = nat.map(h => h * f);

  // One item height for the whole picture: as tall as the fullest row allows, but never silly-tall.
  const headOff = style === 'classic' ? NAT.headH : NAT.headH + 14; // the coloured designs have a taller header
  const fits = rows.map((row, r) => { const m = Math.max(1, ...row.map(d => d.items.length)); return (rowHs[r] - headOff - NAT.tail - m * NAT.gap) / m; });
  const itemH = Math.min(NAT.itemH * 2.2, Math.max(32, Math.min(...fits)));
  const sc = Math.min(1.6, Math.max(0.85, itemH / NAT.itemH));

  let y = top;
  rows.forEach((row, r) => {
    const n = row.length, cardW = (W - pad * 2 - gap * (n - 1)) / n, h = rowHs[r];
    row.forEach((d, i) => {
      const x = pad + i * (cardW + gap);
      if (style === 'classic') {
        rr(ctx, x, y, cardW, h, 16); ctx.fillStyle = t.surface; ctx.fill(); ctx.strokeStyle = t.line; ctx.lineWidth = 1.5; ctx.stroke();
        draw(ctx, x + 16, y + 27, d.title, `800 17px ${F}`, t.ink, cardW - 32);
        d.items.forEach((it, k) => {
          const yy = y + NAT.headH + k * (itemH + NAT.gap), c = colours(it, t);
          rr(ctx, x + 10, yy, cardW - 20, itemH, 12); ctx.fillStyle = c.bg; ctx.fill(); ctx.strokeStyle = c.border; ctx.lineWidth = 2; ctx.stroke();
          draw(ctx, x + 22, yy + itemH * 0.38, it.time, `800 ${12 * sc}px ${F}`, t.dark ? t.accent : c.border, cardW - 44);
          draw(ctx, x + 22, yy + itemH * 0.72, it.code, `800 ${16 * sc}px ${F}`, t.ink, cardW * 0.45);
          if (it.meta) draw(ctx, x + cardW - 22, yy + itemH * 0.72, it.meta, `600 ${12 * sc}px ${F}`, t.soft, cardW * 0.4, 'right');
        });
        return;
      }
      // Vivid and colour-band designs: each weekday has its own colour, a time pill on the left and the unit on the right.
      const col = dayColour(d.title, r * colN + i), vivid = style === 'vivid';
      const headH = NAT.headH + 6;
      ctx.save();
      if (!vivid) { ctx.shadowColor = 'rgba(15,31,77,.14)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4; }
      rr(ctx, x, y, cardW, h, 18); ctx.fillStyle = vivid ? alpha(col.main, 0.22) : t.surface; ctx.fill();
      ctx.restore();
      if (vivid) { rr(ctx, x, y, cardW, h, 18); ctx.fillStyle = 'rgba(6,12,46,.55)'; ctx.fill(); }
      ctx.save(); rr(ctx, x, y, cardW, h, 18); ctx.clip();
      const hg = ctx.createLinearGradient(x, 0, x + cardW, 0); hg.addColorStop(0, col.main); hg.addColorStop(1, vivid ? col.deep : col.main);
      ctx.fillStyle = hg; ctx.fillRect(x, y, cardW, headH);
      ctx.restore();
      rr(ctx, x, y, cardW, h, 18); ctx.strokeStyle = vivid ? alpha(col.main, 0.95) : t.line; ctx.lineWidth = vivid ? 2.5 : 1.5; ctx.stroke();
      if (vivid) { calIcon(ctx, x + 28, y + headH / 2, 15, '#FFFFFF'); draw(ctx, x + 54, y + headH / 2 + 7, d.title, `800 21px ${F}`, '#FFFFFF', cardW - 70); }
      else draw(ctx, x + cardW / 2, y + headH / 2 + 7, d.title, `800 21px ${F}`, '#FFFFFF', cardW - 24, 'center');

      const pw = Math.max(72, Math.min(cardW * 0.44, 160));
      d.items.forEach((it, k) => {
        const yy = y + headH + 8 + k * (itemH + NAT.gap), x0 = x + 10, w0 = cardW - 20;
        const clash = it.clash;
        if (vivid) {
          rr(ctx, x0, yy, w0, itemH, 13); ctx.fillStyle = 'rgba(4,8,30,.9)'; ctx.fill();
          ctx.strokeStyle = clash ? '#FF6B5E' : alpha(col.main, 0.7); ctx.lineWidth = clash ? 2.5 : 1.5; ctx.stroke();
          const pg = ctx.createLinearGradient(x0, 0, x0 + pw, 0); pg.addColorStop(0, col.main); pg.addColorStop(1, col.deep);
          rr(ctx, x0, yy, pw, itemH, 13); ctx.fillStyle = pg; ctx.fill();
        } else {
          rr(ctx, x0, yy, pw, itemH, 13); ctx.fillStyle = col.tint; ctx.fill();
          if (clash) { rr(ctx, x0, yy, w0, itemH, 13); ctx.strokeStyle = '#D92D20'; ctx.lineWidth = 2.5; ctx.stroke(); }
          ctx.strokeStyle = t.line; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0 + pw + 8, yy + itemH * 0.18); ctx.lineTo(x0 + pw + 8, yy + itemH * 0.82); ctx.stroke();
        }
        drawFit(ctx, x0 + pw / 2, yy + itemH / 2 + 5 * sc, it.time, 800, 14 * sc, F, vivid ? '#FFFFFF' : col.deep, pw - 14, 'center');
        const tx = x0 + pw + (vivid ? 16 : 20), tw = w0 - pw - 28;
        const two = !!it.meta || clash;
        drawFit(ctx, tx, yy + itemH * (two ? 0.47 : 0.6), it.code, 800, 19 * sc, F, vivid ? '#FFFFFF' : t.ink, tw);
        if (two) drawFit(ctx, tx, yy + itemH * 0.79, clash ? `Clash${it.meta ? ' · ' + it.meta : ''}` : it.meta, 700, 13 * sc, F, clash ? (vivid ? '#FF9C92' : '#B42318') : (vivid ? '#C3CCF2' : t.soft), tw);
      });
    });
    y += h + gap;
  });
  legend(ctx, days, t, F, pad, H - 14 - 22, W - pad, style !== 'classic'); // the coloured designs colour by day, so only clashes need a key
  footer(ctx, W, H, t, text, F, pad);
}

// Height the cards need at natural size, used to pick the text scale and the number of columns.
function needsShrink(days: ExDay[], colN: number, top = 98): number {
  const rows = rowsOf(days, colN);
  return top + rows.reduce((s, r) => s + natRowH(r), 0) + 14 * Math.max(0, rows.length - 1);
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
    // Try 1 to 3 columns. Prefer the one with the biggest text (up to 1.8x), then the one that needs the least stretching to fill the picture.
    let best = -Infinity;
    for (let n = 1; n <= Math.min(3, Math.max(1, days.length)); n++) {
      const k = Math.min(1.8, (height * 1000 / width) / (needsShrink(days, n) + 50));
      const stretch = (height * 1000 / width) / k / (needsShrink(days, n) + 50);
      const score = (k >= 1 ? 10 : 0) + k - (k >= 1.79 ? Math.abs(stretch - 1) * 0.5 : 0);
      if (score > best) { best = score; colN = n; S = (width / 1000) * k; }
    }
  } else {
    S = Math.max(Math.min(width / 1000, height / 520), 0.2) || 1;
  }
  const W = width / S, H = height / S;
  ctx.scale(S, S);
  if (design === 'grid') drawGrid(ctx, days, W, H, opts.text, opts.font);
  else if (design === 'vivid') drawPoster(ctx, days, W, H, opts.text, opts.font, VIVID, colN, 'vivid');
  else if (design === 'bands') drawPoster(ctx, days, W, H, opts.text, opts.font, BANDS, colN, 'bands');
  else drawPoster(ctx, days, W, H, opts.text, opts.font, design === 'dark' ? DARK : LIGHT, colN);
  return new Promise((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new Error('Could not make the image.'))), 'image/png'));
}
