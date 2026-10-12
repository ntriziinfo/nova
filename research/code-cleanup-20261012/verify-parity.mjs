import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const baseline='d15fe00498dcf353888e5a893cd4aae2958bbedd';
const normalize=s=>s.replaceAll('\r\n','\n');
const read=file=>normalize(fs.readFileSync(file,'utf8'));
const prior=file=>normalize(execFileSync('git',['show',baseline+':'+file],{encoding:'utf8',windowsHide:true,maxBuffer:4*1024*1024}));
const hash=s=>createHash('sha256').update(s).digest('hex');
const before=prior('nova-game.js'),after=read('nova-game.js');
const functions=source=>new Map([...source.matchAll(/^  (?:async )?function (\w+)\(/gm)].map(m=>{
 const firstEnd=source.indexOf('\n',m.index),line=source.slice(m.index,firstEnd);
 const end=line.trimEnd().endsWith('}')?firstEnd:source.indexOf('\n  }',firstEnd)+4;
 assert(end>m.index,m[1]);return [m[1],source.slice(m.index,end)];
}));
const oldFunctions=functions(before),newFunctions=functions(after);
for(const [name,source] of oldFunctions)assert.equal(newFunctions.get(name),source,name);
assert.deepEqual([...newFunctions.keys()].filter(n=>!oldFunctions.has(n)),['preloadOneShotSound']);

const banks={};
vm.runInNewContext(before.slice(before.indexOf('  const BELL_NAVI_VOICE_SRCS='),before.indexOf('  const CHARACTER_VOICE_KEYS='))+
 ';globalThis.catalog={BELL_NAVI_VOICE_SRCS,BELL_NAVI_COMPLETE_VOICE_SRCS,AIM_VOICE_SRCS,SEVEN_ZONE_VOICE_SRCS,NEBULA_ZONE_VOICE_SRCS,ZONE_START_VOICE_SRCS,ZONE_CONTINUE_VOICE_SRCS,MODE_EVENT_VOICE_SRCS,OUMA_NOVA_VOICE_SRCS,GIRU_LADDER_VOICE_SRCS,SOSUKE_LADDER_VOICE_SRCS,RARE_CUE_VOICE_SRCS,CHARACTER_VOICE_SRCS};',banks);
const current={};vm.runInNewContext(read('nova-voice-catalog.js'),current);
assert.equal(JSON.stringify(current.NovaVoiceCatalog),JSON.stringify(banks.catalog));

function preloads(source){
 const loads=[];
 class Audio{constructor(src){this.src=src;this.loop=false;}load(){loads.push(this.src);}}
 const context={Audio,NovaVoiceCatalog:current.NovaVoiceCatalog,NovaSortie:{setSoundPlayer(){}},
  normalizedAudioSourceKey:s=>s.split('?')[0],INITIAL_DUO_ZONE_BGM_SRC:'duo-bgm',SORTIE_ZONE_BGM_SRC:'sortie-bgm'};
 const helper=functions(source).get('preloadOneShotSound')||'';
 vm.runInNewContext(helper+source.slice(source.indexOf('  const aimWinAudios='),source.indexOf('  let gekiatsuActive'))+
 ';globalThis.cache=Array.from(oneShotSoundCache,([src,audio])=>({src,preload:audio.preload,loop:audio.loop}));',context);
 return {loads,cache:JSON.parse(JSON.stringify(context.cache))};
}
assert.deepEqual(preloads(after),preloads(before));
const engineFiles=['nova-art.js','nova-normal.js','nova-flow.js','nova-tuning.js','nova-decrement.js','nova-progress.js','nova-balance.js','nova-complete.js','scripts/zone-v2-model.mjs','scripts/zone-v2-rng.mjs'];
const hashes={};
for(const file of engineFiles){assert.equal(read(file),prior(file),file);hashes[file]=hash(read(file));}
for(const file of ['nova-audio-manifest.js','audio-normalization.json','nova-game.css','nova-results.js'])assert.equal(read(file),prior(file),file);
const report={baseline,unchangedGameFunctions:oldFunctions.size,voiceBanks:13,voiceSources:current.NovaVoiceCatalog.CHARACTER_VOICE_SRCS.length,
 voiceRoutingAndOrderIdentical:true,preloadOrderAndCacheIdentical:true,oneShotPlayers:preloads(after).cache.length,
 audioManifestAndNormalizationUnchanged:true,engineHashes:hashes};
fs.writeFileSync('research/code-cleanup-20261012/parity.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
