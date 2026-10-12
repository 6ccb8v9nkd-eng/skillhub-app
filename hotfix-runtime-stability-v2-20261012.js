/* SkillHub runtime stability v2 — 2026-10-12
   One authoritative realtime channel + stable critical-page renderers.
   Data changes repaint the current view immediately without a full page reload.
   Monthly assessment business logic is intentionally untouched.
*/
(function(){
  'use strict';
  if(window.__shRuntimeStabilityV2)return;
  window.__shRuntimeStabilityV2=true;

  const arr=v=>Array.isArray(v)?v:[];
  const role=()=>String(window.S?.profile?.role||'');
  const login=()=>String(window.S?.profile?.login||'');
  const isEmployee=()=>role()==='employee';
  const isRg=()=>role()==='mentor';
  const managerRole=()=>['mentor','rs','tech_admin'].includes(role());
  const escSafe=v=>typeof window.esc==='function'?window.esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const jsSafe=v=>typeof window.jsq==='function'?window.jsq(v):String(v??'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  const sectionName=s=>s==='soft'?'Soft Skills':s==='hard'?'Hard Skills':s==='needs'?'Потребность':s==='typing'?'Скорость печати':(typeof window.secName==='function'?window.secName(s):String(s||''));
  const scoreClass=n=>Number(n)>=90?'good':Number(n)>=75?'warn':'bad';
  const fmtDate=v=>{try{return new Date(v).toLocaleString('ru-RU')}catch(_){return String(v||'')}};
  const DAY=86400000;

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
      const recent=rows.slice(-3);
      const avgRecent=Math.round(recent.reduce((s,x)=>s+Number(x.score||0),0)/recent.length);
      const last=Number(rows.at(-1)?.score||0),prev=rows.length>1?Number(rows.at(-2)?.score||0):null,trend=prev===null?0:last-prev;
      const diagnosed=rows.length>=2,status=!diagnosed?'unknown':avgRecent<75?'gap':avgRecent<90?'attention':'strong';
      return {...g,attempts:rows.length,avgRecent,last,trend,diagnosed,status};
    }).sort((a,b)=>a.avgRecent-b.avgRecent);
  }
  const statLabel=x=>x.status==='gap'?'Зона развития':x.status==='attention'?'Закрепить':x.status==='strong'?'Сильная тема':'Мало данных';
  const statClass=x=>x.status==='gap'?'bad':x.status==='attention'?'warn':x.status==='strong'?'good':'';
  const trendLabel=n=>n>0?'↑ +'+n:n<0?'↓ '+n:'→ 0';

  function renderEmployeeProgressStable(){
    if(!isEmployee())return false;
    const page=document.getElementById('page-progress');if(!page)return false;
    const all=arr(S?.attempts).filter(x=>String(x?.login||'')===login()).slice().sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
    const topics=topicStats(login());
    const recent=all.filter(x=>new Date(x?.created_at||0).getTime()>=Date.now()-7*DAY);
    const avg=all.length?Math.round(all.reduce((s,x)=>s+Number(x.score||0),0)/all.length):null;
    const topicRows=topics.length?topics.map(x=>{
      let repeat='';
      try{if(x.status==='gap'&&typeof window.hasTopicContent==='function'&&window.hasTopicContent(x.section,x.topic))repeat=`<button class="btn secondary" onclick="startTopic('${jsSafe(x.section)}','${jsSafe(x.topic)}')">Повторить</button>`}catch(_){}
      return `<tr><td>${escSafe(sectionName(x.section))}</td><td><b>${escSafe(x.topic)}</b></td><td>${x.avgRecent}% <span class="trend ${x.trend>0?'up':x.trend<0?'down':''}">${trendLabel(x.trend)}</span></td><td>${x.attempts}</td><td><span class="pill ${statClass(x)}">${statLabel(x)}</span></td><td>${repeat}</td></tr>`;
    }).join(''):'<tr><td colspan="6" class="muted">Пока нет результатов для анализа.</td></tr>';
    const historyRows=recent.length?recent.map(x=>{
      let detail='—';
      try{if(x.type!=='typing'&&typeof window.attemptDetails==='function'&&window.attemptDetails(x).length)detail=`<button class="btn secondary" onclick="openAttemptReview('${jsSafe(x.id)}')">Посмотреть</button>`}catch(_){}
      return `<tr><td>${fmtDate(x.created_at)}</td><td>${escSafe(sectionName(x.section))}</td><td>${escSafe(x.topic||'')}</td><td><span class="pill ${scoreClass(x.score)}">${Number(x.score||0)}%</span></td><td>${detail}</td></tr>`;
    }).join(''):'<tr><td colspan="5" class="muted">За последние 7 дней тренировок не было.</td></tr>';
    document.getElementById('pageTitle')&&(document.getElementById('pageTitle').textContent='Мой прогресс');
    document.getElementById('pageSub')&&(document.getElementById('pageSub').textContent='Результаты и история');
    page.innerHTML=`<div class="grid3"><div class="card kpi"><small>Попыток</small><strong>${all.length}</strong></div><div class="card kpi"><small>Средний результат</small><strong>${avg===null?'—':avg+'%'}</strong></div><div class="card kpi"><small>Последняя активность</small><strong style="font-size:17px">${all[0]?new Date(all[0].created_at).toLocaleDateString('ru-RU'):'—'}</strong></div></div><div class="section-title"><h2>🧭 Темы и зоны развития</h2></div><div class="adaptive-rule"><b>Как SkillHub определяет пробел:</b> минимум 2 попытки по теме, затем средний результат последних 3 попыток ниже 75%. Цель после отработки — 90%+.</div><div class="card table-wrap"><table class="table"><thead><tr><th>Раздел</th><th>Тема</th><th>Последние</th><th>Попыток</th><th>Статус</th><th></th></tr></thead><tbody>${topicRows}</tbody></table></div><div class="section-title"><h2>История</h2><span class="muted small">показываем последние 7 дней</span></div><div class="card table-wrap"><table class="table"><thead><tr><th>Дата</th><th>Раздел</th><th>Тема</th><th>Результат</th><th>Ответы</th></tr></thead><tbody>${historyRows}</tbody></table></div>`;
    return true;
  }

  function rgEmployees(){
    const me=login();
    let source=arr(S?.allowed);if(!source.length)source=arr(S?.profiles);
    return source.filter(x=>x&&x.active!==false&&x.role==='employee'&&String(x.manager_login||'')===me);
  }
  const attemptsFor=l=>arr(S?.attempts).filter(x=>String(x?.login||'')===String(l||''));
  function avgSection(rows,sec){const q=rows.filter(x=>x.section===sec).map(x=>Number(x.score)).filter(Number.isFinite);return q.length?Math.round(q.reduce((a,b)=>a+b,0)/q.length):null}
  const pendingManual=l=>arr(S?.manualAnswers).filter(x=>String(x?.login||'')===String(l||'')&&x.status==='submitted').length;
  const recsFor=l=>topicStats(l).filter(x=>x.diagnosed&&['soft','hard'].includes(x.section)&&['gap','attention'].includes(x.status));
  const pct=v=>v===null||v===undefined?'—':Math.round(Number(v))+'%';
  function avatar(u){
    if(typeof window.sh74AvatarHtml==='function')try{return window.sh74AvatarHtml(u.login,u.name||u.login)}catch(_){}
    const n=String(u.name||u.login||'SH').split(/[\s.]+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
    return `<span class="sh-stable-avatar">${escSafe(n)}</span>`;
  }
  function rgRow(u){
    const rows=attemptsFor(u.login),soft=avgSection(rows,'soft'),hard=avgSection(rows,'hard'),recs=recsFor(u.login),pending=pendingManual(u.login);
    return `<div class="sh74-team-row sh-stable-rg-row">${avatar(u)}<div class="sh-stable-rg-copy"><b>${escSafe(u.name||u.login)}</b><small>${escSafe(u.login)} · ${rows.length} попыток${pending?` · ${pending} на проверке`:''}</small><div><span>Soft ${pct(soft)}</span><span>Hard ${pct(hard)}</span>${recs.length?`<span class="pill ${recs.some(r=>r.status==='gap')?'bad':'warn'}">${recs.length} ${recs.length===1?'рекомендация':'рекомендации'}</span>`:''}</div></div><button class="btn secondary" onclick="openUserAttempts('${jsSafe(u.login)}','${jsSafe(login())}')">Карточка</button></div>`;
  }
  function attentionRow(u){
    const recs=recsFor(u.login);if(!recs.length)return'';
    const worst=Math.min(...recs.map(x=>Number(x.avgRecent||100))),severe=recs.some(x=>x.status==='gap'),sections=[...new Set(recs.map(x=>sectionName(x.section)))];
    const open=typeof window.openAttentionEmployee==='function'?`openAttentionEmployee('${jsSafe(u.login)}')`:`openUserAttempts('${jsSafe(u.login)}','${jsSafe(login())}')`;
    return `<button class="sh839-att-card" onclick="${open}"><span class="sh839-att-avatar">${escSafe(String(u.name||u.login).slice(0,2).toUpperCase())}</span><span class="sh839-att-card-copy"><span class="sh839-att-card-top"><b>${escSafe(u.name||u.login)}</b><span class="pill ${severe?'bad':'warn'}">${recs.length} ${recs.length===1?'рекомендация':'рекомендации'}</span></span><small>${escSafe(sections.join(' · '))} · минимальный результат ${Math.round(worst)}%</small><em>Открыть аналитику и рекомендованные курсы</em></span><span class="sh839-att-open">Открыть →</span></button>`;
  }
  function renderRgStable(){
    if(!isRg())return false;
    const page=document.getElementById('page-mentor');if(!page)return false;
    const users=rgEmployees(),attention=users.filter(u=>recsFor(u.login).length),pending=users.reduce((n,u)=>n+pendingManual(u.login),0),attempts=users.reduce((n,u)=>n+attemptsFor(u.login).length,0);
    const softVals=users.map(u=>avgSection(attemptsFor(u.login),'soft')).filter(v=>v!==null),hardVals=users.map(u=>avgSection(attemptsFor(u.login),'hard')).filter(v=>v!==null);
    const soft=softVals.length?Math.round(softVals.reduce((a,b)=>a+b,0)/softVals.length):null,hard=hardVals.length?Math.round(hardVals.reduce((a,b)=>a+b,0)/hardVals.length):null;
    document.getElementById('pageTitle')&&(document.getElementById('pageTitle').textContent='Моя группа');
    document.getElementById('pageSub')&&(document.getElementById('pageSub').textContent=`${S.profile.group_name||S.profile.name||S.profile.login} · команда и развитие`);
    page.innerHTML=`<div class="sh74-manager sh-stable-rg"><div class="sh74-manager-top"><div><h2>Моя группа</h2><p>Сотрудники, результаты и рекомендации SkillHub</p></div><div class="actions"><button class="btn secondary" onclick="openMentorExport('','${jsSafe(login())}','')">Отчёт Excel</button><button class="btn primary" onclick="openAssignmentEditor()">+ Назначить</button></div></div><div class="sh74-kpis"><div class="sh74-kpi"><small>Сотрудников</small><strong>${users.length}</strong></div><div class="sh74-kpi"><small>Попыток</small><strong>${attempts}</strong></div><div class="sh74-kpi ${pending?'warn':'good'}"><small>На проверке</small><strong>${pending}</strong></div><div class="sh74-kpi ${attention.length?'warn':'good'}"><small>Нужна помощь</small><strong>${attention.length}</strong></div></div><div class="sh74-light-card sh837-attention"><div class="sh74-card-head"><div><h3>Обратить внимание</h3><small>Аналитика Soft и Hard</small></div><span class="pill ${attention.length?'warn':'good'}">${attention.length} ${attention.length===1?'сотрудник':'сотрудников'}</span></div>${attention.length?`<div class="sh839-att-grid">${attention.map(attentionRow).join('')}</div>`:'<div class="muted">По Soft и Hard сейчас нет подтверждённых зон развития.</div>'}</div><div class="sh74-section-head"><h2>Сотрудники</h2><span class="muted small">Soft ${pct(soft)} · Hard ${pct(hard)}</span></div><div class="sh74-manager-list">${users.length?users.map(rgRow).join(''):'<div class="card"><div class="muted">В группе пока нет сотрудников.</div></div>'}</div></div>`;
    return true;
  }

  const baseRender=typeof window.render==='function'?window.render:null;
  function stableRender(page){
    if(page==='progress'&&isEmployee())return renderEmployeeProgressStable();
    if(page==='mentor'&&isRg())return renderRgStable();
    return baseRender?baseRender.apply(this,arguments):undefined;
  }
  try{window.render=stableRender;window.render.__shStableV2=true}catch(_){}
  try{render=stableRender}catch(_){}

  const baseRenderCurrent=typeof window.renderCurrent==='function'?window.renderCurrent:null;
  function stableRenderCurrent(){
    if(S?.currentPage==='progress'&&isEmployee())return renderEmployeeProgressStable();
    if(S?.currentPage==='mentor'&&isRg())return renderRgStable();
    return baseRenderCurrent?baseRenderCurrent.apply(this,arguments):undefined;
  }
  try{window.renderCurrent=stableRenderCurrent}catch(_){}
  try{renderCurrent=stableRenderCurrent}catch(_){}

  /* ---------- one authoritative realtime data channel ---------- */
  let reconnectTimer=null,reconnectTry=0,live=false,renderTimer=null,lastEventAt=0,hiddenAt=0;
  const keyFor=(table,row)=>table==='allowed_logins'?String(row?.login||''):String(row?.id||'');
  function applyChange(table,list,payload,normalizer){
    const old=payload?.old,newRow=payload?.new;
    const row=payload?.eventType==='DELETE'?old:newRow;
    const key=keyFor(table,row);if(!key)return arr(list).slice();
    if(payload?.eventType==='DELETE')return arr(list).filter(x=>keyFor(table,x)!==key);
    const val=normalizer?normalizer(newRow):newRow,out=arr(list).slice(),i=out.findIndex(x=>keyFor(table,x)===key);
    if(i>=0)out[i]=val;else out.push(val);
    return out;
  }
  function relevant(l){
    l=String(l||'');if(!l||!S?.profile)return false;if(l===login())return true;if(role()==='tech_admin')return true;
    const u=arr(S.allowed).find(x=>String(x?.login||'')===l);if(!u)return false;
    if(isRg())return u.role==='employee'&&String(u.manager_login||'')===login();
    if(role()==='rs')return u.role==='employee'&&String(u.sector_name||'')===String(S.profile.sector_name||'');
    return false;
  }
  function markLive(ok,sub){
    const dot=document.getElementById('syncDot'),label=document.getElementById('syncLabel'),small=document.getElementById('syncSub');
    if(label)label.textContent=ok?'Синхронизировано':'Подключение…';
    if(small)small.textContent=ok?(sub||'в реальном времени'):'восстанавливаю связь';
    if(dot)dot.style.opacity=ok?'1':'.45';
  }
  function scheduleRender(){
    if(document.hidden)return;
    clearTimeout(renderTimer);
    renderTimer=setTimeout(()=>{try{stableRenderCurrent()}catch(e){console.warn('SkillHub realtime render skipped',e)}},40);
  }
  function eventSeen(){lastEventAt=Date.now();scheduleRender()}
  function onContent(p){S.content=applyChange('content',S.content,p,typeof window.normalizeContent==='function'?window.normalizeContent:null);eventSeen()}
  function onAssignment(p){S.assignments=applyChange('assignments',S.assignments,p);eventSeen()}
  function onAttempt(p){const row=p?.new||p?.old;if(!relevant(row?.login))return;S.attempts=applyChange('attempts',S.attempts,p);eventSeen()}
  function onManual(p){const row=p?.new||p?.old;if(!relevant(row?.login))return;S.manualAnswers=applyChange('manual_answers',S.manualAnswers,p);eventSeen()}
  function onNotification(p){const row=p?.new||p?.old;if(String(row?.login||'')!==login())return;S.notifications=applyChange('notifications',S.notifications,p);try{window.renderUnread?.()}catch(_){}eventSeen()}
  function onAllowed(p){
    const row=p?.new||p?.old;if(!row)return;
    if(!managerRole()&&String(row.login||'')!==login())return;
    S.allowed=applyChange('allowed_logins',S.allowed,p);
    eventSeen();
  }
  function onProfile(p){
    const row=p?.new||p?.old;if(!row)return;
    if(String(row.login||'')===login()&&p.eventType!=='DELETE')S.profile={...S.profile,...row};
    if(managerRole())S.profiles=applyChange('profiles',S.profiles,p);
    eventSeen();
  }
  function scheduleReconnect(){
    if(window.__shRuntimeV2Stopping)return;
    live=false;markLive(false);clearTimeout(reconnectTimer);reconnectTry=Math.min(reconnectTry+1,5);
    const delay=Math.min(5000,250*Math.pow(2,reconnectTry));
    reconnectTimer=setTimeout(()=>{try{subscribeRealtimeV2()}catch(_){}},delay);
  }
  function subscribeRealtimeV2(){
    if(!S?.sb||!S?.profile?.login)return;
    clearTimeout(reconnectTimer);
    if(S.subscription){try{S.sb.removeChannel(S.subscription)}catch(_){}S.subscription=null}
    const my=login();
    let ch=S.sb.channel('skillhub-live-v2-'+Date.now())
      .on('postgres_changes',{event:'*',schema:'public',table:'content'},onContent)
      .on('postgres_changes',{event:'*',schema:'public',table:'assignments'},onAssignment)
      .on('postgres_changes',{event:'*',schema:'public',table:'attempts'},onAttempt)
      .on('postgres_changes',{event:'*',schema:'public',table:'manual_answers'},onManual)
      .on('postgres_changes',{event:'*',schema:'public',table:'notifications',filter:`login=eq.${my}`},onNotification);
    if(managerRole()){
      ch=ch.on('postgres_changes',{event:'*',schema:'public',table:'allowed_logins'},onAllowed)
           .on('postgres_changes',{event:'*',schema:'public',table:'profiles'},onProfile);
    }else{
      ch=ch.on('postgres_changes',{event:'*',schema:'public',table:'allowed_logins',filter:`login=eq.${my}`},onAllowed)
           .on('postgres_changes',{event:'*',schema:'public',table:'profiles',filter:`login=eq.${my}`},onProfile);
    }
    S.subscription=ch.subscribe(status=>{
      if(status==='SUBSCRIBED'){
        live=true;reconnectTry=0;clearTimeout(reconnectTimer);markLive(true);scheduleRender();
      }else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED')scheduleReconnect();
    });
  }
  try{window.subscribeRealtime=subscribeRealtimeV2}catch(_){}
  try{subscribeRealtime=subscribeRealtimeV2}catch(_){}

  function backgroundResync(reason){
    if(!S?.user||typeof window.syncAll!=='function')return;
    try{window.syncAll(false).then(()=>{markLive(live,reason||'данные актуальны');scheduleRender()}).catch(()=>{})}catch(_){}
  }
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){hiddenAt=Date.now();return}
    if(!S?.user)return;
    const away=hiddenAt?Date.now()-hiddenAt:0;hiddenAt=0;
    if(!live){subscribeRealtimeV2();backgroundResync('связь восстановлена')}
    else if(away>60000)backgroundResync('данные проверены');
    else scheduleRender();
  });
  window.addEventListener('online',()=>{if(S?.user){subscribeRealtimeV2();backgroundResync('связь восстановлена')}});
  window.addEventListener('offline',()=>{live=false;markLive(false)});
  setInterval(()=>{if(S?.user&&!document.hidden&&!live)subscribeRealtimeV2()},5000);

  /* Critical-page self-heal: never leave a visible empty page. */
  function heal(){
    try{
      if(isEmployee()&&S.currentPage==='progress'&&!document.getElementById('page-progress')?.textContent?.trim())renderEmployeeProgressStable();
      if(isRg()&&S.currentPage==='mentor'&&!document.getElementById('page-mentor')?.textContent?.trim())renderRgStable();
    }catch(e){console.warn('SkillHub page self-heal skipped',e)}
  }
  document.addEventListener('click',e=>{
    const p=e.target?.closest?.('.nav-btn')?.dataset?.page;
    if((p==='progress'&&isEmployee())||(p==='mentor'&&isRg()))setTimeout(heal,0);
  },true);
  setTimeout(()=>{if(S?.user){subscribeRealtimeV2();heal()}},180);
  setTimeout(()=>{heal();if(S?.user&&!live)subscribeRealtimeV2()},900);

  if(!document.getElementById('sh-runtime-stability-v2-style')){
    const st=document.createElement('style');st.id='sh-runtime-stability-v2-style';st.textContent=`.sh-stable-rg .sh74-light-card{margin-top:14px}.sh-stable-rg-copy{min-width:0;display:grid;gap:4px;flex:1}.sh-stable-rg-copy small{color:var(--muted)}.sh-stable-rg-copy>div{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:12px;color:var(--muted)}.sh-stable-avatar{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;border:1px solid var(--line);font-weight:900}@media(max-width:620px){.sh-stable-rg .sh74-manager-top{align-items:flex-start}.sh-stable-rg .sh74-manager-top>.actions{width:100%;display:grid;grid-template-columns:1fr 1fr}.sh-stable-rg-row{grid-template-columns:auto minmax(0,1fr)!important;align-items:start!important}.sh-stable-rg-row>.btn{grid-column:1/-1;width:100%}}`;document.head.appendChild(st);
  }

  console.info('SkillHub: stable runtime v2 + instant realtime enabled');
})();
