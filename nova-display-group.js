/* A shared coordinate space keeps reels and every presentation in sync. */
(() => {
 const machine=document.getElementById('machine');if(!machine)return;
 const stage=document.createElement('section');stage.id='novaCabinetStage';stage.className='machine novaCabinetStage';
 machine.before(stage);stage.append(machine);
 const skin=machine.querySelector('.jagCabinetShell');
 if(skin){
  const frame=skin.cloneNode(true);frame.classList.add('novaDisplayFrame');
  frame.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
  machine.prepend(frame);stage.prepend(skin);
  const cover=document.createElement('div');cover.className='novaOriginalDisplayCover';cover.setAttribute('aria-hidden','true');stage.append(cover);
 }
 const controls=machine.querySelector('.playControls');if(controls)stage.append(controls);
 const dock=machine.querySelector('#audioDock');if(dock)stage.append(dock);
})();
