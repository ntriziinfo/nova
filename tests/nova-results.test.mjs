import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const c=vm.createContext({});vm.runInContext(fs.readFileSync('nova-results.js','utf8'),c);const r=c.NovaResults;

test('BB result preserves its awarded points and destination through reload without drawing or revealing a mode',()=>{
 const c=vm.createContext({});vm.runInContext(fs.readFileSync('nova-results.js','utf8'),c);
 vm.runInContext('Math.random=()=>{throw Error("BB presentation must not consume the game RNG")}',c);
 for(const phase of ['normal','art']){
  const flow=Object.freeze({phase,remaining:'500',sets:'2',queuedZones:Object.freeze(['sora'])}),before=JSON.stringify(flow);
  const saved=JSON.parse(JSON.stringify(c.NovaResults.bonus('150',flow)));
  assert.deepEqual(saved,{kind:'bonus',character:'kushuri',color:phase==='normal'?'mode':'blue',pt:'150',next:phase==='art'?'AT':'通常'});
  assert.equal(JSON.stringify(flow),before);
  const {c:view,fields}=presenter();view.show(saved);
  assert.equal(fields.span.textContent,'BB獲得');assert.equal(fields.output.textContent,'150pt');
  assert.equal(fields['.novaResultNext'].hidden,false);
  assert.equal(fields['.novaResultNext'].textContent,phase==='art'?'次のBETでATへ':'次回モード示唆 / 次のBETで通常へ');
  view.hide();view.show(saved);assert.equal(fields.output.textContent,'150pt');
 }
});

test('BB character hints have exact unconditional rates for each post-bonus mode',()=>{
 const cases=[
  ['A',{kushuri:4250,toto:4250,nito:500,sosuke:500,urapi:500,ouma:0,giru:0,sora:0}],
  ['B',{kushuri:3250,toto:3250,nito:1000,sosuke:1000,urapi:500,ouma:1000,giru:0,sora:0}],
  ['C',{kushuri:2500,toto:2500,nito:1000,sosuke:1000,urapi:1500,ouma:1000,giru:500,sora:0}],
  ...['天国','天国ループ'].map(mode=>[mode,{kushuri:2350,toto:2350,nito:1000,sosuke:1000,urapi:1500,ouma:1000,giru:500,sora:300}])
 ];
 for(const [mode,expected] of cases){
  const counts=Object.fromEntries(Object.keys(expected).map(k=>[k,0]));let draws=0;
  const flow=Object.freeze({phase:'normal'});
  for(let i=0;i<10000;i++){
   const card=r.bonus('150',flow,mode,()=>{draws++;return (i+.5)/10000;});
   counts[card.character]++;assert.equal(card.kind,'bonus');assert.equal(card.pt,'150');assert.equal(card.color,'mode');
  }
  assert.deepEqual(counts,expected,mode);assert.equal(draws,10000);
  assert.equal(r.bonusHintRates(mode).reduce((n,h)=>n+h.percent,0),100);
 }
});

test('BB mode confirmations never appear below their required mode, at AT entry, or with unknown data',()=>{
 for(const mode of ['A','B','C','天国','天国ループ']){
  const rates=r.bonusHintRates(mode);let boundary=0;
  for(const hint of rates){
   if(!hint.percent)continue;
   for(const delta of [.00001,hint.percent-.00001]){
    const character=r.bonus('150',{phase:'normal'},mode,()=>(boundary+delta)/100).character;
    assert(hint.characters.includes(character),mode+' / '+hint.id);
   }
   boundary+=hint.percent;
  }
  for(const phase of ['art','cz',undefined])for(const roll of [0,.49999,.5,.99999])assert.equal(r.bonus('150',{phase},mode,()=>roll).character,roll<.5?'kushuri':'toto');
 }
 for(const mode of [undefined,'','unknown',null,0])for(const roll of [0,.5,.99999])assert.equal(r.bonus('150',{phase:'normal'},mode,()=>roll).character,roll<.5?'kushuri':'toto');
 for(const roll of [NaN,-.1,1,Infinity])assert.equal(r.bonus('150',{phase:'normal'},'天国',()=>roll).character,'kushuri');
});

