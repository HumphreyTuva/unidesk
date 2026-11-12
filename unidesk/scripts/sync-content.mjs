// The AI assistant lives in the API (hosted separately from the website), so it needs its own copy of the guide content.
// Run `npm run sync:content` after editing apps/web/content/*.ts.
import { copyFileSync } from 'node:fs';
for (const f of ['offices.ts', 'callOff.ts']) copyFileSync(`apps/web/content/${f}`, `apps/api/src/ai/content/${f}`);
console.log('Guide content copied for the AI assistant.');
