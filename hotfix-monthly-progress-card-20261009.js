/* SkillHub — dedicated employee final assessment card in Progress — 2026-10-09
   UI-only. The card appears only when the monthly archive module has a completed/viewed result.
*/
(function(){
  'use strict';
  if(window.__shMonthlyProgressCard20261009)return;
  window.__shMonthlyProgressCard20261009=true;

  let scheduled=false;
  function apply(){
    const page=document.getElementById('page-progress');
    if(!page)return;
    const section=page.querySelector('[data-sh-monthly-progress-history]');
    if(!section)return;

    section.classList.add('shm-final-progress-card');
    const title=section.querySelector('.section-title');
    if(title&&!title.dataset.shmFinalReady){
      title.dataset.shmFinalReady='1';
      title.innerHTML=`<div class="shm-final-progress-head"><span>ИТОГОВАЯ АТТЕСТАЦИЯ</span><h2>Моя итоговая проверка</h2><p>Результат и обратная связь по завершённой аттестации. Здесь их можно открыть повторно в любое время.</p></div>`;
    }
  }

  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;apply()});
  }

  const page=document.getElementById('page-progress');
  if(page){
    const obs=new MutationObserver(schedule);
    obs.observe(page,{childList:true,subtree:true});
  }
  document.addEventListener('click',ev=>{
    if(ev.target?.closest?.('.nav-btn[data-page="progress"]'))setTimeout(schedule,80);
  },true);
  schedule();

  const st=document.createElement('style');
  st.id='shMonthlyProgressCardStyle';
  st.textContent=`
    .shm-final-progress-card{margin:22px 0;border:1px solid color-mix(in srgb,var(--primary) 45%,var(--line));border-radius:22px;background:linear-gradient(145deg,color-mix(in srgb,var(--primary) 6%,var(--panel)),var(--panel));padding:18px;overflow:hidden}
    .shm-final-progress-card>.section-title{margin:0 0 14px!important;padding:0!important}
    .shm-final-progress-head>span{display:block;color:var(--primary);font-size:11px;font-weight:950;letter-spacing:.12em;margin-bottom:6px}
    .shm-final-progress-head h2{margin:0;font-size:25px;line-height:1.12}
    .shm-final-progress-head p{margin:7px 0 0;color:var(--muted);line-height:1.42;max-width:720px}
    .shm-final-progress-card .shmr-progress-list{margin:0!important;border-radius:16px!important;background:color-mix(in srgb,var(--panel2) 72%,transparent)!important}
    @media(max-width:700px){
      .shm-final-progress-card{margin:16px 0;padding:14px;border-radius:18px}
      .shm-final-progress-head h2{font-size:22px}
      .shm-final-progress-head p{font-size:13px}
    }
  `;
  document.head.appendChild(st);
  console.info('SkillHub: dedicated final assessment Progress card enabled');
})();
