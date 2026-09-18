import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {loadModel} from '../scripts/zone-v2-model.mjs';
import {xoshiro128} from '../scripts/zone-v2-rng.mjs';
loadModel();const a=NovaArt;

test('only secured-AT bonus stock odds change; first AT odds and bonus payouts stay identical',()=>{
 for(let setting=1;setting<=6;setting++)for(const tier of ['normal','upper']){
  const before=a.bonusRoleProbabilities(setting,tier),stock=a.bonusRoleProbabilities(setting,tier,true),factor=a.bonusStockFactor(setting);
  assert.ok(factor>0&&factor<1);
  assert.ok(Math.abs(1-(before.BELL/(before.BELL+before.NEBULA))**4-a.bonusRules[tier].atChance)<1e-12);
  assert.equal(stock.BELL,before.BELL);assert.equal(stock.REPLAY,before.REPLAY);
  assert.equal(stock.NEBULA,before.NEBULA*factor);
  assert.ok(Math.abs(stock.NEBULA+stock.MISS-before.NEBULA-before.MISS)<1e-12);
  assert.ok(Math.abs(Object.values(stock).reduce((s,p)=>s+p,0)-1)<1e-12);
 }
});

test('secured status derives from saved bonus wins or an existing AT, including initial wait and comeback',()=>{
 assert.equal(a.bonusStockEligible({bonusArtSets:0},{phase:'normal'}),false);
 assert.equal(a.bonusStockEligible({bonusArtSets:1},{phase:'normal'}),true);
 const saved=JSON.parse(JSON.stringify({bonusArtSets:2,paid:30}));assert.equal(a.bonusStockEligible(saved,{phase:'normal'}),true);
 for(const flow of [a.enter({},()=>.5),a.enterInitial({},()=>.5),a.beginComeback(a.enter({},()=>.5))])assert.equal(a.bonusStockEligible({bonusArtSets:0},flow),true);
});

test('an entire BIG switches to reduced odds only after its first win and retains 52/80% entry',()=>{
 for(const tier of ['normal','upper']){
  const rng=xoshiro128(146+tier),trials=50000;let wins=0,extras=0;
  for(let i=0;i<trials;i++){
   let state={paid:0,bonusArtSets:0};
   while(state.paid<50){
    const role=a.drawBonus(rng,6,tier,a.bonusStockEligible(state,{phase:'normal'})),pay=a.bonusPayout(state,role);
    state={...state,...a.advanceBonus(state,role==='NEBULA',pay),paid:state.paid+pay};
   }
   wins+=state.bonusArtSets>0;extras+=Math.max(0,state.bonusArtSets-1);
  }
  const p=a.bonusRoleProbabilities(6,tier),expected=(4*p.NEBULA/p.BELL-a.bonusRules[tier].atChance)*a.bonusStockFactor(6);
  assert.ok(Math.abs(wins/trials-a.bonusRules[tier].atChance)<.008);
  assert.ok(Math.abs(extras/trials-expected)<.018);
 }
});

test('reduced stock guides retain blue/red/rainbow confidence and half of misses remain guided',()=>{
 for(const setting of [1,6])for(const tier of ['normal','upper']){
  const rng=xoshiro128(146+setting+tier),counts={blue:[0,0],red:[0,0],rainbow:[0,0]};let misses=0,guidedMisses=0;
  for(let i=0;i<250000;i++){
   const role=a.drawBonus(rng,setting,tier,true),aim=a.bonusAim(role,rng,setting,true);
   if(role==='MISS'){misses++;guidedMisses+=!!aim.guide;}
   if(aim?.guide){counts[aim.color][0]++;counts[aim.color][1]+=role==='NEBULA';}
  }
  for(const {color,hit} of a.aimColors){const [n,w]=counts[color];assert.ok(n>100);assert.ok(Math.abs(w/n-hit)<.025,`${setting}/${tier}/${color}: ${w/n}`);}
  assert.ok(Math.abs(guidedMisses/misses-.5)<.015);
 }
});

test('live bonus draw and aim use the same secured state; forced stock wins still work',()=>{
 const html=fs.readFileSync('jag.html','utf8'),ctx=vm.createContext({NovaArt:a,NovaNormal,A_TYPE_MODE:true,
  session:{bonusKind:'BIG',bonusTier:'normal',bonusArtSets:1,paid:30,active:true,phase:'a_type_bonus'},
  normalState:{flow:{phase:'normal'}},pendingForceResult:'',settings:{setting:1},isNovaResult:()=>false});
 for(const name of ['normalizeATypeBonusKind','isATypeBonusActive','aTypeBonusTarget','isATypeBonusComplete','drawATypeBonusResult','resolveATypeBonusOutcome'])vm.runInContext(html.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0],ctx);
 const old=a.bonusRoleProbabilities(1).NEBULA,reduced=a.bonusRoleProbabilities(1,'normal',true).NEBULA;
 vm.runInContext('Math.random=()=>'+((old+reduced)/2),ctx);
 assert.equal(ctx.drawATypeBonusResult(),'MISS');ctx.session.bonusArtSets=0;assert.equal(ctx.drawATypeBonusResult(),'NEBULA');
 ctx.normalState.flow={phase:'art'};assert.equal(ctx.drawATypeBonusResult(),'MISS');
 ctx.pendingForceResult='NEBULA';assert.equal(ctx.drawATypeBonusResult(),'NEBULA');assert.equal(ctx.resolveATypeBonusOutcome('NEBULA').artSetWon,1);
});
