/* SkillHub instant Assignments / monthly summary — 2026-10-15
   Goal: the Assignments hub and monthly assessment summary must paint immediately.
   Uses a small per-manager local cache, then refreshes it from Supabase in background.
   Does not change assessment composition, scoring, attempts, recipients or results.
*/
(function(){
  'use strict';
  if(window.__shInstantAssignments20261015)return;
  window.__shInstantAssignments20261015=true;

  const state=()=>{try{return typeof S!=='undefined'?S:window.S}catch(_){return window.S}};
  const manager=()=>['mentor','rs','tech_admin'].includes(String(state()?.profile?.role||''));
  const login=()=>String(state()?.profile?.login||'');
  const esc=v=>typeof window.esc==='function'?window.esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const js=v=>String(v??'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  const arr=v=>Array.isArray(v)?v:[];
  const key=()=>`sh_monthly_summary_v2_${login()}`;
  const fmt=v=>{if(!v)return'—';try{return new Date(v).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}catch(_){return String(v)}};
  let busy=null,lastFetch=0;

  function host(){return document.getElementById('shAssignmentMonthlyHost')}
  function currentMonthlyVisible(){const x=document.getElementById('shAsMonthly');return !!x&&!x.classList.contains('hidden')}

  function cardHtml(checks,runs){
    const rows=arr(checks).map(c=>{
      const rs=arr(runs).filter(x=>String(x.check_id)===String(c.id));
      const done=rs.filter(x=>x.status==='completed');
      const avg=done.length?Math.round(done.reduce((s,x)=>s+Number(x.score||0),0)/done.length):null;
      const total=arr(c.recipients).length;
      return `<div class="shmc-manager-row"><div><b>${esc(c.title||'Итоговая проверка знаний')}</b><small>${fmt(c.created_at)} · срок ${fmt(c.due_at)}</small><div class="shmc-tags"><span>${done.length}/${total} завершили</span><span>${avg===null?'Средний —':`Средний ${avg}%`}</span><span>Проходной ${Number(c.pass_score||75)}%</span></div></div><div class="shmc-row-actions"><button class="btn secondary" onclick="shMonthlyCleanResults('${js(c.id)}')">Результаты</button><button class="btn secondary" onclick="shMonthlyOpenAssign('${js(c.id)}')">Назначить ещё</button></div></div>`;
    }).join('');
    return `<section class="card shmc-manager" data-sh-monthly-assignment-clone="1" data-sh-monthly-instant="1"><div class="shmc-manager-head"><div><span class="shmc-kicker">ЕЖЕМЕСЯЧНАЯ АТТЕСТАЦИЯ</span><h2>Итоговая проверка знаний</h2><p>12 заданий · 30 минут · 1 попытка · проходной балл 75%</p></div><button class="btn primary" onclick="shMonthlyCreateAndAssign()">Назначить проверку</button></div>${rows?`<div class="shmc-manager-list">${rows}</div>`:'<div class="shmc-empty">Проверок ещё нет. Создайте первую итоговую проверку.</div>'}</section>`;
  }

  function paint(data){
    const h=host();if(!h||!data)return false;
    h.innerHTML=cardHtml(data.checks,data.runs);
    return true;
  }

  function cached(){
    if(!login())return null;
    try{
      const v=JSON.parse(localStorage.getItem(key())||'null');
      return v&&Array.isArray(v.checks)&&Array.isArray(v.runs)?v:null;
    }catch(_){return null}
  }

  function paintCached(){
    const c=cached();
    if(c)return paint(c);
    const h=host();
    if(h&&!h.querySelector('[data-sh-monthly-instant]'))h.innerHTML='<div class="sh-as-loading">Открываем итоговую проверку…</div>';
    return false;
  }

  async function refresh(force=false){
    const A=state();
    if(!manager()||!A?.sb||!login())return false;
    if(busy)return busy;
    if(!force&&Date.now()-lastFetch<15000)return true;
    lastFetch=Date.now();
    busy=(async()=>{
      try{
        const cq=await A.sb.from('monthly_checks').select('id,title,created_at,due_at,recipients,pass_score').order('created_at',{ascending:false}).limit(12);
        if(cq.error)throw cq.error;
        const checks=cq.data||[],ids=checks.map(x=>x.id),runs=[];
        if(ids.length){
          const rq=await A.sb.from('monthly_check_runs').select('check_id,status,score').in('check_id',ids);
          if(rq.error)throw rq.error;
          runs.push(...(rq.data||[]));
        }
        const data={at:Date.now(),checks,runs};
        try{localStorage.setItem(key(),JSON.stringify(data))}catch(_){}
        if(currentMonthlyVisible())paint(data);
        return true;
      }catch(e){
        lastFetch=0;
        console.warn('SkillHub instant monthly summary refresh skipped',e);
        return false;
      }
    })();
    try{return await busy}finally{busy=null}
  }

  function openFast(base,ctx,args){
    const mode=String(args?.[0]||'');
    const r=base.apply(ctx,args);
    if(mode==='monthly'){
      paintCached();
      refresh(false);
    }
    return r;
  }

  function wrapOpen(){
    const base=window.shAssignmentsOpen;
    if(typeof base!=='function'||base.__shInstantMonthly)return;
    const wrapped=function(){return openFast(base,this,arguments)};
    wrapped.__shInstantMonthly=true;
    window.shAssignmentsOpen=wrapped;
  }

  function wrapRenderAssignments(){
    let base=null;
    try{base=window.renderAssignments||renderAssignments}catch(_){base=window.renderAssignments}
    if(typeof base!=='function'||base.__shInstantMonthly)return;
    const wrapped=function(){
      const r=base.apply(this,arguments);
      queueMicrotask(()=>{
        wrapOpen();
        if(currentMonthlyVisible()){paintCached();refresh(false)}
      });
      return r;
    };
    wrapped.__shInstantMonthly=true;
    try{window.renderAssignments=wrapped;renderAssignments=wrapped}catch(_){window.renderAssignments=wrapped}
  }

  function prefetch(){
    if(!manager())return;
    refresh(false);
  }

  function install(){wrapOpen();wrapRenderAssignments();if(currentMonthlyVisible())paintCached()}
  install();
  setTimeout(install,0);
  setTimeout(()=>{install();prefetch()},300);
  setTimeout(()=>{install();prefetch()},1200);

  try{
    const baseEnter=window.enterApp;
    if(typeof baseEnter==='function'&&!baseEnter.__shInstantMonthly){
      const wrapped=function(){const r=baseEnter.apply(this,arguments);queueMicrotask(()=>{install();prefetch()});return r};
      wrapped.__shInstantMonthly=true;
      window.enterApp=wrapped;
      try{enterApp=wrapped}catch(_){}
    }
  }catch(_){}

  console.info('SkillHub: instant Assignments monthly summary enabled');
})();
