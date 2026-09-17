import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const base='https://nova-eta-jet-30.vercel.app';
const hash=b=>createHash('sha256').update(b).digest('hex');
const files=['jag.html','nova-bell-navi.js','nova-direct-award.js'];
const sources=await Promise.all(files.map(async file=>{
 const r=await fetch(base+'/'+file+'?navi136='+Date.now(),{headers:{'Cache-Control':'no-cache'}});assert.equal(r.status,200,file);
 const remote=(await r.text()).replace(/\r\n/g,'\n'),local=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');assert.equal(hash(remote),hash(local),file);return {file,matches:true};
}));
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/nitro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--mute-audio']});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){this.muted=true;return play.call(this);};});
 await page.goto(base+'/jag.html?debug=1',{waitUntil:'domcontentloaded'});await page.waitForSelector('#bellNaviAdjustBtn');
 const presentation=await page.evaluate(async()=>{
  const checks=[];
  for(const [result,color]of [['STRONG_SUICA','green'],['CHANCE_B','purple'],['STRONG_NOVA','red']])for(const roll of [.1,.8]){
   const s={result,stopped:[false,false,false],resolved:{flowBefore:{phase:'art'}}};const bell=NovaBellNavi.begin(s,()=>roll),root=document.querySelector('#novaBellNavi');
   await Promise.all([...root.querySelectorAll('img')].map(i=>i.decode()));checks.push({result,roll,bell,signal:s.rareNavi,visible:!root.hidden,color:root.dataset.color,marks:[...root.children].map(i=>i.dataset.mark)});
  }
  NovaBellNavi.clear();return {checks,ladderAmount:NovaDirectAward.amount({zoneAward:100,flowBefore:{phase:'art',zone:'giru'}}),soraAmount:NovaDirectAward.amount({zoneAward:100,flowBefore:{phase:'art',zone:'sora'}})};
 });
 for(const c of presentation.checks){assert(c.visible);assert.equal(c.bell,null);assert.equal(c.signal.color,c.color);assert.deepEqual(c.marks,Array(3).fill(c.roll<.5?'!!':'!'));}
 assert.equal(presentation.ladderAmount,0);assert.equal(presentation.soraAmount,100);assert.deepEqual(errors,[]);
 const report={url:base+'/jag.html?debug=1',sources,presentation,errors,silent:true,isolated:true};fs.writeFileSync('research/navi136/public-check.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}
