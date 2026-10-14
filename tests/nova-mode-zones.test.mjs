import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ctx=vm.createContext({});
for(const file of ['nova-tuning.js','nova-decrement.js','nova-art.js','nova-balance.js','nova-flow.js','nova-normal.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
const n=ctx.NovaNormal,f=ctx.NovaFlow,a=ctx.NovaArt;
const spin=(state,flow={phase:'normal'},rng=()=>.99,role='BELL')=>n.spin(state,flow,3,{},rng,role);
test('mode rules: no normal bonus through 100G; 100G real CZ resolves from 101G after save/reload',()=>{
 for(const mode of n.modes){
  for(const g of [0,49,50,98,99])for(const role of ['MISS','STRONG_NOVA','SUPER_NOVA']){
   const t=spin(n.normalize({mode,games:g,fiftyChecked:true}),{phase:'normal'},()=>0,role);
   assert.equal(t.internalBonus,null);assert.notEqual(t.result,'SUPER_NOVA');if(g<99)assert.equal(t.entry,'');
  }
  const t=spin(n.normalize({mode,games:99,fiftyChecked:true}),{phase:'normal'},()=>0);
  assert.equal(t.entry,'CZ');assert.equal(t.czOptions.modePending,true);
  const cz=f.normalize(JSON.parse(JSON.stringify(f.enterCZ(false,t.czOptions,()=>0))));
  assert.equal(cz.success,false);assert.equal(cz.modePending,true);
  const next=spin(n.normalize(JSON.parse(JSON.stringify(t.state))),cz,()=>0);
  assert.equal(next.state.games,101);assert.equal(next.czFlow.success,true);assert.equal(next.czFlow.modePending,false);
 }
});
test('mode fake CZ survives reload and cannot be rescued by a strong rare role',()=>{
 for(const checkpoint of [50,100]){
  let t=spin(n.normalize({mode:'天国',games:checkpoint-1,fiftyChecked:checkpoint===100}),{phase:'normal'},()=>checkpoint===50?0:.999);
  assert.equal(t.czOptions.modeFake,true);
  let cz=f.enterCZ(false,t.czOptions,()=>.5),state=t.state;
  while(cz.phase!=='normal'){
   t=spin(state,f.normalize(JSON.parse(JSON.stringify(cz))),()=>0,'STRONG_NOVA');
   assert.equal(t.internalBonus,null);assert.equal(t.czFlow.success,false);
   state=t.state;cz=f.advance(t.czFlow);
  }
 }
});
test('mode ceilings guarantee BIG even when CZ or a prelude overlaps',()=>{
 for(const [i,mode]of n.modes.entries())for(const flow of [{phase:'normal'},f.enterCZ(false,{czChance:0},()=>.99)]){
  const g=n.ceilings[i],s=n.normalize({mode,games:g-1,fiftyChecked:true,prelude:{kind:'czFake',presentation:'reel',left:5,total:8}});
  const t=spin(s,flow);assert.equal(t.internalBonus.kind,'BIG');assert.match(t.internalBonus.source,/天井/);assert.equal(t.state.games,g);assert.equal(t.state.prelude,null);
 }
});
test('bonus promotion never demotes before AT, resets checkpoints; AT end redraws mode',()=>{
 for(const [i,mode]of n.modes.entries())for(const r of [0,.59,.64,.79,.95,.999]){
  const s=n.normalize({mode,games:190,modeChecked:1,fiftyChecked:true});
  const b=n.afterBonus(s,()=>r,3);assert(n.modes.indexOf(b.mode)>=i);assert.equal(b.games,0);assert.equal(b.modeChecked,0);assert.equal(b.fiftyChecked,false);
  assert.equal(n.bonusEnd(s,'BIG',{phase:'normal'}).mode,mode);
  const end=n.afterArt(s,{phase:'art'},{phase:'normal'},{},()=>r);assert.equal(end.games,0);assert.equal(end.modeChecked,0);assert.equal(end.fiftyChecked,false);
 }
 for(const weights of [n.modeRules.initial,n.modeRules.afterHeaven,n.modeRules.afterLoop,...n.transitions])assert.equal(weights.reduce((sum,v)=>sum+v,0),100);
});
test('overlapping game checkpoint is deferred once and the 50G fake boundary stays 10%',()=>{
 const s=n.normalize({mode:'A',games:199,modeChecked:1,fiftyChecked:true});const cz=f.enterCZ(false,{czChance:0,modeFake:true},()=>.99);cz.remaining=1;
 const first=spin(s,cz),next=spin(first.state,f.advance(first.czFlow),()=>0);
 assert.equal(first.state.modeChecked,1);assert.equal(next.entry,'CZ');assert.equal(next.modeEvent.g,200);assert.equal(next.state.modeChecked,2);
 for(const mode of n.modes)for(const r of [.099,.101])assert.equal(!!spin(n.normalize({mode,games:49}),{phase:'normal'},()=>r).entry,n.modes.indexOf(mode)>=3||r<.1);
});
test('approved setting 3 keeps base and net speed; weak-role zone rates use the adopted allocation',()=>{
 for(let setting=1;setting<=6;setting++){
  const probs=n.normalRoleProbabilities(setting),paid=Object.entries(probs).reduce((sum,[k,p])=>sum+p*(k==='NAVI_BELL'?8:n.pay(k)+a.replayRefund(k)),0);
  assert(Math.abs(50/(3-paid)-30)<1e-9);
  for(const upper of [false,true])assert(Math.abs(Object.entries(a.roleProbabilities(setting,upper)).reduce((sum,[k,p])=>sum+p*a.cashPayout(k),0)-3-(upper?7:4.5))<1e-9);
 }
 for(const role of ['WEAK_SUICA','WEAK_NOVA'])for(const [upper,high,p]of [[false,false,.05625],[false,true,.09375],[true,false,.5175],[true,true,.8625]])assert(Math.abs(a.extraZoneChance(3,role,upper,high,0)-p)<1e-12);
});
