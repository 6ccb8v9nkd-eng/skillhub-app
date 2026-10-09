/* SkillHub monthly assessment builder — stable v9 */
(function(){
  'use strict';
  if(window.__shMonthlyBuilderV9)return;window.__shMonthlyBuilderV9=true;

  const isManager=()=>['mentor','rs','tech_admin'].includes(window.S?.profile?.role);
  const escv=v=>typeof window.esc==='function'?window.esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const js=v=>String(v??'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  const mk=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`};
  const lastDay=k=>{const [y,m]=String(k).split('-').map(Number);return `${y}-${String(m).padStart(2,'0')}-${String(new Date(y,m,0).getDate()).padStart(2,'0')}`};
  const dueIso=(date,time='23:59')=>new Date(`${date}T${time}:00+03:00`).toISOString();
  const defaults={format_version:'ai_v2',ai_dialogues:2,hard:8,manual:2,estimated_minutes:30,due_time_msk:'23:59'};
  let bank={hard:[],manual:[],loaded:false};

  async function employees(){
    const p=window.S?.profile;if(!p||!window.S?.sb)return[];
    let rows=(window.S?.allowed||[]).filter(x=>x.active&&x.role==='employee');
    if(!rows.length){
      const q=await window.S.sb.from('allowed_logins').select('login,name,role,active,manager_login,sector_name').eq('active',true).eq('role','employee');
      if(q.error)throw q.error;rows=q.data||[];
    }
    if(p.role==='mentor')rows=rows.filter(x=>x.manager_login===p.login);
    if(p.role==='rs')rows=rows.filter(x=>x.sector_name===p.sector_name);
    return rows.sort((a,b)=>String(a.name||a.login).localeCompare(String(b.name||b.login),'ru'));
  }

  async function loadBank(force=false){
    if(bank.loaded&&!force)return bank;
    const [hq,mq]=await Promise.all([
      window.S.sb.from('content').select('id,type,section,topic,difficulty,title,payload').eq('status','published').eq('type','hardcase').eq('section','hard'),
      window.S.sb.from('content').select('id,type,section,topic,difficulty,title,payload').eq('status','published').eq('type','manual').eq('section','soft')
    ]);
    if(hq.error)throw hq.error;if(mq.error)throw mq.error;
    bank.hard=(hq.data||[]).sort((a,b)=>String(a.topic||'').localeCompare(String(b.topic||''),'ru')||String(a.title||'').localeCompare(String(b.title||''),'ru'));
    bank.manual=(mq.data||[]).sort((a,b)=>String(a.topic||'').localeCompare(String(b.topic||''),'ru')||String(a.title||'').localeCompare(String(b.title||'') ,'ru'));
    if(!bank.hard.length)throw new Error('В базе нет опубликованных Hard-заданий');
    if(!bank.manual.length)throw new Error('В базе нет опубликованных свободных ответов');
    bank.loaded=true;return bank;
  }

  async function currentActive(){
    const login=window.S?.profile?.login;if(!login)return null;
    const q=await window.S.sb.from('monthly_checks').select('*').eq('created_by_login',login).eq('month_key',mk()).order('created_at',{ascending:false});
    if(q.error)throw q.error;
    return (q.data||[]).find(x=>x.status==='draft'||(x.status==='assigned'&&Array.isArray(x.recipients)&&x.recipients.length>0))||null;
  }
  async function loadCheck(id){
    const [cq,rq,iq]=await Promise.all([
      window.S.sb.from('monthly_checks').select('*').eq('id',id).single(),
      window.S.sb.from('monthly_check_runs').select('*').eq('check_id',id),
      window.S.sb.from('monthly_check_items').select('*').eq('check_id',id).order('position',{ascending:true})
    ]);
    if(cq.error)throw cq.error;if(rq.error)throw rq.error;if(iq.error)throw iq.error;
    return {check:cq.data,runs:rq.data||[],items:iq.data||[]};
  }
  const cfg=c=>Object.assign({},defaults,c?.config||{});
  const assigned=c=>(Array.isArray(c?.recipients)?c.recipients:[]).filter(x=>x&&x!=='ALL');

  function spreadPick(rows,n){
    const groups=new Map();for(const x of rows){const k=x.topic||'Другое';if(!groups.has(k))groups.set(k,[]);groups.get(k).push(x)}
    const out=[];let i=0,all=[...groups.values()];while(out.length<n&&all.some(g=>g[i])){for(const g of all){if(g[i]&&out.length<n)out.push(g[i])}i++}return out.map(x=>x.id);
  }
  function taskRows(rows,kind,sel){return rows.map(x=>`<label class="sh9-row"><input type="checkbox" data-sh9-${kind} value="${escv(x.id)}" ${sel.has(x.id)?'checked':''}><span><b>${escv(x.title||'Без названия')}</b><small>${escv(x.topic||'Без темы')}${x.difficulty?` · ${escv(x.difficulty)}`:''}</small></span></label>`).join('')}
  function peopleRows(rows){return rows.map(u=>`<label class="sh9-row"><input type="checkbox" data-sh9-person value="${escv(u.login)}"><span><b>${escv(u.name||u.login)}</b><small>${escv(u.login)}</small></span></label>`).join('')}

  function composer(check,emps){
    const c=cfg(check),hs=new Set(spreadPick(bank.hard,Math.min(Number(c.hard||8),bank.hard.length))),ms=new Set(bank.manual.slice(0,Math.min(Number(c.manual||2),bank.manual.length)).map(x=>x.id));
    return `<div class="sh9"><div class="sh9-head"><div><span>ИТОГОВАЯ ПРОВЕРКА</span><h2>Собрать и назначить</h2><p>ИИ-диалог + Hard Skills + свободный ответ с проверкой ИИ</p></div><button class="btn secondary" onclick="closeModal()">✕</button></div>
      <section><div class="sh9-title"><div><b>🤖 ИИ-диалог</b><small>Живой диалог с клиентом. Итог проверяет ИИ.</small></div><input id="sh9Ai" type="number" min="1" max="5" value="${Number(c.ai_dialogues||2)}"></div></section>
      <section><div class="sh9-title"><div><b>🧠 Hard Skills</b><small>Только задачи, карточки, расчёты, распределения и кейсы. Без Hard-диалогов.</small></div><strong id="sh9HardN">${hs.size}</strong></div><details open><summary>Выбрать Hard-задания</summary><div class="sh9-list">${taskRows(bank.hard,'hard',hs)}</div></details></section>
      <section><div class="sh9-title"><div><b>✍️ Свободный ответ</b><small>Сотрудник пишет ответ самостоятельно, проверяет ИИ.</small></div><strong id="sh9ManualN">${ms.size}</strong></div><details><summary>Выбрать задания</summary><div class="sh9-list">${taskRows(bank.manual,'manual',ms)}</div></details></section>
      <section><div class="sh9-title"><div><b>👥 Кому назначить</b><small>${emps.length} сотрудников в доступной команде</small></div></div><div class="sh9-scope"><label><input type="radio" name="sh9Scope" value="all" checked onchange="sh9TogglePeople()"><span><b>Всей группе</b><small>Назначить всем доступным сотрудникам</small></span></label><label><input type="radio" name="sh9Scope" value="custom" onchange="sh9TogglePeople()"><span><b>Выбрать сотрудников</b><small>Назначить точечно</small></span></label></div><div id="sh9People" class="sh9-list hidden">${peopleRows(emps)}</div></section>
      <section><div class="sh9-deadline"><label>Пройти до<input id="sh9Due" type="date" value="${escv(check.due_date||lastDay(check.month_key||mk()))}"></label><label>Время · МСК<input id="sh9Time" type="time" value="${escv(c.due_time_msk||'23:59')}"></label></div></section>
      <div class="sh9-foot"><span id="sh9Summary"></span><button class="btn primary" onclick="sh9Assign('${js(check.id)}')">Назначить проверку</button></div></div>`;
  }

  function locked(check,items,emps){
    const have=new Set(assigned(check)),left=emps.filter(x=>!have.has(x.login)),a=items.filter(x=>x.kind==='ai_dialogue').length,h=items.filter(x=>x.kind==='hard').length,m=items.filter(x=>x.kind==='manual').length;
    return `<div class="sh9"><div class="sh9-head"><div><span>ИТОГОВАЯ ПРОВЕРКА</span><h2>Назначить ещё</h2><p>Состав зафиксирован: ${h} Hard · ${a} ИИ · ${m} свободных ответа</p></div><button class="btn secondary" onclick="closeModal()">✕</button></div><div class="sh9-note">Оставшимся сотрудникам назначится та же версия проверки. Уже проходящим ничего не сбросится.</div><section><div class="sh9-scope"><label><input type="radio" name="sh9Scope" value="all" checked onchange="sh9TogglePeople()"><span><b>Всем оставшимся</b><small>${left.length} сотрудников</small></span></label><label><input type="radio" name="sh9Scope" value="custom" onchange="sh9TogglePeople()"><span><b>Выбрать сотрудников</b><small>Назначить точечно</small></span></label></div><div id="sh9People" class="sh9-list hidden">${peopleRows(left)||'<div class="muted">Все сотрудники уже назначены.</div>'}</div></section><section><div class="sh9-deadline"><label>Пройти до<input id="sh9Due" type="date" value="${escv(check.due_date||lastDay(check.month_key||mk()))}"></label><label>Время · МСК<input id="sh9Time" type="time" value="${escv(cfg(check).due_time_msk||'23:59')}"></label></div></section><div class="sh9-foot"><span></span><button class="btn primary" onclick="sh9Assign('${js(check.id)}')">Добавить сотрудников</button></div></div>`;
  }

  function counts(){const h=document.querySelectorAll('#modalCard [data-sh9-hard]:checked').length,m=document.querySelectorAll('#modalCard [data-sh9-manual]:checked').length,a=Number(document.getElementById('sh9Ai')?.value||0);const hn=document.getElementById('sh9HardN'),mn=document.getElementById('sh9ManualN'),s=document.getElementById('sh9Summary');if(hn)hn.textContent=h;if(mn)mn.textContent=m;if(s)s.textContent=`Итого: ${h+a+m} · Hard ${h} · ИИ ${a} · свободный ответ ${m}`}
  window.sh9TogglePeople=function(){document.getElementById('sh9People')?.classList.toggle('hidden',document.querySelector('input[name="sh9Scope"]:checked')?.value!=='custom')};
  document.addEventListener('change',e=>{if(e.target?.matches?.('[data-sh9-hard],[data-sh9-manual],#sh9Ai'))counts()},true);

  async function openAssign(id){
    if(!isManager()||!window.S?.sb)return;
    try{await loadBank();const [{check,items},emps]=await Promise.all([loadCheck(id),employees()]);window.showModal(items.length?locked(check,items,emps):composer(check,emps));setTimeout(counts,0)}catch(err){console.error('monthly v9 open',err);window.toast?.(err?.message||'Не удалось открыть конструктор проверки')}
  }
  async function createAndAssign(){
    if(!isManager()||!window.S?.sb)return;
    try{let c=await currentActive();if(!c){const month=mk(),due=lastDay(month),time='23:59';const q=await window.S.sb.from('monthly_checks').insert({month_key:month,title:'Итоговая проверка за месяц',status:'draft',due_date:due,due_at:dueIso(due,time),pass_score:75,attempts_allowed:1,recipients:[],config:{...defaults},created_by:window.S.user?.id||null,created_by_login:window.S.profile?.login}).select('*').single();if(q.error)throw q.error;c=q.data}await openAssign(c.id)}catch(err){console.error('monthly v9 create',err);window.toast?.(err?.message||'Не удалось подготовить проверку')}
  }
  function hardSnap(x){return {title:x.title,topic:x.topic,payload:{...(x.payload||{}),section:'hard',exam_mode:true,source_type:'hardcase',hide_feedback:true}}}
  function manualSnap(x){const p=x.payload||{},ref=Array.isArray(p.answers)&&Number.isInteger(p.correct)?p.answers[p.correct]||'':'';return {title:x.title,topic:x.topic,payload:{question:p.question||x.title,instruction:'Напишите ответ самостоятельно так, как ответили бы клиенту в рабочем чате.',reference_answer:ref,source_explanation:p.explanation||'',section:'soft',exam_mode:true,source_type:'manual',hide_feedback:true,ai_review:true}}}
  function aiSnap(i){return {title:`ИИ-диалог ${i+1}`,topic:'Работа с негативом',payload:{mode:'ai_dialogue',section:'soft',exam_mode:true,source_type:'soft_ai',hide_feedback:true,min_turns:4,max_turns:6,ai_client:true,ai_review:true}}}
  async function makeItems(id){
    const hi=[...document.querySelectorAll('#modalCard [data-sh9-hard]:checked')].map(x=>x.value),mi=[...document.querySelectorAll('#modalCard [data-sh9-manual]:checked')].map(x=>x.value),ai=Math.max(1,Math.min(5,Number(document.getElementById('sh9Ai')?.value||2)));
    if(!hi.length||!mi.length)throw new Error('Выберите хотя бы одно Hard-задание и один свободный ответ');
    const hr=hi.map(id=>bank.hard.find(x=>x.id===id)).filter(Boolean),mr=mi.map(id=>bank.manual.find(x=>x.id===id)).filter(Boolean),rows=[];let p=1;
    hr.forEach(x=>rows.push({check_id:id,position:p++,kind:'hard',source_content_id:x.id,snapshot:hardSnap(x),max_score:1}));for(let i=0;i<ai;i++)rows.push({check_id:id,position:p++,kind:'ai_dialogue',source_content_id:null,snapshot:aiSnap(i),max_score:1});mr.forEach(x=>rows.push({check_id:id,position:p++,kind:'manual',source_content_id:x.id,snapshot:manualSnap(x),max_score:1}));
    const d=await window.S.sb.from('monthly_check_items').delete().eq('check_id',id);if(d.error)throw d.error;const q=await window.S.sb.from('monthly_check_items').insert(rows);if(q.error)throw q.error;return rows.length;
  }
  async function assignNow(id){
    try{
      const st=await loadCheck(id),emps=await employees(),have=new Set(assigned(st.check)),custom=document.querySelector('input[name="sh9Scope"]:checked')?.value==='custom';let chosen=custom?[...document.querySelectorAll('#modalCard [data-sh9-person]:checked')].map(x=>x.value):emps.map(x=>x.login);chosen=[...new Set(chosen.map(x=>String(x).trim().toLowerCase()).filter(Boolean))];const add=chosen.filter(x=>!have.has(x));if(!add.length){window.toast?.('Выберите сотрудников, которым проверка ещё не назначена');return}
      let total=st.items.length;if(!total)total=await makeItems(id);
      const kinds=(await window.S.sb.from('monthly_check_items').select('kind').eq('check_id',id));if(kinds.error)throw kinds.error;const kk=kinds.data||[],due=document.getElementById('sh9Due')?.value||st.check.due_date||lastDay(st.check.month_key),time=document.getElementById('sh9Time')?.value||cfg(st.check).due_time_msk||'23:59',merged=[...new Set([...have,...add])],newCfg={...cfg(st.check),format_version:'ai_v2',hard:kk.filter(x=>x.kind==='hard').length,ai_dialogues:kk.filter(x=>x.kind==='ai_dialogue').length,manual:kk.filter(x=>x.kind==='manual').length,practice:0,dialogues:0,due_time_msk:time};
      const u=await window.S.sb.from('monthly_checks').update({status:'assigned',recipients:merged,due_date:due,due_at:dueIso(due,time),config:newCfg,updated_at:new Date().toISOString()}).eq('id',id);if(u.error)throw u.error;
      const by=new Map(st.runs.map(r=>[r.login,r])),fresh=add.filter(x=>!by.has(x)).map(login=>({check_id:id,login,status:'not_started',progress:0,breakdown:{}}));if(fresh.length){const q=await window.S.sb.from('monthly_check_runs').insert(fresh);if(q.error)throw q.error}
      for(const login of add){const r=by.get(login);if(!r?.breakdown?.revoked_at)continue;const b={...(r.breakdown||{})};delete b.revoked_at;delete b.revoked_by;delete b.revoked_progress;delete b.revoked_status;const q=await window.S.sb.from('monthly_check_runs').update({status:'not_started',progress:0,breakdown:b,updated_at:new Date().toISOString()}).eq('id',r.id);if(q.error)throw q.error}
      const pretty=new Date(`${due}T12:00:00+03:00`).toLocaleDateString('ru-RU',{timeZone:'Europe/Moscow'}),notes=add.map(login=>({login,title:'Итоговая проверка за месяц',body:`Пройти до ${pretty}, ${time} МСК`,kind:'assignment'}));if(notes.length){const n=await window.S.sb.from('notifications').insert(notes);if(n.error)console.warn(n.error)}
      try{sessionStorage.setItem('sh_after_monthly_action_page','assignments')}catch(e){}window.closeModal?.();window.toast?.(`Назначено: ${add.length} · заданий ${total}`);setTimeout(()=>location.reload(),250);
    }catch(err){console.error('monthly v9 assign',err);window.toast?.(err?.message||'Не удалось назначить проверку')}
  }

  const refs={openAssign,createAndAssign,assignNow};
  function bind(){window.shMonthlyOpenAssign=refs.openAssign;window.shMonthlyCreateAndAssign=refs.createAndAssign;window.shMonthlyCreateDraft=refs.createAndAssign;window.sh9Assign=refs.assignNow;window.shAssessAssign=refs.assignNow;window.shMonthlyAssign=refs.assignNow}
  bind();
  document.addEventListener('click',e=>{const o=e.target?.closest?.('button')?.getAttribute?.('onclick')||'';if(/shMonthly(OpenAssign|CreateDraft|CreateAndAssign)|shAssessAssign|shMonthlyAssign/.test(o))bind()},true);
  let re=0;const rt=setInterval(()=>{bind();if(++re>120)clearInterval(rt)},250);

  const style=document.createElement('style');style.id='shMonthlyBuilderV9Style';style.textContent=`
  #modalCard:has(.sh9){width:min(760px,calc(100vw - 12px))!important;max-width:min(760px,calc(100vw - 12px))!important;min-width:0!important;overflow-x:hidden!important;padding:14px!important}.sh9,.sh9 *{box-sizing:border-box}.sh9{display:grid;gap:12px;width:100%;min-width:0}.sh9-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.sh9-head span{font-size:12px;font-weight:900;color:var(--primary);letter-spacing:.08em}.sh9-head h2{margin:4px 0}.sh9-head p{margin:0;color:var(--muted)}.sh9 section{border:1px solid var(--line);border-radius:16px;padding:14px;background:var(--panel);min-width:0;overflow:hidden}.sh9-title{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;min-width:0}.sh9-title>div{display:grid;gap:4px;min-width:0}.sh9-title b,.sh9-title small{display:block;position:static!important;transform:none!important;left:auto!important;right:auto!important;text-align:left!important}.sh9-title small{color:var(--muted);line-height:1.35}.sh9-title input{width:72px;flex:0 0 72px}.sh9-title strong{color:var(--primary)}.sh9 details{margin-top:10px}.sh9 summary{cursor:pointer;font-weight:800;color:var(--primary)}.sh9-list{display:grid;gap:7px;margin-top:9px;max-height:300px;overflow-y:auto;overflow-x:hidden;min-width:0}.sh9-list.hidden{display:none!important}.sh9-row,.sh9-scope label{position:static!important;inset:auto!important;transform:none!important;float:none!important;display:grid!important;grid-template-columns:24px minmax(0,1fr)!important;gap:10px!important;align-items:center!important;width:100%!important;max-width:100%!important;min-width:0!important;margin:0!important;padding:11px!important;border:1px solid var(--line);border-radius:12px;text-align:left!important;overflow:hidden!important}.sh9-row>input,.sh9-scope label>input{position:static!important;inset:auto!important;transform:none!important;float:none!important;width:20px!important;height:20px!important;min-width:20px!important;max-width:20px!important;margin:0!important;padding:0!important}.sh9-row>span,.sh9-scope label>span,.sh9-row b,.sh9-row small,.sh9-scope b,.sh9-scope small{position:static!important;inset:auto!important;transform:none!important;float:none!important;display:block!important;width:auto!important;max-width:100%!important;min-width:0!important;margin:0!important;padding:0!important;text-align:left!important;text-indent:0!important;white-space:normal!important;overflow-wrap:anywhere!important}.sh9-row small,.sh9-scope small{color:var(--muted);margin-top:3px!important}.sh9-scope{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;min-width:0}.sh9-deadline{display:grid;grid-template-columns:1fr 1fr;gap:10px}.sh9-deadline label{display:grid;gap:6px;color:var(--muted)}.sh9-deadline input{width:100%}.sh9-foot{display:flex;justify-content:space-between;align-items:center;gap:12px}.sh9-foot span{color:var(--muted)}.sh9-note{padding:12px 14px;border-radius:12px;border:1px solid var(--line)}
  @media(max-width:620px){#modalCard:has(.sh9){width:calc(100vw - 8px)!important;max-width:calc(100vw - 8px)!important;margin:4px!important;padding:12px!important;border-radius:20px 20px 0 0!important}.sh9-scope,.sh9-deadline{grid-template-columns:minmax(0,1fr)!important}.sh9-foot{display:grid}.sh9-foot .btn{width:100%}.sh9-list{max-height:260px}.sh9 section{padding:12px}.sh9-head h2{font-size:24px}}
  `;document.head.appendChild(style);
  console.info('SkillHub: monthly builder v9 enabled');
})();