/* Visual setting hints; independent entropy, persisted with a resolved spin. */
globalThis.NovaCheckpointHint=(()=>{
 const colors={white:'#fff',blue:'#2196ff',yellow:'#ffe033',green:'#27ef69',purple:'#be59ff',red:'#ff2748',rainbow:'#fff'};
 function weights(setting){const s=Math.max(1,Math.min(6,Number(setting)||1));const row={blue:s>=2?.30:.03,yellow:s>=3?.20:.03,green:s>=4?.10:.03,purple:s>=4?.05:0,red:s>=5?.02:0,rainbow:s===6?.01:0};row.white=1-Object.values(row).reduce((a,b)=>a+b,0);return row;}
 function draw(setting,rng=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296){let r=rng();for(const [color,p]of Object.entries(weights(setting)))if((r-=p)<0)return color;return 'white';}
 function clear(){const h=document.getElementById('machine');if(h)delete h.dataset.checkpointRareHint;}
 function begin(spin,setting){clear();if(!spin?.resolved?.atOutcome?.checkpointQuiet||!['WEAK_SUICA','STRONG_SUICA','WEAK_NOVA','STRONG_NOVA','SUPER_NOVA'].includes(spin.result))return;const color=spin.resolved.checkpointHint||draw(setting);spin.resolved.checkpointHint=color;const h=document.getElementById('machine');h.dataset.checkpointRareHint=color;h.style.setProperty('--checkpoint-hint-color',colors[color]);}
 function sync(active){if(!active)clear();}
 return {weights,draw,begin,clear,sync};
})();
