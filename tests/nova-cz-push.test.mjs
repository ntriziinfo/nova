import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const classes=new Set();const elements=new Map(),timers=[],timerDelays=[];let fadeRestarts=0;const c=vm.createContext({document:{documentElement:{classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)}},getElementById:id=>elements.get(id),createElement:()=>Object.defineProperty({},'offsetWidth',{get(){fadeRestarts++;return 0;}}),querySelector:()=>({append:b=>elements.set(b.id,b)})},setTimeout:(fn,ms)=>{timerDelays.push(ms);return timers.push(fn);}});vm.runInContext(fs.readFileSync('nova-cz-push.js','utf8'),c);const p=c.NovaCzPresentation;
for(let setting=1;setting<=6;setting++)for(let seed=0;seed<1000;seed++){for(const success of [false,true]){let previous=0;for(let remaining=15;remaining>=1;remaining--)for(let stop=1;stop<=3;stop++){const shown=p.display({remaining,totalGames:15,timingSeed:seed},stop,success,setting);const stage=Math.max(previous,shown.stage);assert(stage>=previous);previous=stage;if(remaining===1&&stop===3){assert(stage>=1&&stage<=8);assert(stage<=7);}}}}
assert.deepEqual(JSON.parse(JSON.stringify(p.display({remaining:15,totalGames:15,timingSeed:42},0,true,1,true,true))),{stage:8,color:'rainbow',rainbow:true});
assert.deepEqual(JSON.parse(JSON.stringify(p.display({remaining:15,totalGames:15,timingSeed:42},1,true,1,true,true))),{stage:8,color:'rainbow',rainbow:true});
assert.equal(p.display({remaining:15,totalGames:15,timingSeed:42},0,true,1,false),null);
assert.equal(p.display({remaining:15,totalGames:15,timingSeed:42},0,false,1),null);
let count=0;const r={czLamp:{},czCompleted:true,bonusHit:true};const hooks={auto:true,valid:()=>true,reveal:()=>count++};assert.equal(p.wait(r,hooks),true);assert.equal(p.wait(r,hooks),true);assert.equal(timers.length,1);assert.equal(count,0);timers[0]();elements.get('novaCzPush').onclick();assert.equal(count,1);assert.equal(p.wait(r,hooks),false);assert.equal(elements.get('novaCzPush').hidden,true);assert.equal(p.wait({},hooks),false);
console.log('Candidate checks passed: 12,000 CZ schedules, final guarantees, monotonic display, PUSH wait/auto/repeated clicks.');

const resumed={czLamp:{},czCompleted:true,czPushWaiting:true,bonusHit:true};p.wait(resumed,{auto:false,valid:()=>true,reveal:()=>count++});assert.equal(elements.get('novaCzPush').hidden,false);assert.match(elements.get('novaCzPush').className,/novaCzEntering/);assert.equal(fadeRestarts,2);elements.get('novaCzPush').onclick();assert.equal(count,2);

