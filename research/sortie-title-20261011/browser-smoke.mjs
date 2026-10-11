import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/nitro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=process.cwd(),out=path.join(root,'research/sortie-title-20261011');
const remote=process.argv.find(s=>s.startsWith('https://')),previewOnly=process.argv.includes('--preview-only'),types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.mp3':'audio/mpeg','.wav':'audio/wav','.mp4':'video/mp4','.webp':'image/webp'};
let server,browser;
try{
 if(!remote){
  server=http.createServer((req,res)=>{
   const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
   if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
   const b=fs.readFileSync(file),m=req.headers.range?.match(/^bytes=(\d+)-(\d*)/),start=m?Number(m[1]):0,end=m?.[2]?Math.min(b.length-1,Number(m[2])):b.length-1;
   res.writeHead(m?206:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','Content-Length':end-start+1,'Accept-Ranges':'bytes',...(m?{'Content-Range':`bytes ${start}-${end}/${b.length}`}:{})});res.end(b.subarray(start,end+1));
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
 }
 const base=remote||'http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--mute-audio']});
 const results=[];
 for(const [name,viewport] of [['desktop',{width:1440,height:1200}],['mobile',{width:390,height:844}]]){
  const context=await browser.newContext({viewport}),page=await context.newPage(),errors=[],failures=[];
  page.setDefaultTimeout(20000);console.log(name,'load');
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&new URL(r.url()).origin===base)failures.push({url:r.url(),status:r.status()});});
  if(!remote)await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  await page.goto(base+'/jag.html?debug=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#forceResult option[value="SORTIE"]'));
  assert((await page.locator('#forceResult option[value="SORTIE"]').textContent()).startsWith('出陣チャレンジ'));
  async function force(role){await page.locator('#forceResult').selectOption(role,{force:true});await page.locator('#applyForceBtn').evaluate(el=>el.click());}
  async function ready(){await page.waitForFunction(()=>document.getElementById('spinBtn').textContent==='BET'&&!document.getElementById('spinBtn').disabled);}
  async function stop(){for(const id of ['stop2','stop1','stop0']){await page.waitForFunction(id=>!document.getElementById(id).disabled,id);await page.locator('#'+id).evaluate(el=>el.click());}}
  if(!previewOnly){
  await ready();await force('ART');await page.locator('#spinBtn').evaluate(el=>el.click());await stop();await ready();
  await force('SORTIE');
  await page.evaluate(()=>{
   const observer=new MutationObserver(()=>{
    if(!document.querySelector('.novaAimPresentation[data-sortie="true"]:not([hidden])'))return;
    observer.disconnect();const auto=document.getElementById('quickAutoBtn');if(auto.textContent==='STOP')auto.click();
   });observer.observe(document.getElementById('machine'),{subtree:true,attributes:true,childList:true});
  });
  console.log(name,'wait for real sortie entry');await page.locator('#quickAutoBtn').evaluate(el=>el.click());
  await page.waitForFunction(()=>!!document.querySelector('.novaAimPresentation[data-sortie="true"]:not([hidden])'),null,{timeout:60000});
  }else await page.evaluate(()=>{const spin={resolved:{researchSortie:{won:false,finished:false}},stopped:[false,false,false]};NovaSortie.begin(spin);NovaAim.bet(null,spin.resolved);});
  await page.waitForFunction(()=>{const r=document.querySelector('.novaAimPresentation[data-sortie="true"]');const v=r?.querySelector('video:not([hidden])'),i=r?.querySelector('.novaSortieTitle');return v?.readyState>=2&&!v.paused&&i?.complete&&i.naturalWidth>0;});
  const info=await page.evaluate(()=>{
   const r=document.querySelector('.novaAimPresentation[data-sortie="true"]'),v=r.querySelector('video:not([hidden])'),i=r.querySelector('.novaSortieTitle');
   return {rect:r.getBoundingClientRect().toJSON(),title:i.getBoundingClientRect().toJSON(),guide:document.getElementById('novaSortieGuide').getBoundingClientRect().toJSON(),reels:document.querySelector('.reels').getBoundingClientRect().toJSON(),image:[i.naturalWidth,i.naturalHeight],src:v.currentSrc,muted:v.muted,loop:v.loop,inline:v.playsInline,time:v.currentTime,status:document.getElementById('novaFlowStatus').textContent,auto:document.getElementById('quickAutoBtn').textContent};
  });
  assert.equal(info.auto,'AUTO');assert(info.muted&&info.loop&&info.inline);assert(info.rect.width>0&&info.rect.height>0);assert(info.rect.bottom<=info.reels.top+1);
  assert(info.title.bottom<=info.guide.top,'title must not overlap the stop-order guide');
  assert(!/出陣ゾーン|出陣チャンス|ノヴァ出陣/.test(info.status));
  // AUTO may finish its already-scheduled stops; hold only the presentation for a clear screenshot.
  await ready();await page.waitForTimeout(1800);
  await page.evaluate(()=>NovaAim.bet(null,{researchSortie:{won:false,finished:false}}));
  const startTime=await page.locator('.novaAimPresentation[data-sortie="true"] video:not([hidden])').evaluate(v=>v.currentTime);
  await page.waitForTimeout(500);
  assert(await page.locator('.novaAimPresentation[data-sortie="true"] video:not([hidden])').evaluate((v,t)=>v.currentTime!==t,startTime));
  await page.screenshot({path:path.join(out,`${remote?'public':'local'}-${name}.png`)});
  // Isolate visual lifecycle without changing the real draw/state.
  const lifecycle=await page.evaluate(()=>{
   NovaAim.bet(null,{researchSortie:{won:false,finished:false}});
   const r=document.querySelector('.novaAimPresentation'),v=r.querySelector('video:not([hidden])');
   NovaAim.stop({researchSortie:{won:true,finished:false}});
   const wonRevealed=r.hidden&&!document.getElementById('machine').dataset.aimActive;
   NovaAim.bet(null,{researchSortie:{won:false,finished:false}});
   NovaAim.stop({researchSortie:{won:false,finished:true}});
   return {wonRevealed,endedHidden:r.hidden,endedPaused:v.paused};
  });
  assert(lifecycle.wonRevealed&&lifecycle.endedHidden&&lifecycle.endedPaused);
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
  results.push({name,...info,lifecycle,errors,failures});await context.close();
 }
 const result={status:'pass',base,muted:true,previewOnly,results};fs.writeFileSync(path.join(out,previewOnly?'layout-smoke.json':remote?'public-smoke.json':'local-smoke.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser?.close();if(server)await new Promise(r=>server.close(r));}
