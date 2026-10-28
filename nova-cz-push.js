globalThis.NovaCzPresentation=(()=>{
// Uses saved presentation randomness; never changes the game outcome.
// Pooled CZ rates (including fake CZ), calibrated by the approved 20kG trial.
const tiers=Object.freeze([{count:1,color:'white',confidence:1,weight:.04},{count:2,color:'blue',confidence:.05,weight:1},{count:4,color:'yellow',confidence:.15,weight:1},{count:6,color:'green',confidence:.6,weight:4},{count:7,color:'red',confidence:.9,weight:1},{count:8,color:'rainbow',confidence:1,weight:.2}]);
function weights(probability){
 if(!(probability>.05&&probability<1))throw Error('Use the measured pooled CZ win rate (including fake CZ); never per-CZ certainty.');
 let lo=-1000,hi=1000,w;for(let n=0;n<80;n++){const t=(lo+hi)/2,logs=tiers.map(x=>Math.log(x.weight)+t*x.confidence),m=Math.max(...logs);w=logs.map(x=>Math.exp(x-m));const z=w.reduce((a,b)=>a+b,0);w=w.map(x=>x/z);if(w.reduce((a,b,i)=>a+b*tiers[i].confidence,0)<probability)lo=t;else hi=t;}return w;
}
function selectTier(won,probability,roll){const w=weights(probability).map((v,i)=>v*(won?tiers[i].confidence:1-tiers[i].confidence));let r=Math.max(0,Math.min(.999999999,roll))*w.reduce((a,b)=>a+b,0);return tiers[w.findIndex(v=>(r-=v)<0)];}

const rates=[0.27317164880616657,0.2836866010598032,0.31678578327216533,0.30022044640396806,0.326671511627907,0.32773931366646597];

function fraction(seed,salt){let n=((seed||0)^Math.imul(salt,0x9e3779b9))>>>0;n=Math.imul(n^(n>>>16),0x21f0aaad);return ((n^(n>>>15))>>>0)/4294967296;}
const cache=new Map();const rawWeights=weights;weights=p=>{if(!cache.has(p))cache.set(p,rawWeights(p));return cache.get(p);};
// One saved seed selects pacing, stable across stops and reloads.
function pacing(seed){const r=fraction(seed,823);return r<.25?'early':r<.55?'middle':r<.8?'spread':'late';}
const timingCache=new Map();
function lampSchedule(seed,total){
 const key=seed+':'+total;if(timingCache.has(key))return timingCache.get(key);
 const style=pacing(seed),chance=fraction(seed,1229)<.05;
 const capacity=chance?4:2,used=Array(total).fill(0),times=[1];used[0]=1;
 for(let i=2;i<=8;i++){
  const r=fraction(seed,i+401),progress=style==='early'?.08+.37*r:style==='middle'?.28+.42*r:style==='spread'?.08+.8*r:.68+.3*r;
  const preferred=Math.min(total-1,Math.floor(progress*total));
  const available=used.map((n,g)=>({n,g})).filter(x=>x.n<capacity).sort((a,b)=>Math.abs(a.g-preferred)-Math.abs(b.g-preferred)||a.g-b.g);
  const game=available[0]?.g??total-1;used[game]++;
  const occupied=new Set(times.filter(t=>Math.floor((t-1)/3)===game));
  let stop=1+Math.floor(fraction(seed,i+701)*3);for(let j=0;j<3&&occupied.has(game*3+stop);j++)stop=stop%3+1;
  times.push(game*3+stop);
 }
 times.sort((a,b)=>a-b);if(timingCache.size>1000)timingCache.clear();timingCache.set(key,times);return times;
}
function lampStop(seed,index,total){return lampSchedule(seed,total)[index-1];}
function display(lamp,stop,won,setting,terminal=false,revealed=false){
 if(!lamp)return null;
 // Once the already-decided CZ outcome is known to be a win, presentation must
 // not keep showing a lower-confidence cue until a reel is stopped. This only
 // reads the saved outcome; it never draws gameplay RNG or changes the award.
 if(won&&terminal&&revealed)return {stage:8,color:'rainbow',rainbow:true};
 if(stop<1)return null;
 const p=rates[Math.max(0,Math.min(5,(Number(setting)||1)-1))],seed=lamp.timingSeed||0;
 const roll=fraction(seed,137),yes=selectTier(true,p,roll),no=selectTier(false,p,roll);
 const last=terminal||lamp.remaining===1;
 // Before PUSH the same saved seed produces identical lighting for wins and losses.
 const target=revealed?(won?yes.count:no.count):Math.min(7,yes.count,no.count);
 const total=Math.max(1,lamp.totalGames||15),elapsed=total-(lamp.remaining||1)+1;
 const current=last?(total-1)*3+stop:(elapsed-1)*3+stop;
 let count=0;
 for(let i=1;i<=target;i++)if(current>=lampStop(seed,i,total))count++;
 const color=count>=8?'rainbow':count>=7?'red':count>=6?'green':count>=4?'yellow':count>=2?'blue':'white';
 return {stage:count,color,rainbow:count>=8};
}
// Dedicated presentation hash: no gameplay RNG draw and no outcome changes.
function variant(resolved,setting=1){
 const seed=resolved?.czLamp?.timingSeed;
 if(!Number.isFinite(seed))return 'white';
 const won=!!(resolved.bonusHit||resolved.aTypeBonusReady||resolved.flowAfter?.phase==='art');
 const roll=fraction(seed,947);
 if(won)return roll<.01?'gold':roll<.11?'big':roll<.31?'red':'white';
 // Bayes calibration: P(red|win)=20%, P(win|red)=80%.
 const p=rates[Math.max(0,Math.min(5,(Number(setting)||1)-1))];
 return roll<.05*p/(1-p)?'red':'white';
}
function gold(resolved){return variant(resolved)==='gold';}
let pendingPush=null,pendingAuto=null;
function autoPress(){return pendingAuto?.()||false;}
function restartFadeIn(button,className){
 button.hidden=false;
 button.className=className;
 // A layout read between removing and restoring the class makes the entrance
 // animation deterministic when the same button element is reused.
 void button.offsetWidth;
 button.className=className+' novaCzEntering';
}
function wait(resolved,{auto=false,setting=1,valid,reveal,onFailure=()=>{}}){
 if(!resolved?.czLamp||resolved.czPushConfirmed||!(resolved.czCompleted||resolved.bonusHit||resolved.aTypeBonusReady))return false;
 let button=document.getElementById('novaCzPush');
 if(!button){button=document.createElement('button');button.id='novaCzPush';button.type='button';button.textContent='PUSH';document.querySelector('.reelArea').append(button);}
 if(pendingPush===resolved)return true;
 pendingPush=resolved;
 document.documentElement.classList.remove('novaCzFailed');
 restartFadeIn(button,'white');button.disabled=false;
 let accepted=false,autoQueued=false;
 const autoEnabled=()=>typeof auto==='function'?auto():auto;
 const accept=()=>{
  if(pendingPush!==resolved||accepted)return;
  if(!valid()||resolved.czPushConfirmed){button.hidden=true;return;}
  accepted=true;button.disabled=true;
  const complete=()=>{
   if(pendingPush!==resolved)return;
   pendingAuto=null;
   document.documentElement.classList.remove('novaCzFailed');button.hidden=true;
   if(!valid())return;
   resolved.czPushConfirmed=true;reveal();
  };
  const won=!!(resolved.bonusHit||resolved.aTypeBonusReady||resolved.flowAfter?.phase==='art');
  if(won){complete();return;}
  document.documentElement.classList.add('novaCzFailed');
  button.className+=' failed';
  onFailure(resolved);
  // Keep the completed spin pending while the failure presentation fades out.
  setTimeout(complete,900);
 };
 pendingAuto=()=>{
  if(pendingPush!==resolved||!valid()||resolved.czPushConfirmed)return false;
  if(accepted||autoQueued)return true;
  if(!autoEnabled())return false;
  autoQueued=true;
  setTimeout(()=>{autoQueued=false;if(autoEnabled())accept();},600);
  return true;
 };
 button.onclick=accept;autoPress();return true;
}
return {tiers,display,wait,gold,variant,autoPress};

})();
