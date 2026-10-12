import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const src=fs.readFileSync('nova-game.js','utf8'),c=vm.createContext({superSpeedActive:false,settings:{masterVolume:.5,bgmVolume:.5,sfxVolume:.5,voiceVolume:.5,payoutVolume:.5,audioMuted:false},DEFAULT_MASTER_VOLUME:.5,SFX_OUTPUT_SCALE:1,PAYOUT_SOUND_OUTPUT_SCALE:1,clamp:(n,a,b)=>Math.max(a,Math.min(b,n))});for(const name of ['audioOutputVolume','bgmOutputVolume','sfxOutputVolume','voiceOutputVolume','payoutOutputVolume'])vm.runInContext(src.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0],c);
const near=(a,b)=>assert(Math.abs(a-b)<1e-12);
test('super speed halves every category without changing saved sliders, then restores current master',()=>{
 const functions=['bgmOutputVolume','sfxOutputVolume','voiceOutputVolume','payoutOutputVolume'];
 const saved=JSON.stringify(c.settings),normal=functions.map(fn=>c[fn]());
 c.superSpeedActive=true;functions.forEach((fn,i)=>near(c[fn](),normal[i]/2));
 assert.equal(JSON.stringify(c.settings),saved);
 c.settings.masterVolume=.8;functions.forEach((fn,i)=>near(c[fn](),normal[i]*.8));
 c.superSpeedActive=false;functions.forEach((fn,i)=>near(c[fn](),normal[i]*1.6));
 c.settings.masterVolume=.5;
});
test('all sliders at 50 reproduce exactly the 25/34/50/64/50 supplied mix',()=>{near(c.bgmOutputVolume(),.25*.34);near(c.sfxOutputVolume(),.25*.5);near(c.voiceOutputVolume(),.25*.64);near(c.payoutOutputVolume(),.25*.5);});
test('calibrated controls remain monotonic, zero and mute stay silent',()=>{for(const [key,fn] of [['bgmVolume','bgmOutputVolume'],['sfxVolume','sfxOutputVolume'],['voiceVolume','voiceOutputVolume'],['payoutVolume','payoutOutputVolume']]){c.settings[key]=0;near(c[fn](),0);c.settings[key]=.5;const base=c[fn]();c.settings[key]=1;near(c[fn](),base*2);c.settings[key]=.5;}c.settings.audioMuted=true;for(const fn of ['bgmOutputVolume','sfxOutputVolume','voiceOutputVolume','payoutOutputVolume'])near(c[fn](),0);c.settings.audioMuted=false;});
