import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('monitor uses game visual styles without loading the game, audio or storage',()=>{
  const game=fs.readFileSync('jag.html','utf8'),mirror=fs.readFileSync('nova-monitor.html','utf8');
  for(const match of game.matchAll(/<link rel="stylesheet" href="([^"]+)"/g))if(!match[1].startsWith('nova-mobile'))assert.ok(mirror.includes(match[1]),match[1]);
  const scripts=[...mirror.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1].split('?')[0]);
  assert.deepEqual(scripts,['nova-monitor-renderer.js']);
  const renderer=fs.readFileSync(scripts[0],'utf8');
  assert.doesNotMatch(renderer,/localStorage|sessionStorage|Math\.random|__jag|fetch\(/);
  assert.match(mirror,/connect-src 'none'/);
});
test('publisher stays dormant outside NEBULA and ignores credentials from other windows/origins',async()=>{
  const sent=[],uploads=[],listeners=new Map(),scheduled=[];
  const parent={postMessage:(...a)=>sent.push(a)};
  const context={window:{parent,addEventListener:(k,v)=>listeners.set(k,v),removeEventListener:k=>listeners.delete(k)},
    URL,Date,AbortController,setTimeout:fn=>(scheduled.push(fn),scheduled.length),clearTimeout:()=>{},
    fetch:async(...args)=>{uploads.push(args);return {status:200};},
    document:{getElementById:()=>null},Math:{random:()=>{throw Error('game RNG used');}}};
  vm.runInNewContext(fs.readFileSync('nova-monitor-publisher.js','utf8'),context);
  const p=context.window.NovaMonitorPublisher;
  p.start({enabled:false});assert.equal(sent.length,0);assert.equal(scheduled.length,0);
  p.start({enabled:true,server:'https://nebula-control.vercel.app',machineId:'one',sessionId:'session',canPublish:()=>true});
  assert.equal(sent.length,1);
  const credentials={type:'nova-monitor-session',machineId:'one',sessionId:'session',token:'private'};
  listeners.get('message')({source:{},origin:'https://nebula-control.vercel.app',data:credentials});await scheduled.pop()();assert.equal(sent.length,2);
  listeners.get('message')({source:parent,origin:'https://attacker.invalid',data:credentials});await scheduled.pop()();assert.equal(sent.length,3);
  listeners.get('message')({source:parent,origin:'https://nebula-control.vercel.app',data:credentials});await scheduled.pop()();assert.equal(sent.length,3);
  assert.equal(uploads.length,0);p.close();assert.equal(listeners.size,0);
});
