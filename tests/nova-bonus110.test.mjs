import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
for(const file of ['nova-art.js','nova-balance.js','nova-flow.js','nova-normal.js'])vm.runInThisContext(fs.readFileSync(file,'utf8'));
const a=NovaArt,n=NovaNormal;
let seed=110202609;const rng=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
test('all CZ wins produce BIG; bonus ends at exactly 100pt and legacy REG cannot return',()=>{
 for(let setting=1;setting<=6;setting++)for(let i=0;i<100;i++){
  const flow=NovaFlow.enterCZ(false,{czChance:1},rng);flow.remaining=1;
  assert.equal(n.spin({},flow,setting,{},rng,'BELL').internalBonus.kind,'BIG');
 }
 for(const kind of ['BIG','MID','REG']){
  let state={bonusKind:kind,paid:0,bonusArtSets:0};
  for(let i=0;i<7;i++){const pay=a.bonusPayout(state,'BELL');assert.equal(pay,i===6?10:15);state={...state,...a.advanceBonus(state,false,pay),paid:state.paid+pay};}
  assert.equal(state.paid,100);assert.equal(state.bonusPointsRemaining,0);assert.equal(a.bonusPayout(state,'BELL'),0);assert.equal(a.advanceBonus(state,true).bonusArtSets,0);
 }
 assert.equal(a.bonusPayout({paid:140},'BELL'),0);
});
test('tier role probabilities yield 52% and 80% AT chance over a complete BIG for every setting',()=>{
 for(let setting=1;setting<=6;setting++)for(const tier of ['normal','upper']){
  const p=a.bonusRoleProbabilities(setting,tier);
  assert.ok(Object.values(p).every(x=>x>=0&&x<=1));assert.ok(Math.abs(Object.values(p).reduce((s,x)=>s+x,0)-1)<1e-12);
  assert.ok(Math.abs(1-(p.BELL/(p.BELL+p.NEBULA))**7-a.bonusRules[tier].atChance)<1e-12);
 }
 assert.equal(a.drawBonusTier(()=>.09999),'upper');assert.equal(a.drawBonusTier(()=>.1),'normal');
});
test('100000 actual BIGs per tier reproduce AT expectations; shown cue colors retain their confidence',()=>{
 for(const tier of ['normal','upper']){
  let won=0;const colors={blue:[0,0],red:[0,0],rainbow:[0,0]};
  for(let i=0;i<100000;i++){
   let paid=0,hit=false;
   while(paid<100){const result=a.drawBonus(rng,1,tier);paid+=a.bonusPayout({paid},result);hit ||= result==='NEBULA';const aim=a.bonusAim(result,rng);if(aim?.guide){assert.equal(aim.symbol,'nebula');colors[aim.color][0]++;colors[aim.color][1]+=result==='NEBULA';}}
   assert.equal(paid,100);won+=hit;
  }
  assert.ok(Math.abs(won/100000-a.bonusRules[tier].atChance)<.006,`${tier}: ${won/100000}`);
  for(const row of a.aimColors){const [total,hits]=colors[row.color];assert.ok(Math.abs(hits/total-row.hit)<.012,`${tier} ${row.color}`);}
 }
});
test('live bonus resolver uses the same payout cap, NEBULA guide and AT award',()=>{
 const html=fs.readFileSync('jag.html','utf8'),ctx=vm.createContext({NovaArt:a,NovaNormal:n,A_TYPE_MODE:true,session:{bonusKind:'BIG',bonusTier:'upper',paid:90,active:true,phase:'a_type_bonus'},pendingForceResult:'NEBULA',settings:{setting:6},isNovaResult:()=>false});
 for(const name of ['normalizeATypeBonusKind','isATypeBonusActive','aTypeBonusTarget','isATypeBonusComplete','drawATypeBonusResult','resolveATypeBonusOutcome']){
  const source=html.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0];vm.runInContext(source,ctx);
 }
 assert.equal(ctx.normalizeATypeBonusKind('MID'),'BIG');assert.equal(ctx.drawATypeBonusResult(),'NEBULA');
 const win=ctx.resolveATypeBonusOutcome('NEBULA');assert.equal(win.artSetWon,1);assert.equal(win.aim.symbol,'nebula');assert.equal(win.aim.guide,true);
 assert.equal(ctx.resolveATypeBonusOutcome('BELL').reward,10);
 ctx.session.paid=100;assert.equal(ctx.resolveATypeBonusOutcome('NEBULA').artSetWon,0);assert.equal(ctx.isATypeBonusComplete(),true);
});
