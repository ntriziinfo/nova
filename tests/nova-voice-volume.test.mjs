import {loadVoiceCatalog} from './helpers/voice-catalog.mjs';
import {readGameSource} from '../scripts/game-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=readGameSource();
const fn=name=>html.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0];
const voices=html.slice(html.indexOf('  const BELL_NAVI_VOICE_SRCS='),html.indexOf('  for(const src of CHARACTER_VOICE_SRCS)'));
function setup(){
 let now=0;const frames=[];
 const nodes=[],sources=[];
 const makeNode=kind=>{const node={kind,connections:[],connect(target){this.connections.push(target);},disconnect(){this.connections=[];},gain:{},threshold:{},knee:{},ratio:{},attack:{},release:{}};nodes.push(node);return node;};
 const audioContext={state:'suspended',destination:{},resumes:0,resume(){this.state='running';this.resumes++;return Promise.resolve();},createGain:()=>makeNode('gain'),createDynamicsCompressor:()=>makeNode('limiter'),createMediaElementSource(audio){assert(!sources.some(s=>s.audio===audio),'element connected twice');const node=makeNode('source');node.audio=audio;sources.push(node);return node;}};
 class Audio{
  constructor(src){this.src=src;this.plays=0;this.paused=true;this.currentTime=0;}
  getAttribute(){return this.src;}
  setAttribute(name,value){this[name]=value;}
  load(){}
  pause(){this.paused=true;}
  play(){this.paused=false;this.plays++;return Promise.resolve();}
  cloneNode(){return new Audio(this.src);}
 }
 const c=vm.createContext({superSpeedActive:false,Audio,getAudio:()=>audioContext,debugFastSpinActive:false,speedToBonusActive:false,premiumBigConfirmSilence:false,settings:{voiceVolume:.4,sfxVolume:.9,masterVolume:.5,audioMuted:false},SFX_OUTPUT_SCALE:1,DEFAULT_MASTER_VOLUME:.7,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),oneShotSoundCache:new Map(),aimWinAudios:new Set(),performance:{now:()=>now},setInterval(f){frames.push(f);return frames.length;},clearInterval(){},audioSourceOutputScale:src=>src.endsWith('shutter.wav')?10**(-11/20):3});
 for(const name of ['normalizedAudioSourceKey','audioOutputVolume','voiceOutputVolume','sfxOutputVolume','applyAudioSourceOutputScale'])vm.runInContext(fn(name),c);
 loadVoiceCatalog(c);
 vm.runInContext(voices+';globalThis.voiceSources=CHARACTER_VOICE_SRCS;',c);
 for(const name of ['resumeCharacterVoiceAudio','prepareCharacterVoiceAudio','releaseCharacterVoiceAudio','soundOutputVolume','aimWinOutputVolume','applyCharacterVoiceOutputVolumes','playOneShotSound','playAimSevenWinSound','fadeAimWinSoundsOnBet'])vm.runInContext(fn(name),c);
 return {c,Audio,nodes,sources,audioContext,tick(ms){now=ms;frames.forEach(f=>f());}};
}
const near=(a,b)=>assert(Math.abs(a-b)<1e-10,`${a} != ${b}`);

test('mastered one-shots use their category slider and ignore historical per-file trims',()=>{
 const {c}=setup();
 c.NovaAudioAssets={entry:src=>({category:src})};
 c.bgmOutputVolume=()=>.13;c.payoutOutputVolume=()=>.17;
 near(c.soundOutputVolume('voice',.99),.128);near(c.soundOutputVolume('sfx',.99),.225);
 near(c.soundOutputVolume('bgm',.99),.13);near(c.soundOutputVolume('payout',.99),.17);
 vm.runInContext(fn('audioSourceOutputScale'),c);
 near(c.audioSourceOutputScale('assets/media/nova/shutter.wav'),1);
});

