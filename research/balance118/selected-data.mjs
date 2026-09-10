import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
export function selection(tag){return tag==='final'?JSON.parse(fs.readFileSync('research/balance118/selected-data.json')):null;}
export function dataJob(tag,setting){return selection(tag)?.jobs.find(j=>j.setting===setting)??{setting,file:`docs/balance118-${tag}-${setting}.json`,manifest:`research/balance118/${tag}-manifest.json`};}
const normalized=s=>s.replace(/\r\n/g,'\n');
function array(source,name){const m=source.match(new RegExp(name+':Object.freeze\\((\\[[\\d.,]+\\])\\)'));assert(m,name);return JSON.parse(m[1]);}
function common(source){return normalized(source).replace(/normalBoost:Object.freeze\(\[[\d.,]+\]\)/,'normalBoost:SETTING_PROFILE').replace(/entry:Object.freeze\(\[[\d.,]+\]\)/,'entry:SETTING_PROFILE');}
// Only the two explicitly setting-indexed scalar arrays can differ between selected commits.
// Every other runtime byte (apart from line endings) must match. No changed setting can reuse an old result.
export function verifySettingRuntime(report,job){
 const manifest=JSON.parse(fs.readFileSync(job.manifest)),cfg=manifest.jobs.find(c=>c.setting===report.setting);assert(cfg);
 for(const [k,v] of Object.entries(cfg))assert.deepEqual(report[k],v,`S${report.setting}: config ${k}`);
 for(const k of ['base','replay','levels','weights'])assert.equal(cfg[k],undefined,'Unsupported mixed-source override: '+k);
 assert.equal(report.sourceHashes['nova-art.js'],manifest.sourceHashes['nova-art.js']);
 const old=execFileSync('git',['show',`${manifest.commit}:nova-art.js`],{encoding:'utf8'}),now=fs.readFileSync('nova-art.js','utf8');
 assert.equal(common(now),common(old),'Non-profile gameplay changed');
 const i=report.setting-1,boost=cfg.boost??array(old,'normalBoost')[i],entry=cfg.entry??array(old,'entry')[i];
 assert.equal(array(now,'normalBoost')[i],boost,`S${report.setting}: boost differs`);
 assert.equal(array(now,'entry')[i],entry,`S${report.setting}: entry differs`);
 return {setting:report.setting,sourceCommit:manifest.commit,manifest:job.manifest,boost,entry,commonRuntimeUnchanged:true,settingProfileMatches:true};
}
