import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
for(const f of ['nova-art.js','nova-balance.js','nova-flow.js','nova-normal.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));
const a=NovaArt,n=NovaNormal;
test('rare roles and hundred boundary never add impurity',()=>{
 for(const role of [...Object.keys(n.rare),'MISS'])assert.equal(n.advance({games:99,impurity:25},role,{phase:'normal'},{hundredGain:99},()=>0).impurity,25);
});
test('ceiling rescue reaches cap before bonus claim',()=>{
 for(const [state,gain]of [[{mode:'特殊',games:199},1],[{mode:'天国',games:99},1],[{mode:'天国準備',games:299},5],[{games:599},10]])assert.equal(n.spin(state,{phase:'normal'},1,{},()=>.99,'MISS').state.impurity,gain);
 const t=n.spin({games:599,impurity:95},{phase:'normal'},1,{},()=>.99,'MISS');
 assert.equal(t.state.impurity,100);assert.equal(n.claim(t.state,false,()=>.5).sets,1);
});
test('bonus failure and consecutive REG stack, BIG resets streak, AT preserves streak',()=>{
 let s=n.bonusEnd({},'MID',{phase:'normal'});assert.equal(s.impurity,2);assert.equal(s.regStreak,1);
 s=n.bonusEnd(n.normalize(JSON.parse(JSON.stringify(s))),'MID',{phase:'normal'});assert.equal(s.impurity,6);
 s=n.bonusEnd(s,'MID',{phase:'art'});assert.equal(s.impurity,8);
 s=n.bonusEnd(s,'BIG',{phase:'art'});assert.equal(s.regStreak,0);assert.equal(s.impurity,8);
});
test('only single initial AT without rewards gains dry rescue',()=>{
 const end=s=>{let before;while(s.phase==='art'){before=s;s=a.step(s,{},()=>.99,'BELL').flow;}return n.afterArt({},before,s).impurity;};
 assert.equal(end(a.afterBonus(null,{},1)),2);
 assert.equal(end(a.afterBonus(null,{},2)),0);
 let s=a.step(a.enter(),{},()=>0,'WEAK_SUICA').flow;assert.equal(end(s),0);
 s=a.settleZone(a.startZone(a.enter(),'sosuke'));assert.equal(end(s),0);
 assert.equal(end(a.normalize(JSON.parse(JSON.stringify(a.enter())))),2);
});
