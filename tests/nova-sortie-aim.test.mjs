import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('sortie-only lamp cue uses muted color videos, three movable images, and clears on completion',()=>{
 const elements=[],host={dataset:{},append(){}};
 const c=vm.createContext({document:{getElementById:id=>id==='machine'?host:null,addEventListener(){},createElement(tag){const e={tag,dataset:{},style:{},children:[],currentTime:0,append(...children){this.children.push(...children);},setAttribute(){},getAttribute(key){return this[key];},play(){this.paused=false;return Promise.resolve();},pause(){this.paused=true;}};elements.push(e);return e;}},setTimeout(){},clearTimeout(){},window:{addEventListener(){}}});
 for(const file of ['nova-sortie-aim.js','nova-aim-presentation.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c);
 vm.runInContext('Math.random=()=>{throw Error("presentation consumed lottery RNG")}',c);
 for(const color of ['blue','red','rainbow']){
  const spin={stockEntry:true,sortieEntry:true,sortieCueColor:color,reward:0},before=JSON.stringify(spin);
  assert.equal(c.NovaAim.bet(null,spin),false);
  const video=elements.find(e=>e.tag==='video');assert.equal(video.muted,true);assert.equal(video.loop,true);assert.equal(video.hidden,false);
  assert.match(video.src,new RegExp(color));assert.equal(video.dataset.color,color);
  assert.equal(elements.filter(e=>e.className?.startsWith('novaSortieAimPart')&&!e.hidden).length,3);
  assert.equal(elements.filter(e=>e.src?.endsWith('nova-only-20261027.webp')).length,2);
  assert.equal(elements.filter(e=>e.src?.endsWith('blank-supernova-20261028-v1.webp')).length,1);
  assert.equal(elements.some(e=>e.src?.includes('center-symbol')),false);
  const effects=elements.find(e=>e.className==='novaSortieAimEffects');
  assert(effects,'A dedicated effects container surrounds the three movable parts');
  assert.equal(effects.hidden,false);assert.equal(effects.dataset.color,color);
  assert.deepEqual(effects.children.map(e=>e.className),[
   'novaSortieAimFx novaSortieAimFx-middle',
   'novaSortieAimFx novaSortieAimFx-symbol',
   'novaSortieAimFx novaSortieAimFx-aim'
  ]);
  assert.equal(elements.filter(e=>e.className?.startsWith('novaSortieAimPart')).length,3,'Effects must not become extra movable layout parts');
  assert.equal(host.dataset.aimActive,'true');assert.equal(host.dataset.sortieAimColor,color);assert.equal(JSON.stringify(spin),before);
  c.NovaSortieAim.fail();assert.equal(host.dataset.sortieAimFailed,'true');assert.equal(effects.hidden,false);assert.equal(effects.dataset.color,color);assert.equal(host.dataset.sortieAimColor,color);
  c.NovaAim.stop(spin);assert.equal(video.hidden,true);assert.equal(video.paused,true);assert.equal(effects.hidden,true);assert.equal(effects.dataset.color,undefined);assert.equal(host.dataset.sortieAimColor,undefined);assert.equal(host.dataset.aimActive,undefined);
 }
});

test('sortie aim heat effects are color-aware, non-interactive, dim on failure, and respect reduced motion',()=>{
 const css=fs.readFileSync('nova-cabinet.css','utf8');
 assert.match(css,/\.novaSortieAimEffects\{[^}]*pointer-events:none/);
 for(const color of ['blue','red','rainbow'])assert.match(css,new RegExp('\\.novaSortieAimEffects\\[data-color=["\\\']?'+color+'["\\\']?\\]'));
 for(const name of ['Heat','RainbowHeat','Ring','Sparks'])assert.match(css,new RegExp('@keyframes novaSortieAim'+name+'\\{'));
 assert.match(css,/#machine\[data-sortie-aim-failed="true"\]>\.novaSortieAimPart[^}]*filter:brightness\(\.25\)!important/);
 assert.match(css,/#machine\[data-sortie-aim-failed="true"\]>\.novaSortieAimEffects\{[^}]*filter:brightness\(\.25\)[^}]*opacity:0/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{[^]*?\.novaSortieAimFx[^}]*animation:none/);
});
test('live middle strip supports the exact sandwich and failed trigger does not show it',()=>{
 const c=vm.createContext({});vm.runInContext(fs.readFileSync('nova-stock-entry.js','utf8'),c);
 vm.runInContext(fs.readFileSync('nova-reel-sheet-data.js','utf8'),c);
 const source=fs.readFileSync('nova-game.js','utf8'),part=source.slice(source.indexOf('  const REEL_STRIPS ='),source.indexOf('  const REEL_LAYOUT_VERSION='));
 vm.runInContext(part+';globalThis.strips=REEL_STRIPS;',c);
 for(const kind of ['sortie','sortieFake']){
  const columns=c.NovaStockEntry.sortieColumns({kind},c.strips);
  assert.equal(JSON.stringify(columns[1])==='["BAR","__BLANK__","BAR"]',kind==='sortie');
  if(kind==='sortieFake'){
   const upper=c.strips[1].findIndex((s,i)=>s==='BAR'&&c.strips[1][(i+2)%20]==='BAR');
   assert.equal(JSON.stringify(columns[1]),JSON.stringify([18,19,0].map(offset=>c.strips[1][(upper+offset)%20])));
   assert.equal(columns[1][2],'BAR');assert.notEqual(columns[1][0],'BAR');
  }
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
 assert.equal(JSON.stringify(c.NovaStockEntry.sortieColumns({kind:'sortieFake'},strips)[1]),'["replay","bell","BAR"]');
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
