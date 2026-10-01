import fs from 'node:fs';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/nitro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.connectOverCDP('http://127.0.0.1:9227'),context=await browser.newContext({viewport:{width:1440,height:1250}}),page=await context.newPage(),errors=[],checks=[],dir='research/sortie-debug-20261001';
page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{let access;Object.defineProperty(window,'NovaPlayAccess',{get:()=>access,set:value=>{access={...value,create:(key,options)=>value.create(key,{...options,blocked:(reason,error)=>{window.qaBootError=error?.stack||reason;options.blocked(reason,error);}})};}});});
await page.addInitScript(()=>{const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){this.muted=true;return play.call(this);};const seed=sessionStorage.getItem('stockQaSeed');if(seed){for(const[k,v]of Object.entries(JSON.parse(seed)))localStorage.setItem(k,v);sessionStorage.removeItem('stockQaSeed');}});
const ready=()=>page.waitForFunction(()=>{if(window.qaBootError)throw Error(window.qaBootError);return typeof __jagAdminSnapshot==='function'&&__jagAdminSnapshot()!==null;}),state=()=>page.evaluate(()=>__jagAdminSnapshot());
async function seed(extra){const data=await page.evaluate(extra=>{__jagAdminSnapshot();const out={};for(const k of Object.keys(localStorage).filter(k=>k.startsWith('nova_slot_state_v1_'))){const d=JSON.parse(localStorage.getItem(k));if(!d?.settings||!d.normalState)continue;
 d.settings.setting=3;d.settings.autoDelay=.1;const flow={...NovaArt.enter({setting:3},()=>.99),remaining:'900',queuedZones:['kushuri_nito','kushuri_nito'],...extra};Object.assign(d.normalState,{flow,bonusPending:false,resultCard:null,pendingZoneResult:null,ladderAwardPresentation:null,stockEntry:null,internal:null,checkpointResultShown:0,replayFree:false,novaProgress:{version:167,next:2400,pending:0,sorties:0}});Object.assign(d.stats,{totalFee:10000,totalPaid:10000,slumpHigh:0,slumpLow:0,slumpHistory:[{spin:0,profit:0}]});d.runtimeState={session:{active:false,phase:'idle',resultPayout:null}};d.completeTrialState={locked:false};out[k]=JSON.stringify(d);
 }return out;},extra);await page.evaluate(d=>sessionStorage.setItem('stockQaSeed',JSON.stringify(d)),data);await page.reload({waitUntil:'domcontentloaded'});await ready();}
async function bet(){const key=s=>JSON.stringify([s.state.isSpinning,s.normalState.stockEntry?.stage,s.stats.totalSpins]),before=key(await state());for(let i=0;i<120;i++){await page.locator('#spinBtn').click();if(key(await state())!==before)return;await page.waitForTimeout(100);}throw Error('BET did not advance after presentation gates');}
async function stop(i){await page.waitForFunction(i=>!document.querySelector('.reel[data-reel="'+i+'"]').classList.contains('spinning')||!document.querySelector('#stop'+i).disabled,i);if(!await page.locator('.reel[data-reel="'+i+'"]').evaluate(e=>e.classList.contains('spinning')))return;await page.locator('#stop'+i).click();await page.waitForFunction(i=>!document.querySelector('.reel[data-reel="'+i+'"]').classList.contains('spinning'),i);}
async function all(){for(const i of [2,1,0])await stop(i);await page.waitForFunction(()=>!__jagAdminSnapshot().state.isSpinning);}
const accounting=s=>({paid:s.stats.totalPaid,fee:s.stats.totalFee,spins:s.stats.totalSpins,flow:s.normalState.flow});
try{
 await page.goto(process.env.NOVA_QA_URL||'http://127.0.0.1:8765/jag.html?debug=1',{waitUntil:'domcontentloaded'});await ready();
 await seed({queuedZones:[]});
 const label=await page.locator('#novaFlowStatus').textContent();assert.match(label,/AT 900pt/);assert(!label.includes('上位ATチャレンジまで'));
 await page.evaluate(()=>{__jagAdminSnapshot();const out={};for(const k of Object.keys(localStorage).filter(k=>k.startsWith('nova_slot_state_v1_'))){const d=JSON.parse(localStorage.getItem(k));if(!d?.normalState)continue;d.stats.totalPaid=d.stats.totalFee+2400;d.normalState.novaProgress={version:167,next:4800,pending:1,sorties:0};out[k]=JSON.stringify(d);}sessionStorage.setItem('stockQaSeed',JSON.stringify(out));});
 await page.reload({waitUntil:'domcontentloaded'});await ready();assert.equal(await page.locator('#novaFlowStatus').getAttribute('data-at-checkpoint'),'true');assert.equal(await page.locator('#novaFlowStatus').textContent(),'上位ATチャレンジまで0pt');checks.push('countdown hidden during ordinary AT and shown gold only after the earned checkpoint');
 await seed({queuedZones:[]});
 for(const reload of [false,true]){
  if(reload)await seed({queuedZones:[]});
  const before=await state();
  await page.evaluate(()=>{document.querySelector('#forceResult').value='FREEZE';document.querySelector('#applyForceBtn').click();});
  await bet();
  await page.waitForFunction(()=>document.querySelector('#machine').dataset.sortieFreeze==='true');
  assert.equal(await page.locator('.reel.spinning').count(),0);assert.equal((await state()).state.spinCanStop,false);
  assert.match(await page.locator('#overlayText').textContent(),/^FREEZE$/);
  if(!reload)await page.locator('.reelArea').screenshot({path:dir+'/freeze-entry.png'});
  if(reload){await page.reload({waitUntil:'domcontentloaded'});await ready();}
  await page.waitForFunction(()=>document.querySelectorAll('.reel.spinning').length===3);
  await all();
  const after=await state();assert.equal(after.stats.totalFee-before.stats.totalFee,3);assert.equal(after.normalState.flow.researchSortieLeft,9);assert.equal(after.normalState.flow.remaining,'900');assert.equal(after.normalState.bonusPending,false);
  checks.push(reload?'freeze reload resumes the charged spin without drawing again':'FREEZE flag holds reels, then runs one sortie spin');
 }
 await seed({queuedZones:[]});
 await page.evaluate(()=>{document.querySelector('#forceResult').value='FREEZE';document.querySelector('#applyForceBtn').click();});
 await page.locator('#quickAutoBtn').click();
 await page.waitForFunction(()=>document.querySelector('#machine').dataset.sortieFreeze==='true');
 await page.waitForFunction(()=>__jagAdminSnapshot().normalState.flow.researchSortieLeft===9,{},{timeout:15000});
 if((await state()).state.autoPlay)await page.locator('#quickAutoBtn').click();
 await page.waitForFunction(()=>!__jagAdminSnapshot().state.isSpinning);
 checks.push('AUTO continues after opening freeze');
 assert.deepEqual(errors,[]);const report={passed:true,silent:true,checks,errors};fs.writeFileSync(dir+'/'+(process.env.NOVA_QA_URL?'public-':'')+'freeze-browser-qa.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(e){console.log(JSON.stringify({state:await state(),errors}));throw e;}finally{await context.close();await browser.close();}
