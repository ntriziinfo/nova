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
 const optimized=new Map([["assets/symbols/gang-v3/bar.png", "assets/lossless-20261027/bar.webp"], ["assets/symbols/gang-v3/bell.png", "assets/lossless-20261027/bell.webp"], ["assets/symbols/gang-v3/blank-20261027.png", "assets/lossless-20261027/blank-20261027.webp"], ["assets/symbols/gang-v3/cherry-20261027.png", "assets/lossless-20261027/cherry-20261027.webp"], ["assets/symbols/gang-v3/miss.png", "assets/lossless-20261027/miss.webp"], ["assets/symbols/gang-v3/nova-bar-20261027.png", "assets/lossless-20261027/nova-bar-20261027.webp"], ["assets/symbols/gang-v3/nova-only-20261027.png", "assets/lossless-20261027/nova-only-20261027.webp"], ["assets/symbols/gang-v3/replay.png", "assets/lossless-20261027/replay.webp"], ["assets/symbols/gang-v3/seven.png", "assets/lossless-20261027/seven.webp"], ["assets/symbols/gang-v3/suika.png", "assets/lossless-20261027/suika.webp"], ["assets/symbols/seven-nebula-original.png", "assets/lossless-20261027/seven-nebula-original.webp"], ["assets/design/nova-cabinet-v1/cabinet-game.png", "assets/lossless-20261027/cabinet-game.webp"]]);
 const originals=new Map([...optimized].map(([source,target])=>[target,source]));
 function imageSource(src){src=originals.get(src)||src;return compact&&images.has(src)?'assets/mobile-20261013/'+images.get(src)+'.webp':(optimized.get(src)||src);}
 return Object.freeze({compact,imageSource,videoPreload:compact?'none':'auto'});
})();
