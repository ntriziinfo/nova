import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadModel,simulate} from '../../scripts/zone-v2-model.mjs';
import {summarizeTrials} from '../../scripts/tuning-statistics.mjs';
export {simulate};
export const files=['nova-tuning.js','nova-decrement.js','nova-art.js','nova-balance.js','nova-flow.js','nova-normal.js','nova-progress.js','scripts/zone-v2-model.mjs'];
export const hashes=()=>Object.fromEntries(files.map(f=>[f,createHash('sha256').update(fs.readFileSync(f)).digest('hex')]));
export const options={rng:'xoshiro128',exactGames:true,completeLimitPt:10000,stopAtComplete:false,rareSortie:true,decrementAudit:true};
export function install(v){
 loadModel('..',true,v.zone===undefined?undefined:{[v.setting]:{zone:v.zone}});
 if(v.extraRate!==undefined){
  // A new lottery only for AT roles that currently cannot award a zone.
  // Keep the live decrement multiplier and upper-AT multiplier, and clamp the final probability.
  const marker='  out.rewardFactor=1;',source=fs.readFileSync('nova-art.js','utf8');
  assert.equal(source.split(marker).length,2);
  vm.runInThisContext(source.replace(marker,`  if(${v.extraRate}>0&&setting===${v.setting}&&!out.zone&&['WEAK_SUICA','STRONG_SUICA','CHANCE_A','CHANCE_B'].includes(role)&&rng()<Math.min(1,${v.extraRate}*(globalThis.NovaDecrement?.at(setting)??1)*(s.researchUpper?NovaTuning.profile(setting).upper:1)*(role==='STRONG_SUICA'?2:1)))out.zone=pickAtZone(setting,false,rng);\n`+marker),{filename:'proposal-only/nova-art.js'});
  // Reinstall the production checkpoint wrapper around the modified engine.
  vm.runInThisContext(fs.readFileSync('nova-progress.js','utf8'),{filename:'proposal-only/nova-progress.js'});
 }
 assert.equal(typeof NovaArt.queueResearchThreshold,'function');
 assert.equal(typeof NovaArt.researchCheckpointStats,'function');
 const prior=NovaNormal.normalRoleProbabilities(v.setting),other=NovaNormal.roleProbabilities(v.setting);
 if(v.replay!==undefined){
  assert(v.replay>=0&&v.replay<=prior.REPLAY);
  const marker='  r.NAVI_BELL=1/NovaTuning.normalBellDenominators[key-1];';
  const source=fs.readFileSync('nova-normal.js','utf8');assert.equal(source.split(marker).length,2);
  vm.runInThisContext(source.replace(marker,`  if(key===${v.setting}){r.MISS+=r.REPLAY-${v.replay};r.REPLAY=${v.replay};}\n`+marker),{filename:'proposal-only/nova-normal.js'});
 }
 assert.deepEqual(NovaNormal.roleProbabilities(v.setting),other,'CZ/common role table changed');
 const r=NovaNormal.normalRoleProbabilities(v.setting);
 for(const k of Object.keys(prior).filter(k=>!['MISS','REPLAY'].includes(k)))assert.equal(r[k],prior[k]);
 assert(Math.abs(Object.values(r).reduce((s,x)=>s+x,0)-1)<1e-12);
 assert(Object.values(r).every(x=>x>=0&&x<=1));
 const payout=Object.entries(r).reduce((sum,[role,p])=>sum+p*NovaNormal.pay(role==='NAVI_BELL'?'BELL':role),0);
 return {roles:r,base50:50/(3*(1-r.REPLAY)-payout),profile:NovaTuning.profile(v.setting)};
}
export function summarize(rows){
 const sum=f=>rows.reduce((s,r)=>s+f(r),0),base=summarizeTrials(rows);
 const normal=sum(r=>r.normalPayout.games),cost=sum(r=>r.normalPayout.bet-r.normalPayout.paid);
 const at=rows.flatMap(r=>Object.values(r.atLevelMetrics));
 const complete=at.reduce((s,r)=>s+r.completed,0);
 return {...base,realizedBase50:50*normal/cost,normalReplayRate:sum(r=>r.normalRoles.REPLAY||0)/normal,
  normalAtZoneDenominator:sum(r=>r.actualAtZone.normal.games)/sum(r=>r.actualAtZone.normal.wins),
  upperAtZoneDenominator:sum(r=>r.actualAtZone.upper.games)/sum(r=>r.actualAtZone.upper.wins),
  completedAtPayout:at.reduce((s,r)=>s+r.completedPaid,0)/complete,
  atPayoutBins:Object.fromEntries(Object.keys(rows[0].atPayoutBins).map(k=>[k,sum(r=>r.atPayoutBins[k])/complete])),
  meanUnspentPt:sum(r=>r.unspentAtQuota)/rows.length};
}
