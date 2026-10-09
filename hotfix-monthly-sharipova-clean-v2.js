/* SkillHub — clean monthly knowledge assessment v1 — 2026-10-09
   Single isolated module. Uses only monthly_checks/monthly_check_items/monthly_check_runs.
*/
(function(){
  'use strict';
  if(window.__shMonthlyCleanV1)return;
  window.__shMonthlyCleanV1=true;

  const VERSION='clean_v1';
  const TITLE='Итоговая проверка знаний';
  const PASS=75;
  const EST_MIN=30;
  const NEED={ai_dialogue:2,hard:8,manual:2};
  const TOTAL=12;
  const KINDS={ai_dialogue:'ИИ-диалог',hard:'Hard Skills',manual:'Свободный ответ'};
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const app=()=>typeof S!=='undefined'?S:null;
  const isManager=()=>['mentor','rs','tech_admin'].includes(app()?.profile?.role);
  const isEmployee=()=>app()?.profile?.role==='employee';
  const esc=v=>typeof window.esc==='function'?window.esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const js=v=>String(v??'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  const notify=t=>typeof window.toast==='function'?window.toast(t):console.info(t);
  const modal=h=>typeof window.showModal==='function'?window.showModal(h):null;
  const close=()=>typeof window.closeModal==='function'?window.closeModal():null;
  const now=()=>new Date().toISOString();
  const safeArr=x=>Array.isArray(x)?x:[];
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number(n)||0));
  const moneyNum=v=>Number(String(v??'').replace(/\s+/g,'').replace(/₽/g,'').replace(',','.').replace(/[^0-9.\-]/g,''));
  const fmtDate=v=>{if(!v)return'—';try{return new Date(v).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}catch(_){return String(v)}};
  const statusText=s=>s==='completed'?'Завершена':s==='in_progress'?'В процессе':s==='review'?'На проверке':'Не начата';
  const statusCls=s=>s==='completed'?'good':s==='in_progress'||s==='review'?'warn':'';

  function moscowParts(d=new Date()){
    const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);
    const o={};p.forEach(x=>{if(x.type!=='literal')o[x.type]=x.value});return o;
  }
  function monthKey(){const p=moscowParts();return `${p.year}-${p.month}-01`}
  function monthLast(k=monthKey()){const [y,m]=String(k).split('-').map(Number);return `${y}-${String(m).padStart(2,'0')}-${String(new Date(Date.UTC(y,m,0)).getUTCDate()).padStart(2,'0')}`}
  function dueIso(date,time='23:59'){return new Date(`${date}T${time}:00+03:00`).toISOString()}
  function isPastDue(c){return !!c?.due_at&&Date.now()>new Date(c.due_at).getTime()}

  let bank={hard:[],manual:[],loaded:false};
  let managerBusy=false, employeeBusy=false, observerTimer=0;
  let RUN=null;

  async function loadBank(force=false){
    const A=app();if(!A?.sb)throw new Error('Нет подключения к базе');
    if(bank.loaded&&!force)return bank;
    const [h,m]=await Promise.all([
      A.sb.from('content').select('id,title,topic,type,section,difficulty,payload').eq('status','published').eq('section','hard').eq('type','hardcase'),
      A.sb.from('content').select('id,title,topic,type,section,difficulty,payload').eq('status','published').eq('section','soft').eq('type','manual')
    ]);
    if(h.error)throw h.error;if(m.error)throw m.error;
    bank.hard=(h.data||[]).filter(x=>['scenario','sort_cards','tariff_calc'].includes(x?.payload?.mode));
    bank.manual=m.data||[];
    if(bank.hard.length<NEED.hard)throw new Error(`Для проверки нужно минимум ${NEED.hard} опубликованных Hard-заданий`);
    if(bank.manual.length<NEED.manual)throw new Error(`Для проверки нужно минимум ${NEED.manual} опубликованных открытых кейса`);
    bank.loaded=true;return bank;
  }

  function diverse(rows,n){
    const groups=new Map();
    rows.forEach(x=>{const k=`${x.payload?.mode||''}|${x.topic||'Другое'}`;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(x)});
    const out=[];let i=0,gs=[...groups.values()];
    while(out.length<n&&gs.some(g=>g[i])){for(const g of gs){if(g[i]&&out.length<n)out.push(g[i])}i++}
    if(out.length<n){for(const x of rows)if(!out.includes(x)&&out.length<n)out.push(x)}
    return out.slice(0,n);
  }
  function manualPick(rows,n){
    const by=new Map();rows.forEach(x=>{const k=x.topic||'Другое';if(!by.has(k))by.set(k,[]);by.get(k).push(x)});
    const out=[];let i=0,gs=[...by.values()];while(out.length<n&&gs.some(g=>g[i])){for(const g of gs){if(g[i]&&out.length<n)out.push(g[i])}i++}return out.slice(0,n);
  }

  async function visibleEmployees(){
    const A=app();if(!A?.sb||!A.profile)return[];
    let rows=(A.allowed||[]).filter(x=>x.active&&x.role==='employee');
    if(!rows.length){
      const q=await A.sb.from('allowed_logins').select('login,name,role,active,manager_login,sector_name,group_name').eq('active',true).eq('role','employee');
      if(q.error)throw q.error;rows=q.data||[];
    }
    if(A.profile.role==='mentor')rows=rows.filter(x=>x.manager_login===A.profile.login||(!x.manager_login&&x.group_name===A.profile.group_name));
    else if(A.profile.role==='rs'&&A.profile.sector_name)rows=rows.filter(x=>x.sector_name===A.profile.sector_name);
    const seen=new Set();return rows.filter(x=>x.login&&!seen.has(x.login)&&seen.add(x.login)).sort((a,b)=>String(a.name||a.login).localeCompare(String(b.name||b.login),'ru'));
  }

  async function loadCheckBundle(id){
    const A=app();
    const [c,i,r]=await Promise.all([
      A.sb.from('monthly_checks').select('*').eq('id',id).single(),
      A.sb.from('monthly_check_items').select('*').eq('check_id',id).order('position',{ascending:true}),
      A.sb.from('monthly_check_runs').select('*').eq('check_id',id).order('created_at',{ascending:true})
    ]);
    if(c.error)throw c.error;if(i.error)throw i.error;if(r.error)throw r.error;
    return{check:c.data,items:i.data||[],runs:r.data||[]};
  }

  function hardSnap(x){return{title:x.title,topic:x.topic,payload:{...(x.payload||{}),section:'hard',exam_mode:true,hide_feedback:true,source_type:'hardcase'}}}
  function manualSnap(x){
    const p=x.payload||{},answers=safeArr(p.answers),ci=Number(p.correct),ref=Number.isInteger(ci)&&ci>=0&&ci<answers.length?answers[ci]:'';
    return{title:x.title,topic:x.topic,payload:{question:p.question||x.title,instruction:'Напишите ответ самостоятельно так, как ответили бы клиенту в рабочем чате. Вариантов ответа нет.',reference_answer:ref,source_explanation:p.explanation||'',section:'soft',exam_mode:true,hide_feedback:true,ai_review:true,source_type:'manual'}};
  }
  function aiSnap(i){return{title:`ИИ-диалог ${i+1}`,topic:'Работа с негативом',payload:{mode:'ai_dialogue',section:'soft',exam_mode:true,hide_feedback:true,ai_client:true,ai_review:true,min_turns:4,max_turns:6,source_type:'soft_ai'}}}

  function choiceRow(x,kind,on){
    const p=x.payload||{},type=kind==='hard'?(p.mode==='sort_cards'?'Распределение карточек':p.mode==='tariff_calc'?'Расчёт':'Ситуационная задача'):'Свободный ответ';
    return `<label class="shmc-choice"><input type="checkbox" data-shmc-${kind} value="${esc(x.id)}" ${on?'checked':''}><i>✓</i><span><b>${esc(x.title||'Без названия')}</b><small>${esc(x.topic||'Без темы')} · ${esc(type)}</small></span></label>`;
  }
  function peopleRows(rows,selected=new Set()){
    return rows.map(x=>`<label class="shmc-choice"><input type="checkbox" data-shmc-person value="${esc(x.login)}" ${selected.has(x.login)?'checked':''}><i>✓</i><span><b>${esc(x.name||x.login)}</b><small>${esc(x.login)}</small></span></label>`).join('');
  }

  async function openComposer(existingId=''){
    if(!isManager())return;
    try{
      await loadBank();
      const emps=await visibleEmployees();
      let bundle=null;
      if(existingId)bundle=await loadCheckBundle(existingId);
      else{
        const q=await app().sb.from('monthly_checks').select('*').eq('created_by_login',app().profile.login).eq('month_key',monthKey()).order('created_at',{ascending:false}).limit(10);
        if(q.error)throw q.error;
        const existing=(q.data||[]).find(x=>x.status==='assigned'&&safeArr(x.recipients).length);
        if(existing)bundle=await loadCheckBundle(existing.id);
      }
      if(bundle?.items?.length)return showLockedComposer(bundle,emps);
      showNewComposer(emps);
    }catch(e){console.error(e);notify(e?.message||'Не удалось открыть итоговую проверку')}
  }

  function showNewComposer(emps){
    const hs=new Set(diverse(bank.hard,NEED.hard).map(x=>x.id));
    const ms=new Set(manualPick(bank.manual,NEED.manual).map(x=>x.id));
    const due=monthLast(),time='23:59';
    modal(`<div class="shmc-modal"><header><div><small>ИТОГОВАЯ ПРОВЕРКА ЗНАНИЙ</small><h2>Собрать и назначить</h2><p>Одна проверка: 2 ИИ-диалога, 8 Hard-заданий и 2 свободных ответа. Одна попытка, проходной балл ${PASS}%.</p></div><button class="btn secondary" onclick="closeModal()">✕</button></header>
      <section class="shmc-format"><div><span>💬</span><b>ИИ-диалог</b><small>2 задания · 4–6 ответов сотрудника · оценка ИИ</small></div><div><span>🧠</span><b>Hard Skills</b><small>8 заданий · реальные рабочие форматы</small></div><div><span>✍️</span><b>Свободный ответ</b><small>2 задания · ответ своими словами · оценка ИИ</small></div></section>
      <section class="shmc-section"><div class="shmc-section-head"><div><b>🧠 Выберите 8 Hard-заданий</b><small>Ситуационные задачи, карточки и расчёты</small></div><strong id="shmcHardCount">${hs.size}/${NEED.hard}</strong></div><div class="shmc-grid">${bank.hard.map(x=>choiceRow(x,'hard',hs.has(x.id))).join('')}</div></section>
      <section class="shmc-section"><div class="shmc-section-head"><div><b>✍️ Выберите 2 открытых кейса</b><small>Сотрудник пишет ответ самостоятельно</small></div><strong id="shmcManualCount">${ms.size}/${NEED.manual}</strong></div><div class="shmc-grid">${bank.manual.map(x=>choiceRow(x,'manual',ms.has(x.id))).join('')}</div></section>
      <section class="shmc-section"><div class="shmc-section-head"><div><b>👥 Кому назначить</b><small>${emps.length} сотрудников доступны вам</small></div></div><div class="shmc-scope"><label><input type="radio" name="shmcScope" value="all" checked onchange="shMonthlyCleanTogglePeople()"><span><b>Всем доступным</b><small>Назначить всей доступной команде</small></span></label><label><input type="radio" name="shmcScope" value="custom" onchange="shMonthlyCleanTogglePeople()"><span><b>Выбрать сотрудников</b><small>Назначить точечно</small></span></label></div><div id="shmcPeople" class="shmc-grid hidden">${peopleRows(emps)||'<div class="muted">Сотрудники не найдены</div>'}</div></section>
      <section class="shmc-deadline"><label><span>Пройти до</span><input id="shmcDue" type="date" value="${esc(due)}"></label><label><span>Время · МСК</span><input id="shmcTime" type="time" value="${esc(time)}"></label></section>
      <footer><div><b>12 заданий · ~${EST_MIN} минут</b><small>Состав фиксируется после назначения</small></div><button id="shmcAssignBtn" class="btn primary" onclick="shMonthlyCleanAssignNew()">Назначить проверку</button></footer></div>`);
    recountComposer();
  }

  function showLockedComposer(bundle,emps){
    const c=bundle.check,assigned=new Set(safeArr(c.recipients)),left=emps.filter(x=>!assigned.has(x.login));
    const cfg=c.config||{},due=c.due_date||monthLast(c.month_key),time=cfg.due_time_msk||'23:59';
    modal(`<div class="shmc-modal"><header><div><small>ИТОГОВАЯ ПРОВЕРКА ЗНАНИЙ</small><h2>Назначить ещё</h2><p>Состав уже зафиксирован. Новые сотрудники получат точно те же 12 заданий.</p></div><button class="btn secondary" onclick="closeModal()">✕</button></header>
      <section class="shmc-format"><div><span>💬</span><b>ИИ-диалог</b><small>${bundle.items.filter(x=>x.kind==='ai_dialogue').length} задания</small></div><div><span>🧠</span><b>Hard Skills</b><small>${bundle.items.filter(x=>x.kind==='hard').length} заданий</small></div><div><span>✍️</span><b>Свободный ответ</b><small>${bundle.items.filter(x=>x.kind==='manual').length} задания</small></div></section>
      <section class="shmc-section"><div class="shmc-section-head"><div><b>👥 Добавить сотрудников</b><small>${left.length} ещё не назначены</small></div></div><div class="shmc-scope"><label><input type="radio" name="shmcScope" value="all" checked onchange="shMonthlyCleanTogglePeople()"><span><b>Всем оставшимся</b><small>Назначить всем, у кого проверки ещё нет</small></span></label><label><input type="radio" name="shmcScope" value="custom" onchange="shMonthlyCleanTogglePeople()"><span><b>Выбрать сотрудников</b><small>Назначить точечно</small></span></label></div><div id="shmcPeople" class="shmc-grid hidden">${peopleRows(left)||'<div class="muted">Все сотрудники уже назначены</div>'}</div></section>
      <section class="shmc-deadline"><label><span>Пройти до</span><input id="shmcDue" type="date" value="${esc(due)}"></label><label><span>Время · МСК</span><input id="shmcTime" type="time" value="${esc(time)}"></label></section>
      <footer><div><b>12 заданий · ~${EST_MIN} минут</b><small>У уже проходящих прогресс не сбрасывается</small></div><button id="shmcAssignBtn" class="btn primary" ${left.length?'':'disabled'} onclick="shMonthlyCleanAddRecipients('${js(c.id)}')">Добавить сотрудников</button></footer></div>`);
  }

  window.shMonthlyCleanTogglePeople=function(){const custom=$('input[name="shmcScope"]:checked')?.value==='custom';$('#shmcPeople')?.classList.toggle('hidden',!custom)};
  function recountComposer(){
    const h=$$('[data-shmc-hard]:checked').length,m=$$('[data-shmc-manual]:checked').length;
    const he=$('#shmcHardCount'),me=$('#shmcManualCount');if(he)he.textContent=`${h}/${NEED.hard}`;if(me)me.textContent=`${m}/${NEED.manual}`;
  }
  document.addEventListener('change',e=>{if(e.target?.matches?.('[data-shmc-hard],[data-shmc-manual]'))recountComposer()},true);

  async function chosenRecipients(existing=new Set()){
    const emps=await visibleEmployees(),available=emps.filter(x=>!existing.has(x.login));
    const scope=$('input[name="shmcScope"]:checked')?.value||'all';
    const selected=scope==='all'?available.map(x=>x.login):$$('[data-shmc-person]:checked').map(x=>x.value).filter(x=>!existing.has(x));
    return [...new Set(selected)];
  }

  async function insertNotifications(logins,dueAt){
    if(!logins.length)return;
    const rows=logins.map(login=>({login,title:TITLE,body:`Назначена итоговая проверка знаний. Пройти до ${fmtDate(dueAt)}.`,kind:'monthly_check',read:false}));
    const q=await app().sb.from('notifications').insert(rows);if(q.error)console.warn('monthly notifications',q.error);
  }

  window.shMonthlyCleanAssignNew=async function(){
    if(!isManager()||managerBusy)return;
    const btn=$('#shmcAssignBtn');managerBusy=true;if(btn)btn.disabled=true;
    let createdId='';
    try{
      const hardIds=$$('[data-shmc-hard]:checked').map(x=>x.value),manualIds=$$('[data-shmc-manual]:checked').map(x=>x.value);
      if(hardIds.length!==NEED.hard)throw new Error(`Выберите ровно ${NEED.hard} Hard-заданий`);
      if(manualIds.length!==NEED.manual)throw new Error(`Выберите ровно ${NEED.manual} открытых кейса`);
      const recipients=await chosenRecipients();if(!recipients.length)throw new Error('Выберите хотя бы одного сотрудника');
      const date=$('#shmcDue')?.value,time=$('#shmcTime')?.value||'23:59';if(!date)throw new Error('Укажите срок прохождения');
      const due_at=dueIso(date,time);
      const A=app(),payload={month_key:monthKey(),title:TITLE,status:'assigned',due_date:date,due_at,pass_score:PASS,attempts_allowed:1,recipients,config:{format_version:VERSION,ai_dialogues:NEED.ai_dialogue,hard:NEED.hard,manual:NEED.manual,estimated_minutes:EST_MIN,due_time_msk:time},created_by:A.user?.id||null,created_by_login:A.profile?.login||null};
      const cq=await A.sb.from('monthly_checks').insert(payload).select('*').single();if(cq.error)throw cq.error;createdId=cq.data.id;
      const hs=hardIds.map(id=>bank.hard.find(x=>x.id===id)).filter(Boolean),ms=manualIds.map(id=>bank.manual.find(x=>x.id===id)).filter(Boolean);
      let pos=1;const items=[];
      for(let i=0;i<NEED.ai_dialogue;i++)items.push({check_id:createdId,position:pos++,kind:'ai_dialogue',source_content_id:null,snapshot:aiSnap(i),max_score:1});
      for(const x of hs)items.push({check_id:createdId,position:pos++,kind:'hard',source_content_id:x.id,snapshot:hardSnap(x),max_score:1});
      for(const x of ms)items.push({check_id:createdId,position:pos++,kind:'manual',source_content_id:x.id,snapshot:manualSnap(x),max_score:1});
      const iq=await A.sb.from('monthly_check_items').insert(items);if(iq.error)throw iq.error;
      const rq=await A.sb.from('monthly_check_runs').insert(recipients.map(login=>({check_id:createdId,login,status:'not_started',progress:0,breakdown:{version:VERSION,answers:{},current_index:0}})));if(rq.error)throw rq.error;
      await insertNotifications(recipients,due_at);
      close();notify(`Проверка назначена: ${recipients.length} сотрудникам`);invalidateManager();if(typeof window.syncAll==='function')window.syncAll(false).catch(()=>{});
    }catch(e){
      console.error(e);
      if(createdId){try{await app().sb.from('monthly_checks').delete().eq('id',createdId)}catch(_){}}
      notify(e?.message||'Не удалось назначить проверку');
    }finally{managerBusy=false;if(btn)btn.disabled=false}
  };

  window.shMonthlyCleanAddRecipients=async function(id){
    if(!isManager()||managerBusy)return;const btn=$('#shmcAssignBtn');managerBusy=true;if(btn)btn.disabled=true;
    try{
      const b=await loadCheckBundle(id),existing=new Set(safeArr(b.check.recipients)),add=await chosenRecipients(existing);if(!add.length)throw new Error('Выберите хотя бы одного сотрудника');
      const date=$('#shmcDue')?.value||b.check.due_date,time=$('#shmcTime')?.value||b.check.config?.due_time_msk||'23:59',due_at=dueIso(date,time),recipients=[...existing,...add];
      const uq=await app().sb.from('monthly_checks').update({recipients,status:'assigned',due_date:date,due_at,config:{...(b.check.config||{}),due_time_msk:time},updated_at:now()}).eq('id',id);if(uq.error)throw uq.error;
      const rq=await app().sb.from('monthly_check_runs').insert(add.map(login=>({check_id:id,login,status:'not_started',progress:0,breakdown:{version:VERSION,answers:{},current_index:0}})));if(rq.error)throw rq.error;
      await insertNotifications(add,due_at);close();notify(`Проверка добавлена: ${add.length} сотрудникам`);invalidateManager();if(typeof window.syncAll==='function')window.syncAll(false).catch(()=>{});
    }catch(e){console.error(e);notify(e?.message||'Не удалось добавить сотрудников')}finally{managerBusy=false;if(btn)btn.disabled=false}
  };
  window.shMonthlyCreateAndAssign=()=>openComposer('');
  window.shMonthlyCreateDraft=window.shMonthlyCreateAndAssign;
  window.shMonthlyOpenAssign=id=>openComposer(id);
  window.shAssessOpen=id=>openComposer(id);

  function managerCardHtml(checks,runs,emps){
    const names=new Map(emps.map(x=>[x.login,x.name||x.login]));
    const rows=checks.map(c=>{
      const rs=runs.filter(x=>x.check_id===c.id),done=rs.filter(x=>x.status==='completed'),avg=done.length?Math.round(done.reduce((s,x)=>s+Number(x.score||0),0)/done.length):null,total=safeArr(c.recipients).length;
      return `<div class="shmc-manager-row"><div><b>${esc(c.title||TITLE)}</b><small>${fmtDate(c.created_at)} · срок ${fmtDate(c.due_at)}</small><div class="shmc-tags"><span>${done.length}/${total} завершили</span><span>${avg===null?'Средний —':`Средний ${avg}%`}</span><span>Проходной ${Number(c.pass_score||PASS)}%</span></div></div><div class="shmc-row-actions"><button class="btn secondary" onclick="shMonthlyCleanResults('${js(c.id)}')">Результаты</button><button class="btn secondary" onclick="shMonthlyOpenAssign('${js(c.id)}')">Назначить ещё</button></div></div>`;
    }).join('');
    return `<section class="card shmc-manager" data-sh-monthly-clean-manager="1"><div class="shmc-manager-head"><div><span class="shmc-kicker">ЕЖЕМЕСЯЧНАЯ АТТЕСТАЦИЯ</span><h2>Итоговая проверка знаний</h2><p>12 заданий · 30 минут · 1 попытка · проходной балл ${PASS}%</p></div><button class="btn primary" onclick="shMonthlyCreateAndAssign()">Назначить проверку</button></div>${rows?`<div class="shmc-manager-list">${rows}</div>`:'<div class="shmc-empty">Проверок ещё нет. Создайте первую итоговую проверку.</div>'}</section>`;
  }

  async function enhanceManager(){
    if(!isManager()||managerBusy)return;const root=$('#page-assignments');if(!root||root.classList.contains('hidden')||root.querySelector('[data-sh-monthly-clean-manager]'))return;
    managerBusy=true;
    try{
      const A=app(),[cq,emps]=await Promise.all([A.sb.from('monthly_checks').select('*').order('created_at',{ascending:false}).limit(12),visibleEmployees()]);if(cq.error)throw cq.error;
      const checks=cq.data||[],ids=checks.map(x=>x.id);let runs=[];
      if(ids.length){const rq=await A.sb.from('monthly_check_runs').select('*').in('check_id',ids);if(rq.error)throw rq.error;runs=rq.data||[]}
      root.insertAdjacentHTML('afterbegin',managerCardHtml(checks,runs,emps));
    }catch(e){console.error('monthly manager',e)}finally{managerBusy=false}
  }
  function invalidateManager(){const x=$('[data-sh-monthly-clean-manager]');if(x)x.remove();setTimeout(enhanceManager,50)}

  window.shMonthlyCleanResults=async function(id){
    if(!isManager())return;
    try{
      const [b,emps]=await Promise.all([loadCheckBundle(id),visibleEmployees()]),names=new Map(emps.map(x=>[x.login,x.name||x.login]));
      const rows=safeArr(b.check.recipients).map(login=>{
        const r=b.runs.find(x=>x.login===login)||{status:'not_started',progress:0};
        return `<tr><td><b>${esc(names.get(login)||login)}</b><small>${esc(login)}</small></td><td><span class="shmc-status ${statusCls(r.status)}">${statusText(r.status)}</span></td><td>${Number(r.progress||0)}%</td><td>${r.status==='completed'?`<b>${Math.round(Number(r.score||0))}%</b>`:'—'}</td><td>${r.completed_at?fmtDate(r.completed_at):'—'}</td><td>${r.id?`<button class="btn secondary" onclick="shMonthlyCleanRunDetail('${js(id)}','${js(r.id)}')">Подробнее</button>`:'—'}</td></tr>`;
      }).join('');
      modal(`<div class="shmc-results"><header><div><small>РЕЗУЛЬТАТЫ</small><h2>${esc(b.check.title||TITLE)}</h2><p>${safeArr(b.check.recipients).length} сотрудников · проходной ${Number(b.check.pass_score||PASS)}%</p></div><button class="btn secondary" onclick="closeModal()">✕</button></header><div class="shmc-table-wrap"><table><thead><tr><th>Сотрудник</th><th>Статус</th><th>Прогресс</th><th>Результат</th><th>Завершено</th><th></th></tr></thead><tbody>${rows||'<tr><td colspan="6">Нет назначенных сотрудников</td></tr>'}</tbody></table></div></div>`);
    }catch(e){console.error(e);notify(e?.message||'Не удалось загрузить результаты')}
  };

  window.shMonthlyCleanRunDetail=async function(checkId,runId){
    if(!isManager())return;
    try{
      const b=await loadCheckBundle(checkId),r=b.runs.find(x=>x.id===runId);if(!r)throw new Error('Результат не найден');const ans=r.breakdown?.answers||{};
      const parts=b.items.map((it,i)=>{const a=ans[it.id],review=a?.review||{};return `<div class="shmc-detail-item"><div class="shmc-detail-head"><span>${i+1}</span><div><b>${esc(it.snapshot?.title||KINDS[it.kind]||'Задание')}</b><small>${esc(KINDS[it.kind]||it.kind)} · ${a?`${Number(a.points||0).toFixed(2).replace('.00','')} / 1`:'не выполнено'}</small></div></div>${review.summary?`<p>${esc(review.summary)}</p>`:''}${safeArr(review.strengths).length?`<div class="shmc-review good"><b>Сильные стороны</b>${safeArr(review.strengths).map(x=>`<span>• ${esc(x)}</span>`).join('')}</div>`:''}${safeArr(review.improvements).length?`<div class="shmc-review"><b>Что улучшить</b>${safeArr(review.improvements).map(x=>`<span>• ${esc(x)}</span>`).join('')}</div>`:''}${safeArr(review.criticalErrors).length?`<div class="shmc-review bad"><b>Критические ошибки</b>${safeArr(review.criticalErrors).map(x=>`<span>• ${esc(x)}</span>`).join('')}</div>`:''}</div>`}).join('');
      modal(`<div class="shmc-results"><header><div><small>ДЕТАЛИ ПРОВЕРКИ</small><h2>${esc(r.login)}</h2><p>${statusText(r.status)}${r.score!==null&&r.score!==undefined?` · ${Math.round(Number(r.score))}%`:''}</p></div><button class="btn secondary" onclick="shMonthlyCleanResults('${js(checkId)}')">← Назад</button></header><div class="shmc-detail-list">${parts}</div></div>`);
    }catch(e){console.error(e);notify(e?.message||'Не удалось открыть результат')}
  };

  async function employeeChecks(){
    const A=app(),login=A?.profile?.login;if(!A?.sb||!login)return[];
    const cq=await A.sb.from('monthly_checks').select('*').contains('recipients',[login]).in('status',['assigned','closed']).order('created_at',{ascending:false}).limit(10);if(cq.error)throw cq.error;
    const checks=cq.data||[],ids=checks.map(x=>x.id);let runs=[];
    if(ids.length){const rq=await A.sb.from('monthly_check_runs').select('*').eq('login',login).in('check_id',ids);if(rq.error)throw rq.error;runs=rq.data||[]}
    return checks.map(c=>({check:c,run:runs.find(r=>r.check_id===c.id)||null}));
  }
  function employeeCardHtml(rows){
    if(!rows.length)return'';
    return `<section data-sh-monthly-clean-employee="1" class="shmc-employee-list">${rows.map(({check:c,run:r})=>{
      const st=r?.status||'not_started',done=st==='completed',expired=!done&&isPastDue(c),label=done?'Посмотреть результат':st==='in_progress'||st==='review'?'Продолжить':expired?'Срок истёк':'Начать проверку';
      const score=done?`<div class="shmc-score ${Number(r.score)>=Number(c.pass_score)?'good':'bad'}"><b>${Math.round(Number(r.score||0))}%</b><small>${Number(r.score)>=Number(c.pass_score)?'Пройдена':'Не пройдена'}</small></div>`:'';
      return `<div class="card shmc-employee"><div class="shmc-employee-top"><div><span class="shmc-kicker">ИТОГОВАЯ ПРОВЕРКА ЗНАНИЙ</span><h2>${esc(c.title||TITLE)}</h2><p>12 заданий · ~${Number(c.config?.estimated_minutes||EST_MIN)} минут · 1 попытка · проходной ${Number(c.pass_score||PASS)}%</p></div>${score}</div><div class="shmc-meta"><span>📅 До ${fmtDate(c.due_at)}</span><span>📊 ${done?'Завершена':`${Number(r?.progress||0)}% выполнено`}</span></div><div class="shmc-employee-actions"><span class="shmc-status ${statusCls(st)}">${expired?'Срок истёк':statusText(st)}</span><button class="btn primary" ${expired?'disabled':''} onclick="shMonthlyStart('${js(c.id)}')">${label}</button></div></div>`;
    }).join('')}</section>`;
  }
  async function enhanceEmployee(){
    if(!isEmployee()||employeeBusy)return;const root=$('#page-home');if(!root||root.classList.contains('hidden')||root.querySelector('[data-sh-monthly-clean-employee]'))return;
    employeeBusy=true;try{const rows=await employeeChecks();const h=employeeCardHtml(rows);if(h)root.insertAdjacentHTML('afterbegin',h)}catch(e){console.error('monthly employee',e)}finally{employeeBusy=false}
  }
  function invalidateEmployee(){const x=$('[data-sh-monthly-clean-employee]');if(x)x.remove();setTimeout(enhanceEmployee,50)}

  function blankBreakdown(r){const b=r?.breakdown&&typeof r.breakdown==='object'?{...r.breakdown}:{version:VERSION,answers:{},current_index:0};b.answers=b.answers&&typeof b.answers==='object'?b.answers:{};return b}
  function nextUnanswered(items,answers,start=0){for(let i=Math.max(0,start);i<items.length;i++)if(!answers[items[i].id])return i;for(let i=0;i<items.length;i++)if(!answers[items[i].id])return i;return items.length}
  async function saveRun(patch={}){
    if(!RUN)return;const q=await app().sb.from('monthly_check_runs').update({...patch,updated_at:now()}).eq('id',RUN.run.id).select('*').single();if(q.error)throw q.error;RUN.run=q.data;RUN.breakdown=blankBreakdown(q.data);return q.data;
  }
  async function persistProgress(index=RUN?.index||0){
    if(!RUN)return;const done=Object.keys(RUN.breakdown.answers||{}).length,progress=Math.round(done/RUN.items.length*100);RUN.breakdown.current_index=index;RUN.breakdown.version=VERSION;await saveRun({status:'in_progress',progress,breakdown:RUN.breakdown});
  }
  async function saveAnswer(item,data){
    RUN.breakdown.answers[item.id]={kind:item.kind,max:1,saved_at:now(),...data};RUN.index=nextUnanswered(RUN.items,RUN.breakdown.answers,RUN.index+1);await persistProgress(RUN.index);renderRun();
  }

  window.shMonthlyStart=async function(checkId){
    if(!isEmployee())return;
    try{
      const b=await loadCheckBundle(checkId),login=app().profile.login,run=b.runs.find(x=>x.login===login);if(!run)throw new Error('Проверка вам не назначена');
      if(run.status!=='completed'&&isPastDue(b.check))throw new Error('Срок прохождения этой проверки истёк');
      if(run.status==='completed'){RUN={check:b.check,items:b.items,run,breakdown:blankBreakdown(run),index:b.items.length};if(typeof window.go==='function')window.go('run');return showResult()}
      let current=run;if(run.status==='not_started'){const q=await app().sb.from('monthly_check_runs').update({status:'in_progress',started_at:now(),updated_at:now()}).eq('id',run.id).select('*').single();if(q.error)throw q.error;current=q.data}
      const breakdown=blankBreakdown(current),index=nextUnanswered(b.items,breakdown.answers,Number(breakdown.current_index||0));RUN={check:b.check,items:b.items,run:current,breakdown,index};
      if(typeof window.go==='function')window.go('run');renderRun();
    }catch(e){console.error(e);notify(e?.message||'Не удалось открыть проверку')}
  };

  function runShell(body,actions=''){
    const n=Math.min(RUN.index+1,RUN.items.length),done=Object.keys(RUN.breakdown.answers||{}).length,p=Math.round(done/RUN.items.length*100);
    return `<div class="shmc-run"><div class="shmc-run-top"><button class="btn secondary" onclick="shMonthlyExitRun()">← Выйти</button><div><span>Итоговая проверка знаний</span><b>${RUN.index<RUN.items.length?`Задание ${n} из ${RUN.items.length}`:'Все задания выполнены'}</b></div><strong>${p}%</strong></div><div class="shmc-progress"><i style="width:${p}%"></i></div>${body}${actions}</div>`;
  }
  window.shMonthlyExitRun=function(){RUN=null;if(typeof window.go==='function')window.go('home');invalidateEmployee()};

  function renderRun(){
    const root=$('#page-run');if(!root||!RUN)return;
    if(RUN.run.status==='completed')return showResult();
    if(RUN.index>=RUN.items.length){root.innerHTML=runShell(`<section class="card shmc-finish"><span>✓</span><h2>Все 12 заданий выполнены</h2><p>Ответы сохранены. После завершения изменить их будет нельзя.</p><button id="shmcFinishBtn" class="btn primary" onclick="shMonthlyFinish()">Завершить проверку</button></section>`);return}
    const item=RUN.items[RUN.index];
    if(item.kind==='hard')root.innerHTML=runShell(renderHard(item));
    else if(item.kind==='manual')root.innerHTML=runShell(renderManual(item));
    else if(item.kind==='ai_dialogue')root.innerHTML=runShell(renderAi(item));
    else root.innerHTML=runShell(`<section class="card"><h2>Неизвестный формат задания</h2></section>`);
  }

  function factsHtml(p){const f=safeArr(p.facts);return f.length?`<div class="shmc-facts">${f.map(x=>`<div><span>${esc(x.label||'')}</span><b>${esc(x.value||'')}</b></div>`).join('')}</div>`:''}
  function actionHtml(a){if(!a)return'';const vals=[a.amount,a.recipient,a.purpose,a.queue].filter(Boolean);return `<div class="shmc-action"><span>ЗАДАЧА КЛИЕНТА</span><b>${esc(a.title||'')}</b>${vals.map(x=>`<small>${esc(x)}</small>`).join('')}</div>`}
  function renderHard(item){
    const s=item.snapshot||{},p=s.payload||{},mode=p.mode;
    if(mode==='scenario'){
      const opts=safeArr(p.options?.length?p.options:p.answers);return `<section class="card shmc-task"><div class="shmc-task-head"><span>🧠 HARD SKILLS</span><small>${esc(s.topic||'')}</small></div><h2>${esc(s.title||'Ситуационная задача')}</h2>${p.scenario||p.situation?`<div class="shmc-situation"><b>Ситуация</b><p>${esc(p.scenario||p.situation)}</p>${factsHtml(p)}${actionHtml(p.action)}</div>`:''}<div class="shmc-question"><span>ВОПРОС</span><b>${esc(p.question||'Какое решение верное?')}</b></div><div class="shmc-options">${opts.map((o,i)=>`<label><input type="radio" name="shmcHardOption" value="${i}"><i>${i+1}</i><span>${esc(typeof o==='string'?o:o?.text||'')}</span></label>`).join('')}</div><button class="btn primary shmc-next" onclick="shMonthlySubmitScenario('${js(item.id)}')">Сохранить и продолжить</button></section>`;
    }
    if(mode==='sort_cards'){
      const cards=safeArr(p.cards),cats=safeArr(p.categories);return `<section class="card shmc-task"><div class="shmc-task-head"><span>🧠 HARD SKILLS · КАРТОЧКИ</span><small>${esc(s.topic||'')}</small></div><h2>${esc(p.question||s.title||'Распределите карточки')}</h2><p class="muted">${esc(p.instruction||'Для каждой карточки выберите подходящую категорию.')}</p><div class="shmc-sort">${cards.map((c,i)=>`<label><span>${esc(c.text||'')}</span><select data-shmc-sort="${i}"><option value="">Выберите категорию</option>${cats.map(cat=>`<option value="${esc(cat.id)}">${esc(cat.title||cat.id)}</option>`).join('')}</select></label>`).join('')}</div><button class="btn primary shmc-next" onclick="shMonthlySubmitSort('${js(item.id)}')">Сохранить и продолжить</button></section>`;
    }
    if(mode==='tariff_calc'){
      return `<section class="card shmc-task"><div class="shmc-task-head"><span>🧠 HARD SKILLS · РАСЧЁТ</span><small>${esc(s.topic||'')}</small></div><h2>${esc(s.title||'Расчёт')}</h2>${p.scenario?`<div class="shmc-situation"><b>Ситуация</b><p>${esc(p.scenario)}</p>${factsHtml(p)}</div>`:''}<div class="shmc-calc"><label><span>${esc(p.step1?.prompt||p.question||'Шаг 1')}</span><div><input id="shmcCalc1" inputmode="decimal" placeholder="Введите число"><b>${esc(p.step1?.unit||'')}</b></div></label><label><span>${esc(p.step2?.question||'Шаг 2')}</span>${p.step2?.client?`<small>${esc(p.step2.client)}</small>`:''}<div><input id="shmcCalc2" inputmode="decimal" placeholder="Введите число"><b>${esc(p.step2?.unit||'')}</b></div></label></div><button class="btn primary shmc-next" onclick="shMonthlySubmitCalc('${js(item.id)}')">Сохранить и продолжить</button></section>`;
    }
    return `<section class="card shmc-task"><h2>Формат задания недоступен</h2><p>Обратитесь к руководителю.</p></section>`;
  }

  window.shMonthlySubmitScenario=async function(id){
    try{const item=RUN?.items.find(x=>x.id===id);if(!item)return;const el=$('input[name="shmcHardOption"]:checked');if(!el){notify('Выберите вариант ответа');return}const selected=Number(el.value),correct=Number(item.snapshot?.payload?.correct),points=selected===correct?1:0;await saveAnswer(item,{selected,points})}catch(e){console.error(e);notify('Не удалось сохранить ответ')}
  };
  window.shMonthlySubmitSort=async function(id){
    try{const item=RUN?.items.find(x=>x.id===id);if(!item)return;const cards=safeArr(item.snapshot?.payload?.cards),values=$$('[data-shmc-sort]').map(x=>x.value);if(values.length!==cards.length||values.some(x=>!x)){notify('Распределите все карточки');return}let ok=0;cards.forEach((c,i)=>{if(values[i]===String(c.category))ok++});await saveAnswer(item,{placements:values,points:cards.length?ok/cards.length:0})}catch(e){console.error(e);notify('Не удалось сохранить ответ')}
  };
  window.shMonthlySubmitCalc=async function(id){
    try{const item=RUN?.items.find(x=>x.id===id);if(!item)return;const p=item.snapshot?.payload||{},v1=moneyNum($('#shmcCalc1')?.value),v2=moneyNum($('#shmcCalc2')?.value);if(!Number.isFinite(v1)||!Number.isFinite(v2)){notify('Введите оба числовых ответа');return}const e1=Number(p.step1?.answer),e2=Number(p.step2?.answer),t1=Number(p.step1?.tolerance||0),t2=Number(p.step2?.tolerance||0),ok1=Number.isFinite(e1)&&Math.abs(v1-e1)<=t1,ok2=Number.isFinite(e2)&&Math.abs(v2-e2)<=t2;await saveAnswer(item,{values:[v1,v2],points:(ok1?0.5:0)+(ok2?0.5:0)})}catch(e){console.error(e);notify('Не удалось сохранить ответ')}
  };

  function renderManual(item){const s=item.snapshot||{},p=s.payload||{};return `<section class="card shmc-task"><div class="shmc-task-head"><span>✍️ СВОБОДНЫЙ ОТВЕТ</span><small>${esc(s.topic||'')}</small></div><h2>${esc(s.title||'Кейс')}</h2><div class="shmc-situation"><b>Ситуация</b><p>${esc(p.question||s.title||'')}</p></div><label class="shmc-textarea"><span>${esc(p.instruction||'Напишите ответ своими словами.')}</span><textarea id="shmcManualAnswer" maxlength="6000" placeholder="Напишите ответ так, как ответили бы клиенту"></textarea></label><button id="shmcManualBtn" class="btn primary shmc-next" onclick="shMonthlySubmitManual('${js(item.id)}')">Проверить и продолжить</button></section>`}

  async function aiInvoke(body){const q=await app().sb.functions.invoke('monthly-assessment-ai',{body});if(q.error)throw new Error(q.error.message||'ИИ временно недоступен');if(q.data?.error)throw new Error(q.data.error);return q.data}
  window.shMonthlySubmitManual=async function(id){
    const btn=$('#shmcManualBtn');if(btn)btn.disabled=true;
    try{const item=RUN?.items.find(x=>x.id===id);if(!item)return;const answer=String($('#shmcManualAnswer')?.value||'').trim();if(answer.length<10)throw new Error('Напишите более полный ответ');if(btn)btn.textContent='Проверяем ответ…';const d=await aiInvoke({action:'manual_review',checkId:RUN.check.id,itemId:id,answer});await saveAnswer(item,{answer,review:d.review||{},points:clamp(d.points,0,1)})}catch(e){console.error(e);notify(e?.message||'Не удалось проверить ответ');if(btn){btn.disabled=false;btn.textContent='Проверить и продолжить'}}
  };

  function aiState(item){const a=RUN.breakdown.answers?.[item.id];if(a?.draft)return a.draft;RUN.breakdown.drafts=RUN.breakdown.drafts||{};return RUN.breakdown.drafts[item.id]||(RUN.breakdown.drafts[item.id]={scenario:null,transcript:[],done:false,started:false})}
  async function persistDraft(item,st){RUN.breakdown.drafts=RUN.breakdown.drafts||{};RUN.breakdown.drafts[item.id]=st;RUN.breakdown.current_index=RUN.index;await saveRun({status:'in_progress',breakdown:RUN.breakdown})}
  function renderAi(item){
    const st=aiState(item),messages=safeArr(st.transcript);
    if(!st.started)return `<section class="card shmc-task shmc-ai"><div class="shmc-task-head"><span>💬 ИИ-ДИАЛОГ · SOFT SKILLS</span><small>Ответ своими словами</small></div><h2>${esc(item.snapshot?.title||'Диалог с клиентом')}</h2><p>Вы общаетесь с негативным клиентом. Отвечайте так, как отвечали бы в рабочем чате. Диалог займёт 4–6 ваших сообщений.</p><button id="shmcAiStart" class="btn primary shmc-next" onclick="shMonthlyAiStart('${js(item.id)}')">Начать диалог</button></section>`;
    return `<section class="card shmc-task shmc-ai"><div class="shmc-task-head"><span>💬 ИИ-ДИАЛОГ · SOFT SKILLS</span><small>${messages.filter(x=>x.role==='employee').length}/6 ответов</small></div><h2>${esc(st.scenario?.title||'Диалог с клиентом')}</h2><div class="shmc-chat">${messages.map(m=>`<div class="${m.role==='employee'?'employee':'client'}"><small>${m.role==='employee'?'Вы':'Клиент'}</small><p>${esc(m.content||'')}</p></div>`).join('')}</div>${st.done?`<div class="shmc-ai-done"><b>Диалог завершён</b><p>Осталось получить итоговую оценку.</p><button id="shmcAiReview" class="btn primary" onclick="shMonthlyAiReview('${js(item.id)}')">Получить оценку и продолжить</button></div>`:`<label class="shmc-textarea"><span>Ваш ответ</span><textarea id="shmcAiAnswer" maxlength="600" placeholder="Ответьте клиенту"></textarea></label><button id="shmcAiSend" class="btn primary shmc-next" onclick="shMonthlyAiSend('${js(item.id)}')">Отправить</button>`}</section>`;
  }
  window.shMonthlyAiStart=async function(id){const btn=$('#shmcAiStart');if(btn)btn.disabled=true;try{const item=RUN.items.find(x=>x.id===id),st=aiState(item);const d=await aiInvoke({action:'dialogue_start',checkId:RUN.check.id,itemId:id});st.started=true;st.scenario=d.scenario||{};st.transcript=[{role:'client',content:d.message||st.scenario?.first||''}];await persistDraft(item,st);renderRun()}catch(e){console.error(e);notify(e?.message||'Не удалось начать диалог');if(btn)btn.disabled=false}};
  window.shMonthlyAiSend=async function(id){const btn=$('#shmcAiSend');if(btn)btn.disabled=true;try{const item=RUN.items.find(x=>x.id===id),st=aiState(item),answer=String($('#shmcAiAnswer')?.value||'').trim();if(answer.length<2)throw new Error('Напишите ответ клиенту');st.transcript.push({role:'employee',content:answer});if(btn)btn.textContent='Клиент отвечает…';const d=await aiInvoke({action:'dialogue_reply',checkId:RUN.check.id,itemId:id,scenario:st.scenario,transcript:st.transcript});if(d.message)st.transcript.push({role:'client',content:d.message});st.done=!!d.done;await persistDraft(item,st);renderRun()}catch(e){console.error(e);notify(e?.message||'Не удалось отправить ответ');if(btn){btn.disabled=false;btn.textContent='Отправить'}}};
  window.shMonthlyAiReview=async function(id){const btn=$('#shmcAiReview');if(btn)btn.disabled=true;try{const item=RUN.items.find(x=>x.id===id),st=aiState(item);if(btn)btn.textContent='Оцениваем диалог…';const d=await aiInvoke({action:'dialogue_review',checkId:RUN.check.id,itemId:id,scenario:st.scenario,transcript:st.transcript});RUN.breakdown.drafts&&delete RUN.breakdown.drafts[id];await saveAnswer(item,{scenario:st.scenario,transcript:st.transcript,review:d.review||{},points:clamp(d.points,0,1)})}catch(e){console.error(e);notify(e?.message||'Не удалось получить оценку');if(btn){btn.disabled=false;btn.textContent='Получить оценку и продолжить'}}};

  window.shMonthlyFinish=async function(){
    const btn=$('#shmcFinishBtn');if(btn)btn.disabled=true;
    try{
      if(!RUN)return;const answers=RUN.breakdown.answers||{};if(Object.keys(answers).length!==RUN.items.length)throw new Error('Не все задания выполнены');
      const total=RUN.items.reduce((s,it)=>s+Number(answers[it.id]?.points||0),0),score=Math.round(total/RUN.items.length*100),by={};
      for(const k of ['ai_dialogue','hard','manual']){const its=RUN.items.filter(x=>x.kind===k),points=its.reduce((s,it)=>s+Number(answers[it.id]?.points||0),0);by[k]={points,max:its.length,percent:its.length?Math.round(points/its.length*100):0}}
      RUN.breakdown.summary={score,pass:score>=Number(RUN.check.pass_score||PASS),sections:by,completed_at:now()};RUN.breakdown.current_index=RUN.items.length;
      await saveRun({status:'completed',progress:100,score,breakdown:RUN.breakdown,submitted_at:now(),completed_at:now()});showResult();invalidateEmployee();
    }catch(e){console.error(e);notify(e?.message||'Не удалось завершить проверку');if(btn)btn.disabled=false}
  };

  function showResult(){
    const root=$('#page-run');if(!root||!RUN)return;const score=Math.round(Number(RUN.run.score||RUN.breakdown.summary?.score||0)),pass=score>=Number(RUN.check.pass_score||PASS),secs=RUN.breakdown.summary?.sections||{};
    root.innerHTML=runShell(`<section class="card shmc-result"><div class="shmc-result-mark ${pass?'good':'bad'}">${pass?'✓':'!'}</div><span class="shmc-kicker">РЕЗУЛЬТАТ</span><h2>${pass?'Проверка пройдена':'Проверка не пройдена'}</h2><strong>${score}%</strong><p>Проходной балл — ${Number(RUN.check.pass_score||PASS)}%</p><div class="shmc-result-sections"><div><span>💬 ИИ-диалоги</span><b>${secs.ai_dialogue?.percent??'—'}%</b></div><div><span>🧠 Hard Skills</span><b>${secs.hard?.percent??'—'}%</b></div><div><span>✍️ Свободный ответ</span><b>${secs.manual?.percent??'—'}%</b></div></div><button class="btn primary" onclick="shMonthlyExitRun()">На главную</button></section>`);
  }

  function installStyles(){if($('#shMonthlyCleanStyle'))return;const s=document.createElement('style');s.id='shMonthlyCleanStyle';s.textContent=`
  .shmc-kicker,.shmc-modal header>div>small,.shmc-results header>div>small{display:block;color:var(--primary);font-size:10px;font-weight:950;letter-spacing:.09em}.shmc-manager{margin-bottom:16px}.shmc-manager-head,.shmc-employee-top,.shmc-modal header,.shmc-results header,.shmc-run-top{display:flex;justify-content:space-between;align-items:flex-start;gap:14px}.shmc-manager-head h2,.shmc-employee h2,.shmc-modal h2,.shmc-results h2{margin:4px 0 5px}.shmc-manager-head p,.shmc-employee p,.shmc-modal header p,.shmc-results header p{margin:0;color:var(--muted)}.shmc-manager-list{display:grid;gap:8px;margin-top:14px}.shmc-manager-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px;border:1px solid var(--line);border-radius:14px;background:var(--panel2)}.shmc-manager-row>div:first-child{min-width:0}.shmc-manager-row b,.shmc-manager-row small{display:block}.shmc-manager-row small{color:var(--muted);margin-top:2px}.shmc-tags,.shmc-meta{display:flex;gap:7px;flex-wrap:wrap;margin-top:7px}.shmc-tags span,.shmc-meta span{border:1px solid var(--line);border-radius:999px;padding:4px 8px;font-size:11px;color:var(--muted)}.shmc-row-actions{display:flex;gap:7px;flex-wrap:wrap}.shmc-empty{margin-top:12px;padding:14px;border:1px dashed var(--line);border-radius:13px;color:var(--muted)}
  #modalCard:has(.shmc-modal),#modalCard:has(.shmc-results){width:min(900px,calc(100vw - 18px));max-width:min(900px,calc(100vw - 18px));overflow-x:hidden}.shmc-modal,.shmc-results,.shmc-modal *,.shmc-results *{box-sizing:border-box}.shmc-modal,.shmc-results{display:grid;gap:12px;min-width:0}.shmc-format{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.shmc-format>div{border:1px solid var(--line);border-radius:15px;background:var(--panel2);padding:12px}.shmc-format span,.shmc-format b,.shmc-format small{display:block}.shmc-format span{font-size:23px}.shmc-format b{margin-top:5px}.shmc-format small{color:var(--muted);margin-top:3px;line-height:1.35}.shmc-section{border:1px solid var(--line);border-radius:17px;background:var(--panel);padding:14px;min-width:0}.shmc-section-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:10px}.shmc-section-head b,.shmc-section-head small{display:block}.shmc-section-head small{color:var(--muted);margin-top:2px}.shmc-section-head strong{border:1px solid var(--line);border-radius:10px;padding:7px 9px}.shmc-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;max-height:350px;overflow:auto}.shmc-grid.hidden{display:none!important}.shmc-choice{position:relative!important;display:grid!important;grid-template-columns:22px minmax(0,1fr)!important;align-items:center!important;gap:9px!important;width:100%!important;min-width:0!important;margin:0!important;padding:10px!important;border:1px solid var(--line);border-radius:12px;background:var(--panel2);cursor:pointer}.shmc-choice input{position:absolute!important;opacity:0!important;pointer-events:none!important}.shmc-choice i{width:21px;height:21px;border:1px solid var(--line);border-radius:6px;display:grid;place-items:center;color:transparent;font-style:normal;font-weight:900}.shmc-choice span,.shmc-choice b,.shmc-choice small{display:block;min-width:0;overflow-wrap:anywhere}.shmc-choice small{color:var(--muted);font-size:11px;margin-top:2px}.shmc-choice:has(input:checked){border-color:color-mix(in srgb,var(--primary) 62%,var(--line));background:color-mix(in srgb,var(--primary) 8%,var(--panel2))}.shmc-choice:has(input:checked) i{background:var(--primary);border-color:var(--primary);color:#fff}.shmc-scope{display:grid;grid-template-columns:1fr 1fr;gap:8px}.shmc-scope label{display:grid;grid-template-columns:22px minmax(0,1fr);gap:9px;align-items:start;border:1px solid var(--line);border-radius:12px;padding:11px}.shmc-scope input{width:19px;height:19px;margin:0}.shmc-scope b,.shmc-scope small{display:block}.shmc-scope small{color:var(--muted);margin-top:2px}.shmc-deadline{display:grid;grid-template-columns:1fr 1fr;gap:10px;border:1px solid var(--line);border-radius:16px;padding:14px}.shmc-deadline label span{display:block;color:var(--muted);font-size:12px;font-weight:850;margin-bottom:5px}.shmc-deadline input{width:100%}.shmc-modal footer{display:flex;justify-content:space-between;align-items:center;gap:12px}.shmc-modal footer b,.shmc-modal footer small{display:block}.shmc-modal footer small{color:var(--muted);margin-top:2px}
  .shmc-employee-list{display:grid;gap:10px;margin-bottom:16px}.shmc-employee{border:1px solid color-mix(in srgb,var(--primary) 30%,var(--line))}.shmc-score{min-width:86px;text-align:center;border:1px solid var(--line);border-radius:14px;padding:9px}.shmc-score b{font-size:24px;display:block}.shmc-score small{display:block}.shmc-score.good{border-color:color-mix(in srgb,#28a745 50%,var(--line))}.shmc-score.bad{border-color:color-mix(in srgb,#d33 50%,var(--line))}.shmc-employee-actions{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:12px}.shmc-status{display:inline-flex;border:1px solid var(--line);border-radius:999px;padding:5px 9px;font-size:11px;font-weight:850}.shmc-status.good{border-color:color-mix(in srgb,#28a745 48%,var(--line))}.shmc-status.warn{border-color:color-mix(in srgb,#d7a600 48%,var(--line))}
  .shmc-table-wrap{overflow:auto}.shmc-results table{width:100%;border-collapse:collapse;min-width:720px}.shmc-results th,.shmc-results td{padding:10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:middle}.shmc-results td small{display:block;color:var(--muted);margin-top:2px}.shmc-detail-list{display:grid;gap:9px}.shmc-detail-item{border:1px solid var(--line);border-radius:14px;padding:12px;background:var(--panel2)}.shmc-detail-head{display:grid;grid-template-columns:30px minmax(0,1fr);gap:9px}.shmc-detail-head>span{width:28px;height:28px;border-radius:9px;background:var(--panel);display:grid;place-items:center;font-weight:900}.shmc-detail-head b,.shmc-detail-head small{display:block}.shmc-detail-head small{color:var(--muted);margin-top:2px}.shmc-detail-item>p{margin:9px 0 0}.shmc-review{margin-top:8px;border-left:3px solid var(--primary);padding:7px 9px;background:var(--panel)}.shmc-review.good{border-color:#28a745}.shmc-review.bad{border-color:#d33}.shmc-review b,.shmc-review span{display:block}.shmc-review span{margin-top:3px;font-size:12px}
  #page-run:has(.shmc-run){padding-bottom:40px}.shmc-run{display:grid;gap:12px;max-width:920px;margin:0 auto}.shmc-run-top{align-items:center}.shmc-run-top>div{flex:1}.shmc-run-top span,.shmc-run-top b{display:block}.shmc-run-top span{color:var(--muted);font-size:11px}.shmc-run-top b{font-size:16px;margin-top:2px}.shmc-run-top strong{font-size:18px}.shmc-progress{height:8px;background:var(--panel2);border-radius:999px;overflow:hidden;border:1px solid var(--line)}.shmc-progress i{display:block;height:100%;background:var(--primary)}.shmc-task{padding:18px}.shmc-task-head{display:flex;justify-content:space-between;gap:8px;color:var(--muted);font-size:11px;font-weight:850}.shmc-task h2{margin:9px 0 13px}.shmc-situation,.shmc-question,.shmc-action{border:1px solid var(--line);border-radius:14px;padding:13px;background:var(--panel2);margin:10px 0}.shmc-situation>b,.shmc-question>span,.shmc-action>span{display:block;font-size:10px;letter-spacing:.07em;color:var(--muted);font-weight:900}.shmc-situation p{margin:6px 0 0;line-height:1.5}.shmc-question b,.shmc-action b{display:block;margin-top:5px}.shmc-action small{display:block;color:var(--muted);margin-top:3px}.shmc-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:10px}.shmc-facts>div{border:1px solid var(--line);border-radius:10px;padding:8px;background:var(--panel)}.shmc-facts span,.shmc-facts b{display:block}.shmc-facts span{font-size:10px;color:var(--muted)}.shmc-options{display:grid;gap:8px}.shmc-options label{position:relative;display:grid;grid-template-columns:34px minmax(0,1fr);gap:9px;align-items:center;border:1px solid var(--line);border-radius:13px;padding:10px;cursor:pointer}.shmc-options input{position:absolute;opacity:0}.shmc-options i{width:32px;height:32px;border-radius:9px;background:var(--panel2);display:grid;place-items:center;font-style:normal;font-weight:900}.shmc-options label:has(input:checked){border-color:var(--primary);background:color-mix(in srgb,var(--primary) 7%,var(--panel))}.shmc-options label:has(input:checked) i{background:var(--primary);color:#fff}.shmc-next{margin-top:14px;min-width:220px}.shmc-sort{display:grid;gap:8px;margin-top:12px}.shmc-sort label{display:grid;grid-template-columns:minmax(0,1fr) minmax(210px,.8fr);align-items:center;gap:10px;border:1px solid var(--line);border-radius:12px;padding:10px}.shmc-sort select{width:100%}.shmc-calc{display:grid;grid-template-columns:1fr 1fr;gap:10px}.shmc-calc label{border:1px solid var(--line);border-radius:13px;padding:12px}.shmc-calc label>span,.shmc-calc label>small{display:block}.shmc-calc label>small{color:var(--muted);margin-top:4px}.shmc-calc label>div{display:flex;align-items:center;gap:7px;margin-top:8px}.shmc-calc input{flex:1;min-width:0}.shmc-textarea{display:block;margin-top:12px}.shmc-textarea>span{display:block;margin-bottom:7px;color:var(--muted);font-size:12px}.shmc-textarea textarea{width:100%;min-height:150px;resize:vertical}.shmc-chat{display:grid;gap:8px;max-height:420px;overflow:auto;margin:12px 0}.shmc-chat>div{max-width:82%;border:1px solid var(--line);border-radius:14px;padding:10px 12px}.shmc-chat>div.client{justify-self:start;background:var(--panel2)}.shmc-chat>div.employee{justify-self:end;background:color-mix(in srgb,var(--primary) 8%,var(--panel))}.shmc-chat small{display:block;color:var(--muted);font-size:10px}.shmc-chat p{margin:4px 0 0;white-space:pre-wrap}.shmc-ai-done{border:1px solid var(--line);border-radius:13px;padding:12px;background:var(--panel2)}.shmc-ai-done p{color:var(--muted)}.shmc-finish,.shmc-result{text-align:center;padding:28px}.shmc-finish>span,.shmc-result-mark{width:62px;height:62px;border-radius:20px;margin:0 auto 12px;display:grid;place-items:center;font-size:30px;background:var(--panel2)}.shmc-result-mark.good{background:color-mix(in srgb,#28a745 14%,var(--panel2))}.shmc-result-mark.bad{background:color-mix(in srgb,#d33 14%,var(--panel2))}.shmc-result>strong{display:block;font-size:54px;margin:8px 0}.shmc-result-sections{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:17px 0}.shmc-result-sections>div{border:1px solid var(--line);border-radius:13px;padding:11px}.shmc-result-sections span,.shmc-result-sections b{display:block}.shmc-result-sections span{font-size:11px;color:var(--muted)}.shmc-result-sections b{font-size:21px;margin-top:3px}
  @media(max-width:720px){#modalCard:has(.shmc-modal),#modalCard:has(.shmc-results){width:100vw;max-width:100vw;margin:0;border-radius:20px 20px 0 0;padding:14px}.shmc-format,.shmc-grid,.shmc-scope,.shmc-deadline,.shmc-facts,.shmc-calc,.shmc-result-sections{grid-template-columns:1fr}.shmc-manager-head,.shmc-manager-row,.shmc-employee-top,.shmc-modal header,.shmc-results header{display:grid}.shmc-manager-head .btn,.shmc-row-actions .btn,.shmc-employee-actions .btn,.shmc-modal footer .btn{width:100%}.shmc-row-actions,.shmc-employee-actions,.shmc-modal footer{display:grid}.shmc-sort label{grid-template-columns:1fr}.shmc-task{padding:14px}.shmc-run-top{gap:8px}.shmc-run-top .btn{padding-left:10px;padding-right:10px}.shmc-chat>div{max-width:94%}}
  `;document.head.appendChild(s)}

  function enhance(){installStyles();clearTimeout(observerTimer);observerTimer=setTimeout(()=>{enhanceManager();enhanceEmployee()},80)}
  const mo=new MutationObserver(enhance);mo.observe(document.body,{childList:true,subtree:true});
  installStyles();enhance();setTimeout(enhance,600);setTimeout(enhance,1800);
  console.info('SkillHub: clean monthly knowledge assessment v1 enabled');
})();
