/* SkillHub runtime stability v3 — 2026-10-12
   Stable critical pages + instant realtime + percentage-based development analytics.
   Monthly assessment business logic is intentionally untouched.
*/
(function(){
  'use strict';
  if(window.__shRuntimeStabilityV3)return;
  window.__shRuntimeStabilityV3=true;

  const arr=v=>Array.isArray(v)?v:[];
  const role=()=>String(S?.profile?.role||'');
  const login=()=>String(S?.profile?.login||'');
  const isEmployee=()=>role()==='employee';
  const isRg=()=>role()==='mentor';
  const managerRole=()=>['mentor','rs','tech_admin'].includes(role());
  const escSafe=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const jsSafe=v=>typeof jsq==='function'?jsq(v):String(v??'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  const sectionName=s=>s==='soft'?'Soft Skills':s==='hard'?'Hard Skills':s==='needs'?'Потребность':s==='typing'?'Скорость печати':(typeof secName==='function'?secName(s):String(s||''));
  const scoreClass=n=>Number(n)>=90?'good':Number(n)>=75?'warn':'bad';
  const fmtDate=v=>{try{return new Date(v).toLocaleString('ru-RU')}catch(_){return String(v||'')}};
  const DAY=86400000;

  function classify(avg,count){
    if(count<2)return'unknown';
    if(avg<50)return'critical';
    if(avg<70)return'gap';
    if(avg<80)return'watch';
    if(avg<90)return'reinforce';
    return'strong';
  }
  function topicStats(userLogin){
    const groups=new Map();
    for(const a of arr(S?.attempts)){
      if(String(a?.login||'')!==String(userLogin||''))continue;
      if(!['soft','hard','needs'].includes(a?.section))continue;
      const topic=String(a?.topic||'').trim();if(!topic)continue;
      const key=a.section+'|||'+topic;
      if(!groups.has(key))groups.set(key,{section:a.section,topic,rows:[]});
      groups.get(key).rows.push(a);
    }
    return [...groups.values()].map(g=>{
      const rows=g.rows.slice().sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
      const recent=rows.slice(-3),avgRecent=Math.round(recent.reduce((s,x)=>s+Number(x.score||0),0)/recent.length);
      const last=Number(rows.at(-1)?.score||0),prev=rows.length>1?Number(rows.at(-2)?.score||0):null,trend=prev===null?0:last-prev;
      const status=classify(avgRecent,rows.length);
      return {...g,attempts:rows.length,avgRecent,last,trend,diagnosed:rows.length>=2,status,courseRecommended:rows.length>=2&&avgRecent<70,needsAttention:rows.length>=2&&avgRecent<80};
    }).sort((a,b)=>a.avgRecent-b.avgRecent);
  }
  window.shSkillTopicStats=topicStats;
  const statLabel=x=>x.status==='critical'?'Критическая зона':x.status==='gap'?'Зона развития':x.status==='watch'?'Наблюдение':x.status==='reinforce'?'Закрепить':x.status==='strong'?'Освоено':'Мало данных';
  const statClass=x=>['critical','gap'].includes(x.status)?'bad':['watch','reinforce'].includes(x.status)?'warn':x.status==='strong'?'good':'';
  const trendLabel=n=>n>0?'↑ +'+n+' п.п.':n<0?'↓ '+n+' п.п.':'→ без изменений';

  function renderEmployeeProgressStable(){
    if(!isEmployee())return false;
    const page=document.getElementById('page-progress');if(!page)return false;
    const all=arr(S?.attempts).filter(x=>String(x?.login||'')===login()).slice().sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
    const topics=topicStats(login()),recent=all.filter(x=>new Date(x?.created_at||0).getTime()>=Date.now()-7*DAY);
    const avg=all.length?Math.round(all.reduce((s,x)=>s+Number(x.score||0),0)/all.length):null;
    const topicRows=topics.length?topics.map(x=>{
      let repeat='';
      try{if(x.needsAttention&&typeof hasTopicContent==='function'&&hasTopicContent(x.section,x.topic))repeat=`<button class="btn secondary" onclick="startTopic('${jsSafe(x.section)}','${jsSafe(x.topic)}')">Повторить</button>`}catch(_){}
      return `<tr><td>${escSafe(sectionName(x.section))}</td><td><b>${escSafe(x.topic)}</b></td><td>${x.avgRecent}% <span class="trend ${x.trend>0?'up':x.trend<0?'down':''}">${trendLabel(x.trend)}</span></td><td>${x.attempts}</td><td><span class="pill ${statClass(x)}">${statLabel(x)}</span></td><td>${repeat}</td></tr>`;
    }).join(''):'<tr><td colspan="6" class="muted">Пока нет результатов для анализа.</td></tr>';
    const historyRows=recent.length?recent.map(x=>{
      let detail='—';
      try{if(x.type!=='typing'&&typeof attemptDetails==='function'&&attemptDetails(x).length)detail=`<button class="btn secondary" onclick="openAttemptReview('${jsSafe(x.id)}')">Посмотреть</button>`}catch(_){}
      return `<tr><td>${fmtDate(x.created_at)}</td><td>${escSafe(sectionName(x.section))}</td><td>${escSafe(x.topic||'')}</td><td><span class="pill ${scoreClass(x.score)}">${Number(x.score||0)}%</span></td><td>${detail}</td></tr>`;
    }).join(''):'<tr><td colspan="5" class="muted">За последние 7 дней тренировок не было.</td></tr>';
    document.getElementById('pageTitle')&&(document.getElementById('pageTitle').textContent='Мой прогресс');
    document.getElementById('pageSub')&&(document.getElementById('pageSub').textContent='Результаты и история');
    page.innerHTML=`<div class="grid3"><div class="card kpi"><small>Попыток</small><strong>${all.length}</strong></div><div class="card kpi"><small>Средний результат</small><strong>${avg===null?'—':avg+'%'}</strong></div><div class="card kpi"><small>Последняя активность</small><strong style="font-size:17px">${all[0]?new Date(all[0].created_at).toLocaleDateString('ru-RU'):'—'}</strong></div></div><div class="section-title"><h2>🧭 Темы и зоны развития</h2></div><div class="adaptive-rule"><b>Как SkillHub оценивает тему:</b> минимум 2 попытки; учитывается средний результат последних 3. Ниже 70% — зона развития, 70–79% — наблюдение, 80–89% — закрепление, 90%+ — тема освоена.</div><div class="card table-wrap"><table class="table"><thead><tr><th>Раздел</th><th>Тема</th><th>Последние</th><th>Попыток</th><th>Статус</th><th></th></tr></thead><tbody>${topicRows}</tbody></table></div><div class="section-title"><h2>История</h2><span class="muted small">показываем последние 7 дней</span></div><div class="card table-wrap"><table class="table"><thead><tr><th>Дата</th><th>Раздел</th><th>Тема</th><th>Результат</th><th>Ответы</th></tr></thead><tbody>${historyRows}</tbody></table></div>`;
    return true;
  }

  function rgEmployees(){
    const me=login();let source=arr(S?.allowed);if(!source.length)source=arr(S?.profiles);
    return source.filter(x=>x&&x.active!==false&&x.role==='employee'&&String(x.manager_login||'')===me);
  }
  const attemptsFor=l=>arr(S?.attempts).filter(x=>String(x?.login||'')===String(l||''));
  function avgSection(rows,sec){const q=rows.filter(x=>x.section===sec).map(x=>Number(x.score)).filter(Number.isFinite);return q.length?Math.round(q.reduce((a,b)=>a+b,0)/q.length):null}
  const pendingManual=l=>arr(S?.manualAnswers).filter(x=>String(x?.login||'')===String(l||'')&&x.status==='submitted').length;
  const attentionFor=l=>topicStats(l).filter(x=>x.diagnosed&&['soft','hard'].includes(x.section)&&x.avgRecent<80);
  const coursesFor=l=>topicStats(l).filter(x=>x.diagnosed&&['soft','hard'].includes(x.section)&&x.avgRecent<70);
  const pct=v=>v===null||v===undefined?'—':Math.round(Number(v))+'%';
  function avatar(u){
    if(typeof sh74AvatarHtml==='function')try{return sh74AvatarHtml(u.login,u.name||u.login)}catch(_){}
    const n=String(u.name||u.login||'SH').split(/[\s.]+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
    return `<span class="sh-stable-avatar">${escSafe(n)}</span>`;
  }
  function attentionMeta(u){
    const items=attentionFor(u.login),courses=coursesFor(u.login);if(!items.length)return{items:[],rank:99,worst:101,badge:''};
    const worst=Math.min(...items.map(x=>Number(x.avgRecent||100))),critical=items.some(x=>x.avgRecent<50),gap=items.some(x=>x.avgRecent<70);
    const rank=critical?0:gap?1:2;
    const label=critical?`⚠ Срочно · ${items.length} ${items.length===1?'тема':'тем'}`:gap?`⚠ Нужна помощь · ${items.length} ${items.length===1?'тема':'тем'}`:`Наблюдать · ${items.length} ${items.length===1?'тема':'тем'}`;
    return{items,courses,rank,worst,badge:`<span class="pill ${gap||critical?'bad':'warn'} sh-rg-att-pill">${label}</span>`};
  }
  function rgRow(u){
    const rows=attemptsFor(u.login),soft=avgSection(rows,'soft'),hard=avgSection(rows,'hard'),pending=pendingManual(u.login),att=attentionMeta(u);
    return `<div class="sh74-team-row sh-stable-rg-row">${avatar(u)}<div class="sh-stable-rg-copy"><b>${escSafe(u.name||u.login)}</b><small>${escSafe(u.login)} · ${rows.length} попыток${pending?` · ${pending} на проверке`:''}</small><div><span>Soft ${pct(soft)}</span><span>Hard ${pct(hard)}</span>${att.badge}</div></div><button class="btn secondary" onclick="openUserAttempts('${jsSafe(u.login)}','${jsSafe(login())}')">Карточка</button></div>`;
  }
  function sortUsers(users){return users.slice().sort((a,b)=>{const A=attentionMeta(a),B=attentionMeta(b);return A.rank-B.rank||A.worst-B.worst||String(a.name||a.login).localeCompare(String(b.name||b.login),'ru')})}

  window.__shRgAttentionFilter=window.__shRgAttentionFilter||'all';
  window.shRgSetAttentionFilter=function(mode){window.__shRgAttentionFilter=mode==='attention'?'attention':'all';renderRgStable()};

  function renderRgStable(){
    if(!isRg())return false;
    const page=document.getElementById('page-mentor');if(!page)return false;
    const users=sortUsers(rgEmployees()),attentionUsers=users.filter(u=>attentionFor(u.login).length),pending=users.reduce((n,u)=>n+pendingManual(u.login),0),attempts=users.reduce((n,u)=>n+attemptsFor(u.login).length,0);
    const softVals=users.map(u=>avgSection(attemptsFor(u.login),'soft')).filter(v=>v!==null),hardVals=users.map(u=>avgSection(attemptsFor(u.login),'hard')).filter(v=>v!==null);
    const soft=softVals.length?Math.round(softVals.reduce((a,b)=>a+b,0)/softVals.length):null,hard=hardVals.length?Math.round(hardVals.reduce((a,b)=>a+b,0)/hardVals.length):null;
    const mode=window.__shRgAttentionFilter==='attention'?'attention':'all',shown=mode==='attention'?attentionUsers:users;
    document.getElementById('pageTitle')&&(document.getElementById('pageTitle').textContent='Моя группа');
    document.getElementById('pageSub')&&(document.getElementById('pageSub').textContent=`${S.profile.group_name||S.profile.name||S.profile.login} · команда и развитие`);
    page.innerHTML=`<div class="sh74-manager sh-stable-rg"><div class="sh74-manager-top"><div><h2>Моя группа</h2><p>Сотрудники с зонами риска автоматически подняты наверх</p></div><div class="actions"><button class="btn secondary" onclick="openMentorExport('','${jsSafe(login())}','')">Отчёт Excel</button><button class="btn primary" onclick="openAssignmentEditor()">+ Назначить</button></div></div><div class="sh74-kpis"><div class="sh74-kpi"><small>Сотрудников</small><strong>${users.length}</strong></div><div class="sh74-kpi"><small>Попыток</small><strong>${attempts}</strong></div><div class="sh74-kpi ${pending?'warn':'good'}"><small>На проверке</small><strong>${pending}</strong></div><div class="sh74-kpi ${attentionUsers.length?'warn':'good'}"><small>Требуют внимания</small><strong>${attentionUsers.length}</strong></div></div><div class="sh-rg-list-head"><div><h2>Сотрудники</h2><span class="muted small">Soft ${pct(soft)} · Hard ${pct(hard)}</span></div><div class="sh-rg-filter"><button class="${mode==='all'?'active':''}" onclick="shRgSetAttentionFilter('all')">Все <b>${users.length}</b></button><button class="${mode==='attention'?'active':''}" onclick="shRgSetAttentionFilter('attention')">Требуют внимания <b>${attentionUsers.length}</b></button></div></div><div class="sh74-manager-list">${shown.length?shown.map(rgRow).join(''):`<div class="card"><div class="muted">${mode==='attention'?'Сейчас нет сотрудников, требующих внимания.':'В группе пока нет сотрудников.'}</div></div>`}</div></div>`;
    return true;
  }

  const baseRender=typeof window.render==='function'?window.render:null;
  function stableRender(page){if(page==='progress'&&isEmployee())return renderEmployeeProgressStable();if(page==='mentor'&&isRg())return renderRgStable();return baseRender?baseRender.apply(this,arguments):undefined}
  try{window.render=stableRender;render=stableRender}catch(_){window.render=stableRender}
  const baseRenderCurrent=typeof window.renderCurrent==='function'?window.renderCurrent:null;
  function stableRenderCurrent(){if(S?.currentPage==='progress'&&isEmployee())return renderEmployeeProgressStable();if(S?.currentPage==='mentor'&&isRg())return renderRgStable();return baseRenderCurrent?baseRenderCurrent.apply(this,arguments):undefined}
  try{window.renderCurrent=stableRenderCurrent;renderCurrent=stableRenderCurrent}catch(_){window.renderCurrent=stableRenderCurrent}

  /* One authoritative realtime data channel. */
  let reconnectTimer=null,reconnectTry=0,live=false,renderTimer=null,hiddenAt=0;
  const keyFor=(table,row)=>table==='allowed_logins'?String(row?.login||''):String(row?.id||'');
  function applyChange(table,list,payload,normalizer){const row=payload?.eventType==='DELETE'?payload?.old:payload?.new,key=keyFor(table,row);if(!key)return arr(list).slice();if(payload?.eventType==='DELETE')return arr(list).filter(x=>keyFor(table,x)!==key);const val=normalizer?normalizer(payload.new):payload.new,out=arr(list).slice(),i=out.findIndex(x=>keyFor(table,x)===key);if(i>=0)out[i]=val;else out.push(val);return out}
  function relevant(l){l=String(l||'');if(!l||!S?.profile)return false;if(l===login())return true;if(role()==='tech_admin')return true;const u=arr(S.allowed).find(x=>String(x?.login||'')===l);if(!u)return false;if(isRg())return u.role==='employee'&&String(u.manager_login||'')===login();if(role()==='rs')return u.role==='employee'&&String(u.sector_name||'')===String(S.profile.sector_name||'');return false}
  function markLive(ok,sub){const dot=document.getElementById('syncDot'),label=document.getElementById('syncLabel'),small=document.getElementById('syncSub');if(label)label.textContent=ok?'Синхронизировано':'Подключение…';if(small)small.textContent=ok?(sub||'в реальном времени'):'восстанавливаю связь';if(dot)dot.style.opacity=ok?'1':'.45'}
  function scheduleRender(){if(document.hidden)return;clearTimeout(renderTimer);renderTimer=setTimeout(()=>{try{stableRenderCurrent()}catch(e){console.warn('SkillHub realtime render skipped',e)}},40)}
  function onContent(p){S.content=applyChange('content',S.content,p,typeof normalizeContent==='function'?normalizeContent:null);scheduleRender()}
  function onAssignment(p){S.assignments=applyChange('assignments',S.assignments,p);scheduleRender()}
  function onAttempt(p){const row=p?.new||p?.old;if(!relevant(row?.login))return;S.attempts=applyChange('attempts',S.attempts,p);scheduleRender()}
  function onManual(p){const row=p?.new||p?.old;if(!relevant(row?.login))return;S.manualAnswers=applyChange('manual_answers',S.manualAnswers,p);scheduleRender()}
  function onNotification(p){const row=p?.new||p?.old;if(String(row?.login||'')!==login())return;S.notifications=applyChange('notifications',S.notifications,p);try{renderUnread()}catch(_){}scheduleRender()}
  function onAllowed(p){const row=p?.new||p?.old;if(!row)return;if(!managerRole()&&String(row.login||'')!==login())return;S.allowed=applyChange('allowed_logins',S.allowed,p);scheduleRender()}
  function onProfile(p){const row=p?.new||p?.old;if(!row)return;if(String(row.login||'')===login()&&p.eventType!=='DELETE')S.profile={...S.profile,...row};if(managerRole())S.profiles=applyChange('profiles',S.profiles,p);scheduleRender()}
  function scheduleReconnect(){live=false;markLive(false);clearTimeout(reconnectTimer);reconnectTry=Math.min(reconnectTry+1,5);reconnectTimer=setTimeout(()=>{try{subscribeRealtimeV3()}catch(_){}},Math.min(5000,250*Math.pow(2,reconnectTry)))}
  function subscribeRealtimeV3(){
    if(!S?.sb||!S?.profile?.login)return;clearTimeout(reconnectTimer);if(S.subscription){try{S.sb.removeChannel(S.subscription)}catch(_){}S.subscription=null}
    const my=login();let ch=S.sb.channel('skillhub-live-v3-'+Date.now()).on('postgres_changes',{event:'*',schema:'public',table:'content'},onContent).on('postgres_changes',{event:'*',schema:'public',table:'assignments'},onAssignment).on('postgres_changes',{event:'*',schema:'public',table:'attempts'},onAttempt).on('postgres_changes',{event:'*',schema:'public',table:'manual_answers'},onManual).on('postgres_changes',{event:'*',schema:'public',table:'notifications',filter:`login=eq.${my}`},onNotification);
    if(managerRole())ch=ch.on('postgres_changes',{event:'*',schema:'public',table:'allowed_logins'},onAllowed).on('postgres_changes',{event:'*',schema:'public',table:'profiles'},onProfile);else ch=ch.on('postgres_changes',{event:'*',schema:'public',table:'allowed_logins',filter:`login=eq.${my}`},onAllowed).on('postgres_changes',{event:'*',schema:'public',table:'profiles',filter:`login=eq.${my}`},onProfile);
    S.subscription=ch.subscribe(status=>{if(status==='SUBSCRIBED'){live=true;reconnectTry=0;clearTimeout(reconnectTimer);markLive(true);scheduleRender()}else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED')scheduleReconnect()});
  }
  try{window.subscribeRealtime=subscribeRealtimeV3;subscribeRealtime=subscribeRealtimeV3}catch(_){window.subscribeRealtime=subscribeRealtimeV3}
  function backgroundResync(reason){if(!S?.user||typeof syncAll!=='function')return;try{syncAll(false).then(()=>{markLive(live,reason||'данные актуальны');scheduleRender()}).catch(()=>{})}catch(_){}}
  document.addEventListener('visibilitychange',()=>{if(document.hidden){hiddenAt=Date.now();return}if(!S?.user)return;const away=hiddenAt?Date.now()-hiddenAt:0;hiddenAt=0;if(!live){subscribeRealtimeV3();backgroundResync('связь восстановлена')}else if(away>60000)backgroundResync('данные проверены');else scheduleRender()});
  window.addEventListener('online',()=>{if(S?.user){subscribeRealtimeV3();backgroundResync('связь восстановлена')}});window.addEventListener('offline',()=>{live=false;markLive(false)});setInterval(()=>{if(S?.user&&!document.hidden&&!live)subscribeRealtimeV3()},5000);

  function heal(){try{if(isEmployee()&&S.currentPage==='progress'&&!document.getElementById('page-progress')?.textContent?.trim())renderEmployeeProgressStable();if(isRg()&&S.currentPage==='mentor'&&!document.getElementById('page-mentor')?.textContent?.trim())renderRgStable()}catch(e){console.warn('SkillHub page self-heal skipped',e)}}
  document.addEventListener('click',e=>{const p=e.target?.closest?.('.nav-btn')?.dataset?.page;if((p==='progress'&&isEmployee())||(p==='mentor'&&isRg()))setTimeout(heal,0)},true);
  setTimeout(()=>{if(S?.user){subscribeRealtimeV3();heal()}},180);setTimeout(()=>{heal();if(S?.user&&!live)subscribeRealtimeV3()},900);

  if(!document.getElementById('sh-runtime-stability-v3-style')){const st=document.createElement('style');st.id='sh-runtime-stability-v3-style';st.textContent=`.sh-stable-rg-copy{min-width:0;display:grid;gap:4px;flex:1}.sh-stable-rg-copy small{color:var(--muted)}.sh-stable-rg-copy>div{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:12px;color:var(--muted)}.sh-stable-avatar{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;border:1px solid var(--line);font-weight:900}.sh-rg-list-head{display:flex;justify-content:space-between;align-items:end;gap:12px;margin:18px 0 10px}.sh-rg-list-head>div:first-child{display:grid;gap:3px}.sh-rg-list-head h2{margin:0}.sh-rg-filter{display:flex;gap:6px;padding:4px;border:1px solid var(--line);border-radius:12px}.sh-rg-filter button{border:0;background:transparent;color:var(--muted);padding:8px 11px;border-radius:9px;font:inherit;font-size:12px;font-weight:800;white-space:nowrap}.sh-rg-filter button.active{background:var(--panel);color:var(--text);box-shadow:inset 0 0 0 1px var(--line)}.sh-rg-att-pill{white-space:nowrap}@media(max-width:620px){.sh-stable-rg .sh74-manager-top{align-items:flex-start}.sh-stable-rg .sh74-manager-top>.actions{width:100%;display:grid;grid-template-columns:1fr 1fr}.sh-rg-list-head{align-items:stretch;flex-direction:column}.sh-rg-filter{display:grid;grid-template-columns:1fr 1fr}.sh-rg-filter button{white-space:normal}.sh-stable-rg-row{grid-template-columns:auto minmax(0,1fr)!important;align-items:start!important}.sh-stable-rg-row>.btn{grid-column:1/-1;width:100%}}`;document.head.appendChild(st)}
  console.info('SkillHub: stable runtime v3 + percentage attention analytics enabled');
})();
