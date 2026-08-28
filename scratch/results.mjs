/**
 * End-to-end check for the results phase.
 *
 * Plays a full comeback twice — once well, once badly — and asserts the six
 * metrics are non-zero and explained, the grade separates the two runs, and
 * the PNG export renders at 1200x675 with the fandom colour in it.
 *
 *   node scratch/results.mjs [baseUrl] [width]
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

async function fillWeek(labels) {
  for (let i = 0; i < labels.length; i += 1) {
    await page.evaluate((n) => {
      const sp = [...document.querySelectorAll('span')].find(
        (x) => x.textContent.trim() === String(n) && x.className.includes('size-7'));
      const btn = sp?.parentElement?.querySelector('button');
      if (btn) btn.click();
    }, i + 1);
    await wait(80);
    // Scope to the picker: the board's filled slot cards contain the same
    // label text and come first in DOM order.
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
      const bs = [...d.querySelectorAll('button')];
      bs[0]?.click();
    });
    await wait(320);
  }
}

/** Run a whole playthrough with a given weekly plan and album budget split. */
async function playRun(plan, albumType, producingHeavy) {
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
  await page.waitForSelector('#al-title');
  await page.type('#al-title', 'FIRST LIGHT');
  if (albumType === 'mini') {
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('MINI ALBUM'));
      if (b && !b.disabled) b.click();
    });
    await wait(200);
  }
  if (producingHeavy) {
    await page.evaluate(() => {
      const el = document.querySelector('#bg-producing');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, '55');
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await wait(200);
  }
  await click('다음');
  await wait(350);
  await page.type('#tt-title', '새벽 세 시');
  await click('다음');
  await wait(350);
  await click('다음');
  await wait(450);
  await clickPrefix('발매 확정');
  await wait(800);

  for (let w = 1; w <= 4; w += 1) {
    await fillWeek(plan[w - 1]);
    await answerAll();
    if (!(await click('주차 종료'))) await click('컴백 결산으로');
    await wait(800);
  }
  return save();
}

// ---- run A: played well ---------------------------------------------------
step('run A — well played (promo-heavy, mini album, producing 55%)');
const goodPlan = [
  ['음악방송 출연', '팬사인회', '숏폼 챌린지', '자체 콘텐츠 촬영', '라디오'],
  ['음악방송 출연', '팬사인회', '숏폼 챌린지', '예능 출연', '휴식'],
  ['음악방송 출연', '팬사인회', '숏폼 챌린지', '음악방송 사전녹화', '자체 콘텐츠 촬영'],
  ['음악방송 출연', '팬사인회', '숏폼 챌린지', '예능 출연', '휴식'],
];
const good = await playRun(goodPlan, 'mini', true);
assert(good.phase === 'results', `run A reached results (${good.phase})`);

const albumA = good.albums.find((a) => a.id === good.activeAlbumId);
const rA = albumA?.result;
assert(Boolean(rA), 'run A settled onto the album');

// ---- six metrics ----------------------------------------------------------
step('six headline metrics');
const m = rA.metrics;
assert(rA.firstWeekSales > 0, `초동 non-zero (${rA.firstWeekSales})`);
assert(rA.mvViews > 0, `MV 조회수 non-zero (${rA.mvViews})`);
assert(rA.fandomAfter > 0, `팬덤 규모 non-zero (${rA.fandomAfter})`);
assert(rA.awarenessAfter > 0, `대중 인지도 non-zero (${rA.awarenessAfter})`);
assert(rA.revenue > 0, `매출 non-zero (${rA.revenue})`);
assert(typeof rA.chartPeak === 'number', `음원 순위 computed (${rA.chartPeak})`);
assert(rA.profit !== 0, `순이익 computed (${rA.profit})`);

for (const [key, metric] of Object.entries(m)) {
  assert(metric.reason && metric.reason.length > 8, `${key}: Korean reason present`);
}
assert(m.fandom.delta !== undefined, '팬덤 shows a delta');
assert(m.awareness.delta !== undefined, '인지도 shows a delta');

// ---- generated copy -------------------------------------------------------
step('generated copy');
assert(rA.headlines.length === 3, `3 press headlines (${rA.headlines.length})`);
assert(rA.reactions.length === 5, `5 community reactions (${rA.reactions.length})`);
assert(new Set(rA.headlines).size === 3, 'headlines are distinct');
assert(new Set(rA.reactions).size === 5, 'reactions are distinct');
assert(rA.headlines.every((h) => !h.includes('{')), 'no unfilled placeholders in headlines');
assert(rA.reactions.every((h) => !h.includes('{')), 'no unfilled placeholders in reactions');
assert(rA.series.length === 4, `4-point series (${rA.series.length})`);
assert(rA.memberResults.length === MEMBERS, `${MEMBERS} member results`);
assert(rA.memberResults.every((x) => x.note.length > 5), 'every member has a note');
assert(rA.goalText.length > 5, 'goal text written');

// ---- screen render --------------------------------------------------------
step('results screen renders');
let t = await text();
assert(t.includes('컴백 결산'), 'results header');
assert(t.includes('초동') && t.includes('음원 최고 순위'), 'metric labels rendered');
assert(t.includes('기사 헤드라인') && t.includes('커뮤니티 반응'), 'press and community rendered');
assert(t.includes('멤버별 결산'), 'member settlement rendered');
assert(t.includes('4주간 지표 변화'), 'chart section rendered');

