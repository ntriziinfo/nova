import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/nitro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--mute-audio']}),page=await browser.newPage({viewport:{width:1200,height:900}}),root=process.cwd(),held=[],requests=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',async route=>{
 const u=new URL(route.request().url());if(u.hostname!=='nova-debug.test')return route.abort();
 if(u.pathname==='/fixture.html')return route.fulfill({contentType:'text/html; charset=utf-8',body:'<meta charset="utf-8"><link rel="stylesheet" href="/nova-results.css"><style>:root{--jag-cabinet-height:900px}body{margin:0;background:#65747e}#machine{position:relative;width:1200px;height:900px;background:linear-gradient(30deg,#204868,#676777)}</style><div id="machine"><p>ゲーム画面</p></div><script src="/nova-results.js"></script>'});
 const file=path.resolve(root,'.'+decodeURIComponent(u.pathname));if(!file.startsWith(root+path.sep))return route.abort();
 const send=()=>route.fulfill({contentType:{'.js':'text/javascript','.css':'text/css','.png':'image/png'}[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 if(u.pathname.startsWith('/assets/results/')){requests.push(u.pathname);held.push({path:u.pathname,send,fail:()=>route.fulfill({status:404,body:'not found'})});}else await send();
});
const card=(character,color,pt)=>({kind:'zone',character,color,pt});
async function show(c){return page.evaluate(c=>{const t=performance.now();NovaResults.show(c);const root=document.querySelector('.novaResultsLayer');return {ms:performance.now()-t,loading:root.dataset.loading,hidden:root.hidden,artVisibility:getComputedStyle(root.querySelector('.novaResultArt')).visibility,background:getComputedStyle(root.querySelector('.novaResultCard')).backgroundColor,fallback:root.querySelector('.novaResultFallback')?.innerText,pt:root.querySelector('.novaResultNumber').textContent};},c);}
async function release(name){await page.waitForTimeout(20);const i=held.findIndex(r=>r.path.endsWith(name));assert(i>=0,'Missing image request '+name);await held.splice(i,1)[0].send();}
try{
 await page.goto('https://nova-debug.test/fixture.html',{waitUntil:'domcontentloaded'});await page.waitForSelector('#novaResultAdjust');
 const cold=await show(card('sora','blue','750'));await page.waitForTimeout(100);await page.screenshot({path:'research/result138/'+(process.argv.includes('--baseline')?'before':'loading')+'.png'});
 if(process.argv.includes('--baseline')){
  assert.equal(cold.loading,'true');assert.equal(cold.background,'rgb(0, 0, 0)');assert.equal(cold.artVisibility,'hidden');assert.equal(cold.pt,'');fs.writeFileSync('research/result138/baseline.json',JSON.stringify({cold,requests},null,2));console.log(JSON.stringify({reproducedBlackBlank:true,cold}));
 }else{
  assert.equal(cold.hidden,false);assert.equal(cold.pt,'750');assert(cold.fallback.includes('RESULT')&&cold.fallback.includes('750pt'));assert.equal(cold.background,'rgba(0, 0, 0, 0)');
  await page.waitForFunction(()=>performance.getEntriesByType('resource').some(e=>e.name.includes('nova-results.js')));
  await release('sora-blue.png');await page.waitForFunction(()=>!document.querySelector('.novaResultsLayer').dataset.loading);
  const warm=await show(card('sora','blue','800'));assert.equal(warm.loading,undefined);assert.equal(warm.pt,'800');assert(warm.ms<50);
  // Rapid switches must never expose the previous character or color.
  const pending=await show(card('ouma','blue','900'));assert.equal(pending.loading,'true');assert(pending.fallback.includes('900pt'));
  await show(card('sora','red','1000'));await release('ouma-blue.png');await page.waitForTimeout(30);
  assert.equal(await page.locator('.novaResultsLayer').getAttribute('data-loading'),'true');await release('sora-red.png');await page.waitForFunction(()=>!document.querySelector('.novaResultsLayer').dataset.loading);
  assert((await page.locator('.novaResultArt img').getAttribute('src')).endsWith('sora-red.png'));assert.equal(await page.locator('.novaResultNumber').textContent(),'1000');
  await page.screenshot({path:'research/result138/ready.png'});
  await show(card('giru','red','500'));await page.evaluate(()=>NovaResults.hide());await release('giru-red.png');await page.waitForTimeout(30);assert(await page.locator('.novaResultsLayer').isHidden());
  // Missing artwork keeps a readable, correctly labelled result.
  await show(card('urapi','red','600'));const failed=held.findIndex(r=>r.path.endsWith('urapi-red.png'));assert(failed>=0);const r=held.splice(failed,1)[0];
  await r.fail();await page.waitForTimeout(50);assert.equal(await page.locator('.novaResultsLayer').getAttribute('data-loading'),'true');assert(await page.locator('.novaResultFallback').isVisible());assert.equal(await page.locator('.novaResultFallback output').textContent(),'600pt');
  assert.equal(new Set(requests).size,12);assert.deepEqual(errors,[]);fs.writeFileSync('research/result138/qa.json',JSON.stringify({cold,warm,preloadedImages:new Set(requests).size,staleSwitchIgnored:true,hideCancelsPending:true,errors,silent:true,isolated:true},null,2));console.log(JSON.stringify({cold,warm,preloadedImages:new Set(requests).size,errors}));
 }
}finally{await browser.close();}
