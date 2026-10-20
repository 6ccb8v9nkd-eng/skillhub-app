/* SkillHub monthly assessment result details — 2026-10-15
   Manager-only display enhancement: full AI transcript + manual answer + Hard answer review can be expanded.
   Does not change assessment scoring, tasks, attempts or stored answers.
*/
(function(){
  'use strict';
  if(window.__shMonthlyExpandedResults20261015)return;
  window.__shMonthlyExpandedResults20261015=true;

  const arr=v=>Array.isArray(v)?v:[];
  const state=()=>{try{return typeof S!=='undefined'?S:window.S}catch(_){return window.S}};
  const isManager=()=>['mentor','rs','tech_admin'].includes(String(state()?.profile?.role||''));
  const esc=v=>typeof window.esc==='function'?window.esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const js=v=>String(v??'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  const notify=t=>{try{window.toast?.(t)}catch(_){}};
  const KINDS={ai_dialogue:'ИИ-диалог',hard:'Hard Skills',manual:'Свободный ответ'};
  const statusText=s=>s==='completed'?'Завершена':s==='in_progress'?'В процессе':s==='review'?'На проверке':'Не начата';

  function scoreText(a){
    if(!a)return'не выполнено';
    const n=Number(a.points||0);
    return `${Number.isInteger(n)?n:n.toFixed(2).replace(/0+$/,'').replace(/\.$/,'')} / 1`;
  }
  function reviewHtml(review){
    review=review||{};
    const negative={
      'снижен':'Негатив снижен',
      'частично снижен':'Негатив частично снижен',
      'не снижен':'Негатив не снижен',
      'усилен':'Негатив усилился'
    }[review.negativeResult];
    return `${review.summary?`<p class="shmrx-summary">${esc(review.summary)}</p>`:''}
      ${negative?`<div class="shmrx-negative"><b>Итог диалога</b><span>${esc(negative)}</span></div>`:''}
      ${arr(review.strengths).length?`<div class="shmc-review good"><b>Сильные стороны</b>${arr(review.strengths).map(x=>`<span>• ${esc(x)}</span>`).join('')}</div>`:''}
      ${arr(review.improvements).length?`<div class="shmc-review"><b>Что улучшить</b>${arr(review.improvements).map(x=>`<span>• ${esc(x)}</span>`).join('')}</div>`:''}
      ${arr(review.criticalErrors).length?`<div class="shmc-review bad"><b>Критические ошибки</b>${arr(review.criticalErrors).map(x=>`<span>• ${esc(x)}</span>`).join('')}</div>`:''}
      ${review.betterApproach?`<div class="shmrx-note"><b>Как можно было ответить сильнее</b><p>${esc(review.betterApproach)}</p></div>`:''}
      ${review.nextFocus?`<div class="shmrx-note"><b>Что тренировать дальше</b><p>${esc(review.nextFocus)}</p></div>`:''}`;
  }

  function aiTranscriptHtml(a){
    const rows=arr(a?.transcript);
    if(!rows.length)return'';
    const scenario=a?.scenario||{};
    return `<details class="shmrx-expand"><summary><span>💬 Посмотреть весь диалог</span><small>${rows.length} сообщений</small></summary><div class="shmrx-expand-body">
      ${scenario.situation?`<div class="shmrx-scenario"><b>Ситуация</b><p>${esc(scenario.situation)}</p></div>`:''}
      <div class="shmrx-chat">${rows.map(m=>`<div class="${m?.role==='employee'?'employee':'client'}"><small>${m?.role==='employee'?'Сотрудник':'Клиент'}</small><p>${esc(m?.content||'')}</p></div>`).join('')}</div>
    </div></details>`;
  }

  function manualAnswerHtml(item,a){
    if(!a||typeof a.answer!=='string')return'';
    const p=item?.snapshot?.payload||{};
    const prompt=p.question||item?.snapshot?.title||'';
    return `<details class="shmrx-expand"><summary><span>✍️ Посмотреть ответ сотрудника</span><small>свободный ответ</small></summary><div class="shmrx-expand-body">
      ${prompt?`<div class="shmrx-scenario"><b>Задание</b><p>${esc(prompt)}</p></div>`:''}
      <div class="shmrx-manual-answer"><b>Ответ сотрудника</b><p>${esc(a.answer)}</p></div>
    </div></details>`;
  }

  const catTitle=(p,id)=>arr(p?.categories).find(x=>String(x.id)===String(id))?.title||String(id??'—');
  const same=(a,b)=>String(a??'')===String(b??'');
  // Display-only reconstruction of the employee's original category placement.
  // It does not modify answers, task definitions or grading.
  function sortCardTableHtml(p,a){
    const cards=arr(p.cards),places=arr(a.placements),categories=arr(p.categories);
    if(!cards.length||!categories.length)return '<div class="muted">Нет карточек для отображения</div>';
    const cols=categories.map(c=>({id:String(c.id),title:String(c.title||c.id),items:[]}));
    const outside=[];let correct=0,answered=0;
    cards.forEach((card,i)=>{
      const selected=places[i],has=selected!==null&&selected!==undefined&&String(selected).trim()!=='';
      if(has)answered++;
      const right=String(card.category??''),ok=has&&same(selected,right);if(ok)correct++;
      const entry={text:String(card.text||card.id||'Карточка '+(i+1)),right:catTitle(p,right),ok};
      const col=cols.find(c=>same(c.id,selected));
      if(col)col.items.push(entry);else outside.push(entry);
    });
    const cardHtml=x=>'<div class="shmrx-sort-card '+(x.ok?'good':'bad')+'">'+
      '<div class="shmrx-sort-card-title">'+esc(x.text)+'</div>'+
      '<div class="shmrx-sort-card-status">'+(x.ok?'✓ Верно':'✕ Ошибка')+'</div>'+
      (x.ok?'':'<div class="shmrx-sort-card-right">Правильно: '+esc(x.right)+'</div>')+'</div>';
    const head='<thead><tr>'+cols.map(c=>'<th scope="col">'+esc(c.title)+'</th>').join('')+'</tr></thead>';
    const count=Math.max(0,...cols.map(c=>c.items.length));
    let rows='';
    for(let i=0;i<count;i++){
      rows+='<tr>'+cols.map(c=>'<td>'+(c.items[i]?cardHtml(c.items[i]):'')+'</td>').join('')+'</tr>';
    }
    const label=answered===cards.length?'':'; не распределено: '+(cards.length-answered);
    let html='<div class="shmrx-sort-summary"><b>Распределение сотрудника</b><span>✓ '+correct+' из '+cards.length+' верно'+label+'</span></div>'+
      '<div class="shmrx-sort-scroll" role="region" aria-label="Распределение карточек по категориям" tabindex="0">'+
      '<table class="shmrx-sort-table '+(cols.length>2?'shmrx-sort-multi':'')+'"><caption>Ответ сотрудника по категориям</caption>'+head+'<tbody>'+rows+'</tbody></table></div>';
    if(outside.length)html+='<div class="shmrx-sort-unplaced"><b>Без категории</b>'+outside.map(cardHtml).join('')+'</div>';
    if(p.note)html+='<div class="shmrx-hard-explain"><b>Пояснение к заданию</b><p>'+esc(p.note)+'</p></div>';
    return html;
  }

  function hardAnswerHtml(item,a){
    if(!a)return'';
    const p=item?.snapshot?.payload||{},mode=p.mode||'';
    let body='';
    if(mode==='scenario'){
      const opts=arr(p.options),sel=Number(a.selected),cor=Number(p.correct),your=Number.isInteger(sel)?opts[sel]:'',right=Number.isInteger(cor)?opts[cor]:'';
      body=`<div class="shmrx-hard-pair ${sel===cor?'good':'bad'}"><div><small>Ответ сотрудника</small><b>${esc(your||'—')}</b></div><div><small>Правильный ответ</small><b>${esc(right||'—')}</b></div></div>${p.explanation?`<div class="shmrx-hard-explain"><b>Разбор</b><p>${esc(p.explanation)}</p></div>`:''}`;
    }else if(mode==='tariff_calc'){
      const vals=arr(a.values),rows=[];
      if(p.step1)rows.push({label:p.step1.prompt||p.question||'Шаг 1',your:vals[0],right:p.step1.answer,unit:p.step1.unit||''});
      if(p.step2)rows.push({label:p.step2.question||'Шаг 2',your:vals[1],right:p.step2.answer,unit:p.step2.unit||''});
      if(!rows.length&&Array.isArray(p.answers)&&Number.isInteger(Number(a.selected))){const si=Number(a.selected),ci=Number(p.correct);rows.push({label:p.question||'Ответ',your:p.answers[si],right:p.answers[ci],unit:''})}
      body=rows.map(r=>`<div class="shmrx-hard-step ${Number(r.your)===Number(r.right)?'good':'bad'}"><b>${esc(r.label)}</b><div><span>Ответ сотрудника: <strong>${esc(r.your??'—')} ${esc(r.unit)}</strong></span><span>Правильный: <strong>${esc(r.right??'—')} ${esc(r.unit)}</strong></span></div></div>`).join('');
      const ex=p.step2?.explanation||p.step1?.explanation||p.explanation;if(ex)body+=`<div class="shmrx-hard-explain"><b>Разбор</b><p>${esc(ex)}</p></div>`;
    }else if(mode==='sort_cards'){
      body=sortCardTableHtml(p,a);
    }else{
      body=`<div class="shmrx-hard-explain"><b>Ответ сотрудника</b><p>${esc(JSON.stringify(a))}</p></div>`;
    }
    return `<details class="shmrx-expand shmrx-hard"><summary><span>🧠 Посмотреть ответы Hard Skills</span><small>${scoreText(a)}</small></summary><div class="shmrx-expand-body">${body}</div></details>`;
  }

  function itemHtml(it,a,i){
    const review=a?.review||{};
    const evidence=it.kind==='ai_dialogue'?aiTranscriptHtml(a):it.kind==='manual'?manualAnswerHtml(it,a):it.kind==='hard'?hardAnswerHtml(it,a):'';
    return `<div class="shmc-detail-item shmrx-item"><div class="shmc-detail-head"><span>${i+1}</span><div><b>${esc(it.snapshot?.title||KINDS[it.kind]||'Задание')}</b><small>${esc(KINDS[it.kind]||it.kind)} · ${scoreText(a)}</small></div></div>${evidence}${reviewHtml(review)}</div>`;
  }

  async function expandedRunDetail(checkId,runId){
    if(!isManager())return;
    try{
      const A=state();if(!A?.sb)throw new Error('Нет подключения к базе');
      const [iq,rq]=await Promise.all([
        A.sb.from('monthly_check_items').select('*').eq('check_id',checkId).order('position',{ascending:true}),
        A.sb.from('monthly_check_runs').select('*').eq('id',runId).eq('check_id',checkId).single()
      ]);
      if(iq.error)throw iq.error;if(rq.error)throw rq.error;
      const r=rq.data,ans=r?.breakdown?.answers||{};
      const parts=arr(iq.data).map((it,i)=>itemHtml(it,ans[it.id],i)).join('');
      if(typeof window.showModal!=='function')throw new Error('Окно результатов недоступно');
      window.showModal(`<div class="shmc-results shmrx-results"><header><div><small>ДЕТАЛИ ПРОВЕРКИ</small><h2>${esc(r.login)}</h2><p>${statusText(r.status)}${r.score!==null&&r.score!==undefined?` · ${Math.round(Number(r.score))}%`:''}</p></div><button class="btn secondary" onclick="shMonthlyCleanResults('${js(checkId)}')">← Назад</button></header><div class="shmc-detail-list">${parts||'<div class="muted">Ответов пока нет</div>'}</div></div>`);
    }catch(e){console.error('monthly expanded result',e);notify(e?.message||'Не удалось открыть результат')}
  }
  expandedRunDetail.__shExpanded20261015=true;

  function install(){window.shMonthlyCleanRunDetail=expandedRunDetail}
  install();setTimeout(install,250);setTimeout(install,800);setTimeout(install,1800);setTimeout(install,3500);window.addEventListener('load',()=>setTimeout(install,0),{once:true});

  if(!document.getElementById('sh-monthly-expanded-results-style')){
    const s=document.createElement('style');s.id='sh-monthly-expanded-results-style';s.textContent=`
      .shmrx-results .shmc-detail-list{gap:12px}.shmrx-item{padding:13px}.shmrx-summary{margin:10px 0 0;line-height:1.48}
      .shmrx-expand{margin-top:11px;border:1px solid var(--line);border-radius:13px;background:var(--panel);overflow:hidden}.shmrx-expand>summary{list-style:none;cursor:pointer;padding:11px 12px;display:flex;align-items:center;justify-content:space-between;gap:10px;font-weight:850}.shmrx-expand>summary::-webkit-details-marker{display:none}.shmrx-expand>summary:after{content:'⌄';font-size:18px;color:var(--muted);transition:transform .15s ease}.shmrx-expand[open]>summary:after{transform:rotate(180deg)}.shmrx-expand>summary span{min-width:0}.shmrx-expand>summary small{margin-left:auto;color:var(--muted);font-weight:700;white-space:nowrap}.shmrx-expand-body{border-top:1px solid var(--line);padding:11px}
      .shmrx-scenario,.shmrx-manual-answer,.shmrx-note,.shmrx-negative,.shmrx-hard-explain{border:1px solid var(--line);border-radius:11px;padding:10px;background:var(--panel2);margin-top:8px}.shmrx-scenario:first-child,.shmrx-manual-answer:first-child{margin-top:0}.shmrx-scenario b,.shmrx-manual-answer b,.shmrx-note b,.shmrx-negative b,.shmrx-hard-explain>b{display:block;font-size:11px}.shmrx-scenario p,.shmrx-manual-answer p,.shmrx-note p,.shmrx-hard-explain p{margin:5px 0 0;white-space:pre-wrap;line-height:1.5}.shmrx-negative{display:flex;align-items:center;justify-content:space-between;gap:10px}.shmrx-negative span{font-size:12px;font-weight:850}
      .shmrx-chat{display:grid;gap:8px;margin-top:9px}.shmrx-chat>div{max-width:82%;border:1px solid var(--line);border-radius:13px;padding:9px 11px}.shmrx-chat>div.client{justify-self:start;background:var(--panel2)}.shmrx-chat>div.employee{justify-self:end;background:color-mix(in srgb,var(--primary) 8%,var(--panel))}.shmrx-chat small{display:block;color:var(--muted);font-size:10px}.shmrx-chat p{margin:4px 0 0;white-space:pre-wrap;line-height:1.45}
      .shmrx-hard-pair{display:grid;grid-template-columns:1fr 1fr;gap:8px}.shmrx-hard-pair>div,.shmrx-hard-step,.shmrx-hard-row{border:1px solid var(--line);border-radius:11px;padding:10px;background:var(--panel2)}.shmrx-hard-pair small,.shmrx-hard-row small{display:block;color:var(--muted);margin-bottom:4px}.shmrx-hard-pair.good>div,.shmrx-hard-step.good,.shmrx-hard-row.good{border-color:color-mix(in srgb,#39a96b 55%,var(--line));background:color-mix(in srgb,#39a96b 8%,var(--panel2))}.shmrx-hard-pair.bad>div,.shmrx-hard-step.bad,.shmrx-hard-row.bad{border-color:color-mix(in srgb,#d65c5c 55%,var(--line));background:color-mix(in srgb,#d65c5c 7%,var(--panel2))}.shmrx-hard-step{margin-bottom:8px}.shmrx-hard-step>div,.shmrx-hard-row>div:last-child{display:grid;gap:4px;margin-top:6px}.shmrx-hard-step span,.shmrx-hard-row span{font-size:12px}.shmrx-hard-list{display:grid;gap:8px}.shmrx-hard-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(180px,.8fr);gap:12px}.shmrx-hard-row>div:first-child{min-width:0}
      /* Only in the manager's completed Hard Skills result details. */
      .shmrx-sort-summary{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:0 0 10px}
      .shmrx-sort-summary b{font-size:13px}.shmrx-sort-summary span{font-size:12px;font-weight:800;color:var(--muted)}
      .shmrx-sort-scroll{overflow-x:auto;max-width:100%;-webkit-overflow-scrolling:touch;scrollbar-width:thin}
      .shmrx-results .shmrx-sort-table{width:100%;min-width:500px;table-layout:fixed;border-collapse:separate;border-spacing:8px 7px}
      .shmrx-results .shmrx-sort-table.shmrx-sort-multi{min-width:690px}
      .shmrx-sort-table caption{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
      .shmrx-sort-table th{padding:12px 9px!important;border:1px solid var(--line)!important;border-radius:10px;text-align:center!important;background:var(--panel2);font-weight:850;line-height:1.35}
      .shmrx-sort-table td{padding:0!important;border:0!important;vertical-align:top!important;overflow-wrap:anywhere}
      .shmrx-sort-card{min-height:64px;padding:11px;border:1px solid var(--line);border-radius:11px;background:var(--panel2);line-height:1.4;overflow-wrap:anywhere}
      .shmrx-sort-card-title{font-size:12px;font-weight:750}.shmrx-sort-card-status{font-size:11px;font-weight:850;margin-top:6px}
      .shmrx-sort-card-right{font-size:11px;margin-top:6px;opacity:.9;font-weight:650}
      .shmrx-sort-card.good{border-color:color-mix(in srgb,#39a96b 60%,var(--line));background:color-mix(in srgb,#39a96b 10%,var(--panel2))}
      .shmrx-sort-card.bad{border-color:color-mix(in srgb,#d65c5c 60%,var(--line));background:color-mix(in srgb,#d65c5c 10%,var(--panel2))}
      .shmrx-sort-unplaced{display:grid;gap:7px;margin-top:9px}.shmrx-sort-unplaced>b{font-size:12px}
      @media(max-width:720px){.shmrx-expand>summary{align-items:flex-start;flex-wrap:wrap}.shmrx-expand>summary small{margin-left:0}.shmrx-chat>div{max-width:94%}.shmrx-negative,.shmrx-hard-pair,.shmrx-hard-row{display:grid;grid-template-columns:1fr}}
    `;document.head.appendChild(s)
  }
  console.info('SkillHub: expanded monthly result evidence incl Hard enabled');
})();
