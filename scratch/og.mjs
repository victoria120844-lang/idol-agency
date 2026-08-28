/** Render public/og.png (1200x630) once. Re-run only if the branding changes. */
import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'node:fs';

const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<style>
  *{box-sizing:border-box;margin:0}
  body{width:1200px;height:630px;background:linear-gradient(180deg,#0A0A0B,#0C0C0E);
    color:#fff;font-family:'Apple SD Gothic Neo','Pretendard',system-ui,sans-serif;
    display:flex;flex-direction:column;justify-content:space-between;padding:64px;position:relative;overflow:hidden}
  .haze{position:absolute;inset:auto -10% -40% -10%;height:70%;
    background:radial-gradient(60% 100% at 50% 100%,rgba(255,31,61,.18),transparent 70%)}
  .kick{font-size:14px;letter-spacing:.24em;text-transform:uppercase;color:#8A8A93}
  h1{font-size:82px;font-weight:800;letter-spacing:-.03em;line-height:.98;margin-top:18px}
  h1 span{color:#FF1F3D}
  .sub{font-size:24px;color:#8A8A93;margin-top:22px;letter-spacing:.02em}
  .tiles{display:flex;gap:14px;margin-top:34px}
  .t{border:1px solid #26262A;border-radius:12px;padding:14px 20px;background:#141416}
  .t i{display:block;font-style:normal;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#8A8A93}
  .t b{display:block;font-size:24px;margin-top:6px;font-variant-numeric:tabular-nums}
  .t b.hot{color:#FF1F3D}
  .foot{display:flex;justify-content:space-between;align-items:flex-end;
    border-top:1px solid #26262A;padding-top:22px;font-size:16px;color:#8A8A93}
  .mark{width:56px;height:56px;border:3px solid #FF1F3D;border-radius:14px;position:relative}
  .mark:after{content:'';position:absolute;left:14px;top:38px;width:30px;height:3px;background:#FF1F3D;
    transform:rotate(-53deg);transform-origin:left center;border-radius:2px}
  .mark:before{content:'';position:absolute;right:9px;bottom:9px;width:10px;height:10px;border-radius:50%;background:#FF1F3D}
</style></head><body>
<div class="haze"></div>
<div>
  <div class="kick">Korean idol agency management sim</div>
  <h1>IDOL AGENCY<br><span>SIMULATOR</span></h1>
  <div class="sub">소형 기획사 운영 시뮬레이터 · 설치도 로그인도 없이 브라우저에서 바로</div>
  <div class="tiles">
    <div class="t"><i>Seed capital</i><b class="hot">₩5,000,000</b></div>
    <div class="t"><i>Promotion</i><b>4주 컴백</b></div>
    <div class="t"><i>Relationships</i><b>멤버 전 쌍 서사</b></div>
  </div>
</div>
<div class="foot"><span>연습생을 뽑고 · 데뷔조를 짜고 · 차트를 버텨내세요</span><div class="mark"></div></div>
</body></html>`;

const b = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new', args: ['--disable-gpu', '--hide-scrollbars'],
});
const p = await b.newPage();
await p.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
await p.setContent(html, { waitUntil: 'domcontentloaded' });
await new Promise((r) => setTimeout(r, 600));
const buf = await p.screenshot({ type: 'png' });
writeFileSync('public/og.png', buf);
console.log('wrote public/og.png');
await b.close();
