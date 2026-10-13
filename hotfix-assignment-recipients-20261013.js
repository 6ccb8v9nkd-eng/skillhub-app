/* SkillHub assignment recipient picker — 2026-10-13
   Replaces free-form recipient login entry with a scoped employee picker.
*/
(function(){
  'use strict';
  if(window.__shAssignmentRecipients20261013)return;
  window.__shAssignmentRecipients20261013=true;

  const arr=v=>Array.isArray(v)?v:[];
  const escSafe=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>typeof normalizeLogin==='function'?normalizeLogin(v):String(v||'').trim().toLowerCase();

  function scopedEmployees(){
    try{
      if(typeof assignmentScopeEmployees==='function')return arr(assignmentScopeEmployees()).filter(x=>x&&x.active!==false&&x.role==='employee');
    }catch(_){}
    const role=String(S?.profile?.role||''),me=String(S?.profile?.login||'');
    const rows=arr(S?.allowed).filter(x=>x&&x.active!==false&&x.role==='employee');
    if(role==='mentor')return rows.filter(x=>String(x.manager_login||'')===me);
    if(role==='rs')return rows.filter(x=>String(x.sector_name||'')===String(S?.profile?.sector_name||''));
    return rows;
  }

  let selected=new Set();
  let selectAll=false;

  function syncHidden(){
    const input=document.getElementById('asUsers');if(!input)return;
    const rows=scopedEmployees();
    if(selectAll&&rows.length){input.value='ALL';return}
    input.value=[...selected].join(', ');
  }

  function renderSummary(){
    const rows=scopedEmployees();
    const summary=document.getElementById('shRecSummary');
    const count=document.getElementById('shRecCount');
    const allBtn=document.getElementById('shRecAll');
    const boxes=[...document.querySelectorAll('.sh-rec-check')];
    boxes.forEach(b=>{b.checked=selectAll||selected.has(norm(b.value))});
    if(allBtn)allBtn.classList.toggle('active',selectAll&&rows.length>0);
    const n=selectAll?rows.length:selected.size;
    if(count)count.textContent=selectAll&&rows.length?`Все · ${rows.length}`:n?`Выбрано: ${n}`:'Никого не выбрано';
    if(summary)summary.textContent=selectAll&&rows.length?`Все сотрудники (${rows.length})`:n===1?'1 сотрудник':n>1?`${n} сотрудников`:'Выберите сотрудников';
    syncHidden();
  }

  window.shAssignRecipientsAll=function(){
    const rows=scopedEmployees();
    selected=new Set(rows.map(x=>norm(x.login)).filter(Boolean));
    selectAll=rows.length>0;
    renderSummary();
  };
  window.shAssignRecipientsClear=function(){selected.clear();selectAll=false;renderSummary()};
  window.shAssignRecipientToggle=function(login,checked){
    const l=norm(login);if(!l)return;
    if(selectAll){selected=new Set(scopedEmployees().map(x=>norm(x.login)).filter(Boolean));selectAll=false}
    if(checked)selected.add(l);else selected.delete(l);
    const rows=scopedEmployees();if(rows.length&&selected.size===rows.length)selectAll=true;
    renderSummary();
  };
  window.shAssignRecipientFilter=function(value){
    const q=String(value||'').trim().toLowerCase();
    document.querySelectorAll('.sh-rec-person').forEach(row=>{
      row.classList.toggle('hidden',!!q&&!String(row.dataset.search||'').includes(q));
    });
  };

  function enhance(prefill={}){
    const input=document.getElementById('asUsers');if(!input||input.dataset.shRecipientPicker==='1')return;
    input.dataset.shRecipientPicker='1';
    const field=input.closest('.field')||input.parentElement;if(!field)return;
    const rows=scopedEmployees().slice().sort((a,b)=>String(a.name||a.login).localeCompare(String(b.name||b.login),'ru'));
    const initial=String(input.value||'ALL').split(',').map(norm).filter(Boolean);
    selectAll=initial.includes('all');
    selected=new Set(selectAll?rows.map(x=>norm(x.login)).filter(Boolean):initial);
    input.type='hidden';

    const list=rows.map(u=>{
      const l=norm(u.login),name=String(u.name||u.login),search=(name+' '+l).toLowerCase();
      return `<label class="sh-rec-person" data-search="${escSafe(search)}"><input class="sh-rec-check" type="checkbox" value="${escSafe(l)}" onchange="shAssignRecipientToggle(this.value,this.checked)"><span><b>${escSafe(name)}</b><small>${escSafe(l)}</small></span></label>`;
    }).join('')||'<div class="sh-rec-empty">В доступной группе нет активных сотрудников.</div>';

    field.insertAdjacentHTML('beforeend',`<div class="sh-rec-picker"><div class="sh-rec-actions"><button id="shRecAll" type="button" class="btn secondary" onclick="shAssignRecipientsAll()">Всем</button><button type="button" class="btn ghost" onclick="shAssignRecipientsClear()">Очистить</button><span id="shRecCount" class="muted small"></span></div><details class="sh-rec-dropdown"><summary id="shRecSummary">Выберите сотрудников</summary><div class="sh-rec-panel"><input type="search" class="sh-rec-search" placeholder="Поиск сотрудника" oninput="shAssignRecipientFilter(this.value)"><div class="sh-rec-list">${list}</div></div></details></div>`);
    const oldMeta=field.querySelector(':scope > .meta');if(oldMeta)oldMeta.textContent='Можно выбрать одного, нескольких сотрудников или нажать «Всем».';
    renderSummary();
  }

  const baseOpen=window.openAssignmentEditor;
  if(typeof baseOpen==='function'){
    window.openAssignmentEditor=function(prefill={}){
      const r=baseOpen.apply(this,arguments);
      setTimeout(()=>enhance(prefill),0);
      return r;
    };
    try{openAssignmentEditor=window.openAssignmentEditor}catch(_){}
  }

  if(!document.getElementById('shAssignmentRecipientStyle')){
    const s=document.createElement('style');s.id='shAssignmentRecipientStyle';s.textContent=`
      .sh-rec-picker{display:grid;gap:9px;margin-top:8px}.sh-rec-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.sh-rec-actions .btn{min-width:84px}.sh-rec-actions .btn.active{border-color:var(--primary);color:var(--primary);box-shadow:0 0 0 1px var(--primary) inset}
      .sh-rec-dropdown{border:1px solid var(--line);border-radius:13px;background:var(--panel)}.sh-rec-dropdown>summary{list-style:none;cursor:pointer;padding:12px 13px;font-weight:800;display:flex;align-items:center;justify-content:space-between}.sh-rec-dropdown>summary::-webkit-details-marker{display:none}.sh-rec-dropdown>summary:after{content:'⌄';color:var(--muted)}.sh-rec-dropdown[open]>summary:after{content:'⌃'}
      .sh-rec-panel{border-top:1px solid var(--line);padding:10px}.sh-rec-search{width:100%;margin-bottom:8px}.sh-rec-list{max-height:230px;overflow:auto;display:grid;gap:5px}.sh-rec-person{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:center;padding:9px 10px;border-radius:10px;cursor:pointer}.sh-rec-person:hover{background:color-mix(in srgb,var(--primary) 7%,transparent)}.sh-rec-person input{width:18px;height:18px}.sh-rec-person span{display:grid;gap:2px}.sh-rec-person small{color:var(--muted)}.sh-rec-empty{padding:10px;color:var(--muted)}
      @media(max-width:620px){.sh-rec-actions{display:grid;grid-template-columns:1fr 1fr}.sh-rec-actions #shRecCount{grid-column:1/-1}.sh-rec-list{max-height:200px}}
    `;document.head.appendChild(s);
  }

  console.info('SkillHub: assignment recipient picker enabled');
})();
