import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {beforeAudioDefaults} from './audio-defaults-source.mjs';

// Reconstruct the previous release only for its historical presentation proofs.
// This gameplay change is NOT a presentation-equivalence entry: current RTP is pending.
export function beforeCheckpointInterruption(source){
 source=beforeAudioDefaults(source);
 const block="      // Payout (including the internal navigation ledger) is settled above.\n      // Interrupt only at this completed-spin boundary, never during a stop.\n      if(!resolved.bonusHit&&!resolved.aTypeBonusReady)normalState.flow=NovaProgress.prepareCountdown(normalState.flow,currentGameProfit());\n";
 assert.equal(source.split(block).length,2);
 source=source.replace(block,'').replace('!debugFastSpinActive&&!normalState.flow.checkpointCountdown&&NovaLadder.eligible(resolved.flowBefore)','!debugFastSpinActive&&NovaLadder.eligible(resolved.flowBefore)');
 source=source.replace("      const zoneBefore=resolved.zoneStartFlow||resolved.flowBefore;\n      const zoneCard=trackZoneResult(resolved.comebackEvent==='entry'?null:NovaResults.transition(zoneBefore,normalState.flow,settings.setting),zoneBefore,normalState.flow);","      const zoneCard=trackZoneResult(resolved.comebackEvent==='entry'?null:NovaResults.transition(resolved.flowBefore,normalState.flow,settings.setting),resolved.zoneStartFlow||resolved.flowBefore,normalState.flow);");
 assert.equal(createHash('sha256').update(source).digest('hex'),'d4eca49434f2644495774421649e0cf82e1219c56182bfbe7102e12749a3a0e9');
 return source;
}
