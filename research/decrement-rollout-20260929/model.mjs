import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {xoshiro128} from '../../scripts/zone-v2-rng.mjs';
export {summarize} from './summary.mjs';
export const engineFiles=['nova-tuning.js','nova-art.js','nova-balance.js','nova-flow.js','nova-normal.js','nova-progress.js'];
export const readSource=()=>JSON.parse(fs.readFileSync('research/decrement-rollout-20260929/source.json','utf8'));
export const hashes=source=>Object.fromEntries(Object.entries(source).map(([f,s])=>[f,createHash('sha256').update(s).digest('hex')]));
const replace=(s,a,b)=>{assert.equal(s.split(a).length,2,a);return s.replace(a,b);};

// Isolated finite two-state intervals. Neither paid points nor earned quota is removed.
// State switches use an independent RNG and do not inspect the ledger or future draws.
export function install(source,variant={}){
 const v={enabled:false,lowMean:3000,highMean:9000,lowCz:.25,lowAt:.25,highCz:1,highAt:1,netEnter:null,netExit:null,netCz:.25,netAt:.25,...variant};
 for(const k of ['lowMean','highMean'])assert(Number.isFinite(v[k])&&v[k]>=1);
 for(const k of ['lowCz','lowAt','highCz','highAt'])assert(Number.isFinite(v[k])&&v[k]>=0);
 if(v.netEnter!==null)assert(Number.isFinite(v.netEnter)&&Number.isFinite(v.netExit)&&v.netExit<v.netEnter);
 let rng,low=false,netLow=false,meter;
 const api={
  reset(seed){rng=xoshiro128(seed+'|decrement-interval');low=v.enabled&&rng()<v.lowMean/(v.lowMean+v.highMean);netLow=false;meter={games:0,lowGames:0,entries:low?1:0,exits:0,initialLow:low,lowByPhase:{},netGames:0,netEntries:0,netExits:0,peakObserved:0};},
  observe(net){
   if(!v.enabled||v.netEnter===null)return;
   meter.peakObserved=Math.max(meter.peakObserved,net);
   if(!netLow&&net>=v.netEnter){netLow=true;meter.netEntries++;}
   else if(netLow&&net<=v.netExit){netLow=false;meter.netExits++;}
  },
  beforeBet(phase){
   if(v.enabled&&meter.games>0&&rng()<1/(low?v.lowMean:v.highMean)){low=!low;if(low)meter.entries++;else meter.exits++;}
   meter.games++;if(netLow)meter.netGames++;if(low||netLow){meter.lowGames++;meter.lowByPhase[phase]=(meter.lowByPhase[phase]||0)+1;}
  },
  cz:()=>!v.enabled?1:netLow?Math.min(v.netCz,low?v.lowCz:v.highCz):low?v.lowCz:v.highCz,
  at:()=>!v.enabled?1:netLow?Math.min(v.netAt,low?v.lowAt:v.highAt):low?v.lowAt:v.highAt,
  snapshot:()=>({...structuredClone(meter),endingLow:low,endingNetLow:netLow})
 };
 globalThis.NovaDecrementStudy=api;api.reset('initial');
 for(const f of engineFiles){
  let code=source[f];
  if(f==='nova-flow.js')code=replace(code,'function lampWeights(p){','const lampCache=new Map();function lampWeights(p){if(!lampCache.has(p))lampCache.set(p,computeLampWeights(p));return lampCache.get(p);}function computeLampWeights(p){');
  if(f==='nova-normal.js')code=replace(code,'NovaTuning.profile(setting).cz*lotteryRules.czScale[i]','NovaTuning.profile(setting).cz*globalThis.NovaDecrementStudy.cz()*lotteryRules.czScale[i]');
  if(f==='nova-art.js')code=replace(code,'groups:p.groups,direct:.6*p.direct,weakNova:.35*p.zone','groups:p.groups,direct:.6*p.direct*globalThis.NovaDecrementStudy.at(),weakNova:.35*p.zone*globalThis.NovaDecrementStudy.at()');
  vm.runInThisContext(code,{filename:'decrement-study/'+f});
 }
 return api;
}
let simulator;
export async function studySimulator(){
 if(simulator)return simulator;
 let code=fs.readFileSync('research/decrement-rollout-20260929/simulator-v169.txt','utf8');
 code=replace(code,'path.dirname(fileURLToPath(import.meta.url))',JSON.stringify(path.resolve('scripts')));
 code=replace(code,"'./zone-v2-rng.mjs'",JSON.stringify(pathToFileURL(path.resolve('scripts/zone-v2-rng.mjs')).href));
 code=replace(code,'a.resetResearchCheckpoints?.();','globalThis.NovaDecrementStudy.reset(seed);a.resetResearchCheckpoints?.();');
 code=replace(code,'const net=paid-fee;a.observeResearchNet?.(net);','const net=paid-fee;globalThis.NovaDecrementStudy.observe(net);a.observeResearchNet?.(net);');
 code=replace(code,'count++;counts[phase]++;','count++;globalThis.NovaDecrementStudy.beforeBet(phase);counts[phase]++;');
 simulator=(await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))).simulate;
 return simulator;
}
