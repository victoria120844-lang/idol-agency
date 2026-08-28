import puppeteer from 'puppeteer-core';

const url = process.argv[2] ?? 'http://localhost:5173/#/styleguide';
const width = Number(process.argv[3] ?? 390);
const shot = process.argv[4];

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

await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
await new Promise((r) => setTimeout(r, 900));

const report = await page.evaluate((vw) => {
  const doc = document.documentElement;

  // An element only causes page overflow if no ancestor clips it.
  const isClipped = (el) => {
    let p = el.parentElement;
    while (p && p !== document.body) {
      const s = getComputedStyle(p);
      if (s.overflowX !== 'visible') return true;
      p = p.parentElement;
    }
    return false;
  };

  const offenders = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    const right = r.right + window.scrollX;
    if (right > vw + 0.5 && !isClipped(el)) {
      offenders.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className?.baseVal ?? el.className ?? '').toString().slice(0, 100),
        right: Math.round(right),
        left: Math.round(r.left),
        w: Math.round(r.width),
        text: (el.textContent ?? '').trim().slice(0, 26),
      });
    }
  }
  return {
    scrollWidth: doc.scrollWidth,
    clientWidth: doc.clientWidth,
    offenders: offenders.slice(0, 20),
  };
}, width);

console.log(JSON.stringify({ width, ...report, errors }, null, 2));

if (shot) {
  await page.screenshot({ path: shot, fullPage: true });
  console.log('screenshot →', shot);
}
await browser.close();
