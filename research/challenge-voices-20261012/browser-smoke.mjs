import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('C:/Users/nitro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=process.cwd(),out=path.join(root,'research/challenge-voices-20261012'),reports=[],errors=[];
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.mp4':'video/mp4','.webm':'video/webm','.wav':'audio/wav','.mp3':'audio/mpeg'};
let server,browser,page;
try{
 server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
  let b=fs.readFileSync(file);
  // Local test fixtures only: a queued sortie entry or the last three comeback games.
  if(file===path.join(root,'nova-game.js'))b=Buffer.from(b.toString()
   .replace('  function queueAutoStep(delayMs=150){','  function queueAutoStep(delayMs=150){if(window.__stopAfterPaidGame && !isSpinning && stats.totalSpins>=1){stopAutoPlay();return;}')
   .replace('    showCzPrelude(0,resolved);','    window.__paidBets.push({at:performance.now(),fee:stats.totalFee});showCzPrelude(0,resolved);')
   .replace('window.__jagAdminSnapshot = latestAdminSnapshot;',`window.__jagAdminSnapshot = latestAdminSnapshot;
    window.__paidBets=[];
    window.__challengeState=()=>({spinning:isSpinning,canStop:spinCanStop,locked:bonusConfirmSoundPlaying,fee:stats.totalFee,spins:stats.totalSpins,sorties:NovaProgress.snapshot().sorties,entry:normalState.stockEntry?.stage,flow:normalState.flow});
    window.__challengeFixture=(mode)=>{window.__stopAfterPaidGame=mode==='auto';NovaProgress.reset();normalState.novaProgress=NovaProgress.bind(NovaProgress.snapshot());normalState.flow={...NovaArt.enter({setting:3}),remaining:mode==='countdown'?'0':'500',burstUsed:true,initialStage:'',queuedZones:[],sets:'0',stock:'0'};if(mode==='countdown')normalState.flow.comebackLeft=3;else NovaProgress.queueSortie();updateDisplay();};`));
  const m=req.headers.range?.match(/^bytes=(\d+)-(\d*)/),start=m?Number(m[1]):0,end=m?.[2]?Math.min(b.length-1,Number(m[2])):b.length-1;
  res.writeHead(m?206:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','Content-Length':end-start+1,'Accept-Ranges':'bytes',...(m?{'Content-Range':`bytes ${start}-${end}/${b.length}`}:{})});res.end(b.subarray(start,end+1));
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--mute-audio']});
 for(const mode of ['manual','auto','mobile','error','reset','countdown']){
  console.log(mode);const context=await browser.newContext(mode==='mobile'?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{});
  await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  await context.addInitScript(mode=>{
   window.__events=[];const play=HTMLMediaElement.prototype.play,get=Element.prototype.getAttribute;
   HTMLMediaElement.prototype.play=function(){
    const src=this.getAttribute('src')||'',voice=src.endsWith('sosuke-sortie-entry.wav'),countdown=/cz_(?:remaining_[32]|last)\.wav/.test(src);
    if(voice||countdown){
     const e={type:voice?'voice':'countdown',at:performance.now(),src,actual:get.call(this,'src'),loop:this.loop,volume:this.volume};__events.push(e);
     if(voice){window.__sortieAudio=this;this.addEventListener('ended',()=>__events.push({type:'voiceEnded',at:performance.now()}),{once:true});}
     if(mode==='error'&&voice)return Promise.reject(Error('test unavailable sortie title'));
     const p=play.call(this);p?.then(()=>{e.started=true;e.duration=this.duration;},err=>e.error=err.message);return p;
    }return play.call(this);
   };
  },mode);
  page=await context.newPage();page.setDefaultTimeout(25000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/jag.html?debug=1',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__challengeFixture);
  await page.locator('#machine').click({position:{x:10,y:10},force:true});await page.evaluate(mode=>__challengeFixture(mode),mode);
  const press=selector=>page.locator(selector).evaluate(el=>el.click());
  const stop=async i=>{await page.waitForFunction(i=>!document.getElementById('stop'+i).disabled,i);await press('#stop'+i);};
  if(mode==='countdown'){
   for(let left=3;left>=1;left--){
    await page.locator('#forceResult').selectOption('MISS',{force:true});await press('#applyForceBtn');
    await press('#spinBtn');await page.waitForFunction(n=>__events.filter(e=>e.type==='countdown'&&e.started).length===n,4-left);
    for(const i of [2,1,0])await stop(i);
    await page.waitForFunction(()=>!__challengeState().spinning);
   }
   const events=await page.evaluate(()=>__events);assert.deepEqual(events.map(e=>e.src.split('/').at(-1).split('?')[0]),['cz_remaining_3.wav','cz_remaining_2.wav','cz_last.wav']);
   assert(events.every(e=>!e.loop&&e.volume>0&&e.started&&e.actual.includes('normalized-20261012')));
  }else{
   if(mode==='auto')await press('#quickAutoBtn');else{
    await press('#spinBtn');await page.waitForTimeout(800);await press('#spinBtn');
    await stop(2);assert.equal((await page.evaluate(()=>__events)).length,0);
    await stop(1);assert.equal((await page.evaluate(()=>__events)).length,0);await stop(0);
   }
   await page.waitForFunction(()=>__events.some(e=>e.type==='voice'));
   if(mode==='reset'){
    page.once('dialog',d=>d.accept());await press('#resetBtn');await page.waitForTimeout(5500);
    const state=await page.evaluate(()=>__challengeState());assert(!state.locked);assert.equal(state.fee,0);assert.equal(state.sorties,0);
   }else if(mode==='error'){
    await page.waitForFunction(()=>!__challengeState().locked);assert.equal((await page.evaluate(()=>__challengeState())).fee,0);
    await page.waitForTimeout(600);await press('#spinBtn');await page.waitForFunction(()=>__challengeState().fee===3);
   }else{
    await page.waitForFunction(()=>__events.some(e=>e.type==='voice'&&e.started));
    const voice=(await page.evaluate(()=>__events)).find(e=>e.type==='voice');assert(!voice.loop&&voice.volume>0);assert.match(voice.actual,/normalized-20261012/);assert(Math.abs(voice.duration-4.778667)<.01);
    await press('#spinBtn');await page.waitForTimeout(600);
    const waiting=await page.evaluate(()=>__challengeState());assert(waiting.locked&&!waiting.spinning);assert.equal(waiting.fee,0);assert.equal(waiting.sorties,1);
    await page.waitForFunction(()=>__events.some(e=>e.type==='voiceEnded'));
    if(mode!=='auto')await press('#spinBtn');
    await page.waitForFunction(()=>__challengeState().fee===3);
    const timeline=await page.evaluate(()=>({events:__events,bets:__paidBets}));assert.equal(timeline.bets.length,1);assert(timeline.bets[0].at>=timeline.events.find(e=>e.type==='voiceEnded').at);
    assert.equal((await page.evaluate(()=>__challengeState())).sorties,0);
    if(mode==='auto')await page.waitForFunction(()=>!__challengeState().spinning);
   }
   assert.equal((await page.evaluate(()=>__events)).filter(e=>e.type==='voice').length,1);
  }
  reports.push({mode,events:await page.evaluate(()=>__events),bets:await page.evaluate(()=>__paidBets),state:await page.evaluate(()=>__challengeState())});await context.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({status:'pass',muted:true,reports,errors},null,2));console.log('PASS all 6 modes');
}catch(error){if(page&&!page.isClosed())fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify(await page.evaluate(()=>({events:window.__events,state:window.__challengeState?.(),snapshot:window.__jagAdminSnapshot?.()})),null,2));throw error;}
finally{await browser?.close();if(server)await new Promise(r=>server.close(r));}