test('BB mode image uses separate crypto randomness and keeps its saved image without consuming the game RNG',async()=>{
 let draws=0;const c=vm.createContext({crypto:{getRandomValues(a){draws++;a[0]=Math.floor(.99*4294967296);return a;}}});
 vm.runInContext(fs.readFileSync('nova-results.js','utf8'),c);vm.runInContext('Math.random=()=>{throw Error("game RNG used by hint")}',c);
 const flow=Object.freeze({phase:'normal'}),card=c.NovaResults.bonus('150',flow,'天国');
 assert.equal(card.character,'sora');assert.equal(draws,1);
 const {c:view,fields,images,flush}=presenter();view.show(card);images[0].onload();await flush();
 const saved=JSON.parse(JSON.stringify(card));view.hide();view.show(saved);
 assert.equal(images[0].src,'assets/illustrations/lamps-20260916/sora1.png');assert.equal(draws,1);
 assert.equal(fields.span.textContent,'BB獲得');assert.equal(fields.output.textContent,'150pt');
 assert.equal(fields['.novaResultNext'].textContent,'次回モード示唆 / 次のBETで通常へ');
 assert(!JSON.stringify(saved).includes('天国'),'result must not disclose the exact internal mode');
});

test('all BB hint images render as bonus awards, including the two initial-zone characters',async()=>{
 for(const [character,file] of Object.entries({kushuri:'lamps-20260928/kushuri.png',toto:'lamps-20260916/toto.png',nito:'lamps-20260928/nito.png',sosuke:'lamps-20260916/sosuke.png',urapi:'lamps-20260916/urapi.png',ouma:'lamps-20260916/ouma1.png',giru:'lamps-20260916/giru1.png',sora:'lamps-20260916/sora1.png'})){
  const {c,fields,images,flush}=presenter();c.show({kind:'bonus',character,color:'blue',pt:'150',next:'通常'});
  images[0].onload();await flush();assert.equal(images[0].src,'assets/illustrations/'+file);
  assert.equal(c.root.dataset.initial,'false');assert.equal(fields.span.textContent,'BB獲得');
  assert.equal(fields['.novaResultTotal'].hidden,true);assert.equal(fields.output.textContent,'150pt');
 }
});

test('sortie result uses this challenge hit count including the final award, without a result draw or modifying stocks',()=>{
 for(let count=0;count<=10;count++){
  for(const won of [false,true]){
   const event=Object.freeze({hits:count,won,finished:true}),card=r.sortie(event);
   assert.deepEqual({...card},{kind:'sortie',character:'all',color:'gold',count});
   assert.equal(r.sortie({...event,finished:false}),null);
  }
 }
 for(const event of [undefined,{finished:true,hits:-1},{finished:true,hits:2.5},{finished:true,hits:'3'}])assert.equal(r.sortie(event),null);
});

