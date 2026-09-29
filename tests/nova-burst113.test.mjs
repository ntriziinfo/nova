import {readGameSource} from '../scripts/game-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadModel} from '../scripts/zone-v2-model.mjs';

test('initial challenge success and failure each reserve one ordinary zone without free quota',()=>{
 loadModel();const a=NovaArt;
 for(const win of [false,true]){
  let s={...a.enter({setting:6},()=>.5),remaining:'0',burstPending:true,burstUsed:true,researchChallengeSource:'initial'},out;
  if(win){s=a.step(s,{setting:6},()=>.99,'WEAK_NOVA').flow;out=a.step(s,{setting:6},()=>.99,'MISS');}
  else for(let i=0;i<10;i++){out=a.step(s,{setting:6},()=>.999,'MISS');s=out.flow;}
  assert.equal(out.burstEvent,win?'success':'failure');assert.equal(out.flow.remaining,'0');assert.equal(out.flow.researchUpper,win);
  assert.equal(out.flow.entryStage,'seven');assert(a.zoneIds.includes(out.flow.pendingZone));assert.equal(out.researchChallenge.reward,'zone');
  const saved=a.normalize(JSON.parse(JSON.stringify(out.flow)));assert.deepEqual(saved,out.flow);
  assert.equal(a.normalize({...saved,remaining:'8150'}).remaining,'8150');
 }
});

test('upper challenge has ten games, initial 5% entry and no direct-point or AT-level reward',()=>{
 loadModel();const a=NovaArt;
 assert.equal(a.burstRules.awards,undefined);assert.equal(a.burstRules.games,10);assert.equal(a.burstRules.success,.65);assert.equal(a.burstRules.initialSuccess,.5);
 for(let setting=1;setting<=6;setting++){
  assert.equal(a.enterInitial({setting},()=>.049999).researchChallengeSource,'initial');assert.equal(a.enterInitial({setting},()=>.05).burstPending,false);
  for(const role of Object.keys(a.burstRules.roles))assert(a.burstChance(role,setting)>0&&a.burstChance(role,setting)<=1);
  assert.equal(a.burstChance('BELL',setting),0);assert.equal(a.burstChance('REPLAY',setting),0);assert.equal(a.enter({setting},()=>.5).atLevel,undefined);
 }
 const html=readGameSource();assert.equal(a.atLevelRules,undefined);assert.doesNotMatch(html,/成功すると＋8,000pt/);
});
