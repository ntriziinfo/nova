import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context=vm.createContext({});
vm.runInContext(fs.readFileSync('nova-cz-push.js','utf8'),context);
vm.runInContext('Math.random=()=>{throw Error("visual scheduling consumed game RNG")}',context);
const api=context.NovaCzPresentation;
const rates=[.27317164880616657,.2836866010598032,.31678578327216533,.30022044640396806,.326671511627907,.32773931366646597];
test('half of BB wins finish red and 80% of red cues first arrive in the final 3G',()=>{
 const samples=20000,results=[];
 for(let setting=1;setting<=6;setting++){
  let red=0,late=0,lossRed=0,greenOrRed=0;
  for(let seed=0;seed<samples;seed++){
   const lamp=Object.freeze({timingSeed:seed,totalGames:15,remaining:1});
   const win=api.display(lamp,3,true,setting),loss=api.display(lamp,3,false,setting);
   greenOrRed+=win.stage>=6;
   if(win.color==='red'){red++;late+=api.display({...lamp,remaining:4},3,true,setting).stage<7;}
   lossRed+=loss.color==='red';
   assert(win.stage>=loss.stage);assert.equal(win.rainbow,false);assert.equal(loss.rainbow,false);
   assert.equal(api.display(lamp,3,true,setting,true,true).color,'rainbow');
  }
  const confidence=rates[setting-1]*red/(rates[setting-1]*red+(1-rates[setting-1])*lossRed);
  assert(Math.abs(red/samples-.5)<.012);assert(Math.abs(late/red-.8)<.02);
  assert(greenOrRed/samples>=.8);assert(Math.abs(confidence-.9)<.015);
  results.push({setting,redWinRate:red/samples,lateRedRate:late/red,redConfidence:confidence});
 }
 console.log(JSON.stringify(results));
});
test('normal pacing lights at most 2 per game in 95% of seeds, including late red',()=>{
 let chanceUps=0;
 for(let seed=0;seed<3000;seed++){
  let previous=0,maxJump=0;
  for(let game=1;game<=15;game++){
   const stage=api.display({timingSeed:seed,totalGames:15,remaining:16-game},3,true,5).stage;
   assert(stage>=previous);maxJump=Math.max(maxJump,stage-previous);previous=stage;
  }
  chanceUps+=maxJump>2;
 }
 assert(chanceUps/3000<.065);
});
test('live renderer uses an already won CZ before its final game without rainbow disclosure',()=>{
 const source=fs.readFileSync('nova-game.js','utf8'),machine={dataset:{}};
 const c=vm.createContext({settings:{setting:5},normalState:{},document:{getElementById:()=>machine},NovaCzPresentation:api,sfxOutputVolume:()=>1,playOneShotSound(){},NovaFlow:{lampSeed:lamp=>lamp.timingSeed,lampPresentation:()=>({order:['a','b']})}});
 vm.runInContext(source.match(/  function showCzLamp\([^]*?\n  }/)[0],c);
 let seed=0;
 while(api.display({timingSeed:seed,totalGames:15,remaining:4},3,true,5).stage!==7)seed++;
 const resolved={czLamp:{success:true,timingSeed:seed,totalGames:15,remaining:4},flowBefore:{phase:'cz'},flowAfter:{phase:'cz'}};
 c.showCzLamp(3,resolved);assert.equal(machine.dataset.czColor,'red');assert.equal(machine.dataset.czRainbow,'false');
 const terminal={...resolved,czLamp:{...resolved.czLamp,remaining:1},bonusHit:true};
 c.showCzLamp(3,terminal);assert.equal(machine.dataset.czColor,'red');
 terminal.czPushConfirmed=true;c.showCzLamp(0,terminal);assert.equal(machine.dataset.czColor,'rainbow');
});
