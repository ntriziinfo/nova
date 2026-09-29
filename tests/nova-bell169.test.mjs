import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {loadModel,simulate} from '../scripts/zone-v2-model.mjs';

test('selected bell proposal applies only the intended profiles and normal role intervals',()=>{
 loadModel();const n=NovaNormal,t=NovaTuning;
 assert.deepEqual([1,2,3,4,5,6].map(s=>t.profile(s).cz),[1.85,1.91,1.78,1.92,2.45,1.607]);
 assert.deepEqual(t.profile(5).tiers,[.47,.05,.05,.05,.38]);
 for(let setting=1;setting<=6;setting++){
  assert.deepEqual(t.profile(setting).thresholdBands,[]);assert.equal(t.profile(setting).upper,1.5);
  const shared=n.roleProbabilities(setting),mix=n.normalRoleProbabilities(setting),nav=1/[250,240,230,220,210,200][setting-1];
  assert.equal(mix.NAVI_BELL,nav);assert.equal(shared.NAVI_BELL,undefined);
  for(const role of ['REPLAY',...Object.keys(n.rare)])assert.equal(mix[role],shared[role]);
  assert(Math.abs(mix.BELL+nav-(shared.BELL+(setting===6?0:nav)))<1e-12);
  const basePay=Object.entries(mix).reduce((sum,[role,p])=>sum+p*n.pay(role==='NAVI_BELL'?'BELL':role),0);
  const base=50/(3*(1-mix.REPLAY)-basePay),expected=setting===6?42:50/(50/33.5-15*nav);
  assert(Math.abs(base-expected)<1e-10);
  const entries=Object.entries(mix).flatMap(([role,p])=>setting===6?(role==='BELL'?[['NAVI_BELL',nav],['BELL',p]]:role==='NAVI_BELL'?[]:[[role,p]]):[[role,p]]);
  let lower=0;
  for(const [role,p]of entries){
   let first=true;const rng=()=>first?(first=false,lower+p/2):.999999;
   const token=n.spin(null,{phase:'normal'},setting,{},rng);
   assert.equal(token.result,role==='NAVI_BELL'?'BELL':role);assert.equal(token.normalBellNavi,role==='NAVI_BELL');
   lower+=p;
  }
  for(const phase of ['cz','strong_cz']){
   let lower=0;
   for(const [role,p]of Object.entries(shared)){
    let first=true;const rng=()=>first?(first=false,lower+p/2):.999999;
    const token=n.spin(null,{...NovaFlow.enterCZ(phase==='strong_cz',undefined,()=>.99),phase},setting,{},rng);
    assert.equal(token.result,role);assert.equal(token.normalBellNavi,false);lower+=p;
   }
  }
  for(const forced of ['BELL','MISS','WEAK_NOVA','REPLAY'])assert.equal(n.spin(null,{phase:'normal'},setting,{},()=>.999,forced).normalBellNavi,false);
 }
});

test('normal navigation survives the display pipeline but never covers rare or bonus results',()=>{
 const context=vm.createContext({});vm.runInContext(fs.readFileSync('nova-bell-navi.js','utf8'),context);const n=context.NovaBellNavi;
 const spin={result:'BELL',resolved:{flowBefore:{phase:'normal'},normalBellNavi:true,czPrelude:{after:2}}};
 assert(n.eligible(spin));assert.equal(n.drawRareNavi(spin),null);
 for(const result of ['MISS','SUPER_NOVA','WEAK_SUICA','BIG'])assert(!n.eligible({...spin,result}));
 for(const flag of ['bonusPendingAtStart','zoneSpin'])assert(!n.eligible({...spin,resolved:{...spin.resolved,[flag]:true}}));
 for(const phase of ['cz','strong_cz'])assert(!n.eligible({...spin,resolved:{...spin.resolved,flowBefore:{phase}}}));
 assert(!n.eligible({...spin,aTypeBonusActiveAtStart:true}));
 for(let i=0;i<6;i++){
  const order=Array.from(n.drawOrder(()=>(i+.5)/6));
  assert.deepEqual(Array.from(n.stopOrder({...spin,bellNaviOrder:order})),order);
 }
 const html=fs.readFileSync('jag.html','utf8');
 assert(html.includes('normalBellNavi:token.normalBellNavi'));
 assert(html.includes("normalBellNavi:!!artStep?.normalBellNavi&&result==='BELL'"));
});

test('30,000G ledgers and draws exactly replay the selected independent calibration trials',()=>{
 const fixture=JSON.parse(fs.readFileSync('tests/fixtures/nova-bell169-session-digests.json','utf8'));
 for(const trial of fixture.trials){
  loadModel();const actual=simulate(trial.setting,trial.games,trial.seed,fixture.options);
  assert.equal(createHash('sha256').update(JSON.stringify(JSON.parse(JSON.stringify(actual)))).digest('hex'),trial.sha256,trial.seed);
 }
});
