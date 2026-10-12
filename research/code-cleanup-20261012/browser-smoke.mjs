import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('C:/Users/nitro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=process.cwd(),out=path.join(root,'research/code-cleanup-20261012'),reports=[],errors=[];
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.mp4':'video/mp4','.webm':'video/webm','.wav':'audio/wav','.mp3':'audio/mpeg'};
let server,browser,page;
try{
 server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
  let b=fs.readFileSync(file);
  if(file===path.join(root,'nova-game.js'))b=Buffer.from(b.toString()
   .replace('  function queueAutoStep(delayMs=150){','  function queueAutoStep(delayMs=150){if(window.__cleanupStopAfterOne && !isSpinning && stats.totalSpins>=1){stopAutoPlay();return;}')
   .replace('playSosukeLadderBetVoice(currentSpin);','playSosukeLadderBetVoice(currentSpin,()=>window.__voiceRoll);')
   .replace('window.__jagAdminSnapshot = latestAdminSnapshot;',`window.__jagAdminSnapshot = latestAdminSnapshot;
    window.__sosukeFixture=({roll,samePt=false,auto=false})=>{window.__cleanupStopAfterOne=auto;window.__voiceRoll=roll;normalState.flow={...NovaArt.startZone(NovaArt.enter({setting:3}),'sosuke',{setting:3}),remaining:'500',burstUsed:true,ladder:samePt?[50,50,500,500,1000]:[50,100,200,300,500],ladderIndex:0,ladderRevealed:true,award:'50',zoneLeft:4};updateDisplay();};`));
  const m=req.headers.range?.match(/^bytes=(\d+)-(\d*)/),start=m?Number(m[1]):0,end=m?.[2]?Math.min(b.length-1,Number(m[2])):b.length-1;
  res.writeHead(m?206:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','Content-Length':end-start+1,'Accept-Ranges':'bytes',...(m?{'Content-Range':`bytes ${start}-${end}/${b.length}`}:{})});res.end(b.subarray(start,end+1));
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--mute-audio']});
 const cases=[
  {name:'pass-injustice',roll:.075,pass:true},{name:'pass-hot',roll:.225,pass:true},
  {name:'bet-love',roll:.4,pass:true},{name:'bet-spirit',roll:.65,pass:true},{name:'bet-shimatte',roll:.9,pass:true},
  {name:'pass-hot',roll:.225,pass:true,samePt:true},{name:'bet-love',roll:.1,pass:false,mobile:true},
  {name:'pass-injustice',roll:.075,pass:true,auto:true}
 ];
 for(const scenario of cases){
  console.log(scenario);const context=await browser.newContext(scenario.mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{});
  await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  await context.addInitScript(()=>{
   window.__events=[];const play=HTMLMediaElement.prototype.play,get=Element.prototype.getAttribute;
   HTMLMediaElement.prototype.play=function(){
    const src=this.getAttribute('src')||'';
    if(src.includes('/sosuke-ladder-')){
     const e={src,actual:get.call(this,'src'),loop:this.loop,volume:this.volume,at:performance.now(),stops:__jagAdminSnapshot().state.currentSpin?.stopped};__events.push(e);
     const p=play.call(this);p?.then(()=>{e.started=true;e.duration=this.duration;},err=>e.error=err.message);return p;
    }
    return play.call(this);
   };
  });
  page=await context.newPage();page.setDefaultTimeout(25000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/jag.html?debug=1',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__sosukeFixture);
  await page.locator('#machine').click({position:{x:10,y:10},force:true});await page.evaluate(s=>__sosukeFixture(s),scenario);
  assert.equal((await page.evaluate(()=>__events)).length,0);
  await page.locator('#forceResult').selectOption(scenario.pass?'REPLAY':'MISS',{force:true});await page.locator('#applyForceBtn').evaluate(el=>el.click());
  await page.locator(scenario.auto?'#quickAutoBtn':'#spinBtn').evaluate(el=>el.click());
  await page.waitForFunction(()=>__events.some(e=>e.started));
  const events=await page.evaluate(()=>__events);assert.equal(events.length,1);assert(events[0].src.endsWith('sosuke-ladder-'+scenario.name+'.wav'));
  assert(!events[0].loop&&events[0].volume>0&&!events[0].error);assert.match(events[0].actual,/normalized-20261012/);
  if(scenario.auto){
   await page.waitForFunction(()=>!__jagAdminSnapshot().state.isSpinning && __jagAdminSnapshot().stats.totalSpins===1);
  }else for(const i of [2,1,0]){await page.waitForFunction(i=>!document.getElementById('stop'+i).disabled,i);await page.locator('#stop'+i).evaluate(el=>el.click());}
  await page.waitForFunction(()=>!__jagAdminSnapshot().state.isSpinning);
  const snapshot=await page.evaluate(()=>__jagAdminSnapshot());assert.equal(snapshot.normalState.flow.ladderIndex,scenario.pass?1:0);assert.equal(snapshot.stats.totalFee,3);
  assert.equal((await page.evaluate(()=>__events)).length,1);
  reports.push({scenario,events,after:{index:snapshot.normalState.flow.ladderIndex,award:snapshot.normalState.flow.award,fee:snapshot.stats.totalFee}});await context.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({status:'pass',muted:true,reports,errors},null,2));console.log('PASS all 8 scenarios');
}catch(error){if(page&&!page.isClosed())fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify(await page.evaluate(()=>({events:window.__events,snapshot:window.__jagAdminSnapshot?.()})),null,2));throw error;}
finally{await browser?.close();if(server)await new Promise(r=>server.close(r));}
