/* SkillHub monthly assessment constructor — 2026-10-09 v5 */
(function(){
  'use strict';
  if(window.__shMonthlyAssessmentV5)return;window.__shMonthlyAssessmentV5=true;

  const manager=()=>['mentor','rs','tech_admin'].includes(S?.profile?.role);
  const e=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const j=v=>String(v??'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  const mk=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`};
  const lastDay=k=>{const [y,m]=String(k).split('-').map(Number);return `${y}-${String(m).padStart(2,'0')}-${String(new Date(y,m,0).getDate()).padStart(2,'0')}`};
  const dueIso=(date,time='23:59')=>new Date(`${date}T${time}:00+03:00`).toISOString();
  const defaults={format_version:'ai_v1',ai_dialogues:2,hard:8,manual:2,estimated_minutes:30,due_time_msk:'23:59'};
  let bank={hard:[],manual:[],loaded:false};

  async function visibleEmployees(){
    const p=S?.profile;if(!p||!S?.sb)return[];
    let rows=(S?.allowed||[]).filter(x=>x.active&&x.role==='employee');
    if(!rows.length){
      const q=await S.sb.from('allowed_logins').select('login,name,role,active,manager_login,sector_name').eq('active',true).eq('role','employee');
      if(!q.error)rows=q.data||[];
    }
    if(p.role==='mentor')return rows.filter(x=>x.manager_login===p.login);
    if(p.role==='rs')return rows.filter(x=>x.sector_name===p.sector_name);
    return rows;
  }

  async function loadBank(){
    if(bank.loaded)return bank;
    const q=await S.sb.from('content').select('id,type,section,topic,difficulty,title,payload').eq('status','published').in('type',['hardcase','manual']).order('topic',{ascending:true}).order('title',{ascending:true});
    if(q.error)throw q.error;
    bank.hard=(q.data||[]).filter(x=>x.type==='hardcase'&&x.section==='hard');
    bank.manual=(q.data||[]).filter(x=>x.type==='manual'&&x.section==='soft');
    bank.loaded=true;return bank;
  }

  async function currentActive(){
    const login=S?.profile?.login;if(!login)return null;
    const q=await S.sb.from('monthly_checks').select('*').eq('created_by_login',login).eq('month_key',mk()).order('created_at',{ascending:false});
    if(q.error)throw q.error;
    return (q.data||[]).find(x=>x.status==='draft'||(x.status==='assigned'&&Array.isArray(x.recipients)&&x.recipients.length>0))||null;
  }
  async function loadCheck(id){
    const [cq,rq,iq]=await Promise.all([
      S.sb.from('monthly_checks').select('*').eq('id',id).single(),
      S.sb.from('monthly_check_runs').select('*').eq('check_id',id),
      S.sb.from('monthly_check_items').select('*').eq('check_id',id).order('position',{ascending:true})
    ]);
    if(cq.error)throw cq.error;if(rq.error)throw rq.error;if(iq.error)throw iq.error;
    return {check:cq.data,runs:rq.data||[],items:iq.data||[]};
  }
  const cfg=c=>Object.assign({},defaults,c?.config||{});
  const recipients=c=>(Array.isArray(c?.recipients)?c.recipients:[]).filter(x=>x&&x!=='ALL');

  function autoPickHard(rows,n=8){
    const by=new Map();rows.forEach(x=>{const k=x.topic||'Другое';if(!by.has(k))by.set(k,[]);by.get(k).push(x)});
    const out=[];let pass=0,groups=[...by.values()];
    while(out.length<n&&groups.some(g=>g[pass])){for(const g of groups){if(g[pass]&&out.length<n)out.push(g[pass])}pass++}
    return out.map(x=>x.id);
  }
  function autoPickManual(rows,n=2){return rows.slice(0,n).map(x=>x.id)}

  function taskRows(rows,kind,selected){
    return rows.map(x=>`<label class="sh-assess-task"><input type="checkbox" data-assess-${kind} value="${e(x.id)}" ${selected.has(x.id)?'checked':''}><span><b>${e(x.title)}</b><small>${e(x.topic||'Без темы')} · ${e(x.difficulty||'')}</small></span></label>`).join('');
  }

  function composerHtml(check,emps){
    const c=cfg(check),hardSel=new Set(autoPickHard(bank.hard,Math.min(c.hard||8,bank.hard.length))),manualSel=new Set(autoPickManual(bank.manual,Math.min(c.manual||2,bank.manual.length)));
    return `<div class="sh-assess-v5">
      <div class="modal-head"><div><span class="sh-month-kicker">Итоговая проверка</span><h2>Собрать и назначить</h2><div class="meta">Три части: ИИ-диалог, Hard Skills и свободный ответ с проверкой ИИ</div></div><button class="btn secondary" onclick="closeModal()">✕</button></div>
      <section class="sh-assess-section"><div class="sh-assess-title"><span>🤖</span><div><b>ИИ-диалог</b><small>Живой клиентский негатив. ИИ ведёт диалог, отдельный ИИ проверяет результат.</small></div><input id="assessAiCount" type="number" min="1" max="5" value="${Number(c.ai_dialogues||2)}"></div></section>
      <section class="sh-assess-section"><div class="sh-assess-head"><div><b>🧠 Hard Skills</b><small>Только задачи, карточки, расчёты, распределения и кейсы — без Hard-диалогов.</small></div><span id="assessHardCount">${hardSel.size}</span></div><details open><summary>Выбрать Hard-задания</summary><div class="sh-assess-list">${taskRows(bank.hard,'hard',hardSel)||'<div class="muted">Нет опубликованных Hard-заданий.</div>'}</div></details></section>
      <section class="sh-assess-section"><div class="sh-assess-head"><div><b>✍️ Свободный ответ</b><small>Сотрудник пишет ответ сам. Проверку и итог выполняет ИИ, РГ видит результат без права менять оценку.</small></div><span id="assessManualCount">${manualSel.size}</span></div><details><summary>Выбрать открытые кейсы</summary><div class="sh-assess-list">${taskRows(bank.manual,'manual',manualSel)||'<div class="muted">Нет опубликованных открытых кейсов.</div>'}</div></details></section>
      <section class="sh-assess-section"><div class="sh-assess-head"><div><b>👥 Кому назначить</b><small>${emps.length} сотрудников в доступной команде</small></div></div>
        <div class="sh-assess-scope"><label><input type="radio" name="assessScope" value="all" checked onchange="shAssessTogglePeople()"><span><b>Всей группе</b><small>Назначить всем доступным сотрудникам</small></span></label><label><input type="radio" name="assessScope" value="custom" onchange="shAssessTogglePeople()"><span><b>Выбрать сотрудников</b><small>Назначить точечно</small></span></label></div>
        <div id="assessPeople" class="sh-assess-list hidden">${emps.map(u=>`<label class="sh-assess-task"><input type="checkbox" data-assess-person value="${e(u.login)}"><span><b>${e(u.name||u.login)}</b><small>${e(u.login)}</small></span></label>`).join('')||'<div class="muted">Сотрудники не найдены.</div>'}</div>
      </section>
      <section class="sh-assess-section"><div class="sh-assess-deadline"><label>Пройти до<input id="assessDue" type="date" value="${e(check.due_date||lastDay(check.month_key||mk()))}"></label><label>Время · МСК<input id="assessTime" type="time" value="${e(c.due_time_msk||'23:59')}"></label></div></section>
      <div class="sh-assess-footer"><div id="assessSummary" class="meta"></div><button class="btn primary" onclick="shAssessAssign('${j(check.id)}')">Назначить проверку</button></div>
    </div>`;
  }

  function lockedHtml(check,items,emps){
    const assigned=new Set(recipients(check)),available=emps.filter(x=>!assigned.has(x.login)),ai=items.filter(x=>x.kind==='ai_dialogue').length,hard=items.filter(x=>x.kind==='hard').length,manual=items.filter(x=>x.kind==='manual').length;
    return `<div class="sh-assess-v5"><div class="modal-head"><div><span class="sh-month-kicker">Итоговая проверка</span><h2>Назначить ещё</h2><div class="meta">Состав уже зафиксирован: ${hard} Hard · ${ai} ИИ-диалога · ${manual} открытых кейса</div></div><button class="btn secondary" onclick="closeModal()">✕</button></div>
      <div class="sh-assess-lock">Оставшимся сотрудникам назначится <b>точно та же версия проверки</b>. Уже проходящим сотрудникам ничего не сбросится.</div>
      <section class="sh-assess-section"><div class="sh-assess-scope"><label><input type="radio" name="assessScope" value="all" checked onchange="shAssessTogglePeople()"><span><b>Всем оставшимся</b><small>${available.length} сотрудников</small></span></label><label><input type="radio" name="assessScope" value="custom" onchange="shAssessTogglePeople()"><span><b>Выбрать сотрудников</b><small>Назначить точечно</small></span></label></div><div id="assessPeople" class="sh-assess-list hidden">${available.map(u=>`<label class="sh-assess-task"><input type="checkbox" data-assess-person value="${e(u.login)}"><span><b>${e(u.name||u.login)}</b><small>${e(u.login)}</small></span></label>`).join('')||'<div class="muted">Все сотрудники уже назначены.</div>'}</div></section>
      <section class="sh-assess-section"><div class="sh-assess-deadline"><label>Пройти до<input id="assessDue" type="date" value="${e(check.due_date||lastDay(check.month_key||mk()))}"></label><label>Время · МСК<input id="assessTime" type="time" value="${e(cfg(check).due_time_msk||'23:59')}"></label></div></section>
      <div class="sh-assess-footer"><button class="btn primary" onclick="shAssessAssign('${j(check.id)}')">Добавить сотрудников</button></div></div>`;
  }

  window.shAssessTogglePeople=function(){const custom=document.querySelector('input[name="assessScope"]:checked')?.value==='custom';document.getElementById('assessPeople')?.classList.toggle('hidden',!custom)};
  function refreshCounts(){
    const h=document.querySelectorAll('[data-assess-hard]:checked').length,m=document.querySelectorAll('[data-assess-manual]:checked').length,a=Number(document.getElementById('assessAiCount')?.value||0);
    const he=document.getElementById('assessHardCount'),me=document.getElementById('assessManualCount'),sum=document.getElementById('assessSummary');if(he)he.textContent=h;if(me)me.textContent=m;if(sum)sum.textContent=`Итого: ${h+a+m} заданий · ${h} Hard · ${a} ИИ · ${m} свободных ответа`;
  }
  document.addEventListener('change',ev=>{if(ev.target?.matches?.('[data-assess-hard],[data-assess-manual],#assessAiCount'))refreshCounts()},true);

  window.shMonthlyCreateAndAssign=async function(){
    if(!manager()||!S?.sb)return;
    try{
      let check=await currentActive();
      if(!check){const month=mk(),due=lastDay(month),time='23:59',payload={month_key:month,title:'Итоговая проверка за месяц',status:'draft',due_date:due,due_at:dueIso(due,time),pass_score:75,attempts_allowed:1,recipients:[],config:{...defaults},created_by:S.user?.id||null,created_by_login:S.profile?.login};const q=await S.sb.from('monthly_checks').insert(payload).select('*').single();if(q.error)throw q.error;check=q.data;}
      await window.shMonthlyOpenAssign(check.id);
    }catch(err){toast(err?.message||'Не удалось подготовить проверку')}
  };
  window.shMonthlyCreateDraft=window.shMonthlyCreateAndAssign;

  window.shMonthlyOpenAssign=async function(id){
    if(!manager()||!S?.sb)return;
    try{await loadBank();const [{check,items},emps]=await Promise.all([loadCheck(id),visibleEmployees()]);showModal(items.length?lockedHtml(check,items,emps):composerHtml(check,emps));setTimeout(refreshCounts,0)}catch(err){toast(err?.message||'Не удалось открыть конструктор проверки')}
  };

  function manualSnapshot(x){
    const p=x.payload||{},ref=Array.isArray(p.answers)&&Number.isInteger(p.correct)?p.answers[p.correct]||'':'';
    return {title:x.title,topic:x.topic,payload:{question:p.question||x.title,instruction:'Напишите ответ самостоятельно так, как ответили бы клиенту в рабочем чате. Вариантов ответа нет.',reference_answer:ref,source_explanation:p.explanation||'',section:'soft',exam_mode:true,source_type:'manual',hide_feedback:true,ai_review:true}};
  }
  function hardSnapshot(x){return {title:x.title,topic:x.topic,payload:{...(x.payload||{}),section:'hard',exam_mode:true,source_type:'hardcase',hide_feedback:true}}}
  function aiSnapshot(i){return {title:`ИИ-диалог ${i+1}`,topic:'Работа с негативом',payload:{mode:'ai_dialogue',section:'soft',exam_mode:true,source_type:'soft_ai',hide_feedback:true,min_turns:4,max_turns:6,ai_client:true,ai_review:true}}}

  async function createItems(checkId){
    const hardIds=[...document.querySelectorAll('[data-assess-hard]:checked')].map(n=>n.value),manualIds=[...document.querySelectorAll('[data-assess-manual]:checked')].map(n=>n.value),ai=Math.max(1,Math.min(5,Number(document.getElementById('assessAiCount')?.value||2)));
    if(!hardIds.length||!manualIds.length){throw new Error('Выберите хотя бы одно Hard-задание и один свободный ответ')}
    const hard=hardIds.map(id=>bank.hard.find(x=>x.id===id)).filter(Boolean),manual=manualIds.map(id=>bank.manual.find(x=>x.id===id)).filter(Boolean),rows=[];let pos=1;
    hard.forEach(x=>rows.push({check_id:checkId,position:pos++,kind:'hard',source_content_id:x.id,snapshot:hardSnapshot(x),max_score:1}));
    for(let i=0;i<ai;i++)rows.push({check_id:checkId,position:pos++,kind:'ai_dialogue',source_content_id:null,snapshot:aiSnapshot(i),max_score:1});
    manual.forEach(x=>rows.push({check_id:checkId,position:pos++,kind:'manual',source_content_id:x.id,snapshot:manualSnapshot(x),max_score:1}));
    const del=await S.sb.from('monthly_check_items').delete().eq('check_id',checkId);if(del.error)throw del.error;
    const ins=await S.sb.from('monthly_check_items').insert(rows);if(ins.error)throw ins.error;
    return {hard:hard.length,ai,manual:manual.length,total:rows.length};
  }

  window.shAssessAssign=async function(id){
    try{
      const state=await loadCheck(id),emps=await visibleEmployees(),assigned=new Set(recipients(state.check)),custom=document.querySelector('input[name="assessScope"]:checked')?.value==='custom';
      let selected=custom?[...document.querySelectorAll('[data-assess-person]:checked')].map(n=>n.value):emps.map(x=>x.login);
      selected=[...new Set(selected.map(x=>String(x).trim().toLowerCase()).filter(Boolean))];const toAdd=selected.filter(x=>!assigned.has(x));if(!toAdd.length){toast('Выберите сотрудников, которым проверка ещё не назначена');return}
      let composition=null;if(!state.items.length)composition=await createItems(id);
      const merged=[...new Set([...assigned,...toAdd])],due=document.getElementById('assessDue')?.value||state.check.due_date||lastDay(state.check.month_key),time=document.getElementById('assessTime')?.value||cfg(state.check).due_time_msk||'23:59';
      const itemQ=await S.sb.from('monthly_check_items').select('kind').eq('check_id',id);if(itemQ.error)throw itemQ.error;const kinds=itemQ.data||[],newCfg={...cfg(state.check),format_version:'ai_v1',ai_dialogues:kinds.filter(x=>x.kind==='ai_dialogue').length,hard:kinds.filter(x=>x.kind==='hard').length,manual:kinds.filter(x=>x.kind==='manual').length,practice:0,dialogues:0,due_time_msk:time};
      const uq=await S.sb.from('monthly_checks').update({status:'assigned',recipients:merged,due_date:due,due_at:dueIso(due,time),config:newCfg,updated_at:new Date().toISOString()}).eq('id',id);if(uq.error)throw uq.error;
      const by=new Map(state.runs.map(r=>[r.login,r])),newRows=toAdd.filter(x=>!by.has(x)).map(login=>({check_id:id,login,status:'not_started',progress:0,breakdown:{}}));if(newRows.length){const iq=await S.sb.from('monthly_check_runs').insert(newRows);if(iq.error)throw iq.error}
      for(const login of toAdd){const r=by.get(login);if(!r?.breakdown?.revoked_at)continue;const clean={...(r.breakdown||{})};delete clean.revoked_at;delete clean.revoked_by;delete clean.revoked_progress;delete clean.revoked_status;const rq=await S.sb.from('monthly_check_runs').update({status:'not_started',progress:0,breakdown:clean,updated_at:new Date().toISOString()}).eq('id',r.id);if(rq.error)throw rq.error}
      const pretty=new Date(`${due}T12:00:00+03:00`).toLocaleDateString('ru-RU',{timeZone:'Europe/Moscow'}),notes=toAdd.map(login=>({login,title:'Итоговая проверка за месяц',body:`Пройти до ${pretty}, ${time} МСК`,kind:'assignment'}));if(notes.length){const nq=await S.sb.from('notifications').insert(notes);if(nq.error)console.warn(nq.error)}
      closeModal();toast(`Назначено: ${toAdd.length}${composition?` · заданий ${composition.total}`:''}`);setTimeout(()=>location.reload(),300);
    }catch(err){toast(err?.message||'Не удалось назначить проверку')}
  };
  window.shMonthlyAssign=window.shAssessAssign;

  function decorateCard(){
    document.querySelectorAll('[data-sh-monthly-manager],[data-sh-monthly-assignment-clone]').forEach(card=>{
      const txt=(card.textContent||'').toLowerCase();
      if(!card.querySelector('[data-sh-monthly-revoke]')&&/(отозвана|завершена|не создана)/.test(txt)){card.innerHTML='<div class="sh-month-empty-v5"><button class="btn primary" onclick="shMonthlyCreateAndAssign()">Назначить новую проверку</button></div>';return}
      const revoke=card.querySelector('[data-sh-monthly-revoke]');if(revoke){const actions=revoke.parentElement;if(actions&&!actions.querySelector('[data-sh-assess-more]')){const b=document.createElement('button');b.className='btn primary';b.dataset.shAssessMore='1';b.textContent='Назначить ещё';b.onclick=async()=>{const c=await currentActive();if(c)shMonthlyOpenAssign(c.id)};actions.insertBefore(b,revoke)}}
      const parts=card.querySelector('.sh-month-parts');if(parts){const c=card.dataset.shAssessCfg;if(!c){parts.innerHTML='<span>🤖 <b>ИИ-диалоги</b></span><span>🧠 <b>Hard Skills</b></span><span>✍️ <b>Свободный ответ</b></span>';card.dataset.shAssessCfg='1'}}
    })
  }

  if(!document.getElementById('shMonthlyAssessmentV5Style')){const s=document.createElement('style');s.id='shMonthlyAssessmentV5Style';s.textContent=`
    #modalCard:has(.sh-assess-v5){width:min(760px,calc(100vw - 16px))!important;max-width:min(760px,calc(100vw - 16px))!important;overflow-x:hidden!important}
    .sh-assess-v5{display:grid;gap:12px;min-width:0}.sh-assess-section{border:1px solid var(--line);border-radius:16px;padding:14px;background:var(--panel);min-width:0}.sh-assess-title,.sh-assess-head{display:flex;align-items:flex-start;gap:10px;justify-content:space-between}.sh-assess-title>span{font-size:24px}.sh-assess-title>div,.sh-assess-head>div{min-width:0;display:grid;gap:4px}.sh-assess-title small,.sh-assess-head small{color:var(--muted);line-height:1.35}.sh-assess-title input{width:70px;flex:0 0 70px}.sh-assess-head>span{font-weight:900;color:var(--primary)}.sh-assess-section details{margin-top:10px}.sh-assess-section summary{cursor:pointer;font-weight:800;color:var(--primary)}.sh-assess-list{display:grid;gap:7px;margin-top:9px;max-height:310px;overflow:auto}.sh-assess-list.hidden{display:none!important}.sh-assess-task{display:grid!important;grid-template-columns:24px minmax(0,1fr)!important;gap:10px!important;align-items:center!important;width:100%!important;max-width:100%!important;box-sizing:border-box!important;padding:10px 11px!important;border:1px solid var(--line);border-radius:12px}.sh-assess-task input{position:static!important;width:19px!important;height:19px!important;margin:0!important}.sh-assess-task span{min-width:0}.sh-assess-task b,.sh-assess-task small{display:block;white-space:normal;overflow-wrap:anywhere}.sh-assess-task small{color:var(--muted);margin-top:2px}.sh-assess-scope{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.sh-assess-scope label{display:flex!important;gap:10px!important;align-items:flex-start!important;padding:12px!important;border:1px solid var(--line);border-radius:12px;min-width:0}.sh-assess-scope input{position:static!important;width:20px!important;height:20px!important;margin:0!important}.sh-assess-scope span{min-width:0}.sh-assess-scope b,.sh-assess-scope small{display:block}.sh-assess-scope small{color:var(--muted);margin-top:2px}.sh-assess-deadline{display:grid;grid-template-columns:1fr 1fr;gap:10px}.sh-assess-deadline label{display:grid;gap:6px;color:var(--muted)}.sh-assess-deadline input{width:100%;box-sizing:border-box}.sh-assess-footer{display:flex;align-items:center;justify-content:space-between;gap:12px}.sh-assess-footer .btn{min-width:210px}.sh-assess-lock{padding:12px 14px;border-radius:12px;background:color-mix(in srgb,var(--primary) 10%,transparent);line-height:1.4}.sh-month-empty-v5{display:flex;justify-content:center;padding:12px}.sh-month-empty-v5 .btn{min-width:min(340px,100%)}
    @media(max-width:620px){#modalCard:has(.sh-assess-v5){width:calc(100vw - 10px)!important;max-width:calc(100vw - 10px)!important;margin:5px!important;padding:14px!important}.sh-assess-scope,.sh-assess-deadline{grid-template-columns:1fr}.sh-assess-footer{display:grid}.sh-assess-footer .btn{width:100%;min-width:0}.sh-assess-list{max-height:260px}}
  `;document.head.appendChild(s)}
  let t=0;const obs=new MutationObserver(()=>{clearTimeout(t);t=setTimeout(decorateCard,80)});obs.observe(document.body,{childList:true,subtree:true});setTimeout(decorateCard,0);setTimeout(decorateCard,700);
  console.info('SkillHub: AI-era monthly assessment constructor v5 enabled');
})();
