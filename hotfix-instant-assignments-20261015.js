/* SkillHub stable Assignments controller — 2026-10-15
   One deterministic renderer for manager Assignments.
   - paints the page synchronously from local state;
   - keeps monthly assessment summary in the same stable host;
   - refreshes monthly summary in background;
   - never changes assessment scoring, composition, attempts or workflow rules.
*/
(function(){
  'use strict';
  if(window.__shAssignmentsStable20261015)return;
  window.__shAssignmentsStable20261015=true;

  const state=()=>{try{return typeof S!=='undefined'?S:window.S}catch(_){return window.S}};
  const arr=v=>Array.isArray(v)?v:[];
  const esc=v=>typeof window.esc==='function'?window.esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const js=v=>String(v??'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  const manager=()=>['mentor','rs','tech_admin'].includes(String(state()?.profile?.role||''));
  const login=()=>String(state()?.profile?.login||'');
  const page=()=>document.getElementById('page-assignments');
  const monthlyHost=()=>document.getElementById('shAssignmentMonthlyHost');
  const fmt=v=>{if(!v)return'—';try{return new Date(v).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}catch(_){return String(v)}};
  const sectionName=s=>typeof window.secName==='function'?window.secName(s):(s==='soft'?'Soft Skills':s==='hard'?'Hard Skills':s==='needs'?'Потребность':s==='typing'?'Скорость печати':String(s||''));

  let mode='home';
  let monthlyBusy=null;
  let monthlyLastFetch=0;
  let installed=false;
  let pageObserver=null;

  function injectStyles(){
    if(document.getElementById('shAssignmentsStableStyle'))return;
    const s=document.createElement('style');
    s.id='shAssignmentsStableStyle';
    s.textContent=`
      .sh-stable-assignments{max-width:1100px;margin:0 auto;padding-bottom:24px}
      .sh-stable-assign-head{margin:4px 0 16px}.sh-stable-assign-head h2{margin:0 0 5px;font-size:clamp(22px,3vw,30px)}.sh-stable-assign-head p{margin:0;color:var(--muted,#8f979e)}
      .sh-stable-choice-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
      .sh-stable-choice{appearance:none;text-align:left;border:1px solid var(--line,#2d363e);background:var(--panel,#161b1f);color:inherit;border-radius:20px;padding:20px;min-height:158px;display:flex;flex-direction:column;justify-content:space-between;cursor:pointer}
      .sh-stable-choice:active{transform:scale(.995)}.sh-stable-choice-icon{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;background:rgba(255,214,38,.12);font-size:23px;margin-bottom:17px}
      .sh-stable-choice h3{margin:0 0 6px;font-size:20px}.sh-stable-choice p{margin:0;color:var(--muted,#8f979e);line-height:1.45}.sh-stable-choice-foot{display:flex;align-items:center;justify-content:space-between;margin-top:18px;font-weight:850}.sh-stable-choice-foot span:last-child{color:var(--yellow,#ffd626);font-size:20px}
      .sh-stable-subhead{display:flex;align-items:center;gap:12px;margin:2px 0 15px}.sh-stable-back{appearance:none;border:1px solid var(--line,#2d363e);background:var(--panel,#161b1f);color:inherit;border-radius:12px;padding:9px 12px;font-weight:800}.sh-stable-subhead h2{margin:0;font-size:22px}
      .sh-stable-learning .toolbar{margin-bottom:10px}.sh-stable-month-error{border:1px solid #6c3c42;background:#26191c;border-radius:16px;padding:16px}.sh-stable-month-error b{display:block;margin-bottom:5px}.sh-stable-month-error p{margin:0 0 12px;color:var(--muted)}
      .sh-stable-loading{border:1px solid var(--line,#2d363e);background:var(--panel,#161b1f);border-radius:18px;padding:18px;color:var(--muted,#8f979e)}
      @media(max-width:720px){.sh-stable-choice-grid{grid-template-columns:1fr}.sh-stable-choice{min-height:140px;padding:17px}.sh-stable-subhead{align-items:center}.sh-stable-subhead h2{font-size:19px}.sidebar>.side-brand{display:none!important}.mobile-brand{display:flex!important}}
    `;
    document.head.appendChild(s);
  }

  function learningHtml(){
    const rows=arr(state()?.assignments);
    const list=rows.map(x=>`<div class="assignment"><div><b>${esc(x.title||'Тренировка')}</b><div class="meta">${x.section?esc(sectionName(x.section)):''}${x.topic?' · '+esc(x.topic):''}${x.due?' · до '+esc(x.due):''} · ${esc(arr(x.recipients).join(', '))}</div></div><div class="actions">${Number(x.target)>0?`<span class="pill">${Number(x.target)}%+</span>`:''}<button class="btn danger" onclick="deleteAssignment('${js(x.id)}')">Удалить</button></div></div>`).join('');
    return `<div class="sh-stable-learning"><div class="toolbar"><span class="muted small">${rows.length} назначений</span><div><button class="btn primary" onclick="openAssignmentEditor()">+ Назначить тренировку</button></div></div><div class="card">${list||'<div class="muted">Назначений пока нет.</div>'}</div></div>`;
  }

  function shellHtml(){
    return `<div class="sh-stable-assignments" data-sh-assignments-stable="1">
      <section id="shAsHomeStable">
        <div class="sh-stable-assign-head"><h2>Что назначаем?</h2><p>Тренировки и итоговая проверка разделены и открываются независимо.</p></div>
        <div class="sh-stable-choice-grid">
          <button class="sh-stable-choice" type="button" onclick="shAssignmentsOpen('learning')"><div><div class="sh-stable-choice-icon">📚</div><h3>Курсы и тренировки</h3><p>Назначить Hard, Soft, ручную тренировку или скорость печати.</p></div><div class="sh-stable-choice-foot"><span>Открыть назначения</span><span>→</span></div></button>
          <button class="sh-stable-choice" type="button" onclick="shAssignmentsOpen('monthly')"><div><div class="sh-stable-choice-icon">✓</div><h3>Итоговая проверка за месяц</h3><p>Назначение, текущий статус и результаты аттестации.</p></div><div class="sh-stable-choice-foot"><span>Открыть проверку</span><span>→</span></div></button>
        </div>
      </section>
      <section id="shAsLearningStable" class="hidden"><div class="sh-stable-subhead"><button class="sh-stable-back" type="button" onclick="shAssignmentsOpen('home')">← Назад</button><h2>Курсы и тренировки</h2></div><div id="shAssignmentsLearningStable">${learningHtml()}</div></section>
      <section id="shAsMonthlyStable" class="hidden"><div class="sh-stable-subhead"><button class="sh-stable-back" type="button" onclick="shAssignmentsOpen('home')">← Назад</button><h2>Итоговая проверка за месяц</h2></div><div id="shAssignmentMonthlyHost" class="sh-as-month-host"></div></section>
    </div>`;
  }

  function cacheKey(){return `sh_monthly_summary_v3_${login()}`}
  function oldCacheKey(){return `sh_monthly_summary_v2_${login()}`}
  function readMonthlyCache(){
    for(const k of [cacheKey(),oldCacheKey()]){
      try{const v=JSON.parse(localStorage.getItem(k)||'null');if(v&&Array.isArray(v.checks)&&Array.isArray(v.runs))return v}catch(_){}
    }
    return null;
  }
  function saveMonthlyCache(v){try{localStorage.setItem(cacheKey(),JSON.stringify(v));localStorage.setItem(oldCacheKey(),JSON.stringify(v))}catch(_){}}

  function monthlyCardHtml(data){
    const checks=arr(data?.checks),runs=arr(data?.runs);
    const rows=checks.map(c=>{
      const rs=runs.filter(x=>String(x.check_id)===String(c.id)),done=rs.filter(x=>x.status==='completed');
      const avg=done.length?Math.round(done.reduce((s,x)=>s+Number(x.score||0),0)/done.length):null;
      const total=arr(c.recipients).length;
      return `<div class="shmc-manager-row"><div><b>${esc(c.title||'Итоговая проверка знаний')}</b><small>${fmt(c.created_at)} · срок ${fmt(c.due_at)}</small><div class="shmc-tags"><span>${done.length}/${total} завершили</span><span>${avg===null?'Средний —':`Средний ${avg}%`}</span><span>Проходной ${Number(c.pass_score||75)}%</span></div></div><div class="shmc-row-actions"><button class="btn secondary" onclick="shMonthlyCleanResults('${js(c.id)}')">Результаты</button><button class="btn secondary" onclick="shMonthlyOpenAssign('${js(c.id)}')">Назначить ещё</button></div></div>`;
    }).join('');
    return `<section class="card shmc-manager" data-sh-monthly-clean-manager="1" data-sh-monthly-assignment-clone="1" data-sh-monthly-stable="1"><div class="shmc-manager-head"><div><span class="shmc-kicker">ЕЖЕМЕСЯЧНАЯ АТТЕСТАЦИЯ</span><h2>Итоговая проверка знаний</h2><p>12 заданий · 30 минут · 1 попытка · проходной балл 75%</p></div><button class="btn primary" onclick="shMonthlyCreateAndAssign()">Назначить проверку</button></div>${rows?`<div class="shmc-manager-list">${rows}</div>`:'<div class="shmc-empty">Проверок ещё нет. Создайте первую итоговую проверку.</div>'}</section>`;
  }

  function monthlyLoadingHtml(){return `<section class="card shmc-manager" data-sh-monthly-clean-manager="1" data-sh-monthly-assignment-clone="1" data-sh-monthly-stable="1"><div class="shmc-manager-head"><div><span class="shmc-kicker">ЕЖЕМЕСЯЧНАЯ АТТЕСТАЦИЯ</span><h2>Итоговая проверка знаний</h2><p>Получаем актуальный статус…</p></div><button class="btn primary" onclick="shMonthlyCreateAndAssign()">Назначить проверку</button></div><div class="sh-stable-loading">Загрузка данных проверки…</div></section>`}

  function paintMonthly(data){const h=monthlyHost();if(!h)return false;h.innerHTML=data?monthlyCardHtml(data):monthlyLoadingHtml();return true}

  async function refreshMonthly(force=false){
    const A=state();if(!manager()||!A?.sb||!login())return false;
    if(monthlyBusy)return monthlyBusy;
    if(!force&&Date.now()-monthlyLastFetch<10000)return true;
    monthlyLastFetch=Date.now();
    monthlyBusy=(async()=>{
      try{
        const cq=await A.sb.from('monthly_checks').select('id,title,created_at,due_at,recipients,pass_score').order('created_at',{ascending:false}).limit(12);
        if(cq.error)throw cq.error;
        const checks=cq.data||[],ids=checks.map(x=>x.id);let runs=[];
        if(ids.length){const rq=await A.sb.from('monthly_check_runs').select('check_id,status,score').in('check_id',ids);if(rq.error)throw rq.error;runs=rq.data||[]}
        const data={at:Date.now(),checks,runs};saveMonthlyCache(data);paintMonthly(data);return true;
      }catch(e){
        monthlyLastFetch=0;console.warn('SkillHub monthly summary failed',e);
        if(!readMonthlyCache()){
          const h=monthlyHost();if(h)h.innerHTML=`<div class="sh-stable-month-error"><b>Не удалось получить данные итоговой проверки</b><p>Страница не зависла — запрос завершился ошибкой.</p><button class="btn secondary" onclick="shAssignmentsRetryMonthly()">Повторить</button></div>`;
        }
        return false;
      }
    })();
    try{return await monthlyBusy}finally{monthlyBusy=null}
  }

  window.shAssignmentsRetryMonthly=function(){paintMonthly(readMonthlyCache());refreshMonthly(true)};

  function applyMode(){
    const h=document.getElementById('shAsHomeStable'),l=document.getElementById('shAsLearningStable'),m=document.getElementById('shAsMonthlyStable');
    if(!h||!l||!m)return;
    h.classList.toggle('hidden',mode!=='home');l.classList.toggle('hidden',mode!=='learning');m.classList.toggle('hidden',mode!=='monthly');
    if(mode==='learning'){const x=document.getElementById('shAssignmentsLearningStable');if(x)x.innerHTML=learningHtml()}
    if(mode==='monthly'){paintMonthly(readMonthlyCache());refreshMonthly(false)}
  }

  function renderStable(){
    if(!manager())return;
    injectStyles();
    const p=page();if(!p)return;
    p.innerHTML=shellHtml();
    paintMonthly(readMonthlyCache());
    applyMode();
  }
  renderStable.__shHubWrapped=true;
  renderStable.__shInstantMonthly=true;
  renderStable.__shStableAssignments=true;

  function openStable(next){
    mode=['home','learning','monthly'].includes(String(next))?String(next):'home';
    if(!page()?.querySelector('[data-sh-assignments-stable]'))renderStable();
    else applyMode();
  }
  openStable.__shInstantMonthly=true;
  openStable.__shStableAssignments=true;

  function installRenderer(){
    if(!manager())return;
    injectStyles();
    try{window.renderAssignments=renderStable;renderAssignments=renderStable}catch(_){window.renderAssignments=renderStable}
    window.shAssignmentsOpen=openStable;
    if(String(state()?.currentPage||'')==='assignments')renderStable();

    const p=page();
    if(p&&!pageObserver){
      let queued=false;
      pageObserver=new MutationObserver(()=>{
        if(queued||p.classList.contains('hidden'))return;queued=true;
        queueMicrotask(()=>{
          queued=false;
          if(!p.querySelector('[data-sh-assignments-stable]')){renderStable();return}
          const host=monthlyHost();
          const stray=[...p.children].find(x=>x?.matches?.('[data-sh-monthly-clean-manager]'));
          if(host&&stray)host.replaceChildren(stray);
        });
      });
      pageObserver.observe(p,{childList:true});
    }
    if(manager())refreshMonthly(false);
  }

  function boot(){if(installed)return;installed=true;installRenderer();setTimeout(installRenderer,250)}
  if(document.readyState==='complete')setTimeout(boot,0);else window.addEventListener('load',boot,{once:true});
  console.info('SkillHub: stable Assignments controller scheduled');
})();
