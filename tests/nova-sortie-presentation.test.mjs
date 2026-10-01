import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const load=()=>{const c=vm.createContext({});for(const file of ['nova-sortie-presentation.js','nova-bell-navi.js','nova-spin-resume.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c);return c;};
const strips=[0,1,2].map(i=>['before',`NOVA_${i}_0`,`NOVA_${i}_1`,`NOVA_${i}_2`,'after']);
const plain=v=>JSON.parse(JSON.stringify(v));
const orders=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
test('opening freeze is a cancellable visual hold and cannot mutate the already drawn reward',async()=>{
 const c=load();let finish,cleared=0;
 c.setTimeout=fn=>{finish=fn;return 1;};c.clearTimeout=()=>cleared++;
 const spin={resolved:{researchSortie:{won:true},sortieFreezeUntil:Date.now()+1800,reward:8,flowAfter:{remaining:'200',queuedZones:['sora']}}},before=JSON.stringify(spin);
 vm.runInContext('Math.random=()=>{throw Error("freeze consumed RNG")}',c);
 assert.equal(c.NovaSortie.freezeDelay(spin,spin.resolved.sortieFreezeUntil-900),900);
 const hold=c.NovaSortie.waitFreeze(spin);finish();assert.equal(await hold,true);
 const canceled=c.NovaSortie.waitFreeze(spin);c.NovaSortie.clear();assert.equal(await canceled,false);
 assert.equal(c.NovaSortie.freezeDelay(spin,spin.resolved.sortieFreezeUntil+1),0);
 assert.equal(c.NovaSortie.freezeDelay({resolved:{sortieFreezeUntil:Date.now()+1000}}),0);
 assert.equal(JSON.stringify(spin),before);assert.equal(cleared,2);
});
test('only right-middle-left with an internal win aligns NOVA; every miss shifts the left by one row',()=>{
 const c=load();vm.runInContext('Math.random=()=>{throw Error("presentation consumed RNG")}',c);
 for(const won of [false,true])for(const order of orders){
  const resolved={researchSortie:{won},reward:8,flowAfter:{remaining:'765',queuedZones:won?['sora']:[]}},spin={resolved,auditPressOrder:[]},before=JSON.stringify(resolved),columns=[];
  for(const i of order){spin.auditPressOrder.push(i);const target=c.NovaSortie.target(spin,i,strips);columns[i]=plain(target.column);if(i!==0)assert.equal(target.drop,false);}
  const aligned=columns.every((col,i)=>col.every((v,row)=>v===`NOVA_${i}_${row}`)),expected=won&&order.join()==='2,1,0';
  assert.equal(aligned,expected);assert.deepEqual(columns[0],expected?strips[0].slice(1,4):strips[0].slice(0,3));assert.equal(JSON.stringify(resolved),before);
 }
});
test('AUTO and stop-all override hidden bell order only during sortie',()=>{
 const c=load(),spin={resolved:{researchSortie:{won:false}},bellNaviOrder:[0,1,2]};
 assert.deepEqual(plain(c.NovaBellNavi.stopOrder(spin)),[2,1,0]);delete spin.resolved.researchSortie;
 assert.deepEqual(plain(c.NovaBellNavi.stopOrder(spin)),[0,1,2]);
});
test('reload keeps pressed order, pending miss column, and the internal award',()=>{
 const c=load(),spin={result:'BELL',resolved:{researchSortie:{won:true},reward:8,flowAfter:{queuedZones:['sora']}},grid:[[...Array(3)].map(()=>''),[...Array(3)].map(()=>''),[...Array(3)].map(()=>'')],stopped:[false,true,true],auditPressOrder:[2,1,0]};
 for(let i=0;i<3;i++){const col=c.NovaSortie.target(spin,i,strips).column;for(let r=0;r<3;r++)spin.grid[r][i]=col[r];}
 const restored=c.NovaSpinResume.restore(c.NovaSpinResume.capture(spin),{BELL:{}});
 assert.equal(c.NovaSortie.target(restored,0,strips).aligned,true);assert.equal(restored.resolved.reward,8);assert.deepEqual(plain(restored.resolved.flowAfter.queuedZones),['sora']);
 spin.auditPressOrder=[0,2,1];spin.pendingStopColumns=[c.NovaSortie.target(spin,0,strips).column,null,null];
 const missed=c.NovaSpinResume.restore(c.NovaSpinResume.capture(spin),{BELL:{}});assert.equal(c.NovaSortie.target(missed,0,strips).aligned,false);assert.deepEqual(plain(missed.pendingStopColumns[0]),strips[0].slice(0,3));
});
test('drop uses one forward strip step and can be cancelled on reset',async()=>{
 const c=load();c.performance={now:()=>0};let sync,cleared=0;
 const motion={start(i,reel,strip,top,reverse,html,s){assert.equal(i,0);assert.equal(top,1);assert.equal(reverse,false);assert.equal(s.steps,1);sync=s;},clear(){cleared++;}};
 const done=c.NovaSortie.dropLeft({},strips[0],1,()=>'',motion);sync.done();assert.equal(await done,true);
 const cancelled=c.NovaSortie.dropLeft({},strips[0],1,()=>'',motion);c.NovaSortie.clear();assert.equal(await cancelled,false);assert.equal(cleared,1);
});
