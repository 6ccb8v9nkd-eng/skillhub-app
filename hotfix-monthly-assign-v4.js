/* SkillHub monthly assignment UX — 2026-10-09 v4 */
(function(){
  'use strict';
  if(window.__shMonthlyAssignV4)return;window.__shMonthlyAssignV4=true;

  const manager=()=>['mentor','rs','tech_admin'].includes(S?.profile?.role);
  const e=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const j=v=>String(v??'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  const defaults={dialogues:3,hard:8,practice:3,manual:2,estimated_minutes:30,due_time_msk:'23:59'};
  const mk=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`};
  const lastDay=k=>{const [y,m]=String(k).split('-').map(Number);return `${y}-${String(m).padStart(2,'0')}-${String(new Date(y,m,0).getDate()).padStart(2,'0')}`};
  const dueIso=(date,time='23:59')=>new Date(`${date}T${time}:00+03:00`).toISOString();

  function visibleEmployees(){
    const p=S?.profile,all=(S?.allowed||[]).filter(x=>x.active&&x.role==='employee');
    if(!p)return[];
    if(p.role==='mentor')return all.filter(x=>x.manager_login===p.login);
    if(p.role==='rs')return all.filter(x=>x.sector_name===p.sector_name);
    if(p.role==='tech_admin')return all;
    return[];
  }
  const recipients=c=>(Array.isArray(c?.recipients)?c.recipients:[]).filter(x=>x&&x!=='ALL');
  const cfg=c=>Object.assign({},defaults,c?.config||{});
  const dueDate=c=>c?.due_date||lastDay(c?.month_key||mk());
  const dueTime=c=>c?.config?.due_time_msk||'23:59';

  async function loadCheck(id){
    const [cq,rq]=await Promise.all([
      S.sb.from('monthly_checks').select('*').eq('id',id).single(),
      S.sb.from('monthly_check_runs').select('*').eq('check_id',id)
    ]);
    if(cq.error)throw cq.error;if(rq.error)throw rq.error;
    return {check:cq.data,runs:rq.data||[]};
  }

  async function currentActive(){
    const login=S?.profile?.login;if(!login)return null;
    const {data,error}=await S.sb.from('monthly_checks').select('*').eq('created_by_login',login).eq('month_key',mk()).order('created_at',{ascending:false});
    if(error)throw error;
    return (data||[]).find(x=>x.status==='draft'||(x.status==='assigned'&&Array.isArray(x.recipients)&&x.recipients.length>0))||null;
  }

  window.shMonthlyCreateAndAssign=async function(){
    if(!manager()||!S?.sb)return;
    try{
      let check=await currentActive();
      if(!check){
        const month=mk(),due=lastDay(month),time='23:59';
        const payload={month_key:month,title:'Итоговая проверка за месяц',status:'draft',due_date:due,due_at:dueIso(due,time),pass_score:75,attempts_allowed:1,recipients:[],config:{...defaults,due_time_msk:time},created_by:S.user?.id||null,created_by_login:S.profile?.login};
        const q=await S.sb.from('monthly_checks').insert(payload).select('*').single();
        if(q.error)throw q.error;check=q.data;
      }
      await window.shMonthlyOpenAssign(check.id);
    }catch(err){toast(err?.message||'Не удалось подготовить новую проверку')}
  };
  window.shMonthlyCreateDraft=window.shMonthlyCreateAndAssign;

  window.shMonthlyOpenAssign=async function(id){
    if(!manager()||!S?.sb)return;
    try{
      const {check}=await loadCheck(id),emps=visibleEmployees(),assigned=new Set(recipients(check));
      const already=emps.filter(x=>assigned.has(x.login)).length,available=emps.length-already;
      showModal(`<div class="sh-month-assign-v4">
        <div class="modal-head"><div><span class="sh-month-kicker">Итоговая проверка</span><h2>${already?'Добавить сотрудников':'Назначить проверку'}</h2><div class="meta">${emps.length} сотрудников в доступной команде${already?` · уже назначено ${already}`:''}</div></div><button class="btn secondary" onclick="closeModal()">✕</button></div>
        <div class="sh-month-assign-card">
          <label class="sh-month-radio"><input type="radio" name="mcScope" value="all" checked onchange="shMonthlyTogglePeople()"><span><b>Вся доступная команда</b><small>${already?`Добавить оставшихся: ${available}`:`Назначить всем: ${emps.length}`}</small></span></label>
          <label class="sh-month-radio"><input type="radio" name="mcScope" value="custom" onchange="shMonthlyTogglePeople()"><span><b>Выбрать сотрудников</b><small>Назначить точечно</small></span></label>
        </div>
        <div id="mcPeople" class="sh-month-people hidden">${emps.map(u=>{const isAssigned=assigned.has(u.login);return `<label class="${isAssigned?'is-assigned':''}"><input type="checkbox" value="${e(u.login)}" ${isAssigned?'checked disabled':''}><span><b>${e(u.name||u.login)}</b><small>${e(u.login)}${isAssigned?' · уже назначено':''}</small></span></label>`}).join('')||'<div class="muted">Нет доступных сотрудников.</div>'}</div>
        <div class="sh-month-form-row sh-month-deadline"><label>Пройти до<input id="mcDue" type="date" value="${e(dueDate(check))}"></label><label>Время, МСК<input id="mcDueTime" type="time" value="${e(dueTime(check))}"></label></div>
        <div class="sh-month-time-note">Дедлайн единый для всех сотрудников — по московскому времени.</div>
        <div class="actions sh-month-assign-actions"><button class="btn primary" onclick="shMonthlyAssign('${j(check.id)}')">${already?'Добавить назначение':'Назначить проверку'}</button></div>
      </div>`);
    }catch(err){toast(err?.message||'Не удалось открыть назначение')}
  };

  window.shMonthlyTogglePeople=function(){
    const custom=document.querySelector('input[name="mcScope"]:checked')?.value==='custom';
    document.getElementById('mcPeople')?.classList.toggle('hidden',!custom);
  };

  window.shMonthlyAssign=async function(id){
    if(!manager()||!S?.sb)return;
    try{
      const {check,runs}=await loadCheck(id),emps=visibleEmployees(),assigned=new Set(recipients(check));
      const custom=document.querySelector('input[name="mcScope"]:checked')?.value==='custom';
      let selected=custom?[...document.querySelectorAll('#mcPeople input:checked:not(:disabled)')].map(n=>n.value):emps.map(u=>u.login);
      selected=[...new Set(selected.map(v=>String(v).trim().toLowerCase()).filter(Boolean))];
      const toAdd=selected.filter(x=>!assigned.has(x));
      if(!toAdd.length){toast('Все выбранные сотрудники уже назначены');return}
      const merged=[...new Set([...assigned,...toAdd])];
      const due=document.getElementById('mcDue')?.value||dueDate(check),time=document.getElementById('mcDueTime')?.value||dueTime(check);
      const config={...cfg(check),due_time_msk:time};
      const uq=await S.sb.from('monthly_checks').update({status:'assigned',due_date:due,due_at:dueIso(due,time),config,recipients:merged,updated_at:new Date().toISOString()}).eq('id',id);
      if(uq.error)throw uq.error;

      const byLogin=new Map((runs||[]).map(r=>[r.login,r]));
      const newRows=toAdd.filter(login=>!byLogin.has(login)).map(login=>({check_id:id,login,status:'not_started',progress:0,breakdown:{}}));
      if(newRows.length){const iq=await S.sb.from('monthly_check_runs').insert(newRows);if(iq.error)throw iq.error;}
      for(const login of toAdd){
        const old=byLogin.get(login);if(!old?.breakdown?.revoked_at)continue;
        const clean={...(old.breakdown||{})};delete clean.revoked_at;delete clean.revoked_by;delete clean.revoked_progress;delete clean.revoked_status;
        const rq=await S.sb.from('monthly_check_runs').update({status:'not_started',progress:0,breakdown:clean,updated_at:new Date().toISOString()}).eq('id',old.id);if(rq.error)throw rq.error;
      }

      const pretty=new Date(`${due}T12:00:00+03:00`).toLocaleDateString('ru-RU',{timeZone:'Europe/Moscow'});
      const notes=toAdd.map(login=>({login,title:'Итоговая проверка за месяц',body:`Пройти до ${pretty}, ${time} МСК`,kind:'assignment'}));
      if(notes.length){const nq=await S.sb.from('notifications').insert(notes);if(nq.error)console.warn('monthly notifications failed',nq.error);}
      closeModal();toast(`Добавлено: ${toAdd.length} · всего назначено: ${merged.length}`);setTimeout(()=>location.reload(),300);
    }catch(err){toast(err?.message||'Не удалось назначить проверку')}
  };

  function simplifyEmpty(card){
    if(!card||card.querySelector('[data-sh-monthly-revoke]')||card.querySelector('.sh-month-status.assigned'))return;
    const txt=(card.textContent||'').toLowerCase();
    if(!/(отозвана|завершена|не создана)/.test(txt))return;
    card.innerHTML=`<div class="sh-month-empty-v4"><button class="btn primary" onclick="shMonthlyCreateAndAssign()">Назначить новую проверку</button></div>`;
  }

  function addRolloutButton(card){
    if(!card||card.querySelector('[data-sh-monthly-more]'))return;
    const revoke=card.querySelector('[data-sh-monthly-revoke]');if(!revoke)return;
    const id=revoke.getAttribute('data-check-id');if(!id)return;
    const actions=revoke.parentElement;if(!actions)return;
    const b=document.createElement('button');b.className='btn primary';b.setAttribute('data-sh-monthly-more','1');b.textContent='Назначить ещё';b.onclick=()=>window.shMonthlyOpenAssign(id);
    actions.insertBefore(b,revoke);
  }

  function decorate(){
    document.querySelectorAll('[data-sh-monthly-manager],[data-sh-monthly-assignment-clone]').forEach(card=>{simplifyEmpty(card);addRolloutButton(card)});
  }

  if(!document.getElementById('shMonthlyAssignV4Style')){
    const s=document.createElement('style');s.id='shMonthlyAssignV4Style';s.textContent=`
      #modalCard:has(.sh-month-assign-v4){width:min(720px,calc(100vw - 18px))!important;max-width:min(720px,calc(100vw - 18px))!important;overflow-x:hidden!important}
      .sh-month-assign-v4{width:100%;max-width:100%;box-sizing:border-box;overflow:hidden}
      .sh-month-assign-v4 .modal-head{min-width:0}.sh-month-assign-v4 .modal-head>div{min-width:0}
      .sh-month-assign-v4 .sh-month-assign-card{display:grid!important;grid-template-columns:1fr!important;gap:10px!important;width:100%!important;max-width:100%!important;box-sizing:border-box!important}
      .sh-month-assign-v4 .sh-month-radio{display:flex!important;align-items:flex-start!important;gap:12px!important;width:100%!important;max-width:100%!important;box-sizing:border-box!important;min-width:0!important;overflow:hidden!important;padding:14px!important}
      .sh-month-assign-v4 .sh-month-radio input{position:static!important;flex:0 0 auto!important;width:22px!important;height:22px!important;margin:1px 0 0!important}
      .sh-month-assign-v4 .sh-month-radio span{display:block!important;min-width:0!important;max-width:100%!important}
      .sh-month-assign-v4 .sh-month-radio b,.sh-month-assign-v4 .sh-month-radio small{display:block!important;white-space:normal!important;overflow-wrap:anywhere!important}
      .sh-month-assign-v4 #mcPeople{display:grid;gap:8px;width:100%!important;max-width:100%!important;box-sizing:border-box!important;overflow:visible!important;max-height:360px;overflow-y:auto!important;padding-right:2px}
      .sh-month-assign-v4 #mcPeople.hidden{display:none!important}
      .sh-month-assign-v4 #mcPeople label{display:grid!important;grid-template-columns:26px minmax(0,1fr)!important;align-items:center!important;gap:10px!important;width:100%!important;max-width:100%!important;box-sizing:border-box!important;min-width:0!important;padding:11px 12px!important}
      .sh-month-assign-v4 #mcPeople input{position:static!important;width:20px!important;height:20px!important;margin:0!important}
      .sh-month-assign-v4 #mcPeople span{min-width:0!important}.sh-month-assign-v4 #mcPeople b,.sh-month-assign-v4 #mcPeople small{display:block!important;white-space:normal!important;overflow-wrap:anywhere!important}
      .sh-month-assign-v4 #mcPeople .is-assigned{opacity:.58}
      .sh-month-assign-v4 .sh-month-form-row{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important;width:100%!important}
      .sh-month-assign-v4 .sh-month-form-row label{min-width:0!important}.sh-month-assign-v4 .sh-month-form-row input{width:100%!important;max-width:100%!important;box-sizing:border-box!important}
      .sh-month-assign-v4 .sh-month-assign-actions{justify-content:flex-end!important;margin-top:18px!important}
      .sh-month-empty-v4{display:flex;justify-content:center;padding:10px 0}.sh-month-empty-v4 .btn{min-width:min(320px,100%)}
      @media(max-width:620px){
        #modalCard:has(.sh-month-assign-v4){width:calc(100vw - 12px)!important;max-width:calc(100vw - 12px)!important;margin:6px!important;padding:16px!important}
        .sh-month-assign-v4 .modal-head{display:flex!important;align-items:flex-start!important;gap:8px!important}.sh-month-assign-v4 .modal-head h2{font-size:23px!important}
        .sh-month-assign-v4 .sh-month-form-row{grid-template-columns:1fr!important}.sh-month-assign-v4 .sh-month-assign-actions .btn{width:100%!important}
      }
    `;document.head.appendChild(s);
  }

  let timer=0;const obs=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(decorate,60)});obs.observe(document.body,{childList:true,subtree:true});
  setTimeout(decorate,0);setTimeout(decorate,500);setTimeout(decorate,1400);
  console.info('SkillHub: monthly assignment v4 enabled');
})();
