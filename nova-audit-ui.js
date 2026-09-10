globalThis.NovaAuditUI=(()=>{
  const number=n=>Number(n||0).toLocaleString('ja-JP'),signed=n=>(n>0?'+':'')+number(n);
  function mount(recorder,{currentRun,graph,gameAtX,host,roleName=id=>id}){
    const button=document.createElement('button');button.type='button';button.id='novaAuditOpen';button.textContent='全履歴・区間の内訳';host.append(button);
    const status=document.createElement('span');status.id='novaAuditStatus';status.setAttribute('role','status');host.append(status);
    const dialog=document.createElement('dialog');dialog.id='novaAuditDialog';dialog.innerHTML=`<header><h2>遊技履歴</h2><button type="button" data-close aria-label="履歴を閉じる">×</button></header>
      <p>毎回転の出目・抽選結果・実BET・実払い出しを記録。BIG中と0G連は同じG数になるため、記録番号で順序を確認できます。</p>
      <label>試打 <select id="novaAuditRun"></select></label><p id="novaAuditCoverage"></p>
      <div class="novaAuditControls"><label>開始G <input id="novaAuditFrom" type="number" min="0" value="0"></label><label>終了G <input id="novaAuditTo" type="number" min="0" placeholder="最後まで"></label><label><input id="novaAuditImportant" type="checkbox" checked>主な出来事のみ表示</label><button type="button" id="novaAuditRefresh">表示更新</button></div>
      <p id="novaAuditSummary" role="status"></p><div class="novaAuditExports"><button type="button" id="novaAuditJson">この試打をJSON保存</button><button type="button" id="novaAuditCsv">指定区間をCSV保存</button></div>
      <nav><button type="button" id="novaAuditPrev">前の200件</button><span id="novaAuditPage"></span><button type="button" id="novaAuditNext">次の200件</button><button type="button" id="novaAuditLatest">末尾へ</button></nav>
      <div class="novaAuditTable"><table><thead><tr><th>G / 記録番号</th><th>状態・出来事</th><th>出目</th><th>実BET</th><th>実払出</th><th>累計差枚</th><th>AT残り / Lv</th></tr></thead><tbody id="novaAuditRows"></tbody></table></div>
      <details><summary>選んだ記録の詳細</summary><pre id="novaAuditDetail">行を選択すると、内部モード・特化テーブル・ナビ・強制フラグなどの記録を表示します。</pre></details>`;
    document.body.append(dialog);const $=s=>dialog.querySelector(s);let offset=0,matches=0,revision=0;
    const range=()=>({from:Math.max(0,Number($('#novaAuditFrom').value)||0),to:$('#novaAuditTo').value===''?Infinity:Math.max(0,Number($('#novaAuditTo').value)||0),important:$('#novaAuditImportant').checked,offset,limit:200});
    const tell=({error,pending,saving})=>{status.textContent=error||((pending||saving)?'履歴保存中':'履歴保存済み');button.textContent=error?'全履歴（保存エラー）':'全履歴・区間の内訳';status.classList.toggle('auditError',!!error);};recorder.onStatus=tell;recorder.notify();
    async function refresh(){
      const ticket=++revision;$('#novaAuditSummary').textContent='履歴を読み込み中…';
      try{const run=$('#novaAuditRun').value,r=range();if(r.from>r.to)throw Error('開始Gは終了G以下にしてください');const data=await recorder.scan(run,r);if(ticket!==revision)return;
        const {meta,summary,rows}=data;matches=summary.matches;
        $('#novaAuditCoverage').textContent=meta?`記録開始：${new Date(meta.start).toLocaleString('ja-JP')} / ${number(meta.startGame)}Gから。更新前の履歴は復元できません。朝一リセット後も過去の試打は残ります。`:'この試打の履歴はありません。';
        $('#novaAuditSummary').textContent=`区間：${number(summary.count)}記録 / 実BET ${number(summary.bet)}pt / 実払出 ${number(summary.paid)}pt / 差枚増減 ${signed(summary.paid-summary.bet)}pt${summary.boundaries?' / 復元境界あり：完全な連続区間ではありません':''}${data.error?' / '+data.error:''}。上乗せ予約ptは実払い出しに含めません。`;
        $('#novaAuditPage').textContent=matches?`${number(offset+1)}～${number(Math.min(matches,offset+rows.length))} / ${number(matches)}件`:'0件';$('#novaAuditPrev').disabled=offset===0;$('#novaAuditNext').disabled=offset+200>=matches;
        const body=$('#novaAuditRows');body.replaceChildren();for(const row of rows){const tr=document.createElement('tr'),f=row.state.flow||{},label=row.state.bonus.active?'BIG':NovaAudit.zone(f)||({normal:'通常',art:'AT',cz:'CZ',strong_cz:'強CZ'}[f.phase]||f.phase||'通常');
          for(const text of [`${number(row.game)}G / #${row.seq}`,label+' / '+(row.notes.join(' / ')||'消化'),row.result?roleName(row.result):'—',number(row.bet),number(row.paid),signed(row.net),f.phase==='art'?`${f.remaining}pt / Lv.${f.atLevel}`:'—']){const td=document.createElement('td');td.textContent=text;tr.append(td);}tr.tabIndex=0;tr.setAttribute('aria-label',row.game+'G 記録'+row.seq);const inspect=()=>{$('#novaAuditDetail').textContent=JSON.stringify(row,null,2);$('details').open=true;};tr.onclick=inspect;tr.onkeydown=e=>{if(e.key==='Enter')inspect();};body.append(tr);}
      }catch(e){if(ticket===revision)$('#novaAuditSummary').textContent='履歴を表示できません：'+e.message;}
    }
    async function open(options={}){offset=0;const runs=await recorder.runs();$('#novaAuditRun').replaceChildren();for(const m of runs){const o=document.createElement('option');o.value=m.id;o.textContent=new Date(m.start).toLocaleString('ja-JP')+' / 設定'+m.setting+' / '+number(m.startGame)+'G～'+number(m.last?.game)+'G';$('#novaAuditRun').append(o);}$('#novaAuditRun').value=options.run||currentRun();if(!$('#novaAuditRun').value&&runs.length)$('#novaAuditRun').value=runs[0].id;$('#novaAuditFrom').value=options.from??0;$('#novaAuditTo').value=options.to??'';if(!dialog.open)dialog.showModal();await refresh();}
    async function download(csv){
      try{const r=csv?range():{},data=await recorder.export($('#novaAuditRun').value,r);let content,type,name;
        if(csv){const quote=v=>'"'+String(v??'').replace(/"/g,'""')+'"';const lines=[['記録番号','G','種類','出目','実BET','実払出','累計差枚','AT残りpt','ATレベル','出来事','内部状態JSON']];for(const x of data.records)lines.push([x.seq,x.game,x.kind,x.result,x.bet,x.paid,x.net,x.state.flow?.remaining,x.state.flow?.atLevel,x.notes.join(' / '),JSON.stringify(x.state)]);content='\ufeff'+lines.map(a=>a.map(quote).join(',')).join('\r\n');type='text/csv;charset=utf-8';name='nova-history.csv';}
        else{content=JSON.stringify({format:'nova-play-audit',version:121,exportedAt:new Date().toISOString(),meta:data.meta,storageError:data.error,records:data.records},null,2);type='application/json';name='nova-history.json';}
        const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
      }catch(e){$('#novaAuditSummary').textContent='書き出しに失敗しました：'+e.message;}
    }
    button.onclick=()=>open();$('[data-close]').onclick=()=>dialog.close();$('#novaAuditRefresh').onclick=()=>{offset=0;refresh();};$('#novaAuditRun').onchange=()=>{offset=0;refresh();};$('#novaAuditImportant').onchange=()=>{offset=0;refresh();};$('#novaAuditPrev').onclick=()=>{offset=Math.max(0,offset-200);refresh();};$('#novaAuditNext').onclick=()=>{offset+=200;refresh();};$('#novaAuditLatest').onclick=()=>{offset=Math.max(0,Math.floor((matches-1)/200)*200);refresh();};$('#novaAuditJson').onclick=()=>download(false);$('#novaAuditCsv').onclick=()=>download(true);
    graph.title='クリックした地点の前後500Gの履歴を表示';graph.addEventListener('click',e=>{const game=gameAtX(e.clientX);open({run:currentRun(),from:Math.max(0,game-500),to:game+500});});
    return {open,refresh};
  }
  return {mount};
})();
