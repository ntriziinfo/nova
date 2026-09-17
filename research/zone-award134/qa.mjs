import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/nitro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
// Isolated local preview; no sound reaches the user's speakers or play session.
const root=process.cwd(),out='research/zone-award134',browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--mute-audio']});
const page=await browser.newPage({viewport:{width:1440,height:1080}}),errors=[],missing=[],checks=[],finishOnly=process.argv.includes('--finish-only');
page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
await page.route('**/*',async route=>{
 const u=new URL(route.request().url());if(u.hostname!=='nova-debug.test')return route.abort();
 const file=path.resolve(root,'.'+decodeURIComponent(u.pathname));if(!file.startsWith(root+path.sep))return route.abort();
 const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.mp4':'video/mp4','.wav':'audio/wav'};
 try{await route.fulfill({status:200,contentType:types[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});}catch{missing.push(u.pathname);await route.abort();}
});
await page.addInitScript(()=>{
 if(window.name.startsWith('zoneQA:'))for(const [k,v]of Object.entries(JSON.parse(window.name.slice(7))))localStorage.setItem(k,v);
 const play=HTMLMediaElement.prototype.play;
 HTMLMediaElement.prototype.play=function(){this.muted=true;if(this instanceof HTMLAudioElement)this.playbackRate=8;
  if(window.qa&&this.src.includes('/nova/direct-award.wav'))qa.directSounds++;
  return play.call(this);
 };
});
async function ready(){await page.waitForSelector('#novaDirectAward',{state:'attached'});}
async function seed(config){
 const entries=await page.evaluate(config=>{
  window.__jagAdminSnapshot();const entries={};
  for(const key of Object.keys(localStorage).filter(k=>k.startsWith('nova_slot_state_v1_'))){let d;try{d=JSON.parse(localStorage.getItem(key));}catch{continue;}if(!d?.normalState||!d.settings)continue;
   let s=NovaArt.startZone(NovaArt.enter({},()=>.5),config.zone,{},()=>.5);
   if(config.initial){
    s=NovaArt.prepareBet({...NovaArt.enterInitial({},()=>.5),initialStage:'entry',initialWait:0,entryStage:'confirmed',pendingZone:config.zone},{},()=>.5);
    s.initialPlan=[50,100,150,200,250];if(['sosuke','giru'].includes(s.zone)){s.ladder=[50,150,300,500,750];s.award='50';}
   }else if(['sosuke','giru'].includes(s.zone))Object.assign(s,{ladder:[50,100,350,500,1000],ladderRevealed:true,ladderIndex:1,award:'100',zoneLeft:3});
   else Object.assign(s,{award:'100',zoneLeft:3,sevenHits:2});
   if(config.final)Object.assign(s,{award:'50',zoneLeft:1});
   s.burstUsed=true;
   d.normalState.flow=s;d.normalState.resultCard=null;d.normalState.bonusPending=false;d.normalState.pendingZoneResult=null;delete d.normalState.ladderAwardPresentation;
   d.stats.totalPaid=0;d.stats.totalFee=0;d.runtimeState={session:{active:false,phase:'idle',resultPayout:null}};
   d.settings.novaArt.oumaFreeze=config.zero?1:0;entries[key]=JSON.stringify(d);
  }return entries;
 },config);assert(Object.keys(entries).length);
 await page.evaluate(entries=>{window.name='zoneQA:'+JSON.stringify(entries);},entries);
 await page.reload({waitUntil:'domcontentloaded'});await ready();
 await page.evaluate(config=>{
  window.qa={config,spins:[],shows:[],results:[],directSounds:0,stopAt:0,holdThird:false};
  const step=NovaArt.step,begin=NovaBellNavi.begin,show=NovaDirectAward.show,clear=NovaBellNavi.clear,land=NovaReelMotion.stop,result=NovaResults.show;
  NovaArt.step=(s,o,r,f)=>step(s,o,()=>.9,s.zone&&!s.initialStage?qa.config.role||(['sosuke','giru'].includes(s.zone)?'REPLAY':['sora','toto'].includes(s.zone)?'BIG':'SUPER_NOVA'):f);
  NovaBellNavi.begin=spin=>{qa.spins.push(spin);return begin(spin);};
  NovaDirectAward.show=resolved=>{const shown=show(resolved);if(shown)qa.shows.push({pt:NovaDirectAward.amount(resolved),zoneAward:resolved.zoneAward,stopped:qa.spins.at(-1).stopped.slice(),moving:[0,1,2].map(i=>NovaReelMotion.has(i)),zero:!!resolved.flowBefore.zero,time:performance.now()});return shown;};
  NovaResults.show=card=>{qa.results.push({time:performance.now(),card});return result(card);};
  NovaBellNavi.clear=()=>{clear();if(qa.stopAt&&qa.spins.length>=qa.stopAt&&qa.spins.at(-1).stopped.every(Boolean)){qa.stopAt=0;document.querySelector('#quickAutoBtn').click();}};
  NovaReelMotion.stop=async(i,col,options)=>{const landed=await land(i,col,options);if(qa.holdThird&&qa.spins.at(-1).stopped.filter(Boolean).length===2){qa.thirdHeld=true;await new Promise(resolve=>qa.releaseThird=resolve);qa.holdThird=false;}return landed;};
 },config);
}
async function bet(){await page.waitForFunction(()=>!document.querySelector('#spinBtn').disabled&&!NovaAim.busy&&!NovaLadder.busy&&!NovaDirectAward.busy);await page.locator('#spinBtn').click();await page.waitForFunction(()=>!document.querySelector('#stop2').disabled);}
async function stop(i){await page.locator('#stop'+i).click();await page.waitForFunction(i=>qa.spins.at(-1).stopped[i],i);}
async function finish(){await page.waitForFunction(()=>qa.spins.at(-1).finishing);}
async function evidence(label){
 const q=await page.evaluate(()=>({config:qa.config,shows:qa.shows,results:qa.results,sounds:qa.directSounds,flow:window.__jagAdminSnapshot().normalState.flow}));
 for(const s of q.shows){assert(s.pt>0);assert.equal(s.pt,s.zoneAward);assert.deepEqual(s.stopped,[true,true,true]);assert.deepEqual(s.moving,[false,false,false]);}
 assert.equal(q.sounds,0);checks.push({label,...q});console.log(label+' '+q.shows.map(s=>s.pt).join(','));return q;
}
try{
 await page.goto('https://nova-debug.test/jag.html?debug=1',{waitUntil:'domcontentloaded'});await ready();
 if(!finishOnly){
 for(const zone of ['sosuke','giru','ura_giru','toto','sora','ura_sora','urapi','ouma','ura_ouma']){
  await seed({zone});await bet();assert(await page.locator('#novaDirectAward').isHidden());await stop(2);await stop(1);assert(await page.locator('#novaDirectAward').isHidden());
  if(zone==='sosuke'){
   await page.evaluate(()=>qa.holdThird=true);await page.locator('#stop0').click();await page.waitForFunction(()=>qa.thirdHeld);assert(await page.locator('#novaDirectAward').isHidden());await page.evaluate(()=>qa.releaseThird());await page.waitForFunction(()=>qa.spins.at(-1).stopped[0]);
  }else await stop(0);
  await finish();assert(await page.locator('#novaDirectAward').isVisible());
  const q=await evidence(zone);assert.equal(q.shows.length,1);assert.equal(q.shows[0].pt,Number(q.flow.award)-100);
  if(zone==='giru'){
   await page.waitForTimeout(250);await page.screenshot({path:out+'/plus-250.png'});
   const bounds=await page.locator('#novaDirectAward').boundingBox(),reels=await page.locator('.reels').boundingBox();for(const k of ['x','y','width','height'])assert(Math.abs(bounds[k]-reels[k])<1);
  }
 }
 // Reset-producing NEBULA still adds only 10pt; ordinary misses add nothing.
 await seed({zone:'sora',role:'NEBULA'});await bet();for(const i of [2,1,0])await stop(i);await finish();assert.deepEqual((await evidence('nebula')).shows.map(s=>s.pt),[10]);
 await seed({zone:'sora',role:'MISS'});await bet();for(const i of [2,1,0])await stop(i);await finish();assert(await page.locator('#novaDirectAward').isHidden());assert.equal((await evidence('miss')).shows.length,0);
 // A final guaranteed nova must be readable before the result card and input must wait.
 await seed({zone:'ouma',role:'MISS',final:true});await bet();for(const i of [2,1,0])await stop(i);await finish();
 assert(await page.locator('#novaDirectAward').isVisible());assert(await page.evaluate(()=>NovaDirectAward.busy));
 await page.locator('#spinBtn').click();assert.equal(await page.evaluate(()=>qa.spins.length),1);
 await page.waitForFunction(()=>qa.results.length===1);const final=await evidence('final-guarantee');assert(final.results[0].time-final.shows[0].time>=990);assert(await page.locator('#novaDirectAward').isHidden());
 // AUTO crosses all five scripted initial gains in every zone family.
 for(const zone of ['giru','sora','ouma']){
  await seed({zone,initial:true});await page.evaluate(()=>qa.stopAt=5);await page.locator('#quickAutoBtn').click();
  await page.waitForFunction(()=>qa.spins.length===5&&qa.spins.at(-1).finishing&&document.querySelector('#quickAutoBtn').textContent==='AUTO',{},{timeout:90000});
  const q=await evidence('initial-auto-'+zone);assert.deepEqual(q.shows.map(s=>s.pt),[50,100,150,200,250]);assert.equal(q.flow.remaining,'750');
 }
 // AUTO performs the next BET and an actual 0G reverse spin after a nova win.
 await seed({zone:'ouma',zero:true});await page.evaluate(()=>qa.stopAt=2);await page.locator('#quickAutoBtn').click();
 await page.waitForFunction(()=>qa.spins.length===2&&qa.spins.at(-1).finishing&&document.querySelector('#quickAutoBtn').textContent==='AUTO',{},{timeout:60000});
 const zero=await evidence('zero-auto');assert.equal(zero.shows.length,2);assert.equal(zero.shows[1].zero,true);
 assert(await page.locator('#novaDirectAward').isVisible());await page.locator('#resetBtn').evaluate(el=>el.click());assert(await page.locator('#novaDirectAward').isHidden());
 }else{
  await seed({zone:'ouma',role:'MISS',final:true});await page.evaluate(()=>qa.stopAt=2);await page.locator('#quickAutoBtn').click();
  await page.waitForFunction(()=>qa.spins.length===2&&qa.spins.at(-1).finishing&&document.querySelector('#quickAutoBtn').textContent==='AUTO',{},{timeout:60000});
  const q=await evidence('auto-resumes-after-final-result');assert.equal(q.results.length,1);assert.deepEqual(q.shows.map(s=>s.pt),[50]);assert(q.results[0].time-q.shows[0].time>=990);assert(await page.locator('#novaDirectAward').isHidden());
  await seed({zone:'ouma',role:'MISS',final:true});await bet();for(const i of [2,1,0])await stop(i);await finish();assert(await page.evaluate(()=>NovaDirectAward.busy));
  await page.locator('#resetBtn').evaluate(el=>el.click());await page.waitForTimeout(1100);assert.equal(await page.evaluate(()=>qa.results.length),0);assert(await page.locator('#novaDirectAward').isHidden());assert.equal(await page.evaluate(()=>NovaDirectAward.busy),false);await evidence('reset-cancels-deferred-result');
 }
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
 fs.writeFileSync(out+(finishOnly?'/finish-qa.json':'/qa.json'),JSON.stringify({silent:true,isolated:true,checks,pageErrors:errors,missingAssets:missing},null,2));
 console.log(JSON.stringify({checks:checks.length,errors,missing}));
}catch(e){await page.screenshot({path:out+'/error.png'});console.log(JSON.stringify({error:String(e),errors,missing,qa:await page.evaluate(()=>window.qa)}));throw e;}finally{await browser.close();}
