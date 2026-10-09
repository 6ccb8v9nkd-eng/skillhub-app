/* SkillHub final assessment manual submit + prompt copy protection — 2026-10-09
   Isolated to #page-run final assessment. Does not touch regular Hard/Soft trainers.
*/
(function(){
  'use strict';
  if(window.__shMonthlyManualSubmitFinalV1)return;
  window.__shMonthlyManualSubmitFinalV1=true;

  const now=()=>new Date().toISOString();
  const safeArr=x=>Array.isArray(x)?x:[];
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number(n)||0));

  function state(){
    try{if(typeof S!=='undefined'&&S)return S}catch(_){ }
    return null;
  }
  function notify(text){
    try{if(typeof toast==='function')toast(text);else console.info(text)}catch(_){console.info(text)}
  }
  function clone(v){
    if(!v||typeof v!=='object')return {};
    try{return structuredClone(v)}catch(_){try{return JSON.parse(JSON.stringify(v))}catch(__){return {}}}
  }
  function isEditable(el){
    return !!el?.closest?.('textarea,input,select,[contenteditable="true"]');
  }
  function currentTask(){
    const page=document.getElementById('page-run');
    if(!page||page.classList.contains('hidden'))return null;
    const task=page.querySelector('.shmc-run .shmc-task');
    if(!task||!task.querySelector('textarea#shmcManualAnswer'))return null;
    return task;
  }
  function itemIdFromButton(btn){
    const src=String(btn?.getAttribute?.('onclick')||'');
    const m=src.match(/shMonthlySubmitManual\(['\"]([^'\"]+)['\"]\)/);
    return m?.[1]||'';
  }

  async function submit(itemId,task,btn){
    const st=state();
    if(!st?.sb||!st?.profile?.login)return notify('Нет активной сессии');
    const field=task?.querySelector('textarea#shmcManualAnswer');
    const answer=String(field?.value||'').trim();
    if(answer.length<10){notify('Напишите более полный ответ');return}
    if(!itemId){notify('Не удалось определить текущее задание');return}

    if(btn){btn.disabled=true;btn.textContent='Проверяем ответ…'}
    try{
      const iq=await st.sb.from('monthly_check_items').select('id,check_id,kind').eq('id',itemId).single();
      if(iq.error)throw iq.error;
      const item=iq.data;
      if(item?.kind!=='manual')throw new Error('Неверный формат задания');

      const ai=await st.sb.functions.invoke('monthly-assessment-ai',{body:{action:'manual_review',checkId:item.check_id,itemId:item.id,answer}});
      if(ai.error)throw new Error(ai.error.message||'ИИ временно недоступен');
      if(ai.data?.error)throw new Error(ai.data.error);

      const rq=await st.sb.from('monthly_check_runs').select('*').eq('check_id',item.check_id).eq('login',st.profile.login).maybeSingle();
      if(rq.error)throw rq.error;
      const run=rq.data;
      if(!run)throw new Error('Запуск аттестации не найден');

      const allq=await st.sb.from('monthly_check_items').select('id,position,kind').eq('check_id',item.check_id).order('position',{ascending:true});
      if(allq.error)throw allq.error;
      const items=allq.data||[];
      const validIds=new Set(items.map(x=>x.id));

      const breakdown=clone(run.breakdown);
      breakdown.version=breakdown.version||'clean_v1';
      breakdown.answers=breakdown.answers&&typeof breakdown.answers==='object'?breakdown.answers:{};
      breakdown.answers[item.id]={
        kind:'manual',
        max:1,
        saved_at:now(),
        answer,
        review:ai.data?.review||{},
        points:clamp(ai.data?.points,0,1)
      };

      let next=items.length;
      for(let i=0;i<items.length;i++){
        if(!breakdown.answers[items[i].id]){next=i;break}
      }
      breakdown.current_index=next;
      const done=Object.keys(breakdown.answers).filter(id=>validIds.has(id)).length;
      const progress=items.length?Math.round(done/items.length*100):0;

      const uq=await st.sb.from('monthly_check_runs').update({status:'in_progress',progress,breakdown,updated_at:now()}).eq('id',run.id);
      if(uq.error)throw uq.error;

      if(typeof window.shMonthlyStart!=='function')throw new Error('Модуль аттестации не готов');
      await Promise.resolve(window.shMonthlyStart(item.check_id));
    }catch(e){
      console.error('SkillHub final assessment manual submit',e);
      notify(e?.message||'Не удалось проверить ответ');
      if(btn?.isConnected){btn.disabled=false;btn.textContent='Проверить и продолжить'}
    }
  }

  const previous=window.shMonthlySubmitManual;
  window.shMonthlySubmitManual=function(itemId){
    const task=currentTask();
    if(!task)return typeof previous==='function'?previous(itemId):undefined;
    const btn=task.querySelector('button#shmcManualBtn,button.shmc-next');
    return submit(String(itemId||itemIdFromButton(btn)||''),task,btn);
  };

  document.addEventListener('click',function(ev){
    const btn=ev.target?.closest?.('#page-run .shmc-run .shmc-task button#shmcManualBtn');
    if(!btn)return;
    const task=btn.closest('.shmc-task');
    if(!task?.querySelector('textarea#shmcManualAnswer'))return;
    const itemId=itemIdFromButton(btn);
    if(!itemId)return;
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation?.();
    void submit(itemId,task,btn);
  },true);

  // Prevent ordinary selection/copy of assessment prompt text only.
  // Editable controls remain fully usable.
  const style=document.createElement('style');
  style.id='shMonthlyNoCopyStyle';
  style.textContent=`
    #page-run .shmc-run .shmc-task{user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
    #page-run .shmc-run .shmc-task textarea,
    #page-run .shmc-run .shmc-task input,
    #page-run .shmc-run .shmc-task select,
    #page-run .shmc-run .shmc-task [contenteditable="true"]{user-select:text;-webkit-user-select:text;-webkit-touch-callout:default}
  `;
  document.head.appendChild(style);

  for(const type of ['copy','cut','contextmenu','selectstart']){
    document.addEventListener(type,function(ev){
      const task=ev.target?.closest?.('#page-run .shmc-run .shmc-task');
      if(!task||isEditable(ev.target))return;
      ev.preventDefault();
    },true);
  }

  console.info('SkillHub: final assessment manual submit + no-copy prompt v1 enabled');
})();
