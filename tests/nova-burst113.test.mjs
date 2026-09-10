import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadModel} from '../scripts/zone-v2-model.mjs';

test('burst success adds a weighted award and preserves the level when no upgrade is drawn',()=>{
 loadModel();const a=NovaArt;
 const base={...a.enter({setting:6},()=>0),remaining:'317',burstUsed:true,burstPending:true};
 const pending=a.normalize(JSON.parse(JSON.stringify(base)));
 assert.equal(pending.remaining,'317');assert.equal(pending.atLevel,1);
 const won=a.step(pending,{setting:6},()=>0);
 assert.equal(won.flow.remaining,'817');assert.equal(won.flow.atLevel,1);
 assert.equal(won.burstEvent,'success');assert.match(won.message,/500pt/);assert.doesNotMatch(won.message,/8,000/);
 const reload=a.normalize(JSON.parse(JSON.stringify(won.flow)));
 assert.equal(reload.remaining,'817');assert.equal(reload.atLevel,1);
 // Already awarded quota must not be divided or retroactively reduced on update.
 const oldWon=a.normalize({...won.flow,remaining:'8150'});
 assert.equal(oldWon.remaining,'8150');assert.equal(oldWon.burstUsed,true);
});

test('six-setting entry rates are valid and both challenges keep 50% success',()=>{
 loadModel();const a=NovaArt;
 assert.deepEqual(a.burstRules.awards,[500,1000,2000]);assert.equal(a.burstRules.games,3);assert.equal(a.burstRules.success,.5);
 for(let s=1;s<=6;s++){
  assert.ok(a.burstChance('STRONG_NOVA',s)>0);
  for(const role of Object.keys(a.burstRules.roles))assert.ok(a.burstChance(role,s)<=1);
  assert.equal(a.burstChance('BELL',s),0);assert.equal(a.burstChance('REPLAY',s),0);
  assert.equal(a.enter({setting:s},()=>.99999).atLevel,3);
  assert.equal(a.enter({setting:s},()=>0).remaining,String(a.defaults.initial));
 }
 const html=fs.readFileSync('jag.html','utf8');assert.match(html,/pt獲得型は500／1,000／2,000pt/);assert.doesNotMatch(html,/成功すると＋8,000pt/);
});
