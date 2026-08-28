/**
 * End-to-end check for the agency_hub phase and the loop.
 *
 * Plays cycle 1 all the way to the hub, trains a trainee, starts cycle 2 and
 * finishes it — asserting growth carries over. Then forces the bankruptcy path
 * and checks the closure ending.
 *
 *   node scratch/hub.mjs [baseUrl] [width]
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
await page.setViewport({ width, height: 1100, deviceScaleFactor: 1 });

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
  if (b && !b.disabled) { b.click(); return true; }
  return false;
}, l);
const clickPrefix = (l) => page.evaluate((x) => {
  const b = [...document.querySelectorAll('button')].find(
    (y) => y.textContent.trim().startsWith(x) && !y.disabled);
  if (b) { b.click(); return true; }
  return false;
}, l);
const text = () => page.evaluate(() => document.body.innerText);

async function fillWeek(labels) {
  for (let i = 0; i < labels.length; i += 1) {
    await page.evaluate((n) => {
      const sp = [...document.querySelectorAll('span')].find(
        (x) => x.textContent.trim() === String(n) && x.className.includes('size-7'));
      const btn = sp?.parentElement?.querySelector('button');
      if (btn) btn.click();
    }, i + 1);
    await wait(80);
    await page.evaluate((l) => {
      const b = [...document.querySelectorAll('button')].find(
        (x) => !x.disabled && x.className.includes('hover:border-neon/50') && x.textContent.includes(l));
      if (b) b.click();
    }, labels[i]);
    await wait(100);
  }
  await wait(350);
}

async function answerAll() {
  for (let g = 0; g < 6; g += 1) {
    const open = await page.evaluate(() => Boolean(document.querySelector('[role="dialog"]')));
    if (!open) break;
    await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      [...d.querySelectorAll('button')][0]?.click();
    });
    await wait(320);
  }
}

const PLAN = [
  ['음악방송 출연', '팬사인회', '숏폼 챌린지', '자체 콘텐츠 촬영', '라디오'],
  ['음악방송 출연', '팬사인회', '숏폼 챌린지', '예능 출연', '휴식'],
  ['음악방송 출연', '팬사인회', '숏폼 챌린지', '음악방송 사전녹화', '자체 콘텐츠 촬영'],
  ['음악방송 출연', '팬사인회', '숏폼 챌린지', '예능 출연', '휴식'],
];

/** Produce an album and play its four weeks. */
async function playCycle(albumTitle) {
  await page.waitForSelector('#al-title');
  await page.type('#al-title', albumTitle);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('MINI ALBUM'));
    if (b && !b.disabled) b.click();
  });
  await wait(200);
  await click('다음');
  await wait(350);
  await page.type('#tt-title', '새벽 세 시');
  await click('다음');
  await wait(350);
  await click('다음');
  await wait(450);
  await clickPrefix('발매 확정');
  await wait(800);

  for (let w = 0; w < 4; w += 1) {
    await fillWeek(PLAN[w]);
    await answerAll();
    if (!(await click('주차 종료'))) await click('컴백 결산으로');
    await wait(800);
  }
}

// ---- cycle 1 --------------------------------------------------------------
step('cycle 1 → results → hub');
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
// 9 trainees: 5 debut, 4 spare so 신규 그룹 데뷔 unlocks.
for (const n of ['김하늘', '이서연', '박도현', '최유진', '정민준', '강채원', '조시온', '윤가온', '한소울']) {
  await page.click('#tr-name');
  await page.type('#tr-name', n);
  await click('오디션 진행');
  await wait(60);
}
await wait(200);
await click('데뷔조 구성');
await page.waitForSelector('#gr-name');
await page.type('#gr-name', '아이리스');
await click('다음');
await wait(420);
for (let i = 0; i < MEMBERS; i += 1) {
  await page.evaluate(() => {
    const bs = [...document.querySelectorAll('button')].filter((b) =>
      b.className.includes('hover:border-neon/50'));
    if (bs[0]) bs[0].click();
  });
  await wait(90);
}
await wait(200);
await click('다음');
await wait(450);
await click('데뷔 확정');
await page.waitForSelector('#fd-name');
await page.type('#fd-name', '별빛');
await click('팬덤 확정');

