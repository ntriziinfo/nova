import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadModel,simulate} from './zone-v2-model.mjs';
import {xoshiro128} from './zone-v2-rng.mjs';

loadModel();
const a=NovaArt,trials=30000,settings=[];
for(let setting=1;setting<=6;setting++){
 const row=a.comebackRoleProbabilities(setting);
 const chances=Object.fromEntries(Object.keys(row).map(role=>[role,a.comebackChance(role,setting)]));
 const perGame=Object.entries(row).reduce((sum,[role,p])=>sum+p*chances[role],0);
 const total=1-(1-perGame)**5;
 assert(Math.abs(total-.20)<1e-12);
 const expectedByRole=Object.fromEntries(Object.entries(row).map(([role,p])=>[role,p*chances[role]*total/perGame]));
 const parityRole=setting%2?'BELL':'REPLAY';
 assert(Math.abs(expectedByRole[parityRole]-.01)<1e-12);
 const wins=Object.fromEntries(Object.keys(row).map(role=>[role,0]));
 const rng=xoshiro128(1430000000+setting),base=a.beginComeback(a.enter({setting},()=>0));
 let games=0;
 for(let i=0;i<trials;i++){
  let flow=base;
  for(let g=0;g<5;g++){
   const step=a.step(flow,{setting},rng);games++;
   if(step.comebackEvent==='success'){
    const r=step.result;
    if(r==='BELL')assert(setting%2===1);
    if(r==='REPLAY')assert(setting%2===0);
    if(r==='MISS')assert(setting>=4);
    assert(step.flow.comebackConfirmed);assert.equal(step.flow.entryStage,'confirmed');
    wins[r]++;break;
   }
   if(g===4)assert.equal(step.comebackEvent,'failure');
   else assert.equal(step.flow.comebackLeft,4-g);
   flow=step.flow;
  }
 }
 const observed=Object.values(wins).reduce((sum,n)=>sum+n,0)/trials;
 assert(Math.abs(observed-.2)<.01);
 for(const role of Object.keys(row)){
  if(chances[role]===0)assert.equal(wins[role],0);
  const tolerance=Math.max(.001,6*Math.sqrt(expectedByRole[role]*(1-expectedByRole[role])/trials));
  assert(Math.abs(wins[role]/trials-expectedByRole[role])<tolerance);
 }
 // Full-flow smoke check only. A single 30,000G run is not an RTP estimate.
 const smoke=simulate(setting,30000,1431000000+setting,{rng:'xoshiro128',exactGames:true,stopAtComplete:false});
 assert.equal(smoke.games,30000);assert.equal(smoke.net,smoke.totalPaid-smoke.totalBet);
 const result={setting,trials,games,roleProbabilities:row,chances,expectedTotal:total,expectedByRole,wins,observedTotal:observed,fullFlowGames:smoke.games};
 settings.push(result);console.log(JSON.stringify({setting,trials,observedTotal:observed,commonWins:{BELL:wins.BELL,REPLAY:wins.REPLAY,MISS:wins.MISS},fullFlowGames:smoke.games}));
}
const sourceHashes=Object.fromEntries(['nova-art.js','nova-normal.js','nova-flow.js','scripts/zone-v2-model.mjs','scripts/zone-v2-rng.mjs'].map(file=>[file,createHash('sha256').update(fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n')).digest('hex')]));
fs.writeFileSync('docs/comeback143-validation.json',JSON.stringify({version:143,seedBase:1430000000,sourceHashes,settings},null,2)+'\n');
