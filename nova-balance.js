/* Normal-mode calibration: see NORMAL-VERIFICATION.md. Targets are not guarantees. */
globalThis.NovaBalance=(()=>{
 const targets=[.95,.965,.985,1.01,1.05,1.10];
 const normal=[[354.112628,570.311235,6.592194,128,7.464630],[335.340933,496.870459,6.554256,192,7.482946],[318.675842,391.096799,6.455407,124,7.452119],[295.728558,359.759320,6.248231,184,7.301746],[288.226978,283.780845,6.120643,120,7.250883],[276.519476,276.524590,5.897360,176,7.245667]];
 function giruMean(setting){let survival=1,mean=0;for(let k=0;k<6;k++){const g=5*2**k,p=NovaArt.giruChance(g,setting);mean+=survival*(1-p)*g;survival*=p;}const p=NovaArt.giruChance(320,setting);return mean+survival*320*(1-p)/(1-2*p);}
 // Entry scales fitted with the normal-mode / ceiling / impurity / freeze simulation.
 const entryScales=[.163,.194,.206,.236,.263,.315];
 const profiles=targets.map((target,i)=>Object.freeze({setting:i+1,target,scale:entryScales[i],directDenom:NovaArt.defaults['direct'+(i+1)]/entryScales[i],czDenom:120/entryScales[i],strongDenom:600/entryScales[i],verifiedModel:'normal-v1'}));
 const profile=setting=>profiles[Math.max(0,Math.min(5,Math.round(Number(setting)||1)-1))];
 return {targets,normal,profiles,profile,giruMean};
})();
