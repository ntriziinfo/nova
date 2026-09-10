/* Normal AT only, net 4pt/G: current zone rules and estimates are in docs/zone-v2.md. */
globalThis.NovaBalance=(()=>{
 // v120 measured estimates after weighted-challenge/BIG50 validation.
 // +10,000pt stop or 30,000G cutoff; 3,000 independent holdout trials/setting.
 const targets=[0.954131,0.965379,0.984325,1.022710,1.071583,1.139083];
 const normal=[[354.112628,570.311235,6.592194,128,7.464630],[335.340933,496.870459,6.554256,192,7.482946],[318.675842,391.096799,6.455407,124,7.452119],[295.728558,359.759320,6.248231,184,7.301746],[288.226978,283.780845,6.120643,120,7.250883],[276.519476,276.524590,5.897360,176,7.245667]];
 // Exact reward recursion: 50pt grid below the threshold, translation-invariant tail above it.
 function zoneMean(id,options={}){
  const a=NovaArt,c=a.config(options),s=a.startZone(a.enter(),id,{...c,setting:options.setting},()=>.5),r=a.zoneRules(s,c),limit=a.zoneTailControl.threshold;
  if(r.family==='ladder'){
   const weights=a.ladderWeightsFor(s),tables=a.ladderTableFor(s);
   const tableMean=l=>{let reach=1,value=l[0];for(let i=1;i<l.length;i++){reach*=a.ladderGuaranteed({...s,ladder:l,award:String(l[i-1])})?1:r.success;value+=(l[i]-l[i-1])*reach;}return value;};
   if(options.rouletteTable===6&&s.zone==='giru'||options.rouletteTable===7&&s.zone==='sosuke')return tableMean(tables[options.rouletteTable-1]);
   return tables.reduce((n,l,i)=>n+tableMean(l)*weights[i]/100,0);
  }
  if(r.family==='seven'){
   const H=s.zone==='sora'&&!s.ura?2:1,mean=a.sevenValues.reduce((n,v,i)=>n+v*r.weights[i],0),rates=a.sevenAimRules({...s,award:String(limit)},c),tail=[];
   for(let h=H;h>=0;h--){
    const A=[0],B=[0];
    for(let left=1;left<=5;left++){
     const guarantee=h+left-1<H,hit=guarantee?1-rates.reset:rates.hit,miss=1-rates.reset-hit;
     const next=Math.min(H,h+1),same=next===h;
     A[left]=rates.reset*10+hit*(mean+(same?A[left-1]:tail[next][left-1]))+miss*A[left-1];
     B[left]=rates.reset+(miss+(same?hit:0))*B[left-1];
    }
    const full=A[5]/(1-B[5]);tail[h]=A.map((v,i)=>v+B[i]*full);
   }
   const rows=new Map(),get=(award,h,left)=>award>=limit?tail[h][left]:rows.get(award)[h][left];
   for(let award=limit-10;award>=0;award-=10){
    const row=Array.from({length:H+1},()=>Array(6).fill(0)),rate=a.sevenAimRules({...s,award:String(award)},c);rows.set(award,row);
    for(let h=H;h>=0;h--)for(let left=1;left<=5;left++){
     const floor=s.zone==='sora'&&s.ura&&left===1&&award<500,guarantee=floor||h+left-1<H;
     const hit=guarantee?1-rate.reset:rate.hit,miss=1-rate.reset-hit;
     const win=floor?(()=>{const n=a.sevenValues.find(v=>v>=500-award)||500;return n+get(award+n,Math.min(H,h+1),left-1);})():a.sevenValues.reduce((n,v,i)=>n+r.weights[i]*(v+get(award+v,Math.min(H,h+1),left-1)),0);
     row[h][left]=rate.reset*(10+get(award+10,h,5))+hit*win+miss*row[h][left-1];
    }
   }
   return rows.get(0)[0][5];
  }
  const values=[50*r.awardMultiplier,100*r.awardMultiplier],weights=[1-r.hundred,r.hundred],mean=values.reduce((n,v,i)=>n+v*weights[i],0),freeze=a.oumaFreezeRate({...s,award:String(limit)},c),freeMean=mean*freeze/(1-freeze),V=new Map(),K=new Map();
  const get=(map,award,left)=>award>=limit?left*r.hit*a.zoneTailControl.factor*(mean+freeMean)+(map===K?freeMean:0):map.get(award)[left];
  const minimum=s.zone==='urapi'?50:s.ura?500:100;
  for(let award=limit-50;award>=0;award-=50){
   const v=Array(6).fill(0),k=Array(6).fill(0);V.set(award,v);K.set(award,k);
   const f=a.oumaFreezeRate({...s,award:String(award)},c);
   for(let left=0;left<=5;left++){
    if(left){
     const guarantee=left===1&&award<minimum,ns=values.map(n=>guarantee?Math.max(n,minimum-award):n),ps=ns.map((n,i)=>weights[i]*(guarantee?1:r.hit*a.zoneAwardFactor(award,n)));
     v[left]=(1-ps.reduce((a,b)=>a+b,0))*v[left-1]+ps.reduce((sum,p,i)=>sum+p*(ns[i]+get(K,award+ns[i],left-1)),0);
     if(guarantee&&s.zone==='ouma'&&!s.ura)v[left]=weights.reduce((n,w,i)=>n+w*(ns[i]+r.hit*get(K,award+ns[i],0)),0);
    }
    k[left]=(1-f)*v[left]+f*values.reduce((n,v,i)=>n+weights[i]*(v+get(K,award+v,left)),0);
   }
  }
  return V.get(0)[5];
 }
 const giruMean=(setting,ura=false)=>zoneMean(ura?'ura_giru':'giru',{setting});
 // Entry scales fitted with the normal-mode / ceiling / impurity / freeze simulation.
 function profile(setting){const i=Math.max(0,Math.min(5,Math.round(Number(setting)||1)-1)),scale=.21*(1+.12*NovaArt.settingBias[i]);return {setting:i+1,target:targets[i],scale,directDenom:NovaArt.defaults['direct'+(i+1)]/scale,czDenom:120/scale,strongDenom:600/scale,verifiedModel:'balance120-30000g-complete-stop',previousVerifiedModel:'balance118-30000g-complete-stop'};}
 const profiles=targets.map((_,i)=>profile(i+1));
 return {targets,normal,profiles,profile,giruMean,zoneMean};
})();
