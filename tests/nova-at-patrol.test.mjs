import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

function cabinet(){
  const nodes=new Map(),events=[];
  const host={dataset:{},append(...elements){for(const el of elements)nodes.set(el.id,el);}};
  const ctx=vm.createContext({
    document:{getElementById:()=>host,createElement:()=>({setAttribute(){}})},Image:class {},
    NovaPresentation:{play(el){events.push(el.id);},stop(el){events.push('stop '+el.id);}},
    playLockedBonusConfirmSound(src){events.push(src);},sfxOutputVolume:()=>1,
    debugFastSpinActive:false,speedToBonusActive:false
  });
  vm.runInContext(readFileSync('nova-at-patrol.js','utf8'),ctx);
  const src=readFileSync('nova-game.js','utf8');
  const fn=src.match(/  function playZoneInternalConfirmedSound\(resolved\)\{[^]*?\n  }/)[0];
  vm.runInContext(fn,ctx);
  return {host,nodes,events,sync:ctx.NovaAtPatrol.sync,confirm:ctx.playZoneInternalConfirmedSound};
}

test('rare role warms without revealing; next BET shows the same unlit lamp on hits and misses',()=>{
  for(const won of [false,true]){
    const {host,nodes,events,sync,confirm}=cabinet();
    const flow={phase:'art',atPrelude:{total:3,left:2}};
    sync(flow,{atPrelude:{started:true}});
    assert.equal(nodes.size,3);
    sync(flow,null);
    assert.equal(host.dataset.atPatrol,undefined);
    sync(flow,{atPrelude:{left:1}});
    assert.equal(host.dataset.atPatrol,'off');
    assert.equal(nodes.get('novaPatrolOff').hidden,false);
    assert.equal(nodes.get('novaPatrolFlash').hidden,true);
    flow.atPrelude.left=1;
    sync(flow,null);
    const r={flowBefore:flow,flowAfter:{phase:'art',entryStage:won?'seven':''},atPrelude:won?{confirmed:true}:{failed:true}};
    sync(flow,r); // The final BET already knows the result internally.
    assert.equal(host.dataset.atPatrol,'off');
    assert.deepEqual(events,[]);
    confirm(r);confirm(r);sync(flow,r);sync(r.flowAfter,null);
    assert.equal(host.dataset.atPatrol,won?'on':undefined);
    assert.deepEqual(events,won?['novaPatrolOn','novaPatrolFlash','assets/media/jag/cz_patrol_confirm.wav?v=19']:[]);
    sync(r.flowAfter,{aim:{symbol:'seven'}});
    assert.equal(host.dataset.atPatrol,undefined);
    assert([...nodes.values()].every(el=>el.hidden));
    if(won)assert.deepEqual(events.slice(-2),['stop novaPatrolOn','stop novaPatrolFlash']);
  }
});

test('saved prelude restores the unlit lamp; unrelated seven entry, CZ and countdown never light it',()=>{
  const {host,events,sync,confirm}=cabinet();
  sync({phase:'art',atPrelude:{total:4,left:1}},null);
  assert.equal(host.dataset.atPatrol,'off');
  sync({phase:'art',checkpointCountdown:true},null);
  sync({phase:'cz'},{czPrelude:{}});
  confirm({flowBefore:{phase:'art',initialStage:'wait'},flowAfter:{entryStage:'seven'}});
  assert.equal(host.dataset.atPatrol,undefined);
  assert.deepEqual(events,['assets/media/jag/cz_patrol_confirm.wav?v=19']);
});
