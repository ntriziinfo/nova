import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const base='https://nova-eta-jet-30.vercel.app',files=['jag.html','nova-results.js','nova-results.css'];
const hash=s=>createHash('sha256').update(s.replace(/\r\n/g,'\n')).digest('hex');
const sources=await Promise.all(files.map(async file=>{const r=await fetch(base+'/'+file+'?result138='+Date.now(),{headers:{'Cache-Control':'no-cache'}});assert.equal(r.status,200);assert.equal(hash(await r.text()),hash(fs.readFileSync(file,'utf8')),file);return {file,matches:true};}));
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/nitro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'),browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--mute-audio']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1080}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){this.muted=true;return play.call(this);};});
 await page.goto(base+'/jag.html?debug=1',{waitUntil:'domcontentloaded'});await page.waitForSelector('#novaResultAdjust');
 await page.waitForFunction(()=>performance.getEntriesByType('resource').filter(r=>r.name.includes('/assets/results/')).length===12,{},{timeout:60000});
 const shown=await page.evaluate(async()=>{
  const cases=[];
  for(const character of ['sosuke','toto','urapi','giru','sora','ouma'])for(const color of ['red','blue']){
   const t=performance.now();NovaResults.show({kind:'zone',character,color,pt:'750'});
   const root=document.querySelector('.novaResultsLayer');cases.push({character,color,ms:performance.now()-t,loading:root.dataset.loading||false,pt:root.querySelector('.novaResultNumber').textContent});
   await new Promise(resolve=>requestAnimationFrame(resolve));
  }return cases;
 });
 for(const s of shown){assert.equal(s.loading,false);assert.equal(s.pt,'750');}assert.deepEqual(errors,[]);
 await page.screenshot({path:'research/result138/public.png'});await page.evaluate(()=>NovaResults.hide());
 const report={url:base+'/jag.html?debug=1',sources,shown,errors,silent:true,isolated:true};fs.writeFileSync('research/result138/public-check.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}
