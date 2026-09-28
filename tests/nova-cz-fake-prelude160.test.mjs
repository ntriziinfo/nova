import test from 'node:test';
import assert from 'node:assert/strict';
import {loadModel} from '../scripts/zone-v2-model.mjs';
loadModel();const n=NovaNormal;
const saved=s=>JSON.parse(JSON.stringify(s));
const sequence=(...rolls)=>()=>rolls.shift()??.99;
const spin=(s,role='BELL',rng=()=>.99,setting=3)=>n.spin(s,{phase:'normal'},setting,{},rng,role);
const fake=(total=5)=>spin({},'WEAK_NOVA',sequence(.99,.1,(total-3)/8+.001));

test('a missed rare role starts a fake at 50%, but ordinary roles do not',()=>{
 for(const roll of [0,.499999,.5,.999999]){
  const t=spin({},'WEAK_NOVA',sequence(.99,roll,.5));
  assert.equal(!!t.state.prelude,roll<.5);assert.equal(t.entry,'');
  if(roll<.5){assert.equal(t.state.prelude.kind,'czFake');assert.equal(t.state.prelude.entry,'');}
 }
 for(const role of ['BELL','REPLAY','MISS'])assert.equal(spin({},role,()=>0).state.prelude,null);
});

test('all fake lengths survive reload, expire without full blackout and never announce CZ',()=>{
 for(let total=3;total<=10;total++){
  let t=fake(total);assert.equal(t.state.prelude.total,total);
  assert.equal(n.normalLabel(t.state),'CZ前兆');
  for(let g=1;g<=total;g++){
   assert.equal(t.entry,'');assert.equal(t.internalBonus,null);assert.equal(t.czPrelude.before,0);
   if(g<total){
    assert([1,2].includes(t.czPrelude.after));assert.equal(t.state.prelude.left,total-g);
    t=spin(saved(t.state));
   }else{
    assert.equal(t.czPrelude.after,0);assert(t.czPrelude.failed);assert.equal(t.state.prelude,null);
    const next=spin(saved(t.state));assert.equal(next.czPrelude,undefined);assert.equal(next.entry,'');
   }
  }
 }
});

test('every rare role retains its real CZ threshold during fake preludes at every setting',()=>{
 for(let setting=1;setting<=6;setting++)for(const level of ['low','high'])for(const role of Object.keys(n.rare)){
  const s={...fake().state,level,highLeft:10};
  const rate=n.roleCzRate(s,role,setting);
  for(const win of [true,false]){
   if(!win&&rate===1)continue;
   // SUICA/chance roles draw the high-state promotion before the CZ lottery.
   const rolls=level==='low'&&['WEAK_SUICA','STRONG_SUICA','CHANCE_A','CHANCE_B'].includes(role)?[.99]:[];
   rolls.push(win?rate-1e-9:rate+1e-9);
   const t=spin(saved(s),role,sequence(...rolls),setting);
   assert.equal(t.czChance,rate);assert.equal(t.state.prelude.kind,win?'cz':'czFake');
   assert.equal(t.state.prelude.total,5);assert.equal(t.state.prelude.left,3);
   if(win)assert.equal(t.state.prelude.entry,role==='STRONG_NOVA'?'STRONG_CZ':'CZ');
  }
 }
});

test('last-game promotion confirms with full blackout and announces on next BET',()=>{
 for(const role of ['WEAK_NOVA','STRONG_NOVA']){
  const s=fake(3).state;s.prelude.left=1;
  let t=spin(saved(s),role,()=>0);
  assert.equal(t.czPrelude.after,3);assert(t.czPrelude.enter);assert.equal(t.czPrelude.failed,undefined);
  assert.equal(t.state.prelude.left,0);assert.equal(t.entry,role==='STRONG_NOVA'?'STRONG_CZ':'CZ');
  const flow=NovaFlow.enterCZ(t.entry==='STRONG_CZ',t.czOptions,()=>.99);
  t=n.spin(saved(t.state),flow,3,{},()=>.99,'BELL');
  assert(t.czPrelude.announce);assert.equal(t.state.prelude,null);assert.equal(t.entry,'');
 }
});

test('fake hints do not count as a guaranteed win or postpone the ceiling',()=>{
 const s=fake(10).state;
 assert.equal(spin(s,'WEAK_NOVA').czChance,n.roleCzRate(s,'WEAK_NOVA',3));
 for(const roll of [.01,.99]){
  let t=spin({...saved(s),games:799},'BELL',()=>roll);
  assert(t.state.ceilingHandled);assert.equal(t.state.impurity,n.defaults.ceilingGain);
  assert.equal(t.state.prelude.kind,roll<.5?'ceilingBonus':'ceilingCz');
  for(let i=0;i<12&&!t.entry&&!t.internalBonus;i++)t=spin(saved(t.state));
  assert(t.entry==='STRONG_CZ'||t.internalBonus);assert.equal(t.state.impurity,n.defaults.ceilingGain);
 }
});

test('premium outcomes and state exits discard fake preludes',()=>{
 const s=fake().state;
 for(const role of ['FREEZE','SUPER_NOVA']){
  const t=spin(saved(s),role);assert.equal(t.state.prelude,null);
  assert(role==='FREEZE'?t.internalBonus.premiumBonus:t.result==='SUPER_NOVA');
 }
 assert.equal(n.afterBonus(s).prelude,null);
 assert.equal(n.afterArt(s,{phase:'art'},{phase:'normal'}).prelude,null);
 assert.equal(n.normalize({prelude:{kind:'fake',presentation:'pre',left:5}}).prelude,null);
});
