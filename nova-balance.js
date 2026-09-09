/* Normal AT only, net 4pt/G: current zone rules and estimates are in docs/zone-v2.md. */
globalThis.NovaBalance=(()=>{
 const targets=[.95,.965,.98,1.02,1.07,1.14];
 const normal=[[354.112628,570.311235,6.592194,128,7.464630],[335.340933,496.870459,6.554256,192,7.482946],[318.675842,391.096799,6.455407,124,7.452119],[295.728558,359.759320,6.248231,184,7.301746],[288.226978,283.780845,6.120643,120,7.250883],[276.519476,276.524590,5.897360,176,7.245667]];
 // Exact reward recursion: 50pt grid below the threshold, translation-invariant tail above it.
 function zoneMean(id,options={}){const a=NovaArt,c=a.config(options),s=a.startZone(a.enter(),id,{...c,setting:options.setting},()=>.5),r=a.zoneRules(s,c),limit=a.zoneTailControl.threshold,factor=a.zoneTailControl.factor;
  if(r.family==='ladder')return a.ladderTableFor(s).reduce((sum,l,j)=>{let reach=1,value=l[0];for(let i=1;i<l.length;i++){reach*=a.ladderGuaranteed({...s,ladder:l,award:String(l[i-1])})?1:r.success;value+=(l[i]-l[i-1])*reach;}return sum+value*a.ladderWeightsFor(s)[j]/100;},0);
  if(r.family==='seven'){
   const mean=a.sevenValues.reduce((n,v,i)=>n+v*r.weights[i],0),values=new Map();
   const tail=a.sevenAimRules({...s,award:String(limit)},c),reward=tail.reset*10+tail.hit*mean;
   const full=tail.reset?((1-tail.reset)**-5-1)/tail.reset*reward:5*reward;
   const get=(left,award)=>award>=limit?(tail.reset?(1-(1-tail.reset)**left)/tail.reset*(reward+tail.reset*full):left*reward):values.get(award)[left];
   for(let award=limit-10;award>=0;award-=10){
    const row=Array(6).fill(0),rates=a.sevenAimRules({...s,award:String(award)},c);values.set(award,row);
    for(let left=1;left<=5;left++)row[left]=rates.reset*(10+get(5,award+10))+(1-rates.reset-rates.hit)*row[left-1]+rates.hit*a.sevenValues.reduce((n,v,i)=>n+r.weights[i]*(v+get(left-1,award+v)),0);
   }
   // Only paths that would finish without a seven receive one extra seven award.
   const noSeven=new Map(),miss=1-tail.reset-tail.hit;
   const tailP5=miss**5/(1-tail.reset*Array.from({length:5},(_,i)=>miss**i).reduce((x,y)=>x+y,0));
   for(let award=limit-10;award>=0;award-=10){
    const rates=a.sevenAimRules({...s,award:String(award)},c),row=[1];
    const resetP=award+10>=limit?tailP5:noSeven.get(award+10)[5];
    for(let left=1;left<=5;left++)row[left]=rates.reset*resetP+(1-rates.reset-rates.hit)*row[left-1];
    noSeven.set(award,row);
   }
   return values.get(0)[5]+noSeven.get(0)[5]*mean;
  }
  const V=new Map(),K=new Map(),values=r.family==='seven'?a.sevenValues:[50*r.awardMultiplier,100*r.awardMultiplier],weights=r.family==='seven'?r.weights:[1-r.hundred,r.hundred],mean=values.reduce((v,n,i)=>v+n*weights[i],0),hit=Math.min(r.hit,1-(r.reset||0));
  const tailFreeze=s.zone==='ouma'?a.oumaFreezeRate({...s,award:String(limit)},c):0,freeMean=tailFreeze*mean/(1-tailFreeze);
  function tail(left){if(r.family==='nova')return left*hit*factor*(mean+freeMean);const reset=r.reset*factor,reward=reset*10+Math.min(r.hit,1-reset)*factor*mean,full=reset?((1-reset)**-5-1)/reset*reward:5*reward;return reset?(1-(1-reset)**left)/reset*(reward+reset*full):left*reward;}
  const get=(map,left,award)=>award>=limit?tail(left)+(map===K?freeMean:0):map.get(award)[left];
  const grid=r.family==='seven'?10:50;for(let award=limit-grid;award>=0;award-=grid){
   const v=Array(6).fill(0);V.set(award,v);
   if(r.family==='seven'){
    const win=weights.map((w,i)=>hit*w*a.zoneAwardFactor(award,values[i])),miss=1-r.reset-win.reduce((x,y)=>x+y,0);
    for(let left=1;left<=5;left++)v[left]=r.reset*(10+get(V,5,award+10))+miss*v[left-1]+win.reduce((sum,p,i)=>sum+p*(values[i]+get(V,left-1,award+values[i])),0);
   }else{
    const k=Array(6).fill(0);K.set(award,k);const freeze=a.oumaFreezeRate({...s,award:String(award)},c)*(s.zone==='urapi'?0:1),win=weights.map((w,i)=>hit*w*a.zoneAwardFactor(award,values[i])),miss=1-win.reduce((x,y)=>x+y,0);
    for(let left=0;left<=5;left++){if(left)v[left]=miss*v[left-1]+win.reduce((sum,p,i)=>sum+p*(values[i]+get(K,left-1,award+values[i])),0);k[left]=(1-freeze)*v[left]+freeze*weights.reduce((sum,w,i)=>sum+w*(values[i]+get(K,left,award+values[i])),0);}
   }
  }
  return V.get(0)[5];
 }
 const giruMean=(setting,ura=false)=>zoneMean(ura?'ura_giru':'giru',{setting});
 // Entry scales fitted with the normal-mode / ceiling / impurity / freeze simulation.
 function profile(setting){const i=Math.max(0,Math.min(5,Math.round(Number(setting)||1)-1)),scale=.21*(1+.12*NovaArt.settingBias[i]);return {setting:i+1,target:targets[i],scale,directDenom:NovaArt.defaults['direct'+(i+1)]/scale,czDenom:120/scale,strongDenom:600/scale,verifiedModel:'net-soft-session-dependent'};}
 const profiles=targets.map((_,i)=>profile(i+1));
 return {targets,normal,profiles,profile,giruMean,zoneMean};
})();
