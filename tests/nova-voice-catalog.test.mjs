import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {loadVoiceCatalog} from './helpers/voice-catalog.mjs';

test('catalog loads without browser APIs or randomness and every routed voice has a mastered voice entry',()=>{
 const context=vm.createContext({});
 vm.runInContext('Math.random=()=>{throw Error("Catalog must not draw RNG");}',context);
 const catalog=loadVoiceCatalog(context);
 vm.runInContext(fs.readFileSync('nova-audio-manifest.js','utf8'),context);
 const sources=Array.from(catalog.CHARACTER_VOICE_SRCS),registered=new Set(sources);
 assert.equal(registered.size,sources.length,'Voice preload list must not contain duplicates');
 const leaves=value=>typeof value==='string'?[value]:Object.values(value).flatMap(leaves);
 for(const [name,bank] of Object.entries(catalog))for(const source of leaves(bank)){
  assert(registered.has(source),`${name}: voice missing from shared volume/preload list`);
  const key=source.split('?')[0],master=context.NovaAudioManifest[key];
  assert.equal(master?.category,'voice',`${name}: ${key}`);
  assert(fs.existsSync(key));assert(fs.existsSync(master.src));
 }
 // Navigation uses the same speaker for all three positions and completion.
 for(const [speaker,directions] of Object.entries(catalog.BELL_NAVI_VOICE_SRCS)){
  assert.equal(directions.length,3,speaker);
  assert(catalog.BELL_NAVI_COMPLETE_VOICE_SRCS[speaker],speaker);
 }
});
