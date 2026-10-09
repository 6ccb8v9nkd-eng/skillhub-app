/* SkillHub employee Home no-flash gate — 2026-10-09
   Purpose:
   - never paint an already-viewed final assessment card on Home;
   - avoid the initial Home layout jump when fresh assignments/assessment data arrive;
   - do not animate or re-insert assessment blocks.
   UI/data-loading coordination only; scoring and assessment logic are unchanged.
*/
(function(){
  'use strict';
  if(window.__shHomeNoFlash20261009)return;
  window.__shHomeNoFlash20261009=true;

  const viewed=new Set();
  let stateReady=false;
  let visibleMonthlyExpected=false;
  let statePromise=null;
  let gateActive=false;
  let initialSyncFinished=false;
  let releaseTimer=0;

  function st(){try{return typeof S!=='undefined'?S:null}catch(_){return null}}
  function isEmployee(){return String(st()?.profile?.role||'')==='employee'}
  function login(){return String(st()?.profile?.login||'')}
  function localViewed(checkId){
    const l=login();if(!l||!checkId)return false;
    try{return localStorage.getItem(`shmc_feedback_viewed:${l}:${checkId}`)==='1'}catch(_){return false}
  }
  function checkIdFromButton(btn){
    const src=String(btn?.getAttribute?.('onclick')||'');
    return src.match(/shMonthlyStart\(['\"]([^'\"]+)['\"]\)/)?.[1]||'';
  }
  function isViewed(checkId){return viewed.has(String(checkId))||localViewed(checkId)}

  function classifyMonthlySection(section){
    if(!section||!stateReady)return;
    let visible=0;
    section.querySelectorAll('.shmc-employee').forEach(card=>{
      const btn=card.querySelector('button[onclick*="shMonthlyStart"]');
      const id=checkIdFromButton(btn);
      const completed=String(btn?.textContent||'').trim()==='Посмотреть результат';
      const hide=!!(completed&&id&&isViewed(id));
      card.style.display=hide?'none':'';
      if(!hide)visible++;
    });
    section.dataset.shNoFlashReady='1';
    section.style.display=visible?'':'none';
  }

  function classifyAll(){
    document.querySelectorAll('#page-home [data-sh-monthly-clean-employee]').forEach(classifyMonthlySection);
  }

  async function loadMonthlyState(force=false){
    if(!isEmployee())return;
    if(statePromise&&!force)return statePromise;
    const A=st(),l=login();if(!A?.sb||!l)return;
    stateReady=false;
    statePromise=(async()=>{
      try{
        const [cq,rq]=await Promise.all([
          A.sb.from('monthly_checks').select('id,status,recipients').contains('recipients',[l]).in('status',['assigned','closed']).order('created_at',{ascending:false}).limit(12),
          A.sb.from('monthly_check_runs').select('check_id,status,breakdown').eq('login',l)
        ]);
        if(cq.error)throw cq.error;if(rq.error)throw rq.error;
        viewed.clear();
        const runs=rq.data||[];
        const byCheck=new Map(runs.map(r=>[String(r.check_id),r]));
        runs.forEach(r=>{if(r?.breakdown?.feedback_viewed_at)viewed.add(String(r.check_id))});
        visibleMonthlyExpected=(cq.data||[]).some(c=>{
          const r=byCheck.get(String(c.id));
          return !(r?.status==='completed'&&isViewed(c.id));
        });
      }catch(e){
        console.warn('SkillHub no-flash: monthly state preload unavailable',e);
        visibleMonthlyExpected=false;
      }finally{
        stateReady=true;
        classifyAll();
      }
    })();
    try{await statePromise}finally{statePromise=null}
  }

  function showGate(){
    if(!isEmployee())return;
    gateActive=true;initialSyncFinished=false;
    document.body.classList.add('sh-home-initial-gate');
    let loader=document.getElementById('shHomeStableLoader');
    if(!loader){
      loader=document.createElement('div');
      loader.id='shHomeStableLoader';
      loader.innerHTML='<span></span><b>Загружаем актуальные данные…</b>';
      const main=document.querySelector('.main');
      const home=document.getElementById('page-home');
      if(main&&home)main.insertBefore(loader,home);
    }
    void loadMonthlyState(true);
  }

  function waitForMonthlyMount(maxMs=1200){
    if(!visibleMonthlyExpected)return Promise.resolve();
    const ready=()=>!!document.querySelector('#page-home [data-sh-monthly-clean-employee][data-sh-no-flash-ready="1"]');
    if(ready())return Promise.resolve();
    return new Promise(resolve=>{
      let done=false;
      const finish=()=>{if(done)return;done=true;obs.disconnect();clearTimeout(t);resolve()};
      const home=document.getElementById('page-home');
      const obs=new MutationObserver(()=>{classifyAll();if(ready())finish()});
      if(home)obs.observe(home,{childList:true,subtree:true});
      const t=setTimeout(finish,maxMs);
    });
  }

  async function releaseGateWhenReady(){
    if(!gateActive||!initialSyncFinished)return;
    try{
      if(statePromise)await statePromise;else if(!stateReady)await loadMonthlyState();
      classifyAll();
      await waitForMonthlyMount();
      classifyAll();
    }finally{
      clearTimeout(releaseTimer);
      releaseTimer=setTimeout(()=>{
        gateActive=false;
        document.body.classList.remove('sh-home-initial-gate');
        document.getElementById('shHomeStableLoader')?.remove();
      },0);
    }
  }

  const home=document.getElementById('page-home');
  if(home){
    const obs=new MutationObserver(muts=>{
      // MutationObserver runs before browser paint: classify/hide viewed cards synchronously.
      for(const m of muts){
        for(const n of m.addedNodes||[]){
          if(!(n instanceof Element))continue;
          if(n.matches?.('[data-sh-monthly-clean-employee]'))classifyMonthlySection(n);
          n.querySelectorAll?.('[data-sh-monthly-clean-employee]').forEach(classifyMonthlySection);
        }
      }
    });
    obs.observe(home,{childList:true,subtree:true});
  }

  // Feedback may be marked by the archive module after this file loaded.
  document.addEventListener('click',ev=>{
    const btn=ev.target?.closest?.('#page-home .shmc-employee button[onclick*="shMonthlyStart"]');
    if(!btn||String(btn.textContent||'').trim()!=='Посмотреть результат')return;
    const id=checkIdFromButton(btn);if(!id)return;
    viewed.add(String(id));
    // The archive module writes localStorage in the same click turn; hide after it gets that chance.
    queueMicrotask(classifyAll);
  },false);

  const baseEnter=window.enterApp;
  if(typeof baseEnter==='function'){
    window.enterApp=function(){
      // Gate BEFORE the first Home paint. Fresh assignments are then present on the first visible frame.
      if(String(st()?.profile?.role||'')==='employee')showGate();
      return baseEnter.apply(this,arguments);
    };
  }

  const baseSync=window.syncAll;
  if(typeof baseSync==='function'){
    window.syncAll=async function(manual=false){
      const r=await baseSync.apply(this,arguments);
      if(gateActive&&manual!==true){
        initialSyncFinished=true;
        void releaseGateWhenReady();
      }else if(manual===true&&isEmployee()){
        // Manual refresh: refresh the hidden/viewed map, but never animate the page.
        void loadMonthlyState(true);
      }
      return r;
    };
  }

  // If the script arrives after an already-restored employee session, prepare state immediately.
  if(isEmployee())void loadMonthlyState(true);

  const style=document.createElement('style');
  style.id='shHomeNoFlashStyle';
  style.textContent=`
    /* A monthly block is never paintable until it has been classified. */
    #page-home [data-sh-monthly-clean-employee]:not([data-sh-no-flash-ready="1"]){display:none!important}

    /* Initial login/open: show one stable loader, not stale Home followed by a jumping Home. */
    body.sh-home-initial-gate #page-home{visibility:hidden!important;pointer-events:none!important}
    #shHomeStableLoader{display:none;min-height:180px;align-items:center;justify-content:center;gap:10px;color:var(--muted);font-size:13px}
    body.sh-home-initial-gate #shHomeStableLoader{display:flex}
    #shHomeStableLoader span{width:18px;height:18px;border:2px solid var(--line);border-top-color:var(--primary);border-radius:50%;animation:shHomeStableSpin .75s linear infinite}
    @keyframes shHomeStableSpin{to{transform:rotate(360deg)}}

    /* Explicitly neutralize the previous layout-animation experiment if an old tab still has it. */
    #page-home .sh-layout-swap,#page-home.sh-layout-swap,#page-home.sh-layout-swap-in{transition:none!important;transform:none!important}
    #page-home [data-sh-monthly-clean-employee]{transition:none!important;transform:none!important}
    @media(prefers-reduced-motion:reduce){#shHomeStableLoader span{animation:none}}
  `;
  document.head.appendChild(style);

  console.info('SkillHub: employee Home no-flash gate enabled');
})();
