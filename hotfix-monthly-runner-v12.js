/* SkillHub monthly assessment employee runner v12 — 2026-10-09
   Native Hard presentation + AI Soft dialogue + manual answer checked by AI.
*/
(function(){
  'use strict';
  if(window.__shMonthlyRunnerV12)return;window.__shMonthlyRunnerV12=true;

  const R={check:null,run:null,items:[],index:0,busy:false,aiStarting:new Set(),sort:{itemId:null,placements:{},selected:null}};
  const MONTHS=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  const e=v=>typeof window.esc==='function'?window.esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const j=v=>String(v??'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  const monthLabel=k=>{const [y,m]=String(k||'').split('-').map(Number);return `${MONTHS[m-1]||''} ${y||''}`.trim()};
  const employee=()=>window.S?.profile?.role==='employee';
  const client=()=>window.S?.sb||null;
  const cfg=c=>Object.assign({ai_dialogues:0,hard:0,manual:0,estimated_minutes:30,due_time_msk:'23:59'},c?.config||{});

  function bdown(){const b=R.run?.breakdown&&typeof R.run.breakdown==='object'?R.run.breakdown:{};if(!b.answers)b.answers={};return b}
  const ans=id=>bdown().answers?.[id]||null;
  const doneCount=()=>R.items.filter(x=>ans(x.id)?.complete).length;
  const pct=()=>R.items.length?Math.round(doneCount()/R.items.length*100):0;

  async function invoke(body){
    const {data,error}=await client().functions.invoke('monthly-assessment-ai',{body});
    if(error){let d=null;try{if(error.context&&typeof error.context.json==='function')d=await error.context.json()}catch(_){ }throw new Error(d?.error||error.message||'Ошибка ИИ')}
    if(data?.error)throw new Error(data.error);return data;
  }
  async function load(checkId){
    const sb=client();if(!sb)throw new Error('Нет соединения');
    const [cq,iq,rq]=await Promise.all([
      sb.from('monthly_checks').select('*').eq('id',checkId).single(),
      sb.from('monthly_check_items').select('id,check_id,position,kind,snapshot,max_score,source_content_id').eq('check_id',checkId).order('position',{ascending:true}),
      sb.from('monthly_check_runs').select('*').eq('check_id',checkId).eq('login',window.S?.profile?.login||'').maybeSingle()
    ]);
    if(cq.error)throw cq.error;if(iq.error)throw iq.error;if(rq.error)throw rq.error;
    R.check=cq.data;R.items=iq.data||[];R.run=rq.data||null;
    if(!R.run){const q=await sb.from('monthly_check_runs').insert({check_id:checkId,login:window.S.profile.login,status:'not_started',progress:0,breakdown:{}}).select('*').single();if(q.error)throw q.error;R.run=q.data}
    return R;
  }
  async function persist(extra={}){
    if(!R.run?.id)return false;
    const q=await client().from('monthly_check_runs').update(Object.assign({breakdown:bdown(),progress:pct(),updated_at:new Date().toISOString()},extra)).eq('id',R.run.id).select('*').single();
    if(q.error)throw q.error;R.run=q.data;return true;
  }
  async function save(itemId,record,complete){
    const b=bdown();b.answers[itemId]=Object.assign({},record,{complete:!!complete,updated_at:new Date().toISOString()});b.current_position=R.items[R.index]?.position||R.index+1;R.run.breakdown=b;await persist({status:'in_progress'});
  }

  function openPage(){
    try{window.closeModal?.()}catch(_){ }
    try{window.go?.('run')}catch(_){ }
    const page=document.getElementById('page-run');if(!page)return;page.classList.remove('hidden');
    const t=document.getElementById('pageTitle'),s=document.getElementById('pageSub');if(t)t.textContent='Итоговая проверка';if(s)s.textContent=monthLabel(R.check?.month_key);
  }
  function shell(body){
    const n=Math.min(R.index+1,Math.max(1,R.items.length)),bar=R.items.length?Math.round(R.index/R.items.length*100):0;
    return `<div class="sh12r"><div class="sh-mr-top sh12r-top"><button class="sh-mr-exit" onclick="sh12rExit()">← Выйти</button><div class="sh-mr-top-main"><span>Итоговая проверка · ${e(monthLabel(R.check?.month_key))}</span><b>${n} / ${R.items.length}</b></div></div><div class="sh-mr-progress"><i style="width:${bar}%"></i></div>${body}</div>`;
  }
  function waiting(text='Загружаем задание…'){return shell(`<section class="card sh12r-wait"><div class="sh12r-spinner"></div><b>${e(text)}</b><small>Это может занять несколько секунд.</small></section>`)}
  function transition(title='Ответ принят'){return shell(`<section class="sh-mr-transition"><div class="sh-mr-check">✓</div><h2>${e(title)}</h2><p>Ответ сохранён. Правильность и разбор во время итоговой проверки не показываем.</p><button class="btn primary" onclick="sh12rNext()">Продолжить →</button></section>`)}
  function pageHtml(html){const page=document.getElementById('page-run');if(page)page.innerHTML=html;window.scrollTo?.({top:0,behavior:'smooth'})}

  function current(){return R.items[R.index]||null}
  function render(){
    if(!R.items.length){pageHtml(shell('<section class="card sh12r-empty"><h2>В проверке пока нет заданий</h2></section>'));return}
    if(R.index>=R.items.length){finish();return}
    const item=current(),p=item?.snapshot?.payload||{};
    if(ans(item.id)?.complete){R.index++;render();return}
    if(item.kind==='ai_dialogue'||p.mode==='ai_dialogue')return renderAi(item);
    if(item.kind==='manual')return renderManual(item);
    if(item.kind==='hard'){
      if(p.mode==='sort_cards')return pageHtml(renderSort(item));
      if(p.mode==='tariff_calc')return pageHtml(renderTariff(item));
      return pageHtml(renderScenario(item));
    }
    pageHtml(shell(`<section class="card sh12r-empty"><h2>${e(item.snapshot?.title||'Задание')}</h2><p>Формат задания не поддерживается в этой версии проверки.</p></section>`));
  }

  function facts(p){const a=Array.isArray(p?.facts)?p.facts:[];return a.length?`<div class="sh-hard-sc-facts">${a.map(x=>`<div class="${e(x.tone||'')}"><span>${e(x.label||'')}</span><strong>${e(x.value||'')}</strong></div>`).join('')}</div>`:''}
  function action(p){const a=p?.action||{},rows=[['Действие',a.title],['Сумма',a.amount],['Назначение',a.purpose],['Получатель',a.recipient],['Очередь',a.queue],['Способ',a.method]].filter(x=>x[1]);return rows.length?`<div class="sh12r-action">${rows.map(([k,v])=>`<div><small>${e(k)}</small><b>${e(v)}</b></div>`).join('')}</div>`:''}

  function renderScenario(item){
    const s=item.snapshot||{},p=s.payload||{},opts=Array.isArray(p.options)?p.options:Array.isArray(p.answers)?p.answers:[];
    return shell(`<div class="sh-hard-sc-wrap"><div class="card sh-hard-sc-shell"><div class="actions sh-hard-sc-top"><span class="sh-hard-sc-kicker">СИТУАЦИОННАЯ ЗАДАЧА</span><span class="pill">Hard Skills</span></div><h2>${e(s.title||'Ситуационная задача')}</h2><div class="sh-hard-sc-scenario"><div class="sh-hard-sc-scenario-head"><div class="sh-hard-sc-scenario-icon">🏛</div><div><span>СИТУАЦИЯ</span><b>${e(p.agency||s.topic||'Рабочая ситуация')}</b></div></div><p>${e(p.scenario||p.situation||p.problem||'')}</p>${facts(p)}${action(p)}</div><div class="sh-hard-sc-question"><span>ВОПРОС СОТРУДНИКУ</span><strong>${e(p.question||'Какое решение верное?')}</strong></div><div class="sh-hard-sc-options">${opts.map((o,i)=>`<button type="button" class="sh-hard-sc-option" onclick="sh12rScenario('${j(item.id)}',${i})"><span class="sh-hard-sc-option-num">${i+1}</span><span>${e(o)}</span></button>`).join('')}</div></div></div>`);
  }
  window.sh12rScenario=async(id,index)=>{if(R.busy)return;R.busy=true;try{const item=R.items.find(x=>x.id===id),p=item?.snapshot?.payload||{},right=Number(p.correct),ok=Number(index)===right;await save(id,{type:'hard_scenario',selected:Number(index),correct:ok,points:ok?1:0,maxPoints:1},true);pageHtml(transition('Ответ принят'))}catch(err){window.toast?.(err?.message||'Не удалось сохранить ответ')}finally{R.busy=false}};

  function sortState(item){const a=ans(item.id)||{};if(R.sort.itemId!==item.id){R.sort.itemId=item.id;R.sort.placements={...(a.placements||{})};R.sort.selected=null}return R.sort}
  function sortCard(item,c,placed){const st=sortState(item),sel=st.selected===c.id,click=placed?`sh12rSortReturn('${j(c.id)}')`:`sh12rSortSelect('${j(c.id)}')`;return `<button type="button" class="sh-hard-sort-card${sel?' is-selected':''}" draggable="true" ondragstart="sh12rSortDrag(event,'${j(c.id)}')" onclick="${click}"><span>${e(c.text||'')}</span></button>`}
  function renderSort(item){
    const s=item.snapshot||{},p=s.payload||{},cards=Array.isArray(p.cards)?p.cards:[],cats=Array.isArray(p.categories)?p.categories:[],st=sortState(item),pool=cards.filter(c=>!st.placements[c.id]),placed=Object.keys(st.placements).length;
    const zones=cats.map(cat=>{const inside=cards.filter(c=>st.placements[c.id]===cat.id);return `<section class="sh-hard-sort-zone" ondragover="event.preventDefault()" ondrop="sh12rSortDrop(event,'${j(cat.id)}')" onclick="sh12rSortPlace('${j(cat.id)}')"><div class="sh-hard-sort-zone-head"><span>${e(cat.icon||'')}</span><div><h3>${e(cat.title||'Категория')}</h3>${cat.hint?`<p>${e(cat.hint)}</p>`:''}</div><b>${inside.length}</b></div><div class="sh-hard-sort-zone-body">${inside.length?inside.map(c=>sortCard(item,c,true)).join(''):'<div class="sh-hard-sort-empty">Перетащите карточку сюда или выберите карточку и нажмите на колонку</div>'}</div></section>`}).join('');
    return shell(`<div class="sh-hard-sort-wrap"><div class="card sh-hard-sort-shell"><div class="actions sh-hard-sort-top"><span class="pill">Карточки</span><b>${e(s.title||'Распределите карточки')}</b><span class="muted small">${placed}/${cards.length}</span></div><div class="progress"><span style="width:${cards.length?placed/cards.length*100:0}%"></span></div><div class="sh-hard-sort-intro"><h2>${e(p.question||s.title||'Распределите карточки')}</h2><p>${e(p.instruction||'Распределите карточки по подходящим категориям.')}</p><div class="sh-hard-sort-tip">На компьютере — перетащите карточку. На телефоне — нажмите карточку, затем нужную колонку.</div></div><div class="sh-hard-sort-pool"><div class="sh-hard-sort-pool-head"><b>Карточки для распределения</b>${st.selected?'<span>Карточка выбрана — нажмите на нужную колонку</span>':''}</div><div class="sh-hard-sort-pool-body">${pool.length?pool.map(c=>sortCard(item,c,false)).join(''):'<div class="sh-hard-sort-empty">Все карточки распределены</div>'}</div></div><div class="sh-hard-sort-grid">${zones}</div><div class="actions" style="justify-content:flex-end;margin-top:16px"><button class="btn primary" ${placed<cards.length?'disabled':''} onclick="sh12rSortSubmit('${j(item.id)}')">Ответить</button></div></div></div>`);
  }
  window.sh12rSortSelect=id=>{R.sort.selected=R.sort.selected===id?null:id;pageHtml(renderSort(current()))};
  window.sh12rSortReturn=id=>{delete R.sort.placements[id];R.sort.selected=id;saveSortDraft();pageHtml(renderSort(current()))};
  window.sh12rSortPlace=cat=>{if(!R.sort.selected)return;R.sort.placements[R.sort.selected]=cat;R.sort.selected=null;saveSortDraft();pageHtml(renderSort(current()))};
  window.sh12rSortDrag=(ev,id)=>{try{ev.stopPropagation();ev.dataTransfer.setData('text/plain',id);ev.dataTransfer.effectAllowed='move'}catch(_){ }};
  window.sh12rSortDrop=(ev,cat)=>{ev.preventDefault();ev.stopPropagation();const id=ev.dataTransfer?.getData('text/plain');if(!id)return;R.sort.placements[id]=cat;R.sort.selected=null;saveSortDraft();pageHtml(renderSort(current()))};
  let sortTimer=0;function saveSortDraft(){clearTimeout(sortTimer);sortTimer=setTimeout(async()=>{try{const item=current();if(!item)return;const b=bdown();b.answers[item.id]={type:'hard_sort',placements:{...R.sort.placements},complete:false,updated_at:new Date().toISOString()};R.run.breakdown=b;await persist({status:'in_progress'})}catch(_){ }},250)}
  window.sh12rSortSubmit=async id=>{if(R.busy)return;const item=R.items.find(x=>x.id===id),cards=item?.snapshot?.payload?.cards||[],pl={...R.sort.placements};if(cards.some(c=>!pl[c.id])){window.toast?.('Распределите все карточки');return}R.busy=true;try{const correct=cards.filter(c=>pl[c.id]===c.category).length,total=cards.length,points=total?correct/total:0;await save(id,{type:'hard_sort',placements:pl,correctCount:correct,total,points,maxPoints:1},true);pageHtml(transition('Карточки приняты'))}catch(err){window.toast?.(err?.message||'Не удалось сохранить ответ')}finally{R.busy=false}};

  function renderTariff(item){
    const s=item.snapshot||{},p=s.payload||{},a=ans(item.id)||{},parts=Array.isArray(a.parts)?a.parts:[],stage=parts.length&&p.step2?2:1,step=stage===1?(p.step1||{}):(p.step2||{}),condition=stage===2&&Array.isArray(step.condition)?`<div class="sh-tcalc-step2-conditions">${step.condition.map(x=>`<div><span>${e(x.label||'')}</span><strong>${e(x.value||'')}</strong></div>`).join('')}</div>`:'';
    return shell(`<div class="sh-tcalc-wrap"><div class="card sh-tcalc-shell"><div class="actions sh-tcalc-top"><span class="sh-tcalc-kicker">РАСЧЁТНАЯ ЗАДАЧА · HARD SKILLS</span><span class="pill">Шаг ${stage}${p.step2?' из 2':''}</span></div><h2>${e(s.title||'Расчёт')}</h2>${stage===1?`<div class="sh-tcalc-scenario"><div class="sh-tcalc-scenario-head"><div class="sh-tcalc-icon">₽</div><div><span>СИТУАЦИЯ</span><b>${e(p.label||s.topic||'Тарифы')}</b></div></div>${p.scenario?`<p>${e(p.scenario)}</p>`:''}${Array.isArray(p.facts)?`<div class="sh-tcalc-facts">${p.facts.map(f=>`<div class="${e(f.tone||'')}"><span>${e(f.label||'')}</span><strong>${e(f.value||'')}</strong></div>`).join('')}</div>`:''}</div>`:`<div class="sh-tcalc-client"><div class="sh-tcalc-client-mark">2</div><div><span>НОВОЕ УСЛОВИЕ ОТ КЛИЕНТА</span><p>${e(step.client||'')}</p></div></div>${condition}`}<div class="sh-tcalc-question"><span>ВОПРОС СОТРУДНИКУ</span><strong>${e(stage===1?(step.prompt||p.question):(step.question||'Введите ответ'))}</strong></div><form class="sh-tcalc-form" onsubmit="event.preventDefault();sh12rTariff('${j(item.id)}',${stage})"><label for="sh12rNumber">Ответ</label><div class="sh-tcalc-input"><input id="sh12rNumber" type="text" inputmode="decimal" autocomplete="off" placeholder="Введите число"><span>${e(step.unit||'')}</span></div><small>Введите только число.</small><button class="btn primary" type="submit">Ответить →</button></form></div></div>`);
  }
  window.sh12rTariff=async(id,stage)=>{if(R.busy)return;const raw=String(document.getElementById('sh12rNumber')?.value||'').replace(/\s+/g,'').replace(/₽/g,'').replace(',','.').replace(/[^0-9.\-]/g,'');const value=Number(raw);if(!Number.isFinite(value)){window.toast?.('Введите число');return}R.busy=true;try{const item=R.items.find(x=>x.id===id),p=item?.snapshot?.payload||{},old=ans(id)||{parts:[]},parts=Array.isArray(old.parts)?old.parts.slice():[],step=stage===1?(p.step1||{}):(p.step2||{}),expected=Number(step.answer),tol=Number(step.tolerance||0),ok=Number.isFinite(expected)?Math.abs(value-expected)<=tol:null;parts.push({part:stage,value,correct:ok});if(stage===1&&p.step2){await save(id,{type:'hard_tariff',parts,complete:false,points:0,maxPoints:1},false);render()}else{const checked=parts.filter(x=>typeof x.correct==='boolean'),right=checked.filter(x=>x.correct).length,points=checked.length?right/checked.length:0;await save(id,{type:'hard_tariff',parts,points,maxPoints:1},true);pageHtml(transition('Расчёт принят'))}}catch(err){window.toast?.(err?.message||'Не удалось сохранить ответ')}finally{R.busy=false}};

  async function startAi(item){
    if(R.aiStarting.has(item.id))return;R.aiStarting.add(item.id);
    try{const data=await invoke({action:'dialogue_start',checkId:R.check.id,itemId:item.id});await save(item.id,{type:'ai_dialogue',scenario:data.scenario||{},transcript:[{role:'client',content:data.message||''}],review:null,points:null,maxPoints:1},false);render()}catch(err){pageHtml(shell(`<section class="card sh12r-error"><h2>Не удалось создать ИИ-диалог</h2><p>${e(err?.message||'Ошибка ИИ')}</p><button class="btn primary" onclick="sh12rRetryAi()">Повторить</button></section>`))}finally{R.aiStarting.delete(item.id)}
  }
  window.sh12rRetryAi=()=>{const item=current();if(item)startAi(item)};
  function renderAi(item){
    const a=ans(item.id)||{};if(!a.scenario||!Array.isArray(a.transcript)){startAi(item);pageHtml(waiting('ИИ создаёт клиентскую ситуацию…'));return}
    const turns=a.transcript.filter(m=>m.role==='employee').length;
    pageHtml(shell(`<div class="sh-ai-wrap"><div class="card sh-ai-shell"><div class="sh-ai-top"><div><span class="sh-ai-badge">SOFT SKILLS · ИИ-ДИАЛОГ</span><h2>${e(a.scenario.title||'Работа с негативом')}</h2><p>${e(a.scenario.situation||'')}</p></div><div class="sh-ai-turns"><b>${turns}</b><small>из 4–6</small></div></div><div class="sh-ai-chat">${a.transcript.map(m=>`<div class="sh-ai-msg ${m.role==='employee'?'is-employee':'is-client'}"><div class="sh-ai-who">${m.role==='employee'?'Сотрудник':'Клиент'}</div><div>${e(m.content||'')}</div></div>`).join('')}</div><div class="sh-ai-form"><textarea id="sh12rAiText" maxlength="600" rows="4" placeholder="Ответьте клиенту своими словами…" oninput="sh12rAiChars()"></textarea><div class="sh-ai-form-foot"><small><span id="sh12rAiCount">0</span> / 600</small><button id="sh12rAiSend" class="btn primary" onclick="sh12rAiSend('${j(item.id)}')">Отправить</button></div></div></div></div>`));
  }
  window.sh12rAiChars=()=>{const x=document.getElementById('sh12rAiText'),n=document.getElementById('sh12rAiCount');if(n)n.textContent=String(x?.value?.length||0)};
  window.sh12rAiSend=async id=>{if(R.busy)return;const input=document.getElementById('sh12rAiText'),text=String(input?.value||'').trim();if(text.length<2){window.toast?.('Напишите ответ клиенту');return}if(text.length>600){window.toast?.('Максимум 600 символов');return}R.busy=true;const btn=document.getElementById('sh12rAiSend');if(btn){btn.disabled=true;btn.textContent='Клиент отвечает…'}try{const a=ans(id)||{},transcript=[...(a.transcript||[]),{role:'employee',content:text}];await save(id,{...a,type:'ai_dialogue',transcript,points:null,maxPoints:1},false);const reply=await invoke({action:'dialogue_reply',checkId:R.check.id,itemId:id,scenario:a.scenario,transcript});transcript.push({role:'client',content:reply.message||''});if(reply.done){pageHtml(waiting('ИИ оценивает диалог…'));const review=await invoke({action:'dialogue_review',checkId:R.check.id,itemId:id,scenario:a.scenario,transcript});await save(id,{type:'ai_dialogue',scenario:a.scenario,transcript,review:review.review||{},points:Number(review.points||0),maxPoints:Number(review.maxPoints||1)},true);pageHtml(transition('Диалог завершён'))}else{await save(id,{type:'ai_dialogue',scenario:a.scenario,transcript,review:null,points:null,maxPoints:1},false);render()}}catch(err){window.toast?.(err?.message||'Не удалось получить ответ ИИ');render()}finally{R.busy=false}};

  function renderManual(item){
    const s=item.snapshot||{},p=s.payload||{};
    pageHtml(shell(`<div class="sh12r-manual-wrap"><div class="card sh12r-manual"><div class="sh12r-manual-head"><span class="sh-manual-ai-kicker">РУЧНОЙ ТРЕНАЖЁР · ИТОГОВАЯ ПРОВЕРКА</span><h2>${e(s.title||'Свободный ответ')}</h2><p>${e(p.instruction||'Ответьте самостоятельно так, как ответили бы клиенту.')}</p></div><div class="sh12r-client"><span>СИТУАЦИЯ / СООБЩЕНИЕ КЛИЕНТА</span><b>${e(p.question||s.title||'')}</b></div><div class="sh12r-answer"><label for="sh12rManual">Ваш ответ</label><textarea id="sh12rManual" rows="8" maxlength="6000" placeholder="Напишите ответ своими словами…"></textarea><div><small>ИИ проверит ответ после отправки. Во время итоговой проверки разбор не показываем.</small><button id="sh12rManualBtn" class="btn primary" onclick="sh12rManualSubmit('${j(item.id)}')">Отправить ответ</button></div></div></div></div>`));
  }
  window.sh12rManualSubmit=async id=>{if(R.busy)return;const input=document.getElementById('sh12rManual'),text=String(input?.value||'').trim();if(text.length<10){window.toast?.('Ответ слишком короткий');return}R.busy=true;const btn=document.getElementById('sh12rManualBtn');if(btn){btn.disabled=true;btn.textContent='ИИ проверяет…'}try{const res=await invoke({action:'manual_review',checkId:R.check.id,itemId:id,answer:text});await save(id,{type:'manual',text,review:res.review||{},points:Number(res.points||0),maxPoints:Number(res.maxPoints||1)},true);pageHtml(transition('Ответ принят'))}catch(err){window.toast?.(err?.message||'Не удалось проверить ответ');if(btn){btn.disabled=false;btn.textContent='Отправить ответ'}}finally{R.busy=false}};

  function calcScore(){let points=0,max=0;for(const item of R.items){const a=ans(item.id);if(!a?.complete)continue;const m=Number(a.maxPoints??item.max_score??1),p=Number(a.points);if(Number.isFinite(m)&&m>0){max+=m;points+=Number.isFinite(p)?Math.max(0,Math.min(m,p)):0}}return{points,max,score:max?Math.round(points/max*100):0}}
  async function finish(){
    if(R.busy)return;R.busy=true;try{const s=calcScore(),b=bdown();b.final={...s,pass_score:Number(R.check?.pass_score||75),passed:s.score>=Number(R.check?.pass_score||75)};b.finished_at=new Date().toISOString();b.current_position=R.items.length;R.run.breakdown=b;await persist({status:'completed',progress:100,score:s.score,submitted_at:R.run.submitted_at||new Date().toISOString(),completed_at:new Date().toISOString()});renderFinish()}catch(err){window.toast?.(err?.message||'Не удалось завершить проверку')}finally{R.busy=false}}
  function renderFinish(){const f=bdown().final||{score:Number(R.run?.score||0),passed:Number(R.run?.score||0)>=Number(R.check?.pass_score||75)};pageHtml(shell(`<section class="sh-mr-finish sh12r-finish"><div class="sh-mr-finish-mark">✓</div><span class="sh-month-kicker">Итоговая проверка завершена</span><h1>${e(monthLabel(R.check?.month_key))}</h1><div class="sh12r-score"><b>${Number(f.score||0)}%</b><span>${f.passed?'Проверка пройдена':'Ниже проходного результата'}</span></div><p>Все ответы сохранены. Подробные результаты доступны руководителю группы.</p><button class="btn primary" onclick="sh12rExit()">На главную</button></section>`))}

  window.sh12rNext=function(){R.index++;render()};
  window.sh12rExit=function(){try{window.go?.('home')}catch(_){ }};

  async function begin(id){
    if(!employee()||!client())return;
    if(R.busy)return;R.busy=true;try{await load(id);if(!R.items.length){window.toast?.('В проверке пока нет заданий');return}openPage();if(R.run.status==='completed'){renderFinish();return}let idx=R.items.findIndex(x=>!ans(x.id)?.complete);if(idx<0)idx=R.items.length;R.index=idx;const patch={status:'in_progress'};if(!R.run.started_at)patch.started_at=new Date().toISOString();await persist(patch);render()}catch(err){console.error('monthly runner v12',err);window.toast?.(err?.message||'Не удалось открыть проверку')}finally{R.busy=false}
  }
  async function intro(id){
    if(!employee()||!client())return;try{const [cq,iq,rq]=await Promise.all([client().from('monthly_checks').select('*').eq('id',id).single(),client().from('monthly_check_items').select('kind').eq('check_id',id),client().from('monthly_check_runs').select('status,progress').eq('check_id',id).eq('login',window.S.profile.login).maybeSingle()]);if(cq.error)throw cq.error;if(iq.error)throw iq.error;const c=cq.data,items=iq.data||[],cc=cfg(c),a=items.filter(x=>x.kind==='ai_dialogue').length,h=items.filter(x=>x.kind==='hard').length,m=items.filter(x=>x.kind==='manual').length,started=!!rq.data&&rq.data.status!=='not_started';window.showModal?.(`<div class="modal-head"><div><span class="sh-month-kicker">Итоговая проверка за месяц</span><h2>${e(monthLabel(c.month_key))}</h2></div><button class="btn secondary" onclick="closeModal()">✕</button></div><div class="sh12r-intro"><div class="sh12r-intro-mark">✓</div><h3>Три привычных формата SkillHub</h3><p>Во время проверки не показываем правильность и подсказки. Можно выйти и продолжить позже — прогресс сохранится.</p><div class="sh12r-intro-grid"><div><span>💬</span><b>ИИ-диалог</b><small>${a} задания</small></div><div><span>🧠</span><b>Hard Skills</b><small>${h} заданий</small></div><div><span>✍️</span><b>Ручной тренажёр</b><small>${m} задания</small></div></div><div class="sh12r-intro-meta">${items.length} заданий · около ${Number(cc.estimated_minutes||30)} минут · проходной ${Number(c.pass_score||75)}%</div><button class="btn primary full" onclick="shMonthlyBegin('${j(id)}')">${started?'Продолжить проверку':'Начать проверку'} →</button></div>`)}catch(err){window.toast?.(err?.message||'Не удалось открыть проверку')}}

  function enforce(){window.shMonthlyBegin=begin;window.shMonthlyEmployeeIntro=intro;window.shMonthlyExit=window.sh12rExit;window.shMonthlyNextItem=window.sh12rNext}

  if(!document.getElementById('sh12rStyle')){const s=document.createElement('style');s.id='sh12rStyle';s.textContent=`
    .sh12r{width:min(940px,100%);margin:0 auto;min-width:0}.sh12r .sh-hard-sc-wrap,.sh12r .sh-hard-sort-wrap,.sh12r .sh-tcalc-wrap,.sh12r .sh-ai-wrap,.sh12r-manual-wrap{width:100%!important;max-width:100%!important;margin:0!important}.sh12r-top{margin-bottom:8px}.sh12r-wait,.sh12r-empty,.sh12r-error{text-align:center;padding:38px 20px;display:grid;justify-items:center;gap:10px}.sh12r-spinner{width:34px;height:34px;border:3px solid var(--line);border-top-color:var(--primary);border-radius:50%;animation:sh12spin .8s linear infinite}@keyframes sh12spin{to{transform:rotate(360deg)}}
    .sh12r-action{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px}.sh12r-action>div{padding:10px;border:1px solid var(--line);border-radius:11px;background:var(--panel2)}.sh12r-action small,.sh12r-action b{display:block}.sh12r-action small{color:var(--muted);margin-bottom:3px}
    .sh12r-manual-wrap{display:grid;place-items:center}.sh12r-manual{width:min(820px,100%);padding:20px}.sh12r-manual-head{display:grid;gap:6px}.sh12r-manual-head h2{margin:0}.sh12r-manual-head p{margin:0;color:var(--muted);line-height:1.45}.sh12r-client{margin-top:16px;padding:15px;border:1px solid var(--line);border-radius:14px;background:var(--panel2)}.sh12r-client span,.sh12r-client b{display:block}.sh12r-client span{font-size:10px;letter-spacing:.08em;color:var(--primary);font-weight:900}.sh12r-client b{margin-top:6px;line-height:1.45}.sh12r-answer{margin-top:15px;display:grid;gap:8px}.sh12r-answer>label{font-weight:850}.sh12r-answer textarea{width:100%!important;min-height:180px!important;resize:vertical}.sh12r-answer>div{display:flex;justify-content:space-between;gap:12px;align-items:center}.sh12r-answer small{color:var(--muted);line-height:1.35;max-width:520px}
    .sh12r-score{margin:16px auto;display:grid;justify-items:center;gap:3px;padding:15px 28px;border:1px solid var(--line);border-radius:16px;background:var(--panel)}.sh12r-score b{font-size:34px}.sh12r-score span{color:var(--muted)}
    .sh12r-intro{text-align:center}.sh12r-intro-mark{width:54px;height:54px;border-radius:18px;background:color-mix(in srgb,var(--primary) 15%,transparent);display:grid;place-items:center;margin:0 auto 10px;font-size:25px;font-weight:900;color:var(--primary)}.sh12r-intro h3{margin:0 0 6px}.sh12r-intro>p{color:var(--muted);line-height:1.45}.sh12r-intro-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:15px 0}.sh12r-intro-grid>div{border:1px solid var(--line);border-radius:14px;padding:13px;background:var(--panel2)}.sh12r-intro-grid span,.sh12r-intro-grid b,.sh12r-intro-grid small{display:block}.sh12r-intro-grid span{font-size:24px}.sh12r-intro-grid small{color:var(--muted);margin-top:3px}.sh12r-intro-meta{color:var(--muted);font-size:13px;margin:12px 0 15px}
    @media(max-width:620px){.sh12r{width:100%;overflow-x:hidden}.sh12r .card{max-width:100%!important;box-sizing:border-box}.sh12r-action{grid-template-columns:1fr}.sh12r-answer>div{display:grid}.sh12r-answer .btn{width:100%}.sh12r-intro-grid{grid-template-columns:1fr}.sh12r .sh-hard-sort-grid{grid-template-columns:1fr!important}.sh12r .sh-hard-sc-options{grid-template-columns:1fr!important}.sh12r .sh-ai-shell{padding:14px!important}.sh12r .sh-ai-msg{max-width:92%!important}}
  `;document.head.appendChild(s)}

  enforce();setTimeout(enforce,500);setTimeout(enforce,1800);setTimeout(enforce,4000);
  console.info('SkillHub: monthly employee runner v12 enabled');
})();
