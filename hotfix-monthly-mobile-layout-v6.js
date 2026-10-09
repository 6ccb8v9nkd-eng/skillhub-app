/* SkillHub monthly assessment mobile layout guard — 2026-10-09 v6 */
(function(){
  'use strict';
  if(window.__shMonthlyMobileLayoutV6)return;window.__shMonthlyMobileLayoutV6=true;
  const s=document.createElement('style');
  s.id='shMonthlyMobileLayoutV6Style';
  s.textContent=`
    #modalCard:has(.sh-assess-v5){overflow-x:hidden!important}
    .sh-assess-v5,.sh-assess-v5 *{box-sizing:border-box}
    .sh-assess-v5 .sh-assess-list{width:100%!important;max-width:100%!important;min-width:0!important;overflow-x:hidden!important}
    .sh-assess-v5 .sh-assess-task{
      position:relative!important;left:auto!important;right:auto!important;transform:none!important;
      display:grid!important;grid-template-columns:24px minmax(0,1fr)!important;
      align-items:center!important;gap:10px!important;
      width:100%!important;max-width:100%!important;min-width:0!important;
      margin:0!important;padding:10px 11px!important;text-align:left!important;overflow:hidden!important;
    }
    .sh-assess-v5 .sh-assess-task>input{
      position:static!important;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;
      transform:none!important;float:none!important;width:19px!important;height:19px!important;
      min-width:19px!important;max-width:19px!important;margin:0!important;padding:0!important;
    }
    .sh-assess-v5 .sh-assess-task>span,
    .sh-assess-v5 .sh-assess-scope label>span{
      position:static!important;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;
      inset:auto!important;transform:none!important;float:none!important;
      display:block!important;width:auto!important;max-width:100%!important;min-width:0!important;
      margin:0!important;padding:0!important;text-align:left!important;text-indent:0!important;
      white-space:normal!important;overflow:visible!important;
    }
    .sh-assess-v5 .sh-assess-task>span>b,
    .sh-assess-v5 .sh-assess-task>span>small,
    .sh-assess-v5 .sh-assess-scope label>span>b,
    .sh-assess-v5 .sh-assess-scope label>span>small{
      position:static!important;left:auto!important;right:auto!important;transform:none!important;
      display:block!important;width:auto!important;max-width:100%!important;min-width:0!important;
      margin-left:0!important;margin-right:0!important;padding-left:0!important;padding-right:0!important;
      text-align:left!important;text-indent:0!important;white-space:normal!important;
      overflow-wrap:anywhere!important;word-break:break-word!important;
    }
    .sh-assess-v5 .sh-assess-scope label{
      position:relative!important;left:auto!important;right:auto!important;transform:none!important;
      display:grid!important;grid-template-columns:24px minmax(0,1fr)!important;
      align-items:start!important;gap:10px!important;width:100%!important;max-width:100%!important;min-width:0!important;
      margin:0!important;padding:12px!important;overflow:hidden!important;text-align:left!important;
    }
    .sh-assess-v5 .sh-assess-scope label>input{
      position:static!important;left:auto!important;right:auto!important;transform:none!important;
      width:20px!important;height:20px!important;min-width:20px!important;max-width:20px!important;margin:0!important;padding:0!important;
    }
    @media(max-width:620px){
      #modalCard:has(.sh-assess-v5){width:100vw!important;max-width:100vw!important;margin:0!important;border-radius:20px 20px 0 0!important;padding:14px!important;overflow-x:hidden!important}
      .sh-assess-v5{width:100%!important;max-width:100%!important;min-width:0!important;overflow-x:hidden!important}
      .sh-assess-v5 .sh-assess-section{width:100%!important;max-width:100%!important;min-width:0!important;overflow:hidden!important;padding:12px!important}
      .sh-assess-v5 .sh-assess-scope{grid-template-columns:1fr!important;width:100%!important;max-width:100%!important;min-width:0!important}
      .sh-assess-v5 #assessPeople{width:100%!important;max-width:100%!important;min-width:0!important;padding:0!important;margin-top:9px!important}
    }
  `;
  document.head.appendChild(s);
  console.info('SkillHub: monthly mobile layout v6 enabled');
})();
