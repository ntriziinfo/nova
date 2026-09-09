import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';const c=vm.createContext({});for(const f of ['nova-art.js','nova-balance.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);const a=c.NovaArt;const seq=(...xs)=>()=>xs.length>1?xs.shift():xs[0];
test('roulette rare role upgrades to six/giru or ura-giru, seven/sosuke only',()=>{
 for(const [roll,character,id]of [[.1,.1,'giru'],[.1,.9,'ura_giru'],[.9,.1,'sosuke']]){
  const out=a.step({...a.enter(),entryStage:'roulette',pendingZone:'toto'}, {},seq(0,roll,character),'STRONG_NOVA');assert.equal(out.result,'STRONG_NOVA');assert.equal(out.flow.pendingZone,id);
  const saved=a.normalize(JSON.parse(JSON.stringify(out.flow))),s=a.prepareBet(saved,{},()=>.99);assert.deepEqual([...s.ladder],[...a.ladderTables.sosuke[roll<.8?5:6]]);assert.equal(s.rouletteTable,0);
 }
 const no=a.step({...a.enter(),entryStage:'roulette',pendingZone:'toto'}, {},()=>.99);assert.equal(no.flow.rouletteTable,0);
});
test('normal table selection never includes six or seven',()=>{
 for(const id of ['sosuke','giru','ura_giru'])for(let setting=1;setting<=6;setting++)for(let i=0;i<100;i++){
  const s=a.startZone(a.enter(),id,{setting},()=>i/100);assert.ok(a.ladderTables.sosuke.slice(0,5).some(l=>JSON.stringify(l)===JSON.stringify(s.ladder)));
 }
});
test('sora guarantees two sevens, ura sora fills 500 on last non-nebula',()=>{
 let s=a.startZone(a.enter(),'sora');for(let i=0;i<5;i++)s=a.step(s,{},()=>.1,'MISS').flow;assert.equal(s.sevenHits,2);assert.ok(Number(s.award)>=100);
 for(const award of [0,10,100,200,390,490]){const out=a.step({...a.startZone(a.enter(),'ura_sora'),award:String(award),zoneLeft:1}, {},()=>.1,'MISS');assert.equal(out.result,'BIG');assert.ok(Number(out.flow.award)>=500);}
 const reset=a.step({...a.startZone(a.enter(),'ura_sora'),zoneLeft:1},{},()=>.1,'NEBULA');assert.equal(reset.result,'NEBULA');assert.equal(reset.flow.zoneLeft,5);
});
test('urapi has 50 guarantee and zero-game freeze; ura ouma has 500 guarantee',()=>{
 for(const [id,min]of [['urapi',50],['ura_ouma',500]]){
  const out=a.step({...a.startZone(a.enter(),id),zoneLeft:1}, {},()=>.9,'MISS');assert.equal(out.result,'SUPER_NOVA');assert.ok(Number(out.flow.award)>=min);assert.equal(out.flow.oumaPending,true);
 }
 const s={...a.startZone(a.enter(),'urapi'),zoneLeft:3,award:'50',oumaPending:true};const p=a.prepareBet(s,{},()=>.099);assert.equal(p.zero,true);const out=a.step(p,{},()=>.5);assert.equal(out.oumaFreeze,true);assert.equal(out.flow.zoneLeft,3);
 assert.equal(a.prepareBet(s,{},()=>.1).zero,false);
});
