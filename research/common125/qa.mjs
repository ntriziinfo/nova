import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/nitro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=process.cwd(),browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--mute-audio']});
const page=await browser.newPage({viewport:{width:1440,height:1080}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
await page.route('**/*',async route=>{
 const u=new URL(route.request().url());if(u.hostname!=='nova-debug.test')return route.abort();
 const file=path.resolve(root,'.'+decodeURIComponent(u.pathname));if(!file.startsWith(root+path.sep))return route.abort();
 const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.wav':'audio/wav','.mp4':'video/mp4'};
 try{await route.fulfill({status:200,contentType:types[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});}catch{await route.abort();}
});
async function audit(){return page.evaluate(async()=>{const db=await new Promise((r,j)=>{const q=indexedDB.open('nova-play-audit-v1');q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error);});return new Promise((r,j)=>{const q=db.transaction('records').objectStore('records').getAll();q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error);});});}
try{
 await page.goto('https://nova-debug.test/jag.html?debug=1',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#forceResult option[value="URA_CHALLENGE"]'));
 assert.equal(await page.locator('#forceResult option[value="BURST"]').count(),0);
 assert(!await page.locator('#novaArtConfig').textContent().then(s=>s.includes('Lv.5')));
 await page.evaluate(()=>{
  window.qa={flow:null,spinning:false,mode:'fail',steps:[]};const sync=NovaComeback.sync,step=NovaArt.step;
  NovaComeback.sync=(s,sp)=>{qa.flow=s==null?null:JSON.parse(JSON.stringify(s));qa.spinning=sp;return sync(s,sp);};
  NovaArt.step=(s,o,r,f)=>{const values=qa.mode==='ura'?[0,.5]:[.99999];const t=step(s,o,s.burstPending||s.burstLeft?()=>values.shift()??.99999:r,f);qa.steps.push(JSON.parse(JSON.stringify(t)));return t;};
 });
 async function force(value){await page.locator('#debugToggleBtn').click();await page.locator('#forceResult').selectOption(value);await page.locator('#applyForceBtn').click();await page.locator('#debugCloseBtn').click();}
 async function spin(){
  await page.waitForFunction(()=>!document.querySelector('#spinBtn').disabled);await page.locator('#spinBtn').click();
  for(const i of [2,1,0]){await page.waitForFunction(i=>!document.querySelector('#stop'+i).disabled,i);await page.locator('#stop'+i).click();}
  await page.waitForFunction(()=>qa.flow&&!qa.spinning);return page.evaluate(()=>({flow:qa.flow,step:qa.steps.at(-1)}));
 }
 await force('URA_CHALLENGE');const entry=await spin();assert.equal(entry.flow.remaining,'300');assert.equal(entry.flow.burstType,'ura');assert.equal(entry.flow.atLevel,undefined);
 const misses=[];for(let i=0;i<3;i++){const r=await spin();misses.push(r);assert.equal(r.step.burstEvent,i===2?'failure':'continue');}
 assert.equal(misses.at(-1).flow.remaining,'300');
 await force('URA_CHALLENGE');await spin();await page.evaluate(()=>qa.mode='ura');const won=await spin();assert.equal(won.step.burstReward.zone,'ura_sora');assert.equal(won.flow.remaining,'300');assert.equal(won.flow.atLevel,undefined);
 await page.screenshot({path:'research/common125/qa-ura.png'});
 const zone=await spin();assert.equal(zone.flow.zone,'sora');assert(zone.flow.ura);
 await page.locator('#debugToggleBtn').click();await page.locator('#morningResetBtn').click();await page.locator('#debugCloseBtn').click();
 await force('URA_CHALLENGE');await page.locator('#quickAutoBtn').click();
 await page.waitForFunction(()=>qa.steps.at(-1)?.burstEvent==='success'&&!qa.spinning,{},{timeout:45000});await page.locator('#quickAutoBtn').click();
 await page.locator('#debugToggleBtn').click();await page.locator('#morningResetBtn').click();await page.locator('#debugFastStartBtn').click();
 await page.waitForFunction(()=>Number(document.querySelector('#debugFastStatus').textContent.match(/今回(\d+)G/)?.[1]||0)>=1500,{},{timeout:45000});await page.locator('#debugFastStopBtn').click();await page.locator('#debugCloseBtn').click();
 await page.waitForTimeout(500);const records=await audit();
 assert(records.some(r=>r.detail.mode==='manual'&&r.detail.burstReward?.type==='ura'));
 assert(records.some(r=>r.detail.mode==='auto'&&r.detail.burstReward?.type==='ura'));
 const at=records.filter(r=>r.state.flow?.phase==='art');assert(at.length>100);assert(at.every(r=>r.state.flow.atLevel===undefined));assert(records.every(r=>r.detail.burstReward?.type!=='points'));
 const saved=await page.evaluate(()=>{
  const entries={};for(const key of Object.keys(localStorage).filter(k=>k.startsWith('nova_'))){let d;try{d=JSON.parse(localStorage.getItem(key));}catch{continue;}if(!d?.settings||!d?.normalState)continue;
   d.settings.novaArt.atLevelWeights=[0,0,0,0,100];delete d.settings.commonAtVersion;
   d.normalState.flow={...NovaArt.enter(),remaining:'777',atLevel:5,burstVersion:1,burstType:'points',burstPending:true,burstLeft:2,stock:'2',sets:'3'};
   d.runtimeState={...d.runtimeState,forceResult:'BURST',pendingForceResult:'BURST'};entries[key]=JSON.stringify(d);
  }return entries;
 });assert(Object.keys(saved).length>0);
 await page.addInitScript(entries=>{for(const [key,value] of Object.entries(entries))localStorage.setItem(key,value);},saved);
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('#novaArtConfig',{state:'attached'});
 const status=await page.locator('#novaFlowStatus').textContent();assert.match(status,/777pt/);assert.doesNotMatch(status,/チャレンジ|Lv\./);
 // Trigger a save without a game, then inspect the actual restored runtime.
 await page.locator('#debugToggleBtn').click();await page.locator('#debugCloseBtn').click();
 const restored=await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('nova_')).map(k=>{try{return JSON.parse(localStorage.getItem(k));}catch{return null;}}).filter(x=>x?.settings&&x?.normalState));
 assert(restored.every(x=>x.normalState.flow.atLevel===undefined&&x.normalState.flow.burstPending===false&&x.normalState.flow.burstLeft===0));
 assert(restored.every(x=>x.normalState.flow.stock==='2'&&x.normalState.flow.sets==='3'));
 assert(restored.every(x=>x.runtimeState.forceResult===''&&x.runtimeState.pendingForceResult===''));
 assert.deepEqual(errors,[]);
 const report={silent:true,isolated:true,manualFailure:true,manualSuccess:true,autoSuccess:true,fastAuditRecords:records.length,commonAtRecords:at.length,oldLevelAndPointChallengeRetired:true,earnedQuotaAndStocksPreserved:true,oldForceFlagsCleared:true,pageErrors:errors};
 fs.writeFileSync('research/common125/qa.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}catch(e){await page.screenshot({path:'research/common125/qa-error.png'});console.log(JSON.stringify({error:String(e),pageErrors:errors}));throw e;}finally{await browser.close();}
