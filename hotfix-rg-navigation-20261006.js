/* SkillHub hotfix: simplify RG navigation without removing functionality.
   - RG progress is consolidated into "Моя группа"
   - Notifications stay available from the top bell only
   - Profile stays available from the top-right profile control only
*/
(function(){
  'use strict';

  function isRg(){
    try{return typeof S!=='undefined' && S?.profile?.role==='mentor'}catch(_){return false}
  }

  function applyRgNavigation(){
    const root=document.documentElement;
    if(!root)return;
    root.classList.toggle('sh-rg-clean-nav',isRg());

    if(!isRg())return;
    const nav=document.querySelector('.sidebar nav');
    if(!nav)return;

    // Keep the primary RG flow compact. The hidden destinations still exist;
    // notifications/profile remain accessible from their top-bar controls.
    ['progress','notifications','profile'].forEach(page=>{
      const btn=nav.querySelector(`.nav-btn[data-page="${page}"]`);
      if(btn)btn.classList.add('hidden');
    });

    const mentor=nav.querySelector('.nav-btn[data-page="mentor"]');
    if(mentor){
      mentor.classList.remove('hidden');
      const label=mentor.querySelector('.nav-text');
      if(label)label.textContent='Моя группа';
    }
  }

  if(!document.getElementById('shRgCleanNavStyle')){
    const style=document.createElement('style');
    style.id='shRgCleanNavStyle';
    style.textContent=`
      html.sh-rg-clean-nav .sidebar nav .nav-btn[data-page="progress"],
      html.sh-rg-clean-nav .sidebar nav .nav-btn[data-page="notifications"],
      html.sh-rg-clean-nav .sidebar nav .nav-btn[data-page="profile"]{
        display:none!important;
      }
    `;
    document.head.appendChild(style);
  }

  if(typeof go==='function'){
    const baseGo=go;
    go=function(page){
      if(isRg() && page==='progress')page='mentor';
      const r=baseGo.apply(this,[page,...Array.prototype.slice.call(arguments,1)]);
      setTimeout(applyRgNavigation,0);
      return r;
    };
  }

  if(typeof enterApp==='function'){
    const baseEnterApp=enterApp;
    enterApp=function(){
      const r=baseEnterApp.apply(this,arguments);
      setTimeout(applyRgNavigation,0);
      return r;
    };
  }

  if(typeof logout==='function'){
    const baseLogout=logout;
    logout=async function(){
      document.documentElement.classList.remove('sh-rg-clean-nav');
      return baseLogout.apply(this,arguments);
    };
  }

  setTimeout(applyRgNavigation,0);
  setTimeout(applyRgNavigation,500);
  console.info('SkillHub: RG navigation cleanup enabled');
})();
