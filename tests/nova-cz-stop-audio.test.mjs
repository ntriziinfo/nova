import {readGameSource} from '../scripts/game-source.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const html=readGameSource();
function setup(){
 const calls=[],machine={dataset:{czLamp:'0',czRainbow:'false'}},black=new Set();
 const ctx=vm.createContext({renderCzPrelude(){},currentSpin:null,isLadderShutterSpin:()=>false,document:{getElementById:()=>machine,querySelector:selector=>({classList:{add:()=>black.add(selector)}}),querySelectorAll:()=>[...black].map(selector=>({classList:{remove:()=>black.delete(selector)}}))},STOP_SOUND_SRC:'normal.wav',sfxOutputVolume:()=>.5,playOneShotSound:src=>calls.push({src,stage:Number(machine.dataset.czLamp),rainbow:machine.dataset.czRainbow==='true'}),playCzConfirmedSound(){}});
 vm.runInContext(fs.readFileSync('nova-flow.js','utf8'),ctx);vm.runInContext(fs.readFileSync('nova-cz-push.js','utf8'),ctx);ctx.settings={setting:1};ctx.normalState={};
 for(const name of ['showCzLamp','czThirdStopSound','playStopSound','clearCzReelBlackout'])vm.runInContext(html.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0],ctx);
 return {ctx,calls,machine,black};
}
test('each stop can light lamps, never dims them, and repeats do not replay SE',()=>{
 const stops=new Set();
 for(let seed=0;seed<50;seed++){
 const {ctx,calls,machine}=setup();
 for(let remaining=15;remaining>=1;remaining--){
 const r={czLamp:{success:false,totalGames:15,remaining,timingSeed:seed},czCompleted:remaining===1};
 ctx.currentSpin={resolved:r};ctx.showCzLamp(0,r);
 for(let stop=1;stop<=3;stop++){
 const before=Number(machine.dataset.czLamp),count=calls.length;
 ctx.showCzLamp(stop,r);
 const after=Number(machine.dataset.czLamp);assert(after>=before);
 assert.equal(calls.length-count,after>before?1:0);
 if(after>before)stops.add(stop);
 const once=calls.length;ctx.showCzLamp(stop,r);assert.equal(calls.length,once);
 }
 }
 assert(![1,8].includes(Number(machine.dataset.czLamp)));
 }
 assert.deepEqual([...stops].sort(),[1,2,3]);
});
test('final result sound remains neutral until PUSH',()=>{
 const {ctx}=setup();
 for(const bonusHit of [false,true]){
 const r={czLamp:{},czCompleted:true,bonusHit,flowAfter:{phase:'normal'}};
 assert.match(ctx.czThirdStopSound(r,0),/cz_stop_12/);
 }
});
