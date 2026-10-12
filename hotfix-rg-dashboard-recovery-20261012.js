/* SkillHub RG dashboard recovery — 2026-10-12
   Final stable renderer for mentor "Моя группа".
   Keeps DB/data intact and bypasses legacy renderer wrapper conflicts.
*/
(function(){
  'use strict';
  const arr=x=>Array.isArray(x)?x:[];
  const pct=v=>v===null||v===undefined?'—':Math.round(Number(v))+'%';
  const managerLogin=()=>String(S?.profile?.login||'');
  const isRg=()=>S?.profile?.role==='mentor';

  function employees(){
    const login=managerLogin();
    return arr(S?.allowed).filter(x=>x&&x.active&&x.role==='employee'&&String(x.manager_login||'')===login);
  }
  function attemptsFor(login){return arr(S?.attempts).filter(a=>String(a.login||'')===String(login||''))}
  function avg(rows,section){
    const q=rows.filter(x=>x.section===section).map(x=>Number(x.score)).filter(Number.isFinite);
    return q.length?Math.round(q.reduce((a,b)=>a+b,0)/q.length):null;
  }
  function recsFor(login){
    try{
      if(typeof topicStats!=='function')return[];
      return arr(topicStats(login)).filter(t=>t?.diagnosed&&['soft','hard'].includes(t.section)&&['gap','attention'].includes(t.status));
    }catch(_){return[]}
  }
  function pendingManualFor(login){return arr(S?.manualAnswers).filter(r=>String(r.login||'')===String(login||'')&&r.status==='submitted').length}
  function safeName(u){return u?.name||u?.login||'Сотрудник'}

  function employeeCard(u){
    const rows=attemptsFor(u.login),soft=avg(rows,'soft'),hard=avg(rows,'hard'),recs=recsFor(u.login),pending=pendingManualFor(u.login),worst=recs.length?Math.min(...recs.map(r=>Number(r.avgRecent||100))):null;
    return `<div class="sh74-team-row sh-rg-recovery-row">
      ${typeof sh74AvatarHtml==='function'?sh74AvatarHtml(u.login,safeName(u)):`<span class="sh839-att-avatar">${esc((safeName(u)||'SH').slice(0,2).toUpperCase())}</span>`}
      <div class="sh-rg-recovery-copy"><b>${esc(safeName(u))}</b><small>${esc(u.login)} · ${rows.length} попыток${pending?` · ${pending} на проверке`:''}</small><div class="sh-rg-recovery-scores"><span>Soft ${pct(soft)}</span><span>Hard ${pct(hard)}</span>${recs.length?`<span class="pill ${recs.some(r=>r.status==='gap')?'bad':'warn'}">${recs.length} ${recs.length===1?'рекомендация':'рекомендации'}${worst!==null?` · от ${Math.round(worst)}%`:''}</span>`:''}</div></div>
      <button class="btn secondary" onclick="openUserAttempts('${jsq(u.login)}')">Карточка</button>
    </div>`;
  }

  function attentionCard(u){
    const recs=recsFor(u.login);if(!recs.length)return'';
    const sections=[...new Set(recs.map(r=>typeof secName==='function'?secName(r.section):r.section))],worst=Math.min(...recs.map(r=>Number(r.avgRecent||100))),severe=recs.some(r=>r.status==='gap');
    return `<button class="sh839-att-card" onclick="${typeof openAttentionEmployee==='function'?`openAttentionEmployee('${jsq(u.login)}')`:`openUserAttempts('${jsq(u.login)}')`}">
      <span class="sh839-att-avatar">${esc((typeof initials==='function'?initials(safeName(u)):safeName(u).slice(0,2)).toUpperCase())}</span>
      <span class="sh839-att-card-copy"><span class="sh839-att-card-top"><b>${esc(safeName(u))}</b><span class="pill ${severe?'bad':'warn'}">${recs.length} ${recs.length===1?'рекомендация':'рекомендации'}</span></span><small>${esc(sections.join(' · '))} · минимальный результат ${Math.round(worst)}%</small><em>Открыть аналитику и рекомендованные курсы</em></span>
      <span class="sh839-att-open">Открыть →</span>
    </button>`;
  }

  window.renderManagerMentor=function(){
    if(!isRg())return;
    const page=$('page-mentor');if(!page)return;
    const users=employees();
    const allAttempts=users.reduce((n,u)=>n+attemptsFor(u.login).length,0),pending=users.reduce((n,u)=>n+pendingManualFor(u.login),0),attentionUsers=users.filter(u=>recsFor(u.login).length>0),softVals=users.map(u=>avg(attemptsFor(u.login),'soft')).filter(v=>v!==null),hardVals=users.map(u=>avg(attemptsFor(u.login),'hard')).filter(v=>v!==null),soft=softVals.length?Math.round(softVals.reduce((a,b)=>a+b,0)/softVals.length):null,hard=hardVals.length?Math.round(hardVals.reduce((a,b)=>a+b,0)/hardVals.length):null;
    $('pageTitle').textContent='Моя группа';
    $('pageSub').textContent=`${S.profile.group_name||S.profile.name||S.profile.login} · команда и развитие`;
    const attentionHtml=attentionUsers.map(attentionCard).join('');
    page.innerHTML=`<div class="sh74-manager sh-rg-recovery">
      <div class="sh74-manager-top"><div><h2>Моя группа</h2><p>Сотрудники, результаты и рекомендации SkillHub</p></div><div class="actions"><button class="btn secondary" onclick="openMentorExport('','${jsq(managerLogin())}','')">Отчёт Excel</button><button class="btn primary" onclick="openAssignmentEditor()">+ Назначить</button></div></div>
      <div class="sh74-kpis"><div class="sh74-kpi"><small>Сотрудников</small><strong>${users.length}</strong></div><div class="sh74-kpi"><small>Попыток</small><strong>${allAttempts}</strong></div><div class="sh74-kpi warn"><small>На проверке</small><strong>${pending}</strong></div><div class="sh74-kpi ${attentionUsers.length?'warn':'good'}"><small>Нужна помощь</small><strong>${attentionUsers.length}</strong></div></div>
      <div class="sh74-light-card sh837-attention"><div class="sh74-card-head"><div><h3>Обратить внимание</h3><small>Аналитика Soft и Hard</small></div><span class="pill ${attentionUsers.length?'warn':'good'}">${attentionUsers.length} ${attentionUsers.length===1?'сотрудник':'сотрудников'}</span></div>${attentionHtml?`<div class="sh839-att-grid">${attentionHtml}</div>`:'<div class="muted">По Soft и Hard сейчас нет подтверждённых зон развития. Рекомендации появятся после минимум двух попыток по теме.</div>'}</div>
      <div class="sh74-section-head"><h2>Сотрудники</h2><span class="muted small">Soft ${pct(soft)} · Hard ${pct(hard)}</span></div>
      <div class="sh74-manager-list sh-rg-recovery-list">${users.length?users.map(employeeCard).join(''):'<div class="card"><div class="muted">Сотрудники группы пока не загрузились. Обновите данные один раз.</div></div>'}</div>
    </div>`;
  };

  const style=document.createElement('style');style.id='sh-rg-dashboard-recovery-style';style.textContent=`
    .sh-rg-recovery .sh74-light-card{margin-top:14px}.sh-rg-recovery-list{margin-top:2px}.sh-rg-recovery-copy{min-width:0;display:grid;gap:4px;flex:1}.sh-rg-recovery-copy small{color:var(--muted)}.sh-rg-recovery-scores{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:12px;color:var(--muted)}
    @media(max-width:620px){.sh-rg-recovery .sh74-manager-top{align-items:flex-start}.sh-rg-recovery .sh74-manager-top>.actions{width:100%;display:grid;grid-template-columns:1fr 1fr}.sh-rg-recovery-row{grid-template-columns:auto minmax(0,1fr)!important;align-items:start!important}.sh-rg-recovery-row>.btn{grid-column:1/-1;width:100%}}
  `;document.head.appendChild(style);

  // If the broken page is already visible when this hotfix loads, repaint immediately.
  if(isRg()&&S.currentPage==='mentor')try{window.renderManagerMentor()}catch(e){console.error('SkillHub RG recovery render failed',e)}
  console.info('SkillHub: stable RG dashboard recovery enabled');
})();
