/**
 * End-to-end check for the album_produce phase.
 *
 * Walks the four-step wizard, hammers the budget sliders to prove they always
 * total 100, checks the insufficient-funds block, steps backwards to prove no
 * input is lost, and asserts the frozen album carries every choice.
 *
 *   node scratch/album.mjs [baseUrl] [width]
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
  return Boolean(b);
}, l);
const clickPrefix = (l) => page.evaluate((x) => {
  const b = [...document.querySelectorAll('button')].find((y) => y.textContent.trim().startsWith(x));
  if (b) b.click();
  return Boolean(b);
}, l);
const text = () => page.evaluate(() => document.body.innerText);
const setRange = (sel, v) => page.evaluate((s, val) => {
  const el = document.querySelector(s);
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(el, String(val));
  el.dispatchEvent(new Event('input', { bubbles: true }));
}, sel, v);
const allocation = () => page.evaluate(() => {
  const keys = ['producing', 'mv', 'choreography', 'styling', 'marketing'];
  const out = {};
  for (const k of keys) out[k] = Number(document.querySelector('#bg-' + k)?.value ?? 0);
  out.total = keys.reduce((s, k) => s + out[k], 0);
  return out;
});

// ---- setup ----------------------------------------------------------------
step('setup: agency → trainees → debut → fandom');
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
await wait(400);

const atStart = await save();
assert(atStart.phase === 'album_produce', 'reached album_produce');
assert(atStart.company.won === 5_000_000, `funds intact (${atStart.company.won})`);

// ---- step 1: plan ---------------------------------------------------------
step('step 1 — 앨범 기획');
let t = await text();
assert(t.includes('청량 서머') && t.includes('페스티벌 EDM'), 'all 8 album concepts listed');
assert(t.includes('싱글') && t.includes('미니') && t.includes('정규'), 'all 3 formats listed');
assert(t.includes('₩4,500,000'), 'full album price shown');

await click('다음');
await wait(300);
assert(Boolean(await page.$('#al-title')), 'blocked without an album title');

await page.type('#al-title', 'FIRST LIGHT');

// budget sliders must always total 100
step('budget sliders always total 100%');
let alloc = await allocation();
assert(alloc.total === 100, `default split totals 100 (${alloc.total})`);

const probes = [
  ['#bg-producing', 100], ['#bg-producing', 0], ['#bg-mv', 73],
  ['#bg-styling', 5], ['#bg-marketing', 61], ['#bg-choreography', 0],
  ['#bg-producing', 45], ['#bg-mv', 0], ['#bg-styling', 100],
];
let worst = null;
for (const [sel, v] of probes) {
  await setRange(sel, v);
  await wait(60);
  const a = await allocation();
  if (a.total !== 100) worst = { sel, v, a };
}
assert(worst === null, `9 slider probes all kept the total at 100 ${worst ? JSON.stringify(worst) : ''}`);

await click('기본값');
await wait(150);
alloc = await allocation();
assert(alloc.total === 100 && alloc.producing === 30, 'reset restores the default split');

// choose 미니 and a concept
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('다크 느와르'));
  if (b) b.click();
});
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('MINI ALBUM'));
  if (b) b.click();
});
await wait(250);
await click('다음');
await wait(400);

// ---- step 2: title track --------------------------------------------------
step('step 2 — 타이틀곡');
t = await text();
assert(t.includes('곡 예상 퀄리티'), 'quality gauge rendered');
assert(!/퀄리티\s*\d{2}\/100/.test(t), 'raw quality score never shown');

await click('다음');
await wait(300);
assert(Boolean(await page.$('#tt-title')), 'blocked without a track title');

await page.type('#tt-title', '새벽 세 시');
await setRange('#tt-bpm', 138);
await page.select('#tt-genre', 'hip_hop');
// pick 4 moods; the 4th must be refused
for (const mood of ['강렬한', '쓸쓸한', '당당한', '몽환적인']) {
  await page.evaluate((m) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === m);
    if (b && !b.disabled) b.click();
  }, mood);
  await wait(80);
}
const moodCount = await page.evaluate(() =>
  [...document.querySelectorAll('button[aria-pressed="true"]')]
    .filter((b) => ['청량한','강렬한','쓸쓸한','몽환적인','장난스러운','외로운','당당한','아련한','공격적인','따뜻한']
      .includes(b.textContent.trim())).length);
assert(moodCount === 3, `mood tags capped at 3 (${moodCount})`);

await click('다음');
await wait(400);

// ---- step 3: b-sides ------------------------------------------------------
step('step 3 — 수록곡');
t = await text();
assert(t.includes('0/3'), 'mini album allows 3 b-sides');

for (let i = 0; i < 3; i += 1) {
  await click('수록곡 추가');
  await wait(120);
}
const addDisabled = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === '수록곡 추가');
  return b?.disabled;
});
assert(addDisabled === true, 'add button disabled at the format cap');

await click('다음');
await wait(300);
assert(await page.$$eval('input[aria-label*="곡명"]', (n) => n.length > 0), 'blocked with unnamed b-sides');

const bTitles = ['잔상', '오프너', '가장 긴 밤'];
for (let i = 0; i < 3; i += 1) {
  await page.type(`input[aria-label="수록곡 ${i + 1} 곡명"]`, bTitles[i]);
}
// credit one member on the first b-side
await page.evaluate(() => {
  const heads = [...document.querySelectorAll('*')].filter((e) => e.textContent.trim() === '참여 멤버');
  const row = heads[0]?.parentElement;
  const btn = row?.querySelectorAll('button')[0];
  if (btn) btn.click();
});
await wait(200);

// ---- back-navigation must not lose input ---------------------------------
step('stepping back keeps every input');
await click('이전');
await wait(300);
await click('이전');
await wait(300);
const keptTitle = await page.$eval('#al-title', (el) => el.value);
assert(keptTitle === 'FIRST LIGHT', `album title survived going back (${keptTitle})`);
await click('다음');
await wait(300);
const keptTrack = await page.$eval('#tt-title', (el) => el.value);
const keptBpm = await page.$eval('#tt-bpm', (el) => el.value);
assert(keptTrack === '새벽 세 시', 'track title survived');
assert(keptBpm === '138', `bpm survived (${keptBpm})`);
await click('다음');
await wait(300);
const keptB = await page.$eval('input[aria-label="수록곡 1 곡명"]', (el) => el.value);
assert(keptB === '잔상', 'b-side title survived');
await click('다음');
await wait(500);

// ---- step 4: parts --------------------------------------------------------
step('step 4 — 포지션 배분');
t = await text();
assert(t.includes('센터') && t.includes('킬링파트'), 'both role pickers rendered');
assert(t.includes('균등 분배'), 'even-split button present');
assert(t.includes('TRACKLIST') || t.includes('Tracklist') || t.includes('트랙'), 'summary card rendered');

// skew the distribution and expect the warning
const shareSliders = await page.$$('input[aria-label*="파트 비중"]');
assert(shareSliders.length === MEMBERS, `${MEMBERS} part sliders`);
await page.evaluate(() => {
  const el = document.querySelectorAll('input[aria-label*="파트 비중"]')[0];
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(el, '70');
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
await wait(300);
t = await text();
assert(t.includes('파트 분배가 한쪽으로 쏠려 있습니다'), 'skew warning shown');

const shareTotal = await page.evaluate(() =>
  [...document.querySelectorAll('input[aria-label*="파트 비중"]')]
    .reduce((s, el) => s + Number(el.value), 0));
assert(shareTotal === 100, `part shares total 100 even when skewed (${shareTotal})`);

await click('균등 분배');
await wait(250);
t = await text();
assert(!t.includes('파트 분배가 한쪽으로 쏠려 있습니다'), 'even split clears the warning');

// ---- confirm --------------------------------------------------------------
step('발매 확정 → comeback_week');
const wonBefore = (await save()).company.won;
await clickPrefix('발매 확정');
await wait(900);

const after = await save();
assert(after.phase === 'comeback_week', `phase advanced (${after.phase})`);
assert(after.promoWeek === 1, `promo week 1 (${after.promoWeek})`);
assert(after.company.won === wonBefore - 2_500_000,
  `mini album cost deducted (${wonBefore} → ${after.company.won})`);

const al = after.albums[0];
assert(after.albums.length === 1 && after.activeAlbumId === al.id, 'album frozen and marked active');
assert(al.title === 'FIRST LIGHT', 'album title kept');
assert(al.concept === 'noir', `album concept kept (${al.concept})`);
assert(al.type === 'mini', 'album type kept');
assert(al.tracks.length === 4, `4 tracks (${al.tracks.length})`);
const title = al.tracks.find((x) => x.id === al.titleTrackId);
assert(title.title === '새벽 세 시', 'title track name kept');
assert(title.genre === 'hip_hop', `title genre kept (${title.genre})`);
assert(title.bpm === 138, `bpm kept (${title.bpm})`);
assert(title.moods.length === 3, `3 moods kept (${title.moods.length})`);
assert(al.tracks.filter((x) => x.kind === 'b_side').length === 3, '3 b-sides kept');
assert(al.tracks.some((x) => x.participantIds.length > 0), 'writing credit kept');
assert(Object.values(al.allocation).reduce((a, b) => a + b, 0) === 100, 'allocation totals 100');
assert(Object.values(al.partShares).reduce((a, b) => a + b, 0) === 100, 'part shares total 100');
assert(al.centerMemberId && al.killingPartMemberId, 'center and killing part set');
assert(['S','A','B','C','D'].includes(al.qualityGrade), `quality grade set (${al.qualityGrade})`);
assert(al.introText.includes('새벽 세 시'), 'intro text names the title track');
assert(al.introText.includes('다크 느와르'), 'intro text names the concept');

// ---- reload ---------------------------------------------------------------
step('reload → album persists');
await page.reload({ waitUntil: 'networkidle0' });
await wait(300);
await page.mouse.click(width / 2, 400);
await wait(700);
await click('이어하기');
await wait(700);
const restored = await save();
assert(JSON.stringify(restored.albums) === JSON.stringify(after.albums), 'album deep-equal after reload');

console.log('\nconsole errors:', errors.length ? errors : 'none');
if (errors.length) process.exitCode = 1;
await browser.close();
