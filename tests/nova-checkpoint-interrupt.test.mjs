import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {loadModel} from '../scripts/zone-v2-model.mjs';

const config={setting:5};
function setup(){loadModel();NovaProgress.reset();return NovaArt.enter(config,()=>.9);}
const noDraw=()=>{throw Error('Checkpoint interruption must not draw');};

test('all special zones stop at secured quota, including reverse freeze, without double credit',()=>{
 for(const zone of ['sosuke','giru','toto','sora','urapi','ouma','ura_giru','ura_sora','ura_ouma','fixed50_sosuke','kushuri_nito']){
  const base=setup();let flow=NovaArt.startZone({...base,remaining:'100',queuedZones:['sora','ouma'],sets:'2',stock:'1'},zone,config,()=>.5);
  flow={...flow,...(zone==='kushuri_nito'?{zone,initialVersion:148,initialStage:'zone'}:{}),award:'300',zero:['urapi','ouma'].includes(flow.zone),oumaPending:true};
  const original=JSON.stringify(flow);
  assert.equal(NovaProgress.prepareCountdown(flow,1999),flow,zone+' before boundary');
  const next=NovaProgress.prepareCountdown(flow,2000);
  assert.equal(next.zone,'',zone);assert.equal(next.remaining,'400');assert.equal(next.award,'300');
  assert.equal(next.zero,false);assert.equal(next.oumaPending,false);
  assert.equal(next.checkpointCountdown,true);assert.deepEqual(next.queuedZones,[]);
  assert.deepEqual(next.checkpointCarry,{zones:2,sets:'2',bonusStocks:'1'});
  assert.equal(next.sets,'0');assert.equal(next.stock,'0');assert.equal(JSON.stringify(flow),original);
  const restored=NovaArt.normalize(JSON.parse(JSON.stringify(next)));
  assert.equal(NovaProgress.prepareCountdown(restored,2000),restored);
  assert.equal(NovaArt.prepareBet(restored,config,noDraw).remaining,'400');
  assert.equal(NovaArt.settleZone(restored).remaining,'400');
  assert.equal(NovaArt.checkpointGuaranteed(restored,2000,2400),true);
 }
});

test('unearned stocks do not count, but cannot delay a secured countdown or reenter after reload',()=>{
 let flow={...setup(),remaining:'399',queuedZones:['sora'],sets:'7',stock:'1'};
 assert.equal(NovaProgress.prepareCountdown(flow,2000),flow);
 flow={...flow,remaining:'400',entryStage:'confirmed',pendingZone:'sora',atPrelude:{left:3}};
 flow=NovaProgress.beforeBet(flow,config,2000,false,noDraw);
 assert.equal(flow.entryStage,'');assert.equal(flow.atPrelude,null);assert.equal(flow.pendingZone,'');
 NovaProgress.queueSortie();
 flow=NovaProgress.beforeBet(NovaArt.normalize(JSON.parse(JSON.stringify(flow))),config,2000,false,noDraw);
 assert.equal(NovaProgress.ready(flow),false);assert.equal(flow.researchSortieLeft,0);
 const c=vm.createContext({NovaProgress,window:{addEventListener(){}}});vm.runInContext(fs.readFileSync('nova-stock-entry.js','utf8'),c);
 assert.equal(c.NovaStockEntry.eligible(flow,NovaProgress.snapshot(),5),false);
});

