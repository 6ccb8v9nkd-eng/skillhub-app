/* SkillHub monthly assessment builder guard — 2026-10-09 v8
   Keeps the AI-era constructor usable on mobile and guarantees a real default
   composition when a fresh check is assigned.
*/
(function(){
  'use strict';
  if(window.__shMonthlyBuilderV8)return;window.__shMonthlyBuilderV8=true;

  function root(){return document.querySelector('#modalCard .sh-assess-v5')}
  function fixModal(){
    const r=root(),card=document.getElementById('modalCard');
    if(!card)return;
    card.classList.toggle('sh-assess-modal-v8',!!r);
    if(!r)return;
    r.querySelectorAll('.sh-assess-task,.sh-assess-scope label').forEach(el=>{
      el.style.removeProperty('left');el.style.removeProperty('right');el.style.removeProperty('transform');
    });
  }

  function ensureDefaultComposition(){
    const hard=[...document.querySelectorAll('#modalCard [data-assess-hard]')];
    const manual=[...document.querySelectorAll('#modalCard [data-assess-manual]')];
    let changed=false;
    if(hard.length&&!hard.some(x=>x.checked)){
      hard.slice(0,Math.min(8,hard.length)).forEach(x=>{x.checked=true});changed=true;
    }
    if(manual.length&&!manual.some(x=>x.checked)){
      manual.slice(0,Math.min(2,manual.length)).forEach(x=>{x.checked=true});changed=true;
    }
    if(changed){
      const target=hard.find(x=>x.checked)||manual.find(x=>x.checked);
      target?.dispatchEvent(new Event('change',{bubbles:true}));
    }
    return {hard:hard.filter(x=>x.checked).length,manual:manual.filter(x=>x.checked).length};
  }

  function installAssignGuard(){
    const current=window.shAssessAssign;
    if(typeof current!=='function'||current.__shMonthlyBuilderV8)return;
    const base=current;
    const wrapped=async function(){
      const counts=ensureDefaultComposition();
      if(!counts.hard||!counts.manual){
        const hardTotal=document.querySelectorAll('#modalCard [data-assess-hard]').length;
        const manualTotal=document.querySelectorAll('#modalCard [data-assess-manual]').length;
        if(!hardTotal||!manualTotal){
          if(typeof toast==='function')toast(!hardTotal?'Не удалось загрузить Hard-задания':'Не удалось загрузить свободные ответы');
          return;
        }
      }
      return base.apply(this,arguments);
    };
    wrapped.__shMonthlyBuilderV8=true;
    wrapped.__shMonthlyBuilderBase=base;
    window.shAssessAssign=wrapped;
    window.shMonthlyAssign=wrapped;
  }

  function repair(){fixModal();installAssignGuard();if(root())ensureDefaultComposition()}

  if(!document.getElementById('shMonthlyBuilderV8Style')){
    const s=document.createElement('style');s.id='shMonthlyBuilderV8Style';s.textContent=`
      #modalCard.sh-assess-modal-v8{box-sizing:border-box!important;min-width:0!important;overflow-x:hidden!important}
      #modalCard.sh-assess-modal-v8 .sh-assess-v5,
      #modalCard.sh-assess-modal-v8 .sh-assess-v5>*,
      #modalCard.sh-assess-modal-v8 .sh-assess-section,
      #modalCard.sh-assess-modal-v8 .sh-assess-section details,
      #modalCard.sh-assess-modal-v8 .sh-assess-list,
      #modalCard.sh-assess-modal-v8 .sh-assess-head,
      #modalCard.sh-assess-modal-v8 .sh-assess-title,
      #modalCard.sh-assess-modal-v8 .sh-assess-footer{box-sizing:border-box!important;min-width:0!important;max-width:100%!important}
      #modalCard.sh-assess-modal-v8 .sh-assess-v5{width:100%!important;overflow-x:hidden!important}
      #modalCard.sh-assess-modal-v8 .sh-assess-task,
      #modalCard.sh-assess-modal-v8 .sh-assess-scope label{
        position:relative!important;inset:auto!important;left:auto!important;right:auto!important;transform:none!important;float:none!important;
        display:grid!important;grid-template-columns:24px minmax(0,1fr)!important;align-items:center!important;gap:10px!important;
        width:100%!important;max-width:100%!important;min-width:0!important;margin:0!important;text-align:left!important;overflow:hidden!important
      }
      #modalCard.sh-assess-modal-v8 .sh-assess-task>input,
      #modalCard.sh-assess-modal-v8 .sh-assess-scope label>input{
        position:static!important;inset:auto!important;left:auto!important;right:auto!important;transform:none!important;float:none!important;
        width:20px!important;height:20px!important;min-width:20px!important;max-width:20px!important;margin:0!important;padding:0!important
      }
      #modalCard.sh-assess-modal-v8 .sh-assess-task>span,
      #modalCard.sh-assess-modal-v8 .sh-assess-scope label>span,
      #modalCard.sh-assess-modal-v8 .sh-assess-task b,
      #modalCard.sh-assess-modal-v8 .sh-assess-task small,
      #modalCard.sh-assess-modal-v8 .sh-assess-scope b,
      #modalCard.sh-assess-modal-v8 .sh-assess-scope small{
        position:static!important;inset:auto!important;left:auto!important;right:auto!important;transform:none!important;float:none!important;
        display:block!important;width:auto!important;max-width:100%!important;min-width:0!important;margin-left:0!important;margin-right:0!important;
        padding-left:0!important;padding-right:0!important;text-align:left!important;text-indent:0!important;white-space:normal!important;
        overflow-wrap:anywhere!important;word-break:break-word!important
      }
      #modalCard.sh-assess-modal-v8 .sh-assess-scope{min-width:0!important;max-width:100%!important}
      #modalCard.sh-assess-modal-v8 .sh-assess-list{overflow-x:hidden!important}
      @media(max-width:620px){
        #modalCard.sh-assess-modal-v8{width:calc(100vw - 8px)!important;max-width:calc(100vw - 8px)!important;min-width:0!important;margin:4px!important;padding:12px!important;overflow-x:hidden!important}
        #modalCard.sh-assess-modal-v8 .sh-assess-section{width:100%!important;padding:12px!important;overflow:hidden!important}
        #modalCard.sh-assess-modal-v8 .sh-assess-scope,
        #modalCard.sh-assess-modal-v8 .sh-assess-deadline{grid-template-columns:minmax(0,1fr)!important;width:100%!important}
        #modalCard.sh-assess-modal-v8 #assessPeople{width:100%!important;min-width:0!important;max-width:100%!important;padding:0!important}
      }
    `;document.head.appendChild(s);
  }

  let timer=0;
  const obs=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(repair,20)});
  obs.observe(document.documentElement,{childList:true,subtree:true});
  const poll=setInterval(repair,250);setTimeout(()=>clearInterval(poll),12000);
  repair();
  console.info('SkillHub: monthly builder v8 enabled');
})();