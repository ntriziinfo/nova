import fs from 'node:fs';
import assert from 'node:assert/strict';
import {open,seed} from './browser.mjs';
const {browser,page,errors,missing}=await open(),checks=[];
async function setup(config={}){
 await seed(page,config);
 await page.evaluate(config=>{
  window.qa={spins:[],sounds:0,shows:[],autoStopAt:0,config};
  const step=NovaArt.step,begin=NovaBellNavi.begin,clear=NovaBellNavi.clear,show=NovaDirectAward.show,play=HTMLMediaElement.prototype.play;
  NovaArt.step=(s,o,r,f)=>step(s,o,()=>.9,qa.config.role||f);
  NovaBellNavi.begin=s=>{qa.spins.push(s);return begin(s,()=>qa.config.roll??.8);};
  NovaDirectAward.show=r=>{const shown=show(r);qa.shows.push({shown,amount:NovaDirectAward.amount(r),zoneAward:r.zoneAward,stopped:qa.spins.at(-1).stopped.slice()});return shown;};
  NovaBellNavi.clear=()=>{clear();if(qa.autoStopAt&&qa.spins.length>=qa.autoStopAt&&qa.spins.at(-1).stopped.every(Boolean)){qa.autoStopAt=0;document.querySelector('#quickAutoBtn').click();}};
  HTMLMediaElement.prototype.play=function(){if(this.src.includes('/nova/bell-navi.wav'))qa.sounds++;return play.call(this);};
 },config);
}
async function bet(){await page.waitForFunction(()=>!document.querySelector('#spinBtn').disabled&&!NovaAim.busy&&!NovaLadder.busy&&!NovaDirectAward.busy);await page.locator('#spinBtn').click();await page.waitForFunction(()=>!document.querySelector('#stop0').disabled);}
async function stop(i){await page.locator('#stop'+i).click();await page.waitForFunction(i=>qa.spins.at(-1).stopped[i],i);}
async function finish(){await page.waitForFunction(()=>qa.spins.at(-1).finishing);}
try{
 for(const [role,color,mark,roll]of [
  ['WEAK_SUICA','green','!',.1],['STRONG_SUICA','green','!',.8],['STRONG_SUICA','green','!!',.1],
  ['CHANCE_A','purple','!',.1],['CHANCE_B','purple','!',.8],['CHANCE_B','purple','!!',.1],
  ['WEAK_NOVA','red','!',.1],['STRONG_NOVA','red','!',.8],['STRONG_NOVA','red','!!',.1],['SUPER_NOVA','red','!!',.8]
 ]){
  await setup({role,roll});await bet();
  const n=page.locator('#novaBellNavi');assert(await n.isVisible());assert.equal(await n.getAttribute('data-color'),color);
  assert.deepEqual(await page.locator('.novaBellNaviItem').evaluateAll(items=>items.map(x=>x.dataset.mark)),[mark,mark,mark]);
  await page.waitForFunction(()=>[...document.querySelectorAll('.novaBellNaviItem img')].every(i=>i.complete&&i.naturalWidth>0));
  assert.equal(await page.evaluate(()=>qa.sounds),0);
  if(role==='WEAK_SUICA'||role==='CHANCE_B'&&mark==='!!'||role==='SUPER_NOVA')await page.screenshot({path:'research/navi136/'+color+'.png'});
  await stop(0);assert.equal(await page.locator('.novaBellNaviItem').nth(0).getAttribute('data-stopped'),'true');
  for(const i of [1,2])await stop(i);await finish();assert(await n.isHidden());
  checks.push({role,color,mark,roll,bellSounds:0});console.log(role+' '+mark+' OK');
 }
 // Yellow bell orders and the BET sound still work after introducing alert guides.
 await setup({role:'BELL',roll:.75});await bet();assert.equal(await page.locator('#novaBellNavi').getAttribute('data-color'),'yellow');
 const order=await page.evaluate(()=>qa.spins.at(-1).bellNaviOrder);for(const i of order)await stop(i);await finish();assert.equal(await page.evaluate(()=>qa.sounds),1);checks.push({bellOrder:order,sounds:1});
 // AUTO uses the usual stop order for role hints and does not treat !! as numbered navigation.
 await setup({role:'CHANCE_B',roll:.1});await page.evaluate(()=>qa.autoStopAt=1);await page.locator('#quickAutoBtn').click();
 await page.waitForFunction(()=>qa.spins.at(-1)?.finishing&&document.querySelector('#quickAutoBtn').textContent==='AUTO');
 assert.deepEqual(await page.evaluate(()=>qa.spins[0].auditPressOrder),[0,1,2]);assert.deepEqual((await page.evaluate(()=>qa.spins[0].auditStopOrder)).sort(),[0,1,2]);assert(await page.locator('#novaBellNavi').isHidden());checks.push({autoRare:true,pressOrder:[0,1,2],landOrder:await page.evaluate(()=>qa.spins[0].auditStopOrder)});
 for(const zone of ['sosuke','giru','ura_giru','sora']){
  await setup({zone,role:zone==='sora'?'BIG':'REPLAY',flowPatch:{ladder:[50,100,350,500,1000],ladderRevealed:true,ladderIndex:1,award:'100',zoneLeft:3,sevenHits:2,burstUsed:true}});
  await bet();assert(await page.locator('#novaBellNavi').isHidden());for(const i of [2,1,0])await stop(i);await finish();
  const q=await page.evaluate(()=>({shows:qa.shows,flow:__jagAdminSnapshot().normalState.flow,shutterVisible:!document.querySelector('.novaLadderPresentation')?.hidden,overlayVisible:document.querySelector('#overlay')?.classList.contains('show')}));
  if(zone==='sora'){assert(q.shows.some(s=>s.shown));assert(await page.locator('#novaDirectAward').isVisible());}
  else{assert(q.shows.length>0&&q.shows.every(s=>!s.shown));assert(await page.locator('#novaDirectAward').isHidden());assert.equal(q.flow.award,'350');assert(q.shutterVisible);assert(!q.overlayVisible);}
  checks.push({zone,shows:q.shows,award:q.flow.award,shutterVisible:q.shutterVisible,overlayVisible:q.overlayVisible});console.log('zone '+zone+' OK');
 }
 // The existing position editor still previews the yellow digits without a sound.
 await setup();await page.locator('#bellNaviAdjustBtn').click();assert.equal(await page.locator('#novaBellNavi').getAttribute('data-kind'),'bell');assert(await page.locator('#novaBellNavi').isVisible());assert.equal(await page.evaluate(()=>qa.sounds),0);await page.locator('#layoutEditCloseBtn').click();checks.push({adjustmentPreview:true,sounds:0});
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);fs.writeFileSync('research/navi136/qa.json',JSON.stringify({silent:true,isolated:true,checks,errors,missing},null,2));console.log(JSON.stringify({checks:checks.length,errors,missing}));
}catch(e){await page.screenshot({path:'research/navi136/error.png'});console.log(JSON.stringify({error:String(e),errors,missing,qa:await page.evaluate(()=>window.qa)}));throw e;}finally{await browser.close();}
