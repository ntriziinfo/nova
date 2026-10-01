/* Slump history only: no game RNG, payout or progression. */
globalThis.NovaHistory=(()=>{
  // Historical points are immutable. Write the current point through record();
  // restore/reset replaces the array. Weak keys release caches for discarded runs.
  const caches=new WeakMap();
  function remember(points,cache={}){
    cache.length=points.length;cache.tail=points.at(-1);
    cache.spin=cache.tail?.spin;cache.profit=cache.tail?.profit;
    cache.json=undefined;cache.compact=undefined;
    caches.set(points,cache);return cache;
  }
  function cached(points){
    const c=caches.get(points),tail=points.at(-1);
    return c&&c.length===points.length&&c.tail===tail&&c.spin===tail?.spin&&c.profit===tail?.profit
      ? c : remember(points);
  }
  function bounds(stats,c){
    // Exclude the mutable last point so a BET/settlement can undo its previous extreme.
    stats.slumpHigh=Math.max(c.high,Number(c.tail?.profit)||0);
    stats.slumpLow=Math.min(c.low,Number(c.tail?.profit)||0);
  }
  function adopt(stats,points){
    const c=remember(points,{normalized:true,high:0,low:0});
    for(let i=0;i<points.length-1;i++){
      c.high=Math.max(c.high,points[i].profit);c.low=Math.min(c.low,points[i].profit);
    }
    stats.slumpHistory=points;bounds(stats,c);return c;
  }
  function normalize(stats,reduce,maxPoints){
    const source=Array.isArray(stats.slumpHistory)?stats.slumpHistory:[];
    const known=cached(source);
    if(known.normalized){bounds(stats,known);return known;}
    const points=source.map(p=>({spin:Math.max(0,Number(p&&p.spin)||0),profit:Number(p&&p.profit)||0}))
      .filter(p=>Number.isFinite(p.profit));
    if(!points.length||points[0].spin!==0||points[0].profit!==0)points.unshift({spin:0,profit:0});
    points.sort((a,b)=>a.spin-b.spin);
    const unique=[];
    for(const p of points){const last=unique.at(-1);if(last&&last.spin===p.spin)last.profit=p.profit;else unique.push(p);}
    return adopt(stats,unique.length>maxPoints?reduce(unique,Math.floor(maxPoints*.75)):unique);
  }
  function record(stats,spin,profit,reduce,maxPoints){
    const c=normalize(stats,reduce,maxPoints),points=stats.slumpHistory,last=points.at(-1);
    if(last&&last.spin===spin){
      if(last.profit===profit)return false;
      last.profit=profit;
    }else{
      if(last){c.high=Math.max(c.high,last.profit);c.low=Math.min(c.low,last.profit);}
      points.push({spin,profit});
    }
    if(points.length>maxPoints)adopt(stats,reduce(points,Math.floor(maxPoints*.75)));
    else{
      remember(points,c);bounds(stats,c);
      // A restored/backwards game number needs the same normalization on the next call.
      if(spin<0||(last&&spin<last.spin)||!Number.isFinite(profit))c.normalized=false;
    }
    return true;
  }
  function compact(stats,reduce){
    const result={...stats},points=stats.slumpHistory;
    if(Array.isArray(points)&&points.length>600){
      const c=cached(points);
      result.slumpHistory=c.compact??=(reduce(points,450));
    }
    return result;
  }
  function stringify(value){
    const points=value.stats?.slumpHistory;
    if(!Array.isArray(points))return JSON.stringify(value);
    const c=cached(points);c.json??=JSON.stringify(points);
    // Preserve the save schema and both immediate recovery copies. Only the unchanged
    // graph is reused; settings, runtime and all other statistics are serialized afresh.
    const {stats,...rest}=value,{slumpHistory,...restStats}=stats;
    const head=JSON.stringify(rest),body=JSON.stringify(restStats);
    return head.slice(0,-1)+(head.length>2?',':'')+'"stats":'+body.slice(0,-1)
      +(body.length>2?',':'')+'"slumpHistory":'+c.json+'}}';
  }
  return {normalize,record,compact,stringify};
})();
