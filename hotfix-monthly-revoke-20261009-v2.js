/* SkillHub monthly check revoke controls v2 — 2026-10-09 */
(function(){
  'use strict';
  const esc2=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const manager=()=>['mentor','rs','tech_admin'].includes(S?.profile?.role);
  const personName=login=>(S.allowed||[]).find(x=>x.login===login)?.name||login;

  async function loadCheck(id){
    const [cq,rq]=await Promise.all([
      S.sb.from('monthly_checks').select('*').eq('id',id).single(),
      S.sb.from('monthly_check_runs').select('*').eq('check_id',id).order('created_at',{ascending:true})
    ]);
    if(cq.error)throw cq.error;if(rq.error)throw rq.error;
    return {check:cq.data,runs:rq.data||[]};
  }
  function activeRecipients(check){
    const src=Array.isArray(check?.recipients)?check.recipients:[];
    if(src.includes('ALL'))return (S.allowed||[]).filter(x=>x.active&&x.role==='employee').map(x=>x.login);
    return src.filter(Boolean);
  }
  async function markRevoked(run){
    if(!run?.id)return;
    const breakdown={...(run.breakdown||{}),revoked_at:new Date().toISOString(),revoked_by:S.profile?.login||'',revoked_progress:Number(run.progress||0),revoked_status:run.status||'not_started'};
    const {error}=await S.sb.from('monthly_check_runs').update({breakdown,updated_at:new Date().toISOString()}).eq('id',run.id);
    if(error)throw error;
  }
  async function revoke(checkId,logins){
    const unique=[...new Set((logins||[]).filter(Boolean))];if(!unique.length)return;
    const {check,runs}=await loadCheck(checkId),remove=new Set(unique),current=activeRecipients(check),next=current.filter(x=>!remove.has(x));
    const {error}=await S.sb.from('monthly_checks').update({recipients:next,updated_at:new Date().toISOString()}).eq('id',checkId);
    if(error)throw error;
    for(const r of runs.filter(x=>remove.has(x.login)))await markRevoked(r);
  }
  function row(login,run,checkId){
    const revoked=!!run?.breakdown?.revoked_at;
    const status=revoked?'Отозвана':run?.status==='completed'?'Завершена':run?.status==='review'?'На проверке':run?.status==='in_progress'?'В процессе':'Не начата';
    return `<div class="sh-revoke-row"><div><b>${esc2(personName(login))}</b><small>${esc2(login)}${run?` · прогресс ${Number(run.progress||0)}%`:''}</small></div><span class="pill ${revoked?'good':'warn'}">${status}</span>${revoked?'':`<button type="button" class="btn secondary sh-revoke-action" data-sh-revoke-one="1" data-check-id="${esc2(checkId)}" data-login="${esc2(login)}">Отозвать</button>`}</div>`;
  }
  window.shMonthlyOpenRevoke=async function(checkId){
    if(!manager())return;
    try{
      const {check,runs}=await loadCheck(checkId),recipients=activeRecipients(check),runMap=new Map(runs.map(r=>[r.login,r]));
      const active=recipients.filter(x=>!runMap.get(x)?.breakdown?.revoked_at);
      showModal(`<div class="modal-head"><div><span class="sh-month-kicker">Итоговая проверка</span><h2>Отозвать назначение</h2><div class="meta">Ответы и прогресс сохранятся в истории.</div></div><button class="btn secondary" onclick="closeModal()">✕</button></div><div class="sh-revoke-list">${recipients.length?recipients.map(login=>row(login,runMap.get(login),checkId)).join(''):'<div class="muted">Активных назначений нет.</div>'}</div>${active.length?`<div class="actions" style="justify-content:flex-end;margin-top:16px"><button type="button" class="btn danger sh-revoke-action" data-sh-revoke-all="1" data-check-id="${esc2(checkId)}">Отозвать у всех (${active.length})</button></div>`:''}`);
    }catch(e){toast(e?.message||'Не удалось открыть отзыв назначения')}
  };
  async function revokeOne(checkId,login){
    if(!window.confirm(`Отозвать итоговую проверку у ${personName(login)}? Ответы и прогресс сохранятся в истории.`))return;
    try{await revoke(checkId,[login]);closeModal();toast('Проверка отозвана');setTimeout(()=>location.reload(),300)}catch(e){toast(e?.message||'Не удалось отозвать проверку')}
  }
  async function revokeAll(checkId){
    try{const {check}=await loadCheck(checkId),recipients=activeRecipients(check);if(!recipients.length){toast('Активных назначений нет');return}if(!window.confirm(`Отозвать итоговую проверку у всех (${recipients.length})? Ответы и прогресс сохранятся в истории.`))return;await revoke(checkId,recipients);closeModal();toast('Проверка отозвана у всех');setTimeout(()=>location.reload(),300)}catch(e){toast(e?.message||'Не удалось отозвать проверку')}
  }
  window.shMonthlyRevokeOne=revokeOne;window.shMonthlyRevokeAll=revokeAll;

  function decorateCards(){
    if(!manager())return;
    document.querySelectorAll('[data-sh-monthly-manager]').forEach(card=>{
      const open=[...card.querySelectorAll('button')].find(b=>/shMonthlyOpenManager\('([^']+)'\)/.test(b.getAttribute('onclick')||''));
      if(!open)return;const m=(open.getAttribute('onclick')||'').match(/shMonthlyOpenManager\('([^']+)'\)/);if(!m)return;
      let b=card.querySelector('[data-sh-monthly-revoke]');
      if(!b){b=document.createElement('button');b.type='button';b.className='btn danger sh-monthly-revoke-active';b.dataset.shMonthlyRevoke='1';b.textContent='Отозвать';open.insertAdjacentElement('beforebegin',b)}
      b.dataset.checkId=m[1];b.disabled=false;b.removeAttribute('disabled');b.setAttribute('aria-disabled','false');
    });
  }
  document.addEventListener('click',ev=>{
    const target=ev.target instanceof Element?ev.target.closest('[data-sh-monthly-revoke],[data-sh-revoke-one],[data-sh-revoke-all]'):null;if(!target)return;
    ev.preventDefault();ev.stopPropagation();
    const id=target.getAttribute('data-check-id')||target.dataset.checkId||'';
    if(target.hasAttribute('data-sh-monthly-revoke'))return window.shMonthlyOpenRevoke(id);
    if(target.hasAttribute('data-sh-revoke-one'))return revokeOne(id,target.getAttribute('data-login')||'');
    if(target.hasAttribute('data-sh-revoke-all'))return revokeAll(id);
  },true);
  let t;new MutationObserver(()=>{clearTimeout(t);t=setTimeout(decorateCards,80)}).observe(document.documentElement,{childList:true,subtree:true});
  setInterval(decorateCards,1500);decorateCards();
  const s=document.createElement('style');s.id='shMonthlyRevokeV2Style';s.textContent=`[data-sh-monthly-revoke],.sh-revoke-action{pointer-events:auto!important;opacity:1!important;cursor:pointer!important;touch-action:manipulation}.sh-revoke-list{display:grid;gap:10px;margin-top:12px}.sh-revoke-row{display:grid;grid-template-columns:1fr auto auto;gap:10px;align-items:center;padding:12px;border:1px solid var(--line);border-radius:14px}.sh-revoke-row>div{display:grid;gap:3px}.sh-revoke-row small{color:var(--muted)}@media(max-width:620px){.sh-revoke-row{grid-template-columns:1fr auto}.sh-revoke-row .btn{grid-column:1/-1;width:100%}}`;document.head.appendChild(s);
  console.info('SkillHub: monthly revoke controls v2 enabled');
})();