let goldCount=0;
for(let seed=0;seed<100000;seed++){
 const won={czLamp:{timingSeed:seed},czCompleted:true,bonusHit:true};
 const before=JSON.stringify(won);
 const picked=p.gold(won);goldCount+=picked;
 assert.equal(p.gold(JSON.parse(before)),picked);
 assert.equal(JSON.stringify(won),before);
 assert.equal(p.gold({...won,bonusHit:false}),false);
}
assert(goldCount>900&&goldCount<1100, 'Gold should be approximately 1% of confirmed wins: '+goldCount);
assert.equal(p.gold({czLamp:{success:true,timingSeed:1},czCompleted:true}),false);
assert.equal(p.gold({czLamp:{},bonusHit:true}),false);
console.log('Gold PUSH: '+goldCount+'/100000 wins; zero losses; stable after reload; outcomes unchanged.');
const rates=[.27317164880616657,.2836866010598032,.31678578327216533,.30022044640396806,.326671511627907,.32773931366646597];
for(let setting=1;setting<=6;setting++){
 const win={white:0,big:0,gold:0,red:0},loss={white:0,big:0,gold:0,red:0};
 for(let seed=0;seed<100000;seed++){
  const r={czLamp:{timingSeed:seed},czCompleted:true,bonusHit:true};
  win[p.variant(r,setting)]++;
  loss[p.variant({...r,bonusHit:false},setting)]++;
 }
 assert(Math.abs(win.big/100000-.1)<.003);
 assert(Math.abs(win.red/100000-.2)<.003);
 assert.equal(loss.big+loss.gold,0);
 const prior=rates[setting-1],confidence=prior*win.red/(prior*win.red+(1-prior)*loss.red);
 assert(Math.abs(confidence-.8)<.006);
 console.log('Setting '+setting+': red calibrated confidence '+(confidence*100).toFixed(2)+'%, big '+win.big+'/100000 wins');
}
const css=fs.readFileSync('nova-artwork.css','utf8');
assert.match(css,/#novaCzPush\.big,#novaCzPush\.gold\{left:0%;top:12\.5%;width:100%;height:70%\}/);
assert.match(css,/#novaCzPush\.novaCzEntering\{animation:novaPushFadeIn/);
assert.match(css,/data-lamp=cz-rainbow[^}]+novaCzRainbowFlash \.14s/);
assert.match(css,/data-cz-color=rainbow[^}]+novaCzReelRainbowFlash \.14s/);
assert.match(css,/\.novaCzFailed #machine :is\([^}]+filter:brightness\(0\)!important/);
for(const selector of ['.lamps','.lamp','#stLamp','.jagStatusLamps'])assert.match(css,new RegExp('\\.novaCzFailed #machine :is\\([^}]*'+selector.replace('.','\\.')+'[^}]*\\)'));
assert.doesNotMatch(css,/\.novaCzFailed #machine :is\([^}]*#novaCzPush/);
assert.match(css,/prefers-reduced-motion:reduce[^}]+#novaCzPush\.failed\{animation:none;opacity:0/);
assert(!fs.readFileSync('nova-cz-push.js','utf8').includes('Math.random'));

const failed={czLamp:{},czCompleted:true};let failedCallbacks=0,failedResolved=null;
p.wait(failed,{valid:()=>true,reveal:()=>count++,onFailure:value=>{failedCallbacks++;failedResolved=value;}});
const b=elements.get('novaCzPush');b.onclick();b.onclick();
assert.equal(count,2);assert.equal(failed.czPushConfirmed,undefined);
assert.equal(failedCallbacks,1);assert.equal(failedResolved,failed);
assert.equal(b.hidden,false);assert.equal(b.disabled,true);assert(classes.has('novaCzFailed'));
assert(b.className.endsWith(' failed'));assert.equal(timerDelays.at(-1),2000);assert.equal(failed.czPushConfirmed,undefined);timers.at(-1)();
assert.equal(count,3);assert.equal(failed.czPushConfirmed,true);assert.equal(b.hidden,true);assert(classes.has('novaCzFailed'));assert.equal(p.failureActive,true);p.clearFailureOnBet();assert(!classes.has('novaCzFailed'));assert.equal(p.failureActive,false);
let valid=true;
p.wait({czLamp:{},czCompleted:true},{valid:()=>valid,reveal:()=>count++});b.onclick();valid=false;timers.at(-1)();
assert.equal(count,3);assert.equal(b.hidden,true);assert(!classes.has('novaCzFailed'));
console.log('Failure fade: single completion, delayed reveal, stale spin cancellation and dim cleanup passed.');
let autoOn=false,autoReveals=0;
const takeover={czLamp:{},czCompleted:true,bonusHit:true};
p.wait(takeover,{auto:()=>autoOn,valid:()=>true,reveal:()=>autoReveals++});
assert.equal(p.autoPress(),false);
autoOn=true;const queuedBefore=timers.length;
assert.equal(p.autoPress(),true);p.autoPress();p.autoPress();
assert.equal(timers.length,queuedBefore+1);
autoOn=false;timers.at(-1)();assert.equal(autoReveals,0);
autoOn=true;p.autoPress();timers.at(-1)();
assert.equal(autoReveals,1);assert.equal(takeover.czPushConfirmed,true);
assert.equal(p.autoPress(),false);
const autoFailure={czLamp:{},czCompleted:true};
p.wait(autoFailure,{auto:()=>autoOn,valid:()=>true,reveal:()=>autoReveals++});
timers.at(-1)();assert.equal(autoReveals,1);assert(classes.has('novaCzFailed'));
p.autoPress();assert.equal(timerDelays.at(-1),2000);assert.equal(autoFailure.czPushConfirmed,undefined);timers.at(-1)();assert.equal(autoReveals,2);
assert.equal(autoFailure.czPushConfirmed,true);assert(classes.has('novaCzFailed'));assert.equal(p.failureActive,true);p.clearFailureOnBet();assert(!classes.has('novaCzFailed'));
console.log('AUTO PUSH: takeover while waiting, one timer, stop/restart, success and failure passed.');

const game=fs.readFileSync('nova-game.js','utf8');
assert.match(game,/function playNormalBgm\(\)\{\s*if\(globalThis.NovaCzPresentation\?\.failureActive\)\{pauseNormalBgm\(\);return;\}/);
assert.match(game,/resolved.czFailurePushPlayed=true;\s*pauseNormalBgm\(\);/);
assert.match(game,/if\(NovaCzPresentation.failureActive\)\{NovaCzPresentation.clearFailureOnBet\(\);playNormalBgm\(\);\}/);

const atBet={czLamp:{remaining:1},czCompleted:true,bonusHit:true};
const entranceCount=fadeRestarts;
assert.equal(p.showAtBet({czLamp:{remaining:2}}),false);
assert.equal(p.showAtBet(atBet),true);
assert.equal(b.hidden,false);assert.equal(b.disabled,true);assert.equal(b.onclick,null);assert.equal(b.className,'white');
assert.equal(atBet.czPushConfirmed,undefined);
p.wait(atBet,{valid:()=>true,reveal:()=>{}});
assert.equal(b.disabled,false);assert.equal(fadeRestarts,entranceCount);
b.onclick();assert.equal(atBet.czPushConfirmed,true);
console.log('Final BET shows PUSH immediately; final stop enables it without another fade.');
