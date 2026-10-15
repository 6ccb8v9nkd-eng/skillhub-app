/* SkillHub instant startup — 2026-10-15
   Show the last good local snapshot immediately, then refresh from Supabase in background.
   No business rules or stored cloud data are changed.
*/
(function(){
  'use strict';
  if(window.__shInstantStart20261015)return;
  window.__shInstantStart20261015=true;

  const base=window.syncAll;
  if(typeof base!=='function')return;
  let hydratedFor='';

  function ownNotifications(rows,login){return (Array.isArray(rows)?rows:[]).filter(x=>String(x?.login||'')===login)}
  function hydrate(){
    const login=String(window.S?.profile?.login||'');
    if(!login||hydratedFor===login)return false;
    hydratedFor=login;
    let cached=null;
    try{cached=JSON.parse(localStorage.getItem('sh7_cache_'+login)||'null')}catch(_){}
    if(!cached||typeof cached!=='object')return false;
    try{
      if(Array.isArray(cached.content))S.content=cached.content;
      if(Array.isArray(cached.assignments))S.assignments=cached.assignments;
      if(Array.isArray(cached.attempts))S.attempts=cached.attempts;
      if(Array.isArray(cached.manualAnswers))S.manualAnswers=cached.manualAnswers;
      if(Array.isArray(cached.allowed))S.allowed=cached.allowed;
      if(Array.isArray(cached.profiles))S.profiles=cached.profiles;
      S.notifications=ownNotifications(cached.notifications,login);
      requestAnimationFrame(()=>{
        try{window.renderUnread?.()}catch(_){}
        try{window.renderCurrent?.()}catch(_){}
      });
      return true;
    }catch(e){console.warn('SkillHub instant cache skipped',e);return false}
  }

  window.syncAll=function(manual=false){
    if(manual!==true)hydrate();
    return base.apply(this,arguments);
  };
  console.info('SkillHub: instant cached startup enabled');
})();
