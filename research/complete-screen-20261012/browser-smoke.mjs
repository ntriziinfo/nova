import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('C:/Users/nitro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=process.cwd(),out=path.join(root,'research/complete-screen-20261012'),reports=[],errors=[];fs.mkdirSync(out,{recursive:true});
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
   window.__setupComplete=f=>{NovaProgress.reset();normalState.novaProgress=NovaProgress.bind(NovaProgress.snapshot());normalState.flow={...NovaArt.enter({setting:3}),remaining:'500',burstUsed:true,initialStage:'',queuedZones:[],sets:'0',stock:'0'};completeTrialState={lowestNet:f.my?-8000:0};settings.completeLimitPt=10000;stats.totalFee=300;stats.totalPaid=f.my?7298:10298;updateDisplay();};`));
  const m=req.headers.range?.match(/^bytes=(\d+)-(\d*)/),start=m?Number(m[1]):0,end=m?.[2]?Math.min(b.length-1,Number(m[2])):b.length-1;
  res.writeHead(m?206:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':file.endsWith('.wav')?'public, max-age=3600':'no-store','Content-Length':end-start+1,'Accept-Ranges':'bytes',...(m?{'Content-Range':`bytes ${start}-${end}/${b.length}`}:{})});res.end(b.subarray(start,end+1));
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--mute-audio']});
 for(const spec of [{name:'desktop-net',reload:true},{name:'mobile-my',my:true,mobile:true,auto:true},{name:'audio-unavailable',error:true}]){
  console.log(spec.name);const context=await browser.newContext(spec.mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{});
  await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  await context.addInitScript(spec=>{window.__events=[];const play=HTMLMediaElement.prototype.play,get=Element.prototype.getAttribute;
   HTMLMediaElement.prototype.play=function(){const src=this.getAttribute('src')||'';
    if(src.endsWith('/sosuke-complete.wav')){const e={src,actual:get.call(this,'src'),at:performance.now(),loop:this.loop,volume:this.volume,rate:this.playbackRate};__events.push(e);window.__completeAudio=this;
     if(spec.error)return Promise.reject(Error('test unavailable complete voice'));
     this.addEventListener('ended',()=>e.ended=performance.now(),{once:true,capture:true});const p=play.call(this);p.then(()=>{e.started=true;e.duration=this.duration;},err=>e.error=err.message);return p;}
    return play.call(this);
   };
  },spec);
  page=await context.newPage();page.setDefaultTimeout(25000);page.on('pageerror',e=>errors.push(e.message));
  const ready=async()=>{await page.waitForFunction(()=>!!window.__setupComplete);await page.waitForLoadState('networkidle');};
  await page.goto(base+'/jag.html?debug=1',{waitUntil:'domcontentloaded'});await ready();
  await page.locator('#machine').click({position:{x:10,y:10},force:true});await page.evaluate(spec=>__setupComplete(spec),spec);
  const press=s=>page.locator(s).evaluate(el=>el.click());
  await page.selectOption('#forceResult','BELL',{force:true});await press('#applyForceBtn');
  if(spec.auto)await press('#quickAutoBtn');else{await press('#spinBtn');for(const i of await page.evaluate(()=>__completeState().order)){await page.waitForFunction(i=>!document.getElementById('stop'+i).disabled,i);await press('#stop'+i);}}
  await page.waitForFunction(()=>__completeState().complete.locked&&!__completeState().spinning);await page.waitForFunction(()=>__events.length>0);
  const events=await page.evaluate(()=>__events),state=await page.evaluate(()=>__completeState());assert.equal(events.length,1);assert.equal(state.complete.reason,spec.my?'my':'net');assert.equal(events[0].loop,false);assert.equal(events[0].rate,1);assert(events[0].volume>0);assert.match(events[0].actual,/normalized-20261012/);
  await page.waitForFunction(()=>{const r=document.querySelector('#novaCompleteScreen');return r&&!r.hidden;});
  const geometry=await page.evaluate(()=>{const el=document.querySelector('#novaCompleteScreen'),box=el.getBoundingClientRect(),items=[...document.querySelectorAll('#machine .reels,#machine .novaArtItem,#novaFlowStatus')].map(x=>({selector:x.id||x.className,box:x.getBoundingClientRect().toJSON()})).filter(x=>x.box.width&&x.box.height);return {box:box.toJSON(),items,text:el.innerText,button:document.querySelector('#spinBtn').getBoundingClientRect().toJSON(),image:getComputedStyle(el).backgroundImage};});
  for(const {box:b} of geometry.items){assert(b.left>=geometry.box.left-2&&b.right<=geometry.box.right+2&&b.top>=geometry.box.top-2&&b.bottom<=geometry.box.bottom+2,JSON.stringify({geometry,b}));}
  assert(geometry.button.top>=geometry.box.bottom);assert.match(geometry.text,/コンプリート機能が発動しました/);assert.match(geometry.text,/本日の遊技は終了となります/);
  assert(!(await page.locator('#overlay').evaluate(el=>el.classList.contains('show'))));
  await page.locator('#machine').screenshot({path:path.join(out,spec.name+'.png')});
  if(!spec.error)await page.waitForFunction(()=>__events[0]?.ended);
  await press('#spinBtn');await press('#quickAutoBtn');await page.waitForTimeout(800);assert.equal((await page.evaluate(()=>__completeState())).fee,state.fee);assert.equal((await page.evaluate(()=>__events)).length,1);
  const observed=await page.evaluate(()=>__events);
  if(spec.reload){await page.reload({waitUntil:'domcontentloaded'});await ready();assert(await page.locator('#novaCompleteScreen').isVisible());assert.equal((await page.evaluate(()=>__events)).length,0);assert((await page.evaluate(()=>__completeState())).complete.locked);}
  page.once('dialog',d=>d.accept());await press('#resetBtn');await page.waitForFunction(()=>!__completeState().complete.locked);assert(!(await page.locator('#novaCompleteScreen').isVisible()));assert.equal((await page.evaluate(()=>__completeState())).fee,0);
  reports.push({spec,state,events:observed,geometry});await context.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({status:'pass',muted:true,reports,errors},null,2));console.log('PASS all '+reports.length+' cases');
}catch(error){if(page&&!page.isClosed()){await page.screenshot({path:path.join(out,'failure.png')});fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify(await page.evaluate(()=>({events:window.__events,state:window.__completeState?.()})),null,2));}throw error;}
finally{await browser?.close();if(server)await new Promise(r=>server.close(r));}
