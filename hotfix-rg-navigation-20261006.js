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

/* SkillHub: keep "Моя группа" focused on people. All manager assignments,
   including the monthly final check, live in one structured Assignments hub. */
(function(){
  'use strict';

  let assignmentMode='home';
  let syncingMonthly=false;
  let monthlySyncTimer=null;
  let lastMonthlySource='';

  function isManagerRole(){
    try{return typeof S!=='undefined' && ['mentor','rs','tech_admin'].includes(S?.profile?.role)}catch(_){return false}
  }

  function installStyles(){
    if(document.getElementById('shAssignmentsHubStyle'))return;
    const style=document.createElement('style');
    style.id='shAssignmentsHubStyle';
    style.textContent=`
      /* Monthly check must never add visual noise to My Group / Sector. */
      #page-mentor [data-sh-monthly-manager]{display:none!important}

      .sh-as-hub{max-width:1100px;margin:0 auto;padding-bottom:24px}
      .sh-as-home-head{margin:4px 0 16px}
      .sh-as-home-head h2{margin:0 0 5px;font-size:clamp(22px,3vw,30px)}
      .sh-as-home-head p{margin:0;color:var(--muted,#8f949f)}
      .sh-as-choice-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
      .sh-as-choice{appearance:none;text-align:left;border:1px solid var(--border,#2b3038);background:var(--card,#15181d);color:inherit;border-radius:22px;padding:20px;cursor:pointer;min-height:164px;display:flex;flex-direction:column;justify-content:space-between;transition:.16s ease}
      .sh-as-choice:hover{transform:translateY(-1px);border-color:rgba(255,214,38,.55)}
      .sh-as-choice:active{transform:scale(.995)}
      .sh-as-choice-icon{width:48px;height:48px;border-radius:15px;display:grid;place-items:center;background:rgba(255,214,38,.12);font-size:24px;margin-bottom:18px}
      .sh-as-choice h3{margin:0 0 6px;font-size:21px;line-height:1.2}
      .sh-as-choice p{margin:0;color:var(--muted,#8f949f);line-height:1.45}
      .sh-as-choice-foot{display:flex;align-items:center;justify-content:space-between;margin-top:18px;font-weight:800}
      .sh-as-choice-foot span:last-child{color:#ffd626;font-size:20px}
      .sh-as-subhead{display:flex;align-items:center;gap:12px;margin:2px 0 15px}
      .sh-as-back{appearance:none;border:1px solid var(--border,#2b3038);background:var(--card,#15181d);color:inherit;border-radius:12px;padding:9px 12px;cursor:pointer;font-weight:700}
      .sh-as-subhead h2{margin:0;font-size:22px}
      .sh-as-month-host>.sh-month-card{margin-top:0!important}
      .sh-as-loading{border:1px solid var(--border,#2b3038);background:var(--card,#15181d);border-radius:18px;padding:20px;color:var(--muted,#8f949f)}
      @media(max-width:700px){.sh-as-choice-grid{grid-template-columns:1fr}.sh-as-choice{min-height:145px;padding:18px}}
    `;
    document.head.appendChild(style);
  }

  function buildHub(legacyHtml){
    return `<div class="sh-as-hub">
      <div id="shAsHome">
        <div class="sh-as-home-head"><h2>Что назначаем?</h2><p>Обучение и ежемесячная проверка разделены, чтобы ничего не смешивалось.</p></div>
        <div class="sh-as-choice-grid">
          <button class="sh-as-choice" onclick="shAssignmentsOpen('learning')">
            <div><div class="sh-as-choice-icon">📚</div><h3>Курсы и тренировки</h3><p>Назначить материал, тему или отработку сотрудникам.</p></div>
            <div class="sh-as-choice-foot"><span>Открыть назначения</span><span>→</span></div>
          </button>
          <button class="sh-as-choice" onclick="shAssignmentsOpen('monthly')">
            <div><div class="sh-as-choice-icon">✓</div><h3>Итоговая проверка за месяц</h3><p>Отдельный выпуск каждый месяц: настройка, назначение и результаты.</p></div>
            <div class="sh-as-choice-foot"><span>Открыть проверку</span><span>→</span></div>
          </button>
        </div>
      </div>
      <div id="shAsLearning" class="hidden">
        <div class="sh-as-subhead"><button class="sh-as-back" onclick="shAssignmentsOpen('home')">← Назад</button><h2>Курсы и тренировки</h2></div>
        <div id="shAsLegacy">${legacyHtml}</div>
      </div>
      <div id="shAsMonthly" class="hidden">
        <div class="sh-as-subhead"><button class="sh-as-back" onclick="shAssignmentsOpen('home')">← Назад</button><h2>Итоговая проверка за месяц</h2></div>
        <div id="shAssignmentMonthlyHost" class="sh-as-month-host"><div class="sh-as-loading">Загружаем текущую проверку…</div></div>
      </div>
    </div>`;
  }

  function scheduleMonthlySync(delay=0){
    clearTimeout(monthlySyncTimer);
    monthlySyncTimer=setTimeout(syncMonthlyCard,delay);
  }

  function applyMode(){
    const home=document.getElementById('shAsHome');
    const learning=document.getElementById('shAsLearning');
    const monthly=document.getElementById('shAsMonthly');
    if(!home||!learning||!monthly)return;
    home.classList.toggle('hidden',assignmentMode!=='home');
    learning.classList.toggle('hidden',assignmentMode!=='learning');
    monthly.classList.toggle('hidden',assignmentMode!=='monthly');
    if(assignmentMode==='monthly')scheduleMonthlySync(0);
  }

  window.shAssignmentsOpen=function(mode){
    assignmentMode=['home','learning','monthly'].includes(mode)?mode:'home';
    applyMode();
  };

  function syncMonthlyCard(){
    if(syncingMonthly||!isManagerRole())return;
    const host=document.getElementById('shAssignmentMonthlyHost');
    if(!host)return;
    const source=document.querySelector('#page-mentor [data-sh-monthly-manager]');
    if(!source){
      lastMonthlySource='';
      if(!host.querySelector('[data-sh-monthly-assignment-clone]')&&!host.querySelector('.sh-as-loading')){
        host.innerHTML='<div class="sh-as-loading">Загружаем текущую проверку…</div>';
      }
      return;
    }

    const sourceSignature=source.outerHTML;
    if(sourceSignature===lastMonthlySource&&host.querySelector('[data-sh-monthly-assignment-clone]'))return;

    syncingMonthly=true;
    try{
      const clone=source.cloneNode(true);
      clone.removeAttribute('data-sh-monthly-manager');
      clone.setAttribute('data-sh-monthly-assignment-clone','1');
      host.replaceChildren(clone);
      lastMonthlySource=sourceSignature;
    }finally{syncingMonthly=false}
  }

  function wrapAssignments(){
    if(typeof renderAssignments!=='function'||renderAssignments.__shHubWrapped)return;
    const base=renderAssignments;
    const wrapped=function(){
      const r=base.apply(this,arguments);
      if(!isManagerRole())return r;
      const page=document.getElementById('page-assignments');
      if(!page)return r;
      const legacy=page.innerHTML;
      page.innerHTML=buildHub(legacy);
      applyMode();
      scheduleMonthlySync(40);
      return r;
    };
    wrapped.__shHubWrapped=true;
    renderAssignments=wrapped;
  }

  installStyles();
  wrapAssignments();

  const obs=new MutationObserver(mutations=>{
    const host=document.getElementById('shAssignmentMonthlyHost');
    // Ignore mutations caused by cloning/updating the monthly card itself.
    if(host&&mutations.length&&mutations.every(m=>host.contains(m.target)))return;

    installStyles();
    if(typeof renderAssignments==='function'&&!renderAssignments.__shHubWrapped)wrapAssignments();
    if(host)scheduleMonthlySync(25);
  });
  obs.observe(document.body,{subtree:true,childList:true});

  setTimeout(()=>{wrapAssignments();scheduleMonthlySync(0)},0);
  setTimeout(()=>{wrapAssignments();scheduleMonthlySync(0)},700);
  console.info('SkillHub: structured Assignments hub enabled without rerender loop');
})();
