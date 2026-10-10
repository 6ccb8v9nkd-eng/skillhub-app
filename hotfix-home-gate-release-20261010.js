/* SkillHub employee Home gate release — 2026-10-10
   Removes the full-screen "Загружаем актуальные данные" gate introduced by the no-flash patch.
   Keeps the assessment block itself hidden until classified, so viewed assessments do not flash.
*/
(function(){
  'use strict';
  if(window.__shHomeGateRelease20261010)return;
  window.__shHomeGateRelease20261010=true;

  function release(){
    document.body.classList.remove('sh-home-initial-gate');
    document.getElementById('shHomeStableLoader')?.remove();
    const home=document.getElementById('page-home');
    if(home){
      home.style.removeProperty('visibility');
      home.style.removeProperty('pointer-events');
    }
  }

  // Release an already-stuck screen immediately.
  release();

  // The older no-flash wrapper may add the gate again on enterApp. Let it do its
  // data preload, but never allow it to block the whole Home screen.
  const baseEnter=window.enterApp;
  if(typeof baseEnter==='function'&&!baseEnter.__shGateReleased){
    const wrapped=function(){
      const r=baseEnter.apply(this,arguments);
      release();
      queueMicrotask(release);
      requestAnimationFrame(release);
      return r;
    };
    wrapped.__shGateReleased=true;
    window.enterApp=wrapped;
  }

  const obs=new MutationObserver(()=>{
    if(document.body.classList.contains('sh-home-initial-gate')||document.getElementById('shHomeStableLoader'))release();
  });
  obs.observe(document.body,{attributes:true,attributeFilter:['class'],childList:true,subtree:true});

  const st=document.createElement('style');
  st.id='shHomeGateReleaseStyle';
  st.textContent=`
    body.sh-home-initial-gate #page-home{visibility:visible!important;pointer-events:auto!important}
    #shHomeStableLoader{display:none!important}
  `;
  document.head.appendChild(st);

  console.info('SkillHub: blocking employee Home loading gate removed');
})();
