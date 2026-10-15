/* SkillHub RG employee authorization status — 2026-10-09
   Display only: does not change active/claimed flags or access rules.
*/
(function(){
  'use strict';

  function applyEmployeeAuthStatuses(){
    try{
      if(S?.profile?.role!=='mentor')return;
      const users=typeof employeeListForAdmin==='function'?employeeListForAdmin():[];
      const rows=[...document.querySelectorAll('#employeeRows > .employee-row')];
      rows.forEach((row,i)=>{
        const u=users[i];if(!u)return;
        const pill=row.querySelector('.actions .pill');if(!pill)return;
        pill.classList.remove('good','warn','bad');
        if(!u.active){pill.textContent='Доступ отключён';pill.classList.add('bad');return}
        if(!u.claimed_user_id){pill.textContent='Не авторизован';pill.classList.add('warn');return}
        pill.textContent='Активен';pill.classList.add('good');
      });
    }catch(e){console.warn('SkillHub auth status patch skipped',e)}
  }

  function wrapEmployees(){
    if(typeof window.renderEmployees!=='function'||window.renderEmployees.__shAuthStatus)return;
    const base=window.renderEmployees;
    const wrapped=function(){const r=base.apply(this,arguments);applyEmployeeAuthStatuses();return r};
    wrapped.__shAuthStatus=true;
    window.renderEmployees=wrapped;
  }

  wrapEmployees();
  setTimeout(()=>{wrapEmployees();applyEmployeeAuthStatuses()},0);
  setTimeout(()=>{wrapEmployees();applyEmployeeAuthStatuses()},500);
  console.info('SkillHub: RG authorization statuses enabled');
})();

/* Load stable runtime, wording and atomic release controller. */
(function(){
  try{if(typeof S!=='undefined'&&!window.S)window.S=S}catch(_){}

  if(!document.querySelector('script[data-sh-runtime-stability]')){
    const s=document.createElement('script');
    s.src='./hotfix-runtime-stability-v3-20261012.js?v=20261012_1';
    s.dataset.shRuntimeStability='1';
    document.head.appendChild(s);
  }
  if(!document.querySelector('script[data-sh-training-terminology]')){
    const t=document.createElement('script');
    t.src='./hotfix-training-terminology-20261012.js?v=20261013_1';
    t.dataset.shTrainingTerminology='1';
    document.head.appendChild(t);
  }
  if(!document.querySelector('script[data-sh-release-core]')){
    const r=document.createElement('script');
    r.src='./hotfix-release-core-20261012.js?v=20261012_1';
    r.dataset.shReleaseCore='1';
    document.head.appendChild(r);
  }
  if(!document.querySelector('script[data-sh-rg-top-actions]')){
    const c=document.createElement('script');
    c.src='./hotfix-rg-top-actions-20261014.js?v=20261014_1';
    c.dataset.shRgTopActions='1';
    document.head.appendChild(c);
  }
  if(!document.querySelector('script[data-sh-monthly-ai-chat-ux]')){
    const u=document.createElement('script');
    u.src='./hotfix-monthly-ai-chat-ux-20261015.js?v=20261015_1';
    u.dataset.shMonthlyAiChatUx='1';
    document.head.appendChild(u);
  }
  if(!document.querySelector('script[data-sh-monthly-expanded-results]')){
    const d=document.createElement('script');
    d.src='./hotfix-monthly-results-expanded-20261015.js?v=20261015_1';
    d.dataset.shMonthlyExpandedResults='1';
    document.head.appendChild(d);
  }
  if(!document.querySelector('script[data-sh-monthly-manual-integrity]')){
    const m=document.createElement('script');
    m.src='./hotfix-monthly-manual-integrity-20261015.js?v=20261015_1';
    m.dataset.shMonthlyManualIntegrity='1';
    document.head.appendChild(m);
  }
  if(!document.querySelector('script[data-sh-monthly-assignment-stable]')){
    const ms=document.createElement('script');
    ms.src='./hotfix-monthly-assignment-stable-20261015.js?v=20261015_4';
    ms.dataset.shMonthlyAssignmentStable='1';
    document.head.appendChild(ms);
  }

  function loadAssignmentRecipients(){
    if(document.querySelector('script[data-sh-assignment-recipients]'))return;
    const p=document.createElement('script');
    p.src='./hotfix-assignment-recipients-20261013.js?v=20261013_1';
    p.dataset.shAssignmentRecipients='1';
    document.head.appendChild(p);
  }

  /* Assignment UI must be the final manager override, after legacy parser scripts. */
  function loadAssignmentCompose(){
    if(document.querySelector('script[data-sh-assignment-compose]')){loadAssignmentRecipients();return}
    const a=document.createElement('script');
    a.src='./hotfix-assignment-compose-20261013.js?v=20261013_1';
    a.dataset.shAssignmentCompose='1';
    a.addEventListener('load',loadAssignmentRecipients,{once:true});
    document.head.appendChild(a);
  }
  if(document.readyState==='complete')setTimeout(loadAssignmentCompose,0);
  else window.addEventListener('load',loadAssignmentCompose,{once:true});
})();
