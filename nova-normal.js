/* Internal normal-play rules. No supplied image or audio is processed. */
globalThis.NovaNormal=(()=>{
 const modes=['通常A','通常B','通常C','チャンス','天国準備','天国','特殊'];
 const ceilings=[600,600,500,600,300,100,200];
 const transitions=[[55,20,10,8,5,2,0],[20,45,15,10,7,3,0],[25,20,25,15,10,5,0],[15,15,20,25,15,10,0],[0,0,0,0,0,100,0],[20,10,10,10,10,40,0],[20,20,20,20,10,10,0]];
 const gameZoneRates={通常A:{200:.55,400:.55},通常B:{100:.55,300:.55,500:.8},通常C:{100:.55,200:.55,300:.55,400:.55},チャンス:{50:.15,100:.55,150:.15,200:.55,250:.15,300:.8},天国準備:{50:.15,100:.55,150:.15,200:.8},天国:{50:.55},特殊:{50:.25,100:.6,150:.25}};
 const gameZoneConfig={fakeRate:.5,preludeMin:3,preludeMax:8,ceilingBonusRate:.5};
 const atEndModeWeights={dry:[0,40,25,18,12,5,0],normal:[35,25,15,12,8,5,0]};
 function zonePoint(g){return g<=300?g>0&&g%50===0:g%100===0;}
 function zoneRate(value,setting){const s=normalize(value),g=s.games+1;if(g>=ceiling(s)||!zonePoint(g))return 0;const p=gameZoneRates[s.mode][g]??0;return p?p+(1-p)*NovaArt.initialHitBoost(setting):0;}
 // Choose only presentations consistent with the supplied mode-hint table.
 // A main prelude at 150/250G is genuine; a failed main at 50G implies heaven.
 function preludePresentation(mode,g,hit,rng){
  if(mode==='特殊')return hit||rng()<gameZoneConfig.fakeRate?'main':'none';
  const rank=modes.indexOf(mode);
  let show=hit||rng()<gameZoneConfig.fakeRate;
  if(g===200&&mode!=='天国準備'||g===400&&mode!=='通常C')show=true;
  if(!show)return 'none';
  if(g===50){if(hit)return rng()<.5?'pre':'main';return mode==='天国'?'main':rank>=3?'pre':'none';}
  if(g===100)return mode==='天国準備'&&rng()<.6?'pre':'main';
  if(g===150){if(hit)return rank>=1&&rng()<.5?'pre':'main';return rank>=1?'pre':'none';}
  if(g===200)return rng()<(rank>=1?.6:.15)?'pre':'main';
  if(g===250){if(hit)return rank>=2&&rng()<.5?'pre':'main';return rank>=2?'pre':'none';}
  if(g===300||g===500)return mode==='チャンス'&&rng()<.6?'pre':'main';
  if(g===600&&!hit)return 'none';
  return rng()<.5?'pre':'main';
 }
 function prelude(kind,rng,mode,g,presentation){return {kind,originG:g,presentation:presentation||preludePresentation(mode,g,true,rng),left:gameZoneConfig.preludeMin+Math.floor(rng()*(gameZoneConfig.preludeMax-gameZoneConfig.preludeMin+1))};}
 function preludeLabel(p){return p?.presentation==='pre'?'ざわつき':p?.presentation==='main'?'NOVA前兆':'前兆中';}
 function normalLabel(value){const s=normalize(value);return s.prelude?preludeLabel(s.prelude):'通常';}
 // Normal/CZ: SUICA and chance eyes promote state; NOVA draws CZ directly.
 const rare={WEAK_SUICA:{p:0.011,up:.05,cz:.06,gain:1,pay:6},STRONG_SUICA:{p:0.0026,up:.5,cz:.6,gain:3,pay:6},CHANCE_A:{p:1/312.5,up:9/28,cz:3/14,gain:1,pay:0},CHANCE_B:{p:1/125,up:9/28,cz:3/14,gain:1,pay:0},WEAK_NOVA:{p:1/128,up:.35,cz:.3,gain:2,pay:0},STRONG_NOVA:{p:1/2500,up:.75,cz:1,gain:4,pay:0}};
 const defaults={highMultiplier:2,bandMultiplier:2,downMiss:.08,downReplay:.05,czFailureGain:1,bonusFailureGain:2,atDryGain:2,ceilingGain:10,regChainGain:2,superDenom:32768};
 function config(v={}){const c={...defaults};for(const k in c)if(Number.isFinite(Number(v[k])))c[k]=Math.max(0,Math.min(k==='superDenom'?1e9:100,Number(v[k])));c.superDenom=Math.max(2,c.superDenom);return c;}
 const resetImpurityPoints=Object.freeze([0,25,50,75,90,100]);
 const resetImpurityWeights=Object.freeze([[20,25,35,15,4,1],[19,25,35,16,4,1],[18,25,35,16,5,1],[17,25,35,17,5,1],[16,24,35,18,5,2],[15,24,35,18,6,2]].map(Object.freeze));
 function resetDistribution(setting=1){const row=resetImpurityWeights[Math.max(0,Math.min(5,Math.round(Number(setting)||1)-1))];return resetImpurityPoints.map((pt,i)=>({pt,weight:row[i]}));}
 function reset(rng=Math.random,setting=1){const row=resetDistribution(setting);return normalize({mode:'特殊',impurity:row[weighted(row.map(x=>x.weight),rng)].pt});}
 function normalize(v){const mode=['天国A','天国B'].includes(v?.mode)?'天国':v?.mode;return {prelude:v?.prelude&&['fake','cz','ceilingBonus','ceilingCz'].includes(v.prelude.kind)?{kind:v.prelude.kind,originG:Math.max(0,Math.floor(Number(v.prelude.originG)||0)),presentation:['pre','main'].includes(v.prelude.presentation)?v.prelude.presentation:'legacy',left:Math.max(0,Math.min(8,Math.floor(Number(v.prelude.left)||0)))}:null,ceilingHandled:!!v?.ceilingHandled,regStreak:Math.max(0,Math.floor(Number(v?.regStreak)||0)),morningCeiling:v?.morningCeiling===true,mode:modes.includes(mode)?mode:modes[0],games:Math.max(0,Math.floor(Number(v?.games)||0)),level:v?.level==='high'?'high':'low',highLeft:v?.level==='high'?Math.max(0,Math.floor(Number(v?.highLeft)||0)):0,impurity:Math.min(100,Math.max(0,Number(v?.impurity)||0))};}
 function modeWeights(row,setting){const bias=.8*NovaArt.initialHitBoost(setting);return row.map((w,i)=>w*(1-bias)+(i===5?100*bias:0));}
 function weighted(weights,rng){let n=rng()*weights.reduce((a,b)=>a+b,0);return Math.max(0,weights.findIndex(w=>(n-=w)<0));}
 function ceiling(v){return ceilings[modes.indexOf(normalize(v).mode)];}
 function favored(v){return zoneRate(v)>.1;}
 function multiplier(){return 1;}
 function pay(role){return rare[role]?.pay??(role==='BELL'?15:role==='REPLAY'?0:0);}
 function rareFactor(setting=3){return 1+.016*(Math.max(1,Math.min(6,Math.round(Number(setting)||3)))-3);}
 function roleProbabilities(setting=3){const frequent=1+.004*(Math.max(1,Math.min(6,Math.round(Number(setting)||3)))-3),r=Object.fromEntries(Object.entries(rare).map(([k,v])=>[k,v.p*rareFactor(setting)]));
  // Joint RTP/reach profile: normal/CZ base is 38.5 games per 50pt; replay grants a free next BET.
  const chanceTotal=r.CHANCE_A+r.CHANCE_B;r.CHANCE_A=chanceTotal*(Math.max(1,Math.min(6,Math.round(Number(setting)||3)))%2?.4:.6);r.CHANCE_B=chanceTotal-r.CHANCE_A;
  const rarePay=Object.entries(r).reduce((sum,[role,p])=>sum+p*pay(role),0);
  r.REPLAY=frequent*0.53;r.BELL=(3*(1-r.REPLAY)-rarePay-50/38.5)/15;r.MISS=1-Object.values(r).reduce((a,b)=>a+b,0);return r;}
 const roleEntries=[1,2,3,4,5,6].map(s=>Object.entries(roleProbabilities(s)));
 function drawRole(setting,rng=Math.random){let r=rng();for(const [role,p]of roleEntries[Math.max(0,Math.min(5,Math.round(Number(setting)||3)-1))]){r-=p;if(r<0)return role;}return 'MISS';}
 const stateRoles=['WEAK_SUICA','STRONG_SUICA','CHANCE_A','CHANCE_B'];

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
  const bonus=source=>({kind:'BIG',source,internalResult:'BIG'});
  if(forced==='FREEZE'){token.result='MISS';token.internalBonus={...bonus('フリーズ'),premiumBonus:true};return token;}
  if(!before.ceilingHandled&&before.games+1>=ceiling(before)){
   state.ceilingHandled=true;state.impurity=Math.min(100,state.impurity+c.ceilingGain*(ceiling(before)>=500?1:ceiling(before)>=300?.5:.1));
   state.prelude=prelude(rng()<gameZoneConfig.ceilingBonusRate?'ceilingBonus':'ceilingCz',rng,before.mode,ceiling(before));if(flow.phase==='normal')token.message=preludeLabel(state.prelude)+'開始';
  }else if(!state.prelude&&!state.ceilingHandled&&zonePoint(state.games)&&state.games<ceiling(before)){
   const hit=rng()<zoneRate(before,setting),presentation=preludePresentation(before.mode,state.games,hit,rng);if(presentation!=='none'){state.prelude=prelude(hit?'cz':'fake',rng,before.mode,state.games,presentation);if(flow.phase==='normal')token.message=preludeLabel(state.prelude)+'開始';}
  }
  if(flow.phase==='normal'){
   if(before.prelude&&state.prelude&&before.prelude.kind===state.prelude.kind&&before.prelude.originG===state.prelude.originG){
    state.prelude.left=Math.max(0,state.prelude.left-1);
    if(!state.prelude.left){const kind=state.prelude.kind;state.prelude=null;
     if(kind==='ceilingBonus'){token.internalBonus=bonus(before.mode+' 天井'+ceiling(before)+'G＋前兆');return token;}
     if(kind==='ceilingCz'){token.entry='STRONG_CZ';token.entrySource='ceiling';token.czOptions={...options.cz,strongChance:1};token.message='天井CZ突入';return token;}
     if(kind==='cz'){token.entry='CZ';token.entrySource='game';return token;}
     token.message=preludeLabel(before.prelude)+'終了';
    }
   }
   if(state.prelude?.kind.startsWith('ceiling'))return token;
   if(!forced&&rng()<1/c.superDenom){token.result='SUPER_NOVA';state.prelude=null;return token;}
   if(result==='STRONG_NOVA'){
    state.prelude=null;token.entry='STRONG_CZ';token.entrySource='rare';token.czOptions={...options.cz,strongChance:before.level==='high'?1:.85};return token;
   }
   if(result==='WEAK_NOVA'&&rng()<(before.level==='high'?.75:.25)){
    state.prelude=null;token.entry='CZ';token.entrySource='rare';return token;
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
 function afterArt(value,before,after,options={},rng=Math.random){const s=normalize(value);if(before?.phase==='art'&&after?.phase==='normal'){s.games=0;s.prelude=null;s.ceilingHandled=false;s.mode=modes[weighted(modeWeights(after.dryAtEnd===true?atEndModeWeights.dry:atEndModeWeights.normal,options?.setting),rng)];if(after.dryAtEnd===true)s.impurity=Math.min(100,s.impurity+config(options).atDryGain);}return s;}
 function bonusEnd(value,kind,after,options={}){const s=normalize(value),c=config(options);s.regStreak=0;s.impurity=Math.min(100,s.impurity+(after?.phase!=='art'?c.bonusFailureGain:0));return s;}
 function afterBonus(value,rng=Math.random,setting){const s=normalize(value);return {...s,prelude:null,ceilingHandled:false,morningCeiling:false,mode:modes[weighted(modeWeights(transitions[modes.indexOf(s.mode)],setting),rng)],games:0,level:'low',highLeft:0};}
 function drawRare(rng=Math.random){const keys=Object.keys(rare);return keys[weighted(keys.map(k=>rare[k].p),rng)];}
 const rareMean=Object.values(rare).reduce((s,r)=>s+r.p*r.pay,0)/Object.values(rare).reduce((s,r)=>s+r.p,0);
 return {modeWeights,gameZoneRates,gameZoneConfig,atEndModeWeights,zonePoint,preludePresentation,zoneRate,normalLabel,resetImpurityPoints,resetImpurityWeights,resetDistribution,reset,modes,ceilings,transitions,rare,rareMean,rareFactor,roleProbabilities,drawRare,defaults,config,normalize,ceiling,favored,multiplier,pay,drawRole,advance,spin,claim,afterArt,bonusEnd,afterBonus};
})();
