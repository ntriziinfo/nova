import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('nova-ui-access.js','utf8');
function load(search){
  const events={},ready={},classes=new Set(),controls=[{},{}];
  const context=vm.createContext({URLSearchParams,location:{search},
    Math:{random(){throw Error('UI access must not draw game RNG');}},
    window:{addEventListener(type,fn,options){assert.equal(options.capture,true);events[type]=fn;}},
    document:{documentElement:{classList:{add:name=>classes.add(name)}},
      addEventListener(type,fn){ready[type]=fn;},querySelectorAll(){return controls;}}
  });
  vm.runInContext(source,context);
  return {policy:context.NovaUiAccess,events,ready,classes,controls};
}

test('all store entry routes disable editors, including incomplete URLs and debug overrides',()=>{
  for(const query of ['controller=vertex','storeId=store-debug','server=https://control.invalid','machine=nova-03',
    'playSessionId=session','creditBaseline=0','controller=','storeId=',
    'machine=nova-03&debug=1&admin=true','machine=nova-03&machine=standalone']){
    const {policy,classes,controls,ready}=load('?'+query);
    assert.equal(policy.storePlay,true,query);assert.equal(policy.canEdit,false,query);
    assert(Object.isFrozen(policy));assert(classes.has('novaStorePlay'));
    ready.DOMContentLoaded();assert(controls.every(control=>control.hidden&&control.inert));
  }
});

test('standalone development retains its existing controls',()=>{
  for(const query of ['','?machine=standalone']){
    const {policy,classes,events}=load(query);
    assert.equal(policy.canEdit,true);assert.equal(policy.storePlay,false);
    assert.equal(classes.size,0);assert.deepEqual(events,{});
  }
});

test('store controls reject pointer, keyboard and synthetic changes; play/audio controls remain available',()=>{
  const {events,policy}=load('?controller=vertex&machine=nova-03');
  for(const [type,handler] of Object.entries(events)){
    for(const restricted of [true,false]){
      const target={closest:()=>restricted?{}:null};
      let cancelled=0,stopped=0;
      assert.equal(policy.canUse(target),!restricted);
      handler({target,preventDefault(){cancelled++;},stopImmediatePropagation(){stopped++;}});
      assert.equal(cancelled,restricted?1:0,type);assert.equal(stopped,restricted?1:0,type);
    }
  }
});

test('store players can pan the cabinet without unlocking game or artwork editors',()=>{
  const {events,policy}=load('?controller=vertex&machine=nova-03');
  for(const [ancestor,allowed] of [['.pagePanControl',true],['#layoutEditorPanel',false],['#debugDrawer',false],['#novaArtPanel',false]]){
    const target={closest:selector=>selector.split(',').includes(ancestor)?{}:null};
    assert.equal(policy.canUse(target),allowed,ancestor);
    for(const handler of Object.values(events)){
      let cancelled=false;
      handler({target,preventDefault(){cancelled=true;},stopImmediatePropagation(){}});
      assert.equal(cancelled,!allowed,ancestor);
    }
  }
});
