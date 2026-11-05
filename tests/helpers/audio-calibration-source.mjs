import {beforeOumaPush} from './ouma-push-source.mjs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

export function beforeAudioCalibration(source){
 source=beforeOumaPush(source);
 const quietControls="    if(category==='sfx'){\n      const trim=['assets/media/nova/spin_start.wav','assets/media/nova/reel-stop.wav'].includes(String(src).split('?')[0])?0.7:1;\n      return Math.min(1,sfxOutputVolume()*trim*(src===SORTIE_SANDWICH_AIM_SOUND_SRC?10**(8/20):1));\n    }";
 assert.equal(source.split(quietControls).length,2);
 source=source.replace(quietControls,"    if(category==='sfx')return Math.min(1,sfxOutputVolume()*(src===SORTIE_SANDWICH_AIM_SOUND_SRC?10**(8/20):1));");
 const migration=source.match(/  \/\/ All50 reproduces calibration v1 sliders 50\/100\/100\/57\/37\.\n  function migrateAudioCalibration\([^]*?\n  }\n\n/);
 assert(migration);
 source=source.replace(migration[0],'  // Reference mix at all50: old master25, BGM34, SFX50, voice64, payout50.\n');
 const replacements=[
  ['  const DEFAULT_BGM_VOLUME = 0.50;','  const DEFAULT_BGM_VOLUME = 1.00;'],
  ['  const DEFAULT_SFX_VOLUME = 0.50;','  const DEFAULT_SFX_VOLUME = 1.00;'],
  ['  const DEFAULT_VOICE_VOLUME = 0.50;','  const DEFAULT_VOICE_VOLUME = 0.57;'],
  ['  const DEFAULT_PAYOUT_VOLUME = 0.50;','  const DEFAULT_PAYOUT_VOLUME = 0.37;'],
  ['    audioCalibrationVersion:2,','    audioCalibrationVersion:1,'],
  ['    return audioOutputVolume(settings.bgmVolume, scale * 1.36);','    return audioOutputVolume(settings.bgmVolume, scale * 0.68);'],
  ['    return audioOutputVolume(settings.sfxVolume, scale * 2);','    return audioOutputVolume(settings.sfxVolume, scale);'],
  ['    return audioOutputVolume(settings.voiceVolume, scale * 1.4592);','    return audioOutputVolume(settings.voiceVolume, scale * 1.28);'],
  ['    return audioOutputVolume(settings.payoutVolume, scale * 0.74);','    return audioOutputVolume(settings.payoutVolume, scale);'],
  ['        migrateAudioCalibration(settings,data.settings.audioCalibrationVersion);',"        // Display 50/50/50/50/50 as the supplied 25/34/50/64/50 reference mix.\n        if((Number(data.settings.audioCalibrationVersion)||0)<1){\n          for(const key of ['masterVolume','bgmVolume','sfxVolume','voiceVolume','payoutVolume'])settings[key]=0.5;\n          settings.audioCalibrationVersion=1;\n        }"]
 ];
 for(const [current,previous] of replacements){assert.equal(source.split(current).length,2,current);source=source.replace(current,previous);}
 assert.equal(createHash('sha256').update(source).digest('hex'),'07e29ce1b9023bda7e4b6310e0254c8f2f52a8366512a92b49517ad18a1910cd');
 return source;
}
