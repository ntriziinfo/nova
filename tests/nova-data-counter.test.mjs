import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const js=fs.readFileSync('nova-data-counter.js','utf8');
const game=fs.readFileSync('nova-game.js','utf8');
const fn=name=>game.match(new RegExp('  function '+name+'\\([^]*?\\n  }'))[0];
test('0G AT and zone wins occupy one visual step without changing recorded games or empty current column',()=>{
 const node=()=>({dataset:{},children:[],setAttribute(){},addEventListener(){},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;}});
 const bars=node(),labels=new Map(),root={querySelector:s=>s==='.novaHitBars'?bars:labels.get(s)};
 const c=vm.createContext({document:{createElement:node}});vm.runInContext(js,c);
 const hits=[{kind:'BIG',games:101},{kind:'AT',games:0},{kind:'ZONE',zone:'sora',games:0}];
 c.NovaDataCounter.render(root,{current:0,hits},{totalSpins:101});
 assert.deepEqual(bars.children.map(b=>b.dataset.kind),['CURRENT','ZONE','AT','BIG']);
 assert.deepEqual(bars.children.map(b=>b.children[0].children.filter(i=>i.className==='lit').length),[0,1,1,2]);
 assert.equal(hits[1].games,0);assert.equal(bars.children[2].title,'AT / 0G');
});
function harness(){const c=vm.createContext({});vm.runInContext(js+';Math.random=()=>{throw Error("display used game RNG")}',c);return c.NovaDataCounter;}

test('full history distinguishes BIG, AT first entry and every new special zone without counting continuations',()=>{
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
 assert.equal(stats.dataHits.length,10004);assert.equal(stats.dataHits[0].games,232);assert.equal(stats.totalFee,120);assert.equal(stats.totalPaid,800);
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

test('AT end starts a separate normal interval, including after reload and player handoff',()=>{
 const d=harness(),stats={totalSpins:0};d.adopt(stats,{phase:'normal'});
 const spins=(count,phase)=>{for(let i=0;i<count;i++){d.spin(stats,{phase});stats.totalSpins++;}};
 spins(200,'normal');d.hit(stats,'BIG');d.hit(stats,'AT');d.transition(stats,{phase:'art'});
 spins(500,'art');d.zone(stats,{phase:'art',zone:'sora'});
 spins(50,'art');d.zone(stats,{phase:'art'});spins(30,'art');
 d.transition(stats,{phase:'normal'});assert.equal(d.display(stats).current,0);
 spins(20,'normal');assert.equal(d.display(stats).current,20);
 assert.equal(stats.dataNormalGames,220);assert.equal(stats.dataAtGames,580);assert.equal(stats.totalSpins,800);
 const saved=JSON.parse(JSON.stringify(stats));d.adopt(saved,{phase:'normal'},20);
 assert.equal(d.display(saved).current,20);
 const base={...saved,dataHits:JSON.parse(JSON.stringify(saved.dataHits))},start=d.snapshot(saved);start.totalSpins=saved.totalSpins;
 for(let i=0;i<10;i++){d.spin(saved,{phase:'normal'});saved.totalSpins++;}d.hit(saved,'BIG');
 const view=d.display(saved,base,start);assert.equal(view.hits.at(-1).games,30);assert.equal(view.hits.at(-1).phase,'normal');
 assert.equal(view.current,0);assert.equal(view.dataNormalGames,230);assert.equal(view.dataAtGames,580);
});

test('legacy normal interval excludes elapsed AT games using the existing post-AT counter',()=>{
 const d=harness(),stats={totalSpins:1000,dataLastHitSpin:400};
 d.adopt(stats,{phase:'normal'},25);assert.equal(d.display(stats).current,25);
 assert.equal(stats.totalSpins,1000);
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

test('live history updates preserve completed columns and update current step and click detail',()=>{
 const node=()=>({dataset:{},children:[],handlers:{},setAttribute(k,v){this[k]=v;},addEventListener(k,fn){this.handlers[k]=fn;},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;this.replacements=(this.replacements||0)+1;}});
 const bars=node(),detail=node(),root={querySelector:s=>s==='.novaHitBars'?bars:s==='[data-counter="detail"]'?detail:null};
 const c=vm.createContext({document:{createElement:node}});vm.runInContext(js,c);
 const view={current:100,hits:[{seq:1,kind:'BIG',games:300}]},totals={totalSpins:400};
 c.NovaDataCounter.render(root,view,totals);const current=bars.children[0],hit=bars.children[1];
 view.current=101;c.NovaDataCounter.render(root,view,totals);
 assert.equal(bars.replacements,1);assert.equal(bars.children[0],current);assert.equal(bars.children[1],hit);
 assert.equal(current.children[0].children.filter(cell=>cell.className==='lit').length,2);
 current.handlers.click();assert.equal(detail.textContent,'現在 / 101G');
 view.current=0;view.hits.push({seq:2,kind:'AT',games:0});c.NovaDataCounter.render(root,view,totals);
 assert.deepEqual(bars.children.map(el=>el.dataset.kind),['CURRENT','AT','BIG']);
 assert.equal(bars.children[1].children[0].children.filter(cell=>cell.className==='lit').length,1);
});
