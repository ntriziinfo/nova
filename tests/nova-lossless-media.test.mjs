import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const rows=JSON.parse(fs.readFileSync('assets/lossless-20261027/manifest.json','utf8'));
test('lossless delivery files are smaller and map on desktop without enlarging mobile assets',()=>{
 for(const compact of [false,true]){
  const c=vm.createContext({matchMedia:()=>({matches:compact})});vm.runInContext(fs.readFileSync('nova-media.js','utf8'),c);
  for(const r of rows){assert.ok(fs.existsSync(r.target));assert.ok(r.after<r.before);if(!compact)assert.equal(c.NovaMedia.imageSource(r.source),r.target);assert.equal(c.NovaMedia.imageSource(r.source),c.NovaMedia.imageSource(r.target));}
  assert.equal(c.NovaMedia.imageSource('assets/symbols/gang-v3/bell.png'),compact?'assets/mobile-20261013/bell.webp':'assets/lossless-20261027/bell.webp');
 }
});
