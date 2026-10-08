/* Future CZ/AT draws only. Earned quota, stock and payouts are never modified. */
globalThis.NovaDecrement=(()=>{
 const disabled=Object.freeze({enabled:false});
 const profiles=Object.freeze({
  5:Object.freeze({enabled:true,lowMean:150000,highMean:183333.33333333334,lowCz:0.25,highCz:2.4,lowAt:.25,highAt:.25,netEnter:6000,netExit:4500,netCz:.25,netAt:.25}),
  6:Object.freeze({enabled:true,lowMean:60000,highMean:90000,lowCz:.25,highCz:1.95,lowAt:.25,highAt:.25,netEnter:6500,netExit:5000,netCz:.25,netAt:.25})
 });
 const settingNo=s=>Math.max(1,Math.min(6,Math.round(Number(s)||3)));
 const rules=s=>profiles[settingNo(s)]||disabled;
 const validRng=a=>Array.isArray(a)&&a.length===4&&a.every(x=>Number.isInteger(x)&&x>=0&&x<=0xffffffff)&&a.some(Boolean);
 let state=null;
 // xoshiro128** (Blackman/Vigna, CC0). Persist the independent stream as well as
 // the regime: reloading must neither reroll the state nor alter gameplay RNG.
 function random(){
  let [a,b,c,d]=state.rng.map(x=>x|0);
  const z=Math.imul(b,5),r=Math.imul((z<<7)|(z>>>25),9)>>>0,t=b<<9;
  c^=a;d^=b;b^=c;a^=d;c^=t;d=(d<<11)|(d>>>21);
  state.rng=[a>>>0,b>>>0,c>>>0,d>>>0];return r/4294967296;
 }
 function reset(setting=3,seedState,enabled=true){
  setting=settingNo(setting);const p=rules(setting);
  if(seedState!==undefined&&!validRng(seedState))throw new TypeError('Invalid decrement RNG state');
  const rng=seedState||Array.from(crypto.getRandomValues(new Uint32Array(4)));
  if(!rng.some(Boolean))rng[0]=1;
  state={version:170,setting,enabled:p.enabled&&enabled,rng:[...rng],low:false,netLow:false,
   games:0,lowGames:0,entries:0,exits:0,initialLow:false,lowByPhase:{},netGames:0,netEntries:0,netExits:0,peakObserved:0};
  state.initialLow=state.low=state.enabled&&random()<p.lowMean/(p.lowMean+p.highMean);
  state.entries=state.low?1:0;return state;
 }
 function bind(value,setting=3){
  setting=settingNo(setting);
  if(value?.version!==170||value.setting!==setting||value.enabled!==rules(setting).enabled||!validRng(value.rng))return reset(setting);
  state=value;state.low=!!state.low;state.netLow=!!state.netLow;state.initialLow=!!state.initialLow;
  for(const k of ['games','lowGames','entries','exits','netGames','netEntries','netExits','peakObserved'])state[k]=Math.max(0,Number(state[k])||0);
  if(!state.lowByPhase||typeof state.lowByPhase!=='object')state.lowByPhase={};
  return state;
 }
 function observe(net){
  if(!state?.enabled||!Number.isFinite(Number(net)))return;
  const p=rules(state.setting);net=Number(net);state.peakObserved=Math.max(state.peakObserved,net);
  if(!state.netLow&&net>=p.netEnter){state.netLow=true;state.netEntries++;}
  else if(state.netLow&&net<=p.netExit){state.netLow=false;state.netExits++;}
 }
 // Called once per actual BET, including bonus/replay; never for 0G continuation.
 function beforeBet(phase='normal'){
  if(!state)return;
  const p=rules(state.setting);
  if(state.enabled&&state.games>0&&random()<1/(state.low?p.lowMean:p.highMean)){
   state.low=!state.low;if(state.low)state.entries++;else state.exits++;
  }
  state.games++;if(state.netLow)state.netGames++;
  if(state.low||state.netLow){state.lowGames++;state.lowByPhase[phase]=(state.lowByPhase[phase]||0)+1;}
 }
 function factor(kind,setting=state?.setting){
  if(!state?.enabled||state.setting!==settingNo(setting))return 1;
  const p=rules(setting),time=p[(state.low?'low':'high')+kind];
  return state.netLow?Math.min(p['net'+kind],time):time;
 }
 function metrics(){
  if(!state)return null;
  const {version,setting,enabled,rng,low,netLow,...meter}=state;
  return {...meter,lowByPhase:{...meter.lowByPhase},endingLow:low,endingNetLow:netLow};
 }
 return Object.freeze({version:170,rules,bind,reset,observe,beforeBet,cz:s=>factor('Cz',s),at:s=>factor('At',s),
  snapshot:()=>state?JSON.parse(JSON.stringify(state)):null,metrics});
})();
