/* SkillHub monthly clean UI integration guard — 2026-10-09.
   Keeps only the rebuilt final knowledge assessment UI, removes obsolete monthly clones,
   upgrades monthly sort_cards tasks to the native Hard Skills card/column interaction,
   and scopes sort submission strictly to the current assessment task.
*/
(function(){
  'use strict';
  if(window.__shMonthlyCleanHostGuardV4)return;
  window.__shMonthlyCleanHostGuardV4=true;

  let queued=false;

  function isManager(){
    try{return typeof S!=='undefined' && ['mentor','rs','tech_admin'].includes(S?.profile?.role)}catch(_){return false}
  }

  function cleanupLegacyEmployee(){
    const home=document.getElementById('page-home');
    if(!home)return;
    home.querySelectorAll('.sh-month-card.sh-month-employee,[data-sh-monthly-employee]:not([data-sh-monthly-clean-employee])').forEach(el=>el.remove());
  }

  function upgradeMonthlySortCards(){
    document.querySelectorAll('.shmc-sort:not([data-sh-hard-sort-upgraded])').forEach(box=>{
      box.setAttribute('data-sh-hard-sort-upgraded','1');

      const labels=[...box.children].filter(el=>el.tagName==='LABEL');
      const rows=labels.map((label,index)=>({
        index,
        label,
        text:label.querySelector('span')?.textContent?.trim()||`Карточка ${index+1}`,
        select:label.querySelector('select[data-shmc-sort]')
      })).filter(x=>x.select);
      if(!rows.length)return;

      const first=rows[0].select;
      const categories=[...first.options].filter(o=>o.value).map(o=>({id:o.value,title:o.textContent.trim()}));
      if(!categories.length)return;

      labels.forEach(label=>{
        label.style.display='none';
        label.setAttribute('aria-hidden','true');
      });

      const task=box.closest('.shmc-task');
      const submit=task?.querySelector('button.shmc-next');
      let selected=null;

      const ui=document.createElement('div');
      ui.className='sh-month-native-sort';
      box.appendChild(ui);

      function placements(){
        const out={};
        rows.forEach(r=>{if(r.select.value)out[r.index]=r.select.value});
        return out;
      }

      function setPlacement(index,categoryId){
        const row=rows.find(r=>r.index===Number(index));
        if(!row)return;
        row.select.value=categoryId||'';
        row.select.dispatchEvent(new Event('change',{bubbles:true}));
        selected=null;
        render();
      }

      function cardButton(row,placed){
        const b=document.createElement('button');
        b.type='button';
        b.className='sh-hard-sort-card'+(selected===row.index?' is-selected':'');
        b.draggable=true;
        b.dataset.monthSortIndex=String(row.index);
        const span=document.createElement('span');
        span.textContent=row.text;
        b.appendChild(span);
        b.addEventListener('dragstart',ev=>{
          ev.dataTransfer.setData('text/plain',String(row.index));
          ev.dataTransfer.effectAllowed='move';
        });
        b.addEventListener('click',ev=>{
          ev.stopPropagation();
          if(placed){setPlacement(row.index,'');return}
          selected=selected===row.index?null:row.index;
          render();
        });
        return b;
      }

      async function submitCurrentTask(ev){
        ev.preventDefault();
        ev.stopPropagation();
        ev.stopImmediatePropagation?.();

        const values=rows.map(r=>r.select.value);
        if(values.length!==rows.length||values.some(v=>!v)){
          if(typeof toast==='function')toast('Распределите все карточки');
          return;
        }

        const original=window.shMonthlySubmitSort;
        if(typeof original!=='function'){
          if(typeof toast==='function')toast('Не удалось сохранить распределение');
          return;
        }

        const originalAttr=submit?.dataset?.shMonthlyOriginalOnclick||'';
        const idMatch=originalAttr.match(/shMonthlySubmitSort\('([^']+)'\)/);
        const itemId=idMatch?.[1];
        if(!itemId){
          if(typeof toast==='function')toast('Не удалось определить задание');
          return;
        }

        if(submit){submit.disabled=true;submit.textContent='Сохраняем…'}

        // The legacy monthly submitter queries every [data-shmc-sort] in document.
        // Temporarily detach only foreign selects so it sees exactly this task's cards.
        const own=new Set(rows.map(r=>r.select));
        const detached=[];
        [...document.querySelectorAll('[data-shmc-sort]')].forEach(sel=>{
          if(own.has(sel))return;
          const marker=document.createComment('sh-month-foreign-sort');
          sel.parentNode?.insertBefore(marker,sel);
          detached.push({sel,marker,parent:sel.parentNode});
          sel.remove();
        });

        try{
          await Promise.resolve(original(itemId));
        }finally{
          detached.forEach(({sel,marker,parent})=>{
            if(marker.parentNode)marker.parentNode.replaceChild(sel,marker);
            else if(parent?.isConnected)parent.appendChild(sel);
          });
          if(submit?.isConnected){submit.disabled=false;submit.textContent='Сохранить и продолжить'}
        }
      }

      if(submit){
        const originalAttr=submit.getAttribute('onclick')||'';
        submit.dataset.shMonthlyOriginalOnclick=originalAttr;
        submit.removeAttribute('onclick');
        submit.onclick=null;
        submit.addEventListener('click',submitCurrentTask);
      }

      function render(){
        const placed=placements();
        const placedCount=Object.keys(placed).length;
        if(submit)submit.disabled=placedCount<rows.length;

        ui.replaceChildren();

        const tip=document.createElement('div');
        tip.className='sh-hard-sort-tip';
        tip.textContent='На компьютере — перетащите карточку. На телефоне — нажмите на карточку, затем на нужную колонку.';
        ui.appendChild(tip);

        const pool=document.createElement('div');
        pool.className='sh-hard-sort-pool';
        const poolHead=document.createElement('div');
        poolHead.className='sh-hard-sort-pool-head';
        const poolTitle=document.createElement('b');
        poolTitle.textContent='Карточки для распределения';
        const count=document.createElement('span');
        count.textContent=`${placedCount}/${rows.length}`;
        poolHead.append(poolTitle,count);
        const poolBody=document.createElement('div');
        poolBody.className='sh-hard-sort-pool-body';
        const unplaced=rows.filter(r=>!placed[r.index]);
        if(unplaced.length)unplaced.forEach(r=>poolBody.appendChild(cardButton(r,false)));
        else{
          const empty=document.createElement('div');
          empty.className='sh-hard-sort-empty';
          empty.textContent='Все карточки распределены';
          poolBody.appendChild(empty);
        }
        pool.append(poolHead,poolBody);
        ui.appendChild(pool);

        const grid=document.createElement('div');
        grid.className='sh-hard-sort-grid';
        categories.forEach(cat=>{
          const zone=document.createElement('section');
          zone.className='sh-hard-sort-zone';
          zone.dataset.monthSortCategory=cat.id;
          zone.addEventListener('dragover',ev=>ev.preventDefault());
          zone.addEventListener('drop',ev=>{
            ev.preventDefault();
            const idx=Number(ev.dataTransfer.getData('text/plain'));
            if(Number.isInteger(idx))setPlacement(idx,cat.id);
          });
          zone.addEventListener('click',()=>{
            if(selected!==null)setPlacement(selected,cat.id);
          });

          const head=document.createElement('div');
          head.className='sh-hard-sort-zone-head';
          const icon=document.createElement('span');
          icon.textContent='';
          const titleWrap=document.createElement('div');
          const h=document.createElement('h3');
          h.textContent=cat.title;
          titleWrap.appendChild(h);
          const n=document.createElement('b');
          const inside=rows.filter(r=>placed[r.index]===cat.id);
          n.textContent=String(inside.length);
          head.append(icon,titleWrap,n);

          const body=document.createElement('div');
          body.className='sh-hard-sort-zone-body';
          if(inside.length)inside.forEach(r=>body.appendChild(cardButton(r,true)));
          else{
            const empty=document.createElement('div');
            empty.className='sh-hard-sort-empty';
            empty.textContent=selected!==null?'Нажмите сюда, чтобы поместить выбранную карточку':'Перетащите карточку сюда';
            body.appendChild(empty);
          }
          zone.append(head,body);
          grid.appendChild(zone);
        });
        ui.appendChild(grid);
      }

      render();
    });
  }

  function fixMonthlyPlacement(){
    queued=false;
    cleanupLegacyEmployee();
    upgradeMonthlySortCards();

    if(!isManager())return;

    const mentor=document.getElementById('page-mentor');
    if(mentor){
      mentor.querySelectorAll('[data-sh-monthly-manager]:not([data-sh-monthly-clean-manager])').forEach(el=>el.remove());
    }

    const page=document.getElementById('page-assignments');
    const host=document.getElementById('shAssignmentMonthlyHost');
    if(!page||!host)return;

    const cleanCards=[...page.querySelectorAll('[data-sh-monthly-clean-manager]')];
    if(!cleanCards.length)return;

    const clean=cleanCards[0];
    cleanCards.slice(1).forEach(el=>el.remove());
    clean.setAttribute('data-sh-monthly-assignment-clone','1');

    if(clean.parentElement!==host){
      host.replaceChildren(clean);
    }else{
      host.querySelectorAll('[data-sh-monthly-assignment-clone]:not([data-sh-monthly-clean-manager])').forEach(el=>el.remove());
      host.querySelectorAll('.sh-as-loading').forEach(el=>el.remove());
    }
  }

  function scheduleFix(){
    if(queued)return;
    queued=true;
    queueMicrotask(fixMonthlyPlacement);
  }

  const observer=new MutationObserver(scheduleFix);
  observer.observe(document.body,{subtree:true,childList:true});

  setTimeout(fixMonthlyPlacement,0);
  setTimeout(fixMonthlyPlacement,250);
  setTimeout(fixMonthlyPlacement,900);
  console.info('SkillHub: monthly clean UI guard v4 + scoped native sort submit enabled');
})();
