/* Normal-mode calibration: see NORMAL-VERIFICATION.md. Targets are not guarantees. */
globalThis.NovaBalance=(()=>{
 const targets=[.95,.965,.98,1.02,1.07,1.14];
 const normal=[[354.112628,570.311235,6.592194,128,7.464630],[335.340933,496.870459,6.554256,192,7.482946],[318.675842,391.096799,6.455407,124,7.452119],[295.728558,359.759320,6.248231,184,7.301746],[288.226978,283.780845,6.120643,120,7.250883],[276.519476,276.524590,5.897360,176,7.245667]];
 function giruMean(setting,ura=false){let total=0;for(let base=1;base<=5;base++){let g=Number(NovaArt.points(base)),survival=1,mean=0;while(g<Number(NovaArt.points(ura?640:320))){const p=NovaArt.giruChance(g,setting,ura);mean+=survival*(1-p)*g;survival*=p;g*=2;}const p=NovaArt.giruChance(g,setting,ura);total+=(mean+survival*g*(1-p)/(1-2*p))/5;}return total+Number(NovaArt.points(NovaArt.guarantees[ura?'ura':'normal'].giru));}
 // Entry scales fitted with the normal-mode / ceiling / impurity / freeze simulation.
 function profile(setting){const i=Math.max(0,Math.min(5,Math.round(Number(setting)||1)-1)),scale=.21*(1+.12*NovaArt.settingBias[i]);return {setting:i+1,target:targets[i],scale,directDenom:NovaArt.defaults['direct'+(i+1)]/scale,czDenom:120/scale,strongDenom:600/scale,verifiedModel:'base33-calibrated-v18'};}
 const profiles=targets.map((_,i)=>profile(i+1));
 return {targets,normal,profiles,profile,giruMean};
})();
