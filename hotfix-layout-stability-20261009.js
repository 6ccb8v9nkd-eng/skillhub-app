/* SkillHub layout stability polish — 2026-10-09
   Reduces visible layout jumps on initial load, manual refresh, new assignments,
   and async monthly-assessment cards. UI-only; business logic is unchanged.
*/
(function(){
  'use strict';
  if(window.__shLayoutStability20261009)return;
  window.__shLayoutStability20261009=true;

  let syncDepth=0;
  let renderWrapped=false;

  function pageNow(){
    try{return document.getElementById('page-'+String(S?.currentPage||'home'))}catch(_){return null}
  }

  function hydrateCacheOnce(){
    try{
      if(!S?.profile?.login||S.__shCacheHydrated)return;
      const raw=localStorage.getItem('sh7_cache_'+S.profile.login);
      if(!raw){S.__shCacheHydrated=true;return}
      const c=JSON.parse(raw);
      if(c&&typeof c==='object'){
        if(Array.isArray(c.content))S.content=c.content;
        if(Array.isArray(c.assignments))S.assignments=c.assignments;
        if(Array.isArray(c.attempts))S.attempts=c.attempts;
        if(Array.isArray(c.notifications))S.notifications=c.notifications;
        if(Array.isArray(c.manualAnswers))S.manualAnswers=c.manualAnswers;
        if(Array.isArray(c.allowed))S.allowed=c.allowed;
        if(Array.isArray(c.profiles))S.profiles=c.profiles;
      }
      S.__shCacheHydrated=true;
    }catch(e){console.warn('SkillHub layout cache hydrate skipped',e)}
  }

  const baseEnterApp=window.enterApp;
  if(typeof baseEnterApp==='function'){
    window.enterApp=function(){
      hydrateCacheOnce();
      return baseEnterApp.apply(this,arguments);
    };
  }

  function wrapRenderCurrent(){
    if(renderWrapped||typeof window.renderCurrent!=='function')return;
    const base=window.renderCurrent;
    window.renderCurrent=function(){
      const page=pageNow();
      if(!syncDepth||!page||page.classList.contains('hidden'))return base.apply(this,arguments);

      page.classList.add('sh-layout-swap');
      page.style.opacity='0';
      const out=base.apply(this,arguments);
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        page.classList.add('sh-layout-swap-in');
        page.style.opacity='1';
        setTimeout(()=>{
          page.classList.remove('sh-layout-swap','sh-layout-swap-in');
          page.style.removeProperty('opacity');
        },180);
      }));
      return out;
    };
    renderWrapped=true;
  }
  wrapRenderCurrent();
  setTimeout(wrapRenderCurrent,0);
  setTimeout(wrapRenderCurrent,500);

  const baseSync=window.syncAll;
  if(typeof baseSync==='function'){
    window.syncAll=async function(){
      syncDepth++;
      try{return await baseSync.apply(this,arguments)}
      finally{
        // The fast manual refresh schedules renderCurrent() on the next animation frame.
        // Keep the smoothing flag alive long enough for that frame too.
        setTimeout(()=>{syncDepth=Math.max(0,syncDepth-1)},90);
        try{window.dispatchEvent(new CustomEvent('sh:sync-complete'))}catch(_){ }
      }
    };
  }

  function animateExpansion(node){
    if(!node||node.dataset.shLayoutAnimated)return;
    setTimeout(()=>{
      if(!node.isConnected||node.style.display==='none'||node.dataset.shLayoutAnimated)return;
      const visible=[...node.querySelectorAll('.shmc-employee')].some(x=>x.style.display!=='none');
      if(!visible)return;
      node.dataset.shLayoutAnimated='1';
      const h=node.scrollHeight;
      if(!h)return;
      node.style.overflow='hidden';
      node.style.height='0px';
      node.style.opacity='0';
      node.style.transform='translateY(-6px)';
      requestAnimationFrame(()=>{
        node.style.transition='height .24s ease, opacity .18s ease, transform .24s ease';
        node.style.height=h+'px';
        node.style.opacity='1';
        node.style.transform='translateY(0)';
        setTimeout(()=>{
          if(!node.isConnected)return;
          node.style.removeProperty('height');
          node.style.removeProperty('overflow');
          node.style.removeProperty('opacity');
          node.style.removeProperty('transform');
          node.style.removeProperty('transition');
        },280);
      });
    },35);
  }

  const home=document.getElementById('page-home');
  if(home){
    const obs=new MutationObserver(muts=>{
      for(const m of muts){
        for(const n of m.addedNodes||[]){
          if(!(n instanceof Element))continue;
          if(n.matches?.('[data-sh-monthly-clean-employee]'))animateExpansion(n);
          n.querySelectorAll?.('[data-sh-monthly-clean-employee]').forEach(animateExpansion);
        }
      }
    });
    obs.observe(home,{childList:true,subtree:true});
  }

  const st=document.createElement('style');
  st.id='shLayoutStabilityStyle';
  st.textContent=`
    .page.sh-layout-swap-in{transition:opacity .16s ease-out!important}
    #toast:not(.hidden){animation:shToastSoftIn .18s ease-out both}
    @keyframes shToastSoftIn{from{opacity:0;transform:translateY(8px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
    @media (prefers-reduced-motion:reduce){
      .page.sh-layout-swap-in{transition:none!important}
      #toast:not(.hidden){animation:none!important}
    }
  `;
  document.head.appendChild(st);

  console.info('SkillHub: layout stability polish enabled');
})();
