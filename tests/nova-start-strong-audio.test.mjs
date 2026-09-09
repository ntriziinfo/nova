import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const html=fs.readFileSync('jag.html','utf8'),calls=[],ctx=vm.createContext({normalState:{},isLadderShutterSpin:()=>false,SPIN_SOUND_SRC:'assets/media/nova/spin_start.wav',sfxOutputVolume:()=>.5,playOneShotSound:(...args)=>calls.push(args)});
for(const name of ['playSpinSound','playStrongNovaSound','playWeakNovaSound'])vm.runInContext(html.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))?.[0]||'',ctx);
test('strong nova has dedicated zero-payout sound and no duplicate',()=>{
 const resolved={reward:0};ctx.playStrongNovaSound('WEAK_NOVA',resolved);assert.equal(calls.length,0);
 ctx.playStrongNovaSound('STRONG_NOVA',resolved);ctx.playStrongNovaSound('STRONG_NOVA',resolved);assert.equal(calls.length,1);assert.equal(calls[0][0],'assets/media/nova/strong_nova.wav');
});
test('all spin starts use the provided clip even during premium silence',()=>{
 calls.length=0;ctx.playSpinSound();assert.equal(calls[0][0],'assets/media/nova/spin_start.wav');assert.equal(calls[0][2].allowDuringPremiumConfirm,true);
});

test('weak nova plays supplied clip once and does not play for other roles',()=>{
 calls.length=0;const resolved={reward:0};ctx.playWeakNovaSound('STRONG_NOVA',resolved);assert.equal(calls.length,0);
 ctx.playWeakNovaSound('WEAK_NOVA',resolved);ctx.playWeakNovaSound('WEAK_NOVA',resolved);assert.equal(calls.length,1);assert.equal(calls[0][0],'assets/media/nova/weak-nova.wav');
});
