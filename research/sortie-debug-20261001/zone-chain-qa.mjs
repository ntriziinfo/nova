import fs from 'node:fs';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/nitro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.connectOverCDP('http://127.0.0.1:9227'),context=await browser.newContext({viewport:{width:1440,height:1250}}),page=await context.newPage(),errors=[],checks=[],dir='research/sortie-debug-20261001';
page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{
 window.qaPlayed=[];const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){this.muted=true;window.qaPlayed.push(this.getAttribute('src')||this.src);return play.call(this);};
 const connect=AudioNode.prototype.connect;AudioNode.prototype.connect=function(destination,...args){if(destination instanceof AudioDestinationNode){const silent=this.context.createGain();silent.gain.value=0;connect.call(this,silent,...args);connect.call(silent,destination);return destination;}return connect.call(this,destination,...args);};
 const seed=sessionStorage.getItem('chainQaSeed');if(seed){for(const[k,v]of Object.entries(JSON.parse(seed)))localStorage.setItem(k,v);sessionStorage.removeItem('chainQaSeed');}
});
const ready=()=>page.waitForFunction(()=>typeof __jagAdminSnapshot==='function'&&__jagAdminSnapshot()!==null),state=()=>page.evaluate(()=>__jagAdminSnapshot());
async function seed({queue=[],zone='',award=0,keepChain=false}){
 await page.evaluate(({queue,zone,award,keepChain})=>{__jagAdminSnapshot();const out={};for(const k of Object.keys(localStorage).filter(k=>k.startsWith('nova_slot_state_v1_'))){const d=JSON.parse(localStorage.getItem(k));if(!d?.normalState)continue;
  const base={...NovaArt.enter({setting:3},()=>.99),remaining:'900',queuedZones:queue};
  const flow=zone?{...NovaArt.startZone(base,zone,{setting:3},()=>.5),zoneLeft:1,award:String(award),sevenHits:5}:base;
  d.settings.setting=3;d.settings.audioMuted=true;d.settings.autoDelay=.2;
  Object.assign(d.normalState,{flow,zoneResultChain:keepChain?d.normalState.zoneResultChain:null,bonusPending:false,resultCard:null,pendingZoneResult:null,ladderAwardPresentation:null,stockEntry:null,replayFree:false,novaProgress:{version:167,next:2400,pending:0,sorties:0}});
  Object.assign(d.stats,{totalFee:10000,totalPaid:10000,slumpHigh:0,slumpLow:0,slumpHistory:[{spin:0,profit:0}]});d.runtimeState={session:{active:false,phase:'idle',resultPayout:null}};d.completeTrialState={locked:false};out[k]=JSON.stringify(d);
 }sessionStorage.setItem('chainQaSeed',JSON.stringify(out));},{queue,zone,award,keepChain});
 await page.reload({waitUntil:'domcontentloaded'});await ready();
}
async function force(role){await page.evaluate(role=>{document.querySelector('#forceResult').value=role;document.querySelector('#applyForceBtn').click();},role);}
async function bet(){const key=s=>JSON.stringify([s.state.isSpinning,s.normalState.stockEntry?.stage,s.stats.totalSpins]),before=key(await state());for(let i=0;i<120;i++){await page.locator('#spinBtn').click();if(key(await state())!==before)return;await page.waitForTimeout(100);}throw Error('BET gate stayed closed');}
async function stop(){for(const i of [2,1,0]){await page.waitForFunction(i=>!document.querySelector('#stop'+i).disabled,i);await page.locator('#stop'+i).click();await page.waitForFunction(i=>!document.querySelector('.reel[data-reel="'+i+'"]').classList.contains('spinning'),i);}await page.waitForFunction(()=>!__jagAdminSnapshot().state.isSpinning);}
async function clearPlayed(){await page.evaluate(()=>{window.qaPlayed=[];});}
async function sevenVoices(){return page.evaluate(()=>window.qaPlayed.filter(src=>/aim[-_]seven/.test(src)));}
try{
 await page.goto(process.env.NOVA_QA_URL||'http://127.0.0.1:8765/jag.html?debug=1',{waitUntil:'domcontentloaded'});await ready();
 for(const zone of process.env.NOVA_QA_RESULTS_ONLY?[]:['sora','toto','ura_sora']){
  await seed({queue:[zone]});const before=await state();await bet();await clearPlayed();await bet();
  assert.deepEqual(await sevenVoices(),['assets/media/nova/aim-seven-'+zone.replace(/^ura_/,'')+'.wav']);await stop();
  const after=await state();assert.equal(after.stats.totalFee,before.stats.totalFee);assert.equal(after.stats.totalSpins,before.stats.totalSpins);
  await clearPlayed();await force('BELL');await bet();assert.deepEqual(await sevenVoices(),['assets/media/nova/aim-seven-'+zone.replace(/^ura_/,'')+'.wav']);await stop();
  checks.push(zone+': correct voice at free entrance and first actual zone game');
 }
 await seed({zone:'sora',award:300,queue:['toto']});await force('BELL');await bet();await stop();
 await page.waitForFunction(()=>__jagAdminSnapshot().normalState.resultCard?.pt==='300');
 let card=(await state()).normalState.resultCard;assert.equal(card.totalPt,'300');assert.equal(card.zoneCount,1);
 await page.reload({waitUntil:'domcontentloaded'});await ready();card=(await state()).normalState.resultCard;assert.equal(card.totalPt,'300');assert.equal((await state()).normalState.zoneResultChain.totalPt,'300');
 await seed({zone:'toto',award:500,keepChain:true});await force('BELL');await page.locator('#quickAutoBtn').click();
 await page.waitForFunction(()=>__jagAdminSnapshot().normalState.resultCard?.pt==='500');if((await state()).state.autoPlay)await page.locator('#quickAutoBtn').click();
 card=(await state()).normalState.resultCard;assert.equal(card.totalPt,'800');assert.equal(card.zoneCount,2);assert.equal((await state()).normalState.flow.remaining,'1400');
 assert.equal(await page.locator('.novaResultFallback output').textContent(),'500pt');assert.equal(await page.locator('.novaResultTotal').textContent(),'連続特化 合計 800pt');
 assert.equal(await page.locator('#overlay').evaluate(el=>el.classList.contains('show')),false);
 await page.waitForFunction(()=>!document.querySelector('.novaResultsLayer').dataset.loading);
 for(const [name,viewport] of [['desktop',{width:1440,height:1250}],['mobile',{width:390,height:844}]]){
  await page.setViewportSize(viewport);await page.waitForTimeout(200);
  const rect=await page.evaluate(()=>{const total=document.querySelector('.novaResultTotal'),a=document.querySelector('.novaResultCard').getBoundingClientRect(),b=total.getBoundingClientRect();return {inside:b.left>=a.left&&b.right<=a.right&&b.top>=a.top&&b.bottom<=a.bottom,textFits:total.scrollWidth<=total.clientWidth+1};});assert(rect.inside&&rect.textFits,JSON.stringify(rect));
  await page.locator('.novaResultCard').screenshot({path:dir+'/zone-chain-'+name+'.png'});
 }
 checks.push('300pt then 500pt gives total 800pt, survives reload and AUTO, and fits desktop/mobile');
 assert.deepEqual(errors,[]);const report={passed:true,silent:true,checks,errors};fs.writeFileSync(dir+'/zone-chain-qa.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await context.close();await browser.close();}
