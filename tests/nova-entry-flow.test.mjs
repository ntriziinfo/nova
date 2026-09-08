import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const ctx=vm.createContext({});for(const f of ['nova-art.js','nova-flow.js','nova-balance.js','nova-normal.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);const a=ctx.NovaArt;
test('bonus targets are 150 and 75',()=>{assert.equal(a.bonusTarget('BIG'),150);assert.equal(a.bonusTarget('MID'),75)});
test('ART win freezes quota, then red seven, roulette, announcement, zone',()=>{
 let s={...a.enter(),remaining:'5'};
 s=a.step(s,{big:1,zone:0},()=>0,'STRONG_NOVA').flow;
 assert.equal(s.entryStage,'seven');assert.equal(s.remaining,'5');assert.equal(s.zone,'');
 s=a.normalize(JSON.parse(JSON.stringify(s)));
 let r=a.step(s,{},()=>.5);s=r.flow;assert.equal(r.result,'BIG');assert.equal(r.zoneSpin,true);assert.equal(r.internalBonus,undefined);assert.equal(s.entryStage,'roulette');assert.equal(s.remaining,'5');
 s=a.step(a.normalize(JSON.parse(JSON.stringify(s))),{},()=>.5).flow;assert.equal(s.entryStage,'confirmed');assert.equal(s.zone,'');assert.equal(s.remaining,'5');
 s=a.prepareBet(s,{},()=>.5);assert.equal(s.zone,'sosuke');assert.equal(s.zoneLeft,3);assert.equal(s.entryStage,'');assert.equal(s.remaining,'5');
 s=a.prepareBet(s,{},()=>.5);assert.equal(s.zoneLeft,3);
});
test('CZ success always goes to a bonus even with legacy direct ART setting',()=>{
 for(const roll of [.1,.8]){let f=ctx.NovaFlow.enterCZ(false,{},()=>0);f.remaining=1;f.success=true;
 const t=ctx.NovaNormal.spin({},f,1,{art:{czArt:1}},()=>roll,'MISS');assert.equal(t.direct,false);assert.ok(['BIG','MID'].includes(t.internalBonus.kind));}
});