await playCycle('FIRST LIGHT');

let s = await save();
assert(s.phase === 'results', `cycle 1 settled (${s.phase})`);
const wonAtResults = s.company.won;

await click('다음 활동 준비');
await wait(1000);

s = await save();
assert(s.phase === 'agency_hub', `reached agency_hub (${s.phase})`);

// ---- operating costs ------------------------------------------------------
step('operating costs charged once');
assert(s.settledCycle === 1, `cycle 1 marked settled (${s.settledCycle})`);
assert(s.company.won < wonAtResults, `operating costs deducted (${wonAtResults} → ${s.company.won})`);
assert(s.company.totalRevenue > 0, `lifetime revenue tracked (${s.company.totalRevenue})`);

const wonAfterSettle = s.company.won;
// Re-entering must not charge again.
await page.reload({ waitUntil: 'networkidle0' });
await wait(300);
await page.mouse.click(width / 2, 400);
await wait(700);
await click('이어하기');
await wait(900);
s = await save();
assert(s.company.won === wonAfterSettle, 'settling is idempotent across a reload');

// ---- members rested -------------------------------------------------------
const maxFatigue = Math.max(...s.group.members.map((m) => m.fatigue));
assert(maxFatigue < 60, `members recovered between cycles (max fatigue ${maxFatigue})`);

// ---- panels ---------------------------------------------------------------
step('five panels render');
let t = await text();
assert(t.includes('대시보드') && t.includes('아티스트') && t.includes('연습생') &&
  t.includes('활동') && t.includes('기록'), 'panel rail lists all five');
assert(t.includes('사이클 운영비'), 'dashboard shows operating costs');

for (const [panel, marker] of [
  ['아티스트', '개인 팬 순위'],
  ['기록', '앨범별 성적'],
  ['활동', '새 앨범 제작'],
  ['연습생', '강습'],
]) {
  await page.evaluate((p) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes(p));
    if (b) b.click();
  }, panel);
  await wait(400);
  t = await text();
  assert(t.includes(marker), `${panel} panel renders (${marker})`);
}

// ---- records: history + timeline -----------------------------------------
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('기록'));
  if (b) b.click();
});
await wait(400);
t = await text();
assert(t.includes('FIRST LIGHT'), 'discography lists the album');
assert(t.includes('관계 서사 타임라인'), 'relationship timeline rendered');
const timelineRows = await page.evaluate(() => {
  const h = [...document.querySelectorAll('*')].find((e) => e.textContent.trim() === '관계 서사 타임라인');
  const card = h?.closest('div[class*="rounded-card"]');
  return card ? card.querySelectorAll('li').length : 0;
});
assert(timelineRows >= 4, `timeline has entries from every week (${timelineRows})`);

// ---- training -------------------------------------------------------------
step('강습 grows stats, capped by potential');
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('연습생'));
  if (b) b.click();
});
await wait(500);

const before = await save();
const spare = before.trainees.find((x) => !x.debuted);
const wonBeforeTrain = before.company.won;

const trained = await page.evaluate((id) => {
  const cards = [...document.querySelectorAll('button')].filter((b) =>
    b.textContent.trim().startsWith('강습 진행'));
  if (cards[0]) { cards[0].click(); return true; }
  void id;
  return false;
}, spare.id);
assert(trained, '강습 진행 button available');
await wait(600);

const after = await save();
const trainedNow = after.trainees.find((x) => x.lastTrainedCycle === after.cycle);
assert(Boolean(trainedNow), 'a trainee was marked trained this cycle');
assert(after.company.won === wonBeforeTrain - 400_000,
  `강습 charged ₩400,000 (${wonBeforeTrain} → ${after.company.won})`);
const beforeStats = before.trainees.find((x) => x.id === trainedNow.id).stats;
const grew = Object.keys(beforeStats).some((k) => trainedNow.stats[k] > beforeStats[k]);
assert(grew, 'the trained stat actually grew');
assert(trainedNow.trainedWeeks > before.trainees.find((x) => x.id === trainedNow.id).trainedWeeks,
  'training counts toward the potential reveal');

