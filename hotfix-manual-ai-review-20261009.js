/* SkillHub manual Soft AI review — 2026-10-09
   New employee submissions are checked by AI. RG sees answers/results but cannot change AI decisions.
   Legacy rows are preserved as history.
*/
(function(){
  'use strict';

  const baseSubmit=window.submitManualAnswer;
  const baseStart=window.startManualContent;
  const baseOpenSoftHub=window.openSoftHub;
  const baseManualIntro=window.shSoftManualIntro;
  const baseOpenManualSoft=window.openManualSoft;
  const baseOpenUserAttempts=window.openUserAttempts;

  const isEmployee=()=>S?.profile?.role==='employee';
  const ownLogin=()=>S?.profile?.login||'';
  const norm=s=>String(s||'').trim();
  const arr=x=>Array.isArray(x)?x:[];
  const latest=(contentId,login=ownLogin())=>{
    try{
      if(typeof latestManualAnswer==='function'&&login===ownLogin())return latestManualAnswer(contentId);
      return (S.manualAnswers||[]).filter(x=>x.content_id===contentId&&x.login===login).slice().sort((a,b)=>Number(b.version||0)-Number(a.version||0))[0]||null;
    }catch(_){return null}
  };

  function statusMeta(r){
    const s=r?.ai_review?.finalStatus||'';
    if(s==='успешно')return{label:'Успешно',cls:'good'};
    if(s==='критическая ошибка')return{label:'Критическая ошибка',cls:'bad'};
    return{label:'Нужна доработка',cls:'warn'};
  }

  function listHtml(title,rows,cls=''){
    rows=arr(rows).filter(Boolean);if(!rows.length)return'';
    return `<div class="sh-manual-ai-block ${cls}"><b>${esc(title)}</b><ul>${rows.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`;
  }

  function aiReviewHtml(r){
    const v=r?.ai_review;if(!v)return'';const st=statusMeta(r);
    return `<div class="sh-manual-ai-review">
      <div class="sh-manual-ai-head"><div><span class="sh-manual-ai-kicker">Проверка ИИ</span><b>${esc(v.summary||'Ответ проверен')}</b></div><span class="pill ${st.cls}">${st.label}</span></div>
      <details><summary>Посмотреть разбор</summary><div class="sh-manual-ai-details">
        ${listHtml('Что получилось',v.strengths,'good')}
        ${listHtml('Что улучшить',v.improvements,'warn')}
        ${listHtml('Критичные ошибки',v.criticalErrors,'bad')}
        ${v.betterApproach?`<div class="sh-manual-ai-block suggestion"><b>Как можно сильнее</b><p>${esc(v.betterApproach)}</p></div>`:''}
        ${v.nextFocus?`<div class="sh-manual-ai-block"><b>Что потренировать</b><p>${esc(v.nextFocus)}</p></div>`:''}
        ${v.confidence?`<div class="meta">Уверенность проверки: ${esc(v.confidence)}</div>`:''}
      </div></details>
    </div>`;
  }

  function mergeLocalRow(row){
    if(!row)return;
    S.manualAnswers=Array.isArray(S.manualAnswers)?S.manualAnswers:[];
    S.manualAnswers=S.manualAnswers.filter(x=>x.id!==row.id);
    S.manualAnswers.push(row);
  }

  async function loadSavedRow(id){
    if(!id)return null;
    try{const {data,error}=await S.sb.from('manual_answers').select('*').eq('id',id).single();if(!error&&data){mergeLocalRow(data);return data}}catch(_){}
    return null;
  }

  async function aiSubmitManual(contentId){
    const input=$('manualAnswerInput'),answer=input?.value.trim()||'';
    if(answer.length<3){toast('Напишите ответ');return}
    const btn=document.querySelector(`[onclick="submitManualAnswer('${contentId}')"]`);
    const old=btn?.textContent||'Отправить на проверку ИИ';
    if(btn){btn.disabled=true;btn.textContent='ИИ проверяет…'}
    try{
      const {data,error}=await S.sb.functions.invoke('manual-ai-review',{body:{action:'review',contentId,answer}});
      if(error||!data?.ok)throw new Error(data?.error||error?.message||'Не удалось проверить ответ');
      await loadSavedRow(data.answerId);
      if(!latest(contentId)){
        try{const {data:rows}=await S.sb.from('manual_answers').select('*').eq('content_id',contentId).eq('login',ownLogin()).order('version',{ascending:false}).limit(1);if(rows?.[0])mergeLocalRow(rows[0])}catch(_){}
      }
      startManualContent(contentId);
      toast(data.status==='accepted'?'ИИ проверил ответ: принято':'ИИ проверил ответ: нужна доработка');
    }catch(e){
      toast(e?.message||'Не удалось выполнить ИИ-проверку');
      if(btn){btn.disabled=false;btn.textContent=old}
    }
  }

  window.submitManualAnswer=function(contentId){
    if(!isEmployee())return baseSubmit?.apply(this,arguments);
    return aiSubmitManual(contentId);
  };

  function patchRun(contentId){
    if(!isEmployee())return;
    const page=$('page-run');if(!page)return;const r=latest(contentId);
    const action=[...page.querySelectorAll('button')].find(b=>/Отправить.*провер/i.test(b.textContent||''));
    if(action)action.textContent=r?.status==='revision_requested'?'Отправить повторно на проверку ИИ':'Отправить на проверку ИИ';
    if(!r||r.review_source!=='ai'||!r.ai_review)return;

    page.querySelectorAll('.manual-status-box.warn').forEach(x=>x.remove());
    const success=page.querySelector('.sh74-success');
    if(success){
      const p=success.querySelector('p');if(p)p.textContent=r.status==='accepted'?'Ответ проверен ИИ и принят. Результат сохранён и доступен руководителю группы.':'ИИ вернул ответ на доработку.';
      if(!success.querySelector('.sh-manual-ai-review')){
        const actions=success.querySelector('.sh74-run-actions');
        if(actions)actions.insertAdjacentHTML('beforebegin',aiReviewHtml(r));else success.insertAdjacentHTML('beforeend',aiReviewHtml(r));
      }
    }else if(!page.querySelector('.sh-manual-ai-review')){
      const panel=page.querySelector('.sh74-answer-panel');
      if(panel)panel.insertAdjacentHTML('beforebegin',aiReviewHtml(r));
    }
  }

  window.startManualContent=function(id){
    const out=baseStart?.apply(this,arguments);
    setTimeout(()=>patchRun(id),0);
    return out;
  };

  function patchManualCopy(){
    const card=$('modalCard');if(!card)return;
    const replacements=[
      ['Свободный ответ с проверкой руководителя','Свободный ответ с проверкой ИИ'],
      ['После отправки работа уходит руководителю на проверку.','После отправки ответ сразу проверит ИИ. Результат увидите вы и ваш РГ.'],
      ['Каждый ответ отдельно уходит РГ на проверку.','Каждый ответ отдельно проверяет ИИ. РГ видит ответы и результаты.']
    ];
    const walker=document.createTreeWalker(card,NodeFilter.SHOW_TEXT);
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(n=>{let t=n.nodeValue||'';for(const [a,b] of replacements)t=t.replace(a,b);n.nodeValue=t});
  }
  if(baseOpenSoftHub)window.openSoftHub=function(){const r=baseOpenSoftHub.apply(this,arguments);setTimeout(patchManualCopy,0);return r};
  if(baseManualIntro)window.shSoftManualIntro=function(){const r=baseManualIntro.apply(this,arguments);setTimeout(patchManualCopy,0);return r};
  if(baseOpenManualSoft)window.openManualSoft=function(){const r=baseOpenManualSoft.apply(this,arguments);setTimeout(patchManualCopy,0);return r};

  // RG no longer changes manual grades. This panel becomes informational.
  window.manualReviewPanelHtml=function(){
    return `<section class="sh-manual-review-section"><div class="sh-manual-review-head"><div><h2>✍️ Ручные тренажёры</h2><p>Ответы проверяет ИИ. Результаты и все ответы доступны в карточках сотрудников.</p></div><span class="pill good">ИИ-проверка</span></div></section>`;
  };
  window.reviewManualAnswer=function(){toast('Ручные работы теперь проверяет ИИ. РГ видит результат, но не меняет его.')};

  function latestByContent(login){
    const m=new Map();
    (S.manualAnswers||[]).filter(x=>x.login===login).slice().sort((a,b)=>Number(a.version||0)-Number(b.version||0)).forEach(r=>m.set(r.content_id,r));
    return [...m.values()].sort((a,b)=>new Date(b.updated_at||b.created_at)-new Date(a.updated_at||a.created_at));
  }

  function patchEmployeeResultModal(login){
    const card=$('modalCard');if(!card)return;
    const rows=latestByContent(login),items=[...card.querySelectorAll('.sh742-manual-item')];
    items.forEach((el,i)=>{
      const r=rows[i];if(!r)return;
      if(r.review_source==='ai'&&r.ai_review){
        el.querySelectorAll('.review-note').forEach(x=>x.remove());
        if(!el.querySelector('.sh-manual-ai-review'))el.querySelector('.sh742-report-actions')?.insertAdjacentHTML('beforebegin',aiReviewHtml(r));
      }else{
        el.querySelectorAll('.review-note b').forEach(b=>{if(/Комментарий РГ/i.test(b.textContent||''))b.textContent='Комментарий РГ · история'});
      }
    });
  }
  if(baseOpenUserAttempts)window.openUserAttempts=function(login){const r=baseOpenUserAttempts.apply(this,arguments);setTimeout(()=>patchEmployeeResultModal(login),0);return r};

  if(!document.getElementById('shManualAiReviewStyle')){
    const s=document.createElement('style');s.id='shManualAiReviewStyle';s.textContent=`
      .sh-manual-ai-review{margin:12px 0;padding:14px;border:1px solid var(--line);border-radius:14px;background:var(--panel)}
      .sh-manual-ai-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.sh-manual-ai-head>div{display:grid;gap:4px;min-width:0}.sh-manual-ai-head b{font-size:15px;line-height:1.4}.sh-manual-ai-kicker{font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:var(--primary)}
      .sh-manual-ai-review details{margin-top:10px}.sh-manual-ai-review summary{cursor:pointer;font-weight:800;color:var(--primary)}.sh-manual-ai-details{display:grid;gap:9px;padding-top:10px}
      .sh-manual-ai-block{padding:10px 11px;border:1px solid var(--line);border-radius:11px}.sh-manual-ai-block>b{font-size:13px}.sh-manual-ai-block ul{margin:6px 0 0;padding-left:18px}.sh-manual-ai-block li,.sh-manual-ai-block p{margin:4px 0;line-height:1.42;font-size:14px}.sh-manual-ai-block.bad{border-color:color-mix(in srgb,#ef4444 45%,var(--line))}.sh-manual-ai-block.good{border-color:color-mix(in srgb,#22c55e 35%,var(--line))}.sh-manual-ai-block.warn{border-color:color-mix(in srgb,#f59e0b 40%,var(--line))}
      @media(max-width:620px){.sh-manual-ai-review{padding:12px}.sh-manual-ai-head{align-items:flex-start}.sh-manual-ai-head .pill{white-space:nowrap}}
    `;document.head.appendChild(s);
  }
  console.info('SkillHub: manual Soft AI review enabled for employees');
})();