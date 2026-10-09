/* SkillHub monthly assessment: stay in Assignments after save/revoke — 2026-10-09 v8 */
(function(){
  'use strict';
  if(window.__shMonthlyStaySectionV8)return;window.__shMonthlyStaySectionV8=true;
  const KEY='sh_after_monthly_action_page';
  const WANT='assignments';

  function mark(){try{sessionStorage.setItem(KEY,WANT)}catch(e){}}
  function pending(){try{return sessionStorage.getItem(KEY)===WANT}catch(e){return false}}
  function clear(){try{sessionStorage.removeItem(KEY)}catch(e){}}
  function restore(){
    if(!pending())return false;
    if(typeof window.go!=='function'||!window.S?.profile)return false;
    try{
      window.go('assignments');
      // Keep the marker briefly: some startup renders can still call go('mentor') afterwards.
      setTimeout(()=>{if(window.S?.currentPage==='assignments')clear()},1200);
      return true;
    }catch(e){console.warn('SkillHub: restore assignments page failed',e);return false}
  }

  // Restore repeatedly through the whole auth/startup window, not only the first 4 seconds.
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(pending())restore();
    if(!pending()||tries>300)clearInterval(timer);
  },100);
  window.addEventListener('pageshow',()=>setTimeout(restore,0));
  window.addEventListener('load',()=>setTimeout(restore,0));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(restore,0)});

  // If app startup itself routes managers to "Моя группа", force the pending return afterwards.
  const baseEnter=window.enterApp;
  if(typeof baseEnter==='function'&&!baseEnter.__shMonthlyStayWrapped){
    const wrappedEnter=function(){const r=baseEnter.apply(this,arguments);if(pending())setTimeout(restore,0);return r};
    wrappedEnter.__shMonthlyStayWrapped=true;window.enterApp=wrappedEnter;
  }

  function wrap(name){
    const base=window[name];
    if(typeof base!=='function'||base.__shMonthlyStayWrapped)return false;
    const wrapped=async function(){
      mark();
      try{return await base.apply(this,arguments)}catch(err){clear();throw err}
    };
    wrapped.__shMonthlyStayWrapped=true;
    window[name]=wrapped;
    return true;
  }

  function wrapAll(){
    wrap('shAssessAssign');
    if(window.shAssessAssign)window.shMonthlyAssign=window.shAssessAssign;
    wrap('shMonthlyRevokeOne');
    wrap('shMonthlyRevokeAll');
    return !!(window.shAssessAssign&&window.shMonthlyRevokeOne&&window.shMonthlyRevokeAll);
  }
  if(!wrapAll()){
    let w=0;const wt=setInterval(()=>{w++;if(wrapAll()||w>100)clearInterval(wt)},100);
  }
  console.info('SkillHub: monthly actions keep Assignments page v8 enabled');
})();
