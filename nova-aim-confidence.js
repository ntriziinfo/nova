/* Display-only confidence. Never consumes the lottery's Math.random stream. */
globalThis.NovaAimConfidence=(()=>{
 const random=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296;
 // Joint probabilities of color and win. A no-cue miss bucket permits a 20%
 // blue cue even where the underlying win probability is below 20%.
 function table(prior){
  const p=Math.max(0,Math.min(1,prior));
  if(p<.2)return [{color:'blue',win:p,miss:4*p},{color:null,win:0,miss:1-5*p}];
  const rainbow=p>.905?(p-.9)/.1:Math.min(.05,(p-.2)/.8);
  const red=Math.max(0,(p-.2-.8*rainbow)/.7),blue=Math.max(0,1-red-rainbow);
  return [{color:'blue',win:blue*.2,miss:blue*.8},{color:'red',win:red*.9,miss:red*.1},{color:'rainbow',win:rainbow,miss:0}];
 }
 function pick(prior,won,rng=random){
  const rows=table(prior),key=won?'win':'miss',total=rows.reduce((n,r)=>n+r[key],0);
  if(total<=0)return won?'rainbow':null;
  let roll=rng()*total;
  return (rows.find(r=>(roll-=r[key])<0)||rows.at(-1)).color;
 }
 function prepare(resolved,options={},rng=random){
  if(resolved.aimDisplay)return resolved.aimDisplay;
  const art=globalThis.NovaArt,f=resolved.zoneStartFlow||resolved.flowBefore,c=art?.config(options);
  if(!art||!f)return null;
  const aim=resolved.aim,challenge=resolved.researchChallenge;
  let prior,won;
  if(aim?.symbol==='seven'&&aim.guide!==false){
   won=aim.result==='BIG';
   if(aim.guaranteed||aim.forced||aim.initialAward)prior=won?1:0;
   else{
    const rates=art.sevenAimRules(f,c),p=Math.max(.2,Math.min(1,rates.hit+rates.reset));
    prior=p/(p+.5*(1-p));
   }
  }else if(challenge?.priorAim){
   won=!!challenge.won;
   if(challenge.priorAim==='rare'||art.rareRoles[challenge.role]||challenge.role==='SUPER_NOVA')prior=1;
   else prior=art.challengeAimChance(challenge.targetChance??(challenge.source==='initial'?.5:.65),options.setting);
  }else if(resolved.zoneSpin&&!aim&&!resolved.oumaFreeze&&!resolved.oumaFailed&&!resolved.artReverse&&!f.entryStage&&['ouma','urapi'].includes(String(f.zone).replace(/^ura_/,''))){
   won=Number(resolved.zoneAward)>0;
   const floor=f.zone==='urapi'?50:f.ura?500:100;
   prior=Number(f.zoneLeft)<=1&&Number(f.award)<floor?1:art.zoneRules(f,c).hit;
  }else return null;
  const color=pick(prior,won,rng);
  return resolved.aimDisplay={version:1,color,guide:color!==null};
 }
 return {table,pick,prepare};
})();
