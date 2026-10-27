import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import {gunzipSync} from 'node:zlib';
import vm from 'node:vm';
import {loadModel,simulate} from '../scripts/zone-v2-model.mjs';
import {xoshiro128} from '../scripts/zone-v2-rng.mjs';
const near=(a,b)=>assert(Math.abs(a-b)<1e-10,`${a} != ${b}`);
const retired=['STRONG_SUICA','CHANCE_A','CHANCE_B'];
test('all state role tables retire chance eyes and strong suika; AT realizes the current net targets',()=>{
 loadModel();const a=NovaArt,n=NovaNormal;
 for(let setting=1;setting<=6;setting++){
  for(const row of [n.roleProbabilities(setting),n.normalRoleProbabilities(setting),a.preparationProbabilities(setting),a.comebackRoleProbabilities(setting),a.roleProbabilities(setting),a.roleProbabilities(setting,true)]){
   near(Object.values(row).reduce((s,p)=>s+p),1);assert(Object.values(row).every(p=>p>=0&&p<=1));
   for(const role of retired)assert.equal(row[role]||0,0);
  }
  for(const upper of [false,true]){
   const row=a.roleProbabilities(setting,upper);
   near(Object.entries(row).reduce((s,[r,p])=>s+p*a.payout(r),0)-3*(1-row.REPLAY),upper?a.atNetRules.upper:a.atNetRules.normal);
   if(upper)assert.equal(row.BELL,0);else near(row.BELL,row.BELL15);
  }
  for(const tier of ['normal','upper']){const p=a.bonusRoleProbabilities(setting,tier);near(1-(p.BELL/(p.BELL+p.NEBULA))**7,a.bonusRules[tier].atChance);}
  const row=a.comebackRoleProbabilities(setting);near(1-(1-Object.entries(row).reduce((s,[r,p])=>s+p*a.comebackChance(r,setting),0))**5,.2);
 }
 assert.equal(n.pay('BELL'),8);assert.equal(n.pay('BELL15'),15);
});
test('common rares share lotteries; strong NOVA preserves four base branches before fixed-zone thinning',()=>{
 loadModel();const a=NovaArt,n=NovaNormal;
 for(let setting=1;setting<=6;setting++)for(const high of [false,true]){
  near(n.roleCzRate({level:high?'high':'low'},'WEAK_SUICA',setting),n.roleCzRate({level:high?'high':'low'},'WEAK_NOVA',setting));
  near(a.weakAtResponseChance(setting,false,high),high?.09:.06);near(a.weakAtResponseChance(setting,true,high),high?.09:.06);
  for(const upper of [false,true]){const weights=a.weakQualityWeights(setting,upper),start=upper?2:1;near(a.extraZoneChance(setting,'WEAK_SUICA',upper,high),a.weakAtResponseChance(setting,upper,high)*weights.slice(start).reduce((sum,value)=>sum+value,0)/weights.reduce((sum,value)=>sum+value,0));}
  for(let i=0;i<100;i++){
   const seed=`${setting}/${high}/${i}`,state={atHigh:high,atHighLeft:10};
   const left=a.resolveAtRole({...state},'WEAK_SUICA',setting,xoshiro128(seed));
   assert.deepEqual(left,a.resolveAtRole({...state},'WEAK_NOVA',setting,xoshiro128(seed)));
   const upper=a.resolveAtRole({...state,researchUpper:true},'WEAK_SUICA',setting,xoshiro128(seed));
   assert([0,10].includes(left.direct));assert([0,15,50].includes(upper.direct));assert(!upper.fixed50);assert([-1,0,1,2,3,4].includes(left.quality));assert([-1,0,1,2,3,4].includes(upper.quality));
  }
 }
 for(const [roll,direct,zone]of [[0,true,false],[.19999,true,false],[.2,false,true],[.39999,false,true],[.4,true,true],[.59999,true,true],[.6,false,false],[.99999,false,false]]){
  let first=true;const out=a.resolveAtRole({},'STRONG_NOVA',3,()=>first?(first=false,roll):.5);
  assert.equal(out.direct,0);assert.equal(!!out.fixed50,direct);assert.equal(!!(out.fixed50?out.extraZone:out.zone),zone);
 }
});
test('all six 15pt bell orders survive navigation, save and AUTO without redrawing',()=>{
 const c=vm.createContext({});for(const f of ['nova-bell-navi.js','nova-spin-resume.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);
 for(let i=0;i<6;i++){
  const s={result:'BELL15',resolved:{flowBefore:{phase:'art'},reward:15,flowAfter:{remaining:'85'}},grid:[['A','B','C'],['7','B','B'],['D','E','F']],stopped:[false,false,false],bellNaviOrder:Array.from(c.NovaBellNavi.drawOrder(()=>(i+.5)/6))};
  assert(c.NovaBellNavi.eligible(s));const restored=c.NovaSpinResume.restore(c.NovaSpinResume.capture(s),{BELL15:{}});
  assert.deepEqual(Array.from(c.NovaBellNavi.stopOrder(restored)),s.bellNaviOrder);assert.equal(restored.resolved.reward,15);assert.equal(restored.resolved.flowAfter.remaining,'85');
 }
});

test('historical A plan reproduces full-horizon and highest-peak approved 50,000G trials for every setting',()=>{
 const rows=JSON.parse(gunzipSync(fs.readFileSync('docs/win-a-50000-20261007-rows.json.gz')));
 const options={rng:'xoshiro128',exactGames:true,completeLimitPt:10000,stopAtComplete:true,rareSortie:true,atBetRefund:true,replayRefund:false,completeMyLimitPt:0};
 for(let setting=1;setting<=6;setting++){
  const data=rows.filter(r=>r.setting===setting),full=data.find(r=>!r.firstComplete);
  // Some suppressed settings had no complete in this batch; replay their highest peak.
  const peak=data.reduce((best,row)=>row.peak>best.peak?row:best);
  assert(full);assert(peak.peak>0);
  for(const trial of [full,peak]){
   loadModel('../tests/fixtures/pre-win-base30');const actual=simulate(setting,50000,trial.seed,options);
   for(const field of ['games','totalBet','totalPaid','net','peak','firstComplete','counts'])assert.deepEqual(actual[field],trial[field],'Setting '+setting+' / '+field);
  }
 }
});

test('15pt bells retain bell counters and payout sound',()=>{const source=fs.readFileSync('nova-game.js','utf8');const c=vm.createContext({A_TYPE_MODE:true,NovaNormal:{rare:{}},stats:{bellCount:0},PAYOUT_3PT_BELL_SOUND_SRC:'bell',BELL_PAYOUT_SOUND_OUTPUT_SCALE:.5,isPremiumBigBonusPieroSound:()=>false,currentSpin:null});for(const name of ['countRoleStat','payoutSoundSrcFor','payoutSoundScaleFor'])vm.runInContext(source.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0],c);c.countRoleStat('BELL15');assert.equal(c.stats.bellCount,1);assert.equal(c.payoutSoundSrcFor('BELL15',15),'bell');assert.equal(c.payoutSoundScaleFor('BELL15',15),.5);});
