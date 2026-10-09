/* SkillHub final assessment sort_cards submit isolation v3 — 2026-10-09
   PILOT ONLY: d.i.sharipova, employee, #page-run.
   Does not touch regular Hard/Soft trainers.
*/
(function(){
  'use strict';
  if(window.__shMonthlySortSubmitFinalV3)return;
  window.__shMonthlySortSubmitFinalV3=true;

  const PILOT='d.i.sharipova';
  const now=()=>new Date().toISOString();
  const safeArr=x=>Array.isArray(x)?x:[];

  function state(){
    try{if(typeof S!=='undefined'&&S)return S}catch(_){ }
    return null;
  }
  function notify(text){
    try{if(typeof toast==='function')toast(text);else console.info(text)}catch(_){console.info(text)}
  }
  function isPilot(){
    const st=state();
    return String(st?.profile?.role||'').toLowerCase()==='employee' &&
      String(st?.profile?.login||'').trim().toLowerCase()===PILOT;
  }
  function currentTask(){
    if(!isPilot())return null;
    const page=document.getElementById('page-run');
    if(!page||page.classList.contains('hidden'))return null;
    const task=page.querySelector('.shmc-task');
    return task?.querySelector('.shmc-sort')?task:null;
  }
  function itemIdFromButton(btn){
    const source=String(btn?.dataset?.shMonthlyOriginalOnclick||btn?.getAttribute?.('onclick')||'');
    const m=source.match(/shMonthlySubmitSort\(['\"]([^'\"]+)['\"]\)/);
    return m?.[1]||'';
  }
  function visibleValues(task,count){
    const values=Array(count).fill('');
    const zones=[...task.querySelectorAll('.sh-hard-sort-zone[data-month-sort-category]')];
    if(!zones.length)return null;
    zones.forEach(zone=>{
      const cat=String(zone.dataset.monthSortCategory||'').trim();
      zone.querySelectorAll('.sh-hard-sort-card[data-month-sort-index]').forEach(card=>{
        const idx=Number(card.dataset.monthSortIndex);
        if(Number.isInteger(idx)&&idx>=0&&idx<count)values[idx]=cat;
      });
    });
    return values;
  }
  function fallbackValues(task,count){
    const rows=[...task.querySelectorAll('select[data-shmc-sort]')]
      .map(sel=>({idx:Number(sel.dataset.shmcSort),value:String(sel.value||'').trim()}))
      .filter(x=>Number.isInteger(x.idx))
      .sort((a,b)=>a.idx-b.idx);
    if(rows.length!==count)return null;
    const values=Array(count).fill('');
    rows.forEach(x=>{if(x.idx>=0&&x.idx<count)values[x.idx]=x.value});
    return values;
  }
  function cloneBreakdown(v){
    if(!v||typeof v!=='object')return {};
    try{return structuredClone(v)}catch(_){try{return JSON.parse(JSON.stringify(v))}catch(__){return {}}}
  }

  async function submit(itemId,task,btn){
    const st=state();
    if(!st?.sb||!st?.profile?.login)return notify('Нет активной сессии');
    if(!itemId)return notify('Не удалось определить текущее задание');
    if(btn){btn.disabled=true;btn.textContent='Сохраняем…'}
    try{
      const iq=await st.sb.from('monthly_check_items').select('*').eq('id',itemId).single();
      if(iq.error)throw iq.error;
      const item=iq.data;
      if(item?.kind!=='hard'||item?.snapshot?.payload?.mode!=='sort_cards')throw new Error('Неверный формат задания');

      const cards=safeArr(item.snapshot?.payload?.cards);
      if(!cards.length)throw new Error('В задании нет карточек');
      const values=visibleValues(task,cards.length)||fallbackValues(task,cards.length);
      if(!values)throw new Error('Не удалось прочитать распределение карточек');
      const missing=values.filter(v=>!String(v||'').trim()).length;
      if(missing)throw new Error(`Распределите все карточки: осталось ${missing}`);

      let ok=0;
      cards.forEach((c,i)=>{if(String(values[i])===String(c?.category??''))ok++});
      const points=cards.length?ok/cards.length:0;

      const rq=await st.sb.from('monthly_check_runs').select('*').eq('check_id',item.check_id).eq('login',st.profile.login).maybeSingle();
      if(rq.error)throw rq.error;
      const run=rq.data;
      if(!run)throw new Error('Запуск аттестации не найден');

      const allq=await st.sb.from('monthly_check_items').select('id,position').eq('check_id',item.check_id).order('position',{ascending:true});
      if(allq.error)throw allq.error;
      const items=allq.data||[];
      const validIds=new Set(items.map(x=>x.id));

      const breakdown=cloneBreakdown(run.breakdown);
      breakdown.version=breakdown.version||'clean_v1';
      breakdown.answers=breakdown.answers&&typeof breakdown.answers==='object'?breakdown.answers:{};
      breakdown.answers[item.id]={kind:'hard',max:1,saved_at:now(),placements:values,points};

      let next=items.length;
      for(let i=0;i<items.length;i++)if(!breakdown.answers[items[i].id]){next=i;break}
      breakdown.current_index=next;
      const done=Object.keys(breakdown.answers).filter(id=>validIds.has(id)).length;
      const progress=items.length?Math.round(done/items.length*100):0;

      const uq=await st.sb.from('monthly_check_runs').update({status:'in_progress',progress,breakdown,updated_at:now()}).eq('id',run.id);
      if(uq.error)throw uq.error;

      if(typeof window.shMonthlyStart!=='function')throw new Error('Модуль аттестации не готов');
      await Promise.resolve(window.shMonthlyStart(item.check_id));
    }catch(e){
      console.error('SkillHub final assessment sort submit v3',e);
      notify(e?.message||'Не удалось сохранить распределение');
      if(btn?.isConnected){btn.disabled=false;btn.textContent='Сохранить и продолжить'}
    }
  }

  const previous=window.shMonthlySubmitSort;
  window.shMonthlySubmitSort=function(itemId){
    const task=currentTask();
    if(!task)return typeof previous==='function'?previous(itemId):undefined;
    const btn=task.querySelector('button.shmc-next');
    return submit(String(itemId||itemIdFromButton(btn)||''),task,btn);
  };

  document.addEventListener('click',function(ev){
    if(!isPilot())return;
    const btn=ev.target?.closest?.('#page-run .shmc-task button.shmc-next');
    if(!btn)return;
    const task=btn.closest('.shmc-task');
    if(!task?.querySelector('.shmc-sort'))return;
    const itemId=itemIdFromButton(btn);
    if(!itemId)return;
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation?.();
    void submit(itemId,task,btn);
  },true);

  console.info('SkillHub: pilot final assessment sort submit isolation v3 enabled');
})();
