import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ctx=vm.createContext({Date});vm.runInContext(fs.readFileSync('nova-audit.js','utf8'),ctx);const {makeRecord}=ctx.NovaAudit;
const state=(game,bet,paid,flow={phase:'art',remaining:'300',atLevel:1})=>({run:'test',game,bet,paid,flow,bonus:{active:false},internal:{},setting:6});

test('audit distinguishes quota rewards from actual payouts, including free BET and same-G events',()=>{
 const meta={id:'test',seq:0,last:state(10,30,50)};
 const award=makeRecord(meta,state(11,33,50,{phase:'art',remaining:'2300',atLevel:4,burstType:'points'}),{result:'NEBULA',burstEvent:'success',burstReward:{type:'points',points:2000,level:4,promoted:true}});
 assert.equal(award.paid,0);assert.equal(award.bet,3);assert.equal(award.net,17);assert(award.notes.some(n=>n.includes('2')&&n.includes('報酬')));
 meta.seq=award.seq;meta.last=award.state;
 const free=makeRecord(meta,state(11,33,65,award.state.flow),{result:'BELL'});assert.equal(free.game,11);assert.equal(free.seq,2);assert.equal(free.bet,0);assert.equal(free.paid,15);
});

test('both challenge success/failure and AT lifecycle are included in important events',()=>{
 for(const type of ['points','ura'])for(const event of ['success','failure']){
  const r=makeRecord({id:'t',seq:1,last:state(1,3,0)},state(2,6,0,{phase:'art',burstType:type}),{burstEvent:event});assert(r.important);assert(r.notes.some(n=>n.includes(event==='success'?'成功':'失敗')));
 }
 const end=makeRecord({id:'t',seq:1,last:state(1,3,0)},state(2,6,0,{phase:'normal'}),{});assert(end.notes.includes('AT終了'));
});

test('restoring older gameplay marks a gap instead of negative payout or BET',()=>{
 const r=makeRecord({id:'t',seq:8,last:state(100,300,400)},state(90,270,300),{kind:'checkpoint'});assert(r.boundary);assert.equal(r.bet,0);assert.equal(r.paid,0);assert(r.notes.some(n=>n.includes('復元境界')));
});

test('guided internal hits can be distinguished from missed visual stops and BET freeze decisions',()=>{
 const a=state(1,3,0,{phase:'art',zone:'ouma',oumaPending:true,award:'100'}),b=state(1,3,0,{phase:'art',zone:'ouma',oumaPending:false,zero:true,award:'100'});
 const freeze=makeRecord({id:'test',seq:1,last:a},b,{kind:'checkpoint'});assert(freeze.notes.some(n=>n.includes('フリーズ当選')));
 const miss=makeRecord({id:'test',seq:2,last:b},state(2,6,0),{result:'BIG',aim:{symbol:'seven',color:'red',result:'BIG'},visualResult:'MISS'});
 assert(miss.notes.some(n=>n.includes('狙え red')&&n.includes('内部BIG')&&n.includes('停止結果MISS')));
});

test('manual and fast result committers, BIG transitions and 0G misses all feed the independent audit',()=>{
 const html=fs.readFileSync('jag.html','utf8');
 for(const name of ['applyNormalResult','applyResult','startBonusSessionNow','finishSession']){const start=html.indexOf('  function '+name+'('),end=html.indexOf('\n  function ',start+10);assert.match(html.slice(start,end),/finally\{auditCapture\(/);}
 assert.match(html,/burstReward:artStep\?\.burstReward/);assert.match(html,/kind:'zero-failure'/);assert.match(html,/setupPlayAudit\(\);/);
 const source=fs.readFileSync('nova-audit.js','utf8');assert.doesNotMatch(source,/Math\.random|NovaArt\.step|NovaFlow\.step/);
});
