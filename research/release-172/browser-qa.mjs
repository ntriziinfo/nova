import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/nitro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const url=process.env.QA_URL||'http://127.0.0.1:4175/jag.html',host=new URL(url).host;
const output=process.env.QA_URL?'public':'local';
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--mute-audio','--autoplay-policy=document-user-activation-required']});
const result={url,systemMuted:true,realIOSDevice:false,checks:[]};
try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,
  userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'});
 await context.route('**/*',r=>new URL(r.request().url()).host===host&&r.request().method()==='GET'?r.continue():r.abort());
 await context.addInitScript(()=>{
  const connect=AudioNode.prototype.connect;window.__audioMeters=[];
  AudioNode.prototype.connect=function(target,...args){
   const out=connect.call(this,target,...args);
   if(target instanceof AudioDestinationNode){const meter=this.context.createAnalyser();meter.fftSize=256;connect.call(this,meter);__audioMeters.push(meter);}
   return out;
  };
  window.__audioEnergy=()=>Math.max(0,...__audioMeters.map(m=>{const data=new Float32Array(m.fftSize);m.getFloatTimeDomainData(data);return Math.max(...data.map(Math.abs));}));
 });
 const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(45000);
 const button=id=>p.locator('.novaMobileControls [data-target="'+id+'"]');
 await p.goto(url,{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>typeof __jagAdminSnapshot==='function'&&!!globalThis.NovaMobile);
 const before=await p.evaluate(()=>NovaAudio.status());assert(before.enabled);assert.equal(before.started,0);
 await p.locator('.novaMobileAudioEnable').tap();
 await p.waitForFunction(()=>NovaAudio.status().unlocked&&NovaAudio.status().started>0);
 await p.waitForFunction(()=>__audioEnergy()>.00001);
 result.checks.push({name:'trusted tap starts decoded BGM with a nonzero output signal',status:await p.evaluate(()=>NovaAudio.status())});
 await p.evaluate(()=>{const spin=NovaNormal.spin;NovaNormal.spin=(state,flow,setting,options)=>spin(state,flow,setting,options,()=>.999999,'MISS');});
 const initial=await p.evaluate(()=>__jagAdminSnapshot().stats.totalSpins);
 await button('spinBtn').tap();for(const id of ['stop2','stop0','stop1'])await button(id).tap();
 await p.waitForFunction(n=>__jagAdminSnapshot().stats.totalSpins>n&&!__jagAdminSnapshot().state.isSpinning,initial);
 const manual=await p.evaluate(()=>({spins:__jagAdminSnapshot().stats.totalSpins,audio:NovaAudio.status()}));
 assert(manual.audio.started>=4);result.checks.push({name:'manual BET and all stops',...manual});
 await button('quickAutoBtn').tap();await p.waitForFunction(n=>__jagAdminSnapshot().stats.totalSpins>=n+2,manual.spins);
 await button('quickAutoBtn').tap();await p.waitForFunction(()=>!__jagAdminSnapshot().state.isSpinning);
 result.checks.push({name:'AUTO plays delayed sound',audio:await p.evaluate(()=>NovaAudio.status())});
 const overlap=await p.evaluate(async()=>{
  const a=new NovaAudio.Audio('assets/media/nova/navi-left-sora.wav'),b=a.cloneNode(true);a.loop=b.loop=true;a.volume=.4;b.volume=.2;
  await a.play();await b.play();const running=NovaAudio.status(),at=a.currentTime;
  a.volume=.1;a.pause();const stopped=NovaAudio.status();b.pause();return {running,stopped,at,volume:a.volume};
 });
 assert.equal(overlap.running.active-overlap.stopped.active,1);assert.equal(overlap.volume,.1);
 result.checks.push({name:'new and cloned voice players overlap and stop independently',...overlap});
 await p.evaluate(()=>NovaAudio.context().suspend());await p.locator('.novaMobileAudioEnable').waitFor({state:'visible'});
 await p.locator('.novaMobileAudioEnable').tap();await p.waitForFunction(()=>NovaAudio.status().state==='running');
 result.checks.push({name:'interrupted context resumes from audio button',audio:await p.evaluate(()=>NovaAudio.status())});
 await p.screenshot({path:new URL(`./${output}-mobile-audio.png`,import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1')});
 assert.deepEqual(errors,[]);result.errors=errors;
 await context.close();
 const desktop=await browser.newContext();await desktop.route('**/*',r=>new URL(r.request().url()).host===host&&r.request().method()==='GET'?r.continue():r.abort());
 const dp=await desktop.newPage();await dp.goto(url,{waitUntil:'domcontentloaded'});
 assert.equal(await dp.evaluate(()=>NovaAudio.enabled),false);result.checks.push({name:'desktop uses original native audio'});await desktop.close();
 fs.writeFileSync(new URL(`./${output}-browser-results.json`,import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
