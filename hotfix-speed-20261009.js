/* SkillHub performance layer — 2026-10-09
   Purpose: make startup/navigation lighter without changing business logic.
   - scope attempts/manual data to the current employee/team/sector where possible;
   - debounce realtime renders and cache writes;
   - build an attempts-by-login index for manager analytics;
   - throttle only the known legacy body observers;
   - prevent endless retries of stale queued attempts.
*/
(function(){
  'use strict';

  /* ---------- 1. Targeted protection from legacy high-frequency observers ---------- */
  const NativeMutationObserver=window.MutationObserver;
  if(typeof NativeMutationObserver==='function'&&!window.__shSpeedObserverPatched){
    window.__shSpeedObserverPatched=true;
    function SkillHubMutationObserver(callback){
      let cb=callback;
      try{
        const src=typeof callback==='function'?Function.prototype.toString.call(callback):'';
        const rgAssignments=/scheduleMonthlySync/.test(src)&&/wrapAssignments/.test(src);
        const legacyMonthly=/decorate/.test(src)&&/schedule/.test(src);
        if(rgAssignments||legacyMonthly){
          let timer=null,lastMutations=null,lastObserver=null;
          const delay=rgAssignments?140:350;
          cb=function(mutations,observer){
            lastMutations=mutations;lastObserver=observer;
            clearTimeout(timer);
            timer=setTimeout(()=>{
              const m=lastMutations,o=lastObserver;
              lastMutations=null;lastObserver=null;
              callback(m,o);
            },delay);
          };
        }
      }catch(_){}
      return new NativeMutationObserver(cb);
    }
    SkillHubMutationObserver.prototype=NativeMutationObserver.prototype;
    Object.setPrototypeOf(SkillHubMutationObserver,NativeMutationObserver);
    window.MutationObserver=SkillHubMutationObserver;
  }

  const nativeSetInterval=window.setInterval.bind(window);
  if(!window.__shSpeedIntervalPatched){
    window.__shSpeedIntervalPatched=true;
    window.setInterval=function(fn,delay,...args){
      try{
        const src=typeof fn==='function'?Function.prototype.toString.call(fn):'';
        if(Number(delay)===1800&&/schedule/.test(src)&&/decorate/.test(src))return -1800;
      }catch(_){}
      return nativeSetInterval(fn,delay,...args);
    };
  }

  /* ---------- 2. Fast cache: write only when the browser is idle ---------- */
  let cacheTimer=null,cacheIdle=null;
  function ownNotifications(rows){
    const login=String(S?.profile?.login||'');
    return (rows||[]).filter(x=>String(x?.login||'')===login);
  }
  function cacheSnapshot(){
    return {
      content:S.content||[],assignments:S.assignments||[],attempts:S.attempts||[],
      notifications:ownNotifications(S.notifications||[]),manualAnswers:S.manualAnswers||[],
      allowed:S.allowed||[],profiles:S.profiles||[]
    };
  }
  function persistCacheSoon(){
    clearTimeout(cacheTimer);
    if(cacheIdle&&typeof cancelIdleCallback==='function'){try{cancelIdleCallback(cacheIdle)}catch(_){}}
    cacheTimer=setTimeout(()=>{
      const write=()=>{
        if(!S?.profile?.login)return;
        try{localStorage.setItem('sh7_cache_'+S.profile.login,JSON.stringify(cacheSnapshot()))}
        catch(e){console.warn('SkillHub cache write skipped',e)}
      };
      if(typeof requestIdleCallback==='function')cacheIdle=requestIdleCallback(write,{timeout:1600});
      else write();
    },550);
  }

  /* ---------- 3. Queue protection: stale rows never retry forever ---------- */
  function readFailedQueue(){try{return JSON.parse(localStorage.getItem('sh7_queue_failed')||'[]')}catch(_){return[]}}
  function saveFailedQueue(rows){try{localStorage.setItem('sh7_queue_failed',JSON.stringify((rows||[]).slice(-200)))}catch(_){}}
  function quarantine(rows,reason){
    if(!rows?.length)return;
    const failed=readFailedQueue(),at=new Date().toISOString();
    rows.forEach(row=>failed.push({row,reason,failed_at:at}));
    saveFailedQueue(failed);
  }
  window.flushQueue=async function(){
    if(!Array.isArray(S?.queue)||!S.queue.length||!navigator.onLine||!S?.sb||!S?.user||!S?.profile)return;
    const uid=String(S.user.id||''),login=String(S.profile.login||'').toLowerCase();
    const mine=[],foreign=[];
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
      const ids=new Set(mine.map(x=>x?.id).filter(Boolean));
      S.queue=S.queue.filter(x=>!ids.has(x?.id));
      try{localStorage.setItem('sh7_queue',JSON.stringify(S.queue))}catch(_){}
      try{updateNetwork()}catch(_){}
      return;
    }
    const permanent=String(error?.code||'')==='42501'||/403|row-level security|permission|not allowed|violates.*policy/i.test(String(error?.message||''));
    if(permanent){
      quarantine(mine,`permanent insert rejection: ${error?.code||''} ${error?.message||''}`.trim());
      const ids=new Set(mine.map(x=>x?.id).filter(Boolean));
      S.queue=S.queue.filter(x=>!ids.has(x?.id));
      try{localStorage.setItem('sh7_queue',JSON.stringify(S.queue))}catch(_){}
      try{updateNetwork()}catch(_){}
      console.warn('SkillHub: rejected queued attempts moved to quarantine',error);
      return;
    }
    throw error;
  };

  /* ---------- 4. Scope heavy history queries to the current role ---------- */
  function role(){return String(S?.profile?.role||'')}
  function isManagerRole(){return ['mentor','rs','tech_admin'].includes(role())}
  async function loadManagerScope(){
    if(!isManagerRole()){
      S.allowed=[];S.profiles=S.profile?[S.profile]:[];return;
    }
    const [al,pr]=await Promise.all([
      S.sb.from('allowed_logins').select('*').order('login'),
      S.sb.from('profiles').select('*').order('login')
    ]);
    if(al.error)throw al.error;if(pr.error)throw pr.error;
    S.allowed=al.data||[];S.profiles=pr.data||[];
  }
  function scopeLogins(){
    const p=S?.profile;if(!p)return [];
    if(p.role==='tech_admin')return null;
    const self=String(p.login||'');
    if(p.role==='mentor'){
      const rows=(S.allowed||[]).filter(x=>x?.role==='employee'&&String(x?.manager_login||'')===self).map(x=>String(x.login));
      return [...new Set([self,...rows].filter(Boolean))];
    }
    if(p.role==='rs'){
      const sector=String(p.sector_name||'');
      const rows=(S.allowed||[]).filter(x=>x?.role==='employee'&&String(x?.sector_name||'')===sector).map(x=>String(x.login));
      return [...new Set([self,...rows].filter(Boolean))];
    }
    return self?[self]:[];
  }
  function scopedHistoryQuery(table,order='created_at'){
    let q=S.sb.from(table).select('*').order(order,{ascending:true});
    const logs=scopeLogins();
    if(logs===null)return q;
    if(logs.length===1)return q.eq('login',logs[0]);
    if(logs.length>1)return q.in('login',logs);
    return q.eq('login','__no_skillhub_user__');
  }
  function notificationsQuery(){
    let q=S.sb.from('notifications').select('*').order('created_at',{ascending:true});
    const login=String(S?.profile?.login||'');
    return login?q.eq('login',login):q;
  }

  let syncInFlight=null,lastSyncFinished=0;
  window.syncAll=async function(manual=false){
    if(syncInFlight)return syncInFlight;
    if(!manual&&Date.now()-lastSyncFinished<900)return true;
    syncInFlight=(async()=>{
      try{updateNetwork()}catch(_){}
      if(!S?.user)return false;
      if(navigator.onLine){try{await window.flushQueue()}catch(e){console.warn('SkillHub queue flush skipped',e)}}
      try{
        await loadManagerScope();
        const [c,a,t,n,m]=await Promise.all([
          S.sb.from('content').select('*').order('updated_at',{ascending:false}),
          S.sb.from('assignments').select('*').order('created_at',{ascending:false}),
          scopedHistoryQuery('attempts'),
          notificationsQuery(),
          scopedHistoryQuery('manual_answers')
        ]);
        for(const r of [c,a,t,n,m])if(r.error)throw r.error;
        S.content=(c.data||[]).map(normalizeContent);
        S.assignments=a.data||[];
        S.attempts=t.data||[];
        S.notifications=ownNotifications(n.data||[]);
        S.manualAnswers=m.data||[];
        try{renderUnread()}catch(_){}
        try{renderCurrent()}catch(e){console.warn('SkillHub render after sync skipped',e)}
        persistCacheSoon();
        if(manual)try{toast('Данные обновлены')}catch(_){}
        return true;
      }catch(e){
        console.error('SkillHub fast sync failed',e);
        let cached=null;
        try{cached=JSON.parse(localStorage.getItem('sh7_cache_'+S.profile.login)||'null')}catch(_){}
        if(cached){
          Object.assign(S,cached);
          S.notifications=ownNotifications(S.notifications||[]);
          S.manualAnswers=S.manualAnswers||[];
          try{renderUnread()}catch(_){}
          try{renderCurrent()}catch(_){}
        }
        if(manual)try{toast(cached?'Нет связи с базой — показана локальная копия':'Не удалось обновить данные')}catch(_){}
        return false;
      }
    })();
    try{return await syncInFlight}
    finally{syncInFlight=null;lastSyncFinished=Date.now()}
  };

  /* ---------- 5. O(1)-style manager history lookup instead of repeated full scans ---------- */
  let indexedAttemptsRef=null,attemptsByLogin=new Map(),statsCache=new Map(),metricsCache=new Map();
  function ensureAttemptIndex(){
    if(indexedAttemptsRef===S.attempts)return;
    indexedAttemptsRef=S.attempts;
    attemptsByLogin=new Map();statsCache=new Map();metricsCache=new Map();
    for(const a of (S.attempts||[])){
      const login=String(a?.login||'');if(!login)continue;
      if(!attemptsByLogin.has(login))attemptsByLogin.set(login,[]);
      attemptsByLogin.get(login).push(a);
    }
  }
  const baseTopicStats=typeof window.topicStats==='function'?window.topicStats:null;
  if(typeof window.topicStatsFromRows==='function'){
    window.topicStats=function(login){
      ensureAttemptIndex();login=String(login||'');
      if(statsCache.has(login))return statsCache.get(login);
      const rows=attemptsByLogin.get(login)||[];
      const value=window.topicStatsFromRows(login,rows);
      statsCache.set(login,value);return value;
    };
  }else if(baseTopicStats){window.topicStats=baseTopicStats}

  const baseEmployeeMetrics=typeof window.employeeMetrics==='function'?window.employeeMetrics:null;
  if(baseEmployeeMetrics&&typeof window.topicStatsFromRows==='function'){
    window.employeeMetrics=function(u,attemptRows=S.attempts){
      if(attemptRows!==S.attempts)return baseEmployeeMetrics.apply(this,arguments);
      ensureAttemptIndex();
      const login=String(u?.login||'');if(metricsCache.has(login))return metricsCache.get(login);
      const a=attemptsByLogin.get(login)||[];
      const avg=sec=>{const q=a.filter(x=>x.section===sec);return q.length?Math.round(q.reduce((z,x)=>z+Number(x.score),0)/q.length):null};
      const t=window.topicStats(login),g=t.filter(x=>x.status==='gap');
      const value={...u,soft:avg('soft'),hard:avg('hard'),needs:avg('needs'),attempts:a.length,gaps:g,last:a.length?a.slice().sort((x,y)=>new Date(y.created_at)-new Date(x.created_at))[0].created_at:null};
      metricsCache.set(login,value);return value;
    };
  }

  /* ---------- 6. Realtime: patch data immediately, render once per burst ---------- */
  function replaceById(list,row,normalizer){
    const arr=Array.isArray(list)?list.slice():[];if(!row?.id)return arr;
    const value=normalizer?normalizer(row):row,i=arr.findIndex(x=>x?.id===row.id);
    if(i>=0)arr[i]=value;else arr.push(value);return arr;
  }
  function removeById(list,row){const id=row?.id;return id?(Array.isArray(list)?list:[]).filter(x=>x?.id!==id):(Array.isArray(list)?list:[])}
  function applyChange(list,payload,normalizer){return payload?.eventType==='DELETE'?removeById(list,payload.old):replaceById(list,payload?.new,normalizer)}
  function relevantLogin(login){
    login=String(login||'');const p=S?.profile;if(!p||!login)return false;
    if(login===String(p.login||''))return true;
    if(p.role==='tech_admin')return true;
    const u=(S.allowed||[]).find(x=>String(x?.login||'')===login);if(!u)return false;
    if(p.role==='mentor')return u.role==='employee'&&String(u.manager_login||'')===String(p.login||'');
    if(p.role==='rs')return u.role==='employee'&&String(u.sector_name||'')===String(p.sector_name||'');
    return false;
  }

  let renderTimer=null;
  function rerenderIf(pages){
    if(document.hidden||!pages.includes(S.currentPage))return;
    clearTimeout(renderTimer);
    renderTimer=setTimeout(()=>{try{renderCurrent()}catch(e){console.warn('SkillHub realtime render skipped',e)}},90);
  }
  let toastTimer=null,lastToast='';
  function notify(text){
    if(!text)return;if(lastToast===text)clearTimeout(toastTimer);lastToast=text;
    toastTimer=setTimeout(()=>{lastToast=''},1000);
    try{toast(text)}catch(_){}
    try{if('Notification'in window&&Notification.permission==='granted')new Notification('SkillHub',{body:text,icon:'./icon-192-v718.png'})}catch(_){}
  }
  function handleContent(payload){S.content=applyChange(S.content,payload,normalizeContent);persistCacheSoon();rerenderIf(['content','training','home']);notify('Обновлены материалы')}
  function handleAssignment(payload){S.assignments=applyChange(S.assignments,payload);persistCacheSoon();rerenderIf(['assignments','mentor','home','training']);notify('Обновлены задания')}
  function handleNotification(payload){
    const row=payload?.new||payload?.old;if(!row||String(row.login)!==String(S.profile?.login||''))return;
    S.notifications=ownNotifications(applyChange(S.notifications,payload));persistCacheSoon();try{renderUnread()}catch(_){};rerenderIf(['notifications']);
    if(payload?.eventType==='INSERT')notify(payload.new?.title||'Новое уведомление');
  }
  function handleManual(payload){
    const row=payload?.new||payload?.old;if(!relevantLogin(row?.login))return;
    S.manualAnswers=applyChange(S.manualAnswers,payload);persistCacheSoon();rerenderIf(['mentor','admin','training','notifications']);
    if(payload?.eventType!=='DELETE')notify(payload.new?.status==='submitted'?'Новая работа на проверку':'Обновлена ручная работа');
  }
  function handleAttempt(payload){
    const row=payload?.new||payload?.old;if(!relevantLogin(row?.login))return;
    S.attempts=applyChange(S.attempts,payload);persistCacheSoon();rerenderIf(['mentor','progress','admin']);
  }

  window.subscribeRealtime=function(){
    if(!S?.sb||!S?.profile?.login)return;
    if(S.subscription){try{S.sb.removeChannel(S.subscription)}catch(_){}}
    const login=S.profile.login;
    S.subscription=S.sb.channel('skillhub-live-fast-v2')
      .on('postgres_changes',{event:'*',schema:'public',table:'content'},handleContent)
      .on('postgres_changes',{event:'*',schema:'public',table:'assignments'},handleAssignment)
      .on('postgres_changes',{event:'*',schema:'public',table:'notifications',filter:`login=eq.${login}`},handleNotification)
      .on('postgres_changes',{event:'*',schema:'public',table:'manual_answers'},handleManual)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'attempts'},handleAttempt)
      .subscribe();
  };

  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden&&S?.user){
      try{renderCurrent()}catch(_){}
      setTimeout(()=>{try{window.syncAll(false)}catch(_){}},120);
    }
  });
  window.addEventListener('online',()=>setTimeout(()=>{try{window.syncAll(false)}catch(_){}},120));

  // If a restored session subscribed before this layer loaded, rebind once.
  setTimeout(()=>{try{if(S?.user)window.subscribeRealtime()}catch(_){}},160);
  console.info('SkillHub speed layer v2 enabled');
})();
