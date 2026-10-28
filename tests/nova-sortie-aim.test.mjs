import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('sortie-only lamp cue uses muted color videos, three movable images, and clears on completion',()=>{
 const elements=[],host={dataset:{},append(){}};
 const c=vm.createContext({document:{getElementById:id=>id==='machine'?host:null,addEventListener(){},createElement(tag){const e={tag,dataset:{},style:{},currentTime:0,append(){},setAttribute(){},getAttribute(key){return this[key];},play(){this.paused=false;return Promise.resolve();},pause(){this.paused=true;}};elements.push(e);return e;}},setTimeout(){},clearTimeout(){},window:{addEventListener(){}}});
 for(const file of ['nova-sortie-aim.js','nova-aim-presentation.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c);
 vm.runInContext('Math.random=()=>{throw Error("presentation consumed lottery RNG")}',c);
 for(const color of ['blue','red','rainbow']){
  const spin={stockEntry:true,sortieEntry:true,sortieCueColor:color,reward:0},before=JSON.stringify(spin);
  assert.equal(c.NovaAim.bet(null,spin),false);
  const video=elements.find(e=>e.tag==='video');assert.equal(video.muted,true);assert.equal(video.loop,true);assert.equal(video.hidden,false);
  assert.match(video.src,new RegExp(color));assert.equal(video.dataset.color,color);
  assert.equal(elements.filter(e=>e.tag==='img'&&!e.hidden).length,3);
  assert.equal(host.dataset.aimActive,'true');assert.equal(JSON.stringify(spin),before);
  c.NovaAim.stop(spin);assert.equal(video.hidden,true);assert.equal(video.paused,true);assert.equal(host.dataset.aimActive,undefined);
 }
});
test('live middle strip supports the exact sandwich and failed trigger does not show it',()=>{
 const c=vm.createContext({});vm.runInContext(fs.readFileSync('nova-stock-entry.js','utf8'),c);
 const source=fs.readFileSync('nova-game.js','utf8'),part=source.slice(source.indexOf('  const REEL_STRIPS ='),source.indexOf('  const CURRENT_REEL_STRIPS='));
 vm.runInContext('const BELL_SYMBOL="bell",ELEPHANT_SYMBOL="replay",CHERRY_SYMBOL="cherry",SUICA_SYMBOL="suika",NEBULA_SYMBOL="nebula",BLANK_SYMBOL="blank";'+part+';globalThis.strips=REEL_STRIPS;',c);
 for(const kind of ['sortie','sortieFake']){
  const columns=c.NovaStockEntry.sortieColumns({kind},c.strips);
  assert.equal(JSON.stringify(columns[1])==='["BAR","blank","BAR"]',kind==='sortie');
  columns.forEach((col,i)=>assert(c.strips[i].some((_,j)=>col.every((s,r)=>s===c.strips[i][(j+r)%20]))));
 }
});

test('middle-first gate and debug choices cannot turn rainbow into a miss',()=>{
 const c=vm.createContext({});vm.runInContext(fs.readFileSync('nova-stock-entry.js','utf8'),c);
 const s={resolved:{sortieEntry:true},stopped:[false,false,false]};
 assert.equal(c.NovaStockEntry.canStop(s,0),false);assert.equal(c.NovaStockEntry.canStop(s,2),false);assert.equal(c.NovaStockEntry.canStop(s,1),true);
 s.stopped[1]=true;assert.equal(c.NovaStockEntry.canStop(s,0),true);assert.equal(c.NovaStockEntry.canStop(s,2),true);
 for(const key of ['WIN_BLUE','WIN_RED','WIN_RAINBOW','MISS_BLUE','MISS_RED'])assert(c.NovaStockEntry.debugCue('SORTIE_AIM_'+key));
 assert.equal(c.NovaStockEntry.debugCue('SORTIE_AIM_MISS_RAINBOW'),null);
 const strips=[['bell','BAR','cherry'],['bell','BAR','cherry','BAR','bell','replay'],['bell','BAR','bell']];
 assert.equal(JSON.stringify(c.NovaStockEntry.sortieColumns({kind:'sortieFake'},strips)[1]),'["cherry","BAR","bell"]');
});

test('debug flags queue exactly one real or fake entry with the requested color',()=>{
 const c=vm.createContext({normalState:{},A_TYPE_MODE:true,forceResult:'',log(){},syncNovaProgress(){},NovaProgress:{queueSortie(){c.queued++;}},queued:0});
 vm.runInContext(fs.readFileSync('nova-stock-entry.js','utf8'),c);
 const src=fs.readFileSync('nova-game.js','utf8');
 for(const name of ['forceResultName','takeForcedResult'])vm.runInContext(src.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0],c);
 for(const [flag,fake,color] of [['WIN_BLUE',false,'blue'],['WIN_RED',false,'red'],['WIN_RAINBOW',false,'rainbow'],['MISS_BLUE',true,'blue'],['MISS_RED',true,'red']]){
  c.normalState={};c.queued=0;c.forceResult='SORTIE_AIM_'+flag;
  assert.equal(c.takeForcedResult(),'');assert.equal(c.forceResult,'');assert.equal(c.normalState.sortieDebugCue.color,color);
  assert.equal(c.queued,fake?0:1);assert.equal(c.normalState.pendingFakeSortie||0,fake?1:0);
 }
});
