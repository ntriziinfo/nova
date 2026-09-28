import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const html=fs.readFileSync('jag.html','utf8');
function setup(){
 const calls=[],machine={dataset:{czLamp:'0',czRainbow:'false'}},black=new Set();
 const ctx=vm.createContext({renderCzPrelude(){},currentSpin:null,isLadderShutterSpin:()=>false,document:{getElementById:()=>machine,querySelector:selector=>({classList:{add:()=>black.add(selector)}}),querySelectorAll:()=>[...black].map(selector=>({classList:{remove:()=>black.delete(selector)}}))},STOP_SOUND_SRC:'normal.wav',sfxOutputVolume:()=>.5,playOneShotSound:src=>calls.push({src,stage:Number(machine.dataset.czLamp),rainbow:machine.dataset.czRainbow==='true'}),playCzConfirmedSound(){}});
 vm.runInContext(fs.readFileSync('nova-flow.js','utf8'),ctx);
 for(const name of ['showCzLamp','czThirdStopSound','playStopSound','clearCzReelBlackout'])vm.runInContext(html.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0],ctx);
 return {ctx,calls,machine,black};
}
test('every character lights with the same SE at its actual landed stop, with no third-stop replay',()=>{
 const {ctx,calls,machine}=setup(),seen=[],stops=new Set();
 for(let remaining=20;remaining>=1;remaining--){
  const resolved={czLamp:{stage:6,totalGames:20,remaining,timingSeed:12345}};ctx.currentSpin={resolved};ctx.showCzLamp(0,resolved);
  for(let stop=1;stop<=3;stop++){
   const before=Number(machine.dataset.czLamp),count=calls.length;
   ctx.showCzLamp(stop,resolved);ctx.playStopSound([2,0,1][stop-1],stop);
   const sounds=calls.slice(count).filter(x=>x.src.endsWith('cz_third_success.wav'));
   const after=Number(machine.dataset.czLamp);
   assert.equal(sounds.length,after>before?1:0,`${remaining}G stop${stop}`);
   if(after>before){assert.equal(sounds[0].stage,after);seen.push(after);stops.add(stop);}
  }
  const count=calls.length;ctx.showCzLamp(3,resolved);ctx.playStopSound(1,3);assert.equal(calls.length,count);
 }
 assert.deepEqual(seen,[1,2,3,4,5,6,7,8]);assert.equal(stops.size,3);
});
test('rainbow shares the lighting cue and repeated finish calls do not play it twice',()=>{
 const {ctx,calls}=setup(),resolved={czLamp:{stage:5,totalGames:20,remaining:20,rainbow:true,rainbowAt:1}};
 ctx.currentSpin={resolved};ctx.showCzLamp(0,resolved);
 for(let stop=1;stop<=3;stop++){ctx.showCzLamp(stop,resolved);ctx.playStopSound(stop-1,stop);}
 const rainbow=calls.filter(x=>x.rainbow&&x.src.endsWith('cz_third_success.wav'));assert.equal(rainbow.length,1);
 const count=calls.length;ctx.showCzLamp(3,resolved);ctx.playStopSound(2,3);assert.equal(calls.length,count);
});

test('early CZ confirmation lights all eight only at the third landed stop',()=>{
 for(const phase of ['cz','strong_cz']){
  for(const rainbow of [false,true]){
   const {ctx,calls,machine}=setup();
   const resolved={flowBefore:{phase,success:true},bonusHit:true,czLamp:{stage:5,totalGames:20,remaining:20,rainbow,rainbowAt:1}};
   ctx.currentSpin={resolved};ctx.showCzLamp(0,resolved);
   for(let stop=1;stop<=2;stop++){
    ctx.showCzLamp(stop,resolved);ctx.playStopSound(stop-1,stop);
    assert(Number(machine.dataset.czLamp)<8);assert.equal(machine.dataset.czRainbow,'false');
   }
   const before=calls.length;ctx.showCzLamp(3,resolved);ctx.playStopSound(2,3);
   assert.equal(machine.dataset.czLamp,'8');assert.equal(machine.dataset.czRainbow,'true');
   assert.deepEqual(calls.slice(before),[{src:'assets/media/jag/cz_third_success.wav',stage:8,rainbow:true}]);
   const count=calls.length;ctx.showCzLamp(3,resolved);ctx.playStopSound(2,3);assert.equal(calls.length,count);
   ctx.showCzLamp(0,{flowBefore:{phase:'normal'}});assert.equal(machine.dataset.czLamp,'0');assert.equal(machine.dataset.czRainbow,'false');
  }
 }
});

