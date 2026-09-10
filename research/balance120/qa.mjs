import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {buildArt,buildNormal} from './model.mjs';
const candidate=process.argv[2]?JSON.parse(fs.readFileSync(process.argv[2])):null;
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/nitro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=process.cwd(),browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--mute-audio']});
const page=await browser.newPage({viewport:{width:1440,height:1080}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
try{
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url());if(u.hostname!=='nova-debug.test')return route.abort();
  const file=path.resolve(root,'.'+decodeURIComponent(u.pathname));if(!file.startsWith(root+path.sep))return route.abort();
  const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.wav':'audio/wav','.mp4':'video/mp4'};
  try{const body=candidate&&u.pathname==='/nova-art.js'?buildArt(candidate):candidate&&u.pathname==='/nova-normal.js'?buildNormal(candidate):fs.readFileSync(file);await route.fulfill({status:200,contentType:types[path.extname(file)]||'application/octet-stream',body});}catch{await route.abort();}
 });
 await page.goto('https://nova-debug.test/jag.html?debug=1',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>globalThis.NovaArt&&document.querySelector('#forceResult option[value="URA_CHALLENGE"]'));
 const initial=await page.evaluate(()=>NovaArt.defaults.initial);
 await page.evaluate(()=>{
  window.qa={flow:null,spinning:false,mode:'fail',steps:[]};const sync=NovaComeback.sync,step=NovaArt.step;
  NovaComeback.sync=(s,sp)=>{qa.flow=s==null?null:JSON.parse(JSON.stringify(s));qa.spinning=sp;return sync(s,sp);};
  NovaArt.step=(s,o,r,f)=>{const values=qa.mode==='points'?[0,.99,.7]:qa.mode==='ura'?[0,.5]:[.99999];const t=step(s,o,s.burstPending||s.burstLeft?()=>values.shift()??.99999:r,f);qa.steps.push(JSON.parse(JSON.stringify(t)));return t;};
 });
 async function force(value){await page.locator('#debugToggleBtn').click();await page.locator('#forceResult').selectOption(value);await page.locator('#applyForceBtn').click();await page.locator('#debugCloseBtn').click();}
 async function spin(){
  await page.waitForFunction(()=>!document.querySelector('#spinBtn').disabled);await page.locator('#spinBtn').click();
  for(const i of [2,1,0]){await page.waitForFunction(i=>!document.querySelector('#stop'+i).disabled,i);await page.locator('#stop'+i).click();}
  await page.waitForFunction(()=>qa.flow&&!qa.spinning);
  return page.evaluate(()=>({flow:qa.flow,step:qa.steps.at(-1),text:document.querySelector('#resultText').textContent,status:document.querySelector('#novaFlowStatus').textContent}));
 }
 await force('BURST');const entry=await spin();assert.equal(entry.flow.burstPending,true);assert.equal(entry.flow.remaining,String(initial));assert.equal(entry.flow.burstType,'points');
 const misses=[];for(let i=0;i<3;i++){const r=await spin();misses.push(r);assert.equal(r.step.burstEvent,i===2?'failure':'continue');}
 assert.equal(misses[2].flow.remaining,String(initial));console.log('Manual entry/failure passed');
 await force('BURST');await spin();await page.evaluate(()=>qa.mode='points');const points=await spin();assert.equal(points.step.burstEvent,'success');assert.equal(points.flow.remaining,String(initial+2000));assert.equal(points.flow.atLevel,4);assert.match(points.text,/2,000/);
 await page.screenshot({path:'research/balance120/qa-points.png'});
 await page.evaluate(()=>qa.mode='fail');await force('URA_CHALLENGE');await page.locator('#quickAutoBtn').click();
 await page.waitForFunction(()=>qa.steps.at(-1)?.burstEvent==='failure'&&qa.flow?.burstType==='ura'&&!qa.spinning,{},{timeout:45000});await page.locator('#quickAutoBtn').click();
 const auto=await page.evaluate(()=>({flow:qa.flow,lastStep:qa.steps.at(-1)}));assert.equal(auto.flow.remaining,String(initial+2000));assert.equal(auto.flow.burstLeft,0);console.log('AUTO ura entry/failure passed');
 await force('URA_CHALLENGE');await spin();await page.evaluate(()=>qa.mode='ura');const ura=await spin();assert.equal(ura.step.burstReward.type,'ura');assert.equal(ura.flow.pendingZone,'ura_sora');assert.equal(ura.flow.entryStage,'confirmed');assert.equal(ura.flow.remaining,String(initial+2000));assert.equal(ura.flow.atLevel,4);assert.match(ura.text,/裏空/);
 await page.screenshot({path:'research/balance120/qa-ura.png'});
 const zone=await spin();assert.equal(zone.flow.zone,'sora');assert.equal(zone.flow.ura,true);
 const saved=await page.evaluate(()=>{const entries={};for(const key of Object.keys(localStorage).filter(k=>k.startsWith('nova_'))){let d;try{d=JSON.parse(localStorage.getItem(key));}catch{continue;}if(!d?.settings)continue;d.settings.novaArt.initial=150;delete d.settings.challengeBalanceVersion;if(d.normalState)d.normalState.flow={...qa.flow,remaining:'777',atLevel:5};entries[key]=JSON.stringify(d);}return entries;});assert(Object.keys(saved).length>0);
 // Seed the next document before application load, after the old document's pagehide save.
 await page.addInitScript(entries=>{for(const [key,value] of Object.entries(entries))localStorage.setItem(key,value);},saved);
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('[data-art-config="initial"]'));
 const restored=await page.evaluate(()=>({initial:Number(document.querySelector('[data-art-config="initial"]').value),status:document.querySelector('#novaFlowStatus').textContent,flows:Object.keys(localStorage).filter(k=>k.startsWith('nova_')).map(k=>{try{return JSON.parse(localStorage.getItem(k))?.normalState?.flow;}catch{return null;}}).filter(Boolean)}));console.log(JSON.stringify({saved:Object.entries(saved).map(([key,v])=>({key,flow:JSON.parse(v).normalState?.flow})),restored}));assert.equal(restored.initial,initial);assert.match(restored.status,/777pt/);assert(restored.flows.every(f=>f.atLevel===5));
 assert.deepEqual(errors,[]);
 fs.writeFileSync('research/balance120/qa.json',JSON.stringify({silent:true,isolated:true,candidate,initial,entry,misses,points,auto,ura,zone,restored,pageErrors:errors},null,2)+'\n');
 console.log(JSON.stringify({manual:true,auto:true,pointReward:points.step.burstReward,uraReward:ura.step.burstReward,zoneEntered:true,pageErrors:errors}));
}catch(e){await page.screenshot({path:'research/balance120/qa-error.png'});console.log(JSON.stringify({error:String(e),pageErrors:errors,qa:await page.evaluate(()=>window.qa)}));throw e;}finally{await browser.close();}
