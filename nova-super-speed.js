/* Presentation speed only: never resolves a role, charges a BET or advances a flow. */
globalThis.NovaSuperSpeed=Object.freeze({
  multiplier:6,
  modes:Object.freeze({cz:'CZまで',bonus:'ボーナス当選まで',at:'AT初当たりまで',nonstop:'ノンストップ'}),
  reached(mode,flow,session={},normal={}){
    const at=this.atConfirmed(flow,session,normal);
    const bonus=!!normal.bonusPending || !!session.active || at;
    if(mode==='cz')return ['cz','strong_cz'].includes(flow?.phase) || bonus;
    if(mode==='bonus')return bonus;
    if(mode==='at')return at;
    return false;
  },
  atConfirmed(flow,session={},normal={}){
    return flow?.phase==='art' || (session.active && Number(session.bonusArtSets)>0) ||
      (!!normal.bonusPending && (normal.premiumBonus===true || Number(normal.prepSets)>0));
  },
  delay(ms,active){return active ? ms/6 : ms;}
});
