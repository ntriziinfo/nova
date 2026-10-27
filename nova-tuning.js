/* v174: common visible roles with odd-rough/even-steady CZ and downstream reward profiles. */
globalThis.NovaTuning=(()=>{
 // Setting character is intentional: odd settings have a wider reward tail,
 // while even settings trade that tail for more frequent, steadier CZ play.
 // The common role table, 300pt+alpha entry and 4pt AT net are not tuning
 // levers.  Each row only controls one of the downstream balance layers.
 const balanceProfiles=[
  {style:'rough',gameCzEntry:.90,rareCzEntry:.90,gameCzSuccess:.52,rareCzSuccess:.58,strongCzSuccess:.74,strongRareSuccess:.82,failureRecovery:.65,bonusStock:.45,preparationReward:.65,upperEntry:.35,upperGroups:[0,55,45],weakResponse:.06,weakQuality:[75,15,7,2.5,.5],repeatZone:{values:[.48,1.94,5.83],weights:[.76,.20,.04]}},
  {style:'steady',gameCzEntry:1.07,rareCzEntry:1.07,gameCzSuccess:.60,rareCzSuccess:.64,strongCzSuccess:.76,strongRareSuccess:.84,failureRecovery:.80,bonusStock:.58,preparationReward:.80,upperEntry:.50,upperGroups:[0,85,15],weakResponse:.06,weakQuality:[50,32,16,2,0],repeatZone:{values:[1.16,1.29,1.42],weights:[.20,.60,.20]}},
  {style:'rough',gameCzEntry:.92,rareCzEntry:.92,gameCzSuccess:.56,rareCzSuccess:.62,strongCzSuccess:.78,strongRareSuccess:.85,failureRecovery:.85,bonusStock:.68,preparationReward:.85,upperEntry:.40,upperGroups:[0,50,50],weakResponse:.06,weakQuality:[62,16,13,7,2],repeatZone:{values:[.49,1.40,4.88],weights:[.65,.27,.08]}},
  {style:'steady',gameCzEntry:1.10,rareCzEntry:1.10,gameCzSuccess:.64,rareCzSuccess:.68,strongCzSuccess:.80,strongRareSuccess:.87,failureRecovery:1.05,bonusStock:.85,preparationReward:1.05,upperEntry:.55,upperGroups:[0,80,20],weakResponse:.06,weakQuality:[32,34,27,7,0],repeatZone:{values:[1.45,1.65,1.85],weights:[.20,.60,.20]}},
  {style:'rough',gameCzEntry:.98,rareCzEntry:.98,gameCzSuccess:.60,rareCzSuccess:.66,strongCzSuccess:.82,strongRareSuccess:.88,failureRecovery:1.10,bonusStock:1.05,preparationReward:1.20,upperEntry:.48,upperGroups:[0,40,60],weakResponse:.06,weakQuality:[45,13,18,17,7],repeatZone:{values:[.72,1.73,5.76],weights:[.48,.37,.15]}},
  {style:'steady',gameCzEntry:1.08,rareCzEntry:1.08,gameCzSuccess:.68,rareCzSuccess:.72,strongCzSuccess:.84,strongRareSuccess:.90,failureRecovery:1.30,bonusStock:1.25,preparationReward:1.40,upperEntry:.62,upperGroups:[0,70,30],weakResponse:.06,weakQuality:[12,28,45,14,1],repeatZone:{values:[1.95,2.25,2.55],weights:[.20,.60,.20]}}
 ];
 for(const row of balanceProfiles){
  row.upperGroups=Object.freeze([...row.upperGroups]);row.weakQuality=Object.freeze([...row.weakQuality]);
  row.repeatZone=Object.freeze({values:Object.freeze([...row.repeatZone.values]),weights:Object.freeze([...row.repeatZone.weights])});Object.freeze(row);
 }
 Object.freeze(balanceProfiles);
 const profiles=[{"cz":1.85,"zone":2.5,"direct":0.8,"denominator":7000,"tiers":[0.25,0.15,0.15,0.25,0.2],"weights":[0.1,0.1,0.1,0.15,0.15,0.15,0.05,0.05,0.05,0.1]},{"cz":1.91,"zone":3.5,"direct":1.3,"denominator":10000,"tiers":[0.1,0.2,0.4,0.25,0.05],"weights":[0.1,0.1,0.1,0.15,0.15,0.15,0.05,0.05,0.05,0.1]},{"cz":1.78,"zone":2.5,"direct":0.8,"denominator":7000,"tiers":[0.25,0.15,0.15,0.25,0.2],"weights":[0.1,0.1,0.1,0.15,0.15,0.15,0.05,0.05,0.05,0.1]},{"cz":1.92,"zone":3.5,"direct":1.3,"denominator":10000,"tiers":[0.1,0.2,0.4,0.25,0.05],"weights":[0.1,0.1,0.1,0.15,0.15,0.15,0.05,0.05,0.05,0.1]},{"cz":2.6,"zone":1,"direct":0.8,"denominator":7000,"tiers":[0.47,0.05,0.05,0.05,0.38],"weights":[0.1,0.1,0.1,0.19,0.19,0.19,0.01,0.01,0.01,0.1]},{"cz":1.607,"zone":0.4,"direct":1,"denominator":10000,"tiers":[0.1,0.2,0.6,0.09,0.01],"weights":[0.1,0.1,0.1,0.19,0.19,0.19,0.01,0.01,0.01,0.1]}];
 for(const p of profiles){Object.freeze(p.tiers);Object.freeze(p.weights);Object.freeze(p);}
 const profile=setting=>profiles[Math.max(0,Math.min(5,Math.round(Number(setting)||3)-1))];
 const index=setting=>Math.max(0,Math.min(5,Math.round(Number(setting)||3)-1));
 const normalBellDenominators=Object.freeze([230,230,230,230,230,230]);
 const initialMeans=Object.freeze([180,190,200,210,220,230]);
 // The replay reduction applies only to ordinary play, not the shared CZ table.
 // extraZone is before the live AT multiplier: .04 × .25 = .01 for settings 5/6.
 const defaults=profiles.map((p,i)=>({...p,base:30,replay:i===5?.54:(1+.004*(i+1-3))*.45,normalReplayReduction:.01,extraZone:i>=4?.04:.01,upper:1.5,groups:[70,29.1,.9],thresholdBands:[]}));
 const limits={cz:[0,100],zone:[0,100],direct:[0,100],denominator:[1,1e9],base:[20,100],replay:[0,.9],normalReplayReduction:[0,.9],extraZone:[0,1],upper:[0,100]};
 const distributions={tiers:[5,1],weights:[10,1],groups:[3,100]};
 function validate(p){
  for(const [key,[min,max]]of Object.entries(limits))if(!Number.isFinite(p[key])||p[key]<min||p[key]>max)throw new RangeError('Invalid tuning '+key);
  if(p.normalReplayReduction>p.replay)throw new RangeError('Replay reduction exceeds shared replay probability');
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
  return Object.freeze({version:174,controlVersion:2,profile:s=>selected[index(s)],balanceProfile:s=>balanceProfiles[index(s)],balanceProfiles,initialMeans,normalBellDenominators,
   normalBase:s=>selected[index(s)].base,normalReplay:s=>selected[index(s)].replay,
   thresholdSuccess:(s,net)=>selected[index(s)].thresholdBands.filter(row=>Number(net)>=row.net).at(-1)?.chance,
   withOverrides:patch=>create(selected,patch),snapshot:()=>selected});
 }
 // Base probabilities are fixed. Optional net tiers affect only checkpoint challenges,
 // and are disabled by default. There is no session win/loss assignment.
 return create(defaults,{"1":{"groups":[70,29.1,0.9]},"2":{"groups":[70,29.1,0.9]},"3":{"groups":[70,29.1,0.9]},"4":{"groups":[70,29.1,0.9]},"5":{"groups":[70,29.1,0.9]},"6":{"groups":[70,29.1,0.9]}});
})();
