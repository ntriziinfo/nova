import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
function setup(){const events={},timers=new Map();let id=0;const c={document:{hidden:false,addEventListener(n,f){events[n]=f;}},setTimeout(f,ms){timers.set(++id,{f,ms});return id;},clearTimeout(i){timers.delete(i);},Math:Object.assign(Object.create(Math),{random(){throw Error('gameplay RNG');}})};vm.createContext(c);vm.runInContext(fs.readFileSync('nova-presentation-resources.js','utf8'),c);return {c,api:c.NovaPresentation,events,timers};}
const flush=()=>new Promise(r=>setImmediate(r));
function video(play){return {hidden:false,paused:true,calls:0,events:{},addEventListener(n,f){this.events[n]=f;},pause(){this.paused=true;},play(){this.calls++;return play.call(this);}};}
test('pending playback is deduplicated; stopped cue never resumes from late resolution',async()=>{const t=setup();let finish;const v=video(function(){return new Promise(r=>finish=()=>{this.paused=false;r();});});t.api.play(v);t.api.play(v);assert.equal(v.calls,1);t.api.stop(v);finish();await flush();assert.equal(v.paused,true);v.events.canplay();assert.equal(v.calls,1);});
test('failed loop retries with a bound, then user gesture can recover',async()=>{const t=setup();let reject=true;const v=video(function(){if(reject)return Promise.reject(Error('blocked'));this.paused=false;return Promise.resolve();});t.api.play(v);for(let n=0;n<3;n++){await flush();for(const [id,x]of [...t.timers]){t.timers.delete(id);x.f();}}assert.equal(v.calls,3);reject=false;t.events.pointerdown();await flush();assert.equal(v.calls,4);assert.equal(v.paused,false);});
test('background tab pauses decoding and resumes only still-wanted loops',async()=>{const t=setup();let wanted=true;const v=video(function(){this.paused=false;return Promise.resolve();});t.api.play(v,()=>wanted);await flush();t.c.document.hidden=true;t.events.visibilitychange();assert.equal(v.paused,true);t.c.document.hidden=false;t.events.visibilitychange();await flush();assert.equal(v.calls,2);wanted=false;t.c.document.hidden=true;t.events.visibilitychange();t.c.document.hidden=false;t.events.visibilitychange();assert.equal(v.calls,2);});
test('warm queue deduplicates and starts at most two jobs concurrently',async()=>{const t=setup(),done=[];let active=0,max=0;for(let i=0;i<5;i++)t.api.warm('x'+i,()=>{active++;max=Math.max(max,active);return new Promise(r=>done.push(()=>{active--;r();}));});t.api.warm('x0',()=>{throw Error('duplicate');});for(const [id,x]of [...t.timers])if(x.ms===100){t.timers.delete(id);x.f();}assert.equal(active,2);while(done.length){done.shift()();await flush();for(const [id,x]of [...t.timers])if(x.ms===0){t.timers.delete(id);x.f();}}assert.equal(max,2);assert.equal(active,0);});

test('cold aim video prepares a frame without autoplay; errors/timeouts release the warm slot',async()=>{
 for(const end of ['loadeddata','error','timeout']){
  const t=setup(),v=video(function(){throw Error('must not play');});let loads=0;
  Object.assign(v,{readyState:0,networkState:0,preload:'none',load(){loads++;},removeEventListener(n){delete this.events[n];}});
  t.api.warmVideo(v);t.api.warmVideo(v);
  for(const [id,x]of [...t.timers])if(x.ms===100){t.timers.delete(id);x.f();}
  assert.equal(v.preload,'auto');assert.equal(loads,1);assert.equal(v.calls,0);assert.equal(v.paused,true);
  if(end==='timeout'){for(const [id,x]of [...t.timers])if(x.ms===6000){t.timers.delete(id);x.f();}}else v.events[end]();
  await flush();assert.deepEqual(v.events,{});assert.equal([...t.timers.values()].some(x=>x.ms>=6000),false);
 }
});
test('warming never reloads playback that started before the idle job, or a ready frame',()=>{
 for(const playing of [false,true]){
  const t=setup(),v=video(()=>Promise.resolve());Object.assign(v,{paused:!playing,readyState:playing?0:2,load(){throw Error('must not reload');}});
  t.api.warmVideo(v);for(const [id,x]of [...t.timers])if(x.ms===100){t.timers.delete(id);x.f();}
  assert.equal(v.calls,0);assert.equal(v.paused,!playing);
 }
});

test('short buffered cues reuse bytes locally; a late preload never replaces a playing cue',async()=>{
 for(const late of [false,true]){
  const t=setup(),v=video(()=>Promise.resolve());let deliver,created=0,loads=0;
  Object.assign(v,{src:'cue.mp4',hidden:true,readyState:0,networkState:0,getAttribute(){return this.src;},load(){loads++;this.networkState=2;},removeEventListener(n){delete this.events[n];}});
  Object.assign(t.c,{AbortController,fetch:()=>new Promise(r=>deliver=r),URL:{createObjectURL(blob){assert.equal(blob,'clip');created++;return 'blob:cue';}}});
  t.api.warmVideo(v,{buffer:true});
  for(const [id,x]of [...t.timers])if(x.ms===100){t.timers.delete(id);x.f();}
  if(late){v.hidden=false;v.paused=false;}
  deliver({ok:true,blob:async()=>'clip'});await flush();
  assert.equal(created,late?0:1);assert.equal(loads,late?0:1);assert.equal(v.src,late?'cue.mp4':'blob:cue');assert.equal(v.calls,0);
  if(!late)v.events.loadeddata();await flush();assert.equal([...t.timers.values()].some(x=>x.ms>=1000),false);
 }
});
test('buffer fetch timeout falls back to the original video without blocking later cues',async()=>{
 const t=setup(),v=video(()=>Promise.resolve());let aborted=false;
 Object.assign(v,{src:'cue.mp4',hidden:true,readyState:0,networkState:0,getAttribute(){return this.src;},load(){this.networkState=2;},removeEventListener(n){delete this.events[n];}});
 Object.assign(t.c,{AbortController,fetch:(src,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>{aborted=true;reject(Error('timeout'));})),URL:{createObjectURL(){throw Error('no blob on failure');}}});
 t.api.warmVideo(v,{buffer:true});
 for(const [id,x]of [...t.timers])if(x.ms===100){t.timers.delete(id);x.f();}
 for(const [id,x]of [...t.timers])if(x.ms===5000){t.timers.delete(id);x.f();}await flush();
 assert.equal(aborted,true);assert.equal(v.src,'cue.mp4');assert.equal(v.preload,'auto');assert.equal(v.calls,0);
 v.events.loadeddata();await flush();assert.equal([...t.timers.values()].some(x=>x.ms>=1000),false);
});
