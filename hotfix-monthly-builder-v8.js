/* SkillHub monthly fast assignment guard — 2026-10-09 */
(function(){
'use strict';
if(window.__shMonthlyFastAssign)return;window.__shMonthlyFastAssign=true;
let installed=false;

function ensureSelection(){
  const hard=[...document.querySelectorAll('[data-shmc-hard]')];
  const manual=[...document.querySelectorAll('[data-shmc-manual]')];
  if(hard.length){
    const checked=hard.filter(x=>x.checked);
    if(checked.length!==8){hard.forEach((x,i)=>x.checked=i<8)}
    const n=document.getElementById('shmcHardCount');if(n)n.textContent='8/8';
  }
  if(manual.length){
    const checked=manual.filter(x=>x.checked);
    if(checked.length!==2){manual.forEach((x,i)=>x.checked=i<2)}
    const n=document.getElementById('shmcManualCount');if(n)n.textContent='2/2';
  }
  const modal=document.querySelector('.shmc-modal');
  if(modal&&!modal.querySelector('[data-shmc-auto-note]')&&hard.length&&manual.length){
    const format=modal.querySelector('.shmc-format');
    if(format)format.insertAdjacentHTML('afterend','<div data-shmc-auto-note style="border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:var(--panel2);font-size:12px"><b>✓ Состав подобран автоматически</b><div class="muted" style="margin-top:3px">8 Hard Skills + 2 свободных ответа. При желании состав можно изменить вручную.</div></div>');
  }
}

function prepareSoon(){let n=0;const tick=()=>{n++;ensureSelection();if(n<12&&!document.querySelector('.shmc-modal'))setTimeout(tick,50)};setTimeout(tick,0)}

function install(){
  if(installed)return true;
  if(typeof window.shMonthlyCreateAndAssign!=='function'||typeof window.shMonthlyCleanAssignNew!=='function')return false;
  const open=window.shMonthlyCreateAndAssign;
  window.shMonthlyCreateAndAssign=function(){const r=open.apply(this,arguments);prepareSoon();return r};
  const assign=window.shMonthlyCleanAssignNew;
  window.shMonthlyCleanAssignNew=async function(){ensureSelection();return await assign.apply(this,arguments)};
  if(typeof window.shMonthlyOpenAssign==='function'){
    const more=window.shMonthlyOpenAssign;window.shMonthlyOpenAssign=function(){const r=more.apply(this,arguments);prepareSoon();return r};
  }
  installed=true;console.info('SkillHub: monthly fast assignment guard enabled');return true;
}
let tries=0;function boot(){tries++;if(!install()&&tries<30)setTimeout(boot,100)}
setTimeout(boot,0);
})();
