/* SkillHub monthly assessment: stay in Assignments after save — 2026-10-09 v7 */
(function(){
  'use strict';
  if(window.__shMonthlyStaySectionV7)return;window.__shMonthlyStaySectionV7=true;
  const KEY='sh_after_monthly_assign_page';

  function restore(){
    if(sessionStorage.getItem(KEY)!=='assignments')return false;
    if(typeof window.go!=='function'||!window.S?.profile)return false;
    sessionStorage.removeItem(KEY);
    try{window.go('assignments');}catch(e){console.warn('SkillHub: restore assignments page failed',e)}
    return true;
  }

  if(!restore()){
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      if(restore()||tries>40)clearInterval(timer);
    },100);
  }

  const wrap=()=>{
    const base=window.shAssessAssign;
    if(typeof base!=='function'||base.__shStayWrapped)return false;
    const wrapped=async function(){
      sessionStorage.setItem(KEY,'assignments');
      const cleanup=setTimeout(()=>sessionStorage.removeItem(KEY),5000);
      try{return await base.apply(this,arguments)}finally{clearTimeout(cleanup);setTimeout(()=>sessionStorage.removeItem(KEY),4500)}
    };
    wrapped.__shStayWrapped=true;
    window.shAssessAssign=wrapped;
    window.shMonthlyAssign=wrapped;
    return true;
  };
  if(!wrap())setTimeout(wrap,150);
  console.info('SkillHub: monthly assignment keeps Assignments page v7 enabled');
})();
