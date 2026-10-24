import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('nova-game.js', 'utf8');
const fn = name => source.match(new RegExp(`  (?:async )?function ${name}\\([^]*?\\n  }`))[0];
const deferred = () => { let resolve; const promise = new Promise(done=>{resolve=done;}); return {promise, resolve}; };
function setup(){
  const timers = new Map(), calls = [], handled = [], saved = [];
  let id=0;
  const c = vm.createContext({
    adminCommandPollTimer:null, adminCommandPollInFlight:false, adminCommandPollRequested:false, adminCommandLastId:0,storeResumeState:null,
    ADMIN_COMMAND_LAST_ID_KEY:'last-id', ADMIN_SERVER:'https://admin.test', machineId:'nova-01', window:{fetch:true},
    canUsePlayState:()=>true, AbortSignal,
    setTimeout(fn, ms){ timers.set(++id, {fn, ms}); return id; }, clearTimeout(id){timers.delete(id);},
    fetch(url){const pending=deferred();calls.push({url,...pending});return pending.promise;},
    handleAdminCommand(command){handled.push(command);}, safeStorageSet(key,value){saved.push(value);},
    applySuperSpeedPermission(value){c.permission=value;},applyStoreCompleteSettings(){}, setAdminConnectionState(value){c.connection=value;}
  });
  vm.runInContext(fn('pollAdminCommands') + fn('wakeAdminCommands'), c);
  const respond = (index, commands=[], ok=true) => calls[index].resolve({ok,json:async()=>({commands,controls:{superSpeedAllowed:true}})});
  return {c,timers,calls,handled,saved,respond};
}
test('successful polls use two seconds; a wake cancels the idle delay', async()=>{
  const h=setup(), p=h.c.pollAdminCommands();h.respond(0);await p;
  assert.equal([...h.timers.values()][0].ms,2000);
  h.c.wakeAdminCommands();assert.equal(h.timers.size,1);assert.equal([...h.timers.values()][0].ms,0);
});
test('a wake during a request is coalesced without overlap or a lost notification', async()=>{
  const h=setup(), p=h.c.pollAdminCommands();
  for(let i=0;i<10;i++) h.c.wakeAdminCommands();
  await h.c.pollAdminCommands();assert.equal(h.calls.length,1);
  h.respond(0);await p;
  assert.equal(h.timers.size,1);assert.equal([...h.timers.values()][0].ms,100);
  const timer=[...h.timers.values()][0];h.timers.clear();
  const next=timer.fn();assert.equal(h.calls.length,2);h.respond(1);await next;
  assert.equal([...h.timers.values()][0].ms,2000);
});
test('replayed command IDs do not reset twice, and each applied ID is persisted', async()=>{
  const h=setup();h.c.adminCommandLastId=10;
  const p=h.c.pollAdminCommands();
  h.respond(0,[{id:10,command:{type:'reset'}},{id:11,command:{type:'applySettings'}},{id:11,command:{type:'applySettings'}},{id:12,command:{type:'reset'}}]);await p;
  assert.deepEqual(h.handled.map(x=>x.type),['applySettings','reset']);assert.deepEqual(h.saved,['11','12']);
  const next=h.c.pollAdminCommands();assert.match(h.calls[1].url,/since=12$/);h.respond(1);await next;
});
test('network failure backs off, revokes permission, and can recover', async()=>{
  const h=setup(), p=h.c.pollAdminCommands();h.respond(0,[],false);await p;
  assert.equal(h.c.connection,'offline');assert.equal(h.c.permission,false);assert.equal([...h.timers.values()][0].ms,5000);
  const next=h.c.pollAdminCommands();h.respond(1);await next;
  assert.equal(h.c.permission,true);assert.equal(h.c.adminCommandPollInFlight,false);
});

test('a fresh customer device consumes historical command IDs without replaying old resets or settings',async()=>{
  const h=setup();h.c.storeResumeState={commandsAfter:1000};
  const p=h.c.pollAdminCommands();
  h.respond(0,[{id:151,createdAtMs:900,command:{type:'applySettings'}},{id:152,createdAtMs:999,command:{type:'reset'}},
    {id:153,createdAtMs:1000,command:{type:'reset'}},{id:154,createdAtMs:1100,command:{type:'stopAuto'}}]);await p;
  assert.deepEqual(h.handled.map(x=>x.type),['stopAuto']);
  assert.deepEqual(h.saved,['151','152','153','154']);assert.equal(h.c.adminCommandLastId,154);
});
test('ownership loss during fetch cannot execute commands or restart polling',async()=>{
  const h=setup(), p=h.c.pollAdminCommands();h.c.canUsePlayState=()=>false;h.respond(0,[{id:1,command:{type:'reset'}}]);await p;
  assert.equal(h.handled.length,0);assert.equal(h.timers.size,0);assert.equal(h.c.adminCommandPollInFlight,false);
});
test('a full batch immediately drains the remaining queue',async()=>{
  const h=setup(), p=h.c.pollAdminCommands();h.respond(0,Array.from({length:25},(_,i)=>({id:i+1,command:{type:'stopAuto'}})));await p;
  assert.equal([...h.timers.values()][0].ms,0);
});
test('host messages only wake for the configured origin, parent and machine',()=>{
  const parent={}, listeners={}; let count=0;
  const c=vm.createContext({VERTEX_CONTROLLER_ENABLED:true,ADMIN_SERVER:'https://admin.test/path',machineId:'nova-01',URL,location:{href:'https://game.test'},wakeAdminCommands(){count++;},window:{parent,addEventListener(type,fn){listeners[type]=fn;}}});
  const start=source.indexOf('  // The host only wakes');
  vm.runInContext(source.slice(start,source.indexOf('  function connectAdminCommands',start)),c);
  const valid={source:parent,origin:'https://admin.test',data:{type:'vertex-commands-available',machineId:'nova-01',command:{type:'reset'}}};
  for(const event of [{...valid,source:{}},{...valid,origin:'https://evil.test'},{...valid,data:{...valid.data,machineId:'other'}}])listeners.message(event);
  assert.equal(count,0);listeners.message(valid);assert.equal(count,1);
});
test('administrative reset uses the normal reset once without a navigation',()=>{
  let resets=0,pushes=0;
  const c=vm.createContext({canUsePlayState:()=>true,morningResetGame(confirm,reason){assert.equal(confirm,false);assert.equal(reason,'管理リセット');resets++;},scheduleAdminStatePush(){pushes++;},setTimeout(){throw new Error('reset should not reload');}});
  vm.runInContext(fn('handleAdminCommand'),c);c.handleAdminCommand({type:'reset'});
  assert.equal(resets,1);assert.equal(pushes,1);
  assert.match(fn('resetRuntimeForMorning'),/NovaResults.hide\(\)/);
});
