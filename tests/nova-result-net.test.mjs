import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('nova-game.js','utf8');
const fn=name=>source.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0];
const noop=()=>{};
function harness(){
 const cards=[];
 const c=vm.createContext({performance:{now:()=>0},A_TYPE_MODE:true,SPIN_COST:3,debugFastSpinActive:false,
  settings:{setting:1},session:{active:false},normalState:{flow:{phase:'normal'},bonusPending:true},
  stats:{totalPaid:100,totalFee:1000},jagChainCount:null,jagChainBonusHandoff:false,
  jagLastGamePayout:0,RESULT:{MISS:{},BELL:{},REPLAY:{}},
  clearCzReelBlackout:noop,recordSlumpPoint:noop,updateCompleteTrialState:noop,
  playStrongNovaSound:noop,playWeakNovaSound:noop,playChanceSound:noop,playPayoutSound:noop,
  showCzPrelude:noop,countRoleStat:noop,lineName:()=>'',normalizeBonusAfterGames:x=>Number(x)||0,
  syncNovaProgress:noop,resetNormalCountersAfterArt:noop,showMessage:noop,normalModeLabel:()=>'',log:noop,showOverlay:noop,
  NovaDecrement:{observe:noop},currentProfit:()=>0,
  NovaLadder:{eligible:()=>false},displayNovaResult:card=>cards.push(JSON.parse(JSON.stringify(card))),
  console:{error:e=>{throw e;}}
 });
 for(const file of ['nova-tuning.js','nova-art.js','nova-balance.js','nova-flow.js','nova-normal.js','nova-results.js','nova-role-counter.js','nova-data-counter.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c);
 for(const name of ['chainCountStep','chargeSpinCost','trackZoneResult','applyNormalResult'])vm.runInContext(fn(name),c);
 return {c,cards};
}

test('final AT result reconciles bonus, preparation, zones, upper AT and comeback with the same paid-minus-BET ledger',()=>{
 const {c,cards}=harness();
 // Start before the first preparation BET, even with no intervening display update.
 c.chargeSpinCost();c.stats.totalPaid+=8;
 c.normalState.bonusPending=false;c.session.active=true;c.jagChainBonusHandoff=true;
 c.chargeSpinCost();c.stats.totalPaid+=8;assert.equal(c.jagChainBonusHandoff,false,'FAST bonus handoff cannot keep counting subsequent normal play');
 c.chargeSpinCost();c.stats.totalPaid+=3; // replay must not inflate winnings
 c.session.active=false;c.normalState.flow=c.NovaArt.enter({},()=>.99);
 c.normalState.flow.remaining='100';c.chargeSpinCost();c.stats.totalPaid+=8;
 assert.equal(c.chainCountStep(c.jagChainCount,true,c.stats.totalPaid,c.stats.totalFee).count,15);
 const zoneBefore={...c.normalState.flow,zone:'sora',award:'400'},zoneAfter={...c.normalState.flow,zone:'',award:'500'};
 c.normalState.flow=zoneBefore;c.chargeSpinCost();
 c.applyNormalResult('BELL',{reward:8,flowBefore:zoneBefore,flowAfter:zoneAfter,comebackEvent:'tested'});
 assert.equal(cards[0].kind,'zone');assert.equal(cards[0].pt,'500');
 assert.equal(c.chainCountStep(c.jagChainCount,true,c.stats.totalPaid,c.stats.totalFee).count,20,'awards are future AT points, not cash already paid');
 c.normalState.flow.researchUpper=true;
 c.chargeSpinCost();c.stats.totalPaid+=8;
 const saved=JSON.parse(JSON.stringify(c.jagChainCount));c.jagChainCount=saved;
 const before={...c.normalState.flow,comebackLeft:1,remaining:'0'};
 c.normalState.flow=before;c.chargeSpinCost();
 let draws=0;c.random=()=>{draws++;return .5;};vm.runInContext('Math.random=random',c);
 c.applyNormalResult('REPLAY',{reward:3,flowBefore:before,flowAfter:{phase:'normal'},comebackEvent:'failure'});
 assert.equal(cards.length,2);assert.equal(cards[1].kind,'at');assert.equal(cards[1].accounting,'net');
 assert.equal(cards[1].pt,'25');assert.equal(c.stats.totalPaid,146);assert.equal(c.stats.totalFee,1021);
 assert.equal(draws,1,'unchanged result-art draw only');assert.equal(c.jagChainCount,null);
 c.normalState.bonusPending=true;c.chargeSpinCost();c.stats.totalPaid+=8;
 assert.equal(c.chainCountStep(c.jagChainCount,true,c.stats.totalPaid,c.stats.totalFee).count,5,'fresh initial hit excludes prior winnings');
});

test('zero-game chains and legacy free replays subtract only fees actually charged',()=>{
 const {c}=harness();c.normalState.bonusPending=false;c.normalState.flow={phase:'art',zero:true};
 c.chargeSpinCost();assert.equal(c.stats.totalFee,1000);c.stats.totalPaid+=8;
 c.normalState.flow.zero=false;c.normalState.replayFree=true;
 c.chargeSpinCost();assert.equal(c.stats.totalFee,1000);
 assert.equal(c.chainCountStep(c.jagChainCount,true,108,1000).count,8);
 c.chargeSpinCost();assert.equal(c.stats.totalFee,1003);
 assert.equal(c.chainCountStep(c.jagChainCount,true,108,1003).count,5);
});
