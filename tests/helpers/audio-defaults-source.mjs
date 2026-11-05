import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {beforeAudioCalibration} from './audio-calibration-source.mjs';

export const previousAudioSourceHash='b2c2a90e6edf4bea490bc7cd19df55db0131f0fd1ca0a8c77641b298d0c5cc6c';
export function beforeAudioDefaults(source){
 source=beforeAudioCalibration(source);
 for(const [name,value] of [['BGM','1.00'],['SFX','1.00'],['VOICE','0.57'],['PAYOUT','0.37']]){
  const current=`  const DEFAULT_${name}_VOLUME = ${value};`;
  assert.equal(source.split(current).length,2);
  source=source.replace(current,`  const DEFAULT_${name}_VOLUME = 0.50;`);
 }
 assert.equal(createHash('sha256').update(source).digest('hex'),previousAudioSourceHash);
 return source;
}
