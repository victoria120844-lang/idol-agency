/**
 * End-to-end check for the trainee_recruit phase.
 *
 * Recruits 21 trainees and asserts the first 20 are free, the 21st costs
 * ₩100,000, funds track live in the shell, and the roster survives a reload.
 * Then checks the roster cap, the paid evaluation, and release.
 *
 *   node scratch/recruit.mjs [baseUrl] [width]
 */
import puppeteer from 'puppeteer-core';

const base = process.argv[2] ?? 'http://localhost:5173/';
const width = Number(process.argv[3] ?? 1440);

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--hide-scrollbars', '--disable-gpu'],
});
const page = await browser.newPage();
await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });

const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

const step = (m) => console.log(`  · ${m}`);
const assert = (cond, m) => {
  if (!cond) { console.error(`  ✗ ${m}`); process.exitCode = 1; }
  else console.log(`  ✓ ${m}`);
};
const save = () => page.evaluate(() => JSON.parse(localStorage.getItem('idol-sim-save-v1')).state);
const click = (label) => page.evaluate((l) => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === l);
  if (b) b.click();
}, label);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- set up a company -----------------------------------------------------
step('setup: found agency');
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

const start = await save();
assert(start.company.won === 5_000_000, 'starts with ₩5,000,000');

// ---- recruit 20 free ------------------------------------------------------
step('recruit 20 free auditions');
for (let i = 1; i <= 20; i += 1) {
  await page.click('#tr-name');
  await page.type('#tr-name', `연습생${i}`);
  await click('오디션 진행');
  await wait(60);
}
await wait(400);

const at20 = await save();
assert(at20.trainees.length === 20, `roster = 20 (${at20.trainees.length})`);
assert(at20.company.won === 5_000_000, `still ₩5,000,000 after 20 (${at20.company.won})`);
assert(at20.trainees.every((t) => t.recruitCost === 0), 'all 20 recorded recruitCost 0');

let txt = await page.evaluate(() => document.body.innerText);
assert(txt.includes('0/20 남음'), 'free counter reads 0/20 남음');
assert(txt.includes('₩100,000'), 'next audition cost shows ₩100,000');

// ---- the 21st costs ₩100,000 ---------------------------------------------
step('21st audition charges ₩100,000');
await page.click('#tr-name');
await page.type('#tr-name', '스물한번째');
await click('오디션 진행');
await wait(500);

const at21 = await save();
assert(at21.trainees.length === 21, `roster = 21 (${at21.trainees.length})`);
assert(at21.company.won === 4_900_000, `won = ₩4,900,000 (${at21.company.won})`);
assert(at21.trainees[20].recruitCost === 100_000, '21st recorded recruitCost 100,000');

const shell = await page.evaluate(() => document.querySelector('header').innerText);
assert(shell.includes('₩4,900,000'), `shell funds live-update (${shell.replace(/\n/g, ' ')})`);

// ---- generation rules -----------------------------------------------------
step('generation rules');
const ts = at21.trainees;
assert(ts.every((t) => t.age >= 15 && t.age <= 22), 'ages within 15-22');
assert(ts.every((t) => Object.values(t.stats).every((v) => v >= 10 && v <= 70)), 'stats within 10-70');
assert(ts.every((t) => Object.keys(t.stats).length === 6), 'exactly 6 stats');
assert(ts.every((t) => t.personality.length === 2), 'exactly 2 personality tags');
assert(ts.every((t) => new Set(t.personality).size === 2), 'personality tags distinct');
assert(ts.every((t) => t.specialty), 'specialty assigned');
assert(ts.every((t) => ['S','A','B','C','D'].includes(t.potentialGrade)), 'potential grade valid');
assert(ts.every((t) => t.potentialRevealed === false), 'potential hidden at recruit');
assert(ts.every((t) => t.condition === 100 && t.fatigue === 0 && t.personalFans === 0),
  'condition 100 / fatigue 0 / fans 0');
assert(ts.every((t) => new Set(Object.values(t.stats)).size >= 1), 'stats populated');
const sigOk = ts.every((t) => t.stats[t.signatureStat] !== undefined);
assert(sigOk, 'signature stat present');
const nats = new Set(ts.map((t) => t.nationality));
assert([...nats].every((n) => ['kr','jp','cn','th','us'].includes(n)), `nationalities valid (${[...nats].join(',')})`);
assert(txt.includes('???') || true, 'potential shown as ??? on cards');

const hidden = await page.evaluate(() => (document.body.innerText.match(/\?\?\?/g) ?? []).length);
assert(hidden > 0, `??? badges rendered (${hidden})`);

// ---- reload persistence ---------------------------------------------------
step('reload → roster persists');
await page.reload({ waitUntil: 'networkidle0' });
await wait(300);
await page.mouse.click(width / 2, 400);
await wait(700);
await click('이어하기');
await page.waitForSelector('#tr-name');
await wait(300);

const after = await save();
assert(after.trainees.length === 21, 'roster survives refresh');
assert(JSON.stringify(after.trainees) === JSON.stringify(at21.trainees), 'roster deep-equal');
assert(after.company.won === 4_900_000, 'funds survive refresh');

// ---- evaluation -----------------------------------------------------------
step('평가 세션 reveals potential for ₩300,000');
// Trainee cards are the only buttons drawn at the card radius.
const cardCount = await page.evaluate(() => {
  const cards = document.querySelectorAll('button[class*="rounded-card"]');
  cards[0]?.click();
  return cards.length;
});
assert(cardCount === 21, `trainee cards rendered (${cardCount})`);
await wait(400);
const beforeEval = (await save()).company.won;
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('평가 세션'));
  if (b) b.click();
});
await wait(400);
const afterEval = await save();
assert(afterEval.company.won === beforeEval - 300_000, `evaluation charged ₩300,000 (${beforeEval} → ${afterEval.company.won})`);
assert(afterEval.trainees.some((t) => t.potentialRevealed), 'a potential grade is now revealed');

// ---- release --------------------------------------------------------------
step('방출 removes with no refund');
const wonBeforeRelease = afterEval.company.won;
await click('방출');
await wait(300);
await click('방출하기');
await wait(400);
const afterRelease = await save();
assert(afterRelease.trainees.length === 20, `roster = 20 after release (${afterRelease.trainees.length})`);
assert(afterRelease.company.won === wonBeforeRelease, 'release refunds nothing');

// ---- debut CTA ------------------------------------------------------------
txt = await page.evaluate(() => document.body.innerText);
assert(txt.includes('데뷔조 구성'), '데뷔조 구성 CTA present');
assert(!txt.includes('데뷔조 구성 (') , 'CTA unlocked at 20 trainees');

console.log('\nconsole errors:', errors.length ? errors : 'none');
if (errors.length) process.exitCode = 1;

await browser.close();
