import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadModel} from '../scripts/zone-v2-model.mjs';

test('burst success adds 2000 to the retained quota and promotes to Lv5 only after success',()=>{
 loadModel();const a=NovaArt;
 const base={...a.enter({setting:6},()=>0),remaining:'317',burstUsed:true,burstPending:true};
 const pending=a.normalize(JSON.parse(JSON.stringify(base)));
 assert.equal(pending.remaining,'317');assert.equal(pending.atLevel,1);
 const won=a.step(pending,{setting:6},()=>0);
 assert.equal(won.flow.remaining,'2317');assert.equal(won.flow.atLevel,5);
 assert.equal(won.burstEvent,'success');assert.match(won.message,/2,000pt/);assert.doesNotMatch(won.message,/8,000/);
 const reload=a.normalize(JSON.parse(JSON.stringify(won.flow)));
 assert.equal(reload.remaining,'2317');assert.equal(reload.atLevel,5);
 // Already awarded quota must not be divided or retroactively reduced on update.
 const oldWon=a.normalize({...won.flow,remaining:'8150'});
 assert.equal(oldWon.remaining,'8150');assert.equal(oldWon.burstUsed,true);
});

test('calibrated entry rates do not decrease by setting or change 2000pt, 50% success or initial 150pt',()=>{
 loadModel();const a=NovaArt;
 assert.equal(a.burstRules.award,2000);assert.equal(a.burstRules.games,3);assert.equal(a.burstRules.success,.5);
 for(let s=1;s<=6;s++){
  assert.ok(a.burstChance('STRONG_NOVA',s)>0);
  if(s>1)assert.ok(a.burstChance('STRONG_NOVA',s)>=a.burstChance('STRONG_NOVA',s-1));
  assert.equal(a.burstChance('BELL',s),0);assert.equal(a.burstChance('REPLAY',s),0);
  assert.equal(a.enter({setting:s},()=>.99999).atLevel,3);
  assert.equal(a.enter({setting:s},()=>0).remaining,'150');
 }
 const html=fs.readFileSync('jag.html','utf8');assert.match(html,/成功すると＋2,000pt/);assert.doesNotMatch(html,/成功すると＋8,000pt/);
});
