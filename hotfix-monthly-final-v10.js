/* SkillHub monthly final guard v10 — 2026-10-09 */
(function(){
  'use strict';
  if(window.__shMonthlyFinalV10)return;window.__shMonthlyFinalV10=true;

  const KEY='sh_monthly_return_v10';
  let good=null,loading=false;

  function mark(){try{localStorage.setItem(KEY,String(Date.now()))}catch(_){}}
  function pending(){try{const t=Number(localStorage.getItem(KEY)||0);return t&&Date.now()-t<60000}catch(_){return false}}
  function clear(){try{localStorage.removeItem(KEY)}catch(_){}}
  function restorePage(){
    if(!pending()||!window.S?.profile||typeof window.go!=='function')return;
    try{
      window.go('assignments');
      setTimeout(()=>window.shAssignmentsOpen?.('monthly'),30);
      setTimeout(()=>window.shAssignmentsOpen?.('monthly'),220);
      setTimeout(clear,2200);
    }catch(e){console.warn('SkillHub monthly v10 restore failed',e)}
  }

  function wrapAction(fn){
    if(typeof fn!=='function')return fn;
    if(fn.__shMonthlyV10Wrapped)return fn;
    const w=async function(){mark();return await fn.apply(this,arguments)};
    w.__shMonthlyV10Wrapped=true;w.__shMonthlyV10Base=fn;return w;
  }

  function capture(){
    if(typeof window.shMonthlyOpenAssign!=='function'||typeof window.shAssessAssign!=='function')return false;
    good={
      openAssign:window.shMonthlyOpenAssign,
      createDraft:window.shMonthlyCreateDraft,
      createAndAssign:window.shMonthlyCreateAndAssign,
      assessAssign:wrapAction(window.shAssessAssign)
    };
    window.shAssessAssign=good.assessAssign;
    window.shMonthlyAssign=good.assessAssign;
    return true;
  }

  function enforce(){
    if(good){
      window.shMonthlyOpenAssign=good.openAssign;
      if(good.createDraft)window.shMonthlyCreateDraft=good.createDraft;
      if(good.createAndAssign)window.shMonthlyCreateAndAssign=good.createAndAssign;
      window.shAssessAssign=good.assessAssign;
      window.shMonthlyAssign=good.assessAssign;
    }
    ['shMonthlyRevokeOne','shMonthlyRevokeAll'].forEach(n=>{
      const fn=window[n];if(typeof fn==='function'&&!fn.__shMonthlyV10Wrapped)window[n]=wrapAction(fn);
    });
    restorePage();
  }

  function reloadConstructor(){
    if(loading)return;loading=true;
    try{window.__shMonthlyAssessmentV5=false}catch(_){ }
    const old=document.getElementById('shMonthlyAssessmentV10Reload');if(old)old.remove();
    const s=document.createElement('script');s.id='shMonthlyAssessmentV10Reload';s.src='./hotfix-monthly-assessment-v5.js?v=10';
    s.onload=()=>{loading=false;capture();enforce()};
    s.onerror=()=>{loading=false};
    document.head.appendChild(s);
  }

  // Wait until all older dynamically loaded monthly scripts have finished, then make v5 authoritative.
  setTimeout(reloadConstructor,1800);
  setTimeout(reloadConstructor,4200);
  setInterval(enforce,300);
  window.addEventListener('load',()=>setTimeout(restorePage,100));
  window.addEventListener('pageshow',()=>setTimeout(restorePage,100));
  console.info('SkillHub: monthly final guard v10 enabled');
})();
