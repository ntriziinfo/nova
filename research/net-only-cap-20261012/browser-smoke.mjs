import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('C:/Users/nitro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=process.cwd(),out=path.join(root,'research/net-only-cap-20261012'),reports=[],errors=[];fs.mkdirSync(out,{recursive:true});
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.mp4':'video/mp4','.webm':'video/webm','.wav':'audio/wav','.mp3':'audio/mpeg'};
let server,browser,page;
try{
 server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
  let b=fs.readFileSync(file);
  // Fixtures change only the served test copy; the production completion path remains intact.
  if(file===path.join(root,'nova-game.js'))b=Buffer.from(b.toString().replace('window.__jagAdminSnapshot = latestAdminSnapshot;',`window.__jagAdminSnapshot = latestAdminSnapshot;
   window.__completeState=()=>({spinning:isSpinning,auto:autoPlay,fee:stats.totalFee,paid:stats.totalPaid,spins:stats.totalSpins,complete:completeTrialState,stopped:currentSpin?.stopped,order:currentSpin?NovaBellNavi.stopOrder(currentSpin):[]});
   window.__storeMyLock=()=>{completeTrialState={lowestNet:-8000,locked:true,lockedSetting:settings.setting,reason:'my',completeProfit:7000,completeMy:15000};stats.totalFee=300;stats.totalPaid=7300;persistState();};
   window.__setupComplete=f=>{NovaProgress.reset();normalState.novaProgress=NovaProgress.bind({...NovaProgress.snapshot(),next:12000});normalState.flow={...NovaArt.enter({setting:3}),remaining:'500',burstUsed:true,initialStage:'',queuedZones:[],sets:'0',stock:'0'};completeTrialState={lowestNet:f.my?-8000:0};settings.completeLimitPt=10000;stats.totalFee=300;stats.totalPaid=f.my?7298:10298;updateDisplay();};`));
  const m=req.headers.range?.match(/^bytes=(\d+)-(\d*)/),start=m?Number(m[1]):0,end=m?.[2]?Math.min(b.length-1,Number(m[2])):b.length-1;
  res.writeHead(m?206:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':file.endsWith('.wav')?'public, max-age=3600':'no-store','Content-Length':end-start+1,'Accept-Ranges':'bytes',...(m?{'Content-Range':`bytes ${start}-${end}/${b.length}`}:{})});res.end(b.subarray(start,end+1));
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--mute-audio']});
 for(const mobile of [false,true]){
 const context=await browser.newContext(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{});
 await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
 await context.addInitScript(()=>{window.__voices=[];const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){if((this.getAttribute('src')||'').endsWith('/sosuke-complete.wav'))__voices.push({at:performance.now(),loop:this.loop});return play.call(this);};});
 page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
 const ready=async()=>{await page.waitForFunction(()=>!!window.__setupComplete);await page.waitForLoadState('networkidle');};
 await page.goto(base+'/jag.html?debug=1',{waitUntil:'domcontentloaded'});await ready();
 await page.locator('#machine').click({position:{x:10,y:10},force:true});await page.evaluate(()=>__setupComplete({my:true}));
 const press=s=>page.locator(s).evaluate(el=>el.click());
 const bell=async()=>{await page.selectOption('#forceResult','BELL',{force:true});await press('#applyForceBtn');await press('#spinBtn');for(const i of await page.evaluate(()=>__completeState().order)){await page.waitForFunction(i=>!document.getElementById('stop'+i).disabled,i);await press('#stop'+i);}await page.waitForFunction(()=>!__completeState().spinning);};
 await bell();let state=await page.evaluate(()=>__completeState());assert(state.complete.maxMy>=15000);assert(!state.complete.locked);assert.equal((await page.evaluate(()=>__voices)).length,0);assert(!(await page.locator('#novaCompleteScreen').isVisible()));
 const first=state;await bell();state=await page.evaluate(()=>__completeState());assert.equal(state.spins,first.spins+1);assert.equal(state.fee,first.fee+3);assert(!state.complete.locked);
 await page.evaluate(()=>__storeMyLock());await page.reload({waitUntil:'domcontentloaded'});await ready();
 state=await page.evaluate(()=>__completeState());assert(!state.complete.locked);assert.equal(state.paid-state.fee,7000);assert(!(await page.locator('#novaCompleteScreen').isVisible()));await bell();assert((await page.evaluate(()=>__completeState())).paid>state.paid);
 await page.evaluate(()=>__setupComplete({}));await page.selectOption('#forceResult','BELL',{force:true});await press('#applyForceBtn');await press('#quickAutoBtn');await page.waitForFunction(()=>__completeState().complete.locked&&!__completeState().spinning);
 state=await page.evaluate(()=>__completeState());assert.equal(state.complete.reason,'net');assert.equal(state.auto,false);assert(await page.locator('#novaCompleteScreen').isVisible());assert.equal((await page.evaluate(()=>__voices)).length,1);
 await press('#spinBtn');assert.equal((await page.evaluate(()=>__completeState())).fee,state.fee);
 reports.push({mobile,myCrossed:first,netStopped:state,voiceCount:(await page.evaluate(()=>__voices)).length});await context.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({status:'pass',muted:true,reports,errors},null,2));console.log('PASS MY continuation, saved MY migration and net-cap announcement on desktop/mobile');
}catch(error){if(page&&!page.isClosed())fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify(await page.evaluate(()=>({state:window.__completeState?.(),voices:window.__voices})),null,2));throw error;}
finally{await browser?.close();if(server)await new Promise(r=>server.close(r));}
