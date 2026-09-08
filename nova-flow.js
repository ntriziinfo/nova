/* Pure game-flow rules. Licensed visual/audio assets are not processed here. */
globalThis.NovaFlow = (() => {
  const defaults = Object.freeze({czGames:15,strongGames:15,czMaxGames:20,strongMaxGames:20,czChance:.4,strongChance:.7,czDenom:120,strongDenom:600});
  const rt = Object.freeze({games:50,replay:.6,bell:.3,miss:.1,netPerGame:1.2});
  const bounded=(value,fallback,min,max)=>Number.isFinite(Number(value))?Math.min(max,Math.max(min,Number(value))):fallback;
  function config(value={}){
    value=value&&typeof value==='object'?value:{};
    const czGames=Math.round(bounded(value.czGames===10&&value.czMaxGames==null?15:value.czGames,15,1,100));
    const strongGames=Math.round(bounded(value.strongGames===10&&value.strongMaxGames==null?15:value.strongGames,15,1,100));
    return {czGames,strongGames,czMaxGames:Math.round(bounded(value.czMaxGames,Math.max(20,czGames),czGames,100)),strongMaxGames:Math.round(bounded(value.strongMaxGames,Math.max(20,strongGames),strongGames,100)),
      czChance:bounded(value.czChance,.4,0,1),strongChance:bounded(value.strongChance,.7,0,1),
      czDenom:bounded(value.czDenom,120,2,100000),strongDenom:bounded(value.strongDenom,600,2,100000)};
  }
  const rewriteRates=Object.freeze({WEAK_SUICA:.05,STRONG_SUICA:.50,STRONG_BELL:.40,CHANCE_A:.50,CHANCE_B:.10,WEAK_NOVA:.20,STRONG_NOVA:1});
  const lampConfidence=Object.freeze([.01,.05,.30,.60,.80,1]);
  function rewrite(value,role,options={},random=Math.random){
    const state=normalize(value);
    if(!['cz','strong_cz'].includes(state.phase))return state;
    const rate=bounded(options?.rewriteRates?.[role],rewriteRates[role]||0,0,1);
    state.winProbability+= (1-state.winProbability)*rate;
    if(!state.success && rate>0 && random()<rate)state.success=true;
    return state;
  }
  // Exponential tilting gives a marginal lamp distribution whose mean is p.
  // Bayes weighting makes P(win | final lamp i) exactly lampConfidence[i].
  function lampWeights(p){
    if(p<=.01)return [1,0,0,0,0,0];
    if(p>=1)return [0,0,0,0,0,1];
    let lo=-1000,hi=1000,w;
    for(let n=0;n<70;n++){
      const t=(lo+hi)/2,logs=lampConfidence.map(q=>t*q),m=Math.max(...logs);
      w=logs.map(v=>Math.exp(v-m));const z=w.reduce((a,b)=>a+b,0);
      w=w.map(v=>v/z);
      if(w.reduce((a,v,i)=>a+v*lampConfidence[i],0)<p)lo=t;else hi=t;
    }
    return w;
  }
  function drawLamp(value,random=Math.random){
    const s=normalize(value),p=s.winProbability??(s.success?1:0);
    const rollValue=s.lampRoll??random(),rainbowValue=s.rainbowRoll??random();
    if(p<.01)return {stage:s.success?6:1,rainbow:false};
    const w=lampWeights(p).map((v,i)=>v*(s.success?lampConfidence[i]:1-lampConfidence[i]));
    let roll=rollValue*w.reduce((a,b)=>a+b,0),index=w.findIndex(v=>(roll-=v)<0);
    if(index<0)index=s.success?5:0;
    const rainbow=index===5&&s.success&&rainbowValue<.5;
    return {stage:rainbow?5:index+1,rainbow,rainbowAt:1+Math.floor(rainbowValue*2*s.totalGames)};
  }
  function lampAtStop(lamp,stopOrder){
    if(!lamp||stopOrder!==3)return null;
    const elapsed=lamp.totalGames-lamp.remaining+1;
    const rainbow=!!lamp.rainbow&&elapsed>=(lamp.rainbowAt||1);
    return {stage:Math.min(lamp.stage,Math.ceil(6*elapsed/lamp.totalGames)),rainbow};
  }
  function normalize(value){
    if(value?.phase==='art')return NovaArt.normalize(value);
    if(value?.phase==='rt')return NovaArt.normalize({...value,phase:'art'});
    const phase=['cz','strong_cz','rt'].includes(value?.phase)?value.phase:'normal';
    const remaining=Math.max(0,Math.min(phase==='rt'?50:100,Math.floor(Number(value?.remaining)||0)));
    return phase==='normal'||remaining===0?{phase:'normal',remaining:0,success:false}:{phase,remaining,success:!!value.success,winProbability:bounded(value?.winProbability,phase==='strong_cz'?.7:.4,0,1),
      totalGames:Math.max(remaining,Math.round(bounded(value?.totalGames,10,1,100))),
      lampRoll:Number.isFinite(value?.lampRoll)?bounded(value.lampRoll,0,0,.999999999):null,
      rainbowRoll:Number.isFinite(value?.rainbowRoll)?bounded(value.rainbowRoll,0,0,.999999999):null};
  }
  function enterCZ(strong,options=defaults,random=Math.random){
    const cfg=config(options),success=random()<(strong?cfg.strongChance:cfg.czChance);
    const min=strong?cfg.strongGames:cfg.czGames,max=strong?cfg.strongMaxGames:cfg.czMaxGames;
    const games=min+Math.min(max-min,Math.floor(random()*(max-min+1)));
    return {phase:strong?'strong_cz':'cz',remaining:games,success,winProbability:strong?cfg.strongChance:cfg.czChance,totalGames:games,lampRoll:random(),rainbowRoll:random()};
  }
  function afterBonus(value,options,sets=0){return NovaArt.afterBonus(value,options,sets);}
  function advance(value){
    const state=normalize(value);
    return normalize({...state,remaining:Math.max(0,state.remaining-1)});
  }
  function drawEntry(options=defaults,random=Math.random){
    const cfg=config(options),roll=random();
    if(roll<1/cfg.strongDenom)return 'STRONG_CZ';
    if(roll<1/cfg.strongDenom+1/cfg.czDenom)return 'CZ';
    return '';
  }
  function drawRT(random=Math.random){
    const roll=random();
    return roll<rt.replay?'REPLAY':roll<rt.replay+rt.bell?'BELL':'MISS';
  }
  function label(value){
    if(value?.phase==='art'||value?.phase==='rt')return NovaArt.label(value);
    const s=normalize(value);
    return s.phase==='rt'?`RT 残り${s.remaining}G / 純増1.2pt`:
      s.phase==='cz'?`CZ 残り${s.remaining}G`:s.phase==='strong_cz'?`強CZ 残り${s.remaining}G`:'通常';
  }
  return Object.freeze({defaults,rewriteRates,lampConfidence,lampWeights,drawLamp,lampAtStop,rewrite,rt,config,normalize,enterCZ,afterBonus,advance,drawEntry,drawRT,label});
})();
