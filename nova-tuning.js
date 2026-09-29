/* Selected normal-bell proposal, 30,000G calibration, 2026-09-29. Pure probabilities; no net-based suppression. */
globalThis.NovaTuning=(()=>{
 const profiles=[{"cz":1.85,"zone":2.5,"direct":0.8,"denominator":7000,"tiers":[0.25,0.15,0.15,0.25,0.2],"weights":[0.1,0.1,0.1,0.15,0.15,0.15,0.05,0.05,0.05,0.1]},{"cz":1.91,"zone":3.5,"direct":1.3,"denominator":10000,"tiers":[0.1,0.2,0.4,0.25,0.05],"weights":[0.1,0.1,0.1,0.15,0.15,0.15,0.05,0.05,0.05,0.1]},{"cz":1.78,"zone":2.5,"direct":0.8,"denominator":7000,"tiers":[0.25,0.15,0.15,0.25,0.2],"weights":[0.1,0.1,0.1,0.15,0.15,0.15,0.05,0.05,0.05,0.1]},{"cz":1.92,"zone":3.5,"direct":1.3,"denominator":10000,"tiers":[0.1,0.2,0.4,0.25,0.05],"weights":[0.1,0.1,0.1,0.15,0.15,0.15,0.05,0.05,0.05,0.1]},{"cz":2.45,"zone":1,"direct":0.8,"denominator":7000,"tiers":[0.47,0.05,0.05,0.05,0.38],"weights":[0.1,0.1,0.1,0.19,0.19,0.19,0.01,0.01,0.01,0.1]},{"cz":1.607,"zone":0.4,"direct":1,"denominator":10000,"tiers":[0.1,0.2,0.6,0.09,0.01],"weights":[0.1,0.1,0.1,0.19,0.19,0.19,0.01,0.01,0.01,0.1]}];
 for(const p of profiles){Object.freeze(p.tiers);Object.freeze(p.weights);Object.freeze(p);}
 const profile=setting=>profiles[Math.max(0,Math.min(5,Math.round(Number(setting)||3)-1))];
 const index=setting=>Math.max(0,Math.min(5,Math.round(Number(setting)||3)-1));
 const normalBellDenominators=Object.freeze([250,240,230,220,210,200]);
 const initialMeans=Object.freeze([180,190,200,210,220,230]);
 const defaults=profiles.map((p,i)=>({...p,base:i===5?42:33.5,replay:i===5?.54:(1+.004*(i+1-3))*.45,upper:1.5,groups:[70,29.1,.9],thresholdBands:[]}));
 const limits={cz:[0,100],zone:[0,100],direct:[0,100],denominator:[1,1e9],base:[20,100],replay:[0,.9],upper:[0,100]};
 const distributions={tiers:[5,1],weights:[10,1],groups:[3,100]};
 function validate(p){
  for(const [key,[min,max]]of Object.entries(limits))if(!Number.isFinite(p[key])||p[key]<min||p[key]>max)throw new RangeError('Invalid tuning '+key);
  for(const [key,[length,total]]of Object.entries(distributions)){
   if(!Array.isArray(p[key])||p[key].length!==length||p[key].some(x=>!Number.isFinite(x)||x<0)||Math.abs(p[key].reduce((a,b)=>a+b,0)-total)>1e-9)throw new RangeError('Invalid tuning '+key);
   p[key]=Object.freeze([...p[key]]);
  }
  if(!Array.isArray(p.thresholdBands))throw new TypeError('Invalid threshold bands');
  let previous=-Infinity,previousChance=.75;
  p.thresholdBands=Object.freeze(p.thresholdBands.map(row=>{
   if(!row||!Number.isFinite(row.net)||row.net<0||row.net<=previous||!Number.isFinite(row.chance)||row.chance<.4||row.chance>previousChance)throw new RangeError('Threshold bands require increasing net and non-increasing chances from 40% to 75%');
   previous=row.net;previousChance=row.chance;return Object.freeze({net:row.net,chance:row.chance});
  }));
  return Object.freeze(p);
 }
 function create(rows,overrides={}){
  if(!overrides||typeof overrides!=='object'||Array.isArray(overrides))throw new TypeError('Tuning overrides must map settings 1–6 to profiles');
  for(const [setting,patch]of Object.entries(overrides)){
   if(!/^[1-6]$/.test(setting)||!patch||typeof patch!=='object'||Array.isArray(patch))throw new TypeError('Invalid tuning setting');
   for(const key of Object.keys(patch))if(!Object.hasOwn(limits,key)&&!Object.hasOwn(distributions,key)&&key!=='thresholdBands')throw new TypeError('Unknown tuning field: '+key);
  }
  const selected=Object.freeze(rows.map((p,i)=>validate({...p,...overrides[i+1]})));
  return Object.freeze({version:169,controlVersion:1,profile:s=>selected[index(s)],initialMeans,normalBellDenominators,
   normalBase:s=>selected[index(s)].base,normalReplay:s=>selected[index(s)].replay,
   thresholdSuccess:(s,net)=>selected[index(s)].thresholdBands.filter(row=>Number(net)>=row.net).at(-1)?.chance,
   withOverrides:patch=>create(selected,patch),snapshot:()=>selected});
 }
 // Base probabilities are fixed. Optional net tiers affect only checkpoint challenges,
 // and are disabled by default. There is no session win/loss assignment.
 return create(defaults);
})();
