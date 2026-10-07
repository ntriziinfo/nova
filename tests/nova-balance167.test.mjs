import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
function load(){const c=vm.createContext({});for(const f of ['nova-tuning.js','nova-art.js','nova-normal.js','nova-flow.js','nova-progress.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);return c;}
const json=x=>JSON.parse(JSON.stringify(x));
test('final normal bases and rare-inclusive initial means match all six settings',()=>{
 const {NovaArt:a,NovaNormal:n,NovaTuning:t}=load();
 for(let s=1;s<=6;s++){
  const p=n.roleProbabilities(s),pay=Object.entries(p).reduce((sum,[r,v])=>sum+v*n.pay(r),0);
  assert(Object.values(p).every(v=>v>=0&&v<=1));assert(Math.abs(Object.values(p).reduce((sum,v)=>sum+v,0)-1)<1e-12);
  assert(Math.abs(50/(3*(1-p.REPLAY)-pay)-JSON.parse(fs.readFileSync('tests/fixtures/nova-role-merge-approved.json')).sharedBases[s-1])<1e-9);
  const weights=a.entryWeights[s-1],mean=weights.reduce((sum,w,i)=>sum+w*a.entryQuotaRules.values[i],0)/3;
  const roles=a.roleProbabilities(s),awards=a.initialRareAwards;
  const expected=3*Object.entries(roles).reduce((sum,[r,p])=>sum+p*(awards[r]||mean),0);
  assert(Math.abs(expected-JSON.parse(fs.readFileSync('tests/fixtures/nova-role-merge-approved.json')).entryMeans[s-1])<1e-9);
 }
});
test('sortie stock rates vary by setting, guarantee two and preserve quota',()=>{
 const {NovaArt:a}=load();
 for(let setting=1;setting<=6;setting++){
  let s=a.beginResearchSortie(a.enter({setting},()=>.5),()=>.01),quota=s.remaining;
  assert.equal(s.researchSortieRate,.1);
  for(let i=0;i<10;i++)s=a.step(s,{setting},()=>.999).flow;
  assert.equal(s.researchSortieHits,2);assert.equal(s.queuedZones.length,2);assert.equal(s.remaining,quota);
 }
});
test('challenge HOLD, next-game aim and rare guarantee work for manual and AUTO engine',()=>{
 const {NovaArt:a}=load();let s={...a.enter({setting:6},()=>.5),burstPending:true,researchChallengeSource:'rare'};
 let out=a.step(s,{setting:6},()=>.999,'BELL');assert.equal(out.flow.burstLeft,10);assert.equal(out.flow.researchAim,'common');
 out=a.step(out.flow,{setting:6},()=>.999,'MISS');assert.equal(out.flow.burstLeft,10);assert.equal(out.flow.researchAim,'');assert.equal(out.researchChallenge.won,false);
 out=a.step(out.flow,{setting:6},()=>.999,'WEAK_SUICA');assert.equal(out.flow.burstLeft,10);assert.equal(out.flow.researchAim,'rare');
 out=a.step(out.flow,{setting:6},()=>.999,'MISS');assert.equal(out.researchChallenge.won,true);assert.equal(out.flow.researchUpper,true);assert.equal(out.result,'SUPER_NOVA');
});
test('cumulative checkpoints persist across reload, reset carry once, and reward one zone on failure',()=>{
 const {NovaArt:a,NovaProgress:p}=load();p.reset();p.observeNet(2400);p.bind(json(p.snapshot()));p.observeNet(2400);
 assert.equal(p.snapshot().pending,1);assert.equal(p.snapshot().next,4800);
 let s={...a.enter({setting:5},()=>.5),remaining:'2000',queuedZones:['sora'],sets:'2',stock:'3',researchUpper:true};
 s=p.beforeBet(s,{setting:5},2399,false,()=>.999);
 let out=a.step(s,{setting:5},()=>.999,'MISS');assert.equal(out.researchChallenge.source,'threshold');assert.equal(out.flow.remaining,'0');assert.equal(out.flow.sets,'0');assert.equal(out.flow.stock,'0');assert.equal(out.flow.queuedZones.length,0);assert.equal(out.flow.researchUpper,false);
 for(let i=0;i<9;i++)out=a.step(out.flow,{setting:5},()=>.999,'MISS');
 assert.equal(out.researchChallenge.finished,true);assert.equal(out.flow.entryStage,'seven');assert(out.flow.pendingZone);assert.equal(p.snapshot().rewardZones,1);
 p.observeNet(2400);assert.equal(p.snapshot().pending,0);p.observeNet(4800);assert.equal(p.snapshot().pending,1);
});
test('sortie trigger waits through BIG and preludes and is saved',()=>{
 const {NovaProgress:p}=load();p.reset();assert(p.drawSortie(1,'WEAK_NOVA',{},()=>0));p.bind(json(p.snapshot()));
 const flow={phase:'normal'};assert.equal(p.beforeBet(flow,{setting:1},0,true,()=>.9),flow);
 const next=p.beforeBet(flow,{setting:1},0,false,()=>.9);assert.equal(next.initialStage,'wait');assert.equal(p.snapshot().sorties,1);
});
test('50% and 65% upper challenge gates include HOLD and aim-game rare rewrites',()=>{
 const {NovaArt:a}=load(),rare=a.atMix(1).chance,miss=.9-rare;
 for(const [source,target] of [['initial',.5],['threshold',.65],['rare',.65]]){
  let lo=0,hi=1;
  for(let i=0;i<50;i++){const roll=(lo+hi)/2,s={...a.enter({},()=>.5),researchChallengeActive:true,burstPending:true,burstLeft:10,researchAim:'common',researchChallengeSource:source};
   const hit=a.step(s,{setting:1},()=>roll,'MISS').researchChallenge.won;if(hit)lo=roll;else hi=roll;}
  const actual=1-(miss/(miss+rare+.1*(rare+(1-rare)*(lo+hi)/2)))**10;
  assert(Math.abs(actual-target)<1e-10);
 }
});
