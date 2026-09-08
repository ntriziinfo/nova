/* Internal normal-play rules. No supplied image or audio is processed. */
globalThis.NovaNormal=(()=>{
 const modes=['通常A','通常B','通常C','天国準備','天国A','天国B'];
 const ceilings=[600,600,300,600,100,100];
 const transitions=[[70,15,5,8,1,1],[15,65,7,10,2,1],[30,25,25,10,7,3],[0,0,0,0,80,20],[12,8,3,2,65,10],[8,5,3,2,12,70]];
 // Normal/CZ: SUICA and chance eyes promote state; NOVA draws CZ directly.
 const rare={WEAK_SUICA:{p:0.011,up:.05,cz:.06,gain:1,pay:6},STRONG_SUICA:{p:0.0026,up:.5,cz:.6,gain:3,pay:6},CHANCE_A:{p:1/312.5,up:9/28,cz:3/14,gain:1,pay:0},CHANCE_B:{p:1/125,up:9/28,cz:3/14,gain:1,pay:0},WEAK_NOVA:{p:1/128,up:.35,cz:.3,gain:2,pay:0},STRONG_NOVA:{p:1/2500,up:.75,cz:1,gain:4,pay:0}};
 const defaults={highMultiplier:2,bandMultiplier:2,downMiss:.08,downReplay:.05,czFailureGain:10,hundredGain:5,superDenom:32768};
 function config(v={}){const c={...defaults};for(const k in c)if(Number.isFinite(Number(v[k])))c[k]=Math.max(0,Math.min(k==='superDenom'?1e9:100,Number(v[k])));c.superDenom=Math.max(2,c.superDenom);return c;}
 const resetImpurityPoints=Object.freeze([0,25,50,75,90,100]);
 const resetImpurityWeights=Object.freeze([[20,25,35,15,4,1],[19,25,35,16,4,1],[18,25,35,16,5,1],[17,25,35,17,5,1],[16,24,35,18,5,2],[15,24,35,18,6,2]].map(Object.freeze));
 function resetDistribution(setting=1){const row=resetImpurityWeights[Math.max(0,Math.min(5,Math.round(Number(setting)||1)-1))];return resetImpurityPoints.map((pt,i)=>({pt,weight:row[i]}));}
 function reset(rng=Math.random,setting=1){const row=resetDistribution(setting);return normalize({impurity:row[weighted(row.map(x=>x.weight),rng)].pt});}
 function normalize(v){return {mode:modes.includes(v?.mode)?v.mode:modes[0],games:Math.max(0,Math.floor(Number(v?.games)||0)),level:v?.level==='high'?'high':'low',highLeft:v?.level==='high'?Math.max(0,Math.floor(Number(v?.highLeft)||0)):0,impurity:Math.min(100,Math.max(0,Number(v?.impurity)||0))};}
 function weighted(weights,rng){let n=rng()*weights.reduce((a,b)=>a+b,0);return Math.max(0,weights.findIndex(w=>(n-=w)<0));}
 function ceiling(v){return ceilings[modes.indexOf(normalize(v).mode)];}
 function favored(v){const s=normalize(v),digit=Math.floor((s.games+1)/100)%10;return s.mode==='通常A'&&digit%2===0||s.mode==='通常B'&&digit%2===1;}
 function multiplier(v,c){c=config(c);return (normalize(v).level==='high'?c.highMultiplier:1)*(favored(v)?c.bandMultiplier:1);}
 function pay(role){return rare[role]?.pay??(role==='BELL'?15:role==='REPLAY'?0:0);}
 function rareFactor(setting=3){return 1+.016*(Math.max(1,Math.min(6,Math.round(Number(setting)||3)))-3);}
 function roleProbabilities(setting=3){const frequent=1+.004*(Math.max(1,Math.min(6,Math.round(Number(setting)||3)))-3),r=Object.fromEntries(Object.entries(rare).map(([k,v])=>[k,v.p*rareFactor(setting)]));
  // Replace lost rare-role payout with ordinary bells, retaining the existing normal-play base.
  const chanceTotal=r.CHANCE_A+r.CHANCE_B;r.CHANCE_A=chanceTotal*(Math.max(1,Math.min(6,Math.round(Number(setting)||3)))%2?.4:.6);r.CHANCE_B=chanceTotal-r.CHANCE_A;
  const rarePay=Object.entries(r).reduce((sum,[role,p])=>sum+p*pay(role),0);
  r.BELL=(.120877629551039*8*frequent+.092*rareFactor(setting)-rarePay)/15;r.REPLAY=frequent/7.452119;r.MISS=1-Object.values(r).reduce((a,b)=>a+b,0);return r;}
 const roleEntries=[1,2,3,4,5,6].map(s=>Object.entries(roleProbabilities(s)));
 function drawRole(setting,rng=Math.random){let r=rng();for(const [role,p]of roleEntries[Math.max(0,Math.min(5,Math.round(Number(setting)||3)-1))]){r-=p;if(r<0)return role;}return 'MISS';}
 const stateRoles=['WEAK_SUICA','STRONG_SUICA','CHANCE_A','CHANCE_B'];

 function advance(value,role,flow,options={},rng=Math.random){
  const s=normalize(value),c=config(options),held=s.level==='high'&&s.highLeft>0;
  s.games++;if(held)s.highLeft--;
  if(rare[role]){
   s.impurity=Math.min(100,s.impurity+rare[role].gain+(['CHANCE_A','CHANCE_B'].includes(role)&&rng()<2/7?1:0));
   if(stateRoles.includes(role)){
    if(s.level==='low'){
     const rate=Math.min(1,rare[role].up*(favored(value)?2:1));
     if(rng()<rate){s.level='high';s.highLeft=10;}
    }
   }
  }else if(!held&&(role==='MISS'||role==='REPLAY')){
   if(rng()<(role==='MISS'?c.downMiss:c.downReplay)){s.level='low';s.highLeft=0;}
  }
  if(s.games%100===0)s.impurity=Math.min(100,s.impurity+c.hundredGain);
  if(['cz','strong_cz'].includes(flow?.phase)&&flow.remaining===1&&!flow.success)s.impurity=Math.min(100,s.impurity+c.czFailureGain);
  return s;
 }
 function spin(value,flow,setting=1,options={},rng=Math.random,forced=''){
  if(forced==='STRONG_BELL')forced='BELL';
  const before=normalize(value),c=config(options.normal),result=forced||drawRole(setting,rng);
  flow=NovaFlow.rewrite(flow,result,options.cz,rng);
  const state=advance(before,result,flow,c,rng),token={result,state,czFlow:flow,internalBonus:null,entry:'',direct:false};
  const bonus=source=>({kind:'BIG',source,internalResult:'BIG'});
  if(forced==='FREEZE'){token.result='MISS';token.internalBonus={...bonus('フリーズ'),premiumBonus:true};return token;}
  if(before.games+1>=ceiling(before)){token.internalBonus=bonus(before.mode+' 天井'+ceiling(before)+'G');return token;}
  if(flow.phase==='normal'){
   if(!forced&&rng()<1/c.superDenom){token.result='SUPER_NOVA';return token;}
   if(result==='STRONG_NOVA'){
    token.entry='STRONG_CZ';token.entrySource='rare';token.czOptions={...options.cz,strongChance:before.level==='high'?1:.85};return token;
   }
   if(result==='WEAK_NOVA'&&rng()<(before.level==='high'?.75:.25)){
    token.entry='CZ';token.entrySource='rare';return token;
   }
  }else if(['cz','strong_cz'].includes(flow.phase)){
   flow.lampRoll??=rng();flow.rainbowRoll??=rng();
   token.czLamp={...NovaFlow.drawLamp(flow,rng),totalGames:flow.totalGames,remaining:flow.remaining};
   const display=NovaFlow.lampAtStop(token.czLamp,3);
   const allLit=flow.success&&(display.stage===6||display.rainbow);
   if(flow.remaining===1&&flow.success||allLit){
    {const row=NovaBalance.normal[2];token.internalBonus={kind:rng()<row[1]/(row[0]+row[1])?'BIG':'MID',source:allLit?'CZ全員点灯':flow.phase==='cz'?'CZ成功':'強CZ成功'};}
   }
  }
  return token;
 }
 function claim(value,freeze=false,rng=Math.random){const state=normalize(value),zones=[];if(state.impurity>=100){state.impurity=0;zones.push(['urapi','giru','sora','ouma'][Math.min(3,Math.floor(rng()*4))]);}if(freeze)zones.push(['giru','sora','ouma'][Math.min(2,Math.floor(rng()*3))]);return {state,zones:zones.map(z=>NovaArt.upgradeGuaranteedZone(z,rng)),sets:zones.length?1:0};}
 function afterArt(value,before,after){const s=normalize(value);if(before?.phase==='art'&&after?.phase==='normal')s.games=0;return s;}
 function afterBonus(value,rng=Math.random){const s=normalize(value);return {...s,mode:modes[weighted(transitions[modes.indexOf(s.mode)],rng)],games:0,level:'low',highLeft:0};}
 function drawRare(rng=Math.random){const keys=Object.keys(rare);return keys[weighted(keys.map(k=>rare[k].p),rng)];}
 const rareMean=Object.values(rare).reduce((s,r)=>s+r.p*r.pay,0)/Object.values(rare).reduce((s,r)=>s+r.p,0);
 return {resetImpurityPoints,resetImpurityWeights,resetDistribution,reset,modes,ceilings,transitions,rare,rareMean,rareFactor,roleProbabilities,drawRare,defaults,config,normalize,ceiling,favored,multiplier,pay,drawRole,advance,spin,claim,afterArt,afterBonus};
})();
