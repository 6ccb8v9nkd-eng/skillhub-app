/* Keep the v12 monthly runner active while legacy async scripts finish loading. */
(function(){
  'use strict';
  if(!document.getElementById('shMonthlyRunnerPolishV13Loader')){
    const s=document.createElement('script');s.id='shMonthlyRunnerPolishV13Loader';s.src='./hotfix-monthly-runner-polish-v13.js?v=1';document.head.appendChild(s);
  }
  const begin=window.shMonthlyBegin,intro=window.shMonthlyEmployeeIntro,exit=window.shMonthlyExit,next=window.shMonthlyNextItem;
  if(typeof begin!=='function'||typeof intro!=='function')return;
  const apply=()=>{window.shMonthlyBegin=begin;window.shMonthlyEmployeeIntro=intro;if(typeof exit==='function')window.shMonthlyExit=exit;if(typeof next==='function')window.shMonthlyNextItem=next};
  apply();const timer=setInterval(apply,500);setTimeout(()=>clearInterval(timer),15000);
})();
