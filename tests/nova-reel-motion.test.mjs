import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
function setup(){let now=0,id=0;const tasks=new Map();const win={offsetWidth:100,classList:{add(){},remove(){}},getBoundingClientRect:()=>({width:100,height:90}),append(x){this.layer=x;}};const ctx=vm.createContext({performance:{now:()=>now},requestAnimationFrame:f=>{tasks.set(++id,f);return id},cancelAnimationFrame:i=>tasks.delete(i),document:{createElement:()=>({style:{},children:[],setAttribute(){},append(x){this.children.push(x);this.firstElementChild ||=x;},getBoundingClientRect(){return {height:parseFloat(this.style.height)}},remove(){}})}});vm.runInContext(fs.readFileSync('nova-reel-motion.js','utf8'),ctx);return {a:ctx.NovaReelMotion,win,reel:{querySelector:()=>win},tick(ms){now+=ms;const run=[...tasks.values()];tasks.clear();run.forEach(f=>f(now));}};}
test('normal and reverse land by moving the same strip, without replacing symbols',async()=>{for(const reverse of [false,true]){const t=setup(),strip=['A','B','C','D','E'];t.a.start(0,t.reel,strip,0,reverse,s=>s);const layer=t.win.layer,html=layer.children.map(x=>x.innerHTML);t.tick(55);const start=parseFloat(layer.style.transform.match(/translateY\(([-.\d]+)/)[1]);const done=t.a.stop(0,['C','D','E']);t.tick(100);const moving=parseFloat(layer.style.transform.match(/translateY\(([-.\d]+)/)[1]);assert.ok(reverse?moving<start:moving>start);t.tick(5000);assert.equal(await done,true);assert.equal(t.a.top(0),2);assert.deepEqual(layer.children.map(x=>x.innerHTML),html);t.a.clear(0);assert.equal(t.a.has(0),false);}});
test('reset cancels a queued landing instead of resuming an old spin',async()=>{const t=setup();t.a.start(0,t.reel,['A','B','C'],0,false,s=>s);const pending=t.a.stop(0,['B','C','A']);t.a.clearAll();assert.equal(await pending,false);t.tick(5000);assert.equal(t.a.has(0),false);});

test('every strip completes one revolution in 750ms in either direction',()=>{for(const length of [4,21,30])for(const reverse of [false,true]){const t=setup(),strip=Array.from({length},(_,i)=>String(i));t.a.start(0,t.reel,strip,0,reverse,s=>s);t.tick(375);assert.equal(t.a.top(0),Math.round(length/2));t.tick(375);assert.equal(t.a.top(0),0);assert.equal(t.a.rotationMs,750);t.a.clearAll();}});

test('landing keeps 750ms rotation speed and stops at nearest matching occurrence',async()=>{
 for(const reverse of [false,true]){
  const t=setup(),strip=['A','B','C','A','B','C'];t.a.start(0,t.reel,strip,reverse?1:5,reverse,s=>s);
  let done=false;const p=t.a.stop(0,['A','B','C']).then(v=>{done=v;});
  t.tick(750/6);await Promise.resolve();assert.equal(done,false);assert.equal(t.a.top(0),reverse?2:4);
  t.tick(750/6+.001);await p;assert.equal(done,true);assert.equal(t.a.top(0),3);
 }
});
test('aligned symbols stop immediately with no artificial minimum delay',async()=>{const t=setup();t.a.start(0,t.reel,['A','B','C'],0,false,s=>s);assert.equal(await t.a.stop(0,['A','B','C']),true);t.a.clearAll();});
test('audio clock controls all three reels and lands exactly at 4.4 seconds',()=>{
 const t=setup();let audioTime=0,landed=0;const strip=['A','B','C','D','E'];
 for(let i=0;i<3;i++)t.a.startSynced(i,t.reel,strip,['C','D','E'],true,s=>s,()=>audioTime,4400,()=>landed++);
 t.tick(10000);assert.equal(landed,0);
 audioTime=4.399;t.tick(16);assert.equal(landed,0);
 audioTime=4.4;t.tick(16);assert.equal(landed,3);for(let i=0;i<3;i++)assert.equal(t.a.top(i),2);
 t.tick(1000);assert.equal(landed,3);
});
test('synced reverse begins at stopped position and lands on target without phase jump',()=>{
 const t=setup();let audioTime=0;const strip=['A','B','C','D','E'];
 t.a.startSynced(0,t.reel,strip,['C','D','E'],true,s=>s,()=>audioTime,4400,()=>{},4);
 assert.equal(t.a.top(0),4);audioTime=4.4;t.tick(16);assert.equal(t.a.top(0),2);
});
test('freeze reverse targets twice normal speed while preserving starting and final symbols',()=>{
 const t=setup();let audioTime=0;const strip=Array.from({length:20},(_,i)=>String(i));
 t.a.startSynced(0,t.reel,strip,['0','1','2'],true,s=>s,()=>audioTime,4400,()=>{},0);
 audioTime=.1;t.tick(16);assert.equal(t.a.top(0),5);
 audioTime=4.4;t.tick(16);assert.equal(t.a.top(0),0);
});
