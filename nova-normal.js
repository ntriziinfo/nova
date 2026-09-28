/* Internal normal-play rules. No supplied image or audio is processed. */
globalThis.NovaNormal=(()=>{
 const lotteryRules=Object.freeze({version:140,ceilingGames:800,czScale:Object.freeze([.502,.510,.522,.498,.552,.616])});
 // A/B/heaven and game-count zones are retired; a single common ceiling remains.
 const modes=['通常'],ceilings=[lotteryRules.ceilingGames],transitions=[[100]],gameZoneRates={通常:{}},atEndModeWeights={dry:[100],normal:[100]};
 const gameZoneConfig={fakeRate:0,preludeMin:3,preludeMax:8,ceilingBonusRate:.5};
 const czPreludeRules=Object.freeze({minGames:3,maxGames:10});
 function zonePoint(){return false;}
 function zoneRate(){return 0;}
 function preludePresentation(){return 'none';}
 function prelude(kind,rng,g){return {kind,originG:g,presentation:'main',left:gameZoneConfig.preludeMin+Math.floor(rng()*(gameZoneConfig.preludeMax-gameZoneConfig.preludeMin+1))};}
 function preludeLabel(p){return p?.presentation==='reel'?'CZ前兆':p?.presentation==='pre'?'ざわつき':p?.presentation==='main'?'NOVA前兆':'前兆中';}
 function czPrelude(entry,czOptions,rng,g,source='rare'){
  const span=czPreludeRules.maxGames-czPreludeRules.minGames;
  const total=czPreludeRules.minGames+Math.min(span,Math.floor(rng()*(span+1)));
  return {kind:source==='ceiling'?'ceilingCz':'cz',originG:g,presentation:'reel',total,left:total,entry,source,
   ...(entry==='STRONG_CZ'?{strongChance:czOptions.strongChance}:{})};
 }
 function normalizePrelude(p){
  if(!p||!['cz','ceilingBonus','ceilingCz'].includes(p.kind))return null;
  const base={kind:p.kind,originG:Math.max(0,Math.floor(Number(p.originG)||0)),presentation:['pre','main'].includes(p.presentation)?p.presentation:'legacy',left:Math.max(0,Math.min(8,Math.floor(Number(p.left)||0)))};
  if(p.presentation!=='reel'||p.kind==='ceilingBonus')return base;
  const total=Math.max(3,Math.min(10,Math.floor(Number(p.total)||3)));
  return {...base,presentation:'reel',total,left:Math.max(0,Math.min(total,Math.floor(Number(p.left)||0))),entry:p.entry==='STRONG_CZ'||p.kind==='ceilingCz'?'STRONG_CZ':'CZ',source:p.kind==='ceilingCz'?'ceiling':'rare',
   ...(Number.isFinite(p.strongChance)?{strongChance:Math.max(0,Math.min(1,p.strongChance))}:{})};
 }
 function czPreludeStage(p){return p?.presentation==='reel'?Math.min(3,Math.floor((p.total-p.left)*3/p.total)):0;}
 function normalLabel(value){const s=normalize(value);return s.prelude?preludeLabel(s.prelude):'通常';}
 // Every rare role draws CZ. SUICA/chance eyes also draw high-state promotion.
 const rare={WEAK_SUICA:{p:0.011,up:.05,cz:.06,gain:1,pay:6},STRONG_SUICA:{p:0.0026,up:.5,cz:.6,gain:3,pay:6},CHANCE_A:{p:1/312.5,up:9/28,cz:3/14,gain:1,pay:0},CHANCE_B:{p:1/125,up:9/28,cz:3/14,gain:1,pay:0},WEAK_NOVA:{p:1/128,up:.35,cz:.3,gain:2,pay:0},STRONG_NOVA:{p:1/2500,up:.75,cz:1,gain:4,pay:0}};
 const defaults={highMultiplier:2,bandMultiplier:2,downMiss:.08,downReplay:.05,czFailureGain:1,bonusFailureGain:2,atDryGain:2,ceilingGain:10,regChainGain:2,superDenom:32768};
 function config(v={}){const c={...defaults};for(const k in c)if(Number.isFinite(Number(v[k])))c[k]=Math.max(0,Math.min(k==='superDenom'?1e9:100,Number(v[k])));c.superDenom=Math.max(2,c.superDenom);return c;}
 const resetImpurityPoints=Object.freeze([0,25,50,75,90,100]);
 const resetImpurityWeights=Object.freeze([[20,25,35,15,4,1],[19,25,35,16,4,1],[18,25,35,16,5,1],[17,25,35,17,5,1],[16,24,35,18,5,2],[15,24,35,18,6,2]].map(Object.freeze));
 function resetDistribution(setting=1){const row=resetImpurityWeights[Math.max(0,Math.min(5,Math.round(Number(setting)||1)-1))];return resetImpurityPoints.map((pt,i)=>({pt,weight:row[i]}));}
 function reset(rng=Math.random,setting=1){const row=resetDistribution(setting);return normalize({impurity:row[weighted(row.map(x=>x.weight),rng)].pt});}
 // Preserve an already-won legacy prelude, counters and impurity, but discard fake hints.
 function normalize(v){return {normalVersion:152,prelude:normalizePrelude(v?.prelude),ceilingHandled:!!v?.ceilingHandled,regStreak:0,morningCeiling:false,mode:'通常',games:Math.max(0,Math.floor(Number(v?.games)||0)),level:v?.level==='high'?'high':'low',highLeft:v?.level==='high'?Math.max(0,Math.floor(Number(v?.highLeft)||0)):0,impurity:Math.min(100,Math.max(0,Number(v?.impurity)||0))};}
 function modeWeights(){return [100];}
 function weighted(weights,rng){let n=rng()*weights.reduce((a,b)=>a+b,0);return Math.max(0,weights.findIndex(w=>(n-=w)<0));}
 function ceiling(){return lotteryRules.ceilingGames;}
 function favored(){return false;}
 function multiplier(){return 1;}
 function pay(role){return rare[role]?.pay??(role==='BELL'?15:role==='REPLAY'?0:0);}
 function rareFactor(setting=3){return 1+.016*(Math.max(1,Math.min(6,Math.round(Number(setting)||3)))-3);}
 function roleProbabilities(setting=3){const frequent=1+.004*(Math.max(1,Math.min(6,Math.round(Number(setting)||3)))-3),r=Object.fromEntries(Object.entries(rare).map(([k,v])=>[k,v.p*rareFactor(setting)]));
  // Common-AT profile: normal/CZ base is 33.5 games per 50pt; replay grants a free next BET.
  const chanceTotal=r.CHANCE_A+r.CHANCE_B;r.CHANCE_A=chanceTotal*(Math.max(1,Math.min(6,Math.round(Number(setting)||3)))%2?.4:.6);r.CHANCE_B=chanceTotal-r.CHANCE_A;
  const rarePay=Object.entries(r).reduce((sum,[role,p])=>sum+p*pay(role),0);
  r.REPLAY=frequent*0.45;r.BELL=(3*(1-r.REPLAY)-rarePay-50/33.5)/15;r.MISS=1-Object.values(r).reduce((a,b)=>a+b,0);return r;}
 const roleEntries=[1,2,3,4,5,6].map(s=>Object.entries(roleProbabilities(s)));
 function drawRole(setting,rng=Math.random){let r=rng();for(const [role,p]of roleEntries[Math.max(0,Math.min(5,Math.round(Number(setting)||3)-1))]){r-=p;if(r<0)return role;}return 'MISS';}
 const stateRoles=['WEAK_SUICA','STRONG_SUICA','CHANCE_A','CHANCE_B'];
 function roleCzRate(value,role,setting=1,options={}){
  if(role==='STRONG_NOVA')return 1;
  const i=Math.max(0,Math.min(5,Math.round(Number(setting)||1)-1));
  return Math.min(1,(rare[role]?.cz||0)*lotteryRules.czScale[i]*(value?.level==='high'?config(options).highMultiplier:1));
 }

 function advance(value,role,flow,options={},rng=Math.random){
  const s=normalize(value),c=config(options),held=s.level==='high'&&s.highLeft>0;
  s.games++;if(held)s.highLeft--;
  if(rare[role]){

   if(stateRoles.includes(role)){
    if(s.level==='low'){
     const rate=Math.min(1,rare[role].up);
     if(rng()<rate){s.level='high';s.highLeft=10;}
    }
   }
  }else if(!held&&(role==='MISS'||role==='REPLAY')){
   if(rng()<(role==='MISS'?c.downMiss:c.downReplay)){s.level='low';s.highLeft=0;}
  }

  if(['cz','strong_cz'].includes(flow?.phase)&&flow.remaining===1&&!flow.success)s.impurity=Math.min(100,s.impurity+c.czFailureGain);
  return s;
 }
 function spin(value,flow,setting=1,options={},rng=Math.random,forced=''){
  if(forced==='STRONG_BELL')forced='BELL';
  options={...options,cz:NovaFlow.forSetting(options.cz,setting)};
  const before=normalize(value),c=config(options.normal),result=forced||drawRole(setting,rng);
  flow=NovaFlow.rewrite(flow,result,options.cz,rng);
  const state=advance(before,result,flow,c,rng),token={result,state,czFlow:flow,internalBonus:null,entry:'',direct:false,czOptions:options.cz};
  if(['cz','strong_cz'].includes(flow.phase)&&before.prelude?.presentation==='reel'&&before.prelude.left===0){
   state.prelude=null;token.czPrelude={before:3,after:0,announce:true};
  }
  const bonus=source=>({kind:'BIG',source,internalResult:'BIG'});
  if(forced==='FREEZE'){state.prelude=null;token.result='MISS';token.internalBonus={...bonus('フリーズ'),premiumBonus:true};return token;}
  if(!before.ceilingHandled&&!before.prelude&&before.games+1>=ceiling(before)){
   state.ceilingHandled=true;state.impurity=Math.min(100,state.impurity+c.ceilingGain);
   state.prelude=rng()<gameZoneConfig.ceilingBonusRate?prelude('ceilingBonus',rng,ceiling(before)):czPrelude('STRONG_CZ',{strongChance:1},rng,ceiling(before),'ceiling');if(flow.phase==='normal')token.message=preludeLabel(state.prelude)+'開始';
  }
  if(flow.phase==='normal'){
   if(before.prelude?.presentation==='reel'){
    const p=state.prelude;
    // Keep the won CZ and its countdown. Strong NOVA can promote it without
    // restarting the prelude; a premium bonus retains its existing priority.
    if(p.source!=='ceiling'&&(result==='SUPER_NOVA'||(!forced&&rng()<1/c.superDenom))){token.result='SUPER_NOVA';state.prelude=null;return token;}
    if(result==='STRONG_NOVA'){p.entry='STRONG_CZ';p.strongChance=Math.max(p.strongChance||0,before.level==='high'?1:.85);}
    if(before.prelude.left===0){
     token.entry=p.entry;token.entrySource=p.source;
     if(Number.isFinite(p.strongChance))token.czOptions={...options.cz,strongChance:p.strongChance};
     token.czPrelude={before:3,after:0,announce:true};state.prelude=null;
     token.message=token.entry==='STRONG_CZ'?'強CZ突入':'CZ突入';return token;
    }
    p.left--;
    token.czPrelude={before:czPreludeStage(before.prelude),after:czPreludeStage(p),left:p.left,total:p.total};
    if(p.left===0){
     token.entry=p.entry;token.entrySource=p.source;token.czPrelude.enter=true;
     if(Number.isFinite(p.strongChance))token.czOptions={...options.cz,strongChance:p.strongChance};
    }
    return token;
   }
   if(before.prelude&&state.prelude&&before.prelude.kind===state.prelude.kind&&before.prelude.originG===state.prelude.originG){
    state.prelude.left=Math.max(0,state.prelude.left-1);
    if(!state.prelude.left){const kind=state.prelude.kind;state.prelude=null;
     if(kind==='ceilingBonus'){token.internalBonus=bonus('共通天井'+(before.prelude.originG||ceiling(before))+'G＋前兆');return token;}
     if(kind==='ceilingCz'){token.entry='STRONG_CZ';token.entrySource='ceiling';token.czOptions={...options.cz,strongChance:1};token.message='天井CZ突入';return token;}
     if(kind==='cz'){token.entry='CZ';token.entrySource='game';return token;}
     token.message=preludeLabel(before.prelude)+'終了';
    }
   }
   if(state.prelude?.kind.startsWith('ceiling')){if(state.prelude.presentation==='reel')token.czPrelude={before:0,after:0,started:true,left:state.prelude.left,total:state.prelude.total};return token;}
   if(!forced&&rng()<1/c.superDenom){token.result='SUPER_NOVA';state.prelude=null;return token;}
   if(result==='STRONG_NOVA'){
    token.czOptions={...options.cz,strongChance:before.level==='high'?1:.85};
    state.prelude=czPrelude('STRONG_CZ',token.czOptions,rng,state.games);
    token.czPrelude={before:0,after:0,started:true,left:state.prelude.left,total:state.prelude.total};token.message='CZ前兆開始';return token;
   }
   if(rare[result]&&rng()<roleCzRate(before,result,setting,c)){
    state.prelude=czPrelude('CZ',options.cz,rng,state.games);
    token.czPrelude={before:0,after:0,started:true,left:state.prelude.left,total:state.prelude.total};token.message='CZ前兆開始';return token;
   }
  }else if(['cz','strong_cz'].includes(flow.phase)){
   flow.lampRoll??=rng();flow.rainbowRoll??=rng();
   token.czLamp={...NovaFlow.drawLamp(flow,rng),totalGames:flow.totalGames,remaining:flow.remaining};
   const display=NovaFlow.lampAtStop(token.czLamp,3);
   const allLit=flow.success&&(display.stage===6||display.rainbow);
   if(flow.remaining===1&&flow.success||allLit){
    token.internalBonus=bonus(allLit?'CZ全員点灯':flow.phase==='cz'?'CZ成功':'強CZ成功');
   }
  }
  return token;
 }
 function claim(value,freeze=false,rng=Math.random){const state=normalize(value),zones=[];if(state.impurity>=100){state.impurity=0;zones.push(['urapi','giru','sora','ouma'][Math.min(3,Math.floor(rng()*4))]);}if(freeze)zones.push(['giru','sora','ouma'][Math.min(2,Math.floor(rng()*3))]);return {state,zones:zones.map(z=>NovaArt.upgradeGuaranteedZone(z,rng)),sets:zones.length?1:0};}
 function afterArt(value,before,after,options={},rng=Math.random){const s=normalize(value);if(before?.phase==='art'&&after?.phase==='normal'){s.games=0;s.prelude=null;s.ceilingHandled=false;s.level='low';s.highLeft=0;if(after.dryAtEnd===true)s.impurity=Math.min(100,s.impurity+config(options).atDryGain);}return s;}
 function bonusEnd(value,kind,after,options={}){const s=normalize(value),c=config(options);s.regStreak=0;s.impurity=Math.min(100,s.impurity+(after?.phase!=='art'?c.bonusFailureGain:0));return s;}
 function afterBonus(value,rng=Math.random,setting){const s=normalize(value);return {...s,prelude:null,ceilingHandled:false,morningCeiling:false,games:0,level:'low',highLeft:0};}
 function drawRare(rng=Math.random){const keys=Object.keys(rare);return keys[weighted(keys.map(k=>rare[k].p),rng)];}
 const rareMean=Object.values(rare).reduce((s,r)=>s+r.p*r.pay,0)/Object.values(rare).reduce((s,r)=>s+r.p,0);
 return {lotteryRules,czPreludeRules,czPreludeStage,roleCzRate,modeWeights,gameZoneRates,gameZoneConfig,atEndModeWeights,zonePoint,preludePresentation,zoneRate,normalLabel,resetImpurityPoints,resetImpurityWeights,resetDistribution,reset,modes,ceilings,transitions,rare,rareMean,rareFactor,roleProbabilities,drawRare,defaults,config,normalize,ceiling,favored,multiplier,pay,drawRole,advance,spin,claim,afterArt,bonusEnd,afterBonus};
})();
