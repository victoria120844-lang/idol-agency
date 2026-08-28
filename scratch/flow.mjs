/**
 * End-to-end check for the company_create phase.
 *
 * Walks intro → company_create → submit → reload, and asserts the save round
 * trips: the same company, the same phase, and the same RNG cursor.
 *
 *   node scratch/flow.mjs [baseUrl] [width]
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
await page.setViewport({ width, height: 900, deviceScaleFactor: 2 });

const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

const step = (msg) => console.log(`  · ${msg}`);
const assert = (cond, msg) => {
  if (!cond) { console.error(`  ✗ ${msg}`); process.exitCode = 1; }
  else console.log(`  ✓ ${msg}`);
};

await page.goto(base, { waitUntil: 'networkidle0' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle0' });

// ---- intro ----------------------------------------------------------------
step('intro cinematic');
await new Promise((r) => setTimeout(r, 300));
await page.mouse.click(width / 2, 400); // skip
await new Promise((r) => setTimeout(r, 700));

const introText = await page.evaluate(() => document.body.innerText);
assert(introText.includes('새 게임'), '새 게임 button present');
assert(!introText.includes('이어하기'), '이어하기 hidden with no save');

// ---- new game -------------------------------------------------------------
step('새 게임 → company_create');
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === '새 게임');
  b.click();
});
await new Promise((r) => setTimeout(r, 600));

await page.waitForSelector('#co-name');

// ---- validation -----------------------------------------------------------
step('validation');
await page.type('#co-name', 'A');
await page.click('#co-ceo');
await new Promise((r) => setTimeout(r, 200));
let txt = await page.evaluate(() => document.body.innerText);
assert(txt.includes('2~12자'), 'short name rejected');

// ---- fill -----------------------------------------------------------------
step('fill form');
await page.evaluate(() => { document.querySelector('#co-name').value = ''; });
await page.click('#co-name', { clickCount: 3 });
await page.type('#co-name', '스타라인');
await page.type('#co-ceo', '김대표');
await page.type('#co-slogan', '무대 위에서 증명한다');
await page.select('#co-district', 'hongdae');
await new Promise((r) => setTimeout(r, 300));

txt = await page.evaluate(() => document.body.innerText);
assert(txt.includes('스타라인'), 'license preview shows 상호');
assert(txt.includes('김대표'), 'license preview shows 대표자');
assert(txt.includes('서울 홍대'), 'license preview shows 소재지');
assert(txt.includes('무대 위에서 증명한다'), 'license preview shows slogan');

const seedBefore = await page.evaluate(
  () => JSON.parse(localStorage.getItem('idol-sim-save-v1')).state.rng.seed,
);

// ---- submit ---------------------------------------------------------------
step('submit');
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === '기획사 설립하기');
  b.click();
});
await new Promise((r) => setTimeout(r, 900));

const after = await page.evaluate(
  () => JSON.parse(localStorage.getItem('idol-sim-save-v1')).state,
);
assert(after.phase === 'trainee_recruit', `phase advanced (${after.phase})`);
assert(after.company?.name === '스타라인', 'company name saved');
assert(after.company?.ceoName === '김대표', 'ceo name saved');
assert(after.company?.district === 'hongdae', 'district saved');
assert(after.company?.won === 5_000_000, `starting won = ${after.company?.won}`);
assert(after.company?.tier === 'small', 'tier = small');
assert(after.company?.awareness === 5, 'awareness = 5');
assert(after.company?.trust === 10, 'trust = 10');
assert(after.company?.practiceRooms === 1, 'practiceRooms = 1');
assert(after.rng.seed === seedBefore, 'seed unchanged');
assert(after.rng.cursor > 0, `rng cursor advanced (${after.rng.cursor})`);

const shellText = await page.evaluate(() => document.body.innerText);
assert(shellText.includes('₩5,000,000'), 'top bar shows funds');
assert(shellText.includes('소형 기획사'), 'top bar shows tier badge');

// ---- reload ---------------------------------------------------------------
step('reload → 이어하기');
await page.reload({ waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 300));
await page.mouse.click(width / 2, 400);
await new Promise((r) => setTimeout(r, 700));

txt = await page.evaluate(() => document.body.innerText);
assert(txt.includes('이어하기'), '이어하기 offered after save');
assert(txt.includes('스타라인'), 'intro shows saved company');

await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === '이어하기');
  b.click();
});
await new Promise((r) => setTimeout(r, 700));

const restored = await page.evaluate(
  () => JSON.parse(localStorage.getItem('idol-sim-save-v1')).state,
);
assert(restored.phase === after.phase, 'phase restored exactly');
assert(restored.company.id === after.company.id, 'company id restored exactly');
assert(restored.rng.cursor === after.rng.cursor, 'rng cursor restored exactly');
assert(JSON.stringify(restored.company) === JSON.stringify(after.company), 'company deep-equal');

// ---- new game confirmation ------------------------------------------------
step('새 게임 confirmation guard');
await page.reload({ waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 300));
await page.mouse.click(width / 2, 400);
await new Promise((r) => setTimeout(r, 700));
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === '새 게임');
  b.click();
});
await new Promise((r) => setTimeout(r, 400));
txt = await page.evaluate(() => document.body.innerText);
assert(txt.includes('저장된 게임을 지울까요?'), 'confirm dialog shown');

const stillThere = await page.evaluate(
  () => JSON.parse(localStorage.getItem('idol-sim-save-v1')).state.company?.name,
);
assert(stillThere === '스타라인', 'save intact while dialog open');

console.log('\nconsole errors:', errors.length ? errors : 'none');
if (errors.length) process.exitCode = 1;

await browser.close();
