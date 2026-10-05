/* SkillHub emergency sync recovery — 2026-10-05
   Keeps successfully loaded cloud data even when localStorage cache writing fails.
   Also retries manager data once after startup so RG employees/results reappear. */
(function(){
  'use strict';

  let recoveryBusy=false;

  async function loadManagerScope(){
    if(!S.user||!isManager())return true;
    const [al,pr]=await Promise.all([
      S.sb.from('allowed_logins').select('*').order('login'),
      S.sb.from('profiles').select('*').order('login')
    ]);
    if(al.error)throw al.error;
    if(pr.error)throw pr.error;
    S.allowed=al.data||[];
    S.profiles=pr.data||[];
    return true;
  }

  syncAll=async function(manual=false){
    updateNetwork();
    if(!S.user)return false;

    if(navigator.onLine){
      try{await flushQueue()}catch(e){console.warn('SkillHub queue flush skipped',e)}
    }

    try{
      const qs=[
        S.sb.from('content').select('*').order('updated_at',{ascending:false}),
        S.sb.from('assignments').select('*').order('created_at',{ascending:false}),
        S.sb.from('attempts').select('*').order('created_at',{ascending:true}),
        S.sb.from('notifications').select('*').order('created_at',{ascending:true}),
        S.sb.from('manual_answers').select('*').order('created_at',{ascending:true})
      ];
      const [c,a,t,n,m]=await Promise.all(qs);
      for(const r of [c,a,t,n,m])if(r.error)throw r.error;

      S.content=(c.data||[]).map(normalizeContent);
      S.assignments=a.data||[];
      S.attempts=t.data||[];
      S.notifications=n.data||[];
      S.manualAnswers=m.data||[];

      if(isManager())await loadManagerScope();
      else{S.allowed=[];S.profiles=[S.profile]}

      /* Cache failure must never roll live cloud data back to an old local copy. */
      try{
        localStorage.setItem('sh7_cache_'+S.profile.login,JSON.stringify({
          content:S.content,
          assignments:S.assignments,
          attempts:S.attempts,
          notifications:S.notifications,
          manualAnswers:S.manualAnswers,
          allowed:S.allowed,
          profiles:S.profiles
        }));
      }catch(cacheError){
        console.warn('SkillHub local cache write skipped; cloud data kept',cacheError);
      }

      renderUnread();
      renderCurrent();
      if(manual)toast('Данные обновлены');
      return true;
    }catch(e){
      console.error('SkillHub cloud sync failed',e);
      let cached=null;
      try{cached=JSON.parse(localStorage.getItem('sh7_cache_'+S.profile.login)||'null')}catch(_){}
      if(cached){
        Object.assign(S,cached);
        S.manualAnswers=S.manualAnswers||[];
        renderUnread();
        renderCurrent();
      }
      if(manual)toast(cached?'Нет связи с базой — показана локальная копия':'Не удалось обновить данные');
      return false;
    }
  };

  /* Extra recovery for RG/RS/tech-admin if an earlier startup sync left S.allowed empty. */
  async function recoverManagerData(){
    if(recoveryBusy||!S.user||!isManager())return;
    if((S.allowed||[]).length>1&&(S.attempts||[]).length)return;
    recoveryBusy=true;
    try{
      const ok=await syncAll(false);
      if(ok){
        if(S.currentPage==='employees')renderEmployees();
        else if(S.currentPage==='mentor')renderMentor();
      }
    }finally{recoveryBusy=false}
  }

  setTimeout(recoverManagerData,80);
  setTimeout(recoverManagerData,900);
  window.addEventListener('online',()=>setTimeout(recoverManagerData,100));
  console.info('SkillHub hotfix: manager cloud sync recovery enabled');
})();
