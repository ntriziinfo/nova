import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/nitro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const origin='https://nova-eta-jet-30.vercel.app',files=['jag.html','nova-tuning.js','nova-normal.js','nova-bell-navi.js','nova-decrement.js','nova-audit.js','nova-balance.js','nova-art.js','nova-progress.js'];
const digest=s=>createHash('sha256').update(s.replace(/\r\n/g,'\n')).digest('hex');
const assets=await Promise.all(files.map(async file=>{
 const response=await fetch(`${origin}/${file}?v=20260929-decrement-170`);assert(response.ok,`${file}: ${response.status}`);
 const remote=digest(await response.text()),local=digest(fs.readFileSync(file,'utf8'));assert.equal(remote,local,file);
 return {file,sha256:local,matched:true};
}));
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--mute-audio']});
const page=await browser.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',r=>new URL(r.request().url()).origin===origin&&r.request().method()==='GET'?r.continue():r.abort());
await page.addInitScript(()=>{const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){this.muted=true;return play.call(this);};});
try{
 await page.goto(origin+'/jag.html?release=170',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>typeof __jagAdminSnapshot==='function');
 const config=await page.evaluate(()=>({version:NovaTuning.version,decrement:[1,2,3,4,5,6].map(s=>NovaDecrement.rules(s)),bells:NovaTuning.normalBellDenominators,cz:[1,2,3,4,5,6].map(s=>NovaTuning.profile(s).cz),tiers5:NovaTuning.profile(5).tiers,thresholdBands:[1,2,3,4,5,6].map(s=>NovaTuning.profile(s).thresholdBands),rtp:NovaBalance.profiles.map(p=>p.measuredRtp),betAvailable:!!document.querySelector('#spinBtn')&&!document.querySelector('#spinBtn').disabled}));
 assert.equal(config.version,170);assert.deepEqual(config.bells,[250,240,230,220,210,200]);
 assert.deepEqual(config.cz,[1.85,1.91,1.78,1.92,2.45,1.607]);assert.deepEqual(config.tiers5,[.47,.05,.05,.05,.38]);
 assert.deepEqual(config.decrement.map(x=>x.enabled),[false,false,false,false,true,true]);assert.equal(config.decrement[4].netEnter,8000);assert.equal(config.decrement[5].netEnter,9000);assert(config.betAvailable);assert(config.thresholdBands.every(x=>x.length===0));assert.deepEqual(errors,[]);
 const result={url:origin+'/jag.html',commit:process.env.RELEASE_COMMIT||'pending',checkedAt:new Date().toISOString(),passed:true,muted:true,assets,config,errors};
 fs.writeFileSync(new URL('./public-verification.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result));
}finally{await browser.close();}
