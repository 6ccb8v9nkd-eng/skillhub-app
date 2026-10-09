/* SkillHub monthly assessment pilot hardening — Sharipova only */
(function(){
  'use strict';
  if(window.__shMonthlySharipovaPilotV1)return;window.__shMonthlySharipovaPilotV1=true;
  const PILOT='d.i.sharipova';
  let active=false,busy=false,scanTimer=0;
  const isPilot=()=>window.S?.profile?.login===PILOT;
  const sb=()=>window.S?.sb||null;
  const toastMsg=m=>{try{window.toast?.(m)}catch(_){}};

  function isLaunchButton(el){
    if(!el||!el.matches?.('button,a,[role="button"]'))return false;
    const text=String(el.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
    const raw=String(el.getAttribute?.('onclick')||'');
    const monthly=/shMonthly(?:EmployeeIntro|Begin)/.test(raw);
    const start=/^(начать|продолжить)\s+проверку/.test(text);
    const area=!!el.closest?.('#page-home,#modalCard');
    return monthly||(start&&area);
  }
  function makeClickable(el){
    if(!isLaunchButton(el))return;
    try{el.disabled=false;el.removeAttribute('disabled');el.setAttribute('aria-disabled','false');el.classList.remove('disabled','is-disabled');el.style.setProperty('pointer-events','auto','important');el.style.setProperty('opacity','1','important');el.style.setProperty('cursor','pointer','important');el.dataset.shSharipovaMonthlyLaunch='1'}catch(_){ }
  }
  function scan(){if(!active)return;document.querySelectorAll('button,a,[role="button"]').forEach(makeClickable)}

  async function getActiveCheck(){
    const c=sb();if(!c)throw new Error('Нет соединения с базой');
    const q=await c.from('monthly_checks').select('id,status,recipients,config,due_at,created_at').eq('status','assigned').order('created_at',{ascending:false}).limit(30);
    if(q.error)throw q.error;
    return (q.data||[]).find(x=>Array.isArray(x.recipients)&&x.recipients.includes(PILOT))||null;
  }
  function idFrom(el){
    const raw=String(el?.getAttribute?.('onclick')||'');
    const m=raw.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
    return m?.[0]||'';
  }
  async function validate(checkId){
    const c=sb();
    const [cq,iq,rq]=await Promise.all([
      c.from('monthly_checks').select('id,status,recipients,config').eq('id',checkId).single(),
      c.from('monthly_check_items').select('id,position,kind,snapshot').eq('check_id',checkId).order('position',{ascending:true}),
      c.from('monthly_check_runs').select('id,status,progress,breakdown').eq('check_id',checkId).eq('login',PILOT).maybeSingle()
    ]);
    if(cq.error)throw cq.error;if(iq.error)throw iq.error;if(rq.error)throw rq.error;
    const check=cq.data,items=iq.data||[];
    if(check.status!=='assigned'||!Array.isArray(check.recipients)||!check.recipients.includes(PILOT))throw new Error('Проверка не назначена Шариповой');
    if(!items.length)throw new Error('В проверке нет заданий');
    const badKinds=items.filter(x=>!['hard','ai_dialogue','manual'].includes(x.kind));
    if(badKinds.length)throw new Error('В проверке есть старый неподдерживаемый формат');
    const badHard=items.filter(x=>x.kind==='hard'&&!['sort_cards','scenario','tariff_calc'].includes(String(x.snapshot?.payload?.mode||'scenario')));
    if(badHard.length)throw new Error('В Hard попало неподдерживаемое задание');
    const hard=items.filter(x=>x.kind==='hard').length,ai=items.filter(x=>x.kind==='ai_dialogue').length,manual=items.filter(x=>x.kind==='manual').length;
    if(!hard||!ai||!manual)throw new Error('Состав проверки неполный');
    return {check,items,run:rq.data,counts:{hard,ai,manual}};
  }
  async function ensureRunner(){
    if(typeof window.shMonthlyBeginV12==='function')return window.shMonthlyBeginV12;
    if(typeof window.shMonthlyBegin==='function'&&window.__shMonthlyRunnerV12)return window.shMonthlyBegin;
    await new Promise((resolve,reject)=>{
      const old=document.getElementById('shSharipovaRunnerReload');if(old)old.remove();
      window.__shMonthlyRunnerV12=false;
      const s=document.createElement('script');s.id='shSharipovaRunnerReload';s.src='./hotfix-monthly-runner-v12.js?v=20261009_sharipova_pilot1';
      s.onload=()=>resolve();s.onerror=()=>reject(new Error('Не удалось загрузить модуль проверки'));document.head.appendChild(s);
    });
    return typeof window.shMonthlyBeginV12==='function'?window.shMonthlyBeginV12:window.shMonthlyBegin;
  }
  async function launch(el){
    if(!active||busy)return;busy=true;
    const oldText=el?el.textContent:'';
    try{
      if(el){el.textContent='Открываем…';makeClickable(el)}
      let checkId=idFrom(el);let check=null;
      if(checkId){try{check=await validate(checkId)}catch(_){checkId=''}}
      if(!checkId){const found=await getActiveCheck();if(!found)throw new Error('Активная проверка для Шариповой не найдена');checkId=found.id;check=await validate(checkId)}
      if(check.counts.hard+check.counts.ai+check.counts.manual!==check.items.length)throw new Error('Состав проверки повреждён');
      const run=await ensureRunner();if(typeof run!=='function')throw new Error('Модуль прохождения не загрузился');
      try{window.closeModal?.()}catch(_){ }
      await Promise.resolve(run(checkId));
      setTimeout(()=>{
        const page=document.getElementById('page-run');
        if(!page||page.classList.contains('hidden'))toastMsg('Не удалось открыть проверку. Обновите страницу один раз и повторите.');
      },900);
    }catch(err){console.error('Sharipova monthly pilot launch',err);toastMsg(err?.message||'Не удалось начать проверку')}
    finally{busy=false;if(el&&el.isConnected){el.textContent=oldText;makeClickable(el)}}
  }
  function capture(ev){
    if(!active)return;const el=ev.target?.closest?.('button,a,[role="button"]');if(!isLaunchButton(el))return;
    ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation?.();launch(el);
  }
  function activate(){
    if(active||!isPilot())return false;active=true;
    document.addEventListener('click',capture,true);
    document.addEventListener('touchend',ev=>{const el=ev.target?.closest?.('button,a,[role="button"]');if(!isLaunchButton(el))return;ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation?.();launch(el)}, {capture:true,passive:false});
    const mo=new MutationObserver(()=>{clearTimeout(scanTimer);scanTimer=setTimeout(scan,30)});mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['disabled','class','style']});
    scan();setInterval(scan,1000);
    console.info('SkillHub: Sharipova monthly pilot hardening enabled');
    return true;
  }
  let tries=0;const t=setInterval(()=>{tries++;if(activate()||tries>300)clearInterval(t)},100);
  window.addEventListener('pageshow',()=>setTimeout(activate,0));
})();