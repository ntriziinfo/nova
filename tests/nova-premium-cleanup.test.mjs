import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const game=fs.readFileSync('nova-game.js','utf8');const fn=n=>game.match(new RegExp('  function '+n+'\\([^]*?\\n  }'))[0];
test('Premium BIG media, handlers and markup are removed; active NOVA media remains registered',()=>{
 for(const f of ['nova-game.js','nova-game.css','jag.html','nova-audio-manifest.js'])assert.doesNotMatch(fs.readFileSync(f,'utf8'),/assets\/[^'"\n]*premium_|premiumBigReelMovie|playPremiumBig|PREMIUM_(?:BIG|PIERO|BONUS)_.*SRC/);
 const c={};vm.runInNewContext(fs.readFileSync('nova-audio-manifest.js','utf8'),c);
 for(const src of ['assets/media/nova/BIG.wav','assets/media/nova/upper-at-bgm.mp3','assets/media/nova/impurity-release-bgm-1143035-20261030.mp3'])assert(c.NovaAudioManifest[src],src);
 const manifest=JSON.parse(fs.readFileSync('deploy-assets.json','utf8'));
 const retired=manifest.files.filter(f=>f.retired);assert.equal(retired.filter(f=>f.path.includes('/premium_')).length,9);
 for(const f of retired)assert(!fs.existsSync(f.path));
 for(const dir of ['assets/media/jag','assets/media/normalized-20261012/jag','assets/media/normalized-voices-20261013/jag'])assert(!fs.readdirSync(dir).some(f=>f.startsWith('premium_')));
});
test('old saved premium voice cannot replay or delay an ordinary voice',()=>{
 const clips=[],c=vm.createContext({normalState:{pendingPremiumVoiceSrc:'assets/media/jag/premium_bonus_end_voice.wav',pendingSettingVoiceSrc:'current.wav'},voiceOutputVolume:()=>1,SETTING_VOICE_OUTPUT_SCALE:1,playOneShotSound:src=>clips.push(src),log(){}});
 vm.runInContext(fn('playPendingSettingVoiceOnLever'),c);assert.equal(c.playPendingSettingVoiceOnLever(),true);assert.deepEqual(clips,['current.wav']);assert.equal(c.normalState.pendingPremiumVoiceSrc,'');assert.equal(c.playPendingSettingVoiceOnLever(),false);
});
