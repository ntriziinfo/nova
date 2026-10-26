import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function setup(){let next=0;const queued=new Map();const ctx=vm.createContext({requestAnimationFrame(fn){queued.set(++next,fn);return next;},cancelAnimationFrame(id){queued.delete(id);},setTimeout});vm.runInContext(fs.readFileSync('nova-frame-clock.js','utf8'),ctx);return {clock:ctx.NovaFrameClock,tick(t){const batch=[...queued.values()];queued.clear();batch.forEach(fn=>fn(t));}};}
for(const hz of [60,120,144,240])test(`${hz}Hz display renders approximately 60 times per second`,()=>{const t=setup();let count=0;function frame(){count++;t.clock.requestAnimationFrame(frame);}t.clock.requestAnimationFrame(frame);for(let n=0;n<hz*2;n++)t.tick(n*1000/hz);assert.ok(count>=119&&count<=121,String(count));});
test('cancelled callbacks do not run, including cancellation within a batch',()=>{const t=setup();let count=0;let second;t.clock.requestAnimationFrame(()=>t.clock.cancelAnimationFrame(second));second=t.clock.requestAnimationFrame(()=>count++);t.tick(0);assert.equal(count,0);});
test('resume uses actual timestamp and does not replay missed frames',()=>{const t=setup();const times=[];function frame(time){times.push(time);t.clock.requestAnimationFrame(frame);}t.clock.requestAnimationFrame(frame);t.tick(0);t.tick(10000);assert.deepEqual(times,[0,10000]);});
