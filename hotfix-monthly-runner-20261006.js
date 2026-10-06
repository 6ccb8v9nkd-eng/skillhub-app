/* SkillHub: monthly final check runner + MSK deadline support. */
(function(){
  'use strict';

  const R={check:null,run:null,items:[],index:0,busy:false};
  const DUE_CACHE=new Map();
  const MONTHS=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

  function p(){return typeof S!=='undefined'?S.profile:null}
  function sb(){return typeof S!=='undefined'?S.sb:null}
  function e(v){return typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function js(v){return String(v??'').replace(/\\/g,'\\\\').replace(/'/g,"\\'")}
  function monthLabel(key){const [y,m]=String(key||'').split('-').map(Number);return `${MONTHS[m-1]||''} ${y||''}`.trim()}
  function dateRu(d){if(!d)return'конца месяца';try{return new Date(d+'T12:00:00').toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'})}catch(_){return d}}
  function dueText(c){return `${dateRu(c?.due_date)}, ${c?.due_time_msk||'23:59'} МСК`}
  function kindLabel(k){return k==='dialogue'?'Диалог':k==='manual'?'Ваш ответ':k==='practice'?'Практическая задача':'Знания'}
  function bdown(){const b=R.run?.breakdown&&typeof R.run.breakdown==='object'?R.run.breakdown:{};if(!b.answers)b.answers={};return b}
  function itemAnswer(id){return bdown().answers?.[id]||null}
  function completedCount(){return R.items.filter(x=>itemAnswer(x.id)?.complete).length}
  function progressPct(){return R.items.length?Math.round(completedCount()/R.items.length*100):0}

  function visibleEmployees(){
    const me=p(),all=(S?.allowed||[]).filter(x=>x.active&&x.role==='employee');
    if(!me)return[];
    if(me.role==='tech_admin')return all;
    if(me.role==='rs')return all.filter(x=>x.sector_name===me.sector_name);
    if(me.role==='mentor')return all.filter(x=>x.manager_login===me.login);
    return[];
  }

  async function loadCheck(id){
    const client=sb();if(!client)throw new Error('Нет соединения');
    const [cq,iq,rq]=await Promise.all([
      client.from('monthly_checks').select('*').eq('id',id).single(),
      client.from('monthly_check_items').select('id,check_id,position,kind,snapshot,max_score').eq('check_id',id).order('position',{ascending:true}),
      client.from('monthly_check_runs').select('*').eq('check_id',id).eq('login',p()?.login||'').maybeSingle()
    ]);
    if(cq.error)throw cq.error;if(iq.error)throw iq.error;if(rq.error)throw rq.error;
    R.check=cq.data;R.items=iq.data||[];R.run=rq.data||null;
    if(!R.run){
      const ins=await client.from('monthly_check_runs').insert({check_id:id,login:p()?.login,status:'not_started',progress:0,breakdown:{}}).select('*').single();
      if(ins.error)throw ins.error;R.run=ins.data;
    }
    return R;
  }

  async function persist(extra={}){
    if(!R.run?.id||!sb())return false;
    const patch=Object.assign({breakdown:bdown(),progress:progressPct(),updated_at:new Date().toISOString()},extra);
    const q=await sb().from('monthly_check_runs').update(patch).eq('id',R.run.id).select('*').single();
    if(q.error){console.warn('monthly run save failed',q.error);toast('Не удалось сохранить прогресс');return false}
    R.run=q.data;return true;
  }

  function openRunPage(){
    if(typeof closeModal==='function')closeModal();
    if(typeof go==='function')go('run');
    const page=document.getElementById('page-run');
    if(!page)return;
    page.classList.remove('hidden');
    document.getElementById('pageTitle')&&(document.getElementById('pageTitle').textContent='Итоговая проверка');
    document.getElementById('pageSub')&&(document.getElementById('pageSub').textContent=monthLabel(R.check?.month_key));
  }

  function shell(body){
    const pct=R.items.length?Math.round((R.index)/R.items.length*100):0;
    return `<div class="sh-mr-wrap">
      <div class="sh-mr-top">
        <button class="sh-mr-exit" onclick="shMonthlyExit()">← Выйти</button>
        <div class="sh-mr-top-main"><span>Итоговая проверка · ${e(monthLabel(R.check?.month_key))}</span><b>${Math.min(R.index+1,R.items.length)} / ${R.items.length}</b></div>
      </div>
      <div class="sh-mr-progress"><i style="width:${pct}%"></i></div>
      ${body}
    </div>`;
  }

  function transitionHtml(title='Ответ принят'){
    return shell(`<section class="sh-mr-transition"><div class="sh-mr-check">✓</div><h2>${e(title)}</h2><p>Продолжаем без подсказок и разбора — результат увидите после завершения проверки.</p><button class="btn primary" onclick="shMonthlyNextItem()">Продолжить →</button></section>`);
  }

  function factsHtml(payload){
    const facts=Array.isArray(payload?.facts)?payload.facts:[];
    if(!facts.length)return'';
    return `<div class="sh-mr-facts">${facts.map(f=>`<div class="${e(f.tone||'')}"><small>${e(f.label||'')}</small><b>${e(f.value||'')}</b></div>`).join('')}</div>`;
  }

  function actionHtml(a){
    if(!a||typeof a!=='object')return'';
    const rows=[['Действие',a.title],['Сумма',a.amount],['Назначение',a.purpose],['Получатель',a.recipient],['Очередь',a.queue],['Способ',a.method]].filter(x=>x[1]);
    if(!rows.length)return'';
    return `<div class="sh-mr-action">${rows.map(([k,v])=>`<div><small>${e(k)}</small><b>${e(v)}</b></div>`).join('')}</div>`;
  }

  function renderDialogue(item){
    const snap=item.snapshot||{},payload=snap.payload||{},steps=Array.isArray(payload.steps)?payload.steps:[];
    if(!steps.length)return renderGeneric(item);
    const a=itemAnswer(item.id)||{selections:[]};
    const sels=Array.isArray(a.selections)?a.selections:[];
    if(a.complete)return transitionHtml('Ситуация завершена');
    const stepIndex=Math.min(sels.length,steps.length-1);
    const current=steps[stepIndex]||{};
    const history=steps.slice(0,stepIndex).map((s,i)=>`<div class="sh-mr-chat-client">${e(s.client||'')}</div><div class="sh-mr-chat-me">${e((s.options||[])[sels[i]?.selected]||'')}</div>`).join('');
    const opts=(current.options||[]).map((o,i)=>`<button class="sh-mr-option" onclick="shMonthlyDialogueAnswer('${js(item.id)}',${i})"><span>${String.fromCharCode(1040+i)}</span><b>${e(o)}</b></button>`).join('');
    return shell(`<section class="sh-mr-case">
      <div class="sh-mr-case-head"><span>${e(kindLabel(item.kind))}</span><small>${e(snap.topic||'')}</small></div>
      <h2>${e(snap.title||'Рабочая ситуация')}</h2>
      <div class="sh-mr-chat">${history}<div class="sh-mr-chat-client">${e(current.client||current.question||'')}</div></div>
      <div class="sh-mr-options">${opts}</div>
    </section>`);
  }

  function renderTariffCalc(item){
    const s=item.snapshot||{},pl=s.payload||{},a=itemAnswer(item.id)||{parts:[]},parts=Array.isArray(a.parts)?a.parts:[];
    if(a.complete)return transitionHtml('Расчёт принят');
    const stage=parts.length;
    if(stage===0){
      const options=pl.answers||pl.options||[];
      return shell(`<section class="sh-mr-case">
        <div class="sh-mr-case-head"><span>Расчёт</span><small>${e(s.topic||'')}</small></div><h2>${e(s.title||'Расчёт')}</h2>
        ${pl.scenario?`<p class="sh-mr-lead">${e(pl.scenario)}</p>`:''}${factsHtml(pl)}${actionHtml(pl.action)}
        <h3 class="sh-mr-question">${e(pl.question||pl.step1?.prompt||'Выберите ответ')}</h3>
        <div class="sh-mr-options">${options.map((o,i)=>`<button class="sh-mr-option" onclick="shMonthlyCalcChoice('${js(item.id)}',${i})"><span>${String.fromCharCode(1040+i)}</span><b>${e(o)}</b></button>`).join('')}</div>
      </section>`);
    }
    const s2=pl.step2;
    if(s2&&stage===1){
      return shell(`<section class="sh-mr-case">
        <div class="sh-mr-case-head"><span>Расчёт</span><small>Часть 2</small></div><h2>${e(s.title||'Расчёт')}</h2>
        ${s2.client?`<p class="sh-mr-lead">${e(s2.client)}</p>`:''}
        ${Array.isArray(s2.condition)?`<div class="sh-mr-facts">${s2.condition.map(f=>`<div><small>${e(f.label||'')}</small><b>${e(f.value||'')}</b></div>`).join('')}</div>`:''}
        <h3 class="sh-mr-question">${e(s2.question||'Введите ответ')}</h3>
        <div class="sh-mr-number"><input id="shMrNumber" type="number" inputmode="decimal" placeholder="Ответ"><span>${e(s2.unit||'')}</span></div>
        <button class="btn primary full" onclick="shMonthlyCalcNumber('${js(item.id)}')">Ответить</button>
      </section>`);
    }
    return transitionHtml('Расчёт завершён');
  }

  function renderScenario(item){
    const s=item.snapshot||{},pl=s.payload||{},a=itemAnswer(item.id);
    if(a?.complete)return transitionHtml('Ответ принят');
    const opts=pl.options||pl.answers||[];
    return shell(`<section class="sh-mr-case">
      <div class="sh-mr-case-head"><span>${e(kindLabel(item.kind))}</span><small>${e(s.topic||'')}</small></div>
      <h2>${e(s.title||'Практическая задача')}</h2>
      ${pl.scenario?`<p class="sh-mr-lead">${e(pl.scenario)}</p>`:''}
      ${factsHtml(pl)}${actionHtml(pl.action)}
      <h3 class="sh-mr-question">${e(pl.question||'Как поступите?')}</h3>
      <div class="sh-mr-options">${opts.map((o,i)=>`<button class="sh-mr-option" onclick="shMonthlyScenarioAnswer('${js(item.id)}',${i})"><span>${String.fromCharCode(1040+i)}</span><b>${e(o)}</b></button>`).join('')}</div>
    </section>`);
  }

  function renderSortCards(item){
    const s=item.snapshot||{},pl=s.payload||{},a=itemAnswer(item.id);
    if(a?.complete)return transitionHtml('Карточки приняты');
    const cards=Array.isArray(pl.cards)?pl.cards:[];
    return shell(`<section class="sh-mr-case">
      <div class="sh-mr-case-head"><span>Карточки</span><small>${e(s.topic||'')}</small></div><h2>${e(s.title||'Распределите карточки')}</h2>
      <p class="sh-mr-lead">Для каждой карточки выберите подходящую категорию. Проверку покажем только после завершения.</p>
      <div class="sh-mr-sort">${cards.map((c,i)=>`<div><b>${e(c.text||'')}</b><select data-sh-sort="${i}"><option value="">Выберите…</option><option value="allowed">Можно</option><option value="blocked">Нельзя</option><option value="yes">Да</option><option value="no">Нет</option><option value="after">После выполнения условия</option><option value="blocks">Блокирует</option><option value="client">Инициировано клиентом</option><option value="bank">Инициировано банком</option><option value="taxable">Учитываем</option><option value="not_taxable">Не учитываем</option><option value="service_auto">Учитывает сервис</option></select></div>`).join('')}</div>
      <button class="btn primary full" onclick="shMonthlySubmitSort('${js(item.id)}')">Ответить</button>
    </section>`);
  }

  function renderManual(item){
    const s=item.snapshot||{},pl=s.payload||{},a=itemAnswer(item.id);
    if(a?.complete)return transitionHtml('Ответ сохранён');
    return shell(`<section class="sh-mr-case">
      <div class="sh-mr-case-head"><span>Свободный ответ</span><small>${e(s.topic||'')}</small></div>
      <h2>${e(s.title||'Ответ клиенту')}</h2>
      <div class="sh-mr-manual-client">${e(pl.question||'')}</div>
      <p class="sh-mr-lead">${e(pl.instruction||'Напишите ответ так, как ответили бы клиенту в рабочем чате.')}</p>
      <textarea id="shMrManual" class="sh-mr-textarea" rows="7" placeholder="Напишите ваш ответ…"></textarea>
      <div class="sh-mr-manual-foot"><small>Ответ можно будет оценить отдельно после завершения проверки.</small><button class="btn primary" onclick="shMonthlySubmitManual('${js(item.id)}')">Сохранить ответ</button></div>
    </section>`);
  }

  function renderGeneric(item){
    const s=item.snapshot||{},pl=s.payload||{};
    if(item.kind==='manual')return renderManual(item);
    if(pl.mode==='tariff_calc')return renderTariffCalc(item);
    if(pl.mode==='sort_cards')return renderSortCards(item);
    if(pl.mode==='scenario'||pl.options||pl.answers)return renderScenario(item);
    return shell(`<section class="sh-mr-case"><div class="sh-mr-case-head"><span>${e(kindLabel(item.kind))}</span></div><h2>${e(s.title||'Задание')}</h2><p class="sh-mr-lead">Это задание пока нельзя отобразить в итоговой проверке.</p><button class="btn secondary" onclick="shMonthlySkipUnsupported('${js(item.id)}')">Пропустить технически</button></section>`);
  }

  function render(){
    const page=document.getElementById('page-run');if(!page)return;
    if(!R.items.length){page.innerHTML=shell('<section class="sh-mr-case"><h2>В проверке пока нет заданий</h2></section>');return}
    if(R.index>=R.items.length){finish();return}
    const item=R.items[R.index],pl=item.snapshot?.payload||{};
    if((item.kind==='dialogue'||item.kind==='hard')&&Array.isArray(pl.steps))page.innerHTML=renderDialogue(item);
    else page.innerHTML=renderGeneric(item);
    window.scrollTo?.({top:0,behavior:'smooth'});
  }

  async function saveItemRecord(itemId,record,complete=false){
    const b=bdown();b.answers[itemId]=Object.assign({},record,{complete:!!complete,updated_at:new Date().toISOString()});
    b.current_position=R.items[R.index]?.position||R.index+1;
    R.run.breakdown=b;
    return persist({status:'in_progress'});
  }

  window.shMonthlyDialogueAnswer=async function(itemId,selected){
    if(R.busy)return;R.busy=true;
    try{
      const item=R.items.find(x=>x.id===itemId),steps=item?.snapshot?.payload?.steps||[];if(!item||!steps.length)return;
      const old=itemAnswer(itemId)||{selections:[]},sels=Array.isArray(old.selections)?old.selections.slice():[];
      const step=steps[sels.length];if(!step)return;
      sels.push({selected:Number(selected),correct:Number(selected)===Number(step.correct)});
      const complete=sels.length>=steps.length;
      await saveItemRecord(itemId,{type:'dialogue',selections:sels},complete);
      render();
    }finally{R.busy=false}
  };

  window.shMonthlyScenarioAnswer=async function(itemId,selected){
    if(R.busy)return;R.busy=true;
    try{
      const item=R.items.find(x=>x.id===itemId),pl=item?.snapshot?.payload||{};
      await saveItemRecord(itemId,{type:'choice',selected:Number(selected),correct:Number(selected)===Number(pl.correct)},true);render();
    }finally{R.busy=false}
  };

  window.shMonthlyCalcChoice=async function(itemId,selected){
    if(R.busy)return;R.busy=true;
    try{
      const item=R.items.find(x=>x.id===itemId),pl=item?.snapshot?.payload||{},old=itemAnswer(itemId)||{parts:[]},parts=Array.isArray(old.parts)?old.parts.slice():[];
      parts.push({part:1,selected:Number(selected),correct:Number(selected)===Number(pl.correct)});
      const complete=!pl.step2;
      await saveItemRecord(itemId,{type:'tariff_calc',parts},complete);render();
    }finally{R.busy=false}
  };

  window.shMonthlyCalcNumber=async function(itemId){
    if(R.busy)return;
    const el=document.getElementById('shMrNumber'),raw=String(el?.value||'').replace(',','.');if(raw===''){toast('Введите ответ');return}
    const value=Number(raw);if(!Number.isFinite(value)){toast('Введите число');return}
    R.busy=true;
    try{
      const item=R.items.find(x=>x.id===itemId),pl=item?.snapshot?.payload||{},old=itemAnswer(itemId)||{parts:[]},parts=Array.isArray(old.parts)?old.parts.slice():[];
      const expected=Number(pl.step2?.answer),tol=Number(pl.step2?.tolerance||0);
      parts.push({part:2,value,correct:Number.isFinite(expected)?Math.abs(value-expected)<=tol:null});
      await saveItemRecord(itemId,{type:'tariff_calc',parts},true);render();
    }finally{R.busy=false}
  };

  window.shMonthlySubmitManual=async function(itemId){
    const txt=String(document.getElementById('shMrManual')?.value||'').trim();if(txt.length<10){toast('Ответ слишком короткий');return}
    if(R.busy)return;R.busy=true;
    try{await saveItemRecord(itemId,{type:'manual',text:txt,needs_review:true},true);render()}finally{R.busy=false}
  };

  window.shMonthlySubmitSort=async function(itemId){
    const item=R.items.find(x=>x.id===itemId),cards=item?.snapshot?.payload?.cards||[];
    const els=[...document.querySelectorAll('[data-sh-sort]')];if(!cards.length||els.some(x=>!x.value)){toast('Выберите категорию для каждой карточки');return}
    const answers=els.map((el,i)=>({id:cards[i]?.id,value:el.value,correct:el.value===cards[i]?.category}));
    await saveItemRecord(itemId,{type:'sort_cards',answers},true);render();
  };

  window.shMonthlySkipUnsupported=async function(itemId){await saveItemRecord(itemId,{type:'unsupported',technical_skip:true},true);render()};

  window.shMonthlyNextItem=function(){
    let next=R.index+1;
    while(next<R.items.length&&itemAnswer(R.items[next].id)?.complete)next++;
    R.index=next;render();
  };

  function scoreAuto(){
    let right=0,total=0;
    Object.values(bdown().answers||{}).forEach(a=>{
      if(a.type==='manual'||a.technical_skip)return;
      if(Array.isArray(a.selections))a.selections.forEach(x=>{if(typeof x.correct==='boolean'){total++;if(x.correct)right++}});
      else if(Array.isArray(a.parts))a.parts.forEach(x=>{if(typeof x.correct==='boolean'){total++;if(x.correct)right++}});
      else if(Array.isArray(a.answers))a.answers.forEach(x=>{if(typeof x.correct==='boolean'){total++;if(x.correct)right++}});
      else if(typeof a.correct==='boolean'){total++;if(a.correct)right++}
    });
    return {right,total,score:total?Math.round(right/total*100):null};
  }

  async function finish(){
    if(R.busy)return;R.busy=true;
    try{
      const b=bdown(),auto=scoreAuto(),hasManual=Object.values(b.answers||{}).some(a=>a.type==='manual');
      b.auto=auto;b.current_position=R.items.length;b.finished_at=new Date().toISOString();R.run.breakdown=b;
      const status=hasManual?'review':'completed';
      await persist({status,progress:100,score:hasManual?null:auto.score,submitted_at:new Date().toISOString(),completed_at:hasManual?null:new Date().toISOString()});
      const page=document.getElementById('page-run');
      page.innerHTML=shell(`<section class="sh-mr-finish"><div class="sh-mr-finish-mark">✓</div><span class="sh-month-kicker">Итоговая проверка завершена</span><h1>${e(monthLabel(R.check?.month_key))}</h1><p>${hasManual?'Автоматическая часть сохранена. Свободные ответы отправлены на проверку — итоговый результат появится после оценки.':'Все ответы сохранены. Итоговый результат сформирован.'}</p><div class="sh-mr-finish-note">${hasManual?'Статус: на проверке':'Статус: завершена'}</div><button class="btn primary" onclick="shMonthlyExit()">На главную</button></section>`);
    }finally{R.busy=false}
  }

  window.shMonthlyExit=function(){if(typeof go==='function')go('home')};

  window.shMonthlyBegin=async function(id){
    if(R.busy)return;R.busy=true;
    try{
      await loadCheck(id);
      if(!R.items.length){toast('В проверке пока нет заданий');return}
      if(R.run.status==='completed'||R.run.status==='review'){
        openRunPage();R.index=R.items.length;await finish();return;
      }
      const b=bdown();
      let idx=R.items.findIndex(x=>!b.answers?.[x.id]?.complete);if(idx<0)idx=R.items.length;
      R.index=idx;
      const patch={status:'in_progress'};if(!R.run.started_at)patch.started_at=new Date().toISOString();
      await persist(patch);
      openRunPage();render();
    }catch(err){console.error(err);toast(err?.message||'Не удалось открыть проверку')}finally{R.busy=false}
  };

  window.shMonthlyEmployeeIntro=async function(id){
    try{
      const q=await sb().from('monthly_checks').select('*').eq('id',id).single();if(q.error)throw q.error;
      const x=q.data,c=Object.assign({dialogues:3,hard:8,practice:3,manual:2,estimated_minutes:30},x.config||{});
      const rq=await sb().from('monthly_check_runs').select('status').eq('check_id',id).eq('login',p()?.login||'').maybeSingle();
      const started=rq.data&&rq.data.status!=='not_started';
      showModal(`<div class="modal-head"><div><span class="sh-month-kicker">Итоговая проверка за месяц</span><h2>${e(monthLabel(x.month_key))}</h2></div><button class="btn secondary" onclick="closeModal()">✕</button></div>
        <div class="sh-month-start-hero"><div class="sh-month-start-mark">✓</div><h3>Проверим навыки на реальных ситуациях</h3><p>Правильность ответов и подсказки во время проверки не показываем. Можно выйти и продолжить позже.</p></div>
        <div class="sh-month-start-grid"><div><span>💬</span><b>Диалоги</b><small>${c.dialogues} ситуации</small></div><div><span>🧠</span><b>Знания</b><small>${c.hard} заданий</small></div><div><span>🧩</span><b>Практика</b><small>${c.practice} задачи</small></div><div><span>✍️</span><b>Свободный ответ</b><small>${c.manual} ситуации</small></div></div>
        <div class="sh-month-meta centered">${c.dialogues+c.hard+c.practice+c.manual} заданий · около ${c.estimated_minutes||30} минут<br><b>Пройти до ${e(dueText(x))}</b></div>
        <button class="btn primary full" onclick="shMonthlyBegin('${js(x.id)}')">${started?'Продолжить итоговую проверку':'Начать итоговую проверку'}</button>`);
    }catch(err){console.error(err);toast('Не удалось открыть проверку')}
  };

  window.shMonthlyOpenAssign=async function(id){
    try{
      const q=await sb().from('monthly_checks').select('*').eq('id',id).single();if(q.error)throw q.error;const x=q.data,emps=visibleEmployees(),due=x.due_date||'';
      showModal(`<div class="modal-head"><div><span class="sh-month-kicker">Назначение</span><h2>${e(monthLabel(x.month_key))}</h2></div><button class="btn secondary" onclick="closeModal()">✕</button></div>
        <div class="sh-month-assign-card"><label class="sh-month-radio"><input type="radio" name="mcScope" value="all" checked onchange="shMonthlyTogglePeople()"><span><b>Вся доступная команда</b><small>${emps.length} сотрудников</small></span></label><label class="sh-month-radio"><input type="radio" name="mcScope" value="custom" onchange="shMonthlyTogglePeople()"><span><b>Выбрать сотрудников</b><small>Назначить точечно</small></span></label></div>
        <div id="mcPeople" class="sh-month-people hidden">${emps.map(u=>`<label><input type="checkbox" value="${e(u.login)}"><span>${e(u.name||u.login)}<small>${e(u.login)}</small></span></label>`).join('')||'<div class="muted">Нет доступных сотрудников.</div>'}</div>
        <div class="sh-mr-deadline"><label>Пройти до<input id="mcDue" type="date" value="${e(due)}"></label><label>Время · МСК<input id="mcDueTime" type="time" value="${e(x.due_time_msk||'23:59')}"></label></div>
        <div class="sh-mr-time-note">Для всех сотрудников дедлайн фиксируется по московскому времени.</div>
        <div class="actions" style="justify-content:flex-end;margin-top:18px"><button class="btn primary" onclick="shMonthlyAssign('${js(x.id)}')">Назначить проверку</button></div>`);
    }catch(err){console.error(err);toast('Не удалось открыть назначение')}
  };

  window.shMonthlyTogglePeople=function(){const custom=document.querySelector('input[name="mcScope"]:checked')?.value==='custom';document.getElementById('mcPeople')?.classList.toggle('hidden',!custom)};

  window.shMonthlyAssign=async function(id){
    const custom=document.querySelector('input[name="mcScope"]:checked')?.value==='custom',emps=visibleEmployees();
    let recipients=custom?[...document.querySelectorAll('#mcPeople input:checked')].map(n=>n.value):emps.map(u=>u.login);
    recipients=[...new Set(recipients.map(v=>String(v).trim().toLowerCase()).filter(Boolean))];if(!recipients.length){toast('Выберите сотрудников');return}
    const due=document.getElementById('mcDue')?.value,time=document.getElementById('mcDueTime')?.value||'23:59';if(!due){toast('Укажите дату');return}
    const iso=new Date(`${due}T${time}:00+03:00`).toISOString();
    const uq=await sb().from('monthly_checks').update({status:'assigned',due_date:due,due_time_msk:time,due_at:iso,recipients,updated_at:new Date().toISOString()}).eq('id',id);
    if(uq.error){toast(uq.error.message||'Не удалось назначить');return}
    const rows=recipients.map(login=>({check_id:id,login,status:'not_started',progress:0,breakdown:{}}));
    const ru=await sb().from('monthly_check_runs').upsert(rows,{onConflict:'check_id,login'});if(ru.error){toast(ru.error.message||'Не удалось создать статусы');return}
    const check=(await sb().from('monthly_checks').select('month_key').eq('id',id).single()).data;
    const notes=recipients.map(login=>({login,title:'Итоговая проверка за месяц',body:`${monthLabel(check?.month_key)} · пройти до ${dateRu(due)}, ${time} МСК`,kind:'assignment'}));
    const nq=await sb().from('notifications').insert(notes);if(nq.error)console.warn('monthly notifications failed',nq.error);
    closeModal();toast(`Назначено: ${recipients.length}`);
    setTimeout(()=>location.reload(),300);
  };

  async function patchEmployeeDeadline(){
    const card=document.querySelector('[data-sh-monthly-employee]');if(!card||p()?.role!=='employee')return;
    const btn=card.querySelector('[onclick*="shMonthlyEmployeeIntro"]');const m=btn?.getAttribute('onclick')?.match(/shMonthlyEmployeeIntro\\('([^']+)'\\)/);const id=m?.[1];if(!id)return;
    let c=DUE_CACHE.get(id);
    if(!c){const q=await sb().from('monthly_checks').select('id,due_date,due_time_msk').eq('id',id).single();if(q.error)return;c=q.data;DUE_CACHE.set(id,c)}
    const small=card.querySelector('.sh-month-employee-row small');if(small)small.textContent=`Пройти до ${dueText(c)}`;
  }

  if(!document.getElementById('shMonthlyRunnerStyle')){
    const st=document.createElement('style');st.id='shMonthlyRunnerStyle';st.textContent=`
      .sh-mr-wrap{max-width:900px;margin:0 auto;padding:0 0 34px}.sh-mr-top{display:flex;align-items:center;gap:14px;margin:4px 0 12px}.sh-mr-exit{border:1px solid var(--line);background:var(--panel);color:var(--ink);border-radius:12px;padding:9px 12px;font-weight:800;cursor:pointer}.sh-mr-top-main{display:flex;justify-content:space-between;align-items:center;gap:12px;flex:1;color:var(--muted);font-size:13px}.sh-mr-top-main b{color:var(--ink)}.sh-mr-progress{height:5px;background:var(--panel2);border-radius:999px;overflow:hidden;margin-bottom:18px}.sh-mr-progress i{display:block;height:100%;background:var(--primary);border-radius:inherit;transition:.2s}
      .sh-mr-case,.sh-mr-transition,.sh-mr-finish{border:1px solid var(--line);background:var(--panel);border-radius:24px;padding:24px;box-shadow:0 14px 38px rgba(0,0,0,.08)}.sh-mr-case-head{display:flex;justify-content:space-between;gap:12px;margin-bottom:8px}.sh-mr-case-head span{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:var(--primary)}.sh-mr-case-head small{color:var(--muted)}.sh-mr-case h2{margin:0 0 16px;font-size:26px}.sh-mr-lead{color:var(--muted);line-height:1.55;margin:0 0 16px}.sh-mr-question{font-size:18px;line-height:1.4;margin:18px 0 12px}
      .sh-mr-chat{display:grid;gap:10px;margin:14px 0 18px}.sh-mr-chat-client,.sh-mr-chat-me{max-width:82%;padding:12px 14px;border-radius:17px;line-height:1.48}.sh-mr-chat-client{justify-self:start;background:var(--panel2);border-bottom-left-radius:5px}.sh-mr-chat-me{justify-self:end;background:color-mix(in srgb,var(--primary) 17%,var(--panel));border:1px solid color-mix(in srgb,var(--primary) 28%,var(--line));border-bottom-right-radius:5px}
      .sh-mr-options{display:grid;gap:9px}.sh-mr-option{display:grid;grid-template-columns:32px 1fr;gap:11px;align-items:flex-start;text-align:left;width:100%;border:1px solid var(--line);background:var(--panel2);color:var(--ink);border-radius:15px;padding:13px;cursor:pointer}.sh-mr-option:hover{border-color:color-mix(in srgb,var(--primary) 55%,var(--line))}.sh-mr-option span{width:28px;height:28px;border-radius:9px;display:grid;place-items:center;background:var(--panel);font-size:12px;font-weight:900}.sh-mr-option b{font-weight:650;line-height:1.42}
      .sh-mr-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:14px 0}.sh-mr-facts>div,.sh-mr-action>div{padding:12px 13px;border:1px solid var(--line);border-radius:14px;background:var(--panel2);display:grid;gap:3px}.sh-mr-facts small,.sh-mr-action small{color:var(--muted);font-size:11px}.sh-mr-facts .danger{border-color:color-mix(in srgb,#ff5d5d 30%,var(--line))}.sh-mr-facts .accent{border-color:color-mix(in srgb,var(--primary) 38%,var(--line))}.sh-mr-action{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:12px 0}
      .sh-mr-number{display:flex;align-items:center;gap:8px;margin:12px 0}.sh-mr-number input{flex:1;border:1px solid var(--line);background:var(--panel2);color:var(--ink);border-radius:14px;padding:14px;font-size:18px}.sh-mr-number span{font-weight:900}.sh-mr-manual-client{padding:15px 16px;border-radius:17px;background:var(--panel2);line-height:1.5;margin-bottom:13px}.sh-mr-textarea{width:100%;box-sizing:border-box;resize:vertical;border:1px solid var(--line);background:var(--panel2);color:var(--ink);border-radius:16px;padding:14px;font:inherit;line-height:1.5}.sh-mr-manual-foot{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:12px}.sh-mr-manual-foot small{color:var(--muted);max-width:520px}
      .sh-mr-transition,.sh-mr-finish{text-align:center;padding:40px 24px}.sh-mr-check,.sh-mr-finish-mark{width:60px;height:60px;margin:0 auto 13px;border-radius:20px;background:color-mix(in srgb,var(--primary) 18%,var(--panel));display:grid;place-items:center;color:var(--primary);font-size:28px;font-weight:900}.sh-mr-transition h2,.sh-mr-finish h1{margin:0 0 8px}.sh-mr-transition p,.sh-mr-finish p{max-width:620px;margin:0 auto 18px;color:var(--muted);line-height:1.55}.sh-mr-finish-note{display:inline-block;padding:8px 11px;border:1px solid var(--line);background:var(--panel2);border-radius:999px;margin-bottom:18px;font-size:12px;font-weight:850}
      .sh-mr-sort{display:grid;gap:9px;margin:14px 0}.sh-mr-sort>div{display:grid;grid-template-columns:1fr minmax(180px,260px);gap:10px;align-items:center;padding:12px;border:1px solid var(--line);border-radius:14px}.sh-mr-sort select{border:1px solid var(--line);background:var(--panel2);color:var(--ink);border-radius:10px;padding:10px}.sh-mr-deadline{display:grid;grid-template-columns:2fr 1fr;gap:10px;margin-top:12px}.sh-mr-deadline label{display:grid;gap:6px;font-size:12px;color:var(--muted)}.sh-mr-deadline input{width:100%;box-sizing:border-box;border:1px solid var(--line);background:var(--panel2);color:var(--ink);border-radius:11px;padding:10px}.sh-mr-time-note{margin-top:7px;color:var(--muted);font-size:12px}
      @media(max-width:720px){.sh-mr-case{padding:17px;border-radius:20px}.sh-mr-case h2{font-size:22px}.sh-mr-chat-client,.sh-mr-chat-me{max-width:92%}.sh-mr-facts,.sh-mr-action,.sh-mr-deadline{grid-template-columns:1fr}.sh-mr-manual-foot{align-items:stretch;flex-direction:column}.sh-mr-manual-foot .btn{width:100%}.sh-mr-sort>div{grid-template-columns:1fr}.sh-mr-top-main span{display:none}}
    `;document.head.appendChild(st);
  }

  const obs=new MutationObserver(()=>{patchEmployeeDeadline()});obs.observe(document.body,{subtree:true,childList:true});
  setTimeout(patchEmployeeDeadline,400);
  console.info('SkillHub: monthly final check runner enabled');
})();