/* SkillHub hotfix: simplify RG navigation without removing functionality.
   - RG progress is consolidated into "Моя группа"
   - Notifications stay available from the top bell only
   - Profile stays available from the top-right profile control only
   - "Смотреть всех" in "Моя группа" opens the employee list/cards, not access management
*/
(function(){
  'use strict';

  // Load the Content-section structure hotfix for every role that has Content access.
  if(!document.querySelector('script[data-sh-content-structure]')){
    const sc=document.createElement('script');
    sc.src='./hotfix-content-structure-20261006.js?v=2';
    sc.dataset.shContentStructure='1';
    document.head.appendChild(sc);
  }

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

    // RG sees only the primary work sections in bottom/sidebar navigation.
    // Notifications/profile remain available from the top bar.
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

  function decorateMyGroup(){
    if(!isRg())return;
    const page=document.getElementById('page-mentor');
    if(!page)return;
    const sections=[...page.querySelectorAll('.sh74-section-head')];
    const myGroupHead=sections.find(x=>(x.querySelector('h2')?.textContent||'').trim()==='Моя группа');
    const btn=myGroupHead?.querySelector('.sh74-link');
    if(btn){
      btn.textContent='Смотреть всех';
      btn.setAttribute('onclick','shRgShowAllTeam()');
    }
  }

  window.shRgShowAllTeam=function(){
    if(!isRg())return;
    if(typeof teamRows!=='function' || typeof sh74TeamRowsHtml!=='function' || typeof showModal!=='function')return;
    const users=teamRows(S.profile.login);
    showModal(`
      <div class="modal-head">
        <div><h2>Все сотрудники группы</h2><div class="meta">${users.length} сотрудников · откройте карточку для результатов и истории</div></div>
        <button class="btn secondary" onclick="closeModal()">✕</button>
      </div>
      ${sh74TeamRowsHtml(users)}
    `);
  };

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
      setTimeout(()=>{applyRgNavigation();decorateMyGroup()},0);
      return r;
    };
  }

  if(typeof renderManagerMentor==='function'){
    const baseRenderManagerMentor=renderManagerMentor;
    renderManagerMentor=function(){
      const r=baseRenderManagerMentor.apply(this,arguments);
      setTimeout(decorateMyGroup,0);
      return r;
    };
  }

  if(typeof enterApp==='function'){
    const baseEnterApp=enterApp;
    enterApp=function(){
      const r=baseEnterApp.apply(this,arguments);
      setTimeout(()=>{applyRgNavigation();decorateMyGroup()},0);
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

  setTimeout(()=>{applyRgNavigation();decorateMyGroup()},0);
  setTimeout(()=>{applyRgNavigation();decorateMyGroup()},500);
  console.info('SkillHub: RG navigation cleanup and in-group employee list enabled');
})();
