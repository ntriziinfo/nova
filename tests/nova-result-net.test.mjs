import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('nova-game.js','utf8');
const fn=name=>source.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0];
const noop=()=>{};
function harness(){
 const cards=[];
 const c=vm.createContext({autoPlay:false,performance:{now:()=>0},A_TYPE_MODE:true,SPIN_COST:3,debugFastSpinActive:false,
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
 for(const name of ['currentGameProfit','settleBellNavigationPenalty','chainCountStep','chargeSpinCost','trackZoneResult','applyNormalResult'])vm.runInContext(fn(name),c);
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

test('AT acquisition count keeps its first-hit baseline through presentation transitions until the actual AT exit',()=>{
 const {c}=harness();
 c.jagChainCount=c.chainCountStep(null,true,c.stats.totalPaid,c.stats.totalFee).state;
 c.stats.totalPaid=140;c.stats.totalFee=1015;
 // A checkpoint/COMPLETE presentation can temporarily expose no active bonus
 // and a non-ART display flow. The existing baseline must still win.
 c.session.active=false;c.jagChainBonusHandoff=false;c.normalState.bonusPending=false;c.normalState.flow={phase:'normal'};
 const original=JSON.stringify(c.jagChainCount);c.chargeSpinCost();
 assert.equal(JSON.stringify(c.jagChainCount),original);
 assert.equal(c.chainCountStep(c.jagChainCount,true,c.stats.totalPaid,c.stats.totalFee).count,22);
 // The real ART -> normal transition clears this explicitly after recording
 // the final result; only then may a new chain start from zero.
 c.jagChainCount=null;
 const cleared=c.chainCountStep(c.jagChainCount,false,c.stats.totalPaid,c.stats.totalFee);
 assert.equal(cleared.state,null);assert.equal(cleared.count,0);
});

test('AT returning to normal hints the newly selected mode, using no extra game draws and keeping the exact payout',()=>{
 const {c,cards}=harness();
 c.recordAtFirstEntry=()=>{};vm.runInContext(fn('resetNormalCountersAfterArt'),c);
 c.normalState.internal=c.NovaNormal.normalize({mode:'天国ループ',games:200});
 let draws=0,visualDraws=0;c.random=()=>{draws++;return 0;};vm.runInContext('Math.random=random',c);
 c.crypto={getRandomValues(a){visualDraws++;a[0]=Math.floor(.99*4294967296);return a;}};
 const before={...c.NovaArt.enter({},()=>.5),remaining:'0',comebackLeft:1};c.normalState.flow=before;
 c.applyNormalResult('MISS',{reward:0,flowBefore:before,flowAfter:{phase:'normal'},comebackEvent:'failure'});
 assert.equal(c.normalState.internal.mode,'A');assert.equal(cards[0].character,'plush_neko','mode A can hint C but never confirms B/C/heaven');
 assert.equal(cards[0].color,'mode');assert.equal(cards[0].kind,'at');assert.equal(cards[0].next,'通常');
 assert.equal(c.stats.totalPaid,100);assert.equal(c.stats.totalFee,1000);assert.equal(draws,2,'one historical result draw and one existing next-mode draw');assert.equal(visualDraws,1);
 const saved=JSON.parse(JSON.stringify(cards[0]));assert.equal(saved.character,cards[0].character);
});
