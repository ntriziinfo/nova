import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('C:/Users/nitro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=process.cwd(),out=path.join(root,'research/zone-get-voice-20261012'),reports=[],errors=[];
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.mp4':'video/mp4','.webm':'video/webm','.wav':'audio/wav','.mp3':'audio/mpeg'};
let server,browser,page;
try{
 server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
  let b=fs.readFileSync(file);
  // Local test fixture only: start on the last paid game of a won AT prelude.
  if(file===path.join(root,'nova-game.js'))b=Buffer.from(b.toString().replace('window.__jagAdminSnapshot = latestAdminSnapshot;',`window.__jagAdminSnapshot = latestAdminSnapshot;
   window.__zoneGetFixture=()=>{normalState.flow={...NovaArt.enter({setting:3}),remaining:'500',burstUsed:true,atPrelude:{total:3,left:1,zones:['sora']}};updateDisplay();};`));
  const m=req.headers.range?.match(/^bytes=(\d+)-(\d*)/),start=m?Number(m[1]):0,end=m?.[2]?Math.min(b.length-1,Number(m[2])):b.length-1;
  res.writeHead(m?206:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','Content-Length':end-start+1,'Accept-Ranges':'bytes',...(m?{'Content-Range':`bytes ${start}-${end}/${b.length}`}:{})});res.end(b.subarray(start,end+1));
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--mute-audio']});
 for(const mode of ['manual','auto','mobile','error','reset']){
  console.log(mode);const context=await browser.newContext(mode==='mobile'?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{});
  await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  await context.addInitScript(mode=>{
   window.__events=[];const play=HTMLMediaElement.prototype.play,get=Element.prototype.getAttribute;
   HTMLMediaElement.prototype.play=function(){
    const src=this.getAttribute('src')||'',patrol=src.includes('cz_patrol_confirm'),voice=src.endsWith('sosuke-zone-get.wav');
    if(patrol||voice){
     if(patrol)window.__patrol=this;
     const e={type:patrol?'patrol':'voice',at:performance.now(),src,actual:get.call(this,'src'),loop:this.loop,volume:this.volume,patrolEnded:voice?__patrol.ended:undefined};__events.push(e);
     this.addEventListener('ended',()=>__events.push({type:e.type+'Ended',at:performance.now()}),{once:true});
     if(mode==='error'&&patrol)return Promise.reject(Error('test unavailable patrol'));
     const p=play.call(this);p?.then(()=>e.started=true,err=>e.error=err.message);return p;
    }
    return play.call(this);
   };
  },mode);
  page=await context.newPage();page.setDefaultTimeout(25000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/jag.html?debug=1',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__zoneGetFixture);
  await page.locator('#machine').click({position:{x:10,y:10},force:true});await page.evaluate(()=>__zoneGetFixture());
  await page.locator('#forceResult').selectOption('BELL',{force:true});await page.locator('#applyForceBtn').evaluate(el=>el.click());
  if(mode==='auto')await page.locator('#quickAutoBtn').evaluate(el=>el.click());else await page.locator('#spinBtn').evaluate(el=>el.click());
  await page.waitForFunction(()=>__events.some(e=>e.type==='patrol'));const fee=(await page.evaluate(()=>__jagAdminSnapshot())).stats.totalFee;
  assert.equal(fee,3);assert.equal((await page.evaluate(()=>__events)).filter(e=>e.type==='voice').length,0);
  if(mode==='reset'){
   page.once('dialog',d=>d.accept());await page.locator('#resetBtn').evaluate(el=>el.click());await page.waitForTimeout(8000);
   assert.equal((await page.evaluate(()=>__events)).filter(e=>e.type==='voice').length,0);
   assert.equal((await page.evaluate(()=>__jagAdminSnapshot())).stats.totalFee,0);
  }else if(mode==='error'){
   await page.waitForTimeout(600);assert.equal((await page.evaluate(()=>__events)).filter(e=>e.type==='voice').length,0);
  }else{
   await page.waitForFunction(()=>__events.some(e=>e.type==='voice'&&e.started));
   const log=await page.evaluate(()=>__events),v=log.find(e=>e.type==='voice');assert(v.patrolEnded&&!v.loop&&v.volume>0);assert.match(v.actual,/normalized-20261012/);
   assert.equal((await page.evaluate(()=>__jagAdminSnapshot())).stats.totalFee,fee);
   await page.waitForFunction(()=>__events.some(e=>e.type==='voiceEnded'));
   if(mode==='auto'){
    await page.waitForFunction(fee=>__jagAdminSnapshot().stats.totalFee>fee,fee);
    await page.locator('#quickAutoBtn').evaluate(el=>el.click());
   }
   assert.equal((await page.evaluate(()=>__events)).filter(e=>e.type==='voice').length,1);
  }
  reports.push({mode,events:await page.evaluate(()=>__events),snapshot:await page.evaluate(()=>({fee:__jagAdminSnapshot().stats.totalFee,entryStage:__jagAdminSnapshot().normalState.flow?.entryStage}))});await context.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({status:'pass',muted:true,reports,errors},null,2));console.log('PASS all 5 modes');
}catch(error){if(page&&!page.isClosed())fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify(await page.evaluate(()=>({events:window.__events,snapshot:window.__jagAdminSnapshot?.()})),null,2));throw error;}
finally{await browser?.close();if(server)await new Promise(r=>server.close(r));}
