/* Idle PUSH is a viewer, never a game action or a new mode lottery. */
globalThis.NovaResultRecall=(()=>{
 let node,timer=null,state=null,eligible=false,initial=true,opened=false,options=null;
 function init(){
  if(node)return;
  const host=document.querySelector('.reelArea');if(!host)return;
  node=document.createElement('button');node.id='novaResultRecallPush';node.type='button';node.hidden=true;
  node.textContent='PUSH';node.setAttribute('aria-label','直近のモード示唆を見る');host.append(node);
  node.onclick=()=>{
   if(!eligible||node.hidden||!options)return;
   // Store one morning portrait too, so repeat presses/reloads do not reroll it.
   if(!state.lastModeResult){state.lastModeResult=options.makeInitial();options.save();}
   options.sound();opened=true;node.hidden=true;
   globalThis.NovaResults.show({...state.lastModeResult,recall:true});
  };
 }
 function cancel(){clearTimeout(timer);timer=null;if(node)node.hidden=true;}
 function close(){if(opened){opened=false;globalThis.NovaResults.hide();}}
 function sync(next){
  init();if(!node)return;
  if(state!==next.state){
   cancel();close();state=next.state;initial=true;eligible=false;
   const saved=state.resultCard;
   if(!state.lastModeResult&&saved?.color==='mode'&&['bonus','at'].includes(saved.kind))state.lastModeResult={...saved};
  }
  options=next;
  if(!next.eligible){eligible=false;cancel();close();return;}
  if(eligible)return;eligible=true;
  if(initial){initial=false;node.hidden=false;return;}
  timer=setTimeout(()=>{timer=null;if(eligible&&!opened)node.hidden=false;},5000);
 }
 function bet(){initial=false;eligible=false;cancel();close();}
 function remember(next,card){
  if(card?.color==='mode'&&['bonus','at'].includes(card.kind))next.lastModeResult={...card};
  // The live result now owns NovaResults; never hide it as a stale recalled card.
  opened=false;cancel();eligible=false;initial=false;
 }
 return Object.freeze({sync,bet,remember,get visible(){return opened;}});
})();
