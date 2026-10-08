/* SkillHub pilot — dynamic Soft Skills dialogue with Alice AI, tech admin only. */
(function(){
  'use strict';

  const CASE_CODE='SOFT-040';
  const FALLBACK_MIN_TURNS=4;
  const FALLBACK_MAX_TURNS=6;
  const FALLBACK_MAX_CHARS=600;
  const FALLBACK_SESSION_MINUTES=20;
  let run=null;

  function isTech(){
    try{return typeof isTechAdmin==='function'?isTechAdmin():S?.profile?.role==='tech_admin'}catch(_){return false}
  }
  function sourceCase(){
    return (S.content||[]).find(x=>(x.payload?.case_code||x.case_code)===CASE_CODE)||null;
  }
  function escText(s){return typeof esc==='function'?esc(String(s??'')):String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function aiAttempts(){
    return (S.attempts||[]).filter(a=>a?.type==='soft_ai'||(Array.isArray(a?.details)&&a.details.some(d=>d?.kind==='soft-ai'))).slice().sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  }
  function aiDetail(a){return Array.isArray(a?.details)?a.details.find(d=>d?.kind==='soft-ai')||a.details[0]||{}:{}}
  function isAiAttempt(a){return !!a&&(a.type==='soft_ai'||aiDetail(a)?.kind==='soft-ai')}

  async function invoke(body){
    const {data,error}=await S.sb.functions.invoke('soft-ai',{body});
    if(error){
      let details=null;
      try{if(error.context&&typeof error.context.json==='function')details=await error.context.json()}catch(_){ }
      const e=new Error(details?.error||error.message||'Ошибка ИИ');
      e.code=details?.code||'';
      throw e;
    }
    return data;
  }

  function patchChooser(){
    if(!isTech())return;
    const root=document.getElementById('modalCard');
    const grid=root?.querySelector('.sh-soft-choice-grid');
    if(!grid||grid.querySelector('.sh-soft-ai-card'))return;
    grid.insertAdjacentHTML('beforeend',`
      <button class="sh-soft-choice-card sh-soft-ai-card" onclick="shAiSoftIntro()">
        <span class="sh-soft-choice-icon">✨</span>
        <span class="sh-soft-choice-copy"><b>ИИ-диалог · тест</b><small>Свободный разговор с клиентом: Алиса реагирует на ваши ответы и в конце оценивает диалог</small><em>Пока только для тех. администратора</em></span>
        <span class="sh-soft-choice-arrow">→</span>
      </button>`);
  }

  const baseOpenSoftHub=window.openSoftHub;
  if(typeof baseOpenSoftHub==='function'){
    window.openSoftHub=function(){const r=baseOpenSoftHub.apply(this,arguments);setTimeout(patchChooser,0);return r};
  }
  const baseBack=window.shSoftBackToChooser;
  if(typeof baseBack==='function'){
    window.shSoftBackToChooser=function(){const r=baseBack.apply(this,arguments);setTimeout(patchChooser,0);return r};
  }

  window.shAiSoftIntro=async function(){
    if(!isTech()){toast('ИИ-пилот пока доступен только техническому администратору');return}
    showModal(`<div class="modal-head"><div><button class="sh-soft-back" onclick="shSoftBackToChooser()">← Назад</button><h2>ИИ-диалог · тест</h2><div class="meta">${CASE_CODE} · Разные ответы от сотрудников</div></div><button class="btn secondary" onclick="closeModal()">✕</button></div>
      <div class="sh-ai-intro">
        <div class="sh-ai-badge">ALICE AI · PILOT</div>
        <h3>Отвечайте клиенту своими словами</h3>
        <p>Клиентские реплики не зафиксированы заранее. Диалог занимает от 4 до 6 ваших ответов: если ситуация решена, клиент может завершить разговор раньше; шестой ответ — максимум.</p>
        <div id="shAiStatus" class="sh-ai-status">Проверяю подключение Алисы…</div>
        <button id="shAiStartBtn" class="btn primary full" onclick="shAiSoftStart()" disabled>Начать тест</button>
      </div>`);
    try{
      const st=await invoke({action:'status'});
      const status=document.getElementById('shAiStatus'),btn=document.getElementById('shAiStartBtn');
      if(st?.configured){
        if(status)status.innerHTML='<b>✓ Алиса подключена</b><span>Можно запускать живой диалог.</span>';
        if(btn)btn.disabled=false;
      }else{
        if(status)status.innerHTML='<b>Интерфейс готов, Алиса ещё не подключена</b><span>Для запуска нужны два защищённых секрета Yandex AI Studio: API-ключ и ID каталога.</span>';
      }
    }catch(e){
      const status=document.getElementById('shAiStatus');if(status)status.innerHTML=`<b>Не удалось проверить подключение</b><span>${escText(e.message)}</span>`;
    }
  };

  window.shAiSoftStart=async function(){
    if(!isTech())return;
    const btn=document.getElementById('shAiStartBtn');if(btn)btn.disabled=true;
    try{
      const data=await invoke({action:'start'});
      closeModal();
      run={
        x:sourceCase(),
        scenario:data.scenario,
        minTurns:Number(data.minTurns||FALLBACK_MIN_TURNS),
        maxTurns:Number(data.maxTurns||FALLBACK_MAX_TURNS),
        maxChars:Number(data.maxChars||FALLBACK_MAX_CHARS),
        sessionMinutes:Number(data.sessionMinutes||FALLBACK_SESSION_MINUTES),
        startedAt:Date.now(),
        transcript:[{role:'client',content:data.message}],
        busy:false,
        finished:false,
        saved:false,
      };
      goRun();render();
    }catch(e){
      if(btn)btn.disabled=false;toast(e.message||'Не удалось запустить ИИ-диалог');
    }
  };

  function messagesHtml(list=run?.transcript||[]){
    return list.map(m=>`<div class="sh-ai-msg ${m.role==='employee'?'is-employee':'is-client'}"><div class="sh-ai-who">${m.role==='employee'?'Сотрудник':'Клиент'}</div><div>${escText(m.content)}</div></div>`).join('');
  }

  function expireRun(message='Сессия завершена. Запустите кейс заново.'){
    if(!run)return;
    run.finished=true;run.busy=false;
    $('page-run').innerHTML=`<div class="sh-ai-wrap"><div class="card sh-ai-shell" style="text-align:center"><div class="sh-ai-badge">${CASE_CODE}</div><h2>Кейс не завершён</h2><p class="muted">${escText(message)}</p><div class="actions" style="justify-content:center"><button class="btn primary" onclick="shAiSoftStart()">Начать заново</button><button class="btn secondary" onclick="shAiSoftExit()">К тренировкам</button></div></div></div>`;
  }

  function render(){
    if(!run)return;
    const turns=run.transcript.filter(m=>m.role==='employee').length;
    const isFinalNext=turns===run.maxTurns-1;
    const hint=isFinalNext
      ? '<b>Следующий ответ — финальный.</b> Постарайтесь завершить ситуацию с клиентом.'
      : turns>=run.minTurns
        ? 'Если вопрос клиента уже решён, диалог может завершиться после следующей реплики.'
        : 'Не нужно угадывать шаблон — отвечайте так, как ответили бы реальному клиенту.';
    $('page-run').innerHTML=`<div class="sh-ai-wrap"><div class="card sh-ai-shell">
      <div class="sh-ai-top"><button class="btn secondary" onclick="shAiSoftExit()">← Выйти</button><div><span class="sh-ai-kicker">ИИ-ТРЕНИРОВКА · ${CASE_CODE}</span><b>Разные ответы от сотрудников</b></div><span class="pill">Ход ${turns} · максимум ${run.maxTurns}</span></div>
      <div class="sh-ai-chat" id="shAiChat">${messagesHtml()}${run.busy?'<div class="sh-ai-msg is-client is-thinking"><div class="sh-ai-who">Клиент</div><div><span></span><span></span><span></span></div></div>':''}</div>
      ${run.finished?'':`<form class="sh-ai-form" onsubmit="event.preventDefault();shAiSoftSend()"><textarea id="shAiInput" rows="3" maxlength="${run.maxChars}" placeholder="Напишите ответ клиенту своими словами…" ${run.busy?'disabled':''}></textarea><div class="sh-ai-form-bottom"><small>${hint}<br><span class="muted">До ${run.maxChars} символов.</span></small><button class="btn primary" type="submit" ${run.busy?'disabled':''}>${isFinalNext?'Завершить диалог →':'Отправить →'}</button></div></form>`}
    </div></div>`;
    const chat=document.getElementById('shAiChat');if(chat)chat.scrollTop=chat.scrollHeight;
    if(!run.finished&&!run.busy){const inp=document.getElementById('shAiInput');if(inp)setTimeout(()=>inp.focus(),0)}
  }

  window.shAiSoftSend=async function(){
    if(!run||run.busy||run.finished)return;
    if(Date.now()-run.startedAt>run.sessionMinutes*60*1000){expireRun(`Сессия завершена: на один кейс отведено ${run.sessionMinutes} минут. Результат не засчитан.`);return}
    const inp=document.getElementById('shAiInput'),text=String(inp?.value||'').trim();
    if(!text){toast('Напишите ответ клиенту');return}
    if(text.length>run.maxChars){toast(`Максимум ${run.maxChars} символов`);return}
    run.transcript.push({role:'employee',content:text});run.busy=true;render();
    try{
      const data=await invoke({action:'reply',transcript:run.transcript,startedAt:run.startedAt});
      run.transcript.push({role:'client',content:data.message});
      run.busy=false;
      if(data.done){run.finished=true;render();await evaluate()}else render();
    }catch(e){
      const last=run.transcript[run.transcript.length-1];
      if(last?.role==='employee'&&last.content===text)run.transcript.pop();
      run.busy=false;
      if(e.code==='SESSION_EXPIRED'){expireRun(e.message);return}
      render();
      const retry=document.getElementById('shAiInput');if(retry)retry.value=text;
      toast(e.message||'Не удалось получить ответ Алисы');
    }
  };

  async function evaluate(){
    if(!run)return;
    $('page-run').innerHTML=`<div class="sh-ai-wrap"><div class="card sh-ai-shell sh-ai-evaluating"><div class="sh-ai-loader"></div><h2>Алиса оценивает диалог</h2><p class="muted">Проверяем всю переписку целиком: присоединение, работу с историей, обещания, следующий шаг и естественность.</p></div></div>`;
    try{
      const data=await invoke({action:'evaluate',transcript:run.transcript});
      const ev=data.evaluation||{};run.evaluation=ev;run.saved=!!data.saved;
      if(!data.saved&&!run.saved){
        const x=run.x;
        try{recordAttempt({section:'soft',topic:x?.topic||'Повторное обращение',score:Number(ev.score||0),type:'soft_ai',cpm:0,details:[{kind:'soft-ai',content_id:x?.id||null,title:'ИИ-диалог · Разные ответы от сотрудников',case_code:CASE_CODE,transcript:run.transcript,evaluation:ev}]});run.saved=true}catch(e){console.warn('AI Soft fallback save skipped',e)}
      }
      try{if(typeof syncAll==='function')await syncAll(false)}catch(e){console.warn('AI Soft sync after evaluation skipped',e)}
      renderResult();
    }catch(e){
      $('page-run').innerHTML=`<div class="sh-ai-wrap"><div class="card sh-ai-shell" style="text-align:center"><h2>Не удалось получить итоговую оценку</h2><p class="muted">${escText(e.message)}</p><div class="actions" style="justify-content:center"><button class="btn primary" onclick="shAiSoftRetryEvaluate()">Повторить оценку</button><button class="btn secondary" onclick="shAiSoftExit()">Выйти</button></div></div></div>`;
    }
  }
  window.shAiSoftRetryEvaluate=evaluate;

  function resultCore(ev,transcript,caseCode=CASE_CODE){
    const score=Math.round(Number(ev?.score||0));
    const strengths=Array.isArray(ev?.strengths)?ev.strengths:[];
    const improvements=Array.isArray(ev?.improvements)?ev.improvements:[];
    const criteria=Array.isArray(ev?.criteria)?ev.criteria:[];
    return `<div class="sh-ai-result-head"><div class="sh-ai-score">${score}<small>/100</small></div><div><span class="sh-ai-kicker">${escText(caseCode)} · ИИ-РАЗБОР</span><h2>Диалог завершён</h2><p>${escText(ev?.summary||'Оценка готова.')}</p></div></div>
      <div class="sh-ai-result-grid"><section><h3>✓ Что получилось</h3>${strengths.length?strengths.map(x=>`<div class="sh-ai-point">${escText(x)}</div>`).join(''):'<p class="muted">—</p>'}</section><section><h3>↗ Что улучшить</h3>${improvements.length?improvements.map(x=>`<div class="sh-ai-point">${escText(x)}</div>`).join(''):'<p class="muted">—</p>'}</section></div>
      ${criteria.length?`<div class="sh-ai-criteria">${criteria.map(c=>`<div><div><b>${escText(c.name)}</b><span>${Math.round(Number(c.score||0))}%</span></div><p>${escText(c.comment||'')}</p></div>`).join('')}</div>`:''}
      <details class="sh-ai-transcript"><summary>Посмотреть весь диалог</summary><div>${messagesHtml(transcript)}</div></details>`;
  }

  function renderResult(){
    const ev=run?.evaluation||{};
    $('page-run').innerHTML=`<div class="sh-ai-wrap"><div class="card sh-ai-shell">${resultCore(ev,run?.transcript||[],CASE_CODE)}<div class="actions sh-ai-result-actions"><button class="btn primary" onclick="shAiSoftStart()">Пройти ещё раз</button><button class="btn secondary" onclick="shAiSoftExit()">К тренировкам</button></div></div></div>`;
  }

  window.shAiOpenAttemptReview=function(id){
    const a=(S.attempts||[]).find(x=>x.id===id);if(!a)return;
    const d=aiDetail(a),ev=d?.evaluation||{},transcript=Array.isArray(d?.transcript)?d.transcript:[];
    const u=(S.allowed||[]).find(x=>x.login===a.login)||(S.profiles||[]).find(x=>x.login===a.login);
    showModal(`<div class="modal-head"><div><h2>ИИ-разбор диалога</h2><div class="meta">${escText(u?.name||a.login)} · ${escText(a.login)} · ${new Date(a.created_at).toLocaleString('ru-RU')}</div></div><button class="btn secondary" onclick="closeModal()">✕</button></div><div class="sh-ai-manager-review">${resultCore(ev,transcript,d?.case_code||CASE_CODE)}</div>`);
  };

  const baseAttemptReview=window.openAttemptReview;
  if(typeof baseAttemptReview==='function'){
    window.openAttemptReview=function(id){
      const a=(S.attempts||[]).find(x=>x.id===id);
      if(isAiAttempt(a))return window.shAiOpenAttemptReview(id);
      return baseAttemptReview.apply(this,arguments);
    };
  }

  function patchTechAdminResults(){
    if(!isTech())return;
    const page=document.getElementById('page-admin');if(!page||page.querySelector('#shAiAdminResults'))return;
    const rows=aiAttempts();
    page.insertAdjacentHTML('beforeend',`<div id="shAiAdminResults" class="sh-ai-admin-results"><div class="section-title"><h2>✨ ИИ-диалоги · результаты</h2><span class="muted small">Такой разбор будет доступен РГ по сотруднику</span></div><div class="card">${rows.length?rows.map(a=>{const d=aiDetail(a),u=(S.allowed||[]).find(x=>x.login===a.login)||(S.profiles||[]).find(x=>x.login===a.login);return `<div class="sh-ai-admin-row"><div><b>${escText(u?.name||a.login)}</b><div class="meta">${escText(d?.case_code||CASE_CODE)} · ${escText(a.topic||'Soft Skills')} · ${new Date(a.created_at).toLocaleString('ru-RU')}</div></div><div class="actions"><span class="pill ${Number(a.score)>=90?'good':Number(a.score)>=75?'warn':'bad'}">${Math.round(Number(a.score||0))}%</span><button class="btn secondary" onclick="shAiOpenAttemptReview('${a.id}')">Открыть разбор</button></div></div>`}).join(''):'<div class="muted">Завершите ИИ-кейс — результат появится здесь автоматически.</div>'}</div></div>`);
  }

  const baseRenderTechAdmin=window.renderTechAdmin;
  if(typeof baseRenderTechAdmin==='function'){
    window.renderTechAdmin=function(){const r=baseRenderTechAdmin.apply(this,arguments);setTimeout(patchTechAdminResults,0);return r};
  }

  window.shAiSoftExit=function(){run=null;go('training')};

  if(!document.getElementById('shAiSoftStyle')){
    const s=document.createElement('style');s.id='shAiSoftStyle';s.textContent=`
      .sh-soft-ai-card{border-style:dashed}.sh-soft-ai-card .sh-soft-choice-icon{filter:saturate(1.2)}
      .sh-ai-intro{border:1px solid var(--line);border-radius:18px;background:var(--panel);padding:22px}.sh-ai-intro h3{margin:10px 0 8px;font-size:22px}.sh-ai-intro p{color:var(--muted);line-height:1.55}.sh-ai-badge,.sh-ai-kicker{font-size:11px;font-weight:900;letter-spacing:.08em;color:var(--primary)}
      .sh-ai-status{margin:16px 0;padding:14px;border:1px solid var(--line);border-radius:14px;display:grid;gap:3px}.sh-ai-status span{font-size:13px;color:var(--muted)}
      .sh-ai-wrap{max-width:860px;margin:0 auto}.sh-ai-shell{padding:18px}.sh-ai-top{display:grid;grid-template-columns:auto 1fr auto;gap:13px;align-items:center;padding-bottom:14px;border-bottom:1px solid var(--line)}.sh-ai-top>div{display:grid;gap:2px}.sh-ai-top b{font-size:17px}
      .sh-ai-chat{height:min(56vh,520px);overflow:auto;padding:18px 4px;display:flex;flex-direction:column;gap:12px}.sh-ai-msg{max-width:78%;display:grid;gap:4px}.sh-ai-msg>div:last-child{border:1px solid var(--line);border-radius:16px;padding:11px 13px;line-height:1.48;background:var(--panel)}.sh-ai-msg.is-employee{align-self:flex-end}.sh-ai-msg.is-employee>div:last-child{background:color-mix(in srgb,var(--primary) 12%,var(--panel));border-color:color-mix(in srgb,var(--primary) 35%,var(--line))}.sh-ai-who{font-size:11px;font-weight:800;color:var(--muted);padding:0 5px}.sh-ai-msg.is-employee .sh-ai-who{text-align:right}
      .sh-ai-form{border-top:1px solid var(--line);padding-top:14px}.sh-ai-form textarea{width:100%;resize:vertical;min-height:78px}.sh-ai-form-bottom{display:flex;gap:12px;align-items:center;justify-content:space-between;margin-top:9px}.sh-ai-form-bottom small{color:var(--muted);line-height:1.35}
      .sh-ai-thinking{opacity:.8}.is-thinking>div:last-child{display:flex;gap:4px;align-items:center;height:42px}.is-thinking span{width:6px;height:6px;border-radius:50%;background:currentColor;opacity:.35;animation:shAiDot 1s infinite}.is-thinking span:nth-child(2){animation-delay:.15s}.is-thinking span:nth-child(3){animation-delay:.3s}@keyframes shAiDot{50%{opacity:1;transform:translateY(-2px)}}
      .sh-ai-evaluating{text-align:center;padding:52px 24px}.sh-ai-loader{width:42px;height:42px;border:4px solid var(--line);border-top-color:var(--primary);border-radius:50%;margin:0 auto 18px;animation:shAiSpin .8s linear infinite}@keyframes shAiSpin{to{transform:rotate(360deg)}}
      .sh-ai-result-head{display:flex;gap:18px;align-items:center;padding-bottom:18px;border-bottom:1px solid var(--line)}.sh-ai-score{min-width:104px;height:104px;border-radius:24px;background:var(--panel);border:1px solid var(--line);display:flex;align-items:baseline;justify-content:center;font-size:42px;font-weight:900;padding-top:25px}.sh-ai-score small{font-size:14px;color:var(--muted)}.sh-ai-result-head h2{margin:4px 0}.sh-ai-result-head p{margin:0;color:var(--muted);line-height:1.45}
      .sh-ai-result-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0}.sh-ai-result-grid section{border:1px solid var(--line);border-radius:16px;padding:15px;background:var(--panel)}.sh-ai-result-grid h3{margin:0 0 10px}.sh-ai-point{padding:8px 0;border-top:1px solid var(--line);line-height:1.4}.sh-ai-point:first-of-type{border-top:0}
      .sh-ai-criteria{display:grid;gap:8px}.sh-ai-criteria>div{border:1px solid var(--line);border-radius:13px;padding:11px 13px}.sh-ai-criteria>div>div{display:flex;justify-content:space-between;gap:12px}.sh-ai-criteria p{margin:5px 0 0;color:var(--muted);font-size:13px;line-height:1.4}.sh-ai-transcript{margin-top:16px;border:1px solid var(--line);border-radius:14px;padding:12px}.sh-ai-transcript summary{cursor:pointer;font-weight:800}.sh-ai-transcript>div{margin-top:10px;display:flex;flex-direction:column;gap:9px}.sh-ai-result-actions{justify-content:flex-end;margin-top:16px}
      .sh-ai-manager-review{padding-top:4px}.sh-ai-manager-review .sh-ai-result-head{margin-bottom:14px}.sh-ai-admin-results{margin-top:20px}.sh-ai-admin-row{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:13px 0;border-bottom:1px solid var(--line)}.sh-ai-admin-row:last-child{border-bottom:0}
      @media(max-width:620px){.sh-ai-shell{padding:13px}.sh-ai-chat{height:52vh}.sh-ai-msg{max-width:91%}.sh-ai-form-bottom{align-items:stretch;flex-direction:column}.sh-ai-form-bottom .btn{width:100%}.sh-ai-result-head{align-items:flex-start}.sh-ai-score{min-width:78px;width:78px;height:78px;font-size:31px;padding-top:18px;border-radius:19px}.sh-ai-result-grid{grid-template-columns:1fr}.sh-ai-result-actions{flex-direction:column}.sh-ai-result-actions .btn{width:100%}.sh-ai-admin-row{align-items:flex-start;flex-direction:column}.sh-ai-admin-row .actions{width:100%;justify-content:space-between}}
    `;document.head.appendChild(s);
  }

  console.info('SkillHub pilot: Alice AI Soft dialogue v2 enabled for tech_admin only');
})();