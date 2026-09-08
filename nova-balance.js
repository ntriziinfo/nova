/* Normal AT only, net 4pt/G: current zone rules and estimates are in docs/zone-v2.md. */
globalThis.NovaBalance=(()=>{
 const targets=[.95,.965,.98,1.02,1.07,1.14];
 const normal=[[354.112628,570.311235,6.592194,128,7.464630],[335.340933,496.870459,6.554256,192,7.482946],[318.675842,391.096799,6.455407,124,7.452119],[295.728558,359.759320,6.248231,184,7.301746],[288.226978,283.780845,6.120643,120,7.250883],[276.519476,276.524590,5.897360,176,7.245667]];
 function zoneMean(id,options={}){const a=NovaArt,c=a.config(options),s=a.startZone(a.enter(),id,c,()=>.5),r=a.zoneRules(s,c);
  if(r.family==='ladder')return a.ladderTableFor(s).reduce((sum,l)=>sum+l[0]+l.slice(1).reduce((v,n,i)=>v+(n-l[i])*r.success**(i+1),0),0)/a.ladderTableFor(s).length;
  if(r.family==='seven'){const games=r.reset===0?5:((1-r.reset)**-5-1)/r.reset;return games*Math.min(r.hit,1-r.reset)*r.weights.reduce((sum,w,i)=>sum+w*a.sevenValues[i],0);}
  return 5*r.hit*(50+50*r.hundred)*r.awardMultiplier/(1-r.freeze);
 }
 const giruMean=(setting,ura=false)=>zoneMean(ura?'ura_giru':'giru');
 // Entry scales fitted with the normal-mode / ceiling / impurity / freeze simulation.
 function profile(setting){const i=Math.max(0,Math.min(5,Math.round(Number(setting)||1)-1)),scale=.21*(1+.12*NovaArt.settingBias[i]);return {setting:i+1,target:targets[i],scale,directDenom:NovaArt.defaults['direct'+(i+1)]/scale,czDenom:120/scale,strongDenom:600/scale,verifiedModel:'net-soft-session-dependent'};}
 const profiles=targets.map((_,i)=>profile(i+1));
 return {targets,normal,profiles,profile,giruMean,zoneMean};
})();
