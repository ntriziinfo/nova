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
 // Approved 2026-10-14: fewer initial/rare entries, stronger upper-AT zone draws.
 const upperAtRules=Object.freeze({weakZoneMultiplier:12,weakZoneMultipliers:Object.freeze([12,12,12,12,12,12]),entryFactors:Object.freeze([.35,.50,.40,.55,.48,.62])});
 const burstRules=Object.freeze({
  version:2,games:10,success:.65,initialSuccess:.5,initialEntry:.05,
  uraWeights:Object.freeze([1,1,1]),
  entry:Object.freeze([0.0225,0.033,0.0465,0.063,0.0615,0.021]),
  roles:Object.freeze({WEAK_SUICA:0.15839316425977998,WEAK_NOVA:0.15839316425977998,STRONG_NOVA:1})
 });
 function challengeName(){return 'スーパーノヴァチャレンジ';}
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
 function initialBurstChance(setting){return burstRules.initialEntry*balanceFor(setting).upperEntry;}
 function burstChance(role,setting){const i=validSetting(setting)-1;return (burstRules.roles[role]||0)*burstRules.entry[i]*balanceFor(setting).upperEntry;}
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
 // The visible weak-role hit frequency is common across settings.  Setting
 // character is assigned only after a hit through the balance profile below.
 function commonAtRulesFor(){return {...commonAtRules,groups:commonAtRules.groups};}
 const atPreludeRules=Object.freeze({minGames:3,maxGames:5});
 function normalizeAtPrelude(p){
  if(!p)return null;
  const total=Math.max(3,Math.min(5,Math.floor(Number(p.total)||3)));
  return {total,left:Math.max(1,Math.min(total-1,Math.floor(Number(p.left)||1))),zones:Array.isArray(p.zones)?p.zones.filter(z=>z===fixedSosukeZone||zoneIds.includes(z)):[]};
 }
 function advanceAtPrelude(s,role,outcome,rng){
  const started=!s.atPrelude;
  if(started&&!rareRoles[role]&&role!=='SUPER_NOVA')return null;
  if(started){const total=3+Math.min(2,Math.floor(rng()*3));s.atPrelude={total,left:total,zones:[]};}
  const p=s.atPrelude;
  if(outcome.zone){p.zones.push(outcome.fixed50?fixedSosukeZone:outcome.zone);if(outcome.extraZone)p.zones.push(outcome.extraZone);s.dryEligible=false;}
  p.left--;
  const event={before:0,after:p.left?1+Math.min(1,Math.floor(rng()*2)):p.zones.length?3:0,left:p.left,total:p.total,started};
  if(!p.left){
   if(p.zones.length){
    const awarded=p.zones.shift();s.pendingFixed50=awarded===fixedSosukeZone;s.pendingZone=s.pendingFixed50?'sosuke':awarded;s.queuedZones.push(...p.zones);s.entryStage='seven';s.rouletteTable=0;
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
 const legacyFreshInitialVersion=20261007;
 const previousFreshInitialVersion=20261027;
 const fixedFreshInitialVersion=2026102701;
 const freshInitialBases=Object.freeze([100,100,100,100,100,100]);
 const previousFreshInitialBases=Object.freeze([100,100,100,161,214,249]);
 const legacyFreshInitialRareAwards=Object.freeze({WEAK_SUICA:150,CHANCE_A:150,WEAK_NOVA:150,STRONG_SUICA:200,CHANCE_B:200,STRONG_NOVA:200,SUPER_NOVA:200});
 // New entries use a common 100pt base in each of three games. Weak roles add
 // 50pt and strong roles add 100pt. Preserve every historical rule version so
 // an already-started or saved AT resumes with its sealed value.
 const freshInitialRules=Object.freeze({version:2026102702,fixedVersion:fixedFreshInitialVersion,previousVersion:previousFreshInitialVersion,legacyVersion:legacyFreshInitialVersion,bases:freshInitialBases,previousBases:previousFreshInitialBases,quota:300,point:100,rareAwards:legacyFreshInitialRareAwards});
 function isFreshInitialRuleVersion(version){return [freshInitialRules.version,fixedFreshInitialVersion,previousFreshInitialVersion,legacyFreshInitialVersion].includes(version);}
 function freshInitialBase(setting,version=freshInitialRules.version){return version===previousFreshInitialVersion?previousFreshInitialBases[validSetting(setting)-1]:100;}
 function freshInitialAward(setting,role,version=freshInitialRules.version){const base=freshInitialBase(setting,version);if(version===fixedFreshInitialVersion)return base;return ['WEAK_SUICA','CHANCE_A','WEAK_NOVA'].includes(role)?base+50:['STRONG_SUICA','CHANCE_B','STRONG_NOVA','SUPER_NOVA'].includes(role)?base+100:base;}
 const researchEntryWeights=[[0.6354105832966211,0.3110670270748763,0.05076124418701584,0.0027611454414867057],[0.4827364503295663,0.3979165543666842,0.10933335303418432,0.010013642269564929],[0.3746442278235266,0.43514331313362564,0.1684706795608236,0.021741779482023913],[0.26914350346608706,0.4431467349623512,0.24321477350531298,0.044494988066248714],[0.19722305399838924,0.4247972702808942,0.30498922781372345,0.07299044790699304],[0.13019579613189197,0.38005441300255294,0.3698054804995187,0.11994431036603637]];
 function drawEntryQuota(c,rng=Math.random,freshInitial=false){const weights=!freshInitial&&Number.isInteger(c?.setting)&&c.setting>=1&&c.setting<=6?researchEntryWeights[c.setting-1]:entryQuotaRules.weights;const drawn=entryQuotaRules.values[weightedChallenge(weights,rng)];return freshInitial?freshInitialBase(c?.setting)*entryQuotaRules.games:drawn;}
 // Fresh ATs use the common three-game base; keep one multiplier draw for RNG continuity.
 // Retain multiplier values 2-5 for already-awarded saves, but never draw them anew.
 // The multiplier never changes subsequent AT roles, zones or comeback rewards.
 const initialBoostRules=Object.freeze({version:20261007,values:Object.freeze([1,2,3,4,5]),weights:Object.freeze([
  [1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],
  [1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0]
 ].map(Object.freeze))});
 function drawInitialMultiplier(setting,rng){return initialBoostRules.values[weightedChallenge(initialBoostRules.weights[validSetting(setting)-1],rng)];}
 // The base plan is sealed; rare roles in the duo zone can upgrade that game's award.
 const initialRareAwards=Object.freeze({WEAK_SUICA:100,CHANCE_A:100,WEAK_NOVA:100,STRONG_SUICA:200,CHANCE_B:200,STRONG_NOVA:200,SUPER_NOVA:200});
 // Initial and sortie games retain their existing cash role mix.
 function drawInitialRole(setting,rng){let roll=rng();for(const [role,p]of Object.entries(initialRoleProbabilities(setting)))if((roll-=p)<0)return role==='BELL15'?'BELL':role;return 'REPLAY';}

 // Plan the three actual roles once; saved games replay the same awards.
 function scriptedInitialRoles(setting,rng){return Array.from({length:3},()=>drawInitialRole(setting,rng));}
 function enterInitial(c,rng=Math.random){const s={...enter(c,rng,true),initialBoostActive:true,initialRuleVersion:freshInitialRules.version,initialVersion:148,initialPreparationVersion:preparationRules.version,remaining:'0',initialStage:'wait',initialWait:0,initialPlan:[],initialIndex:0};s.initialMultiplier=drawInitialMultiplier(c?.setting,rng);if(rng()<initialBurstChance(c?.setting)){s.burstPending=true;s.burstUsed=true;s.researchChallengeSource='initial';}return s;}
 function initialFields(v){return {initialRolePlan:Array.isArray(v?.initialRolePlan)?v.initialRolePlan.slice(0,3).map(role=>['BELL','REPLAY','MISS','WEAK_SUICA','WEAK_NOVA','STRONG_NOVA'].includes(role)?role:'MISS'):[],initialRuleVersion:isFreshInitialRuleVersion(v?.initialRuleVersion)?v.initialRuleVersion:0,initialPreparationVersion:v?.initialPreparationVersion===preparationRules.version?preparationRules.version:0,initialBoostActive:!!v?.initialBoostActive,initialMultiplier:initialBoostRules.values.includes(v?.initialMultiplier)?v.initialMultiplier:1,...(Number.isFinite(v?.researchChallengeSuccess)&&v.researchChallengeSuccess>=.4&&v.researchChallengeSuccess<=1?{researchChallengeSuccess:v.researchChallengeSuccess}:{}),modelSetting:validSetting(v?.modelSetting),researchSortieLeft:Math.max(0,Number(v?.researchSortieLeft)||0),researchSortieHits:Math.max(0,Number(v?.researchSortieHits)||0),researchSortieRate:Number(v?.researchSortieRate)||0,
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
  if(s.initialBoostActive&&isFreshInitialRuleVersion(s.initialRuleVersion)){
   const roles=scriptedInitialRoles(s.modelSetting,rng),plan=roles.map(role=>freshInitialAward(s.modelSetting,role,s.initialRuleVersion));
   return {...s,entryQuota:String(plan.reduce((sum,n)=>sum+n,0)),initialStage:'zone',initialRolePlan:roles,initialPlan:plan,initialIndex:0,zoneLeft:3,award:'0',initialAward:'0',oumaPending:false,zero:false,ladder:[]};
  }
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
   result=initialRareAwards[forced]||['BELL','REPLAY','MISS'].includes(forced)?forced:s.initialRolePlan[index]||drawInitialRole(s.modelSetting,rng);
   n=s.initialBoostActive&&isFreshInitialRuleVersion(s.initialRuleVersion)?freshInitialAward(s.modelSetting,result,s.initialRuleVersion):initialRareAwards[result]??n;if(s.initialBoostActive)n*=[freshInitialRules.version,fixedFreshInitialVersion].includes(s.initialRuleVersion)?1:s.initialMultiplier;s.initialPlan[index]=n;
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
 const rareRoles=Object.freeze({"WEAK_SUICA":{"p":0.0265,"pay":3,"preparation":0.13189655172413794},"STRONG_SUICA":{"p":0,"pay":3,"preparation":0.3},"CHANCE_A":{"p":0,"pay":0,"preparation":0.15},"CHANCE_B":{"p":0,"pay":0,"preparation":0.15},"WEAK_NOVA":{"p":0.0025,"pay":2,"preparation":0.13189655172413794},"STRONG_NOVA":{"p":0.0005,"pay":2,"preparation":0.5}});
 const rareTotal=Object.values(rareRoles).reduce((sum,v)=>sum+v.p,0);
 const rareMean=Object.values(rareRoles).reduce((sum,v)=>sum+v.p*v.pay,0)/rareTotal;
 const rareFactor=()=>1;
 // Low-payout roles are shared by normal play and the ordinary/upper AT quota.
 // Preparations, initial-point games and special zones keep their own role mix.
 const lowPayoutRoles=Object.freeze({ONE_COIN:1});
 const atLowPayoutRules=Object.freeze({oneCoinChance:.1,replayHighDownChance:.05});
 const lowPayout=role=>lowPayoutRoles[role]??0;
 const payout=role=>rareRoles[role]?.pay??lowPayoutRoles[role]??(role==='BELL'?8:role==='BELL15'?15:0);
 const atShortfallRefund=(role,spinCost=3)=>Object.prototype.hasOwnProperty.call(lowPayoutRoles,role)?Math.max(0,Number(spinCost)-lowPayoutRoles[role]):0;
 // Cash refund is not a bonus award or a special-zone add-on.
 const replayRefund=(role,options={})=>(role==='REPLAY'||isPreparationStartReplay(role))&&options.replayRefund!==false&&!options.zero?3:0;
 const cashPayout=(role,options={})=>payout(role)+replayRefund(role,options);
 function drawRare(rng=Math.random){let roll=rng()*rareTotal;for(const [role,v]of Object.entries(rareRoles))if((roll-=v.p)<0)return role;return 'STRONG_NOVA';}
 const preparationStartRoles=Object.freeze(['START_REPLAY_RIGHT','START_REPLAY_MIDDLE','START_REPLAY_LEFT']);
 const preparationStartOrders=Object.freeze({START_REPLAY_RIGHT:'right',START_REPLAY_MIDDLE:'middle',START_REPLAY_LEFT:'left'});
 const preparationStartOrderStops=Object.freeze({
  right:Object.freeze(['right','middle','left']),
  middle:Object.freeze(['middle','right','left']),
  left:Object.freeze(['left','middle','right'])
 });
 const preparationRules=Object.freeze({
  version:20261027,targetNet:1.2,startReplayChance:1/3,startReplayProbability:1/9,meanGames:3,
  ordinaryReplay:Object.freeze([0.13311650015250695,0.13365326023376708,0.1341900203150272,0.1347267803962873,0.1352635404775474,0.1358003005588075]),
  bell:Object.freeze([.3397358124428099,.33936352741233733,.33899124238186484,.3386189573513923,.3382466723209197,.3378743872904472]),
  miss:Object.freeze([.1652583540713498,.16462187902056213,.16398540396977482,.1633489289189873,.16271245386819957,.16207597881741195]),
  startReplayRoles:preparationStartRoles,startReplayOrders:preparationStartOrders,startReplayStops:preparationStartOrderStops,
  bonus:Object.freeze({
   weak:Object.freeze({upperBonus:0.013189655172413794,upperAt:0.06594827586206897,at:0.13189655172413795}),
   strong:Object.freeze({upperBonus:.05,upperAt:.25,at:.5}),
   stockWeights:Object.freeze([.9945,.005,.0005])
  }),
  at:Object.freeze({weakZone:0.06594827586206897,strongZone:.25})
 });
 const preparationRareRows=Object.freeze([
  Object.freeze({WEAK_SUICA:.025652,WEAK_NOVA:.00242,STRONG_NOVA:.000484}),
  Object.freeze({WEAK_SUICA:.026076,WEAK_NOVA:.00246,STRONG_NOVA:.000492}),
  Object.freeze({WEAK_SUICA:.026499999999999996,WEAK_NOVA:.0025,STRONG_NOVA:.0005}),
  Object.freeze({WEAK_SUICA:.026923999999999997,WEAK_NOVA:.00254,STRONG_NOVA:.000508}),
  Object.freeze({WEAK_SUICA:.027348000000000004,WEAK_NOVA:.0025800000000000003,STRONG_NOVA:.0005160000000000001}),
  Object.freeze({WEAK_SUICA:.027772,WEAK_NOVA:.0026200000000000004,STRONG_NOVA:.000524})
 ]);
 function isPreparationStartReplay(role){return Object.prototype.hasOwnProperty.call(preparationStartOrders,role);}
 function preparationStartOrder(role){return preparationStartOrders[role]||'';}
 function preparationDisplayRole(role){return isPreparationStartReplay(role)?'REPLAY':role;}
 function preparationCashPayout(role){return payout(role)+((role==='REPLAY'||isPreparationStartReplay(role))?3:0);}
 function preparationProbabilities(setting=3){
  const i=2,rare=preparationRareRows[i];
  const row={WEAK_SUICA:rare.WEAK_SUICA,STRONG_SUICA:0,CHANCE_A:0,CHANCE_B:0,WEAK_NOVA:rare.WEAK_NOVA,STRONG_NOVA:rare.STRONG_NOVA};
  for(const role of preparationStartRoles)row[role]=preparationRules.startReplayProbability;
  row.REPLAY=preparationRules.ordinaryReplay[i];
  row.BELL=preparationRules.bell[i];row.MISS=preparationRules.miss[i];
  return row;
 }
 const preparationEntries=[1,2,3,4,5,6].map(s=>Object.entries(preparationProbabilities(s)));
 function drawPreparationRole(setting,rng=Math.random){let roll=rng();for(const [role,p]of preparationEntries[Math.max(0,Math.min(5,Math.round(Number(setting)||3)-1))])if((roll-=p)<0)return role;return 'MISS';}
 function preparationStockWeights(setting=1){return balanceFor(setting).style==='rough'?Object.freeze([.986,.01,.004]):Object.freeze([.996,.0038,.0002]);}
 function drawPreparationStockCount(rng=Math.random,setting=1){const roll=rng(),weights=preparationStockWeights(setting);return roll<weights[0]?1:roll<weights[0]+weights[1]?2:3;}
 function preparationRewardRates(role){return role==='STRONG_NOVA'?preparationRules.bonus.strong:['WEAK_SUICA','WEAK_NOVA'].includes(role)?preparationRules.bonus.weak:null;}
 function drawBonusPreparationReward(role,setting=1,rng=Math.random){
  const rates=preparationRewardRates(role);if(!rates)return {upperBonus:false,upperAt:false,atConfirmed:false,sets:0,stockCount:0};
  const factor=balanceFor(setting).preparationReward,upperBonus=rng()<Math.min(1,rates.upperBonus*factor),upperAt=rng()<Math.min(1,rates.upperAt*factor),atLotteryWon=rng()<Math.min(1,rates.at*factor),atConfirmed=upperAt||atLotteryWon;
  const stockCount=atConfirmed?drawPreparationStockCount(rng,setting):0;
  return {upperBonus,upperAt,atConfirmed,sets:stockCount,stockCount};
 }
 function atPreparationZoneChance(role,setting=3){const base=role==='STRONG_NOVA'?preparationRules.at.strongZone:['WEAK_SUICA','WEAK_NOVA'].includes(role)?preparationRules.at.weakZone:0;return Math.min(1,base*balanceFor(setting).preparationReward);}
 function drawAtPreparationReward(role,setting=1,rng=Math.random){
  const chance=atPreparationZoneChance(role,setting);if(!chance||rng()>=chance)return {sets:0,zones:[]};
  return {sets:0,zones:[pickZone(setting,rng)]};
 }
 // Compatibility alias for existing callers: preparation during AT awards only a character-zone stock.
 function drawPreparation(role,setting=1,rng=Math.random){return drawAtPreparationReward(role,setting,rng);}
 // Bell payouts are capped to the BIG target.
 // Choose the per-game hazard so P(at least one NEBULA before the required bells)
 // equals the tier's 52% / 80%. Half of the misses have no guide.
 // Only additional wins after AT is secured are reduced. First-hit AT odds,
 // bell/replay frequencies and the 50pt BIG payout remain unchanged.
 const bonusStockRules=Object.freeze({version:174,factors:Object.freeze([.45,.58,.68,.85,1.05,1.25])});
 const bonusStockFactor=setting=>balanceFor(setting).bonusStock;
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
  // success prior, preserving blue/red/rainbow confidence at 20/90/100%.
  const factor=stockEligible?bonusStockFactor(setting):1,guidedHit=2*factor/(2+factor);
  const red=(guidedHit-.24)/.7;
  const colors=[{color:'blue',weight:.95-red,hit:.2},{color:'red',weight:red,hit:.9},{color:'rainbow',weight:.05,hit:1}],success=result==='NEBULA',weights=colors.map(row=>row.weight*(success?row.hit:1-row.hit));
  let roll=rng()*weights.reduce((a,b)=>a+b,0),index=weights.findIndex(w=>(roll-=w)<0);if(index<0)index=success?2:0;
  return {symbol:'nebula',color:colors[index].color,result,guide:success||rng()<.5,forced:false};
 }
const tuning={"weak":128,"strong":1500,"other":1.15,"tilts":[-0.28,-0.28,-0.28,0.1,0.2,0.38]};
 function atMix(setting=3){
  const r={WEAK_SUICA:0.03099152542372881,STRONG_SUICA:0,CHANCE_A:0,CHANCE_B:0,WEAK_NOVA:0.0078125,STRONG_NOVA:0.0006666666666666666};
  const chance=Object.values(r).reduce((a,b)=>a+b,0),mean=Object.entries(r).reduce((sum,[role,p])=>sum+p*payout(role),0)/chance;return {r,chance,mean};
 }
 function drawAtRare(setting,rng){const {r,chance}=atMix(setting);let roll=rng()*chance;for(const [role,p]of Object.entries(r))if((roll-=p)<0)return role;return 'STRONG_NOVA';}
 const atNetRules=Object.freeze({normal:4,upper:4,checkpoint:4});
 function atRoleProbabilities(setting,upper,target,oneCoinChance){
  const {r,chance,mean}=atMix(setting),share=upper?1:0.5;
  const bell=(target-chance*(mean-3)-oneCoinChance*(lowPayout('ONE_COIN')-3))/(5+7*share);
  return {...r,...(oneCoinChance?{ONE_COIN:oneCoinChance}:{}),BELL:bell*(1-share),BELL15:bell*share,REPLAY:1-chance-oneCoinChance-bell};
 }
 function roleProbabilities(setting=3,upper=false,target=upper?atNetRules.upper:atNetRules.normal){return atRoleProbabilities(setting,upper,target,atLowPayoutRules.oneCoinChance);}
 // The initial three-game award and sortie keep the pre-one-coin +5pt table.
 function initialRoleProbabilities(setting=3){return atRoleProbabilities(setting,false,5,0);}
 // ONE_COIN replaces replay plus the replay interval moved to paid bells. Preserve
 // the aggregate pre-change 5% high-state downgrade hazard exactly.
 function oneCoinHighDownChance(upper=false){const share=upper?1:.5;return atLowPayoutRules.replayHighDownChance*(1+(3-lowPayout('ONE_COIN'))/(5+7*share));}
 function drawAtRole(setting,upper,rng,target){let roll=rng();for(const [role,p]of Object.entries(roleProbabilities(setting,upper,target)))if((roll-=p)<0)return role;return 'REPLAY';}
 const zoneEntryScale=[0.405,0.475,0.415,0.5,0.485,0.485];
 // Normalize by actual rare-role frequency, preserving the average AT zone entry rate.
 const zoneRoleWeights=Object.freeze({WEAK_SUICA:1,STRONG_SUICA:10,CHANCE_A:8/3,CHANCE_B:8/3,WEAK_NOVA:1,STRONG_NOVA:10});
 function zoneRoleMultiplier(role){let weighted=0;for(const [key,v]of Object.entries(rareRoles))weighted+=v.p*(zoneRoleWeights[key]||1);return (zoneRoleWeights[role]||1)*rareTotal/weighted;}
 const direct=[1400,1320,1240,1160,1080,1000];
 const validSetting=x=>Math.max(1,Math.min(6,Math.round(Number(x)||1)));
 const fallbackBalance=Object.freeze({style:'steady',failureRecovery:1,bonusStock:.85,preparationReward:1,upperEntry:.5,upperGroups:Object.freeze([0,80,20]),weakResponse:.06,weakQuality:Object.freeze([40,35,20,5,0]),repeatZone:Object.freeze({values:Object.freeze([1,1,1]),weights:Object.freeze([1,0,0])})});
 const balanceFor=setting=>globalThis.NovaTuning?.balanceProfile?.(setting)||fallbackBalance;
 const integer=x=>{try{return BigInt(String(x??0))<0n?0n:BigInt(String(x??0));}catch{return 0n;}};
 function config(v={}){if(v?.payoutVersion!==1&&v?.initial!=null)v={...v,initial:Number(points(v.initial)),payoutVersion:1};const c={...defaults};for(const k in c){const n=Number(v?.[k]);if(Number.isFinite(n))c[k]=k.startsWith('direct')?Math.max(2,Math.min(100000,Math.round(n))):k==='initial'?Math.max(1,Math.min(Number.MAX_SAFE_INTEGER,Math.round(n))):k.endsWith('Games')?Math.max(1,Math.min(1000,Math.round(n))):Math.max(0,Math.min(1,n));}c.zone=Math.min(c.zone,1-c.big);return c;}
 const fixedSosukeZone='fixed50_sosuke';
 const baseZone=z=>String(z||'').replace(/^(ura_|normal_|fixed50_)/, '');
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
if(v?.payoutVersion!==1)v={...v,remaining:points(v?.remaining).toString(),award:points(v?.award).toString(),initialAward:points(v?.initialAward).toString(),payoutVersion:1};return {...initialFields(v),fixed50Zone:v?.zone==='sosuke'&&!!v?.fixed50Zone,pendingFixed50:v?.pendingZone==='sosuke'&&!!v?.entryStage&&!!v?.pendingFixed50,atPrelude:normalizeAtPrelude(v?.atPrelude),entryQuota:integer(v?.entryQuota).toString(),setQuota:integer(v?.setQuota??300).toString(),comebackLeft:Math.max(0,Math.min(comebackRules.games,Math.floor(Number(v?.comebackLeft)||0))),comebackLamp:zoneIds.includes(v?.comebackLamp)?v.comebackLamp:'',comebackConfirmed:!!v?.comebackConfirmed,burstVersion:2,burstType:'ura',burstUsed:!!v?.burstUsed,burstPending:!!v?.burstPending,burstLeft:Math.max(0,Math.min(10,Math.floor(Number(v?.burstLeft)||0))),burstWon:!!v?.burstWon,dryEligible:v?.dryEligible===true,rouletteTable:[6,7].includes(v?.rouletteTable)?v.rouletteTable:0,sevenHits:Math.max(0,Math.floor(Number(v?.sevenHits)||0)),zoneVersion:2,ladder:Array.isArray(v?.ladder)?v.ladder.slice(0,5):[],ladderIndex:Math.max(0,Math.min(4,Math.floor(Number(v?.ladderIndex)||0))),ladderRevealed:!!v?.ladderRevealed,atHigh:!!v?.atHigh,atHighLeft:v?.atHigh?Math.max(0,Math.floor(Number(v?.atHighLeft)||0)):0,balanceZoneCount:Math.max(0,Math.floor(Number(v?.balanceZoneCount)||0)),zoneBalanceFactor:Number.isFinite(Number(v?.zoneBalanceFactor))?Math.max(.1,Math.min(10,Number(v.zoneBalanceFactor))):1,entryStage:['seven','roulette','confirmed'].includes(v?.entryStage)?v.entryStage:'',pendingZone:v?.initialStage==='entry'?initialZoneForQuota(v.pendingZone,v.entryQuota,v.initialVersion===148?148:131):zoneIds.includes(v?.pendingZone)?v.pendingZone:'',payoutVersion:1,queuedZones:Array.isArray(v?.queuedZones)?v.queuedZones.filter(z=>z===fixedSosukeZone||z==='kushuri_nito'||zoneIds.includes(z)||(String(z).startsWith('normal_')&&zoneIds.includes(z.slice(7)))):[],phase:'art',remaining:integer(v?.remaining).toString(),zone:v?.initialVersion===148&&v?.initialStage==='zone'&&initialZoneId(v.zone)?'kushuri_nito':names[baseZone(v?.zone)]?baseZone(v.zone):'',ura:!!v?.ura||String(v?.zone||'').startsWith('ura_'),zoneLeft:Math.max(0,Math.floor(Number(v?.zoneLeft)||0)),award:integer(v?.award).toString(),initialAward:integer(v?.initialAward).toString(),stock:integer(v?.stock).toString(),zoneSets:integer(v?.zoneSets).toString(),zoneZones:integer(v?.zoneZones).toString(),sets:integer(v?.sets).toString(),oumaPending:!!v?.oumaPending,zero:!!v?.zero,color:v?.color||'white',awardTier:[1,4,10,70].includes(v?.awardTier)?v.awardTier:4,giruVersion:v?.giruVersion===3?3:0,giruBase:Math.min(5,Math.max(0,Math.floor(Number(v?.giruBase)||0))),giruContinues:Math.max(0,Math.floor(Number(v?.giruContinues)||0)),giruSetting:validSetting(v?.giruSetting)};}
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
  if(['sosuke','giru'].includes(s.zone))return {family:'ladder',success:s.fixed50Zone?0:s.zone==='sosuke'?c.ladderSosuke:s.ura?c.ladderUraGiru:c.ladderGiru};
  if(['toto','sora'].includes(s.zone))return {family:'seven',hit:s.zone==='toto'?c.totoHit:s.ura?c.soraUraHit:c.soraHit,reset:Math.min(.3,s.zone==='toto'?c.totoReset:s.ura?c.soraUraReset:c.soraReset)*zoneAwardFactor(s.award),weights:sevenWeights[id]};
  return {family:'nova',awardMultiplier:s.zone==='ouma'&&s.ura?2:1,hit:s.zone==='urapi'?c.urapiSuper:s.ura?c.oumaUraSuper:c.oumaSuper,hundred:s.zone==='urapi'?.3:s.ura?.7:.5,freeze:oumaFreezeRate(s,c)};
 }
 function drawRepeatZoneFactor(setting,rng=Math.random){const row=balanceFor(setting).repeatZone;return row.values[weightedChallenge(row.weights,rng)];}
 function balanceZoneAward(award,factor=1){
  const raw=integer(award);if(raw===0n||factor===1)return raw;
  const scale=BigInt(Math.max(100,Math.min(10000,Math.round(Number(factor)*1000))));
  const rounded=((raw*scale+5000n)/10000n)*10n;return rounded>0n?rounded:10n;
 }
 function startZone(s,z,c,rng=Math.random){
  s=normalize(s);const fixed50=z===fixedSosukeZone||(z==='sosuke'&&s.entryStage==='confirmed'&&s.pendingFixed50),setting=validSetting(c?.setting);
  z=canonicalZone(z);if(s.initialStage==='entry')z=initialZoneForQuota(z,s.entryQuota,s.initialVersion);
  const explicitUra=String(z).startsWith('ura_');z=baseZone(z);c=config(c);if(!names[z]||(initialZoneId(z)&&s.initialStage!=='entry'))return s;
  const counted=!initialZoneId(z)&&!fixed50,nextCount=s.balanceZoneCount+(counted?1:0),zoneBalanceFactor=counted&&nextCount>=2?drawRepeatZoneFactor(setting,rng):1;
  const ura=['giru','sora','ouma'].includes(z)&&explicitUra,special=s.entryStage==='confirmed'&&((s.rouletteTable===7&&z==='sosuke')||(s.rouletteTable===6&&z==='giru'))?s.rouletteTable:0;
  // The first earned character zone is common. From the second zone onward,
  // odd settings use the broad tail and even settings use the narrow band.
  const ladderSetting=counted&&nextCount===1?3:setting,ladder=['sosuke','giru'].includes(z)?(fixed50?sharedLadderTables[0].slice():special?sharedLadderTables[special-1].slice():pickLadder({zone:z,ura},ladderSetting,rng)):[];
  const next={...s,balanceZoneCount:nextCount,zoneBalanceFactor,fixed50Zone:fixed50,pendingFixed50:false,comebackLeft:0,comebackLamp:'',comebackConfirmed:false,dryEligible:false,rouletteTable:0,sevenHits:0,zoneVersion:2,ladder,ladderIndex:0,ladderRevealed:false,ura,oumaPending:false,zoneZones:'0',zoneSets:'0',initialAward:ladder.length?String(ladder[0]):'0',giruSetting:setting,zone:z,zoneLeft:ladder.length||5,award:ladder.length?String(ladder[0]):'0',zero:false,color:'white'};
  if(s.initialStage==='entry'){next.dryEligible=s.dryEligible;return initialZone(next,rng);}return next;
 }
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
 function prepareBet(value,options={},rng=Math.random){if(value?.researchSortieLeft)return value;value=prepareBonusStock(value,options,rng);if(value?.comebackLeft)return prepareComeback(value,options,rng);if(value?.entryStage==='confirmed'){const s=startZone(value,value.pendingZone,{...options,setting:value.giruSetting},rng);s.entryStage='';s.pendingZone='';s.pendingFixed50=false;return s;}if(!['ouma','urapi'].includes(value?.zone)||!value?.oumaPending)return value;const s=normalize(value);s.oumaPending=false;s.zero=rng()<oumaFreezeRate(s,config(options));if(!s.zero&&s.zoneLeft===0)return settleZone(s);return s;}
 // Restore only an actually charged BET during quota-consuming AT play.
 // Zones, preparation, challenges and comeback already suspend quota consumption.
 function restoreBetCost(value,charged){
  if(value?.phase!=='art'||!Number.isSafeInteger(charged)||charged<=0||integer(value.remaining)===0n||value.zero||value.zone||value.initialStage||value.entryStage||value.researchSortieLeft||value.burstPending||value.burstLeft||value.researchChallengeActive||value.comebackLeft||value.comebackConfirmed)return value;
  if(!value.atPrelude&&(value.queuedZones?.length||integer(value.stock)>0n||integer(value.sets)>0n))return value;
  return {...value,remaining:(integer(value.remaining)+BigInt(charged)).toString()};
 }
 function settleZone(value){const s=normalize(value);if(!s.zone)return s;const settled=balanceZoneAward(s.award,s.zoneBalanceFactor);s.award=settled.toString();s.remaining=(integer(s.remaining)+settled).toString();s.zone='';s.zoneBalanceFactor=1;s.fixed50Zone=false;s.color='white';s.zoneLeft=0;s.zero=false;s.oumaPending=false;if(s.initialStage==='zone'){s.initialBoostActive=false;s.initialStage='';s.initialWait=0;s.initialPlan=[];s.initialRolePlan=[];s.initialIndex=0;}return s;}
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
 function atZoneWeights(setting,boost=false,preparation=false,upper=false){return (upper?balanceFor(setting).upperGroups:zoneGroupWeights(setting,boost,preparation)).flatMap(p=>[p/3,p/3,p/3]);}
 function pickAtZone(setting,boost=false,rng=Math.random,preparation=false,upper=false){
  const row=atZoneWeights(setting,boost,preparation,upper);let roll=rng()*100;const i=row.findIndex(w=>(roll-=w)<0);return zoneIds[i<0?8:i];
 }
 function pickNonSosukeZone(setting=1,rng=Math.random){
  const row=atZoneWeights(setting,false,true).map((weight,index)=>index===0?0:weight);
  return zoneIds[weightedChallenge(row,rng)];
 }
 // Retired quota/payout guards stay disabled. v170 changes only future draw rates.
 const netLimits=Object.freeze([0,0,0,0,0,0]);
 const lossRewardControl=Object.freeze({enabled:false,threshold:-2000,multiplier:1});
 const netRewardControl=Object.freeze({enabled:false,startRatio:0,floor:1});
 function netRewardFactor(){return 1;}
 const positiveNetZoneRules=Object.freeze([{"start":0,"end":1500,"floor":1,"boost":1,"sortie":false},{"start":0,"end":1500,"floor":1,"boost":1,"sortie":false},{"start":500,"end":3000,"floor":1,"boost":1,"sortie":false},{"start":500,"end":3000,"floor":1,"boost":1,"sortie":false},{"start":0,"end":2000,"floor":1,"boost":1,"sortie":false},{"start":3000,"end":6500,"floor":1,"boost":1,"sortie":false}].map(Object.freeze));
 function positiveNetZoneFactor(setting,netPt=0){const r=positiveNetZoneRules[validSetting(setting)-1],progress=Math.max(0,Math.min(1,(Number(netPt)-r.start)/(r.end-r.start)));return r.boost+(r.floor-r.boost)*progress;}
 function weakAtResponseChance(setting,upper=false,high=false){return Math.min(1,balanceFor(setting).weakResponse*(high?1.5:1));}
 function weakQualityWeights(setting,upper=false){
  const source=balanceFor(setting).weakQuality;
  if(!upper)return [...source];
  // Upper AT keeps the same hit frequency and shifts only the middle/strong
  // outcomes upward.  This avoids creating another setting-identification axis.
  return [source[0],source[1],source[2]*.75,source[3]*.75+source[2]*.25,source[4]+source[3]*.25];
 }
 function pickQualityZone(quality,rng=Math.random){const offset=Math.max(0,Math.min(2,quality-2))*3;return zoneIds[offset+Math.min(2,Math.floor(rng()*3))];}
 function drawWeakAtReward(setting,options={},rng=Math.random){
  const upper=!!options.upper,high=!!options.high;
  if(rng()>=weakAtResponseChance(setting,upper,high))return {direct:0,zone:'',fixed50:false,extraZone:'',keepDirect:false,quality:-1};
  const quality=weightedChallenge(weakQualityWeights(setting,upper),rng);
  if(quality===0)return {direct:upper?15:10,zone:'',fixed50:false,extraZone:'',keepDirect:true,quality};
  if(quality===1)return upper?{direct:50,zone:'',fixed50:false,extraZone:'',keepDirect:true,quality}:{direct:0,zone:'sosuke',fixed50:true,extraZone:'',keepDirect:false,quality};
  return {direct:0,zone:pickQualityZone(quality,rng),fixed50:false,extraZone:'',keepDirect:false,quality};
 }
 function extraZoneChance(setting,role,upper=false,high=false){
  if(!['WEAK_SUICA','WEAK_NOVA'].includes(role))return 0;
  const weights=weakQualityWeights(setting,upper),total=weights.reduce((sum,value)=>sum+value,0),zoneStart=upper?2:1;
  return weakAtResponseChance(setting,upper,high)*weights.slice(zoneStart).reduce((sum,value)=>sum+value,0)/total;
 }
 const checkpointQuietRules=Object.freeze({enabled:true}); // Approved 2026-10-13; fixed earned net quota reaches the checkpoint.
 function checkpointGuaranteed(s,net,next){
  if(s?.phase!=='art'||s.zone||s.entryStage||s.initialStage||s.atPrelude||s.researchSortieLeft||s.comebackLeft||s.comebackConfirmed||s.researchChallengeActive||s.burstPending||s.burstLeft||s.queuedZones?.length||Number(s.stock||0)>0||Number(s.sets||0)>0)return false;
  if(!Number.isFinite(Number(net))||!Number.isFinite(Number(next))||Number(next)<=0)return false;
  return Number(net)+Number(s.remaining||0)>=Number(next);
 }
 const weakAtAwardScales=Object.freeze([1,1,1,1,1,1]);
 function resolveAtRole(s,role,setting,rng=Math.random,netPt=0){
  const wasHigh=!!s.atHigh,held=wasHigh&&s.atHighLeft>0;
  const out={wasHigh,direct:0,zone:'',promoted:false,rewardFactor:1};if(held)s.atHighLeft--;
  // Thin the former direct-hit branch by its expected award / 50. Reuse its
  // amount draw so independent zone draws retain their existing probabilities.
  const drawAmount=rule=>{
   const r=rng(),mean=rule.values.reduce((sum,v,i)=>sum+v*rule.weights[i],0)*(s.researchUpper?1.5:1);
   return r<mean/50?50:0;
  };
  const shared=atRoleRules[role];
  if(shared){
   if(!wasHigh&&rng()<.15){s.atHigh=true;s.atHighLeft=10;out.promoted=true;}
   Object.assign(out,drawWeakAtReward(setting,{upper:!!s.researchUpper,high:wasHigh},rng));
  }
  if(role==='STRONG_NOVA'){
   const r=rng();
   if(r<.2||r>=.4&&r<.6)out.direct=drawAmount({"up":0.5,"hit":0.5,"values":[20,30,50,100,300],"weights":[0.6,0.3,0.098,0.0018,0.0002]});
   if(r>=.2&&r<.6)out.zone=pickAtZone(setting,wasHigh,rng,false,!!s.researchUpper);
  }
  // Normal AT uses the fixed Sosuke route; upper AT credits the same 50pt directly.
  if(out.direct&&!s.researchUpper&&!out.keepDirect){out.fixed50=true;out.extraZone=out.zone;out.zone='sosuke';out.direct=0;}
  if(wasHigh&&!held&&['REPLAY','MISS','ONE_COIN'].includes(role)&&rng()<(role==='ONE_COIN'?oneCoinHighDownChance(!!s.researchUpper):role==='REPLAY'?atLowPayoutRules.replayHighDownChance:.08)){s.atHigh=false;s.atHighLeft=0;}
  return out;
 }
 function step(value,options={},rng=Math.random,forced=''){
  if(forced==='STRONG_BELL')forced='BELL';
  if(forced==='STRONG_SUICA')forced='WEAK_SUICA';
  if(forced==='CHANCE_A'||forced==='CHANCE_B')forced='MISS';
  const c=config(options);if(options.setting){c.rare=Math.min(.99,c.rare*rareFactor(options.setting));const factor=(1+.2*biasFor(options.setting))*zoneEntryScale[validSetting(options.setting)-1];c.big=Math.min(1,c.big*factor);c.zone=Math.min(1-c.big,c.zone*factor);}let s=normalize(prepareBet(value,options,rng)),freeOumaSpin=['ouma','urapi'].includes(s.zone)&&s.zero,result='MISS',message='',internalBonus=null,reverse=false,queuedEntered=false,shortfallRefund=0;
  let atOutcome=null,aim=null,zoneAward=0,atPrelude=null,zoneStartFlow=null;const finish=()=>{const z=s.zone,name=zoneName(s);s=settleZone(s);message=`${name}ゾーン終了 / ${'＋'+s.award+'pt'}`;};
  if(s.researchSortieLeft){
  const result=drawInitialRole(options.setting,rng);s.researchSortieLeft--;
  const natural=rng()<s.researchSortieRate;
  const guaranteed=!natural&&s.researchSortieHits+s.researchSortieLeft<2;
  let selected='';if(natural||guaranteed){s.researchSortieHits++;let r=rng();const weights=NovaTuning.profile(options.setting).weights;const i=weights.findIndex(w=>(r-=w)<0);selected=[...zoneIds,'kushuri_nito'][i<0?9:i];s.queuedZones.push(selected);}
  return {result,flow:s,researchSortie:{rate:s.researchSortieRate,won:natural||guaranteed,guaranteed,zone:selected,finished:s.researchSortieLeft===0,hits:s.researchSortieHits}};
 }
 if(s.initialStage==='wait'){
   const gated=s.initialPreparationVersion===preparationRules.version,row=preparationProbabilities(options.setting);
   result=forced&&Object.prototype.hasOwnProperty.call(row,forced)?forced:drawPreparationRole(options.setting,rng);
   let reward={sets:0,zones:[]};
   if(gated){reward=drawAtPreparationReward(result,options.setting,rng);if(reward.zones.length)s.queuedZones.push(...reward.zones);}
   const prepStartOrder=gated?preparationStartOrder(result):'',prepStartOrderStops=prepStartOrder?preparationStartOrderStops[prepStartOrder]:[];
   const started=gated?!!prepStartOrder:!(s.initialWait=Math.max(0,s.initialWait-1));
   if(started){s.initialStage='entry';s.entryStage='seven';s.pendingZone=pickInitialZone(options.setting,s.entryQuota,rng,s.initialVersion);s.giruSetting=validSetting(options.setting);}
   const stocked=reward.zones.length?' / '+reward.zones.map(zoneName).join('・')+'ストック':'';
   return {result,flow:s,initialAward:true,initialPreparationSpin:true,initialPreparationStarted:started,prepStartOrder,prepStartOrderStops:[...prepStartOrderStops],preparationReward:reward,message:started?(gated?'開始リプレイ '+prepStartOrderStops.join('→')+' / 初期pt獲得ゾーンへ':'AT準備終了 / 初期pt獲得ゾーンへ'):gated?'AT準備中'+stocked:'AT準備中 / 残り'+s.initialWait+'G'};
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
   if(!s.pendingFixed50&&!s.initialStage&&rates[result]&&rng()<rates[result]){s.rouletteTable=rng()<.8?6:7;s.pendingZone=s.rouletteTable===7?'sosuke':rng()<.8?'giru':'ura_giru';}
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
  const checkpointCash=!!options.checkpointQuiet&&checkpointGuaranteed(s,options.netPt,options.checkpointNext);
  const mix=atMix(options.setting);c.rare=mix.chance;const roll=rng();result=s.zone?(roll<.6?'REPLAY':roll<.9?'BELL':'MISS'):drawAtRole(options.setting,checkpointCash||s.researchUpper,rng,checkpointCash?atNetRules.checkpoint:undefined);
  if(['NEBULA','MISS','BELL','BELL15','REPLAY','ONE_COIN','WEAK_NOVA','STRONG_NOVA','SUPER_NOVA'].includes(forced))result=forced;
  if(s.zone){
   const rules=zoneRules(s,c),free=s.zero;
   // Ladder entry seeds its base amount before it is revealed. Report only the
   // newly secured points; settlement transfers the total without awarding it twice.
   const awardBefore=rules.family==='ladder'&&!s.ladderRevealed?0n:integer(s.award);
   if(!free)s.zoneLeft=Math.max(0,s.zoneLeft-1);
   if(rules.family==='ladder'){
    result=s.fixed50Zone?'MISS':forced||drawLadderRole(s,c,rng);
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
   const checkpointQuiet=!!options.checkpointQuiet&&checkpointGuaranteed(s,options.netPt,options.checkpointNext);
   atOutcome=checkpointQuiet?{wasHigh:!!s.atHigh,direct:0,zone:'',promoted:false,rewardFactor:1,checkpointQuiet:true}:resolveAtRole(s,result,options.setting,rng,options.netPt);
   if(!checkpointQuiet&&!s.researchUpper&&!s.researchThresholdPending&&s.burstVersion===burstRules.version&&!s.burstUsed&&burstRules.roles[result]&&rng()<burstChance(result,options.setting)){s.burstUsed=true;s.burstPending=true;s.burstType='ura';s.researchChallengeSource='rare';}
   if(atOutcome.direct){s.dryEligible=false;s.remaining=(integer(s.remaining)+BigInt(atOutcome.direct)).toString();message='直乗せ＋'+atOutcome.direct+'pt';}
   atPrelude=checkpointQuiet?null:advanceAtPrelude(s,result,atOutcome,rng);
   if(atPrelude?.confirmed){s.giruSetting=validSetting(options.setting);message='特化ゾーン確定！ 赤7を狙え';}
   shortfallRefund=s.entryStage||s.burstPending?0:atShortfallRefund(result);
   const paid=s.entryStage||s.burstPending?0n:BigInt(cashPayout(result,options));s.remaining=(integer(s.remaining)>paid?integer(s.remaining)-paid:0n).toString();
   if(!s.zone&&!s.entryStage&&!s.burstPending&&!s.atPrelude&&!internalBonus&&integer(s.remaining)===0n){message='引き戻しゾーン突入 / 残り5G';return {atPrelude,atOutcome,result,flow:beginComeback(s),comebackEvent:'entry',message};}
  }
  if(s.burstPending&&!value.burstPending)message+=(message?' / ':'')+challengeName(s)+'獲得！';
  return {atPrelude,atOutcome,aim,zoneAward,result,flow:s,message,internalBonus,atShortfallRefund:shortfallRefund,reverse,oumaFreeze:freeOumaSpin,zoneSpin:!!value.zone||queuedEntered,...(zoneStartFlow?{zoneStartFlow}:{})};
 }
 function label(v){const s=normalize(v);if(s.researchSortieLeft)return 'ノヴァ出陣 / 残り'+s.researchSortieLeft+'G / ストック'+s.researchSortieHits+'個';if(s.researchChallengeActive||s.burstPending)return 'スーパーノヴァチャレンジ / '+(s.researchAim?'ノヴァを狙え / HOLD':'残り'+(s.burstLeft||10)+'G');if(s.initialStage)return s.initialStage==='wait'?(s.initialPreparationVersion===preparationRules.version?'AT準備中 / 開始リプレイ待ち':'AT準備中 / 残り'+s.initialWait+'G'):s.initialStage==='entry'?'初期pt獲得ゾーン / '+({seven:'赤7を狙え！',roulette:'キャラルーレット',confirmed:zoneName(s.pendingZone)+'ゾーン確定'}[s.entryStage]||'準備中'):'初期pt獲得 / '+zoneName(s)+' 残り'+s.zoneLeft+'G / 確保'+s.award+'pt';if(s.atPrelude)return 'AT '+s.remaining+'pt / 特化ゾーン前兆';if(s.comebackLeft)return '引き戻しゾーン 残り'+s.comebackLeft+'G / ランプ点灯でAT復活';if(s.comebackConfirmed)return '引き戻し成功！ '+zoneName(s.pendingZone)+'ゾーン / AT復活';return (s.researchUpper?('上位AT / '):s.burstLeft?challengeName(s)+' 残り'+s.burstLeft+'G / ':s.burstPending?challengeName(s)+'待機 / ':'')+`AT ${s.remaining}pt / 特化ストック${integer(s.sets)+BigInt(s.queuedZones.length)}個${s.entryStage?' / '+({seven:'赤7を狙え・減算停止',roulette:'ルーレット・減算停止',confirmed:zoneName(s.pendingZone)+'ゾーン確定'}[s.entryStage]):''}${s.zone?' / '+zoneName(s)+' '+(s.zero?'0G連':s.oumaPending?'BETで継続抽選':s.zoneLeft+'G'):''}${integer(s.stock)>0n?' / BIGストック '+s.stock:''}${s.zone?' / 獲得'+s.award+'pt':''}`;}
  function beginResearchSortie(value,rng=Math.random,setting=value?.modelSetting||3){
  const s=normalize(value);let r=rng();const i=NovaTuning.profile(setting).tiers.findIndex(w=>(r-=w)<0);
  s.researchSortieRate=[.1,.25,.4,.6,.8][i<0?4:i];s.researchSortieLeft=10;s.researchSortieHits=0;
  s.comebackLeft=0;s.comebackConfirmed=false;s.comebackLamp='';s.zero=false;s.dryEligible=false;return s;
 }
 return {challengeAimChance,atNetRules,atLowPayoutRules,oneCoinHighDownChance,weakAtAwardScales,weakAtResponseChance,weakQualityWeights,drawWeakAtReward,upperAtRules,initialBurstChance,checkpointQuietRules,checkpointGuaranteed,cashPayout,replayRefund,lowPayoutRoles,lowPayout,atShortfallRefund,scriptedInitialRoles,freshInitialRules,freshInitialBases,previousFreshInitialBases,isFreshInitialRuleVersion,freshInitialBase,freshInitialAward,positiveNetZoneRules,positiveNetZoneFactor,restoreBetCost,extraZoneChance,commonAtRulesFor,balanceFor,drawRepeatZoneFactor,balanceZoneAward,preparationStockWeights,entryWeights:researchEntryWeights,beginResearchSortie,atPreludeRules,initialRareAwards,initialZoneIds,rouletteZones,sevenGuaranteed,initialBoostRules,entryQuotaRules,initialZoneAllowed,initialZoneWeights,pickInitialZone,drawEntryQuota,enterInitial,challengeName,burstReward,comebackRules,comebackChance,comebackRoleProbabilities,drawComebackRole,beginComeback,prepareComeback,stepComeback,burstRules,burstChance,commonAtRules,bonusRules,bonusTier,drawBonusTier,bonusLabel,bonusPayout,bonusAim,aimColors,aimColorsFor,sevenAimRules,drawSevenAim,ladderWeightsFor,ladderGuaranteed,drawLadderRole,lossRewardControl,zoneTailControl,zoneAwardFactor,netRewardControl,netLimits,netRewardFactor,superZoneChance,zoneGroups,zoneGroupWeights,upgradeGuaranteedZone,bonusSpecialRates,zoneRules,ladderTables,ladderTableFor,ladderValues,sevenValues,sevenWeights,atZoneWeights,tuning,atMix,drawAtRare,atRoleRules,pickAtZone,pickNonSosukeZone,resolveAtRole,rareRoles,rareTotal,rareMean,rareFactor,drawRare,roleProbabilities,initialRoleProbabilities,bonusRoleProbabilities,preparationRules,isPreparationStartReplay,preparationStartOrder,preparationDisplayRole,preparationCashPayout,preparationProbabilities,drawPreparationRole,drawPreparationStockCount,preparationRewardRates,drawBonusPreparationReward,atPreparationZoneChance,drawAtPreparationReward,zoneRoleWeights,zoneRoleMultiplier,paidBellChance,drawPreparation,zoneEntryScale,points,bonusTarget,payout,settleZone,prepareBet,oumaFreezeRate,baseZone,zoneName,zoneIds,names,defaults,direct,zoneWeights,pickZone,bonusSpecial,settingBias,biasFor,bonusSpecialFor,advanceBonus,bonusStockLabel,bonusStockRules,bonusStockFactor,bonusStockEligible,drawPaidRole,drawBonus,config,normalize,enter,startZone,afterBonus,step,label};
})();
