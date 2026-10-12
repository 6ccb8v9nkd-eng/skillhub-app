/* SkillHub manager employee card: compact grouped results + AI details — 2026-10-12 */
(function(){
  'use strict';
  if(!['mentor','rs','tech_admin'].includes(S?.profile?.role))return;

  const arr=x=>Array.isArray(x)?x:[];
  const fmt=v=>{try{return new Date(v).toLocaleString('ru-RU')}catch(_){return String(v||'')}};
  const scoreClass=n=>Number(n)>=90?'good':Number(n)>=75?'warn':'bad';
  const sectionLabel=s=>s==='hard'?'Hard Skills':s==='soft'?'Soft Skills':s==='needs'?'Потребность':s==='typing'?'Скорость печати':secName(s);
  const sectionOrder=['hard','soft','needs','typing'];

  function stats(rows){
    rows=arr(rows);if(!rows.length)return{count:0,avg:null,best:null,last:null};
    const nums=rows.map(x=>Number(x.score)).filter(Number.isFinite);
    const sorted=rows.slice().sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
    return{count:rows.length,avg:nums.length?Math.round(nums.reduce((a,b)=>a+b,0)/nums.length):null,best:nums.length?Math.max(...nums):null,last:sorted[0]?.created_at||null};
  }
  function statText(st){
    const p=[`${st.count} ${st.count===1?'попытка':st.count<5?'попытки':'попыток'}`];
    if(st.avg!==null)p.push(`средний ${st.avg}%`);
    if(st.best!==null)p.push(`лучший ${st.best}%`);
    return p.join(' · ');
  }
  function attemptRow(a,login,managerLogin){
    const has=typeof attemptDetails==='function'&&attemptDetails(a).length;
    const details=a.type==='typing'?'<span class="muted small">Скорость печати</span>':has?`<button class="btn secondary sh-emp-mini-btn" onclick="openAttemptReview('${a.id}','${jsq(login)}','${jsq(managerLogin||'')}')">Ответы</button>`:'<span class="muted small">без детализации</span>';
    return `<div class="sh-emp-attempt-row"><div><b>${fmt(a.created_at)}</b><span class="meta">${esc(a.topic||'Без темы')}</span></div><span class="pill ${scoreClass(a.score)}">${Number(a.score)}%</span><div>${details}</div></div>`;
  }
  function topicBlock(topic,rows,login,managerLogin){
    const st=stats(rows);
    return `<details class="sh-emp-topic"><summary><div><b>${esc(topic||'Без темы')}</b><span>${statText(st)}</span></div><span class="sh-emp-chevron">›</span></summary><div class="sh-emp-topic-body">${rows.slice().sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).map(a=>attemptRow(a,login,managerLogin)).join('')}</div></details>`;
  }
  function autoSection(sec,rows,login,managerLogin){
    const map=new Map();
    rows.forEach(a=>{const t=String(a.topic||'Без темы').trim()||'Без темы';if(!map.has(t))map.set(t,[]);map.get(t).push(a)});
    const topics=[...map.entries()].sort((a,b)=>a[0].localeCompare(b[0],'ru'));
    const st=stats(rows);
    return `<details class="sh-emp-section"><summary><div class="sh-emp-section-title"><b>${sectionLabel(sec)}</b><span>${statText(st)}</span></div><span class="sh-emp-chevron">›</span></summary><div class="sh-emp-section-body">${topics.map(([t,r])=>topicBlock(t,r,login,managerLogin)).join('')}</div></details>`;
  }

  function latestManual(login){
    if(typeof sh742ManualLatestByContent==='function')return sh742ManualLatestByContent(login);
    const map=new Map();for(const r of arr(S.manualAnswers).filter(x=>x.login===login).sort((a,b)=>Number(a.version)-Number(b.version)))map.set(r.content_id,r);return [...map.values()];
  }
  function manualCase(r,login){
    const c=S.content.find(x=>x.id===r.content_id),hist=typeof manualHistory==='function'?manualHistory(r.content_id,login):[];
    return `<details class="sh-emp-topic"><summary><div><b>${esc(c?.title||'Ручной тренажёр')}</b><span>${esc(c?.topic||'Soft Skills')} · версия ${r.version} · ${fmt(r.updated_at||r.created_at)}</span></div><span class="pill ${manualStatusClass(r.status)}">${manualStatusText(r.status)}</span><span class="sh-emp-chevron">›</span></summary><div class="sh-emp-manual-body"><div class="manual-answer-text">${esc(r.answer||'')}</div>${r.mentor_comment?`<div class="review-note"><b>Комментарий РГ</b><div>${esc(r.mentor_comment)}</div></div>`:''}${r.mentor_suggestion?`<div class="review-note suggestion"><b>Рекомендуемый вариант</b><div>${esc(r.mentor_suggestion)}</div></div>`:''}<div class="sh-emp-actions"><button class="btn secondary" onclick="sh742OpenManualHistory('${r.content_id}','${jsq(login)}')">История (${hist.length})</button></div></div></details>`;
  }
  function manualSection(login){
    const latest=latestManual(login),accepted=latest.filter(x=>x.status==='accepted').length,pending=latest.filter(x=>x.status==='submitted').length,revision=latest.filter(x=>x.status==='revision_requested').length;
    const sub=latest.length?`${latest.length} кейсов · принято ${accepted}${pending?` · на проверке ${pending}`:''}${revision?` · на доработке ${revision}`:''}`:'прохождений пока нет';
    return `<details class="sh-emp-section"><summary><div class="sh-emp-section-title"><b>Ручные тренажёры Soft</b><span>${sub}</span></div><span class="sh-emp-chevron">›</span></summary><div class="sh-emp-section-body">${latest.length?latest.map(r=>manualCase(r,login)).join(''):'<div class="sh-emp-empty">Сотрудник пока не выполнял ручные Soft-кейсы.</div>'}${latest.length?`<div class="sh-emp-actions"><button class="btn secondary" onclick="sh742ExportManualPractice('${jsq(login)}')">⬇ Ручная практика Excel</button></div>`:''}</div></details>`;
  }

  function aiList(title,rows,cls=''){
    rows=arr(rows).filter(Boolean);if(!rows.length)return'';
    return `<div class="sh-emp-ai-note ${cls}"><b>${esc(title)}</b><ul>${rows.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`;
  }
  function aiCase(row){
    const r=row.review||{},neg=String(r.negativeResult||''),cls=neg==='снижен'?'good':neg==='частично снижен'?'warn':neg==='усилен'?'bad':'warn';
    return `<details class="sh-emp-topic"><summary><div><b>${esc(row.scenario?.title||row.scenario?.theme||'Работа с негативом')}</b><span>${fmt(row.completed_at||row.created_at)}</span></div><span class="pill ${cls}">${esc(neg||'разбор ИИ')}</span><span class="sh-emp-chevron">›</span></summary><div class="sh-emp-ai-body">${r.summary?`<div class="sh-emp-ai-summary">${esc(r.summary)}</div>`:''}${row.scenario?.situation?`<div class="sh-emp-ai-note"><b>Ситуация</b><p>${esc(row.scenario.situation)}</p></div>`:''}<div class="sh-emp-ai-chat">${arr(row.transcript).map(m=>`<div class="sh-emp-ai-msg ${m.role==='employee'?'employee':'client'}"><b>${m.role==='employee'?'Сотрудник':'Клиент'}</b><div>${esc(m.content||'')}</div></div>`).join('')}</div>${aiList('Сильные стороны',r.strengths,'good')}${aiList('Что улучшить',r.improvements,'warn')}${r.keyMoment?`<div class="sh-emp-ai-note"><b>Ключевой момент</b><p>${esc(r.keyMoment)}</p></div>`:''}${r.betterApproach?`<div class="sh-emp-ai-note"><b>Как можно было сильнее</b><p>${esc(r.betterApproach)}</p></div>`:''}${r.nextFocus?`<div class="sh-emp-ai-note"><b>Что тренировать дальше</b><p>${esc(r.nextFocus)}</p></div>`:''}</div></details>`;
  }
  async function loadAi(login,token){
    const body=document.getElementById(token+'-body'),meta=document.getElementById(token+'-meta');if(!body||!meta)return;
    try{
      const {data,error}=await S.sb.from('soft_ai_sessions').select('id,login,created_at,completed_at,scenario,transcript,review').eq('login',login).not('completed_at','is',null).not('review','is',null).order('completed_at',{ascending:false}).limit(20);
      if(error)throw error;
      const rows=arr(data);meta.textContent=rows.length?`${rows.length} завершённых прохождений`:'завершённых прохождений пока нет';body.innerHTML=rows.length?rows.map(aiCase).join(''):'<div class="sh-emp-empty">Завершённых ИИ-тренировок пока нет.</div>';
    }catch(e){meta.textContent='не удалось загрузить';body.innerHTML='<div class="sh-emp-empty">Не удалось загрузить ИИ-разборы. Повторите позже.</div>';console.warn('SkillHub manager card AI load failed',e)}
  }

  window.openUserAttempts=function(login,managerLogin=''){
    try{if(typeof sh815EmployeeContext!=='undefined')sh815EmployeeContext={login,managerLogin:managerLogin||''}}catch(_){ }
    const u=S.allowed.find(x=>x.login===login),all=S.attempts.filter(x=>x.login===login).slice().sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
    const bySec=new Map();all.forEach(a=>{const sec=String(a.section||'hard');if(!bySec.has(sec))bySec.set(sec,[]);bySec.get(sec).push(a)});
    const auto=sectionOrder.filter(s=>bySec.has(s)).map(s=>autoSection(s,bySec.get(s),login,managerLogin)).join('')+[...bySec.entries()].filter(([s])=>!sectionOrder.includes(s)).map(([s,r])=>autoSection(s,r,login,managerLogin)).join('');
    const back=managerLogin?`<button class="btn secondary sh815-back-btn" onclick="openManagerDashboard('${jsq(managerLogin)}')">← К группе</button>`:'';
    const token='shEmpAi'+Date.now()+Math.random().toString(36).slice(2,7);
    showModal(`<div class="modal-head"><div><div class="sh815-modal-nav">${back}</div><h2>${esc(u?.name||login)}</h2><div class="meta">${esc(login)} · карточка сотрудника</div></div><div class="actions"><button class="btn secondary" onclick="openMentorExport('', '${jsq(login)}')">⬇ Excel</button><button class="btn secondary" onclick="closeModal()">✕</button></div></div><div class="sh-emp-card-intro"><b>Результаты по направлениям</b><span>Разделы и темы свернуты — открывайте только то, что нужно посмотреть.</span></div><div class="sh-emp-result-groups">${auto||'<div class="sh-emp-empty">Автоматических тренировок пока нет.</div>'}${manualSection(login)}<details class="sh-emp-section"><summary><div class="sh-emp-section-title"><b>ИИ-тренажёр Soft</b><span id="${token}-meta">загрузка результатов…</span></div><span class="sh-emp-chevron">›</span></summary><div id="${token}-body" class="sh-emp-section-body"><div class="sh-emp-empty">Загружаю завершённые ИИ-диалоги…</div></div></details></div>`);
    loadAi(login,token);
  };

  if(!document.getElementById('sh-employee-card-accordion-style')){
    const s=document.createElement('style');s.id='sh-employee-card-accordion-style';s.textContent=`
      .sh-emp-card-intro{display:flex;flex-direction:column;gap:4px;margin:8px 0 12px}.sh-emp-card-intro>b{font-size:18px}.sh-emp-card-intro>span{color:var(--muted);font-size:13px}
      .sh-emp-result-groups{display:grid;gap:10px}.sh-emp-section,.sh-emp-topic{border:1px solid var(--line);border-radius:16px;background:var(--panel);overflow:hidden}.sh-emp-topic{border-radius:13px;background:rgba(127,127,127,.045)}
      .sh-emp-section>summary,.sh-emp-topic>summary{list-style:none;display:flex;align-items:center;gap:10px;cursor:pointer;user-select:none}.sh-emp-section>summary::-webkit-details-marker,.sh-emp-topic>summary::-webkit-details-marker{display:none}
      .sh-emp-section>summary{padding:16px 17px}.sh-emp-topic>summary{padding:12px 13px}.sh-emp-section[open]>summary,.sh-emp-topic[open]>summary{border-bottom:1px solid var(--line)}
      .sh-emp-section-title,.sh-emp-topic>summary>div{min-width:0;flex:1;display:flex;flex-direction:column;gap:3px}.sh-emp-section-title>b{font-size:17px}.sh-emp-section-title>span,.sh-emp-topic>summary>div>span{font-size:12px;color:var(--muted);line-height:1.35}.sh-emp-topic>summary>div>b{font-size:14px}
      .sh-emp-chevron{font-size:27px;line-height:1;color:var(--muted);transition:transform .18s ease;flex:none}.sh-emp-section[open]>summary>.sh-emp-chevron,.sh-emp-topic[open]>summary>.sh-emp-chevron{transform:rotate(90deg)}
      .sh-emp-section-body{padding:11px;display:grid;gap:9px}.sh-emp-topic-body{display:grid}.sh-emp-attempt-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:10px;padding:11px 12px;border-bottom:1px solid var(--line)}.sh-emp-attempt-row:last-child{border-bottom:0}.sh-emp-attempt-row>div:first-child{min-width:0;display:flex;flex-direction:column;gap:2px}.sh-emp-attempt-row>div:first-child>b{font-size:13px}.sh-emp-mini-btn{padding:7px 10px!important}
      .sh-emp-manual-body,.sh-emp-ai-body{padding:12px;display:grid;gap:10px}.sh-emp-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap}.sh-emp-empty{padding:15px;color:var(--muted);text-align:center}
      .sh-emp-ai-summary{line-height:1.45}.sh-emp-ai-note{padding:10px 11px;border:1px solid var(--line);border-radius:11px}.sh-emp-ai-note p{margin:5px 0 0;line-height:1.42}.sh-emp-ai-note ul{margin:6px 0 0;padding-left:18px}.sh-emp-ai-chat{display:grid;gap:7px}.sh-emp-ai-msg{padding:9px 10px;border-radius:10px;border:1px solid var(--line)}.sh-emp-ai-msg b{font-size:12px;color:var(--muted)}.sh-emp-ai-msg div{margin-top:3px;line-height:1.4}.sh-emp-ai-msg.employee{margin-left:22px}.sh-emp-ai-msg.client{margin-right:22px}
      @media(max-width:620px){.sh-emp-section>summary{padding:14px}.sh-emp-attempt-row{grid-template-columns:minmax(0,1fr) auto}.sh-emp-attempt-row>div:last-child{grid-column:1/-1}.sh-emp-mini-btn{width:100%}.sh-emp-ai-msg.employee{margin-left:8px}.sh-emp-ai-msg.client{margin-right:8px}.sh-emp-topic>summary>.pill{font-size:11px}}
    `;document.head.appendChild(s);
  }
  console.info('SkillHub: grouped employee result card enabled');
})();