// second lesson in the same cycle must be refused
const secondBlocked = await page.evaluate((id) => {
  const cards = [...document.querySelectorAll('button')].filter((b) =>
    b.textContent.includes('이번 사이클 완료'));
  void id;
  return cards.length > 0;
}, trainedNow.id);
assert(secondBlocked, 'a second lesson in the same cycle is blocked');

// ---- cycle 2 --------------------------------------------------------------
step('cycle 2 carries growth over');
const memberStatsBefore = JSON.stringify(after.group.members.map((m) => m.stats));
const fandomBefore = after.fandom.size;
const relLogsBefore = after.group.relationships.reduce((n, r) => n + r.log.length, 0);

await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('활동'));
  if (b) b.click();
});
await wait(400);
assert(await click('새 앨범 제작'), '새 앨범 제작 pressed');
await wait(800);

s = await save();
assert(s.phase === 'album_produce', `cycle 2 entered production (${s.phase})`);
assert(s.cycle === 2, `cycle counter advanced (${s.cycle})`);
assert(JSON.stringify(s.group.members.map((m) => m.stats)) === memberStatsBefore,
  'member stats carried over');
assert(s.fandom.size === fandomBefore, `fandom carried over (${s.fandom.size})`);

await playCycle('SECOND LIGHT');
s = await save();
assert(s.phase === 'results', 'cycle 2 reached results');
assert(s.albums.length === 2, `two albums recorded (${s.albums.length})`);
assert(Boolean(s.albums[1].result), 'cycle 2 settled onto its album');
assert(s.albums[1].cycle === 2, 'second album tagged with cycle 2');

const relLogsAfter = s.group.relationships.reduce((n, r) => n + r.log.length, 0);
assert(relLogsAfter > relLogsBefore,
  `relationship story kept accumulating (${relLogsBefore} → ${relLogsAfter})`);
assert(s.fandom.size > fandomBefore, `fandom grew again (${fandomBefore} → ${s.fandom.size})`);

await click('다음 활동 준비');
await wait(1000);
s = await save();
assert(s.phase === 'agency_hub' && s.settledCycle === 2, 'cycle 2 settled at the hub');

// ---- bankruptcy path ------------------------------------------------------
step('bankruptcy: two consecutive deficits close the agency');
await page.evaluate(() => {
  const raw = JSON.parse(localStorage.getItem('idol-sim-save-v1'));
  // One deficit already on the books, and not enough left to cover the next.
  raw.state.company.won = 100_000;
  raw.state.company.deficitCycles = 1;
  raw.state.settledCycle = null;
  localStorage.setItem('idol-sim-save-v1', JSON.stringify(raw));
});
await page.reload({ waitUntil: 'networkidle0' });
await wait(300);
await page.mouse.click(width / 2, 400);
await wait(700);
await click('이어하기');
await wait(1200);

s = await save();
assert(s.gameOver !== null, 'game over triggered');
assert(s.gameOver?.reason === 'bankruptcy', `reason is bankruptcy (${s.gameOver?.reason})`);
assert(s.company.deficitCycles >= 2, `deficit cycles counted (${s.company.deficitCycles})`);

t = await text();
assert(t.includes('폐업'), 'closure screen rendered');
assert(t.includes('진행한 사이클') && t.includes('최고 등급'), 'run summary rendered');
assert(t.includes('다시 시작'), 'restart offered');
assert(s.gameOver.cycles >= 2, `summary counts the cycles (${s.gameOver.cycles})`);
assert(s.gameOver.bestGrade !== null, `summary records the best grade (${s.gameOver.bestGrade})`);
assert(s.gameOver.totalRevenue > 0, `summary records lifetime revenue (${s.gameOver.totalRevenue})`);

// restart clears the run
await click('다시 시작');
await wait(800);
s = await save();
assert(s.gameOver === null, 'restart clears the game over state');
assert(s.phase === 'company_create', `restart returns to founding (${s.phase})`);
assert(s.albums.length === 0 && s.trainees.length === 0, 'restart wipes the save');

console.log('\nconsole errors:', errors.length ? errors : 'none');
if (errors.length) process.exitCode = 1;
await browser.close();
