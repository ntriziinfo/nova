import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context=vm.createContext({});vm.runInContext(fs.readFileSync('nova-bell-navi.js','utf8'),context);
const n=context.NovaBellNavi,copy=x=>JSON.parse(JSON.stringify(x));
const bell=()=>({result:'BELL',resolved:{flowBefore:{phase:'art'}}});
test('AT bell nav has all six equally sized random stop-order intervals',()=>{
 const drawn=[];
 for(let i=0;i<6;i++){
  const order=copy(n.drawOrder(()=>(i+.5)/6));assert.deepEqual(order.slice().sort(),[0,1,2]);drawn.push(order.join(''));
 }
 assert.equal(new Set(drawn).size,6);
});
test('bell nav only applies during ordinary AT, never over zone, initial or bonus presentations',()=>{
 assert(n.eligible(bell()));
 for(const result of ['REPLAY','MISS','BIG','SUPER_NOVA'])assert(!n.eligible({...bell(),result}));
 for(const phase of ['normal','cz','strong_cz'])assert(!n.eligible({result:'BELL',resolved:{flowBefore:{phase}}}));
 for(const flag of ['zone','entryStage','initialStage','comebackLeft','comebackConfirmed','burstPending','burstLeft']){
  const s=bell();s.resolved.flowBefore[flag]=true;assert(!n.eligible(s),flag);
 }
 for(const flag of ['zoneSpin','bonusPendingAtStart','comebackEvent','burstEvent']){
  const s=bell();s.resolved[flag]=true;assert(!n.eligible(s),flag);
 }
 assert(!n.eligible({...bell(),aTypeBonusActiveAtStart:true}));
});
test('AUTO and takeover reuse the committed nav order without another random draw',()=>{
 const spin={...bell(),bellNaviOrder:[1,2,0],stopped:[false,true,false]};
 const order=n.stopOrder(spin);assert.deepEqual(copy(order),[1,2,0]);order[0]=0;assert.deepEqual(spin.bellNaviOrder,[1,2,0]);
 assert.deepEqual(copy(n.stopOrder({resolved:{aim:{}}})),[2,1,0]);
 assert.deepEqual(copy(n.stopOrder({})),[0,1,2]);
});
