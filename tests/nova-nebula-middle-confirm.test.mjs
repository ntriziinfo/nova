import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const game=fs.readFileSync('nova-game.js','utf8');
const fn=name=>game.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0];
const context=vm.createContext({document:{getElementById:()=>null,addEventListener(){}},window:{addEventListener(){}},setTimeout,clearTimeout});
vm.runInContext(fs.readFileSync('nova-reel-sheet-data.js','utf8'),context);
vm.runInContext(fs.readFileSync('nova-aim-presentation.js','utf8'),context);
vm.runInContext(`
 const NEBULA_SYMBOL='NEBULA';
 const NOVA_SHEET_ROLE_PROPERTY='novaSheetRole';
 const REEL_STRIPS=NovaReelSheetData.strips.map(strip=>strip.slice());
 ${fn('mod')}
 ${fn('reelWindowFromTopIndex')}
 ${fn('setGridColumn')}
 ${fn('normalizeNebulaMiddleFirstColumn')}
`,context);
vm.runInContext(fs.readFileSync('nova-spin-resume.js','utf8'),context);

const plain=value=>JSON.parse(JSON.stringify(value));
const column=(result,input=null)=>{
 context.spin={result,aimStopOrder:[1],auditPressOrder:[1],grid:[['a','b','c'],['d','e','f'],['g','h','i']],resolved:{aim:{symbol:'nebula',guide:true},reward:result==='NEBULA'?1:0}};
 context.input=input;
 return plain(vm.runInContext('normalizeNebulaMiddleFirstColumn(spin,1,input)',context));
};

test('fresh middle-first NEBULA stops center only for the already drawn hit without RNG',()=>{
 vm.runInContext('Math.random=()=>{throw Error("stop normalization consumed RNG")}',context);
 const win=column('NEBULA');assert.deepEqual(win,['🍒','NEBULA','🔔']);assert.equal(context.spin.aimAligned,true);assert.equal(context.spin.grid[1][1],'NEBULA');assert.equal(context.spin.result,'NEBULA');assert.equal(context.spin.resolved.reward,1);
 const miss=column('MISS');assert.deepEqual(miss,['NEBULA','🔔','REPLAY']);assert.equal(context.spin.aimAligned,false);assert.notEqual(context.spin.grid[1][1],'NEBULA');
 assert.equal(context.spin.result,'MISS');assert.equal(context.spin.resolved.reward,0);
});

test('visualReady and captured pending columns cannot restore a middle-line NEBULA miss',()=>{
 const staleWin=['🍒','NEBULA','🔔'];
 const miss=column('MISS',staleWin);assert.deepEqual(miss,['NEBULA','🔔','REPLAY']);assert.equal(context.spin.aimAligned,false);
 const pending={...context.spin,stopped:[false,false,false],pendingStopColumns:[null,staleWin,null],reelLayoutVersion:3};
 const restored=context.NovaSpinResume.restore(context.NovaSpinResume.capture(pending),{MISS:{}});
 context.spin=restored;context.input=restored.pendingStopColumns[1];
 const normalized=plain(vm.runInContext('normalizeNebulaMiddleFirstColumn(spin,1,input)',context));
 assert.deepEqual(normalized,['NEBULA','🔔','REPLAY']);assert.equal(context.spin.aimAligned,false);assert.equal(context.spin.result,'MISS');assert.equal(context.spin.resolved.reward,0);
});

test('the live stop path normalizes both the fresh target and visualReady column',()=>{
 assert.match(game,/let column=normalizeNebulaMiddleFirstColumn\(currentSpin,i\)\|\|getReelWindowFromStrip/);
 assert.match(game,/col=normalizeNebulaMiddleFirstColumn\(currentSpin,i,col\)\|\|col;/);
});
