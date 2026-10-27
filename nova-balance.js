/* Current parity-v174 RTP evidence: docs/parity-v174-rtp-20261027-100m.json. */
globalThis.NovaBalance=(()=>{
 // Approved uncapped RTP targets; actual trial estimates are shown separately.
 const targets=[.94,.96,.98,1.03,1.10,1.15];
 const winTargets=[0.15,0.2,0.4,0.55,0.65,0.8],completeTargets=[null,null,null,null,null,null];
 // Current 100M-G continuous estimates after applying the parity-v174
 // odd-rough/even-steady profiles. These are measured values, not targets.
 const measuredRtp=[0.94033741,0.9519764333333333,0.9813247433333333,1.0305694666666667,1.0974555166666667,1.1502366733333333];
 const measuredRtpCi95=[[0.93757055,0.94310427],[0.94929709,0.95465577],[0.977585,0.98506449],[1.0282951,1.03284383],[1.09478145,1.10012959],[1.14710161,1.15337173]];
 const trialCounts=[1,1,1,1,1,1];
 const normal=[[354.112628,570.311235,6.592194,128,7.464630],[335.340933,496.870459,6.554256,192,7.482946],[318.675842,391.096799,6.455407,124,7.452119],[295.728558,359.759320,6.248231,184,7.301746],[288.226978,283.780845,6.120643,120,7.250883],[276.519476,276.524590,5.897360,176,7.245667]];
 // Exact reward recursion: 50pt grid below the threshold, translation-invariant tail above it.
 function zoneMean(id,options={}){
  if(id==='fixed50_sosuke')return 50;
  if(NovaArt.initialZoneIds.includes(id)){
   const a=NovaArt,{values,weights:fallback,games}=a.entryQuotaRules;
   // Queued duo entry draws with config(options), which contains no setting.
   // Match that live common quota; setting still determines the rare-role mix below.
   const weights=fallback;
   const version=options.initialRuleVersion===undefined?a.freshInitialRules.version:options.initialRuleVersion;
   const currentOrLegacy=typeof a.isFreshInitialRuleVersion==='function'
    ?a.isFreshInitialRuleVersion(version)
    :version===a.freshInitialRules.version||version===a.freshInitialRules.legacyVersion;
   const fresh=options.initialBoostActive&&currentOrLegacy;
   const setting=Math.max(1,Math.min(6,Math.round(Number(options.setting)||1)));
   const fallbackFreshBase=Array.isArray(a.freshInitialRules.bases)?a.freshInitialRules.bases[setting-1]:a.freshInitialRules.point;
   const base=fresh?fallbackFreshBase:values.reduce((sum,pt,i)=>sum+pt*weights[i],0)/weights.reduce((sum,w)=>sum+w,0)/games;
   const awards=fresh?a.freshInitialRules.rareAwards:a.initialRareAwards;
   const award=role=>fresh&&typeof a.freshInitialAward==='function'?a.freshInitialAward(setting,role,version):(awards[role]??base);
   const mean=games*Object.entries(a.roleProbabilities(setting,false,5)).reduce((sum,[role,p])=>sum+p*award(role),0);
   // Ordinary duo stocks are unboosted. Fresh initial ATs explicitly opt in;
   // use a saved multiplier if supplied, otherwise average its current draw.
   if(!options.initialBoostActive)return mean;
   const boosts=a.initialBoostRules;
   const factor=[a.freshInitialRules.version,a.freshInitialRules.fixedVersion].includes(version)?1:boosts.values.includes(options.initialMultiplier)?options.initialMultiplier:boosts.values.reduce((sum,n,i)=>sum+n*boosts.weights[setting-1][i],0);
   return mean*factor;
  }
  const a=NovaArt,c=a.config(options),s=a.startZone(a.enter({},()=>.5),id,{...c,setting:options.setting},()=>.5),r=a.zoneRules(s,c),limit=a.zoneTailControl.threshold;
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
     const floor=s.zone==='sora'&&s.ura?Math.ceil((500-award)/100):0,guarantee=Math.max(floor,H-h)>left-1;
     const hit=guarantee?1-rate.reset:rate.hit,miss=1-rate.reset-hit;
     const win=a.sevenValues.reduce((n,v,i)=>n+r.weights[i]*(v+get(award+v,Math.min(H,h+1),left-1)),0);
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
 // Legacy denominator fields are informational; game lotteries use the core rules.
 function profile(setting){const i=Math.max(0,Math.min(5,Math.round(Number(setting)||1)-1)),scale=.21*(1+.12*NovaArt.settingBias[i]),trials=trialCounts[i];return {setting:i+1,target:targets[i],winTarget:winTargets[i],completeTarget:completeTargets[i],measuredRtp:measuredRtp[i],measuredRtpCi95:measuredRtpCi95[i],scale,directDenom:NovaArt.defaults['direct'+(i+1)]/scale,czDenom:120/scale,strongDenom:600/scale,verifiedModel:'parity-v174-100m-20261027',verificationLabel:'奇数荒波・偶数安定／打ち切りなし1億G連続試算（1シード）',trials,gamesPerTrial:100000000,targetGamesPerTrial:100000000,totalVerifiedGames:trials*100000000,previousVerifiedModel:'nova-fixed300-alpha-100m-20261027-v1'};}
 const profiles=targets.map((_,i)=>profile(i+1));
 // Estimates describe the approved defaults, not user-edited lottery settings.
 function usesStandardSettings(settings={}){
  for(const [key,engine] of [['novaNormal',NovaNormal],['novaFlow',NovaFlow],['novaArt',NovaArt]]){
   const actual=engine.config(settings[key]),standard=engine.config();
   if(Object.keys(standard).some(k=>actual[k]!==standard[k]))return false;
  }
  const completeBasis=String(settings.completeBasis??'none').trim().toLowerCase();
  return settings.completeEnabled!==true
   &&(completeBasis===''||completeBasis==='none')
   &&Number(settings.completeLimitPt??0)===0
   &&Number(settings.completeMyLimitPt??0)===0;
 }
 return {targets,normal,profiles,profile,giruMean,zoneMean,usesStandardSettings};
})();
