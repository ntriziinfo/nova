import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {readGameSource} from '../scripts/game-source.mjs';
const source=readGameSource();
function context(){
 const c=vm.createContext({isSpinning:false,currentSpin:null,session:{active:false},normalState:{flow:{}},NovaProgress:{snapshot:()=>({next:2400})},currentProfit:()=>2000,speedToBonusActive:false,isHighMode:()=>false,DEFAULT_NORMAL_BGM_SRC:'normal'});
 vm.runInContext(fs.readFileSync('nova-art.js','utf8'),c);
 const constants=[...source.matchAll(/  const \w+_BGM_SRC = "[^"]+";/g)].map(m=>m[0]).join('\n');
 vm.runInContext(constants+'\n'+source.match(/^  function presentedArtFlow\(.*$/m)[0]+'\n'+['atCheckpointStatus','normalBgmSrc','ensureNormalBgmSource'].map(name=>source.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0]).join('\n'),c);
 return c;
}
test('checkpoint BGM starts exactly at the earned threshold in normal and upper AT',()=>{
 const c=context();
 for(const upper of [false,true]){
  c.normalState.flow={phase:'art',remaining:'399',researchUpper:upper};
  assert.equal(c.normalBgmSrc(),'assets/media/nova/'+(upper?'upper-at-bgm.mp3':'RUSH.wav'));
  c.normalState.flow.remaining='400';assert.equal(c.normalBgmSrc(),'assets/media/nova/checkpoint-bgm.mp3');
  c.normalState.flow=JSON.parse(JSON.stringify(c.normalState.flow));assert.equal(c.normalBgmSrc(),'assets/media/nova/checkpoint-bgm.mp3');
  c.normalState.flow.remaining='399';assert.notEqual(c.normalBgmSrc(),'assets/media/nova/checkpoint-bgm.mp3');
 }
});
test('special presentations and queued stock retain their BGM priority',()=>{
 const c=context(),base={phase:'art',remaining:'10000',researchUpper:true};
 for(const extra of [{zone:'sora'},{initialStage:'zone',zone:'kushuri_nito'},{researchSortieLeft:10},{researchChallengeActive:true},{atPrelude:{left:3}},{entryStage:'seven'},{comebackLeft:5},{queuedZones:['sora']}]){
  c.normalState.flow={...base,...extra};assert.notEqual(c.normalBgmSrc(),'assets/media/nova/checkpoint-bgm.mp3',JSON.stringify(extra));
 }
 c.normalState.flow=base;c.session.active=true;assert.notEqual(c.normalBgmSrc(),'assets/media/nova/checkpoint-bgm.mp3');
 c.session.active=false;c.normalState.flow={phase:'normal'};assert.equal(c.normalBgmSrc(),'assets/media/nova/audiostock_1117081.wav');
});
test('the supplied checkpoint track has a BGM master at the existing loudness target',()=>{
 const report=JSON.parse(fs.readFileSync('audio-normalization.json','utf8')),row=report.files.find(f=>f.src==='assets/media/nova/checkpoint-bgm.mp3');
 assert(row);assert.equal(row.category,'bgm');assert.equal(row.targetLufs,-18);assert(Math.abs(row.after.lufs+18)<=.3);assert(row.after.peakDbtp<=-1);
 assert(Math.abs(row.duration-row.outputDuration)<.06);assert(fs.statSync(row.output).size>100000);
});
