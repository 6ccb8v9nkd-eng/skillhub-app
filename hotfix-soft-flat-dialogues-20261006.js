/* SkillHub hotfix: simple Soft hub — ordinary cases + manual trainers, no topic blocks. */
(function(){
  'use strict';

  const state=window.__shSoftFlatState||(window.__shSoftFlatState={q:'',page:1,pageSize:12,view:'hub'});

  function allSoft(){
    return (typeof S!=='undefined'&&Array.isArray(S.content)?S.content:[])
      .filter(x=>x&&x.status==='published'&&x.section==='soft');
  }
  function dialogues(){return allSoft().filter(x=>x.type==='dialogue');}
  function manuals(){return allSoft().filter(x=>x.type==='manual');}
  function filteredDialogues(){
    const q=String(state.q||'').trim().toLocaleLowerCase('ru-RU');
    return dialogues()
      .filter(x=>!q||String(x.title||x.question||'').toLocaleLowerCase('ru-RU').includes(q))
      .sort((a,b)=>String(a.title||a.question||'').localeCompare(String(b.title||b.question||''),'ru'));
  }
  function nextDialogue(){
    const rows=dialogues();if(!rows.length)return null;
    const seen=typeof seenContentMap==='function'?seenContentMap():new Map();
    const unseen=rows.filter(x=>!seen.has(x.id));
    if(unseen.length)return unseen[Math.floor(Math.random()*unseen.length)];
    return rows.slice().sort((a,b)=>(seen.get(a.id)||0)-(seen.get(b.id)||0))[0]||rows[0];
  }

  function renderHub(){
    const card=document.getElementById('modalCard');if(!card)return;
    const dc=dialogues().length,mc=manuals().length;
    card.innerHTML=`
      <div class="modal-head">
        <div><h2>Soft Skills</h2><div class="muted small">Выберите формат тренировки</div></div>
        <button class="btn secondary" onclick="closeModal()">✕</button>
      </div>
      <div class="sh-soft-format-grid">
        <article class="sh-soft-format-card">
          <div class="sh-soft-format-icon">💬</div>
          <div class="sh-soft-format-copy"><h3>Обычные кейсы</h3><p>Диалоги с клиентом и выбор лучшего ответа.</p><div class="meta">${dc} кейсов</div></div>
          <div class="sh-soft-format-actions"><button class="btn primary" onclick="shSoftStartDialogue()">Начать</button><button class="btn secondary" onclick="shSoftShowDialogues()">Выбрать кейс</button></div>
        </article>
        <article class="sh-soft-format-card">
          <div class="sh-soft-format-icon">✍️</div>
          <div class="sh-soft-format-copy"><h3>Ручные тренажёры</h3><p>Свободный ответ сотрудника с проверкой руководителя.</p><div class="meta">${mc} тренажёров</div></div>
          <div class="sh-soft-format-actions"><button class="btn primary" onclick="shSoftOpenManual()">Открыть</button></div>
        </article>
      </div>`;
  }

  function renderDialogueList(){
    const card=document.getElementById('modalCard');if(!card)return;
    const all=filteredDialogues();
    const pages=Math.max(1,Math.ceil(all.length/state.pageSize));
    state.page=Math.max(1,Math.min(state.page,pages));
    const from=(state.page-1)*state.pageSize;
    const pageRows=all.slice(from,from+state.pageSize);
    const seen=typeof seenContentMap==='function'?seenContentMap():new Map();
    card.innerHTML=`
      <div class="modal-head">
        <div><button class="sh-soft-back" onclick="shSoftBackToHub()">← Назад</button><h2>Обычные кейсы</h2><div class="muted small">${all.length} диалогов</div></div>
        <button class="btn secondary" onclick="closeModal()">✕</button>
      </div>
      <div class="sh-soft-flat-search">
        <input id="shSoftFlatSearch" value="${esc(state.q)}" placeholder="Найти кейс..." onkeydown="if(event.key==='Enter')shSoftFlatSearch(this.value)">
        <button class="btn secondary" onclick="shSoftFlatSearch(document.getElementById('shSoftFlatSearch')?.value||'')">Найти</button>
      </div>
      <div class="sh-soft-flat-list">
        ${pageRows.map(x=>`<div class="content-row sh-soft-flat-row"><div><b>${esc(x.title||x.question||'Диалог')}</b><div class="meta">${seen.has(x.id)?'✓ пройден':'ещё не пройден'}</div></div><button class="btn primary" onclick="closeModal();startContent('${x.id}')">Начать</button></div>`).join('')||'<div class="sh-soft-flat-empty">Кейсы не найдены.</div>'}
      </div>
      ${all.length>state.pageSize?`<div class="sh-soft-flat-pager"><button class="btn secondary" ${state.page<=1?'disabled':''} onclick="shSoftFlatPage(${state.page-1})">← Назад</button><span>${state.page} из ${pages}</span><button class="btn secondary" ${state.page>=pages?'disabled':''} onclick="shSoftFlatPage(${state.page+1})">Дальше →</button></div>`:''}`;
  }

  function renderManualFallback(){
    const card=document.getElementById('modalCard');if(!card)return;
    const rows=manuals().slice().sort((a,b)=>String(a.title||a.question||'').localeCompare(String(b.title||b.question||''),'ru'));
    card.innerHTML=`<div class="modal-head"><div><button class="sh-soft-back" onclick="shSoftBackToHub()">← Назад</button><h2>Ручные тренажёры</h2><div class="muted small">${rows.length} заданий</div></div><button class="btn secondary" onclick="closeModal()">✕</button></div><div class="sh-soft-flat-list">${rows.map(x=>`<div class="content-row sh-soft-flat-row"><div><b>${esc(x.title||x.question||'Ручной тренажёр')}</b><div class="meta">Свободный ответ → проверка РГ</div></div><button class="btn primary" onclick="closeModal();startManualContent('${x.id}')">Начать</button></div>`).join('')||'<div class="sh-soft-flat-empty">Ручных тренажёров пока нет.</div>'}</div>`;
  }

  window.openSoftHub=function(){state.q='';state.page=1;state.view='hub';showModal('<div></div>');renderHub();};
  window.shSoftStartDialogue=function(){const x=nextDialogue();if(!x){toast('В Soft Skills пока нет опубликованных кейсов');return}closeModal();startContent(x.id);};
  window.shSoftShowDialogues=function(){state.view='dialogues';state.q='';state.page=1;renderDialogueList();};
  window.shSoftBackToHub=function(){state.view='hub';state.q='';state.page=1;renderHub();};
  window.shSoftOpenManual=function(){
    if(typeof openManualSoft==='function'){closeModal();openManualSoft();return}
    renderManualFallback();
  };
  window.shSoftFlatSearch=function(value){state.q=String(value||'').trim();state.page=1;renderDialogueList();};
  window.shSoftFlatPage=function(page){state.page=Number(page)||1;renderDialogueList();};

  if(!document.getElementById('shSoftFlatStyle')){
    const s=document.createElement('style');s.id='shSoftFlatStyle';s.textContent=`
      .sh-soft-format-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:8px}
      .sh-soft-format-card{border:1px solid var(--line);background:var(--panel);border-radius:18px;padding:18px;display:grid;gap:12px;align-content:start}
      .sh-soft-format-icon{font-size:30px}.sh-soft-format-copy h3{margin:0 0 6px;font-size:19px}.sh-soft-format-copy p{margin:0 0 8px;color:var(--muted);line-height:1.45}
      .sh-soft-format-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:auto}.sh-soft-back{border:0;background:transparent;color:var(--primary);font:inherit;font-weight:850;padding:0 0 5px;cursor:pointer}
      .sh-soft-flat-search{display:grid;grid-template-columns:1fr auto;gap:8px;margin:4px 0 14px}.sh-soft-flat-search input{min-width:0;border:1px solid var(--line);background:var(--panel2);color:var(--ink);border-radius:12px;padding:10px 12px;font:inherit}
      .sh-soft-flat-list{display:grid;gap:8px}.sh-soft-flat-row{border:1px solid var(--line);border-radius:14px;padding:12px 14px;background:var(--panel)}.sh-soft-flat-row>div{min-width:0}.sh-soft-flat-row b{display:block;line-height:1.3}
      .sh-soft-flat-pager{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;margin-top:14px}.sh-soft-flat-pager span{text-align:center;color:var(--muted);font-size:13px}.sh-soft-flat-pager button:last-child{justify-self:end}.sh-soft-flat-pager .btn:disabled{opacity:.35;pointer-events:none}.sh-soft-flat-empty{padding:24px;text-align:center;color:var(--muted)}
      @media(max-width:620px){.sh-soft-format-grid{grid-template-columns:1fr}.sh-soft-format-actions .btn{flex:1}.sh-soft-flat-search{grid-template-columns:1fr}.sh-soft-flat-search .btn{width:100%}.sh-soft-flat-row{align-items:center;gap:10px}.sh-soft-flat-row .btn{padding:9px 11px}}
    `;document.head.appendChild(s);
  }
  console.info('SkillHub: Soft format chooser enabled');
})();
