import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {loadModel,simulate} from '../burst112/production-model.mjs';
import {summarize} from '../burst113/trial.mjs';
import {cacheMix} from './cache-mix.mjs';

export const targets={reach:[.02,.04,.06,.10,.15,.20],rtp:[.95,.965,.98,1.02,1.07,1.14]};
export function loadCandidate(c){
  loadModel(undefined,c.cache!==false);
  let source=fs.readFileSync('nova-art.js','utf8');
  function replace(re,value){assert.equal([...source.matchAll(new RegExp(re.source,'g'))].length,1,re.source);source=source.replace(re,value);}
  if(c.boost!=null)replace(/normalBoost:Object.freeze\(\[[\d.,]+\]\)/,`normalBoost:Object.freeze(${JSON.stringify(Array(6).fill(c.boost))})`);
  if(c.entry!=null)replace(/entry:Object.freeze\(\[[\d.,]+\]\)/,`entry:Object.freeze(${JSON.stringify(Array(6).fill(c.entry))})`);
  if(c.levels)replace(/\.\.\.\[ \[1,\.65,\.6,90\],[\s\S]*?\[1\.8,1\.5,1\.6,25\] \]/,`...${JSON.stringify(c.levels)}`);
  vm.runInThisContext(c.cache===false?source:cacheMix(source));
  if(c.base!=null||c.replay!=null){
    let normal=fs.readFileSync('nova-normal.js','utf8');
    if(c.base!=null){assert(normal.includes('50/27.5'));normal=normal.replace('50/27.5',`50/${c.base}`);}
    if(c.replay!=null){assert(normal.includes('frequent/7.452119'));normal=normal.replace('frequent/7.452119',`frequent*${c.replay}`);}
    vm.runInThisContext(normal);
  }
  for(let s=1;s<=6;s++){const row=NovaNormal.roleProbabilities(s);assert(Object.values(row).every(p=>p>=0&&p<=1));assert(Math.abs(Object.values(row).reduce((a,b)=>a+b,0)-1)<1e-12);}
  for(const role of NovaArt.comebackRules.guaranteedRoles)assert.equal(NovaArt.comebackChance(role,c.setting),1);
  assert.equal(NovaArt.defaults.initial,150);assert.equal(NovaArt.burstRules.award,2000);assert.equal(NovaArt.burstRules.success,.5);
}
export function run(c){
  loadCandidate(c);const rows=[],start=Date.now();
  for(let i=0;i<c.trials;i++){
    rows.push(simulate(c.setting,30000,c.seedBase+c.setting*100003+i*7919,{rng:'xoshiro128',completeLimitPt:10000,stopAtComplete:false,art:c.weights?{atLevelWeights:c.weights}:{}}));
    if((i+1)%100===0)console.log(`${c.tag} S${c.setting}: ${i+1}/${c.trials} x 30,000G`);
  }
  const report=summarize(rows,c);
  report.reachWithoutBurst=rows.filter(r=>r.firstComplete&&!r.firstComplete.burstWins).length/c.trials;
  report.win=rows.filter(r=>(r.firstComplete??r).net>0).length/c.trials;
  report.seconds=(Date.now()-start)/1000;
  return {report,rows};
}
export function compact(report){return {tag:report.tag,setting:report.setting,rtp:report.stoppedRtp.value,reach:report.completeRate,noBurst:report.reachWithoutBurst,win:report.win,atMean:report.ordinary.mean,burstMean:report.burst.mean,burstAttempts:report.burstAttempts,atEntries:report.atEntries,seconds:report.seconds};}
