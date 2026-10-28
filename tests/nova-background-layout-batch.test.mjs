import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('background refreshes share one geometry read per frame and cancelled scenes stay hidden',()=>{
 const frames=[];let reads=0,video;
 const host={dataset:{},offsetWidth:1000,querySelectorAll:()=>[],querySelector:()=>({getBoundingClientRect:()=>({left:200,top:400,width:600})}),getBoundingClientRect:()=>{reads++;return {left:0,top:0,width:1000};},append(el){video=el;}};
 const c=vm.createContext({MutationObserver:class{observe(){}},requestAnimationFrame:fn=>frames.push(fn),document:{hidden:false,getElementById:()=>host,addEventListener(){},createElement:()=>({hidden:true,paused:true,dataset:{},style:{},setAttribute(){},getAttribute(key){return this[key];},load(){},pause(){this.paused=true;},play(){this.paused=false;return Promise.resolve();}})},window:{addEventListener(){}}});
 vm.runInContext(fs.readFileSync('nova-upper-at-background.js','utf8'),c);
 for(let i=0;i<100;i++)c.NovaUpperAtBackground.sync({phase:'art',researchUpper:true});
 assert.equal(frames.length,1);assert.equal(reads,0);frames.shift()();assert.equal(reads,1);assert.equal(video.style.width,'600px');
 c.NovaUpperAtBackground.sync({phase:'art',researchUpper:true});c.NovaUpperAtBackground.sync({phase:'normal'});
 frames.shift()();assert.equal(reads,1);assert.equal(video.hidden,true);assert.equal(video.paused,true);
});
