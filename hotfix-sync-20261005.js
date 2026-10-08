/* SkillHub sync recovery + performance optimization — 2026-10-08
   - Keeps successfully loaded cloud data even when localStorage cache writing fails.
   - Loads only the current user's notifications (RG no longer downloads all employee notifications).
   - Realtime patches only the changed collection instead of running a full syncAll().
   - Existing history/results remain in Supabase and are not deleted or rewritten. */
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

  function ownNotificationsQuery(){
    const login=S.profile?.login||'';
    let q=S.sb.from('notifications').select('*').order('created_at',{ascending:true});
    if(login)q=q.eq('login',login);
    return q;
  }

  function keepOnlyOwnNotifications(rows){
    const login=S.profile?.login;
    if(!login)return rows||[];
    return (rows||[]).filter(x=>x?.login===login);
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
        ownNotificationsQuery(),
        S.sb.from('manual_answers').select('*').order('created_at',{ascending:true})
      ];
      const [c,a,t,n,m]=await Promise.all(qs);
      for(const r of [c,a,t,n,m])if(r.error)throw r.error;

      S.content=(c.data||[]).map(normalizeContent);
      S.assignments=a.data||[];
      S.attempts=t.data||[];
      S.notifications=keepOnlyOwnNotifications(n.data||[]);
      S.manualAnswers=m.data||[];

      if(isManager())await loadManagerScope();
      else{S.allowed=[];S.profiles=[S.profile]}

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
        S.notifications=keepOnlyOwnNotifications(S.notifications||[]);
        S.manualAnswers=S.manualAnswers||[];
        renderUnread();
        renderCurrent();
      }
      if(manual)toast(cached?'Нет связи с базой — показана локальная копия':'Не удалось обновить данные');
      return false;
    }
  };

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
  console.info('SkillHub hotfix: optimized cloud sync enabled');
})();

/* Lightweight realtime: update only the row/collection that changed.
   This preserves realtime behaviour without downloading the whole database on every event. */
(function(){
  'use strict';

  let cacheTimer=null;
  let toastTimer=null;
  let lastToast='';

  function replaceById(list,row,normalizer){
    const arr=Array.isArray(list)?list.slice():[];
    if(!row?.id)return arr;
    const value=normalizer?normalizer(row):row;
    const i=arr.findIndex(x=>x?.id===row.id);
    if(i>=0)arr[i]=value;else arr.push(value);
    return arr;
  }

  function removeById(list,row){
    const id=row?.id;
    if(!id)return Array.isArray(list)?list:[];
    return (Array.isArray(list)?list:[]).filter(x=>x?.id!==id);
  }

  function applyChange(list,payload,normalizer){
    if(payload?.eventType==='DELETE')return removeById(list,payload.old);
    return replaceById(list,payload?.new,normalizer);
  }

  function persistCacheSoon(){
    clearTimeout(cacheTimer);
    cacheTimer=setTimeout(()=>{
      if(!S?.profile?.login)return;
      try{
        localStorage.setItem('sh7_cache_'+S.profile.login,JSON.stringify({
          content:S.content||[],assignments:S.assignments||[],attempts:S.attempts||[],
          notifications:S.notifications||[],manualAnswers:S.manualAnswers||[],
          allowed:S.allowed||[],profiles:S.profiles||[]
        }));
      }catch(e){console.warn('SkillHub realtime cache write skipped',e)}
    },350);
  }

  function notify(text){
    if(!text)return;
    if(lastToast===text){clearTimeout(toastTimer)}
    lastToast=text;
    toastTimer=setTimeout(()=>{lastToast=''},900);
    try{toast(text)}catch(_){}
    try{
      if('Notification'in window&&Notification.permission==='granted'){
        new Notification('SkillHub',{body:text,icon:'./icon-192-v718.png'});
      }
    }catch(_){}
  }

  function rerenderIf(pages){
    if(!Array.isArray(pages)||!pages.includes(S.currentPage))return;
    try{renderCurrent()}catch(e){console.warn('SkillHub realtime render skipped',e)}
  }

  function handleContent(payload){
    S.content=applyChange(S.content,payload,normalizeContent);
    persistCacheSoon();
    rerenderIf(['content','training','home']);
    notify('Обновлены материалы');
  }

  function handleAssignment(payload){
    S.assignments=applyChange(S.assignments,payload);
    persistCacheSoon();
    rerenderIf(['assignments','mentor','home','training']);
    notify('Обновлены задания');
  }

  function handleNotification(payload){
    const row=payload?.new||payload?.old;
    if(!row||row.login!==S.profile?.login)return;
    S.notifications=applyChange(S.notifications,payload);
    S.notifications=(S.notifications||[]).filter(x=>x?.login===S.profile?.login);
    persistCacheSoon();
    try{renderUnread()}catch(_){}
    rerenderIf(['notifications']);
    if(payload?.eventType==='INSERT')notify(payload.new?.title||'Новое уведомление');
  }

  function handleManual(payload){
    S.manualAnswers=applyChange(S.manualAnswers,payload);
    persistCacheSoon();
    rerenderIf(['mentor','admin','training','notifications']);
    if(payload?.eventType!=='DELETE')notify(payload.new?.status==='submitted'?'Новая работа на проверку':'Обновлена ручная работа');
  }

  function handleAttempt(payload){
    S.attempts=applyChange(S.attempts,payload);
    persistCacheSoon();
    rerenderIf(['mentor','progress','admin']);
  }

  subscribeRealtime=function(){
    if(!S?.sb||!S?.profile?.login)return;
    if(S.subscription){try{S.sb.removeChannel(S.subscription)}catch(_){}}
    const login=S.profile.login;
    S.subscription=S.sb.channel('skillhub-live-optimized')
      .on('postgres_changes',{event:'*',schema:'public',table:'content'},handleContent)
      .on('postgres_changes',{event:'*',schema:'public',table:'assignments'},handleAssignment)
      .on('postgres_changes',{event:'*',schema:'public',table:'notifications',filter:`login=eq.${login}`},handleNotification)
      .on('postgres_changes',{event:'*',schema:'public',table:'manual_answers'},handleManual)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'attempts'},handleAttempt)
      .subscribe();
  };

  // Rebind if the user session was already restored before this hotfix finished loading.
  setTimeout(()=>{try{if(typeof S!=='undefined'&&S.user)subscribeRealtime()}catch(_){}},120);
  console.info('SkillHub hotfix: lightweight realtime enabled');
})();

