import {readGameSource} from '../scripts/game-source.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const html=readGameSource(),ctx=vm.createContext({});vm.runInContext(html.match(/  function chainCountStep\([^]*?\n  }/)[0],ctx);
const step=ctx.chainCountStep;
test('one initial hit accumulates bonus and ART net winnings without a 999 cap',()=>{
 const start=step(null,true,100,300);
 assert.equal(start.count,0);
 assert.equal(step(start.state,true,250,360).count,90);
 assert.equal(step(start.state,true,2500,700).count,2000);
 const resumed=JSON.parse(JSON.stringify(start.state));assert.equal(step(resumed,true,2500,700).count,2000);
});
test('normal return resets the chain and a fresh hit starts at zero',()=>{
 const old=step(null,true,100,300).state;
 const end=step(old,false,2500,700);assert.equal(end.state,null);assert.equal(end.count,0);
 const fresh=step(end.state,true,2600,900);assert.equal(fresh.count,0);
 assert.equal(step(fresh.state,true,2616,906).count,10);
});
test('replay is net zero, a bell adds five, and losses are retained below the visible zero floor',()=>{
 const base=step(null,true,100,300).state;
 assert.equal(step(base,true,108,303).count,5);
 assert.equal(step(base,true,111,306).count,5);
 assert.equal(step(base,true,111,309).count,2);
 assert.equal(step(base,true,100,306).count,0);
 assert.equal(step(base,true,108,309).count,0);
 assert.equal(step(base,true,116,312).count,4);
 assert.equal(step(base,true,0,0).count,0);
});

test('the existing saved payout/fee baseline migrates exactly, with no random draw or mutation',()=>{
 const saved={paid:100,fee:300,payoutVersion:1},before=JSON.stringify(saved);
 vm.runInContext('Math.random=()=>{throw Error("no presentation RNG")}',ctx);
 assert.equal(step(saved,true,580,480).count,300);
 assert.equal(JSON.stringify(saved),before);
 assert.equal(step({paid:100},true,580,480).count,0);
});
