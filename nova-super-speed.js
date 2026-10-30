/* Presentation speed only: never resolves a role, charges a BET or advances a flow. */
globalThis.NovaSuperSpeed=Object.freeze({
  multiplier:6,
  // Minimum cadence for each counted game. Presentation holds may extend it;
  // they must never be repaid by rushing later games.
  targetPeriod(profile='normal'){return ['fast','at'].includes(profile)?720:1440;},
  budgetWait(budget,now,profile='normal'){
    return budget?.periodMs===this.targetPeriod(profile)?Math.max(0,budget.dueAt-now):0;
  },
  recordBet(_budget,now,profile='normal'){
    const periodMs=this.targetPeriod(profile);
    // Use this BET's actual time, not a deadline from before an AT/CZ/video.
    return {periodMs,dueAt:now+periodMs,lastAt:now};
  },
  // BET-to-BET minimums. Audio and presentation locks can extend a game.
  pacing:Object.freeze({
    normal:Object.freeze({periodMs:400,resultMs:1000/6,nextMs:500/6,delayScale:1/3}),
    normalAt:Object.freeze({periodMs:1200,resultMs:225,nextMs:150,delayScale:1.5}),
    fast:Object.freeze({periodMs:200,resultMs:1000/12,nextMs:500/12,delayScale:1/6}),
    at:Object.freeze({periodMs:600,resultMs:112.5,nextMs:75,delayScale:.75})
  }),
  remainingWait(lastBetAt,now,profile='normal'){
    if(lastBetAt===null||!Number.isFinite(lastBetAt))return 0;
    return Math.max(0,lastBetAt+(this.pacing[profile]||this.pacing.normal).periodMs-now);
  },
  resultDelay(ms,profile='normal'){
    const scaled=Math.max(50,Math.round((Number(ms)||0)/2));
    return profile==='fast'?scaled/6:profile==='normal'?scaled/3:Math.min(scaled,(this.pacing[profile]||this.pacing.normal).resultMs);
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