test('sortie groups only newly earned stocks, preserves duplicates and distinguishes reverse zones across reload',()=>{
 const flow=Object.freeze({queuedZones:Object.freeze(['ouma','giru','sora','sora','ura_sora','kushuri_nito','giru'])});
 const event=Object.freeze({finished:true,hits:5,won:true,zone:'giru'}),before=JSON.stringify(flow);
 const card=JSON.parse(JSON.stringify(r.sortie(event,flow)));
 assert.deepEqual(card.awards,[
  {zone:'sora',character:'sora',ura:false,count:2},
  {zone:'ura_sora',character:'sora',ura:true,count:1},
  {zone:'kushuri_nito',character:'kushuri_nito',ura:false,count:1},
  {zone:'giru',character:'giru',ura:false,count:1}
 ]);
 assert.equal(card.awards.reduce((n,a)=>n+a.count,0),5);assert.equal(JSON.stringify(flow),before);
 assert.deepEqual(JSON.parse(JSON.stringify(r.sortie(event,JSON.parse(before)))),card);
 assert.equal(r.sortie({...event,finished:false},flow),null);
 assert.deepEqual(JSON.parse(JSON.stringify(r.sortie({finished:true,hits:0},flow))).awards,[]);
 assert.equal(r.sortie(event,{queuedZones:['sora']}).awards,undefined,'old/incomplete data must not invent a character');
});
test('parity favors red 60/40 for odd and blue 60/40 for even',()=>{for(let s=1;s<=6;s++){let red=0;for(let i=0;i<1000;i++)if(r.pick('zone','giru',s,()=>i/1000).color==='red')red++;assert.equal(red,s%2?600:400);}});
test('AT hint percentages are unconditional, setting-gated and exclusive, leaving regular images balanced with one draw',()=>{
 for(let setting=1;setting<=6;setting++){
  const counts=new Map();let draws=0;
  for(let i=0;i<12000;i++){
   const card=r.pick('at','',setting,()=>{draws++;return (i+.5)/12000;});
   const key=card.character+'-'+card.color;counts.set(key,(counts.get(key)||0)+1);
  }
  assert.equal(draws,12000,'exactly one RNG draw per result');
  const expected={'boss-blue':setting>=2?1200:0,'sora2-purple':setting>=4?360:0,'ouma2-gold':setting>=5?240:0,'group-rainbow':setting===6?120:0};
  for(const [key,count] of Object.entries(expected)){assert.equal(counts.get(key)||0,count);counts.delete(key);}
  assert.equal(counts.size,12);
  const regularCount=(12000-Object.values(expected).reduce((a,b)=>a+b,0))/12;
  for(const count of counts.values())assert.equal(count,regularCount);
 }
});
test('AT hint boundary, saved setting strings, and non-AT results never create false setting hints',()=>{
 for(const setting of [2,3,4,5,6,'2','6']){
  assert.equal(r.pick('at','',setting,()=>.099999).character,'boss');
  assert.equal(r.pick('at','',setting,()=>.1).character,Number(setting)>=4?'sora2':'sosuke');
 }
 for(const setting of [1,'1',undefined,0,7,2.5,'invalid'])assert.notEqual(r.pick('at','',setting,()=>0).character,'boss');
 for(let setting=1;setting<=6;setting++)for(const zone of ['sosuke','toto','urapi','giru','sora','ouma','kushuri_nito']){
  let draws=0;
  const result=r.transition({zone,award:'500'},{zone:'',award:'500'},setting,()=>{draws++;return .05;});
  assert.equal(result.character,zone);assert.equal(result.pt,'500');assert.equal(draws,zone==='kushuri_nito'?0:1);
 }
});
test('purple, gold and rainbow hint thresholds include their lower boundary and exclude the next interval',()=>{
 for(const [setting,roll,character,color] of [
  [3,.10,'sosuke','red'],[4,.10,'sora2','purple'],[4,.129999,'sora2','purple'],[4,.13,'sosuke','red'],
  [5,.13,'ouma2','gold'],[5,.149999,'ouma2','gold'],[5,.15,'sosuke','red'],
  [6,.15,'group','rainbow'],[6,.159999,'group','rainbow'],[6,.16,'sosuke','red']
 ])assert.deepEqual({...r.pick('at','',setting,()=>roll)},{character,color});
});
test('zone result includes final increment and preserves large point values',()=>{const before={zone:'ouma',award:'100'},after={zone:'',award:'300'};assert.equal(r.transition(before,after,1,()=>0).pt,'300');assert.equal(r.transition(before,{zone:'ouma',award:'300'},1),null);assert.equal(r.transition(before,{zone:'',award:'9007199254740999'},1).pt,'9007199254740999');});
function presenter(){
 const source=fs.readFileSync('nova-results.js','utf8'),images=[],shown=[],fields={span:{},output:{},'.novaResultTotal':{},'.novaResultNext':{}};
 const c=vm.createContext({card:{},root:{hidden:true,dataset:{}},art:{querySelector:()=>({replaceWith:img=>shown.push(img.src)})},num:{setAttribute(){}},fallback:{querySelector:tag=>fields[tag]},names:{sora:'空',ouma:'逢魔'},init(){},apply(){},Image:class{constructor(){images.push(this);this.naturalWidth=100;}decode(){return Promise.resolve();}}});
 vm.runInContext(source.match(/ const settingHints=\[[^]*?\n \];/)[0]+source.match(/ const characterImages=.*;/)[0]+'const images=new Map();let imageRequest=0,active=null;'+source.slice(source.indexOf(' function loadImage('),source.indexOf(' function apply('))+source.slice(source.indexOf(' function show(value)'),source.indexOf(" if(typeof document")),c);
 const flush=()=>new Promise(resolve=>setImmediate(resolve));
 return {c,images,shown,fields,flush};
}

