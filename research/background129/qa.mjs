import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/nitro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=process.cwd(),types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.wav':'audio/wav','.mp4':'video/mp4'};
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try{
  if(path.basename(file)==='jag.html'){
   const body=fs.readFileSync(file,'utf8').replace('  const bootParams =','  window.qaInternals=()=>({autoPlay,autoTimer,autoWatchdogTimer,isSpinning,spinCanStop,oumaStage:oumaPresentation?.stage,bonusConfirmSoundPlaying,bonusEndBgmPlaying,pendingAtStartTimer,audio:bonusConfirmSoundAudio?{src:bonusConfirmSoundAudio.src,paused:bonusConfirmSoundAudio.paused,ended:bonusConfirmSoundAudio.ended,time:bonusConfirmSoundAudio.currentTime,duration:bonusConfirmSoundAudio.duration}:null});\n  const bootParams =');
   res.writeHead(200,{'Content-Type':'text/html'}).end(body);return;
  }
  const size=fs.statSync(file).size,range=req.headers.range?.match(/bytes=(\d+)-(\d*)/),start=range?Number(range[1]):0,end=range&&range[2]?Math.min(Number(range[2]),size-1):size-1;
  res.writeHead(range?206:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':end-start+1,'Accept-Ranges':'bytes',...(range?{'Content-Range':`bytes ${start}-${end}/${size}`}:{})});
  fs.createReadStream(file,{start,end}).on('error',()=>res.destroy()).pipe(res);
 }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=process.env.NOVA_QA_URL||`http://127.0.0.1:${server.address().port}/jag.html?debug=1`;
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--mute-audio'],ignoreDefaultArgs:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
const context=await browser.newContext({viewport:{width:1440,height:1080}}),page=await context.newPage(),errors=[],workers=[];
page.on('pageerror',e=>errors.push(e.message));page.on('worker',w=>workers.push(w.url()));page.on('dialog',d=>d.accept());
// Model hidden-tab throttling: no animation frames or native timer callbacks.
// Dedicated Worker deadlines remain real browser timers, not a stub.
await context.addInitScript(()=>{
 let hidden=false,next=0;const frames=new Map(),timers=new Map();
 const raf=window.requestAnimationFrame.bind(window),caf=window.cancelAnimationFrame.bind(window),set=window.setTimeout.bind(window),clear=window.clearTimeout.bind(window);
 window.requestAnimationFrame=fn=>{const id=++next,entry={fn};frames.set(id,entry);entry.handle=raf(time=>{if(!hidden&&frames.delete(id))fn(time);});return id;};
 window.cancelAnimationFrame=id=>{caf(frames.get(id)?.handle);frames.delete(id);};
 window.setTimeout=(fn,ms,...args)=>{const id=++next,entry={fn,args};timers.set(id,entry);entry.handle=set(()=>{entry.ready=true;if(!hidden&&timers.delete(id))fn(...args);},ms);return id;};
 window.clearTimeout=id=>{clear(timers.get(id)?.handle);timers.delete(id);};
 Object.defineProperty(document,'hidden',{get:()=>hidden});Object.defineProperty(document,'visibilityState',{get:()=>hidden?'hidden':'visible'});
 window.qaBackground=value=>{
  hidden=value;document.dispatchEvent(new Event('visibilitychange'));
  if(!value){for(const [id,t] of [...timers])if(t.ready&&timers.delete(id))t.fn(...t.args);for(const [id,t] of [...frames]){caf(t.handle);t.handle=raf(time=>{if(!hidden&&frames.delete(id))t.fn(time);});}}
 };
});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,timeout=45000){const end=Date.now()+timeout;while(Date.now()<end){if(await page.evaluate(fn))return;await sleep(100);}throw Error('Timed out: '+fn+' state='+JSON.stringify(await page.evaluate(()=>({internals:window.qaInternals?.(),qa,auto:document.querySelector('#quickAutoBtn').textContent,result:document.querySelector('#resultText').textContent,aim:NovaAim.busy,ladder:NovaLadder.busy}))));}
async function force(value){await page.locator('#debugToggleBtn').click();await page.locator('#forceResult').selectOption(value);await page.locator('#applyForceBtn').click();await page.locator('#debugCloseBtn').click();}
async function visible(){await page.evaluate(()=>qaBackground(false));}
async function reset(){await visible();if(await page.locator('#quickAutoBtn').textContent()==='STOP')await page.locator('#quickAutoBtn').click();await page.locator('#debugToggleBtn').click();await page.locator('#morningResetBtn').click();await page.locator('#debugCloseBtn').click();await page.evaluate(()=>{qa.steps=[];qa.completed=0;qa.wins=[];qa.mode='normal';});}
async function backgroundAuto(){await page.locator('#quickAutoBtn').click();await page.evaluate(()=>qaBackground(true));}
const report={url,silent:true,isolated:true,throttling:'animation frames and native timer callbacks suspended; real Worker running'};
try{
 await page.goto(url,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#forceResult option[value="ZONE_ouma"]'));
 await page.evaluate(()=>{
  window.qa={flow:null,spinning:false,steps:[],completed:0,wins:[],mode:'normal',freezes:0};
  const sync=NovaComeback.sync,step=NovaArt.step,bet=NovaArt.prepareBet,win=NovaAim.win;
  NovaComeback.sync=(flow,spinning)=>{if(qa.spinning&&!spinning)qa.completed++;qa.flow=flow;qa.spinning=spinning;return sync(flow,spinning);};
  NovaArt.step=(s,o,r,f)=>{
   if(qa.mode==='aim'&&s.zone==='toto')f=qa.steps.filter(x=>x.aim).length===0?'BIG':qa.steps.filter(x=>x.aim).length===1?'NEBULA':'MISS';
   if(qa.mode==='ladder'&&s.zone==='giru')f=qa.steps.filter(x=>x.zoneSpin).length<3?'REPLAY':'MISS';
   if(qa.mode==='ouma'&&s.zone==='ouma'&&!s.zero)f=qa.steps.filter(x=>x.zoneSpin).length===0?'SUPER_NOVA':'MISS';
   const out=step(s,o,r,f);qa.steps.push(out);if(out.oumaFreeze)qa.freezes++;return out;
  };
  NovaArt.prepareBet=(s,o,r)=>bet(s,o,qa.mode==='ouma'&&s.oumaPending?()=>qa.freezes? .999:0:r);
  NovaAim.win=(play,symbol)=>{const entry={symbol,start:performance.now(),unlock:null};qa.wins.push(entry);win(play,symbol);NovaAim.afterWin(()=>entry.unlock=performance.now());};
 });
 if(!process.env.NOVA_QA_OUMA_ONLY){
 await force('MISS');await backgroundAuto();await until(()=>qa.completed>=8);
 report.normalHiddenCompleted=await page.evaluate(()=>qa.completed);assert(workers.some(u=>u.includes('nova-clock-worker.js')));
 // Stop via the actual UI handler while hidden. A current spin may finish, but no new spin may start.
 await page.evaluate(()=>document.querySelector('#quickAutoBtn').click());await visible();await sleep(2000);
 const stopped=await page.evaluate(()=>qa.completed);await sleep(2000);assert.equal(await page.evaluate(()=>qa.completed),stopped);report.stopAndRestore=true;
 await reset();await force('ZONE_toto');await page.evaluate(()=>qa.mode='aim');await backgroundAuto();
 await until(()=>qa.wins.length>=2&&qa.wins[1].unlock!==null);report.wins=await page.evaluate(()=>qa.wins.map(w=>({symbol:w.symbol,lockMs:w.unlock-w.start})));
 assert.deepEqual(report.wins.slice(0,2).map(w=>w.symbol),['seven','nebula']);assert(report.wins.slice(0,2).every(w=>w.lockMs>=2990));
 await until(()=>qa.steps.some(s=>s.aim?.result==='MISS')&&qa.completed>=5);report.hiddenAimMiss=true;
 await reset();await force('ZONE_giru');await page.evaluate(()=>qa.mode='ladder');await backgroundAuto();
 await until(()=>qa.steps.some(s=>s.message?.includes('突破'))&&qa.steps.some(s=>s.zoneSpin&&!s.flow.zone)&&!NovaLadder.busy&&qa.completed>=5);report.hiddenShutter=true;
 console.log('Normal, seven, nebula, shutter and stop checks passed');
 }
 await reset();await force('ZONE_ouma');await page.evaluate(()=>qa.mode='ouma');await backgroundAuto();
 await until(()=>qa.freezes>=1&&qa.steps.some(s=>s.oumaFreeze)&&!qa.spinning,60000);report.hiddenOumaFreeze=await page.evaluate(()=>({freezes:qa.freezes,completed:qa.completed}));
 await reset();await force('MISS');await backgroundAuto();await until(()=>qa.completed>=3);await visible();await until(()=>qa.completed>=6);
 await page.locator('#quickAutoBtn').click();await sleep(1500);report.restartAndRestore=true;
 await page.screenshot({path:'research/background129/qa.png'});assert.deepEqual(errors,[]);report.workers=workers.length;report.pageErrors=errors;
 fs.writeFileSync('research/background129/'+(process.env.NOVA_QA_URL?'public-qa':'qa')+'.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(e){await visible().catch(()=>{});await page.screenshot({path:'research/background129/qa-error.png'}).catch(()=>{});console.log(JSON.stringify({error:String(e),pageErrors:errors}));throw e;}
finally{await browser.close();await new Promise(r=>server.close(r));}
