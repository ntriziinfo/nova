/* Bounded display statistics. Never changes game state or consumes lottery RNG. */
globalThis.NovaDataCounter=(()=>{
  const limit=20, keys=['dataNormalGames','dataAtGames','dataHitSeq'];
  const n=value=>Number.isFinite(Number(value))?Math.max(0,Number(value)):0;
  const names={sosuke:'宗介',toto:'とと',urapi:'うらぴ',giru:'ギル',sora:'空',ouma:'逢魔'};
  function snapshot(stats){return Object.fromEntries(keys.map(key=>[key,n(stats?.[key])]));}
  function init(stats){if(stats.dataLastHitSpin==null)stats.dataLastHitSpin=n(stats.totalSpins);}
  const zoneId=flow=>flow?.phase==='art'&&names[flow.zone]?(flow.ura?'ura_':'')+flow.zone:'';
  function adopt(stats,flow){init(stats);if(stats.dataActiveZone==null)stats.dataActiveZone=zoneId(flow);}
  function spin(stats,flow){
    init(stats);
    const key=flow?.phase==='art'?'dataAtGames':'dataNormalGames';
    stats[key]=n(stats[key])+1;
  }
  function hit(stats,kind,zone=''){
    init(stats);
    const spin=n(stats.totalSpins),seq=n(stats.dataHitSeq)+1;
    stats.dataHits=[...(stats.dataHits||[]),{seq,spin,kind,zone,games:Math.max(0,spin-n(stats.dataLastHitSpin))}].slice(-limit);
    stats.dataHitSeq=seq;stats.dataLastHitSpin=spin;
  }
  function zone(stats,flow){
    const id=zoneId(flow);
    if(id&&id!==stats.dataActiveZone)hit(stats,'ZONE',id);
    stats.dataActiveZone=id;
  }
  function title(hit){
    if(hit.kind==='CURRENT')return '現在';
    if(hit.kind!=='ZONE')return hit.kind;
    return (hit.zone.startsWith('ura_')?'裏':'')+(names[hit.zone.replace(/^ura_/,'')]||'特化')+'ゾーン';
  }
  function display(stats,base,start){
    const total=n(base?.totalSpins)+Math.max(0,n(stats.totalSpins)-n(base?start?.totalSpins:0));
    const output={total};
    for(const key of keys)output[key]=n(base?.[key])+Math.max(0,n(stats[key])-n(base?start?.[key]:0));
    const hits=(base?.dataHits||[]).map(h=>({...h}));
    for(const hit of (stats.dataHits||[]).filter(h=>!base||h.seq>n(start?.dataHitSeq))){
      const spin=n(base?.totalSpins)+Math.max(0,n(hit.spin)-n(base?start?.totalSpins:0));
      hits.push({...hit,spin,games:hits.length?Math.max(0,spin-hits.at(-1).spin):n(hit.games)});
    }
    output.hits=hits.slice(-limit);
    output.current=hits.length?Math.max(0,total-hits.at(-1).spin):Math.max(0,n(stats.totalSpins)-n(stats.dataLastHitSpin??stats.totalSpins));
    return output;
  }
  function graph(stats,base,start){
    if(!base)return stats.slumpHistory||[{spin:0,profit:0}];
    const history=(base.slumpHistory||[{spin:0,profit:0},{spin:n(base.totalSpins),profit:Number(base.profit)||0}]).map(p=>({...p}));
    for(const point of stats.slumpHistory||[]){
      if(n(point.spin)<n(start?.totalSpins))continue;
      const next={spin:n(base.totalSpins)+n(point.spin)-n(start?.totalSpins),profit:(Number(base.profit)||0)+(Number(point.profit)||0)-(Number(start?.profit)||0)};
      if(history.at(-1)?.spin===next.spin)history[history.length-1]=next;else history.push(next);
    }
    return history;
  }
  function render(root,view,totals){
    if(!root)return;
    const format=value=>n(value).toLocaleString('ja-JP');
    const set=(name,value)=>{const el=root.querySelector('[data-counter="'+name+'"]');if(el)el.textContent=value;};
    set('current',format(view.current));set('total',format(totals.totalSpins));
    set('big',format(totals.bigCount));set('at',totals.atFirstCountPartial?'—':format(totals.atFirstCount));
    set('normal',format(view.dataNormalGames));set('art',format(view.dataAtGames));
    const bars=root.querySelector('.novaHitBars');if(!bars)return;
    const columns=[...view.hits,{kind:'CURRENT',games:view.current}],fingerprint=JSON.stringify(columns);
    if(bars.dataset.values===fingerprint)return;
    bars.dataset.values=fingerprint;
    const nodes=columns.map((hit,i)=>{
      const column=document.createElement('button');column.type='button';column.className='novaHitColumn';column.dataset.kind=hit.kind;
      const label=title(hit)+' / '+format(hit.games)+'G';column.title=label;column.setAttribute('aria-label',label);
      const cells=document.createElement('span');cells.className='novaHitCells';
      for(let tick=10;tick>=1;tick--){const cell=document.createElement('i');cell.className=hit.games>(tick-1)*100?'lit':'';cells.append(cell);}
      const mark=document.createElement('span');mark.className='novaHitMark';mark.textContent=hit.games>1000?'+':hit.kind==='CURRENT'?'今':hit.kind==='ZONE'?'特':hit.kind==='BIG'?'B':'AT';
      column.append(cells,mark);column.addEventListener('click',()=>set('detail',label));return column;
    });
    bars.replaceChildren(...nodes);bars.scrollLeft=bars.scrollWidth;
    set('detail','直近20件 / 列を押すとG数・ゾーン名を表示');
  }
  return Object.freeze({limit,keys,snapshot,adopt,spin,hit,zone,display,graph,render});
})();
