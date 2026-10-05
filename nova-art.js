/* AT payout-point rules. Decimal strings preserve unlimited exact awards. */
globalThis.NovaArt=(()=>{
 const names={sosuke:'宗介',toto:'とと',urapi:'うらぴ',giru:'ギル',sora:'空',ouma:'逢魔',kushuri:'くしゅり',nito:'にと',kushuri_nito:'くしゅり＆にと'};
 const defaults={initial:200,payoutVersion:1,ladderSosuke:0.4,ladderGiru:0.5,ladderUraGiru:2/3,totoHit:0.35,totoReset:.02,soraUraHit:0.35,soraUraRed:.715,urapiSuper:0.49,oumaSuper:0.77,oumaUraSuper:0.75,rare:.03,big:.12,zone:.4,czArt:.25,soraHit:0.35,soraReset:.15,soraUraReset:.30,urapiFreeze:.1,oumaFreeze:.25,oumaUraFreeze:.35,direct1:1400,direct2:1320,direct3:1240,direct4:1160,direct5:1080,direct6:1000};
 const zoneWeights=Object.freeze([[35,29,17,9,7,3],[34.5,29,17,9.5,7,3],[34,28.5,17.5,9.5,7.25,3.25],[33.5,28.5,17.5,9.5,7.5,3.5],[33,28,18,9.5,7.75,3.75],[32.5,27.5,18,10,8,4]].map(Object.freeze));
 const superZoneChance=.03;
 const zoneGroups={weak:['sosuke','toto','urapi'],strong:['giru','sora','ouma'],super:['ura_giru','ura_sora','ura_ouma']};
 function pickZone(setting=1,rng=Math.random){return pickAtZone(setting,false,rng,true);}
 // Preserve the original 3% promotion of strong zones, applied once at selection.
 function upgradeGuaranteedZone(zone,rng=Math.random){return zoneGroups.strong.includes(zone)&&rng()<superZoneChance?'ura_'+zone:zone;}
 const points=g=>(integer(g)*11n+1n)/2n;
 const bonusTarget=()=>50;
 const bonusRules=Object.freeze({normal:Object.freeze({atChance:.52}),upper:Object.freeze({atChance:.80}),upperRate:.10});
 const bonusTier=tier=>tier==='upper'?'upper':'normal';
 const drawBonusTier=(rng=Math.random)=>rng()<bonusRules.upperRate?'upper':'normal';
 const bonusLabel=tier=>bonusTier(tier)==='upper'?'上位BIG':'通常BIG';
 const bonusPayout=(state,role)=>Math.min(payout(role),Math.max(0,bonusTarget()-(Number(state?.paid)||0)));
 // Upper-AT challenge. Ordinary AT has one shared rule set.
 const burstRules=Object.freeze({
  version:2,games:10,success:.65,initialSuccess:.5,initialEntry:.05,
  uraWeights:Object.freeze([1,1,1]),
  entry:Object.freeze([0.0225,0.033,0.0465,0.063,0.0615,0.021]),
  roles:Object.freeze({WEAK_SUICA:0.15839316425977998,WEAK_NOVA:0.15839316425977998,STRONG_NOVA:1})
 });
 function challengeName(){return '上位ATチャレンジ';}
 function challengeAimChance(target,setting){
  const rare=atMix(setting).chance,miss=1-.1-rare;
  const q=((miss/(1-target)**.1-miss-rare)/.1-rare)/(1-rare);
  if(!Number.isFinite(q)||q<0||q>1)throw new RangeError('Challenge target cannot preserve rare guarantees');
  return q;
 }
 function weightedChallenge(weights,rng){let roll=rng()*weights.reduce((a,b)=>a+b,0);for(let i=0;i<weights.length;i++)if((roll-=weights[i])<0)return i;return weights.length-1;}
 function burstReward(s,rng){
  s.burstWon=true;s.dryEligible=false;
  const zone=zoneGroups.super[weightedChallenge(burstRules.uraWeights,rng)];
  s.pendingZone=zone;s.entryStage='confirmed';s.rouletteTable=0;
  return {type:'ura',zone,points:0};
 }
 function burstChance(role,setting){return (burstRules.roles[role]||0)*burstRules.entry[validSetting(setting)-1];}
 // Five paid games after the final AT quota. All rare roles guarantee revival.
 const comebackRules=Object.freeze({games:5,totalChance:.20,
  guaranteedRoles:Object.freeze(['WEAK_SUICA','STRONG_SUICA','CHANCE_A','CHANCE_B','WEAK_NOVA','STRONG_NOVA','SUPER_NOVA']),
  bellRate:1/50,highMissChance:.002,parityHintPerZone:.01,
  superDenom:32768
 });
 const comebackCommonChances=new Map();
 function comebackChance(role,setting=1,options={}){
  if(comebackRules.guaranteedRoles.includes(role)||role==='FREEZE')return 1;
  if(!['BELL','REPLAY','MISS'].includes(role))return 0;
  const key=validSetting(setting);
  if(!comebackCommonChances.has(key)){
   const row=comebackRoleProbabilities(key);
   const guaranteed=comebackRules.guaranteedRoles.reduce((sum,role)=>sum+(row[role]||0),0);
   const chances={BELL:0,REPLAY:0,MISS:key>=4?comebackRules.highMissChance:0};
   // BELL revival certifies odd settings; REPLAY certifies even; MISS certifies 4/5/6.
   // Allocate the remaining probability after rare guarantees and MISS to keep the 5G total at 20%.
   const perGame=1-(1-comebackRules.totalChance)**(1/comebackRules.games);
   const eligible=key%2?'BELL':'REPLAY';
   chances[eligible]=(perGame-guaranteed-row.MISS*chances.MISS)/row[eligible];
   comebackCommonChances.set(key,Object.freeze(chances));
  }
  return comebackCommonChances.get(key)[role];
 }
 function comebackRoleProbabilities(setting=1){
  const key=validSetting(setting),row={...NovaNormal.roleProbabilities(key)},superRate=1/comebackRules.superDenom;
  const perGame=1-(1-comebackRules.totalChance)**(1/comebackRules.games);
  const parityPerGame=comebackRules.parityHintPerZone*perGame/comebackRules.totalChance;
  const missChance=key>=4?comebackRules.highMissChance:0;
  // Increase recovery-only rare frequency so odd/even confirmation occurs in 1% of zones.
  // Solve q = rare + parity + MISS*missChance, with MISS = 1 - rare - bell - replay.
  const rareTarget=(perGame-parityPerGame-missChance*(1-comebackRules.bellRate-row.REPLAY))/(1-missChance);
  const roles=comebackRules.guaranteedRoles.filter(role=>role!=='SUPER_NOVA');
  const factor=(rareTarget-superRate)/roles.reduce((sum,role)=>sum+row[role],0);
  for(const role of roles)row[role]*=factor;
  row.BELL=comebackRules.bellRate;row.MISS=1-rareTarget-row.BELL-row.REPLAY;
  return {SUPER_NOVA:superRate,...row};
 }
 function drawComebackRole(setting,rng){let roll=rng();for(const [role,p] of Object.entries(comebackRoleProbabilities(setting)))if((roll-=p)<0)return role;return 'MISS';}
 function beginComeback(value){return normalize({...value,comebackLeft:comebackRules.games,comebackLamp:'',comebackConfirmed:false,remaining:'0'});}
 function prepareComeback(value,options={},rng=Math.random){
  if(!value?.comebackLeft||value.comebackLamp)return value;
  return {...normalize(value),comebackLamp:pickAtZone(options.setting,false,rng)};
 }
 function stepComeback(value,options,rng,forced){
  const s=normalize(prepareComeback(value,options,rng)),result=forced==='FREEZE'?'SUPER_NOVA':forced==='RARE'?drawRare(rng):forced||drawComebackRole(options.setting,rng);
  const target=s.comebackLamp,hit=rng()<comebackChance(result,options.setting,options);s.comebackLeft--;
  if(hit){
   let zone=target;
   if(['SUPER_NOVA','FREEZE'].includes(result))zone=zoneGroups.super[Math.min(2,Math.floor(rng()*3))];
   else if(result==='STRONG_NOVA'&&zoneGroups.weak.includes(zone))zone=upgradeGuaranteedZone(zoneGroups.strong[Math.min(2,Math.floor(rng()*3))],rng);
   s.comebackLeft=0;s.comebackLamp=zone;s.comebackConfirmed=true;s.dryEligible=false;
   s.pendingZone=zone;s.entryStage='confirmed';s.giruSetting=validSetting(options.setting);s.rouletteTable=0;
   return {result,flow:s,comebackEvent:'success',comebackLamp:target,message:'引き戻し成功！ '+zoneName(zone)+'ゾーン獲得 / AT復活'};
  }
  const left=s.comebackLeft;s.comebackLamp='';
  return {result,flow:left?s:{phase:'normal',remaining:0,success:false,dryAtEnd:s.dryEligible},comebackEvent:left?'continue':'failure',comebackLamp:target,message:left?'引き戻しゾーン 残り'+left+'G':'引き戻し終了 / AT終了'};
 }
 // No persistent performance class. These rules apply to every AT.
 const commonAtRules=Object.freeze({rare:1,direct:.6,weakNova:.35,groups:Object.freeze([70,29.1,.9])});
 function commonAtRulesFor(setting=3){const p=NovaTuning.profile(setting);return {...commonAtRules,groups:p.groups,direct:.6*p.direct*(globalThis.NovaDecrement?.at(setting)??1),weakNova:.35*p.zone*(globalThis.NovaDecrement?.at(setting)??1)};}
 const atPreludeRules=Object.freeze({minGames:3,maxGames:5});
 function normalizeAtPrelude(p){
  if(!p)return null;
  const total=Math.max(3,Math.min(5,Math.floor(Number(p.total)||3)));
  return {total,left:Math.max(1,Math.min(total-1,Math.floor(Number(p.left)||1))),zones:Array.isArray(p.zones)?p.zones.filter(z=>zoneIds.includes(z)):[]};
 }
 function advanceAtPrelude(s,role,outcome,rng){
  const started=!s.atPrelude;
  if(started&&!rareRoles[role]&&role!=='SUPER_NOVA')return null;
  if(started){const total=3+Math.min(2,Math.floor(rng()*3));s.atPrelude={total,left:total,zones:[]};}
  const p=s.atPrelude;
  if(outcome.zone){p.zones.push(outcome.zone);s.dryEligible=false;}
  p.left--;
  const event={before:0,after:p.left?1+Math.min(1,Math.floor(rng()*2)):p.zones.length?3:0,left:p.left,total:p.total,started};
  if(!p.left){
   if(p.zones.length){
    s.pendingZone=p.zones.shift();s.queuedZones.push(...p.zones);s.entryStage='seven';s.rouletteTable=0;
    event.confirmed=true;
   }else event.failed=true;
   s.atPrelude=null;
  }
  return event;
 }
 // Draw the entry quota once. This is an awarded base, never a ceiling for later wins.
 const initialZoneIds=Object.freeze(['kushuri_nito']);
 const initialZoneId=z=>['kushuri_nito','kushuri','nito'].includes(z);
 const entryQuotaRules=Object.freeze({version:148,waitGames:3,games:3,values:Object.freeze([150,200,250,300]),weights:Object.freeze([8,12,6,1]),pointValues:Object.freeze([50,100]),pointWeights:Object.freeze([2,1])});
 const researchEntryWeights=[[0.6354105832966211,0.3110670270748763,0.05076124418701584,0.0027611454414867057],[0.4827364503295663,0.3979165543666842,0.10933335303418432,0.010013642269564929],[0.3746442278235266,0.43514331313362564,0.1684706795608236,0.021741779482023913],[0.26914350346608706,0.4431467349623512,0.24321477350531298,0.044494988066248714],[0.19722305399838924,0.4247972702808942,0.30498922781372345,0.07299044790699304],[0.13019579613189197,0.38005441300255294,0.3698054804995187,0.11994431036603637]];
 function drawEntryQuota(c,rng=Math.random,freshInitial=false){const weights=!freshInitial&&Number.isInteger(c?.setting)&&c.setting>=1&&c.setting<=6?researchEntryWeights[c.setting-1]:entryQuotaRules.weights;return entryQuotaRules.values[weightedChallenge(weights,rng)];}
 // Approved common-entry plan: fresh ATs share the full quota/multiplier distribution.
 // Retain multiplier values 3-5 for already-awarded saves, but never draw them anew.
 // The multiplier never changes subsequent AT roles, zones or comeback rewards.
 const initialBoostRules=Object.freeze({version:20261001,values:Object.freeze([1,2,3,4,5]),weights:Object.freeze([
  [.5,.5,0,0,0],[.5,.5,0,0,0],[.5,.5,0,0,0],
  [.5,.5,0,0,0],[.5,.5,0,0,0],[.5,.5,0,0,0]
 ].map(Object.freeze))});
 function drawInitialMultiplier(setting,rng){return initialBoostRules.values[weightedChallenge(initialBoostRules.weights[validSetting(setting)-1],rng)];}
 // The base plan is sealed; rare roles in the duo zone can upgrade that game's award.
 const initialRareAwards=Object.freeze({WEAK_SUICA:100,CHANCE_A:100,WEAK_NOVA:100,STRONG_SUICA:200,CHANCE_B:200,STRONG_NOVA:200,SUPER_NOVA:200});
 function drawInitialRole(setting,rng){let roll=rng();for(const [role,p]of Object.entries(roleProbabilities(setting)))if((roll-=p)<0)return role==='BELL15'?'BELL':role;return 'REPLAY';}
 function enterInitial(c,rng=Math.random){const s={...enter(c,rng,true),initialBoostActive:true,initialVersion:148,remaining:'0',initialStage:'wait',initialWait:entryQuotaRules.waitGames,initialPlan:[],initialIndex:0};s.initialMultiplier=drawInitialMultiplier(c?.setting,rng);if(rng()<.05){s.burstPending=true;s.burstUsed=true;s.researchChallengeSource='initial';}return s;}
 function initialFields(v){return {initialBoostActive:!!v?.initialBoostActive,initialMultiplier:initialBoostRules.values.includes(v?.initialMultiplier)?v.initialMultiplier:1,...(Number.isFinite(v?.researchChallengeSuccess)&&v.researchChallengeSuccess>=.4&&v.researchChallengeSuccess<=1?{researchChallengeSuccess:v.researchChallengeSuccess}:{}),modelSetting:validSetting(v?.modelSetting),researchSortieLeft:Math.max(0,Number(v?.researchSortieLeft)||0),researchSortieHits:Math.max(0,Number(v?.researchSortieHits)||0),researchSortieRate:Number(v?.researchSortieRate)||0,
  researchUpper:!!v?.researchUpper,researchThresholdUsed:!!v?.researchThresholdUsed,researchThresholdPending:!!v?.researchThresholdPending,
  researchChallengeActive:!!v?.researchChallengeActive,researchChallengeSource:v?.researchChallengeSource||'',researchAim:v?.researchAim||'',initialVersion:v?.initialVersion===148?148:131,initialStage:['wait','entry','zone'].includes(v?.initialStage)?v.initialStage:'',initialWait:Math.max(0,Math.min(entryQuotaRules.waitGames,Math.floor(Number(v?.initialWait)||0))),initialPlan:Array.isArray(v?.initialPlan)?v.initialPlan.slice(0,5).map(n=>Math.max(0,Math.floor(Number(n)||0))):[],initialIndex:Math.max(0,Math.min(5,Math.floor(Number(v?.initialIndex)||0)))};}
 // Initial ladder presentations only use amounts with the ordinary artwork.
 // Filter the character draw, never redraw or round the sealed entry quota.
 function initialZoneAllowed(zone,quota,version=148){return version===148?initialZoneIds.includes(zone):zoneIds.includes(zone)&&(!['sosuke','giru'].includes(baseZone(zone))||ladderValues.includes(Number(quota)));}
 function initialZoneWeights(setting,quota,version=148){return version===148?[1]:atZoneWeights(setting,false,true).map((w,i)=>initialZoneAllowed(zoneIds[i],quota,version)?w:0);}
 function pickInitialZone(setting,quota,rng=Math.random,version=148){return (version===148?initialZoneIds:zoneIds)[weightedChallenge(initialZoneWeights(setting,quota,version),rng)];}
 function initialZoneForQuota(zone,quota,version=148){return initialZoneAllowed(zone,quota,version)?zone:version===148?'kushuri_nito':zone==='sosuke'?'toto':zone==='ura_giru'?'ura_sora':'sora';}
 function rouletteZones(flow){return flow?.initialStage==='entry'?(flow.initialVersion===148?initialZoneIds:zoneIds.filter(z=>!z.startsWith('ura_')&&initialZoneAllowed(z,flow.entryQuota,131))):zoneIds.filter(z=>!z.startsWith('ura_'));}
 function initialPlan(target,rng,ladder=false){
  const plan=Array(5).fill(0),units=Math.floor(Number(target)/50);
  const order=[0,1,2,3,4];for(let i=4;i>0;i--){const j=Math.min(i,Math.floor(rng()*(i+1)));[order[i],order[j]]=[order[j],order[i]];}
  const hits=ladder?5:3+Math.min(2,Math.floor(rng()*3));
  for(let i=0;i<hits;i++)plan[order[i]]=50;
  for(let i=hits;i<units;i++)plan[order[Math.min(hits-1,Math.floor(rng()*hits))]]+=50;
  return plan;
 }
 function initialZone(s,rng){
  if(s.initialVersion===148){
   const hundreds=(Number(s.entryQuota)-150)/50;
   const plan=Array.from({length:3},(_,i)=>i<hundreds?100:50);
   for(let i=2;i>0;i--){const j=Math.min(i,Math.floor(rng()*(i+1)));[plan[i],plan[j]]=[plan[j],plan[i]];}
   return {...s,initialStage:'zone',initialPlan:plan,initialIndex:0,zoneLeft:3,award:'0',initialAward:'0',oumaPending:false,zero:false,ladder:[]};
  }
  const ladder=['sosuke','giru'].includes(s.zone),plan=initialPlan(s.entryQuota,rng,ladder);
  s.initialStage='zone';s.initialPlan=plan;s.initialIndex=0;s.zoneLeft=5;s.award='0';s.initialAward='0';s.oumaPending=false;s.zero=false;
  if(ladder){
   let total=0;s.ladder=plan.map(n=>{total+=n;return ladderValues.filter(pt=>pt<=total).at(-1)||ladderValues[0];});
   s.initialPlan=s.ladder.map((pt,i)=>pt-(s.ladder[i-1]||0));
   s.award=String(s.ladder[0]);s.initialAward=s.award;s.ladderIndex=0;s.ladderRevealed=false;
  }
  return s;
 }
 function stepInitialZone(value,options,rng,forced=''){
  let s=normalize(value);const family=zoneRules(s,config(options)).family,index=s.initialIndex++;let n=s.initialPlan[index]||0;
  s.zoneLeft=Math.max(0,(s.initialVersion===148?3:5)-s.initialIndex);let result='MISS',aim=null;
  if(s.initialVersion===148){
   result=initialRareAwards[forced]||['BELL','REPLAY','MISS'].includes(forced)?forced:drawInitialRole(options.setting,rng);
   n=initialRareAwards[result]??n;if(s.initialBoostActive)n*=s.initialMultiplier;s.initialPlan[index]=n;
   s.award=(integer(s.award)+BigInt(n)).toString();
  }else if(family==='ladder'){
   s.ladderRevealed=true;s.ladderIndex=index;s.award=String(s.ladder[index]);result=index===0?'MISS':rng()<.7?'REPLAY':'BELL';
  }else{
   s.award=(integer(s.award)+BigInt(n)).toString();result=n?(family==='seven'?'BIG':'SUPER_NOVA'):'MISS';
   if(family==='seven'){
    if(n)s.sevenHits++;
    const colors=aimColorsFor(s,config(options)),weights=colors.map(row=>row.weight*(n?row.hit:1-row.hit));
    aim={symbol:'seven',color:colors[weightedChallenge(weights,rng)].color,result,guide:!!n||rng()<.5,initialAward:true};
   }
  }
  const finished=s.zoneLeft===0;
  if(finished)s=settleZone(s);
  return {result,aim,flow:s,zoneAward:n,zoneSpin:true,initialAward:true,message:finished?`初期pt ${s.award}pt獲得！`:family==='ladder'?`${s.award}pt確保`:n?'＋'+n+'pt':'継続'};
 }
 // AT and bonus preparation own their role mix and rewards. Normal/CZ tuning must not affect them.
 const rareRoles=Object.freeze({"WEAK_SUICA":{"p":0.0265,"pay":6,"preparation":0.13189655172413794},"STRONG_SUICA":{"p":0,"pay":6,"preparation":0.3},"CHANCE_A":{"p":0,"pay":0,"preparation":0.15},"CHANCE_B":{"p":0,"pay":0,"preparation":0.15},"WEAK_NOVA":{"p":0.0025,"pay":0,"preparation":0.13189655172413794},"STRONG_NOVA":{"p":0.0005,"pay":0,"preparation":0.5}});
 const rareTotal=Object.values(rareRoles).reduce((sum,v)=>sum+v.p,0);
 const rareMean=Object.values(rareRoles).reduce((sum,v)=>sum+v.p*v.pay,0)/rareTotal;
 const rareFactor=(setting=3)=>1+.016*(Math.max(1,Math.min(6,Math.round(Number(setting)||3)))-3);
 const payout=role=>rareRoles[role]?.pay??(role==='BELL'?8:role==='BELL15'?15:0);
 function drawRare(rng=Math.random){let roll=rng()*rareTotal;for(const [role,v]of Object.entries(rareRoles))if((roll-=v.p)<0)return role;return 'STRONG_NOVA';}
 function preparationProbabilities(setting=3){return {...[{"WEAK_SUICA":0.025652,"STRONG_SUICA":0,"CHANCE_A":0,"CHANCE_B":0,"WEAK_NOVA":0.00242,"STRONG_NOVA":0.000484,"BELL":0.06427499120780303,"REPLAY":0.13311650015250695,"MISS":0.77405250863969},{"WEAK_SUICA":0.026076,"STRONG_SUICA":0,"CHANCE_A":0,"CHANCE_B":0,"WEAK_NOVA":0.00246,"STRONG_NOVA":0.000492,"BELL":0.06453819681751193,"REPLAY":0.13365326023376708,"MISS":0.772780542948721},{"WEAK_SUICA":0.026499999999999996,"STRONG_SUICA":0,"CHANCE_A":0,"CHANCE_B":0,"WEAK_NOVA":0.0025,"STRONG_NOVA":0.0005,"BELL":0.06480140242722081,"REPLAY":0.1341900203150272,"MISS":0.771508577257752},{"WEAK_SUICA":0.026923999999999997,"STRONG_SUICA":0,"CHANCE_A":0,"CHANCE_B":0,"WEAK_NOVA":0.00254,"STRONG_NOVA":0.000508,"BELL":0.06506460803692969,"REPLAY":0.1347267803962873,"MISS":0.770236611566783},{"WEAK_SUICA":0.027348000000000004,"STRONG_SUICA":0,"CHANCE_A":0,"CHANCE_B":0,"WEAK_NOVA":0.0025800000000000003,"STRONG_NOVA":0.0005160000000000001,"BELL":0.06532781364663857,"REPLAY":0.1352635404775474,"MISS":0.768964645875814},{"WEAK_SUICA":0.027772,"STRONG_SUICA":0,"CHANCE_A":0,"CHANCE_B":0,"WEAK_NOVA":0.0026200000000000004,"STRONG_NOVA":0.000524,"BELL":0.06559101925634746,"REPLAY":0.1358003005588075,"MISS":0.767692680184845}][Math.max(0,Math.min(5,Math.round(Number(setting)||3)-1))]};}
 const preparationEntries=[1,2,3,4,5,6].map(s=>Object.entries(preparationProbabilities(s)));
 function drawPreparationRole(setting,rng=Math.random){let roll=rng();for(const [role,p]of preparationEntries[Math.max(0,Math.min(5,Math.round(Number(setting)||3)-1))])if((roll-=p)<0)return role;return 'MISS';}
 function drawPreparation(role,setting=1,rng=Math.random){const rare=rareRoles[role];let sets=0,zones=[];if(rare){if(rng()<rare.preparation)sets++;if(rng()<rare.preparation*.5){zones.push(pickZone(setting,rng));sets=Math.max(1,sets);}}return {sets,zones};}
 // Bell payouts are capped to the BIG target.
 // Choose the per-game hazard so P(at least one NEBULA before the required bells)
 // equals the tier's 52% / 80%. Half of the misses have no guide.
 // Only additional wins after AT is secured are reduced. First-hit AT odds,
 // bell/replay frequencies and the 50pt BIG payout remain unchanged.
 const bonusStockRules=Object.freeze({version:146,factors:Object.freeze([0.705,0.705,0.705,0.705,0.705,0.6825])});
 const bonusStockFactor=setting=>bonusStockRules.factors[validSetting(setting)-1];
 const bonusStockEligible=(state,flow)=>flow?.phase==='art'||integer(state?.bonusArtSets)>0n;
 function bonusRoleProbabilities(setting,tier='normal',stockEligible=false){
  // Keep the old bell frequency and the first-hit 52/80% despite seven 8pt bells.
  const target=bonusRules[bonusTier(tier)].atChance,oldRatio=(1-target)**(-1/4)-1;
  const oldZero=4*oldRatio/(6-3*oldRatio),BELL=(4+3*oldZero)/12;
  const ratio=(1-target)**(-1/Math.ceil(bonusTarget()/8))-1,NEBULA=BELL*ratio;
  const factor=stockEligible?bonusStockFactor(setting):1;
  return {NEBULA:NEBULA*factor,MISS:NEBULA+NEBULA*(1-factor),BELL,REPLAY:1-BELL-2*NEBULA};
 }
 const bonusSpecial=bonusRoleProbabilities().NEBULA;
 const settingBias=[-2.7,-2.55,-2.27,-2.13,-1.8,-1.46];
 const biasFor=setting=>settingBias[Math.max(0,Math.min(5,Math.round(Number(setting)||1)-1))];
 const bonusSpecialRates=Array(6).fill(bonusSpecial);
 const bonusSpecialFor=(setting,tier='normal')=>bonusRoleProbabilities(setting,tier).NEBULA;
 function advanceBonus(state,special=false,reward=0){const target=bonusTarget(state.bonusKind),paid=Number(state.paid)||0;return {bonusTarget:target,bonusPointsRemaining:Math.max(0,target-paid-Math.max(0,Number(reward)||0)),bonusArtSets:(Number(state.bonusArtSets)||0)+(paid<target&&special?1:0)};}
 function bonusStockLabel(state,flow){
  const wins=integer(state?.bonusArtSets),continuing=flow?.phase==='art';
  const zones=(wins>(continuing?0n:1n)?wins-(continuing?0n:1n):0n)+BigInt(state?.bonusZones?.length||0);
  return (continuing?'':wins>0n?'AT確定 / ':'AT未獲得 / ')+'特化ストック'+zones+'個';
 }

 // Replay has no payout and makes the next BET free: net = (bellPay-3)*P(bell) + (otherPay-3)*P(other).
 function paidBellChance(otherChance=0,bellPay=15,otherPay=0){return Math.max(0,Math.min(1,(4-otherChance*(otherPay-3))/((1-otherChance)*(bellPay-3))));}
 function drawPaidRole(zeroChance=0,bellPay=15,rng=Math.random){return rng()<paidBellChance(zeroChance,bellPay)?'BELL':'REPLAY';}
 function drawBonus(rng=Math.random,setting,tier='normal',stockEligible=false){let roll=rng();for(const [role,p]of Object.entries(bonusRoleProbabilities(setting,tier,stockEligible)))if((roll-=p)<0)return role;return 'REPLAY';}
 function bonusAim(result,rng=Math.random,setting=1,stockEligible=false){
  if(!['NEBULA','MISS'].includes(result))return null;
  // Half of misses still have a guide. Adjust the color mix to its new guided
  // success prior, preserving blue/red/rainbow confidence at 20/80/100%.
  const factor=stockEligible?bonusStockFactor(setting):1,guidedHit=2*factor/(2+factor);
  const red=factor===1?128/180:(guidedHit-.24)/.6;
  const colors=[{color:'blue',weight:factor===1?43/180:.95-red,hit:.2},{color:'red',weight:red,hit:.8},{color:'rainbow',weight:.05,hit:1}],success=result==='NEBULA',weights=colors.map(row=>row.weight*(success?row.hit:1-row.hit));
  let roll=rng()*weights.reduce((a,b)=>a+b,0),index=weights.findIndex(w=>(roll-=w)<0);if(index<0)index=success?2:0;
  return {symbol:'nebula',color:colors[index].color,result,guide:success||rng()<.5,forced:false};
 }
const tuning={"weak":128,"strong":1500,"other":1.15,"tilts":[-0.28,-0.28,-0.28,0.1,0.2,0.38]};
 function atMix(setting=3){
  const r={WEAK_SUICA:0.03099152542372881,STRONG_SUICA:0,CHANCE_A:0,CHANCE_B:0,WEAK_NOVA:0.0078125,STRONG_NOVA:0.0006666666666666666};
  const chance=Object.values(r).reduce((a,b)=>a+b,0),mean=6*r.WEAK_SUICA/chance;return {r,chance,mean};
 }
 function drawAtRare(setting,rng){const {r,chance}=atMix(setting);let roll=rng()*chance;for(const [role,p]of Object.entries(r))if((roll-=p)<0)return role;return 'STRONG_NOVA';}
 function roleProbabilities(setting=3,upper=false){
  const {r,chance,mean}=atMix(setting),share=upper?1:0.5,target=upper?8:5;
  const bell=(target-chance*(mean-3))/(5+7*share);
  return {...r,BELL:bell*(1-share),BELL15:bell*share,REPLAY:1-chance-bell};
 }
 function drawAtRole(setting,upper,rng){let roll=rng();for(const [role,p]of Object.entries(roleProbabilities(setting,upper)))if((roll-=p)<0)return role;return 'REPLAY';}
 const zoneEntryScale=[0.405,0.475,0.415,0.5,0.485,0.485];
 // Normalize by actual rare-role frequency, preserving the average AT zone entry rate.
 const zoneRoleWeights=Object.freeze({WEAK_SUICA:1,STRONG_SUICA:10,CHANCE_A:8/3,CHANCE_B:8/3,WEAK_NOVA:1,STRONG_NOVA:10});
 function zoneRoleMultiplier(role){let weighted=0;for(const [key,v]of Object.entries(rareRoles))weighted+=v.p*(zoneRoleWeights[key]||1);return (zoneRoleWeights[role]||1)*rareTotal/weighted;}
 const direct=[1400,1320,1240,1160,1080,1000];
 const validSetting=x=>Math.max(1,Math.min(6,Math.round(Number(x)||1)));
 const integer=x=>{try{return BigInt(String(x??0))<0n?0n:BigInt(String(x??0));}catch{return 0n;}};
 function config(v={}){if(v?.payoutVersion!==1&&v?.initial!=null)v={...v,initial:Number(points(v.initial)),payoutVersion:1};const c={...defaults};for(const k in c){const n=Number(v?.[k]);if(Number.isFinite(n))c[k]=k.startsWith('direct')?Math.max(2,Math.min(100000,Math.round(n))):k==='initial'?Math.max(1,Math.min(Number.MAX_SAFE_INTEGER,Math.round(n))):k.endsWith('Games')?Math.max(1,Math.min(1000,Math.round(n))):Math.max(0,Math.min(1,n));}c.zone=Math.min(c.zone,1-c.big);return c;}
 const baseZone=z=>String(z||'').replace(/^(ura_|normal_)/, '');
 const zoneName=v=>typeof v==='string'?(v.startsWith('ura_')?'裏':'')+(names[baseZone(v)]||''):(v?.ura?'裏':'')+(names[v?.zone]||'');
 const zoneIds=['sosuke','toto','urapi','giru','sora','ouma','ura_giru','ura_sora','ura_ouma'];
 const canonicalZone=z=>String(z||'').replace(/^ura_(sosuke|toto|urapi)$/,'$1');
 function normalize(v){
  // Revival awards its selected character zone, never a first-hit initial award.
  // Clear stale entry state before it can remap pendingZone (also on saved-game reload).
  if(v?.comebackLeft>0||v?.comebackConfirmed)v={...v,initialBoostActive:false,initialStage:'',initialWait:0,initialPlan:[],initialIndex:0};
  if(v?.burstLeft>0&&!v.researchChallengeActive)v={...v,burstLeft:0,burstPending:true,researchChallengeSource:'rare',researchAim:''};
  // Retire pending point challenges; never subtract points or stocks already earned.
  if(v?.burstVersion!==2&&v?.burstType!=='ura')v={...v,burstUsed:false,burstPending:false,burstLeft:0,burstWon:false};
  // Close a saved legacy zone once, retaining earned points and existing stocks.
  if(v?.zone&&v.zoneVersion!==2){v={...v,remaining:(integer(v.remaining)+(baseZone(v.zone)==='sora'?0n:integer(v.award))).toString(),zone:'',zoneLeft:0,zero:false,oumaPending:false,award:'0'};}
  v={...v,pendingZone:canonicalZone(v?.pendingZone),queuedZones:v?.queuedZones?.map(canonicalZone)};
if(v?.payoutVersion!==1)v={...v,remaining:points(v?.remaining).toString(),award:points(v?.award).toString(),initialAward:points(v?.initialAward).toString(),payoutVersion:1};return {...initialFields(v),atPrelude:normalizeAtPrelude(v?.atPrelude),entryQuota:integer(v?.entryQuota).toString(),setQuota:integer(v?.setQuota??300).toString(),comebackLeft:Math.max(0,Math.min(comebackRules.games,Math.floor(Number(v?.comebackLeft)||0))),comebackLamp:zoneIds.includes(v?.comebackLamp)?v.comebackLamp:'',comebackConfirmed:!!v?.comebackConfirmed,burstVersion:2,burstType:'ura',burstUsed:!!v?.burstUsed,burstPending:!!v?.burstPending,burstLeft:Math.max(0,Math.min(10,Math.floor(Number(v?.burstLeft)||0))),burstWon:!!v?.burstWon,dryEligible:v?.dryEligible===true,rouletteTable:[6,7].includes(v?.rouletteTable)?v.rouletteTable:0,sevenHits:Math.max(0,Math.floor(Number(v?.sevenHits)||0)),zoneVersion:2,ladder:Array.isArray(v?.ladder)?v.ladder.slice(0,5):[],ladderIndex:Math.max(0,Math.min(4,Math.floor(Number(v?.ladderIndex)||0))),ladderRevealed:!!v?.ladderRevealed,atHigh:!!v?.atHigh,atHighLeft:v?.atHigh?Math.max(0,Math.floor(Number(v?.atHighLeft)||0)):0,entryStage:['seven','roulette','confirmed'].includes(v?.entryStage)?v.entryStage:'',pendingZone:v?.initialStage==='entry'?initialZoneForQuota(v.pendingZone,v.entryQuota,v.initialVersion===148?148:131):zoneIds.includes(v?.pendingZone)?v.pendingZone:'',payoutVersion:1,queuedZones:Array.isArray(v?.queuedZones)?v.queuedZones.filter(z=>z==='kushuri_nito'||zoneIds.includes(z)||(String(z).startsWith('normal_')&&zoneIds.includes(z.slice(7)))):[],phase:'art',remaining:integer(v?.remaining).toString(),zone:v?.initialVersion===148&&v?.initialStage==='zone'&&initialZoneId(v.zone)?'kushuri_nito':names[baseZone(v?.zone)]?baseZone(v.zone):'',ura:!!v?.ura||String(v?.zone||'').startsWith('ura_'),zoneLeft:Math.max(0,Math.floor(Number(v?.zoneLeft)||0)),award:integer(v?.award).toString(),initialAward:integer(v?.initialAward).toString(),stock:integer(v?.stock).toString(),zoneSets:integer(v?.zoneSets).toString(),zoneZones:integer(v?.zoneZones).toString(),sets:integer(v?.sets).toString(),oumaPending:!!v?.oumaPending,zero:!!v?.zero,color:v?.color||'white',awardTier:[1,4,10,70].includes(v?.awardTier)?v.awardTier:4,giruVersion:v?.giruVersion===3?3:0,giruBase:Math.min(5,Math.max(0,Math.floor(Number(v?.giruBase)||0))),giruContinues:Math.max(0,Math.floor(Number(v?.giruContinues)||0)),giruSetting:validSetting(v?.giruSetting)};}
 function enter(c,rng=Math.random,freshInitial=false){const entryQuota=drawEntryQuota(c,rng,freshInitial);return normalize({modelSetting:validSetting(c?.setting),burstVersion:burstRules.version,dryEligible:true,payoutVersion:1,remaining:entryQuota,entryQuota,setQuota:config(c).initial});}
 const ladderValues=[50,100,200,300,500,1000,2000,3000];
 const sharedLadderTables=[[50,100,200,300,500],[50,50,500,500,1000],[100,200,300,500,1000],[100,100,500,1000,2000],[200,300,500,1000,2000],[300,500,1000,2000,3000],[50,2000]];
 const ladderTables={sosuke:sharedLadderTables,giru:sharedLadderTables,ura_giru:sharedLadderTables};
 const ladderWeightBases={sosuke:[40,25,18,8,5,2,2],giru:[20,20,25,15,12,5,3],ura_giru:[8,10,22,22,23,10,5]};
 function ladderWeightsFor(s,setting=s.giruSetting){if(s.zone==='giru'&&s.ura)return [0,0,0,0,0,100,0];const id=(s.ura?'ura_':'')+s.zone,base=ladderWeightBases[id]||ladderWeightBases.sosuke;const weights=base.map((v,i)=>i<5?v+(validSetting(setting)-1)*[-.6,-.4,0,0,.6,.4,0][i]:0),total=weights.reduce((a,b)=>a+b,0);return weights.map(v=>v*100/total);}
 function pickLadder(s,setting,rng){const rows=ladderTableFor(s),weights=ladderWeightsFor(s,setting);let r=rng()*100,i=weights.findIndex(w=>(r-=w)<0);return rows[i<0?rows.length-1:i].slice();}
 function ladderGuaranteed(s){return s.zone==='giru'&&s.ladder?.length!==2&&(s.ura?integer(s.award)<=300n:integer(s.award)<100n);}
 function drawLadderRole(s,c,rng){const p=ladderGuaranteed(s)?1:zoneRules(s,c).success,r=rng();return r<p*.7?'REPLAY':r<p?'BELL':'MISS';}
 const ladderTableFor=s=>ladderTables[(s.ura?'ura_':'')+s.zone]||ladderTables[s.zone];
 const sevenValues=[100];
 const sevenWeights={toto:[1],sora:[1],ura_sora:[1]};
 const aimColors=Object.freeze([{color:'blue',weight:.60,hit:.20},{color:'red',weight:.35,hit:.80},{color:'rainbow',weight:.05,hit:1}].map(Object.freeze));
 function sevenAimRules(s,c=defaults){const r=zoneRules(s,c),reset=r.reset,hit=Math.min(r.hit,1-reset),total=hit+reset;return {nebula:total?reset/total:0,reset,hit};}
 function aimColorsFor(s,c=defaults){
  const rates=sevenAimRules(s,c),total=Math.max(.2,rates.hit+rates.reset);
  const rainbow=total>.81?(total-.8)/.2:total>=.24?.05:0,red=Math.max(0,(total-.2-.8*rainbow)/.6);
  return [{color:'blue',weight:Math.max(0,1-red-rainbow),hit:.2},{color:'red',weight:red,hit:.8},{color:'rainbow',weight:rainbow,hit:1}];
 }
 function sevenGuaranteed(s,left=s.zoneLeft){
  const needed=s.zone==='sora'&&s.ura?Math.max(1-s.sevenHits,Math.ceil((500-Number(s.award))/100)):(s.zone==='sora'?2:1)-s.sevenHits;
  return needed>left;
 }
 function drawSevenAim(s,c,rng=Math.random,forced=''){
  if(forced)return {symbol:forced==='NEBULA'?'nebula':'seven',color:forced==='BIG'||forced==='NEBULA'?'rainbow':'blue',result:forced,forced:true};
  const rates=sevenAimRules(s,c),symbol=rng()<rates.nebula?'nebula':'seven';
  if(rates.hit+rates.reset<.2&&rng()>=(rates.hit+rates.reset)/.2)return {symbol,color:'blue',result:'MISS',guide:false,forced:false};
  let roll=rng();const colors=aimColorsFor(s,c),row=colors.find(r=>(roll-=r.weight)<0)||colors[2];
  const hit=rng()<row.hit;
  return {symbol,color:row.color,result:hit?(symbol==='nebula'?'NEBULA':'BIG'):'MISS',forced:false};
 }
 const zoneTailControl={threshold:2000,factor:1};
 function zoneAwardFactor(award,next=0){return 1;}
 function zoneRules(s,c=defaults){const id=(s.ura?'ura_':'')+s.zone;
  if(initialZoneId(s.zone))return {family:'initial'};
  if(['sosuke','giru'].includes(s.zone))return {family:'ladder',success:s.zone==='sosuke'?c.ladderSosuke:s.ura?c.ladderUraGiru:c.ladderGiru};
  if(['toto','sora'].includes(s.zone))return {family:'seven',hit:s.zone==='toto'?c.totoHit:s.ura?c.soraUraHit:c.soraHit,reset:Math.min(.3,s.zone==='toto'?c.totoReset:s.ura?c.soraUraReset:c.soraReset)*zoneAwardFactor(s.award),weights:sevenWeights[id]};
  return {family:'nova',awardMultiplier:s.zone==='ouma'&&s.ura?2:1,hit:s.zone==='urapi'?c.urapiSuper:s.ura?c.oumaUraSuper:c.oumaSuper,hundred:s.zone==='urapi'?.3:s.ura?.7:.5,freeze:oumaFreezeRate(s,c)};
 }
 function startZone(s,z,c,rng=Math.random){s=normalize(s);const setting=validSetting(c?.setting);z=canonicalZone(z);if(s.initialStage==='entry')z=initialZoneForQuota(z,s.entryQuota,s.initialVersion);const explicitUra=String(z).startsWith('ura_');z=baseZone(z);c=config(c);if(!names[z]||(initialZoneId(z)&&s.initialStage!=='entry'))return s;const ura=['giru','sora','ouma'].includes(z)&&explicitUra;const table=ladderTableFor({zone:z,ura});const special=s.entryStage==='confirmed'&&((s.rouletteTable===7&&z==='sosuke')||(s.rouletteTable===6&&z==='giru'))?s.rouletteTable:0;const ladder=['sosuke','giru'].includes(z)?(special?sharedLadderTables[special-1].slice():pickLadder({zone:z,ura},setting,rng)):[];const next={...s,comebackLeft:0,comebackLamp:'',comebackConfirmed:false,dryEligible:false,rouletteTable:0,sevenHits:0,zoneVersion:2,ladder,ladderIndex:0,ladderRevealed:false,ura,oumaPending:false,zoneZones:'0',zoneSets:'0',initialAward:ladder.length?String(ladder[0]):'0',giruSetting:setting,zone:z,zoneLeft:ladder.length||5,award:ladder.length?String(ladder[0]):'0',zero:false,color:'white'};if(s.initialStage==='entry'){next.dryEligible=s.dryEligible;return initialZone(next,rng);}return next;}
 function oumaFreezeRate(s,c){return Math.min(.95,s.zone==='urapi'?c.urapiFreeze:s.ura?c.oumaUraFreeze:c.oumaFreeze)*zoneAwardFactor(s.award,s.ura?200:100);}
 // Keep the saved `sets` counter, but consume each bonus stock as an ordinary
 // special zone. Choose once at BET, then use the usual seven/roulette entry.
 function prepareBonusStock(value,options,rng){
  if(value?.phase!=='art'||value.initialStage||value.atPrelude||value.zone||value.entryStage||value.queuedZones?.length||value.burstPending||value.burstLeft||integer(value.sets)===0n)return value;
  const s=normalize(value);s.sets=(integer(s.sets)-1n).toString();s.dryEligible=false;
  s.comebackLeft=0;s.comebackLamp='';s.comebackConfirmed=false;
  s.entryStage='seven';s.pendingZone=pickAtZone(options.setting,false,rng);s.giruSetting=validSetting(options.setting);s.rouletteTable=0;
  return s;
 }
 function prepareBet(value,options={},rng=Math.random){if(value?.researchSortieLeft)return value;value=prepareBonusStock(value,options,rng);if(value?.comebackLeft)return prepareComeback(value,options,rng);if(value?.entryStage==='confirmed'){const s=startZone(value,value.pendingZone,{...options,setting:value.giruSetting},rng);s.entryStage='';s.pendingZone='';return s;}if(!['ouma','urapi'].includes(value?.zone)||!value?.oumaPending)return value;const s=normalize(value);s.oumaPending=false;s.zero=rng()<oumaFreezeRate(s,config(options));if(!s.zero&&s.zoneLeft===0)return settleZone(s);return s;}
 // Restore only an actually charged BET during quota-consuming AT play.
 // Zones, preparation, challenges and comeback already suspend quota consumption.
 function restoreBetCost(value,charged){
  if(value?.phase!=='art'||!Number.isSafeInteger(charged)||charged<=0||integer(value.remaining)===0n||value.zero||value.zone||value.initialStage||value.entryStage||value.researchSortieLeft||value.burstPending||value.burstLeft||value.researchChallengeActive||value.comebackLeft||value.comebackConfirmed)return value;
  if(!value.atPrelude&&(value.queuedZones?.length||integer(value.stock)>0n||integer(value.sets)>0n))return value;
  return {...value,remaining:(integer(value.remaining)+BigInt(charged)).toString()};
 }
 function settleZone(value){const s=normalize(value);if(!s.zone)return s;s.remaining=(integer(s.remaining)+integer(s.award)).toString();s.zone='';s.color='white';s.zoneLeft=0;s.zero=false;s.oumaPending=false;if(s.initialStage==='zone'){s.initialBoostActive=false;s.initialStage='';s.initialWait=0;s.initialPlan=[];s.initialIndex=0;}return s;}
 function afterBonus(v,c,won=0,rng=Math.random){
  if(v?.phase!=='art'&&integer(won)>0n){const s=enterInitial(c,rng);s.sets=(integer(won)-1n).toString();s.dryEligible=integer(won)===1n;return s;}
  const continuing=v?.phase==='art',s=continuing?normalize(v):normalize({burstVersion:burstRules.version,setQuota:config(c).initial});
  s.dryEligible=v?.phase!=='art'?integer(won)===1n:false;s.sets=(integer(s.sets)+integer(won)).toString();
  if(s.initialStage)return s;
  if(integer(won)>0n){
   s.comebackLeft=0;
   if(!s.comebackConfirmed)s.comebackLamp='';
  }
  return integer(s.remaining)>0n||integer(s.sets)>0n||integer(s.stock)>0n||s.zone||s.entryStage||s.queuedZones.length||s.comebackLeft||s.comebackConfirmed||s.atPrelude?s:{phase:'normal',remaining:0,success:false};
 }

 const atRoleRules={"WEAK_SUICA":{"up":0.15,"hit":0.1793235237913243,"values":[10,20,30,50,100,300],"weights":[0.4012605042016807,0.3993697478991597,0.17205882352941176,0.026764705882352944,0.0004915966386554622,0.0000546218487394958]},"WEAK_NOVA":{"up":0.15,"hit":0.1793235237913243,"values":[10,20,30,50,100,300],"weights":[0.4012605042016807,0.3993697478991597,0.17205882352941176,0.026764705882352944,0.0004915966386554622,0.0000546218487394958]}};
 function zoneGroupWeights(setting,boost=false,preparation=false){
  const groups=NovaTuning.profile(setting).groups;
  if(groups&&!preparation){const row=groups.map((p,i)=>p*(boost&&i>0?2:1)),total=row.reduce((a,b)=>a+b,0);return row.map(p=>p*100/total);}
  const row=zoneWeights[validSetting(setting)-1].map((w,i)=>w*(boost&&i>=3?2:1)*Math.exp((preparation?0:tuning.tilts[validSetting(setting)-1])*i));
  const total=row.reduce((a,b)=>a+b,0),weak=row.slice(0,3).reduce((a,b)=>a+b,0)/total;
  return [weak*100,(1-weak)*(1-superZoneChance)*100,(1-weak)*superZoneChance*100];
 }
 function atZoneWeights(setting,boost=false,preparation=false){return zoneGroupWeights(setting,boost,preparation).flatMap(p=>[p/3,p/3,p/3]);}
 function pickAtZone(setting,boost=false,rng=Math.random,preparation=false){
  const row=atZoneWeights(setting,boost,preparation);let roll=rng()*100;const i=row.findIndex(w=>(roll-=w)<0);return zoneIds[i<0?8:i];
 }
 // Retired quota/payout guards stay disabled. v170 changes only future draw rates.
 const netLimits=Object.freeze([0,0,0,0,0,0]);
 const lossRewardControl=Object.freeze({enabled:false,threshold:-2000,multiplier:1});
 const netRewardControl=Object.freeze({enabled:false,startRatio:0,floor:1});
 function netRewardFactor(){return 1;}
 function extraZoneChance(setting,role,upper=false,high=false){
  if(!['WEAK_SUICA','WEAK_NOVA'].includes(role))return 0;
  // Common to every setting; the high state before this role determines the draw.
  return high?.25:.15;
 }
 function resolveAtRole(s,role,setting,rng=Math.random,netPt=0){
  const rules=commonAtRulesFor(setting),wasHigh=!!s.atHigh,held=wasHigh&&s.atHighLeft>0;
  const out={wasHigh,direct:0,zone:'',promoted:false,rewardFactor:1};if(held)s.atHighLeft--;
  const drawAmount=rule=>{let r=rng();const i=rule.weights.findIndex(w=>(r-=w)<0);return rule.values[i<0?rule.values.length-1:i];};
  const shared=atRoleRules[role];
  if(shared){
   if(!wasHigh&&rng()<.15){s.atHigh=true;s.atHighLeft=10;out.promoted=true;}
   if(rng()<Math.min(1,shared.hit*rules.direct))out.direct=drawAmount(shared);
   if(rng()<Math.min(1,extraZoneChance(setting,role,false,wasHigh)))out.zone=pickAtZone(setting,false,rng);
  }
  if(role==='STRONG_NOVA'){
   const r=rng();
   if(r<.2||r>=.4&&r<.6)out.direct=drawAmount({"up":0.5,"hit":0.5,"values":[20,30,50,100,300],"weights":[0.6,0.3,0.098,0.0018,0.0002]});
   if(r>=.2&&r<.6)out.zone=pickAtZone(setting,wasHigh,rng);
  }
  if(s.researchUpper)out.direct=out.direct*1.5;
  if(wasHigh&&!held&&(role==='REPLAY'||role==='MISS')&&rng()<(role==='REPLAY'?.05:.08)){s.atHigh=false;s.atHighLeft=0;}
  return out;
 }
 function step(value,options={},rng=Math.random,forced=''){
  if(forced==='STRONG_BELL')forced='BELL';
  if(forced==='STRONG_SUICA')forced='WEAK_SUICA';
  if(forced==='CHANCE_A'||forced==='CHANCE_B')forced='MISS';
  const c=config(options);if(options.setting){c.rare=Math.min(.99,c.rare*rareFactor(options.setting));const factor=(1+.2*biasFor(options.setting))*zoneEntryScale[validSetting(options.setting)-1];c.big=Math.min(1,c.big*factor);c.zone=Math.min(1-c.big,c.zone*factor);}let s=normalize(prepareBet(value,options,rng)),freeOumaSpin=['ouma','urapi'].includes(s.zone)&&s.zero,result='MISS',message='',internalBonus=null,reverse=false,queuedEntered=false;
  let atOutcome=null,aim=null,zoneAward=0,atPrelude=null,zoneStartFlow=null;const finish=()=>{const z=s.zone,name=zoneName(s);s=settleZone(s);message=`${name}ゾーン終了 / ${'＋'+s.award+'pt'}`;};
  if(s.researchSortieLeft){
  const result=drawInitialRole(options.setting,rng);s.researchSortieLeft--;
  const natural=rng()<s.researchSortieRate;
  const guaranteed=!natural&&s.researchSortieHits+s.researchSortieLeft<2;
  let selected='';if(natural||guaranteed){s.researchSortieHits++;let r=rng();const weights=NovaTuning.profile(options.setting).weights;const i=weights.findIndex(w=>(r-=w)<0);selected=[...zoneIds,'kushuri_nito'][i<0?9:i];s.queuedZones.push(selected);}
  return {result,flow:s,researchSortie:{rate:s.researchSortieRate,won:natural||guaranteed,guaranteed,zone:selected,finished:s.researchSortieLeft===0,hits:s.researchSortieHits}};
 }
 if(s.initialStage==='wait'){
   result=drawPreparationRole(options.setting,rng);s.initialWait=Math.max(0,s.initialWait-1);
   if(!s.initialWait){s.initialStage='entry';s.entryStage='seven';s.pendingZone=pickInitialZone(options.setting,s.entryQuota,rng,s.initialVersion);s.giruSetting=validSetting(options.setting);}
   return {result,flow:s,initialAward:true,message:s.initialWait?'AT準備中 / 残り'+s.initialWait+'G':'初期pt獲得ゾーンへ / 赤7を狙え！'};
  }
  if(s.initialStage==='zone'&&s.zone)return stepInitialZone(s,options,rng,forced);

  if(!s.atPrelude&&((s.burstPending&&!s.zone&&!s.entryStage)||s.researchChallengeActive)){
   const started=!s.researchChallengeActive;
   if(started){s.researchChallengeActive=true;s.burstLeft=10;s.burstPending=true;s.burstUsed=true;s.researchAim='';s.researchChallengeSource=s.researchChallengeSource||'rare';}
   const source=s.researchChallengeSource,priorAim=s.researchAim;
   if(started){const pinned=s.researchChallengeSuccess;delete s.researchChallengeSuccess;if(source==='threshold'&&Number.isFinite(pinned??options.thresholdSuccess))s.researchChallengeSuccess=pinned??options.thresholdSuccess;}
   const targetChance=s.researchChallengeSuccess;
   let roll=rng();const mix={...atMix(options.setting).r,BELL:.05,REPLAY:.05};mix.MISS=1-Object.values(mix).reduce((a,b)=>a+b,0);
   const role=rareRoles[forced]||['BELL','REPLAY','MISS','SUPER_NOVA'].includes(forced)?forced:Object.entries(mix).find(([k,p])=>(roll-=p)<0)?.[0]||'MISS';
   const isRare=!!rareRoles[role]||role==='SUPER_NOVA';if(!priorAim&&role==='MISS')s.burstLeft--;
   let won=false;result=role;
   if(priorAim){won=priorAim==='rare'||isRare||rng()<(source==='threshold'&&targetChance!==undefined?challengeAimChance(targetChance,options.setting):challengeAimChance(source==='initial'?.5:.65,options.setting));s.researchAim='';result=won?'SUPER_NOVA':'MISS';}
   else if(isRare)s.researchAim='rare';
   else if(['BELL','REPLAY'].includes(role))s.researchAim='common';
   const finished=won||(!s.burstLeft&&!s.researchAim);
   if(finished){s.burstLeft=0;s.burstPending=false;s.researchChallengeActive=false;s.researchAim='';s.researchChallengeSource='';delete s.researchChallengeSuccess;}
   if(won){s.researchUpper=true;s.burstWon=true;s.dryEligible=false;s.researchThresholdPending=false;}
   return {result,flow:s,zoneSpin:true,burstEvent:won?'success':finished?'failure':'continue',researchChallenge:{...(targetChance!==undefined?{targetChance}:{}),started,source,role,priorAim,nextAim:s.researchAim,won,finished,left:s.burstLeft}};
  }
  if(s.comebackLeft)return stepComeback(s,options,rng,forced);
  if(s.entryStage==='seven'){s.entryStage='roulette';return {result:'BIG',flow:s,zoneSpin:true,message:'赤7揃い！ 特化ゾーンルーレット'};}
  if(s.entryStage==='roulette'){
   const mix=atMix(options.setting);result=rareRoles[forced]?forced:(rng()<mix.chance?drawAtRare(options.setting,rng):'MISS');
   const rates={WEAK_SUICA:0.20554584914416751,WEAK_NOVA:0.20554584914416751,STRONG_NOVA:1};
   s.rouletteTable=0;
   if(!s.initialStage&&rates[result]&&rng()<rates[result]){s.rouletteTable=rng()<.8?6:7;s.pendingZone=s.rouletteTable===7?'sosuke':rng()<.8?'giru':'ura_giru';}
   s.entryStage='confirmed';return {result,flow:s,zoneSpin:true,message:zoneName(s.pendingZone)+'ゾーン確定！'+(s.rouletteTable?' テーブル'+s.rouletteTable+'昇格':'')};
  }
  if(!s.zone&&forced==='BIG'){s.entryStage='roulette';s.giruSetting=validSetting(options.setting);s.pendingZone=pickZone(options.setting,rng);return {result:'BIG',flow:s,zoneSpin:true,message:'赤7揃い！ 特化ゾーンルーレット'};}
  if(forced.startsWith('ZONE_')){s=startZone(s,forced.slice(5),{...c,setting:options.setting},rng);return {atOutcome,result,flow:s,message:zoneName(s)+'ゾーン突入'};}
  if(!s.zone&&!s.atPrelude&&s.queuedZones.length){queuedEntered=true;const z=s.queuedZones.shift();if(z==='kushuri_nito'){
  s.initialVersion=148;s.initialStage='entry';s.entryQuota=String(drawEntryQuota(c,rng));
  s=startZone(s,z,{...c,setting:options.setting},rng);const started=normalize(s);return {...stepInitialZone(s,options,rng,forced),zoneStartFlow:started};
 }s=startZone(s,z,{...c,setting:options.setting,allowUra:true},rng);zoneStartFlow=normalize(s);}
  if(!s.zone&&!s.atPrelude&&integer(s.stock)>0n){s.stock=(integer(s.stock)-1n).toString();return {result:'MISS',flow:s,internalBonus:{kind:'BIG',source:'空ゾーンストック',internalResult:'BIG'}};}
  if(!s.zone&&!s.atPrelude&&integer(s.remaining)===0n)return stepComeback(beginComeback(s),options,rng,forced);
  const mix=atMix(options.setting);c.rare=mix.chance;const roll=rng();result=s.zone?(roll<.6?'REPLAY':roll<.9?'BELL':'MISS'):drawAtRole(options.setting,s.researchUpper,rng);
  if(['NEBULA','MISS','BELL','BELL15','REPLAY','WEAK_NOVA','STRONG_NOVA','SUPER_NOVA'].includes(forced))result=forced;
  if(s.zone){
   const rules=zoneRules(s,c),free=s.zero;
   // Ladder entry seeds its base amount before it is revealed. Report only the
   // newly secured points; settlement transfers the total without awarding it twice.
   const awardBefore=rules.family==='ladder'&&!s.ladderRevealed?0n:integer(s.award);
   if(!free)s.zoneLeft=Math.max(0,s.zoneLeft-1);
   if(rules.family==='ladder'){
    result=forced||drawLadderRole(s,c,rng);
    if(!s.ladderRevealed){s.ladderRevealed=true;result='MISS';message=zoneName(s)+' '+s.award+'pt確保 / '+s.ladder.join(' → ')+'pt';}
    else if(result==='MISS'){finish();}
    else {s.ladderIndex=Math.min(s.ladder.length-1,s.ladderIndex+1);s.award=String(s.ladder[s.ladderIndex]);message=zoneName(s)+' 突破！ '+s.award+'pt確保';if(!s.zoneLeft||s.ladderIndex===s.ladder.length-1)finish();}
   }else if(rules.family==='seven'){
    aim=drawSevenAim(s,c,rng,forced);
    if(aim.result!=='NEBULA'&&sevenGuaranteed(s))aim={symbol:'seven',color:'rainbow',result:'BIG',forced:false,guaranteed:true};
    result=aim.result;
    if(result==='NEBULA'){s.award=(integer(s.award)+10n).toString();s.zoneLeft=5;message=zoneName(s)+' nebula揃い！ ＋10pt / 残り5Gへリセット';}
    else if(result==='BIG'){s.sevenHits++;s.award=(integer(s.award)+100n).toString();message=zoneName(s)+' 7揃い！ ＋100pt';}
    else message='7・nebulaを狙え';
    // An old save may have too few games left for the former lump-sum floor.
    // Finish its guarantee with further 100pt wins instead of a larger award.
    if(!s.zoneLeft&&sevenGuaranteed(s,0))s.zoneLeft=1;
    if(!s.zoneLeft)finish();
   }else{
    result=free?'SUPER_NOVA':forced|| (rng()<rules.hit?'SUPER_NOVA':'MISS');
    const minimum=s.zone==='urapi'?50:s.zone==='ouma'?(s.ura?500:100):0;
    const guaranteeNoFreeze=s.zone==='ouma'&&!s.ura&&!free&&!s.zoneLeft&&integer(s.award)<100n&&result!=='SUPER_NOVA';
    if(!s.zoneLeft&&!free&&integer(s.award)<BigInt(minimum))result='SUPER_NOVA';
    if(result==='SUPER_NOVA'){const n=Math.max((rng()<rules.hundred?100:50)*rules.awardMultiplier,!s.zoneLeft&&!free?minimum-Number(s.award):0);if(!free&&!forced&&zoneAwardFactor(s.award,n)<1&&rng()>=zoneTailControl.factor){result='MISS';message='スーパーノヴァを狙え';}else{s.award=(integer(s.award)+BigInt(n)).toString();message=(free?'逢魔フリーズ！ 0G連 / ':'')+zoneName(s)+' スーパーノヴァ揃い ＋'+n+'pt';}}
    else message='スーパーノヴァを狙え';
    s.oumaPending=['ouma','urapi'].includes(s.zone)&&result==='SUPER_NOVA'&&!guaranteeNoFreeze;s.zero=false;
    if(!s.zoneLeft&&!s.oumaPending)finish();
   }
   zoneAward=Math.max(0,Number(integer(s.award)-awardBefore));
  }else{
   // Remaining AT points are consumed by actual payout after role selection.
   const rare=forced==='RARE'||!!rareRoles[forced];if(rare)result=rareRoles[forced]?forced:drawAtRare(options.setting,rng);
   atOutcome=resolveAtRole(s,result,options.setting,rng,options.netPt);
   if(!s.researchUpper&&!s.researchThresholdPending&&s.burstVersion===burstRules.version&&!s.burstUsed&&burstRules.roles[result]&&rng()<burstChance(result,options.setting)){s.burstUsed=true;s.burstPending=true;s.burstType='ura';s.researchChallengeSource='rare';}
   if(atOutcome.direct){s.dryEligible=false;s.remaining=(integer(s.remaining)+BigInt(atOutcome.direct)).toString();message='直乗せ＋'+atOutcome.direct+'pt';}
   atPrelude=advanceAtPrelude(s,result,atOutcome,rng);
   if(atPrelude?.confirmed){s.giruSetting=validSetting(options.setting);message='特化ゾーン確定！ 赤7を狙え';}
   const paid=s.entryStage||s.burstPending?0n:BigInt(payout(result));s.remaining=(integer(s.remaining)>paid?integer(s.remaining)-paid:0n).toString();
   if(!s.zone&&!s.entryStage&&!s.burstPending&&!s.atPrelude&&!internalBonus&&integer(s.remaining)===0n){message='引き戻しゾーン突入 / 残り5G';return {atPrelude,atOutcome,result,flow:beginComeback(s),comebackEvent:'entry',message};}
  }
  if(s.burstPending&&!value.burstPending)message+=(message?' / ':'')+challengeName(s)+'獲得！';
  return {atPrelude,atOutcome,aim,zoneAward,result,flow:s,message,internalBonus,reverse,oumaFreeze:freeOumaSpin,zoneSpin:!!value.zone||queuedEntered,...(zoneStartFlow?{zoneStartFlow}:{})};
 }
 function label(v){const s=normalize(v);if(s.researchSortieLeft)return 'ノヴァ出陣 / 残り'+s.researchSortieLeft+'G / ストック'+s.researchSortieHits+'個';if(s.researchChallengeActive||s.burstPending)return '上位ATチャレンジ / '+(s.researchAim?'ノヴァを狙え / HOLD':'残り'+(s.burstLeft||10)+'G');if(s.initialStage)return s.initialStage==='wait'?'AT準備中 / 残り'+s.initialWait+'G':s.initialStage==='entry'?'初期pt獲得ゾーン / '+({seven:'赤7を狙え！',roulette:'キャラルーレット',confirmed:zoneName(s.pendingZone)+'ゾーン確定'}[s.entryStage]||'準備中'):'初期pt獲得 / '+zoneName(s)+' 残り'+s.zoneLeft+'G / 確保'+s.award+'pt';if(s.atPrelude)return 'AT '+s.remaining+'pt / 特化ゾーン前兆';if(s.comebackLeft)return '引き戻しゾーン 残り'+s.comebackLeft+'G / ランプ点灯でAT復活';if(s.comebackConfirmed)return '引き戻し成功！ '+zoneName(s.pendingZone)+'ゾーン / AT復活';return (s.researchUpper?('上位AT / '):s.burstLeft?challengeName(s)+' 残り'+s.burstLeft+'G / ':s.burstPending?challengeName(s)+'待機 / ':'')+`AT ${s.remaining}pt / 特化ストック${integer(s.sets)+BigInt(s.queuedZones.length)}個${s.entryStage?' / '+({seven:'赤7を狙え・減算停止',roulette:'ルーレット・減算停止',confirmed:zoneName(s.pendingZone)+'ゾーン確定'}[s.entryStage]):''}${s.zone?' / '+zoneName(s)+' '+(s.zero?'0G連':s.oumaPending?'BETで継続抽選':s.zoneLeft+'G'):''}${integer(s.stock)>0n?' / BIGストック '+s.stock:''}${s.zone?' / 獲得'+s.award+'pt':''}`;}
  function beginResearchSortie(value,rng=Math.random,setting=value?.modelSetting||3){
  const s=normalize(value);let r=rng();const i=NovaTuning.profile(setting).tiers.findIndex(w=>(r-=w)<0);
  s.researchSortieRate=[.1,.25,.4,.6,.8][i<0?4:i];s.researchSortieLeft=10;s.researchSortieHits=0;
  s.comebackLeft=0;s.comebackConfirmed=false;s.comebackLamp='';s.zero=false;s.dryEligible=false;return s;
 }
 return {restoreBetCost,extraZoneChance,commonAtRulesFor,entryWeights:researchEntryWeights,beginResearchSortie,atPreludeRules,initialRareAwards,initialZoneIds,rouletteZones,sevenGuaranteed,initialBoostRules,entryQuotaRules,initialZoneAllowed,initialZoneWeights,pickInitialZone,drawEntryQuota,enterInitial,challengeName,burstReward,comebackRules,comebackChance,comebackRoleProbabilities,drawComebackRole,beginComeback,prepareComeback,stepComeback,burstRules,burstChance,commonAtRules,bonusRules,bonusTier,drawBonusTier,bonusLabel,bonusPayout,bonusAim,aimColors,aimColorsFor,sevenAimRules,drawSevenAim,ladderWeightsFor,ladderGuaranteed,drawLadderRole,lossRewardControl,zoneTailControl,zoneAwardFactor,netRewardControl,netLimits,netRewardFactor,superZoneChance,zoneGroups,zoneGroupWeights,upgradeGuaranteedZone,bonusSpecialRates,zoneRules,ladderTables,ladderTableFor,ladderValues,sevenValues,sevenWeights,atZoneWeights,tuning,atMix,drawAtRare,atRoleRules,pickAtZone,resolveAtRole,rareRoles,rareTotal,rareMean,rareFactor,drawRare,roleProbabilities,bonusRoleProbabilities,preparationProbabilities,drawPreparationRole,zoneRoleWeights,zoneRoleMultiplier,paidBellChance,drawPreparation,zoneEntryScale,points,bonusTarget,payout,settleZone,prepareBet,oumaFreezeRate,baseZone,zoneName,zoneIds,names,defaults,direct,zoneWeights,pickZone,bonusSpecial,settingBias,biasFor,bonusSpecialFor,advanceBonus,bonusStockLabel,bonusStockRules,bonusStockFactor,bonusStockEligible,drawPaidRole,drawBonus,config,normalize,enter,startZone,afterBonus,step,label};
})();
