import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {load,hash,files,options} from './run.mjs';
import {simulate} from '../../scripts/zone-v2-model.mjs';
const report=JSON.parse(fs.readFileSync('docs/s4-140-summary.json','utf8'));
const beforeCommit=JSON.parse(fs.readFileSync('research/s4-140/check.json','utf8')).commit;
const old=Object.fromEntries(files.map(f=>[f,execFileSync('git',['show',beforeCommit+':'+f],{encoding:'utf8',windowsHide:true})]));
for(const f of ['nova-art.js','nova-flow.js'])assert.equal(hash(fs.readFileSync(f,'utf8')),report.sourceHashes[f]);
for(const [f,h] of Object.entries(report.modelHashes))assert.equal(hash(fs.readFileSync(f,'utf8')),h);
const normalized=fs.readFileSync('nova-normal.js','utf8').replace('version:140,','version:128,').replace('[.502,.510,.522,.498,.552,.616]','[.502,.510,.522,.532,.552,.616]');
assert.equal(hash(normalized),hash(old['nova-normal.js']));
function loadOld(candidate=false){
 for(const f of files){
  let source=old[f];
  if(candidate&&f==='nova-normal.js')source=source.replace('[.502,.510,.522,.532,.552,.616]','[.502,.510,.522,.498,.552,.616]');
  vm.runInThisContext(source,{filename:'before/'+f});
 }
}
const checks=[],seed=1400900000;
for(const setting of [1,2,3,5,6]){
 loadOld();const prior=simulate(setting,30000,seed+setting,options);load({},false);
 assert.deepEqual(simulate(setting,30000,seed+setting,options),prior);checks.push({setting,otherSettingIdentical:true});
}
loadOld(true);const expected=simulate(4,30000,seed+4,options);load({},false);const actual=simulate(4,30000,seed+4,options);assert.deepEqual(actual,expected);
load();assert.deepEqual(simulate(4,30000,seed+4,options),actual);
const shorter=simulate(4,20000,seed+4,{...options,recordBlocks:undefined});
for(const key of ['totalPaid','totalBet','net'])assert.equal(shorter[key],actual.blocks.slice(0,2).reduce((n,r)=>n+r[key],0));
checks.push({setting:4,appliedRulesMatchMeasuredCandidate:true,cacheIdentical:true,twentyThousandPrefixIdentical:true});
const rows=report.jobs.flatMap(c=>JSON.parse(fs.readFileSync('research/s4-140/'+c.tag+'.json','utf8')).rows);
const examples=[rows.find(r=>r.firstComplete?.games<=20000),rows.find(r=>r.firstComplete?.games>20000),rows.find(r=>!r.firstComplete)];
for(const example of examples){
 assert(example);load({},false);const fresh=simulate(4,30000,example.seed,{...options,stopAtComplete:true}),prefix=example.firstComplete||example;
 for(const key of ['games','totalPaid','totalBet','net'])assert.equal(fresh[key],prefix[key]);
 checks.push({setting:4,seed:example.seed,completedAt:example.firstComplete?.games||null,stoppedPrefixIdentical:true});
}
const sources=Object.fromEntries([...files,'jag.html'].map(f=>[f,hash(fs.readFileSync(f,'utf8'))]));
const result={createdAt:new Date().toISOString(),beforeCommit,normalOnlyChanges:'lottery metadata version and setting 4 CZ scale',checks,sources};
fs.writeFileSync('research/s4-140/validation.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
