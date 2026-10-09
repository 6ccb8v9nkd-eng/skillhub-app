/* SkillHub monthly assessment manager UI v11 — 2026-10-09
   New monthly format only: AI Soft dialogue + native Hard tasks + manual answer checked by AI.
   Own assignment/revoke workflow; no full-page reloads after actions.
*/
(function(){
  'use strict';
  if(window.__shMonthlyManagerV11)return;window.__shMonthlyManagerV11=true;

  const manager=()=>['mentor','rs','tech_admin'].includes(window.S?.profile?.role);
  const e=v=>typeof window.esc==='function'?window.esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const j=v=>String(v??'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  const mk=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`};
  const lastDay=k=>{const [y,m]=String(k).split('-').map(Number);return `${y}-${String(m).padStart(2,'0')}-${String(new Date(y,m,0).getDate()).padStart(2,'0')}`};
  const dueIso=(date,time='23:59')=>new Date(`${date}T${time}:00+03:00`).toISOString();
  const defaults={format_version:'ai_v3',ai_dialogues:2,hard:8,manual:2,estimated_minutes:30,due_time_msk:'23:59'};
  let bank={hard:[],manual:[],loaded:false};

  async function visibleEmployees(){
    const p=window.S?.profile;if(!p||!window.S?.sb)return[];
    let rows=(window.S?.allowed||[]).filter(x=>x.active&&x.role==='employee');
    if(!rows.length){
      const q=await window.S.sb.from('allowed_logins').select('login,name,role,active,manager_login,sector_name').eq('active',true).eq('role','employee');
      if(q.error)throw q.error;rows=q.data||[];
    }
    if(p.role==='mentor')rows=rows.filter(x=>x.manager_login===p.login);
    else if(p.role==='rs')rows=rows.filter(x=>x.sector_name===p.sector_name);
    return rows.sort((a,b)=>String(a.name||a.login).localeCompare(String(b.name||b.login),'ru'));
  }

  async function loadBank(force=false){
    if(bank.loaded&&!force)return bank;
    const [hq,mq]=await Promise.all([
      window.S.sb.from('content').select('id,type,section,topic,difficulty,title,payload').eq('status','published').eq('type','hardcase').eq('section','hard'),
      window.S.sb.from('content').select('id,type,section,topic,difficulty,title,payload').eq('status','published').eq('type','manual').eq('section','soft')
    ]);
    if(hq.error)throw hq.error;if(mq.error)throw mq.error;
    bank.hard=(hq.data||[]).sort((a,b)=>String(a.topic||'').localeCompare(String(b.topic||''),'ru')||String(a.title||'').localeCompare(String(b.title||''),'ru'));
    bank.manual=(mq.data||[]).sort((a,b)=>String(a.topic||'').localeCompare(String(b.topic||''),'ru')||String(a.title||'').localeCompare(String(b.title||''),'ru'));
    if(!bank.hard.length)throw new Error('В базе нет опубликованных Hard-заданий');
    if(!bank.manual.length)throw new Error('В базе нет опубликованных ручных тренажёров');
    bank.loaded=true;return bank;
  }

  async function currentActive(){
    const login=window.S?.profile?.login;if(!login)return null;
    const q=await window.S.sb.from('monthly_checks').select('*').eq('created_by_login',login).eq('month_key',mk()).order('created_at',{ascending:false});
    if(q.error)throw q.error;
    return (q.data||[]).find(x=>x.status==='draft'||(x.status==='assigned'&&Array.isArray(x.recipients)&&x.recipients.length>0))||null;
  }
  async function loadCheck(id){
    const [cq,rq,iq]=await Promise.all([
      window.S.sb.from('monthly_checks').select('*').eq('id',id).single(),
      window.S.sb.from('monthly_check_runs').select('*').eq('check_id',id),
      window.S.sb.from('monthly_check_items').select('*').eq('check_id',id).order('position',{ascending:true})
    ]);
    if(cq.error)throw cq.error;if(rq.error)throw rq.error;if(iq.error)throw iq.error;
    return {check:cq.data,runs:rq.data||[],items:iq.data||[]};
  }
  const cfg=c=>Object.assign({},defaults,c?.config||{});
  const recipients=c=>(Array.isArray(c?.recipients)?c.recipients:[]).filter(x=>x&&x!=='ALL');

  function spreadPick(rows,n){
    const groups=new Map();rows.forEach(x=>{const k=x.topic||'Другое';if(!groups.has(k))groups.set(k,[]);groups.get(k).push(x)});
    const out=[];let i=0,all=[...groups.values()];
    while(out.length<n&&all.some(g=>g[i])){for(const g of all){if(g[i]&&out.length<n)out.push(g[i])}i++}
    return out.map(x=>x.id);
  }
  function hardType(x){const m=x?.payload?.mode;return m==='sort_cards'?'Карточки':m==='tariff_calc'?'Расчёт':m==='scenario'?'Ситуационная задача':m==='numeric'?'Расчёт':'Hard-кейс'}

  function taskCards(rows,kind,selected){
    return rows.map(x=>`<label class="sh11-task"><input type="checkbox" data-sh11-${kind} value="${e(x.id)}" ${selected.has(x.id)?'checked':''}><span class="sh11-check">✓</span><span class="sh11-task-copy"><b>${e(x.title||'Без названия')}</b><small>${e(x.topic||'Без темы')} · ${kind==='hard'?e(hardType(x)):'Свободный ответ'}${x.difficulty?` · ${e(x.difficulty)}`:''}</small></span></label>`).join('');
  }
  function peopleCards(rows,disabled=new Set()){
    return rows.map(u=>{const off=disabled.has(u.login);return `<label class="sh11-person${off?' is-assigned':''}"><input type="checkbox" data-sh11-person value="${e(u.login)}" ${off?'checked disabled':''}><span class="sh11-check">✓</span><span><b>${e(u.name||u.login)}</b><small>${e(u.login)}${off?' · уже назначено':''}</small></span></label>`}).join('');
  }

  function partHeader(icon,kicker,title,desc,right=''){
    return `<div class="sh11-part-head"><div class="sh11-part-icon">${icon}</div><div class="sh11-part-copy"><span>${kicker}</span><h3>${title}</h3><p>${desc}</p></div>${right}</div>`;
  }

  function composer(check,emps){
    const c=cfg(check),hs=new Set(spreadPick(bank.hard,Math.min(Number(c.hard||8),bank.hard.length))),ms=new Set(bank.manual.slice(0,Math.min(Number(c.manual||2),bank.manual.length)).map(x=>x.id));
    return `<div class="sh11">
      <div class="sh11-head"><div><span class="sh11-kicker">ИТОГОВАЯ ПРОВЕРКА</span><h2>Собрать и назначить</h2><p>Три привычных формата SkillHub. В аттестации нет Hard-диалогов.</p></div><button class="btn secondary" onclick="closeModal()">✕</button></div>

      <section class="sh11-part sh11-soft">
        ${partHeader('💬','SOFT SKILLS','ИИ-диалог','Живой негативный клиент. Сотрудник отвечает своими словами, диалог и итог оценивает ИИ.',`<div class="sh11-stepper"><button type="button" onclick="sh11AiStep(-1)">−</button><strong id="sh11AiValue">${Number(c.ai_dialogues||2)}</strong><button type="button" onclick="sh11AiStep(1)">+</button><input id="sh11Ai" type="hidden" value="${Number(c.ai_dialogues||2)}"></div>`)}
        <div class="sh11-native-note"><span>Как в Soft Skills</span><b>4–6 реплик сотрудника · без вариантов ответа · разбор ИИ</b></div>
      </section>

      <section class="sh11-part sh11-hard">
        ${partHeader('🧠','HARD SKILLS','Задачи и карточки','Только нативные Hard-форматы: карточки, расчёты, ситуационные задачи и другие задания.',`<div class="sh11-count"><b id="sh11HardN">${hs.size}</b><small>выбрано</small></div>`)}
        <div class="sh11-part-actions"><button class="btn secondary" type="button" onclick="sh11ToggleList('hard')">Выбрать задания</button><button class="sh11-link" type="button" onclick="sh11Recommended('hard')">Рекомендованные 8</button></div>
        <div id="sh11HardList" class="sh11-picker hidden"><div class="sh11-picker-head"><b>Hard Skills</b><span>Выбирайте карточками — как в самом разделе Hard.</span></div><div class="sh11-task-grid">${taskCards(bank.hard,'hard',hs)}</div></div>
      </section>

      <section class="sh11-part sh11-manual">
        ${partHeader('✍️','РУЧНОЙ ТРЕНАЖЁР','Свободный ответ','Сотрудник пишет ответ в привычном ручном тренажёре. Проверку выполняет ИИ, РГ видит результат.',`<div class="sh11-count"><b id="sh11ManualN">${ms.size}</b><small>выбрано</small></div>`)}
        <div class="sh11-part-actions"><button class="btn secondary" type="button" onclick="sh11ToggleList('manual')">Выбрать задания</button><button class="sh11-link" type="button" onclick="sh11Recommended('manual')">Рекомендованные 2</button></div>
        <div id="sh11ManualList" class="sh11-picker hidden"><div class="sh11-picker-head"><b>Ручные тренажёры</b><span>Без готовых вариантов — только собственный ответ сотрудника.</span></div><div class="sh11-task-grid">${taskCards(bank.manual,'manual',ms)}</div></div>
      </section>

      <section class="sh11-assign">
        <div class="sh11-section-title"><div><span>👥</span><div><b>Кому назначить</b><small>${emps.length} сотрудников в доступной команде</small></div></div></div>
        <div class="sh11-scope"><label><input type="radio" name="sh11Scope" value="all" checked onchange="sh11TogglePeople()"><span><b>Всей группе</b><small>Назначить всем доступным сотрудникам</small></span></label><label><input type="radio" name="sh11Scope" value="custom" onchange="sh11TogglePeople()"><span><b>Выбрать сотрудников</b><small>Назначить точечно</small></span></label></div>
        <div id="sh11People" class="sh11-people hidden">${peopleCards(emps)||'<div class="muted">Сотрудники не найдены.</div>'}</div>
      </section>

      <section class="sh11-deadline"><label><span>Пройти до</span><input id="sh11Due" type="date" value="${e(check.due_date||lastDay(check.month_key||mk()))}"></label><label><span>Время · МСК</span><input id="sh11Time" type="time" value="${e(c.due_time_msk||'23:59')}"></label></section>
      <div class="sh11-footer"><div><b id="sh11Summary"></b><small>Состав фиксируется после первого назначения</small></div><button class="btn primary" onclick="sh11Assign('${j(check.id)}')">Назначить проверку</button></div>
    </div>`;
  }

  function locked(check,items,emps){
    const have=new Set(recipients(check)),left=emps.filter(x=>!have.has(x.login)),a=items.filter(x=>x.kind==='ai_dialogue').length,h=items.filter(x=>x.kind==='hard').length,m=items.filter(x=>x.kind==='manual').length;
    return `<div class="sh11"><div class="sh11-head"><div><span class="sh11-kicker">ИТОГОВАЯ ПРОВЕРКА</span><h2>Назначить ещё</h2><p>Состав этой проверки уже зафиксирован.</p></div><button class="btn secondary" onclick="closeModal()">✕</button></div>
      <div class="sh11-fixed-grid"><div><span>💬</span><b>${a}</b><small>ИИ-диалога</small></div><div><span>🧠</span><b>${h}</b><small>Hard Skills</small></div><div><span>✍️</span><b>${m}</b><small>свободных ответа</small></div></div>
      <div class="sh11-note">Новые сотрудники получат <b>точно эту же версию</b>. Прогресс уже назначенных не меняется.</div>
      <section class="sh11-assign"><div class="sh11-scope"><label><input type="radio" name="sh11Scope" value="all" checked onchange="sh11TogglePeople()"><span><b>Всем оставшимся</b><small>${left.length} сотрудников</small></span></label><label><input type="radio" name="sh11Scope" value="custom" onchange="sh11TogglePeople()"><span><b>Выбрать сотрудников</b><small>Назначить точечно</small></span></label></div><div id="sh11People" class="sh11-people hidden">${peopleCards(left)||'<div class="muted">Все сотрудники уже назначены.</div>'}</div></section>
      <section class="sh11-deadline"><label><span>Пройти до</span><input id="sh11Due" type="date" value="${e(check.due_date||lastDay(check.month_key||mk()))}"></label><label><span>Время · МСК</span><input id="sh11Time" type="time" value="${e(cfg(check).due_time_msk||'23:59')}"></label></section>
      <div class="sh11-footer"><div></div><button class="btn primary" onclick="sh11Assign('${j(check.id)}')">Добавить сотрудников</button></div></div>`;
  }

  function updateCounts(){
    const h=document.querySelectorAll('#modalCard [data-sh11-hard]:checked').length,m=document.querySelectorAll('#modalCard [data-sh11-manual]:checked').length,a=Number(document.getElementById('sh11Ai')?.value||0);
    const hn=document.getElementById('sh11HardN'),mn=document.getElementById('sh11ManualN'),sum=document.getElementById('sh11Summary');if(hn)hn.textContent=h;if(mn)mn.textContent=m;if(sum)sum.textContent=`${h+a+m} заданий · ${h} Hard · ${a} ИИ · ${m} ручных`;
  }
  window.sh11AiStep=function(delta){const i=document.getElementById('sh11Ai'),v=document.getElementById('sh11AiValue');if(!i)return;const n=Math.max(1,Math.min(5,Number(i.value||2)+Number(delta||0)));i.value=String(n);if(v)v.textContent=String(n);updateCounts()};
  window.sh11ToggleList=function(kind){document.getElementById(kind==='hard'?'sh11HardList':'sh11ManualList')?.classList.toggle('hidden')};
  window.sh11Recommended=function(kind){const all=[...document.querySelectorAll(`#modalCard [data-sh11-${kind}]`)];all.forEach(x=>x.checked=false);const ids=kind==='hard'?spreadPick(bank.hard,Math.min(8,bank.hard.length)):bank.manual.slice(0,Math.min(2,bank.manual.length)).map(x=>x.id);const set=new Set(ids);all.forEach(x=>x.checked=set.has(x.value));updateCounts()};
  window.sh11TogglePeople=function(){document.getElementById('sh11People')?.classList.toggle('hidden',document.querySelector('input[name="sh11Scope"]:checked')?.value!=='custom')};
  document.addEventListener('change',ev=>{if(ev.target?.matches?.('[data-sh11-hard],[data-sh11-manual]'))updateCounts()},true);

  function hardSnap(x){return {title:x.title,topic:x.topic,payload:{...(x.payload||{}),section:'hard',exam_mode:true,source_type:'hardcase',hide_feedback:true}}}
  function manualSnap(x){const p=x.payload||{},answers=Array.isArray(p.answers)?p.answers:[],ci=Number(p.correct),ref=Number.isInteger(ci)&&ci>=0&&ci<answers.length?answers[ci]||'':'';return {title:x.title,topic:x.topic,payload:{question:p.question||x.title,instruction:p.instruction||'Напишите ответ самостоятельно так, как ответили бы клиенту в рабочем чате.',reference_answer:ref,source_explanation:p.explanation||'',section:'soft',exam_mode:true,source_type:'manual',hide_feedback:true,ai_review:true}}}
  function aiSnap(i){return {title:`ИИ-диалог ${i+1}`,topic:'Работа с негативом',payload:{mode:'ai_dialogue',section:'soft',exam_mode:true,source_type:'soft_ai',hide_feedback:true,min_turns:4,max_turns:6,max_chars:600,ai_client:true,ai_review:true}}}

  async function makeItems(checkId){
    const hi=[...document.querySelectorAll('#modalCard [data-sh11-hard]:checked')].map(x=>x.value),mi=[...document.querySelectorAll('#modalCard [data-sh11-manual]:checked')].map(x=>x.value),ai=Math.max(1,Math.min(5,Number(document.getElementById('sh11Ai')?.value||2)));
    if(!hi.length)throw new Error('Выберите хотя бы одно Hard-задание');if(!mi.length)throw new Error('Выберите хотя бы один ручной тренажёр');
    const hr=hi.map(id=>bank.hard.find(x=>x.id===id)).filter(Boolean),mr=mi.map(id=>bank.manual.find(x=>x.id===id)).filter(Boolean),rows=[];let pos=1;
    hr.forEach(x=>rows.push({check_id:checkId,position:pos++,kind:'hard',source_content_id:x.id,snapshot:hardSnap(x),max_score:1}));
    for(let i=0;i<ai;i++)rows.push({check_id:checkId,position:pos++,kind:'ai_dialogue',source_content_id:null,snapshot:aiSnap(i),max_score:1});
    mr.forEach(x=>rows.push({check_id:checkId,position:pos++,kind:'manual',source_content_id:x.id,snapshot:manualSnap(x),max_score:1}));
    const del=await window.S.sb.from('monthly_check_items').delete().eq('check_id',checkId);if(del.error)throw del.error;
    const ins=await window.S.sb.from('monthly_check_items').insert(rows);if(ins.error)throw ins.error;return rows.length;
  }

  function stayMonthly(){
    try{window.go?.('assignments');window.shAssignmentsOpen?.('monthly')}catch(_){ }
    setTimeout(()=>{try{const b=document.querySelector('.nav-btn[data-page="assignments"]');b?.dispatchEvent(new MouseEvent('click',{bubbles:true}));window.shAssignmentsOpen?.('monthly')}catch(_){ }},80);
    setTimeout(()=>{try{window.shAssignmentsOpen?.('monthly')}catch(_){ }},350);
  }

  async function openAssign(id){
    if(!manager()||!window.S?.sb)return;
    try{await loadBank();const [{check,items},emps]=await Promise.all([loadCheck(id),visibleEmployees()]);window.showModal(items.length?locked(check,items,emps):composer(check,emps));setTimeout(updateCounts,0)}catch(err){console.error('monthly v11 open',err);window.toast?.(err?.message||'Не удалось открыть конструктор проверки')}
  }
  async function createAndAssign(){
    if(!manager()||!window.S?.sb)return;
    try{let check=await currentActive();if(!check){const month=mk(),due=lastDay(month),time='23:59';const q=await window.S.sb.from('monthly_checks').insert({month_key:month,title:'Итоговая проверка за месяц',status:'draft',due_date:due,due_at:dueIso(due,time),pass_score:75,attempts_allowed:1,recipients:[],config:{...defaults},created_by:window.S.user?.id||null,created_by_login:window.S.profile?.login}).select('*').single();if(q.error)throw q.error;check=q.data}await openAssign(check.id)}catch(err){window.toast?.(err?.message||'Не удалось подготовить проверку')}
  }

  async function assign(id){
    if(!manager()||!window.S?.sb)return;
    const btn=[...document.querySelectorAll('#modalCard .btn.primary')].find(x=>/Назначить|Добавить/.test(x.textContent||''));if(btn)btn.disabled=true;
    try{
      const state=await loadCheck(id),emps=await visibleEmployees(),have=new Set(recipients(state.check)),custom=document.querySelector('input[name="sh11Scope"]:checked')?.value==='custom';
      let selected=custom?[...document.querySelectorAll('#modalCard [data-sh11-person]:checked:not(:disabled)')].map(x=>x.value):emps.map(x=>x.login);
      selected=[...new Set(selected.map(x=>String(x).trim().toLowerCase()).filter(Boolean))];const toAdd=selected.filter(x=>!have.has(x));if(!toAdd.length){window.toast?.('Выберите сотрудников, которым проверка ещё не назначена');return}
      let itemCount=state.items.length;if(!itemCount)itemCount=await makeItems(id);
      const iq=await window.S.sb.from('monthly_check_items').select('kind').eq('check_id',id);if(iq.error)throw iq.error;const kinds=iq.data||[];
      const merged=[...new Set([...have,...toAdd])],due=document.getElementById('sh11Due')?.value||state.check.due_date||lastDay(state.check.month_key),time=document.getElementById('sh11Time')?.value||cfg(state.check).due_time_msk||'23:59';
      const nc={...cfg(state.check),format_version:'ai_v3',ai_dialogues:kinds.filter(x=>x.kind==='ai_dialogue').length,hard:kinds.filter(x=>x.kind==='hard').length,manual:kinds.filter(x=>x.kind==='manual').length,dialogues:0,practice:0,due_time_msk:time};
      const uq=await window.S.sb.from('monthly_checks').update({status:'assigned',recipients:merged,due_date:due,due_at:dueIso(due,time),config:nc,updated_at:new Date().toISOString()}).eq('id',id);if(uq.error)throw uq.error;
      const by=new Map(state.runs.map(r=>[r.login,r])),newRows=toAdd.filter(x=>!by.has(x)).map(login=>({check_id:id,login,status:'not_started',progress:0,breakdown:{}}));if(newRows.length){const rq=await window.S.sb.from('monthly_check_runs').insert(newRows);if(rq.error)throw rq.error}
      for(const login of toAdd){const r=by.get(login);if(!r?.breakdown?.revoked_at)continue;const clean={...(r.breakdown||{})};delete clean.revoked_at;delete clean.revoked_by;delete clean.revoked_progress;delete clean.revoked_status;const rr=await window.S.sb.from('monthly_check_runs').update({status:'not_started',progress:0,score:null,breakdown:clean,submitted_at:null,completed_at:null,updated_at:new Date().toISOString()}).eq('id',r.id);if(rr.error)throw rr.error}
      const pretty=new Date(`${due}T12:00:00+03:00`).toLocaleDateString('ru-RU',{timeZone:'Europe/Moscow'}),notes=toAdd.map(login=>({login,title:'Итоговая проверка за месяц',body:`Пройти до ${pretty}, ${time} МСК`,kind:'assignment'}));if(notes.length){const nq=await window.S.sb.from('notifications').insert(notes);if(nq.error)console.warn(nq.error)}
      window.closeModal?.();window.toast?.(`Назначено: ${toAdd.length} · заданий: ${itemCount}`);stayMonthly();
    }catch(err){console.error('monthly v11 assign',err);window.toast?.(err?.message||'Не удалось назначить проверку')}finally{if(btn)btn.disabled=false}
  }

  async function revoke(checkId,logins){
    const {check,runs}=await loadCheck(checkId),remove=new Set(logins||[]),cur=recipients(check),next=cur.filter(x=>!remove.has(x));
    for(const r of runs.filter(x=>remove.has(x.login))){const b={...(r.breakdown||{}),revoked_at:new Date().toISOString(),revoked_by:window.S.profile?.login||'',revoked_progress:Number(r.progress||0),revoked_status:r.status||'not_started'};const q=await window.S.sb.from('monthly_check_runs').update({breakdown:b,updated_at:new Date().toISOString()}).eq('id',r.id);if(q.error)throw q.error}
    const q=await window.S.sb.from('monthly_checks').update({recipients:next,status:next.length?'assigned':'closed',updated_at:new Date().toISOString()}).eq('id',checkId);if(q.error)throw q.error;
  }
  async function revokeOne(checkId,login){if(!confirm(`Отозвать итоговую проверку у ${login}? Ответы и прогресс сохранятся.`))return;try{await revoke(checkId,[login]);window.closeModal?.();window.toast?.('Проверка отозвана');stayMonthly()}catch(err){window.toast?.(err?.message||'Не удалось отозвать проверку')}}
  async function revokeAll(checkId){try{const {check}=await loadCheck(checkId),list=recipients(check);if(!list.length){window.toast?.('Активных назначений нет');return}if(!confirm(`Отозвать итоговую проверку у всех (${list.length})? Ответы и прогресс сохранятся.`))return;await revoke(checkId,list);window.closeModal?.();window.toast?.('Проверка отозвана у всех');stayMonthly()}catch(err){window.toast?.(err?.message||'Не удалось отозвать проверку')}}

  window.sh11Assign=assign;
  function enforce(){
    window.shMonthlyOpenAssign=openAssign;
    window.shMonthlyCreateAndAssign=createAndAssign;
    window.shMonthlyCreateDraft=createAndAssign;
    window.shAssessAssign=assign;
    window.shMonthlyAssign=assign;
    window.shMonthlyRevokeOne=revokeOne;
    window.shMonthlyRevokeAll=revokeAll;
  }

  function cleanCards(){
    document.querySelectorAll('[data-sh-monthly-manager],[data-sh-monthly-assignment-clone]').forEach(card=>{
      const txt=(card.textContent||'').toLowerCase();
      if(!card.querySelector('[data-sh-monthly-revoke]')&&/(отозвана|завершена|не создана)/.test(txt)){card.innerHTML='<div class="sh11-empty"><button class="btn primary" onclick="shMonthlyCreateAndAssign()">Назначить новую проверку</button></div>';return}
      const parts=card.querySelector('.sh-month-parts');if(parts)parts.innerHTML='<span>💬 <b>ИИ-диалог</b></span><span>🧠 <b>Hard Skills</b></span><span>✍️ <b>Свободный ответ</b></span>';
    });
  }

  if(!document.getElementById('sh11Style')){const s=document.createElement('style');s.id='sh11Style';s.textContent=`
    #modalCard:has(.sh11){width:min(820px,calc(100vw - 18px))!important;max-width:min(820px,calc(100vw - 18px))!important;overflow-x:hidden!important}
    .sh11,.sh11 *{box-sizing:border-box}.sh11{display:grid;gap:13px;min-width:0}.sh11-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.sh11-head>div{min-width:0}.sh11-head h2{margin:4px 0 5px;font-size:27px}.sh11-head p{margin:0;color:var(--muted);line-height:1.4}.sh11-kicker{font-size:11px;font-weight:950;letter-spacing:.1em;color:var(--primary)}
    .sh11-part,.sh11-assign,.sh11-deadline{border:1px solid var(--line);background:var(--panel);border-radius:18px;padding:15px;min-width:0}.sh11-part{overflow:hidden}.sh11-part-head{display:grid;grid-template-columns:48px minmax(0,1fr) auto;gap:12px;align-items:center}.sh11-part-icon{width:48px;height:48px;border-radius:15px;display:grid;place-items:center;font-size:24px;background:color-mix(in srgb,var(--primary) 13%,transparent);border:1px solid color-mix(in srgb,var(--primary) 28%,var(--line))}.sh11-part-copy{min-width:0}.sh11-part-copy>span{font-size:10px;font-weight:950;letter-spacing:.09em;color:var(--muted)}.sh11-part-copy h3{margin:2px 0 3px;font-size:18px}.sh11-part-copy p{margin:0;color:var(--muted);font-size:13px;line-height:1.38}
    .sh11-stepper{display:grid;grid-template-columns:36px 38px 36px;align-items:center;border:1px solid var(--line);border-radius:13px;overflow:hidden;background:var(--bg)}.sh11-stepper button{height:38px;border:0;background:transparent;color:var(--ink);font-size:21px;font-weight:900}.sh11-stepper button:active{background:var(--panel2)}.sh11-stepper strong{text-align:center;font-size:17px}.sh11-count{min-width:58px;text-align:center;border:1px solid var(--line);border-radius:12px;padding:7px 9px}.sh11-count b{display:block;font-size:18px}.sh11-count small{display:block;color:var(--muted);font-size:10px}.sh11-native-note{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-top:12px;padding:10px 11px;border-radius:12px;background:var(--panel2);font-size:12px}.sh11-native-note span{color:var(--primary);font-weight:900}.sh11-native-note b{font-weight:700;text-align:right}
    .sh11-part-actions{display:flex;gap:8px;align-items:center;margin-top:12px;flex-wrap:wrap}.sh11-link{border:0;background:transparent;color:var(--primary);font-weight:850;padding:8px 4px}.sh11-picker{margin-top:12px;border-top:1px solid var(--line);padding-top:12px}.sh11-picker.hidden{display:none!important}.sh11-picker-head{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:9px}.sh11-picker-head span{color:var(--muted);font-size:12px}.sh11-task-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;max-height:360px;overflow-y:auto;overflow-x:hidden;padding:1px}.sh11-task,.sh11-person{position:relative;display:grid!important;grid-template-columns:24px minmax(0,1fr)!important;align-items:center!important;gap:10px!important;width:100%!important;min-width:0!important;margin:0!important;padding:11px!important;border:1px solid var(--line);border-radius:13px;background:var(--panel2);cursor:pointer;overflow:hidden}.sh11-task input,.sh11-person input{position:absolute!important;opacity:0!important;pointer-events:none!important;width:1px!important;height:1px!important}.sh11-check{position:static!important;width:22px!important;height:22px!important;min-width:22px!important;border-radius:7px!important;border:1px solid var(--line)!important;display:grid!important;place-items:center!important;color:transparent!important;font-size:13px!important;font-weight:950!important}.sh11-task:has(input:checked),.sh11-person:has(input:checked){border-color:color-mix(in srgb,var(--primary) 65%,var(--line));background:color-mix(in srgb,var(--primary) 8%,var(--panel2))}.sh11-task:has(input:checked) .sh11-check,.sh11-person:has(input:checked) .sh11-check{background:var(--primary);border-color:var(--primary)!important;color:white!important}.sh11-task-copy,.sh11-person>span:last-child{min-width:0!important;position:static!important;transform:none!important}.sh11-task b,.sh11-task small,.sh11-person b,.sh11-person small{display:block!important;position:static!important;transform:none!important;white-space:normal!important;overflow-wrap:anywhere!important;text-align:left!important}.sh11-task small,.sh11-person small{color:var(--muted);font-size:11px;margin-top:3px}.sh11-person.is-assigned{opacity:.56;cursor:default}
    .sh11-section-title>div{display:flex;align-items:center;gap:9px}.sh11-section-title>div>span{font-size:22px}.sh11-section-title b,.sh11-section-title small{display:block}.sh11-section-title small{color:var(--muted);margin-top:2px}.sh11-scope{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:11px}.sh11-scope label{display:grid!important;grid-template-columns:22px minmax(0,1fr)!important;gap:10px!important;align-items:start!important;width:100%!important;min-width:0!important;padding:12px!important;border:1px solid var(--line);border-radius:13px;cursor:pointer}.sh11-scope input{position:static!important;width:20px!important;height:20px!important;margin:0!important}.sh11-scope span{position:static!important;transform:none!important;min-width:0!important}.sh11-scope b,.sh11-scope small{display:block!important;white-space:normal!important;overflow-wrap:anywhere!important}.sh11-scope small{color:var(--muted);margin-top:2px}.sh11-people{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:10px;max-height:300px;overflow-y:auto;overflow-x:hidden}.sh11-people.hidden{display:none!important}
    .sh11-deadline{display:grid;grid-template-columns:1fr 1fr;gap:10px}.sh11-deadline label{min-width:0}.sh11-deadline label>span{display:block;color:var(--muted);font-size:12px;font-weight:800;margin-bottom:6px}.sh11-deadline input{width:100%!important;max-width:100%!important}.sh11-footer{display:flex;justify-content:space-between;gap:12px;align-items:center;padding-top:2px}.sh11-footer>div b,.sh11-footer>div small{display:block}.sh11-footer>div small{color:var(--muted);margin-top:3px}.sh11-footer .btn{min-width:220px}.sh11-fixed-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.sh11-fixed-grid>div{text-align:center;border:1px solid var(--line);border-radius:14px;background:var(--panel);padding:13px}.sh11-fixed-grid span,.sh11-fixed-grid b,.sh11-fixed-grid small{display:block}.sh11-fixed-grid span{font-size:22px}.sh11-fixed-grid b{font-size:21px;margin:4px 0 1px}.sh11-fixed-grid small{color:var(--muted)}.sh11-note{border:1px solid color-mix(in srgb,var(--primary) 28%,var(--line));background:color-mix(in srgb,var(--primary) 8%,var(--panel));border-radius:13px;padding:12px 14px;line-height:1.45}.sh11-empty{display:flex;justify-content:center;padding:12px}.sh11-empty .btn{min-width:min(340px,100%)}
    @media(max-width:620px){#modalCard:has(.sh11){width:100vw!important;max-width:100vw!important;margin:0!important;padding:14px!important;border-radius:20px 20px 0 0!important;overflow-x:hidden!important}.sh11-head h2{font-size:24px}.sh11-part,.sh11-assign,.sh11-deadline{padding:13px}.sh11-part-head{grid-template-columns:42px minmax(0,1fr) auto;gap:9px}.sh11-part-icon{width:42px;height:42px;border-radius:13px;font-size:21px}.sh11-part-copy h3{font-size:16px}.sh11-part-copy p{font-size:12px}.sh11-stepper{grid-template-columns:31px 31px 31px}.sh11-stepper button{height:34px}.sh11-count{min-width:50px;padding:6px}.sh11-native-note{display:grid}.sh11-native-note b{text-align:left}.sh11-task-grid,.sh11-people{grid-template-columns:1fr}.sh11-scope,.sh11-deadline,.sh11-fixed-grid{grid-template-columns:1fr}.sh11-footer{position:sticky;bottom:0;z-index:3;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:10px;display:grid}.sh11-footer .btn{width:100%;min-width:0}.sh11-picker-head{display:grid}}
  `;document.head.appendChild(s)}

  enforce();setInterval(enforce,250);
  let t=0;const mo=new MutationObserver(()=>{clearTimeout(t);t=setTimeout(cleanCards,70)});mo.observe(document.body,{childList:true,subtree:true});setTimeout(cleanCards,100);setTimeout(cleanCards,900);
  console.info('SkillHub: monthly manager UI v11 enabled');
})();
