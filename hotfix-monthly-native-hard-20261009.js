/* Legacy monthly module disabled 2026-10-09.
   The final knowledge assessment is rebuilt in hotfix-monthly-sharipova-clean-v2.js.
   This compatibility file loads result clarity, the employee Progress archive,
   the dedicated "Моя итоговая проверка" card, the no-flash Home classifier,
   the employee-only 7-day training history window, and the Home gate release.
*/
(function(){
  if(!document.querySelector('script[data-sh-monthly-results-clarity]')){
    const s=document.createElement('script');
    s.src='./hotfix-monthly-results-clarity-20261009.js?v=20261009_archive1';
    s.dataset.shMonthlyResultsClarity='1';
    document.head.appendChild(s);
  }
  if(!document.querySelector('script[data-sh-monthly-progress-card]')){
    const p=document.createElement('script');
    p.src='./hotfix-monthly-progress-card-20261009.js?v=20261009_progress1';
    p.dataset.shMonthlyProgressCard='1';
    document.head.appendChild(p);
  }
  if(!document.querySelector('script[data-sh-home-no-flash]')){
    const n=document.createElement('script');
    n.src='./hotfix-home-no-flash-20261009.js?v=20261009_noflash1';
    n.dataset.shHomeNoFlash='1';
    document.head.appendChild(n);
  }
  if(!document.querySelector('script[data-sh-home-gate-release]')){
    const g=document.createElement('script');
    g.src='./hotfix-home-gate-release-20261010.js?v=20261010_release1';
    g.dataset.shHomeGateRelease='1';
    document.head.appendChild(g);
  }
  if(!document.querySelector('script[data-sh-progress-history-7d]')){
    const h=document.createElement('script');
    h.src='./hotfix-progress-history-7d-20261010.js?v=20261010_history1';
    h.dataset.shProgressHistory7d='1';
    document.head.appendChild(h);
  }
})();
