import test from 'node:test';
import fs from 'node:fs';
import {beforeAudioDefaults} from './helpers/audio-defaults-source.mjs';

test('only audio defaults, category calibration and audio-setting migration differ from the checkpoint simulation source',()=>{
 beforeAudioDefaults(fs.readFileSync('tests/fixtures/pre-premium-removal/nova-game.js','utf8').replace(/\r\n/g,'\n'));
});
