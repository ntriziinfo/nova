import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const context=vm.createContext({IDBKeyRange:{bound:(lower,upper,open=false)=>({lower,upper,open})}});vm.runInContext(fs.readFileSync('nova-audit.js','utf8'),context);
const plain=v=>JSON.parse(JSON.stringify(v));
function fixture(count,{abort=false}={}){
 const run='selected',records=Array.from({length:count},(_,i)=>({run,seq:i+1,writer:'one',game:Math.floor(i/3),bet:i%3?0:3,paid:i%11?0:15,boundary:i===1000,important:i%5===0,state:{tag:i}}));
 const recorder=Object.create(context.NovaAudit.Recorder.prototype);Object.assign(recorder,{ready:Promise.resolve(),flush:async()=>{},queue:[],metas:new Map([[run,{id:run,seq:count}]]),error:''});let calls=0,transactions=0;
 recorder.db={transaction(name){assert.equal(name,'records');transactions++;const tx={objectStore(){return {getAll(range,limit){calls++;assert.equal(limit,1000);assert.equal(range.lower[0],run);assert.equal(range.upper[0],run);const req={};tx.pending=true;setImmediate(()=>{tx.pending=false;if(abort){tx.onabort();return;}req.result=records.filter(r=>r.seq>range.lower[1]||(!range.open&&r.seq===range.lower[1])).slice(0,limit);req.onsuccess();if(!tx.pending)setImmediate(()=>tx.oncomplete());});return req;}};}};return tx;}};
 return {recorder,run,records,calls:()=>calls,transactions:()=>transactions};
}
test('batched audit pagination and totals include same-G records across each batch boundary',async()=>{
 const f=fixture(4001),data=await f.recorder.scan(f.run,{from:320,to:800,important:true,offset:10,limit:200});
 const chosen=f.records.filter(r=>r.game>=320&&r.game<=800),important=chosen.filter(r=>r.important);
 assert.deepEqual(plain(data.rows),important.slice(10,210));assert.equal(data.summary.count,chosen.length);assert.equal(data.summary.matches,important.length);
 assert.equal(data.summary.bet,chosen.reduce((s,r)=>s+r.bet,0));assert.equal(data.summary.paid,chosen.reduce((s,r)=>s+r.paid,0));assert.equal(data.summary.boundaries,1);
 assert.deepEqual(plain(data.summary.first),chosen[0]);assert.deepEqual(plain(data.summary.last),chosen.at(-1));assert.equal(f.calls(),5);assert.equal(f.transactions(),1);
});
test('audit export preserves pending conflicting writers without duplicating persisted rows',async()=>{
 const f=fixture(2000),conflict={...f.records[999],writer:'other',paid:123},newRow={...f.records.at(-1),seq:2001};
 f.recorder.queue=[f.records[0],conflict,newRow];const data=await f.recorder.export(f.run);
 assert.deepEqual(plain(data.records),[...f.records,conflict,newRow]);assert.equal(data.summary.count,2002);assert.equal(f.calls(),3);assert.equal(f.transactions(),1);
});
test('empty history resolves; an aborted history read rejects instead of returning incomplete totals',async()=>{
 const empty=fixture(0);assert.equal((await empty.recorder.scan(empty.run)).summary.count,0);assert.equal(empty.calls(),1);
 const failed=fixture(100,{abort:true});await assert.rejects(failed.recorder.scan(failed.run),/履歴読み込み中断/);
});
test('journal metadata comes only from pending runs without traversing historical runs',()=>{
 const f=fixture(0);f.recorder.metas.set('old',{id:'old'});f.recorder.metas.set('new',{id:'new'});
 f.recorder.metas.values=()=>{throw Error('Must not traverse past runs');};
 assert.deepEqual(plain(f.recorder.metasFor([{run:'new'},{run:f.run},{run:'new'}])),[{id:'new'},{id:f.run,seq:0}]);
});
