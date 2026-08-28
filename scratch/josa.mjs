/** Unit check for the Korean particle helper, run through the built bundle. */
import puppeteer from 'puppeteer-core';

const b = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new', args: ['--disable-gpu'],
});
const p = await b.newPage();
await p.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });

const out = await p.evaluate(async () => {
  const m = await import('/src/game/formulas.ts');
  const cases = [
    ['아이리스', '은는', '아이리스는'],
    ['별빛', '은는', '별빛은'],
    ['김하늘', '이가', '김하늘이'],
    ['이서연', '이가', '이서연이'],
    ['유나', '이가', '유나가'],
    ['새벽 세 시', '은는', '새벽 세 시는'],
    ['아이리스', '과와', '아이리스와'],
    ['별빛', '과와', '별빛과'],
    ['댄스', '이가', '댄스가'],
    ['보컬', '이가', '보컬이'],
    ['FIRST LIGHT', '은는', 'FIRST LIGHT은'],
  ];
  return cases.map(([w, pair, want]) => ({ w, pair, got: m.josa(w, pair), want }));
});

let fail = 0;
for (const c of out) {
  const ok = c.got === c.want;
  if (!ok) fail += 1;
  console.log(`  ${ok ? '✓' : '✗'} josa("${c.w}", "${c.pair}") → ${c.got}${ok ? '' : ` (expected ${c.want})`}`);
}
if (fail) process.exitCode = 1;
await b.close();
