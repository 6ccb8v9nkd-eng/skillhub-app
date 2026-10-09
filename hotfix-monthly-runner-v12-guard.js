/* SkillHub monthly clean UI integration guard — 2026-10-09.
   Keeps only the rebuilt final knowledge assessment UI and removes obsolete monthly clones.
*/
(function(){
  'use strict';
  if(window.__shMonthlyCleanHostGuardV2)return;
  window.__shMonthlyCleanHostGuardV2=true;

  let queued=false;

  function isManager(){
    try{return typeof S!=='undefined' && ['mentor','rs','tech_admin'].includes(S?.profile?.role)}catch(_){return false}
  }

  function cleanupLegacyEmployee(){
    const home=document.getElementById('page-home');
    if(!home)return;
    home.querySelectorAll('.sh-month-card.sh-month-employee,[data-sh-monthly-employee]:not([data-sh-monthly-clean-employee])').forEach(el=>el.remove());
  }

  function fixMonthlyPlacement(){
    queued=false;
    cleanupLegacyEmployee();

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
  console.info('SkillHub: monthly clean UI guard v2 enabled');
})();
