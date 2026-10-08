/* SkillHub hotfix — stable human-readable case codes, 2026-10-08 */
(function(){
  'use strict';

  function codeOf(x){return x?.case_code||x?.payload?.case_code||''}
  function contentById(id){return (typeof S!=='undefined'&&Array.isArray(S.content))?S.content.find(x=>x.id===id):null}
  function runContent(){
    const r=typeof S!=='undefined'?S.currentRun:null;if(!r)return null;
    if(r.x)return r.x;
    if(Array.isArray(r.items)&&r.items.length)return r.items[Math.min(r.i||0,r.items.length-1)]||r.items[0];
    return null;
  }
  function badgeHtml(code){return code?`<span class="sh-case-code">${esc(code)}</span>`:''}
  function addRunBadge(x=runContent()){
    const code=codeOf(x),root=document.getElementById('page-run');if(!code||!root)return;
    const card=root.querySelector('.card');if(!card||card.querySelector('.sh-case-code'))return;
    const wrap=document.createElement('div');wrap.className='sh-case-code-row';wrap.innerHTML=badgeHtml(code);card.insertBefore(wrap,card.firstChild);
  }
  function addModalBadge(x){
    const code=codeOf(x),root=document.getElementById('modalCard');if(!code||!root||root.querySelector('.sh-case-code'))return;
    const head=root.querySelector('.modal-head > div')||root.querySelector('.modal-head');if(!head)return;
    const row=document.createElement('div');row.className='sh-case-code-modal';row.innerHTML=badgeHtml(code);head.appendChild(row);
  }
  function contentFromAttempt(id){
    const a=(S.attempts||[]).find(x=>x.id===id);if(!a)return null;
    const d=Array.isArray(a.details)?a.details:[];
    const contentId=d.find(x=>x?.content_id)?.content_id;
    return contentById(contentId)||null;
  }
  function wrap(name,after){
    const base=window[name];if(typeof base!=='function')return;
    window[name]=function(){const result=base.apply(this,arguments);try{after.apply(this,arguments)}catch(e){console.warn('case code UI skipped',name,e)}return result};
  }

  ['renderQuiz','renderDialogue','finishQuiz','finishDialogue'].forEach(n=>wrap(n,()=>addRunBadge()));
  wrap('startContent',()=>addRunBadge());
  wrap('startManualContent',function(id){addRunBadge(contentById(id))});
  wrap('openAttemptReview',function(id){addModalBadge(contentFromAttempt(id))});
  wrap('openManualReview',function(answerId){const r=(S.manualAnswers||[]).find(x=>x.id===answerId);if(r)addModalBadge(contentById(r.content_id))});

  if(!document.getElementById('shCaseCodeStyle')){
    const s=document.createElement('style');s.id='shCaseCodeStyle';s.textContent=`
      .sh-case-code-row{display:flex;justify-content:flex-end;margin:0 0 8px}
      .sh-case-code,.sh-case-code-modal .sh-case-code{display:inline-flex;align-items:center;border:1px solid var(--line);background:var(--panel);color:var(--muted);border-radius:999px;padding:5px 9px;font-size:11px;font-weight:800;letter-spacing:.06em;white-space:nowrap}
      .sh-case-code-modal{margin-top:5px}
    `;document.head.appendChild(s);
  }

  console.info('SkillHub hotfix: stable case codes visible in training and review');
})();

/* Internal Hard training sequences are situations/questions for the employee,
   not literal client speech. Keep the multi-step mechanics, but label them honestly. */
(function(){
  'use strict';
  function isScenario(x){return x?.section==='hard'&&x?.payload?.presentation==='scenario'}
  function current(){return typeof S!=='undefined'?S.currentRun?.x:null}
  function relabelRun(){
    const x=current();if(!isScenario(x))return;
    const root=document.getElementById('page-run');if(!root)return;
    root.querySelectorAll('.sh831-client .sh831-who').forEach(el=>{el.textContent='Ситуация'});
    root.querySelectorAll('h2').forEach(el=>{if(el.textContent.trim()==='Диалог завершён')el.textContent='Тренировка завершена'});
  }
  function relabelRows(){
    const root=document.getElementById('modalCard');if(!root||typeof S==='undefined')return;
    const titles=new Set((S.content||[]).filter(isScenario).map(x=>String(x.title||x.question||'').trim()));
    root.querySelectorAll('.content-row').forEach(row=>{
      const title=row.querySelector('b')?.textContent?.trim();if(!title||!titles.has(title))return;
      const pill=row.querySelector('.pill');if(pill)pill.textContent='Ситуация';
    });
  }
  function wrap(name,after){
    const base=window[name];if(typeof base!=='function')return;
    window[name]=function(){const r=base.apply(this,arguments);try{after.apply(this,arguments)}catch(e){console.warn('hard scenario relabel skipped',name,e)}return r};
  }
  wrap('renderDialogue',relabelRun);
  wrap('finishDialogue',relabelRun);
  wrap('startContent',relabelRun);
  wrap('openSection',function(sec){if(sec==='hard')setTimeout(relabelRows,0)});
  wrap('shHardFlowOpenTopic',function(){setTimeout(relabelRows,0)});
  console.info('SkillHub hotfix: internal Hard flows are labelled as situations');
})();