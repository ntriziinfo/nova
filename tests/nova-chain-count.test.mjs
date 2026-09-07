import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const html=fs.readFileSync('jag.html','utf8'),ctx=vm.createContext({});vm.runInContext(html.match(/  function chainCountStep\([^]*?\n  }/)[0],ctx);
const step=ctx.chainCountStep;
test('one initial hit accumulates bonus and ART net payouts without a 999 cap',()=>{
 const start=step(null,true,100,300);
 assert.equal(start.count,0);
 assert.equal(step(start.state,true,250,360).count,90);
 assert.equal(step(start.state,true,2500,700).count,2000);
 const resumed=JSON.parse(JSON.stringify(start.state));assert.equal(step(resumed,true,2500,700).count,2000);
});
test('normal return resets the chain and a fresh hit starts at zero',()=>{
 const old=step(null,true,100,300).state;
 const end=step(old,false,2500,700);assert.equal(end.state,null);assert.equal(end.count,0);
 const fresh=step(end.state,true,2600,900);assert.equal(fresh.count,0);
 assert.equal(step(fresh.state,true,2616,906).count,10);
});
test('losses display zero but remain in the net calculation, and reset totals discard stale baselines',()=>{
 const base=step(null,true,100,300).state;
 assert.equal(step(base,true,100,310).count,0);assert.equal(step(base,true,116,313).count,3);
 assert.equal(step(base,true,0,0).count,0);
});