test('legacy BB logo saves show a default portrait without altering awarded points or the save',async()=>{
 const saved=Object.freeze({kind:'bonus',character:'nova',color:'blue',pt:'345',next:'AT'});
 const {c,images,fields,flush}=presenter();c.show(saved);images[0].onload();await flush();
 assert.equal(images[0].src,'assets/illustrations/lamps-20260928/kushuri.png');assert.equal(fields.output.textContent,'345pt');
 c.hide();c.show(saved);assert.equal(saved.character,'nova');assert.equal(fields['.novaResultNext'].textContent,'次のBETでATへ');
});

test('sortie result restores the exact acquired count, with no pt unit or AT setting hint, and resets its next-step text',async()=>{
 const {c,fields,flush}=presenter();
 for(const count of [2,5,10]){
  const saved=JSON.parse(JSON.stringify(r.sortie({finished:true,hits:count}))),before=JSON.stringify(saved);
  c.show(saved);await flush();
  assert.equal(fields.output.textContent,`特化ゾーン×${count}獲得`);assert.equal(fields.span.textContent,'出陣チャレンジ');
  assert.equal(fields['.novaResultNext'].textContent,'次のBETで特化ゾーン準備');assert.equal(fields['.novaResultNext'].hidden,false);
  assert.equal(c.root.dataset.kind,'sortie');assert.equal(c.root.dataset.loading,undefined);assert.equal(fields['.novaResultTotal'].hidden,true);assert.equal(JSON.stringify(saved),before);
  c.hide();c.show(saved);assert.equal(fields.output.textContent,`特化ゾーン×${count}獲得`);
 }
 c.show({kind:'checkpoint',character:'all',color:'gold',pt:'2400'});assert.equal(fields['.novaResultNext'].textContent,'次のBETでスーパーノヴァチャレンジ');assert.equal(fields.output.textContent,'+2400pt');
 c.show({kind:'zone',character:'sora',color:'blue',pt:'500'});assert.equal(c.root.dataset.kind,'zone');assert.equal(fields.output.textContent,'500pt');assert.equal(fields['.novaResultNext'].hidden,true);
});
test('decoded result images show synchronously and cold/error requests show the current points',async()=>{
 const {c,images,shown,fields,flush}=presenter();
 c.show({character:'sora',color:'blue',pt:'750'});assert.equal(c.num.textContent,'750');assert.equal(fields.output.textContent,'750pt');assert.equal(fields.span.textContent,'空 上乗せ');
 images[0].onload();await flush();assert.equal(c.root.dataset.loading,undefined);
 c.show({character:'sora',color:'blue',pt:'800'});assert.equal(c.root.dataset.loading,undefined);assert.equal(c.num.textContent,'800');assert.equal(images.length,1);assert.equal(shown.length,2);
 c.show({character:'sora',color:'red',pt:'900'});assert.equal(c.root.dataset.color,'red');assert.equal(images.length,1);assert.equal(c.root.dataset.loading,undefined);
 c.show({character:'ouma',color:'red',pt:'1000'});images[1].onerror();await flush();assert.equal(c.root.dataset.loading,'true');assert.equal(fields.output.textContent,'1000pt');
 c.show({character:'ouma',color:'red',pt:'1200'});assert.equal(images.length,3);assert.equal(fields.output.textContent,'1200pt');images[2].onload();await flush();assert.equal(c.root.dataset.loading,undefined);
});