test('an internally won CZ keeps the ordinary lamp schedule until confirmation',()=>{
 const {ctx,machine}=setup(),resolved={flowBefore:{phase:'cz',success:true},bonusHit:false,czLamp:{stage:6,totalGames:20,remaining:20,timingSeed:12345}};
 for(let stop=0;stop<=3;stop++)ctx.showCzLamp(stop,resolved);
 assert.equal(Number(machine.dataset.czLamp),ctx.NovaFlow.lampDisplayAtStop(resolved.czLamp,3).stage);
 assert(Number(machine.dataset.czLamp)<8);assert.equal(machine.dataset.czRainbow,'false');
});

test('CZ premium confirmation without a lamp roll still lights everyone; ordinary bonus does not',()=>{
 for(const phase of ['cz','strong_cz','normal']){
  for(const outcome of [{bonusHit:true},{aTypeBonusReady:true},{flowAfter:{phase:'art'}}]){
   const {ctx,machine}=setup(),resolved={flowBefore:{phase},...outcome};
   machine.dataset.czLamp='2';
   for(let stop=0;stop<=2;stop++){
    ctx.showCzLamp(stop,resolved);assert.equal(machine.dataset.czLamp,phase==='normal'?'0':'2');
    assert.equal(machine.dataset.czRainbow,'false');
   }
   ctx.showCzLamp(3,resolved);assert.equal(machine.dataset.czLamp,phase==='normal'?'0':'8');
   assert.equal(machine.dataset.czRainbow,String(phase!=='normal'));
  }
 }
});
test('earlier-stop lighting uses a regular third stop; final CZ loss still plays failure and blacks out only the final reel',()=>{
 const {ctx,calls,black}=setup();
 const resolved={czLamp:{stage:2,totalGames:20,remaining:1},czLampAtBet:3,czLitStops:{2:true}};
 assert.match(ctx.czThirdStopSound(resolved,4),/cz_stop_12/);
 assert.equal(ctx.czThirdStopSound({...resolved,czLitStops:{3:true}},4),'');
 ctx.currentSpin={resolved:{...resolved,czCompleted:true,bonusHit:false,flowAfter:{phase:'normal'}}};ctx.playStopSound(0,3);
 assert(calls.at(-1).src.endsWith('cz_third_failure.wav'));assert.deepEqual([...black],['.reel[data-reel="0"]']);
 ctx.clearCzReelBlackout();assert.equal(black.size,0);
});
test('non-lighting stops and non-CZ stops retain their normal clips',()=>{
 const {ctx,calls}=setup();ctx.currentSpin={resolved:{czLamp:{stage:1,totalGames:20,remaining:20},czLampAtBet:0}};
 ctx.playStopSound(2,1);ctx.playStopSound(0,2);assert(calls.every(x=>x.src.endsWith('cz_stop_12.wav')));
 for(const phase of ['normal','art','bonus']){
  ctx.currentSpin={resolved:{flowBefore:{phase}}};calls.length=0;
  ctx.playStopSound(0,1);ctx.playStopSound(1,2);ctx.playStopSound(2,3);assert.deepEqual(calls.map(x=>x.src),['normal.wav','normal.wav','normal.wav']);
 }
});
