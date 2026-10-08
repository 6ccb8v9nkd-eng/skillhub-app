/* SkillHub hotfix — typing results in Progress / employee card, 2026-10-08 */
(function(){
  'use strict';

  function scoreClass(v){
    v=Number(v||0);
    return v>=90?'good':v>=75?'warn':'bad';
  }

  function typingResultHtml(a){
    const cpm=Number(a?.cpm||0),acc=Number(a?.score||0);
    if(cpm>0){
      return `<span class="pill good">${cpm} зн/мин</span><div class="muted small">точность ${acc}%</div>`;
    }
    return `<span class="pill ${scoreClass(acc)}">точность ${acc}%</span><div class="muted small">скорость не сохранена в старой попытке</div>`;
  }

  function findAttemptsTable(root){
    return [...(root?.querySelectorAll('table')||[])].find(t=>{
      const heads=[...t.querySelectorAll('thead th')].map(x=>x.textContent.trim());
      return heads.includes('Дата')&&heads.includes('Раздел')&&heads.includes('Тема')&&(heads.includes('Ответы')||heads.includes('Детали'));
    })||null;
  }

  function enhanceTable(root,attempts){
    const table=findAttemptsTable(root);if(!table)return;
    const rows=[...table.querySelectorAll('tbody tr')];
    rows.forEach((tr,i)=>{
      const a=attempts[i],cells=tr.children;
      if(!a||a.type!=='typing'||cells.length<5)return;
      cells[3].innerHTML=typingResultHtml(a);
      cells[4].innerHTML='<span class="muted small">скорость / точность</span>';
    });
  }

  if(typeof window.renderProgress==='function'){
    const baseRenderProgress=window.renderProgress;
    window.renderProgress=function(){
      const r=baseRenderProgress.apply(this,arguments);
      try{
        const attempts=(S.attempts||[]).filter(x=>x.login===S.profile?.login).slice().reverse();
        enhanceTable(document.getElementById('page-progress'),attempts);
      }catch(e){console.warn('typing progress enhancement skipped',e)}
      return r;
    };
  }

  if(typeof window.openUserAttempts==='function'){
    const baseOpenUserAttempts=window.openUserAttempts;
    window.openUserAttempts=function(login){
      const r=baseOpenUserAttempts.apply(this,arguments);
      try{
        const attempts=(S.attempts||[]).filter(x=>x.login===login).slice().sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
        enhanceTable(document.getElementById('modalCard'),attempts);
      }catch(e){console.warn('typing employee-card enhancement skipped',e)}
      return r;
    };
  }

  console.info('SkillHub hotfix: typing speed + accuracy are visible in progress and employee cards');
})();

(function(){
  if(document.getElementById('shCaseCodeLoader'))return;
  const s=document.createElement('script');
  s.id='shCaseCodeLoader';
  s.src='./hotfix-case-codes-20261008.js?v=1';
  document.head.appendChild(s);
})();

(function(){
  if(document.getElementById('shAiSoftPilotLoader'))return;
  const s=document.createElement('script');
  s.id='shAiSoftPilotLoader';
  s.src='./hotfix-soft-ai-pilot-20261008.js?v=1';
  document.head.appendChild(s);
})();