test('boss result uses the supplied original, preserves payout and saved card, and shares the normal result lifecycle',async()=>{
 const {c,images,shown,fields,flush}=presenter();
 const saved=JSON.parse(JSON.stringify({kind:'at',...r.pick('at','',2,()=>.05),pt:'1537'})),before=JSON.stringify(saved);
 c.show(saved);assert.equal(images[0].src,'assets/illustrations/result-boss.png');assert.equal(fields.output.textContent,'1537pt');assert.equal(fields.span.textContent,'AT総獲得');
 images[0].onload();await flush();assert.equal(c.root.dataset.loading,undefined);assert.equal(shown.at(-1),'assets/illustrations/result-boss.png');
 assert.equal(c.root.dataset.color,'blue');assert.equal(c.root.dataset.all,'false');assert.equal(JSON.stringify(saved),before);
 c.hide();assert.equal(c.root.hidden,true);c.show(saved);assert.equal(c.root.dataset.loading,undefined);assert.equal(images.length,1);
 c.show({kind:'zone',character:'sora',color:'red',pt:'500'});images[1].onload();await flush();assert.equal(shown.at(-1),'assets/illustrations/lamps-20260916/sora1.png');
});

test('consecutive zones total actual awards across a save, including the final zone, without changing prizes or RNG',()=>{
 const before={phase:'art',zone:'sora',award:'200'},after={phase:'art',zone:'',award:'300',queuedZones:['toto']};
 let draws=0;const rng=()=>{draws++;return .5;};
 const first=r.chain(null,before,after,r.transition(before,after,3,rng));
 assert.equal(first.card.pt,'300');assert.equal(first.card.totalPt,'300');assert.equal(first.card.zoneCount,1);
 const saved=JSON.parse(JSON.stringify(first.state));
 const secondBefore={phase:'art',zone:'toto',award:'400'},secondAfter={phase:'art',zone:'',award:'500',queuedZones:[]};
 const second=r.chain(saved,secondBefore,secondAfter,r.transition(secondBefore,secondAfter,3,rng));
 assert.equal(second.card.pt,'500');assert.equal(second.card.totalPt,'800');assert.equal(second.card.zoneCount,2);assert.equal(second.state.open,false);
 assert.equal(draws,2);assert.equal(after.award,'300');assert.equal(secondAfter.award,'500');
 const resumed=r.chain(second.state,{phase:'art'},secondAfter,null);assert.equal(resumed.state,null);
 const later=r.chain(resumed.state,before,{...after,queuedZones:[]},r.transition(before,after,3,rng));assert.equal(later.card.totalPt,undefined);
});

test('new setting hint cards restore supplied art, exact colors and payout without becoming checkpoint results',async()=>{
 const {c,images,shown,fields,flush}=presenter();
 for(const [index,character,color,roll] of [[0,'sora2','purple',.11],[1,'ouma2','gold',.14],[2,'group','rainbow',.155]]){
  const saved=JSON.parse(JSON.stringify({kind:'at',...r.pick('at','',6,()=>roll),pt:'2500'}));
  c.show(saved);assert.equal(images[index].src,`assets/illustrations/result-${character}.png`);
  images[index].onload();await flush();assert.equal(shown.at(-1),`assets/illustrations/result-${character}.png`);
  assert.equal(c.root.dataset.color,color);assert.equal(c.root.dataset.all,'false');assert.equal(c.root.dataset.loading,undefined);
  assert.equal(fields.span.textContent,'AT総獲得');assert.equal(fields.output.textContent,'2500pt');assert.equal(fields['.novaResultNext'].hidden,true);
  c.hide();c.show(saved);assert.equal(images.length,index+1);assert.equal(c.root.dataset.loading,undefined);
 }
 c.show({kind:'checkpoint',character:'all',color:'gold',pt:'2400'});
 assert.equal(c.root.dataset.all,'true');assert.equal(fields['.novaResultNext'].hidden,false);
 c.show({kind:'at',character:'ouma2',color:'gold',pt:'2500'});
 assert.equal(c.root.dataset.all,'false');assert.equal(fields['.novaResultNext'].hidden,true);assert.equal(c.root.dataset.color,'gold');
});

