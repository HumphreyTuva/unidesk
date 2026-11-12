// Reads the first <table> of a Google Sheets "Web page" export into a plain grid of text, with every merged cell
// (rowspan / colspan) expanded so a cell's position in the grid is where it appears on the sheet.
// No HTML library: the export is regular enough that a small tokenizer is reliable, and there is nothing to install.
// Index 0 of every row is Google's row-number cell, exactly like the Ratiba reader, so column numbers line up with it.

const MAX_ROWS = 20_000;
const MAX_COLS = 200;

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '-', mdash: '-' };

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

const cellText = (html: string) =>
  decodeEntities(html.replace(/<[^>]*>/g, ' ')).replace(/[\s ]+/g, ' ').trim();

const spanOf = (attrs: string, name: 'colspan' | 'rowspan') => {
  const m = attrs.match(new RegExp(`\\b${name}\\s*=\\s*["']?(\\d+)`, 'i'));
  const n = m ? parseInt(m[1], 10) : 1;
  return Number.isFinite(n) && n >= 1 ? n : 1;
};

export class TableError extends Error {}

export function buildGrid(html: string): string[][] {
  const start = html.search(/<table\b/i);
  if (start < 0) throw new TableError('No table was found in that file. Export the sheet as "Web page (.html)" from Google Sheets.');
  const end = html.search(/<\/table>/i);
  const body = html.slice(start, end > start ? end : undefined);

  type Cell = { text: string; colspan: number; rowspan: number };
  const rows: Cell[][] = [];
  let row: Cell[] | null = null;
  let open: { attrs: string; from: number } | null = null;

  const closeCell = (at: number) => {
    if (open && row) {
      row.push({ text: cellText(body.slice(open.from, at)), colspan: spanOf(open.attrs, 'colspan'), rowspan: spanOf(open.attrs, 'rowspan') });
    }
    open = null;
  };

  const tag = /<(\/?)(tr|td|th)\b([^>]*)>/gi;
  for (let m: RegExpExecArray | null; (m = tag.exec(body)); ) {
    const closing = m[1] === '/';
    const name = m[2].toLowerCase();
    if (name === 'tr') {
      closeCell(m.index);
      if (!closing) {
        if (rows.length >= MAX_ROWS) throw new TableError(`That table has more than ${MAX_ROWS} rows, which is too large.`);
        row = [];
        rows.push(row);
      } else row = null;
    } else if (!closing) {
      closeCell(m.index);
      if (!row) { row = []; rows.push(row); }
      open = { attrs: m[3], from: m.index + m[0].length };
    } else {
      closeCell(m.index);
    }
  }
  closeCell(body.length);

  // Expand merged cells into a rectangular grid.
  const occupied = new Map<number, string>();
  const key = (r: number, c: number) => r * (MAX_COLS + 1) + c;
  let maxCol = 0;
  rows.forEach((cells, r) => {
    let col = 0;
    for (const cell of cells) {
      while (occupied.has(key(r, col))) col++;
      if (col >= MAX_COLS) break;
      const rs = Math.min(cell.rowspan, rows.length - r);
      const cs = Math.min(cell.colspan, MAX_COLS - col);
      for (let dr = 0; dr < rs; dr++) for (let dc = 0; dc < cs; dc++) occupied.set(key(r + dr, col + dc), cell.text);
      col += cs;
      maxCol = Math.max(maxCol, col);
    }
  });

  const grid: string[][] = [];
  for (let r = 0; r < rows.length; r++) {
    const line: string[] = [];
    for (let c = 0; c < maxCol; c++) line.push(occupied.get(key(r, c)) ?? '');
    grid.push(line);
  }
  return grid;
}
