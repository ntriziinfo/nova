import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const base='https://nova-eta-jet-30.vercel.app',files=['jag.html','nova-bell-navi.js','nova-bell-navi.css','assets/design/nova-navi-v1/navi-yellow-123.png'];
const hash=b=>createHash('sha256').update(b).digest('hex');
const sources=await Promise.all(files.map(async file=>{
 const response=await fetch(base+'/'+file+'?bell132='+Date.now(),{headers:{'Cache-Control':'no-cache'}});assert.equal(response.status,200,file);
 const remote=Buffer.from(await response.arrayBuffer()),local=fs.readFileSync(file),normalize=b=>file.endsWith('.png')?b:b.toString('utf8').replace(/\r\n/g,'\n');
 assert.equal(hash(normalize(remote)),hash(normalize(local)),file);return {file,matches:true};
}));
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/nitro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--mute-audio']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1080}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/jag.html?debug=1',{waitUntil:'domcontentloaded'});await page.waitForSelector('#bellNaviAdjustBtn');
 await page.locator('#bellNaviAdjustBtn').click();await page.waitForFunction(()=>[...document.querySelectorAll('.novaBellNaviItem img')].every(img=>img.complete&&img.naturalWidth===2034));
 assert(await page.locator('#novaBellNavi').isVisible());assert.equal(await page.locator('[data-layout-target=navi]').count(),5);
 await page.locator('#layoutEditCloseBtn').click();assert(await page.locator('#novaBellNavi').isHidden());
 const guide=await page.evaluate(()=>{const spin={result:'BELL',stopped:[false,false,false],resolved:{flowBefore:{phase:'art'}}};NovaBellNavi.begin(spin,()=>.75);return {order:spin.bellNaviOrder,auto:NovaBellNavi.stopOrder(spin),digits:[...document.querySelectorAll('.novaBellNaviItem')].map(x=>Number(x.dataset.number))};});
 assert.deepEqual(guide.order,[2,0,1]);assert.deepEqual(guide.auto,guide.order);assert.deepEqual(guide.digits,[2,3,1]);assert.deepEqual(errors,[]);
 const result={url:base+'/jag.html?debug=1',sources,guide,pageErrors:errors,silent:true,isolated:true};fs.writeFileSync('research/bell132/public-check.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
