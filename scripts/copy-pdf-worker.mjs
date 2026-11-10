// pdf.js needs its worker script as a plain file. Copying it into /public (instead of letting the bundler process it) avoids a
// build error and works the same locally and on Vercel. Runs automatically before `dev` and `build`.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const candidates = [
  resolve(here, '../node_modules/pdfjs-dist/build/pdf.worker.min.mjs'),
  resolve(here, '../apps/web/node_modules/pdfjs-dist/build/pdf.worker.min.mjs'),
];
const from = candidates.find(existsSync);
if (!from) { console.error('pdf.worker.min.mjs not found. Run npm install first.'); process.exit(1); }
const to = resolve(here, '../apps/web/public/pdf.worker.min.mjs');
mkdirSync(dirname(to), { recursive: true });
copyFileSync(from, to);
console.log('Copied the PDF worker to public/.');
