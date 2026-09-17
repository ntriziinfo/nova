import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {hash,files} from './run.mjs';
const base='https://nova-eta-jet-30.vercel.app';
const sources=await Promise.all([...files,'jag.html'].map(async file=>{const r=await fetch(base+'/'+file+'?s4140='+Date.now(),{headers:{'Cache-Control':'no-cache'}});assert.equal(r.status,200);assert.equal(hash(await r.text()),hash(fs.readFileSync(file,'utf8')),file);return {file,matches:true};}));
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/nitro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--mute-audio']});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){this.muted=true;return play.call(this);};});
 await page.goto(base+'/jag.html?debug=1',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#forceResult option[value="URA_CHALLENGE"]'));
 const state=await page.evaluate(()=>({normal:NovaNormal.lotteryRules,profile:NovaBalance.profile(4),label:document.querySelector('#settingSelect option[value="4"]').textContent,cz:NovaFlow.forSetting({},4),entry:NovaArt.entryQuotaRules,bell:NovaNormal.pay('BELL')}));
 const evidence=JSON.parse(fs.readFileSync('docs/s4-140-summary.json','utf8'));
 assert.deepEqual(state.normal.czScale,[.502,.510,.522,evidence.czScale,.552,.616]);assert.equal(state.normal.version,140);
 assert.equal(state.profile.verifiedModel,'s4-140-30000g-complete-stop');assert(Math.abs(state.profile.target-evidence.summary.horizons[30000].stopped.rtp)<1e-6);
 assert(state.label.includes((state.profile.target*100).toFixed(1)+'%（3万G試算・停止込み）'));
 assert.equal(state.cz.czChance,.5792);assert.equal(state.cz.strongChance,.7896);assert.equal(state.bell,15);assert.equal(state.entry.waitGames,3);
 assert.deepEqual(state.entry.values,Array.from({length:19},(_,i)=>300+i*50));assert.deepEqual(errors,[]);
 const report={url:base+'/jag.html?debug=1',sources,state,pageErrors:errors,silent:true,isolated:true};
 fs.writeFileSync('research/s4-140/public-check.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}
