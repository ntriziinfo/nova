import test from 'node:test';
import fs from 'node:fs';
import {beforeAudioDefaults} from './helpers/audio-defaults-source.mjs';

test('only four audio default constants differ from the active checkpoint simulation source',()=>{
 beforeAudioDefaults(fs.readFileSync('nova-game.js','utf8').replace(/\r\n/g,'\n'));
});
