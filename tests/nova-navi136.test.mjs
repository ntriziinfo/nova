import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const c=vm.createContext({});
for(const file of ['nova-bell-navi.js','nova-direct-award.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c);
const n=c.NovaBellNavi,a=c.NovaDirectAward,copy=x=>JSON.parse(JSON.stringify(x));
const spin=result=>({result,stopped:[false,false,false],resolved:{flowBefore:{phase:'art'}}});
test('rare navigation colors and strength hints: weak never doubles, strong splits evenly',()=>{
 for(const [weak,strong,color]of [['WEAK_SUICA','STRONG_SUICA','green'],['CHANCE_A','CHANCE_B','purple'],['WEAK_NOVA','STRONG_NOVA','red']]){
  for(const roll of [0,.49,.5,.99]){
   assert.deepEqual(copy(n.drawRareNavi(spin(weak),()=>roll)),{color,mark:'!'});
   assert.deepEqual(copy(n.drawRareNavi(spin(strong),()=>roll)),{color,mark:roll<.5?'!!':'!'});
  }
 }
 for(const roll of [0,.99])assert.deepEqual(copy(n.drawRareNavi(spin('SUPER_NOVA'),()=>roll)),{color:'red',mark:'!!'});
});
test('rare hints keep ordinary-AT scope and never replace yellow bell orders',()=>{
 for(const role of ['BELL','REPLAY','MISS','BIG','NEBULA'])assert.equal(n.drawRareNavi(spin(role)),null);
 for(const phase of ['normal','cz','strong_cz']){const s=spin('STRONG_SUICA');s.resolved.flowBefore.phase=phase;assert.equal(n.drawRareNavi(s),null);}
 for(const flag of ['zone','entryStage','initialStage','comebackLeft','comebackConfirmed','burstLeft','burstPending']){const s=spin('STRONG_SUICA');s.resolved.flowBefore[flag]=true;assert.equal(n.drawRareNavi(s),null,flag);}
 for(const flag of ['zoneSpin','comebackEvent','burstEvent','bonusPendingAtStart']){const s=spin('CHANCE_B');s.resolved[flag]=true;assert.equal(n.drawRareNavi(s),null,flag);}
 const bonus=spin('SUPER_NOVA');bonus.aTypeBonusActiveAtStart=true;assert.equal(n.drawRareNavi(bonus),null);
 assert.deepEqual(copy(n.stopOrder({...spin('CHANCE_B'),rareNavi:{color:'purple',mark:'!!'}})),[0,1,2]);
 assert.deepEqual(copy(n.stopOrder({...spin('BELL'),bellNaviOrder:[2,0,1]})),[2,0,1]);
});
test('ladder gains retain their model value but do not use the full-reel overlay',()=>{
 for(const zone of ['sosuke','giru','ura_giru'])for(const phase of ['flowBefore','flowAfter']){
  const resolved={zoneAward:250,flowBefore:{phase:'art'},flowAfter:{phase:'art'}};resolved[phase].zone=zone;
  assert.equal(a.amount(resolved),0);assert.equal(resolved.zoneAward,250);
 }
 for(const zone of ['toto','sora','ura_sora','urapi','ouma','ura_ouma'])assert.equal(a.amount({zoneAward:50,flowBefore:{phase:'art',zone}}),50);
 assert.equal(a.amount({atOutcome:{direct:30},flowBefore:{phase:'art'}}),30);
 assert.equal(a.amount({zoneAward:0,flowBefore:{phase:'art',zone:'giru'}}),0);
});