const chartOk = await page.evaluate(() => {
  const svg = [...document.querySelectorAll('svg')].find((s) =>
    s.getAttribute('aria-label')?.includes('4주간'));
  if (!svg) return null;
  return { paths: svg.querySelectorAll('path').length, dots: svg.querySelectorAll('circle').length };
});
assert(chartOk && chartOk.paths >= 3, `line chart drew ${chartOk?.paths} paths`);
assert(chartOk && chartOk.dots === 8, `chart drew ${chartOk?.dots} points (2 series x 4 weeks)`);

// ---- PNG export -----------------------------------------------------------
step('PNG export');
const png = await page.evaluate(async () => {
  const mod = await import('/node_modules/.vite/deps/html-to-image.js').catch(() => null);
  return mod ? 'module-ok' : 'skip';
});
void png;

// Intercept the download by stubbing the anchor click.
await page.evaluate(() => {
  window.__exported = null;
  const orig = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.download && this.href.startsWith('data:image/png')) {
      window.__exported = { name: this.download, href: this.href };
      return;
    }
    return orig.call(this);
  };
});
await click('결과 이미지 저장');
await wait(4000);

const exported = await page.evaluate(() => {
  const e = window.__exported;
  if (!e) return null;
  return { name: e.name, length: e.href.length, head: e.href.slice(0, 21) };
});
assert(exported !== null, 'PNG export produced a download');
assert(exported?.head === 'data:image/png;base64', `data URL is a PNG (${exported?.head})`);
assert((exported?.length ?? 0) > 40_000, `PNG has real content (${exported?.length} chars)`);
assert(exported?.name.includes('아이리스'), `filename includes the group (${exported?.name})`);

const dims = await page.evaluate(
  () =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve(null);
      img.src = window.__exported.href;
    }),
);
assert(dims && dims.w === 1200 && dims.h === 675, `PNG is 1200x675 (${dims?.w}x${dims?.h})`);

// The fandom colour must survive into the exported pixels.
const hasFandomColor = await page.evaluate(
  () =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const { data } = ctx.getImageData(0, 0, c.width, c.height);
        // #7FD4FF default fandom colour, allowing for antialiasing.
        for (let i = 0; i < data.length; i += 4) {
          if (
            Math.abs(data[i] - 0x7f) < 26 &&
            Math.abs(data[i + 1] - 0xd4) < 26 &&
            Math.abs(data[i + 2] - 0xff) < 26
          ) {
            resolve(true);
            return;
          }
        }
        resolve(false);
      };
      img.onerror = () => resolve(false);
      img.src = window.__exported.href;
    }),
);
assert(hasFandomColor === true, 'fandom colour present in the exported pixels');

// Korean text must have rendered, not fallen back to blank boxes.
const inkRatio = await page.evaluate(
  () =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const { data } = ctx.getImageData(0, 0, c.width, c.height);
        let light = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i] > 200 && data[i + 1] > 200 && data[i + 2] > 200) light += 1;
        }
        resolve(light / (data.length / 4));
      };
      img.onerror = () => resolve(0);
      img.src = window.__exported.href;
    }),
);
assert(inkRatio > 0.002, `exported card has rendered text (${(inkRatio * 100).toFixed(2)}% light pixels)`);

// ---- copy summary ---------------------------------------------------------
step('copy summary');
await page.evaluate(() => {
  window.__copied = null;
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: (t) => { window.__copied = t; return Promise.resolve(); } },
  });
});
await click('결과 요약 복사');
await wait(500);
const copied = await page.evaluate(() => window.__copied);
assert(typeof copied === 'string' && copied.length > 60, 'summary copied');
assert(copied.includes('#아이돌기획사시뮬레이터'), 'summary has the hashtag line');
assert(copied.includes('초동') && copied.includes('종합 등급'), 'summary lists the metrics');

// ---- run B: played badly --------------------------------------------------
step('run B — badly played (rest-heavy, single, producing 5%)');
const badPlan = [
  ['휴식', '휴식', '라디오', '휴식', '자체 콘텐츠 촬영'],
  ['휴식', '휴식', '라디오', '휴식', '자체 콘텐츠 촬영'],
  ['휴식', '휴식', '라디오', '휴식', '자체 콘텐츠 촬영'],
  ['휴식', '휴식', '라디오', '휴식', '자체 콘텐츠 촬영'],
];
const bad = await playRun(badPlan, 'single', false);
const albumB = bad.albums.find((a) => a.id === bad.activeAlbumId);
const rB = albumB?.result;
assert(Boolean(rB), 'run B settled');

const order = ['F', 'D', 'C', 'B', 'A', 'S', 'SS'];
console.log(`    run A: grade ${rA.grade} (score ${rA.score}) · run B: grade ${rB.grade} (score ${rB.score})`);
assert(rA.score > rB.score, `well-played run scores higher (${rA.score} > ${rB.score})`);
assert(order.indexOf(rA.grade) >= order.indexOf(rB.grade), 'grade ordering matches the scores');
assert(rA.firstWeekSales > rB.firstWeekSales,
  `well-played run sells more (${rA.firstWeekSales} vs ${rB.firstWeekSales})`);

// ---- persistence ----------------------------------------------------------
step('reload → result persists');
await page.reload({ waitUntil: 'networkidle0' });
await wait(300);
await page.mouse.click(width / 2, 400);
await wait(700);
await click('이어하기');
await wait(700);
const restored = await save();
assert(
  JSON.stringify(restored.albums.find((a) => a.id === restored.activeAlbumId)?.result) ===
    JSON.stringify(rB),
  'result deep-equal after reload',
);

console.log('\nconsole errors:', errors.length ? errors : 'none');
if (errors.length) process.exitCode = 1;
await browser.close();
