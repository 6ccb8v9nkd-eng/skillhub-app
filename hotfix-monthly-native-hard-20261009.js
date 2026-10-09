/* Legacy monthly module disabled 2026-10-09.
   The final knowledge assessment is rebuilt in hotfix-monthly-sharipova-clean-v2.js.
   This compatibility file now loads the UI-only result clarity polish.
*/
(function(){
  if(document.querySelector('script[data-sh-monthly-results-clarity]'))return;
  const s=document.createElement('script');
  s.src='./hotfix-monthly-results-clarity-20261009.js?v=20261009_clarity1';
  s.dataset.shMonthlyResultsClarity='1';
  document.head.appendChild(s);
})();
