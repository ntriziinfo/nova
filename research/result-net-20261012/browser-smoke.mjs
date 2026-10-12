import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {execFileSync} from 'node:child_process';
const {chromium}=createRequire(import.meta.url)('C:/Users/nitro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=process.cwd(),out=path.join(root,'research/result-net-20261012');
const oldGame=execFileSync('git',['show','939a3219f0531d6c6220cc5a0cd9c47633135b70:nova-game.js'],{encoding:'utf8',maxBuffer:8e6});
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.mp4':'video/mp4','.webm':'video/webm','.wav':'audio/wav','.mp3':'audio/mpeg'};
let server,browser,page;
const errors=[],failures=[],reports=[];
try{
 server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
  const b=fs.readFileSync(file),m=req.headers.range?.match(/^bytes=(\d+)-(\d*)/),start=m?Number(m[1]):0,end=m?.[2]?Math.min(b.length-1,Number(m[2])):b.length-1;
  res.writeHead(m?206:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','Content-Length':end-start+1,'Accept-Ranges':'bytes',...(m?{'Content-Range':`bytes ${start}-${end}/${b.length}`}:{})});res.end(b.subarray(start,end+1));
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--mute-audio']});
 const bootstrap=await browser.newContext();await bootstrap.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
 page=await bootstrap.newPage();await page.goto(base+'/jag.html?debug=1');await page.waitForFunction(()=>!!window.__jagAdminSnapshot);
 const seed=await page.evaluate(()=>{
  __jagAdminSnapshot();const key='nova_slot_state_v1_standalone',data=JSON.parse(localStorage.getItem(key));
  data.settings.setting=1;data.settings.audioMuted=true;
  Object.assign(data.stats,{totalPaid:180,totalFee:1030,totalSpins:100,normalSpins:100,highSpins:0,slumpHistory:[]});
  data.normalState.flow={...NovaArt.enter({setting:1},()=>.99),remaining:'10',burstUsed:true,dryEligible:false};
  data.normalState.bonusPending=false;data.normalState.resultAtStartPaid=100;
  data.runtimeState.jagChainCount={paid:100,fee:1000,payoutVersion:1};
  data.runtimeState.session.active=false;data.savedAt=Date.now();return data;
 });await bootstrap.close();
 for(const profile of ['before','desktop','mobile']){
  console.log(profile,'start');
  const context=await browser.newContext(profile==='mobile'?{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3}:{viewport:{width:1440,height:1200}});
  await context.route('**/*',r=>{const url=new URL(r.request().url());if(url.origin!==base)return r.abort();if(profile==='before'&&url.pathname==='/nova-game.js')return r.fulfill({contentType:'application/javascript',body:oldGame});return r.continue();});
  await context.addInitScript(data=>{const key='nova_slot_state_v1_standalone';if(!localStorage.getItem(key)){localStorage.setItem(key,JSON.stringify(data));localStorage.setItem(key+'_resume',JSON.stringify(data));}},seed);
  page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push([profile,e.message]));page.on('response',r=>{if(new URL(r.url()).origin===base&&r.status()>=400)failures.push([profile,r.url(),r.status()]);});
  await page.goto(base+'/jag.html?debug=1',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__jagAdminSnapshot&&document.getElementById('spinBtn')?.textContent==='BET');
  await page.locator('#machine').click({position:{x:10,y:10},force:true});
  const count=()=>page.locator('#jagCountMeter').textContent().then(Number);
  const snapshot=()=>page.evaluate(()=>__jagAdminSnapshot());
  async function ready(){await page.waitForFunction(()=>document.getElementById('spinBtn').textContent==='BET'&&!document.getElementById('spinBtn').disabled&&!NovaAim.busy&&!NovaDirectAward.busy&&!NovaLadder.busy);}
  async function bet(role){await ready();await page.locator('#forceResult').selectOption(role,{force:true});await page.locator('#applyForceBtn').evaluate(el=>el.click());await page.locator('#spinBtn').evaluate(el=>el.click());await page.waitForFunction(()=>document.getElementById('spinBtn').textContent!=='BET');}
  async function stopAll(){const order=await page.evaluate(()=>{__jagAdminSnapshot();return JSON.parse(localStorage.getItem('nova_slot_state_v1_standalone')).runtimeState.pendingSpin?.bellNaviOrder||[2,1,0];});for(const i of order){const id='stop'+i;await page.waitForFunction(id=>!document.getElementById(id).disabled,id);await page.locator('#'+id).evaluate(el=>el.click());}await ready();}
  assert.equal(await count(),profile==='before'?80:50);
  await bet('BELL');await stopAll();assert.equal(await count(),profile==='before'?88:55);
  await bet('REPLAY');await stopAll();assert.equal(await count(),profile==='before'?91:55);
  await bet('BELL');const charged=await snapshot();
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__jagAdminSnapshot);
  assert.equal((await snapshot()).stats.totalFee,charged.stats.totalFee,'reload cannot charge another BET');
  await stopAll();assert.equal(await count(),profile==='before'?99:60);
  for(let i=0;i<5;i++){await bet('MISS');await stopAll();}
  await page.waitForFunction(()=>NovaResults.visible);
  const end=await snapshot(),card=end.normalState.resultCard;
  assert.equal(end.stats.totalPaid,199);assert.equal(end.stats.totalFee,1054);
  assert.equal(card.kind,'at');assert.equal(card.pt,profile==='before'?'99':'45');
  if(profile!=='before'){assert.equal(card.accounting,'net');assert.equal(await count(),45);assert.match(await page.locator('.novaResultFallback span').textContent(),/手取り/);}
  await page.screenshot({path:path.join(out,profile+'.png'),fullPage:false});
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__jagAdminSnapshot&&NovaResults.visible);
  assert.equal((await snapshot()).normalState.resultCard.pt,card.pt);
  if(profile!=='before')assert.equal(await count(),45);
  await page.waitForTimeout(3500);await bet('MISS');await stopAll();assert.equal(await count(),0);
  reports.push({profile,paid:end.stats.totalPaid,fee:end.stats.totalFee,result:card.pt,resultReload:true,midSpinReload:true,normalReset:true});
  await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
 fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({status:'pass',muted:true,reports,errors,failures},null,2));console.log(JSON.stringify({status:'pass',reports}));
}catch(error){if(page&&!page.isClosed())fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify(await page.evaluate(()=>({status:document.getElementById('resultText')?.textContent,flow:document.getElementById('novaFlowStatus')?.textContent,snapshot:window.__jagAdminSnapshot?.()})),null,2));throw error;}
finally{await browser?.close();if(server)await new Promise(r=>server.close(r));}
