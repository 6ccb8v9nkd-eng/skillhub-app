/* SkillHub manager employee card — grouped results, percentage recommendations and AI — 2026-10-12 */
(function(){
  'use strict';

  const baseOpen=window.openUserAttempts;
  const arr=x=>Array.isArray(x)?x:[];
  const isManagerRole=()=>['mentor','rs','tech_admin'].includes(S?.profile?.role);
  const fmt=v=>{try{return new Date(v).toLocaleString('ru-RU')}catch(_){return String(v||'')}};
  const scoreClass=n=>Number(n)>=90?'good':Number(n)>=75?'warn':'bad';
  const sectionLabel=s=>s==='hard'?'Hard Skills':s==='soft'?'Soft Skills':s==='needs'?'Потребность':s==='typing'?'Скорость печати':(typeof secName==='function'?secName(s):String(s||''));
  const sectionOrder=['hard','soft','needs','typing'];
  const statusTextSafe=s=>typeof manualStatusText==='function'?manualStatusText(s):(s==='accepted'?'Принято':s==='submitted'?'На проверке':s==='revision_requested'?'На доработке':'Черновик');
  const statusClassSafe=s=>typeof manualStatusClass==='function'?manualStatusClass(s):(s==='accepted'?'good':s==='submitted'?'warn':s==='revision_requested'?'bad':'');

  function stats(rows){
    rows=arr(rows);
    if(!rows.length)return{count:0,avg:null,best:null};
    const nums=rows.map(x=>Number(x.score)).filter(Number.isFinite);
    return{count:rows.length,avg:nums.length?Math.round(nums.reduce((a,b)=>a+b,0)/nums.length):null,best:nums.length?Math.max(...nums):null};
  }
  function statText(st){
    const p=[`${st.count} ${st.count===1?'попытка':st.count<5?'попытки':'попыток'}`];
    if(st.avg!==null)p.push(`средний ${st.avg}%`);
    if(st.best!==null)p.push(`лучший ${st.best}%`);
    return p.join(' · ');
  }
  function side(inner=''){return `<span class="shm-side">${inner}<span class="shm-chevron">›</span></span>`}

  function analyzeRows(rows){
    const sorted=arr(rows).slice().sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
    const recent=sorted.slice(-3),count=sorted.length;
    if(!recent.length)return{count:0,avgRecent:null,trend:0,diagnosed:false,status:'unknown',courseRecommended:false};
    const avgRecent=Math.round(recent.reduce((s,x)=>s+Number(x.score||0),0)/recent.length);
    const last=Number(sorted.at(-1)?.score||0),prev=count>1?Number(sorted.at(-2)?.score||0):null,trend=prev===null?0:last-prev;
    const status=count<2?'unknown':avgRecent<50?'critical':avgRecent<70?'gap':avgRecent<80?'watch':avgRecent<90?'reinforce':'strong';
    return{count,avgRecent,trend,diagnosed:count>=2,status,courseRecommended:count>=2&&avgRecent<70};
  }
  const analysisLabel=a=>a.status==='critical'?'Критическая зона':a.status==='gap'?'Зона развития':a.status==='watch'?'Наблюдение':a.status==='reinforce'?'Закрепить':a.status==='strong'?'Освоено':'Мало данных';
  const analysisClass=a=>['critical','gap'].includes(a.status)?'bad':['watch','reinforce'].includes(a.status)?'warn':a.status==='strong'?'good':'';
  const trendText=n=>n>0?`↑ +${n} п.п.`:n<0?`↓ ${n} п.п.`:'→ без изменений';

  function developmentTopics(login){
    const map=new Map();
    arr(S.attempts).filter(x=>x.login===login&&['soft','hard'].includes(x.section)).forEach(a=>{
      const topic=String(a.topic||'Без темы').trim()||'Без темы',key=a.section+'|||'+topic;
      if(!map.has(key))map.set(key,{section:a.section,topic,rows:[]});map.get(key).rows.push(a);
    });
    return [...map.values()].map(g=>({...g,...analyzeRows(g.rows)})).filter(x=>x.diagnosed&&x.avgRecent<70).sort((a,b)=>a.avgRecent-b.avgRecent);
  }
  function recommendationSection(login){
    const recs=developmentTopics(login);
    const summary=recs.length?`${recs.length} ${recs.length===1?'тема':'тем'} для развития`:'курсы сейчас не требуются';
    const body=recs.length?recs.map(r=>{
      const assigned=typeof hasActiveTopicAssignment==='function'&&hasActiveTopicAssignment(login,r.section,r.topic);
      const available=typeof hasTopicContent==='function'&&hasTopicContent(r.section,r.topic);
      let action='<span class="muted small">По этой теме пока нет опубликованного курса</span>';
      if(assigned)action='<span class="pill good">Курс уже назначен</span>';
      else if(available&&typeof openRecommendedAssignment==='function')action=`<button class="btn primary shm-rec-btn" onclick="openRecommendedAssignment('${jsq(login)}','${r.section}','${jsq(r.topic)}')">Назначить курс</button>`;
      return `<div class="shm-rec"><div class="shm-rec-copy"><div><span class="shm-kicker">${esc(sectionLabel(r.section))}</span><b>${esc(r.topic)}</b></div><span class="pill bad">${Math.round(Number(r.avgRecent||0))}%</span></div><div class="meta">${analysisLabel(r)} · среднее последних ${Math.min(3,r.count)} попыток · ${trendText(r.trend)}</div><div class="shm-rec-action">${action}</div></div>`;
    }).join(''):'<div class="shm-empty">Нет тем, по которым требуется назначение курса. Курс рекомендуется только после минимум 2 попыток, если средний результат последних 3 ниже 70%.</div>';
    return `<details class="shm-section shm-recs"><summary><div class="shm-title"><b>Рекомендованные курсы</b><span>${summary} · порог рекомендации ниже 70%</span></div>${side(recs.length?`<span class="pill bad">${recs.length}</span>`:'')}</summary><div class="shm-body">${body}</div></details>`;
  }

  function attemptRow(a,login,managerLogin){
    const has=typeof attemptDetails==='function'&&attemptDetails(a).length;
    const detail=a.type==='typing'?'<span class="muted small">Скорость печати</span>':has?`<button class="btn secondary shm-mini" onclick="openAttemptReview('${a.id}','${jsq(login)}','${jsq(managerLogin||'')}')">Ответы</button>`:'<span class="muted small">без детализации</span>';
    return `<div class="shm-attempt"><div class="shm-attempt-main"><b>${fmt(a.created_at)}</b><span class="meta">${esc(a.topic||'Без темы')}</span></div><span class="pill ${scoreClass(a.score)}">${Number(a.score)}%</span><div class="shm-attempt-action">${detail}</div></div>`;
  }
  function topicBlock(sec,topic,rows,login,managerLogin){
    const st=stats(rows),an=analyzeRows(rows);
    const status=an.diagnosed?`${analysisLabel(an)}${an.courseRecommended?' · курс рекомендован':''} · ${trendText(an.trend)}`:'Мало данных для оценки';
    return `<details class="shm-topic"><summary><div class="shm-title"><b>${esc(topic||'Без темы')}</b><span>${statText(st)} · ${status}</span></div>${side(an.avgRecent!==null?`<span class="pill ${analysisClass(an)}">${an.avgRecent}%</span>`:'')}</summary><div class="shm-topic-body">${rows.slice().sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).map(a=>attemptRow(a,login,managerLogin)).join('')}</div></details>`;
  }
  function autoSection(sec,rows,login,managerLogin){
    const map=new Map();
    rows.forEach(a=>{const t=String(a.topic||'Без темы').trim()||'Без темы';if(!map.has(t))map.set(t,[]);map.get(t).push(a)});
    const topics=[...map.entries()].sort((a,b)=>a[0].localeCompare(b[0],'ru'));
    const st=stats(rows);
    return `<details class="shm-section"><summary><div class="shm-title"><b>${esc(sectionLabel(sec))}</b><span>${statText(st)}</span></div>${side()}</summary><div class="shm-body">${topics.map(([t,r])=>topicBlock(sec,t,r,login,managerLogin)).join('')}</div></details>`;
  }

  function latestManual(login){
    if(typeof sh742ManualLatestByContent==='function')return sh742ManualLatestByContent(login);
    const map=new Map();
    for(const r of arr(S.manualAnswers).filter(x=>x.login===login).sort((a,b)=>Number(a.version)-Number(b.version)))map.set(r.content_id,r);
    return [...map.values()].sort((a,b)=>new Date(b.updated_at||b.created_at)-new Date(a.updated_at||a.created_at));
  }
  function manualCase(r,login){
    const c=S.content.find(x=>x.id===r.content_id),hist=typeof manualHistory==='function'?manualHistory(r.content_id,login):[];
    const action=typeof sh742OpenManualHistory==='function'?`<button class="btn secondary" onclick="sh742OpenManualHistory('${r.content_id}','${jsq(login)}')">История (${hist.length})</button>`:'';
    return `<details class="shm-topic"><summary><div class="shm-title"><b>${esc(c?.title||'Ручной тренажёр')}</b><span>${esc(c?.topic||'Soft Skills')} · версия ${r.version} · ${fmt(r.updated_at||r.created_at)}</span></div>${side(`<span class="pill ${statusClassSafe(r.status)}">${esc(statusTextSafe(r.status))}</span>`)}</summary><div class="shm-manual"><div class="manual-answer-text">${esc(r.answer||'')}</div>${r.mentor_comment?`<div class="review-note"><b>Комментарий РГ</b><div>${esc(r.mentor_comment)}</div></div>`:''}${r.mentor_suggestion?`<div class="review-note suggestion"><b>Рекомендуемый вариант</b><div>${esc(r.mentor_suggestion)}</div></div>`:''}${action?`<div class="shm-actions">${action}</div>`:''}</div></details>`;
  }
  function manualSection(login){
    const latest=latestManual(login),accepted=latest.filter(x=>x.status==='accepted').length,pending=latest.filter(x=>x.status==='submitted').length,revision=latest.filter(x=>x.status==='revision_requested').length;
    const sub=latest.length?`${latest.length} кейсов · принято ${accepted}${pending?` · на проверке ${pending}`:''}${revision?` · на доработке ${revision}`:''}`:'прохождений пока нет';
    const exportBtn=latest.length&&typeof sh742ExportManualPractice==='function'?`<div class="shm-actions"><button class="btn secondary" onclick="sh742ExportManualPractice('${jsq(login)}')">⬇ Ручная практика Excel</button></div>`:'';
    return `<details class="shm-section"><summary><div class="shm-title"><b>Ручные тренажёры Soft</b><span>${sub}</span></div>${side()}</summary><div class="shm-body">${latest.length?latest.map(r=>manualCase(r,login)).join(''):'<div class="shm-empty">Сотрудник пока не выполнял ручные Soft-кейсы.</div>'}${exportBtn}</div></details>`;
  }

  function aiList(title,rows){rows=arr(rows).filter(Boolean);return rows.length?`<div class="shm-ai-note"><b>${esc(title)}</b><ul>${rows.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:''}
  function aiCase(row){
    const r=row.review||{},neg=String(r.negativeResult||''),cls=neg==='снижен'?'good':neg==='частично снижен'?'warn':neg==='усилен'?'bad':'warn';
    return `<details class="shm-topic"><summary><div class="shm-title"><b>${esc(row.scenario?.title||row.scenario?.theme||'Работа с негативом')}</b><span>${fmt(row.completed_at||row.created_at)}</span></div>${side(`<span class="pill ${cls}">${esc(neg||'разбор ИИ')}</span>`)}</summary><div class="shm-ai">${r.summary?`<div class="shm-ai-summary">${esc(r.summary)}</div>`:''}${row.scenario?.situation?`<div class="shm-ai-note"><b>Ситуация</b><p>${esc(row.scenario.situation)}</p></div>`:''}<div class="shm-chat">${arr(row.transcript).map(m=>`<div class="shm-msg ${m.role==='employee'?'employee':'client'}"><b>${m.role==='employee'?'Сотрудник':'Клиент'}</b><div>${esc(m.content||'')}</div></div>`).join('')}</div>${aiList('Сильные стороны',r.strengths)}${aiList('Что улучшить',r.improvements)}${r.keyMoment?`<div class="shm-ai-note"><b>Ключевой момент</b><p>${esc(r.keyMoment)}</p></div>`:''}${r.betterApproach?`<div class="shm-ai-note"><b>Как можно было сильнее</b><p>${esc(r.betterApproach)}</p></div>`:''}${r.nextFocus?`<div class="shm-ai-note"><b>Что тренировать дальше</b><p>${esc(r.nextFocus)}</p></div>`:''}</div></details>`;
  }
  async function loadAi(login,token){
    const body=document.getElementById(token+'-body'),meta=document.getElementById(token+'-meta');if(!body||!meta)return;
    try{
      const {data,error}=await S.sb.from('soft_ai_sessions').select('id,login,created_at,completed_at,scenario,transcript,review').eq('login',login).not('completed_at','is',null).not('review','is',null).order('completed_at',{ascending:false}).limit(20);
      if(error)throw error;
      const rows=arr(data);
      meta.textContent=rows.length?`${rows.length} завершённых прохождений`:'завершённых прохождений пока нет';
      body.innerHTML=rows.length?rows.map(aiCase).join(''):'<div class="shm-empty">Завершённых ИИ-тренировок пока нет.</div>';
    }catch(e){meta.textContent='не удалось загрузить';body.innerHTML='<div class="shm-empty">Не удалось загрузить ИИ-разборы. Повторите позже.</div>';console.warn('SkillHub manager card AI load failed',e)}
  }

  window.openUserAttempts=function(login,managerLogin=''){
    if(!isManagerRole())return typeof baseOpen==='function'?baseOpen.apply(this,arguments):undefined;
    try{if(typeof sh815EmployeeContext!=='undefined')sh815EmployeeContext={login,managerLogin:managerLogin||''}}catch(_){ }
    const u=S.allowed.find(x=>x.login===login),all=S.attempts.filter(x=>x.login===login).slice().sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
    const bySec=new Map();
    all.forEach(a=>{const sec=String(a.section||'hard');if(!bySec.has(sec))bySec.set(sec,[]);bySec.get(sec).push(a)});
    const auto=sectionOrder.filter(s=>bySec.has(s)).map(s=>autoSection(s,bySec.get(s),login,managerLogin)).join('')+[...bySec.entries()].filter(([s])=>!sectionOrder.includes(s)).map(([s,r])=>autoSection(s,r,login,managerLogin)).join('');
    const back=managerLogin?`<button class="btn secondary sh815-back-btn" onclick="openManagerDashboard('${jsq(managerLogin)}')">← К группе</button>`:'';
    const token='shmAi'+Date.now()+Math.random().toString(36).slice(2,7);
    showModal(`<div class="modal-head shm-head"><div><div class="sh815-modal-nav">${back}</div><h2>${esc(u?.name||login)}</h2><div class="meta">${esc(login)} · карточка сотрудника</div></div><div class="actions"><button class="btn secondary" onclick="openMentorExport('', '${jsq(login)}')">⬇ Excel</button><button class="btn secondary" onclick="closeModal()">✕</button></div></div><div class="shm-intro"><b>Результаты и развитие</b><span>Курс рекомендуем после минимум 2 попыток, если средний результат последних 3 по теме ниже 70%.</span></div><div class="shm-groups">${recommendationSection(login)}${auto||'<div class="shm-empty">Автоматических тренировок пока нет.</div>'}${manualSection(login)}<details class="shm-section"><summary><div class="shm-title"><b>ИИ-тренажёр Soft</b><span id="${token}-meta">загрузка результатов…</span></div>${side()}</summary><div id="${token}-body" class="shm-body"><div class="shm-empty">Загружаю завершённые ИИ-диалоги…</div></div></details></div>`);
    loadAi(login,token);
  };

  if(!document.getElementById('sh-manager-card-style-20261012')){
    const s=document.createElement('style');s.id='sh-manager-card-style-20261012';s.textContent=`
      .shm-intro{display:grid;gap:3px;margin:8px 0 13px}.shm-intro>b{font-size:18px}.shm-intro>span{font-size:13px;color:var(--muted)}.shm-groups{display:grid;gap:10px}
      .shm-section,.shm-topic{border:1px solid var(--line);border-radius:16px;background:var(--panel);overflow:hidden}.shm-topic{border-radius:12px;background:rgba(127,127,127,.045)}
      .shm-section>summary,.shm-topic>summary{list-style:none;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;cursor:pointer;user-select:none}.shm-section>summary::-webkit-details-marker,.shm-topic>summary::-webkit-details-marker{display:none}.shm-section>summary{padding:15px 16px}.shm-topic>summary{padding:12px 13px}.shm-section[open]>summary,.shm-topic[open]>summary{border-bottom:1px solid var(--line)}
      .shm-title{min-width:0;display:grid;gap:3px}.shm-title>b{font-size:16px;line-height:1.25}.shm-title>span{font-size:12px;color:var(--muted);line-height:1.35;overflow-wrap:anywhere}.shm-topic .shm-title>b{font-size:14px}.shm-side{display:flex;align-items:center;justify-content:flex-end;gap:8px;min-width:0}.shm-chevron{font-size:25px;line-height:1;color:var(--muted);transition:transform .16s ease}.shm-section[open]>summary .shm-chevron,.shm-topic[open]>summary .shm-chevron{transform:rotate(90deg)}
      .shm-body{padding:10px;display:grid;gap:9px}.shm-topic-body{display:grid}.shm-empty{padding:14px;color:var(--muted);text-align:center}.shm-attempt{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid var(--line)}.shm-attempt:last-child{border-bottom:0}.shm-attempt-main{min-width:0;display:grid;gap:2px}.shm-attempt-main>b{font-size:13px}.shm-mini{padding:7px 10px!important}.shm-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap}
      .shm-rec{padding:12px;border:1px solid var(--line);border-radius:12px;display:grid;gap:7px}.shm-rec-copy{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:start}.shm-rec-copy>div{display:grid;gap:3px}.shm-rec-copy b{font-size:15px}.shm-kicker{font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}.shm-rec-action{display:flex;justify-content:flex-end}.shm-rec-btn{min-width:150px}
      .shm-manual,.shm-ai{padding:12px;display:grid;gap:10px}.shm-ai-summary{line-height:1.45}.shm-ai-note{padding:10px 11px;border:1px solid var(--line);border-radius:11px}.shm-ai-note p{margin:5px 0 0;line-height:1.42}.shm-ai-note ul{margin:6px 0 0;padding-left:18px}.shm-chat{display:grid;gap:7px}.shm-msg{padding:9px 10px;border:1px solid var(--line);border-radius:10px}.shm-msg b{font-size:12px;color:var(--muted)}.shm-msg div{margin-top:3px;line-height:1.4}.shm-msg.employee{margin-left:22px}.shm-msg.client{margin-right:22px}
      @media(max-width:620px){.shm-head{align-items:flex-start}.shm-section>summary{padding:14px}.shm-topic>summary{gap:7px}.shm-side>.pill{font-size:11px;max-width:135px;white-space:normal;text-align:center}.shm-chevron{font-size:21px}.shm-attempt{grid-template-columns:minmax(0,1fr) auto}.shm-attempt-action{grid-column:1/-1}.shm-mini{width:100%}.shm-rec{padding:11px}.shm-rec-action{justify-content:stretch}.shm-rec-btn{width:100%}.shm-msg.employee{margin-left:7px}.shm-msg.client{margin-right:7px}}
    `;document.head.appendChild(s);
  }
  console.info('SkillHub: manager employee card percentage recommendations enabled');
})();