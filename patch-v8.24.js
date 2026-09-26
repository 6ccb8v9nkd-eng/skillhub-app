/* SkillHub V8.24 — tech admin RG demo access + pre-release guard */
(function(){
  function isTech(){return window.S?.profile?.role==='tech_admin'}
  window.sh816DemoAllowed=function(){return ['mentor','rs','tech_admin'].includes(window.S?.profile?.role)};
  const baseShort=window.sh816DemoRoleShort;
  window.sh816DemoRoleShort=function(){return isTech()?'РГ':(typeof baseShort==='function'?baseShort():'РГ')};
  const baseLong=window.sh816DemoRoleLong;
  window.sh816DemoRoleLong=function(){return isTech()?'ТЕХАДМИНИСТРАТОРА В РОЛИ РГ':(typeof baseLong==='function'?baseLong():'РУКОВОДИТЕЛЯ ГРУППЫ')};

  function exposeTechRgDemo(){
    if(!isTech())return;
    document.querySelectorAll('.rg-only').forEach(el=>el.classList.remove('hidden'));
    const nav=document.querySelector('.sidebar nav');
    const btn=nav?.querySelector('.nav-btn[data-page="rgpractice"]');
    if(btn){
      btn.classList.remove('hidden');
      const label=btn.querySelector('.nav-text, span:last-child');
      if(label)label.textContent='Демо РГ';
      nav.appendChild(btn);
    }
  }

  const baseEnter=window.enterApp;
  if(typeof baseEnter==='function'){
    window.enterApp=function(){
      const r=baseEnter.apply(this,arguments);
      exposeTechRgDemo();
      return r;
    };
  }

  const baseGo=window.go;
  if(typeof baseGo==='function'){
    window.go=function(page){
      if(page==='rgpractice'&&isTech()){
        exposeTechRgDemo();
      }
      return baseGo.apply(this,arguments);
    };
  }

  window.addEventListener('DOMContentLoaded',exposeTechRgDemo);
  setTimeout(exposeTechRgDemo,0);
})();
