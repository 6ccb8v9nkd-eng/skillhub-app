/* SkillHub fast release propagation — 2026-10-12
   Complements the existing updater: open clients see new app releases within ~15s,
   and immediately on focus/return to the app.
*/
(function(){
  'use strict';
  if(window.__shFastReleaseCheck20261012)return;
  window.__shFastReleaseCheck20261012=true;

  const KEY='sh_app_release_version';
  let busy=false,reloading=false;

  async function clearCaches(){
    try{
      if('caches'in window){
        const keys=await caches.keys();
        await Promise.all(keys.filter(k=>String(k).startsWith('skillhub-')).map(k=>caches.delete(k)));
      }
    }catch(_){}
    try{
      if('serviceWorker'in navigator){
        const regs=await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r=>r.update().catch(()=>{})));
      }
    }catch(_){}
  }

  async function check(){
    if(busy||reloading||!navigator.onLine)return;
    busy=true;
    try{
      const r=await fetch('./app-version.json?t='+Date.now(),{cache:'no-store'});
      if(!r.ok)return;
      const remote=String((await r.json())?.version||'').trim();
      if(!remote)return;
      const local=localStorage.getItem(KEY)||'';
      if(!local){localStorage.setItem(KEY,remote);return}
      if(local===remote)return;
      reloading=true;
      localStorage.setItem(KEY,remote);
      await clearCaches();
      const u=new URL(location.href);
      u.searchParams.set('appv',remote);
      u.searchParams.set('_refresh',Date.now().toString());
      location.replace(u.toString());
    }catch(e){console.warn('SkillHub fast release check skipped',e)}
    finally{busy=false}
  }

  setTimeout(check,1200);
  setInterval(check,15000);
  window.addEventListener('focus',check);
  window.addEventListener('online',check);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)check()});
  console.info('SkillHub: fast release propagation enabled');
})();
