import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const base='https://nova-eta-jet-30.vercel.app',amounts=[10,20,30,50,100,300];
const files=['jag.html','nova-direct-award.js','nova-direct-award.css',...amounts.map(n=>'assets/design/nova-direct-pt-v1/direct-plus-'+n+'pt.png')];
const hash=b=>createHash('sha256').update(b).digest('hex');
const sources=await Promise.all(files.map(async file=>{
 const response=await fetch(base+'/'+file+'?direct133='+Date.now(),{headers:{'Cache-Control':'no-cache'}});assert.equal(response.status,200,file);
 const remote=Buffer.from(await response.arrayBuffer()),local=fs.readFileSync(file),normalize=b=>file.endsWith('.png')?b:b.toString('utf8').replace(/\r\n/g,'\n');
 assert.equal(hash(normalize(remote)),hash(normalize(local)),file);return {file,matches:true};
}));
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/nitro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--mute-audio']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1080},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/jag.html?debug=1',{waitUntil:'domcontentloaded'});await page.waitForSelector('#novaDirectAward',{state:'attached'});
 assert(await page.locator('#novaDirectAward').isHidden());
 for(const amount of amounts){
  await page.evaluate(n=>NovaDirectAward.show({flowBefore:{phase:'art'},atOutcome:{direct:n}}),amount);
  await page.waitForFunction(()=>{const img=document.querySelector('#novaDirectAward img');return img.complete&&img.naturalWidth===1774;});
  assert(await page.locator('#novaDirectAward').isVisible());
  const overlay=await page.locator('#novaDirectAward').boundingBox(),reels=await page.locator('.reels').boundingBox(),image=await page.locator('#novaDirectAward img').boundingBox();
  for(const key of ['x','y','width','height']){assert(Math.abs(overlay[key]-reels[key])<1);assert(Math.abs(image[key]-reels[key])<1);}
 }
 await page.screenshot({path:'research/direct133/public-300.png'});
 await page.evaluate(()=>NovaDirectAward.clear());assert(await page.locator('#novaDirectAward').isHidden());assert.deepEqual(errors,[]);
 const result={url:base+'/jag.html?debug=1',sources,amounts,pageErrors:errors,silent:true,isolated:true};fs.writeFileSync('research/direct133/public-check.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
