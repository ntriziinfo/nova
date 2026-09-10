import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/nitro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=process.cwd(),browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--mute-audio']});
const page=await browser.newPage({viewport:{width:1440,height:1080}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
await page.route('**/*',async route=>{const u=new URL(route.request().url());if(u.hostname!=='nova-debug.test')return route.abort();const file=path.resolve(root,'.'+decodeURIComponent(u.pathname));if(!file.startsWith(root+path.sep))return route.abort();const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.wav':'audio/wav','.mp4':'video/mp4'};try{await route.fulfill({status:200,contentType:types[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});}catch{await route.abort();}});
async function data(){return page.evaluate(async()=>{const db=await new Promise((r,j)=>{const o=indexedDB.open('nova-play-audit-v1');o.onsuccess=()=>r(o.result);o.onerror=()=>j(o.error);});const all=store=>new Promise((r,j)=>{const q=db.transaction(store).objectStore(store).getAll();q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error);});return {runs:await all('runs'),rows:await all('records')};});}
try{
 await page.goto('https://nova-debug.test/jag.html?debug=1',{waitUntil:'domcontentloaded'});await page.waitForSelector('#novaAuditOpen',{state:'attached'});
 await page.locator('#debugToggleBtn').click();await page.locator('#debugFastStartBtn').click();
 await page.waitForFunction(()=>Number(document.querySelector('#debugFastStatus').textContent.match(/今回(\d+)G/)?.[1]||0)>=2200,{},{timeout:45000});await page.locator('#debugFastStopBtn').click();
 const spins=Number((await page.locator('#debugFastStatus').textContent()).match(/前回(\d+)G/)[1]);await page.locator('#debugCloseBtn').click();
 if(!await page.locator('#novaAuditOpen').isVisible())await page.locator('#slumpToggleBtn').click();await page.locator('#novaAuditOpen').click();await page.waitForFunction(()=>document.querySelector('#novaAuditSummary').textContent.includes('実BET'));
 await page.locator('#novaAuditImportant').uncheck();await page.waitForFunction(()=>document.querySelectorAll('#novaAuditRows tr').length===200);
 const initial=await data(),run=initial.runs[0],rows=initial.rows.filter(r=>r.run===run.id),spinRows=rows.filter(r=>r.kind==='spin');
 assert.equal(spinRows.length,spins);assert(rows.length>2200);assert.equal(new Set(rows.map(r=>r.seq)).size,rows.length);
 assert.equal(rows.reduce((n,r)=>n+r.paid,0),rows.at(-1).state.paid-rows[0].state.paid);assert.equal(rows.reduce((n,r)=>n+r.bet,0),rows.at(-1).state.bet-rows[0].state.bet);
 const allGames=rows.map(r=>r.game),from=allGames[Math.floor(allGames.length*.4)],to=allGames[Math.floor(allGames.length*.6)];await page.locator('#novaAuditFrom').fill(String(from));await page.locator('#novaAuditTo').fill(String(to));await page.locator('#novaAuditRefresh').click();await page.waitForFunction(()=>document.querySelector('#novaAuditSummary').textContent.includes('実BET'));
 const downloadPromise=page.waitForEvent('download');await page.locator('#novaAuditCsv').click();const download=await downloadPromise;await download.saveAs('research/audit121/qa-range.csv');
 const csv=fs.readFileSync('research/audit121/qa-range.csv','utf8');const selected=rows.filter(r=>r.game>=from&&r.game<=to);assert.equal(csv.split('\r\n').length-1,selected.length);
 await page.locator('#novaAuditFrom').fill('0');await page.locator('#novaAuditTo').fill('');await page.locator('#novaAuditImportant').check();await page.locator('#novaAuditRefresh').click();await page.waitForFunction(()=>document.querySelector('#novaAuditSummary').textContent.includes('実BET'));
 await page.locator('#novaAuditDialog [data-close]').click();
 await page.locator('#slumpGraph').click({position:{x:300,y:90}});await page.waitForFunction(()=>document.querySelector('#novaAuditSummary').textContent.includes('実BET'));
 assert(Number(await page.locator('#novaAuditFrom').inputValue())>0);assert.equal(Number(await page.locator('#novaAuditTo').inputValue())-Number(await page.locator('#novaAuditFrom').inputValue()),1000);
 await page.screenshot({path:'research/audit121/qa-history.png'});
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('#novaAuditOpen',{state:'attached'});if(!await page.locator('#novaAuditOpen').isVisible())await page.locator('#slumpToggleBtn').click();await page.locator('#novaAuditOpen').click();await page.waitForFunction(()=>document.querySelector('#novaAuditSummary').textContent.includes('実BET'));
 const reloaded=await data();assert(reloaded.rows.length>=rows.length);assert.equal(reloaded.runs.length,1);assert.deepEqual(reloaded.rows.slice(0,rows.length),rows);
 await page.locator('#novaAuditDialog [data-close]').click();await page.locator('#debugToggleBtn').click();await page.locator('#morningResetBtn').click();await page.locator('#debugCloseBtn').click();
 if(!await page.locator('#novaAuditOpen').isVisible())await page.locator('#slumpToggleBtn').click();await page.locator('#novaAuditOpen').click();await page.waitForFunction(()=>document.querySelector('#novaAuditRun').options.length===2);
 const afterReset=await data();assert(afterReset.rows.filter(r=>r.run===run.id).length>=rows.length);assert.equal(afterReset.runs.length,2);
 const persistence={fastSpins:spins,spinRecords:spinRows.length,totalRecords:rows.length,reloadPreservesRows:true,resetPreservesOldRun:true,csvRangeRecords:selected.length,graphIntervalSelection:true};console.log(JSON.stringify(persistence));
 await page.locator('#novaAuditDialog [data-close]').click();await page.locator('#slumpCloseBtn').click();
 await page.evaluate(()=>{window.qaAudit={spinning:false};const sync=NovaComeback.sync;NovaComeback.sync=(s,sp)=>{qaAudit.spinning=sp;return sync(s,sp);};const step=NovaArt.step;NovaArt.step=(s,o,r,f)=>{const rolls=[0,.99,.7];const t=step(s,o,s.burstPending||s.burstLeft?()=>rolls.shift()??.999:r,f);if(t.burstReward)qaAudit.reward=t.burstReward;return t;};});
 async function force(value){await page.locator('#debugToggleBtn').click();await page.locator('#forceResult').selectOption(value);await page.locator('#applyForceBtn').click();await page.locator('#debugCloseBtn').click();}
 async function spin(){await page.waitForFunction(()=>!qaAudit.spinning&&!document.querySelector('#spinBtn').disabled);await page.locator('#spinBtn').click();for(const i of [2,1,0]){await page.waitForFunction(i=>!document.querySelector('#stop'+i).disabled,i);await page.locator('#stop'+i).click();}await page.waitForFunction(()=>!qaAudit.spinning&&[0,1,2].every(i=>document.querySelector('#stop'+i).disabled));}
 await force('BURST');await spin();await spin();
 await force('URA_CHALLENGE');await page.locator('#quickAutoBtn').click();await page.waitForFunction(()=>qaAudit.reward?.type==='ura'&&!qaAudit.spinning,{},{timeout:45000});if((await page.locator('#quickAutoBtn').textContent())==='STOP')await page.locator('#quickAutoBtn').click();
 await page.locator('#slumpToggleBtn').click();await page.locator('#novaAuditOpen').click();await page.waitForFunction(()=>document.querySelector('#novaAuditSummary').textContent.includes('実BET'));
 const liveAudit=await data(),manual=liveAudit.rows.find(r=>r.detail.mode==='manual'&&r.detail.burstReward?.type==='points'),auto=liveAudit.rows.find(r=>r.detail.mode==='auto'&&r.detail.burstReward?.type==='ura');
 assert(manual);assert.equal(manual.detail.burstReward.points,2000);assert.equal(manual.paid,0);assert.deepEqual(manual.detail.pressOrder,[2,1,0]);assert.deepEqual([...manual.detail.stopOrder].sort(),[0,1,2]);assert.equal(manual.detail.grid.length,3);assert(auto);assert.equal(auto.detail.burstReward.zone,'ura_ouma');
 assert(liveAudit.rows.some(r=>r.detail.forced==='BURST'));assert(liveAudit.rows.some(r=>r.detail.forced==='URA_CHALLENGE'));
 // Independent recorder exercises same-G success, out-of-order restore, journal recovery and failed storage.
 const edge=await page.evaluate(async()=>{
  const scope='audit121-fixture',s=(game,bet,paid,flow)=>({run:'fixture-run',game,bet,paid,flow,bonus:{active:false},internal:{},setting:6,config:{initial:300}}),rec=new NovaAudit.Recorder({scope});await rec.ready;
  rec.record(s(0,0,0,{phase:'normal'}),{kind:'checkpoint'});rec.record(s(1,3,0,{phase:'art',atLevel:1,remaining:'300'}),{kind:'spin',result:'MISS'});
  rec.record(s(2,6,0,{phase:'art',atLevel:5,remaining:'2300',burstType:'points'}),{kind:'spin',result:'NEBULA',burstEvent:'success',burstReward:{type:'points',points:2000,level:5,promoted:true}});
  rec.record(s(2,6,15,{phase:'art',atLevel:5,remaining:'2285',burstType:'ura'}),{kind:'spin',result:'NEBULA',burstEvent:'success',burstReward:{type:'ura',zone:'ura_sora'}});await rec.flush();
  const original=await rec.export('fixture-run');const journal={scope,metas:[original.meta],records:original.records};localStorage.setItem(rec.journalKey,JSON.stringify(journal));rec.releaseWriter?.();const restored=new NovaAudit.Recorder({scope});await restored.ready;const replay=await restored.export('fixture-run');
  const changed={...s(2,6,15,{phase:'art',atLevel:5,remaining:'2285',burstType:'ura'}),config:{initial:400}};restored.record(changed,{kind:'checkpoint'});const config=await restored.export('fixture-run');
  const fail=new NovaAudit.Recorder({scope:'audit121-no-idb',indexedDB:null});await fail.ready;fail.record({...s(0,0,0,{phase:'normal'}),run:'unsaved'},{});const fallback=await fail.export('unsaved');
  const a=new NovaAudit.Recorder({scope:'audit121-conflict'}),b=new NovaAudit.Recorder({scope:'audit121-conflict'});await Promise.all([a.ready,b.ready]);a.record({...s(0,0,0,{}),run:'conflict'},{});await a.flush();b.record({...s(9,9,9,{}),run:'conflict'},{});await b.flush();const conflict=await b.export('conflict');
  return {points:original.records[2],ura:original.records[3],journalRows:replay.records.length,originalRows:original.records.length,configRows:config.records.length,configDetail:config.records.at(-1).detail.config,fallbackRows:fallback.records.length,fallbackError:fallback.error,conflictError:conflict.error,conflictRecords:conflict.records.length};
 });
 assert.equal(edge.points.paid,0);assert(edge.points.notes.some(n=>n.includes('成功')));assert(edge.ura.notes.some(n=>n.includes('裏ゾーン獲得')));assert.equal(edge.ura.game,edge.points.game);assert.equal(edge.originalRows,edge.journalRows);assert.equal(edge.fallbackRows,1);assert(edge.fallbackError);
 assert.equal(edge.configRows,5);assert.equal(edge.configDetail.initial,400);assert(edge.conflictError.includes('競合'));assert.equal(edge.conflictRecords,2);
 assert.deepEqual(errors,[]);fs.writeFileSync('docs/audit121-verification.json',JSON.stringify({silent:true,isolated:true,...persistence,manualStopOrderAndGrid:true,manualAndAutoChallengeRewards:true,forcedFlags:true,journalReplayIdempotent:true,bothChallengeRewardsRecorded:true,sameGameOrderPreserved:true,configChangesRecorded:true,failedStorageExport:true,concurrentWriterConflictVisible:true,pageErrors:errors},null,2)+'\n');console.log('Audit UI, storage and export checks passed');
}catch(e){await page.screenshot({path:'research/audit121/qa-error.png'});console.log(JSON.stringify({error:String(e),pageErrors:errors,url:page.url()}));throw e;}finally{await browser.close();}
