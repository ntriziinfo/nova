import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/nitro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
// The agent-browser CLI is unavailable on this host. Use the bundled browser runtime,
// an isolated profile and local route interception; never touch the user's play session.
const root=process.cwd(),browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--mute-audio']});
const page=await browser.newPage({viewport:{width:1440,height:1080}}),errors=[],missing=[],cases=[];
page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
await page.route('**/*',async route=>{
 const u=new URL(route.request().url());if(u.hostname!=='nova-debug.test')return route.abort();
 const file=path.resolve(root,'.'+decodeURIComponent(u.pathname));if(!file.startsWith(root+path.sep))return route.abort();
 const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.wav':'audio/wav','.mp4':'video/mp4'};
 try{await route.fulfill({status:200,contentType:types[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});}catch{missing.push(u.pathname);await route.abort();}
});
await page.addInitScript(()=>{
 const play=HTMLMediaElement.prototype.play;
 HTMLMediaElement.prototype.play=function(){this.muted=true;if(this instanceof HTMLAudioElement)this.playbackRate=8;return play.call(this);};
});
async function hooks(zone){
 await page.evaluate(zone=>{
  window.qa={zone,flow:null,spinning:false,steps:[],states:[],bonusDraws:0};
  const sync=NovaComeback.sync,step=NovaArt.step,after=NovaArt.afterBonus;
  NovaComeback.sync=(s,sp)=>{qa.flow=s==null?null:JSON.parse(JSON.stringify(s));qa.spinning=sp;if(s&&!sp)qa.states.push(qa.flow);return sync(s,sp);};
  NovaArt.step=(s,o,r,f)=>{const t=step(s,o,r,f);if(t.flow.initialStage==='entry'&&t.flow.entryStage==='seven')t.flow.pendingZone=qa.zone;qa.steps.push(JSON.parse(JSON.stringify(t)));return t;};
  NovaArt.afterBonus=(s,c,n,r)=>after(s,c,n,()=>.5);
  NovaArt.drawBonus=()=>qa.bonusDraws++===0?'NEBULA':'BELL';
 },zone);
}
async function spin(){
 await page.waitForFunction(()=>!document.querySelector('#spinBtn').disabled&&!NovaAim.busy&&!NovaLadder.busy);await page.locator('#spinBtn').click();
 for(const i of [2,1,0]){await page.waitForFunction(i=>!document.querySelector('#stop'+i).disabled,i);await page.locator('#stop'+i).click();}
 await page.waitForFunction(()=>document.querySelector('#stop0').disabled&&qa.spinning===false);
 return page.evaluate(()=>({flow:qa.flow,step:qa.steps.at(-1)}));
}
async function saved(){return page.evaluate(()=>{window.__jagAdminSnapshot();return Object.keys(localStorage).filter(k=>k.startsWith('nova_slot_state_v1_')).map(k=>{try{return [k,JSON.parse(localStorage.getItem(k))];}catch{return null;}}).filter(x=>x?.[1]?.normalState?.flow&&x[1].settings);});}
try{
 await page.goto('https://nova-debug.test/jag.html?debug=1',{waitUntil:'domcontentloaded'});await page.waitForSelector('#novaArtConfig',{state:'attached'});
 assert(await page.locator('#spinBtn').isVisible());assert(await page.locator('#novaEntryQuotaTable').textContent().then(s=>s.includes('350pt')&&s.includes('1200pt')));
 await page.screenshot({path:'research/initial131/loaded.png'});assert.deepEqual(errors,[]);
 if(!process.argv.includes('--auto-only')){
 await hooks('sosuke');
 // Real BIG termination path: one NEBULA plus the four capped bell payouts.
 await page.locator('#debugToggleBtn').click();await page.locator('#debugBigBtn').click();await page.locator('#debugCloseBtn').click();
 for(let i=0;i<5;i++)await spin();console.log('BIG ended');
 await page.waitForFunction(()=>qa.flow?.initialStage==='wait');
 assert.equal(await page.evaluate(()=>qa.flow.initialWait),3);assert.equal(await page.evaluate(()=>qa.flow.remaining),'0');
 await page.screenshot({path:'research/initial131/wait.png'});
 for(let i=0;i<3;i++)await spin();assert.equal(await page.evaluate(()=>qa.flow.entryStage),'seven');console.log('Wait 3G finished');
 await spin();assert.equal(await page.evaluate(()=>qa.flow.entryStage),'roulette');await page.screenshot({path:'research/initial131/roulette.png'});
 await spin();assert.equal(await page.evaluate(()=>qa.flow.entryStage),'confirmed');
 await spin();await page.screenshot({path:'research/initial131/table.png'});
 const preReload=(await saved())[0];assert.equal(preReload[1].normalState.flow.initialStage,'zone');
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('#novaArtConfig',{state:'attached'});await hooks('sosuke');
 const restored=(await saved())[0][1].normalState.flow;assert.deepEqual(restored.initialPlan,preReload[1].normalState.flow.initialPlan);assert.equal(restored.entryQuota,'750');
 for(let i=0;i<3;i++)await spin();
 await page.waitForFunction(()=>!NovaLadder.busy&&!NovaAim.busy&&!document.querySelector('#spinBtn').disabled);await page.locator('#spinBtn').click();await page.waitForFunction(()=>!document.querySelector('#stop2').disabled);await page.screenshot({path:'research/initial131/shutter.png'});
 for(const i of [2,1,0]){await page.waitForFunction(i=>!document.querySelector('#stop'+i).disabled,i);await page.locator('#stop'+i).click();}
 await page.waitForFunction(()=>!qa.spinning&&qa.flow?.initialStage==='');
 assert.equal(await page.evaluate(()=>qa.flow.remaining),'750');assert.equal(await page.evaluate(()=>qa.flow.entryQuota),'750');await page.screenshot({path:'research/initial131/award.png'});
 await spin();await page.screenshot({path:'research/initial131/result.png'});
 cases.push({zone:'sosuke',bonusEnd:true,wait3:true,seven:true,roulette:true,reload:true,quota:750});
 }
 await saved();
 // AUTO must pass the existing win-video/audio locks and finish each other family.
 for(const zone of ['giru','sora','ouma']){
  const entries=await page.evaluate(zone=>{
   const entries={};
   for(const key of Object.keys(localStorage).filter(k=>k.startsWith('nova_slot_state_v1_'))){let d;try{d=JSON.parse(localStorage.getItem(key));}catch{continue;}if(!d?.normalState||!d.settings)continue;
    d.normalState.flow=NovaArt.enterInitial({},()=>.5);d.normalState.bonusPending=false;d.normalState.resultCard=null;delete d.normalState.ladderAwardPresentation;
    d.stats.totalPaid=0;d.stats.totalFee=0;d.runtimeState={session:{active:false,phase:'idle',resultPayout:null}};entries[key]=JSON.stringify(d);
   }
   return entries;
  },zone);
  assert(Object.keys(entries).length>0);
  await page.addInitScript(entries=>{for(const [key,value] of Object.entries(entries))localStorage.setItem(key,value);},entries);
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('#novaArtConfig',{state:'attached'});await hooks(zone);
  assert.equal(await page.evaluate(()=>window.__jagAdminSnapshot().normalState.flow.initialStage),'wait');console.log('AUTO starting '+zone);
  await page.locator('#quickAutoBtn').click();
  await page.waitForFunction(()=>{if(qa.spinning)return false;const f=window.__jagAdminSnapshot().normalState.flow;return f?.initialStage===''&&f.award==='750';},{},{timeout:90000,polling:200});
  await page.locator('#quickAutoBtn').click();
  assert.equal(await page.evaluate(()=>window.__jagAdminSnapshot().normalState.flow.remaining),'750');
  const steps=await page.evaluate(()=>qa.steps.filter(t=>t.initialAward));assert.equal(steps.filter(t=>t.flow.initialStage==='wait'||t.flow.initialStage==='entry').length,3);
  const finish=steps.find(t=>t.flow.initialStage==='');assert.equal(finish.flow.remaining,'750');
  await page.screenshot({path:`research/initial131/auto-${zone}.png`});cases.push({zone,auto:true,quota:750});
 }
 assert.deepEqual(errors,[]);assert.deepEqual(missing.filter(p=>p.startsWith('/assets/ladder/')),[]);
 const prior=process.argv.includes('--auto-only')?JSON.parse(fs.readFileSync('research/initial131/qa.json')).cases.filter(c=>!c.auto):[];
 fs.writeFileSync('research/initial131/qa.json',JSON.stringify({silent:true,isolated:true,cases:[...prior,...cases],pageErrors:errors,missingAssets:missing},null,2));console.log(JSON.stringify({cases,errors,missing}));
}catch(e){await page.screenshot({path:'research/initial131/error.png'});console.log(JSON.stringify({error:String(e),errors,missing,state:await page.evaluate(()=>({qa:window.qa,status:document.querySelector('#novaFlowStatus')?.textContent,button:document.querySelector('#spinBtn')?.outerHTML}))}));throw e;}finally{await browser.close();}
