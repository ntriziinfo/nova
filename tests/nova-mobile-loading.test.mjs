import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';

const policy=fs.readFileSync('nova-media.js','utf8');
function environment(compact){
 const elements=[],listeners={};
 const host={dataset:{},append(){},querySelector(){return null;}};
 const context=vm.createContext({
  matchMedia:()=>({matches:compact}),
  Math:Object.assign(Object.create(Math),{random(){throw new Error('Loading must not consume game RNG');}}),
  document:{hidden:false,getElementById:()=>host,addEventListener(name,fn){listeners[name]=fn;},createElement(tag){
   const element={tag,currentTime:0,style:{},dataset:{},append(){},setAttribute(){},load(){this.loads=(this.loads||0)+1;},pause(){this.paused=true;},play(){this.paused=false;return Promise.resolve();}};
   elements.push(element);return element;
  }},
  window:{addEventListener(){},dispatchEvent(){}},Event:class{},setTimeout,clearTimeout
 });
 vm.runInContext(policy,context);
 return {context,elements,listeners};
}

test('mobile image routing preserves licensed originals and desktop source paths',()=>{
 const mobile=environment(true).context.NovaMedia,desktop=environment(false).context.NovaMedia;
 for(const src of ['assets/illustrations/lamps-20260916/sora1.png','assets/symbols/seven-nebula-original.png','assets/symbols/nebula-original.png','unknown.png']){
  assert.equal(mobile.imageSource(src),src);assert.equal(desktop.imageSource(src),src);
 }
 for(const {source,target} of JSON.parse(fs.readFileSync('assets/mobile-20261013/manifest.json')).entries){
  assert.equal(mobile.imageSource(source),target);assert.equal(desktop.imageSource(source),source);
 }
 assert.equal(mobile.videoPreload,'none');assert.equal(desktop.videoPreload,'auto');
});

test('delivery copies exist, preserve source checksums, and reduce image bytes by at least 80%',()=>{
 const {entries}=JSON.parse(fs.readFileSync('assets/mobile-20261013/manifest.json'));
 let original=0,copies=0;
 for(const row of entries){
  const bytes=fs.readFileSync(row.target);
  assert.equal(bytes.toString('ascii',8,12),'WEBP');assert.equal(bytes.length,row.bytes);
  assert.equal(createHash('sha256').update(fs.readFileSync(row.source)).digest('hex'),row.sourceSha256);
  original+=row.originalBytes;copies+=row.bytes;
 }
 assert(copies<original*.2,`${copies} / ${original}`);
});

test('mobile defers hidden aim media while first-use scenes retain their video, title and flow',()=>{
 const {context,elements,listeners}=environment(true);
 vm.runInContext(fs.readFileSync('nova-aim-presentation.js','utf8'),context);
 listeners.DOMContentLoaded();
 assert(elements.filter(e=>e.tag==='video').length>10);
 assert(elements.filter(e=>e.tag==='video').every(e=>e.preload==='none'&&e.hidden));
  assert(elements.filter(e=>e.tag==='video').every(e=>!e.loads),'explicit load can override the mobile preload hint');
 assert(elements.filter(e=>e.tag==='img').every(e=>e.loading==='lazy'&&e.hidden));
 const scenes=[
  [{flowBefore:{phase:'cz',remaining:20,totalGames:20}},'cz-intro-bg.mp4','novaCzIntroTitle'],
  [{flowBefore:{phase:'art',initialStage:'wait'}},'at-wait-bg.mp4','novaAtWaitTitle'],
  [{flowBefore:{phase:'art',comebackLeft:5}},'comeback-fire.mp4','novaComebackTitle'],
  [{researchSortie:{won:false,finished:false}},'sortie-fire-round-20261011.mp4','novaSortieTitle'],
  [{researchChallenge:{started:true,finished:false}},'super-nova-challenge-tunnel-20261012.mp4','novaSuperChallengeTitle']
 ];
 for(const [spin,file,title] of scenes){
  const before=JSON.stringify(spin);context.NovaAim.bet(null,spin);
  const video=elements.find(e=>e.src?.endsWith(file));
  assert.equal(video.hidden,false);assert.equal(video.paused,false);assert.equal(video.loop,true);
  assert.equal(elements.find(e=>e.className===title).hidden,false);
  assert.equal(JSON.stringify(spin),before);assert.equal(context.NovaAim.busy,false);
  context.NovaAim.reset();assert.equal(video.hidden,true);assert.equal(video.paused,true);
 }
});

test('cached mobile effects skip startup downloads but remain playable on demand',async()=>{
 const source=fs.readFileSync('nova-game.js','utf8');
 const fn=source.slice(source.indexOf('  function preloadOneShotSound(src)'),source.indexOf('  function preloadOneShotSound(src)')+700).match(/  function preloadOneShotSound\(src\)\{[^]*?\n  \}/)[0];
 for(const compact of [true,false]){
  let loads=0,plays=0;
  const context=vm.createContext({NovaMedia:{compact},oneShotSoundCache:new Map(),Audio:class{constructor(src){this.src=src;}load(){loads++;}play(){plays++;return Promise.resolve();}}});
  vm.runInContext(fn,context);
  const audio=context.preloadOneShotSound('voice.wav');
  assert.equal(context.oneShotSoundCache.get('voice.wav'),audio);
  assert.equal(loads,compact?0:1);assert.equal(audio.preload,compact?'none':'auto');
  await audio.play();assert.equal(plays,1);assert.equal(audio.loop,false);
 }
});
