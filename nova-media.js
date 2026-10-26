/* Loading policy only. No gameplay state, RNG or media playback timers. */
globalThis.NovaMedia=(()=>{
 const compact=!!globalThis.matchMedia?.('(max-width:1024px)').matches;
 const images=new Map([
  ['assets/symbols/gang-v3/nova-bar-20261027.png','nova-bar-20261027'],
  ['assets/design/nova-cabinet-v1/cabinet-game.png','cabinet-game'],
  ...['miss','replay','bell','suika','bar'].map(id=>['assets/symbols/gang-v3/'+id+'.png',id]),
  ...['icon_slump_graph_blue','icon_odds_percent_blue','icon_sound_red','super-speed-gold-20261006'].map(id=>['assets/ui/'+id+'.png',id]),
  ['assets/buttons/btn_auto_gold_transparent.png','btn_auto_gold_transparent']
 ]);
 function imageSource(src){return compact&&images.has(src)?'assets/mobile-20261013/'+images.get(src)+'.webp':src;}
 return Object.freeze({compact,imageSource,videoPreload:compact?'none':'auto'});
})();
