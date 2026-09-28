import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {loadModel} from '../scripts/zone-v2-model.mjs';
import {xoshiro128} from '../scripts/zone-v2-rng.mjs';
const html=fs.readFileSync('jag.html','utf8');
function setup(){
 const sounds=[];
 const c=vm.createContext({debugFastSpinActive:false,speedToBonusActive:false,voiceOutputVolume:()=>.42,playOneShotSound:(...args)=>sounds.push(args),normalizedAudioSourceKey:src=>src.split('?')[0]});
 vm.runInContext(html.slice(html.indexOf('  const BELL_NAVI_VOICE_SRCS='),html.indexOf('  for(const src of CHARACTER_VOICE_SRCS)')),c);
 for(const name of ['rareCueGrade','playRareCueVoice'])vm.runInContext(html.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0],c);
 return {c,sounds};
}
test('weak/strong rare roles use the requested grade, with no hot cue for CZ, direct points or a challenge entry',()=>{
 const {c}=setup();
 for(const result of ['WEAK_SUICA','CHANCE_A','WEAK_NOVA'])assert.equal(c.rareCueGrade({result}),'chance');
 for(const result of ['STRONG_SUICA','CHANCE_B','STRONG_NOVA','SUPER_NOVA']){
  for(const resolved of [{},{czEntry:true,flowAfter:{phase:'cz'}},{atOutcome:{direct:300},flowAfter:{phase:'art'}},{flowAfter:{phase:'art',zone:'sora'}},{burstEvent:'entry',flowAfter:{phase:'art',burstPending:true}},{atOutcome:{zone:'toto'},flowAfter:{phase:'art',pendingZone:'sora',entryStage:'seven'}}])assert.equal(c.rareCueGrade({result,resolved}),'bigChance');
 }
 for(const result of ['BELL','REPLAY','MISS','BIG','SEVEN','NEBULA'])assert.equal(c.rareCueGrade({result}),'');
});
test('hot cues track real AT and comeback zone wins across all settings and rare roles',()=>{
 loadModel();const {c}=setup();let hot=0,ordinary=0;
 for(let setting=1;setting<=6;setting++)for(const role of NovaArt.comebackRules.guaranteedRoles)for(let seed=1;seed<=20;seed++){
  for(const flow of [NovaArt.enter({setting},()=>.5),NovaArt.beginComeback(NovaArt.enter({setting},()=>.5))]){
   const step=NovaArt.step(flow,{setting},xoshiro128(seed),role);
   const grade=c.rareCueGrade({result:step.result,resolved:{...step,flowAfter:step.flow}});
   const won=!!step.atOutcome?.zone||step.comebackEvent==='success';
   assert.equal(grade==='hot',won,JSON.stringify({setting,role,step}));
   if(won)hot++;else ordinary++;
  }
 }
 assert(hot>0&&ordinary>0);
});
test('each rare BET plays one random Nito/Kushuri line and fast simulation stays silent',()=>{
 const {c,sounds}=setup();
 for(const [roll,character] of [[0,'kushuri'],[.999,'nito']])for(const [grade,result,resolved] of [['chance','WEAK_SUICA',{}],['bigChance','STRONG_SUICA',{}],['hot','WEAK_NOVA',{atOutcome:{zone:'toto'},flowAfter:{phase:'art',pendingZone:'toto',entryStage:'seven'}}]]){
  const spin={result,resolved};const before=sounds.length;
  c.playRareCueVoice(spin,()=>roll);c.playRareCueVoice(spin,()=>1-roll);
  assert.equal(sounds.length,before+1);assert.equal(spin.rareCueVoice.character,character);assert.equal(spin.rareCueVoice.grade,grade);
  assert(sounds.at(-1)[0].endsWith('-'+character+'.wav'));assert.equal(sounds.at(-1)[1],.42);assert(fs.existsSync(sounds.at(-1)[0]));
 }
 const count=sounds.length;c.playRareCueVoice({result:'BELL'});c.debugFastSpinActive=true;c.playRareCueVoice({result:'WEAK_SUICA'});c.debugFastSpinActive=false;c.speedToBonusActive=true;c.playRareCueVoice({result:'WEAK_SUICA'});assert.equal(sounds.length,count);
 assert.match(html,/playAimBetPresentation\(resolved\);\s*playRareCueVoice\(currentSpin\);/);
});
