import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const cabinetEdits=JSON.parse(fs.readFileSync(new URL('./retired-cabinet-source.json',import.meta.url),'utf8'));
const edits=JSON.parse(fs.readFileSync(new URL('./push-variants-premium-source.json',import.meta.url),'utf8'));
// Undo retired cabinet readouts and the preceding presentation-only edits. No approximate substitutions.
export function beforePushVariantsAndPremiumCleanup(source){
 const counterEdits=JSON.parse(fs.readFileSync(new URL('./role-counter-source.json',import.meta.url),'utf8'));
 for(const [after,before] of counterEdits){
  assert.equal(source.split(after).length,2,'First-hit counter change must match exactly once');
  source=source.replace(after,()=>before);
 }
 assert.equal(createHash('sha256').update(source).digest('hex'),'f47a0533389e729ff33092477782e5c2c82777f31e959e60b154d954b81ea13a');
 const mixEdits=JSON.parse(fs.readFileSync(new URL('./audio-mix-center-source.json',import.meta.url),'utf8'));
 for(const [after,before] of mixEdits){
  assert.equal(source.split(after).length,2,'Audio calibration must match exactly once');
  source=source.replace(after,()=>before);
 }
 assert.equal(createHash('sha256').update(source).digest('hex'),'b4af06aaff89aaeb80bdee02e06134122625c0f2f77db429a379d1f56cedc7e9');
 for(const hook of [
  "    if(resolved.atPrelude?.confirmed)globalThis.NovaAtPatrol?.confirm();\n",
  "    globalThis.NovaAtPatrol?.sync(session.active||normalState.bonusPending||debugFastSpinActive||speedToBonusActive||normalState.resultCard||normalState.stockEntry||isCompleteTrialLocked()?null:normalState.flow,resolved);\n"
 ]){
  assert.equal(source.split(hook).length,2,'Patrol presentation hook must occur exactly once');
  source=source.replace(hook,'');
 }
 assert.equal(createHash('sha256').update(source).digest('hex'),'53db720e064bca4b337f5cbfb379fde1fd69de2c4de3f7ec5a711c3e9054998a');
 for(const [after,before] of cabinetEdits){
  assert.equal(source.split(after).length,2,'Cabinet removal must match exactly once');
  source=source.replace(after,before);
 }
 assert.equal(createHash('sha256').update(source).digest('hex'),'ba8b58f6d5a8042d84df0749a0c735bda3b864e33c45a7662a1bf19088925fcc');
 for(const [after,before] of edits){assert.equal(source.split(after).length,2,'Presentation edit must match exactly once');source=source.replace(after,before);}
 assert.equal(createHash('sha256').update(source).digest('hex'),'dffd882384e0b7e9fe9cabcfdb7ca160d92be9ba89f3c6901d145486eadd7906');
 return source;
}
