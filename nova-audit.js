/* Append-only local play audit. Observes committed outcomes; never draws game RNG. */
globalThis.NovaAudit=(()=>{
  const copy=v=>JSON.parse(JSON.stringify(v));
  const num=v=>Number(v)||0;
  const zone=f=>f?.zone?(f.ura?'裏':'')+({sosuke:'宗介',giru:'ギル',sora:'空',ouma:'逢魔',toto:'とと',urapi:'うらぴ'}[f.zone]||f.zone):'';
  function describe(before,after,detail={}){
    const out=[],a=before?.flow||{},b=after.flow||{};
    if(!before)out.push('記録開始（以前の内訳は未記録）');
    else{
      if(a.phase!=='art'&&b.phase==='art')out.push('AT開始 / Lv.'+b.atLevel+' / 残り'+b.remaining+'pt');
      if(a.phase==='art'&&b.phase!=='art')out.push(after.bonus.active?'ATからBIGへ':'AT終了');
      if(a.phase!==b.phase&&['cz','strong_cz'].includes(b.phase))out.push(b.phase==='cz'?'CZ開始':'強CZ開始');
      if(['cz','strong_cz'].includes(a.phase)&&a.phase!==b.phase)out.push('CZ終了'+(after.bonus.pending?' / BIG当選':''));
      if(!before.bonus.active&&after.bonus.active)out.push((after.bonus.tier==='upper'?'上位':'通常')+'BIG開始');
      if(before.bonus.active&&!after.bonus.active)out.push('BIG終了 / 払出'+before.bonus.paid+'pt / AT獲得'+before.bonus.sets+'SET');
      if(!before.bonus.pending&&after.bonus.pending)out.push('BIG当選 / '+(after.bonus.source||''));
      if(num(after.bonus.prepSets)>num(before.bonus.prepSets))out.push('BIG準備中 AT＋'+(num(after.bonus.prepSets)-num(before.bonus.prepSets))+'SET');
      if((after.bonus.prepZones?.length||0)>(before.bonus.prepZones?.length||0))out.push('BIG準備中 特化予約：'+after.bonus.prepZones.slice(before.bonus.prepZones?.length||0).join('・'));
      if(zone(a)!==zone(b)){if(zone(a))out.push(zone(a)+'ゾーン終了 / 確保'+(b.award??a.award??0)+'pt');if(zone(b))out.push(zone(b)+'ゾーン開始');}
      if(a.oumaPending&&!b.oumaPending)out.push(zone(a)+' フリーズ'+(b.zero?'当選 / 0G連':'非当選'));
      if(!a.burstPending&&b.burstPending)out.push(b.burstType==='ura'?'裏チャレンジ獲得':'爆発チャレンジ獲得');
      if(!a.comebackLeft&&b.comebackLeft)out.push('引き戻し5G開始');
      if(a.atLevel&&b.atLevel&&a.atLevel!==b.atLevel)out.push('AT Lv.'+a.atLevel+' → Lv.'+b.atLevel);
      if(before.internal?.mode!==after.internal?.mode)out.push('内部モード '+(after.internal?.mode||''));
      if(before.internal?.impurity!==after.internal?.impurity)out.push('穢れ '+(after.internal?.impurity??0)+'pt');
      if(before.setting!==after.setting)out.push('設定変更：'+before.setting+' → '+after.setting);
      if(num(after.game)<num(before.game)||num(after.bet)<num(before.bet)||num(after.paid)<num(before.paid))out.push('保存状態の復元境界（前後を連続集計しない）');
    }
    if(detail.burstEvent)out.push((after.flow?.burstType==='ura'?'裏チャレンジ':'爆発チャレンジ')+' '+({success:'成功',failure:'失敗',continue:'継続'}[detail.burstEvent]||detail.burstEvent));
    if(detail.burstReward?.type==='points')out.push('報酬＋'+detail.burstReward.points+'pt / '+(detail.burstReward.promoted?'Lv.'+detail.burstReward.level+'へ昇格':'昇格なし'));
    if(detail.burstReward?.type==='ura')out.push('裏ゾーン獲得：'+detail.burstReward.zone);
    if(detail.artSetWon)out.push('ネビュラ揃い / AT＋1SET');
    if(detail.oumaFreeze)out.push('逢魔フリーズ');
    if(detail.aim)out.push((detail.aim.guide!==false?'狙え '+detail.aim.color:'ナビなし')+' / 内部'+detail.aim.result+' / 停止結果'+(detail.visualResult||detail.result));
    if(detail.message)out.push(detail.message);
    if(detail.forced)out.push('強制フラグ：'+detail.forced);
    return [...new Set(out.filter(Boolean))];
  }
  function makeRecord(meta,state,detail){
    const prior=meta.last,bet=num(state.bet)-num(prior?.bet??state.bet),paid=num(state.paid)-num(prior?.paid??state.paid);
    const boundary=bet<0||paid<0||state.game<num(prior?.game??state.game),notes=describe(prior,state,detail);
    const important=notes.length>0||['WEAK_SUICA','STRONG_SUICA','CHANCE_A','CHANCE_B','WEAK_NOVA','STRONG_NOVA','SUPER_NOVA','FREEZE'].includes(detail.result);
    return {run:meta.id,seq:meta.seq+1,time:Date.now(),game:state.game,kind:detail.kind||'spin',result:detail.result||'',bet:boundary?0:bet,paid:boundary?0:paid,net:num(state.paid)-num(state.bet),boundary,important,notes,detail,state};
  }
  const request=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  class Recorder{
    constructor({scope,storage=globalThis.localStorage,indexedDB=globalThis.indexedDB,onStatus=()=>{}}){
      this.scope=scope;this.storage=storage;this.onStatus=onStatus;this.writer=crypto.randomUUID();this.queue=[];this.metas=new Map();this.inputs=[];this.loaded=false;this.busy=null;this.timer=null;this.error='';this.journalPrefix='nova_audit_pending_v1_'+scope;this.journalKey=this.journalPrefix+'_'+this.writer;this.recovered=[];
      this.ready=this.acquireWriter().then(()=>this.open(indexedDB)).then(()=>{this.loaded=true;for(const x of this.inputs)this.record(...x);this.inputs=[];return this.flush();}).catch(e=>{this.loaded=true;this.error='履歴保存を開始できません。未保存分はJSONで書き出せます：'+e.message;const inputs=this.inputs;this.inputs=[];for(const x of inputs)this.record(...x);this.notify();});
    }
    async acquireWriter(){
      if(!globalThis.navigator?.locks)return;
      await new Promise((resolve,reject)=>{navigator.locks.request('nova-audit-'+this.writer,()=>{resolve();return new Promise(release=>{this.releaseWriter=release;});}).catch(reject);});
    }
    async open(idb){
      if(!idb)throw Error('IndexedDB非対応');
      const op=idb.open('nova-play-audit-v1',1);
      op.onupgradeneeded=()=>{const db=op.result;db.createObjectStore('runs',{keyPath:'id'}).createIndex('scope','scope');db.createObjectStore('records',{keyPath:['run','seq']});};
      this.db=await request(op);this.db.onversionchange=()=>{this.db.close();this.error='履歴データの更新待ちです。再読み込みしてください';this.notify();};
      const runs=await request(this.db.transaction('runs').objectStore('runs').index('scope').getAll(this.scope));for(const m of runs)this.metas.set(m.id,m);
      const keys=Object.keys(this.storage).filter(k=>k===this.journalPrefix||k.startsWith(this.journalPrefix+'_'));
      for(const key of keys){
        if(key===this.journalKey)continue;
        const recover=()=>{const raw=this.storage.getItem(key);if(!raw)return;const journal=JSON.parse(raw);if(journal.scope!==this.scope)return;for(const m of journal.metas||[])if(!this.metas.has(m.id)||this.metas.get(m.id).seq<=m.seq)this.metas.set(m.id,m);this.queue.push(...(journal.records||[]).filter(r=>r.run&&Number.isInteger(r.seq)));this.inputs=[...(journal.inputs||[]),...this.inputs];this.recovered.push({key,raw});};
        const writer=key.slice(this.journalPrefix.length+1);
        if(writer&&globalThis.navigator?.locks)await navigator.locks.request('nova-audit-'+writer,{ifAvailable:true},lock=>{if(lock)recover();});else recover();
      }
      this.queue=[...new Map(this.queue.map(r=>[r.run+'/'+r.seq+'/'+r.writer,r])).values()].sort((a,b)=>a.run.localeCompare(b.run)||a.seq-b.seq);
    }
    notify(){this.onStatus({error:this.error,pending:this.queue.length+this.inputs.length,saving:!!this.busy});}
    record(state,detail={}){
      state=copy(state);detail=copy(detail);
      if(!this.loaded){this.inputs.push([state,detail]);this.notify();return;}
      let m=this.metas.get(state.run);
      if(!m){m={id:state.run,scope:this.scope,seq:0,start:Date.now(),startGame:state.game,setting:state.setting,config:state.config,version:121,last:null};this.metas.set(m.id,m);}
      if(JSON.stringify(state.config)!==JSON.stringify(m.currentConfig||m.config)){detail.config=state.config;detail.message=[detail.message,'設定値変更'].filter(Boolean).join(' / ');m.currentConfig=state.config;}
      delete state.config;
      if(detail.kind==='checkpoint'&&!detail.config&&m.last&&JSON.stringify(state)===JSON.stringify(m.last))return;
      const row=makeRecord(m,state,detail);row.writer=this.writer;m.seq=row.seq;m.last=state;m.updated=row.time;m.writer=this.writer;this.queue.push(row);
      if(this.queue.length>=100&&!this.busy)this.flush();
      else if(!this.timer)this.timer=setTimeout(()=>{this.timer=null;this.flush();},500);
    }
    journal(){
      try{const records=this.queue,metas=[...this.metas.values()].filter(m=>records.some(r=>r.run===m.id));if(records.length||this.inputs.length)this.storage.setItem(this.journalKey,JSON.stringify({scope:this.scope,metas,records,inputs:this.inputs}));else this.storage.removeItem(this.journalKey);}
      catch(e){this.error='履歴の退避に失敗しました。JSONを書き出してください：'+e.message;this.notify();}
    }
    async flush(){
      if(!this.loaded){this.journal();return;}
      if(this.busy){await this.busy.catch(()=>{});if(this.queue.length&&!this.error)return this.flush();return;}
      if(!this.queue.length){this.notify();return;}
      const identities=new Map();for(const r of this.queue){const key=r.run+'/'+r.seq;if(identities.has(key)&&identities.get(key)!==r.writer){this.error='別タブの同じ試打履歴と競合しました。全件をメモリに保持中です。JSONを書き出してください';this.journal();this.notify();return;}identities.set(key,r.writer);}
      this.journal();const batch=this.queue.slice(),metas=copy([...this.metas.values()].filter(m=>batch.some(r=>r.run===m.id)));
      this.busy=new Promise((resolve,reject)=>{let tx;try{tx=this.db.transaction(['runs','records'],'readwrite');for(const m of metas){const check=tx.objectStore('runs').get(m.id);check.onsuccess=()=>{const existing=check.result,first=batch.find(r=>r.run===m.id);if(existing&&existing.seq>=first.seq&&existing.writer!==first.writer){reject(Error('別タブの同じ試打履歴と競合しました。JSONを書き出してください'));tx.abort();return;}tx.objectStore('runs').put(m);for(const r of batch.filter(r=>r.run===m.id))tx.objectStore('records').put(r);};}tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('保存中断'));}catch(e){reject(e);}});
      this.notify();try{await this.busy;this.queue.splice(0,batch.length);this.error='';this.journal();if(!this.queue.length){for(const {key,raw} of this.recovered)if(this.storage.getItem(key)===raw)this.storage.removeItem(key);this.recovered=[];}}
      catch(e){this.error='履歴保存エラー。未保存分はメモリに保持中です。JSONを書き出してください：'+e.message;}
      finally{this.busy=null;this.notify();}
    }
    async runs(){await this.ready;return [...this.metas.values()].sort((a,b)=>b.start-a.start);}
    async scan(run,{from=0,to=Infinity,important=false,offset=0,limit=200,exportAll=false}={}){
      await this.ready;await this.flush();const rows=[],all=[],summary={count:0,matches:0,bet:0,paid:0,first:null,last:null,boundaries:0};
      const meta=this.metas.get(run);if(!meta)return {rows,summary,meta:null};
      const pending=new Map(this.queue.filter(r=>r.run===run).map(r=>[r.seq+'/'+r.writer,r]));
      const take=r=>{if(r.game<from||r.game>to)return;summary.count++;summary.bet+=r.bet;summary.paid+=r.paid;summary.boundaries+=r.boundary?1:0;summary.first??=r;summary.last=r;if(exportAll)all.push(r);if(!important||r.important){if(summary.matches>=offset&&rows.length<limit)rows.push(r);summary.matches++;}};
      if(this.db)await new Promise((resolve,reject)=>{const tx=this.db.transaction('records'),req=tx.objectStore('records').openCursor(IDBKeyRange.bound([run,0],[run,Number.MAX_SAFE_INTEGER]));req.onerror=()=>reject(req.error);req.onsuccess=()=>{const c=req.result;if(!c){resolve();return;}pending.delete(c.value.seq+'/'+c.value.writer);take(c.value);c.continue();};});
      for(const r of [...pending.values()].sort((a,b)=>a.seq-b.seq))take(r);
      return {meta:copy(meta),rows,summary,records:exportAll?all:undefined,error:this.error};
    }
    async export(run,range={}){return this.scan(run,{...range,exportAll:true,limit:0});}
  }
  return {Recorder,describe,makeRecord,zone};
})();
