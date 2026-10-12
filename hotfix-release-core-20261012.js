/* SkillHub release core — 2026-10-12
   Atomic, realtime-assisted application releases.
   Keeps the current working build alive until the next index is fully published.
*/
(function(){
  'use strict';
  if(window.__shReleaseCore20261012)return;
  window.__shReleaseCore20261012=true;

  /* Disable the older timer-based release checker loaded later. */
  window.__shAutoReleaseRefresh=true;

  const KEY='sh_app_release_version';
  const META='meta[name="skillhub-release"]';
  const currentFromPage=()=>String(document.querySelector(META)?.content||'').trim();
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  let applying=false,pending='',releaseChannel=null,dbStarted=false;

  function safeToReload(){
    try{
      const p=String(window.S?.currentPage||'');
      if(p==='run')return false;
      if(document.querySelector('.sh-ai-soft-wrap,.sh-ai-dialog,.monthly-runner,.sh-monthly-runner'))return false;
      const active=document.activeElement;
      if(active&&['INPUT','TEXTAREA','SELECT'].includes(active.tagName)&&String(active.value||'').trim())return false;
    }catch(_){}
    return true;
  }

  async function fetchVersion(){
    try{
      const r=await fetch('./app-version.json?t='+Date.now(),{cache:'no-store'});
      if(!r.ok)return'';
      const j=await r.json();
      return String(j?.version||'').trim();
    }catch(_){return''}
  }

  async function indexReady(version){
    try{
      const r=await fetch('./index.html?release_check='+encodeURIComponent(version)+'&t='+Date.now(),{cache:'no-store'});
      if(!r.ok)return false;
      const html=await r.text();
      const escaped=version.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      return new RegExp('<meta\\s+name=["\\\']skillhub-release["\\\']\\s+content=["\\\']'+escaped+'["\\\']','i').test(html)
        || new RegExp('<meta\\s+content=["\\\']'+escaped+'["\\\']\\s+name=["\\\']skillhub-release["\\\']','i').test(html);
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
    const page=currentFromPage();
    if(page===version){localStorage.setItem(KEY,version);pending='';return}
    pending=version;
    if(!safeToReload())return;
    applying=true;
    try{
      /* Never switch to a half-published release. Keep old build alive until both
         version marker and index marker agree. */
      let ready=false;
      for(let i=0;i<20;i++){
        const [manifest,indexOk]=await Promise.all([fetchVersion(),indexReady(version)]);
        if(manifest===version&&indexOk){ready=true;break}
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
    if(version&&version!==currentFromPage())applyRelease(version);
    else if(version)localStorage.setItem(KEY,version);
  }

  function startDbReleaseChannel(){
    if(dbStarted)return;
    const sb=window.S?.sb;
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
              .then(({data})=>{const v=String(data?.version||'').trim();if(v)applyRelease(v)})
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

  /* DB realtime is primary; a slow manifest poll is only a safety net. */
  setTimeout(()=>{startDbReleaseChannel();checkManifest()},800);
  setInterval(()=>{startDbReleaseChannel();checkManifest()},30000);
  const waitForSb=setInterval(()=>{if(window.S?.sb){clearInterval(waitForSb);startDbReleaseChannel()}},250);

  console.info('SkillHub: atomic realtime release core enabled');
})();
