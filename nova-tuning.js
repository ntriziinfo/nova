/* Final 30,000G calibration, 2026-09-29. Pure probabilities; no net-based suppression. */
globalThis.NovaTuning=(()=>{
 const profiles=[{"cz":2.07,"zone":2.5,"direct":0.8,"denominator":7000,"tiers":[0.25,0.15,0.15,0.25,0.2],"weights":[0.1,0.1,0.1,0.15,0.15,0.15,0.05,0.05,0.05,0.1]},{"cz":2.12,"zone":3.5,"direct":1.3,"denominator":10000,"tiers":[0.1,0.2,0.4,0.25,0.05],"weights":[0.1,0.1,0.1,0.15,0.15,0.15,0.05,0.05,0.05,0.1]},{"cz":2.04,"zone":2.5,"direct":0.8,"denominator":7000,"tiers":[0.25,0.15,0.15,0.25,0.2],"weights":[0.1,0.1,0.1,0.15,0.15,0.15,0.05,0.05,0.05,0.1]},{"cz":2.045,"zone":3.5,"direct":1.3,"denominator":10000,"tiers":[0.1,0.2,0.4,0.25,0.05],"weights":[0.1,0.1,0.1,0.15,0.15,0.15,0.05,0.05,0.05,0.1]},{"cz":3,"zone":1,"direct":0.8,"denominator":7000,"tiers":[0.35,0.35,0.25,0.04,0.01],"weights":[0.1,0.1,0.1,0.19,0.19,0.19,0.01,0.01,0.01,0.1]},{"cz":1.607,"zone":0.4,"direct":1,"denominator":10000,"tiers":[0.1,0.2,0.6,0.09,0.01],"weights":[0.1,0.1,0.1,0.19,0.19,0.19,0.01,0.01,0.01,0.1]}];
 for(const p of profiles){Object.freeze(p.tiers);Object.freeze(p.weights);Object.freeze(p);}
 const profile=setting=>profiles[Math.max(0,Math.min(5,Math.round(Number(setting)||3)-1))];
 return Object.freeze({version:167,profile,initialMeans:Object.freeze([180,190,200,210,220,230]),normalBase:setting=>Number(setting)===6?42:33.5});
})();
