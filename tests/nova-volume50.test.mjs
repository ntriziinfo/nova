import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const src=fs.readFileSync('nova-game.js','utf8'),c=vm.createContext({superSpeedActive:false,settings:{masterVolume:.5,bgmVolume:.5,sfxVolume:.5,voiceVolume:.5,payoutVolume:.5,audioMuted:false},DEFAULT_MASTER_VOLUME:.5,SFX_OUTPUT_SCALE:1,PAYOUT_SOUND_OUTPUT_SCALE:1,clamp:(n,a,b)=>Math.max(a,Math.min(b,n))});for(const name of ['migrateAudioCalibration','audioOutputVolume','bgmOutputVolume','sfxOutputVolume','voiceOutputVolume','payoutOutputVolume'])vm.runInContext(src.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0],c);
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
test('all sliders at 50 reproduce the observed v1 mix 50/100/100/57/37',()=>{near(c.bgmOutputVolume(),.5*1*.5*.68);near(c.sfxOutputVolume(),.5*1*.5);near(c.voiceOutputVolume(),.5*.57*.5*1.28);near(c.payoutOutputVolume(),.5*.37*.5);});
test('saved reference settings become all50 once while play state and mute remain intact',()=>{
 const saved={masterVolume:.5,bgmVolume:1,sfxVolume:1,voiceVolume:.57,payoutVolume:.37,audioCalibrationVersion:1,audioMuted:true,setting:5,remaining:1234,stock:3};
 c.migrateAudioCalibration(saved,saved.audioCalibrationVersion);
 for(const key of ['masterVolume','bgmVolume','sfxVolume','voiceVolume','payoutVolume'])near(saved[key],.5);
 assert.equal(saved.audioCalibrationVersion,2);assert.equal(saved.audioMuted,true);assert.equal(saved.setting,5);assert.equal(saved.remaining,1234);assert.equal(saved.stock,3);
 const once=JSON.stringify(saved);c.migrateAudioCalibration(saved,saved.audioCalibrationVersion);assert.equal(JSON.stringify(saved),once);
});
test('custom sliders retain their audible output where representable and zero remains silent',()=>{
 const saved={masterVolume:.7,bgmVolume:.82,sfxVolume:0,voiceVolume:.23,payoutVolume:.62,audioCalibrationVersion:1};
 const previous={...saved},original=c.settings;
 c.migrateAudioCalibration(saved,1);c.settings=saved;
 near(c.bgmOutputVolume(),previous.masterVolume*.5*previous.bgmVolume*.68);
 near(c.sfxOutputVolume(),0);
 near(c.voiceOutputVolume(),previous.masterVolume*.5*previous.voiceVolume*1.28);
 near(c.payoutOutputVolume(),previous.masterVolume*.5*previous.payoutVolume);
 c.settings=original;
 const limit={bgmVolume:1,sfxVolume:1,voiceVolume:1,payoutVolume:1};c.migrateAudioCalibration(limit,1);assert.equal(limit.payoutVolume,1);
});
test('calibrated controls remain monotonic, zero and mute stay silent',()=>{for(const [key,fn] of [['bgmVolume','bgmOutputVolume'],['sfxVolume','sfxOutputVolume'],['voiceVolume','voiceOutputVolume'],['payoutVolume','payoutOutputVolume']]){c.settings[key]=0;near(c[fn](),0);c.settings[key]=.5;const base=c[fn]();c.settings[key]=1;near(c[fn](),base*2);c.settings[key]=.5;}c.settings.audioMuted=true;for(const fn of ['bgmOutputVolume','sfxOutputVolume','voiceOutputVolume','payoutOutputVolume'])near(c[fn](),0);c.settings.audioMuted=false;});
