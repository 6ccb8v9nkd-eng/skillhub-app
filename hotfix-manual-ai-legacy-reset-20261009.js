/* SkillHub manual Soft: legacy review compatibility — 2026-10-09
   Old RG-reviewed rows stay in database/history, but do not block the new AI review flow for employees.
*/
(function(){
  'use strict';
  if(typeof window.latestManualAnswer!=='function'||window.latestManualAnswer.__shAiLegacyReset)return;
  const base=window.latestManualAnswer;
  const wrapped=function(contentId,login){
    const r=base.apply(this,arguments);
    try{
      const own=S?.profile?.login||'';
      const target=login===undefined?own:login;
      if(S?.profile?.role==='employee'&&target===own&&r&&String(r.review_source||'legacy')!=='ai')return null;
    }catch(_){ }
    return r;
  };
  wrapped.__shAiLegacyReset=true;
  window.latestManualAnswer=wrapped;
  console.info('SkillHub: legacy manual reviews no longer block employee AI flow');
})();
