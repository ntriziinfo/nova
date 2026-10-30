import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const report=()=>({schema:'nova-current-rtp/v1',status:'ready',gamesPerSetting:1e9,commit:'a'.repeat(40),modelHash:'b'.repeat(64),conditions:'10億G連続・MY／差枚停止なし',settings:[1,2,3,4,5,6].map(setting=>({setting,rtpPct:94+setting}))});
function harness(){
 const events={},c=vm.createContext({AbortController,setTimeout,clearTimeout,document:{hidden:false,addEventListener:(key,fn)=>events[key]=fn,removeEventListener:key=>delete events[key]},setInterval:fn=>{c.tick=fn;return 1;},clearInterval:()=>{c.tick=null;}});
 vm.runInContext(fs.readFileSync('nova-rtp-client.js','utf8'),c);
 return {c,events};
}
test('a complete current report is required; wrong engine, pending and partial values fail closed',()=>{
 const {c}=harness(),r=report();assert(c.NovaRtpClient.verified(r,r.modelHash));
 for(const change of [r=>r.status='pending',r=>r.modelHash='bad',r=>r.gamesPerSetting=1e8,r=>r.settings.pop(),r=>r.settings[1].setting=1,r=>r.settings[0].rtpPct=NaN,r=>r.conditions='with stop']){
  const bad=report();change(bad);assert.equal(c.NovaRtpClient.verified(bad,r.modelHash),false);
 }
 assert.equal(c.NovaRtpClient.verified(r,'c'.repeat(64)),false);
 r.conditions='2.5億G×4系列合算・MY／差枚停止なし';assert(c.NovaRtpClient.verified(r));
 r.gamesPerSetting=100_000_000;r.conditions='1億G連続・MY／差枚停止なし';assert(c.NovaRtpClient.verified(r));
 r.gamesPerSetting=99_000_000;assert.equal(c.NovaRtpClient.verified(r),false);
});
test('live refresh clears stale data, recovers without reload and coalesces in-flight requests',async()=>{
 const {c,events}=harness();let resolve,calls=0;const updates=[];
 c.fetch=(url,opts)=>{calls++;assert.equal(opts.cache,'no-store');return new Promise(r=>resolve=r);};
 const client=c.NovaRtpClient.start({url:'/rtp.json',expectedModelHash:report().modelHash,onUpdate:r=>updates.push(r)});
 await client.refresh();assert.equal(calls,1);
 resolve({ok:true,json:async()=>report()});await new Promise(r=>setImmediate(r));assert(updates.at(-1));
 for(const data of [{...report(),status:'pending'},{...report(),modelHash:'c'.repeat(64)}]){
  c.fetch=async()=>({ok:true,json:async()=>data});await client.refresh();assert.equal(updates.at(-1),null);
 }
 c.fetch=async()=>{throw Error('offline');};await client.refresh();assert.equal(updates.at(-1),null);
 c.fetch=async()=>({ok:true,json:async()=>report()});await client.refresh();assert(updates.at(-1));
 c.document.hidden=true;const count=updates.length;c.tick();await new Promise(r=>setImmediate(r));assert.equal(updates.length,count);
 c.document.hidden=false;events.visibilitychange();await new Promise(r=>setImmediate(r));assert.equal(updates.length,count+1);
 client.stop();assert.equal(c.tick,null);assert.equal(events.visibilitychange,undefined);
 await client.refresh();assert.equal(updates.length,count+1);
});
