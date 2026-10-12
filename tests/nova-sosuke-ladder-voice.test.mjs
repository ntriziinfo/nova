import {loadVoiceCatalog} from './helpers/voice-catalog.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const source=fs.readFileSync('nova-game.js','utf8'),fn=source.match(/  function playSosukeLadderBetVoice\([^]*?\n  }/)[0];
function setup(){
 const played=[],c=vm.createContext({debugFastSpinActive:false,speedToBonusActive:false,voiceOutputVolume:()=>.6,
  playOneShotSound:(src,volume)=>played.push({src,volume}),crypto:{getRandomValues:a=>{c.presentationDraws++;a[0]=0;return a;}},presentationDraws:0});
 for(const f of ['nova-tuning.js','nova-art.js','nova-spin-resume.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);
 loadVoiceCatalog(c);
 vm.runInContext(source.match(/  const SOSUKE_LADDER_VOICE_SRCS=[^\n]+/)[0]+fn,c);
 vm.runInContext('Math.random=()=>{throw Error("Voice must not draw game RNG");}',c);
 return {c,played,voices:Array.from(vm.runInContext('SOSUKE_LADDER_VOICE_SRCS',c))};
}
function challenge(c,pass,ladder=[50,100,200,300,500],index=0){
 const flow={...c.NovaArt.startZone(c.NovaArt.enter({},()=>.5),'sosuke',{},()=>.5),ladder,ladderIndex:index,ladderRevealed:true,award:String(ladder[index]),zoneLeft:ladder.length-index-1};
 const step=c.NovaArt.step(flow,{},()=>.99,pass?'REPLAY':'MISS');
 return {result:step.result,resolved:{flowBefore:flow,flowAfter:step.flow}};
}

test('passed games select each exclusive line at 15% and split the other 70% equally; failed games use only the other three',()=>{
 const {c,played,voices}=setup();
 for(const pass of [false,true]){
  const counts=voices.map(()=>0),base=challenge(c,pass);
  for(let i=0;i<3000;i++){
   const spin=structuredClone(base);let draws=0;
   c.playSosukeLadderBetVoice(spin,()=>{draws++;return (i+.5)/3000;});
   c.playSosukeLadderBetVoice(spin,()=>{throw Error('Duplicate announcement');});
   assert.equal(draws,1);assert.equal(played.at(-1).volume,.6);counts[voices.indexOf(played.at(-1).src)]++;
  }
  assert.deepEqual(counts,pass?[450,450,700,700,700]:[0,0,1000,1000,1000]);
 }
});

test('a same-pt pass and the terminal pass can announce success, while failed settlement cannot',()=>{
 const {c,played,voices}=setup();
 for(const [ladder,index]of [[[50,50,500,500,1000],0],[[50,50,500,500,1000],2],[[50,2000],0]]){
  const spin=challenge(c,true,ladder,index);c.playSosukeLadderBetVoice(spin,()=>.1);assert.equal(played.at(-1).src,voices[0]);
  const failed=challenge(c,false,ladder,index);c.playSosukeLadderBetVoice(failed,()=>.1);assert.equal(played.at(-1).src,voices[2]);
 }
});

test('default selection uses presentation entropy only, preserves the drawn outcome and survives spin save/reload without repeating',()=>{
 const {c,played}=setup(),spin=challenge(c,true),before=JSON.stringify([spin.result,spin.resolved.flowBefore,spin.resolved.flowAfter]);
 c.playSosukeLadderBetVoice(spin);assert.equal(c.presentationDraws,1);
 assert.equal(JSON.stringify([spin.result,spin.resolved.flowBefore,spin.resolved.flowAfter]),before);
 Object.assign(spin,{grid:Array.from({length:3},()=>['B','R','7']),stopped:[false,false,false]});
 const restored=c.NovaSpinResume.restore(c.NovaSpinResume.capture(spin),{REPLAY:{}});
 c.playSosukeLadderBetVoice(restored);assert.equal(played.length,1);assert.equal(c.presentationDraws,1);
});

test('base reveal, other characters, initial plans, roulette, bonus, result and simulations remain outside the new cue',()=>{
 const {c,played}=setup(),base=challenge(c,true);
 const cases=[null,{...structuredClone(base),ladderResultPresentation:{zone:'sosuke',pt:'500'}}];
 for(const change of [{phase:'normal'},{zone:'giru'},{zone:'sora'},{ladderRevealed:false},{entryStage:'roulette'},{initialStage:'zone'}]){
  const s=structuredClone(base);Object.assign(s.resolved.flowBefore,change);cases.push(s);
 }
 const bonus=structuredClone(base);bonus.resolved.aTypeBonusGame=true;cases.push(bonus);
 for(const s of cases)c.playSosukeLadderBetVoice(s,()=>{throw Error('Ineligible draw');});
 for(const flag of ['debugFastSpinActive','speedToBonusActive']){c[flag]=true;c.playSosukeLadderBetVoice(structuredClone(base));c[flag]=false;}
 assert.equal(played.length,0);assert.equal(c.presentationDraws,0);
});

test('all supplied lines share voice normalization and original recording provenance',()=>{
 const {c,voices}=setup();
 vm.runInContext(fs.readFileSync('nova-audio-manifest.js','utf8'),c);
 const provenance=JSON.parse(fs.readFileSync('assets/media/nova/sosuke-ladder-voices.sources.json','utf8'));
 for(const src of voices){assert.equal(c.NovaAudioManifest[src].category,'voice');assert(fs.existsSync(c.NovaAudioManifest[src].src));assert(provenance.sources.some(s=>s.copy===src));}
 assert(voices.every(src=>c.NovaVoiceCatalog.CHARACTER_VOICE_SRCS.includes(src)));assert(source.includes('playSosukeLadderBetVoice(currentSpin);'));
});
