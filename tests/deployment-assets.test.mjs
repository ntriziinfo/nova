import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {validateManifest,inspectAssets} from '../scripts/prepare-deploy.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const content=Buffer.from('Original asset bytes');
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'nova-deploy-test-'));
 t.after(()=>{
  assert.equal(path.dirname(fs.realpathSync(root)),fs.realpathSync(os.tmpdir()));
  assert(path.basename(root).startsWith('nova-deploy-test-'));
  fs.rmSync(root,{recursive:true,force:true});
 });
 fs.mkdirSync(path.join(root,'assets'));
 const manifest={version:1,archive:{url:'https://github.com/ntriziinfo/nova/releases/download/test/assets.tar.gz',sha256:sha('archive'),size:100},files:[{path:'assets/sample.wav',size:content.length,sha256:sha(content)}]};
 return {root,manifest,file:path.join(root,'assets/sample.wav')};
}
const pointer=f=>`version https://git-lfs.github.com/spec/v1\noid sha256:${f.sha256}\nsize ${f.size}\n`;

test('deployment keeps exact local assets and detects checkout pointers',async t=>{
 const {root,manifest,file}=fixture(t);
 assert.deepEqual(await inspectAssets(root,manifest),['assets/sample.wav']);
 fs.writeFileSync(file,pointer(manifest.files[0]));
 assert.deepEqual(await inspectAssets(root,manifest),['assets/sample.wav']);
 fs.writeFileSync(file,content);assert.deepEqual(await inspectAssets(root,manifest),[]);
 assert.deepEqual(fs.readFileSync(file),content);
});

test('deployment fails closed for changed, corrupt or unregistered media',async t=>{
 const {root,manifest,file}=fixture(t);
 fs.writeFileSync(file,pointer({...manifest.files[0],sha256:sha('new')}));
 await assert.rejects(inspectAssets(root,manifest),/requires a new release/);
 fs.writeFileSync(file,Buffer.from('X'.repeat(content.length)));
 await assert.rejects(inspectAssets(root,manifest),/checksum mismatch/);
 fs.writeFileSync(file,content);
 fs.writeFileSync(path.join(root,'assets/new.wav'),pointer(manifest.files[0]));
 await assert.rejects(inspectAssets(root,manifest),/missing from release manifest/);
});

test('manifest rejects path traversal, duplicate entries and unrelated release origins',t=>{
 const {manifest}=fixture(t);
 for(const name of ['assets/../secret','/assets/file','assets//file','assets/./file'])assert.throws(()=>validateManifest({...manifest,files:[{...manifest.files[0],path:name}]}),/asset path/);
 assert.throws(()=>validateManifest({...manifest,files:[...manifest.files,...manifest.files]}),/duplicate/);
 assert.throws(()=>validateManifest({...manifest,archive:{...manifest.archive,url:'https://example.com/assets.tar.gz'}}),/release URL/);
});
