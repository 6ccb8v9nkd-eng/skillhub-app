/* Keep the latest monthly assessment UI active while legacy async scripts finish loading. */
(function(){
  'use strict';
  function loadOnce(id,src){
    if(document.getElementById(id))return;
    const s=document.createElement('script');s.id=id;s.src=src;document.head.appendChild(s);
  }
  loadOnce('shMonthlyManagerV12Loader','./hotfix-monthly-manager-v12.js?v=20261009_2');
  loadOnce('shMonthlyRunnerPolishV13Loader','./hotfix-monthly-runner-polish-v13.js?v=20261009_2');

  const begin=window.shMonthlyBegin,intro=window.shMonthlyEmployeeIntro,exit=window.shMonthlyExit,next=window.shMonthlyNextItem;
  if(typeof begin!=='function'||typeof intro!=='function')return;
  const apply=()=>{
    window.shMonthlyBegin=begin;
    window.shMonthlyEmployeeIntro=intro;
    if(typeof exit==='function')window.shMonthlyExit=exit;
    if(typeof next==='function')window.shMonthlyNextItem=next;
  };
  apply();
  const timer=setInterval(apply,250);
  setTimeout(()=>clearInterval(timer),30000);
})();
