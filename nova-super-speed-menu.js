/* A body-level popup avoids the cabinet's pan/zoom and mobile transforms. */
globalThis.NovaSuperSpeedMenu=Object.freeze({
  create({button,onSelect,onStop}){
    const panel=document.createElement('div');
    panel.id='superSpeedMenu';panel.className='superSpeedMenu';panel.hidden=true;
    panel.setAttribute('role','dialog');panel.setAttribute('aria-label','超ハイスピードの終了条件');
    const heading=document.createElement('strong');heading.textContent='超ハイスピード';panel.append(heading);
    const choices=Object.entries(NovaSuperSpeed.modes).map(([mode,label])=>{
      const option=document.createElement('button');option.type='button';option.dataset.mode=mode;
      option.textContent=label;option.addEventListener('click',()=>{close();onSelect(mode);});
      panel.append(option);return {mode,option};
    });
    const stop=document.createElement('button');stop.type='button';stop.className='superSpeedMenuStop';
    stop.textContent='停止';stop.hidden=true;stop.addEventListener('click',()=>{close();onStop();});panel.append(stop);
    document.body.append(panel);
    button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls',panel.id);button.setAttribute('aria-expanded','false');
    const anchor=()=>globalThis.NovaMobile?.active()
      ? document.querySelector('.novaMobileControls [data-target="superSpeedBtn"]') || button : button;
    function position(){
      if(panel.hidden)return;
      const rect=anchor().getBoundingClientRect();
      panel.style.left=Math.max(8,Math.min(innerWidth-panel.offsetWidth-8,rect.right-panel.offsetWidth))+'px';
      panel.style.top=Math.max(8,rect.top-panel.offsetHeight-10)+'px';
    }
    function close(restoreFocus=true){
      if(panel.hidden)return;
      panel.hidden=true;button.setAttribute('aria-expanded','false');
      if(restoreFocus)anchor().focus({preventScroll:true});
    }
    function toggle(){
      if(!panel.hidden){close();return;}
      if(button.disabled)return;
      panel.hidden=false;button.setAttribute('aria-expanded','true');position();
      (choices.find(({option})=>!option.disabled)?.option || stop).focus({preventScroll:true});
    }
    const dismissOutside=event=>{
      if(!panel.contains(event.target) && !button.contains(event.target) && !anchor().contains(event.target))close(false);
    };
    document.addEventListener('pointerdown',dismissOutside,true);
    document.addEventListener('click',dismissOutside);
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&!panel.hidden){event.preventDefault();close();}
    });
    document.addEventListener('focusin',event=>{
      if(!panel.contains(event.target) && event.target!==button && event.target!==anchor())close(false);
    });
    window.addEventListener('resize',position,{passive:true});
    window.addEventListener('scroll',position,{passive:true,capture:true});
    return Object.freeze({toggle,update({running,mode,disabled}){
      for(const item of choices){
        item.option.disabled=!!disabled[item.mode];item.option.title=disabled[item.mode] || '';
        item.option.setAttribute('aria-pressed',String(running&&item.mode===mode));
      }
      stop.hidden=!running;
      if(button.disabled)close(false);else position();
    }});
  }
});
