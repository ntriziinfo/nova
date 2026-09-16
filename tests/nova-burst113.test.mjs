import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadModel} from '../scripts/zone-v2-model.mjs';

test('ura success reserves a zone without granting quota before zone play',()=>{
 loadModel();const a=NovaArt;
 const base={...a.enter({setting:6},()=>0),remaining:'317',burstUsed:true,burstPending:true};
 const pending=a.normalize(JSON.parse(JSON.stringify(base)));
 assert.equal(pending.remaining,'317');assert.equal(pending.atLevel,undefined);
 const won=a.step(pending,{setting:6},()=>0);
 assert.equal(won.flow.remaining,'317');assert.equal(won.flow.atLevel,undefined);
 assert.equal(won.burstEvent,'success');assert.match(won.message,/裏ギル/);assert.doesNotMatch(won.message,/8,000/);
 const reload=a.normalize(JSON.parse(JSON.stringify(won.flow)));
 assert.equal(reload.remaining,'317');assert.equal(reload.atLevel,undefined);
 // Already awarded quota must not be divided or retroactively reduced on update.
 const oldWon=a.normalize({...won.flow,remaining:'8150'});
 assert.equal(oldWon.remaining,'8150');assert.equal(oldWon.burstUsed,true);
});

test('six-setting ura entry rates are valid and keep 50% success',()=>{
 loadModel();const a=NovaArt;
 assert.equal(a.burstRules.awards,undefined);assert.equal(a.burstRules.games,3);assert.equal(a.burstRules.success,.5);
 for(let s=1;s<=6;s++){
  assert.ok(a.burstChance('STRONG_NOVA',s)>0);
  for(const role of Object.keys(a.burstRules.roles))assert.ok(a.burstChance(role,s)<=1);
  assert.equal(a.burstChance('BELL',s),0);assert.equal(a.burstChance('REPLAY',s),0);
  assert.equal(a.enter({setting:s},()=>.99999).atLevel,undefined);
  assert.equal(a.enter({setting:s},()=>0).remaining,String(a.defaults.initial));
 }
 const html=fs.readFileSync('jag.html','utf8');assert.match(html,/直接pt報酬とレベル昇格は廃止/);assert.doesNotMatch(html,/成功すると＋8,000pt/);
});
