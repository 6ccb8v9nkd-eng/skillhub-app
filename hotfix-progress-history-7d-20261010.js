/* SkillHub employee Progress history window — 2026-10-10
   Employees see only the last 7 days in the training History table.
   Historical attempt data is NOT deleted and remains available to RG/RS/admin reports.
   KPI totals, topic analytics and final assessment archive are unchanged.
*/
(function(){
  'use strict';
  if(window.__shProgressHistory7d20261010)return;
  window.__shProgressHistory7d20261010=true;

  const DAYS=7;
  const MS=DAYS*24*60*60*1000;

  function isEmployee(){
    try{return String(S?.profile?.role||'')==='employee'}catch(_){return false}
  }

  function recentAttempts(){
    if(!isEmployee())return[];
    const login=String(S?.profile?.login||'');
    const cutoff=Date.now()-MS;
    return (S?.attempts||[])
      .filter(x=>x?.login===login&&new Date(x?.created_at||0).getTime()>=cutoff)
      .slice()
      .sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  }

  function historySection(){
    const page=document.getElementById('page-progress');
    if(!page)return null;
    const head=[...page.querySelectorAll('.section-title')].find(x=>String(x.querySelector('h2')?.textContent||'').trim()==='История');
    if(!head)return null;
    const card=head.nextElementSibling;
    if(!card?.matches?.('.card'))return null;
    return{head,card};
  }

  function rowHtml(x){
    const score=Number(x?.score||0);
    let review='—';
    try{
      if(x?.type!=='typing'){
        const details=typeof attemptDetails==='function'?attemptDetails(x):[];
        review=details?.length?`<button class="btn secondary" onclick="openAttemptReview('${String(x.id).replace(/'/g,"\\'")}')">Посмотреть</button>`:'<span class="muted small">до 6.2</span>';
      }
    }catch(_){review='—'}
    const section=typeof secName==='function'?secName(x?.section):String(x?.section||'');
    const topic=typeof esc==='function'?esc(x?.topic||''):String(x?.topic||'');
    return `<tr><td>${new Date(x.created_at).toLocaleString('ru-RU')}</td><td>${section}</td><td>${topic}</td><td><span class="pill ${score>=90?'good':score>=75?'warn':'bad'}">${score}%</span></td><td>${review}</td></tr>`;
  }

  function apply(){
    if(!isEmployee())return;
    const s=historySection();if(!s)return;
    const tbody=s.card.querySelector('tbody');if(!tbody)return;
    const rows=recentAttempts();
    tbody.innerHTML=rows.length?rows.map(rowHtml).join(''):'<tr><td colspan="5" class="muted">За последние 7 дней тренировок не было.</td></tr>';

    let note=s.head.querySelector('[data-sh-history-window]');
    if(!note){
      note=document.createElement('span');
      note.className='muted small';
      note.dataset.shHistoryWindow='1';
      note.textContent='показываем последние 7 дней';
      s.head.appendChild(note);
    }
  }

  function wrap(){
    if(typeof window.renderProgress!=='function'||window.renderProgress.__shHistory7d)return;
    const base=window.renderProgress;
    const wrapped=function(){
      const r=base.apply(this,arguments);
      try{apply()}catch(e){console.warn('SkillHub employee history window skipped',e)}
      return r;
    };
    wrapped.__shHistory7d=true;
    window.renderProgress=wrapped;
  }

  wrap();
  setTimeout(wrap,0);
  setTimeout(wrap,500);

  document.addEventListener('click',ev=>{
    if(!isEmployee())return;
    if(ev.target?.closest?.('.nav-btn[data-page="progress"]'))setTimeout(apply,0);
  },true);

  console.info('SkillHub: employee Progress history limited to last 7 days');
})();
