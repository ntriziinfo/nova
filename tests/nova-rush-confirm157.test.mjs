import {readGameSource} from '../scripts/game-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function harness(){
 const audios=[],timers=new Map(),events=[];let now=0,id=0;
 class Audio{
  constructor(src){this.src=src;this.currentTime=0;this.paused=true;this.plays=0;audios.push(this);}
  cloneNode(){return new Audio(this.src);}load(){}pause(){this.paused=true;}
  play(){this.paused=false;this.plays++;return Promise.resolve();}
 }
 const c=vm.createContext({Audio,performance:{now:()=>now},setInterval:fn=>{timers.set(++id,fn);return id;},clearInterval:id=>timers.delete(id),window:{dispatchEvent:e=>events.push(e.type)},Event:class{constructor(type){this.type=type;}}});
 vm.runInContext(fs.readFileSync('nova-rush-confirm.js','utf8'),c);
 return {p:c.NovaRushConfirm,audios,events,timers,tick:ms=>{now=ms;for(const fn of [...timers.values()])fn();}};
}
test('confirmation effect overlaps once after three seconds of actual BGM playback, not elapsed wall time',()=>{
 const h=harness();h.p.play(.6,.4);const [bgm,se]=h.audios.slice(-2);
 assert.equal(bgm.plays,1);assert.equal(se.plays,0);assert.equal(bgm.loop,false);assert.equal(se.loop,false);
 h.tick(6000);assert.equal(se.plays,0);bgm.currentTime=2.99;h.tick(7000);assert.equal(se.plays,0);
 bgm.currentTime=3;bgm.ontimeupdate();h.tick(7010);assert.equal(se.plays,1);assert.equal(bgm.paused,false);assert.equal(bgm.plays,1);
 assert.equal(bgm.volume,.6);assert.equal(se.volume,.4);h.p.updateVolumes(0,0);assert.equal(bgm.volume,0);assert.equal(se.volume,0);
 h.p.updateVolumes(.8,.2);assert.equal(bgm.volume,.8);assert.equal(se.volume,.2);bgm.onended();assert(!h.p.active);assert.equal(h.timers.size,0);assert.deepEqual(h.events,['nova-rush-confirm-ended']);
});
test('next BET fades the mix over three seconds without restarting; reset cancels late confirmation effects',()=>{
 const h=harness();h.p.play(.6,.4);const [bgm,se]=h.audios.slice(-2);bgm.currentTime=3;h.tick(3000);
 h.p.fadeOnBet();h.tick(4500);assert.equal(bgm.volume,.3);assert.equal(se.volume,.2);
 h.p.fadeOnBet();h.tick(6000);assert(!h.p.active);assert(bgm.paused&&se.paused);
 h.p.play(.6,.4);const [second,secondSe]=h.audios.slice(-2),late=second.ontimeupdate;h.p.reset();second.currentTime=4;late();assert.equal(secondSe.plays,0);
 h.p.play(.6,.4);const stale=h.audios.at(-2).ontimeupdate;h.p.play(.6,.4);stale();assert.equal(h.audios.at(-1).plays,0);
});
test('only the first earned AT in an initial BIG qualifies; ordinary zones and further stocks do not',()=>{
 const html=readGameSource(),c=vm.createContext({normalState:{flow:{phase:'normal'}},session:{bonusArtSets:0},settings:{setting:1},isATypeBonusComplete:()=>false,Math});
 vm.runInContext(fs.readFileSync('nova-tuning.js','utf8')+'\n'+fs.readFileSync('nova-art.js','utf8'),c);
 vm.runInContext(html.match(/  function resolveATypeBonusOutcome\([^]*?\n  }/)[0],c);
 assert.equal(c.resolveATypeBonusOutcome('NEBULA').novaRushConfirmed,true);
 assert.equal(c.resolveATypeBonusOutcome('MISS').novaRushConfirmed,false);
 c.session.bonusArtSets=1;assert.equal(c.resolveATypeBonusOutcome('NEBULA').novaRushConfirmed,false);
 c.session.bonusArtSets=0;c.normalState.flow.phase='art';assert.equal(c.resolveATypeBonusOutcome('NEBULA').novaRushConfirmed,false);
 c.normalState.flow.phase='normal';c.isATypeBonusComplete=()=>true;assert.equal(c.resolveATypeBonusOutcome('NEBULA').novaRushConfirmed,false);
});
