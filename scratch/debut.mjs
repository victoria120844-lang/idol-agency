/**
 * End-to-end check for the debut_group phase.
 *
 * Recruits 9 trainees, walks the three-step wizard, and asserts concept fit
 * moves live, the relationship graph renders 36 non-overlapping pairs, every
 * pair has an origin line, and the group survives a reload.
 *
 *   node scratch/debut.mjs [baseUrl] [width]
 */
import puppeteer from 'puppeteer-core';

const base = process.argv[2] ?? 'http://localhost:5173/';
const width = Number(process.argv[3] ?? 1440);
const MEMBERS = 9;

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
  return Boolean(b);
}, l);
const text = () => page.evaluate(() => document.body.innerText);

// ---- setup ----------------------------------------------------------------
step('setup: agency + 9 trainees');
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

const NAMES = ['김하늘', '이서연', '박도현', '최유진', '정민준', '강채원', '조시온', '윤가온', '한소울'];
for (const n of NAMES) {
  await page.click('#tr-name');
  await page.type('#tr-name', n);
  await click('오디션 진행');
  await wait(70);
}
await wait(400);
assert((await save()).trainees.length === MEMBERS, `${MEMBERS} trainees recruited`);

// ---- step 1: group setup --------------------------------------------------
step('step 1 — 그룹 설정');
await click('데뷔조 구성');
await page.waitForSelector('#gr-name');

let t = await text();
assert(t.includes('그룹 설정'), 'wizard opened on step 1');
assert(t.includes('청량') && t.includes('힙합 크루'), 'all 8 concepts listed');
assert(t.includes('음악방송 1위') && t.includes('초동 10만 장'), 'debut goals listed');

// the Next button must refuse an empty group name
await click('다음');
await wait(300);
assert(Boolean(await page.$('#gr-name')), 'blocked on step 1 without a name');

await page.type('#gr-name', '아이리스');
// pick 걸크러시 and slide to 9 members
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) =>
    x.textContent.includes('걸크러시'));
  if (b) b.click();
});
await page.evaluate((n) => {
  const el = document.querySelector('#gr-count');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(el, String(n));
  el.dispatchEvent(new Event('input', { bubbles: true }));
}, MEMBERS);
await wait(300);

t = await text();
assert(t.includes(`${MEMBERS}인`), `member count slider set to ${MEMBERS}`);

await click('다음');
await wait(500);

// ---- step 2: member select ------------------------------------------------
step('step 2 — 멤버 선발');
t = await text();
assert(t.includes('데뷔조') && t.includes(`0/${MEMBERS}`), 'lineup starts empty');
assert(t.includes('비어 있음'), 'numbered empty slots rendered');

// Concept fit must move as members are added.
const fitOf = () => page.evaluate(() => {
  const m = document.body.innerText.match(/(\d+)%\s*\n?\s*컨셉 적합도/);
  return m ? Number(m[1]) : null;
});
const fitAt = [];
for (let i = 0; i < MEMBERS; i += 1) {
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter((b) =>
      b.className.includes('hover:border-neon/50'));
    if (btns[0]) btns[0].click();
  });
  await wait(120);
  if (i === 0 || i === 4) fitAt.push(await fitOf());
}
await wait(400);

const fitFull = await fitOf();
assert(fitAt[0] !== null && fitFull !== null, `컨셉 적합도 rendered (${fitAt[0]}% → ${fitFull}%)`);
assert(fitAt[0] !== fitFull || fitAt[0] !== fitAt[1], 'concept fit changed as members were added');

t = await text();
assert(t.includes(`${MEMBERS}/${MEMBERS}`), 'lineup full');
assert(!t.includes('비어 있음'), 'no empty slots left');
assert(t.includes('컨셉 이상형'), 'ideal-shape overlay legend present');

// unique positions must not be offered twice
const dupCount = await page.evaluate(() => {
  const selects = [...document.querySelectorAll('select')].filter((s) =>
    s.getAttribute('aria-label')?.includes('포지션'));
  const chosen = selects.map((s) => s.value).filter((v) => v !== 'sub_vocal');
  return chosen.length - new Set(chosen).size;
});
assert(dupCount === 0, 'unique positions assigned without duplicates');

await click('다음');
await wait(600);

