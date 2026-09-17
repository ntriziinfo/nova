import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const base='https://nova-eta-jet-30.vercel.app';
const files=['jag.html','nova-art.js','nova-balance.js','nova-audit.js','nova-ladder-presentation.js','nova-ladder-presentation.css'];
const hash=s=>createHash('sha256').update(s.replace(/\r\n/g,'\n')).digest('hex');
const sources=await Promise.all(files.map(async file=>{
 const response=await fetch(base+'/'+file+'?initial131='+Date.now(),{headers:{'Cache-Control':'no-cache'}});
 assert.equal(response.status,200,file);
 const text=await response.text();assert.equal(hash(text),hash(fs.readFileSync(file,'utf8')),file);
 return {file,sha256:hash(text),matches:true};
}));
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/nitro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--mute-audio']});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/jag.html?debug=1',{waitUntil:'domcontentloaded'});
 await page.waitForSelector('#novaEntryQuotaTable',{state:'attached'});
 const state=await page.evaluate(()=>({entry:NovaArt.entryQuotaRules,start:NovaArt.enterInitial({},()=>.5),model:NovaBalance.profile(6).verifiedModel,table:document.querySelector('#novaEntryQuotaTable').textContent}));
 assert.equal(state.entry.version,131);assert.equal(state.entry.waitGames,3);
 assert.deepEqual(state.entry.values,Array.from({length:19},(_,i)=>300+i*50));
 assert.equal(state.entry.weights.reduce((n,w,i)=>n+w*state.entry.values[i],0)/100,750);
 assert.equal(state.start.initialStage,'wait');assert.equal(state.start.initialWait,3);assert.equal(state.start.remaining,'0');assert.equal(state.start.entryQuota,'750');
 assert.equal(state.model,'');assert(state.table.includes('350pt')&&state.table.includes('1200pt'));assert.deepEqual(errors,[]);
 const result={url:base+'/jag.html?debug=1',sources,state,pageErrors:errors,silent:true,isolated:true};
 fs.writeFileSync('research/initial131/public-check.json',JSON.stringify(result,null,2));console.log(JSON.stringify({url:result.url,sources:files.length,version:state.entry.version,pageErrors:errors}));
}finally{await browser.close();}
