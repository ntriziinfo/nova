import fs from 'node:fs';import test from 'node:test';import assert from 'node:assert/strict';import {loadModel} from '../scripts/zone-v2-model.mjs';
loadModel();const a=NovaArt,ks=[.8,1.35,1,1.9,1.95,3.2];
test('repeat zones tune chances, never award denominations or settlement',()=>{for(let setting=1;setting<=6;setting++){
 const state={phase:'art',payoutVersion:1,zoneVersion:2,zone:'sora',giruSetting:setting,balanceZoneCount:2,remaining:'100',award:'200',zoneBalanceFactor:1.73};
 assert.equal(a.settleZone(state).remaining,'300');assert.equal(a.balanceZoneAward(200,1.73),200n);
 assert(Math.abs(a.zoneRules(state).hit-.35*ks[setting-1]/(.65+.35*ks[setting-1]))<1e-12);
 assert.equal(a.zoneRules({...state,balanceZoneCount:1}).hit,.35);
 const seven=a.step({...state,zoneLeft:4,sevenHits:2},{setting},()=>.5,'BIG');assert.equal(seven.flow.award,'300');
 assert.equal(a.zoneRules({...state,zone:'sosuke',fixed50Zone:true}).success,0);
}});
test('earned checkpoint lottery restriction defaults on and reverse-freeze rates use the saved setting',()=>{
 assert.equal(a.checkpointQuietRules.enabled,true);
 for(let setting=1;setting<=6;setting++){const s={zone:'ouma',giruSetting:setting,balanceZoneCount:2};assert(Math.abs(a.oumaFreezeRate(s,a.defaults)-.25*ks[setting-1]/(.75+.25*ks[setting-1]))<1e-12);}
});
test('normal first-100G lottery blocks are removed while fake CZ behavior remains',()=>{
 const source=fs.readFileSync('nova-normal.js','utf8');assert(!source.includes('if(state.games<=100){state.prelude=null;return token;}'));assert(!source.includes('modePending:real&&state.games<=100'));assert(source.includes('flow.modeFake?NovaFlow.normalize(flow)'));
});

