// Muted, isolated device emulation. No writes to the public management backend.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/nitro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const url=process.env.QA_URL||'http://127.0.0.1:4175/jag.html',host=new URL(url).host;
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--mute-audio']});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
const page=await context.newPage(),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
page.setDefaultTimeout(30000);
await page.route('**/*',r=>new URL(r.request().url()).host===host&&r.request().method()==='GET'&&(!/\.(wav|mp3|mp4)(\?|$)/i.test(r.request().url())||r.request().url().includes('aim-nebula-sora.wav'))?r.continue():r.abort());
await page.addInitScript(()=>{
 const play=HTMLMediaElement.prototype.play;
 HTMLMediaElement.prototype.play=function(){this.muted=true;return play.call(this);};
 localStorage.setItem('nova_unified_page_zoom_v3','0.85');
 localStorage.setItem('nova_unified_page_pan_x_v3','-120');
});
const button=id=>page.locator('.novaMobileControls [data-target="'+id+'"]');
const screenshot=name=>page.screenshot({path:new URL('./'+name+'.png',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1')});
try{
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>typeof __jagAdminSnapshot==='function'&&!!window.NovaMobile);
 for(const [width,height]of [[360,780],[390,844],[430,932],[768,1024],[844,390]]){
  await page.setViewportSize({width,height});
  await page.waitForFunction(({width,height})=>Math.abs(NovaMobile.scale()-Math.min(Math.min(600,width-16)/960,width>height&&height<=600?(height-148)/550:Infinity))<.001,{width,height});
  const geometry=await page.evaluate(()=>{
   const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
   return {width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,cabinet:rect('.jagCabinetShell'),viewport:rect('.novaMobileViewport'),controls:[...document.querySelectorAll('.novaMobileControls button')].map(b=>({w:b.offsetWidth,h:b.offsetHeight})),errors:window.__consoleErrors||[]};
  });
  assert(geometry.cabinet.x>=0&&geometry.cabinet.right<=width+1);
  assert.equal(geometry.scrollWidth,width);
  assert(geometry.controls.every(b=>b.w>=44&&b.h>=44));
  for(const [toggle,panel,close]of [['slumpToggleBtn','slumpPanel','slumpCloseBtn'],['audioToggleBtn','audioPanel','audioCloseBtn'],['roleCounterToggleBtn','roleCounterPanel','roleCounterCloseBtn']]){
   await page.locator('#'+toggle).tap();
   await page.locator('#'+panel).waitFor({state:'visible'});
   const r=await page.locator('#'+panel).boundingBox();
   assert(r.x>=0&&r.x+r.width<=width+1&&r.y+r.height<=height-60);
   await page.locator('#'+close).tap();
  }
  await screenshot('mobile-'+width);
  checks.push({viewport:{width,height},geometry,panels:'passed'});
 }
 await page.setViewportSize({width:390,height:844});
 // Force a harmless normal miss for reproducible touch and AUTO tests, through the live engine.
 await page.evaluate(()=>{const spin=NovaNormal.spin;NovaNormal.spin=(state,flow,setting,options)=>spin(state,flow,setting,options,()=>.999999,'MISS');});
 const before=await page.evaluate(()=>__jagAdminSnapshot().stats.totalSpins);
 await button('spinBtn').tap();
 for(const id of ['stop2','stop0','stop1'])await button(id).tap();
 await page.waitForFunction(n=>__jagAdminSnapshot().stats.totalSpins>n&&!__jagAdminSnapshot().state.isSpinning,before);
 const manual=await page.evaluate(()=>__jagAdminSnapshot().stats.totalSpins);
 await button('quickAutoBtn').tap();
 await page.waitForFunction(n=>__jagAdminSnapshot().stats.totalSpins>=n+2,manual);
 await button('quickAutoBtn').tap();
 assert.equal(await button('quickAutoBtn').getAttribute('aria-pressed'),'false');
 await page.waitForFunction(()=>!__jagAdminSnapshot().state.isSpinning);
 const audio=await page.evaluate(async()=>{
  const response=await fetch('assets/media/nova/aim-nebula-sora.wav');
  const audioContext=new AudioContext();
  const decoded=await audioContext.decodeAudioData(await response.arrayBuffer());
  const result={status:response.status,seconds:decoded.duration,sampleRate:decoded.sampleRate,channels:decoded.numberOfChannels};
  await audioContext.close();return result;
 });
 assert.equal(audio.status,200);assert(audio.seconds>0);
 // Freeze CSS blocks must not be bypassed by the unscaled proxy buttons.
 await page.evaluate(()=>document.querySelector('#machine').dataset.oumaFreeze='hold');
 await page.waitForFunction(()=>document.querySelector('.novaMobileControls [data-target=spinBtn]').disabled);
 await page.evaluate(()=>delete document.querySelector('#machine').dataset.oumaFreeze);
 await page.waitForFunction(()=>!document.querySelector('.novaMobileControls [data-target=spinBtn]').disabled);
 // Return to desktop without resetting a user's saved zoom and pan.
 await page.setViewportSize({width:1400,height:1000});
 await page.waitForFunction(()=>!NovaMobile.active());
 const desktop=await page.evaluate(()=>({zoom:localStorage.getItem('nova_unified_page_zoom_v3'),pan:localStorage.getItem('nova_unified_page_pan_x_v3'),controls:getComputedStyle(document.querySelector('.novaMobileControls')).display,transform:getComputedStyle(document.querySelector('.wrap')).transform}));
 assert.deepEqual(desktop,{zoom:'0.85',pan:'-120',controls:'none',transform:'matrix(0.85, 0, 0, 0.85, 0, 0)'});
 await screenshot('desktop');
 assert.deepEqual(errors,[]);
 const result={url,muted:true,checks,manualTouchPassed:true,autoPassed:true,freezeLockPassed:true,audio,desktop,errors};
 fs.writeFileSync(new URL('./browser-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result,null,2));
}catch(error){await screenshot('error');throw error;}finally{await browser.close();}
