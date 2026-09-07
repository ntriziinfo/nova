/* ART payout-point rules. Decimal strings preserve unlimited exact awards. */
globalThis.NovaArt=(()=>{
 const names={sosuke:'宗介',toto:'とと',urapi:'うらぴ',giru:'ギル',sora:'空',ouma:'逢魔'};
 const defaults={initial:275,payoutVersion:1,rare:.03,big:.12,zone:.4,czArt:.25,urapiGames:5,urapiHit:.4,oumaGames:5,soraHit:.3,oumaHit:40/73,uraChance:.03,soraReset:.02,soraUraReset:.05,oumaFreeze:.25,oumaUraFreeze:.5,direct1:1400,direct2:1320,direct3:1240,direct4:1160,direct5:1080,direct6:1000};
 const zoneWeights=Object.freeze([[35,29,17,9,7,3],[34.5,29,17,9.5,7,3],[34,28.5,17.5,9.5,7.25,3.25],[33.5,28.5,17.5,9.5,7.5,3.5],[33,28,18,9.5,7.75,3.75],[32.5,27.5,18,10,8,4]].map(Object.freeze));
 function pickZone(setting=1,rng=Math.random){let roll=rng()*100;const weights=zoneWeights[validSetting(setting)-1];for(let i=0;i<6;i++){roll-=weights[i];if(roll<0)return Object.keys(names)[i];}return 'ouma';}
 const guarantees=Object.freeze({normal:Object.freeze({sosuke:10,toto:20,urapi:40,giru:50,sora:1,ouma:50}),ura:Object.freeze({sosuke:60,toto:80,urapi:100,giru:150,sora:3,ouma:150})});
 const points=g=>(integer(g)*11n+1n)/2n;
 const bonusTarget=kind=>kind==='MID'?83:165;
 const payout=role=>globalThis.NovaNormal?NovaNormal.pay(role):(role==='BELL'?8:role==='REPLAY'?3:0);
 const bonusSpecial=.0125;
 const settingBias=[-2.7,-2.55,-2.27,-2.13,-1.8,-1.46];
 const biasFor=setting=>settingBias[Math.max(0,Math.min(5,Math.round(Number(setting)||1)-1))];
 const bonusSpecialFor=setting=>.013*(1+.15*biasFor(setting));
 function advanceBonus(state,special=false,reward=0){const target=bonusTarget(state.bonusKind),paid=Number(state.paid)||0;return {bonusTarget:target,bonusPointsRemaining:Math.max(0,target-paid-Math.max(0,Number(reward)||0)),bonusArtSets:(Number(state.bonusArtSets)||0)+(paid<target&&special?1:0)};}

 function drawPaidRole(zeroChance=0,bellPay=8,rng=Math.random){const bell=(5.5/(1-zeroChance)-3)/(bellPay-3);return rng()<Math.max(0,Math.min(1,bell))?'BELL':'REPLAY';}
 function drawBonus(rng=Math.random,setting){const p=setting===undefined?bonusSpecial:bonusSpecialFor(setting);return rng()<p?'NEBULA':drawPaidRole(p,8,rng);}
 const direct=[1400,1320,1240,1160,1080,1000];
 const giruRates=Object.freeze({normal:[.7702549139553321,.55,.2],ura:[.8732025744756524,.65,.2]});
 function giruChance(award,setting=1,ura=false){const g=integer(award)*2n/11n,rates=ura?giruRates.ura:giruRates.normal;return rates[g<(ura?160n:80n)?0:g<(ura?640n:320n)?1:2];}
 const validSetting=x=>Math.max(1,Math.min(6,Math.round(Number(x)||1)));
 const integer=x=>{try{return BigInt(String(x??0))<0n?0n:BigInt(String(x??0));}catch{return 0n;}};
 function config(v={}){if(v?.payoutVersion!==1&&v?.initial!=null)v={...v,initial:Number(points(v.initial)),payoutVersion:1};const c={...defaults};for(const k in c){const n=Number(v?.[k]);if(Number.isFinite(n))c[k]=k.startsWith('direct')?Math.max(2,Math.min(100000,Math.round(n))):k==='initial'?Math.max(1,Math.min(Number.MAX_SAFE_INTEGER,Math.round(n))):k.endsWith('Games')?Math.max(1,Math.min(1000,Math.round(n))):Math.max(0,Math.min(1,n));}c.zone=Math.min(c.zone,1-c.big);return c;}
 const baseZone=z=>String(z||'').replace(/^ura_/, '');
 const zoneName=v=>typeof v==='string'?(v.startsWith('ura_')?'裏':'')+(names[baseZone(v)]||''):(v?.ura?'裏':'')+(names[v?.zone]||'');
 const zoneIds=Object.keys(names).flatMap(z=>[z,'ura_'+z]);
 function normalize(v){if(v?.payoutVersion!==1)v={...v,remaining:points(v?.remaining).toString(),award:points(v?.award).toString(),initialAward:points(v?.initialAward).toString(),payoutVersion:1};return {payoutVersion:1,queuedZones:Array.isArray(v?.queuedZones)?v.queuedZones.filter(z=>zoneIds.includes(z)):[],phase:'art',remaining:integer(v?.remaining).toString(),zone:names[baseZone(v?.zone)]?baseZone(v.zone):'',ura:!!v?.ura||String(v?.zone||'').startsWith('ura_'),zoneLeft:Math.max(0,Math.floor(Number(v?.zoneLeft)||0)),award:integer(v?.award).toString(),initialAward:integer(v?.initialAward).toString(),stock:integer(v?.stock).toString(),zoneSets:integer(v?.zoneSets).toString(),sets:integer(v?.sets).toString(),oumaPending:!!v?.oumaPending,zero:!!v?.zero,color:v?.color||'white',awardTier:[1,4,10,70].includes(v?.awardTier)?v.awardTier:4,giruVersion:v?.giruVersion===3?3:0,giruBase:Math.min(5,Math.max(0,Math.floor(Number(v?.giruBase)||0))),giruContinues:Math.max(0,Math.floor(Number(v?.giruContinues)||0)),giruSetting:validSetting(v?.giruSetting)};}
 function enter(c){return normalize({payoutVersion:1,remaining:config(c).initial});}
 function startZone(s,z,c,rng=Math.random){s=normalize(s);const setting=validSetting(c?.setting),allowUra=!!c?.allowUra,explicitUra=String(z).startsWith('ura_');z=baseZone(z);c=config(c);if(!names[z])return s;const ura=explicitUra||(allowUra&&rng()<c.uraChance);const tier=['sosuke','toto','urapi','ouma'].includes(z)?pickAwardTier(rng):4;return {...s,giruVersion:3,giruBase:0,giruContinues:0,ura,oumaPending:false,zoneSets:z==='sora'?String(guarantees[ura?'ura':'normal'][z]):'0',sets:(integer(s.sets)+(z==='sora'?BigInt(guarantees[ura?'ura':'normal'][z]):0n)).toString(),initialAward:z==='sora'?'0':points(guarantees[ura?'ura':'normal'][z]).toString(),awardTier:tier,giruSetting:setting,zone:z,zoneLeft:{sosuke:3,toto:5,urapi:c.urapiGames,giru:2,sora:10,ouma:c.oumaGames}[z],award:z==='sora'?'0':points(guarantees[ura?'ura':'normal'][z]).toString(),zero:false,color:'white'};}
 // A zone keeps its independently drawn award tier across spins and reloads.
 function pickAwardTier(rng=Math.random){const r=rng();return r<.8?1:r<.98?10:70;}
 function swingAward(base,s,rng=Math.random,extra=1){const scaled=base*s.awardTier/4*(s.ura?({sosuke:5,toto:10/3,urapi:3.75,ouma:3}[s.zone]||1):1)*extra*5.5,whole=Math.floor(scaled),fraction=scaled-whole;return whole+(fraction>0&&rng()<fraction?1:0);}
 function resetGamesMean(q){return q===0?10:(Math.pow(1-q,-10)-1)/q;}
 function soraRates(s,c){const reset=Math.min(.2,s.ura?c.soraUraReset:c.soraReset),seven=Math.min(1-reset,c.soraHit*(s.ura?2:1)*10/resetGamesMean(reset));return {reset,seven};}
 function oumaFreezeRate(s,c){return Math.min(.95,s.ura?c.oumaUraFreeze:c.oumaFreeze);}
 function prepareBet(value,options={},rng=Math.random){if(value?.zone!=='ouma'||!value?.oumaPending)return value;const s=normalize(value);s.oumaPending=false;s.zero=rng()<oumaFreezeRate(s,config(options));if(!s.zero&&s.zoneLeft===0)return settleZone(s);return s;}
 function settleZone(value){const s=normalize(value);if(!s.zone)return s;if(s.zone!=='sora')s.remaining=(integer(s.remaining)+integer(s.award)).toString();s.zone='';s.color='white';s.zoneLeft=0;s.zero=false;s.oumaPending=false;return s;}
 function afterBonus(v,c,won=0){const s=v?.phase==='art'?normalize(v):normalize({});s.sets=(integer(s.sets)+integer(won)).toString();if(integer(s.remaining)===0n&&integer(s.sets)>0n){s.remaining=String(config(c).initial);s.sets=(integer(s.sets)-1n).toString();}return integer(s.remaining)>0n||integer(s.stock)>0n||s.zone?s:{phase:'normal',remaining:0,success:false};}
 function step(value,options={},rng=Math.random,forced=''){
  const c=config(options);if(options.setting){c.rare=Math.min(.99,c.rare*(globalThis.NovaNormal?.rareFactor(options.setting)??1));const factor=1+.2*biasFor(options.setting);c.big=Math.min(1,c.big*factor);c.zone=Math.min(1-c.big,c.zone*factor);}let s=normalize(prepareBet(value,options,rng)),freeOumaSpin=s.zone==='ouma'&&s.zero,result='MISS',message='',internalBonus=null,reverse=false,queuedEntered=false;
  const finish=()=>{const z=s.zone,name=zoneName(s);s=settleZone(s);message=`${name}ゾーン終了 / ${z==='sora'?s.zoneSets+'セット上乗せ':'＋'+s.award+'pt'}`;};
  if(forced.startsWith('ZONE_')){s=startZone(s,forced.slice(5),{...c,setting:options.setting},rng);return {result,flow:s,message:zoneName(s)+'ゾーン突入'};}
  if(!s.zone&&s.queuedZones.length){queuedEntered=true;const z=s.queuedZones.shift();s=startZone(s,z,{...c,setting:options.setting,allowUra:true},rng);}
  if(!s.zone&&integer(s.stock)>0n){s.stock=(integer(s.stock)-1n).toString();return {result:'MISS',flow:s,internalBonus:{kind:'BIG',source:'空ゾーンストック',internalResult:'BIG'}};}
  if(!s.zone&&integer(s.remaining)===0n)return {result,flow:{phase:'normal',remaining:0,success:false},message:'ART終了'};
  const roll=rng();result=s.zone?(roll<.6?'REPLAY':roll<.9?'BELL':'MISS'):(roll<((5.5-c.rare*(globalThis.NovaNormal?.rareMean||0))/(1-c.rare)-3)/5?'BELL':'REPLAY');
  if(['NEBULA','MISS','BELL','REPLAY','WEAK_NOVA','STRONG_NOVA','SUPER_NOVA'].includes(forced))result=forced;
  if(s.zone){
   const z=s.zone,oumaZero=z==='ouma'&&s.zero;if(!oumaZero)s.zoneLeft=Math.max(0,s.zoneLeft-1);
   if(z==='giru'){result='MISS';if(s.giruVersion!==3){finish();}else if(s.giruBase===0){s.giruBase=1+Math.min(4,Math.floor(rng()*5));s.award=(integer(s.initialAward)+points(s.giruBase)).toString();s.zoneLeft=1;s.zero=false;message=zoneName(s)+' 基準'+points(s.giruBase)+'pt / 次Gから継続抽選';}else if(rng()<giruChance(integer(s.award)-integer(s.initialAward),s.giruSetting,s.ura)){s.award=(integer(s.initialAward)+(integer(s.award)-integer(s.initialAward))*2n).toString();s.giruContinues++;s.zero=true;reverse=true;message=zoneName(s)+' 逆回転成功！ '+s.award+'pt / '+s.giruContinues+'回継続';}else finish();}
   if(z==='sosuke'||z==='toto'){
    // Per-role tables yield 20G/3 spins and 30G/5 spins at the default role mix.
    const base=z==='sosuke'?(result==='BELL'?10:result==='REPLAY'?(rng()<1/18?10:5):5):(result==='BELL'?10:result==='REPLAY'?5:0);const n=swingAward(base,s,rng);
    s.award=(integer(s.award)+BigInt(n)).toString();const a=integer(s.award);s.color=a>=275n?'rainbow':a>=220n?'red':a>=165n?'green':a>=110n?'yellow':a>=55n?'blue':'white';
    message=z==='toto'?zoneName(s)+'ゾーン / 最終Gで告知':`${zoneName(s)}ゾーン ＋${n}pt`;if(!s.zoneLeft)finish();
   }
   if(z==='urapi'){if(forced==='NEBULA'||rng()<c.urapiHit){result='NEBULA';const n=swingAward(20,s,rng);s.award=(integer(s.award)+BigInt(n)).toString();message=`${zoneName(s)} nebula揃い ＋${n}pt`;}if(!s.zoneLeft)finish();}
   if(z==='sora'){const rates=soraRates(s,c),r=rng();if(forced==='NEBULA'||(!forced&&r<rates.reset)){result='NEBULA';s.zoneLeft=10;message=zoneName(s)+' nebula揃い！ 残り10Gへリセット';}else if(forced==='BIG'||(!forced&&r<rates.reset+rates.seven)){result='BIG';s.sets=(integer(s.sets)+1n).toString();s.zoneSets=(integer(s.zoneSets)+1n).toString();message=zoneName(s)+' 7揃い！ ART＋1セット';}else{result='MISS';message='7・nebulaを狙え';}if(!s.zoneLeft)finish();}
   if(z==='ouma'){if(!['WEAK_NOVA','STRONG_NOVA','SUPER_NOVA'].includes(forced)&&(oumaZero||rng()<c.oumaHit)){const r=rng();result=r<.7?'WEAK_NOVA':r<.95?'STRONG_NOVA':'SUPER_NOVA';}const n=swingAward({WEAK_NOVA:20,STRONG_NOVA:50,SUPER_NOVA:200}[result]||0,s,rng,1-oumaFreezeRate(s,c));s.award=(integer(s.award)+BigInt(n)).toString();message=n?`${oumaZero?'逢魔フリーズ！ 0G連 / ':''}${zoneName(s)} ${result} ＋${n}pt`:'ノヴァを狙え';s.oumaPending=['WEAK_NOVA','STRONG_NOVA','SUPER_NOVA'].includes(result);s.zero=false;if(!s.zoneLeft&&!s.oumaPending)finish();}
  }else{
   // Remaining ART points are consumed by actual payout after role selection.
   const rare=forced==='RARE'||!!globalThis.NovaNormal?.rare[forced]||(!forced&&rng()<c.rare);if(rare){result=globalThis.NovaNormal?.rare[forced]?forced:(globalThis.NovaNormal?NovaNormal.drawRare(rng):'WEAK_NOVA');const r=rng()/(result==='CHANCE_A'?1.2:result==='CHANCE_B'?.9:1);if(r<c.big)internalBonus={kind:'BIG',source:'ARTレア役',internalResult:'BIG'};else if(r<c.big+c.zone){s=startZone(s,pickZone(options.setting,rng),{...c,setting:options.setting,allowUra:true},rng);message=zoneName(s)+'ゾーン突入';}else message='ARTレア役';}
   const paid=BigInt(payout(result));s.remaining=(integer(s.remaining)>paid?integer(s.remaining)-paid:0n).toString();
   if(!s.zone&&!internalBonus&&integer(s.remaining)===0n){if(integer(s.sets)>0n){s.remaining=String(c.initial);s.sets=(integer(s.sets)-1n).toString();return {result,flow:s,message:'次のARTセット開始'};}message='ART終了';return {result,flow:{phase:'normal',remaining:0,success:false},message};}
  }
  return {result,flow:s,message,internalBonus,reverse,oumaFreeze:freeOumaSpin,zoneSpin:!!value.zone||queuedEntered};
 }
 function label(v){const s=normalize(v);return `ART ${s.remaining}pt / 待機${s.sets}SET${s.zone?' / '+zoneName(s)+' '+(s.zero?'0G連':s.oumaPending?'BETで継続抽選':s.zoneLeft+'G'):''}${integer(s.stock)>0n?' / BIGストック '+s.stock:''}${s.zone==='giru'?' / 基準'+(s.giruBase?points(s.giruBase):'未定')+'pt / '+s.award+'pt / '+s.giruContinues+'回継続':''}`;}
 return {points,bonusTarget,payout,guarantees,settleZone,prepareBet,resetGamesMean,soraRates,oumaFreezeRate,baseZone,zoneName,zoneIds,pickAwardTier,swingAward,names,defaults,direct,zoneWeights,pickZone,bonusSpecial,settingBias,biasFor,bonusSpecialFor,advanceBonus,drawPaidRole,drawBonus,giruRates,giruChance,config,normalize,enter,startZone,afterBonus,step,label};
})();
