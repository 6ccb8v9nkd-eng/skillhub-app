/* SkillHub RG visibility for AI Soft dialogue results — 2026-10-09 */
(function(){
  'use strict';
  const baseOpen=window.openUserAttempts;
  if(typeof baseOpen!=='function')return;
  const arr=x=>Array.isArray(x)?x:[];
  const canView=()=>['mentor','rs','tech_admin'].includes(S?.profile?.role);
  function list(title,rows,cls=''){
    rows=arr(rows).filter(Boolean);if(!rows.length)return'';
    return `<div class="sh-rg-ai-block ${cls}"><b>${esc(title)}</b><ul>${rows.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`;
  }
  function item(row){
    const r=row.review||{},neg=String(r.negativeResult||''),cls=neg==='снижен'?'good':neg==='частично снижен'?'warn':neg==='усилен'?'bad':'warn';
    return `<div class="sh-rg-ai-item"><div class="sh-rg-ai-head"><div><b>${esc(row.scenario?.title||row.scenario?.theme||'Работа с негативом')}</b><div class="meta">${new Date(row.completed_at||row.created_at).toLocaleString('ru-RU')}</div></div><span class="pill ${cls}">${esc(neg||'разбор ИИ')}</span></div><div class="sh-rg-ai-summary">${esc(r.summary||'')}</div><details><summary>Ответы и полный разбор</summary><div class="sh-rg-ai-body">${row.scenario?.situation?`<div class="sh-rg-ai-block"><b>Ситуация</b><p>${esc(row.scenario.situation)}</p></div>`:''}<div class="sh-rg-ai-chat">${arr(row.transcript).map(m=>`<div class="sh-rg-ai-msg ${m.role==='employee'?'employee':'client'}"><b>${m.role==='employee'?'Сотрудник':'Клиент'}</b><div>${esc(m.content||'')}</div></div>`).join('')}</div>${list('Сильные стороны',r.strengths,'good')}${list('Что улучшить',r.improvements,'warn')}${r.keyMoment?`<div class="sh-rg-ai-block"><b>Ключевой момент</b><p>${esc(r.keyMoment)}</p></div>`:''}${r.betterApproach?`<div class="sh-rg-ai-block"><b>Как можно было сильнее</b><p>${esc(r.betterApproach)}</p></div>`:''}${r.nextFocus?`<div class="sh-rg-ai-block"><b>Что тренировать дальше</b><p>${esc(r.nextFocus)}</p></div>`:''}</div></details></div>`;
  }
  async function inject(login){
    if(!canView()||!login)return;
    try{
      const {data,error}=await S.sb.from('soft_ai_sessions').select('id,login,created_at,completed_at,scenario,transcript,review').eq('login',login).order('completed_at',{ascending:false}).limit(20);
      if(error||!data?.length)return;
      const card=$('modalCard');if(!card||card.querySelector('.sh-rg-ai-section'))return;
      const el=document.createElement('div');el.className='sh-rg-ai-section';el.innerHTML=`<div class="sh74-section-head"><h2>ИИ-диалоги Soft</h2><span class="meta">${data.length} последних прохождений</span></div><div class="sh-rg-ai-list">${data.map(item).join('')}</div>`;card.appendChild(el);
    }catch(e){console.warn('SkillHub: AI dialogue results unavailable',e)}
  }
  window.openUserAttempts=function(login){const r=baseOpen.apply(this,arguments);setTimeout(()=>inject(login),30);return r};
  const s=document.createElement('style');s.textContent=`.sh-rg-ai-section{margin-top:18px}.sh-rg-ai-list{display:grid;gap:10px}.sh-rg-ai-item{border:1px solid var(--line);border-radius:14px;padding:13px;background:var(--panel)}.sh-rg-ai-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.sh-rg-ai-summary{margin-top:8px;line-height:1.42}.sh-rg-ai-item details{margin-top:10px}.sh-rg-ai-item summary{cursor:pointer;font-weight:800;color:var(--primary)}.sh-rg-ai-body{display:grid;gap:9px;padding-top:10px}.sh-rg-ai-block{padding:10px 11px;border:1px solid var(--line);border-radius:11px}.sh-rg-ai-block p{margin:5px 0 0;line-height:1.42}.sh-rg-ai-block ul{margin:6px 0 0;padding-left:18px}.sh-rg-ai-chat{display:grid;gap:7px}.sh-rg-ai-msg{padding:9px 10px;border-radius:10px;border:1px solid var(--line)}.sh-rg-ai-msg b{font-size:12px;color:var(--muted)}.sh-rg-ai-msg div{margin-top:3px;line-height:1.4}.sh-rg-ai-msg.employee{margin-left:22px}.sh-rg-ai-msg.client{margin-right:22px}@media(max-width:620px){.sh-rg-ai-msg.employee{margin-left:10px}.sh-rg-ai-msg.client{margin-right:10px}}`;document.head.appendChild(s);
  console.info('SkillHub: RG AI dialogue result visibility enabled');
})();

(function(){
  const old=document.getElementById('shMonthlyRevokeLoader');if(old)old.remove();
  const s=document.createElement('script');
  s.id='shMonthlyRevokeLoader';
  s.src='./hotfix-monthly-revoke-20261009-v3.js?v=4';
  s.onload=()=>{
    const prev=document.getElementById('shMonthlyAssessmentV5Loader');if(prev)prev.remove();
    const n=document.createElement('script');
    n.id='shMonthlyAssessmentV5Loader';
    n.src='./hotfix-monthly-assessment-v5.js?v=1';
    n.onload=()=>{
      const oldFix=document.getElementById('shMonthlyMobileLayoutV6Loader');if(oldFix)oldFix.remove();
      const f=document.createElement('script');
      f.id='shMonthlyMobileLayoutV6Loader';
      f.src='./hotfix-monthly-mobile-layout-v6.js?v=1';
      document.head.appendChild(f);
    };
    document.head.appendChild(n);
  };
  document.head.appendChild(s);
})();