/* SkillHub monthly assessment manual-answer integrity — 2026-10-15
   Disables clipboard/drag insertion only in the monthly assessment free-answer textarea.
   Normal typing and assessment scoring are unchanged.
*/
(function(){
  'use strict';
  if(window.__shMonthlyManualIntegrity20261015)return;
  window.__shMonthlyManualIntegrity20261015=true;

  let lastWarn=0;
  const isTarget=e=>e?.target instanceof HTMLTextAreaElement&&e.target.id==='shmcManualAnswer';
  const warn=()=>{
    const now=Date.now();
    if(now-lastWarn<1200)return;
    lastWarn=now;
    try{window.toast?.('Копирование и вставка отключены в аттестации.')}catch(_){}
  };
  const block=e=>{if(!isTarget(e))return;e.preventDefault();e.stopPropagation();warn()};

  ['copy','cut','paste','drop'].forEach(type=>document.addEventListener(type,block,true));

  document.addEventListener('beforeinput',e=>{
    if(!isTarget(e))return;
    if(['insertFromPaste','insertFromPasteAsQuotation','insertFromDrop'].includes(String(e.inputType||''))){
      e.preventDefault();
      e.stopPropagation();
      warn();
    }
  },true);

  document.addEventListener('keydown',e=>{
    if(!isTarget(e))return;
    const key=String(e.key||'').toLowerCase();
    if((e.ctrlKey||e.metaKey)&&['c','v','x'].includes(key)){
      e.preventDefault();
      e.stopPropagation();
      warn();
    }
  },true);

  /* Prevent context-menu paste/cut/copy bypass on desktop and long-press menus where supported. */
  document.addEventListener('contextmenu',block,true);

  console.info('SkillHub: monthly manual-answer clipboard protection enabled');
})();
