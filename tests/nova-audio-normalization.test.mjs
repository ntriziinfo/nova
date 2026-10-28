import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
const report=JSON.parse(fs.readFileSync('audio-normalization.json','utf8'));
const c={};vm.runInNewContext(fs.readFileSync('nova-audio-manifest.js','utf8'),c);
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(f=>f.isDirectory()?walk(p+'/'+f.name):[p+'/'+f.name]);
const normalizationExemptSources=new Set([
 'assets/media/nova/cz_remaining_1.wav',
 'assets/media/nova/upper-at-bgm-1287779-20261027.mp3',
 'assets/media/nova/upper-at-bgm-805028-20261027.mp3'
]);
const manifestDeliveryOverrides=new Map([
 ['assets/media/nova/upper-at-bgm.mp3','assets/media/nova/upper-at-bgm-1287779-20261027.mp3']
]);
test('all audio assets are mapped, originals are unchanged, and delivered files meet category loudness/peak/duration limits',()=>{
 const entries=new Map(report.files.map(f=>[f.src,f]));assert.equal(entries.size,report.files.length);
 for(const src of [...walk('assets/media/nova'),...walk('assets/media/jag')].filter(s=>/\.(mp3|wav)$/.test(s)&&!normalizationExemptSources.has(s)))assert(entries.has(src),'Missing normalization: '+src);
 for(const src of normalizationExemptSources)assert(!entries.has(src),'Normalization-exempt source must not be normalized: '+src);
 for(const f of report.files){
  assert.equal(f.targetLufs,report.targetsLufs[f.category]);
  assert(Math.abs(f.after.lufs-f.targetLufs)<=.3,f.src);
  assert(f.after.peakDbtp<=report.truePeakCeilingDbtp,f.src);
  assert(Math.abs(f.outputDuration-f.duration)<=.06,f.src);
  assert.notEqual(f.src,f.output);assert.equal(hash(f.src),f.sourceSha256,f.src+' original changed');
  assert.equal(hash(f.output),f.outputSha256,f.output+' delivery changed');
  assert.equal(c.NovaAudioManifest[f.src].src,manifestDeliveryOverrides.get(f.src)??f.output);assert.equal(c.NovaAudioManifest[f.src].category,f.category);
 }
 assert.equal(Object.keys(c.NovaAudioManifest).length,report.files.length);
});

test('every registered voice uses speech-level v2 mastering at -14 LUFS, without clipping or duration edits',()=>{
 const catalog={};vm.runInNewContext(fs.readFileSync('nova-voice-catalog.js','utf8'),catalog);
 const voices=report.files.filter(f=>f.category==='voice');assert.equal(voices.length,97);assert.equal(report.version,2);
 for(const src of catalog.NovaVoiceCatalog.CHARACTER_VOICE_SRCS){const cleanSrc=src.split('?')[0];if(normalizationExemptSources.has(cleanSrc))continue;const row=voices.find(f=>f.src===cleanSrc);assert(row,src);assert.equal(row.measurementVersion,2);assert.match(row.output,/normalized-voices-20261013/);assert(row.fileLoudness.peakDbtp<=-1,src);assert(Math.abs(row.after.lufs+14)<=.15,src);}
 const values=voices.map(f=>f.after.lufs);assert(Math.max(...values)-Math.min(...values)<=.3);
});
