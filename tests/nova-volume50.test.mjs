import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {installVolumeCalibration} from './helpers/audio-mix.mjs';

const source = fs.readFileSync('nova-game.js', 'utf8');
const channels = [
  ['bgmVolume', 'bgmOutputVolume', .69, 1.36],
  ['sfxVolume', 'sfxOutputVolume', .46, 2],
  ['voiceVolume', 'voiceOutputVolume', .55, 1.4592],
  ['payoutVolume', 'payoutOutputVolume', .52, .74]
];
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-12, actual + ' != ' + expected);
function mixer(){
  const settings = {masterVolume:.68, audioMuted:false, audioCalibrationVersion:3};
  for(const [key] of channels) settings[key] = .5;
  const c = vm.createContext({
    settings, superSpeedActive:false, DEFAULT_MASTER_VOLUME:.5, SFX_OUTPUT_SCALE:1, PAYOUT_SOUND_OUTPUT_SCALE:1,
    clamp:(n,a,b)=>Math.max(a,Math.min(b,n))
  });
  installVolumeCalibration(source, c);
  for(const name of ['audioOutputVolume', ...channels.map(row=>row[1])]){
    vm.runInContext(source.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0], c);
  }
  return c;
}

test('50 on each category reproduces its screenshot level at any master and in super speed', ()=>{
  const c = mixer();
  for(const master of [0,.5,.68,1]) for(const fast of [false,true]){
    c.settings.masterVolume = master;
    c.superSpeedActive = fast;
    for(const [key,fn,oldLevel,gain] of channels){
      near(c[fn](), oldLevel * gain * master * .5);
      assert.equal(c.settings[key], .5);
    }
  }
});

test('v2 screenshot sliders migrate to 50 exactly once with master, mute, movie and game settings intact', ()=>{
  const c = mixer(), saved = {masterVolume:.68, audioMuted:true, movieVolume:.43, setting:5, stock:3};
  for(const [key,,oldLevel] of channels) saved[key] = oldLevel;
  c.migrateAudioCalibration(saved, 2);
  for(const [key] of channels) near(saved[key], .5);
  assert.equal(saved.masterVolume, .68);
  assert.equal(saved.audioMuted, true);
  assert.equal(saved.movieVolume, .43);
  assert.equal(saved.setting, 5);
  assert.equal(saved.stock, 3);
  assert.equal(saved.audioCalibrationVersion, 3);
  const once = {...saved};
  c.migrateAudioCalibration(saved, 3);
  assert.deepEqual(saved, once);
});

test('all v2 custom levels retain audible gain across migration, including silence and full scale', ()=>{
  const c = mixer();
  for(let percent=0; percent<=100; percent++){
    const oldLevel = percent / 100;
    for(const [key] of channels) c.settings[key] = oldLevel;
    c.migrateAudioCalibration(c.settings, 2);
    for(const [key,fn,,gain] of channels){
      near(c[fn](), oldLevel * gain * .68 * .5);
      if(percent === 0 || percent === 100) near(c.settings[key], oldLevel);
    }
  }
  c.settings.audioMuted = true;
  for(const [,fn] of channels) near(c[fn](), 0);
});

test('v1 settings follow the prior migration then the new category scale', ()=>{
  const c = mixer();
  Object.assign(c.settings, {bgmVolume:1, sfxVolume:.8, voiceVolume:.57, payoutVolume:1});
  c.migrateAudioCalibration(c.settings, 1);
  const v2Levels = [.5, .4, .5, 1];
  channels.forEach(([,fn,,gain],i)=>near(c[fn](), v2Levels[i] * gain * .68 * .5));
});
