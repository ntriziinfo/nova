import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const base='https://nova-eta-jet-30.vercel.app',files=['jag.html','nova-art.js','nova-normal.js','nova-flow.js','nova-balance.js','nova-audit.js','nova-audit-ui.js'];
const hash=s=>createHash('sha256').update(s.replace(/\r\n/g,'\n')).digest('hex');
const sources=await Promise.all(files.map(async f=>{const r=await fetch(base+'/'+f+'?role128='+Date.now(),{headers:{'Cache-Control':'no-cache'}});assert.equal(r.status,200);const text=await r.text();assert.equal(hash(text),hash(fs.readFileSync(f,'utf8')),f);return {file:f,sha256:hash(text),matches:true};}));
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/nitro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--mute-audio']});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/jag.html?debug=1',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#forceResult option[value="URA_CHALLENGE"]'));
 const state=await page.evaluate(()=>({pointFlag:!!document.querySelector('#forceResult option[value="BURST"]'),uraFlag:!!document.querySelector('#forceResult option[value="URA_CHALLENGE"]'),level:NovaArt.enter({},()=>.5).atLevel,initial:NovaArt.enter({},()=>.5).remaining,entry:NovaArt.entryQuotaRules,rtp:NovaBalance.targets,model:NovaBalance.profile(6).verifiedModel,normalBoost:NovaArt.burstRules.normalBoost,normal:NovaNormal.lotteryRules,ceiling:NovaNormal.ceiling(),modeSelector:!!document.querySelector('#novaMode'),counterMax:document.querySelector('#novaNormalGames').max,cz:NovaFlow.forSetting({},6)}));
 assert.equal(state.pointFlag,false);assert(state.uraFlag);assert.equal(state.level,undefined);assert.equal(state.initial,'750');assert.equal(state.model,'role128-30000g-complete-stop');assert.deepEqual(errors,[]);
 assert.equal(state.normalBoost,undefined);assert.equal(state.modeSelector,false);assert.equal(state.counterMax,'800');assert.equal(state.ceiling,800);
 assert.deepEqual(state.entry.extras,[350,600,850]);assert.deepEqual(state.entry.weights,[25,50,25]);assert.deepEqual(state.normal.czScale,[.502,.510,.522,.532,.552,.616]);
 const measured=JSON.parse(fs.readFileSync('docs/role128-summary.json')).settings;
 for(let i=0;i<6;i++)assert(Math.abs(state.rtp[i]-measured[i].rtp.value)<1e-6);
 assert(Math.abs(state.cz.czChance-.6336)<1e-10);assert(Math.abs(state.cz.strongChance-.8168)<1e-10);
 const result={url:base+'/jag.html?debug=1',sources,state,pageErrors:errors,silent:true,isolated:true};fs.writeFileSync('research/role128/public-check.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
