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

/* Load one final runtime layer for critical pages and realtime.
   It replaces the temporary RG-only recovery loader. */
(function(){
  if(document.querySelector('script[data-sh-runtime-stability]'))return;
  const s=document.createElement('script');
  s.src='./hotfix-runtime-stability-20261012.js?v=20261012_1';
  s.dataset.shRuntimeStability='1';
  document.head.appendChild(s);
})();
