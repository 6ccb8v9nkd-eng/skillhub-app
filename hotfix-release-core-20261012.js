/* SkillHub release core — 2026-10-12
   Atomic, realtime-assisted application releases.
   Keeps the current working build alive until the next release is fully published.
*/
(function(){
  'use strict';
  if(window.__shReleaseCore20261012)return;
  window.__shReleaseCore20261012=true;

  /* Disable the older timer-based release checker loaded later. */
  window.__shAutoReleaseRefresh=true;

  const KEY='sh_app_release_version';
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const state=()=>{try{return S}catch(_){return null}};
  const pageVersion=()=>String(new URL(location.href).searchParams.get('appv')||localStorage.getItem(KEY)||'').trim();
  let applying=false,pending='',releaseChannel=null,dbStarted=false;

  function safeToReload(){
    try{
      const p=String(state()?.currentPage||'');
      if(p==='run')return false;
      if(document.querySelector('.sh-ai-soft-wrap,.sh-ai-dialog,.monthly-runner,.sh-monthly-runner'))return false;
      const active=document.activeElement;
      if(active&&['INPUT','TEXTAREA','SELECT'].includes(active.tagName)&&String(active.value||'').trim())return false;
    }catch(_){}
    return true;
  }

  async function fetchJson(path){
    try{
      const r=await fetch(path+(path.includes('?')?'&':'?')+'t='+Date.now(),{cache:'no-store'});
      if(!r.ok)return null;
      return await r.json();
    }catch(_){return null}
  }

  async function fetchVersion(){
    const j=await fetchJson('./app-version.json');
    return String(j?.version||'').trim();
  }

  async function releaseReady(version){
    const ready=await fetchJson('./release-ready.json');
    if(String(ready?.version||'').trim()!==version)return false;
    const assets=Array.isArray(ready?.assets)?ready.assets:[];
    if(!assets.length)return false;
    try{
      const checks=await Promise.all(assets.map(async path=>{
        const sep=String(path).includes('?')?'&':'?';
        const r=await fetch(String(path)+sep+'release_check='+encodeURIComponent(version)+'&t='+Date.now(),{cache:'no-store'});
        return !!r.ok;
      }));
      return checks.every(Boolean);
    }catch(_){return false}
  }

  async function clearRuntimeCaches(){
    try{
      if('caches' in window){
        const keys=await caches.keys();
        await Promise.all(keys.filter(k=>String(k).startsWith('skillhub-')).map(k=>caches.delete(k)));
      }
    }catch(e){console.warn('SkillHub release core: cache cleanup skipped',e)}
    try{
      if('serviceWorker' in navigator){
        const regs=await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r=>r.update().catch(()=>{})));
      }
    }catch(e){console.warn('SkillHub release core: SW update skipped',e)}
  }

  async function applyRelease(version){
    version=String(version||'').trim();
    if(!version||applying)return;
    if(pageVersion()===version){localStorage.setItem(KEY,version);pending='';return}
    pending=version;
    if(!safeToReload())return;
    applying=true;
    try{
      /* The ready marker is published only after every release asset is in place.
         If publication/CDN propagation is incomplete, keep the current build alive. */
      let ready=false;
      for(let i=0;i<24;i++){
        const [manifest,assetsOk]=await Promise.all([fetchVersion(),releaseReady(version)]);
        if(manifest===version&&assetsOk){ready=true;break}
        await sleep(750);
      }
      if(!ready){
        applying=false;
        setTimeout(()=>{if(pending)applyRelease(pending)},5000);
        return;
      }
      try{if(typeof window.toast==='function')window.toast('SkillHub обновляется…')}catch(_){}
      await clearRuntimeCaches();
      localStorage.setItem(KEY,version);
      const u=new URL(location.href);
      u.searchParams.set('appv',version);
      u.searchParams.set('_release',Date.now().toString());
      location.replace(u.toString());
    }catch(e){
      applying=false;
      console.warn('SkillHub release core: apply skipped',e);
      setTimeout(()=>{if(pending)applyRelease(pending)},5000);
    }
  }

  async function checkManifest(){
    if(!navigator.onLine||applying)return;
    const version=await fetchVersion();
    if(!version)return;
    const current=pageVersion();
    /* A brand-new browser has already fetched the current index, so establish
       its baseline without forcing a pointless second reload. */
    if(!current){localStorage.setItem(KEY,version);return}
    if(version!==current)applyRelease(version);
    else localStorage.setItem(KEY,version);
  }

  function startDbReleaseChannel(){
    if(dbStarted)return;
    const sb=state()?.sb;
    if(!sb)return;
    dbStarted=true;
    try{
      releaseChannel=sb.channel('skillhub-release-core-v1')
        .on('postgres_changes',{event:'UPDATE',schema:'public',table:'app_release_state',filter:'id=eq.1'},p=>{
          const version=String(p?.new?.version||'').trim();
          if(version)applyRelease(version);
        })
        .subscribe(status=>{
          if(status==='SUBSCRIBED'){
            sb.from('app_release_state').select('version').eq('id',1).maybeSingle()
              .then(({data})=>{const v=String(data?.version||'').trim();if(v&&v!==pageVersion())applyRelease(v)})
              .catch(()=>{});
          }
          if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){
            dbStarted=false;
            setTimeout(startDbReleaseChannel,1500);
          }
        });
    }catch(e){dbStarted=false;setTimeout(startDbReleaseChannel,1500)}
  }

  /* Re-check a deferred release as soon as the user leaves an active exercise. */
  document.addEventListener('click',()=>{if(pending&&!applying)setTimeout(()=>applyRelease(pending),50)},true);
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)return;
    startDbReleaseChannel();
    if(pending)applyRelease(pending);else checkManifest();
  });
  window.addEventListener('focus',()=>{startDbReleaseChannel();if(pending)applyRelease(pending);else checkManifest()});
  window.addEventListener('online',()=>{startDbReleaseChannel();if(pending)applyRelease(pending);else checkManifest()});

  /* DB realtime is primary; polling is only a fallback if realtime is unavailable. */
  setTimeout(()=>{startDbReleaseChannel();checkManifest()},800);
  setInterval(()=>{startDbReleaseChannel();checkManifest()},30000);
  const waitForSb=setInterval(()=>{if(state()?.sb){clearInterval(waitForSb);startDbReleaseChannel()}},250);

  console.info('SkillHub: atomic realtime release core enabled');
})();