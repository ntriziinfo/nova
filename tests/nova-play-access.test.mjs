import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context=vm.createContext({});
vm.runInContext(fs.readFileSync('nova-play-access.js','utf8'),context);
const {create}=context.NovaPlayAccess;
function lockManager(){
 const held=new Set();
 return {request:async(name,options,callback)=>{
  assert.equal(options.mode,'exclusive');assert.equal(options.ifAvailable,true);
  if(held.has(name))return callback(null);
  held.add(name);try{return await callback({name});}finally{held.delete(name);}
 }};
}
test('only one tab can boot the same saved machine; another machine remains independent',async()=>{
 const locks=lockManager(),boots=[],blocked=[];
 const a=create('same',{locks}),b=create('same',{locks,blocked:r=>blocked.push(r)}),other=create('other',{locks});
 const pa=a.start(()=>boots.push('a')),pb=b.start(()=>boots.push('b')),po=other.start(()=>boots.push('other'));
 await pb;assert.deepEqual(boots,['a','other']);assert.deepEqual(blocked,['occupied']);
 assert(a.owned());assert(!b.owned());assert(other.owned());
 a.close();await pa;
 const reloaded=create('same',{locks}),pr=reloaded.start(()=>boots.push('reloaded'));
 assert(reloaded.owned());assert(!a.owned());assert.deepEqual(boots,['a','other','reloaded']);
 reloaded.close();other.close();await Promise.all([pr,po]);
});
test('closing before asynchronous lock acquisition cannot boot stale state',async()=>{
 let grant,booted=false;
 const access=create('key',{locks:{request:(_name,_options,callback)=>new Promise(resolve=>{grant=()=>resolve(callback({}));})}});
 const pending=access.start(()=>{booted=true;});access.close();grant();await pending;
 assert(!booted);assert(!access.owned());
});
test('unsupported, rejected locks and boot errors fail closed and release ownership',async()=>{
 for(const mode of ['unsupported','reject','boot']){
  const reasons=[];let boots=0;
  const locks=mode==='unsupported'?null:mode==='reject'?{request:()=>Promise.reject(Error('denied'))}:lockManager();
  const access=create('key',{locks,blocked:reason=>reasons.push(reason)});
  await access.start(()=>{boots++;throw Error('boot failed');});
  assert(!access.owned());assert.equal(boots,mode==='boot'?1:0);
  assert.deepEqual(reasons,[mode==='unsupported'?'unsupported':'error']);
 }
});