test('countdown retains cash and internal navigation accounting, stops rewards, then clears parked carry once',()=>{
 for(const upper of [false,true]){
  const base=setup();let flow=NovaProgress.prepareCountdown({...base,remaining:'500',researchUpper:upper,queuedZones:['sora'],sets:'2',stock:'1'},2300),net=2300;
  for(let i=0;i<4;i++){
   flow=NovaArt.restoreBetCost(flow,3);net-=3;
   const r=NovaArt.step(flow,{...config,netPt:net,checkpointNext:2400,checkpointQuiet:true},()=>0,'STRONG_NOVA');
   assert.equal(r.atOutcome.checkpointQuiet,true);assert.equal(r.atOutcome.direct,0);assert.equal(r.atOutcome.zone,'');
   assert.equal(NovaProgress.drawSortie(5,r.result,r,noDraw),false);
   net+=NovaArt.cashPayout(r.result);flow=NovaArt.normalize(JSON.parse(JSON.stringify(r.flow)));
   assert.equal(net+Number(flow.remaining),2800);assert(!flow.zone);
  }
  flow=NovaProgress.beforeBet(flow,config,2400,false,noDraw);
  const entered=NovaArt.step(flow,config,()=>.5);
  assert.equal(entered.researchChallenge.source,'threshold');assert.equal(entered.researchChallenge.started,true);
  assert.equal(entered.flow.checkpointCountdown,undefined);assert.equal(entered.flow.checkpointCarry,undefined);
  assert.equal(NovaProgress.snapshot().discardedZones,1);assert.equal(NovaProgress.snapshot().discardedSets,2);assert.equal(NovaProgress.snapshot().discardedBonusStocks,1);
  NovaArt.step(entered.flow,config,()=>.5);
  assert.equal(NovaProgress.snapshot().discardedZones,1);
 }
});

test('already reached net interrupts an unfinished zone even if no quota is left',()=>{
 let flow=NovaArt.startZone({...setup(),remaining:'0'},'sora',config,()=>.5);
 NovaProgress.observeNet(2400);
 flow=NovaProgress.beforeBet(flow,config,2400,false,noDraw);
 assert.equal(flow.zone,'');assert.equal(flow.burstPending,true);assert.equal(flow.researchChallengeSource,'threshold');
});

test('ordinary play and active challenges/sorties keep their outcomes, with no speculative award',()=>{
 const base=setup();
 for(const patch of [{phase:'normal'},{researchSortieLeft:3},{researchChallengeActive:true},{burstPending:true,researchChallengeSource:'initial'},{initialStage:'wait'},{comebackLeft:2}]){
  const f={...base,remaining:'5000',...patch};assert.equal(NovaProgress.prepareCountdown(f,2000),f);
 }
 const f={...base,remaining:'300'};
 assert.equal(NovaProgress.prepareCountdown(f,NaN),f);assert.equal(NovaProgress.prepareCountdown(f,2000),f);
});

test('browser settles payout before interrupting and shows the earned zone result before countdown',()=>{
 const src=fs.readFileSync('nova-game.js','utf8');
 const fn=src.slice(src.indexOf('  function applyNormalResult('),src.indexOf('  function applyNormalResult(')+9500);
 assert(fn.indexOf('settleBellNavigationPenalty(resolved)')<fn.indexOf('NovaProgress.prepareCountdown'));
 assert(fn.indexOf('stats.totalPaid =')<fn.indexOf('NovaProgress.prepareCountdown'));
 assert.match(fn,/const zoneBefore=resolved\.zoneStartFlow\|\|resolved\.flowBefore/);
 assert.match(fn,/NovaResults\.transition\(zoneBefore,normalState\.flow/);
 assert.match(fn,/!normalState\.flow\.checkpointCountdown&&NovaLadder\.eligible/);
 assert.match(fn,/else displayNovaResult\(zoneCard\)/);
});

test('an unstarted rare challenge cannot preempt the secured threshold countdown',()=>{
 const base=setup();
 const flow=NovaProgress.prepareCountdown({...NovaArt.startZone({...base,remaining:'100'},'sora',config,()=>.5),award:'300',burstPending:true,researchChallengeSource:'rare'},2000);
 assert.equal(flow.zone,'');assert.equal(flow.checkpointCountdown,true);assert.equal(flow.burstPending,false);
 const queued=NovaProgress.beforeBet(flow,config,2400,false,noDraw);
 assert.equal(queued.researchChallengeSource,'threshold');
});
