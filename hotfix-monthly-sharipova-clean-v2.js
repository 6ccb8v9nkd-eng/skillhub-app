/* SkillHub monthly assessment final pilot launcher — Sharipova only, 2026-10-09 v3 */
(function(){
  'use strict';
  if(window.__shMonthlySharipovaFinalV3)return;
  window.__shMonthlySharipovaFinalV3=true;

  const PILOT='d.i.sharipova';
  let busy=false;
  let cached=null;
  let cachedAt=0;

  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const login=()=>String(window.S?.profile?.login||'').trim().toLowerCase();
  const isPilot=()=>login()===PILOT;
  const sb=()=>window.S?.sb||null;
  const notify=msg=>{try{window.toast?.(msg)}catch(_){}};
  const launchText=btn=>String(btn?.textContent||'').replace(/\s+/g,' ').trim();

  function isLaunchButton(btn){
    if(!btn||btn.tagName!=='BUTTON'||!isPilot())return false;
    const text=launchText(btn);
    if(!/(начать|продолжить|пройти|открыть).{0,30}проверк/i.test(text))return false;
    const raw=String(btn.getAttribute('onclick')||'');
    if(/shMonthly/i.test(raw))return true;
    if(btn.matches('[data-sh-final-launch],[data-check-id]'))return true;
    if(btn.closest('[data-sh-monthly-employee],.sh12r-intro'))return true;
    if(btn.closest('#page-home'))return true;
    return false;
  }

  function enableButton(btn,checkId){
    if(!btn)return;
    btn.disabled=false;
    btn.removeAttribute('disabled');
    btn.setAttribute('type','button');
    btn.setAttribute('aria-disabled','false');
    btn.style.setProperty('pointer-events','auto','important');
    btn.style.setProperty('opacity','1','important');
    btn.style.setProperty('cursor','pointer','important');
    btn.dataset.shFinalLaunch='3';
    if(checkId)btn.dataset.checkId=checkId;
    btn.removeAttribute('onclick');
  }

  async function loadState(force=false){
    const client=sb();
    if(!isPilot()||!client)return null;
    if(!force&&cached&&Date.now()-cachedAt<4000)return cached;

    const cq=await client.from('monthly_checks')
      .select('id,status,recipients,config,due_date,due_at,month_key,pass_score,created_at')
      .eq('status','assigned')
      .order('created_at',{ascending:false})
      .limit(100);
    if(cq.error)throw cq.error;

    const check=(cq.data||[]).find(x=>Array.isArray(x.recipients)&&x.recipients.some(r=>String(r||'').trim().toLowerCase()===PILOT));
    if(!check)return null;

    const [iq,rq]=await Promise.all([
      client.from('monthly_check_items')
        .select('id,position,kind,snapshot,max_score,source_content_id')
        .eq('check_id',check.id)
        .order('position',{ascending:true}),
      client.from('monthly_check_runs')
        .select('id,status,progress,started_at,breakdown')
        .eq('check_id',check.id)
        .eq('login',PILOT)
        .maybeSingle()
    ]);
    if(iq.error)throw iq.error;
    if(rq.error)throw rq.error;

    const items=iq.data||[];
    const run=rq.data||null;
    const counts={
      hard:items.filter(x=>x.kind==='hard').length,
      ai:items.filter(x=>x.kind==='ai_dialogue').length,
      manual:items.filter(x=>x.kind==='manual').length
    };
    const unsupported=items.filter(x=>x.kind==='hard'&&!['sort_cards','scenario','tariff_calc'].includes(String(x.snapshot?.payload?.mode||'scenario')));
    if(unsupported.length)throw new Error('В итоговой проверке есть неподдерживаемое Hard-задание');

    cached={check,items,run,counts};
    cachedAt=Date.now();
    return cached;
  }

  function findHomeButton(){
    const buttons=[...document.querySelectorAll('#page-home button')];
    return buttons.find(isLaunchButton)||buttons.find(b=>/(начать|продолжить|пройти).{0,30}проверк/i.test(launchText(b)))||null;
  }

  function decorate(state){
    if(!state||!isPilot())return;
    const page=document.getElementById('page-home');
    if(!page)return;

    const card=page.querySelector('[data-sh-monthly-employee]')||[...page.querySelectorAll('.card,section,article,div')]
      .find(el=>/итогов.{0,20}проверк/i.test(String(el.textContent||''))&&el.querySelector('button'));

    const btn=(card&&[...card.querySelectorAll('button')].find(b=>/(начать|продолжить|пройти|открыть).{0,30}проверк/i.test(launchText(b))))||findHomeButton();
    if(btn){
      enableButton(btn,state.check.id);
      btn.textContent=(state.run&&state.run.status&&state.run.status!=='not_started'?'Продолжить проверку':'Начать проверку')+' →';
    }

    if(card){
      card.dataset.shMonthlyEmployee='1';
      card.dataset.shSharipovaFinal='3';
      const progress=Number(state.run?.progress||0);
      const ring=card.querySelector('.sh-month-ring');
      if(ring){
        ring.style.setProperty('--p',String(progress));
        const strong=ring.querySelector('strong');
        if(strong)strong.textContent=`${progress}%`;
      }
      const mini=card.querySelector('.sh-month-mini-parts');
      if(mini)mini.innerHTML=`<span>💬 ИИ-диалог · ${state.counts.ai}</span><span>🧠 Hard Skills · ${state.counts.hard}</span><span>✍️ Ручной · ${state.counts.manual}</span>`;
    }
  }

  async function ensureRunner(force=false){
    if(!force&&typeof window.shMonthlyBeginV12==='function')return window.shMonthlyBeginV12;
    if(!force&&typeof window.shMonthlyBegin==='function'&&window.__shMonthlyRunnerV12)return window.shMonthlyBegin;

    const id='shMonthlySharipovaFinalRunnerV3';
    document.getElementById(id)?.remove();
    window.__shMonthlyRunnerV12=false;
    await new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.id=id;
      s.src=`./hotfix-monthly-runner-v12.js?v=20261009_final3_${Date.now()}`;
      s.onload=resolve;
      s.onerror=()=>reject(new Error('Не удалось загрузить модуль итоговой проверки'));
      document.head.appendChild(s);
    });
    const fn=window.shMonthlyBegin;
    if(typeof fn!=='function')throw new Error('Модуль итоговой проверки не готов');
    window.shMonthlyBeginV12=fn;
    return fn;
  }

  async function openRun(checkId,forceRunner=false){
    const run=await ensureRunner(forceRunner);
    await Promise.resolve(run(checkId));
    await sleep(160);
    const page=document.getElementById('page-run');
    return !!page&&!page.classList.contains('hidden')&&!!page.querySelector('.sh12r');
  }

  async function launch(btn){
    if(busy||!isPilot())return;
    busy=true;
    const old=launchText(btn)||'Начать проверку →';
    try{
      if(btn){enableButton(btn,btn.dataset.checkId||'');btn.disabled=true;btn.textContent='Открываем…';}
      const state=await loadState(true);
      if(!state)throw new Error('Назначенная итоговая проверка не найдена');
      if(state.items.length!==12||state.counts.hard!==8||state.counts.ai!==2||state.counts.manual!==2){
        throw new Error(`Состав проверки некорректен: ${state.items.length} заданий (${state.counts.hard} Hard, ${state.counts.ai} ИИ, ${state.counts.manual} ручных)`);
      }

      let opened=await openRun(state.check.id,false);
      if(!opened)opened=await openRun(state.check.id,true);
      if(!opened){
        const page=document.getElementById('page-run');
        document.querySelectorAll('.page').forEach(x=>x.classList.add('hidden'));
        page?.classList.remove('hidden');
        if(window.S)window.S.currentPage='run';
        opened=await openRun(state.check.id,true);
      }
      if(!opened)throw new Error('Экран итоговой проверки не открылся');
    }catch(err){
      console.error('Sharipova final monthly launch failed',err);
      notify(err?.message||'Не удалось открыть итоговую проверку');
      if(btn&&btn.isConnected){enableButton(btn,btn.dataset.checkId||'');btn.textContent=old;}
    }finally{
      if(btn&&btn.isConnected)btn.disabled=false;
      busy=false;
    }
  }

  function intercept(ev){
    if(!isPilot())return;
    const btn=ev.target?.closest?.('button');
    if(!isLaunchButton(btn))return;
    ev.preventDefault();
    ev.stopPropagation();
    if(typeof ev.stopImmediatePropagation==='function')ev.stopImmediatePropagation();
    launch(btn);
  }

  async function repair(force=false){
    if(!isPilot())return;
    try{
      const state=await loadState(force);
      if(state)decorate(state);
      else{
        const btn=findHomeButton();
        if(btn)enableButton(btn,'');
      }
    }catch(err){
      console.error('Sharipova monthly repair failed',err);
      const btn=findHomeButton();
      if(btn)enableButton(btn,'');
    }
  }

  window.addEventListener('click',intercept,true);
  window.addEventListener('touchend',intercept,{capture:true,passive:false});

  const mo=new MutationObserver(()=>{setTimeout(()=>repair(false),0)});
  mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['disabled','class','style']});
  setInterval(()=>repair(false),800);
  window.addEventListener('pageshow',()=>setTimeout(()=>repair(true),40));
  window.addEventListener('focus',()=>setTimeout(()=>repair(true),40));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(()=>repair(true),40)});
  setTimeout(()=>repair(true),50);
  setTimeout(()=>repair(true),400);
  setTimeout(()=>repair(true),1200);

  console.info('SkillHub: Sharipova final monthly launcher v3 active');
})();
