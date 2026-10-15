/* Presentation speed only: never resolves a role, charges a BET or advances a flow. */
globalThis.NovaSuperSpeed=Object.freeze({
  multiplier:6,
  // BET-to-BET minimums. Audio and presentation locks can extend a game.
  pacing:Object.freeze({
    normal:Object.freeze({periodMs:2800,resultMs:500}),
    fast:Object.freeze({periodMs:200,resultMs:1000/12,nextMs:500/12}),
    at:Object.freeze({periodMs:800,resultMs:150,nextMs:100})
  }),
  remainingWait(lastBetAt,now,profile='normal'){
    if(lastBetAt===null||!Number.isFinite(lastBetAt))return 0;
    return Math.max(0,lastBetAt+(this.pacing[profile]||this.pacing.normal).periodMs-now);
  },
  resultDelay(ms,profile='normal'){
    const scaled=Math.max(50,Math.round((Number(ms)||0)/2));
    return profile==='fast'?scaled/6:profile==='at'?Math.min(scaled,this.pacing.at.resultMs):scaled;
  },
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