test('chain handles BIG zone stock, pending results, large totals and reset/challenge boundaries',()=>{
 const card={kind:'zone',character:'ouma',pt:'9007199254740999'},after={phase:'art',sets:'1'};
 const first=r.chain(null,{phase:'art',zone:'ouma'},after,card);
 const waiting=r.chain(first.state,{phase:'art'},{phase:'art',entryStage:'seven'},null);assert.equal(waiting.state,first.state);
 const final=r.chain(waiting.state,{phase:'art',zone:'giru'},{phase:'art'}, {...card,pt:'500'});assert.equal(final.card.totalPt,'9007199254741499');
 for(const after of [{phase:'normal'},{phase:'art',burstPending:true},{phase:'art',researchChallengeActive:true},{phase:'art',researchSortieLeft:10}])assert.equal(r.chain(first.state,{phase:'art'},after,null).state,null);
});

test('chain result renders current and total independently, and hides the total on later AT results',()=>{
 const {c,fields}=presenter();
 c.show({kind:'zone',character:'sora',color:'blue',pt:'500',totalPt:'800',zoneCount:2});
 assert.equal(fields.output.textContent,'500pt');assert.equal(fields.span.textContent,'空 ゾーン / 今回');assert.equal(fields['.novaResultTotal'].textContent,'連続特化 合計 800pt');assert.equal(fields['.novaResultTotal'].hidden,false);
 c.show({kind:'at',character:'sora',color:'red',pt:'1400'});assert.equal(fields['.novaResultTotal'].hidden,true);assert.equal(fields.output.textContent,'1400pt');
});

test('net and saved older results use the same concise label without changing points',()=>{
 const {c,fields}=presenter();
 for(const character of ['sora','boss','group']){
  const card={kind:'at',character,color:'blue',pt:'150',accounting:'net'};
  c.show(card);assert.match(fields.span.textContent,/AT総獲得$/);assert.equal(fields.output.textContent,'150pt');
  c.hide();c.show(JSON.parse(JSON.stringify(card)));assert.equal(fields.output.textContent,'150pt');
  c.show({...card,accounting:undefined});assert(!fields.span.textContent.includes('手取り'));
 }
});
test('image switches hide previous art immediately and ignore stale image loads',async()=>{
 const {c,images,shown,flush}=presenter();
 c.show({character:'ouma',color:'blue',pt:'100'});images[0].onload();await flush();assert.equal(shown.length,1);
 c.show({character:'sora',color:'blue',pt:'200'});assert.equal(c.root.dataset.loading,'true');assert.equal(shown.length,1);
 c.show({character:'toto',color:'red',pt:'300'});images[1].onload();await flush();assert.equal(shown.length,1);assert.equal(c.root.dataset.loading,'true');
 images[2].onload();await flush();assert.equal(shown.at(-1),'assets/illustrations/lamps-20260916/toto.png');assert.equal(c.num.textContent,'300');assert.equal(c.root.dataset.loading,undefined);
 c.show({character:'giru',color:'red',pt:'400'});c.hide();images[3].onload();await flush();assert.equal(shown.length,2);assert.equal(c.root.hidden,true);
});

test('checkpoint result uses all characters and cumulative net; stale single-image decode cannot replace it',async()=>{
 const {c,images,shown,fields,flush}=presenter();
 c.show({character:'sora',color:'blue',pt:'100'});
 c.show({kind:'checkpoint',character:'all',color:'gold',pt:'2404'});
 assert.equal(c.root.dataset.all,'true');assert.equal(c.root.dataset.color,'gold');
 assert.equal(fields.span.textContent,'有利区間終了 / 累計差枚');assert.equal(fields.output.textContent,'+2404pt');
 images[0].onload();await flush();assert.equal(shown.length,0);assert.equal(c.root.dataset.loading,undefined);
 c.show({character:'sora',color:'blue',pt:'200'});assert.equal(c.root.dataset.all,'false');assert.equal(shown.length,1);
});
