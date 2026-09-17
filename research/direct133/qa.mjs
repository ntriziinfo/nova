import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/nitro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
// agent-browser is unavailable. Keep this check isolated from the user's session and muted.
const root=process.cwd(),browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--mute-audio']});
const page=await browser.newPage({viewport:{width:1440,height:1080}}),errors=[],missing=[],checks=[];
page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
await page.route('**/*',async route=>{
 const u=new URL(route.request().url());if(u.hostname!=='nova-debug.test')return route.abort();
 const file=path.resolve(root,'.'+decodeURIComponent(u.pathname));if(!file.startsWith(root+path.sep))return route.abort();
 const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.mp4':'video/mp4','.wav':'audio/wav'};
 try{await route.fulfill({status:200,contentType:types[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});}catch{missing.push(u.pathname);await route.abort();}
});
await page.addInitScript(()=>{const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){this.muted=true;return play.call(this);};});
async function ready(){await page.waitForSelector('#novaDirectAward',{state:'attached'});}
async function hooks(){await page.evaluate(()=>{
 window.qa={amount:10,spins:[],shows:[],sequence:null,stopAt:0,holdThird:false};
 const step=NovaArt.step,begin=NovaBellNavi.begin,show=NovaDirectAward.show,clear=NovaBellNavi.clear,land=NovaReelMotion.stop;
 NovaArt.step=(s,o,r,f)=>{
  const amount=qa.sequence?qa.sequence.shift()||0:qa.amount;
  if(!amount)return step(s,o,()=>.9,'BELL');
  const role=amount<=30?'WEAK_SUICA':'STRONG_SUICA',rule=NovaArt.atRoleRules[role],i=rule.values.indexOf(amount);
  const weight=rule.weights.slice(0,i).reduce((a,b)=>a+b,0)+rule.weights[i]/2,draws=[.5,.99,0,weight,.99];
  const result=step(s,o,()=>draws.shift()??.99,role);
  if(result.atOutcome?.direct!==amount)throw Error('QA direct draw mismatch '+amount+' / '+result.atOutcome?.direct);
  return result;
 };
 NovaBellNavi.begin=spin=>{qa.spins.push(spin);return begin(spin);};
 NovaDirectAward.show=resolved=>{
  const result=show(resolved);
  if(result)qa.shows.push({pt:resolved.atOutcome.direct,stopped:qa.spins.at(-1).stopped.slice(),moving:[0,1,2].map(i=>NovaReelMotion.has(i)),time:performance.now()});
  return result;
 };
 NovaBellNavi.clear=()=>{clear();if(qa.stopAt&&qa.spins.length>=qa.stopAt&&qa.spins.at(-1).stopped.every(Boolean)){qa.stopAt=0;document.querySelector('#quickAutoBtn').click();}};
 NovaReelMotion.stop=async(i,col,options)=>{
  const landed=await land(i,col,options);
  if(qa.holdThird&&qa.spins.at(-1).stopped.filter(Boolean).length===2){qa.thirdHeld=true;await new Promise(resolve=>qa.releaseThird=resolve);qa.holdThird=false;}
  return landed;
 };
});}
async function bet(){await page.waitForFunction(()=>!document.querySelector('#spinBtn').disabled);await page.locator('#spinBtn').click();await page.waitForFunction(()=>!document.querySelector('#stop0').disabled);}
async function stop(i){await page.locator('#stop'+i).click();await page.waitForFunction(i=>qa.spins.at(-1).stopped[i],i);}
async function complete(){await page.waitForFunction(()=>qa.spins.at(-1).finishing);}
async function geometry(){
 await page.waitForFunction(()=>document.querySelector('#novaDirectAward img').getAnimations().every(a=>a.playState==='finished'));
 const a=await page.locator('#novaDirectAward').boundingBox(),b=await page.locator('.reels').boundingBox(),image=await page.locator('#novaDirectAward img').boundingBox();
 for(const key of ['x','y','width','height'])assert(Math.abs(a[key]-b[key])<1,key+': '+a[key]+' / '+b[key]);
 for(const key of ['x','y','width','height'])assert(Math.abs(image[key]-a[key])<1,'image '+key+': '+image[key]+' / '+a[key]);
 return {award:a,reels:b,image};
}
try{
 await page.goto('https://nova-debug.test/jag.html?debug=1',{waitUntil:'domcontentloaded'});await ready();
 const seed=await page.evaluate(()=>{
  window.__jagAdminSnapshot();const entries={};
  for(const k of Object.keys(localStorage).filter(k=>k.startsWith('nova_slot_state_v1_'))){let d;try{d=JSON.parse(localStorage.getItem(k));}catch{continue;}if(!d?.normalState||!d.settings)continue;
   d.normalState.flow={...NovaArt.enter({},()=>.5),burstUsed:true};d.normalState.resultCard=null;d.normalState.bonusPending=false;d.stats.totalPaid=0;d.stats.totalFee=0;d.runtimeState={session:{active:false,phase:'idle',resultPayout:null}};entries[k]=JSON.stringify(d);
  }return entries;
 });assert(Object.keys(seed).length);
 await page.addInitScript(entries=>{for(const [k,v]of Object.entries(entries))localStorage.setItem(k,v);},seed);
 await page.reload({waitUntil:'domcontentloaded'});await ready();await hooks();
 for(const amount of [10,20,30,50,100,300]){
  await page.evaluate(n=>qa.amount=n,amount);await bet();assert(await page.locator('#novaDirectAward').isHidden());
  await stop(0);assert(await page.locator('#novaDirectAward').isHidden());await stop(1);assert(await page.locator('#novaDirectAward').isHidden());
  if(amount===10){
   await page.evaluate(()=>qa.holdThird=true);await page.locator('#stop2').click();await page.waitForFunction(()=>qa.thirdHeld);
   assert(await page.locator('#novaDirectAward').isHidden());await page.evaluate(()=>qa.releaseThird());await page.waitForFunction(()=>qa.spins.at(-1).stopped[2]);
  }else await stop(2);
  await page.waitForFunction(n=>{const root=document.querySelector('#novaDirectAward'),img=root.querySelector('img');return !root.hidden&&root.dataset.pt===String(n)&&img.complete&&img.naturalWidth===1774;},amount);
  await complete();assert.equal(await page.locator('#novaDirectAward img').getAttribute('src'),'assets/design/nova-direct-pt-v1/direct-plus-'+amount+'pt.png');
  assert(!(await page.locator('#overlay').getAttribute('class')).split(' ').includes('show'));
  const accounting=await page.evaluate(()=>{const r=qa.spins.at(-1).resolved;return {before:r.flowBefore.remaining,after:window.__jagAdminSnapshot().normalState.flow.remaining,paid:r.reward,direct:r.atOutcome.direct};});
  assert.equal(Number(accounting.after),Number(accounting.before)+amount-accounting.paid);
  const bounds=await geometry();checks.push({amount,bounds,accounting});
  if(amount===10||amount===300)await page.screenshot({path:'research/direct133/plus-'+amount+'.png'});
 }
 const shows=await page.evaluate(()=>qa.shows);for(const show of shows){assert.deepEqual(show.stopped,[true,true,true]);assert.deepEqual(show.moving,[false,false,false]);}
 // Reels moved and resized by the layout editor's variables: overlay follows automatically.
 await page.evaluate(()=>{for(const [key,value]of Object.entries({'--layout-reels-x':'16%','--layout-reels-y':'29%','--layout-reels-w':'68%','--layout-reels-h':'24%'}))document.documentElement.style.setProperty(key,value);});
 checks.push({adjusted:await geometry()});
 await page.setViewportSize({width:900,height:900});checks.push({narrow:await geometry()});
 await page.evaluate(()=>{for(const key of ['--layout-reels-x','--layout-reels-y','--layout-reels-w','--layout-reels-h'])document.documentElement.style.removeProperty(key);});await page.setViewportSize({width:1440,height:1080});
 // No award on ordinary bell; the next valid BET clears the held award.
 await page.evaluate(()=>qa.amount=0);await bet();assert(await page.locator('#novaDirectAward').isHidden());for(const i of [0,1,2])await stop(i);await complete();assert(await page.locator('#novaDirectAward').isHidden());
 // AUTO keeps advancing across consecutive direct awards and a no-award spin.
 await page.evaluate(()=>{qa.spins=[];qa.shows=[];qa.sequence=[20,100,0];qa.stopAt=3;});await page.locator('#quickAutoBtn').click();
 await page.waitForFunction(()=>qa.spins.length===3&&qa.spins.at(-1).finishing&&document.querySelector('#quickAutoBtn').textContent==='AUTO',{},{timeout:60000});
 const auto=await page.evaluate(()=>qa.shows);assert.deepEqual(auto.map(x=>x.pt),[20,100]);for(const show of auto){assert.deepEqual(show.stopped,[true,true,true]);assert.deepEqual(show.moving,[false,false,false]);}assert(await page.locator('#novaDirectAward').isHidden());checks.push({auto});
 // Reset explicitly clears a held win; nothing is restored by a reload.
 await page.evaluate(()=>{qa.sequence=null;qa.amount=50;});await bet();for(const i of [0,1,2])await stop(i);await complete();assert(await page.locator('#novaDirectAward').isVisible());
 await page.locator('#resetBtn').evaluate(el=>el.click());assert(await page.locator('#novaDirectAward').isHidden());
 await page.reload({waitUntil:'domcontentloaded'});await ready();assert(await page.locator('#novaDirectAward').isHidden());
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
 fs.writeFileSync('research/direct133/qa.json',JSON.stringify({silent:true,isolated:true,checks,thirdStopLandingOnly:true,resetClears:true,reloadHidden:true,pageErrors:errors,missingAssets:missing},null,2));console.log(JSON.stringify({checks:checks.length,pageErrors:errors,missing}));
}catch(e){await page.screenshot({path:'research/direct133/error.png'});console.log(JSON.stringify({error:String(e),errors,missing,qa:await page.evaluate(()=>({amount:qa.amount,spins:qa.spins.length,shows:qa.shows}))}));throw e;}finally{await browser.close();}
