import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/nitro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
export async function open(config={}){
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--mute-audio']});
 const page=await browser.newPage({viewport:{width:1440,height:1080}}),root=process.cwd(),errors=[],missing=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());page.setDefaultTimeout(20000);
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url());if(u.hostname!=='nova-debug.test')return route.abort();const file=path.resolve(root,'.'+decodeURIComponent(u.pathname));if(!file.startsWith(root+path.sep))return route.abort();
  const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.mp4':'video/mp4','.wav':'audio/wav'};
  try{await route.fulfill({status:200,contentType:types[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});}catch{missing.push(u.pathname);await route.abort();}
 });
 await page.addInitScript(()=>{
  if(window.name.startsWith('naviQA:'))for(const [k,v]of Object.entries(JSON.parse(window.name.slice(7))))localStorage.setItem(k,v);
  const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){this.muted=true;return play.call(this);};
 });
 await page.goto('https://nova-debug.test/jag.html?debug=1',{waitUntil:'domcontentloaded'});await page.waitForSelector('#bellNaviAdjustBtn');
 await seed(page,config);return {browser,page,errors,missing};
}
export async function seed(page,config){
 await page.evaluate(config=>{
  window.__jagAdminSnapshot();const entries={};
  for(const key of Object.keys(localStorage).filter(k=>k.startsWith('nova_slot_state_v1_'))){let d;try{d=JSON.parse(localStorage.getItem(key));}catch{continue;}if(!d?.normalState||!d.settings)continue;
   d.settings.autoDelay=.5;d.settings.setting=3;
   d.normalState.flow=config.initial?NovaArt.enterInitial({},()=>.5):config.normal?{phase:'normal'}:NovaArt.enter({},()=>.5);
   if(config.zone)d.normalState.flow=NovaArt.startZone(d.normalState.flow,config.zone,{},()=>.5);
   if(config.flowPatch)Object.assign(d.normalState.flow,config.flowPatch);
   d.normalState.resultCard=null;d.normalState.pendingZoneResult=null;d.normalState.bonusPending=false;delete d.normalState.ladderAwardPresentation;
   d.stats.totalPaid=0;d.stats.totalFee=0;d.stats.totalSpins=0;d.runtimeState={session:{active:false,phase:'idle',resultPayout:null}};entries[key]=JSON.stringify(d);
  }window.name='naviQA:'+JSON.stringify(entries);
 },config);
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('#bellNaviAdjustBtn');
}
