import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/nitro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=process.cwd(),types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.wav':'audio/wav','.mp4':'video/mp4'};
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try{const size=fs.statSync(file).size,range=req.headers.range?.match(/bytes=(\d+)-(\d*)/),start=range?Number(range[1]):0,end=range&&range[2]?Math.min(Number(range[2]),size-1):size-1;
  res.writeHead(range?206:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':end-start+1,'Accept-Ranges':'bytes',...(range?{'Content-Range':`bytes ${start}-${end}/${size}`}:{})});
  fs.createReadStream(file,{start,end}).on('error',()=>res.destroy()).pipe(res);
 }catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=process.env.NOVA_QA_URL||`http://127.0.0.1:${server.address().port}/jag.html?debug=1`;
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--mute-audio']});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const all=[...['sosuke','giru','ura_giru','toto','sora','ura_sora','urapi','ouma','ura_ouma'].map(zone=>({zone})),...['cz','strong_cz'].flatMap(cz=>[false,true].map(success=>({cz,success}))),{comeback:true}];
const cases=process.env.NOVA_QA_CASE?all.filter(s=>process.env.NOVA_QA_CASE.split(',').includes(s.zone||s.cz||'comeback')):all;
async function runCase(scenario){
 const label=scenario.zone||(scenario.comeback?'comeback':scenario.cz+'-'+(scenario.success?'success':'failure')),context=await browser.newContext({viewport:{width:1440,height:1080}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 // Pause drawing, as in a hidden tab. The real Worker still advances gameplay.
 await context.addInitScript(()=>{const raf=requestAnimationFrame;window.qaHidden=false;window.requestAnimationFrame=fn=>raf(t=>{if(!qaHidden)fn(t);});Object.defineProperty(document,'hidden',{get:()=>qaHidden});});
 try{
  await page.goto(url,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#forceResult option[value="ZONE_ouma"]'));
  await page.evaluate(s=>{
   window.qa={scenario:s,completed:0,spinning:false,flow:null,steps:[],results:[],eyeEnded:0,afterResultSpins:0,violations:[],freezes:0,czEntered:false,czExited:false,czOutcome:null,afterCzSpins:0,bonusSeen:false};
   const sync=NovaComeback.sync,step=NovaArt.step,bet=NovaArt.prepareBet,show=NovaResults.show,play=HTMLMediaElement.prototype.play,enter=NovaFlow.enterCZ;
   NovaComeback.sync=(flow,spinning)=>{
    if(qa.spinning&&!spinning)qa.completed++;
    if(spinning&&!qa.spinning){if(qa.results.length){qa.afterResultSpins++;if(qa.eyeEnded<qa.results.length)qa.violations.push('BET before eyecatch ended');}if(qa.czExited)qa.afterCzSpins++;}
    if(['cz','strong_cz'].includes(flow?.phase))qa.czEntered=true;else if(qa.czEntered)qa.czExited=true;
    qa.spinning=spinning;qa.flow=flow;return sync(flow,spinning);
   };
   NovaArt.step=(state,options,rng,forced)=>{
    if(state.zone){
     if(['sosuke','giru'].includes(state.zone))forced=state.ladderIndex<1?'REPLAY':'MISS';
     else if(['toto','sora'].includes(state.zone))forced=qa.steps.some(x=>x.aim)?'MISS':'NEBULA';
     else if(!state.zero)forced=state.zoneLeft===1?'SUPER_NOVA':'MISS';
    }else if(!forced)forced=state.comebackLeft?'MISS':'BELL';
    const out=step(state,options,()=>.5,forced);qa.steps.push({zone:state.zone,afterZone:out.flow.zone,result:out.result,aim:out.aim,oumaFreeze:out.oumaFreeze});if(out.oumaFreeze)qa.freezes++;
    return out;
   };
   NovaArt.prepareBet=(state,options,rng)=>bet(state,options,state.oumaPending?()=>qa.freezes<2?0:.999:rng);
   NovaResults.show=card=>{qa.results.push({card,at:performance.now(),completed:qa.completed});return show(card);};
   HTMLMediaElement.prototype.play=function(...args){if(this.src.includes('result-eyecatch.wav'))this.addEventListener('ended',()=>qa.eyeEnded++,{once:true});return play.apply(this,args);};
   NovaFlow={...NovaFlow,enterCZ:(strong,options,rng)=>{const state=enter(strong,options,()=>s.success?0:.999);return state;}};
   // Stable common roles isolate CZ transitions from rare-role rewrites.
   const normalSpin=NovaNormal.spin;
   NovaNormal.spin=(state,flow,setting,options,rng,forced)=>{const out=normalSpin(state,flow,setting,options,rng,forced||'BELL');if(['cz','strong_cz'].includes(flow.phase)&&flow.remaining===1)qa.czOutcome=!!out.internalBonus;return out;};
   const advanceBonus=NovaArt.advanceBonus;
   NovaArt.advanceBonus=(...args)=>{qa.bonusSeen=true;return advanceBonus(...args);};
  },scenario);
  await page.locator('#debugToggleBtn').click();await page.locator('#forceResult').selectOption(scenario.zone?'ZONE_'+scenario.zone:scenario.comeback?'COMEBACK':scenario.cz==='cz'?'CZ':'STRONG_CZ');await page.locator('#applyForceBtn').click();await page.locator('#debugCloseBtn').click();
  await page.locator('#quickAutoBtn').click();await page.evaluate(()=>{qaHidden=true;document.dispatchEvent(new Event('visibilitychange'));});
  const deadline=Date.now()+120000;let state;
  while(Date.now()<deadline){
   state=await page.evaluate(()=>({auto:document.querySelector('#quickAutoBtn').textContent,q:qa,logs:[...document.querySelectorAll('#logList .logItem')].slice(0,5).map(x=>x.textContent)}));
   if(state.auto!=='STOP')throw Error('AUTO switched off: '+JSON.stringify(state));
   if(!scenario.cz?state.q.afterResultSpins>=2:state.q.czExited&&state.q.afterCzSpins>=3)break;
   await sleep(150);
  }
  assert(!scenario.cz?state.q.afterResultSpins>=2:state.q.czExited&&state.q.afterCzSpins>=3,'did not continue after zone: '+JSON.stringify(state));
  if(scenario.cz)assert.equal(state.q.czOutcome,scenario.success);
  assert.deepEqual(state.q.violations,[]);assert.deepEqual(errors,[]);
  if(scenario.zone&&['urapi','ouma','ura_ouma'].includes(scenario.zone))assert.equal(state.q.freezes,2);
  await page.evaluate(()=>{document.querySelector('#quickAutoBtn').click();qaHidden=false;});
  const result={label,autoContinued:true,completed:state.q.completed,results:state.q.results,eyeEnded:state.q.eyeEnded,afterResultSpins:state.q.afterResultSpins,freezes:state.q.freezes,czExited:state.q.czExited,czOutcome:state.q.czOutcome,afterCzSpins:state.q.afterCzSpins,violations:state.q.violations,pageErrors:errors};
  console.log(JSON.stringify(result));return result;
 }catch(error){await page.evaluate(()=>qaHidden=false).catch(()=>{});await page.screenshot({path:`research/auto130/error-${label}.png`}).catch(()=>{});const failure={label,error:String(error),pageErrors:errors};fs.writeFileSync(`research/auto130/error-${label}.json`,JSON.stringify(failure,null,2));throw error;}
 finally{await context.close();}
}
try{
 const results=[];for(let i=0;i<cases.length;i+=3){const batch=await Promise.allSettled(cases.slice(i,i+3).map(runCase));for(const item of batch){if(item.status==='rejected')throw item.reason;results.push(item.value);}}
 const report={url,silent:true,isolated:true,renderingSuspended:true,results};const suffix=process.env.NOVA_QA_CASE?'-'+process.env.NOVA_QA_CASE.replaceAll(',','-'):'';fs.writeFileSync('research/auto130/'+(process.env.NOVA_QA_URL?'public-qa':'qa')+suffix+'.json',JSON.stringify(report,null,2));
}finally{await browser.close();await new Promise(r=>server.close(r));}
