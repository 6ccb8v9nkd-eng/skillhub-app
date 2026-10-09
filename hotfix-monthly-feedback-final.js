/* SkillHub final assessment feedback clarity — 2026-10-09
   Adds readable Hard feedback for managers and a short post-result review for employees.
   Does not change scoring, attempts, ordinary trainers, or assessment answers.
*/
(function(){
  'use strict';
  if(window.__shMonthlyFeedbackFinalV1)return;
  window.__shMonthlyFeedbackFinalV1=true;

  const arr=x=>Array.isArray(x)?x:[];
  const app=()=>{try{return typeof S!=='undefined'?S:null}catch(_){return null}};
  const esc=v=>typeof window.esc==='function'?window.esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pct=n=>Math.round((Number(n)||0)*100);
  const cleanText=v=>String(v??'').replace(/✅\s*ПРАВИЛЬНЫЙ ОТВЕТ/gi,'').replace(/⚠️\s*ПОЧЕМУ ОСТАЛЬНЫЕ ВАРИАНТЫ СЛАБЕЕ/gi,'').replace(/📍\s*ГДЕ ПРОВЕРИТЬ/gi,'').trim();
  const canManage=()=>['mentor','rs','tech_admin'].includes(app()?.profile?.role);
  const isEmployee=()=>app()?.profile?.role==='employee';

  function catTitle(p,id){
    const c=arr(p?.categories).find(x=>String(x?.id)===String(id));
    return c?.title||id||'—';
  }
  function hardScoreLabel(item,a){
    const p=item?.snapshot?.payload||{},mode=p.mode;
    if(!a)return 'Не выполнено';
    if(mode==='sort_cards'){
      const cards=arr(p.cards),pl=arr(a.placements);let ok=0;
      cards.forEach((c,i)=>{if(String(pl[i])===String(c?.category))ok++});
      return `${ok} из ${cards.length} карточек верно · ${cards.length?Math.round(ok/cards.length*100):0}%`;
    }
    if(mode==='scenario')return Number(a.points)>=1?'Ответ верный':'Ответ неверный';
    if(mode==='tariff_calc'){
      const vals=arr(a.values),e1=Number(p.step1?.answer),e2=Number(p.step2?.answer),t1=Number(p.step1?.tolerance||0),t2=Number(p.step2?.tolerance||0);
      const ok1=Number.isFinite(Number(vals[0]))&&Number.isFinite(e1)&&Math.abs(Number(vals[0])-e1)<=t1;
      const ok2=Number.isFinite(Number(vals[1]))&&Number.isFinite(e2)&&Math.abs(Number(vals[1])-e2)<=t2;
      return `${Number(ok1)+Number(ok2)} из 2 шагов верно`;
    }
    return `${pct(a.points)}%`;
  }
  function hardDetails(item,a){
    const p=item?.snapshot?.payload||{},mode=p.mode;if(!a)return '';
    if(mode==='sort_cards'){
      const cards=arr(p.cards),pl=arr(a.placements),wrong=[];let ok=0;
      cards.forEach((c,i)=>{
        const chosen=pl[i],right=c?.category;
        if(String(chosen)===String(right))ok++;
        else wrong.push(`<div class="shfb-mistake"><b>${esc(c?.text||`Карточка ${i+1}`)}</b><small>Выбрано: ${esc(catTitle(p,chosen))}</small><small>Правильно: ${esc(catTitle(p,right))}</small></div>`);
      });
      return `<div class="shfb-hard-summary"><b>${ok} из ${cards.length} карточек распределены верно</b><span>${cards.length?Math.round(ok/cards.length*100):0}%</span></div>${wrong.length?`<details class="shfb-details"><summary>Ошибки в распределении · ${wrong.length}</summary><div class="shfb-mistakes">${wrong.join('')}</div></details>`:'<div class="shfb-ok">Все карточки распределены верно.</div>'}`;
    }
    if(mode==='scenario'){
      const opts=arr(p.options?.length?p.options:p.answers),sel=Number(a.selected),cor=Number(p.correct),same=sel===cor;
      return `<div class="shfb-answer ${same?'good':'bad'}"><b>${same?'Ответ верный':'Ответ неверный'}</b><span>Сотрудник: ${esc(opts[sel]??'—')}</span>${!same?`<span>Правильно: ${esc(opts[cor]??'—')}</span>`:''}</div>${p.explanation?`<details class="shfb-details"><summary>Пояснение</summary><p>${esc(cleanText(p.explanation))}</p></details>`:''}`;
    }
    if(mode==='tariff_calc'){
      const vals=arr(a.values),rows=[
        {name:p.step1?.prompt||'Шаг 1',got:vals[0],right:p.step1?.answer,unit:p.step1?.unit||'',exp:p.step1?.explanation||p.step1?.formula},
        {name:p.step2?.question||'Шаг 2',got:vals[1],right:p.step2?.answer,unit:p.step2?.unit||'',exp:p.step2?.explanation||p.step2?.formula}
      ];
      return `<div class="shfb-calc">${rows.map((r,i)=>{const tol=Number(i?p.step2?.tolerance:p.step1?.tolerance||0),good=Number.isFinite(Number(r.got))&&Number.isFinite(Number(r.right))&&Math.abs(Number(r.got)-Number(r.right))<=tol;return `<div class="${good?'good':'bad'}"><b>${esc(r.name)}</b><span>Ответ сотрудника: ${esc(r.got??'—')} ${esc(r.unit)}</span><span>Правильно: ${esc(r.right??'—')} ${esc(r.unit)}</span>${r.exp?`<small>${esc(cleanText(r.exp))}</small>`:''}</div>`}).join('')}</div>`;
    }
    return '';
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
    if(!canManage())return;
    const A=app();
    try{
      const [cq,iq,rq]=await Promise.all([
        A.sb.from('monthly_checks').select('*').eq('id',checkId).single(),
        A.sb.from('monthly_check_items').select('*').eq('check_id',checkId).order('position',{ascending:true}),
        A.sb.from('monthly_check_runs').select('*').eq('id',runId).single()
      ]);
      if(cq.error)throw cq.error;if(iq.error)throw iq.error;if(rq.error)throw rq.error;
      const run=rq.data,answers=run?.breakdown?.answers||{},items=iq.data||[];
      const parts=items.map((it,i)=>{
        const a=answers[it.id],review=a?.review||{},kind=it.kind;
        const kindName=kind==='ai_dialogue'?'ИИ-диалог':kind==='manual'?'Свободный ответ':'Hard Skills';
        const scoreText=kind==='hard'?hardScoreLabel(it,a):a?`${pct(a.points)}%`:'Не выполнено';
        const body=kind==='hard'?hardDetails(it,a):reviewBlocks(review);
        return `<div class="shmc-detail-item shfb-item"><div class="shmc-detail-head"><span>${i+1}</span><div><b>${esc(it.snapshot?.title||kindName)}</b><small>${esc(kindName)} · ${esc(scoreText)}</small></div></div>${body}</div>`;
      }).join('');
      if(typeof window.showModal!=='function')return;
      window.showModal(`<div class="shmc-results"><header><div><small>ДЕТАЛИ ПРОВЕРКИ</small><h2>${esc(run.login)}</h2><p>${run.status==='completed'?'Завершена':run.status==='in_progress'?'В процессе':'Не начата'}${run.score!==null&&run.score!==undefined?` · ${Math.round(Number(run.score))}%`:''}</p></div><button class="btn secondary" onclick="shMonthlyCleanResults('${String(checkId).replace(/'/g,"\\'")}')">← Назад</button></header><div class="shmc-detail-list">${parts}</div></div>`);
    }catch(e){console.error('SkillHub final assessment manager feedback',e);if(typeof window.toast==='function')window.toast(e?.message||'Не удалось открыть результат')}
  };

  function uniq(xs){return [...new Set(xs.filter(Boolean))]}
  function employeeBrief(items,run){
    const answers=run?.breakdown?.answers||{};
    const hard=items.filter(x=>x.kind==='hard').map(x=>({item:x,a:answers[x.id],points:Number(answers[x.id]?.points||0)}));
    const full=hard.filter(x=>x.points>=.999).length;
    const weak=hard.filter(x=>x.points<.75).sort((a,b)=>a.points-b.points).slice(0,3).map(x=>x.item.snapshot?.title);
    const ai=items.filter(x=>x.kind==='ai_dialogue').map(x=>answers[x.id]).filter(Boolean);
    const manual=items.filter(x=>x.kind==='manual').map(x=>answers[x.id]).filter(Boolean);
    const aiCritical=ai.filter(x=>x.review?.finalStatus==='критическая ошибка').length;
    const manualGood=manual.filter(x=>x.review?.finalStatus==='успешно').length;
    const focus=uniq([...ai.flatMap(x=>arr(x.review?.improvements)),...manual.flatMap(x=>arr(x.review?.improvements))]).slice(0,3);
    return `<section class="shfb-employee"><h3>Короткий разбор</h3><div class="shfb-employee-grid"><div><b>🧠 Hard Skills</b><span>${full} из ${hard.length} заданий выполнены полностью верно.</span>${weak.length?`<small>Повторить: ${weak.map(esc).join(' · ')}</small>`:''}</div><div><b>💬 ИИ-диалоги</b><span>${aiCritical?`${aiCritical} из ${ai.length} — критические ошибки.`:`Без критических ошибок: ${ai.length-aiCritical} из ${ai.length}.`}</span></div><div><b>✍️ Свободные ответы</b><span>${manualGood} из ${manual.length} оценены как успешные.</span></div></div>${focus.length?`<div class="shfb-focus"><b>На что обратить внимание дальше</b>${focus.map(x=>`<span>• ${esc(x)}</span>`).join('')}</div>`:''}</section>`;
  }

  const baseStart=window.shMonthlyStart;
  if(typeof baseStart==='function'){
    window.shMonthlyStart=async function(checkId){
      const result=await baseStart.apply(this,arguments);
      if(!isEmployee())return result;
      const root=document.querySelector('#page-run .shmc-result');
      if(!root||root.querySelector('.shfb-employee'))return result;
      const A=app();
      try{
        const [iq,rq]=await Promise.all([
          A.sb.from('monthly_check_items').select('*').eq('check_id',checkId).order('position',{ascending:true}),
          A.sb.from('monthly_check_runs').select('*').eq('check_id',checkId).eq('login',A.profile.login).maybeSingle()
        ]);
        if(iq.error||rq.error||!rq.data)return result;
        const html=employeeBrief(iq.data||[],rq.data);
        const btn=root.querySelector('button');
        if(btn)btn.insertAdjacentHTML('beforebegin',html);else root.insertAdjacentHTML('beforeend',html);
      }catch(e){console.warn('SkillHub employee final brief unavailable',e)}
      return result;
    };
  }

  const st=document.createElement('style');
  st.id='shMonthlyFeedbackFinalStyle';
  st.textContent=`
    .shfb-item{display:grid;gap:10px}.shfb-hard-summary{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:10px 12px;border-radius:12px;background:var(--panel2);border:1px solid var(--line)}.shfb-hard-summary span{font-weight:950;color:var(--primary)}
    .shfb-details{border:1px solid var(--line);border-radius:12px;padding:10px 12px}.shfb-details summary{cursor:pointer;font-weight:850}.shfb-details p{white-space:pre-line;line-height:1.45;margin:10px 0 0}.shfb-mistakes{display:grid;gap:8px;margin-top:10px}.shfb-mistake{display:grid;gap:3px;padding:9px 10px;border-radius:10px;background:var(--panel2)}.shfb-mistake small{color:var(--muted)}.shfb-ok{padding:10px 12px;border-radius:10px;background:color-mix(in srgb,#34c759 10%,var(--panel));border:1px solid color-mix(in srgb,#34c759 35%,var(--line))}
    .shfb-answer,.shfb-calc>div{display:grid;gap:5px;padding:11px 12px;border:1px solid var(--line);border-radius:12px;background:var(--panel2)}.shfb-answer.good,.shfb-calc>div.good{border-color:color-mix(in srgb,#34c759 45%,var(--line))}.shfb-answer.bad,.shfb-calc>div.bad{border-color:color-mix(in srgb,#ff453a 50%,var(--line))}.shfb-answer span,.shfb-calc span,.shfb-calc small{color:var(--muted);line-height:1.4}.shfb-calc{display:grid;gap:8px}.shfb-summary{margin:0;line-height:1.45}
    .shfb-employee{margin:16px 0 18px;text-align:left;border:1px solid var(--line);border-radius:16px;padding:14px;background:var(--panel2)}.shfb-employee h3{margin:0 0 10px}.shfb-employee-grid{display:grid;gap:8px}.shfb-employee-grid>div,.shfb-focus{display:grid;gap:4px;padding:10px 11px;border:1px solid var(--line);border-radius:12px;background:var(--panel)}.shfb-employee-grid span,.shfb-employee-grid small,.shfb-focus span{color:var(--muted);line-height:1.4}.shfb-focus{margin-top:8px}
  `;
  document.head.appendChild(st);
  console.info('SkillHub: final assessment clear feedback v1 enabled');
})();
