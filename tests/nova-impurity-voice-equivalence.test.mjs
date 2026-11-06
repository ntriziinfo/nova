import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {withoutReliabilityPresentation} from './helpers/reliability-source.mjs';
import {beforeCheckpointInterruption} from './helpers/checkpoint-source.mjs';
test('historical voice-routing presentation proof remains reproducible before the checkpoint gameplay change',()=>{
 let source=withoutReliabilityPresentation(beforeCheckpointInterruption(fs.readFileSync('tests/fixtures/pre-premium-removal/nova-game.js','utf8').replaceAll('\r\n','\n')));
 source=source.replace("      else if(session.impurityReleased)playOneShotSound(MODE_EVENT_VOICE_SRCS.impurityNebulaAim,voiceOutputVolume(),{allowDuringPremiumConfirm:true});\n",'');
 source=source.replace('function playRandomAimVoice(symbol,rng=Math.random,overrideSrc){','function playRandomAimVoice(symbol,rng=Math.random){')
 .replace('playOneShotSound(overrideSrc||src,voiceOutputVolume(),{allowDuringPremiumConfirm:true});','playOneShotSound(src,voiceOutputVolume(),{allowDuringPremiumConfirm:true});')
 .replace("      // Preserve the existing character draw when using the supplied BB voice.\n      if(resolved.initialBonusGame)playRandomAimVoice('nebula',rng,session.impurityReleased?MODE_EVENT_VOICE_SRCS.impurityNebulaAim:undefined);","      if(resolved.initialBonusGame)playRandomAimVoice('nebula',rng);");
 // Historical simulation source e113f0f; current RTP evidence advances independently.
 assert.equal(createHash('sha256').update(source).digest('hex'),'7b8a6f7de0fbfb5e0196b197f55820edcaf1791c21bd61db25fe2583a316299c');
});
