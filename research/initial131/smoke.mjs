import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadModel,simulate} from '../../scripts/zone-v2-model.mjs';
loadModel();const reports=[];
for(let setting=1;setting<=6;setting++){
 let completed=0,waitGames=0;const step=NovaArt.step;
 NovaArt.step=(s,c,r,f)=>{
  const out=step(s,c,r,f);if(s.initialStage==='wait')waitGames++;
  if(s.initialStage==='zone'&&out.flow.initialStage===''){
   completed++;assert.equal(out.flow.award,s.entryQuota);assert.equal(out.flow.remaining,s.entryQuota);
  }
  return out;
 };
 const out=simulate(setting,30000,131091700+setting,{rng:'xoshiro128',exactGames:true,stopAtComplete:false});
 NovaArt.step=step;assert.equal(out.games,30000);assert(completed>0);assert(waitGames>=completed*3);
 const report={setting,games:out.games,initialZonesCompleted:completed,preparationGames:waitGames,endPhase:out.endPhase};reports.push(report);console.log(JSON.stringify(report));
}
fs.writeFileSync('research/initial131/smoke.json',JSON.stringify({purpose:'Progression smoke test, not an RTP estimate',reports},null,2));
