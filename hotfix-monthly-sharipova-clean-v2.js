/* SkillHub monthly assessment clean pilot launch — Sharipova only, 2026-10-09 */
(function(){
  'use strict';
  if(window.__shMonthlySharipovaCleanV2)return;
  window.__shMonthlySharipovaCleanV2=true;

  const PILOT='d.i.sharipova';
  let busy=false,refreshing=false,lastState=null,lastAt=0;
  const isPilot=()=>window.S?.profile?.role==='employee'&&String(window.S?.profile?.login||'').toLowerCase()===PILOT;
  const sb=()=>window.S?.sb||null;
  const toast=m=>{try{window.toast?.(m)}catch(_){}};

  async function state(force=false){
    if(!isPilot()||!sb())return null;
    if(!force&&lastState&&Date.now()-lastAt<5000)return lastState;
    const cq=await sb().from('monthly_checks').select('id,status,recipients,config,due_date,due_at,month_key,pass_score,created_at').eq('status','assigned').order('created_at',{ascending:false}).limit(30);
    if(cq.error)throw cq.error;
    const check=(cq.data||[]).find(x=>Array.isArray(x.recipients)&&x.recipients.includes(PILOT));
    if(!check)return null;
    const [iq,rq]=await Promise.all([
      sb().from('monthly_check_items').select('id,position,kind,snapshot,max_score,source_content_id').eq('check_id',check.id).order('position',{ascending:true}),
      sb().from('monthly_check_runs').select('id,status,progress,started_at,breakdown').eq('check_id',check.id).eq('login',PILOT).maybeSingle()
    ]);
    if(iq.error)throw iq.error;if(rq.error)throw rq.error;
    const items=iq.data||[],run=rq.data||null;
    const hard=items.filter(x=>x.kind==='hard'),ai=items.filter(x=>x.kind==='ai_dialogue'),manual=items.filter(x=>x.kind==='manual');
    const badHard=hard.filter(x=>!['sort_cards','scenario','tariff_calc'].includes(String(x.snapshot?.payload?.mode||'scenario')));
    if(badHard.length)throw new Error('В итоговую проверку попало неподдерживаемое Hard-задание');
    lastState={check,items,run,counts:{hard:hard.length,ai:ai.length,manual:manual.length}};lastAt=Date.now();return lastState;
  }

  function monthLabel(key){
    const MONTHS=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
    const [y,m]=String(key||'').split('-').map(Number);return `${MONTHS[m-1]||''} ${y||''}`.trim();
  }

  function decorateCard(s){
    const page=document.getElementById('page-home');if(!page||!s)return;
    const card=page.querySelector('[data-sh-monthly-employee]');if(!card)return;
    card.dataset.shSharipovaClean='2';
    const title=card.querySelector('.sh-month-head h2');if(title)title.textContent=monthLabel(s.check.month_key);
    const progress=Number(s.run?.progress||0);
    const ring=card.querySelector('.sh-month-ring');if(ring){ring.style.setProperty('--p',String(progress));const strong=ring.querySelector('strong');if(strong)strong.textContent=`${progress}%`;}
    const info=card.querySelector('.sh-month-employee-row>div:last-child b');if(info)info.textContent=`${s.items.length} заданий · ≈ ${Number(s.check.config?.estimated_minutes||30)} мин`;
    const mini=card.querySelector('.sh-month-mini-parts');if(mini)mini.innerHTML=`<span>💬 ИИ-диалог · ${s.counts.ai}</span><span>🧠 Hard Skills · ${s.counts.hard}</span><span>✍️ Ручной · ${s.counts.manual}</span>`;
    let btn=card.querySelector('[data-sh-final-launch]')||card.querySelector('button.btn.primary.full');
    if(btn){
      btn.removeAttribute('onclick');btn.disabled=false;btn.removeAttribute('disabled');btn.setAttribute('type','button');btn.setAttribute('aria-disabled','false');
      btn.dataset.shFinalLaunch='1';btn.dataset.checkId=s.check.id;btn.style.setProperty('pointer-events','auto','important');btn.style.setProperty('opacity','1','important');
      btn.textContent=(s.run&&s.run.status!=='not_started'?'Продолжить проверку':'Начать проверку')+' →';
    }
  }

  async function refresh(force=false){
    if(refreshing||!isPilot())return;refreshing=true;
    try{const s=await state(force);if(s)decorateCard(s)}catch(err){console.error('Sharipova monthly card refresh',err)}finally{refreshing=false}
  }

  async function ensureRunner(){
    if(typeof window.shMonthlyBeginV12==='function')return window.shMonthlyBeginV12;
    if(window.__shMonthlyRunnerV12&&typeof window.shMonthlyBegin==='function')return window.shMonthlyBegin;
    await new Promise((resolve,reject)=>{
      const id='shMonthlyCleanRunnerReload';document.getElementById(id)?.remove();
      window.__shMonthlyRunnerV12=false;
      const s=document.createElement('script');s.id=id;s.src='./hotfix-monthly-runner-v12.js?v=20261009_clean_v2';
      s.onload=resolve;s.onerror=()=>reject(new Error('Не удалось загрузить модуль итоговой проверки'));document.head.appendChild(s);
    });
    return window.shMonthlyBeginV12||window.shMonthlyBegin;
  }

  async function launch(btn){
    if(busy||!isPilot())return;busy=true;
    const old=btn?.textContent||'Начать проверку →';
    try{
      if(btn){btn.disabled=true;btn.textContent='Открываем…';}
      const s=await state(true);if(!s)throw new Error('Назначенная проверка не найдена');
      if(s.items.length!==12||s.counts.hard!==8||s.counts.ai!==2||s.counts.manual!==2)throw new Error(`Состав проверки некорректен: ${s.items.length} заданий`);
      const run=await ensureRunner();if(typeof run!=='function')throw new Error('Модуль итоговой проверки не готов');
      await Promise.resolve(run(s.check.id));
      await new Promise(r=>setTimeout(r,80));
      const page=document.getElementById('page-run');
      if(!page||page.classList.contains('hidden')||!page.querySelector('.sh12r')){
        document.querySelectorAll('.page').forEach(x=>x.classList.add('hidden'));
        if(page)page.classList.remove('hidden');
        if(window.S)window.S.currentPage='run';
        await Promise.resolve(run(s.check.id));
      }
      await new Promise(r=>setTimeout(r,120));
      if(!document.getElementById('page-run')?.querySelector('.sh12r'))throw new Error('Экран проверки не открылся');
    }catch(err){console.error('Sharipova clean monthly launch',err);toast(err?.message||'Не удалось начать проверку');if(btn&&btn.isConnected){btn.disabled=false;btn.textContent=old;}}
    finally{busy=false;}
  }

  function intercept(ev){
    if(!isPilot())return;
    const el=ev.target?.closest?.('[data-sh-final-launch]');if(!el)return;
    ev.preventDefault();ev.stopPropagation();if(typeof ev.stopImmediatePropagation==='function')ev.stopImmediatePropagation();
    launch(el);
  }

  /* Window capture runs before document-level legacy handlers. */
  window.addEventListener('click',intercept,true);
  window.addEventListener('touchend',intercept,{capture:true,passive:false});

  const mo=new MutationObserver(()=>setTimeout(()=>refresh(false),0));
  mo.observe(document.documentElement,{subtree:true,childList:true});
  setInterval(()=>refresh(false),1200);
  window.addEventListener('pageshow',()=>setTimeout(()=>refresh(true),50));
  window.addEventListener('focus',()=>setTimeout(()=>refresh(true),50));
  setTimeout(()=>refresh(true),100);
  setTimeout(()=>refresh(true),700);
  console.info('SkillHub: clean monthly pilot launch active for d.i.sharipova');
})();
