import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const script=fs.readFileSync('nova-audio-assets.js','utf8');
function setup(){
 const c={URL,document:{baseURI:'https://nova.test/jag.html'},NovaAudioManifest:{'assets/media/nova/test.wav':{src:'assets/media/normalized/test.wav',category:'voice'}}};
 vm.runInNewContext(script,c);return c.NovaAudioAssets;
}
test('source lookup ignores version queries but never rewrites unrelated/external media',()=>{
 const api=setup();
 for(const src of ['assets/media/nova/test.wav','assets/media/nova/test.wav?v=new','https://nova.test/assets/media/nova/test.wav'])assert.equal(api.resolve(src),'assets/media/normalized/test.wav');
 for(const src of ['assets/unknown.wav','https://other.test/assets/media/nova/test.wav','','blob:opaque'])assert.equal(api.resolve(src),src);
});
test('native playback gets mastered bytes while game source comparisons, cached players and clones keep their identity',()=>{
 class Audio{
  constructor(){this.attrs={};this.loads=0;this.loop=true;}
  getAttribute(name){return this.attrs[name]??null;}
  setAttribute(name,value){this.attrs[name]=String(value);}
  removeAttribute(name){delete this.attrs[name];}
  cloneNode(){const copy=new Audio();copy.attrs={...this.attrs};return copy;}
  load(){this.loads++;}
 }
 const api=setup(),a=new Audio();a.setAttribute('src','assets/media/nova/test.wav?v=1');api.adopt(a);
 assert.equal(a.attrs.src,'assets/media/normalized/test.wav');assert.equal(a.getAttribute('src'),'assets/media/nova/test.wav?v=1');
 assert.equal(a.src,'https://nova.test/assets/media/nova/test.wav?v=1');assert.equal(a.loads,0);
 assert.equal(api.adopt(a),a);assert(a.loop);
 const clone=a.cloneNode(true);assert.equal(clone.attrs.src,a.attrs.src);assert.equal(clone.getAttribute('src'),a.getAttribute('src'));
 a.src='assets/other.wav';assert.equal(a.attrs.src,'assets/other.wav');assert.notEqual(clone.src,a.src);
 a.setAttribute('src','assets/media/nova/test.wav');assert.equal(a.attrs.src,'assets/media/normalized/test.wav');
 a.removeAttribute('src');assert.equal(a.src,'');assert.equal(a.getAttribute('src'),null);assert.equal(a.cloneNode(true).src,'');
});
