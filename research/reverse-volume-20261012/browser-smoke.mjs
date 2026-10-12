import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('C:/Users/nitro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=process.cwd(),out=path.join(root,'research/reverse-volume-20261012'),reports=[],errors=[];
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.mp4':'video/mp4','.webm':'video/webm','.wav':'audio/wav','.mp3':'audio/mpeg'};
let server,browser,page;
try{
 server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
  let b=fs.readFileSync(file);
  // Local test fixture only: start one already-awarded free reverse spin.
  if(file===path.join(root,'nova-game.js'))b=Buffer.from(b.toString().replace('window.__jagAdminSnapshot = latestAdminSnapshot;',`window.__jagAdminSnapshot = latestAdminSnapshot;
   window.__reverseFixture=zone=>{normalState.flow={...NovaArt.startZone(NovaArt.enter({setting:3}),zone,{setting:3}),zero:true,oumaPending:false,remaining:'500',burstUsed:true};updateDisplay();};`));
  const m=req.headers.range?.match(/^bytes=(\d+)-(\d*)/),start=m?Number(m[1]):0,end=m?.[2]?Math.min(b.length-1,Number(m[2])):b.length-1;
  res.writeHead(m?206:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':file.endsWith('.wav')?'public, max-age=3600':'no-store','Content-Length':end-start+1,'Accept-Ranges':'bytes',...(m?{'Content-Range':`bytes ${start}-${end}/${b.length}`}:{})});res.end(b.subarray(start,end+1));
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--mute-audio']});
 for(const zone of ['urapi','ouma','ura_ouma']){
  console.log(zone);const context=await browser.newContext();
  await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  await context.addInitScript(()=>{
   window.__events=[];const play=HTMLMediaElement.prototype.play,get=Element.prototype.getAttribute;
   HTMLMediaElement.prototype.play=function(){
    const src=this.getAttribute('src')||'';
    if(src.includes('ouma-reverse-v2.wav')){
     window.__reverseAudio=this;
     const e={src,actual:get.call(this,'src'),at:performance.now(),volume:this.volume};__events.push(e);
     this.addEventListener('ended',()=>e.ended=true,{once:true});
     const p=play.call(this);p?.then(()=>{e.started=true;e.duration=this.duration;},error=>e.error=error.message);return p;
    }return play.call(this);
   };
  });
  page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/jag.html?debug=1',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__reverseFixture);
  await page.waitForLoadState('networkidle');
  // Cache the real WAV before testing live mixing; cold-load fallback has its own lifecycle tests.
  await page.evaluate(()=>new Promise((resolve,reject)=>{
   const audio=new Audio(NovaAudioAssets.resolve('assets/media/nova/ouma-reverse-v2.wav'));
   audio.preload='auto';audio.oncanplaythrough=()=>resolve();audio.onerror=()=>reject(Error('Reverse WAV failed to decode'));audio.load();
  }));
  await page.locator('#machine').click({position:{x:10,y:10},force:true});await page.evaluate(zone=>__reverseFixture(zone),zone);
  await page.locator('#spinBtn').evaluate(el=>el.click());await page.waitForFunction(()=>__events.some(e=>e.started));
  const e=(await page.evaluate(()=>__events))[0],near=(a,b)=>assert(Math.abs(a-b)<.000001,a+' != '+b);
  near(e.volume,.35*10**(5/20));assert.match(e.actual,/normalized-20261012/);assert(Math.abs(e.duration-6.965986)<.01);
  const slider=async(id,value)=>page.locator('#'+id).evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));},value);
  await slider('sfxVolume','.25');near(await page.evaluate(()=>__reverseAudio.volume),.175*10**(5/20));
  await page.locator('#audioMuteBtn').evaluate(el=>el.click());assert.equal(await page.evaluate(()=>__reverseAudio.volume),0);
  await page.locator('#audioMuteBtn').evaluate(el=>el.click());near(await page.evaluate(()=>__reverseAudio.volume),.175*10**(5/20));
  await slider('masterVolume','.4');near(await page.evaluate(()=>__reverseAudio.volume),.1*10**(5/20));
  await page.waitForFunction(()=>__events[0].ended);await page.waitForFunction(()=>!__jagAdminSnapshot().state.isSpinning);
  const events=await page.evaluate(()=>__events),snapshot=await page.evaluate(()=>__jagAdminSnapshot());
  assert.equal(events.length,1);assert.equal(snapshot.stats.totalFee,0);
  reports.push({zone,events,fee:snapshot.stats.totalFee,spinning:snapshot.state.isSpinning,liveVolumeControls:'passed'});await context.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({status:'pass',muted:true,reports,errors},null,2));console.log('PASS all 3 zones');
}catch(error){if(page&&!page.isClosed())fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify(await page.evaluate(()=>({events:window.__events,snapshot:window.__jagAdminSnapshot?.()})),null,2));throw error;}
finally{await browser?.close();if(server)await new Promise(r=>server.close(r));}
