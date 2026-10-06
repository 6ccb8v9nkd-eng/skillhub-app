/* SkillHub hotfix: Soft Skills as one flat dialogue library, without topic blocks. */
(function(){
  'use strict';

  const state=window.__shSoftFlatState||(window.__shSoftFlatState={q:'',page:1,pageSize:12});

  function rows(){
    const all=Array.isArray(window.S?.content)?window.S.content:[];
    const q=String(state.q||'').trim().toLocaleLowerCase('ru-RU');
    return all
      .filter(x=>x&&x.status==='published'&&x.section==='soft'&&x.type==='dialogue')
      .filter(x=>!q||String(x.title||x.question||'').toLocaleLowerCase('ru-RU').includes(q))
      .sort((a,b)=>String(a.title||a.question||'').localeCompare(String(b.title||b.question||''),'ru'));
  }

  function render(){
    const card=document.getElementById('modalCard');
    if(!card)return;
    const all=rows();
    const pages=Math.max(1,Math.ceil(all.length/state.pageSize));
    state.page=Math.max(1,Math.min(state.page,pages));
    const from=(state.page-1)*state.pageSize;
    const pageRows=all.slice(from,from+state.pageSize);
    const seen=typeof seenContentMap==='function'?seenContentMap():new Map();

    card.innerHTML=`
      <div class="modal-head">
        <div><h2>Soft Skills</h2><div class="muted small">${all.length} диалогов · без блоков и тем</div></div>
        <button class="btn secondary" onclick="closeModal()">✕</button>
      </div>
      <div class="sh-soft-flat-search">
        <input id="shSoftFlatSearch" value="${esc(state.q)}" placeholder="Найти диалог..." onkeydown="if(event.key==='Enter')shSoftFlatSearch(this.value)">
        <button class="btn secondary" onclick="shSoftFlatSearch(document.getElementById('shSoftFlatSearch')?.value||'')">Найти</button>
      </div>
      <div class="sh-soft-flat-list">
        ${pageRows.map(x=>`<div class="content-row sh-soft-flat-row">
          <div><b>${esc(x.title||x.question||'Диалог')}</b><div class="meta">${seen.has(x.id)?'✓ пройден':'ещё не пройден'}</div></div>
          <button class="btn primary" onclick="closeModal();startContent('${x.id}')">Начать</button>
        </div>`).join('')||'<div class="sh-soft-flat-empty">Диалоги не найдены.</div>'}
      </div>
      ${all.length>state.pageSize?`<div class="sh-soft-flat-pager">
        <button class="btn secondary" ${state.page<=1?'disabled':''} onclick="shSoftFlatPage(${state.page-1})">← Назад</button>
        <span>${state.page} из ${pages}</span>
        <button class="btn secondary" ${state.page>=pages?'disabled':''} onclick="shSoftFlatPage(${state.page+1})">Дальше →</button>
      </div>`:''}`;
  }

  window.openSoftHub=function(){
    state.q='';state.page=1;
    showModal('<div></div>');
    render();
  };
  window.shSoftFlatSearch=function(value){state.q=String(value||'').trim();state.page=1;render();};
  window.shSoftFlatPage=function(page){state.page=Number(page)||1;render();};

  if(!document.getElementById('shSoftFlatStyle')){
    const s=document.createElement('style');
    s.id='shSoftFlatStyle';
    s.textContent=`
      .sh-soft-flat-search{display:grid;grid-template-columns:1fr auto;gap:8px;margin:4px 0 14px}
      .sh-soft-flat-search input{min-width:0;border:1px solid var(--line);background:var(--panel2);color:var(--ink);border-radius:12px;padding:10px 12px;font:inherit}
      .sh-soft-flat-list{display:grid;gap:8px}
      .sh-soft-flat-row{border:1px solid var(--line);border-radius:14px;padding:12px 14px;background:var(--panel)}
      .sh-soft-flat-row>div{min-width:0}.sh-soft-flat-row b{display:block;line-height:1.3}
      .sh-soft-flat-pager{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;margin-top:14px}
      .sh-soft-flat-pager span{text-align:center;color:var(--muted);font-size:13px}.sh-soft-flat-pager button:last-child{justify-self:end}
      .sh-soft-flat-pager .btn:disabled{opacity:.35;pointer-events:none}
      .sh-soft-flat-empty{padding:24px;text-align:center;color:var(--muted)}
      @media(max-width:620px){.sh-soft-flat-search{grid-template-columns:1fr}.sh-soft-flat-search .btn{width:100%}.sh-soft-flat-row{align-items:center;gap:10px}.sh-soft-flat-row .btn{padding:9px 11px}}
    `;
    document.head.appendChild(s);
  }

  console.info('SkillHub: flat Soft dialogue library enabled');
})();
