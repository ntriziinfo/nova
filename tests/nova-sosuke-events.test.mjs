import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('nova-game.js','utf8');
const fn=name=>source.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0];
function setup(){
 const played=[],released=[],confirmed=[];
 class Audio{
  constructor(src){this.src=src;}cloneNode(){return new Audio(this.src);}
  play(){played.push({src:this.src,volume:this.volume,loop:this.loop});return Promise.resolve();}
 }
 const c=vm.createContext({debugFastSpinActive:false,speedToBonusActive:false,
  voiceOutputVolume:()=>.6,playOneShotSound:(src,volume)=>played.push({src,volume}),
  oneShotSoundCache:new Map(),aimWinAudios:new Set(),aimWinOutputVolume:()=>.6,
  prepareCharacterVoiceAudio(){},releaseCharacterVoiceAudio:a=>released.push(a.src),clearInterval(){},
  pauseNormalBgm(){},barBgm:null,BGM_OUTPUT_SCALE:1,bgmOutputVolume:()=>.4,sfxOutputVolume:()=>.5,
  NovaRushConfirm:{play:(...args)=>confirmed.push(args)},normalState:{flow:{phase:'normal'}},
  settings:{setting:1},session:{bonusArtSets:0},isATypeBonusComplete:()=>false,normalizedAudioSourceKey:src=>src
 });
 for(const file of ['nova-tuning.js','nova-art.js','nova-spin-resume.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c);
 vm.runInContext(source.match(/  const MODE_EVENT_VOICE_SRCS=[^\n]+/)[0],c);
 for(const name of ['playModeEntryBetVoice','playUpperAtEntryVoice','playAimSevenWinSound','resolveATypeBonusOutcome'])vm.runInContext(fn(name),c);
 const voices=vm.runInContext('MODE_EVENT_VOICE_SRCS',c);
 for(const src of [...Object.values(voices),'assets/media/nova/aim/nebula-win.wav','assets/media/nova/aim/seven-win.wav'])c.oneShotSoundCache.set(src,new Audio(src));
 vm.runInContext('Math.random=()=>{throw Error("Presentation must not draw game RNG");}',c);
 return {c,voices,played,released,confirmed};
}

test('upper challenge announces only its first BET, even when HOLD retains 10G or the unpaid spin is restored',()=>{
 const {c,voices,played}=setup(),resolved={researchChallenge:{started:true,left:10}};
 c.playModeEntryBetVoice(resolved);c.playModeEntryBetVoice(resolved);
 const spin={result:'MISS',grid:[['B','B','B'],['R','R','R'],['7','7','7']],stopped:[false,false,false],resolved};
 c.playModeEntryBetVoice(c.NovaSpinResume.restore(c.NovaSpinResume.capture(spin),{MISS:{}}).resolved);
 c.playModeEntryBetVoice({researchChallenge:{started:false,left:10}});
 c.playModeEntryBetVoice({flowAfter:{burstPending:'initial'}});
 assert.deepEqual(played,[{src:voices.upperChallenge,volume:.6}]);
 c.playModeEntryBetVoice({researchChallenge:{started:true,left:9}});assert.equal(played.length,2);
});

test('comeback voice is on its actual first BET, including immediate success, not on entry at the prior third stop',()=>{
 const {c,voices,played}=setup();
 for(const event of ['continue','success','failure']){
  const resolved={flowBefore:{phase:'art',comebackLeft:5},comebackEvent:event};
  c.playModeEntryBetVoice(resolved);c.playModeEntryBetVoice(resolved);
 }
 for(const resolved of [
  {flowBefore:{phase:'art',comebackLeft:5},comebackEvent:'entry'},
  {flowBefore:{phase:'art',comebackLeft:4},comebackEvent:'continue'},
  {flowBefore:{phase:'normal',comebackLeft:5},comebackEvent:'success'},{}
 ])c.playModeEntryBetVoice(resolved);
 assert.deepEqual(played,Array.from({length:3},()=>({src:voices.comeback,volume:.6})));
});

test('upper AT entry is announced once on successful completion, never on failed or unfinished challenges',()=>{
 const {c,voices,played}=setup();
 for(const [finished,won] of [[false,false],[false,true],[true,false]])c.playUpperAtEntryVoice({researchChallenge:{finished,won}});
 const resolved={researchChallenge:{finished:true,won:true}};
 c.playUpperAtEntryVoice(resolved);c.playUpperAtEntryVoice(resolved);
 assert.deepEqual(played,[{src:voices.upperAt,volume:.6}]);
 for(const flag of ['debugFastSpinActive','speedToBonusActive']){
  c[flag]=true;c.playUpperAtEntryVoice({researchChallenge:{finished:true,won:true}});
  c.playModeEntryBetVoice({researchChallenge:{started:true}});c[flag]=false;
 }
 assert.equal(played.length,1);
});

test('initial bonus first NEBULA keeps RUSH confirmation; later NEBULA stocks use the new voice once without a loop',()=>{
 const {c,voices,played,confirmed,released}=setup();
 const resolve=()=>{
  vm.runInContext('Math.random=()=>.5',c);
  const resolved=c.resolveATypeBonusOutcome('NEBULA');
  vm.runInContext('Math.random=()=>{throw Error("Playback must not redraw");}',c);
  return resolved;
 };
 for(const prior of [0,1,2]){
  c.session.bonusArtSets=prior;
  c.playAimSevenWinSound('nebula',resolve());
 }
 assert.equal(confirmed.length,1);
 assert.deepEqual(played,[0,1].map(()=>({src:voices.bonusStock,volume:.6,loop:false})));
 for(const audio of [...c.aimWinAudios])audio.onended();
 assert.equal(c.aimWinAudios.size,0);assert.equal(released.length,2);
 // A bonus that already guarantees AT awards a stock on its first alignment as well.
 c.normalState.flow.phase='art';c.session.bonusArtSets=0;
 c.playAimSevenWinSound('nebula',resolve());
 assert.equal(played.at(-1).src,voices.bonusStock);assert.equal(confirmed.length,1);
 c.playAimSevenWinSound('nebula',{flowBefore:{phase:'art',zone:'sora'}});
 assert.equal(played.at(-1).src,'assets/media/nova/aim/nebula-win.wav');
 c.playAimSevenWinSound('seven',{});assert.equal(played.at(-1).src,'assets/media/nova/aim/seven-win.wav');
});

test('new voices share the mastered voice category and common volume controls',()=>{
 const {c,voices}=setup();
 vm.runInContext(source.slice(source.indexOf('  const BELL_NAVI_VOICE_SRCS='),source.indexOf('  for(const src of CHARACTER_VOICE_SRCS)')).replace(/  const MODE_EVENT_VOICE_SRCS=[^\n]+/,''),c);
 vm.runInContext(fs.readFileSync('nova-audio-manifest.js','utf8'),c);
 for(const src of Object.values(voices)){
  assert(vm.runInContext('CHARACTER_VOICE_SRCS',c).includes(src));
  assert.equal(c.NovaAudioManifest[src].category,'voice');
  assert(fs.existsSync(c.NovaAudioManifest[src].src));
 }
});
