/* SkillHub latency polish — 2026-10-09
   - manual "Обновить данные" uses a lightweight delta refresh;
   - keeps full business logic/realtime intact;
   - RG employee rows keep only "Изменить" + "Управление" (bulk "Коды новым" stays in toolbar).
*/
(function(){
  'use strict';

  const baseSyncAll=window.syncAll;
  let manualBusy=null;

  const role=()=>String(S?.profile?.role||'');
  const isManagerRole=()=>['mentor','rs','tech_admin'].includes(role());

  function scopeLogins(allowed=S?.allowed||[]){
    const p=S?.profile;if(!p)return [];
    if(p.role==='tech_admin')return null;
    const self=String(p.login||'');
    if(p.role==='mentor'){
      const rows=(allowed||[]).filter(x=>x?.role==='employee'&&String(x?.manager_login||'')===self).map(x=>String(x.login));
      return [...new Set([self,...rows].filter(Boolean))];
    }
    if(p.role==='rs'){
      const sector=String(p.sector_name||'');
      const rows=(allowed||[]).filter(x=>x?.role==='employee'&&String(x?.sector_name||'')===sector).map(x=>String(x.login));
      return [...new Set([self,...rows].filter(Boolean))];
    }
    return self?[self]:[];
  }

  function scopeKey(logs){return logs===null?'ALL':(logs||[]).slice().sort().join('|')}

  function scopedQuery(table,logs,order='created_at',ascending=true){
    let q=S.sb.from(table).select('*').order(order,{ascending});
    if(logs===null)return q;
    if(!logs?.length)return q.eq('login','__no_skillhub_user__');
    if(logs.length===1)return q.eq('login',logs[0]);
    // Avoid huge URLs for very large sectors; RLS still limits what the user may read.
    if(logs.length>100)return q;
    return q.in('login',logs);
  }

  function mergeById(base,extra){
    const map=new Map((Array.isArray(base)?base:[]).map(x=>[x?.id,x]));
    for(const x of (extra||[]))if(x?.id)map.set(x.id,x);
    return [...map.values()];
  }

  function newestCreatedAt(rows){
    let max='';
    for(const x of (rows||[])){const v=String(x?.created_at||'');if(v>max)max=v}
    return max;
  }

  function persistIdle(){
    const write=()=>{
      if(!S?.profile?.login)return;
      try{localStorage.setItem('sh7_cache_'+S.profile.login,JSON.stringify({content:S.content||[],assignments:S.assignments||[],attempts:S.attempts||[],notifications:S.notifications||[],manualAnswers:S.manualAnswers||[],allowed:S.allowed||[],profiles:S.profiles||[]}))}catch(_){}
    };
    if(typeof requestIdleCallback==='function')requestIdleCallback(write,{timeout:1800});else setTimeout(write,0);
  }

  async function refreshContentDelta(metaRows){
    const cloud=Array.isArray(metaRows)?metaRows:[];
    const cloudIds=new Set(cloud.map(x=>x.id));
    const localMap=new Map((S.content||[]).map(x=>[x.id,x]));
    let kept=(S.content||[]).filter(x=>cloudIds.has(x.id));
    const changed=cloud.filter(x=>{
      const old=localMap.get(x.id);
      return !old||String(old.updated_at||'')!==String(x.updated_at||'');
    }).map(x=>x.id);
    if(!changed.length){S.content=kept;return}
    let q=S.sb.from('content').select('*');
    if(changed.length<=80)q=q.in('id',changed);
    const {data,error}=await q;if(error)throw error;
    const fresh=(data||[]).map(x=>typeof normalizeContent==='function'?normalizeContent(x):x);
    if(changed.length>80){S.content=fresh;return}
    const freshMap=new Map(fresh.map(x=>[x.id,x]));
    kept=kept.filter(x=>!freshMap.has(x.id));
    S.content=[...fresh,...kept];
  }

  async function fastManualRefresh(){
    if(manualBusy)return manualBusy;
    manualBusy=(async()=>{
      if(!S?.user||!S?.sb)return false;
      document.getElementById('profileMenu')?.classList.add('hidden');
      const label=document.getElementById('syncLabel'),sub=document.getElementById('syncSub');
      if(label)label.textContent='Обновляю…';if(sub)sub.textContent='быстрая синхронизация';
      const oldAllowed=S.allowed||[],oldLogs=scopeLogins(oldAllowed),oldKey=scopeKey(oldLogs),lastAttempt=newestCreatedAt(S.attempts||[]);

      try{
        // Queue send never blocks the visual refresh.
        if(navigator.onLine&&typeof window.flushQueue==='function')window.flushQueue().catch(()=>{});

        let attemptsQ=scopedQuery('attempts',oldLogs,'created_at',true);
        if(lastAttempt)attemptsQ=attemptsQ.gt('created_at',lastAttempt);

        const manager=isManagerRole();
        const pLogin=String(S.profile?.login||'');
        const [meta,assignments,attempts,notifications,manual,allowed,profiles]=await Promise.all([
          S.sb.from('content').select('id,updated_at'),
          S.sb.from('assignments').select('*').order('created_at',{ascending:false}),
          attemptsQ,
          S.sb.from('notifications').select('*').eq('login',pLogin).order('created_at',{ascending:true}),
          scopedQuery('manual_answers',oldLogs,'created_at',true),
          manager?S.sb.from('allowed_logins').select('*').order('login'):Promise.resolve({data:S.allowed||[],error:null}),
          manager?S.sb.from('profiles').select('*').order('login'):Promise.resolve({data:S.profiles||[],error:null})
        ]);
        for(const r of [meta,assignments,attempts,notifications,manual,allowed,profiles])if(r?.error)throw r.error;

        if(manager){S.allowed=allowed.data||[];S.profiles=profiles.data||[]}
        const newLogs=scopeLogins(S.allowed||[]),newKey=scopeKey(newLogs);

        S.assignments=assignments.data||[];
        S.notifications=(notifications.data||[]).filter(x=>String(x?.login||'')===pLogin);

        if(newKey!==oldKey){
          const [allAttempts,allManual]=await Promise.all([
            scopedQuery('attempts',newLogs,'created_at',true),
            scopedQuery('manual_answers',newLogs,'created_at',true)
          ]);
          if(allAttempts.error)throw allAttempts.error;if(allManual.error)throw allManual.error;
          S.attempts=allAttempts.data||[];S.manualAnswers=allManual.data||[];
        }else{
          S.attempts=mergeById(S.attempts||[],attempts.data||[]);
          S.manualAnswers=manual.data||[];
        }

        await refreshContentDelta(meta.data||[]);
        try{renderUnread()}catch(_){}
        try{updateNetwork()}catch(_){}
        requestAnimationFrame(()=>{try{renderCurrent()}catch(e){console.warn('SkillHub manual refresh render skipped',e)}});
        persistIdle();
        try{toast('Данные обновлены')}catch(_){}
        return true;
      }catch(e){
        console.warn('SkillHub fast manual refresh failed; using safe full sync',e);
        if(typeof baseSyncAll==='function')return await baseSyncAll(true);
        return false;
      }finally{
        try{updateNetwork()}catch(_){}
      }
    })();
    try{return await manualBusy}finally{manualBusy=null}
  }

  if(typeof baseSyncAll==='function'){
    window.syncAll=function(manual=false){
      if(manual===true)return fastManualRefresh();
      return baseSyncAll.apply(this,arguments);
    };
  }

  /* RG: one bulk code action is enough. Per-employee "Новый код" is redundant. */
  function removeSingleCodeButtons(){
    if(S?.profile?.role!=='mentor')return;
    document.querySelectorAll('#employeeRows .actions button').forEach(btn=>{
      if((btn.textContent||'').trim()==='Новый код')btn.remove();
    });
  }
  function wrapEmployees(){
    if(typeof window.renderEmployees!=='function'||window.renderEmployees.__shTwoButtons)return;
    const base=window.renderEmployees;
    const wrapped=function(){const r=base.apply(this,arguments);removeSingleCodeButtons();return r};
    wrapped.__shTwoButtons=true;
    window.renderEmployees=wrapped;
  }
  wrapEmployees();
  setTimeout(()=>{wrapEmployees();removeSingleCodeButtons()},0);
  setTimeout(()=>{wrapEmployees();removeSingleCodeButtons()},500);

  console.info('SkillHub: fast manual refresh + simplified RG employee actions enabled');
})();
