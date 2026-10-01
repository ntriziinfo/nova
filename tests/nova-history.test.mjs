import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('nova-game.js','utf8');
const fn=name=>source.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0];
const ctx=vm.createContext({});vm.runInContext(fs.readFileSync('nova-history.js','utf8')+'\n'+fn('reduceSlumpPoints'),ctx);
const history=ctx.NovaHistory,reduce=ctx.reduceSlumpPoints,max=20000;
const plain=v=>JSON.parse(JSON.stringify(v));
const extrema=points=>({slumpHigh:Math.max(0,...points.map(p=>Number(p.profit)||0)),slumpLow:Math.min(0,...points.map(p=>Number(p.profit)||0))});
function legacyNormalize(stats){
 const points=(Array.isArray(stats.slumpHistory)?stats.slumpHistory:[]).map(p=>({spin:Math.max(0,Number(p&&p.spin)||0),profit:Number(p&&p.profit)||0})).filter(p=>Number.isFinite(p.profit));
 if(!points.length||points[0].spin!==0||points[0].profit!==0)points.unshift({spin:0,profit:0});
 points.sort((a,b)=>a.spin-b.spin);const unique=[];
 for(const p of points){if(unique.at(-1)?.spin===p.spin)unique.at(-1).profit=p.profit;else unique.push(p);}
 stats.slumpHistory=unique.length>max?reduce(unique,15000):unique;Object.assign(stats,extrema(stats.slumpHistory));
}
function legacyRecord(stats,spin,profit){
 legacyNormalize(stats);const last=stats.slumpHistory.at(-1);
 if(last?.spin===spin){if(last.profit===profit)return false;last.profit=profit;}else stats.slumpHistory.push({spin,profit});
 if(stats.slumpHistory.length>max)stats.slumpHistory=reduce(stats.slumpHistory,15000);
 Object.assign(stats,extrema(stats.slumpHistory));return true;
}
test('history matches previous normalization, repeated BET/settlement, backwards spin and reset',()=>{
 const legacy={slumpHistory:[null,{spin:2,profit:15},{spin:-1,profit:2},{spin:'1',profit:-3},{spin:2,profit:5},{spin:3,profit:Infinity}]};
 const fast={slumpHistory:legacy.slumpHistory.map(p=>p&&{...p})};
 for(let i=0;i<600;i++){
  const spin=i<500?Math.floor(i/3):Math.floor((i-500)/3),profit=Math.round(Math.sin(i)*4000);
  assert.equal(history.record(fast,spin,profit,reduce,max),legacyRecord(legacy,spin,profit));
  assert.deepEqual(plain(fast),plain(legacy));
  if(i===550){fast.slumpHistory=[];legacy.slumpHistory=[];}
 }
});
test('replacing the last extreme can decrease the maximum or increase the minimum',()=>{
 const stats={slumpHistory:[{spin:0,profit:0},{spin:1,profit:10}]};
 for(const profit of [500,2,-500,-1,0]){
  history.record(stats,1,profit,reduce,max);
  assert.equal(stats.slumpHigh,Math.max(0,profit));assert.equal(stats.slumpLow,Math.min(0,profit));
 }
});
test('30000 spins retain the previous graph reduction and every intermediate extreme',()=>{
 const stats={slumpHistory:[{spin:0,profit:0}]};let expected=[{spin:0,profit:0}];
 for(let spin=1;spin<=30000;spin++){
  const profit=Math.round(Math.sin(spin/83)*5000+Math.cos(spin/7)*1500);
  history.record(stats,spin,profit,reduce,max);expected.push({spin,profit});
  if(expected.length>max)expected=reduce(expected,15000);
  if(spin%1000===0){assert.deepEqual(plain(stats.slumpHistory),plain(expected));assert.deepEqual({slumpHigh:stats.slumpHigh,slumpLow:stats.slumpLow},extrema(expected));}
 }
});
test('cached full/compact JSON stays equivalent and fresh through tail updates, append, reload and reset',()=>{
 let stats={totalPaid:123,slumpHistory:Array.from({length:1000},(_,spin)=>({spin,profit:spin?spin-500:0}))};
 const value=()=>({savedAt:Date.now(),settings:{title:'quote"\\\n統計'},stats,runtimeState:{stopped:[true,false,false]}});
 const verify=()=>{const v=value();assert.deepEqual(JSON.parse(history.stringify(v)),plain(v));const compact=history.compact(stats,reduce);assert.deepEqual(plain(compact.slumpHistory),plain(reduce(stats.slumpHistory,450)));assert.deepEqual(JSON.parse(history.stringify({...v,stats:compact})),plain({...v,stats:compact}));};
 history.normalize(stats,reduce,max);verify();const cached=history.compact(stats,reduce).slumpHistory;
 assert.equal(history.compact(stats,reduce).slumpHistory,cached);
 for(let i=0;i<3;i++){history.record(stats,999,2000+i,reduce,max);stats.totalPaid++;verify();}
 history.record(stats,1000,-5000,reduce,max);verify();stats=plain(stats);verify();
 stats={slumpHistory:[]};const resetValue=value();assert.deepEqual(JSON.parse(history.stringify(resetValue)),plain(resetValue));
 for(const v of [{stats:{slumpHistory:[]}},{settings:{}},{stats:{}},{stats:{slumpHistory:null}}])assert.deepEqual(JSON.parse(history.stringify(v)),plain(v));
});
test('recording retains progress/decrement observation order and only renders changed points',()=>{
 const calls=[];let profit=10;
 const c=vm.createContext({stats:{totalSpins:1,slumpHistory:[]},A_TYPE_MODE:true,SLUMP_MAX_HISTORY_POINTS:max,NovaHistory:history,reduceSlumpPoints:reduce,
  currentProfit:()=>profit,syncNovaProgress:()=>calls.push('sync'),NovaProgress:{observeNet:p=>calls.push(['net',p])},NovaDecrement:{observe:p=>calls.push(['decrement',p])},scheduleSlumpGraphRender:()=>calls.push('render')});
 vm.runInContext(fn('recordSlumpPoint'),c);
 c.recordSlumpPoint(false);c.recordSlumpPoint(true);profit=12;c.recordSlumpPoint(true);
 assert.deepEqual(calls,['sync',['net',10],'render','sync',['net',10],['decrement',10],'sync',['net',12],['decrement',12],'render']);
 assert.doesNotMatch(fs.readFileSync('nova-history.js','utf8'),/Math\.random|NovaArt|NovaFlow|NovaDecrement/);
});
