import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
const report=JSON.parse(fs.readFileSync('audio-normalization.json','utf8'));
const c={};vm.runInNewContext(fs.readFileSync('nova-audio-manifest.js','utf8'),c);
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(f=>f.isDirectory()?walk(p+'/'+f.name):[p+'/'+f.name]);
const manifestDeliverySourceOverrides=new Map([
 ['assets/media/nova/upper-at-bgm.mp3','assets/media/nova/upper-at-bgm-1287779-20261027.mp3']
]);
test('all audio assets are mapped, originals are unchanged, and delivered files meet category loudness/peak/duration limits',()=>{
 const entries=new Map(report.files.map(f=>[f.src,f]));assert.equal(entries.size,report.files.length);
 const preNormalized=new Map(report.preNormalizedFiles.map(f=>[f.src,f]));assert.equal(preNormalized.size,report.preNormalizedFiles.length);
 const allEntries=new Map([...entries,...preNormalized]);
 for(const src of [...walk('assets/media/nova'),...walk('assets/media/jag')].filter(s=>/\.(mp3|wav)$/.test(s)))assert(entries.has(src)||preNormalized.has(src),'Missing normalization coverage: '+src);
 for(const f of report.files){
  assert.equal(f.targetLufs,report.targetsLufs[f.category]);
  assert(Math.abs(f.after.lufs-f.targetLufs)<=.3,f.src);
  assert(f.after.peakDbtp<=report.truePeakCeilingDbtp,f.src);
  assert(Math.abs(f.outputDuration-f.duration)<=.06,f.src);
  assert.notEqual(f.src,f.output);assert.equal(hash(f.src),f.sourceSha256,f.src+' original changed');
  assert.equal(hash(f.output),f.outputSha256,f.output+' delivery changed');
  const override=manifestDeliverySourceOverrides.get(f.src);assert.equal(c.NovaAudioManifest[f.src].src,override?allEntries.get(override).output:f.output);assert.equal(c.NovaAudioManifest[f.src].category,f.category);
 }
 for(const f of preNormalized.values()){
  assert.equal(f.targetLufs,report.targetsLufs[f.category]);
  assert(Math.abs(f.after.lufs-f.targetLufs)<=.3,f.src);
  assert(f.after.peakDbtp<=report.truePeakCeilingDbtp,f.src);
  assert.equal(hash(f.src),f.sourceSha256,f.src+' pre-mastered source changed');
  assert.notEqual(f.src,f.output);assert.equal(hash(f.output),f.outputSha256,f.output+' delivery changed');
  assert.equal(f.sourceSha256,f.outputSha256,f.src+' pre-mastered delivery must be a byte-for-byte copy');
  assert(Math.abs(f.outputDuration-f.duration)<=.06,f.src);
  assert.equal(c.NovaAudioManifest[f.src].src,f.output);assert.equal(c.NovaAudioManifest[f.src].category,f.category);
 }
 assert.equal(Object.keys(c.NovaAudioManifest).length,report.files.length+report.preNormalizedFiles.length);
});

test('every registered voice uses speech-level v2 mastering at -14 LUFS, without clipping or duration edits',()=>{
 const catalog={};vm.runInNewContext(fs.readFileSync('nova-voice-catalog.js','utf8'),catalog);
 const voices=report.files.filter(f=>f.category==='voice');assert.equal(voices.length,102);assert.equal(report.version,2);
 for(const src of catalog.NovaVoiceCatalog.CHARACTER_VOICE_SRCS){const cleanSrc=src.split('?')[0],row=voices.find(f=>f.src===cleanSrc),premastered=report.preNormalizedFiles.find(f=>f.src===cleanSrc);assert(row||premastered,src);if(premastered){assert.equal(premastered.category,'voice');assert(Math.abs(premastered.after.lufs+14)<=.3,src);continue;}assert.equal(row.measurementVersion,2);assert.match(row.output,/normalized-voices-20261013/);assert(row.fileLoudness.peakDbtp<=-1,src);assert(Math.abs(row.after.lufs+14)<=.15,src);}
 const values=voices.map(f=>f.after.lufs);assert(Math.max(...values)-Math.min(...values)<=.3);
});

test('the game cache-busts the complete audio manifest',()=>{
 assert.match(fs.readFileSync('jag.html','utf8'),/nova-audio-manifest\.js\?v=20261028-all-audio-normalized/);
});
