/* SkillHub RG top actions cleanup — 2026-10-14
   Assignment remains in the dedicated Assignments section and employee card.
   Monthly/final assessment is not touched.
*/
(function(){
  'use strict';
  if(window.__shRgTopActions20261014)return;
  window.__shRgTopActions20261014=true;

  function cleanup(){
    const root=document.getElementById('page-mentor');
    if(!root)return;
    root.querySelectorAll('.sh74-manager-top .actions button[onclick*="openAssignmentEditor"]').forEach(btn=>btn.remove());
    const actions=root.querySelector('.sh74-manager-top .actions');
    if(actions)actions.classList.add('sh-rg-top-actions-clean');
  }

  const root=document.getElementById('page-mentor');
  if(root){
    const observer=new MutationObserver(cleanup);
    observer.observe(root,{subtree:true,childList:true});
  }
  document.addEventListener('click',e=>{
    if(e.target?.closest?.('[data-page="mentor"]'))setTimeout(cleanup,0);
  },true);
  setTimeout(cleanup,0);
  setTimeout(cleanup,500);

  if(!document.getElementById('sh-rg-top-actions-clean-style')){
    const s=document.createElement('style');
    s.id='sh-rg-top-actions-clean-style';
    s.textContent='.sh-stable-rg .sh74-manager-top .actions.sh-rg-top-actions-clean{display:flex!important;width:auto!important;grid-template-columns:none!important}.sh-stable-rg .sh74-manager-top .actions.sh-rg-top-actions-clean .btn{width:auto!important}@media(max-width:620px){.sh-stable-rg .sh74-manager-top .actions.sh-rg-top-actions-clean{width:auto!important;display:flex!important}.sh-stable-rg .sh74-manager-top .actions.sh-rg-top-actions-clean .btn{width:auto!important}}';
    document.head.appendChild(s);
  }

  console.info('SkillHub: duplicate RG top assignment button removed');
})();
