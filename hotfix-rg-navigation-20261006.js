/* SkillHub RG navigation — stable navigation-only version.
   Assignments now has its own single controller and is intentionally not wrapped here.
*/
(function(){
  'use strict';
  if(window.__shRgNavigationStable20261015)return;
  window.__shRgNavigationStable20261015=true;

  if(!document.querySelector('script[data-sh-content-structure]')){
    const sc=document.createElement('script');
    sc.src='./hotfix-content-structure-20261006.js?v=2';
    sc.dataset.shContentStructure='1';
    document.head.appendChild(sc);
  }

  function isRg(){try{return typeof S!=='undefined'&&S?.profile?.role==='mentor'}catch(_){return false}}

  function applyRgNavigation(){
    const root=document.documentElement;if(!root)return;
    root.classList.toggle('sh-rg-clean-nav',isRg());
    if(!isRg())return;
    const nav=document.querySelector('.sidebar nav');if(!nav)return;
    ['progress','notifications','profile'].forEach(page=>nav.querySelector(`.nav-btn[data-page="${page}"]`)?.classList.add('hidden'));
    const mentor=nav.querySelector('.nav-btn[data-page="mentor"]');
    if(mentor){mentor.classList.remove('hidden');const label=mentor.querySelector('.nav-text');if(label)label.textContent='Моя группа'}
  }

  function decorateMyGroup(){
    if(!isRg())return;
    const page=document.getElementById('page-mentor');if(!page)return;
    const head=[...page.querySelectorAll('.sh74-section-head')].find(x=>(x.querySelector('h2')?.textContent||'').trim()==='Моя группа');
    const btn=head?.querySelector('.sh74-link');if(btn){btn.textContent='Смотреть всех';btn.setAttribute('onclick','shRgShowAllTeam()')}
  }

  window.shRgShowAllTeam=function(){
    if(!isRg()||typeof teamRows!=='function'||typeof sh74TeamRowsHtml!=='function'||typeof showModal!=='function')return;
    const users=teamRows(S.profile.login);
    showModal(`<div class="modal-head"><div><h2>Все сотрудники группы</h2><div class="meta">${users.length} сотрудников · откройте карточку для результатов и истории</div></div><button class="btn secondary" onclick="closeModal()">✕</button></div>${sh74TeamRowsHtml(users)}`);
  };

  if(!document.getElementById('shRgCleanNavStyle')){
    const style=document.createElement('style');style.id='shRgCleanNavStyle';style.textContent=`
      html.sh-rg-clean-nav .sidebar nav .nav-btn[data-page="progress"],
      html.sh-rg-clean-nav .sidebar nav .nav-btn[data-page="notifications"],
      html.sh-rg-clean-nav .sidebar nav .nav-btn[data-page="profile"]{display:none!important}
    `;document.head.appendChild(style);
  }

  try{
    if(typeof go==='function'&&!go.__shRgNavStable){
      const base=go;
      const wrapped=function(page){if(isRg()&&page==='progress')page='mentor';const args=[page,...Array.prototype.slice.call(arguments,1)],r=base.apply(this,args);queueMicrotask(()=>{applyRgNavigation();decorateMyGroup()});return r};
      wrapped.__shRgNavStable=true;go=wrapped;window.go=wrapped;
    }
  }catch(_){}

  try{
    if(typeof renderManagerMentor==='function'&&!renderManagerMentor.__shRgNavStable){
      const base=renderManagerMentor;
      const wrapped=function(){const r=base.apply(this,arguments);queueMicrotask(decorateMyGroup);return r};
      wrapped.__shRgNavStable=true;renderManagerMentor=wrapped;window.renderManagerMentor=wrapped;
    }
  }catch(_){}

  try{
    if(typeof enterApp==='function'&&!enterApp.__shRgNavStable){
      const base=enterApp;
      const wrapped=function(){const r=base.apply(this,arguments);queueMicrotask(()=>{applyRgNavigation();decorateMyGroup()});return r};
      wrapped.__shRgNavStable=true;enterApp=wrapped;window.enterApp=wrapped;
    }
  }catch(_){}

  try{
    if(typeof logout==='function'&&!logout.__shRgNavStable){
      const base=logout;
      const wrapped=async function(){document.documentElement.classList.remove('sh-rg-clean-nav');return await base.apply(this,arguments)};
      wrapped.__shRgNavStable=true;logout=wrapped;window.logout=wrapped;
    }
  }catch(_){}

  applyRgNavigation();queueMicrotask(decorateMyGroup);
  console.info('SkillHub: stable RG navigation enabled; Assignments renderer decoupled');
})();
