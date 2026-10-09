/* SkillHub normal manual Soft review mode — 2026-10-09
   Normal manual trainer (outside the monthly/final assessment) is reviewed by RG.
   Monthly/final assessment keeps its separate AI review flow in hotfix-monthly-runner-v12.js.
*/
(function(){
  'use strict';
  window.__shManualNormalReviewMode='rg';
  console.info('SkillHub: normal manual trainer uses RG review; monthly assessment AI review is separate');
})();
