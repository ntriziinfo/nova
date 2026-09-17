import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/nitro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
// agent-browser is unavailable here; use isolated, muted Edge and local routes.
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--mute-audio']});
const page=await browser.newPage({viewport:{width:1440,height:1080}}),root=process.cwd(),errors=[],missing=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
await page.route('**/*',async route=>{
 const u=new URL(route.request().url());if(u.hostname!=='nova-debug.test')return route.abort();
 const file=path.resolve(root,'.'+decodeURIComponent(u.pathname));if(!file.startsWith(root+path.sep))return route.abort();
 const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.mp4':'video/mp4','.wav':'audio/wav'};
 try{await route.fulfill({status:200,contentType:types[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});}catch{missing.push(u.pathname);await route.abort();}
});
await page.addInitScript(()=>{const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){this.muted=true;return play.call(this);};});
async function ready(){await page.waitForSelector('#bellNaviAdjustBtn');}
async function hooks(){await page.evaluate(()=>{
 window.qa={spins:[],forced:'BELL',next:0,autoStopAt:0};
 const begin=NovaBellNavi.begin,clear=NovaBellNavi.clear,step=NovaArt.step;
 NovaArt.step=(s,o,r,f)=>step(s,o,r,qa.forced||f);
 NovaBellNavi.begin=s=>{const result=begin(s,()=>(qa.next++%6+.5)/6);qa.spins.push(s);return result;};
 NovaBellNavi.clear=()=>{clear();if(qa.autoStopAt&&qa.spins.length>=qa.autoStopAt&&qa.spins.at(-1).stopped.every(Boolean)){qa.autoStopAt=0;document.querySelector('#quickAutoBtn').click();}};
});}
async function bet(){await page.waitForFunction(()=>!document.querySelector('#spinBtn').disabled);await page.locator('#spinBtn').click();await page.waitForFunction(()=>!document.querySelector('#stop0').disabled);}
async function stop(i){await page.locator('#stop'+i).click();await page.waitForFunction(i=>qa.spins.at(-1).stopped[i],i);}
async function complete(){await page.waitForFunction(()=>qa.spins.at(-1)?.finishing);}
const box=()=>page.locator('#novaBellNavi').boundingBox();
try{
 await page.goto('https://nova-debug.test/jag.html?debug=1',{waitUntil:'domcontentloaded'});await ready();
 const seed=await page.evaluate(()=>{
  window.__jagAdminSnapshot();const entries={};
  for(const k of Object.keys(localStorage).filter(k=>k.startsWith('nova_slot_state_v1_'))){let d;try{d=JSON.parse(localStorage.getItem(k));}catch{continue;}if(!d?.normalState||!d.settings)continue;
   d.normalState.flow=NovaArt.enter({},()=>.5);d.normalState.resultCard=null;d.normalState.bonusPending=false;d.stats.totalPaid=0;d.stats.totalFee=0;d.runtimeState={session:{active:false,phase:'idle',resultPayout:null}};entries[k]=JSON.stringify(d);
  }return entries;
 });
 assert(Object.keys(seed).length);
 await page.addInitScript(entries=>{for(const [k,v] of Object.entries(entries))localStorage.setItem(k,v);},seed);
 await page.reload({waitUntil:'domcontentloaded'});await ready();await hooks();
 const quota=await page.evaluate(()=>window.__jagAdminSnapshot().normalState.flow.remaining);assert.equal(quota,'750');
 // Every displayed digit maps to its reel and each stopped reel clears only its own guide.
 for(let p=0;p<6;p++){
  await bet();const order=await page.evaluate(()=>qa.spins.at(-1).bellNaviOrder);
  const digits=await page.locator('.novaBellNaviItem').evaluateAll(items=>items.map(x=>Number(x.dataset.number)));
  assert.deepEqual(digits,[0,1,2].map(i=>order.indexOf(i)+1));
  if(p===0){const n=await box(),r=await page.locator('.reels').boundingBox();assert(Math.abs(n.x-r.x)<1);assert(n.y+n.height<=r.y);assert(Math.abs(n.width-r.width)<1);await page.screenshot({path:'research/bell132/bell.png'});}
  for(const i of order){await stop(i);if(i!==order.at(-1))assert.equal(await page.locator('.novaBellNaviItem').nth(i).getAttribute('data-stopped'),'true');}
  await complete();assert(await page.locator('#novaBellNavi').isHidden());
  const spin=await page.evaluate(()=>qa.spins.at(-1));assert.deepEqual(spin.auditStopOrder,order);assert.equal(spin.resolved.reward,15);checks.push({manual:order});
 }
 // Non-bell clears the previous navigation.
 await page.evaluate(()=>qa.forced='REPLAY');await bet();assert(await page.locator('#novaBellNavi').isHidden());for(const i of [0,1,2])await stop(i);await complete();
 await page.evaluate(()=>{qa.forced='BELL';qa.spins=[];qa.next=0;qa.autoStopAt=6;});
 await page.locator('#quickAutoBtn').click();
 await page.waitForFunction(()=>qa.spins.length===6&&qa.spins.at(-1).finishing&&document.querySelector('#quickAutoBtn').textContent==='AUTO',{},{timeout:60000});
 const auto=await page.evaluate(()=>qa.spins.map(s=>({guide:s.bellNaviOrder,stops:s.auditStopOrder,reward:s.resolved.reward})));
 for(const s of auto){assert.deepEqual(s.stops,s.guide);assert.equal(s.reward,15);}checks.push({auto});
 // Enabling AUTO midway through a spin respects the same order and remaining reels.
 await page.evaluate(()=>{qa.spins=[];qa.next=4;});await bet();const order=await page.evaluate(()=>qa.spins.at(-1).bellNaviOrder);await stop(order[0]);
 await page.evaluate(()=>qa.autoStopAt=1);await page.locator('#quickAutoBtn').click();await complete();
 assert.deepEqual(await page.evaluate(()=>qa.spins[0].auditStopOrder),order);checks.push({takeover:order});
 // Adjustment preview, live geometry, saved defaults, reload and RESET.
 await page.locator('#bellNaviAdjustBtn').click();assert(await page.locator('#novaBellNavi').isVisible());
 const before=await box();
 for(const [prop,value] of Object.entries({x:3,y:-2,w:90,h:8.5,gap:1}))await page.locator(`[data-layout-target=navi][data-layout-prop=${prop}]`).evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));},String(value));
 const after=await box();assert(after.x>before.x);assert(after.y<before.y);assert(after.width<before.width);assert(after.height>before.height);
 await page.screenshot({path:'research/bell132/adjust.png'});await page.locator('#layoutEditSaveDefaultBtn').click();await page.locator('#layoutEditCloseBtn').click();assert(await page.locator('#novaBellNavi').isHidden());
 await page.reload({waitUntil:'domcontentloaded'});await ready();await page.locator('#bellNaviAdjustBtn').click();
 assert.equal(await page.locator('[data-layout-target=navi][data-layout-prop=x]').inputValue(),'3');
 const restored=await box();assert(Math.abs(restored.x-after.x)<1);assert(Math.abs(restored.width-after.width)<1);
 await page.locator('[data-layout-target=navi][data-layout-prop=x]').evaluate(el=>{el.value='8';el.dispatchEvent(new Event('input',{bubbles:true}));});await page.locator('#layoutEditResetBtn').click();assert.equal(await page.locator('[data-layout-target=navi][data-layout-prop=x]').inputValue(),'3');
 checks.push({layout:{before,after,restored,persisted:true,resetToSavedDefault:true}});
 await page.locator('#layoutEditCloseBtn').click();assert(await page.locator('#novaBellNavi').isHidden());
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
 fs.writeFileSync('research/bell132/qa.json',JSON.stringify({silent:true,isolated:true,checks,pageErrors:errors,missingAssets:missing},null,2));console.log(JSON.stringify({checks:checks.length,pageErrors:errors,missing}));
}catch(e){await page.screenshot({path:'research/bell132/error.png'});console.log(JSON.stringify({error:String(e),errors,missing,qa:await page.evaluate(()=>window.qa)}));throw e;}finally{await browser.close();}
