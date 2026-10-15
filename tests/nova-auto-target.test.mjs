import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const c=vm.createContext({});vm.runInContext(fs.readFileSync('nova-super-speed.js','utf8'),c);
const pace=c.NovaSuperSpeed;
const game=fs.readFileSync('nova-game.js','utf8');
const fn=name=>game.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0];

test('eight-hour targets count real BETs only and include recoverable animation time',()=>{
 for(const [paid,games]of [[false,20000],[true,40000]]){
  let now=0,last=null,budget=null;
  for(let i=0;i<=games;i++){
   const profile=i%100<35?(paid?'at':'normalAt'):(paid?'fast':'normal');
   now+=Math.max(pace.remainingWait(last,now,profile),pace.budgetWait(budget,now,profile));
   if(i===games)break;
   last=now;budget=pace.recordBet(budget,now,profile);
   const execution=pace.pacing[profile].periodMs;
   now+=execution+(i%199===0?5000:0);
  }
  assert.ok(Math.abs(now-28800000)<15000,`${games}: ${now}`);
 }
});

test('mode changes discard the previous budget, brief holds are repaid, long suspension stays bounded',()=>{
 let b=pace.recordBet(null,0,'normal');assert.equal(pace.budgetWait(b,500,'normal'),940);
 assert.equal(pace.budgetWait(b,500,'fast'),0);
 b=pace.recordBet(b,500,'fast');assert.equal(b.dueAt,1220);
 assert.equal(pace.budgetWait(b,500,'at'),720,'AT handoff retains paid target');
 b=pace.recordBet(b,5500,'at');assert.equal(b.dueAt,1940);
 b=pace.recordBet(b,3600000,'at');assert.equal(b.dueAt,3600720,'a long pause is not repaid');
 assert.equal(pace.remainingWait(3600000,3600000,'at'),600,'no bursts after stalls');
 for(let i=0;i<100;i++)b=pace.recordBet(b,3600000+(i+1)*5000,'at');
 assert.equal(b.dueAt,b.lastAt-300000+720,'continuous presentation carry remains bounded');
});

test('AUTO STOP clears the pace budget without modifying the game state',()=>{
 const h=vm.createContext({autoPlay:true,autoTimer:null,superFullAuto:true,superSpeedPending:false,autoPacingBudget:{dueAt:1000,periodMs:720},
  normalState:{flow:{remaining:'500'}},setSuperSpeedActive(){},stopAutoWatchdog(){},NovaClock:{setBackgroundEnabled(){}},updateAutoUi(){}});
 vm.runInContext(fn('stopAutoPlay'),h);h.stopAutoPlay();
 assert.equal(h.autoPacingBudget,null);assert.equal(h.autoPlay,false);assert.equal(h.normalState.flow.remaining,'500');
});

test('fixed 50pt Sosuke ending reveals its result without BET, RNG, or an AT role, including saved endings',()=>{
 for(const reloaded of [false,true]){
  let now=1000;const calls=[];
  const pending={flow:{phase:'art',zone:'sosuke',fixed50Zone:true},card:{kind:'zone',character:'sosuke',pt:'50'},started:false};
  const h=vm.createContext({Date:{now:()=>now},normalState:{flow:{phase:'art',remaining:'550',queuedZones:['sora']},ladderAwardPresentation:pending},debugFastSpinActive:false,isSpinning:false,
   NovaLadder:{sync(){calls.push('sync');},award(){calls.push('award');}},playLockedBonusConfirmSound(){calls.push('sound');},sfxOutputVolume:()=>1,
   displayNovaResult(card){calls.push(['result',card.pt]);},persistState(){},updateDisplay(){},scheduleNextAuto(){}});
  vm.runInContext('Math.random=()=>{throw Error("presentation consumed gameplay RNG")}',h);
  vm.runInContext(fn('showFixedSosukeResultIfReady'),h);
  const flow=JSON.stringify(h.normalState.flow);
  assert.equal(h.showFixedSosukeResultIfReady(),true);assert.equal(calls.filter(x=>x==='sound').length,1);
  if(reloaded)h.normalState=JSON.parse(JSON.stringify(h.normalState));
  now=1999;assert(h.showFixedSosukeResultIfReady());assert.equal(calls.filter(x=>Array.isArray(x)).length,0);
  now=2000;assert(h.showFixedSosukeResultIfReady());assert.equal(calls.filter(x=>Array.isArray(x)).length,1);
  assert.equal(h.showFixedSosukeResultIfReady(),false);assert.equal(JSON.stringify(h.normalState.flow),flow);
 }
 const guard=game.indexOf('if(normalState.ladderAwardPresentation?.flow?.fixed50Zone&&showFixedSosukeResultIfReady())');
 const spin=game.indexOf('  async function spin(');
 assert(guard>spin&&guard<game.indexOf('countTotalSpinIfNeeded(aTypeBonusActiveAtSpinStart);',spin));
});
