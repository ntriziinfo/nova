import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {load,hash,files,options} from './run.mjs';
import {simulate} from '../../scripts/zone-v2-model.mjs';
const baselineCommit='64a82b9cacdc476f776c9dc0de2c548614190654';
const baseline={sources:Object.fromEntries([...files,'scripts/zone-v2-model.mjs','scripts/zone-v2-rng.mjs'].map(f=>[f,hash(execFileSync('git',['show',baselineCommit+':'+f],{encoding:'utf8',windowsHide:true}))]))};
for(const f of [...files,'scripts/zone-v2-model.mjs','scripts/zone-v2-rng.mjs'])assert.equal(hash(fs.readFileSync(f,'utf8')),baseline.sources[f]);
const c={czScale:.519},seed=1400100191;
load(c,false);const plain=simulate(4,30000,seed,options);
load(c,true);const cached=simulate(4,30000,seed,options);assert.deepEqual(cached,plain);
const shorter=simulate(4,20000,seed,{...options,recordBlocks:undefined}),blocks=plain.blocks.slice(0,2);
for(const key of ['totalPaid','totalBet','net'])assert.equal(shorter[key],blocks.reduce((s,r)=>s+r[key],0));
const stopped=simulate(4,30000,seed,{...options,stopAtComplete:true}),prefix=plain.firstComplete||plain;
for(const key of ['games','totalPaid','totalBet','net'])assert.equal(stopped[key],prefix[key]);
const otherSettings=[];
for(const setting of [1,2,3,5,6]){
 load({czScale:.532});const before=simulate(setting,30000,seed+setting,options);
 load(c);assert.deepEqual(simulate(setting,30000,seed+setting,options),before);otherSettings.push(setting);
}
const sources=Object.fromEntries([...files,'jag.html','scripts/zone-v2-model.mjs','scripts/zone-v2-rng.mjs'].map(f=>[f,hash(fs.readFileSync(f,'utf8'))]));
const report={createdAt:new Date().toISOString(),commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).trim(),sources,candidate:c,cacheIdentical:true,twentyThousandPrefixIdentical:true,completePrefixIdentical:true,otherSettingsIdentical:otherSettings};
fs.writeFileSync('research/s4-140/check.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
