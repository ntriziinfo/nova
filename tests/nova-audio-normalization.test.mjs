import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
const report=JSON.parse(fs.readFileSync('audio-normalization.json','utf8'));
const c={};vm.runInNewContext(fs.readFileSync('nova-audio-manifest.js','utf8'),c);
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(f=>f.isDirectory()?walk(p+'/'+f.name):[p+'/'+f.name]);
test('all audio assets are mapped, originals are unchanged, and delivered files meet category loudness/peak/duration limits',()=>{
 const entries=new Map(report.files.map(f=>[f.src,f]));assert.equal(entries.size,report.files.length);
 for(const src of [...walk('assets/media/nova'),...walk('assets/media/jag')].filter(s=>/\.(mp3|wav)$/.test(s)))assert(entries.has(src),'Missing normalization: '+src);
 for(const f of report.files){
  assert.equal(f.targetLufs,report.targetsLufs[f.category]);
  assert(Math.abs(f.after.lufs-f.targetLufs)<=.3,f.src);
  assert(f.after.peakDbtp<=report.truePeakCeilingDbtp,f.src);
  assert(Math.abs(f.outputDuration-f.duration)<=.06,f.src);
  assert.notEqual(f.src,f.output);assert.equal(hash(f.src),f.sourceSha256,f.src+' original changed');
  assert.equal(hash(f.output),f.outputSha256,f.output+' delivery changed');
  assert.equal(c.NovaAudioManifest[f.src].src,f.output);assert.equal(c.NovaAudioManifest[f.src].category,f.category);
 }
 assert.equal(Object.keys(c.NovaAudioManifest).length,report.files.length);
});
