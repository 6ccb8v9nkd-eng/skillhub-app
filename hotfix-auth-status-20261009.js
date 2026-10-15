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
    try{renderEmployees=wrapped}catch(_){}
  }

  wrapEmployees();
  setTimeout(()=>{wrapEmployees();applyEmployeeAuthStatuses()},0);
  setTimeout(()=>{wrapEmployees();applyEmployeeAuthStatuses()},500);
  console.info('SkillHub: RG authorization statuses enabled');
})();

/* Load stable runtime, wording, auth recovery and atomic release controller. */
(function(){
  try{if(typeof S!=='undefined'&&!window.S)window.S=S}catch(_){}

  if(!document.querySelector('script[data-sh-auth-recovery]')){
    const ar=document.createElement('script');
    ar.src='./hotfix-auth-recovery-20261012.js?v=20261015_1';
    ar.dataset.shAuthRecovery='1';
    document.head.appendChild(ar);
  }
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
    d.src='./hotfix-monthly-results-expanded-20261015.js?v=20261015_2';
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

  function isManagerReady(){
    try{return ['mentor','rs','tech_admin'].includes(String(S?.profile?.role||''))}catch(_){return false}
  }

  function loadStableAssignments(){
    if(!isManagerReady())return false;
    const ready=typeof window.renderAssignments==='function'&&window.renderAssignments.__shStableAssignments===true;
    if(ready)return true;
    const existing=document.querySelector('script[data-sh-instant-assignments]');
    if(existing)return true;
    window.__shAssignmentsStable20261015=false;
    const ia=document.createElement('script');
    ia.src='./hotfix-instant-assignments-20261015.js?v=20261015_2';
    ia.dataset.shInstantAssignments='1';
    ia.addEventListener('error',()=>{
      ia.remove();
      console.error('SkillHub: stable Assignments controller failed to load');
    },{once:true});
    document.head.appendChild(ia);
    return true;
  }
  window.shEnsureStableAssignments=loadStableAssignments;

  try{
    if(typeof window.enterApp==='function'&&!window.enterApp.__shAssignmentsBootstrap){
      const baseEnter=window.enterApp;
      const wrappedEnter=function(){
        const r=baseEnter.apply(this,arguments);
        queueMicrotask(loadStableAssignments);
        setTimeout(loadStableAssignments,150);
        return r;
      };
      wrappedEnter.__shAssignmentsBootstrap=true;
      window.enterApp=wrappedEnter;
      try{enterApp=wrappedEnter}catch(_){}
    }
  }catch(_){}
  setTimeout(loadStableAssignments,0);
  setTimeout(loadStableAssignments,400);
  setTimeout(loadStableAssignments,1200);
  setTimeout(loadStableAssignments,2500);

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

/* Navigation/display integrity guard — navigation-triggered only, no polling or global observer. */
(function(){
  'use strict';
  if(window.__shUiIntegrity20261015)return;
  window.__shUiIntegrity20261015=true;
  const RELEASE='2026.10.15.12';
  const managers=new Set(['mentor','rs','tech_admin']);
  const normal={home:'renderHome',training:'renderTraining',progress:'renderProgress',notifications:'renderNotifications',mentor:'renderMentor',content:'renderContent',employees:'renderEmployees',admin:'renderTechAdmin'};

  function role(){try{return String(S?.profile?.role||'')}catch(_){return''}}
  function pageRoot(name){return document.getElementById('page-'+name)}
  function visible(name){const r=pageRoot(name);return !!r&&!r.classList.contains('hidden')}
  function hasContent(name){const r=pageRoot(name);return !!r&&(r.childElementCount>0||String(r.textContent||'').trim().length>0)}
  function call(name){
    try{
      if(name==='assignments'&&managers.has(role())){
        window.shEnsureStableAssignments?.();
        if(typeof window.renderAssignments==='function'&&window.renderAssignments.__shStableAssignments===true)window.renderAssignments();
        return;
      }
      if(name==='knowledge'){
        if(typeof window.sh842RenderKnowledge==='function')window.sh842RenderKnowledge();
        else if(typeof window.renderKnowledge==='function')window.renderKnowledge();
        return;
      }
      const fn=window[normal[name]];
      if(typeof fn==='function')fn();
    }catch(e){console.error('SkillHub UI recovery failed for '+name,e)}
  }
  function verify(name){
    if(!visible(name))return;
    if(name==='assignments'&&managers.has(role()))window.shEnsureStableAssignments?.();
    if(hasContent(name))return;
    call(name);
    requestAnimationFrame(()=>{
      if(visible(name)&&!hasContent(name)){
        console.error('SkillHub UI integrity: section stayed empty',name);
        const r=pageRoot(name);
        if(r)r.innerHTML='<div class="card"><b>Раздел не отрисовался</b><div class="meta">Обновите данные один раз. Ошибка уже зафиксирована в консоли.</div></div>';
      }
    });
  }

  try{
    const base=window.go;
    if(typeof base==='function'&&!base.__shUiIntegrity){
      const wrapped=function(name){
        const r=base.apply(this,arguments);
        queueMicrotask(()=>verify(String(name||'')));
        return r;
      };
      wrapped.__shUiIntegrity=true;
      window.go=wrapped;
      try{go=wrapped}catch(_){}
    }
  }catch(e){console.warn('SkillHub UI integrity navigation wrapper skipped',e)}

  function setVersion(){
    const labels=[...document.querySelectorAll('#modalCard .sh74-profile-meta small')];
    const label=labels.find(x=>String(x.textContent||'').trim()==='Текущая версия');
    const value=label?.parentElement?.querySelector('b');
    if(value)value.textContent=RELEASE;
  }
  try{
    const baseProfile=window.showProfileEditor;
    if(typeof baseProfile==='function'&&!baseProfile.__shCurrentVersion){
      const wrapped=function(){const r=baseProfile.apply(this,arguments);setVersion();return r};
      wrapped.__shCurrentVersion=true;
      window.showProfileEditor=wrapped;
      try{showProfileEditor=wrapped}catch(_){}
    }
  }catch(e){console.warn('SkillHub profile version patch skipped',e)}

  window.shUiHealthCheck=function(){
    const names=['home','training','knowledge','progress','notifications','mentor','content','assignments','employees','admin'];
    return names.map(name=>({name,dom:!!pageRoot(name),hasContent:hasContent(name),visible:visible(name),renderer:name==='knowledge'?(typeof window.sh842RenderKnowledge==='function'||typeof window.renderKnowledge==='function'):name==='assignments'?typeof window.renderAssignments==='function':typeof window[normal[name]]==='function'}));
  };

  if(document.getElementById('page-'+String(S?.currentPage||'')))queueMicrotask(()=>verify(String(S.currentPage||'')));
  console.info('SkillHub: navigation/display integrity guard enabled');
})();
