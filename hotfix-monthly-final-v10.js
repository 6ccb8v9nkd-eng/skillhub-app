/* Legacy monthly final guard v10 disabled 2026-10-15.
   It previously reloaded and rebound monthly modules on timers, causing slow/stale UI. */
(function(){
  'use strict';
  window.__shMonthlyFinalV10=true;
  console.info('SkillHub: legacy monthly final guard disabled');
})();
