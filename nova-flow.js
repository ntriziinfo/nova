/* Pure game-flow rules. Licensed visual/audio assets are not processed here. */
globalThis.NovaFlow = (() => {
  const defaults = Object.freeze({czGames:10,strongGames:10,czChance:.4,strongChance:.7,czDenom:120,strongDenom:600});
  const rt = Object.freeze({games:50,replay:.6,bell:.3,miss:.1,netPerGame:1.2});
  const bounded=(value,fallback,min,max)=>Number.isFinite(Number(value))?Math.min(max,Math.max(min,Number(value))):fallback;
  function config(value={}){
    value=value&&typeof value==='object'?value:{};
    return {czGames:Math.round(bounded(value.czGames,10,1,100)),strongGames:Math.round(bounded(value.strongGames,10,1,100)),
      czChance:bounded(value.czChance,.4,0,1),strongChance:bounded(value.strongChance,.7,0,1),
      czDenom:bounded(value.czDenom,120,2,100000),strongDenom:bounded(value.strongDenom,600,2,100000)};
  }
  function normalize(value){
    if(value?.phase==='art')return NovaArt.normalize(value);
    if(value?.phase==='rt')return NovaArt.normalize({...value,phase:'art'});
    const phase=['cz','strong_cz','rt'].includes(value?.phase)?value.phase:'normal';
    const remaining=Math.max(0,Math.min(phase==='rt'?50:100,Math.floor(Number(value?.remaining)||0)));
    return phase==='normal'||remaining===0?{phase:'normal',remaining:0,success:false}:{phase,remaining,success:!!value.success};
  }
  function enterCZ(strong,options=defaults,random=Math.random){
    const cfg=config(options);
    return {phase:strong?'strong_cz':'cz',remaining:strong?cfg.strongGames:cfg.czGames,success:random()<(strong?cfg.strongChance:cfg.czChance)};
  }
  function afterBonus(value,options){return NovaArt.afterBonus(value,options);}
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
  return Object.freeze({defaults,rt,config,normalize,enterCZ,afterBonus,advance,drawEntry,drawRT,label});
})();
