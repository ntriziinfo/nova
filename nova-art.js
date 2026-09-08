/* AT payout-point rules. Decimal strings preserve unlimited exact awards. */
globalThis.NovaArt=(()=>{
 const names={sosuke:'宗介',toto:'とと',urapi:'うらぴ',giru:'ギル',sora:'空',ouma:'逢魔'};
 const defaults={initial:150,payoutVersion:1,ladderSosuke:0.7,ladderGiru:0.95,ladderUraGiru:0.98,totoHit:0.35,totoReset:.02,soraUraHit:0.75,urapiSuper:0.49,oumaSuper:0.77,oumaUraSuper:0.98,rare:.03,big:.12,zone:.4,czArt:.25,soraHit:0.63,soraReset:.06,soraUraReset:.25,oumaFreeze:.25,oumaUraFreeze:.65,direct1:1400,direct2:1320,direct3:1240,direct4:1160,direct5:1080,direct6:1000};
 const zoneWeights=Object.freeze([[35,29,17,9,7,3],[34.5,29,17,9.5,7,3],[34,28.5,17.5,9.5,7.25,3.25],[33.5,28.5,17.5,9.5,7.5,3.5],[33,28,18,9.5,7.75,3.75],[32.5,27.5,18,10,8,4]].map(Object.freeze));
 const superZoneChance=.03;
 const zoneGroups={weak:['sosuke','toto','urapi'],strong:['giru','sora','ouma'],super:['ura_giru','ura_sora','ura_ouma']};
 function pickZone(setting=1,rng=Math.random){return pickAtZone(setting,false,rng,true);}
 // Preserve the original 3% promotion of strong zones, applied once at selection.
 function upgradeGuaranteedZone(zone,rng=Math.random){return zoneGroups.strong.includes(zone)&&rng()<superZoneChance?'ura_'+zone:zone;}
 const points=g=>(integer(g)*11n+1n)/2n;
 const bonusTarget=kind=>kind==='MID'?75:150;
 // AT and bonus preparation own their role mix and rewards. Normal/CZ tuning must not affect them.
 const rareRoles=Object.freeze(Object.fromEntries(Object.entries({
  WEAK_SUICA:{p:0.01125,pay:6,preparation:.06},STRONG_SUICA:{p:0.0032500000000000003,pay:6,preparation:.3},
  CHANCE_A:{p:1/250,pay:0,preparation:.15},
  CHANCE_B:{p:1/125,pay:0,preparation:.15},WEAK_NOVA:{p:1/400,pay:0,preparation:.15},
  STRONG_NOVA:{p:1/2000,pay:0,preparation:.5}
 }).map(([role,value])=>[role,Object.freeze(value)])));
 const rareTotal=Object.values(rareRoles).reduce((sum,v)=>sum+v.p,0);
 const rareMean=Object.values(rareRoles).reduce((sum,v)=>sum+v.p*v.pay,0)/rareTotal;
 const rareFactor=(setting=3)=>1+.016*(Math.max(1,Math.min(6,Math.round(Number(setting)||3)))-3);
 const payout=role=>rareRoles[role]?.pay??(role==='BELL'?15:0);
 function drawRare(rng=Math.random){let roll=rng()*rareTotal;for(const [role,v]of Object.entries(rareRoles))if((roll-=v.p)<0)return role;return 'STRONG_NOVA';}
 function preparationProbabilities(setting=3){const frequent=1+.004*(Math.max(1,Math.min(6,Math.round(Number(setting)||3)))-3),r=Object.fromEntries(Object.entries(rareRoles).map(([role,v])=>[role,v.p*rareFactor(setting)]));const chanceTotal=r.CHANCE_A+r.CHANCE_B;r.CHANCE_A=chanceTotal*(Math.max(1,Math.min(6,Math.round(Number(setting)||3)))%2?.4:.6);r.CHANCE_B=chanceTotal-r.CHANCE_A;r.BELL=(.120877629551039*8*frequent+.092*rareFactor(setting)-Object.entries(r).reduce((s,[role,p])=>s+p*payout(role),0))/15;r.REPLAY=frequent/7.452119;r.MISS=1-Object.values(r).reduce((a,b)=>a+b,0);return r;}
 const preparationEntries=[1,2,3,4,5,6].map(s=>Object.entries(preparationProbabilities(s)));
 function drawPreparationRole(setting,rng=Math.random){let roll=rng();for(const [role,p]of preparationEntries[Math.max(0,Math.min(5,Math.round(Number(setting)||3)-1))])if((roll-=p)<0)return role;return 'MISS';}
 function drawPreparation(role,setting=1,rng=Math.random){const rare=rareRoles[role];let sets=0,zones=[];if(rare){if(rng()<rare.preparation)sets++;if(rng()<rare.preparation*.5){zones.push(pickZone(setting,rng));sets=Math.max(1,sets);}}return {sets,zones};}
 const bonusSpecial=.0125;
 const settingBias=[-2.7,-2.55,-2.27,-2.13,-1.8,-1.46];
 const biasFor=setting=>settingBias[Math.max(0,Math.min(5,Math.round(Number(setting)||1)-1))];
 // Zone v2 calibration: dedicated bonus NEBULA rates; normal/CZ and AT roles stay independent.
 const bonusSpecialRates=[0.05849463058977963,0.06016986125454101,0.06353023384823513,0.06259443571245721,0.06736560691665441,0.05608260376555219];
 const bonusSpecialFor=setting=>bonusSpecialRates[Math.max(0,Math.min(5,Math.round(Number(setting)||1)-1))];
 function advanceBonus(state,special=false,reward=0){const target=bonusTarget(state.bonusKind),paid=Number(state.paid)||0;return {bonusTarget:target,bonusPointsRemaining:Math.max(0,target-paid-Math.max(0,Number(reward)||0)),bonusArtSets:(Number(state.bonusArtSets)||0)+(paid<target&&special?1:0)};}

 // Replay has no payout and makes the next BET free: net = (bellPay-3)*P(bell) + (otherPay-3)*P(other).
 function paidBellChance(otherChance=0,bellPay=15,otherPay=0){return Math.max(0,Math.min(1,(4-otherChance*(otherPay-3))/((1-otherChance)*(bellPay-3))));}
 function drawPaidRole(zeroChance=0,bellPay=15,rng=Math.random){return rng()<paidBellChance(zeroChance,bellPay)?'BELL':'REPLAY';}
 function drawBonus(rng=Math.random,setting){const p=setting===undefined?bonusSpecial:bonusSpecialFor(setting);return rng()<p?'NEBULA':drawPaidRole(p,15,rng);}
const tuning={"weak":128,"strong":1500,"other":1.15,"tilts":[-0.28,-0.28,-0.28,0.1,0.2,0.38]};
 function atMix(setting=3){const f=rareFactor(setting),r=Object.fromEntries(Object.entries(rareRoles).map(([role,v])=>[role,(role==='WEAK_NOVA'?1/tuning.weak:role==='STRONG_NOVA'?1/tuning.strong:v.p*.03/rareTotal*tuning.other)*f]));const chanceTotal=r.CHANCE_A+r.CHANCE_B;r.CHANCE_A=chanceTotal*(Math.max(1,Math.min(6,Math.round(Number(setting)||3)))%2?.4:.6);r.CHANCE_B=chanceTotal-r.CHANCE_A;const chance=Object.values(r).reduce((s,p)=>s+p,0),mean=Object.entries(r).reduce((s,[role,p])=>s+p*payout(role),0)/chance;return {r,chance,mean};}
 function drawAtRare(setting,rng){const {r,chance}=atMix(setting);let x=rng()*chance;for(const [role,p]of Object.entries(r))if((x-=p)<0)return role;return 'STRONG_NOVA';}
function roleProbabilities(setting=3){const {r,chance,mean}=atMix(setting);r.BELL=(1-chance)*paidBellChance(chance,15,mean);r.REPLAY=1-chance-r.BELL;return r;}
 function bonusRoleProbabilities(setting){const NEBULA=setting===undefined?bonusSpecial:bonusSpecialFor(setting),BELL=(1-NEBULA)*paidBellChance(NEBULA,15);return {NEBULA,BELL,REPLAY:1-NEBULA-BELL};}
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
  // Close a saved legacy zone once, retaining earned points and existing stocks.
  if(v?.zone&&v.zoneVersion!==2){v={...v,remaining:(integer(v.remaining)+(baseZone(v.zone)==='sora'?0n:integer(v.award))).toString(),zone:'',zoneLeft:0,zero:false,oumaPending:false,award:'0'};}
  v={...v,pendingZone:canonicalZone(v?.pendingZone),queuedZones:v?.queuedZones?.map(canonicalZone)};
if(v?.payoutVersion!==1)v={...v,remaining:points(v?.remaining).toString(),award:points(v?.award).toString(),initialAward:points(v?.initialAward).toString(),payoutVersion:1};return {zoneVersion:2,ladder:Array.isArray(v?.ladder)?v.ladder.slice(0,5):[],ladderIndex:Math.max(0,Math.min(4,Math.floor(Number(v?.ladderIndex)||0))),ladderRevealed:!!v?.ladderRevealed,atHigh:!!v?.atHigh,atHighLeft:v?.atHigh?Math.max(0,Math.floor(Number(v?.atHighLeft)||0)):0,entryStage:['seven','roulette','confirmed'].includes(v?.entryStage)?v.entryStage:'',pendingZone:zoneIds.includes(v?.pendingZone)?v.pendingZone:'',payoutVersion:1,queuedZones:Array.isArray(v?.queuedZones)?v.queuedZones.filter(z=>zoneIds.includes(z)||(String(z).startsWith('normal_')&&zoneIds.includes(z.slice(7)))):[],phase:'art',remaining:integer(v?.remaining).toString(),zone:names[baseZone(v?.zone)]?baseZone(v.zone):'',ura:!!v?.ura||String(v?.zone||'').startsWith('ura_'),zoneLeft:Math.max(0,Math.floor(Number(v?.zoneLeft)||0)),award:integer(v?.award).toString(),initialAward:integer(v?.initialAward).toString(),stock:integer(v?.stock).toString(),zoneSets:integer(v?.zoneSets).toString(),zoneZones:integer(v?.zoneZones).toString(),sets:integer(v?.sets).toString(),oumaPending:!!v?.oumaPending,zero:!!v?.zero,color:v?.color||'white',awardTier:[1,4,10,70].includes(v?.awardTier)?v.awardTier:4,giruVersion:v?.giruVersion===3?3:0,giruBase:Math.min(5,Math.max(0,Math.floor(Number(v?.giruBase)||0))),giruContinues:Math.max(0,Math.floor(Number(v?.giruContinues)||0)),giruSetting:validSetting(v?.giruSetting)};}
 function enter(c){return normalize({payoutVersion:1,remaining:config(c).initial});}
 const ladderValues=[50,100,200,300,500,1000,2000,3000];
 const sharedLadderTables=[[50,100,200,300,500],[50,50,500,500,1000],[100,200,300,500,1000],[100,100,500,1000,2000],[200,300,500,1000,2000],[300,500,1000,2000,3000],[50,2000]];
 const ladderTables={sosuke:sharedLadderTables,giru:sharedLadderTables,ura_giru:sharedLadderTables};
 function drawLadderRole(s,c,rng){const p=zoneRules(s,c).success,r=rng();return r<p*.7?'REPLAY':r<p?'BELL':'MISS';}
 const ladderTableFor=s=>ladderTables[(s.ura?'ura_':'')+s.zone]||ladderTables[s.zone];
 const sevenValues=[50,100,150,200,300,500];
 const sevenWeights={toto:[.65,.2,.08,.04,.02,.01],sora:[.4,.25,.15,.1,.07,.03],ura_sora:[.2,.2,.2,.15,.15,.1]};
 const zoneTailControl={threshold:2000,factor:.01};
 function zoneAwardFactor(award,next=0){return integer(award)+integer(next)>=BigInt(zoneTailControl.threshold)?zoneTailControl.factor:1;}
 function zoneRules(s,c=defaults){const id=(s.ura?'ura_':'')+s.zone;
  if(['sosuke','giru'].includes(s.zone))return {family:'ladder',success:s.zone==='sosuke'?c.ladderSosuke:s.ura?c.ladderUraGiru:c.ladderGiru};
  if(['toto','sora'].includes(s.zone))return {family:'seven',hit:s.zone==='toto'?c.totoHit:s.ura?c.soraUraHit:c.soraHit,reset:Math.min(.3,s.zone==='toto'?c.totoReset:s.ura?c.soraUraReset:c.soraReset)*zoneAwardFactor(s.award),weights:sevenWeights[id]};
  return {family:'nova',awardMultiplier:s.zone==='ouma'&&s.ura?2:1,hit:s.zone==='urapi'?c.urapiSuper:s.ura?c.oumaUraSuper:c.oumaSuper,hundred:s.zone==='urapi'?.3:s.ura?.7:.5,freeze:s.zone==='urapi'?0:oumaFreezeRate(s,c)};
 }
 function startZone(s,z,c,rng=Math.random){s=normalize(s);const setting=validSetting(c?.setting);z=canonicalZone(z);const explicitUra=String(z).startsWith('ura_');z=baseZone(z);c=config(c);if(!names[z])return s;const ura=['giru','sora','ouma'].includes(z)&&explicitUra;const table=ladderTableFor({zone:z,ura});const ladder=['sosuke','giru'].includes(z)?table[Math.min(table.length-1,Math.floor(rng()*table.length))].slice():[];return {...s,zoneVersion:2,ladder,ladderIndex:0,ladderRevealed:false,ura,oumaPending:false,zoneZones:'0',zoneSets:'0',initialAward:ladder.length?String(ladder[0]):'0',giruSetting:setting,zone:z,zoneLeft:ladder.length||5,award:ladder.length?String(ladder[0]):'0',zero:false,color:'white'};}
 function oumaFreezeRate(s,c){return Math.min(.95,s.ura?c.oumaUraFreeze:c.oumaFreeze)*zoneAwardFactor(s.award,s.ura?200:100);}
 function prepareBet(value,options={},rng=Math.random){if(value?.entryStage==='confirmed'){const s=startZone(value,value.pendingZone,{...options,setting:value.giruSetting},rng);s.entryStage='';s.pendingZone='';return s;}if(value?.zone!=='ouma'||!value?.oumaPending)return value;const s=normalize(value);s.oumaPending=false;s.zero=rng()<oumaFreezeRate(s,config(options));if(!s.zero&&s.zoneLeft===0)return settleZone(s);return s;}
 function settleZone(value){const s=normalize(value);if(!s.zone)return s;s.remaining=(integer(s.remaining)+integer(s.award)).toString();s.zone='';s.color='white';s.zoneLeft=0;s.zero=false;s.oumaPending=false;return s;}
 function afterBonus(v,c,won=0){const s=v?.phase==='art'?normalize(v):normalize({});s.sets=(integer(s.sets)+integer(won)).toString();if(integer(s.remaining)===0n&&integer(s.sets)>0n){s.remaining=String(config(c).initial);s.sets=(integer(s.sets)-1n).toString();}return integer(s.remaining)>0n||integer(s.stock)>0n||s.zone?s:{phase:'normal',remaining:0,success:false};}

 const atRoleRules={
  WEAK_SUICA:{up:.05,hit:.1,values:[10,20,30],weights:[.7,.25,.05]},
  STRONG_SUICA:{up:.5,hit:.5,values:[20,30,50,100,300],weights:[.6,.3,.098,.0018,.0002]},

  CHANCE_A:{up:.45,hit:4/15,values:[10,20,30],weights:[.5,.35,.15]},
  CHANCE_B:{up:.45,hit:4/15,values:[10,20,30],weights:[.5,.35,.15]}
 };
 function zoneGroupWeights(setting,boost=false,preparation=false){
  const row=zoneWeights[validSetting(setting)-1].map((w,i)=>w*(boost&&i>=3?2:1)*Math.exp((preparation?0:tuning.tilts[validSetting(setting)-1])*i));
  const total=row.reduce((a,b)=>a+b,0),weak=row.slice(0,3).reduce((a,b)=>a+b,0)/total;
  return [weak*100,(1-weak)*(1-superZoneChance)*100,(1-weak)*superZoneChance*100];
 }
 function atZoneWeights(setting,boost=false,preparation=false){return zoneGroupWeights(setting,boost,preparation).flatMap(p=>[p/3,p/3,p/3]);}
 function pickAtZone(setting,boost=false,rng=Math.random,preparation=false){
  const row=atZoneWeights(setting,boost,preparation);let roll=rng()*100;const i=row.findIndex(w=>(roll-=w)<0);return zoneIds[i<0?8:i];
 }
 // Soft restraint on new AT rewards, based on actual session net points.
 const netLimits=[2000,2000,4000,4000,5000,0];
 const lossRewardControl={threshold:-2000,multiplier:1.5};
 const netRewardControl={startRatio:0,floor:.05};
 function netRewardFactor(setting,netPt=0){
  const limit=netLimits[validSetting(setting)-1],net=Number(netPt);
  if(Number.isFinite(net)&&net<=lossRewardControl.threshold)return lossRewardControl.multiplier;
  if(!limit||!Number.isFinite(net)||net<=limit*netRewardControl.startRatio)return 1;
  const start=limit*netRewardControl.startRatio,progress=Math.min(1,(net-start)/(limit-start));
  return 1-(1-netRewardControl.floor)*progress;
 }
 function resolveAtRole(s,role,setting,rng=Math.random,netPt=0){
  const factor=netRewardFactor(setting,netPt),boost=Math.max(1,factor);
  const wasHigh=!!s.atHigh,held=wasHigh&&s.atHighLeft>0,out={wasHigh,direct:0,zone:'',promoted:false};
  if(held)s.atHighLeft--;
  const rule=atRoleRules[role];
  if(rule){
   if(!wasHigh&&rng()<rule.up){s.atHigh=true;s.atHighLeft=10;out.promoted=true;}
   if(rng()<Math.min(1,rule.hit*boost)){let r=rng();const i=rule.weights.findIndex(w=>(r-=w)<0);out.direct=rule.values[i<0?rule.values.length-1:i];}
  }
  if(role==='STRONG_NOVA'||(role==='WEAK_NOVA'&&rng()<Math.min(1,(wasHigh?.75:.25)*boost*2)))out.zone=pickAtZone(setting,wasHigh&&role==='STRONG_NOVA',rng);
  if(wasHigh&&!held&&(role==='REPLAY'||role==='MISS')&&rng()<(role==='REPLAY'?.05:.08)){s.atHigh=false;s.atHighLeft=0;}
  if(factor<1){
   if(out.direct&&rng()>=factor)out.direct=0;
   if(out.zone&&rng()>=factor)out.zone='';
  }
  out.rewardFactor=factor;
  return out;
 }
 function step(value,options={},rng=Math.random,forced=''){
  if(forced==='STRONG_BELL')forced='BELL';
  const c=config(options);if(options.setting){c.rare=Math.min(.99,c.rare*rareFactor(options.setting));const factor=(1+.2*biasFor(options.setting))*zoneEntryScale[validSetting(options.setting)-1];c.big=Math.min(1,c.big*factor);c.zone=Math.min(1-c.big,c.zone*factor);}let s=normalize(prepareBet(value,options,rng)),freeOumaSpin=s.zone==='ouma'&&s.zero,result='MISS',message='',internalBonus=null,reverse=false,queuedEntered=false;
  let atOutcome=null;const finish=()=>{const z=s.zone,name=zoneName(s);s=settleZone(s);message=`${name}ゾーン終了 / ${'＋'+s.award+'pt'}`;};
  if(s.entryStage==='seven'){s.entryStage='roulette';return {result:'BIG',flow:s,zoneSpin:true,message:'赤7揃い！ 特化ゾーンルーレット'};}
  if(s.entryStage==='roulette'){s.entryStage='confirmed';return {result:'MISS',flow:s,zoneSpin:true,message:zoneName(s.pendingZone)+'ゾーン確定！'};}
  if(!s.zone&&forced==='BIG'){s.entryStage='roulette';s.giruSetting=validSetting(options.setting);s.pendingZone=pickZone(options.setting,rng);return {result:'BIG',flow:s,zoneSpin:true,message:'赤7揃い！ 特化ゾーンルーレット'};}
  if(forced.startsWith('ZONE_')){s=startZone(s,forced.slice(5),{...c,setting:options.setting},rng);return {atOutcome,result,flow:s,message:zoneName(s)+'ゾーン突入'};}
  if(!s.zone&&s.queuedZones.length){queuedEntered=true;const z=s.queuedZones.shift();s=startZone(s,z,{...c,setting:options.setting,allowUra:true},rng);}
  if(!s.zone&&integer(s.stock)>0n){s.stock=(integer(s.stock)-1n).toString();return {result:'MISS',flow:s,internalBonus:{kind:'BIG',source:'空ゾーンストック',internalResult:'BIG'}};}
  if(!s.zone&&integer(s.remaining)===0n)return {atOutcome,result,flow:{phase:'normal',remaining:0,success:false},message:'AT終了'};
  const mix=atMix(options.setting);c.rare=mix.chance;const roll=rng();result=s.zone?(roll<.6?'REPLAY':roll<.9?'BELL':'MISS'):(roll<paidBellChance(c.rare,15,mix.mean)?'BELL':'REPLAY');
  if(['NEBULA','MISS','BELL','REPLAY','WEAK_NOVA','STRONG_NOVA','SUPER_NOVA'].includes(forced))result=forced;
  if(s.zone){
   const rules=zoneRules(s,c),free=s.zero;
   if(!free)s.zoneLeft=Math.max(0,s.zoneLeft-1);
   if(rules.family==='ladder'){
    result=forced||drawLadderRole(s,c,rng);
    if(!s.ladderRevealed){s.ladderRevealed=true;result='MISS';message=zoneName(s)+' '+s.award+'pt確保 / '+s.ladder.join(' → ')+'pt';}
    else if(result==='MISS'){finish();}
    else {s.ladderIndex=Math.min(s.ladder.length-1,s.ladderIndex+1);s.award=String(s.ladder[s.ladderIndex]);message=zoneName(s)+' 突破！ '+s.award+'pt確保';if(!s.zoneLeft||s.ladderIndex===s.ladder.length-1)finish();}
   }else if(rules.family==='seven'){
    const r=rng();result=forced|| (r<rules.reset?'NEBULA':r<rules.reset+Math.min(rules.hit,1-rules.reset)?'BIG':'MISS');
    if(result==='NEBULA'){s.award=(integer(s.award)+10n).toString();s.zoneLeft=5;message=zoneName(s)+' nebula揃い！ ＋10pt / 残り5Gへリセット';}
    else if(result==='BIG'){let r=rng(),i=rules.weights.findIndex(w=>(r-=w)<0);const n=sevenValues[i<0?5:i];if(!forced&&zoneAwardFactor(s.award,n)<1&&rng()>=zoneTailControl.factor){result='MISS';message='7・nebulaを狙え';}else{s.award=(integer(s.award)+BigInt(n)).toString();message=zoneName(s)+' 7揃い！ ＋'+n+'pt';}}
    else message='7・nebulaを狙え';
    if(!s.zoneLeft)finish();
   }else{
    result=free?'SUPER_NOVA':forced|| (rng()<rules.hit?'SUPER_NOVA':'MISS');
    if(result==='SUPER_NOVA'){const n=(rng()<rules.hundred?100:50)*rules.awardMultiplier;if(!free&&!forced&&zoneAwardFactor(s.award,n)<1&&rng()>=zoneTailControl.factor){result='MISS';message='スーパーノヴァを狙え';}else{s.award=(integer(s.award)+BigInt(n)).toString();message=(free?'逢魔フリーズ！ 0G連 / ':'')+zoneName(s)+' スーパーノヴァ揃い ＋'+n+'pt';}}
    else message='スーパーノヴァを狙え';
    s.oumaPending=s.zone==='ouma'&&result==='SUPER_NOVA';s.zero=false;
    if(!s.zoneLeft&&!s.oumaPending)finish();
   }
  }else{
   // Remaining AT points are consumed by actual payout after role selection.
   const rare=forced==='RARE'||!!rareRoles[forced]||(!forced&&rng()<c.rare);if(rare)result=rareRoles[forced]?forced:drawAtRare(options.setting,rng);
   atOutcome=resolveAtRole(s,result,options.setting,rng,options.netPt);
   if(atOutcome.direct){s.remaining=(integer(s.remaining)+BigInt(atOutcome.direct)).toString();message='直乗せ＋'+atOutcome.direct+'pt';}
   if(atOutcome.zone){s.entryStage='seven';s.giruSetting=validSetting(options.setting);s.pendingZone=atOutcome.zone;message='特化ゾーン確定！ 赤7を狙え / pt減算停止';}
   const paid=s.entryStage?0n:BigInt(payout(result));s.remaining=(integer(s.remaining)>paid?integer(s.remaining)-paid:0n).toString();
   if(!s.zone&&!s.entryStage&&!internalBonus&&integer(s.remaining)===0n){if(integer(s.sets)>0n){s.remaining=String(c.initial);s.sets=(integer(s.sets)-1n).toString();return {atOutcome,result,flow:s,message:'次のATセット開始'};}message='AT終了';return {atOutcome,result,flow:{phase:'normal',remaining:0,success:false},message};}
  }
  return {atOutcome,result,flow:s,message,internalBonus,reverse,oumaFreeze:freeOumaSpin,zoneSpin:!!value.zone||queuedEntered};
 }
 function label(v){const s=normalize(v);return `AT ${s.remaining}pt / 待機${s.sets}SET${s.entryStage?' / '+({seven:'赤7を狙え・減算停止',roulette:'ルーレット・減算停止',confirmed:zoneName(s.pendingZone)+'ゾーン確定'}[s.entryStage]):''}${s.zone?' / '+zoneName(s)+' '+(s.zero?'0G連':s.oumaPending?'BETで継続抽選':s.zoneLeft+'G'):''}${integer(s.stock)>0n?' / BIGストック '+s.stock:''}${s.zone?' / 獲得'+s.award+'pt':''}`;}
 return {drawLadderRole,lossRewardControl,zoneTailControl,zoneAwardFactor,netRewardControl,netLimits,netRewardFactor,superZoneChance,zoneGroups,zoneGroupWeights,upgradeGuaranteedZone,bonusSpecialRates,zoneRules,ladderTables,ladderTableFor,ladderValues,sevenValues,sevenWeights,atZoneWeights,tuning,atMix,drawAtRare,atRoleRules,pickAtZone,resolveAtRole,rareRoles,rareTotal,rareMean,rareFactor,drawRare,roleProbabilities,bonusRoleProbabilities,preparationProbabilities,drawPreparationRole,zoneRoleWeights,zoneRoleMultiplier,paidBellChance,drawPreparation,zoneEntryScale,points,bonusTarget,payout,settleZone,prepareBet,oumaFreezeRate,baseZone,zoneName,zoneIds,names,defaults,direct,zoneWeights,pickZone,bonusSpecial,settingBias,biasFor,bonusSpecialFor,advanceBonus,drawPaidRole,drawBonus,config,normalize,enter,startZone,afterBonus,step,label};
})();
