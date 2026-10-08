/* SkillHub performance guard — 2026-10-08
   Safe global optimisation for all roles:
   - stops the legacy 1.8s monthly-check poller while keeping event-driven refreshes;
   - throttles only the monthly-check MutationObserver;
   - coalesces duplicate full syncs;
   - prevents stale/foreign queued attempts from causing endless 403 retries;
   - keeps realtime updates enabled.
*/
(function(){
  'use strict';

  /* ---------- 1. Stop the known monthly-check 1.8s poller ---------- */
  const nativeSetInterval=window.setInterval.bind(window);
  window.setInterval=function(fn,delay,...args){
    try{
      const src=typeof fn==='function'?Function.prototype.toString.call(fn):'';
      if(Number(delay)===1800 && /decorate/.test(src) && /schedule/.test(src)){
        console.info('SkillHub performance: legacy monthly 1.8s polling disabled');
        return -1800;
      }
    }catch(_){}
    return nativeSetInterval(fn,delay,...args);
  };

  /* ---------- 2. Throttle only the monthly-check DOM observer ---------- */
  const NativeMutationObserver=window.MutationObserver;
  if(typeof NativeMutationObserver==='function'){
    function SkillHubMutationObserver(callback){
      let cb=callback;
      try{
        const src=typeof callback==='function'?Function.prototype.toString.call(callback):'';
        if(/decorate/.test(src) && /setTimeout/.test(src)){
          let timer=null;
          let lastRun=0;
          cb=function(mutations,observer){
            const now=Date.now();
            const wait=Math.max(0,900-(now-lastRun));
            clearTimeout(timer);
            timer=setTimeout(()=>{
              lastRun=Date.now();
              callback(mutations,observer);
            },wait);
          };
          console.info('SkillHub performance: monthly DOM observer throttled');
        }
      }catch(_){}
      return new NativeMutationObserver(cb);
    }
    SkillHubMutationObserver.prototype=NativeMutationObserver.prototype;
    Object.setPrototypeOf(SkillHubMutationObserver,NativeMutationObserver);
    window.MutationObserver=SkillHubMutationObserver;
  }

  /* ---------- 3. Queue protection: no endless 403 retry loop ---------- */
  function readFailedQueue(){
    try{return JSON.parse(localStorage.getItem('sh7_queue_failed')||'[]')}catch(_){return[]}
  }
  function saveFailedQueue(rows){
    try{localStorage.setItem('sh7_queue_failed',JSON.stringify((rows||[]).slice(-200)))}catch(_){}
  }
  function quarantine(rows,reason){
    if(!rows?.length)return;
    const failed=readFailedQueue();
    const at=new Date().toISOString();
    rows.forEach(row=>failed.push({row,reason,failed_at:at}));
    saveFailedQueue(failed);
  }

  window.flushQueue=async function(){
    if(!Array.isArray(S?.queue)||!S.queue.length||!navigator.onLine||!S?.sb||!S?.user||!S?.profile)return;

    const uid=String(S.user.id||'');
    const login=String(S.profile.login||'').toLowerCase();
    const mine=[];
    const foreign=[];
    for(const row of S.queue){
      const sameUser=String(row?.user_id||'')===uid;
      const sameLogin=String(row?.login||'').toLowerCase()===login;
      (sameUser&&sameLogin?mine:foreign).push(row);
    }

    if(foreign.length){
      quarantine(foreign,'queue belongs to another SkillHub user');
      S.queue=mine;
      try{localStorage.setItem('sh7_queue',JSON.stringify(S.queue))}catch(_){}
      try{updateNetwork()}catch(_){}
    }
    if(!mine.length)return;

    const {error}=await S.sb.from('attempts').insert(mine);
    if(!error){
      S.queue=S.queue.filter(x=>!mine.some(y=>y?.id===x?.id));
      try{localStorage.setItem('sh7_queue',JSON.stringify(S.queue))}catch(_){}
      try{updateNetwork()}catch(_){}
      return;
    }

    const permanent=String(error?.code||'')==='42501' || /403|row-level security|permission|not allowed|violates.*policy/i.test(String(error?.message||''));
    if(permanent){
      quarantine(mine,`permanent insert rejection: ${error?.code||''} ${error?.message||''}`.trim());
      S.queue=S.queue.filter(x=>!mine.some(y=>y?.id===x?.id));
      try{localStorage.setItem('sh7_queue',JSON.stringify(S.queue))}catch(_){}
      try{updateNetwork()}catch(_){}
      console.warn('SkillHub performance: rejected queued attempts moved to local quarantine instead of retrying forever',error);
      return;
    }
    throw error;
  };

  /* ---------- 4. Coalesce duplicate heavy syncAll calls ---------- */
  if(typeof window.syncAll==='function'){
    const baseSyncAll=window.syncAll;
    let inFlight=null;
    let lastFinished=0;
    window.syncAll=async function(manual=false){
      if(inFlight)return inFlight;
      if(!manual && Date.now()-lastFinished<1200)return true;
      inFlight=Promise.resolve().then(()=>baseSyncAll.apply(this,arguments));
      try{return await inFlight}
      finally{inFlight=null;lastFinished=Date.now()}
    };
  }

  /* ---------- 5. Monthly tables stay realtime without polling ---------- */
  let monthlyChannel=null;
  let wakeTimer=null;
  function wakeMonthly(){
    clearTimeout(wakeTimer);
    wakeTimer=setTimeout(()=>{
      try{
        const target=document.getElementById('page-mentor')||document.getElementById('page-home');
        if(!target)return;
        const marker=document.createElement('i');
        marker.hidden=true;
        marker.setAttribute('data-sh-monthly-wake','1');
        target.appendChild(marker);
        marker.remove();
      }catch(_){}
    },120);
  }
  function connectMonthlyRealtime(){
    if(!S?.sb||!S?.profile)return;
    if(monthlyChannel){try{S.sb.removeChannel(monthlyChannel)}catch(_){}}
    monthlyChannel=S.sb.channel(`skillhub-monthly-fast-${String(S.profile.login||'').replace(/[^a-z0-9_-]/gi,'_')}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'monthly_checks'},()=>{wakeMonthly();setTimeout(wakeMonthly,7200)})
      .on('postgres_changes',{event:'*',schema:'public',table:'monthly_check_runs'},()=>{wakeMonthly();setTimeout(wakeMonthly,7200)})
      .subscribe();
  }

  if(typeof window.enterApp==='function'){
    const baseEnterApp=window.enterApp;
    window.enterApp=function(){
      const r=baseEnterApp.apply(this,arguments);
      setTimeout(connectMonthlyRealtime,150);
      return r;
    };
  }
  setTimeout(()=>{try{if(S?.user)connectMonthlyRealtime()}catch(_){}},500);

  console.info('SkillHub performance guard enabled for all users');
})();
