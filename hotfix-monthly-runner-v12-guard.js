/* SkillHub monthly clean UI integration guard — 2026-10-09.
   Keeps the rebuilt monthly assessment inside the existing Assignments monthly host
   and removes only the obsolete monthly manager clone/source.
*/
(function(){
  'use strict';
  if(window.__shMonthlyCleanHostGuard)return;
  window.__shMonthlyCleanHostGuard=true;

  let queued=false;

  function isManager(){
    try{return typeof S!=='undefined' && ['mentor','rs','tech_admin'].includes(S?.profile?.role)}catch(_){return false}
  }

  function fixMonthlyPlacement(){
    queued=false;
    if(!isManager())return;

    // The old monthly manager card is only a hidden source for the legacy clone logic.
    // Remove that obsolete source so it can no longer overwrite the rebuilt monthly UI.
    const mentor=document.getElementById('page-mentor');
    if(mentor){
      mentor.querySelectorAll('[data-sh-monthly-manager]').forEach(el=>el.remove());
    }

    const page=document.getElementById('page-assignments');
    const host=document.getElementById('shAssignmentMonthlyHost');
    if(!page||!host)return;

    const cleanCards=[...page.querySelectorAll('[data-sh-monthly-clean-manager]')];
    if(!cleanCards.length)return;

    const clean=cleanCards[0];
    cleanCards.slice(1).forEach(el=>el.remove());

    // Mark the new card as the monthly host content so the legacy hub leaves it alone.
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
  console.info('SkillHub: monthly clean host dedupe guard enabled');
})();
