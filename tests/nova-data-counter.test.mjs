import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const js=fs.readFileSync('nova-data-counter.js','utf8');
const game=fs.readFileSync('nova-game.js','utf8');
const fn=name=>game.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0];
function harness(){const c=vm.createContext({});vm.runInContext(js+';Math.random=()=>{throw Error("display used game RNG")}',c);return c.NovaDataCounter;}

test('bounded history distinguishes BIG, AT first entry and every new special zone without counting continuations',()=>{
 const d=harness(),stats={totalSpins:900,totalFee:120,totalPaid:800};
 for(let i=0;i<232;i++){d.spin(stats,{phase:'normal'});stats.totalSpins++;}
 d.hit(stats,'BIG');d.hit(stats,'AT');
 d.zone(stats,{phase:'art',zone:'kushuri_nito'});
 d.zone(stats,{phase:'art',zone:'sora'});d.zone(stats,{phase:'art',zone:'sora',zoneLeft:5});
 d.spin(stats,{phase:'art',zone:'sora'});stats.totalSpins++;
 d.zone(stats,{phase:'art'});d.zone(stats,{phase:'art',zone:'sora'});
 assert.deepEqual(Array.from(stats.dataHits,h=>h.kind),['BIG','AT','ZONE','ZONE']);
 assert.equal(stats.dataHits[0].games,232);assert.equal(stats.dataNormalGames,232);assert.equal(stats.dataAtGames,1);
 const restored=JSON.parse(JSON.stringify(stats));d.zone(restored,{phase:'art',zone:'sora'});assert.equal(restored.dataHitSeq,4);
 for(let i=0;i<10000;i++){stats.totalSpins++;d.hit(stats,'BIG');}
 assert.equal(stats.dataHits.length,20);assert.equal(stats.totalFee,120);assert.equal(stats.totalPaid,800);
});

test('machine display merges session offsets and retains AT gaps and graphs across players',()=>{
 const d=harness(),base={totalSpins:1500,dataNormalGames:1000,dataAtGames:500,dataHitSeq:2,dataHits:[{seq:2,spin:1450,kind:'ZONE',zone:'sora',games:10}],profit:300,slumpHistory:[{spin:0,profit:0},{spin:1500,profit:300}]};
 const start={totalSpins:100,dataNormalGames:100,dataAtGames:0,dataHitSeq:1,profit:100};
 const stats={totalSpins:200,dataNormalGames:180,dataAtGames:20,dataHitSeq:2,dataHits:[{seq:1,spin:50,kind:'BIG',zone:'',games:50},{seq:2,spin:180,kind:'BIG',zone:'',games:130}],slumpHistory:[{spin:0,profit:0},{spin:100,profit:100},{spin:200,profit:250}]};
 const view=d.display(stats,base,start);
 assert.equal(view.total,1600);assert.equal(view.dataNormalGames,1080);assert.equal(view.dataAtGames,520);
 assert.equal(view.hits.length,2);assert.equal(view.hits[1].spin,1580);assert.equal(view.hits[1].games,130);assert.equal(view.current,20);
 assert.deepEqual(JSON.parse(JSON.stringify(d.graph(stats,base,start))),[{spin:0,profit:0},{spin:1500,profit:300},{spin:1600,profit:450}]);
 assert.equal(d.display({totalSpins:1000},null,null).current,0,'legacy history cannot be reconstructed');
});

test('live counted games split by phase while bonus and 0G spins remain excluded',()=>{
 const c=vm.createContext({A_TYPE_MODE:true,session:{active:false},normalState:{flow:{phase:'normal'}},stats:{totalSpins:0},
  NovaFlow:{normalize:x=>x},NovaArt:{prepareBet:x=>x},NovaProgress:{beforeBet:x=>x},NovaDecrement:{observe(){},beforeBet(){}},
  settings:{},syncNovaProgress(){},currentProfit:()=>0,recordAtFirstEntry(){}});
 vm.runInContext(js+fn('countTotalSpinIfNeeded'),c);
 c.countTotalSpinIfNeeded(false);c.normalState.flow={phase:'cz'};c.countTotalSpinIfNeeded(false);
 c.normalState.flow={phase:'art',zone:'sora'};c.countTotalSpinIfNeeded(false);
 c.normalState.flow.zero=true;c.countTotalSpinIfNeeded(false);
 c.session.active=true;c.countTotalSpinIfNeeded(true);
 assert.equal(c.stats.totalSpins,3);assert.equal(c.stats.dataNormalGames,2);assert.equal(c.stats.dataAtGames,1);
 assert.equal(c.stats.dataHits.length,1);
});

test('cabinet zoom supports 5 to 200 percent and clamps saved or slider values',()=>{
 const c=vm.createContext({pageZoom:1,PAGE_ZOOM_MIN:.05,PAGE_ZOOM_MAX:2,PAGE_ZOOM_STORAGE_KEY:'zoom',clamp:(x,l,h)=>Math.max(l,Math.min(h,x)),
  renderedPageZoom:()=>c.pageZoom,document:{documentElement:{style:{setProperty(){}}},body:{style:{}}},$:()=>null,
  applyCabinetXOffset(){},requestPageScrollBoundsUpdate(){},pageZoomView:{},pageZoomOutBtn:{},pageZoomInBtn:{},safeStorageSet:(k,v)=>c.saved=v});
 vm.runInContext(fn('applyPageZoom'),c);
 for(const [input,expected]of [[.01,.05],[.05,.05],[.5,.5],[2,2],[3,2]]){c.pageZoom=input;c.applyPageZoom(true);assert.equal(c.pageZoom,expected);assert.equal(c.saved,String(expected));}
 assert.match(game,/PAGE_ZOOM_MIN = 0\.05/);assert.match(game,/PAGE_ZOOM_MAX = 2\.00/);
});
