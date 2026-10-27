/* Presentation statistics only; no lottery or payout changes. */
globalThis.NovaRoleCounter=(()=>{
  const roles=Object.freeze([
    {id:'Suika',key:'normalRoleSuikaCount',result:'WEAK_SUICA',label:'スイカ'},
    {id:'WeakNova',key:'normalRoleWeakNovaCount',result:'WEAK_NOVA',label:'弱チェリー'},
    {id:'StrongNova',key:'normalRoleStrongNovaCount',result:'STRONG_NOVA',label:'強チェリー'},
    {id:'Replay',key:'normalRoleReplayCount',result:'REPLAY',label:'リプレイ'},
    {id:'Bell',key:'normalRoleBellCount',result:'BELL',label:'ベル（ナビなし）'},
    {id:'NaviBell',key:'normalRoleNaviBellCount',result:'NAVI_BELL',label:'押し順ベル'}
  ].map(Object.freeze));
  const keys=Object.freeze(['normalRoleGames',...roles.map(role=>role.key)]);
  const number=value=>Number.isFinite(Number(value)) ? Math.max(0,Number(value)) : 0;
  function snapshot(stats){return Object.fromEntries(keys.map(key=>[key,number(stats?.[key])]));}
  function record(stats,result,resolved){
    if(resolved?.flowBefore?.phase!=='normal'||resolved.flowBefore.zero||resolved.bonusPendingAtStart||resolved.zoneSpin)return;
    stats.normalRoleGames=number(stats.normalRoleGames)+1;
    const role=roles.find(row=>row.result===(result==='BELL'&&resolved.normalBellNavi?'NAVI_BELL':result));
    if(role)stats[role.key]=number(stats[role.key])+1;
  }
  function display(stats,base,start){
    return Object.fromEntries(keys.map(key=>[key,number(base?.[key])+Math.max(0,number(stats?.[key])-number(base?start?.[key]:0))]));
  }
  function odds(count,games){return number(count)>0&&number(games)>0?`1/${(games/count).toFixed(1)}`:'—';}
  return Object.freeze({roles,keys,snapshot,record,display,odds});
})();
