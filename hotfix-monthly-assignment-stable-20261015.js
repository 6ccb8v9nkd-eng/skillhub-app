/* SkillHub monthly assignment stability — 2026-10-15 */
(function(){
  'use strict';
  if(window.__shMonthlyAssignmentStable20261015)return;
  window.__shMonthlyAssignmentStable20261015=true;

  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const app=()=>window.S||null;
  const now=()=>new Date().toISOString();
  const uniq=a=>[...new Set((a||[]).map(x=>String(x||'').trim().toLowerCase()).filter(Boolean))];
  const toast=m=>{try{window.toast?.(m)}catch(_){}};

  // UI only: keep the top "Назначить проверку" action and "Результаты",
  // but hide the redundant per-check "Назначить ещё" button.
  if(!document.getElementById('sh-hide-monthly-assign-again')){
    const style=document.createElement('style');
    style.id='sh-hide-monthly-assign-again';
    style.textContent='.shmc-manager-row .shmc-row-actions > button:nth-child(2){display:none!important}';
    document.head.appendChild(style);
  }

  function dueIso(date,time='23:59'){
    return new Date(`${date}T${time}:00+03:00`).toISOString();
  }

  function snapshotSelection(){
    const modal=q('#modalCard');
    const scope=q('input[name="shmcScope"]:checked',modal)?.value||'all';
    const all=uniq(qa('[data-shmc-person]',modal).map(x=>x.value));
    const checked=uniq(qa('[data-shmc-person]:checked',modal).map(x=>x.value));
    return {scope,selected:scope==='custom'?checked:all};
  }

  async function addRecipients(checkId,button){
    if(window.__shMonthlyStableAssignBusy)return;
    const A=app();if(!A?.sb)return toast('Нет подключения к базе');
    const pick=snapshotSelection();
    if(!pick.selected.length)return toast('Выберите хотя бы одного сотрудника');
    window.__shMonthlyStableAssignBusy=true;
    const oldText=button?.textContent||'Добавить сотрудников';
    if(button){button.disabled=true;button.textContent='Назначаем…'}
    try{
      const [cq,rq]=await Promise.all([
        A.sb.from('monthly_checks').select('*').eq('id',checkId).single(),
        A.sb.from('monthly_check_runs').select('*').eq('check_id',checkId)
      ]);
      if(cq.error)throw cq.error;if(rq.error)throw rq.error;
      const check=cq.data,existing=new Set(uniq(check.recipients||[]));
      const add=pick.selected.filter(x=>!existing.has(x));
      if(!add.length){
        toast('Выбранным сотрудникам проверка уже назначена');
        return;
      }

      const byLogin=new Map((rq.data||[]).map(r=>[String(r.login||'').toLowerCase(),r]));
      for(const login of add){
        const old=byLogin.get(login);
        if(old){
          const b=old.breakdown&&typeof old.breakdown==='object'?old.breakdown:{};
          const prev=Array.isArray(b.previous_attempts)?b.previous_attempts:[];
          const archive={archived_at:now(),status:old.status||'not_started',progress:Number(old.progress||0),score:old.score,started_at:old.started_at||null,completed_at:old.completed_at||null,breakdown:b};
          const clean={version:'clean_v1',answers:{},current_index:0,previous_attempts:[...prev,archive]};
          const uq=await A.sb.from('monthly_check_runs').update({status:'not_started',progress:0,score:null,breakdown:clean,started_at:null,submitted_at:null,completed_at:null,updated_at:now()}).eq('id',old.id);
          if(uq.error)throw uq.error;
        }else{
          const iq=await A.sb.from('monthly_check_runs').insert({check_id:checkId,login,status:'not_started',progress:0,breakdown:{version:'clean_v1',answers:{},current_index:0}});
          if(iq.error)throw iq.error;
        }
      }

      const date=q('#shmcDue')?.value||check.due_date;
      const time=q('#shmcTime')?.value||check.config?.due_time_msk||'23:59';
      const merged=uniq([...(check.recipients||[]),...add]);
      const patch={recipients:merged,status:'assigned',due_date:date,due_at:dueIso(date,time),config:{...(check.config||{}),due_time_msk:time},updated_at:now()};
      const uq=await A.sb.from('monthly_checks').update(patch).eq('id',checkId);
      if(uq.error)throw uq.error;

      const notes=add.map(login=>({login,title:'Итоговая проверка знаний',body:`Назначена итоговая проверка знаний. Пройти до ${new Date(patch.due_at).toLocaleString('ru-RU')}.`,kind:'monthly_check',read:false}));
      if(notes.length){const nq=await A.sb.from('notifications').insert(notes);if(nq.error)console.warn('monthly notification',nq.error)}
      try{window.closeModal?.()}catch(_){}
      toast(`Проверка назначена: ${add.length} сотрудникам`);
      try{await window.syncAll?.(false)}catch(_){}
      setTimeout(()=>window.shAssignmentsOpen?.('monthly'),80);
    }catch(err){
      console.error('monthly stable assign',err);
      toast(err?.message||'Не удалось назначить проверку');
    }finally{
      window.__shMonthlyStableAssignBusy=false;
      if(button?.isConnected){button.disabled=false;button.textContent=oldText}
    }
  }

  document.addEventListener('click',ev=>{
    const btn=ev.target?.closest?.('#shmcAssignBtn');
    if(!btn)return;
    const raw=btn.getAttribute('onclick')||'';
    const m=raw.match(/shMonthlyCleanAddRecipients\('([^']+)'\)/);
    if(!m)return;
    ev.preventDefault();ev.stopPropagation();
    if(typeof ev.stopImmediatePropagation==='function')ev.stopImmediatePropagation();
    addRecipients(m[1],btn);
  },true);

  console.info('SkillHub: monthly assignment stability enabled');
})();
