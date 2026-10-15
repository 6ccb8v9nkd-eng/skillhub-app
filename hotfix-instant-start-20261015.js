/* SkillHub instant startup + quiet background sync — 2026-10-15
   - paints the last good local snapshot immediately;
   - keeps one authoritative cloud refresh on login/manual refresh;
   - suppresses the legacy full-database 60s refresh loop while realtime is active.
   No business rules or cloud records are changed.
*/
(function(){
  'use strict';
  if(window.__shInstantStart20261015)return;
  window.__shInstantStart20261015=true;

  const base=window.syncAll;
  if(typeof base!=='function')return;
  const AUTO_REFRESH_MS=10*60*1000;
  let hydratedFor='';
  let cloudLogin='';
  let lastCloudSync=0;
  let inFlight=null;

  function ownNotifications(rows,login){return (Array.isArray(rows)?rows:[]).filter(x=>String(x?.login||'')===login)}
  function currentLogin(){return String(window.S?.profile?.login||'')}

  function hydrate(){
    const login=currentLogin();
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

  function runCloud(manual,args,ctx){
    const login=currentLogin();
    if(login!==cloudLogin){cloudLogin=login;lastCloudSync=0;inFlight=null}
    if(inFlight)return inFlight;
    const now=Date.now();
    if(!manual&&lastCloudSync&&now-lastCloudSync<AUTO_REFRESH_MS)return Promise.resolve(true);
    lastCloudSync=now;
    try{
      const result=base.apply(ctx,args);
      inFlight=Promise.resolve(result).then(v=>{
        if(v===false)lastCloudSync=0;
        return v;
      },e=>{lastCloudSync=0;throw e}).finally(()=>{inFlight=null});
      return inFlight;
    }catch(e){lastCloudSync=0;inFlight=null;throw e}
  }

  window.syncAll=function(manual=false){
    if(manual!==true)hydrate();
    return runCloud(manual===true,arguments,this);
  };

  window.addEventListener('offline',()=>{lastCloudSync=0});
  console.info('SkillHub: instant cached startup + quiet background sync enabled');
})();
