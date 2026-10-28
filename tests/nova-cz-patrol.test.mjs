import {readGameSource} from '../scripts/game-source.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const html=readGameSource(),calls=[],oneShots=[],machine={dataset:{czLamp:'0',czRainbow:'false'}};
const promptVoices={default:'default.wav',chance:'chance.wav',hot:'hot.wav',veryHot:'very-hot.wav'};
const ctx=vm.createContext({document:{getElementById:()=>machine},CZ_PUSH_PROMPT_VOICE_SRCS:promptVoices,sfxOutputVolume:()=>.6,voiceOutputVolume:()=>.4,pauseNormalBgm:()=>{},playOneShotSound:(...args)=>oneShots.push(args),playLockedBonusConfirmSound:(...args)=>calls.push(args)});
vm.runInContext(fs.readFileSync('nova-flow.js','utf8'),ctx);vm.runInContext(fs.readFileSync('nova-cz-push.js','utf8'),ctx);ctx.settings={setting:1};ctx.normalState={};
for(const name of ['playCzPushPromptVoice','playCzConfirmedSound','playCzFailureSound','showCzLamp'])vm.runInContext(html.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0],ctx);
test('CZ PUSH prompt voices follow the offered visual tier',()=>{
 oneShots.length=0;
 for(const voice of ['default','chance','hot','veryHot'])ctx.playCzPushPromptVoice({voice});
 ctx.playCzPushPromptVoice({voice:'unknown'});
 assert.deepEqual(JSON.parse(JSON.stringify(oneShots)),Object.values(promptVoices).map(src=>[src,.4,{allowDuringPremiumConfirm:true}]));
});
test('full and rainbow confirmation play exactly once despite repeated finish callbacks',()=>{
 for(const rainbow of [false,true]){
  calls.length=0;machine.dataset.czLamp='0';machine.dataset.czRainbow='false';
  const resolved={bonusHit:true,czLamp:{stage:rainbow?5:6,rainbow,rainbowAt:1,totalGames:20,remaining:1}};
  ctx.showCzLamp(1,resolved);ctx.showCzLamp(2,resolved);assert.equal(calls.length,0);
  ctx.showCzLamp(3,resolved);ctx.showCzLamp(3,resolved);ctx.showCzLamp(3,resolved);
  assert.equal(calls.length,0);resolved.czPushConfirmed=true;ctx.playCzConfirmedSound(resolved);ctx.playCzConfirmedSound(resolved);
  assert.deepEqual(calls,[['assets/media/nova/cz-success-push-20261027.mp3',.6]]);
 }
});
test('partial lamps and unconfirmed outcomes stay silent',()=>{
 calls.length=0;machine.dataset.czLamp='0';
 ctx.showCzLamp(3,{bonusHit:false,czLamp:{stage:3,rainbow:false,totalGames:20,remaining:1}});
 ctx.playCzConfirmedSound({bonusHit:false});assert.equal(calls.length,0);
});
test('failed PUSH plays the supplied blackout sound once',()=>{
 oneShots.length=0;const resolved={czLamp:{},czCompleted:true};
 ctx.playCzFailureSound(resolved);ctx.playCzFailureSound(resolved);
 assert.deepEqual(JSON.parse(JSON.stringify(oneShots)),[['assets/media/nova/cz-failure-blackout-20261027.mp3',.6,{allowDuringPremiumConfirm:true}]]);
});
