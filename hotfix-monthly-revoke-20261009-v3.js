/* SkillHub monthly check revoke/reissue controls — 2026-10-09 v3 */
(function(){
  'use strict';
  if(window.__shMonthlyRevokeV3)return;window.__shMonthlyRevokeV3=true;

  const manager=()=>['mentor','rs','tech_admin'].includes(S?.profile?.role);
  const e=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const j=v=>String(v??'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  const MONTHS=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  const defaults={dialogues:3,hard:8,practice:3,manual:2,estimated_minutes:30,due_time_msk:'23:59'};
  const mk=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`};
  const label=k=>{const [y,m]=String(k||'').split('-').map(Number);return `${MONTHS[m-1]||''} ${y||''}`.trim()};
  const lastDay=k=>{const [y,m]=String(k).split('-').map(Number);return `${y}-${String(m).padStart(2,'0')}-${String(new Date(y,m,0).getDate()).padStart(2,'0')}`};
  const dueIso=(date,time='23:59')=>new Date(`${date}T${time}:00+03:00`).toISOString();
  const name=login=>(S?.allowed||[]).find(x=>x.login===login)?.name||login;
  const activeRecipients=c=>(Array.isArray(c?.recipients)?c.recipients:[]).filter(Boolean).filter(x=>x!=='ALL');
  let busy=false,lastSync=0;

  async function loadCurrent(){
    const login=S?.profile?.login;if(!login||!S?.sb)return null;
    const {data,error}=await S.sb.from('monthly_checks').select('*').eq('created_by_login',login).eq('month_key',mk()).order('created_at',{ascending:false});
    if(error)throw error;
    const checks=data||[];
    const active=checks.find(x=>x.status==='draft'||(x.status==='assigned'&&Array.isArray(x.recipients)&&x.recipients.length>0))||null;
    const ids=checks.map(x=>x.id);
    let runs=[];
    if(ids.length){const rq=await S.sb.from('monthly_check_runs').select('*').in('check_id',ids).order('created_at',{ascending:false});if(!rq.error)runs=rq.data||[];}
    return {checks,active,runs};
  }

  function dueLabel(c){
    const date=c?.due_date||lastDay(c?.month_key||mk()),time=c?.config?.due_time_msk||'23:59';
    const pretty=new Date(`${date}T12:00:00+03:00`).toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Moscow'});
    return `${pretty}, ${time} МСК`;
  }
  function total(c){const x=Object.assign({},defaults,c?.config||{});return Number(x.dialogues||0)+Number(x.hard||0)+Number(x.practice||0)+Number(x.manual||0)}

  function noActiveHtml(state){
    const old=(state?.checks||[]).filter(x=>x.status==='closed').slice(0,3);
    return `<div class="sh-month-head"><div><span class="sh-month-kicker">Итоговая проверка за месяц</span><h2>${e(label(mk()))}</h2><p>${old.length?'Предыдущее назначение отозвано. Можно собрать и назначить новую проверку.':'Единая ежемесячная проверка навыков на реальных клиентских ситуациях.'}</p></div><span class="sh-month-status draft">${old.length?'Отозвана':'Не создана'}</span></div>
      <div class="sh-month-metrics"><span><b>4</b><small>части</small></span><span><b>16</b><small>заданий</small></span><span><b>≈30</b><small>минут</small></span><span><b>75%</b><small>проходной</small></span></div>
      <div class="sh-month-actions"><button class="btn primary" onclick="shMonthlyCreateDraft()">${old.length?'Создать новую проверку':'Создать каркас'}</button></div>
      ${old.length?`<div class="sh-month-history"><span>История</span>${old.map(x=>`<button onclick="shMonthlyOpenManager('${j(x.id)}')">${e(label(x.month_key))}<small>Отозвана</small></button>`).join('')}</div>`:''}`;
  }

  function activeHtml(c,state){
    const cfg=Object.assign({},defaults,c.config||{}),all=(state?.runs||[]).filter(r=>r.check_id===c.id),rr=all.filter(r=>!r?.breakdown?.revoked_at);
    const done=rr.filter(r=>r.status==='completed').length,progress=rr.filter(r=>r.status==='in_progress'||r.status==='review').length,notStarted=rr.filter(r=>r.status==='not_started').length;
    if(c.status==='draft')return `<div class="sh-month-head"><div><span class="sh-month-kicker">Итоговая проверка за месяц</span><h2>${e(label(c.month_key))}</h2><p>Каркас готов. Настройте состав и назначьте сотрудникам.</p></div><span class="sh-month-status draft">Черновик</span></div>
      <div class="sh-month-parts"><span>💬 <b>Диалоги</b><small>${cfg.dialogues}</small></span><span>🧠 <b>Знания</b><small>${cfg.hard}</small></span><span>🧩 <b>Практика</b><small>${cfg.practice}</small></span><span>✍️ <b>Свободный ответ</b><small>${cfg.manual}</small></span></div>
      <div class="sh-month-meta">${total(c)} заданий · ≈ ${cfg.estimated_minutes||30} мин · проходной ${c.pass_score}% · до ${e(dueLabel(c))}</div>
      <div class="sh-month-actions"><button class="btn secondary" onclick="shMonthlyOpenSettings('${j(c.id)}')">Настроить</button><button class="btn primary" onclick="shMonthlyOpenAssign('${j(c.id)}')">Назначить сотрудникам</button></div>`;
    return `<div class="sh-month-head"><div><span class="sh-month-kicker">Итоговая проверка за месяц</span><h2>${e(label(c.month_key))}</h2><p>Проверка назначена сотрудникам. Следите за статусами без лишних таблиц.</p></div><span class="sh-month-status assigned">Назначена</span></div>
      <div class="sh-month-parts"><span>💬 <b>Диалоги</b><small>${cfg.dialogues}</small></span><span>🧠 <b>Знания</b><small>${cfg.hard}</small></span><span>🧩 <b>Практика</b><small>${cfg.practice}</small></span><span>✍️ <b>Свободный ответ</b><small>${cfg.manual}</small></span></div>
      <div class="sh-month-progress"><div><strong>${rr.length}</strong><span>назначено</span></div><div><strong>${done}</strong><span>завершили</span></div><div><strong>${progress}</strong><span>проходят</span></div><div><strong>${notStarted}</strong><span>не начинали</span></div></div>
      <div class="sh-month-meta">Дедлайн: ${e(dueLabel(c))}</div>
      <div class="sh-month-actions"><button class="btn danger" data-sh-monthly-revoke="1" data-check-id="${e(c.id)}">Отозвать</button><button class="btn secondary" onclick="shMonthlyOpenManager('${j(c.id)}')">Открыть</button></div>`;
  }

  async function reconcile(force=false){
    if(!manager()||!S?.sb)return;
    const page=document.getElementById('page-mentor');if(!page||page.classList.contains('hidden'))return;
    if(busy||(!force&&Date.now()-lastSync<1200))return;busy=true;
    try{
      const state=await loadCurrent();lastSync=Date.now();let card=page.querySelector('[data-sh-monthly-manager]');
      if(!card){card=document.createElement('section');card.className='sh-month-card sh-month-manager';card.setAttribute('data-sh-monthly-manager','');page.insertAdjacentElement('afterbegin',card);}
      const wanted=state.active?.id||'none';
      if(card.dataset.shMonthlyV3!==wanted||force){card.dataset.shMonthlyV3=wanted;card.innerHTML=state.active?activeHtml(state.active,state):noActiveHtml(state);}
    }catch(err){console.warn('SkillHub monthly reconcile failed',err)}finally{busy=false}
  }

  window.shMonthlyCreateDraft=async function(){
    if(!manager()||!S?.sb)return;
    try{
      const state=await loadCurrent();if(state?.active){toast('Активная проверка уже создана');return}
      const month=mk(),due=lastDay(month),time='23:59';
      const payload={month_key:month,title:`Итоговая проверка за месяц · ${label(month)}`,status:'draft',due_date:due,due_at:dueIso(due,time),pass_score:75,attempts_allowed:1,recipients:[],config:{...defaults,due_time_msk:time},created_by:S.user?.id||null,created_by_login:S.profile?.login};
      const {error}=await S.sb.from('monthly_checks').insert(payload);if(error)throw error;
      toast('Новая проверка создана');setTimeout(()=>location.reload(),250);
    }catch(err){toast(err?.message||'Не удалось создать новую проверку')}
  };

  async function loadCheck(id){
    const [cq,rq]=await Promise.all([S.sb.from('monthly_checks').select('*').eq('id',id).single(),S.sb.from('monthly_check_runs').select('*').eq('check_id',id).order('created_at',{ascending:true})]);
    if(cq.error)throw cq.error;if(rq.error)throw rq.error;return {check:cq.data,runs:rq.data||[]};
  }
  async function markRevoked(run){
    if(!run?.id)return;const breakdown={...(run.breakdown||{}),revoked_at:new Date().toISOString(),revoked_by:S.profile?.login||'',revoked_progress:Number(run.progress||0),revoked_status:run.status||'not_started'};
    const {error}=await S.sb.from('monthly_check_runs').update({breakdown,updated_at:new Date().toISOString()}).eq('id',run.id);if(error)throw error;
  }
  async function revoke(checkId,logins){
    const {check,runs}=await loadCheck(checkId),remove=new Set((logins||[]).filter(Boolean));
    const current=activeRecipients(check),next=current.filter(x=>!remove.has(x));
    for(const r of runs.filter(x=>remove.has(x.login)))await markRevoked(r);
    const patch={recipients:next,status:next.length?'assigned':'closed',updated_at:new Date().toISOString()};
    const {error}=await S.sb.from('monthly_checks').update(patch).eq('id',checkId);if(error)throw error;
  }

  window.shMonthlyOpenRevoke=async function(checkId){
    if(!manager())return;
    try{
      const {check,runs}=await loadCheck(checkId),recipients=activeRecipients(check),map=new Map(runs.map(r=>[r.login,r]));window.__shRevokeCheckId=checkId;
      showModal(`<div class="modal-head"><div><span class="sh-month-kicker">Итоговая проверка</span><h2>Отозвать назначение</h2><div class="meta">Ответы и прогресс сохранятся в истории.</div></div><button class="btn secondary" onclick="closeModal()">✕</button></div><div class="sh-revoke-list">${recipients.map(login=>{const r=map.get(login);return `<div class="sh-revoke-row"><div><b>${e(name(login))}</b><small>${e(login)}${r?` · прогресс ${Number(r.progress||0)}%`:''}</small></div><button class="btn secondary" onclick="shMonthlyRevokeOne('${j(checkId)}','${j(login)}')">Отозвать</button></div>`}).join('')||'<div class="muted">Активных назначений нет.</div>'}</div>${recipients.length?`<div class="actions" style="justify-content:flex-end;margin-top:16px"><button class="btn danger" onclick="shMonthlyRevokeAll('${j(checkId)}')">Отозвать у всех (${recipients.length})</button></div>`:''}`);
    }catch(err){toast(err?.message||'Не удалось открыть отзыв назначения')}
  };
  window.shMonthlyRevokeOne=async function(checkId,login){if(!confirm(`Отозвать итоговую проверку у ${name(login)}? Ответы и прогресс сохранятся.`))return;try{await revoke(checkId,[login]);closeModal();toast('Проверка отозвана');setTimeout(()=>location.reload(),250)}catch(err){toast(err?.message||'Не удалось отозвать проверку')}};
  window.shMonthlyRevokeAll=async function(checkId){try{const {check}=await loadCheck(checkId),recipients=activeRecipients(check);if(!recipients.length){toast('Активных назначений нет');return}if(!confirm(`Отозвать итоговую проверку у всех (${recipients.length})? Ответы и прогресс сохранятся.`))return;await revoke(checkId,recipients);closeModal();toast('Проверка отозвана у всех');setTimeout(()=>location.reload(),250)}catch(err){toast(err?.message||'Не удалось отозвать проверку')}};

  document.addEventListener('click',ev=>{const b=ev.target?.closest?.('[data-sh-monthly-revoke]');if(!b)return;ev.preventDefault();ev.stopPropagation();window.shMonthlyOpenRevoke(b.dataset.checkId)},true);
  let t=0;const obs=new MutationObserver(()=>{clearTimeout(t);t=setTimeout(()=>reconcile(false),180)});obs.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>reconcile(true),350);setTimeout(()=>reconcile(true),1200);

  if(!document.getElementById('shMonthlyRevokeStyleV3')){const s=document.createElement('style');s.id='shMonthlyRevokeStyleV3';s.textContent=`.sh-revoke-list{display:grid;gap:10px;margin-top:12px}.sh-revoke-row{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;padding:12px;border:1px solid var(--line);border-radius:14px}.sh-revoke-row>div{display:grid;gap:3px}.sh-revoke-row small{color:var(--muted)}@media(max-width:620px){.sh-revoke-row{grid-template-columns:1fr}.sh-revoke-row .btn{width:100%}}`;document.head.appendChild(s)}
  console.info('SkillHub: monthly revoke/reissue v3 enabled');
})();