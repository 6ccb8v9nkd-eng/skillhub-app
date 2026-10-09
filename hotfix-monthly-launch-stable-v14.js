/* SkillHub monthly assessment stable launcher v14 — 2026-10-09 */
(function(){
  'use strict';
  if(window.__shMonthlyLaunchStableV14)return;window.__shMonthlyLaunchStableV14=true;

  let forcedRunnerPromise=null;
  let lastCheckId='';

  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const notify=msg=>{try{window.toast?.(msg)}catch(_){}};
  const sb=()=>window.S?.sb||null;
  const login=()=>window.S?.profile?.login||'';

  function idFrom(raw){
    const m=String(raw||'').match(/shMonthly(?:EmployeeIntro|Begin|StableLaunch)\('([^']+)'/);
    return m?.[1]||'';
  }

  async function findActiveCheck(){
    const client=sb(),who=login();
    if(!client||!who)return '';
    const q=await client.from('monthly_check_runs')
      .select('check_id,monthly_checks!inner(id,status,recipients,month_key,created_at)')
      .eq('login',who)
      .eq('monthly_checks.status','assigned')
      .order('created_at',{foreignTable:'monthly_checks',ascending:false})
      .limit(5);
    if(q.error)throw q.error;
    const row=(q.data||[]).find(x=>Array.isArray(x.monthly_checks?.recipients)&&x.monthly_checks.recipients.includes(who))||(q.data||[])[0];
    return row?.check_id||'';
  }

  function loadFreshRunner(){
    if(forcedRunnerPromise)return forcedRunnerPromise;
    forcedRunnerPromise=new Promise((resolve,reject)=>{
      try{
        window.__shMonthlyRunnerV12=false;
        document.getElementById('shMonthlyForcedRunnerV14')?.remove();
        const s=document.createElement('script');
        s.id='shMonthlyForcedRunnerV14';
        s.src='./hotfix-monthly-runner-v12.js?v=20261009_stable14';
        s.onload=()=>{
          const fn=window.shMonthlyBegin;
          if(typeof fn!=='function'){
            forcedRunnerPromise=null;
            reject(new Error('Модуль итоговой проверки не загрузился'));
            return;
          }
          window.shMonthlyBeginV12=fn;
          if(typeof window.shMonthlyEmployeeIntro==='function')window.shMonthlyEmployeeIntroV12=window.shMonthlyEmployeeIntro;
          resolve(fn);
        };
        s.onerror=()=>{forcedRunnerPromise=null;reject(new Error('Не удалось загрузить модуль итоговой проверки'))};
        document.head.appendChild(s);
      }catch(err){forcedRunnerPromise=null;reject(err)}
    });
    return forcedRunnerPromise;
  }

  async function launch(checkId,button){
    if(button?.dataset?.shLaunchBusy==='1')return;
    let id=checkId||lastCheckId||'';
    const oldText=button?.textContent||'';
    try{
      if(button){button.dataset.shLaunchBusy='1';button.disabled=true;button.textContent='Открываем…'}
      if(!id)id=await findActiveCheck();
      if(!id)throw new Error('Не удалось найти назначенную проверку');
      lastCheckId=id;

      const begin=await loadFreshRunner();
      await begin(id);
      await sleep(120);

      const page=document.getElementById('page-run');
      const opened=!!page&&!page.classList.contains('hidden')&&!!page.querySelector('.sh12r');
      if(!opened){
        /* One retry after any late legacy override. */
        forcedRunnerPromise=null;
        const retry=await loadFreshRunner();
        await retry(id);
        await sleep(120);
      }

      const finalPage=document.getElementById('page-run');
      if(!finalPage||finalPage.classList.contains('hidden')||!finalPage.querySelector('.sh12r')){
        throw new Error('Проверка не открылась. Обновите страницу один раз и повторите запуск.');
      }
    }catch(err){
      console.error('monthly stable v14 launch',err);
      notify(err?.message||'Не удалось открыть итоговую проверку');
    }finally{
      if(button&&button.isConnected){button.disabled=false;button.dataset.shLaunchBusy='0';button.textContent=oldText||'Начать проверку →'}
    }
  }
  window.shMonthlyStableLaunch=launch;

  function wireModal(){
    const modal=document.getElementById('modalCard');if(!modal)return;
    const intro=modal.querySelector('.sh12r-intro');if(!intro)return;
    const btn=[...intro.querySelectorAll('button')].find(x=>/^(Начать|Продолжить) проверку/i.test((x.textContent||'').trim()));
    if(!btn)return;
    const raw=btn.getAttribute('onclick')||'';
    const id=idFrom(raw)||lastCheckId;
    if(id)lastCheckId=id;
    btn.disabled=false;
    btn.style.pointerEvents='auto';
    btn.setAttribute('aria-disabled','false');
    if(lastCheckId)btn.setAttribute('onclick',`shMonthlyStableLaunch('${lastCheckId}',this);return false;`);
  }

  /* Remember check id when the employee opens the intro card. */
  document.addEventListener('click',ev=>{
    const btn=ev.target?.closest?.('button');if(!btn)return;
    const raw=btn.getAttribute('onclick')||'';
    const introId=idFrom(raw);
    if(/shMonthlyEmployeeIntro/.test(raw)&&introId){lastCheckId=introId;setTimeout(wireModal,20);setTimeout(wireModal,180);return}

    if(btn.closest?.('#modalCard .sh12r-intro')&&/^(Начать|Продолжить) проверку/i.test((btn.textContent||'').trim())){
      ev.preventDefault();ev.stopPropagation();
      if(typeof ev.stopImmediatePropagation==='function')ev.stopImmediatePropagation();
      const id=idFrom(raw)||lastCheckId;
      launch(id,btn);
    }
  },true);

  const mo=new MutationObserver(()=>wireModal());
  mo.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('focus',wireModal,true);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)wireModal()});
  wireModal();
  console.info('SkillHub: monthly stable launcher v14 enabled');
})();