test('mastered reverse-reel SE retains its requested +5 dB trim and follows SFX, master and mute controls',()=>{
 const {c}=setup(),src='assets/media/nova/ouma-reverse-v2.wav';
 c.NovaAudioAssets={entry:()=>({category:'sfx'})};
 const trim=html.split('\n').find(line=>line.includes("['"+src+"']:"));
 assert(trim,'Reverse SE needs an explicit, adjustable trim');
 vm.runInContext(fn('dbToGain')+'\nconst AUDIO_SOURCE_OUTPUT_SCALE=Object.freeze({'+trim+'});\n'+fn('audioSourceOutputScale')+fn('sfxOutputVolumeForSource'),c);
 near(c.sfxOutputVolumeForSource(1,src),.225*10**(5/20));
 near(c.sfxOutputVolumeForSource(1,src+'?v=new'),.225*10**(5/20));
 for(const other of ['assets/media/nova/shutter.wav','assets/media/nova/uuufa.wav','assets/media/nova/ouma-fail.wav'])near(c.sfxOutputVolumeForSource(1,other),.225);
 c.settings.masterVolume=.7;c.settings.sfxVolume=.5;near(c.sfxOutputVolumeForSource(1,src),.175*10**(5/20));
 c.settings.sfxVolume=0;assert.equal(c.sfxOutputVolumeForSource(1,src),0);
 c.settings.masterVolume=1;c.settings.sfxVolume=1;near(c.sfxOutputVolumeForSource(1,src),.5*10**(5/20));
 c.settings.audioMuted=true;assert.equal(c.sfxOutputVolumeForSource(1,src),0);
 c.oumaReverseAudio={volume:1,currentTime:2.5};c.oumaIntroAudio={volume:1,currentTime:.5};
 vm.runInContext(fn('applyOumaAudioOutputVolumes'),c);
 c.applyOumaAudioOutputVolumes();assert.equal(c.oumaReverseAudio.volume,0);assert.equal(c.oumaIntroAudio.volume,0);
 c.settings.audioMuted=false;c.settings.masterVolume=.4;c.settings.sfxVolume=.25;c.applyOumaAudioOutputVolumes();
 near(c.oumaReverseAudio.volume,.05*10**(5/20));near(c.oumaIntroAudio.volume,.05);
 assert.equal(c.oumaReverseAudio.currentTime,2.5);assert.equal(c.oumaIntroAudio.currentTime,.5);
});

test('every registered character line uses one voice category regardless of caller volume, source gain or SFX slider',()=>{
 const {c}=setup();
 for(const src of c.voiceSources){
  assert(fs.existsSync(src.split('?')[0]),src);
  c.playOneShotSound(src,.99);const audio=c.oneShotSoundCache.get(src);near(audio.volume,.128);
  c.settings.sfxVolume=0;c.playOneShotSound(src,0);near(audio.volume,.128);
 }
 for(const src of ['assets/media/nova/aim/zone-roulette-confirm.wav?v=future','assets/media/jag/cz_last.wav?v=future']){
  c.playOneShotSound(src,0);near(c.oneShotSoundCache.get(src).volume,.128);
 }
});

test('BGM and mute updates use the cached result sound, including before it has loaded',()=>{
 const {c,Audio}=setup();
 Object.assign(c,{bgm:null,barBgm:null,battleBgm:null,BGM_OUTPUT_SCALE:1,bgmOutputVolumeForSource:()=>.13});
 vm.runInContext(fn('applyBgmOutputVolumes'),c);
 c.applyBgmOutputVolumes();
 const src='assets/media/nova/result-eyecatch.wav',audio=new Audio(src);audio.currentTime=1.5;
 c.oneShotSoundCache.set(src,audio);c.applyBgmOutputVolumes();near(audio.volume,.13);assert.equal(audio.currentTime,1.5);
 c.bgmOutputVolumeForSource=()=>0;c.applyBgmOutputVolumes();assert.equal(audio.volume,0);assert.equal(audio.plays,0);
});

test('a playing voice immediately follows common voice/master/mute controls without restarting',()=>{
 const {c}=setup(),src='assets/media/nova/navi-left-giru.wav';c.playOneShotSound(src);
 const audio=c.oneShotSoundCache.get(src);audio.currentTime=.3;
 c.settings.voiceVolume=.8;c.applyCharacterVoiceOutputVolumes();near(audio.volume,.256);
 c.settings.masterVolume=.25;c.applyCharacterVoiceOutputVolumes();near(audio.volume,.128);
 c.settings.audioMuted=true;c.applyCharacterVoiceOutputVolumes();assert.equal(audio.volume,0);
 c.settings.audioMuted=false;c.settings.voiceVolume=0;c.applyCharacterVoiceOutputVolumes();assert.equal(audio.volume,0);
 c.settings.voiceVolume=.6;c.applyCharacterVoiceOutputVolumes();near(audio.volume,.096);
 assert.equal(audio.plays,1);assert.equal(audio.currentTime,.3);
});

