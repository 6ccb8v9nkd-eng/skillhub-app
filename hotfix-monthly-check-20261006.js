/* SkillHub: monthly final check skeleton. Employees see nothing until a check is explicitly assigned. */
(function(){
  'use strict';

  const M={checks:[],runs:[],loadedFor:'',loadedAt:0,loading:false};
  const MONTHS=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  const cfgDefault={dialogues:3,hard:8,practice:3,manual:2,estimated_minutes:30};

  function profile(){return typeof S!=='undefined'?S.profile:null}
  function isManagerRole(){return ['mentor','rs','tech_admin'].includes(profile()?.role)}
  function currentMonthKey(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`}
  function lastDayOfMonth(monthKey){const [y,m]=String(monthKey).split('-').map(Number);return `${y}-${String(m).padStart(2,'0')}-${String(new Date(y,m,0).getDate()).padStart(2,'0')}`}
  function monthLabel(monthKey){const [y,m]=String(monthKey).split('-').map(Number);return `${MONTHS[m-1]||''} ${y}`}
  function e(s){return typeof esc==='function'?esc(s):String(s??'')}
  function j(s){return typeof jsq==='function'?jsq(s):String(s??'').replace(/'/g,"\\'")}
  function statusLabel(s){return s==='assigned'?'Назначена':s==='closed'?'Завершена':'Черновик'}
  function cfg(check){return Object.assign({},cfgDefault,check?.config||{})}
  function totalTasks(check){const c=cfg(check);return Number(c.dialogues||0)+Number(c.hard||0)+Number(c.practice||0)+Number(c.manual||0)}

  async function load(force=false){
    const p=profile();if(!p||!S?.sb)return;
    if(M.loading)return;
    if(!force&&M.loadedFor===p.login&&Date.now()-M.loadedAt<7000)return;
    M.loading=true;
    try{
      const [c,r]=await Promise.all([
        S.sb.from('monthly_checks').select('*').order('month_key',{ascending:false}),
        S.sb.from('monthly_check_runs').select('*').order('created_at',{ascending:false})
      ]);
      if(c.error)throw c.error;if(r.error)throw r.error;
      M.checks=c.data||[];M.runs=r.data||[];M.loadedFor=p.login;M.loadedAt=Date.now();
    }catch(err){console.warn('monthly check load failed',err)}finally{M.loading=false}
  }

  function ownCurrent(){const p=profile(),mk=currentMonthKey();return M.checks.find(x=>x.month_key===mk&&x.created_by_login===p?.login)||null}
  function employeeCurrent(){const p=profile();if(!p||p.role!=='employee')return null;return M.checks.find(x=>['assigned','closed'].includes(x.status)&&(x.recipients||[]).includes(p.login))||null}
  function runsFor(checkId){return M.runs.filter(x=>x.check_id===checkId)}

  function visibleEmployees(){
    const p=profile(),all=(S?.allowed||[]).filter(x=>x.active&&x.role==='employee');
    if(!p)return[];
    if(p.role==='tech_admin')return all;
    if(p.role==='rs')return all.filter(x=>x.sector_name===p.sector_name);
    if(p.role==='mentor')return all.filter(x=>x.manager_login===p.login);
    return[];
  }

  function managerCardHtml(check){
    const mk=currentMonthKey(),label=monthLabel(mk);
    if(!check){
      return `<section class="sh-month-card sh-month-manager" data-sh-monthly-manager>
        <div class="sh-month-head"><div><span class="sh-month-kicker">Итоговая проверка за месяц</span><h2>${e(label)}</h2><p>Единая ежемесячная проверка навыков на реальных клиентских ситуациях.</p></div><span class="sh-month-status draft">Не создана</span></div>
        <div class="sh-month-metrics"><span><b>4</b><small>части</small></span><span><b>16</b><small>заданий</small></span><span><b>≈30</b><small>минут</small></span><span><b>75%</b><small>проходной</small></span></div>
        <div class="sh-month-actions"><button class="btn primary" onclick="shMonthlyCreateDraft()">Создать каркас</button></div>
      </section>`;
    }
    const c=cfg(check),rr=runsFor(check.id),done=rr.filter(x=>x.status==='completed').length,progress=rr.filter(x=>x.status==='in_progress'||x.status==='review').length,notStarted=rr.filter(x=>x.status==='not_started').length;
    const history=M.checks.filter(x=>x.created_by_login===profile()?.login&&x.id!==check.id).slice(0,3);
    return `<section class="sh-month-card sh-month-manager" data-sh-monthly-manager>
      <div class="sh-month-head"><div><span class="sh-month-kicker">Итоговая проверка за месяц</span><h2>${e(monthLabel(check.month_key))}</h2><p>${check.status==='draft'?'Каркас готов. Настройте состав и назначьте сотрудникам.':'Проверка назначена сотрудникам. Следите за статусами без лишних таблиц.'}</p></div><span class="sh-month-status ${e(check.status)}">${e(statusLabel(check.status))}</span></div>
      <div class="sh-month-parts"><span>💬 <b>Диалоги</b><small>${c.dialogues}</small></span><span>🧠 <b>Знания</b><small>${c.hard}</small></span><span>🧩 <b>Практика</b><small>${c.practice}</small></span><span>✍️ <b>Свободный ответ</b><small>${c.manual}</small></span></div>
      ${check.status==='draft'?`<div class="sh-month-meta">${totalTasks(check)} заданий · ≈ ${c.estimated_minutes||30} мин · проходной ${check.pass_score}%</div><div class="sh-month-actions"><button class="btn secondary" onclick="shMonthlyOpenSettings('${j(check.id)}')">Настроить</button><button class="btn primary" onclick="shMonthlyOpenAssign('${j(check.id)}')">Назначить сотрудникам</button></div>`:`<div class="sh-month-progress"><div><strong>${rr.length}</strong><span>назначено</span></div><div><strong>${done}</strong><span>завершили</span></div><div><strong>${progress}</strong><span>проходят</span></div><div><strong>${notStarted}</strong><span>не начинали</span></div></div><div class="sh-month-actions"><button class="btn secondary" onclick="shMonthlyOpenManager('${j(check.id)}')">Открыть</button></div>`}
      ${history.length?`<div class="sh-month-history"><span>История</span>${history.map(x=>`<button onclick="shMonthlyOpenManager('${j(x.id)}')">${e(monthLabel(x.month_key))}<small>${e(statusLabel(x.status))}</small></button>`).join('')}</div>`:''}
    </section>`;
  }

  function employeeCardHtml(check,run){
    const c=cfg(check),progress=Number(run?.progress||0),started=run&&run.status!=='not_started';
    return `<section class="sh-month-card sh-month-employee" data-sh-monthly-employee>
      <div class="sh-month-head"><div><span class="sh-month-kicker">Итоговая проверка за месяц</span><h2>${e(monthLabel(check.month_key))}</h2><p>Рабочие ситуации, решения и свободные ответы — без подсказок во время прохождения.</p></div><span class="sh-month-status assigned">Назначена</span></div>
      <div class="sh-month-employee-row"><div class="sh-month-ring" style="--p:${progress}"><strong>${progress}%</strong></div><div><b>${totalTasks(check)} заданий · ≈ ${c.estimated_minutes||30} мин</b><small>Пройти до ${check.due_date?e(new Date(check.due_date+'T12:00:00').toLocaleDateString('ru-RU',{day:'numeric',month:'long'})):'конца месяца'}</small></div></div>
      <div class="sh-month-mini-parts"><span>💬 Диалоги</span><span>🧠 Знания</span><span>🧩 Практика</span><span>✍️ Ответ</span></div>
      <button class="btn primary full" onclick="shMonthlyEmployeeIntro('${j(check.id)}')">${started?'Продолжить проверку':'Начать проверку'} →</button>
    </section>`;
  }

  async function decorate(){
    const p=profile();if(!p||!S?.sb)return;
    await load(false);
    if(isManagerRole()){
      const page=document.getElementById('page-mentor');
      if(page&&!page.querySelector('[data-sh-monthly-manager]'))page.insertAdjacentHTML('afterbegin',managerCardHtml(ownCurrent()));
    }
    if(p.role==='employee'){
      const page=document.getElementById('page-home');if(!page)return;
      const old=page.querySelector('[data-sh-monthly-employee]');
      const check=employeeCurrent();
      if(!check){if(old)old.remove();return}
      if(!old){const run=M.runs.find(x=>x.check_id===check.id&&x.login===p.login)||null;page.insertAdjacentHTML('afterbegin',employeeCardHtml(check,run));}
    }
  }

  function schedule(){clearTimeout(schedule.t);schedule.t=setTimeout(decorate,80)}

  window.shMonthlyCreateDraft=async function(){
    const p=profile();if(!p||!isManagerRole())return;
    const mk=currentMonthKey(),payload={month_key:mk,title:`Итоговая проверка за месяц · ${monthLabel(mk)}`,status:'draft',due_date:lastDayOfMonth(mk),pass_score:75,attempts_allowed:1,recipients:[],config:cfgDefault,created_by:S.user?.id||null,created_by_login:p.login};
    const {error}=await S.sb.from('monthly_checks').insert(payload);if(error){toast(error.message||'Не удалось создать проверку');return}
    toast('Каркас создан');await load(true);const page=document.getElementById('page-mentor');page?.querySelector('[data-sh-monthly-manager]')?.remove();schedule();
  };

  window.shMonthlyOpenSettings=function(id){
    const x=M.checks.find(v=>v.id===id);if(!x)return;const c=cfg(x);
    showModal(`<div class="modal-head"><div><span class="sh-month-kicker">Итоговая проверка за месяц</span><h2>${e(monthLabel(x.month_key))}</h2></div><button class="btn secondary" onclick="closeModal()">✕</button></div>
      <div class="sh-month-modal-lead">Собираем проверку из уже готовой базы. Сами кейсы зафиксируем отдельными снимками на следующем этапе.</div>
      <div class="sh-month-config-grid">
        <label><span>💬</span><b>Диалоги</b><input id="mcDialogues" type="number" min="0" max="10" value="${c.dialogues}"></label>
        <label><span>🧠</span><b>Знания</b><input id="mcHard" type="number" min="0" max="20" value="${c.hard}"></label>
        <label><span>🧩</span><b>Практика</b><input id="mcPractice" type="number" min="0" max="10" value="${c.practice}"></label>
        <label><span>✍️</span><b>Свободный ответ</b><input id="mcManual" type="number" min="0" max="10" value="${c.manual}"></label>
      </div>
      <div class="sh-month-form-row"><label>Примерное время<input id="mcMinutes" type="number" min="10" max="90" value="${c.estimated_minutes||30}"></label><label>Проходной балл<input id="mcPass" type="number" min="0" max="100" value="${x.pass_score}"></label><label>Попыток<input id="mcAttempts" type="number" min="1" max="10" value="${x.attempts_allowed}"></label></div>
      <div class="actions" style="justify-content:flex-end;margin-top:18px"><button class="btn primary" onclick="shMonthlySaveSettings('${j(x.id)}')">Сохранить</button></div>`);
  };

  window.shMonthlySaveSettings=async function(id){
    const x=M.checks.find(v=>v.id===id);if(!x)return;
    const config={dialogues:Number(document.getElementById('mcDialogues')?.value||0),hard:Number(document.getElementById('mcHard')?.value||0),practice:Number(document.getElementById('mcPractice')?.value||0),manual:Number(document.getElementById('mcManual')?.value||0),estimated_minutes:Number(document.getElementById('mcMinutes')?.value||30)};
    const patch={config,pass_score:Number(document.getElementById('mcPass')?.value||75),attempts_allowed:Number(document.getElementById('mcAttempts')?.value||1),updated_at:new Date().toISOString()};
    const {error}=await S.sb.from('monthly_checks').update(patch).eq('id',id);if(error){toast(error.message||'Не удалось сохранить');return}closeModal();toast('Настройки сохранены');await load(true);document.querySelector('[data-sh-monthly-manager]')?.remove();schedule();
  };

  window.shMonthlyOpenAssign=function(id){
    const x=M.checks.find(v=>v.id===id);if(!x)return;const emps=visibleEmployees(),due=x.due_date||lastDayOfMonth(x.month_key);
    showModal(`<div class="modal-head"><div><span class="sh-month-kicker">Назначение</span><h2>${e(monthLabel(x.month_key))}</h2></div><button class="btn secondary" onclick="closeModal()">✕</button></div>
      <div class="sh-month-assign-card"><label class="sh-month-radio"><input type="radio" name="mcScope" value="all" checked onchange="shMonthlyTogglePeople()"><span><b>Вся доступная команда</b><small>${emps.length} сотрудников</small></span></label><label class="sh-month-radio"><input type="radio" name="mcScope" value="custom" onchange="shMonthlyTogglePeople()"><span><b>Выбрать сотрудников</b><small>Назначить точечно</small></span></label></div>
      <div id="mcPeople" class="sh-month-people hidden">${emps.map(u=>`<label><input type="checkbox" value="${e(u.login)}"><span>${e(u.name||u.login)}<small>${e(u.login)}</small></span></label>`).join('')||'<div class="muted">Нет доступных сотрудников.</div>'}</div>
      <div class="sh-month-form-row"><label>Пройти до<input id="mcDue" type="date" value="${e(due)}"></label></div>
      <div class="actions" style="justify-content:flex-end;margin-top:18px"><button class="btn primary" onclick="shMonthlyAssign('${j(x.id)}')">Назначить проверку</button></div>`);
  };

  window.shMonthlyTogglePeople=function(){const custom=document.querySelector('input[name="mcScope"]:checked')?.value==='custom';document.getElementById('mcPeople')?.classList.toggle('hidden',!custom)};

  window.shMonthlyAssign=async function(id){
    const x=M.checks.find(v=>v.id===id);if(!x)return;const emps=visibleEmployees(),custom=document.querySelector('input[name="mcScope"]:checked')?.value==='custom';
    let recipients=custom?[...document.querySelectorAll('#mcPeople input:checked')].map(n=>n.value):emps.map(u=>u.login);
    recipients=[...new Set(recipients.map(v=>String(v).trim().toLowerCase()).filter(Boolean))];if(!recipients.length){toast('Выберите сотрудников');return}
    const due=document.getElementById('mcDue')?.value||x.due_date||lastDayOfMonth(x.month_key);
    const {error}=await S.sb.from('monthly_checks').update({status:'assigned',due_date:due,recipients,updated_at:new Date().toISOString()}).eq('id',id);if(error){toast(error.message||'Не удалось назначить');return}
    const rows=recipients.map(login=>({check_id:id,login,status:'not_started',progress:0,breakdown:{}}));
    const up=await S.sb.from('monthly_check_runs').upsert(rows,{onConflict:'check_id,login'});if(up.error){toast(up.error.message||'Назначено, но статусы не созданы');return}
    const note=recipients.map(login=>({login,title:'Итоговая проверка за месяц',body:`${monthLabel(x.month_key)} · пройти до ${new Date(due+'T12:00:00').toLocaleDateString('ru-RU')}`,kind:'assignment'}));
    const n=await S.sb.from('notifications').insert(note);if(n.error)console.warn('monthly notifications failed',n.error);
    closeModal();toast(`Назначено: ${recipients.length}`);await load(true);document.querySelector('[data-sh-monthly-manager]')?.remove();schedule();
  };

  window.shMonthlyOpenManager=function(id){
    const x=M.checks.find(v=>v.id===id);if(!x)return;const rr=runsFor(id),c=cfg(x);
    const names=new Map((S?.allowed||[]).map(u=>[u.login,u.name||u.login]));
    showModal(`<div class="modal-head"><div><span class="sh-month-kicker">Итоговая проверка за месяц</span><h2>${e(monthLabel(x.month_key))}</h2><div class="meta">${totalTasks(x)} заданий · ≈ ${c.estimated_minutes||30} мин · проходной ${x.pass_score}%</div></div><button class="btn secondary" onclick="closeModal()">✕</button></div>
      <div class="sh-month-progress"><div><strong>${rr.length}</strong><span>назначено</span></div><div><strong>${rr.filter(r=>r.status==='completed').length}</strong><span>завершили</span></div><div><strong>${rr.filter(r=>r.status==='in_progress'||r.status==='review').length}</strong><span>проходят</span></div><div><strong>${rr.filter(r=>r.status==='not_started').length}</strong><span>не начинали</span></div></div>
      <div class="sh-month-run-list">${rr.map(r=>`<div><span class="sh-month-avatar">${e(String(names.get(r.login)||r.login).slice(0,2).toUpperCase())}</span><span><b>${e(names.get(r.login)||r.login)}</b><small>${e(r.login)}</small></span><span class="sh-month-run-status ${e(r.status)}">${r.status==='completed'?'Завершена':r.status==='review'?'На проверке':r.status==='in_progress'?'В процессе':'Не начата'}</span></div>`).join('')||'<div class="muted">Пока никому не назначено.</div>'}</div>`);
  };

  window.shMonthlyEmployeeIntro=function(id){
    const x=M.checks.find(v=>v.id===id);if(!x)return;const c=cfg(x),run=M.runs.find(r=>r.check_id===id&&r.login===profile()?.login);
    showModal(`<div class="modal-head"><div><span class="sh-month-kicker">Итоговая проверка за месяц</span><h2>${e(monthLabel(x.month_key))}</h2></div><button class="btn secondary" onclick="closeModal()">✕</button></div>
      <div class="sh-month-start-hero"><div class="sh-month-start-mark">✓</div><h3>Проверим навыки на реальных ситуациях</h3><p>Во время проверки не показываем правильность и подсказки. Можно выйти и продолжить позже — прогресс сохранится.</p></div>
      <div class="sh-month-start-grid"><div><span>💬</span><b>Диалоги</b><small>${c.dialogues} ситуации</small></div><div><span>🧠</span><b>Знания</b><small>${c.hard} заданий</small></div><div><span>🧩</span><b>Практика</b><small>${c.practice} задачи</small></div><div><span>✍️</span><b>Свободный ответ</b><small>${c.manual} ситуации</small></div></div>
      <div class="sh-month-meta centered">${totalTasks(x)} заданий · около ${c.estimated_minutes||30} минут</div>
      <button class="btn primary full" onclick="shMonthlyBegin('${j(x.id)}')">${run&&run.status!=='not_started'?'Продолжить итоговую проверку':'Начать итоговую проверку'}</button>`);
  };

  window.shMonthlyBegin=async function(id){
    const {data,error}=await S.sb.from('monthly_check_items').select('id').eq('check_id',id).limit(1);if(error){toast('Не удалось открыть проверку');return}
    if(!data?.length){toast('Каркас готов. Наполнение заданий добавим следующим этапом.');return}
    toast('Механика прохождения подключается следующим этапом');
  };

  if(!document.getElementById('shMonthlyCheckStyle')){
    const s=document.createElement('style');s.id='shMonthlyCheckStyle';s.textContent=`
      .sh-month-card{position:relative;overflow:hidden;border:1px solid color-mix(in srgb,var(--primary) 28%,var(--line));background:linear-gradient(145deg,color-mix(in srgb,var(--panel) 96%,var(--primary) 4%),var(--panel));border-radius:24px;padding:22px;margin:0 0 18px;box-shadow:0 16px 44px rgba(0,0,0,.08)}
      .sh-month-card:before{content:"";position:absolute;right:-80px;top:-95px;width:220px;height:220px;border-radius:50%;background:color-mix(in srgb,var(--primary) 11%,transparent);pointer-events:none}.sh-month-head{position:relative;display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.sh-month-kicker{text-transform:uppercase;letter-spacing:.08em;font-size:11px;font-weight:900;color:var(--primary)}.sh-month-head h2{margin:5px 0 5px;font-size:28px}.sh-month-head p{margin:0;color:var(--muted);max-width:720px;line-height:1.5}.sh-month-status{white-space:nowrap;border-radius:999px;padding:7px 11px;font-size:12px;font-weight:850;background:var(--panel2);border:1px solid var(--line)}.sh-month-status.assigned{background:color-mix(in srgb,var(--primary) 14%,var(--panel));border-color:color-mix(in srgb,var(--primary) 35%,var(--line))}.sh-month-status.closed{opacity:.75}
      .sh-month-metrics,.sh-month-progress{position:relative;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:18px}.sh-month-metrics span,.sh-month-progress>div{padding:12px 14px;background:var(--panel2);border:1px solid var(--line);border-radius:15px;display:flex;flex-direction:column;gap:2px}.sh-month-metrics b,.sh-month-progress strong{font-size:19px}.sh-month-metrics small,.sh-month-progress span{color:var(--muted);font-size:12px}.sh-month-actions{position:relative;display:flex;gap:9px;justify-content:flex-end;margin-top:16px;flex-wrap:wrap}
      .sh-month-parts,.sh-month-mini-parts{position:relative;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:16px}.sh-month-parts span{padding:12px;border:1px solid var(--line);background:var(--panel2);border-radius:14px;display:grid;grid-template-columns:auto 1fr auto;gap:7px;align-items:center}.sh-month-parts small{font-weight:900}.sh-month-meta{position:relative;margin-top:12px;color:var(--muted);font-size:13px}.sh-month-meta.centered{text-align:center;margin:16px 0}.sh-month-history{position:relative;border-top:1px solid var(--line);margin-top:18px;padding-top:12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}.sh-month-history>span{font-size:12px;color:var(--muted);font-weight:800}.sh-month-history button{border:1px solid var(--line);background:var(--panel2);color:var(--ink);border-radius:12px;padding:8px 10px;display:flex;gap:8px;align-items:center;cursor:pointer}.sh-month-history small{color:var(--muted)}
      .sh-month-employee-row{position:relative;display:flex;gap:14px;align-items:center;margin:18px 0 12px}.sh-month-ring{--p:0;width:64px;height:64px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(var(--primary) calc(var(--p)*1%),var(--panel2) 0);position:relative}.sh-month-ring:after{content:"";position:absolute;inset:6px;border-radius:50%;background:var(--panel)}.sh-month-ring strong{z-index:1;font-size:13px}.sh-month-employee-row>div:last-child{display:grid;gap:4px}.sh-month-employee-row small{color:var(--muted)}.sh-month-mini-parts{margin:12px 0 16px}.sh-month-mini-parts span{padding:9px 10px;border-radius:12px;background:var(--panel2);font-size:12px;text-align:center;border:1px solid var(--line)}
      .sh-month-modal-lead{padding:13px 14px;border-radius:14px;background:var(--panel2);color:var(--muted);line-height:1.45;margin:8px 0 14px}.sh-month-config-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.sh-month-config-grid label{display:grid;grid-template-columns:auto 1fr 72px;gap:9px;align-items:center;padding:14px;border:1px solid var(--line);border-radius:15px;background:var(--panel)}.sh-month-config-grid label>span{font-size:22px}.sh-month-config-grid input,.sh-month-form-row input{width:100%;box-sizing:border-box;border:1px solid var(--line);background:var(--panel2);color:var(--ink);border-radius:11px;padding:9px 10px}.sh-month-form-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:12px}.sh-month-form-row label{display:grid;gap:6px;font-size:12px;color:var(--muted)}
      .sh-month-assign-card{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:8px}.sh-month-radio{padding:14px;border:1px solid var(--line);border-radius:15px;background:var(--panel);display:flex;gap:10px;align-items:flex-start}.sh-month-radio span{display:grid;gap:3px}.sh-month-radio small{color:var(--muted)}.sh-month-people{max-height:300px;overflow:auto;display:grid;gap:7px;margin:12px 0}.sh-month-people label{padding:10px 12px;border:1px solid var(--line);border-radius:12px;display:flex;gap:10px;align-items:center}.sh-month-people span{display:grid}.sh-month-people small{color:var(--muted)}
      .sh-month-run-list{display:grid;gap:8px;margin-top:14px}.sh-month-run-list>div{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:11px 12px;border:1px solid var(--line);border-radius:13px;background:var(--panel)}.sh-month-avatar{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:var(--panel2);font-size:11px;font-weight:900}.sh-month-run-list>div>span:nth-child(2){display:grid}.sh-month-run-list small{color:var(--muted)}.sh-month-run-status{font-size:11px;font-weight:850;padding:6px 9px;border-radius:999px;background:var(--panel2)}
      .sh-month-start-hero{text-align:center;padding:10px 0 14px}.sh-month-start-mark{width:54px;height:54px;border-radius:18px;background:color-mix(in srgb,var(--primary) 18%,var(--panel));display:grid;place-items:center;margin:0 auto 10px;font-size:24px;font-weight:900;color:var(--primary)}.sh-month-start-hero h3{margin:0 0 7px}.sh-month-start-hero p{margin:0 auto;color:var(--muted);line-height:1.5;max-width:610px}.sh-month-start-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.sh-month-start-grid>div{padding:14px 10px;text-align:center;border:1px solid var(--line);background:var(--panel);border-radius:15px;display:grid;gap:4px}.sh-month-start-grid span{font-size:24px}.sh-month-start-grid small{color:var(--muted)}
      @media(max-width:720px){.sh-month-head{display:grid}.sh-month-status{justify-self:start}.sh-month-head h2{font-size:24px}.sh-month-metrics,.sh-month-progress,.sh-month-parts,.sh-month-mini-parts,.sh-month-start-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.sh-month-config-grid,.sh-month-assign-card,.sh-month-form-row{grid-template-columns:1fr}.sh-month-actions .btn{flex:1}.sh-month-card{padding:17px;border-radius:20px}}
    `;document.head.appendChild(s);
  }

  const observer=new MutationObserver(schedule);observer.observe(document.body,{subtree:true,childList:true});
  setInterval(schedule,1800);schedule();
  console.info('SkillHub: monthly final check skeleton enabled');
})();