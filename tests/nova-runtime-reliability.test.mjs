import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
test('durable save skips unchanged payload but recovers deletion, overwrite and quota errors',()=>{
 const c={};vm.runInNewContext(fs.readFileSync('nova-state-storage.js','utf8'),c);
 const storage=new Map();let fail=false,writes=0;
 const writer=c.NovaStateStorage.create({read:k=>storage.get(k),write:(k,v)=>{if(fail)return false;writes++;storage.set(k,v);return true;}});
 const state={savedAt:100,runtimeState:{pendingSpin:{id:1,stopped:[true,false,false]}}};
 assert.equal(writer.save('resume',state),true);
 for(let i=0;i<100;i++)assert.equal(writer.save('resume',{...state,savedAt:101+i}),true);
 assert.equal(writes,1);assert.equal(JSON.parse(storage.get('resume')).savedAt,100);
 storage.delete('resume');assert.equal(writer.save('resume',state),true);assert.equal(writes,2);
 storage.set('resume','other');assert.equal(writer.save('resume',state),true);assert.equal(writes,3);
 const settled={savedAt:200,runtimeState:{pendingSpin:null},paid:8};fail=true;assert.equal(writer.save('resume',settled),false);
 fail=false;assert.equal(writer.save('resume',settled),true);assert.equal(JSON.parse(storage.get('resume')).paid,8);
 assert.equal(writer.metrics().skips,100);assert.equal(writer.metrics().failures,1);
});
test('wait scopes preserve BET locks and never interpret long audio as permission to release',()=>{
 const c={performance:{now:()=>0}};vm.runInNewContext(fs.readFileSync('nova-runtime-gates.js','utf8'),c);
 const state={},g=c.NovaRuntimeGates;let time=0;g.configure(()=>state,()=>time);
 for(let bits=0;bits<16;bits++){
  ['sortie','ladder','aim','award'].forEach((k,i)=>state[k]=!!(bits&(1<<i)));
  assert.equal(g.busy('bet'),!!bits);assert.equal(g.busy('sortie'),state.sortie);
 }
 state.sortie=true;assert.equal(g.busy('sortie'),true);time=600000;assert.equal(g.busy('sortie'),true);
 state.sortie=state.ladder=state.aim=state.award=false;state.bonusAudio=true;assert.equal(g.busy('bet'),false);assert.equal(g.inspect()[0].key,'bonusAudio');
});
