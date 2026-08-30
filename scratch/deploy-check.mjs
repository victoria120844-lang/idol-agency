import puppeteer from '/Users/chogayeon/idol-agency-simulator/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const URL = 'http://localhost:8899/';
const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? '  ok  ' : ' FAIL ') + m); };
const wait = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox'] });
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push(String(e)));
p.on('console', m => { if (m.type()==='error' && !/404|fonts|jsdelivr/.test(m.text())) errs.push(m.text()); });
await p.setViewport({ width:1440, height:1000 });
await p.goto(URL, { waitUntil:'networkidle2' });
const click = async s => { await p.click(s); await wait(110); };
const has = async s => (await p.$(s)) !== null;
const clearModal = async () => { for (let i=0;i<6;i++){ const el = await p.$('[data-choice="0"]'); if(!el) break; await el.click(); await wait(200);} };

ok(await has('.intro'), '로컬 index.html 부팅');
ok((await p.title()) === 'IDOL AGENCY SIMULATOR', `타이틀 (${await p.title()})`);
await click('[data-act="start"]');
await p.type('#fName','스타라인 엔터테인먼트'); await p.type('#fCeo','김서연');
ok((await p.$$('[data-dist]')).length === 12, '지역 12곳 노출');
await click('[data-dist="busan"]');
await click('[data-act="company:submit"]');
for (const [n,pos] of [['최유진','leader'],['한소희','vocal'],['배다인','subVocal'],['윤채원','dance'],['서지아','rap']]) {
  await p.$eval('#nName', e=>e.value=''); await p.type('#nName', n);
  await click(`[data-pos="${pos}"]`); await click('[data-act="recruit:add"]');
}
ok((await p.$$('.tcard')).length === 5, '연습생 직접 등록');
ok(await has('#nAge'), '나이 입력 필드');
await click('[data-act="recruit:done"]');
let sayHits = 0;
for (let i=0;i<4;i++){
  await click('[data-prog="vocalL"]'); await click('[data-prog="danceL"]'); await click('[data-prog="mental"]');
  await click('[data-act="train:close"]');
  if (i < 3 && await has('.say-t')) sayHits++;
}
ok(sayHits > 0, `멤버 한마디 패널 (연습 중 ${sayHits}회)`);
ok(await has('[data-pickid]'), '트레이닝 4주 → 데뷔조');
const ids = await p.$$eval('[data-pickid]', a=>a.map(e=>e.dataset.pickid));
for (const id of ids.slice(0,5)) await click(`[data-pickid="${id}"]`);
await p.type('#dName','아이리스'); await p.type('#dFandom','아이리시'); await click(`[data-center="${ids[0]}"]`);
await click('[data-act="debut:confirm"]');
ok((await p.$$('[data-atype]')).length === 3, '앨범 타입 3종');
ok((await p.$$('[data-track]')).length === 4, '수록곡 입력 4곡');
ok((await p.$$('[data-part]')).length === 5, '파트 분배 슬라이더');
const hi = await p.evaluate(()=> TIERS.find(t=>t.id==='high').cost);
ok(hi === 1400000, `고급 인력 ${hi.toLocaleString()}원`);
await click('[data-act="album:auto"]');
await click('[data-tier="mv:high"]');
await click('[data-act="produce:done"]');
ok(await has('[data-actv]'), '제작 → 활동');
ok(await has('#phone.on'), '휴대폰 노출');
ok((await p.$$('[data-push]')).length >= 4, '케미 밀기 버튼');
ok((await p.evaluate(()=> S.rivals.length)) === 4, '라이벌 4팀');
for (let w=1; w<=4; w++){
  await click('[data-actv="music"]'); await click('[data-actv="fansign"]'); await click('[data-actv="short"]');
  await click('[data-act="promo:close"]'); await wait(350); await clearModal(); await wait(700);
}
ok(await has('.gradebig'), '4주 활동 → 정산');
const said = await p.evaluate(()=> S.chatter.map(c=>c.name+': '+c.text));
ok(said.length > 0, `활동 중 멤버 대사 ${said.length}건`);
console.log('    대사: ' + said.join(' | '));
const r = await p.evaluate(()=>({g:S.result.grade, s:Math.round(S.sales), a:Math.round(S.aware), pf:Math.round(S.result.profit)}));
console.log(`    1집: ${r.g}등급 · 판매 ${r.s.toLocaleString()}장 · 인지도 ${r.a} · 순이익 ${r.pf.toLocaleString()}원`);
await click('[data-act="toHub"]');
ok(await has('[data-act="hub:next"]'), '정산 → 기획사 사무실');
ok((await p.evaluate(()=> S.months)) === 6, '계약 6개월 소모');
await click('[data-act="reset"]');
await wait(200);
ok(await has('.scrim'), '리셋 모달');
await click('[data-choice="0"]'); await wait(300);
ok(await has('.intro'), '리셋 동작');
for (const w of [390, 768, 1440]) {
  await p.setViewport({ width:w, height:900 }); await wait(200);
  const o = await p.evaluate(()=> document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(o === 0, `${w}px 오버플로 ${o}px`);
}
ok(errs.length === 0, `콘솔 에러 ${errs.length}건${errs.length?': '+errs.slice(0,3).join(' | '):''}`);
console.log('\n=== ' + (fails.length ? fails.length+' FAILED' : 'ALL PASSED') + ' ===');
fails.forEach(f=>console.log('  · '+f));
await b.close();
process.exit(fails.length?1:0);
