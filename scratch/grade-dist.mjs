import puppeteer from '/Users/chogayeon/idol-agency-simulator/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:'new', args:['--no-sandbox'] });
const p = await b.newPage();
p.on('pageerror', e => console.log('ERR', e.message));
await p.goto('http://localhost:8899/', { waitUntil:'networkidle0' });
const dist = await p.evaluate(() => {
  S = blank();
  const counts = {};
  for (let i=0;i<3000;i++){
    const t = makeTrainee('t','f','vocal',19);
    counts[t.grade] = (counts[t.grade]||0)+1;
  }
  return counts;
});
const total = Object.values(dist).reduce((a,b)=>a+b,0);
for (const g of ['S','A','B','C','D']) console.log(`  ${g}: ${dist[g]||0} (${((dist[g]||0)/total*100).toFixed(1)}%)`);
const bPlus = ((dist.S||0)+(dist.A||0)+(dist.B||0))/total*100;
console.log(`  B 이상 합계: ${bPlus.toFixed(1)}%`);

const districts = await p.evaluate(()=> Object.keys(DISTRICTS).length);
console.log('지역 수:', districts);
await b.close();
