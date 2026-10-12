import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('C:/Users/nitro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=process.cwd(),out=path.join(root,'research/sosuke-events-20261012');
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.mp4':'video/mp4','.webm':'video/webm','.wav':'audio/wav','.mp3':'audio/mpeg'};
let server,browser,page;const reports=[],errors=[],failures=[];
try{
 server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
  const b=fs.readFileSync(file),m=req.headers.range?.match(/^bytes=(\d+)-(\d*)/),start=m?Number(m[1]):0,end=m?.[2]?Math.min(b.length-1,Number(m[2])):b.length-1;
  res.writeHead(m?206:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','Content-Length':end-start+1,'Accept-Ranges':'bytes',...(m?{'Content-Range':`bytes ${start}-${end}/${b.length}`}:{})});res.end(b.subarray(start,end+1));
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--mute-audio']});
 for(const mobile of [false,true])for(const scenario of ['upper','comeback','bonus']){
  console.log({mobile,scenario});
  const context=await browser.newContext(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3}:{viewport:{width:1440,height:1200}});
  await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  await context.addInitScript(()=>{
   window.__voiceEvents=[];window.__stage='boot';
   const play=HTMLMediaElement.prototype.play,get=Element.prototype.getAttribute;
   HTMLMediaElement.prototype.play=function(){
    const src=this.getAttribute('src')||'';
    const event={src,actual:get.call(this,'src'),stage:window.__stage,loop:this.loop,volume:this.volume};
    if(this.tagName==='AUDIO'&&/sosuke-(?:upper|comeback|bonus)|rush-confirm-bgm|bonus-nebula-win/.test(src))window.__voiceEvents.push(event);
    const promise=play.call(this);promise?.then(()=>{event.started=true;event.duration=this.duration;},e=>event.error=e.message);return promise;
   };
  });
  page=await context.newPage();page.setDefaultTimeout(25000);
  page.on('pageerror',e=>errors.push({mobile,scenario,message:e.message}));
  page.on('response',r=>{if(new URL(r.url()).origin===base&&r.status()>=400)failures.push([r.url(),r.status()]);});
  await page.goto(base+'/jag.html?debug=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!document.querySelector('#forceResult option[value="URA_CHALLENGE"]'));
  await page.locator('#machine').click({position:{x:10,y:10},force:true});
  const events=()=>page.evaluate(()=>window.__voiceEvents);
  const mark=stage=>page.evaluate(stage=>window.__stage=stage,stage);
  async function ready(){await page.waitForFunction(()=>document.getElementById('spinBtn').textContent==='BET'&&!document.getElementById('spinBtn').disabled&&!NovaAim.busy&&!NovaDirectAward.busy&&!NovaLadder.busy);}
  async function bet(role,stage){await ready();await mark(stage);if(role){await page.locator('#forceResult').selectOption(role,{force:true});await page.locator('#applyForceBtn').evaluate(el=>el.click());}await page.locator('#spinBtn').evaluate(el=>el.click());await page.waitForFunction(()=>document.getElementById('spinBtn').textContent!=='BET');}
  async function stopAll(stage,order=[2,1,0]){for(const i of order){const id='stop'+i;await page.waitForFunction(id=>!document.getElementById(id).disabled,id);await mark(stage+' stop'+i);await page.locator('#'+id).evaluate(el=>el.click());}await ready();}
  if(scenario==='upper'){
   await bet('URA_CHALLENGE','queue challenge');await stopAll('queue challenge');assert.equal((await events()).length,0);
   await bet('WEAK_NOVA','challenge 1 BET');assert.equal((await events()).at(-1)?.src,'assets/media/nova/sosuke-upper-challenge-entry.wav');
   await stopAll('challenge 1');await bet(null,'challenge 2 BET');assert.equal((await events()).length,1,'success must wait for third stop');
   await stopAll('challenge 2');await page.waitForFunction(()=>__voiceEvents.some(e=>e.src.endsWith('sosuke-upper-at-entry.wav')&&e.started));
   const log=await events();assert.equal(log.length,2);assert.equal(log[1].stage,'challenge 2 stop0');
   const s=await page.evaluate(()=>__jagAdminSnapshot());assert(s.normalState.flow.researchUpper);
   await bet('BELL','upper next BET');await stopAll('upper next');assert.equal((await events()).length,2);
  }else if(scenario==='comeback'){
   await bet('COMEBACK','queue comeback');await stopAll('queue comeback');assert.equal((await events()).length,0);
   await bet('MISS','comeback 1 BET');assert.equal((await events()).at(-1)?.src,'assets/media/nova/sosuke-comeback-entry.wav');
   await stopAll('comeback 1');await bet('MISS','comeback 2 BET');await stopAll('comeback 2');assert.equal((await events()).length,1);
  }else{
   await page.locator('#debugBigBtn').evaluate(el=>el.click());
   for(let i=1;i<=3;i++){
    await bet('BONUS_SPECIAL','nebula '+i+' BET');await stopAll('nebula '+i);
    await page.waitForFunction(count=>__voiceEvents.filter(e=>e.started).length===count,i);
    assert.equal((await events()).length,i);
    assert.equal((await events()).at(-1).src,i===1?'assets/media/nova/rush-confirm-bgm.mp3':'assets/media/nova/sosuke-bonus-stock.wav');
    assert.equal((await events()).at(-1).stage,'nebula '+i+' stop0');
    assert.equal((await page.evaluate(()=>__jagAdminSnapshot())).session.bonusArtSets,i);
   }
   await bet('BONUS_SPECIAL','wrong-order BET');await stopAll('wrong-order',[0,1,2]);assert.equal((await events()).length,3);
   assert.equal((await page.evaluate(()=>__jagAdminSnapshot())).session.bonusArtSets,3);
  }
  const log=await events();for(const e of log){assert(!e.loop&&!e.error&&e.volume>0);assert.match(e.actual,/normalized-20261012/);}
  reports.push({mobile,scenario,events:log});await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
 fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({status:'pass',muted:true,reports,errors,failures},null,2));console.log('PASS all 6 flows');
}catch(error){if(page&&!page.isClosed())fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify(await page.evaluate(()=>({events:window.__voiceEvents,snapshot:window.__jagAdminSnapshot?.(),text:document.getElementById('resultText')?.textContent})),null,2));throw error;}
finally{await browser?.close();if(server)await new Promise(r=>server.close(r));}
