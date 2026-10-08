/* SkillHub pilot — dynamic negative-handling Soft Skills dialogue with Alice AI. */
(function(){
  'use strict';

  const CASE_CODE='SOFT-AI-NEG';
  const FALLBACK_MIN_TURNS=4;
  const FALLBACK_MAX_TURNS=6;
  const FALLBACK_MAX_CHARS=600;
  const FALLBACK_SESSION_MINUTES=20;
  const PILOT_LOGINS=new Set(['a.eliseev1','v.s.ashcheulov']);
  let run=null;
  let adminSessions=[];

  function isTechAdminUser(){
    try{return typeof isTechAdmin==='function'?isTechAdmin():S?.profile?.role==='tech_admin'}catch(_){return false}
  }
  function hasAiAccess(){
    try{return isTechAdminUser()||PILOT_LOGINS.has(String(S?.profile?.login||'').toLowerCase())}catch(_){return false}
  }
  function escText(s){return typeof esc==='function'?esc(String(s??'')):String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function addUsage(a,b){return {input:Number(a?.input||0)+Number(b?.input||0),output:Number(a?.output||0)+Number(b?.output||0),total:Number(a?.total||0)+Number(b?.total||0)}}

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
    if(!hasAiAccess())return;
    const root=document.getElementById('modalCard');
    const grid=root?.querySelector('.sh-soft-choice-grid');
    if(!grid||grid.querySelector('.sh-soft-ai-card'))return;
    grid.insertAdjacentHTML('beforeend',`
      <button class="sh-soft-choice-card sh-soft-ai-card" onclick="shAiSoftIntro()">
        <span class="sh-soft-choice-icon">✨</span>
        <span class="sh-soft-choice-copy"><b>Работа с негативом · ИИ</b><small>Сложный живой кейс на любую тему. Алиса реагирует на ваши ответы, а после даёт качественный разбор без баллов.</small><em>Пилот ИИ-тренажёра</em></span>
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
    if(!hasAiAccess()){toast('ИИ-тренажёр пока доступен только участникам пилота');return}
    showModal(`<div class="modal-head"><div><button class="sh-soft-back" onclick="shSoftBackToChooser()">← Назад</button><h2>Работа с негативом · ИИ</h2><div class="meta">${CASE_CODE} · живой кейс</div></div><button class="btn secondary" onclick="closeModal()">✕</button></div>
      <div class="sh-ai-intro">
        <div class="sh-ai-badge">ALICE AI · PILOT</div>
        <h3>Ваша задача — снизить негатив и вывести разговор в конструктив</h3>
        <p>Тема кейса может быть любой: сервис, бизнес или бытовая ситуация. Специальные знания не проверяются. Диалог занимает 4–6 ваших ответов, максимум 600 символов на ответ и до 20 минут на один кейс.</p>
        <div id="shAiStatus" class="sh-ai-status">Проверяю настройку Алисы…</div>
        <button id="shAiStartBtn" class="btn primary full" onclick="shAiSoftStart()" disabled>Получить новый кейс</button>
      </div>`);
    try{
      const st=await invoke({action:'status'});
      const status=document.getElementById('shAiStatus'),btn=document.getElementById('shAiStartBtn');
      if(st?.configured){
        if(status)status.innerHTML='<b>✓ Ключи Алисы настроены</b><span>Подключение проверится при создании кейса.</span>';
        if(btn)btn.disabled=false;
      }else if(status){
        status.innerHTML='<b>Алиса ещё не настроена</b><span>Нужны защищённые секреты Yandex AI Studio.</span>';
      }
    }catch(e){
      const status=document.getElementById('shAiStatus');if(status)status.innerHTML=`<b>Не удалось проверить настройку</b><span>${escText(e.message)}</span>`;
    }
  };

  window.shAiSoftStart=async function(){
    if(!hasAiAccess())return;
    const btn=document.getElementById('shAiStartBtn');if(btn)btn.disabled=true;
    try{
      const data=await invoke({action:'start'});
      closeModal();
      run={
        scenario:data.scenario||{},
        minTurns:Number(data.minTurns||FALLBACK_MIN_TURNS),
        maxTurns:Number(data.maxTurns||FALLBACK_MAX_TURNS),
        maxChars:Number(data.maxChars||FALLBACK_MAX_CHARS),
        sessionMinutes:Number(data.sessionMinutes||FALLBACK_SESSION_MINUTES),
        startedAt:Date.now(),
        transcript:[{role:'client',content:data.message}],
        usage:addUsage(null,data.usage),
        busy:false,
        finished:false,
        saved:false,
      };
      goRun();render();
    }catch(e){
      if(btn)btn.disabled=false;toast(e.message||'Не удалось создать ИИ-кейс');
    }
  };

  function messagesHtml(list=run?.transcript||[]){
    return list.map(m=>`<div class="sh-ai-msg ${m.role==='employee'?'is-employee':'is-client'}"><div class="sh-ai-who">${m.role==='employee'?'Сотрудник':'Клиент'}</div><div>${escText(m.content)}</div></div>`).join('');
  }

  function expireRun(message='Сессия завершена. Запустите кейс заново.'){
    if(!run)return;
    run.finished=true;run.busy=false;
    $('page-run').innerHTML=`<div class="sh-ai-wrap"><div class="card sh-ai-shell" style="text-align:center"><div class="sh-ai-badge">${CASE_CODE}</div><h2>Кейс не завершён</h2><p class="muted">${escText(message)}</p><div class="actions" style="justify-content:center"><button class="btn primary" onclick="shAiSoftStart()">Новый кейс</button><button class="btn secondary" onclick="shAiSoftExit()">К тренировкам</button></div></div></div>`;
  }

  function render(){
    if(!run)return;
    const turns=run.transcript.filter(m=>m.role==='employee').length;
    const isFinalNext=turns===run.maxTurns-1;
    const hint=isFinalNext
      ? '<b>Следующий ответ — финальный.</b> Постарайтесь завершить ситуацию с клиентом.'
      : turns>=run.minTurns
        ? 'Если негатив снят и следующий шаг понятен, клиент может завершить разговор после следующей реплики.'
        : 'Не ищите «правильную фразу» — работайте с реакцией конкретного клиента.';
    const title=run.scenario?.title||'Сложный разговор с клиентом';
    const theme=run.scenario?.theme||'Работа с негативом';
    $('page-run').innerHTML=`<div class="sh-ai-wrap"><div class="card sh-ai-shell">
      <div class="sh-ai-top"><button class="btn secondary" onclick="shAiSoftExit()">← Выйти</button><div><span class="sh-ai-kicker">ИИ-ТРЕНИРОВКА · ${CASE_CODE}</span><b>${escText(title)}</b><small>${escText(theme)}</small></div><span class="pill">Ход ${turns} · максимум ${run.maxTurns}</span></div>
      <div class="sh-ai-chat" id="shAiChat">${messagesHtml()}${run.busy?'<div class="sh-ai-msg is-client is-thinking"><div class="sh-ai-who">Клиент</div><div><span></span><span></span><span></span></div></div>':''}</div>
      ${run.finished?'':`<form class="sh-ai-form" onsubmit="event.preventDefault();shAiSoftSend()"><textarea id="shAiInput" rows="3" maxlength="${run.maxChars}" placeholder="Напишите ответ клиенту своими словами…" ${run.busy?'disabled':''}></textarea><div class="sh-ai-form-bottom"><small>${hint}<br><span class="muted">До ${run.maxChars} символов.</span></small><button class="btn primary" type="submit" ${run.busy?'disabled':''}>${isFinalNext?'Завершить диалог →':'Отправить →'}</button></div></form>`}
    </div></div>`;
    const chat=document.getElementById('shAiChat');if(chat)chat.scrollTop=chat.scrollHeight;
    if(!run.finished&&!run.busy){const inp=document.getElementById('shAiInput');if(inp)setTimeout(()=>inp.focus(),0)}
  }

  window.shAiSoftSend=async function(){
    if(!run||run.busy||run.finished)return;
    if(Date.now()-run.startedAt>run.sessionMinutes*60*1000){expireRun(`Сессия завершена: на один кейс отведено ${run.sessionMinutes} минут. Запустите новый кейс.`);return}
    const inp=document.getElementById('shAiInput'),text=String(inp?.value||'').trim();
    if(!text){toast('Напишите ответ клиенту');return}
    if(text.length>run.maxChars){toast(`Максимум ${run.maxChars} символов`);return}
    run.transcript.push({role:'employee',content:text});run.busy=true;render();
    try{
      const data=await invoke({action:'reply',scenario:run.scenario,transcript:run.transcript,startedAt:run.startedAt});
      run.usage=addUsage(run.usage,data.usage);
      run.transcript.push({role:'client',content:data.message});
      run.busy=false;
      if(data.done){run.finished=true;render();await reviewDialogue()}else render();
    }catch(e){
      const last=run.transcript[run.transcript.length-1];
      if(last?.role==='employee'&&last.content===text)run.transcript.pop();
      run.busy=false;
      if(e.code==='SESSION_EXPIRED'){expireRun(e.message);return}
      render();
      const retry=document.getElementById('shAiInput');if(retry)retry.value=text;
      if(e.code==='YANDEX_BUSY')toast('Алиса сейчас занята. Ответ не засчитан — попробуйте отправить его ещё раз.');
      else toast(e.message||'Не удалось получить ответ Алисы');
    }
  };

  async function reviewDialogue(){
    if(!run)return;
    $('page-run').innerHTML=`<div class="sh-ai-wrap"><div class="card sh-ai-shell sh-ai-evaluating"><div class="sh-ai-loader"></div><h2>Алиса разбирает диалог</h2><p class="muted">Без баллов и процентов. Смотрим, как вы работали с негативом, что снизило напряжение и что можно улучшить.</p></div></div>`;
    try{
      const data=await invoke({action:'review',scenario:run.scenario,transcript:run.transcript,usageSoFar:run.usage});
      run.review=data.review||{};run.saved=!!data.saved;run.usage=data.usage||run.usage;
      renderResult();
    }catch(e){
      $('page-run').innerHTML=`<div class="sh-ai-wrap"><div class="card sh-ai-shell" style="text-align:center"><h2>Не удалось получить разбор</h2><p class="muted">${escText(e.message)}</p><div class="actions" style="justify-content:center"><button class="btn primary" onclick="shAiSoftRetryReview()">Повторить разбор</button><button class="btn secondary" onclick="shAiSoftExit()">Выйти</button></div></div></div>`;
    }
  }
  window.shAiSoftRetryReview=reviewDialogue;

  function resultLabel(result){
    return ({'снижен':'Негатив снижен','частично снижен':'Негатив частично снижен','не снижен':'Негатив остался','усилен':'Негатив усилился'})[result]||'Разбор готов';
  }

  function resultClass(result){return result==='снижен'?'good':result==='частично снижен'?'warn':result==='усилен'?'bad':'warn'}

  function resultCore(review,transcript,scenario){
    const strengths=Array.isArray(review?.strengths)?review.strengths:[];
    const improvements=Array.isArray(review?.improvements)?review.improvements:[];
    const result=review?.negativeResult||'';
    return `<div class="sh-ai-result-head"><div><span class="sh-ai-kicker">${CASE_CODE} · ИИ-РАЗБОР</span><h2>Диалог завершён</h2><div class="sh-ai-outcome ${resultClass(result)}">${escText(resultLabel(result))}</div><p>${escText(review?.summary||'Разбор готов.')}</p></div></div>
      <div class="sh-ai-result-grid"><section><h3>✓ Что сработало</h3>${strengths.length?strengths.map(x=>`<div class="sh-ai-point">${escText(x)}</div>`).join(''):'<p class="muted">Сильные действия не выделены.</p>'}</section><section><h3>↗ Что улучшить</h3>${improvements.length?improvements.map(x=>`<div class="sh-ai-point">${escText(x)}</div>`).join(''):'<p class="muted">Критичных точек не выделено.</p>'}</section></div>
      ${review?.keyMoment?`<div class="sh-ai-review-card"><b>Ключевой момент</b><p>${escText(review.keyMoment)}</p></div>`:''}
      ${review?.betterApproach?`<div class="sh-ai-review-card"><b>Как можно было сильнее</b><p>${escText(review.betterApproach)}</p></div>`:''}
      ${review?.nextFocus?`<div class="sh-ai-review-card is-focus"><b>На следующую тренировку</b><p>${escText(review.nextFocus)}</p></div>`:''}
      ${scenario?.situation?`<details class="sh-ai-scenario"><summary>Сценарий кейса</summary><p>${escText(scenario.situation)}</p></details>`:''}
      <details class="sh-ai-transcript"><summary>Посмотреть весь диалог</summary><div>${messagesHtml(transcript)}</div></details>`;
  }

  function renderResult(){
    const review=run?.review||{};
    $('page-run').innerHTML=`<div class="sh-ai-wrap"><div class="card sh-ai-shell">${resultCore(review,run?.transcript||[],run?.scenario||{})}<div class="actions sh-ai-result-actions"><button class="btn primary" onclick="shAiSoftStart()">Новый кейс</button><button class="btn secondary" onclick="shAiSoftExit()">К тренировкам</button></div></div></div>`;
  }

  window.shAiOpenSessionReview=function(id){
    const x=adminSessions.find(v=>v.id===id);if(!x)return;
    const u=(S.allowed||[]).find(v=>v.login===x.login)||(S.profiles||[]).find(v=>v.login===x.login);
    showModal(`<div class="modal-head"><div><h2>ИИ-разбор диалога</h2><div class="meta">${escText(u?.name||x.login)} · ${escText(x.login)} · ${new Date(x.created_at).toLocaleString('ru-RU')}</div></div><button class="btn secondary" onclick="closeModal()">✕</button></div><div class="sh-ai-manager-review">${resultCore(x.review||{},Array.isArray(x.transcript)?x.transcript:[],x.scenario||{})}</div>`);
  };

  async function loadTechAdminResults(){
    if(!isTechAdminUser())return;
    const host=document.getElementById('shAiAdminResultsBody');if(!host)return;
    try{
      const {data,error}=await S.sb.from('soft_ai_sessions').select('*').order('created_at',{ascending:false}).limit(50);
      if(error)throw error;
      adminSessions=data||[];
      host.innerHTML=adminSessions.length?adminSessions.map(x=>{
        const u=(S.allowed||[]).find(v=>v.login===x.login)||(S.profiles||[]).find(v=>v.login===x.login);
        const result=x.review?.negativeResult||'';
        return `<div class="sh-ai-admin-row"><div><b>${escText(u?.name||x.login)}</b><div class="meta">${escText(x.case_code||CASE_CODE)} · ${escText(x.scenario?.title||x.topic||'Работа с негативом')} · ${new Date(x.created_at).toLocaleString('ru-RU')}</div></div><div class="actions"><span class="pill ${resultClass(result)}">${escText(resultLabel(result))}</span><button class="btn secondary" onclick="shAiOpenSessionReview('${x.id}')">Открыть разбор</button></div></div>`}).join(''):'<div class="muted">Завершите ИИ-кейс — разбор появится здесь автоматически.</div>';
    }catch(e){
      console.warn('AI session results load failed',e);
      host.innerHTML='<div class="muted">Не удалось загрузить ИИ-разборы.</div>';
    }
  }

  function patchTechAdminResults(){
    if(!isTechAdminUser())return;
    const page=document.getElementById('page-admin');if(!page)return;
    let box=page.querySelector('#shAiAdminResults');
    if(!box){
      page.insertAdjacentHTML('beforeend',`<div id="shAiAdminResults" class="sh-ai-admin-results"><div class="section-title"><h2>✨ ИИ-диалоги · результаты</h2><span class="muted small">Пилот качественного разбора без баллов</span></div><div class="card" id="shAiAdminResultsBody"><div class="muted">Загружаем ИИ-разборы…</div></div></div>`);
    }
    loadTechAdminResults();
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
      .sh-ai-wrap{max-width:860px;margin:0 auto}.sh-ai-shell{padding:18px}.sh-ai-top{display:grid;grid-template-columns:auto 1fr auto;gap:13px;align-items:center;padding-bottom:14px;border-bottom:1px solid var(--line)}.sh-ai-top>div{display:grid;gap:2px}.sh-ai-top b{font-size:17px}.sh-ai-top small{color:var(--muted)}
      .sh-ai-chat{height:min(56vh,520px);overflow:auto;padding:18px 4px;display:flex;flex-direction:column;gap:12px}.sh-ai-msg{max-width:78%;display:grid;gap:4px}.sh-ai-msg>div:last-child{border:1px solid var(--line);border-radius:16px;padding:11px 13px;line-height:1.48;background:var(--panel)}.sh-ai-msg.is-employee{align-self:flex-end}.sh-ai-msg.is-employee>div:last-child{background:color-mix(in srgb,var(--primary) 12%,var(--panel));border-color:color-mix(in srgb,var(--primary) 35%,var(--line))}.sh-ai-who{font-size:11px;font-weight:800;color:var(--muted);padding:0 5px}.sh-ai-msg.is-employee .sh-ai-who{text-align:right}
      .sh-ai-form{border-top:1px solid var(--line);padding-top:14px}.sh-ai-form textarea{width:100%;resize:vertical;min-height:78px}.sh-ai-form-bottom{display:flex;gap:12px;align-items:center;justify-content:space-between;margin-top:9px}.sh-ai-form-bottom small{color:var(--muted);line-height:1.35}
      .is-thinking>div:last-child{display:flex;gap:4px;align-items:center;height:42px}.is-thinking span{width:6px;height:6px;border-radius:50%;background:currentColor;opacity:.35;animation:shAiDot 1s infinite}.is-thinking span:nth-child(2){animation-delay:.15s}.is-thinking span:nth-child(3){animation-delay:.3s}@keyframes shAiDot{50%{opacity:1;transform:translateY(-2px)}}
      .sh-ai-evaluating{text-align:center;padding:52px 24px}.sh-ai-loader{width:42px;height:42px;border:4px solid var(--line);border-top-color:var(--primary);border-radius:50%;margin:0 auto 18px;animation:shAiSpin .8s linear infinite}@keyframes shAiSpin{to{transform:rotate(360deg)}}
      .sh-ai-result-head{padding-bottom:18px;border-bottom:1px solid var(--line)}.sh-ai-result-head h2{margin:4px 0}.sh-ai-result-head p{margin:10px 0 0;color:var(--muted);line-height:1.5}.sh-ai-outcome{display:inline-flex;margin-top:7px;border-radius:999px;padding:6px 10px;font-weight:850;font-size:13px;border:1px solid var(--line)}.sh-ai-outcome.good{background:rgba(52,199,89,.11)}.sh-ai-outcome.warn{background:rgba(255,184,0,.11)}.sh-ai-outcome.bad{background:rgba(255,69,58,.11)}
      .sh-ai-result-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0}.sh-ai-result-grid section{border:1px solid var(--line);border-radius:16px;padding:15px;background:var(--panel)}.sh-ai-result-grid h3{margin:0 0 10px}.sh-ai-point{padding:8px 0;border-top:1px solid var(--line);line-height:1.4}.sh-ai-point:first-of-type{border-top:0}
      .sh-ai-review-card{border:1px solid var(--line);border-radius:14px;padding:13px 14px;margin-top:10px;background:var(--panel)}.sh-ai-review-card b{display:block;margin-bottom:5px}.sh-ai-review-card p{margin:0;color:var(--muted);line-height:1.45}.sh-ai-review-card.is-focus{border-style:dashed}.sh-ai-scenario,.sh-ai-transcript{margin-top:14px;border:1px solid var(--line);border-radius:14px;padding:12px}.sh-ai-scenario summary,.sh-ai-transcript summary{cursor:pointer;font-weight:800}.sh-ai-scenario p{color:var(--muted);line-height:1.45}.sh-ai-transcript>div{margin-top:10px;display:flex;flex-direction:column;gap:9px}.sh-ai-result-actions{justify-content:flex-end;margin-top:16px}
      .sh-ai-manager-review{padding-top:4px}.sh-ai-admin-results{margin-top:20px}.sh-ai-admin-row{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:13px 0;border-bottom:1px solid var(--line)}.sh-ai-admin-row:last-child{border-bottom:0}
      @media(max-width:620px){.sh-ai-shell{padding:13px}.sh-ai-chat{height:52vh}.sh-ai-msg{max-width:91%}.sh-ai-form-bottom{align-items:stretch;flex-direction:column}.sh-ai-form-bottom .btn{width:100%}.sh-ai-top{grid-template-columns:auto 1fr}.sh-ai-top>.pill{grid-column:1/-1;justify-self:start}.sh-ai-result-grid{grid-template-columns:1fr}.sh-ai-result-actions{flex-direction:column}.sh-ai-result-actions .btn{width:100%}.sh-ai-admin-row{align-items:flex-start;flex-direction:column}.sh-ai-admin-row .actions{width:100%;justify-content:space-between}}
    `;document.head.appendChild(s);
  }

  console.info('SkillHub pilot: qualitative negative-handling AI dialogue enabled for tech admin, Eliseev RG and Ashcheulov employee');
})();
