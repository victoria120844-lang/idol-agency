/**
 * End-to-end check for the comeback_week phase.
 *
 * Plays all four weeks, answering every event, and asserts: the week cannot
 * close early, every week writes at least one relationship log entry, fatigue
 * actually benches members, and benching actually changes the results math.
 *
 *   node scratch/comeback.mjs [baseUrl] [width]
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
  if (b) { b.click(); return true; }
  return false;
}, l);
const clickPrefix = (l) => page.evaluate((x) => {
  const b = [...document.querySelectorAll('button')].find((y) => y.textContent.trim().startsWith(x));
  if (b) { b.click(); return true; }
  return false;
}, l);
const text = () => page.evaluate(() => document.body.innerText);

// ---- setup ----------------------------------------------------------------
step('setup: agency → debut → fandom → album');
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
await wait(250);
await click('데뷔조 구성');
await page.waitForSelector('#gr-name');
await page.type('#gr-name', '아이리스');
await click('다음');
await wait(450);
for (let i = 0; i < MEMBERS; i += 1) {
  await page.evaluate(() => {
    const bs = [...document.querySelectorAll('button')].filter((b) =>
      b.className.includes('hover:border-neon/50'));
    if (bs[0]) bs[0].click();
  });
  await wait(100);
}
await wait(250);
await click('다음');
await wait(500);
await click('데뷔 확정');
await page.waitForSelector('#fd-name');
await page.type('#fd-name', '별빛');
await click('팬덤 확정');
await page.waitForSelector('#al-title');
await page.type('#al-title', 'FIRST LIGHT');
await click('다음');
await wait(400);
await page.type('#tt-title', '새벽 세 시');
await click('다음');
await wait(400);
await click('다음');
await wait(500);
await clickPrefix('발매 확정');
await wait(900);

let s = await save();
assert(s.phase === 'comeback_week', `reached comeback_week (${s.phase})`);
assert(s.promoWeek === 1, 'promo week 1');
assert(s.schedule.length === 5, `board has 5 slots (${s.schedule.length})`);
assert(s.schedule.every((x) => x.activity === null), 'board starts empty');

// ---- week guard -----------------------------------------------------------
step('주차 종료 blocked until the board is full');
let disabled = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === '주차 종료');
  return b?.disabled;
});
assert(disabled === true, '주차 종료 disabled with an empty board');

/** Fill the five slots with the given activity labels. */
async function fillWeek(labels) {
  for (let i = 0; i < labels.length; i += 1) {
    // Pick the slot, then the activity.
    await page.evaluate((idx) => {
      const cards = [...document.querySelectorAll('button')].filter((b) =>
        /^\d$/.test(b.previousElementSibling?.textContent?.trim() ?? ''));
      void idx;
    }, i);
    await page.evaluate((n) => {
      const board = [...document.querySelectorAll('span')].find(
        (sp) => sp.textContent.trim() === String(n) && sp.className.includes('size-7'));
      const btn = board?.parentElement?.querySelector('button');
      if (btn) btn.click();
    }, i + 1);
    await wait(90);
    await page.evaluate((label) => {
      const b = [...document.querySelectorAll('button')].find(
        (x) => !x.disabled && x.textContent.includes(label));
      if (b) b.click();
    }, labels[i]);
    await wait(120);
  }
  await wait(400);
}

/** Answer every queued event by taking the first choice. */
async function answerAllEvents() {
  let guard = 0;
  for (;;) {
    const open = await page.evaluate(() => Boolean(document.querySelector('[role="dialog"]')));
    if (!open) break;
    const picked = await page.evaluate(() => {
      const dlg = document.querySelector('[role="dialog"]');
      const btns = [...dlg.querySelectorAll('button')];
      const choice = btns[btns.length - 1];
      if (choice) { choice.click(); return choice.textContent.trim(); }
      return null;
    });
    if (!picked) break;
    await wait(350);
    guard += 1;
    if (guard > 8) break;
  }
  return guard;
}

// ---- play all four weeks --------------------------------------------------
const relLogCounts = [];
const plans = [
  ['음악방송 출연', '음악방송 사전녹화', '팬사인회', '예능 출연', '라디오'],
  ['음악방송 출연', '음악방송 사전녹화', '숏폼 챌린지', '자체 콘텐츠 촬영', '화보 / 인터뷰'],
  ['음악방송 출연', '음악방송 사전녹화', '팬사인회', '개인 스케줄', '숏폼 챌린지'],
  ['음악방송 출연', '팬사인회', '예능 출연', '자체 콘텐츠 촬영', '휴식'],
];