// ---- step 3: relationships ------------------------------------------------
step('step 3 — 관계도');
t = await text();
assert(t.includes('관계도'), 'relationship step opened');
assert(t.includes('팀워크') && t.includes('갈등 지수') && t.includes('스캔들 리스크'),
  'team metrics rendered');

const graph = await page.evaluate(() => {
  const svg = [...document.querySelectorAll('svg')].find((s) =>
    s.getAttribute('aria-label')?.includes('관계도'));
  if (!svg) return null;
  const nodes = [...svg.querySelectorAll('circle')].filter((c) => c.getAttribute('r') === '17');
  const edges = [...svg.querySelectorAll('path')].filter(
    (p) => p.getAttribute('stroke') === 'transparent');
  // Node centres must never sit closer than two radii apart.
  let minGap = Infinity;
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const dx = +nodes[i].getAttribute('cx') - +nodes[j].getAttribute('cx');
      const dy = +nodes[i].getAttribute('cy') - +nodes[j].getAttribute('cy');
      minGap = Math.min(minGap, Math.hypot(dx, dy));
    }
  }
  return { nodes: nodes.length, edges: edges.length, minGap: Math.round(minGap) };
});

assert(graph !== null, 'relationship SVG rendered');
assert(graph.nodes === MEMBERS, `${MEMBERS} nodes drawn (${graph.nodes})`);
assert(graph.edges === (MEMBERS * (MEMBERS - 1)) / 2, `${(MEMBERS * (MEMBERS - 1)) / 2} pair edges (${graph.edges})`);
assert(graph.minGap > 34, `no node overlap — closest centres ${graph.minGap}px apart (need > 34)`);

const originCount = await page.evaluate(() => {
  const heads = [...document.querySelectorAll('*')].filter((e) =>
    e.textContent.trim() === '관계 시작 기록');
  const card = heads[0]?.closest('div[class*="rounded-card"]');
  return card ? card.querySelectorAll('li').length : 0;
});
assert(originCount === (MEMBERS * (MEMBERS - 1)) / 2,
  `every pair has an origin line (${originCount})`);

assert(t.includes('보도자료') || t.includes('Press release'), 'press release rendered');
assert(t.includes('아이리스') && t.includes('데뷔 확정'), 'press release names the group');

// ---- confirm --------------------------------------------------------------
step('데뷔 확정 → fandom_setup');
const beforeCursor = (await save()).rng.cursor;
await click('데뷔 확정');
await wait(900);

const after = await save();
assert(after.phase === 'fandom_setup', `phase advanced (${after.phase})`);
assert(after.group?.members.length === MEMBERS, `group has ${MEMBERS} members`);
assert(after.group?.relationships.length === (MEMBERS * (MEMBERS - 1)) / 2,
  'relationship matrix persisted');
assert(after.group.relationships.every((r) => r.origin && r.origin.length > 4),
  'every persisted pair has an origin sentence');
assert(after.group.relationships.every((r) => r.type !== 'dating'),
  'no pair starts out 연애');
assert(after.group.relationships.every((r) => r.romanceLocked === false),
  'romanceLocked false on every pair');
assert(after.group.relationships.every((r) => Array.isArray(r.log) && r.log.length === 0),
  'every pair starts with an empty event log');
assert(after.group.relationships.every((r) => r.affinity >= -100 && r.affinity <= 100),
  'affinity within -100..100');
assert(after.group.teamwork >= 0 && after.group.teamwork <= 100, `teamwork ${after.group.teamwork}`);
assert(after.group.conceptFit > 0, `concept fit persisted (${after.group.conceptFit}%)`);
assert(after.group.concept === 'crush', 'concept persisted');
assert(after.group.goal === 'music_show_win', 'debut goal persisted');
assert(after.trainees.filter((x) => x.debuted).length === MEMBERS, 'trainees marked debuted');
assert(after.rng.cursor > beforeCursor, `rng advanced (${beforeCursor} → ${after.rng.cursor})`);

// ---- reload ---------------------------------------------------------------
step('reload → group persists');
await page.reload({ waitUntil: 'networkidle0' });
await wait(300);
await page.mouse.click(width / 2, 400);
await wait(700);
await click('이어하기');
await wait(700);

const restored = await save();
assert(JSON.stringify(restored.group) === JSON.stringify(after.group), 'group deep-equal after reload');

console.log('\nconsole errors:', errors.length ? errors : 'none');
if (errors.length) process.exitCode = 1;
await browser.close();
