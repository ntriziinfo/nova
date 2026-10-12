import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('C:/Users/nitro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=process.cwd(),out=path.join(root,'research/sortie-award-voices-20261012'),reports=[],errors=[];
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.mp4':'video/mp4','.webm':'video/webm','.wav':'audio/wav','.mp3':'audio/mpeg'};
const cases=[{zone:'sosuke'},{zone:'sora',auto:true},{zone:'ura_sora'},{zone:'giru'},{zone:'ura_giru',auto:true},{zone:'ouma'},{zone:'ura_ouma',last:true,slow:true},{zone:'toto',mobile:true},{zone:'sora',error:true},{zone:'toto',reset:true},{zone:'sora',loss:true}];
let server,browser,page;
try{
 server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
  let b=fs.readFileSync(file);
  // These selected outcomes and observability hooks exist only in the served test copy.
  if(file===path.join(root,'nova-game.js'))b=Buffer.from(b.toString()
   .replace('    showCzPrelude(0,resolved);',`if(window.__fixture&&!window.__fixtureUsed&&resolved.researchSortie){window.__fixtureUsed=true;const f=window.__fixture;Object.assign(resolved.researchSortie,{won:!f.loss,zone:f.loss?'':f.zone,finished:!!f.last,hits:f.loss?2:3});Object.assign(resolved.flowAfter,{researchSortieHits:f.loss?2:3,researchSortieLeft:f.last?0:4,queuedZones:f.loss?[]:[f.zone]});}
    window.__bets.push({at:performance.now(),fee:stats.totalFee});showCzPrelude(0,resolved);`)
   .replace('window.__jagAdminSnapshot = latestAdminSnapshot;',`window.__jagAdminSnapshot = latestAdminSnapshot;
    window.__bets=[];window.__fixtureUsed=false;
    window.__voiceState=()=>({spinning:isSpinning,locked:bonusConfirmSoundPlaying,fee:stats.totalFee,spins:stats.totalSpins,hold:NovaSortie.busy,card:normalState.resultCard,pending:normalState.pendingSortieResult,stopped:currentSpin?.stopped,flow:normalState.flow});
    window.__setupAward=f=>{window.__fixture=f;NovaProgress.reset();normalState.novaProgress=NovaProgress.bind(NovaProgress.snapshot());normalState.flow={...NovaArt.enter({setting:3}),remaining:'500',burstUsed:true,initialStage:'',queuedZones:[],sets:'0',stock:'0',researchSortieLeft:5,researchSortieRate:1,researchSortieHits:2};updateDisplay();};`));
  const m=req.headers.range?.match(/^bytes=(\d+)-(\d*)/),start=m?Number(m[1]):0,end=m?.[2]?Math.min(b.length-1,Number(m[2])):b.length-1;
  res.writeHead(m?206:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':file.endsWith('.wav')?'public, max-age=3600':'no-store','Content-Length':end-start+1,'Accept-Ranges':'bytes',...(m?{'Content-Range':`bytes ${start}-${end}/${b.length}`}:{})});res.end(b.subarray(start,end+1));
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--mute-audio']});
 for(const spec of cases){
  console.log(JSON.stringify(spec));const context=await browser.newContext(spec.mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{});
  await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  await context.addInitScript(spec=>{
   window.__events=[];const play=HTMLMediaElement.prototype.play,get=Element.prototype.getAttribute;
   HTMLMediaElement.prototype.play=function(){
    const src=this.getAttribute('src')||'',voice=/sortie-award-(sosuke|sora|giru|ouma|toto)\.wav$/.test(src),result=src.endsWith('result-eyecatch.wav');
    if(voice||result){
     const e={type:voice?'voice':'result',src,actual:get.call(this,'src'),at:performance.now(),loop:this.loop,volume:this.volume};__events.push(e);
     // Capture the terminal event before the game's onended handler starts a result.
     if(voice){window.__awardAudio=this;if(spec.slow)this.playbackRate=.5;this.addEventListener('ended',()=>__events.push({type:'voiceEnded',at:performance.now()}),{once:true,capture:true});}
     if(voice&&spec.error)return Promise.reject(Error('test unavailable award voice'));
     const p=play.call(this);p?.then(()=>{e.started=true;e.duration=this.duration;},err=>e.error=err.message);return p;
    }return play.call(this);
   };
  },spec);
  page=await context.newPage();page.setDefaultTimeout(25000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/jag.html?debug=1',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__setupAward);await page.waitForLoadState('networkidle');
  await page.locator('#machine').click({position:{x:10,y:10},force:true});await page.evaluate(spec=>__setupAward(spec),spec);
  const press=s=>page.locator(s).evaluate(el=>el.click());
  const stop=async i=>{await page.waitForFunction(i=>!document.getElementById('stop'+i).disabled,i);await press('#stop'+i);await page.waitForFunction(i=>__voiceState().stopped?.[i]||!__voiceState().spinning,i);};
  if(spec.auto)await press('#quickAutoBtn');else{
   await press('#spinBtn');await stop(2);assert.equal((await page.evaluate(()=>__events)).length,0);
   await stop(1);assert.equal((await page.evaluate(()=>__events)).length,0);await stop(0);
  }
  if(spec.loss){await page.waitForFunction(()=>!__voiceState().spinning);assert.equal((await page.evaluate(()=>__events)).length,0);}
  else{
   await page.waitForFunction(()=>__events.some(e=>e.type==='voice'));
   const voice=(await page.evaluate(()=>__events)).find(e=>e.type==='voice');assert.equal(voice.src,`assets/media/nova/sortie-award-${spec.zone.replace(/^ura_/,'')}.wav`);assert(!voice.loop&&voice.volume>0);assert.match(voice.actual,/normalized-20261012/);
   if(spec.reset){
    page.once('dialog',d=>d.accept());await press('#resetBtn');await page.waitForTimeout(4500);const state=await page.evaluate(()=>__voiceState());assert(!state.locked&&!state.hold&&!state.spinning);assert.equal(state.fee,0);
   }else if(spec.error){
    await page.waitForFunction(()=>!__voiceState().locked&&!__voiceState().hold&&!__voiceState().spinning);await press('#spinBtn');await page.waitForFunction(()=>__bets.length===2);
   }else{
    await page.waitForFunction(()=>__events.some(e=>e.type==='voice'&&e.started));await press('#spinBtn');
    assert.equal((await page.evaluate(()=>__bets)).length,1);
    if(spec.slow){await page.waitForTimeout(4200);const state=await page.evaluate(()=>__voiceState());assert(state.locked&&!state.hold&&!state.card);await press('#spinBtn');assert.equal((await page.evaluate(()=>__bets)).length,1);}
    await page.waitForFunction(()=>__events.some(e=>e.type==='voiceEnded'));
    if(spec.last){await page.waitForFunction(()=>__events.some(e=>e.type==='result'));const events=await page.evaluate(()=>__events);assert(events.find(e=>e.type==='result').at>=events.find(e=>e.type==='voiceEnded').at);}
    else{
     await page.waitForFunction(()=>!__voiceState().hold);if(!spec.auto)await press('#spinBtn');await page.waitForFunction(()=>__bets.length>=2);
     const timeline=await page.evaluate(()=>({events:__events,bets:__bets}));assert(timeline.bets[1].at>=timeline.events.find(e=>e.type==='voiceEnded').at);assert(timeline.bets[1].at>=voice.at+3900);
    }
   }
   assert.equal((await page.evaluate(()=>__events)).filter(e=>e.type==='voice').length,1);
  }
  reports.push({spec,events:await page.evaluate(()=>__events),bets:await page.evaluate(()=>__bets),state:await page.evaluate(()=>__voiceState())});await context.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({status:'pass',muted:true,reports,errors},null,2));console.log('PASS all '+cases.length+' cases');
}catch(error){if(page&&!page.isClosed())fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify(await page.evaluate(()=>({events:window.__events,state:window.__voiceState?.(),bets:window.__bets})),null,2));throw error;}
finally{await browser?.close();if(server)await new Promise(r=>server.close(r));}
