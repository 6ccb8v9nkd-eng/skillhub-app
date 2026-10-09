/* SkillHub final assessment sort_cards submit fix — 2026-10-09
   Loaded LAST. Saves only the current sort_cards task directly to monthly_check_runs,
   then reopens the assessment at the next unanswered item.
*/
(function(){
  'use strict';
  if(window.__shMonthlySortSubmitFinal)return;
  window.__shMonthlySortSubmitFinal=true;

  const now=()=>new Date().toISOString();
  const safeArr=x=>Array.isArray(x)?x:[];
  const notify=t=>{try{typeof toast==='function'?toast(t):console.info(t)}catch(_){console.info(t)}};

  async function submitSort(itemId){
    if(!itemId)return notify('Не удалось определить задание');
    let btn=null;
    try{
      const task=document.querySelector('#page-run .shmc-task');
      if(!task)throw new Error('Текущее задание не найдено');

      btn=task.querySelector('button.shmc-next');
      const selects=[...task.querySelectorAll('select[data-shmc-sort]')];
      const values=selects.map(x=>String(x.value||'').trim());

      if(!values.length)throw new Error('Карточки задания не найдены');
      if(values.some(v=>!v)){
        const filled=values.filter(Boolean).length;
        throw new Error(`Распределено ${filled} из ${values.length} карточек`);
      }

      if(typeof S==='undefined'||!S?.sb||!S?.profile?.login)throw new Error('Нет активной сессии');
      if(btn){btn.disabled=true;btn.textContent='Сохраняем…'}

      const iq=await S.sb.from('monthly_check_items').select('*').eq('id',itemId).single();
      if(iq.error)throw iq.error;
      const item=iq.data;
      if(item?.kind!=='hard'||item?.snapshot?.payload?.mode!=='sort_cards')throw new Error('Неверный формат задания');

      const cards=safeArr(item.snapshot?.payload?.cards);
      if(cards.length!==values.length)throw new Error(`Ожидалось ${cards.length} карточек, получено ${values.length}`);

      const rq=await S.sb.from('monthly_check_runs').select('*').eq('check_id',item.check_id).eq('login',S.profile.login).maybeSingle();
      if(rq.error)throw rq.error;
      if(!rq.data)throw new Error('Запуск аттестации не найден');
      const run=rq.data;

      const allq=await S.sb.from('monthly_check_items').select('id,position,kind').eq('check_id',item.check_id).order('position',{ascending:true});
      if(allq.error)throw allq.error;
      const items=allq.data||[];

      let ok=0;
      cards.forEach((c,i)=>{if(values[i]===String(c?.category??''))ok++});
      const points=cards.length?ok/cards.length:0;

      const breakdown=(run.breakdown&&typeof run.breakdown==='object')?structuredClone(run.breakdown):{};
      breakdown.version=breakdown.version||'clean_v1';
      breakdown.answers=(breakdown.answers&&typeof breakdown.answers==='object')?breakdown.answers:{};
      breakdown.answers[item.id]={kind:'hard',max:1,saved_at:now(),placements:values,points};

      let next=items.length;
      for(let i=0;i<items.length;i++){
        if(!breakdown.answers[items[i].id]){next=i;break}
      }
      breakdown.current_index=next;
      const done=Object.keys(breakdown.answers).filter(id=>items.some(x=>x.id===id)).length;
      const progress=items.length?Math.round(done/items.length*100):0;

      const uq=await S.sb.from('monthly_check_runs').update({
        status:'in_progress',
        progress,
        breakdown,
        updated_at:now()
      }).eq('id',run.id);
      if(uq.error)throw uq.error;

      // Re-read the run through the clean assessment module so its private state stays in sync.
      if(typeof window.shMonthlyStart==='function'){
        await Promise.resolve(window.shMonthlyStart(item.check_id));
      }else{
        throw new Error('Модуль аттестации не готов');
      }
    }catch(e){
      console.error('monthly sort final submit',e);
      notify(e?.message||'Не удалось сохранить распределение');
      if(btn?.isConnected){btn.disabled=false;btn.textContent='Сохранить и продолжить'}
    }
  }

  // Override only sort_cards submission. Scenario/calc/manual/AI remain untouched.
  window.shMonthlySubmitSort=submitSort;
  console.info('SkillHub: final assessment sort_cards submit fix enabled');
})();
