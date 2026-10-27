import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const source=fs.readFileSync('nova-game.js','utf8'),fn=source.match(/  function applySuperSpeedPermission\([^]*?\n  }/)[0];
test('server-authorized auto starts once after handoff; manual stop stays stopped',()=>{
 const c=vm.createContext({});vm.runInContext("let dailySuperSpeedAutoStarted=false,superSpeedAllowed=false,superSpeedPermissionTimer=null,superFullAuto=false,superSpeedActive=false,superSpeedPending=false,blocked=true,starts=0,stops=0;function clearTimeout(){}function setTimeout(){return 1;}function hasSuperSpeedPermission(){return superSpeedAllowed;}function updateSuperSpeedUi(){}function superSpeedUnavailableReason(){return blocked?'loading':'';}function startSuperSpeed(){starts++;superFullAuto=true;}function stopAutoPlay(){stops++;superFullAuto=false;}"+fn,c);
 vm.runInContext('applySuperSpeedPermission(true,true);',c);assert.equal(vm.runInContext('starts',c),0);
 vm.runInContext('blocked=false;applySuperSpeedPermission(true,true);applySuperSpeedPermission(true,true);superFullAuto=false;applySuperSpeedPermission(true,true);',c);assert.equal(vm.runInContext('starts',c),1);
 vm.runInContext('superFullAuto=true;applySuperSpeedPermission(false);',c);assert.equal(vm.runInContext('stops',c),1);
});
