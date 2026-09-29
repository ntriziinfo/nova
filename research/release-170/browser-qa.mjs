import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/nitro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const url=process.env.QA_URL||'http://127.0.0.1:4175/jag.html?debug=1',host=new URL(url).host;
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--mute-audio']});
const page=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[],checks=[];
page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',r=>new URL(r.request().url()).host===host&&r.request().method()==='GET'&&!/\.(wav|mp3|mp4)(\?|$)/i.test(r.request().url())?r.continue():r.abort());
await page.addInitScript(()=>{
 for(const [k,v]of Object.entries(JSON.parse(sessionStorage.getItem('qa170Seed')||'{}')))localStorage.setItem(k,v);
 const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){this.muted=true;return play.call(this);};
});
const ready=()=>page.waitForFunction(()=>typeof __jagAdminSnapshot==='function');
try{
 await page.goto(url,{waitUntil:'domcontentloaded'});await ready();
 const scenarios=[
  {name:'manual-5',setting:5,net:0,result:'MISS'},
  {name:'auto-6',setting:6,net:0,result:'MISS',auto:true},
  {name:'net-entry',setting:6,net:8999,result:'BELL',expectedNetLow:true},
  {name:'transient-bet-debit',setting:6,net:7501,netLow:true,result:'BELL',expectedNetLow:true},
  {name:'settled-net-exit',setting:6,net:7501,netLow:true,result:'MISS',expectedNetLow:false},
  {name:'disabled-4',setting:4,net:8999,result:'MISS'}
 ];
 for(const scenario of scenarios){
  const entries=await page.evaluate(s=>{
   const out={};for(const k of Object.keys(localStorage).filter(k=>k.startsWith('nova_slot_state_v1_'))){
    const d=JSON.parse(localStorage.getItem(k));if(!d?.normalState||!d.settings)continue;
    d.settings={...d.settings,setting:s.setting,masterVolume:0,sfxVolume:0,bgmVolume:0,voiceVolume:0,movieVolume:0,audioMuted:true};
    NovaDecrement.reset(s.setting,[100,200,300,400]);const regime=NovaDecrement.snapshot();
    regime.low=false;regime.netLow=!!s.netLow;regime.games=19;
    NovaProgress.reset();const progress=NovaProgress.snapshot();progress.next=12000;
    d.normalState={...d.normalState,flow:{phase:'normal'},novaDecrement:regime,novaProgress:progress,resultCard:null,bonusPending:false,internal:NovaNormal.normalize(null),replayFree:false};
    d.stats={...d.stats,totalPaid:s.net,totalFee:0,totalSpins:19,normalSpins:19,highSpins:0,slumpHigh:s.net,slumpLow:0,slumpHistory:[{spin:0,profit:0},{spin:19,profit:s.net}]};
    d.runtimeState={session:{active:false,phase:'idle',resultPayout:null}};d.completeTrialState={locked:false};out[k]=JSON.stringify(d);
   }return out;
  },scenario);
  assert(Object.keys(entries).length);await page.evaluate(e=>sessionStorage.setItem('qa170Seed',JSON.stringify(e)),entries);
  await page.reload({waitUntil:'domcontentloaded'});await ready();
  await page.evaluate(s=>{
   window.qa170={spins:[],stopped:false,rateAtDraw:0};const spin=NovaNormal.spin,begin=NovaBellNavi.begin,clear=NovaBellNavi.clear;
   NovaNormal.spin=(state,flow,setting,options)=>{qa170.rateAtDraw=NovaDecrement.cz(setting);return spin(state,flow,setting,options,()=>.999999,s.result);};
   NovaBellNavi.begin=value=>{qa170.spins.push(value);return begin(value);};
   NovaBellNavi.clear=()=>{clear();if(s.auto&&!qa170.stopped&&qa170.spins.at(-1)?.stopped.every(Boolean)){qa170.stopped=true;document.querySelector('#quickAutoBtn').click();}};
  },scenario);
  const before=await page.evaluate(()=>NovaDecrement.snapshot());assert.equal(before.games,19);
  await page.locator(scenario.auto?'#quickAutoBtn':'#spinBtn').click();
  await page.waitForFunction(()=>qa170.spins.length>0);
  if(!scenario.auto)for(let i=0;i<3;i++)await page.locator('#stop'+i).click();
  await page.waitForFunction(()=>qa170.spins.at(-1)?.stopped.every(Boolean)&&!__jagAdminSnapshot().state.isSpinning);
  const after=await page.evaluate(()=>({regime:NovaDecrement.snapshot(),net:__jagAdminSnapshot().stats.profit,rateAtDraw:qa170.rateAtDraw}));
  assert.equal(after.regime.games,20);assert.equal(after.net,scenario.net-3+(scenario.result==='BELL'?15:0));
  if(scenario.expectedNetLow!==undefined)assert.equal(after.regime.netLow,scenario.expectedNetLow);
  if(scenario.netLow)assert.equal(after.rateAtDraw,.25);
  await page.evaluate(()=>sessionStorage.removeItem('qa170Seed'));
  await page.reload({waitUntil:'domcontentloaded'});await ready();
  assert.deepEqual(await page.evaluate(()=>NovaDecrement.snapshot()),after.regime);
  checks.push({scenario:scenario.name,...after,reloadPassed:true});console.log(scenario.name,'passed');
 }
 // A normal data reset is a new regime, while retaining a save never rerolls it.
 page.on('dialog',d=>d.accept());
 await page.evaluate(()=>document.querySelector('#morningResetBtn').click());
 assert.equal(await page.evaluate(()=>NovaDecrement.snapshot().games),0);
 assert.deepEqual(errors,[]);
 await page.screenshot({path:new URL('./browser-final.png',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1')});
 fs.writeFileSync(new URL('./browser-results.json',import.meta.url),JSON.stringify({url,muted:true,checks,resetPassed:true,errors},null,2)+'\n');
}finally{await browser.close();}
