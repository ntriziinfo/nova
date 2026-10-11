import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/nitro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=process.cwd(),out=path.join(root,'research/sortie-character-20261012'),remote=process.argv[2];
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.mp4':'video/mp4','.webm':'video/webm','.wav':'audio/wav','.mp3':'audio/mpeg'};
let server,browser;
try{
 if(!remote){
  server=http.createServer((req,res)=>{
   const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
   if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
   const b=fs.readFileSync(file),m=req.headers.range?.match(/^bytes=(\d+)-(\d*)/),start=m?Number(m[1]):0,end=m?.[2]?Math.min(b.length-1,Number(m[2])):b.length-1;
   res.writeHead(m?206:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','Content-Length':end-start+1,'Accept-Ranges':'bytes',...(m?{'Content-Range':`bytes ${start}-${end}/${b.length}`}:{})});res.end(b.subarray(start,end+1));
  });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 }
 const base=remote||'http://127.0.0.1:'+server.address().port,results=[];
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--mute-audio']});
 for(const [name,viewport] of [['desktop',{width:1440,height:1200}],['mobile',{width:390,height:844}]]){
  console.log(name,'load');const context=await browser.newContext({viewport}),page=await context.newPage(),errors=[],failures=[];
  page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(new URL(r.url()).origin===base&&r.status()>=400)failures.push([r.url(),r.status()]);});
  if(!remote)await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  await page.goto(base+'/jag.html?debug=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!document.querySelector('#forceResult option[value="SORTIE"]'));
  async function ready(){await page.waitForFunction(()=>document.getElementById('spinBtn').textContent==='BET'&&!document.getElementById('spinBtn').disabled);}
  async function force(role){await page.locator('#forceResult').selectOption(role,{force:true});await page.locator('#applyForceBtn').evaluate(el=>el.click());}
  let realEvents=[];
  if(name==='desktop'){
   await ready();await force('ART');await page.locator('#spinBtn').evaluate(el=>el.click());
   for(const id of ['stop2','stop1','stop0']){await page.waitForFunction(id=>!document.getElementById(id).disabled,id);await page.locator('#'+id).evaluate(el=>el.click());}await ready();
   await page.evaluate(()=>{
    window.__sortieEvents=[];
    for(const method of ['begin','stop']){const original=NovaSortie[method];NovaSortie[method]=function(spin){
     const result=original(spin);if(!spin.resolved?.researchSortie)return result;
     const view=document.getElementById('novaSortieCharacter'),stage=spin.stopped.filter(Boolean).length;
     __sortieEvents.push({stage,won:spin.resolved.researchSortie.won,zone:spin.resolved.researchSortie.zone,hidden:view.hidden,confirmed:view.dataset.confirmed,characters:Array.from(view.querySelectorAll('img:not([hidden])'),i=>i.dataset.character),overlay:document.getElementById('overlay').classList.contains('show')});
     if(stage===3&&document.getElementById('quickAutoBtn').textContent==='STOP')document.getElementById('quickAutoBtn').click();return result;
    };}
   });
   await force('SORTIE');console.log(name,'real AUTO draw');await page.locator('#quickAutoBtn').evaluate(el=>el.click());
   await page.waitForFunction(()=>window.__sortieEvents?.some(e=>e.stage===3),null,{timeout:90000});await ready();
   realEvents=await page.evaluate(()=>window.__sortieEvents);
   assert.deepEqual(realEvents.map(e=>e.stage),[0,1,2,3]);assert.equal(realEvents[3].hidden,!realEvents[3].won);
   if(realEvents[3].won)assert.equal(realEvents[3].confirmed,'true');
   assert.equal(await page.locator('#quickAutoBtn').textContent(),'AUTO');
  }
  const previews=[];
  for(const [zone,won] of [['ura_sora',true],['kushuri_nito',true],['',false]]){
   await page.evaluate(({zone,won})=>{
    window.__preview={resolved:{researchSortie:{won,zone,finished:false}},stopped:[false,false,false]};
    NovaAim.bet(null,__preview.resolved);NovaSortie.begin(__preview);document.getElementById('overlay').classList.remove('show');
   },{zone,won});
   await page.waitForFunction(()=>Array.from(document.querySelectorAll('#novaSortieCharacter img:not([hidden])')).every(i=>i.complete&&i.naturalWidth>0));
   const fade=[];
   for(let stage=0;stage<3;stage++){
    const frame=await page.evaluate(stage=>{if(stage){__preview.stopped[3-stage]=true;NovaSortie.stop(__preview);}else NovaSortie.begin(__preview);const r=document.getElementById('novaSortieCharacter'),a=r.getAnimations()[0];a.pause();a.currentTime=160;return {stage:r.dataset.stage,opacity:Number(getComputedStyle(r).opacity),characters:Array.from(r.querySelectorAll('img:not([hidden])'),i=>i.dataset.character)};},stage);
    assert(frame.opacity>.7);fade.push(frame);
    if(stage===1&&zone==='ura_sora')await page.screenshot({path:path.join(out,`${remote?'public':'local'}-${name}-fade.png`)});
    const faded=await page.evaluate(()=>{const r=document.getElementById('novaSortieCharacter'),a=r.getAnimations()[0];a.currentTime=520;return Number(getComputedStyle(r).opacity);});assert(faded<.01);
   }
   await page.evaluate(()=>{__preview.stopped[0]=true;NovaSortie.stop(__preview);NovaAim.stop(__preview.resolved);});
   const final=await page.evaluate(()=>{
    const r=document.getElementById('novaSortieCharacter');for(const a of r.getAnimations())a.finish();
    return {hidden:r.hidden,confirmed:r.dataset.confirmed,caption:r.querySelector('strong').textContent,rect:r.getBoundingClientRect().toJSON(),reels:document.querySelector('.reels').getBoundingClientRect().toJSON(),pointerEvents:getComputedStyle(r).pointerEvents,opacity:Number(getComputedStyle(r).opacity)};
   });
   assert.equal(final.hidden,!won);
   if(won){assert.equal(final.confirmed,'true');assert.equal(final.opacity,1);assert.equal(final.pointerEvents,'none');for(const k of ['x','y','width','height'])assert(Math.abs(final.rect[k]-final.reels[k])<1);await page.screenshot({path:path.join(out,`${remote?'public':'local'}-${name}-${zone}.png`)});}
   previews.push({zone,won,fade,final});
  }
  await page.evaluate(()=>{NovaSortie.clear();NovaAim.reset();});assert.equal(await page.locator('#novaSortieCharacter').isVisible(),false);
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);results.push({name,realEvents,previews,errors,failures});await context.close();
 }
 const result={status:'pass',base,muted:true,results};fs.writeFileSync(path.join(out,remote?'public-smoke.json':'local-smoke.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({status:result.status,results:results.map(r=>({name:r.name,realStages:r.realEvents.map(e=>e.stage),scenarios:r.previews.length,errors:r.errors,failures:r.failures}))}));
}finally{await browser?.close();if(server)await new Promise(r=>server.close(r));}
