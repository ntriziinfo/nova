import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function setup({unavailable=false}={}){
 let now=0,id=0;const native=new Map(),workers=[];
 class Worker{
  constructor(){if(unavailable)throw Error('blocked');this.tasks=new Map();workers.push(this);}
  postMessage(data){this.tasks.delete(data.id);if(data.type==='arm')this.tasks.set(data.id,{...data,due:now+data.delay});}
  terminate(){this.stopped=true;this.tasks.clear();}
 }
 const context=vm.createContext({URL,Worker,document:{currentScript:{src:'https://nova.test/nova-clock.js'}},performance:{now:()=>now},
  setTimeout(fn,ms){native.set(++id,{fn,due:now+ms});return id;},clearTimeout:id=>native.delete(id)});
 vm.runInContext(fs.readFileSync('nova-clock.js','utf8'),context);
 return {clock:context.NovaClock,native,workers,advance(ms,{main=true,worker=true}={}){
  now+=ms;
  if(worker)for(const w of workers)for(const [key,t] of [...w.tasks])if(t.due<=now){w.tasks.delete(key);w.onmessage({data:t});}
  if(main)for(const [key,t] of [...native])if(t.due<=now){native.delete(key);t.fn();}
 }};
}
test('worker continues deadlines when main-thread timers are throttled; duplicate delivery is ignored',()=>{
 const t=setup();t.clock.setBackgroundEnabled(true);let calls=0;
 t.clock.setTimeout(n=>calls+=n,100,3);const native=[...t.native.values()][0],w=t.workers[0],msg=[...w.tasks.values()][0];
 t.advance(99,{main:false});assert.equal(calls,0);t.advance(1,{main:false});assert.equal(calls,3);
 native.fn();w.onmessage({data:msg});assert.equal(calls,3);assert.equal(t.native.size,0);
});
test('enabling AUTO migrates pending deadlines with only the remaining wait',()=>{
 const t=setup();let calls=0;t.clock.setTimeout(()=>calls++,100);t.advance(60);
 t.clock.setBackgroundEnabled(true);t.clock.setBackgroundEnabled(true);assert.equal(t.workers.length,1);
 t.advance(39,{main:false});assert.equal(calls,0);t.advance(1,{main:false});assert.equal(calls,1);
});
test('stopping AUTO terminates worker but preserves pending presentation deadlines on native timers',()=>{
 const t=setup();let calls=0;t.clock.setBackgroundEnabled(true);t.clock.setTimeout(()=>calls++,100);
 const w=t.workers[0],msg=[...w.tasks.values()][0];t.advance(40);t.clock.setBackgroundEnabled(false);
 assert.equal(w.stopped,true);w.onmessage({data:msg});assert.equal(calls,0);
 t.advance(60);assert.equal(calls,1);
});
test('intervals never replay missed ticks and can cancel themselves; stale tokens cannot repeat a tick',()=>{
 const t=setup();t.clock.setBackgroundEnabled(true);let calls=0;
 const id=t.clock.setInterval(()=>{if(++calls===2)t.clock.clearInterval(id);},100);
 const w=t.workers[0],old=[...w.tasks.values()][0];t.advance(60000,{main:false});assert.equal(calls,1);
 w.onmessage({data:old});assert.equal(calls,1);t.advance(99);assert.equal(calls,1);t.advance(1);assert.equal(calls,2);
 t.advance(1000);assert.equal(calls,2);assert.equal(t.native.size,0);assert.equal(w.tasks.size,0);
});
test('cancelled callbacks do not run, including across worker restart',()=>{
 const t=setup();let calls=0;t.clock.setBackgroundEnabled(true);const id=t.clock.setTimeout(()=>calls++,100);
 const w=t.workers[0],msg=[...w.tasks.values()][0];t.clock.clearTimeout(id);
 t.clock.setBackgroundEnabled(false);t.clock.setBackgroundEnabled(true);w.onmessage({data:msg});t.advance(1000);assert.equal(calls,0);
});
test('worker creation and runtime failures leave native timers usable',()=>{
 for(const unavailable of [true,false]){
  const t=setup({unavailable});let calls=0;t.clock.setBackgroundEnabled(true);t.clock.setTimeout(()=>calls++,100);
  if(!unavailable)t.workers[0].onerror();t.advance(100);assert.equal(calls,1);
 }
});
test('actual worker protocol replaces and cancels deadlines',()=>{
 const timers=new Map(),messages=[];let id=0;const ctx=vm.createContext({self:{postMessage:d=>messages.push(d)},
  setTimeout(fn,ms){timers.set(++id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id)});
 vm.runInContext(fs.readFileSync('nova-clock-worker.js','utf8'),ctx);
 const send=data=>ctx.self.onmessage({data});send({type:'arm',id:1,token:10,delay:100});send({type:'arm',id:1,token:11,delay:50});
 assert.equal(timers.size,1);const [key,timer]=[...timers][0];timers.delete(key);timer.fn();assert.equal(messages[0].token,11);
 send({type:'arm',id:2,token:12,delay:100});send({type:'cancel',id:2});assert.equal(timers.size,0);
});