/* RG employee controls: Новый код · Изменить · Управление */
(function(){
  'use strict';
  const baseRenderEmployees=renderEmployees;

  function rgEmployee(login){
    return (S.allowed||[]).find(x=>x.login===login&&x.role==='employee'&&x.active!==false&&S.profile?.role==='mentor'&&x.manager_login===S.profile.login)||null;
  }

  window.shRgNewCode=async function(login){
    const x=rgEmployee(login);if(!x)return;
    return x.claimed_user_id?resetAccess(login):makeCode(login);
  };

  window.shRgOpenManagement=function(login){
    const x=rgEmployee(login);if(!x)return;
    showModal(`<div class="modal-head"><div><h2>Управление сотрудником</h2><div class="meta">${esc(x.name||x.login)} · ${esc(x.login)}</div></div><button class="btn secondary" onclick="closeModal()">✕</button></div><div class="card" style="margin-top:12px"><div class="employee-row"><div><b>Открепить</b><div class="meta">Сотрудник останется в SkillHub. PIN, результаты и история сохранятся; другой РГ сможет закрепить его за собой.</div></div><button class="btn secondary" onclick="shRgDetach('${jsq(login)}')">Открепить</button></div><div class="employee-row"><div><b>Удалить</b><div class="meta">Сотрудник будет убран из активных и потеряет доступ. Все результаты и история сохранятся для восстановления.</div></div><button class="btn danger" onclick="shRgArchive('${jsq(login)}')">Удалить</button></div></div>`);
  };

  window.shRgDetach=async function(login){
    if(!rgEmployee(login))return;
    closeModal();
    await removeEmployeeFromTeam(login);
  };

  window.shRgArchive=async function(login){
    const x=rgEmployee(login);if(!x)return;
    if(!confirm(`Удалить ${x.name||x.login} из активных сотрудников? Доступ будет отключён, но результаты и вся история сохранятся для восстановления.`))return;
    const {error}=await S.sb.rpc('mentor_archive_employee',{p_login:login});
    if(error){
      let m=error.message||String(error);
      if(m.includes('OUTSIDE_YOUR_SCOPE'))m='Можно удалять только сотрудников своей команды.';
      else if(m.includes('EMPLOYEE_NOT_FOUND'))m='Сотрудник не найден.';
      else if(m.includes('FORBIDDEN'))m='Недостаточно прав для удаления сотрудника.';
      toast(m);return;
    }
    closeModal();
    await syncAll();
    renderEmployees();
    if(S.currentPage==='mentor')renderMentor();
    toast('Сотрудник удалён из активных. История сохранена.');
  };

  function applyRgEmployeeActions(){
    if(S.profile?.role!=='mentor')return;
    const users=employeeListForAdmin();
    const rows=[...document.querySelectorAll('#employeeRows > .employee-row')];
    if(!rows.length||rows.length!==users.length)return;
    rows.forEach((row,i)=>{
      const x=users[i];
      if(!x||x.role!=='employee'||x.manager_login!==S.profile.login)return;
      const actions=row.querySelector('.actions');
      if(!actions)return;
      actions.innerHTML=`<span class="pill ${x.active?'good':'bad'}">${x.active?'Активен':'Отключён'}</span><button class="btn secondary" onclick="shRgNewCode('${jsq(x.login)}')">Новый код</button><button class="btn secondary" onclick="openEmployeeEditor(S.allowed.find(u=>u.login==='${jsq(x.login)}'))">Изменить</button><button class="btn secondary" onclick="shRgOpenManagement('${jsq(x.login)}')">Управление</button>`;
    });
  }

  renderEmployees=function(){
    const r=baseRenderEmployees();
    applyRgEmployeeActions();
    return r;
  };

  console.info('SkillHub: RG employee controls enabled');
})();
