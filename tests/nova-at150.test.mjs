import {readGameSource} from '../scripts/game-source.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';const ctx=vm.createContext({});vm.runInContext(fs.readFileSync('nova-tuning.js','utf8')+'\n'+fs.readFileSync('nova-art.js','utf8'),ctx);const a=ctx.NovaArt,h=readGameSource();
test('adopt150 migration updates old settings once without taking earned AT quota',()=>{const migration=h.match(/if\(settings\.at150Version!==45\)\{[^\n]+settings\.at150Version=45;\}/)[0];const c=vm.createContext({settings:{novaArt:{initial:275,payoutVersion:1},completeLimitPt:19000},flow:{payoutVersion:1,remaining:'900'}});vm.runInContext(migration,c);assert.equal(c.settings.novaArt.initial,150);assert.equal(c.settings.completeLimitPt,10000);assert.equal(c.flow.remaining,'900');c.settings.novaArt.initial=175;vm.runInContext(migration,c);assert.equal(c.settings.novaArt.initial,175);assert.equal(a.normalize({phase:'art',...c.flow}).remaining,'900');});
test('current zone continuation ordering has no retired 2000pt reward damping',()=>{
 assert.deepEqual([a.defaults.ladderSosuke,a.defaults.ladderGiru,a.defaults.ladderUraGiru],[.4,.5,2/3]);
 assert.deepEqual([a.defaults.totoHit,a.defaults.soraHit,a.defaults.soraUraHit],[.35,.35,.35]);
 assert.deepEqual([a.defaults.totoReset,a.defaults.soraReset,a.defaults.soraUraReset],[.02,.15,.30]);
 assert.equal(a.zoneAwardFactor('2000'),1);assert.match(h,/DEFAULT_COMPLETE_LIMIT_PT = 10000/);
});
