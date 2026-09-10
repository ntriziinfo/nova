import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {buildArt,buildNormal,baseCommit} from './model.mjs';
import {evaluate} from './evaluate.mjs';
const selection=JSON.parse(fs.readFileSync('research/balance120/selected-data.json')),reports=selection.jobs.map(j=>JSON.parse(fs.readFileSync(j.file)).report);
assert.deepEqual(reports.map(r=>r.setting),[1,2,3,4,5,6]);
for(const r of reports){assert(evaluate(r,{holdout:true}).pass,'Both objectives must pass: S'+r.setting);for(const [k,v]of Object.entries(selection.shared))assert.deepEqual(r[k]??({bonus:50,pointShare:.7,awards:[.6,.3,.1],levels:[.6,.25,.15],ura:[1,1,1]})[k],v,'Shared config '+k);}
for(const f of ['nova-art.js','nova-normal.js'])assert.equal(fs.readFileSync(f,'utf8').replace(/\r\n/g,'\n'),execFileSync('git',['show',baseCommit+':'+f],{encoding:'utf8'}).replace(/\r\n/g,'\n'),'Unexpected edits: '+f);
const config={...selection.shared,boosts:reports.map(r=>r.boost),entries:reports.map(r=>r.entry)};
fs.writeFileSync('nova-art.js',buildArt(config));fs.writeFileSync('nova-normal.js',buildNormal(config));
fs.writeFileSync('research/balance120/final-candidate.json',JSON.stringify(config,null,2)+'\n');console.log(JSON.stringify(config));
