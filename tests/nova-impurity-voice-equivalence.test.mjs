import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {withoutReliabilityPresentation} from './helpers/reliability-source.mjs';
import {beforeCheckpointInterruption} from './helpers/checkpoint-source.mjs';
test('historical voice-routing presentation proof remains reproducible before the checkpoint gameplay change',()=>{
 let source=withoutReliabilityPresentation(beforeCheckpointInterruption(fs.readFileSync('nova-game.js','utf8').replaceAll('\r\n','\n')));
 source=source.replace("      else if(session.impurityReleased)playOneShotSound(MODE_EVENT_VOICE_SRCS.impurityNebulaAim,voiceOutputVolume(),{allowDuringPremiumConfirm:true});\n",'');
 source=source.replace('function playRandomAimVoice(symbol,rng=Math.random,overrideSrc){','function playRandomAimVoice(symbol,rng=Math.random){')
 .replace('playOneShotSound(overrideSrc||src,voiceOutputVolume(),{allowDuringPremiumConfirm:true});','playOneShotSound(src,voiceOutputVolume(),{allowDuringPremiumConfirm:true});')
 .replace("      // Preserve the existing character draw when using the supplied BB voice.\n      if(resolved.initialBonusGame)playRandomAimVoice('nebula',rng,session.impurityReleased?MODE_EVENT_VOICE_SRCS.impurityNebulaAim:undefined);","      if(resolved.initialBonusGame)playRandomAimVoice('nebula',rng);");
 const report=JSON.parse(fs.readFileSync('docs/rtp-current-1b.json'));
 assert.equal(createHash('sha256').update(source).digest('hex'),report.sourceHashes['nova-game.js']);
});
