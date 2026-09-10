import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.NOVA_PLAYWRIGHT_PATH||'C:/Users/nitro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=process.cwd(),browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--mute-audio']});
const page=await browser.newPage({viewport:{width:1440,height:1080}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('dialog',d=>d.accept());
try{
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url());if(u.hostname!=='nova-debug.test')return route.abort();
  const file=path.resolve(root,'.'+decodeURIComponent(u.pathname));if(!file.startsWith(root+path.sep))return route.abort();
  const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.wav':'audio/wav','.mp4':'video/mp4'};
  try{await route.fulfill({status:200,contentType:types[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});}catch{await route.abort();}
 });
 await page.goto('https://nova-debug.test/jag.html?debug=1',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>globalThis.NovaArt&&globalThis.NovaComeback&&document.querySelector('#forceResult option[value="BURST"]'));
 console.log('Page and BURST option ready');
 await page.evaluate(()=>{
  window.qa={flow:null,spinning:false,win:false,steps:[]};
  const sync=NovaComeback.sync,step=NovaArt.step;
  NovaComeback.sync=(s,sp)=>{qa.flow=s==null?null:JSON.parse(JSON.stringify(s));qa.spinning=sp;return sync(s,sp);};
  NovaArt.step=(s,o,r,f)=>{const t=step(s,o,s.burstPending||s.burstLeft?()=>qa.win?0:.99999:r,f);qa.steps.push(JSON.parse(JSON.stringify(t)));return t;};
 });
 await page.locator('#debugToggleBtn').click();
 await page.locator('#forceResult').selectOption('BURST');
 await page.locator('#applyForceBtn').click();
 await page.locator('#debugCloseBtn').click();
 async function spin(){
  await page.waitForFunction(()=>!document.querySelector('#spinBtn').disabled);
  await page.locator('#spinBtn').click();
  for(const i of [2,1,0]){
   await page.waitForFunction(i=>!document.querySelector('#stop'+i).disabled,i);
   await page.locator('#stop'+i).click();
  }
  await page.waitForFunction(()=>qa.flow&&!qa.spinning);
  return page.evaluate(()=>({flow:qa.flow,step:qa.steps.at(-1),text:document.querySelector('#resultText').textContent,burst:document.body.dataset.burst}));
 }
 const entry=await spin();assert.equal(entry.flow.burstPending,true);assert.equal(entry.flow.remaining,'150');
 const misses=[];for(let i=0;i<3;i++){const r=await spin();misses.push(r);assert.equal(r.step.burstEvent,i===2?'failure':'continue');}
 assert.equal(misses[2].flow.remaining,'150');
 console.log('UI entry and three-game failure passed');
 await page.locator('#debugToggleBtn').click();await page.locator('#forceResult').selectOption('BURST');await page.locator('#applyForceBtn').click();await page.locator('#debugCloseBtn').click();
 await spin();await page.evaluate(()=>qa.win=true);const win=await spin();assert.equal(win.step.burstEvent,'success');assert.equal(win.flow.remaining,'2150');assert.equal(win.flow.atLevel,5);
 await page.screenshot({path:'research/burst119/qa-success.png'});
 await page.evaluate(()=>qa.win=false);
 await page.locator('#debugToggleBtn').click();await page.locator('#forceResult').selectOption('BURST');await page.locator('#applyForceBtn').click();await page.locator('#debugCloseBtn').click();
 await page.locator('#quickAutoBtn').click();
 await page.waitForFunction(()=>qa.steps.at(-1)?.burstEvent==='failure'&&!qa.spinning,{},{timeout:45000});
 await page.locator('#quickAutoBtn').click();
 const auto=await page.evaluate(()=>({flow:qa.flow,lastStep:qa.steps.at(-1),button:document.querySelector('#quickAutoBtn').textContent}));
 assert.equal(auto.flow.remaining,'2150');assert.equal(auto.flow.burstLeft,0);assert.equal(auto.button,'AUTO');
 assert.deepEqual(errors,[]);
 const result={silent:true,isolatedBrowser:true,entry,misses,win,auto,pageErrors:errors};fs.writeFileSync('research/burst119/qa.json',JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({entry:true,threeGameFailure:true,success:true,auto:true,quota:win.flow.remaining,level:win.flow.atLevel,pageErrors:errors}));
}catch(e){console.log(JSON.stringify({error:String(e),pageErrors:errors,debug:await page.evaluate(()=>({qa:window.qa,text:document.querySelector('#resultText')?.textContent,buttons:Array.from(document.querySelectorAll('#spinBtn,#stop0,#stop1,#stop2')).map(b=>({id:b.id,text:b.textContent,disabled:b.disabled}))}))}));await page.screenshot({path:'research/burst119/qa-error.png'});throw e;}finally{await browser.close();}
