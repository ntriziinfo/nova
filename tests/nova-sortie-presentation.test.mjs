import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const load=()=>{const c=vm.createContext({});for(const file of ['nova-sortie-presentation.js','nova-bell-navi.js','nova-spin-resume.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c);return c;};
const strips=[0,1,2].map(i=>['before',`NOVA_${i}_0`,`NOVA_${i}_1`,`NOVA_${i}_2`,'after']);
const plain=v=>JSON.parse(JSON.stringify(v));
const orders=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];

test('sortie naming translates legacy display labels without changing engine state',()=>{
 const c=load();vm.runInContext('Math.random=()=>{throw Error("label consumed RNG")}',c);
 for(const name of ['ノヴァ出陣','出陣ゾーン','ノヴァ出陣チャンス','ノヴァ出陣チャレンジ','出陣チャレンジ']){
  assert.equal(c.NovaSortie.label(name+' / 残り10G'),'出陣チャレンジ / 残り10G');
 }
 assert.equal(c.NovaSortie.label('空ゾーン / 100pt'),'空ゾーン / 100pt');
});
test('sortie begins immediately without a freeze timer or input hold',()=>{
 const c=load();assert.equal(c.NovaSortie.freezeDelay,undefined);assert.equal(c.NovaSortie.waitFreeze,undefined);
 const source=fs.readFileSync('nova-game.js','utf8');assert(!source.includes('NovaSortie.waitFreeze('));assert(!source.includes('NovaSortie.freezeDelay('));assert(!source.includes('sortieFreezeUntil=Date.now()'));
});

test('all stop orders keep the award and reveal the miss at the decisive reel',()=>{
 const c=load();vm.runInContext('Math.random=()=>{throw Error("presentation consumed RNG")}',c);
 for(const won of [false,true])for(const order of orders){
  const resolved={researchSortie:{won},reward:8,flowAfter:{remaining:'765',queuedZones:won?['sora']:[]}},spin={resolved,auditPressOrder:[]},before=JSON.stringify(resolved),columns=[];
  for(const i of order){spin.auditPressOrder.push(i);const target=c.NovaSortie.target(spin,i,strips);columns[i]=plain(target.column);}
  const aligned=columns.every((col,i)=>col.every((v,row)=>v===`NOVA_${i}_${row}`)),expected=won;
  assert.equal(aligned,expected);for(const i of [0,1,2])assert.deepEqual(columns[i],!won&&i===(order[0]===1?1:2-order[0])?strips[i].slice(0,3):strips[i].slice(1,4));assert.equal(JSON.stringify(resolved),before);
 }
});
test('all stop orders defer winning verdicts to third landing but keep losses on the decisive reel',()=>{
 const c=load();
 for(const won of [false,true])for(const order of orders){
  const spin={stopped:[false,false,false],auditPressOrder:[],auditStopOrder:[],resolved:{researchSortie:{won}}},decisive=order[0]===1?1:2-order[0];
  for(const i of order){
   spin.auditPressOrder.push(i);
   const before=c.NovaSortie.stopVerdict(spin),alreadyRevealed=won?spin.auditStopOrder.length===3:spin.auditStopOrder.includes(decisive);
   assert.equal(!!before,alreadyRevealed,'press alone cannot advance the reveal');
   spin.stopped[i]=true;spin.auditStopOrder.push(i);
   const verdict=c.NovaSortie.stopVerdict(spin),expected=won?spin.auditStopOrder.length===3:spin.auditStopOrder.includes(decisive);
   assert.equal(!!verdict,expected,`${won?'win':'loss'} ${order.join('')}`);if(verdict)assert.equal(verdict.won,won);
  }
 }
});
test('AUTO and stop-all override hidden bell order only during sortie',()=>{
 const c=load(),spin={resolved:{researchSortie:{won:false}},bellNaviOrder:[0,1,2]};
 assert.deepEqual(plain(c.NovaBellNavi.stopOrder(spin)),[2,1,0]);delete spin.resolved.researchSortie;
 assert.deepEqual(plain(c.NovaBellNavi.stopOrder(spin)),[0,1,2]);
});
test('reload keeps pressed order, pending miss column, and the internal award',()=>{
 const c=load(),spin={result:'BELL',resolved:{researchSortie:{won:true},reward:8,flowAfter:{queuedZones:['sora']}},grid:[[...Array(3)].map(()=>''),[...Array(3)].map(()=>''),[...Array(3)].map(()=>'')],stopped:[false,true,true],auditPressOrder:[2,1,0]};
 for(let i=0;i<3;i++){const col=c.NovaSortie.target(spin,i,strips).column;for(let r=0;r<3;r++)spin.grid[r][i]=col[r];}
 const restored=c.NovaSpinResume.restore(c.NovaSpinResume.capture(spin),{BELL:{}});
 assert.equal(c.NovaSortie.target(restored,0,strips).aligned,true);assert.equal(restored.resolved.reward,8);assert.deepEqual(plain(restored.resolved.flowAfter.queuedZones),['sora']);
 spin.resolved.researchSortie.won=false;spin.auditPressOrder=[0,2,1];spin.pendingStopColumns=[c.NovaSortie.target(spin,0,strips).column,null,null];
 const missed=c.NovaSpinResume.restore(c.NovaSpinResume.capture(spin),{BELL:{}});assert.equal(c.NovaSortie.target(missed,0,strips).aligned,false);assert.deepEqual(plain(missed.pendingStopColumns[0]),strips[0].slice(1,4));
});
