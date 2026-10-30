import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {INPUTS,REQUIRED_OPTIONS,valid,currentReport,hashes as sourceHashes,modelHash} from '../scripts/rtp-current.mjs';

const hashes=Object.fromEntries(INPUTS.map(f=>[f,'matching-hash']));
function evidence(){return {
 gamesPerSetting:1_000_000_000,sourceHashes:{...hashes},sourceCommit:'a'.repeat(40),
 options:{...REQUIRED_OPTIONS},
 results:[1,2,3,4,5,6].map(setting=>({setting,games:1_000_000_000,totalBet:3_000_000_000,totalPaid:3_030_000_000,net:30_000_000,ci95:{blocks:1000,blockGames:1_000_000,meanPct:101,lowPct:100,highPct:102,halfWidthPct:1}}))
};}
function pooledEvidence(){return {
 totalGamesPerSetting:1_000_000_000,chunksPerSetting:4,gamesPerChunk:250_000_000,
 sourceHashes:{...hashes},sourceCommit:'a'.repeat(40),options:{...REQUIRED_OPTIONS},
 settings:[1,2,3,4,5,6].map(setting=>{
  const seeds=Array.from({length:4},(_,i)=>`setting=${setting}|chunk=${i+1}`);
  const chunkResults=seeds.map((seed,i)=>({chunk:i+1,seed,games:250_000_000,totalBet:750_000_000,totalPaid:757_500_000,net:7_500_000,rtp:1.01}));
  return {setting,games:1_000_000_000,totalBet:3_000_000_000,totalPaid:3_030_000_000,net:30_000_000,rtp:1.01,rtpPct:101,ci95:{blocks:1000,blockGames:1_000_000,meanPct:101,lowPct:100,highPct:102,halfWidthPct:1},seeds,chunkResults};
 })
};}
test('only complete uncapped billion-game evidence matching the engine is displayed',()=>{
 const r=evidence();assert(valid(r,hashes));
 const data=currentReport(r,hashes,'b'.repeat(40));
 assert.equal(data.status,'ready');assert.equal(data.settings[0].rtpPct,101);
 assert.equal(data.sourceCommit,r.sourceCommit);assert.equal(data.commit,'b'.repeat(40));
 for(const change of [
  r=>{r.gamesPerSetting=100_000_000;},r=>{r.options.completeMyLimitPt=19000;},r=>{r.options.checkpointQuiet=false;},
  r=>{r.options.completeLimitPt=10000;},r=>{r.options.stopAtComplete=true;},
  r=>{r.results[0].games=999999999;},r=>{r.results[0].totalBet=1;},
  r=>{r.results[0].net=0;},r=>{r.results[0].totalPaid=NaN;},r=>{r.results[0].ci95.blocks=999;},
  r=>{r.results[0].ci95.meanPct=NaN;},r=>{r.results[0].ci95.lowPct=102;},r=>{r.results[0].ci95.halfWidthPct=2;},
  r=>{r.results[0].setting=2;},r=>{r.sourceHashes[INPUTS[0]]='old';}
 ]){
  const bad=evidence();change(bad);assert.equal(valid(bad,hashes),false);
  assert.deepEqual(currentReport(bad,hashes,'b').settings,[]);
 }
 assert.equal(currentReport(null,hashes,'b').status,'pending');
});
test('verified four-series pooled evidence publishes the same six current values',()=>{
 const r=pooledEvidence();assert(valid(r,hashes));
 const data=currentReport(r,hashes,'b'.repeat(40));
 assert.equal(data.status,'ready');assert.equal(data.settings.length,6);
 assert.equal(data.conditions,'2.5億G×4系列合算・MY／差枚停止なし');
 for(const row of data.settings)assert.equal(row.rtpPct,101);
 for(const change of [
  r=>{r.chunksPerSetting=5;},r=>{r.settings[0].chunkResults[0].games--;},
  r=>{r.settings[0].chunkResults[0].totalPaid--;},r=>{r.settings[0].seeds[0]='wrong';}
 ]){const bad=pooledEvidence();change(bad);assert.equal(valid(bad,hashes),false);}
});
test('published JSON, browser data and specification surfaces share one verified or pending state',()=>{
 const json=JSON.parse(fs.readFileSync('nova-rtp-current.json','utf8'));
 const browserSource=fs.readFileSync('nova-rtp-current.js','utf8').trim();
 const browser=JSON.parse(browserSource.replace(/^globalThis\.NovaRtpCurrent=/,'').replace(/;$/,''));
 assert.equal(json.gamesPerSetting,1_000_000_000);assert.deepEqual(browser,json);
 const evidence=JSON.parse(fs.readFileSync('docs/rtp-current-1b.json','utf8'));
 const computed=currentReport(evidence,sourceHashes(),json.commit);
 assert.deepEqual(json,computed);
 if(json.status==='ready'){
  assert.equal(json.settings.length,6);assert(valid(evidence,sourceHashes()));
 }else{
  assert.equal(json.status,'pending');assert.deepEqual(json.settings,[]);assert.equal(json.sourceCommit,null);assert.equal(json.generatedAt,null);
 }
 assert.match(fs.readFileSync('README.md','utf8'),/docs\/current-rtp\.md/);
});

test('every monitored input change invalidates evidence and changes the browser model identity',()=>{
 for(const file of INPUTS){
  const changed={...hashes,[file]:'new-version'};
  assert.equal(valid(evidence(),changed),false,file);
  assert.notEqual(modelHash(changed),modelHash(hashes),file);
  assert.equal(currentReport(evidence(),changed,'a'.repeat(40)).status,'pending');
 }
});
