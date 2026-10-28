import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('nova-game.js','utf8');
const html=fs.readFileSync('jag.html','utf8');

test('AUTO start offers the three approved stop orders for normal and super speed',()=>{
 for(const [mode,label,route] of [['normal','順押し','左 → 中 → 右'],['middle','中押し','中 → 左 → 右'],['scissors','はさみ打ち','左 → 右 → 中']]){
  assert.match(html,new RegExp(`data-auto-stop-order="${mode}"[^>]*><b>${label}</b><span>${route}</span>`));
 }
 assert.match(html,/id="autoStopOrderDialog"/);
 assert.match(source,/onClick\("autoStartBtn", \(\)=>openAutoStopOrderDialog\(\)\)/);
 assert.match(source,/onSelect:mode=>autoPlay\?startSuperSpeed\(mode\):openAutoStopOrderDialog\(mode\)/);
 assert.match(source,/autoStopOrder:automaticStopAtStart\?autoStopOrderForMode\(autoStopOrderMode\):null/);
});

test('AUTO stop-order mapping is cloned and invalid saved values fall back to normal order',()=>{
 const start=source.indexOf('  const AUTO_STOP_ORDERS');
 const end=source.indexOf('  let autoTimer',start);
 const context=vm.createContext({});vm.runInContext(source.slice(start,end),context);
 for(const [mode,expected] of [['normal',[0,1,2]],['middle',[1,0,2]],['scissors',[0,2,1]],['broken',[0,1,2]]]){
  const actual=Array.from(context.autoStopOrderForMode(mode));assert.deepEqual(actual,expected);
  actual.reverse();assert.deepEqual(Array.from(context.autoStopOrderForMode(mode)),expected);
 }
});

test('saved in-flight AUTO order and BAR-bottom policy survive reload without restarting AUTO',()=>{
 const context=vm.createContext({});vm.runInContext(fs.readFileSync('nova-spin-resume.js','utf8'),context);
 for(const [mode,order] of [['normal',[0,1,2]],['middle',[1,0,2]],['scissors',[0,2,1]]]){
  const spin={reelLayoutVersion:3,result:'MISS',lineRow:1,grid:[['A','B','C'],['D','E','F'],['BAR','H','I']],resolved:{reward:0},stopped:[false,false,false],autoStopAtStart:true,autoMissBarBottom:true,autoStopOrderMode:mode,autoStopOrder:order};
  const restored=context.NovaSpinResume.restore(context.NovaSpinResume.capture(spin),{MISS:{label:'MISS'}});
  assert.deepEqual(Array.from(restored.autoStopOrder),order);assert.equal(restored.autoStopOrderMode,mode);
  assert.equal(restored.autoMissBarBottom,true);assert.equal(restored.autoStopAtStart,false);
 }
 const invalid={reelLayoutVersion:3,result:'MISS',grid:[['A','B','C'],['D','E','F'],['G','H','I']],resolved:{reward:0},stopped:[false,false,false],autoStopOrderMode:'right',autoStopOrder:[2,1,0]};
 const restored=context.NovaSpinResume.restore(context.NovaSpinResume.capture(invalid),{MISS:{}});
 assert.equal(restored.autoStopOrder,undefined);assert.equal(restored.autoStopOrderMode,undefined);
});
