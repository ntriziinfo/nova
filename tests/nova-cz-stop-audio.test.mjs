import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const html=fs.readFileSync('jag.html','utf8'),calls=[],ctx=vm.createContext({currentSpin:null,document:{getElementById:()=>({dataset:{czLamp:'2'}})},STOP_SOUND_SRC:'normal.wav',sfxOutputVolume:()=>.5,playOneShotSound:(src)=>calls.push(src)});
vm.runInContext(fs.readFileSync('nova-flow.js','utf8'),ctx);
for(const name of ['czThirdStopSound','playStopSound'])vm.runInContext(html.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0],ctx);
const lamp={stage:3,rainbow:false,totalGames:20,remaining:11};
test('new light and surprise rainbow use success; no advance and final loss use failure',()=>{
 assert.match(ctx.czThirdStopSound({czLamp:lamp},2),/success/);
 assert.match(ctx.czThirdStopSound({czLamp:lamp},3),/failure/);
 assert.match(ctx.czThirdStopSound({czLamp:{...lamp,rainbow:true,rainbowAt:1}},3),/success/);
 assert.match(ctx.czThirdStopSound({czLamp:lamp,czCompleted:true,bonusHit:false,flowAfter:{phase:'normal'}},2),/failure/);
});
test('first two stops retain normal sound, third replaces it exactly once regardless of reel order',()=>{
 ctx.currentSpin={resolved:{czLamp:lamp}};calls.length=0;
 ctx.playStopSound(2,1);ctx.playStopSound(0,2);ctx.playStopSound(1,3);ctx.playStopSound(1,3);
 assert.deepEqual(calls,['normal.wav','normal.wav','assets/media/jag/cz_third_success.wav']);
});
