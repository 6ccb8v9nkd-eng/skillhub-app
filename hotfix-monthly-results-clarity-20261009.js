/* SkillHub — monthly assessment result clarity + employee archive — 2026-10-09
   Makes manager results easier to scan.
   For employees: after the completed assessment feedback is opened once,
   the large Home card is hidden and the result stays available in Progress.
*/
(function(){
  'use strict';
  if(window.__shMonthlyResultsClarity20261009)return;
  window.__shMonthlyResultsClarity20261009=true;

  const state=()=>{try{return typeof S!=='undefined'?S:null}catch(_){return null}};
  const escHtml=v=>typeof window.esc==='function'?window.esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const viewedChecks=new Set();
  let viewedLogin='';
  let viewedLoading=null;
  let homeScheduled=false;
  let progressBusy=false;

  function pctFrom(text){
    const m=String(text||'').match(/(-?\d+(?:[.,]\d+)?)\s*%/);
    return m?Number(m[1].replace(',','.')):NaN;
  }

  function passFrom(root){
    const text=root?.querySelector('header p')?.textContent||'';
    const m=text.match(/проходн(?:ой|ая)\s+(\d+(?:[.,]\d+)?)\s*%/i);
    return m?Number(m[1].replace(',','.')):75;
  }

  function polishResults(root){
    if(!root)return;

    const closeBtn=root.querySelector('header button[onclick*="closeModal"]');
    if(closeBtn && !closeBtn.classList.contains('shmr-close')){
      closeBtn.textContent='Закрыть';
      closeBtn.classList.add('shmr-close');
      closeBtn.setAttribute('aria-label','Закрыть результаты');
    }

    const pass=passFrom(root);
    root.querySelectorAll('tbody tr').forEach(tr=>{
      const cells=tr.querySelectorAll('td');
      if(cells.length<4)return;
      const cell=cells[3];
      const score=pctFrom(cell.textContent);
      if(!Number.isFinite(score))return;
      const passed=score>=pass;
      const wanted=passed?'Пройдена':'Не пройдена';
      let badge=cell.querySelector('.shmr-result-status');
      if(!badge){
        badge=document.createElement('span');
        badge.className='shmr-result-status';
        cell.appendChild(badge);
      }
      const cls=passed?'good':'bad';
      if(badge.textContent!==wanted)badge.textContent=wanted;
      if(!badge.classList.contains(cls)){
        badge.classList.remove('good','bad');
        badge.classList.add(cls);
      }
    });
  }

  function polishMistakes(root){
    (root||document).querySelectorAll('.shfb-mistake').forEach(box=>{
      const smalls=[...box.querySelectorAll('small')];
      smalls.forEach(el=>{
        if(el.classList.contains('shmr-chosen')||el.classList.contains('shmr-correct'))return;
        const t=String(el.textContent||'').trim();
        if(/^Выбрано:/i.test(t)){
          el.classList.add('shmr-chosen');
          el.textContent='Ответ сотрудника: '+t.replace(/^Выбрано:\s*/i,'');
        }else if(/^Правильно:/i.test(t)){
          el.classList.add('shmr-correct');
          el.textContent='Верный ответ: '+t.replace(/^Правильно:\s*/i,'');
        }
      });
    });
  }

  function currentEmployeeLogin(){
    const st=state();
    return String(st?.profile?.role||'')==='employee'?String(st?.profile?.login||''):'';
  }

  function localViewedKey(login,checkId){return `shmc_feedback_viewed:${login}:${checkId}`}
  function locallyViewed(login,checkId){
    try{return localStorage.getItem(localViewedKey(login,checkId))==='1'}catch(_){return false}
  }
  function saveLocalViewed(login,checkId){
    try{localStorage.setItem(localViewedKey(login,checkId),'1')}catch(_){ }
  }

  function checkIdFromButton(btn){
    const src=String(btn?.getAttribute?.('onclick')||'');
    const m=src.match(/shMonthlyStart\(['\"]([^'\"]+)['\"]\)/);
    return m?.[1]||'';
  }

  function refreshViewedState(){
    const login=currentEmployeeLogin();
    if(!login)return Promise.resolve();
    if(viewedLogin!==login){viewedLogin=login;viewedChecks.clear();viewedLoading=null}
    if(viewedLoading)return viewedLoading;
    const st=state();
    if(!st?.sb)return Promise.resolve();
    viewedLoading=(async()=>{
      try{
        const q=await st.sb.from('monthly_check_runs').select('check_id,status,breakdown').eq('login',login).eq('status','completed');
        if(q.error)throw q.error;
        (q.data||[]).forEach(r=>{if(r?.breakdown?.feedback_viewed_at)viewedChecks.add(String(r.check_id))});
      }catch(e){console.warn('SkillHub monthly archive: viewed state unavailable',e)}
      finally{viewedLoading=null}
    })();
    return viewedLoading;
  }

  function isViewed(login,checkId){return viewedChecks.has(String(checkId))||locallyViewed(login,checkId)}

  function applyHomeArchive(){
    const login=currentEmployeeLogin();
    if(!login)return;
    const section=document.querySelector('#page-home [data-sh-monthly-clean-employee]');
    if(!section)return;
    let visible=0;
    section.querySelectorAll('.shmc-employee').forEach(card=>{
      const btn=card.querySelector('button[onclick*="shMonthlyStart"]');
      const checkId=checkIdFromButton(btn);
      const done=String(btn?.textContent||'').trim()==='Посмотреть результат';
      const hide=done&&checkId&&isViewed(login,checkId);
      card.style.display=hide?'none':'';
      if(!hide)visible++;
    });
    section.style.display=visible?'':'none';
  }

  function scheduleHomeArchive(){
    if(homeScheduled)return;
    homeScheduled=true;
    setTimeout(async()=>{
      homeScheduled=false;
      await refreshViewedState();
      applyHomeArchive();
    },0);
  }

  async function markFeedbackViewed(checkId){
    const st=state(),login=currentEmployeeLogin();
    if(!st?.sb||!login||!checkId)return;
    const id=String(checkId);
    viewedChecks.add(id);
    saveLocalViewed(login,id);
    applyHomeArchive();
    try{
      const q=await st.sb.from('monthly_check_runs').select('id,status,breakdown').eq('check_id',id).eq('login',login).maybeSingle();
      if(q.error)throw q.error;
      const run=q.data;
      if(!run||run.status!=='completed'||run?.breakdown?.feedback_viewed_at)return;
      let breakdown={};
      try{breakdown=structuredClone(run.breakdown||{})}catch(_){try{breakdown=JSON.parse(JSON.stringify(run.breakdown||{}))}catch(__){breakdown={}}}
      breakdown.feedback_viewed_at=new Date().toISOString();
      const u=await st.sb.from('monthly_check_runs').update({breakdown,updated_at:new Date().toISOString()}).eq('id',run.id);
      if(u.error)throw u.error;
    }catch(e){console.warn('SkillHub monthly archive: could not persist feedback view',e)}
  }

  function fmtDate(v){
    if(!v)return'—';
    try{return new Date(v).toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric'})}catch(_){return String(v)}
  }

  async function mountMonthlyProgress(){
    const page=document.getElementById('page-progress');
    const st=state(),login=currentEmployeeLogin();
    if(!page||page.classList.contains('hidden')||!st?.sb||!login||progressBusy)return;
    progressBusy=true;
    try{
      await refreshViewedState();
      const cq=await st.sb.from('monthly_checks').select('id,title,pass_score,created_at,due_at').contains('recipients',[login]).order('created_at',{ascending:false}).limit(24);
      if(cq.error)throw cq.error;
      const checks=cq.data||[],ids=checks.map(x=>x.id);
      let runs=[];
      if(ids.length){
        const rq=await st.sb.from('monthly_check_runs').select('id,check_id,status,score,completed_at,breakdown').eq('login',login).eq('status','completed').in('check_id',ids);
        if(rq.error)throw rq.error;
        runs=rq.data||[];
      }
      const byCheck=new Map(checks.map(x=>[String(x.id),x]));
      const rows=runs.filter(r=>isViewed(login,r.check_id)||r?.breakdown?.feedback_viewed_at).sort((a,b)=>new Date(b.completed_at||0)-new Date(a.completed_at||0));
      page.querySelector('[data-sh-monthly-progress-history]')?.remove();
      if(!rows.length)return;
      const html=rows.map(r=>{
        const c=byCheck.get(String(r.check_id))||{},score=Math.round(Number(r.score||0)),pass=score>=Number(c.pass_score||75);
        return `<div class="shmr-progress-row"><div class="shmr-progress-main"><span class="shmr-progress-icon">✓</span><div><b>${escHtml(c.title||'Итоговая проверка знаний')}</b><small>${fmtDate(r.completed_at||c.created_at)} · проходной ${Number(c.pass_score||75)}%</small></div></div><div class="shmr-progress-result"><strong>${score}%</strong><span class="shmr-result-status ${pass?'good':'bad'}">${pass?'Пройдена':'Не пройдена'}</span></div><button class="btn secondary" onclick="shMonthlyStart('${String(r.check_id).replace(/'/g,"\\'")}')">Посмотреть результат</button></div>`;
      }).join('');
      const section=document.createElement('section');
      section.dataset.shMonthlyProgressHistory='1';
      section.className='shmr-progress-section';
      section.innerHTML=`<div class="section-title"><h2>Итоговые проверки</h2></div><div class="card shmr-progress-list">${html}</div>`;
      const historyTitle=[...page.querySelectorAll('.section-title')].find(x=>String(x.querySelector('h2')?.textContent||'').trim()==='История');
      if(historyTitle)historyTitle.before(section);else page.appendChild(section);
    }catch(e){console.warn('SkillHub monthly archive: progress history unavailable',e)}
    finally{progressBusy=false}
  }

  document.addEventListener('click',ev=>{
    const btn=ev.target?.closest?.('#page-home .shmc-employee button[onclick*="shMonthlyStart"]');
    if(!btn||String(btn.textContent||'').trim()!=='Посмотреть результат')return;
    const checkId=checkIdFromButton(btn);
    if(checkId)void markFeedbackViewed(checkId);
  },true);

  const home=document.getElementById('page-home');
  if(home){
    const homeObs=new MutationObserver(scheduleHomeArchive);
    homeObs.observe(home,{childList:true,subtree:true});
  }

  const progress=document.getElementById('page-progress');
  if(progress){
    const progressObs=new MutationObserver(muts=>{
      if(muts.some(m=>m.type==='attributes'&&m.attributeName==='class'))setTimeout(mountMonthlyProgress,0);
    });
    progressObs.observe(progress,{attributes:true,attributeFilter:['class']});
  }
  document.addEventListener('click',ev=>{
    if(ev.target?.closest?.('.nav-btn[data-page="progress"]'))setTimeout(mountMonthlyProgress,40);
  },true);

  let scheduled=false;
  function schedulePolish(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{
      scheduled=false;
      const root=document.querySelector('#modalCard .shmc-results');
      if(root)polishResults(root);
      polishMistakes(document.getElementById('modalCard')||document);
    });
  }

  const target=document.getElementById('modalCard')||document.body;
  const observer=new MutationObserver(schedulePolish);
  observer.observe(target,{subtree:true,childList:true});
  schedulePolish();
  scheduleHomeArchive();

  const st=document.createElement('style');
  st.id='shMonthlyResultsClarityStyle';
  st.textContent=`
    .shmc-results td:nth-child(4){vertical-align:middle}
    .shmr-result-status{display:block;width:max-content;margin-top:6px;padding:4px 9px;border-radius:999px;font-size:12px;font-weight:900;line-height:1.2;white-space:nowrap;border:1px solid var(--line)}
    .shmr-result-status.good{color:#34c759;border-color:color-mix(in srgb,#34c759 52%,var(--line));background:color-mix(in srgb,#34c759 10%,var(--panel))}
    .shmr-result-status.bad{color:#ff6961;border-color:color-mix(in srgb,#ff453a 55%,var(--line));background:color-mix(in srgb,#ff453a 10%,var(--panel))}

    .shmc-results header .shmr-close{width:auto!important;min-width:96px!important;align-self:flex-start}

    .shfb-details[open] summary{padding-bottom:10px;margin-bottom:2px;border-bottom:1px solid var(--line)}
    .shfb-mistakes{gap:10px!important;margin-top:10px!important}
    .shfb-mistake{gap:8px!important;padding:12px!important;border:1px solid var(--line);border-radius:12px!important;background:var(--panel)!important}
    .shfb-mistake>b{display:block;line-height:1.35;margin-bottom:1px;color:var(--text)}
    .shfb-mistake .shmr-chosen,.shfb-mistake .shmr-correct{display:block!important;padding:8px 10px;border-radius:8px;font-size:13px;line-height:1.35;font-weight:750!important;color:var(--text)!important}
    .shfb-mistake .shmr-chosen{border-left:3px solid #ff453a;background:color-mix(in srgb,#ff453a 8%,var(--panel2))}
    .shfb-mistake .shmr-correct{border-left:3px solid #34c759;background:color-mix(in srgb,#34c759 8%,var(--panel2))}

    .shmr-progress-section{margin-top:18px}.shmr-progress-list{padding:0!important;overflow:hidden}.shmr-progress-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:14px;align-items:center;padding:16px 18px;border-bottom:1px solid var(--line)}.shmr-progress-row:last-child{border-bottom:0}.shmr-progress-main{display:flex;align-items:center;gap:11px;min-width:0}.shmr-progress-main>div{min-width:0}.shmr-progress-main b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.shmr-progress-main small{display:block;color:var(--muted);margin-top:4px}.shmr-progress-icon{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:color-mix(in srgb,#ffd60a 12%,var(--panel2));color:var(--primary);font-weight:950;flex:0 0 auto}.shmr-progress-result{display:flex;align-items:center;gap:8px}.shmr-progress-result strong{font-size:20px}.shmr-progress-result .shmr-result-status{margin-top:0}

    @media (max-width:700px){
      .shmc-results header .shmr-close{align-self:flex-end!important;min-width:0!important;padding:8px 12px!important;font-size:13px!important}
      .shmr-result-status{font-size:11px;padding:4px 8px}
      .shfb-mistake{padding:11px!important}
      .shfb-mistake .shmr-chosen,.shfb-mistake .shmr-correct{font-size:12.5px}
      .shmr-progress-row{grid-template-columns:1fr;gap:10px;padding:14px}.shmr-progress-main b{white-space:normal}.shmr-progress-result{justify-content:flex-start}.shmr-progress-row .btn{width:100%}
    }
  `;
  document.head.appendChild(st);

  console.info('SkillHub: monthly result clarity + employee archive enabled');
})();
