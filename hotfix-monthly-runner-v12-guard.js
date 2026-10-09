/* Keep the latest monthly assessment runner active and protect it from legacy async overrides. */
(function(){
  'use strict';
  if(window.__shMonthlyRunnerV12GuardV2)return;window.__shMonthlyRunnerV12GuardV2=true;

  function loadOnce(id,src){
    if(document.getElementById(id))return;
    const s=document.createElement('script');s.id=id;s.src=src;document.head.appendChild(s);
  }
  loadOnce('shMonthlyManagerV12Loader','./hotfix-monthly-manager-v12.js?v=20261009_2');
  loadOnce('shMonthlyRunnerPolishV13Loader','./hotfix-monthly-runner-polish-v13.js?v=20261009_2');

  const begin=window.shMonthlyBegin;
  const intro=window.shMonthlyEmployeeIntro;
  const exit=window.shMonthlyExit;
  const next=window.shMonthlyNextItem;
  if(typeof begin!=='function'||typeof intro!=='function'){
    console.warn('SkillHub monthly runner guard: v12 runner is not ready');
    return;
  }

  window.shMonthlyBeginV12=begin;
  window.shMonthlyEmployeeIntroV12=intro;

  const apply=()=>{
    if(window.shMonthlyBegin!==begin)window.shMonthlyBegin=begin;
    if(window.shMonthlyEmployeeIntro!==intro)window.shMonthlyEmployeeIntro=intro;
    if(typeof exit==='function'&&window.shMonthlyExit!==exit)window.shMonthlyExit=exit;
    if(typeof next==='function'&&window.shMonthlyNextItem!==next)window.shMonthlyNextItem=next;
  };
  apply();

  /* Legacy monthly scripts can finish long after first paint. Keep the v12 entry points authoritative. */
  setInterval(apply,1000);
  window.addEventListener('focus',apply,true);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)apply()});

  /* Mobile Safari may keep an old inline handler on a card created before the runner loaded.
     Capture these two launcher clicks and route them directly to the stable v12 functions. */
  document.addEventListener('click',function(ev){
    const btn=ev.target&&ev.target.closest?ev.target.closest('button'):null;
    if(!btn)return;
    const raw=String(btn.getAttribute('onclick')||'');
    let m=raw.match(/shMonthlyEmployeeIntro\('([^']+)'\)/);
    if(m){
      ev.preventDefault();ev.stopPropagation();
      if(typeof ev.stopImmediatePropagation==='function')ev.stopImmediatePropagation();
      apply();
      Promise.resolve(intro(m[1])).catch(err=>{console.error('monthly intro launch failed',err);window.toast?.(err?.message||'Не удалось открыть проверку')});
      return;
    }
    m=raw.match(/shMonthlyBegin\('([^']+)'\)/);
    if(m){
      ev.preventDefault();ev.stopPropagation();
      if(typeof ev.stopImmediatePropagation==='function')ev.stopImmediatePropagation();
      apply();
      Promise.resolve(begin(m[1])).catch(err=>{console.error('monthly start failed',err);window.toast?.(err?.message||'Не удалось начать проверку')});
    }
  },true);
})();
