/* SkillHub final assessment feedback clarity — 2026-10-09
   Readable Hard feedback for managers + AI-generated final review for employees.
   Does not change scoring, attempts, ordinary trainers, or assessment answers.
*/
(function(){
  'use strict';
  if(window.__shMonthlyFeedbackFinalV2)return;
  window.__shMonthlyFeedbackFinalV2=true;

  const arr=x=>Array.isArray(x)?x:[];
  const app=()=>{try{return typeof S!=='undefined'?S:null}catch(_){return null}};
  const esc=v=>typeof window.esc==='function'?window.esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pct=n=>Math.round((Number(n)||0)*100);
  const cleanText=v=>String(v??'').replace(/✅\s*ПРАВИЛЬНЫЙ ОТВЕТ/gi,'').replace(/⚠️\s*ПОЧЕМУ ОСТАЛЬНЫЕ ВАРИАНТЫ СЛАБЕЕ/gi,'').replace(/📍\s*ГДЕ ПРОВЕРИТЬ/gi,'').trim();
  const canManage=()=>['mentor','rs','tech_admin'].includes(app()?.profile?.role);
  const isEmployee=()=>app()?.profile?.role==='employee';

  function catTitle(p,id){const c=arr(p?.categories).find(x=>String(x?.id)===String(id));return c?.title||id||'—'}
  function hardScoreLabel(item,a){
    const p=item?.snapshot?.payload||{},mode=p.mode;if(!a)return'Не выполнено';
    if(mode==='sort_cards'){const cards=arr(p.cards),pl=arr(a.placements);let ok=0;cards.forEach((c,i)=>{if(String(pl[i])===String(c?.category))ok++});return `${ok} из ${cards.length} карточек верно · ${cards.length?Math.round(ok/cards.length*100):0}%`}
    if(mode==='scenario')return Number(a.points)>=1?'Ответ верный':'Ответ неверный';
    if(mode==='tariff_calc'){const vals=arr(a.values),e1=Number(p.step1?.answer),e2=Number(p.step2?.answer),t1=Number(p.step1?.tolerance||0),t2=Number(p.step2?.tolerance||0);const ok1=Number.isFinite(Number(vals[0]))&&Number.isFinite(e1)&&Math.abs(Number(vals[0])-e1)<=t1,ok2=Number.isFinite(Number(vals[1]))&&Number.isFinite(e2)&&Math.abs(Number(vals[1])-e2)<=t2;return `${Number(ok1)+Number(ok2)} из 2 шагов верно`}
    return `${pct(a.points)}%`;
  }
  function hardDetails(item,a){
    const p=item?.snapshot?.payload||{},mode=p.mode;if(!a)return'';
    if(mode==='sort_cards'){
      const cards=arr(p.cards),pl=arr(a.placements),wrong=[];let ok=0;
      cards.forEach((c,i)=>{const chosen=pl[i],right=c?.category;if(String(chosen)===String(right))ok++;else wrong.push(`<div class="shfb-mistake"><b>${esc(c?.text||`Карточка ${i+1}`)}</b><small>Выбрано: ${esc(catTitle(p,chosen))}</small><small>Правильно: ${esc(catTitle(p,right))}</small></div>`)});
      return `<div class="shfb-hard-summary"><b>${ok} из ${cards.length} карточек распределены верно</b><span>${cards.length?Math.round(ok/cards.length*100):0}%</span></div>${wrong.length?`<details class="shfb-details"><summary>Ошибки в распределении · ${wrong.length}</summary><div class="shfb-mistakes">${wrong.join('')}</div></details>`:'<div class="shfb-ok">Все карточки распределены верно.</div>'}`;
    }
    if(mode==='scenario'){
      const opts=arr(p.options?.length?p.options:p.answers),sel=Number(a.selected),cor=Number(p.correct),same=sel===cor;
      return `<div class="shfb-answer ${same?'good':'bad'}"><b>${same?'Ответ верный':'Ответ неверный'}</b><span>Сотрудник: ${esc(opts[sel]??'—')}</span>${!same?`<span>Правильно: ${esc(opts[cor]??'—')}</span>`:''}</div>${p.explanation?`<details class="shfb-details"><summary>Пояснение</summary><p>${esc(cleanText(p.explanation))}</p></details>`:''}`;
    }
    if(mode==='tariff_calc'){
      const vals=arr(a.values),rows=[{name:p.step1?.prompt||'Шаг 1',got:vals[0],right:p.step1?.answer,unit:p.step1?.unit||'',exp:p.step1?.explanation||p.step1?.formula,tol:Number(p.step1?.tolerance||0)},{name:p.step2?.question||'Шаг 2',got:vals[1],right:p.step2?.answer,unit:p.step2?.unit||'',exp:p.step2?.explanation||p.step2?.formula,tol:Number(p.step2?.tolerance||0)}];
      return `<div class="shfb-calc">${rows.map(r=>{const good=Number.isFinite(Number(r.got))&&Number.isFinite(Number(r.right))&&Math.abs(Number(r.got)-Number(r.right))<=r.tol;return `<div class="${good?'good':'bad'}"><b>${esc(r.name)}</b><span>Ответ сотрудника: ${esc(r.got??'—')} ${esc(r.unit)}</span><span>Правильно: ${esc(r.right??'—')} ${esc(r.unit)}</span>${r.exp?`<small>${esc(cleanText(r.exp))}</small>`:''}</div>`}).join('')}</div>`;
    }
    return'';
  }
  function reviewBlocks(review){
    const r=review||{},blocks=[];
    if(r.summary)blocks.push(`<p class="shfb-summary">${esc(r.summary)}</p>`);
    if(arr(r.strengths).length)blocks.push(`<div class="shmc-review good"><b>Сильные стороны</b>${arr(r.strengths).map(x=>`<span>• ${esc(x)}</span>`).join('')}</div>`);
    if(arr(r.improvements).length)blocks.push(`<div class="shmc-review"><b>Что улучшить</b>${arr(r.improvements).map(x=>`<span>• ${esc(x)}</span>`).join('')}</div>`);
    if(arr(r.criticalErrors).length)blocks.push(`<div class="shmc-review bad"><b>Критические ошибки</b>${arr(r.criticalErrors).map(x=>`<span>• ${esc(x)}</span>`).join('')}</div>`);
    return blocks.join('');
  }

  window.shMonthlyCleanRunDetail=async function(checkId,runId){
    if(!canManage())return;const A=app();
    try{
      const [iq,rq]=await Promise.all([A.sb.from('monthly_check_items').select('*').eq('check_id',checkId).order('position',{ascending:true}),A.sb.from('monthly_check_runs').select('*').eq('id',runId).single()]);
      if(iq.error)throw iq.error;if(rq.error)throw rq.error;
      const run=rq.data,answers=run?.breakdown?.answers||{},items=iq.data||[];
      const parts=items.map((it,i)=>{const a=answers[it.id],review=a?.review||{},kind=it.kind,kindName=kind==='ai_dialogue'?'ИИ-диалог':kind==='manual'?'Свободный ответ':'Hard Skills',scoreText=kind==='hard'?hardScoreLabel(it,a):a?`${pct(a.points)}%`:'Не выполнено',body=kind==='hard'?hardDetails(it,a):reviewBlocks(review);return `<div class="shmc-detail-item shfb-item"><div class="shmc-detail-head"><span>${i+1}</span><div><b>${esc(it.snapshot?.title||kindName)}</b><small>${esc(kindName)} · ${esc(scoreText)}</small></div></div>${body}</div>`}).join('');
      if(typeof window.showModal!=='function')return;
      window.showModal(`<div class="shmc-results"><header><div><small>ДЕТАЛИ ПРОВЕРКИ</small><h2>${esc(run.login)}</h2><p>${run.status==='completed'?'Завершена':run.status==='in_progress'?'В процессе':'Не начата'}${run.score!==null&&run.score!==undefined?` · ${Math.round(Number(run.score))}%`:''}</p></div><button class="btn secondary" onclick="shMonthlyCleanResults('${String(checkId).replace(/'/g,"\\'")}')">← Назад</button></header><div class="shmc-detail-list">${parts}</div></div>`);
    }catch(e){console.error('SkillHub final assessment manager feedback',e);if(typeof window.toast==='function')window.toast(e?.message||'Не удалось открыть результат')}
  };

  function aiReviewHtml(r){
    if(!r)return'';
    return `<section class="shfb-employee"><div class="shfb-ai-title"><span>✨</span><div><small>ПЕРСОНАЛЬНЫЙ РАЗБОР</small><h3>Обратная связь от ИИ</h3></div></div>${r.summary?`<p class="shfb-ai-summary">${esc(r.summary)}</p>`:''}${arr(r.strengths).length?`<div class="shfb-ai-block good"><b>Что получилось</b>${arr(r.strengths).map(x=>`<span>• ${esc(x)}</span>`).join('')}</div>`:''}${arr(r.growth).length?`<div class="shfb-ai-block warn"><b>Что подтянуть</b>${arr(r.growth).map(x=>`<span>• ${esc(x)}</span>`).join('')}</div>`:''}${r.critical?`<div class="shfb-ai-block bad"><b>Критическая ошибка</b><span>${esc(r.critical)}</span></div>`:''}${arr(r.nextSteps).length?`<div class="shfb-ai-block"><b>Что делать дальше</b>${arr(r.nextSteps).map(x=>`<span>• ${esc(x)}</span>`).join('')}</div>`:''}</section>`;
  }
  async function mountEmployeeAi(checkId,root){
    if(!root||root.querySelector('.shfb-employee'))return;
    const A=app();if(!A?.sb)return;
    const holder=document.createElement('section');holder.className='shfb-employee shfb-loading';holder.innerHTML='<div class="shfb-ai-title"><span>✨</span><div><small>ПЕРСОНАЛЬНЫЙ РАЗБОР</small><h3>ИИ анализирует результат…</h3></div></div><p>Собираем сильные стороны и зоны роста по всей проверке.</p>';
    const btn=root.querySelector('button');if(btn)btn.before(holder);else root.appendChild(holder);
    try{
      const q=await A.sb.functions.invoke('monthly-assessment-summary-ai',{body:{checkId}});
      if(q.error)throw q.error;if(q.data?.error)throw new Error(q.data.error);
      const html=aiReviewHtml(q.data?.review);
      if(html)holder.outerHTML=html;else holder.remove();
    }catch(e){console.warn('SkillHub employee AI final review unavailable',e);holder.innerHTML='<div class="shfb-ai-title"><span>✨</span><div><small>ПЕРСОНАЛЬНЫЙ РАЗБОР</small><h3>ИИ-разбор временно недоступен</h3></div></div><p>Сам результат проверки сохранён. Разбор можно открыть позже.</p>'}
  }

  const baseStart=window.shMonthlyStart;
  if(typeof baseStart==='function'){
    window.shMonthlyStart=async function(checkId){
      const result=await baseStart.apply(this,arguments);
      if(!isEmployee())return result;
      const root=document.querySelector('#page-run .shmc-result');
      if(root)void mountEmployeeAi(checkId,root);
      return result;
    };
  }

  const st=document.createElement('style');st.id='shMonthlyFeedbackFinalStyle';st.textContent=`
    .shfb-item{display:grid;gap:10px}.shfb-hard-summary{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:10px 12px;border-radius:12px;background:var(--panel2);border:1px solid var(--line)}.shfb-hard-summary span{font-weight:950;color:var(--primary)}
    .shfb-details{border:1px solid var(--line);border-radius:12px;padding:10px 12px}.shfb-details summary{cursor:pointer;font-weight:850}.shfb-details p{white-space:pre-line;line-height:1.45;margin:10px 0 0}.shfb-mistakes{display:grid;gap:8px;margin-top:10px}.shfb-mistake{display:grid;gap:3px;padding:9px 10px;border-radius:10px;background:var(--panel2)}.shfb-mistake small{color:var(--muted)}.shfb-ok{padding:10px 12px;border-radius:10px;background:color-mix(in srgb,#34c759 10%,var(--panel));border:1px solid color-mix(in srgb,#34c759 35%,var(--line))}
    .shfb-answer,.shfb-calc>div{display:grid;gap:5px;padding:11px 12px;border:1px solid var(--line);border-radius:12px;background:var(--panel2)}.shfb-answer.good,.shfb-calc>div.good{border-color:color-mix(in srgb,#34c759 45%,var(--line))}.shfb-answer.bad,.shfb-calc>div.bad{border-color:color-mix(in srgb,#ff453a 50%,var(--line))}.shfb-answer span,.shfb-calc span,.shfb-calc small{color:var(--muted);line-height:1.4}.shfb-calc{display:grid;gap:8px}.shfb-summary{margin:0;line-height:1.45}
    .shfb-employee{margin:16px 0 18px;text-align:left;border:1px solid var(--line);border-radius:16px;padding:14px;background:var(--panel2)}.shfb-ai-title{display:flex;align-items:center;gap:10px}.shfb-ai-title>span{font-size:25px}.shfb-ai-title small{display:block;color:var(--primary);font-weight:950;letter-spacing:.08em;font-size:10px}.shfb-ai-title h3{margin:2px 0 0}.shfb-ai-summary{line-height:1.5;margin:12px 0}.shfb-ai-block{display:grid;gap:5px;padding:10px 11px;border:1px solid var(--line);border-radius:12px;background:var(--panel);margin-top:8px}.shfb-ai-block span{color:var(--muted);line-height:1.4}.shfb-ai-block.good{border-color:color-mix(in srgb,#34c759 38%,var(--line))}.shfb-ai-block.warn{border-color:color-mix(in srgb,#ffd60a 38%,var(--line))}.shfb-ai-block.bad{border-color:color-mix(in srgb,#ff453a 48%,var(--line))}.shfb-loading p{color:var(--muted);margin:10px 0 0}
  `;document.head.appendChild(st);
  console.info('SkillHub: final assessment clear manager feedback + employee AI review v2 enabled');
})();
