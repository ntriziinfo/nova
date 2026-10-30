import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('nova-game.js','utf8');
const fn=name=>source.match(new RegExp(`  (?:async )?function ${name}\\([^]*?\\n  }`))[0];

function setup(){
  const timers=new Map();let id=0;
  const c=vm.createContext({
    superSpeedAllowed:false,superSpeedPermissionTimer:null,
    superFullAuto:false,superSpeedActive:false,superSpeedPending:false,
    adminCommandPollTimer:null,adminCommandPollInFlight:false,adminCommandPollRequested:false,adminCommandLastId:0,
    storeResumeState:null,ADMIN_COMMAND_LAST_ID_KEY:'last-id',ADMIN_SERVER:'https://admin.test',machineId:'nova-01',
    window:{fetch:true},AbortSignal,starts:0,stops:0,commands:[],allowed:true,online:true,blocked:true,
    canUsePlayState:()=>true,
    fetch:async()=>({ok:c.online,json:async()=>({commands:[],controls:{superSpeedAllowed:c.allowed,superSpeedAutoStart:true}})}),
    setTimeout(fn,ms){timers.set(++id,{fn,ms});return id;},clearTimeout(id){timers.delete(id);},
    hasSuperSpeedPermission:()=>c.superSpeedAllowed,
    updateSuperSpeedUi(){c.buttonEnabled=c.superSpeedAllowed;},
    superSpeedUnavailableReason:()=>c.blocked?'loading':'',
    startSuperSpeed(){c.starts++;c.superFullAuto=true;},
    stopAutoPlay(){c.stops++;c.superFullAuto=false;c.superSpeedActive=false;c.superSpeedPending=false;},
    handleAdminCommand(command){c.commands.push(command);},
    safeStorageSet(){},applyStoreCompleteSettings(){},setAdminConnectionState(){}
  });
  vm.runInContext(fn('applySuperSpeedPermission')+fn('pollAdminCommands'),c);
  return {c,timers};
}

test('daily permission at login, reload and repeated polls unlocks speed without starting AUTO',async()=>{
  // A new context also models the next browser reload with the same server entitlement.
  for(let load=0;load<2;load++){
    const {c}=setup();
    await c.pollAdminCommands();
    c.blocked=false;
    for(let poll=0;poll<4;poll++)await c.pollAdminCommands();
    assert.equal(c.buttonEnabled,true);
    assert.equal(c.superSpeedAllowed,true);
    assert.equal(c.starts,0);
    assert.equal(c.superFullAuto,false);
    assert.deepEqual(c.commands,[]);
  }
});

test('manual stop stays stopped after permission refresh and connection recovery',async()=>{
  const {c}=setup();c.blocked=false;
  await c.pollAdminCommands();
  c.startSuperSpeed();assert.equal(c.starts,1);
  await c.pollAdminCommands();assert.equal(c.superFullAuto,true);
  c.stopAutoPlay();
  await c.pollAdminCommands();assert.equal(c.superFullAuto,false);
  c.online=false;await c.pollAdminCommands();assert.equal(c.superSpeedAllowed,false);
  c.online=true;await c.pollAdminCommands();
  assert.equal(c.superSpeedAllowed,true);assert.equal(c.superFullAuto,false);assert.equal(c.starts,1);
});

test('legacy auto-start arguments do not start play; revocation and expiry still stop paid AUTO',()=>{
  const {c,timers}=setup();c.blocked=false;
  c.applySuperSpeedPermission(true,true);assert.equal(c.starts,0);
  c.startSuperSpeed();c.applySuperSpeedPermission(false);assert.equal(c.superFullAuto,false);
  c.applySuperSpeedPermission(true,true);assert.equal(c.starts,1);
  c.startSuperSpeed();
  const expiry=[...timers.values()].find(t=>t.ms===15000);assert.ok(expiry);expiry.fn();
  assert.equal(c.superFullAuto,false);assert.equal(c.superSpeedAllowed,false);assert.equal(c.stops,2);
  c.applySuperSpeedPermission(true,true);assert.equal(c.superFullAuto,false);assert.equal(c.starts,2);
});
