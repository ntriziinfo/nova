import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const h=fs.readFileSync('jag.html','utf8'),fn=n=>h.match(new RegExp('  function '+n+'\\([^]*?\\n  }'))[0];
test('cancelled reverse playback cannot start when its play promise resolves later',async()=>{
 let resolve,created=0,paused=0,started=0;const ctx=vm.createContext({Audio:function(){created++;this.play=()=>new Promise(r=>resolve=r);this.pause=()=>paused++;this.removeAttribute=()=>{};this.load=()=>{};},performance:{now:()=>0},setTimeout:()=>1,clearTimeout(){},sfxOutputVolumeForSource:()=>.93,SFX_OUTPUT_SCALE:1,reels:[{}, {}, {}],REEL_STRIPS:[[],[],[]],cellHtml(){},NovaReelMotion:{startSynced(){started++;}},currentSpin:{resolved:{oumaFreeze:true},grid:[[],[],[]]}});
 vm.runInContext('var oumaReverseAudio=null,oumaReverseLoadTimer=null;'+fn('clearOumaReverseAudio')+fn('startOumaReverseAudio'),ctx);
 ctx.startOumaReverseAudio({resolved:{oumaFreeze:false}});assert.equal(created,0);
 ctx.startOumaReverseAudio(ctx.currentSpin);assert.equal(created,1);assert.equal(ctx.oumaReverseAudio.volume,.93);
 ctx.clearOumaReverseAudio();resolve();await Promise.resolve();await Promise.resolve();assert.equal(started,0);assert.equal(ctx.oumaReverseAudio,null);assert.ok(paused>=2);
});
