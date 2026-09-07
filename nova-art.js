/* ART rules. G counts are decimal strings so unlimited doubling stays exact. */
globalThis.NovaArt=(()=>{
 const names={sosuke:'宗介',toto:'とと',urapi:'うらぴ',giru:'ギル',sora:'空',ouma:'逢魔'};
 const defaults={initial:50,rare:.03,big:.12,zone:.4,czArt:.25,urapiGames:5,urapiHit:.4,oumaGames:5,soraHit:.3,oumaHit:40/73,uraChance:.03,direct1:1400,direct2:1320,direct3:1240,direct4:1160,direct5:1080,direct6:1000};
 const zoneWeights=Object.freeze([[35,29,17,9,7,3],[34.5,29,17,9.5,7,3],[34,28.5,17.5,9.5,7.25,3.25],[33.5,28.5,17.5,9.5,7.5,3.5],[33,28,18,9.5,7.75,3.75],[32.5,27.5,18,10,8,4]].map(Object.freeze));
 function pickZone(setting=1,rng=Math.random){let roll=rng()*100;const weights=zoneWeights[validSetting(setting)-1];for(let i=0;i<6;i++){roll-=weights[i];if(roll<0)return Object.keys(names)[i];}return 'ouma';}
 const bonusSpecial=.0125;
 const settingBias=[-1.80,-1.66,-1.46,-1.23,-.925,-.55];
 const biasFor=setting=>settingBias[Math.max(0,Math.min(5,Math.round(Number(setting)||1)-1))];
 const bonusSpecialFor=setting=>.013*(1+.15*biasFor(setting));
 function advanceBonus(state,special=false){const remaining=Math.max(0,Number(state.bonusGamesRemaining)||0);return {bonusGamesRemaining:Math.max(0,remaining-1),bonusArtSets:(Number(state.bonusArtSets)||0)+(remaining>0&&special?1:0)};}
 function drawPaidRole(zeroChance=0,bellPay=8,rng=Math.random){const bell=(5.5/(1-zeroChance)-3)/(bellPay-3);return rng()<Math.max(0,Math.min(1,bell))?'BELL':'REPLAY';}
 function drawBonus(rng=Math.random,setting){const p=setting===undefined?bonusSpecial:bonusSpecialFor(setting);return rng()<p?'NEBULA':drawPaidRole(p,8,rng);}
 const direct=[1400,1320,1240,1160,1080,1000];
 const giruRates=Object.freeze(Array.from({length:6},()=>Object.freeze([.7649212002981711,.55,.20])));
 const validSetting=x=>Math.max(1,Math.min(6,Math.round(Number(x)||1)));
 function giruChance(award,setting=1,ura=false){const g=integer(award)/(ura?2n:1n);return giruRates[validSetting(setting)-1][g<80n?0:g<320n?1:2];}
 const integer=x=>{try{return BigInt(String(x??0))<0n?0n:BigInt(String(x??0));}catch{return 0n;}};
 function config(v={}){const c={...defaults};for(const k in c){const n=Number(v?.[k]);if(Number.isFinite(n))c[k]=k.startsWith('direct')?Math.max(2,Math.min(100000,Math.round(n))):k.endsWith('Games')||k==='initial'?Math.max(1,Math.min(1000,Math.round(n))):Math.max(0,Math.min(1,n));}c.zone=Math.min(c.zone,1-c.big);return c;}
 const baseZone=z=>String(z||'').replace(/^ura_/, '');
 const zoneName=v=>typeof v==='string'?(v.startsWith('ura_')?'裏':'')+(names[baseZone(v)]||''):(v?.ura?'裏':'')+(names[v?.zone]||'');
 const zoneIds=Object.keys(names).flatMap(z=>[z,'ura_'+z]);
 function normalize(v){return {queuedZones:Array.isArray(v?.queuedZones)?v.queuedZones.filter(z=>zoneIds.includes(z)):[],phase:'art',remaining:integer(v?.remaining).toString(),zone:names[baseZone(v?.zone)]?baseZone(v.zone):'',ura:!!v?.ura||String(v?.zone||'').startsWith('ura_'),zoneLeft:Math.max(0,Math.floor(Number(v?.zoneLeft)||0)),award:integer(v?.award).toString(),stock:integer(v?.stock).toString(),zoneSets:integer(v?.zoneSets).toString(),sets:integer(v?.sets).toString(),zero:!!v?.zero,color:v?.color||'white',awardTier:[1,4,10,70].includes(v?.awardTier)?v.awardTier:4,giruSetting:validSetting(v?.giruSetting)};}
 function enter(c){return normalize({remaining:config(c).initial});}
 function startZone(s,z,c,rng=Math.random){s=normalize(s);const setting=validSetting(c?.setting),allowUra=!!c?.allowUra,explicitUra=String(z).startsWith('ura_');z=baseZone(z);c=config(c);if(!names[z])return s;const ura=explicitUra||(allowUra&&rng()<c.uraChance);const tier=['sosuke','toto','urapi','ouma'].includes(z)?pickAwardTier(rng):4;return {...s,ura,zoneSets:'0',awardTier:tier,giruSetting:setting,zone:z,zoneLeft:{sosuke:3,toto:5,urapi:c.urapiGames,giru:1,sora:10,ouma:c.oumaGames}[z],award:z==='giru'?(ura?'10':'5'):'0',zero:false,color:'white'};}
 // A zone keeps its independently drawn award tier across spins and reloads.
 function pickAwardTier(rng=Math.random){const r=rng();return r<.8?1:r<.98?10:70;}
 function swingAward(base,s,rng=Math.random){const scaled=base*s.awardTier/4*(s.ura?2:1),whole=Math.floor(scaled),fraction=scaled-whole;return whole+(fraction>0&&rng()<fraction?1:0);}
 function afterBonus(v,c,won=0){const s=v?.phase==='art'?normalize(v):normalize({});s.sets=(integer(s.sets)+integer(won)).toString();if(integer(s.remaining)===0n&&integer(s.sets)>0n){s.remaining=String(config(c).initial);s.sets=(integer(s.sets)-1n).toString();}return integer(s.remaining)>0n||integer(s.stock)>0n||s.zone?s:{phase:'normal',remaining:0,success:false};}
 function step(value,options={},rng=Math.random,forced=''){
  const c=config(options);if(options.setting){c.rare=Math.min(.99,c.rare*(globalThis.NovaNormal?.rareFactor(options.setting)??1));const factor=1+.2*biasFor(options.setting);c.big=Math.min(1,c.big*factor);c.zone=Math.min(1-c.big,c.zone*factor);}let s=normalize(value),result='MISS',message='',internalBonus=null,reverse=false,queuedEntered=false;
  const add=n=>{s.remaining=(integer(s.remaining)+integer(n)).toString();};
  const finish=()=>{const z=s.zone;if(z!=='sora')add(s.award);message=`${zoneName(s)}ゾーン終了 / ${z==='sora'?s.zoneSets+'セット上乗せ':'＋'+s.award+'G'}`;s.zone='';s.zero=false;s.zoneLeft=0;};
  if(forced.startsWith('ZONE_')){s=startZone(s,forced.slice(5),{...c,setting:options.setting},rng);return {result,flow:s,message:zoneName(s)+'ゾーン突入'};}
  if(!s.zone&&s.queuedZones.length){queuedEntered=true;const z=s.queuedZones.shift();s=startZone(s,z,{...c,setting:options.setting,allowUra:true},rng);}
  if(!s.zone&&integer(s.stock)>0n){s.stock=(integer(s.stock)-1n).toString();return {result:'MISS',flow:s,internalBonus:{kind:'BIG',source:'空ゾーンストック',internalResult:'BIG'}};}
  if(!s.zone&&integer(s.remaining)===0n)return {result,flow:{phase:'normal',remaining:0,success:false},message:'ART終了'};
  const roll=rng();result=s.zone?(roll<.6?'REPLAY':roll<.9?'BELL':'MISS'):(roll<((5.5-c.rare*(globalThis.NovaNormal?.rareMean||0))/(1-c.rare)-3)/5?'BELL':'REPLAY');
  if(['NEBULA','MISS','BELL','REPLAY','WEAK_NOVA','STRONG_NOVA','SUPER_NOVA'].includes(forced))result=forced;
  if(s.zone){
   const z=s.zone;s.zoneLeft=Math.max(0,s.zoneLeft-1);
   if(z==='giru'){result='MISS';if(rng()<giruChance(s.award,s.giruSetting,s.ura)){s.award=(integer(s.award)*2n).toString();s.zero=true;reverse=true;message='逆回転成功！ '+s.award+'G / 次BET継続率'+Math.round(giruChance(s.award,s.giruSetting,s.ura)*100)+'%';}else finish();}
   if(z==='sosuke'||z==='toto'){
    // Per-role tables yield 20G/3 spins and 30G/5 spins at the default role mix.
    const base=z==='sosuke'?(result==='BELL'?10:result==='REPLAY'?(rng()<1/18?10:5):5):(result==='BELL'?10:result==='REPLAY'?5:0);const n=swingAward(base,s,rng);
    s.award=(integer(s.award)+BigInt(n)).toString();const a=integer(s.award);s.color=a>=50n?'rainbow':a>=40n?'red':a>=30n?'green':a>=20n?'yellow':a>=10n?'blue':'white';
    message=z==='toto'?zoneName(s)+'ゾーン / 最終Gで告知':`${zoneName(s)}ゾーン ＋${n}G`;if(!s.zoneLeft)finish();
   }
   if(z==='urapi'){if(forced==='NEBULA'||rng()<c.urapiHit){result='NEBULA';const n=swingAward(20,s,rng);s.award=(integer(s.award)+BigInt(n)).toString();message=`${zoneName(s)} nebula揃い ＋${n}G`;}if(!s.zoneLeft)finish();}
   if(z==='sora'){if(forced==='BIG'||rng()<Math.min(1,c.soraHit*(s.ura?2:1))){result='BIG';s.sets=(integer(s.sets)+1n).toString();s.zoneSets=(integer(s.zoneSets)+1n).toString();message=zoneName(s)+' 7揃い！ ART＋1セット';}else{result='MISS';message='7を狙え';}if(!s.zoneLeft)finish();}
   if(z==='ouma'){if(!['WEAK_NOVA','STRONG_NOVA','SUPER_NOVA'].includes(forced)&&rng()<c.oumaHit){const r=rng();result=r<.7?'WEAK_NOVA':r<.95?'STRONG_NOVA':'SUPER_NOVA';}const n=swingAward({WEAK_NOVA:20,STRONG_NOVA:50,SUPER_NOVA:200}[result]||0,s,rng);s.award=(integer(s.award)+BigInt(n)).toString();message=n?`${zoneName(s)} ${result} ＋${n}G`:'ノヴァを狙え';if(!s.zoneLeft)finish();}
  }else{
   s.remaining=(integer(s.remaining)-1n).toString();
   const rare=forced==='RARE'||!!globalThis.NovaNormal?.rare[forced]||(!forced&&rng()<c.rare);if(rare){result=globalThis.NovaNormal?.rare[forced]?forced:(globalThis.NovaNormal?NovaNormal.drawRare(rng):'WEAK_NOVA');const r=rng()/(result==='CHANCE_A'?1.2:result==='CHANCE_B'?.9:1);if(r<c.big)internalBonus={kind:'BIG',source:'ARTレア役',internalResult:'BIG'};else if(r<c.big+c.zone){s=startZone(s,pickZone(options.setting,rng),{...c,setting:options.setting,allowUra:true},rng);message=zoneName(s)+'ゾーン突入';}else message='ARTレア役';}
   if(!s.zone&&!internalBonus&&integer(s.remaining)===0n){if(integer(s.sets)>0n){s.remaining=String(c.initial);s.sets=(integer(s.sets)-1n).toString();return {result,flow:s,message:'次のARTセット開始'};}message='ART終了';return {result,flow:{phase:'normal',remaining:0,success:false},message};}
  }
  return {result,flow:s,message,internalBonus,reverse,zoneSpin:!!value.zone||queuedEntered};
 }
 function label(v){const s=normalize(v);return `ART ${s.remaining}G / 待機${s.sets}SET${s.zone?' / '+zoneName(s)+' '+(s.zero?'0G連':s.zoneLeft+'G'):''}${integer(s.stock)>0n?' / BIGストック '+s.stock:''}${s.zone==='giru'?' / '+s.award+'G / 継続'+Math.round(giruChance(s.award,s.giruSetting,s.ura)*100)+'%':''}`;}
 return {baseZone,zoneName,zoneIds,pickAwardTier,swingAward,names,defaults,direct,zoneWeights,pickZone,bonusSpecial,settingBias,biasFor,bonusSpecialFor,advanceBonus,drawPaidRole,drawBonus,giruRates,giruChance,config,normalize,enter,startZone,afterBonus,step,label};
})();