test('NOVA RUSH confirmation voice follows the voice slider throughout its existing BET fade; win effects stay SFX',()=>{
 const {c,Audio,tick}=setup();
 for(const name of ['bonus-nebula','nebula','seven'])c.oneShotSoundCache.set('assets/media/nova/aim/'+name+'-win.wav',new Audio('assets/media/nova/aim/'+name+'-win.wav'));
 c.playAimSevenWinSound('nebula',{aTypeBonusGame:true});c.playAimSevenWinSound('nebula');c.playAimSevenWinSound('seven');
 const [voice,nebula,seven]=[...c.aimWinAudios];near(voice.volume,.128);
 assert(nebula.volume>.2&&seven.volume>.2);
 c.fadeAimWinSoundsOnBet();tick(1500);near(voice.volume,.064);
 c.settings.voiceVolume=.8;c.applyCharacterVoiceOutputVolumes();near(voice.volume,.128);
 c.settings.sfxVolume=0;c.applyCharacterVoiceOutputVolumes();near(voice.volume,.128);assert.equal(nebula.volume,0);assert.equal(seven.volume,0);
 c.settings.audioMuted=true;c.applyCharacterVoiceOutputVolumes();assert.equal(voice.volume,0);
 c.settings.audioMuted=false;tick(2250);near(voice.volume,.064);
 tick(3000);assert.equal(voice.volume,0);assert.equal(voice.paused,true);assert.equal(c.aimWinAudios.size,0);assert.equal(voice.plays,1);
});

test('voice mute does not suppress effects or change the existing shutter attenuation',()=>{
 const {c}=setup();c.settings.voiceVolume=0;
 const src='assets/media/nova/shutter.wav';c.playOneShotSound(src,c.sfxOutputVolume());near(c.oneShotSoundCache.get(src).volume,.225*10**(-11/20));
 c.playOneShotSound('assets/media/nova/bonus_confirm.wav',1);assert.equal(c.oneShotSoundCache.get('assets/media/nova/bonus_confirm.wav').volume,0);
});

test('mastered voices use a unity bus without the old extra +10 dB; effects bypass it',()=>{
 const {c,nodes,sources,audioContext}=setup();
 for(const src of c.voiceSources){c.playOneShotSound(src);c.playOneShotSound(src);}
 assert.equal(sources.length,c.voiceSources.length);
 const [gain]=nodes.filter(n=>n.kind==='gain'),[limiter]=nodes.filter(n=>n.kind==='limiter');
 near(20*Math.log10(gain.gain.value),0);
 assert.deepEqual(gain.connections,[limiter]);assert.deepEqual(limiter.connections,[audioContext.destination]);
 assert.equal(limiter.threshold.value,-1);assert.equal(limiter.ratio.value,20);assert.equal(limiter.attack.value,0);
 for(const source of sources)assert.deepEqual(source.connections,[gain]);
 assert.equal(audioContext.resumes,1);
 const count=sources.length;c.playOneShotSound('assets/media/nova/shutter.wav');assert.equal(sources.length,count);
 c.settings.voiceVolume=1;c.settings.masterVolume=1;c.applyCharacterVoiceOutputVolumes();
 assert.equal(sources[0].audio.volume,.64);near(gain.gain.value,1);
 audioContext.state='suspended';c.playOneShotSound(c.voiceSources[0]);assert.equal(audioContext.resumes,2);
});

test('cloned confirmation voices disconnect on completion, failure and fade without affecting cached voices',async()=>{
 const {c,Audio,sources,tick}=setup(),src='assets/media/nova/aim/bonus-nebula-win.wav';
 c.oneShotSoundCache.set(src,new Audio(src));
 c.playAimSevenWinSound('nebula',{aTypeBonusGame:true});sources[0].audio.onended();assert.deepEqual(sources[0].connections,[]);
 c.playAimSevenWinSound('nebula',{aTypeBonusGame:true});c.fadeAimWinSoundsOnBet();tick(3000);assert.deepEqual(sources[1].connections,[]);
 c.oneShotSoundCache.get(src).cloneNode=()=>({play:()=>Promise.reject(new Error('blocked'))});
 c.playAimSevenWinSound('nebula',{aTypeBonusGame:true});await Promise.resolve();assert.deepEqual(sources[2].connections,[]);
});