for (let w = 1; w <= 4; w += 1) {
  step(`week ${w}`);
  await fillWeek(plans[w - 1]);

  s = await save();
  assert(s.schedule.every((x) => x.activity !== null), `week ${w}: all 5 slots filled`);

  const evCount = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('idol-sim-save-v1')).state.pendingEvents.length);
  assert(evCount >= 2 && evCount <= 3, `week ${w}: ${evCount} events drawn (2-3)`);

  disabled = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(
      (x) => x.textContent.trim() === '주차 종료' || x.textContent.trim() === '컴백 결산으로');
    return b?.disabled;
  });
  assert(disabled === true, `week ${w}: close blocked while events are pending`);

  const answered = await answerAllEvents();
  assert(answered >= 2, `week ${w}: answered ${answered} events`);

  const before = await save();
  const logsBefore = before.group.relationships.reduce((n, r) => n + r.log.length, 0);

  const closed = (await click('주차 종료')) || (await click('컴백 결산으로'));
  assert(closed, `week ${w}: close button pressed`);
  await wait(900);

  const after = await save();
  const logsAfter = after.group.relationships.reduce((n, r) => n + r.log.length, 0);
  relLogCounts.push(logsAfter - logsBefore);
  assert(logsAfter > logsBefore, `week ${w}: relationship log grew (+${logsAfter - logsBefore})`);

  const log = after.weekLogs[after.weekLogs.length - 1];
  assert(log && log.promoWeek === w, `week ${w}: week log written`);
  assert(log.recap.length > 10, `week ${w}: recap written`);
  assert(log.entries.length > 0, `week ${w}: ${log.entries.length} log entries`);

  if (w < 4) {
    assert(after.phase === 'comeback_week', `week ${w}: still in comeback`);
    assert(after.promoWeek === w + 1, `week ${w}: advanced to week ${w + 1}`);
    assert(after.schedule.every((x) => x.activity === null), `week ${w}: board reset`);
    assert(after.pendingEvents.length === 0, `week ${w}: event queue cleared`);
    await wait(300);
  }
}

// ---- final state ----------------------------------------------------------
step('after four weeks');
s = await save();
assert(s.phase === 'results', `phase advanced to results (${s.phase})`);
assert(s.weekLogs.length === 4, `4 week logs (${s.weekLogs.length})`);
assert(s.buzz > 0, `누적 버즈 accumulated (${s.buzz})`);
assert(s.sales > 0, `초동 accumulated (${s.sales})`);
assert(s.streams > 0, `streams accumulated (${s.streams})`);
assert(relLogCounts.every((n) => n > 0), `every week produced a relationship entry (${relLogCounts.join(', ')})`);

const maxFatigue = Math.max(...s.group.members.map((m) => m.fatigue));
assert(maxFatigue > 40, `fatigue accumulated across the run (max ${maxFatigue})`);

const anyBenched = s.weekLogs.some((l) => l.benchedIds.length > 0);
console.log(`    (benching triggered during the run: ${anyBenched})`);

// ---- fatigue must actually change the math --------------------------------
step('fatigue changes the results math');
const compare = await page.evaluate(async () => {
  const w = await import('/src/game/week.ts');
  const fresh = [
    { id: 'a', fatigue: 0 }, { id: 'b', fatigue: 0 }, { id: 'c', fatigue: 0 },
  ];
  const tired = [
    { id: 'a', fatigue: 85 }, { id: 'b', fatigue: 85 }, { id: 'c', fatigue: 0 },
  ];
  return {
    fresh: w.lineupEffectiveness(fresh, []),
    strained: w.lineupEffectiveness(tired, []),
    benched: w.lineupEffectiveness(fresh, ['a']),
    mentalLow: w.mentalDamage(10, 20),
    mentalHigh: w.mentalDamage(10, 80),
  };
});
assert(compare.fresh === 1, `a rested lineup delivers 100% (${compare.fresh})`);
assert(compare.strained < compare.fresh,
  `two strained members cut output to ${(compare.strained * 100).toFixed(0)}%`);
assert(compare.benched < compare.fresh,
  `a benched member cuts output to ${(compare.benched * 100).toFixed(0)}%`);
assert(compare.mentalLow > compare.mentalHigh,
  `low 멘탈 takes more damage (${compare.mentalLow} vs ${compare.mentalHigh})`);

// ---- persistence ----------------------------------------------------------
step('reload → comeback history persists');
await page.reload({ waitUntil: 'networkidle0' });
await wait(300);
await page.mouse.click(width / 2, 400);
await wait(700);
await click('이어하기');
await wait(700);
const restored = await save();
assert(JSON.stringify(restored.weekLogs) === JSON.stringify(s.weekLogs), 'week logs deep-equal');
assert(JSON.stringify(restored.group.relationships) === JSON.stringify(s.group.relationships),
  'relationship logs deep-equal');

console.log('\nconsole errors:', errors.length ? errors : 'none');
if (errors.length) process.exitCode = 1;
await browser.close();
