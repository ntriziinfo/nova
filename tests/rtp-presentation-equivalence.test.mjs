import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {hashes,valid,currentReport,modelHash,sameSources,presentationAliases} from '../scripts/rtp-current.mjs';

const registry=JSON.parse(fs.readFileSync('scripts/rtp-presentation-equivalence.json','utf8'));
const review=registry.changes[0],hash=s=>createHash('sha256').update(s.replace(/\r\n/g,'\n')).digest('hex');
const savedEvidence=JSON.parse(fs.readFileSync('docs/rtp-current-1b.json','utf8'));
const evidence={...savedEvidence,sourceHashes:{...hashes(),[review.file]:review.sourceHash}};

test('reviewed animation-only changes reuse the actual billion-game evidence without relabeling its source',()=>{
 const current={...evidence.sourceHashes,[review.file]:review.presentationHash};
 assert.equal(evidence.sourceHashes[review.file],review.sourceHash);
 assert(sameSources(evidence.sourceHashes,current));assert(valid(evidence,current));
 assert.equal(modelHash(evidence.sourceHashes),modelHash(current));
 const result=currentReport(evidence,current,review.presentationCommit);
 assert.equal(result.status,'ready');assert.equal(result.sourceVerification.kind,'reviewed-presentation-only');
 assert.equal(result.sourceCommit,evidence.sourceCommit);assert.equal(result.generatedAt,evidence.generatedAt);
 assert.equal(result.sourceVerification.presentationChanges[0].simulationHash,review.sourceHash);
 assert.equal(result.sourceVerification.presentationChanges[0].currentHash,review.presentationHash);
 assert.deepEqual(result.settings,currentReport(evidence,evidence.sourceHashes,evidence.sourceCommit).settings);
});

test('payout, draw, continuation and unreviewed changes in the same mixed file still invalidate the results',()=>{
 const source=fs.readFileSync('nova-game.js','utf8'),current=hashes();
 for(const [from,to] of [
  ['const reward = resolved.reward;','const reward = resolved.reward + 1;'],
  ['const oumaFailed=!normalState.flow.zero;','const oumaFailed=false;'],
  ['presentation.stage=\'lift\';','Math.random();presentation.stage=\'lift\';'],
  ['spin({oumaFailed});','spin({oumaFailed:false});'],
  ['duration:500,steps:1','duration:600,steps:1']
 ]){
  assert(source.includes(from),from);
  const changed={...current,'nova-game.js':hash(source.replace(from,to))};
  assert(!sameSources(current,changed));assert(!valid(evidence,changed));
  assert.notEqual(modelHash(current),modelHash(changed));
  assert.deepEqual(currentReport(evidence,changed,'changed').settings,[]);
 }
 assert(!sameSources({},{}));
});

test('equivalence requires exact reviewed hashes and cannot alias unrelated files or chain approvals',()=>{
 assert.equal(presentationAliases(registry).size,registry.changes.length);
 for(const edit of [
  r=>{r.changes[0].file='nova-game.css';},r=>{r.changes[0].reason='';},
  r=>{r.changes[0].tests=[];},r=>{r.changes[0].presentationHash='*';},
  r=>{r.changes.push({...r.changes[0]});},
  r=>{r.changes.push({...r.changes[0],sourceHash:r.changes[0].presentationHash,presentationHash:'a'.repeat(64)});}
 ]){const invalid=structuredClone(registry);edit(invalid);assert.throws(()=>presentationAliases(invalid));}
 const expected={...hashes(),'nova-art.js':review.sourceHash},changed={...expected,'nova-art.js':review.presentationHash};
 assert(!sameSources(expected,changed));
});

test('the approved revision changes only the common lift clock and its explanatory comment',()=>{
 const source=fs.readFileSync('nova-game.js','utf8').replace(/\r\n/g,'\n');
 // Future unreviewed source versions must remain pending; this proof applies
 // only to this exact reviewed version, not arbitrary future game changes.
 if(hash(source)!==review.presentationHash)return;
 const normalized=source.replace(
  '    // Both outcomes use the same one-cell lift and hold. Only the reverse\n    // after the four-second cue reveals success; retain its completed layer\n    // so the synced reverse can replace it at the same top.',
  '    // Both outcomes lift the stopped NOVA/BAR lineup by one cell. Success waits\n    // until the end of the four-second cue, then keeps the completed motion\n    // layer alive so the synced reverse can replace it at the same top.'
 ).replace('performance.now()-started-[0,65,120][i]','performance.now()-started-(oumaFailed?[0,65,120][i]:3400)');
 assert.equal(hash(normalized),review.sourceHash);
});

test('merging compatible shards preserves trial source hashes and rejects mixed actual sources',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nova-rtp-equivalence-'));
 try{
  const sourceHashes=hashes(),compatible=[review.sourceHash,review.presentationHash].includes(sourceHashes[review.file]);
  if(compatible)sourceHashes[review.file]=review.sourceHash;
  const trial={...savedEvidence,sourceHashes};
  for(const row of trial.results)fs.writeFileSync(path.join(dir,`setting-${row.setting}.json`),JSON.stringify({...trial,results:[row]}));
  const output=path.join(dir,'merged.json');
  execFileSync(process.execPath,['scripts/merge-rtp-current.mjs',dir,output]);
  const merged=JSON.parse(fs.readFileSync(output));
  assert.deepEqual(merged.sourceHashes,sourceHashes);assert(valid(merged,hashes()));
  const first=path.join(dir,'setting-1.json'),changed=JSON.parse(fs.readFileSync(first));
  changed.sourceHashes[review.file]=compatible?review.presentationHash:'f'.repeat(64);fs.writeFileSync(first,JSON.stringify(changed));
  assert.throws(()=>execFileSync(process.execPath,['scripts/merge-rtp-current.mjs',dir,output],{stdio:'pipe'}),/Mixed simulation sources|Stale simulation source/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
