/**
 * End-to-end check for the fandom_setup phase.
 *
 * Asserts the lightstick preview repaints the instant the colour changes, the
 * fandom model starts at the documented values, per-member 개인 팬 sum to
 * `size`, and the colour survives a reload.
 *
 *   node scratch/fandom.mjs [baseUrl] [width]
 */
import puppeteer from 'puppeteer-core';

const base = process.argv[2] ?? 'http://localhost:5173/';
const width = Number(process.argv[3] ?? 1440);
const MEMBERS = 5;

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--hide-scrollbars', '--disable-gpu'],
});
const page = await browser.newPage();
await page.setViewport({ width, height: 1000, deviceScaleFactor: 1 });

const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

const step = (m) => console.log(`  · ${m}`);
const assert = (c, m) => {
  if (!c) { console.error(`  ✗ ${m}`); process.exitCode = 1; }
  else console.log(`  ✓ ${m}`);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const save = () => page.evaluate(() => JSON.parse(localStorage.getItem('idol-sim-save-v1')).state);
const click = (l) => page.evaluate((x) => {
  const b = [...document.querySelectorAll('button')].find((y) => y.textContent.trim() === x);
  if (b) b.click();
}, l);
const text = () => page.evaluate(() => document.body.innerText);

/** Colours actually painted by the lightstick field. */
const dotColors = () => page.evaluate(() => {
  const dots = [...document.querySelectorAll('.lightstick-dot')];
  return {
    count: dots.length,
    bg: dots.length ? getComputedStyle(dots[0]).backgroundColor : null,
    glow: dots.length ? getComputedStyle(dots[0]).boxShadow : null,
  };
});

// ---- setup ----------------------------------------------------------------
step('setup: agency → 5 trainees → debut');
await page.goto(base, { waitUntil: 'networkidle0' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle0' });
await wait(300);
await page.mouse.click(width / 2, 400);
await wait(700);
await click('새 게임');
await page.waitForSelector('#co-name');
await page.type('#co-name', '스타라인');
await page.type('#co-ceo', '김대표');
await click('기획사 설립하기');
await page.waitForSelector('#tr-name');

for (const n of ['김하늘', '이서연', '박도현', '최유진', '정민준']) {
  await page.click('#tr-name');
  await page.type('#tr-name', n);
  await click('오디션 진행');
  await wait(70);
}
await wait(300);
await click('데뷔조 구성');
await page.waitForSelector('#gr-name');
await page.type('#gr-name', '아이리스');
await click('다음');
await wait(500);
for (let i = 0; i < MEMBERS; i += 1) {
  await page.evaluate(() => {
    const bs = [...document.querySelectorAll('button')].filter((b) =>
      b.className.includes('hover:border-neon/50'));
    if (bs[0]) bs[0].click();
  });
  await wait(110);
}
await wait(300);
await click('다음');
await wait(600);
await click('데뷔 확정');
await page.waitForSelector('#fd-name');
await wait(400);

assert((await save()).phase === 'fandom_setup', 'reached fandom_setup');

// ---- form + live preview --------------------------------------------------
step('live lightstick preview');
const initial = await dotColors();
assert(initial.count > 100, `lightstick field rendered (${initial.count} dots)`);
assert(initial.bg === 'rgb(127, 212, 255)', `default colour painted (${initial.bg})`);

// pick the 5th preset (로즈 #FF6BC1)
await page.evaluate(() => {
  const b = document.querySelector('button[aria-label="팬덤 색 로즈"]');
  if (b) b.click();
});
await wait(250);
const afterPreset = await dotColors();
assert(afterPreset.bg === 'rgb(255, 107, 193)', `preset repaints instantly (${afterPreset.bg})`);
assert(afterPreset.glow?.includes('255, 107, 193'), 'dot glow follows the colour');

// custom hex through the colour input
await page.evaluate(() => {
  const el = document.querySelector('#fd-color');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(el, '#1fbfa0');
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
});
await wait(250);
const afterCustom = await dotColors();
assert(afterCustom.bg === 'rgb(31, 191, 160)', `custom hex repaints instantly (${afterCustom.bg})`);

let t = await text();
assert(t.includes('#1FBFA0'), 'hex readout updated');
assert(t.includes('에메랄드'), 'preset name resolved for the custom hex');

// ---- notice + validation --------------------------------------------------
step('notice + validation');
await click('팬덤 확정');
await wait(300);
assert(Boolean(await page.$('#fd-name')), 'blocked without a fandom name');

await page.type('#fd-name', '별빛');
await page.type('#fd-stick', '별빛봉');
await page.type('#fd-slogan', '우리가 너희의 첫 관객이야');
await wait(350);

t = await text();
assert(t.includes('「아이리스」의 공식 팬덤명이 「별빛」으로 확정되었습니다.'),
  'notice renders the exact announcement sentence');
assert(t.includes('「별빛봉」'), 'notice includes the lightstick name');
assert(t.includes('우리가 너희의 첫 관객이야'), 'notice includes the slogan');
assert(t.includes('별빛 응원봉 물결'), 'preview header uses the fandom name');

// ---- confirm --------------------------------------------------------------
step('팬덤 확정 → album_produce');
await click('팬덤 확정');
await wait(900);

const after = await save();
assert(after.phase === 'album_produce', `phase advanced (${after.phase})`);

const f = after.fandom;
assert(f.name === '별빛', 'fandom name saved');
assert(f.color === '#1FBFA0', `fandom colour saved (${f.color})`);
assert(f.lightstickName === '별빛봉', 'lightstick name saved');
assert(f.slogan === '우리가 너희의 첫 관객이야', 'slogan saved');
assert(f.loyalty === 60, `loyalty starts at 60 (${f.loyalty})`);
assert(f.sentiment === 0, `sentiment starts at 0 (${f.sentiment})`);
assert(f.coreRatio === 40, `coreRatio starts at 40 (${f.coreRatio})`);

const fans = after.group.members.map((m) => m.personalFans);
assert(fans.every((n) => n >= 80 && n <= 250), `every member 80-250 개인 팬 (${fans.join(', ')})`);
assert(fans.reduce((a, b) => a + b, 0) === f.size,
  `개인 팬 sum equals fandom size (${fans.reduce((a, b) => a + b, 0)} === ${f.size})`);
assert(f.size >= MEMBERS * 80 && f.size <= MEMBERS * 250, `size within range (${f.size})`);

// ---- persistence ----------------------------------------------------------
step('reload → fandom persists');
await page.reload({ waitUntil: 'networkidle0' });
await wait(300);
await page.mouse.click(width / 2, 400);
await wait(700);
await click('이어하기');
await wait(700);

const restored = await save();
assert(JSON.stringify(restored.fandom) === JSON.stringify(after.fandom), 'fandom deep-equal after reload');
assert(restored.fandom.color === '#1FBFA0', 'fandom colour available to later screens');

// ---- the fandom colour must not leak into chrome --------------------------
step('fandom colour stays a secondary accent');
const leak = await page.evaluate(() => {
  const target = 'rgb(31, 191, 160)';
  const hits = [];
  const chrome = [
    ...document.querySelectorAll('header *, nav *, button'),
  ];
  for (const el of chrome) {
    const cs = getComputedStyle(el);
    if (cs.backgroundColor === target || cs.color === target || cs.borderTopColor === target) {
      hits.push(el.tagName + '.' + (el.className || '').toString().slice(0, 40));
    }
  }
  return hits;
});
assert(leak.length === 0, `no fandom colour in buttons or global chrome (${leak.length} hits)`);

console.log('\nconsole errors:', errors.length ? errors : 'none');
if (errors.length) process.exitCode = 1;
await browser.close();
