/* Internal normal-play rules. No supplied image or audio is processed. */
globalThis.NovaNormal=(()=>{
 const lotteryRules=Object.freeze({version:140,ceilingGames:800,czScale:Object.freeze([.502,.510,.522,.498,.552,.616])});
 // Approved mode proposal: docs/mode-zones-20261014.json. Normal + CZ games share the mode clock.
 const modeRules={"modes":["A","B","C","天国","天国ループ"],"ceilings":[800,700,400,200,200],"initial":[50,25,10,12,3],"promotion":[[60,25,10,4,1],[0,65,20,12,3],[0,0,65,30,5],[0,0,0,80,20],[0,0,0,0,100]],"afterHeaven":[40,25,10,20,5],"afterLoop":[10,10,5,15,60],"fiftyFake":{"heaven":1,"other":0.1},"rates":{"A":{"100":0.1,"200":0.15,"300":0.03,"400":0.25,"500":0.03,"600":0.5,"700":0.03},"B":{"100":0.2,"200":0.03,"300":0.25,"400":0.03,"500":0.45,"600":0.03},"C":{"100":0.4,"200":0.25,"300":0.45},"天国":{"100":0.65},"天国ループ":{"100":0.65}}};const modes=modeRules.modes,ceilings=modeRules.ceilings,transitions=modeRules.promotion,gameZoneRates=modeRules.rates,atEndModeWeights={normal:modeRules.initial};
 // Approved reset / AT-end selection: docs/at4-mode-cz-20261025.json.
 const modeSelection={"initial":[[46.9,25,10.7,13.7,3.7],[48.9,25,10.3,12.6,3.2],[49.1,25,10.2,12.5,3.2],[49.8,25,10.1,12.1,3],[47.8,24.5,13.399999999999999,12.3,2],[50.4,25,9.9,11.8,2.9]],"afterHeaven":[[36.7,24.5,10.5,22.3,6],[38.7,24.8,10.2,20.9,5.4],[39,24.9,10.1,20.7,5.3],[39.7,25,10,20.2,5.1],[38.5,25.5,13.7,18.9,3.4],[40.4,25.1,9.9,19.7,4.9]],"afterLoop":[[8.1,8.7,4.7,14.9,63.6],[9.2,9.5,4.9,15,61.4],[9.4,9.6,4.9,15,61.1],[9.8,9.9,5,15,60.3],[6.699999999999999,12.8,10.399999999999999,18,52.1],[10.3,10.2,5.1,15,59.4]]};
 const gameZoneConfig={fakeRate:0,preludeMin:3,preludeMax:8,ceilingBonusRate:.5};
 const czPreludeRules=Object.freeze({minGames:3,maxGames:10,fakeOnMissRate:.5});
 function zonePoint(g){return g===50||g>=100&&g%100===0;}
 function zoneRate(v,g){return gameZoneRates[normalize(v).mode]?.[g]||0;}
 function preludePresentation(){return 'none';}
 function prelude(kind,rng,g){return {kind,originG:g,presentation:'main',left:gameZoneConfig.preludeMin+Math.floor(rng()*(gameZoneConfig.preludeMax-gameZoneConfig.preludeMin+1))};}
 function preludeLabel(p){return p?.presentation==='reel'?'CZ前兆':p?.presentation==='pre'?'ざわつき':p?.presentation==='main'?'NOVA前兆':'前兆中';}
 function czPrelude(entry,czOptions,rng,g,source='rare'){
  const span=czPreludeRules.maxGames-czPreludeRules.minGames;
  const total=czPreludeRules.minGames+Math.min(span,Math.floor(rng()*(span+1)));
  return {kind:source==='ceiling'?'ceilingCz':entry?'cz':'czFake',originG:g,presentation:'reel',total,left:total-1,entry,source,
   ...(entry==='STRONG_CZ'?{strongChance:czOptions.strongChance}:{})};
 }
 function normalizePrelude(p){
  if(!p||!['cz','czFake','ceilingBonus','ceilingCz'].includes(p.kind)||p.kind==='czFake'&&p.presentation!=='reel')return null;
  const base={kind:p.kind,originG:Math.max(0,Math.floor(Number(p.originG)||0)),presentation:['pre','main'].includes(p.presentation)?p.presentation:'legacy',left:Math.max(0,Math.min(8,Math.floor(Number(p.left)||0)))};
  if(p.presentation!=='reel'||p.kind==='ceilingBonus')return base;
  const total=Math.max(3,Math.min(10,Math.floor(Number(p.total)||3)));
  return {...base,presentation:'reel',total,left:Math.max(0,Math.min(total,Math.floor(Number(p.left)||0))),entry:p.kind==='czFake'?'':p.entry==='STRONG_CZ'||p.kind==='ceilingCz'?'STRONG_CZ':'CZ',source:p.kind==='ceilingCz'?'ceiling':'rare',
   ...(Number.isFinite(p.strongChance)?{strongChance:Math.max(0,Math.min(1,p.strongChance))}:{})};
 }
 // Darkness belongs to one spin only; no reel stays dark across BETs.
 function czPreludeStage(){return 0;}
 function preludeStops(p,rng){return p.left===0?(p.kind==='czFake'?0:3):1+Math.min(1,Math.floor(rng()*2));}
 function normalLabel(value){const s=normalize(value);return s.prelude?preludeLabel(s.prelude):'通常';}
 // Legacy weights are retained only to derive the approved merged lottery budget.
 const legacyRare={WEAK_SUICA:{p:0.011,up:.05,cz:.06,gain:1,pay:3},STRONG_SUICA:{p:0.0026,up:.5,cz:.6,gain:3,pay:3},CHANCE_A:{p:1/312.5,up:9/28,cz:3/14,gain:1,pay:0},CHANCE_B:{p:1/125,up:9/28,cz:3/14,gain:1,pay:0},WEAK_NOVA:{p:1/128,up:.35,cz:.3,gain:2,pay:2},STRONG_NOVA:{p:1/2500,up:.75,cz:1,gain:4,pay:2}};
 const rare={WEAK_SUICA:{...legacyRare.WEAK_SUICA,p:0.0248},WEAK_NOVA:{...legacyRare.WEAK_NOVA},STRONG_NOVA:{...legacyRare.STRONG_NOVA}};
 const defaults={highMultiplier:2,bandMultiplier:2,downMiss:.08,downReplay:.05,czFailureGain:1,bonusFailureGain:2,atDryGain:2,ceilingGain:10,regChainGain:2,superDenom:32768};
 function config(v={}){const c={...defaults};for(const k in c)if(Number.isFinite(Number(v[k])))c[k]=Math.max(0,Math.min(k==='superDenom'?1e9:100,Number(v[k])));c.superDenom=Math.max(2,c.superDenom);return c;}
 const normalLowPayoutRules=Object.freeze({version:2,oneCoinChance:.1,addedNaviBellChance:1/16,missShare:2/3,replayShare:1/3});
 function oneCoinDownChance(options={}){const c=config(options);return c.downMiss*normalLowPayoutRules.missShare+c.downReplay*normalLowPayoutRules.replayShare;}
 const resetImpurityPoints=Object.freeze([0,25,50,75,90,100]);
 const resetImpurityWeights=Object.freeze([[20,25,35,15,4,1],[19,25,35,16,4,1],[18,25,35,16,5,1],[17,25,35,17,5,1],[16,24,35,18,5,2],[15,24,35,18,6,2]].map(Object.freeze));
 function resetDistribution(setting=1){const row=resetImpurityWeights[Math.max(0,Math.min(5,Math.round(Number(setting)||1)-1))];return resetImpurityPoints.map((pt,i)=>({pt,weight:row[i]}));}
 function reset(rng=Math.random,setting=1){const row=resetDistribution(setting);return normalize({morningCeiling:true,impurity:row[weighted(row.map(x=>x.weight),rng)].pt,mode:modes[weighted(modeWeights(setting),rng)]});}
 // Preserve mode/CZ progress across saves. Old single-mode saves migrate to A without losing elapsed games.
 function normalize(v){return {normalVersion:153,modeChecked:Math.max(0,Math.floor(Number(v?.modeChecked)||0)),fiftyChecked:!!v?.fiftyChecked,prelude:normalizePrelude(v?.prelude),ceilingHandled:!!v?.ceilingHandled,regStreak:0,morningCeiling:!!v?.morningCeiling,mode:modes.includes(v?.mode)?v.mode:'A',games:Math.max(0,Math.floor(Number(v?.games)||0)),level:v?.level==='high'?'high':'low',highLeft:v?.level==='high'?Math.max(0,Math.floor(Number(v?.highLeft)||0)):0,impurity:Math.min(100,Math.max(0,Number(v?.impurity)||0))};}
 function modeWeights(setting=1,previous=''){const i=Math.max(0,Math.min(5,Math.round(Number(setting)||1)-1)),key=previous==='天国ループ'?'afterLoop':previous==='天国'?'afterHeaven':'initial';return modeSelection[key][i];}
 function weighted(weights,rng){let n=rng()*weights.reduce((a,b)=>a+b,0);return Math.max(0,weights.findIndex(w=>(n-=w)<0));}
 function ceiling(v){const s=normalize(v);return Math.min(ceilings[modes.indexOf(s.mode)],s.morningCeiling?600:Infinity);}
 function favored(v){return zoneRate(v,Math.ceil(v.games/100)*100)>=.15;}
 function multiplier(){return 1;}
 function pay(role){return rare[role]?.pay??(role==='ONE_COIN'?1:role==='BELL'?8:role==='BELL15'?15:0);}
 function rareFactor(){return 1;}
 // Visible role frequencies are common. Setting character is created by CZ
 // entry/success and downstream reward quality instead of countable roles.
 const commonRoleProbabilities=Object.freeze({"WEAK_SUICA":0.0248,"STRONG_SUICA":0,"CHANCE_A":0,"CHANCE_B":0,"WEAK_NOVA":0.0078125,"STRONG_NOVA":0.0004,"REPLAY":0.469325,"BELL":0.00505751243781094,"MISS":0.492604987562189});
 function roleProbabilities(){return {...commonRoleProbabilities};}
 const roleEntries=[1,2,3,4,5,6].map(s=>Object.entries(roleProbabilities(s)));
 function drawRole(setting,rng=Math.random){let r=rng();for(const [role,p]of roleEntries[Math.max(0,Math.min(5,Math.round(Number(setting)||3)-1))]){r-=p;if(r<0)return role;}return 'MISS';}
 // Only ordinary play (including CZ preludes) adds numbered bell navigation.
 // Keep the shared role table unchanged for CZ, preparation and comeback draws.
 function normalRoleProbabilities(setting=3){
  const key=Math.max(1,Math.min(6,Math.round(Number(setting)||3))),r={...roleProbabilities(key)};
  // Add the common numbered 8pt navigation bell. One-coin, replay and miss
  // are then solved back to exact base30 without leaving a countable hint.
  const legacyNaviBell=1/NovaTuning.normalBellDenominators[key-1];
  r.NAVI_BELL=legacyNaviBell+normalLowPayoutRules.addedNaviBellChance;
  r.MISS=1-Object.entries(r).reduce((sum,[role,p])=>sum+(role==='MISS'?0:p),0);
  r.ONE_COIN=normalLowPayoutRules.oneCoinChance;
  const otherPaid=Object.entries(r).reduce((sum,[role,p])=>sum+p*(role==='NAVI_BELL'?8:pay(role)),0);
  r.REPLAY=(3-50/NovaTuning.normalBase(key)-otherPaid)/3;
  r.MISS=1-Object.entries(r).reduce((sum,[role,p])=>sum+(role==='MISS'?0:p),0);
  const total=Object.values(r).reduce((sum,p)=>sum+p,0);
  if(Math.abs(total-1)>1e-12||Object.values(r).some(p=>!Number.isFinite(p)||p<0||p>1))throw new RangeError('Invalid normal base probabilities');
  return r;
 }
 const normalRoleEntries=[1,2,3,4,5,6].map(setting=>{
  const mix=normalRoleProbabilities(setting);
  return Object.entries(mix);
 });
 function drawNormalRole(setting,rng=Math.random){let r=rng();for(const [role,p]of normalRoleEntries[Math.max(0,Math.min(5,Math.round(Number(setting)||3)-1))])if((r-=p)<0)return role;return 'MISS';}
 const stateRoles=['WEAK_SUICA','WEAK_NOVA'];
 const redistributionNormalRoles=[{"WEAK_SUICA":0.010648,"STRONG_SUICA":0.0025168,"CHANCE_A":0.00433664,"CHANCE_B":0.00650496,"WEAK_NOVA":0.0075625,"STRONG_NOVA":0.00038720000000000003,"REPLAY":0.4464,"BELL":0.005951592437810937,"MISS":0.5156923075621891},{"WEAK_SUICA":0.010823999999999999,"STRONG_SUICA":0.0025583999999999997,"CHANCE_A":0.0066124800000000004,"CHANCE_B":0.00440832,"WEAK_NOVA":0.0076875,"STRONG_NOVA":0.0003936,"REPLAY":0.4482,"BELL":0.005504552437810947,"MISS":0.513811147562189},{"WEAK_SUICA":0.011,"STRONG_SUICA":0.0026,"CHANCE_A":0.0044800000000000005,"CHANCE_B":0.006719999999999999,"WEAK_NOVA":0.0078125,"STRONG_NOVA":0.0004,"REPLAY":0.45,"BELL":0.00505751243781094,"MISS":0.511929987562189},{"WEAK_SUICA":0.011176,"STRONG_SUICA":0.0026416,"CHANCE_A":0.006827519999999999,"CHANCE_B":0.00455168,"WEAK_NOVA":0.0079375,"STRONG_NOVA":0.0004064,"REPLAY":0.45180000000000003,"BELL":0.004610472437810949,"MISS":0.510048827562189},{"WEAK_SUICA":0.011352,"STRONG_SUICA":0.0026831999999999997,"CHANCE_A":0.004623360000000001,"CHANCE_B":0.006935040000000001,"WEAK_NOVA":0.0080625,"STRONG_NOVA":0.0004128,"REPLAY":0.4536,"BELL":0.004163432437810944,"MISS":0.5081676675621891},{"WEAK_SUICA":0.0161392,"STRONG_SUICA":0.0027248,"CHANCE_A":0.009859584,"CHANCE_B":0.006573056000000001,"WEAK_NOVA":0.0114625,"STRONG_NOVA":0.00041920000000000005,"REPLAY":0.54,"BELL":0.005089320634920632,"MISS":0.40773233936507935}];
 const redistributionNormalUp=[0.16711383671904947,0.16711383671904945,0.16711383671904942,0.16711383671904947,0.16711383671904945,0.15935451336359055];
 // Apply after the existing cap, equally in low/high and decrement intervals.
 // Retained 2026-10-07 CZ calibration factors; current base/payout mixes are compensated separately.
 const czEntryFactors=Object.freeze([0.5516519148129746,0.7208975984965829,0.6281660492320582,0.7979815623975144,0.44354968780320364,0.6129111430899589]);
 function roleCzRate(value,role,setting=1,options={}){
  if(role==='STRONG_NOVA')return 1;
  if(!['WEAK_SUICA','WEAK_NOVA'].includes(role))return 0;
  const i=Math.max(0,Math.min(5,Math.round(Number(setting)||1)-1)),r=redistributionNormalRoles[2],profile=NovaTuning.balanceProfile?.(setting)||{rareCzEntry:1};
  const m=NovaTuning.profile(3).cz*lotteryRules.czScale[2]*(value?.level==='high'?config(options).highMultiplier:1);
  const total=["WEAK_SUICA","STRONG_SUICA","CHANCE_A","CHANCE_B","WEAK_NOVA"].reduce((s,k)=>s+r[k]*Math.min(1,legacyRare[k].cz*m),0);
  return profile.rareCzEntry*.1*czEntryFactors[2]*Math.min(1,total/(r.WEAK_SUICA+r.STRONG_SUICA+r.WEAK_NOVA+r.CHANCE_A+r.CHANCE_B)*1.28);
 }
 function advance(value,role,flow,options={},rng=Math.random){
  const s=normalize(value),c=config(options),held=s.level==='high'&&s.highLeft>0;
  s.games++;if(held)s.highLeft--;
  if(rare[role]){

   if(stateRoles.includes(role)){
    if(s.level==='low'){
     const rate=redistributionNormalUp[2];
     if(rng()<rate){s.level='high';s.highLeft=10;}
    }
   }
  }else if(!held&&(role==='MISS'||role==='REPLAY'||role==='ONE_COIN')){
   const down=role==='MISS'?c.downMiss:role==='REPLAY'?c.downReplay:oneCoinDownChance(c);
   if(rng()<down){s.level='low';s.highLeft=0;}
  }

  if(['cz','strong_cz'].includes(flow?.phase)&&flow.remaining===1&&!flow.success){const p=NovaTuning.balanceProfile?.(options.setting)||{failureRecovery:1};s.impurity=Math.min(100,s.impurity+c.czFailureGain*p.failureRecovery);}
  return s;
 }
 function spin(value,flow,setting=1,options={},rng=Math.random,forced=''){
  if(forced==='STRONG_BELL')forced='BELL';
  if(forced==='STRONG_SUICA')forced='WEAK_SUICA';
  if(forced==='CHANCE_A'||forced==='CHANCE_B')forced='MISS';
  options={...options,cz:NovaFlow.forSetting(options.cz,setting)};
  const before=normalize(value),c=config(options.normal),drawn=forced||(flow.phase==='normal'?drawNormalRole(setting,rng):drawRole(setting,rng)),result=drawn==='NAVI_BELL'?'BELL':drawn;
  if(flow.modePending&&before.games>=100){flow={...flow,modePending:false,success:rng()<flow.modeChance,winProbability:flow.modeChance};}
  if(before.games<100&&['cz','strong_cz'].includes(flow.phase))flow={...flow,success:false,winProbability:0};
  flow=before.games<100||flow.modeFake?NovaFlow.normalize(flow):NovaFlow.rewrite(flow,result,options.cz,rng);
  const state=advance(before,result,flow,{...c,setting},rng),token={normalBellNavi:drawn==='NAVI_BELL',result,state,czFlow:flow,internalBonus:null,entry:'',direct:!!flow.direct,directZone:flow.directZone||'',czOptions:options.cz,czChance:before.prelude?.presentation==='reel'&&before.prelude.kind!=='czFake'?1:roleCzRate(before,result,setting,c)};
  // Keep the drawn watermelon for internal lotteries; CZ reels and cash use replay.
  if(['cz','strong_cz'].includes(flow.phase)&&result==='WEAK_SUICA'){
   token.internalResult=result;token.result='REPLAY';
  }
  if(['cz','strong_cz'].includes(flow.phase)&&before.prelude?.presentation==='reel'&&before.prelude.kind!=='czFake'&&before.prelude.left===0){
   state.prelude=null;token.czPrelude={before:3,after:0,announce:true};
  }
  const bonus=source=>({kind:'BIG',source,internalResult:'BIG'});
  if(state.games<=100&&token.result==='SUPER_NOVA')token.result='MISS';
  if(state.games>=ceiling(state)){
   state.ceilingHandled=true;state.prelude=null;if(!before.ceilingHandled)state.impurity=Math.min(100,state.impurity+c.ceilingGain);
   if(['cz','strong_cz'].includes(flow.phase)&&flow.remaining>1){flow={...flow,success:true,winProbability:1};token.czFlow=flow;}
   else{token.internalBonus=bonus(state.mode+'天井'+ceiling(state)+'G');token.modeEvent={type:'ceiling',mode:state.mode,g:state.games};return token;}
  }
  if(flow.phase==='normal'){
   if(!state.fiftyChecked&&state.games>=50){
    state.fiftyChecked=true;const heaven=modes.indexOf(state.mode)>=3;
    if(rng()<(heaven?modeRules.fiftyFake.heaven:modeRules.fiftyFake.other)){
     token.entry='CZ';token.entrySource='game';state.prelude=null;
     token.czOptions={...options.cz,czChance:0,modeFake:true};token.modeEvent={type:'fake50',mode:state.mode,g:state.games};return token;
    }
   }
   if(state.games>=100*(state.modeChecked+1)){
    const checkpoint=100*(state.modeChecked+1);state.modeChecked++;
     const entryFactor=(NovaTuning.balanceProfile?.(setting)||{gameCzEntry:1}).gameCzEntry;
     const real=rng()<Math.min(1,zoneRate(state,checkpoint)*entryFactor);
    token.modeEvent={type:'zoneMiss',mode:state.mode,g:checkpoint};
    if(real||checkpoint===100){
     token.entry='CZ';token.entrySource='game';state.prelude=null;
     token.czOptions={...options.cz,modeFake:!real,modePending:real&&state.games<=100,modeChance:options.cz.czChance,...(!real||state.games<=100?{czChance:0}:{})};
     token.modeEvent.type=real?'realZone':'fake100';return token;
    }
   }
  }
  if(state.games<=100){state.prelude=null;return token;}
  if(forced==='FREEZE'){state.prelude=null;token.result='MISS';token.internalBonus={...bonus('フリーズ'),premiumBonus:true};return token;}
  if(flow.phase==='normal'){
   if(before.prelude?.presentation==='reel'){
    const p=state.prelude;
    // Keep the won CZ and its countdown. Strong NOVA can promote it without
    // restarting the prelude; fake preludes keep the normal rare-role lottery.
    // A premium bonus retains its existing priority.
    if(p.source!=='ceiling'&&(result==='SUPER_NOVA'||(!forced&&rng()<1/c.superDenom))){token.result='SUPER_NOVA';state.prelude=null;return token;}
    if(p.kind==='czFake'&&rare[result]&&(result==='STRONG_NOVA'||rng()<roleCzRate(before,result,setting,c))){p.kind='cz';p.entry='CZ';}
    if(result==='STRONG_NOVA'){p.entry='STRONG_CZ';p.strongChance=Math.max(p.strongChance||0,before.level==='high'?1:.85);}
    if(before.prelude.left===0&&before.prelude.kind!=='czFake'){
     token.entry=p.entry;token.entrySource=p.source;
     if(Number.isFinite(p.strongChance))token.czOptions={...options.cz,strongChance:p.strongChance};
     token.czPrelude={before:3,after:0,announce:true};state.prelude=null;
     token.message=token.entry==='STRONG_CZ'?'強CZ突入':'CZ突入';return token;
    }
    p.left=Math.max(0,p.left-1);
    token.czPrelude={before:0,after:preludeStops(p,rng),left:p.left,total:p.total};
    if(p.left===0){
     if(p.kind==='czFake'){token.czPrelude.failed=true;state.prelude=null;token.message='CZ前兆終了';}
     else{
      token.entry=p.entry;token.entrySource=p.source;token.czPrelude.enter=true;
      if(Number.isFinite(p.strongChance))token.czOptions={...options.cz,strongChance:p.strongChance};
     }
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
   if(state.prelude?.kind.startsWith('ceiling')){if(state.prelude.presentation==='reel')token.czPrelude={before:0,after:preludeStops(state.prelude,rng),started:true,left:state.prelude.left,total:state.prelude.total};return token;}
   if(!forced&&rng()<1/c.superDenom){token.result='SUPER_NOVA';state.prelude=null;return token;}
   if(result==='STRONG_NOVA'){
    token.czOptions={...options.cz,strongChance:before.level==='high'?1:.85};
    state.prelude=czPrelude('STRONG_CZ',token.czOptions,rng,state.games);
    token.czPrelude={before:0,after:preludeStops(state.prelude,rng),started:true,left:state.prelude.left,total:state.prelude.total};token.message='CZ前兆開始';return token;
   }
   if(rare[result]){
    const won=rng()<roleCzRate(before,result,setting,c);
    if(won||rng()<czPreludeRules.fakeOnMissRate){
     state.prelude=czPrelude(won?'CZ':'',options.cz,rng,state.games);
     token.czPrelude={before:0,after:preludeStops(state.prelude,rng),started:true,left:state.prelude.left,total:state.prelude.total};token.message='CZ前兆開始';return token;
    }
   }
  }else if(['cz','strong_cz'].includes(flow.phase)){
   flow.lampRoll??=rng();flow.rainbowRoll??=rng();
   token.czLamp={success:flow.success,...NovaFlow.drawLamp(flow,rng),totalGames:flow.totalGames,remaining:flow.remaining};
   const display=NovaFlow.lampAtStop(token.czLamp,3);
   const allLit=flow.success&&(display.stage===6||display.rainbow);
   if(flow.remaining===1&&flow.success){
    token.internalBonus={...bonus(allLit?'CZ全員点灯':flow.phase==='cz'?'CZ成功':'強CZ成功'),...(flow.direct?{direct:true,directZone:flow.directZone}:{})};
   }
  }
  return token;
 }
 function claim(value,freeze=false,rng=Math.random){const state=normalize(value),zones=[];if(state.impurity>=100){state.impurity=0;zones.push(['urapi','giru','sora','ouma'][Math.min(3,Math.floor(rng()*4))]);}if(freeze)zones.push(['giru','sora','ouma'][Math.min(2,Math.floor(rng()*3))]);return {state,zones:zones.map(z=>NovaArt.upgradeGuaranteedZone(z,rng)),sets:zones.length?1:0};}
 function afterArt(value,before,after,options={},rng=Math.random){const s=normalize(value);if(before?.phase==='art'&&after?.phase==='normal'){const p=NovaTuning.balanceProfile?.(options.setting)||{failureRecovery:1};s.morningCeiling=false;s.games=0;s.modeChecked=0;s.fiftyChecked=false;s.mode=modes[weighted(modeWeights(options.setting,s.mode),rng)];s.prelude=null;s.ceilingHandled=false;s.level='low';s.highLeft=0;if(after.dryAtEnd===true)s.impurity=Math.min(100,s.impurity+config(options).atDryGain*p.failureRecovery);}return s;}
 function bonusEnd(value,kind,after,options={}){const s=normalize(value),c=config(options),p=NovaTuning.balanceProfile?.(options.setting)||{failureRecovery:1};s.regStreak=0;s.impurity=Math.min(100,s.impurity+(after?.phase!=='art'?c.bonusFailureGain*p.failureRecovery:0));return s;}
 function afterBonus(value,rng=Math.random,setting){const s=normalize(value);return {...s,prelude:null,ceilingHandled:false,morningCeiling:false,games:0,modeChecked:0,fiftyChecked:false,mode:modes[weighted(transitions[modes.indexOf(s.mode)],rng)],level:'low',highLeft:0};}
 function drawRare(rng=Math.random){const keys=Object.keys(rare);return keys[weighted(keys.map(k=>rare[k].p),rng)];}
 const rareMean=Object.values(rare).reduce((s,r)=>s+r.p*r.pay,0)/Object.values(rare).reduce((s,r)=>s+r.p,0);
 return {modeSelection,modeRules,normalLowPayoutRules,oneCoinDownChance,normalRoleProbabilities,drawNormalRole,lotteryRules,czPreludeRules,czPreludeStage,roleCzRate,czEntryFactors,modeWeights,gameZoneRates,gameZoneConfig,atEndModeWeights,zonePoint,preludePresentation,zoneRate,normalLabel,resetImpurityPoints,resetImpurityWeights,resetDistribution,reset,modes,ceilings,transitions,rare,rareMean,rareFactor,roleProbabilities,drawRare,defaults,config,normalize,ceiling,favored,multiplier,pay,drawRole,advance,spin,claim,afterArt,bonusEnd,afterBonus};
})();

