import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ctx=vm.createContext({});vm.runInContext(fs.readFileSync('nova-art.js','utf8'),ctx);
const a=ctx.NovaArt;
test('normal and ura Toto clear rainbow on final stop without losing award',()=>{
 for(const zone of ['toto','ura_toto']){
  const before={...a.startZone(a.enter(),zone,{},()=>.5),zoneLeft:1,color:'rainbow',award:'550'};
  const after=a.step(before,{},()=>.99,'MISS').flow;
  assert.equal(after.zone,'');assert.equal(after.color,'white');assert.equal(after.remaining,'825');
  assert.equal(a.normalize(JSON.parse(JSON.stringify(after))).color,'white');
 }
});
test('stale saved colors cannot light Toto outside its active zone or during bonus',()=>{
 const css=fs.readFileSync('nova-cabinet.css','utf8');
 const selectors=css.match(/body[^{}]*\[data-toto-color=rainbow\][^{]*/g);
 assert.equal(selectors.length,2);
 for(const selector of selectors)assert.ok(selector.includes('[data-art-zone=toto]'));
 const html=fs.readFileSync('jag.html','utf8');
 const assignment=html.match(/document.body.dataset.totoColor=([^;]+);/)[1];
 for(const artZone of ['', 'sora','toto']){
  const document={body:{dataset:{artZone}}};
  assert.equal(vm.runInNewContext(assignment,{document,normalState:{flow:{color:'rainbow'}}}),artZone==='toto'?'rainbow':'white');
 }
});
