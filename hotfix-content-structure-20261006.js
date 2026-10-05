/* SkillHub hotfix: structure the Content section without changing data or editors. */
(function(){
  'use strict';

  const state=window.__shContentUiState||(window.__shContentUiState={tab:'library',q:'',section:'all',type:'all',status:'all',page:1,pageSize:15});

  function typeName(t){
    return t==='dialogue'?'Диалог':t==='hardcase'?'Hard-кейс':t==='quiz'?'Кейс':t==='manual'?'Ручной кейс':'Материал';
  }
  function sectionLabel(s){
    try{return typeof secName==='function'?secName(s):String(s||'—')}catch(_){return String(s||'—')}
  }
  function setTab(tab){
    state.tab=tab;state.page=1;
    try{contentTab=tab}catch(_){}
    renderContent();
  }
  window.shContentSetTab=setTab;

  window.shContentSetFilter=function(key,value){
    if(!['q','section','type','status'].includes(key))return;
    state[key]=String(value||'');state.page=1;renderContentLibrary();
  };
  window.shContentSetPage=function(page){
    state.page=Math.max(1,Number(page)||1);renderContentLibrary();
    const pane=document.getElementById('contentPane');if(pane)pane.scrollIntoView({behavior:'smooth',block:'start'});
  };
  window.shContentClearFilters=function(){
    state.q='';state.section='all';state.type='all';state.status='all';state.page=1;renderContentLibrary();
  };

  function tabsHtml(){
    return `<div class="tabs sh-content-tabs">
      <button class="tab ${state.tab==='library'?'active':''}" onclick="shContentSetTab('library')">Материалы</button>
      <button class="tab ${state.tab==='create'?'active':''}" onclick="shContentSetTab('create')">Создать</button>
      <button class="tab ${state.tab==='import'?'active':''}" onclick="shContentSetTab('import')">Импорт Excel</button>
    </div>`;
  }

  window.renderContent=function(){
    const page=document.getElementById('page-content');if(!page)return;
    page.innerHTML=`${tabsHtml()}<div id="contentPane"></div>`;
    if(state.tab==='library')return renderContentLibrary();
    if(state.tab==='create'&&typeof renderCreateContent==='function')return renderCreateContent();
    if(state.tab==='import'&&typeof renderImportPane==='function')return renderImportPane();
  };

  window.renderContentLibrary=function(){
    const pane=document.getElementById('contentPane');if(!pane)return;
    const all=Array.isArray(S?.content)?S.content:[];
    const published=all.filter(x=>x.status==='published').length;
    const drafts=all.length-published;
    const sections=[...new Set(all.map(x=>String(x.section||'').trim()).filter(Boolean))];
    const types=[...new Set(all.map(x=>String(x.type||'').trim()).filter(Boolean))];
    const q=state.q.trim().toLocaleLowerCase('ru-RU');

    let rows=all.filter(x=>{
      if(state.section!=='all'&&String(x.section)!==state.section)return false;
      if(state.type!=='all'&&String(x.type)!==state.type)return false;
      if(state.status!=='all'&&String(x.status)!==state.status)return false;
      if(q){
        const hay=[x.title,x.question,x.topic,sectionLabel(x.section),typeName(x.type)].join(' ').toLocaleLowerCase('ru-RU');
        if(!hay.includes(q))return false;
      }
      return true;
    });

    const totalFiltered=rows.length;
    const pages=Math.max(1,Math.ceil(totalFiltered/state.pageSize));
    state.page=Math.min(state.page,pages);
    const from=(state.page-1)*state.pageSize;
    rows=rows.slice(from,from+state.pageSize);

    const sectionChips=[['all','Все',all.length],...sections.map(s=>[s,sectionLabel(s),all.filter(x=>String(x.section)===s).length])]
      .map(([value,label,count])=>`<button class="sh-content-chip ${state.section===value?'active':''}" onclick="shContentSetFilter('section','${jsq(value)}')"><span>${esc(label)}</span><b>${count}</b></button>`).join('');

    const list=rows.map(x=>{
      const title=String(x.title||x.question||'Без названия');
      const status=x.status==='published'?'Опубликовано':'Черновик';
      return `<article class="sh-content-item">
        <div class="sh-content-item-main">
          <div class="sh-content-item-top">
            <span class="pill ${x.status==='published'?'status-published':'status-draft'}">${status}</span>
            <span class="sh-content-type">${esc(typeName(x.type))}</span>
          </div>
          <h3>${esc(title)}</h3>
          <div class="meta">${esc(sectionLabel(x.section))} · ${esc(x.topic||'Без темы')}</div>
        </div>
        <div class="sh-content-item-actions">
          <button class="btn secondary" onclick="editContent('${x.id}')">Изменить</button>
          <details class="sh-content-more"><summary aria-label="Другие действия">•••</summary><div class="sh-content-more-menu"><button onclick="deleteContent('${x.id}')">Удалить материал</button></div></details>
        </div>
      </article>`;
    }).join('')||`<div class="sh-content-empty"><b>Материалы не найдены</b><span>Измените фильтры или поиск.</span><button class="btn secondary" onclick="shContentClearFilters()">Сбросить фильтры</button></div>`;

    const pager=totalFiltered>state.pageSize?`<div class="sh-content-pager">
      <button class="btn secondary" ${state.page<=1?'disabled':''} onclick="shContentSetPage(${state.page-1})">← Назад</button>
      <span>Страница <b>${state.page}</b> из ${pages} · ${totalFiltered} материалов</span>
      <button class="btn secondary" ${state.page>=pages?'disabled':''} onclick="shContentSetPage(${state.page+1})">Дальше →</button>
    </div>`:'';

    pane.innerHTML=`
      <section class="sh-content-head">
        <div><h2>Материалы</h2><p>Поиск, фильтры и компактный список вместо длинного полотна.</p></div>
        <button class="btn primary" onclick="shContentSetTab('create')">+ Создать материал</button>
      </section>
      <div class="sh-content-summary">
        <div><small>Всего</small><strong>${all.length}</strong></div>
        <div><small>Опубликовано</small><strong>${published}</strong></div>
        <div><small>Черновики</small><strong>${drafts}</strong></div>
      </div>
      <div class="sh-content-sections">${sectionChips}</div>
      <div class="sh-content-filters">
        <label class="sh-content-search"><span>Поиск</span><input value="${esc(state.q)}" placeholder="Название, тема, вопрос..." oninput="shContentSetFilter('q',this.value)"></label>
        <label><span>Тип</span><select onchange="shContentSetFilter('type',this.value)"><option value="all">Все типы</option>${types.map(t=>`<option value="${esc(t)}" ${state.type===t?'selected':''}>${esc(typeName(t))}</option>`).join('')}</select></label>
        <label><span>Статус</span><select onchange="shContentSetFilter('status',this.value)"><option value="all">Все статусы</option><option value="published" ${state.status==='published'?'selected':''}>Опубликовано</option><option value="draft" ${state.status==='draft'?'selected':''}>Черновик</option></select></label>
        ${(state.q||state.section!=='all'||state.type!=='all'||state.status!=='all')?'<button class="sh-content-reset" onclick="shContentClearFilters()">Сбросить</button>':''}
      </div>
      <div class="sh-content-count">Показано ${totalFiltered?from+1:0}–${Math.min(from+state.pageSize,totalFiltered)} из ${totalFiltered}</div>
      <div class="sh-content-list">${list}</div>
      ${pager}`;
  };

  if(!document.getElementById('shContentStructureStyle')){
    const s=document.createElement('style');s.id='shContentStructureStyle';s.textContent=`
      .sh-content-tabs{margin-bottom:16px}
      .sh-content-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:4px 0 16px}
      .sh-content-head h2{margin:0 0 4px;font-size:26px}.sh-content-head p{margin:0;color:var(--muted)}
      .sh-content-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:14px}
      .sh-content-summary>div{border:1px solid var(--line);background:var(--panel);border-radius:16px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:8px}
      .sh-content-summary small{color:var(--muted)}.sh-content-summary strong{font-size:22px}
      .sh-content-sections{display:flex;gap:8px;overflow:auto;padding:2px 0 10px;scrollbar-width:none}.sh-content-sections::-webkit-scrollbar{display:none}
      .sh-content-chip{display:inline-flex;align-items:center;gap:8px;white-space:nowrap;border:1px solid var(--line);background:var(--panel);color:var(--text);border-radius:999px;padding:8px 12px;font:inherit}
      .sh-content-chip b{font-size:12px;color:var(--muted)}.sh-content-chip.active{border-color:var(--yellow);background:color-mix(in srgb,var(--yellow) 13%,var(--panel))}.sh-content-chip.active span{color:var(--yellow);font-weight:800}
      .sh-content-filters{display:grid;grid-template-columns:minmax(240px,1fr) 190px 190px auto;gap:10px;align-items:end;margin:4px 0 12px}
      .sh-content-filters label{display:grid;gap:5px}.sh-content-filters label>span{font-size:12px;color:var(--muted);font-weight:700}
      .sh-content-filters input,.sh-content-filters select{width:100%;min-height:42px;border:1px solid var(--line);background:var(--panel);color:var(--text);border-radius:12px;padding:9px 11px;font:inherit}
      .sh-content-reset{min-height:42px;border:0;background:transparent;color:var(--yellow);font-weight:800;cursor:pointer;padding:0 8px}
      .sh-content-count{font-size:13px;color:var(--muted);margin:4px 2px 8px}
      .sh-content-list{display:grid;gap:9px}
      .sh-content-item{display:flex;align-items:center;justify-content:space-between;gap:14px;border:1px solid var(--line);background:var(--panel);border-radius:16px;padding:14px 16px}
      .sh-content-item-main{min-width:0}.sh-content-item-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:7px}.sh-content-type{font-size:12px;color:var(--muted);font-weight:700}
      .sh-content-item h3{margin:0 0 5px;font-size:17px;line-height:1.3}.sh-content-item .meta{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .sh-content-item-actions{display:flex;align-items:center;gap:7px;flex:0 0 auto}
      .sh-content-more{position:relative}.sh-content-more summary{list-style:none;cursor:pointer;width:42px;height:42px;display:grid;place-items:center;border:1px solid var(--line);border-radius:12px;background:var(--panel2);font-weight:900;letter-spacing:2px}.sh-content-more summary::-webkit-details-marker{display:none}
      .sh-content-more-menu{position:absolute;right:0;top:48px;z-index:30;min-width:180px;background:var(--panel2);border:1px solid var(--line);border-radius:12px;padding:6px;box-shadow:0 12px 30px rgba(0,0,0,.35)}
      .sh-content-more-menu button{width:100%;border:0;background:transparent;color:var(--bad);text-align:left;padding:10px;border-radius:8px;font:inherit;font-weight:700;cursor:pointer}
      .sh-content-more-menu button:hover{background:rgba(255,80,80,.08)}
      .sh-content-empty{border:1px dashed var(--line);border-radius:16px;padding:28px;text-align:center;display:grid;justify-items:center;gap:8px;color:var(--muted)}.sh-content-empty b{color:var(--text);font-size:18px}
      .sh-content-pager{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:14px;color:var(--muted);font-size:13px}.sh-content-pager .btn:disabled{opacity:.35;pointer-events:none}
      @media(max-width:760px){
        .sh-content-head{align-items:stretch;flex-direction:column}.sh-content-head .btn{width:100%}
        .sh-content-summary{grid-template-columns:repeat(3,1fr)}.sh-content-summary>div{display:grid;gap:3px;padding:11px}.sh-content-summary strong{font-size:20px}
        .sh-content-filters{grid-template-columns:1fr 1fr}.sh-content-search{grid-column:1/-1}.sh-content-reset{justify-self:start}
        .sh-content-item{align-items:flex-start}.sh-content-item-actions .btn{display:none}.sh-content-item h3{font-size:16px}
        .sh-content-pager{display:grid;grid-template-columns:1fr 1fr}.sh-content-pager span{grid-column:1/-1;grid-row:1;text-align:center}.sh-content-pager button{grid-row:2}
      }
    `;document.head.appendChild(s);
  }

  console.info('SkillHub: structured Content library enabled');
})();
