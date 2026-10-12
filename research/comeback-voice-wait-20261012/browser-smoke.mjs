import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('C:/Users/nitro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=process.cwd(),out=path.join(root,'research/comeback-voice-wait-20261012'),reports=[],errors=[];
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.mp4':'video/mp4','.webm':'video/webm','.wav':'audio/wav','.mp3':'audio/mpeg'};
let server,browser,page;
try{
 server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
  const b=fs.readFileSync(file),m=req.headers.range?.match(/^bytes=(\d+)-(\d*)/),start=m?Number(m[1]):0,end=m?.[2]?Math.min(b.length-1,Number(m[2])):b.length-1;
  res.writeHead(m?206:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','Content-Length':end-start+1,'Accept-Ranges':'bytes',...(m?{'Content-Range':`bytes ${start}-${end}/${b.length}`}:{})});res.end(b.subarray(start,end+1));
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--mute-audio']});
 for(const mode of ['manual','auto','mobile','error','reset','reload']){
  console.log(mode);
  const context=await browser.newContext(mode==='mobile'?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{});
  await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  await context.addInitScript(mode=>{
   window.__voiceWaitLog=[];const play=HTMLMediaElement.prototype.play;
   HTMLMediaElement.prototype.play=function(){
    if(this.getAttribute('src')?.endsWith('sosuke-comeback-entry.wav')){
     const event={type:'voice',at:performance.now()};__voiceWaitLog.push(event);
     this.addEventListener('ended',()=>__voiceWaitLog.push({type:'ended',at:performance.now()}),{once:true});
     if(mode==='error')return Promise.reject(Error('test unavailable audio'));
    }
    return play.call(this);
   };
  },mode);
  page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/jag.html?debug=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!document.querySelector('#forceResult option[value="COMEBACK"]'));
  await page.locator('#machine').click({position:{x:10,y:10},force:true});
  await page.evaluate(()=>{const start=NovaReelMotion.start;NovaReelMotion.start=(...args)=>{__voiceWaitLog.push({type:'reel',index:args[0],at:performance.now()});return start(...args);};});
  const snapshot=()=>page.evaluate(()=>__jagAdminSnapshot());
  async function ready(){await page.waitForFunction(()=>document.getElementById('spinBtn').textContent==='BET'&&!document.getElementById('spinBtn').disabled&&!NovaAim.busy);}
  async function force(role){await page.locator('#forceResult').selectOption(role,{force:true});await page.locator('#applyForceBtn').evaluate(el=>el.click());}
  async function stopAll(){for(const i of [2,1,0]){await page.waitForFunction(i=>!document.getElementById('stop'+i).disabled,i);await page.locator('#stop'+i).evaluate(el=>el.click());}await ready();}
  await force('COMEBACK');await page.locator('#spinBtn').evaluate(el=>el.click());await stopAll();
  await page.evaluate(()=>__voiceWaitLog=[]);const before=await snapshot();
  await force('MISS');
  if(mode==='auto')await page.locator('#quickAutoBtn').evaluate(el=>el.click());
  else await page.locator('#spinBtn').evaluate(el=>el.click());
  await page.waitForFunction(()=>__voiceWaitLog.some(e=>e.type==='voice'));
  const paid=await snapshot();assert.equal(paid.stats.totalFee,before.stats.totalFee+3);
  if(mode==='error'){
   await page.waitForFunction(()=>[0,1,2].every(i=>NovaReelMotion.has(i)));await stopAll();
  }else{
   await page.waitForTimeout(900);
   const frozen=await page.evaluate(()=>({log:__voiceWaitLog,spinning:document.querySelectorAll('.reel.spinning').length,motion:[0,1,2].some(i=>NovaReelMotion.has(i)),buttons:[0,1,2].map(i=>document.getElementById('stop'+i).disabled)}));
   assert(!frozen.motion);assert.deepEqual(frozen.buttons,[true,true,true]);assert.equal(frozen.log.filter(e=>e.type==='reel').length,0);
   assert.equal((await snapshot()).state.spinCanStop,false);
   // Repeated keyboard BET must neither charge again nor stop the unpaid result.
   await page.keyboard.press('Space');await page.keyboard.press('ArrowLeft');assert.equal((await snapshot()).stats.totalFee,paid.stats.totalFee);
   if(mode==='reset'){
    page.once('dialog',d=>d.accept());await page.locator('#resetBtn').evaluate(el=>el.click());await page.waitForTimeout(5000);
    assert.equal((await snapshot()).state.isSpinning,false);assert.equal((await snapshot()).stats.totalFee,0);
    assert.equal((await page.evaluate(()=>__voiceWaitLog)).filter(e=>e.type==='reel').length,0);
   }else if(mode==='reload'){
    await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__jagAdminSnapshot&&[0,1,2].every(i=>NovaReelMotion.has(i)));
    assert.equal((await snapshot()).stats.totalFee,paid.stats.totalFee);await stopAll();
   }else{
    await page.waitForFunction(()=>__voiceWaitLog.some(e=>e.type==='ended')&&__voiceWaitLog.filter(e=>e.type==='reel').length>=3);
    const log=await page.evaluate(()=>__voiceWaitLog),ended=log.find(e=>e.type==='ended').at,reels=log.filter(e=>e.type==='reel');
    assert(reels.every(e=>e.at>=ended));assert.equal(log.filter(e=>e.type==='voice').length,1);
    assert.equal((await snapshot()).stats.totalFee,paid.stats.totalFee);
    if(mode==='auto'){
     await page.waitForFunction(()=>__jagAdminSnapshot().normalState.flow.comebackLeft===4);
     await page.locator('#quickAutoBtn').evaluate(el=>el.click());
    }else await stopAll();
   }
  }
  reports.push({mode,events:await page.evaluate(()=>__voiceWaitLog),feeBefore:before.stats.totalFee,feeAtBet:paid.stats.totalFee});await context.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({status:'pass',muted:true,reports},null,2));console.log('PASS all 6 modes');
}catch(error){if(page&&!page.isClosed())fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify(await page.evaluate(()=>({log:window.__voiceWaitLog,snapshot:window.__jagAdminSnapshot?.()})),null,2));throw error;}
finally{await browser?.close();if(server)await new Promise(r=>server.close(r));}
