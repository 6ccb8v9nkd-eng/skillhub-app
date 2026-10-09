/* SkillHub final assessment sort_cards submit isolation — 2026-10-09
   PILOT ONLY: d.i.sharipova, employee, #page-run.
   This patch does not touch regular Hard/Soft trainers.
   It synchronizes the visible native sort UI with the current task's hidden selects,
   temporarily hides foreign monthly sort selects, and delegates saving/progress to the
   clean final-assessment module so its private RUN state stays authoritative.
*/
(function(){
  'use strict';
  if(window.__shMonthlySortSubmitFinalV2)return;
  window.__shMonthlySortSubmitFinalV2=true;

  const PILOT='d.i.sharipova';
  const baseSubmit=window.shMonthlySubmitSort;

  function isPilot(){
    try{
      return String(window.S?.profile?.role||'').toLowerCase()==='employee' &&
        String(window.S?.profile?.login||'').trim().toLowerCase()===PILOT;
    }catch(_){return false}
  }

  function notify(text){
    try{
      if(typeof window.toast==='function')window.toast(text);
      else console.info(text);
    }catch(_){console.info(text)}
  }

  function currentSortTask(){
    if(!isPilot())return null;
    const page=document.getElementById('page-run');
    if(!page || page.classList.contains('hidden'))return null;
    const task=page.querySelector('.shmc-task');
    if(!task || !task.querySelector('.shmc-sort'))return null;
    return task;
  }

  function itemIdFromButton(btn){
    if(!btn)return '';
    const source=String(btn.dataset?.shMonthlyOriginalOnclick||btn.getAttribute('onclick')||'');
    const m=source.match(/shMonthlySubmitSort\(['\"]([^'\"]+)['\"]\)/);
    return m?.[1]||'';
  }

  function rowsForTask(task){
    return [...task.querySelectorAll('select[data-shmc-sort]')]
      .map(select=>({
        select,
        index:Number(select.getAttribute('data-shmc-sort'))
      }))
      .filter(x=>Number.isInteger(x.index))
      .sort((a,b)=>a.index-b.index);
  }

  function visiblePlacements(task,rows){
    const values=Array(rows.length).fill('');
    const zones=[...task.querySelectorAll('.sh-hard-sort-zone[data-month-sort-category]')];
    if(!zones.length)return null;

    zones.forEach(zone=>{
      const category=String(zone.dataset.monthSortCategory||'');
      zone.querySelectorAll('.sh-hard-sort-card[data-month-sort-index]').forEach(card=>{
        const idx=Number(card.dataset.monthSortIndex);
        if(Number.isInteger(idx) && idx>=0 && idx<values.length)values[idx]=category;
      });
    });
    return values;
  }

  function syncCurrentTask(task){
    const rows=rowsForTask(task);
    if(!rows.length)throw new Error('Карточки задания не найдены');

    const visible=visiblePlacements(task,rows);
    const values=visible || rows.map(r=>String(r.select.value||'').trim());

    if(values.length!==rows.length)throw new Error('Не удалось прочитать распределение карточек');
    const missing=values.reduce((acc,v,i)=>{if(!String(v||'').trim())acc.push(i);return acc},[]);
    if(missing.length)throw new Error(`Распределите все карточки: осталось ${missing.length}`);

    rows.forEach((row,pos)=>{
      const value=String(values[pos]||'').trim();
      if(row.select.value!==value){
        row.select.value=value;
        row.select.dispatchEvent(new Event('change',{bubbles:true}));
      }
    });
    return rows;
  }

  async function callBaseForCurrentTask(itemId,task,btn){
    if(typeof baseSubmit!=='function')throw new Error('Модуль итоговой проверки не готов');
    const rows=syncCurrentTask(task);
    const own=new Set(rows.map(r=>r.select));
    const detached=[];

    // The clean assessment's original submitter is intentionally reused for persistence,
    // but it queries [data-shmc-sort] globally. During this one call, detach foreign
    // monthly selects so only the current task is visible to it.
    document.querySelectorAll('select[data-shmc-sort]').forEach(sel=>{
      if(own.has(sel))return;
      const parent=sel.parentNode;
      if(!parent)return;
      const marker=document.createComment('sh-final-sort-foreign');
      parent.insertBefore(marker,sel);
      detached.push({sel,marker,parent});
      sel.remove();
    });

    if(btn){
      btn.disabled=true;
      btn.textContent='Сохраняем…';
    }

    try{
      await Promise.resolve(baseSubmit(itemId));
    }finally{
      detached.forEach(({sel,marker,parent})=>{
        if(marker.parentNode)marker.parentNode.replaceChild(sel,marker);
        else if(parent?.isConnected)parent.appendChild(sel);
      });
      if(btn?.isConnected){
        btn.disabled=false;
        btn.textContent='Сохранить и продолжить';
      }
    }
  }

  async function submitPilot(itemId,task,btn){
    try{
      const id=String(itemId||itemIdFromButton(btn)||'').trim();
      if(!id)throw new Error('Не удалось определить текущее задание');
      await callBaseForCurrentTask(id,task,btn);
    }catch(e){
      console.error('SkillHub final assessment sort submit',e);
      notify(e?.message||'Не удалось сохранить распределение');
      if(btn?.isConnected){
        btn.disabled=false;
        btn.textContent='Сохранить и продолжить';
      }
    }
  }

  // Safe wrapper for the inline function name. Non-pilot users keep the original behavior.
  window.shMonthlySubmitSort=function(itemId){
    if(!isPilot() || typeof baseSubmit!=='function'){
      return typeof baseSubmit==='function'?baseSubmit(itemId):undefined;
    }
    const task=currentSortTask();
    if(!task)return baseSubmit(itemId);
    const btn=task.querySelector('button.shmc-next');
    return submitPilot(itemId,task,btn);
  };

  // Capture only the final-assessment sort button for the pilot. This prevents obsolete
  // bubble/inline handlers from firing after a successful click, while leaving every
  // regular trainer and every other assessment task untouched.
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
    void submitPilot(itemId,task,btn);
  },true);

  console.info('SkillHub: pilot final assessment sort submit isolation v2 enabled');
})();
