/* SkillHub assignment composer — 2026-10-13
   Compact assignment flow: Soft (manual/AI), Hard by topic, typing.
   Legacy ordinary Soft dialogues are intentionally excluded.
   Monthly/final assessment is not touched.
*/
(function(){
  'use strict';
  if(window.__shAssignmentCompose20261013)return;
  window.__shAssignmentCompose20261013=true;

  const arr=v=>Array.isArray(v)?v:[];
  const escSafe=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const jsSafe=v=>typeof jsq==='function'?jsq(v):String(v??'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  const norm=v=>typeof normalizeLogin==='function'?normalizeLogin(v):String(v||'').trim().toLowerCase();
  const sectionLabel=s=>s==='soft'?'Soft Skills':s==='hard'?'Hard Skills':s==='typing'?'Скорость печати':s==='needs'?'Потребность':String(s||'');
  const isManager=()=>['mentor','rs','tech_admin'].includes(S?.profile?.role);
  const published=()=>arr(S?.content).filter(x=>x&&x.status==='published');
  const manualSoft=()=>published().filter(x=>x.section==='soft'&&x.type==='manual');
  const hardRows=()=>published().filter(x=>x.section==='hard');
  const needsRows=()=>published().filter(x=>x.section==='needs');
  const groupByTopic=rows=>{
    const m=new Map();
    rows.forEach(x=>{const t=String(x.topic||'Без темы').trim()||'Без темы';if(!m.has(t))m.set(t,[]);m.get(t).push(x)});
    return [...m.entries()].sort((a,b)=>a[0].localeCompare(b[0],'ru'));
  };

  let pick=null;
  const baseStartAssignment=typeof window.startAssignment==='function'?window.startAssignment:null;
  const baseCompleted=typeof window.assignmentCompletedForUser==='function'?window.assignmentCompletedForUser:null;
  const baseAssignmentHtml=typeof window.assignmentHtml==='function'?window.assignmentHtml:null;

  function scopeEmployees(){
    if(typeof assignmentScopeEmployees==='function')return arr(assignmentScopeEmployees());
    if(S?.profile?.role==='mentor')return arr(S.allowed).filter(x=>x.active&&x.role==='employee'&&String(x.manager_login||'')===String(S.profile.login||''));
    return arr(S.allowed).filter(x=>x.active&&x.role==='employee');
  }
  function scopeHelp(){
    if(S?.profile?.role==='tech_admin')return'ALL = все сотрудники SkillHub';
    if(S?.profile?.role==='rs')return'ALL = все сотрудники моего сектора';
    return'ALL = вся моя команда';
  }

  function itemType(x){
    if(x.type==='manual')return'Ручной';
    if(x.type==='hardcase')return'Hard-кейс';
    return'Тест';
  }
  function topicDetails(topic,rows,section,kind){
    const topicTitle=kind==='manual'?`Ручная тренировка · ${topic}`:`${topic}`;
    const whole=`<button type="button" class="sh-as-whole" onclick="shAssignPick('${jsSafe(section)}','${jsSafe(topic)}','','${jsSafe(topicTitle)}','${jsSafe(kind)}')">Назначить всю тему</button>`;
    const items=rows.slice().sort((a,b)=>String(a.title||a.question||'').localeCompare(String(b.title||b.question||''),'ru')).map(x=>{
      const title=String(x.title||x.question||'Тренировка');
      return `<button type="button" class="sh-as-item" data-sh-as-search="${escSafe((topic+' '+title).toLowerCase())}" data-sh-as-id="${escSafe(x.id)}" onclick="shAssignPick('${jsSafe(section)}','${jsSafe(topic)}','${jsSafe(x.id)}','${jsSafe(title)}','${jsSafe(kind)}')"><span><b>${escSafe(title)}</b><small>${escSafe(itemType(x))}</small></span><span class="sh-as-check">✓</span></button>`;
    }).join('');
    return `<details class="sh-as-topic" data-sh-as-search="${escSafe(topic.toLowerCase())}"><summary><b>${escSafe(topic)}</b><span>${rows.length}</span></summary><div class="sh-as-topic-body">${whole}${items}</div></details>`;
  }
  function hardBlock(){
    const groups=groupByTopic(hardRows());
    return `<details class="sh-as-section" open><summary><span><b>Hard Skills</b><small>Темы и тесты</small></span><strong>${hardRows().length}</strong></summary><div class="sh-as-section-body">${groups.length?groups.map(([t,r])=>topicDetails(t,r,'hard','hard')).join(''):'<div class="sh-as-empty">Опубликованных Hard-тренировок пока нет.</div>'}</div></details>`;
  }
  function manualBlock(){
    const groups=groupByTopic(manualSoft());
    return `<details class="sh-as-sub"><summary><span><b>✍️ Ручные тренажёры</b><small>Свободный ответ → проверка РГ</small></span><strong>${manualSoft().length}</strong></summary><div class="sh-as-sub-body">${groups.length?groups.map(([t,r])=>topicDetails(t,r,'soft','manual')).join(''):'<div class="sh-as-empty">Ручных тренировок пока нет.</div>'}</div></details>`;
  }
  function softBlock(){
    return `<details class="sh-as-section" open><summary><span><b>Soft Skills</b><small>Только актуальные форматы</small></span><strong>2</strong></summary><div class="sh-as-section-body"><button type="button" class="sh-as-item sh-as-ai" data-sh-as-search="ии работа с негативом soft" data-sh-as-kind="ai" onclick="shAssignPick('soft','Работа с негативом · ИИ','','ИИ-тренажёр Soft · Работа с негативом','ai')"><span><b>✨ ИИ-тренажёр</b><small>Работа с негативом · живой клиент</small></span><span class="sh-as-check">✓</span></button>${manualBlock()}</div></details>`;
  }
  function needsBlock(){
    const rows=needsRows();if(!rows.length)return'';
    const groups=groupByTopic(rows);
    return `<details class="sh-as-section"><summary><span><b>Потребность</b><small>Тренировки по выявлению потребности</small></span><strong>${rows.length}</strong></summary><div class="sh-as-section-body">${groups.map(([t,r])=>topicDetails(t,r,'needs','needs')).join('')}</div></details>`;
  }
  function typingBlock(){
    return `<div class="sh-as-section sh-as-single"><button type="button" class="sh-as-item" data-sh-as-search="печать скорость печати" data-sh-as-kind="typing" onclick="shAssignPick('typing','','','Скорость печати','typing')"><span><b>⌨️ Скорость печати</b><small>Тренировка скорости и точности</small></span><span class="sh-as-check">✓</span></button></div>`;
  }

  function updatePickUi(){
    const sec=document.getElementById('asSec'),topic=document.getElementById('asTopic'),title=document.getElementById('asTitle'),content=document.getElementById('asContent');
    const secText=document.getElementById('asSecText'),topicText=document.getElementById('asTopicText'),selected=document.getElementById('shAsSelected'),save=document.getElementById('shAsSave'),target=document.getElementById('asTarget'),targetHint=document.getElementById('shAsTargetHint');
    if(sec)sec.value=pick?.section||'';if(topic)topic.value=pick?.topic||'';if(title)title.value=pick?.title||'';if(content)content.value=pick?.content_id||'';
    if(secText)secText.value=pick?sectionLabel(pick.section):'';
    if(topicText)topicText.value=pick?(pick.topic|| (pick.section==='typing'?'Скорость печати':'—')):'';
    if(selected)selected.innerHTML=pick?`<b>${escSafe(pick.title)}</b><span>${escSafe(sectionLabel(pick.section))}${pick.topic?' · '+escSafe(pick.topic):''}</span>`:'<span>Выберите тренировку выше</span>';
    document.querySelectorAll('.sh-as-item').forEach(el=>el.classList.toggle('selected',!!pick&&((pick.content_id&&el.dataset.shAsId===pick.content_id)||(!pick.content_id&&el.dataset.shAsKind===pick.kind))));
    if(save)save.disabled=!pick;
    const noPercent=pick&&['manual','ai'].includes(pick.kind);
    if(target){target.disabled=!!noPercent;if(noPercent)target.value='0';else if(Number(target.value)<=0)target.value='90'}
    if(targetHint)targetHint.textContent=noPercent?'Для ручной и ИИ-тренировки процент не применяется.':'Минимальный результат для выполнения назначения.';
  }

  window.shAssignPick=function(section,topic,contentId,title,kind){
    pick={section:String(section||''),topic:String(topic||''),content_id:String(contentId||''),title:String(title||'Тренировка'),kind:String(kind||'hard')};
    updatePickUi();
  };
  window.shAssignFilter=function(value){
    const q=String(value||'').trim().toLowerCase();
    document.querySelectorAll('[data-sh-as-search]').forEach(el=>{
      const hit=!q||String(el.dataset.shAsSearch||'').includes(q);
      if(el.classList.contains('sh-as-item'))el.classList.toggle('hidden',!hit);
      else if(el.tagName==='DETAILS'){el.classList.toggle('sh-as-nohit',!hit);if(q&&hit)el.open=true}
    });
  };

  window.openAssignmentEditor=function(prefill={}){
    if(!isManager())return;
    pick=null;
    showModal(`<div class="modal-head"><div><h2>Новое назначение</h2><div class="muted small">Выберите тренировку, тему или раздел</div></div><button class="btn secondary" onclick="closeModal()">✕</button></div><div class="sh-as-picker"><div class="field"><label>Тренировка</label><input type="search" placeholder="Поиск по теме или названию" oninput="shAssignFilter(this.value)"></div>${softBlock()}${hardBlock()}${needsBlock()}${typingBlock()}</div><div id="shAsSelected" class="sh-as-selected"><span>Выберите тренировку выше</span></div><input id="asTitle" type="hidden"><input id="asContent" type="hidden"><input id="asSec" type="hidden"><input id="asTopic" type="hidden"><div class="form-grid sh-as-meta"><div class="field"><label>Раздел</label><input id="asSecText" readonly placeholder="—"></div><div class="field"><label>Тема</label><input id="asTopicText" readonly placeholder="—"></div><div class="field"><label>Дедлайн</label><input id="asDue" type="date"></div><div class="field"><label>Минимум %</label><input id="asTarget" type="number" min="0" max="100" value="90"><div id="shAsTargetHint" class="meta">Минимальный результат для выполнения назначения.</div></div><div class="field full"><label>Кому</label><input id="asUsers" value="ALL" placeholder="ALL или логины через запятую"><div class="meta">${escSafe(scopeHelp())}</div></div></div><div class="actions" style="justify-content:flex-end;margin-top:14px"><button id="shAsSave" class="btn primary" onclick="saveAssignment()" disabled>Назначить и уведомить</button></div>`);
    document.getElementById('asDue').value=prefill.due||'';
    document.getElementById('asTarget').value=String(prefill.target??90);
    document.getElementById('asUsers').value=(prefill.recipients||['ALL']).join(', ');
    if(prefill.content_id){
      const x=published().find(c=>String(c.id)===String(prefill.content_id));
      if(x)window.shAssignPick(x.section,x.topic,x.id,x.title||x.question,x.type==='manual'?'manual':x.section==='hard'?'hard':x.section);
    }else if(prefill.section){
      const kind=prefill.section==='soft'&&String(prefill.topic||'').includes('ИИ')?'ai':prefill.section==='soft'?'manual':prefill.section==='typing'?'typing':prefill.section;
      window.shAssignPick(prefill.section,prefill.topic||'', '', prefill.title|| (prefill.topic?`Тренировка · ${prefill.topic}`:sectionLabel(prefill.section)), kind);
    }else updatePickUi();
  };

  window.saveAssignment=async function(){
    if(!pick){toast('Сначала выберите тренировку');return}
    let rec=String(document.getElementById('asUsers')?.value||'ALL').split(',').map(norm).filter(Boolean);if(!rec.length)rec=['ALL'];
    if(S.profile.role!=='tech_admin'&&rec.includes('ALL'))rec=scopeEmployees().map(x=>x.login);
    if(S.profile.role!=='tech_admin'){
      const ok=new Set(scopeEmployees().map(x=>String(x.login)));
      if(rec.some(x=>!ok.has(x))){toast(S.profile.role==='rs'?'Можно назначать только сотрудникам своего сектора':'Можно назначать только своей команде');return}
    }
    const target=['manual','ai'].includes(pick.kind)?0:Number(document.getElementById('asTarget')?.value||90);
    const row={title:pick.title,content_id:pick.content_id||null,section:pick.section,topic:pick.topic,due:document.getElementById('asDue')?.value||null,target,recipients:rec,status:'active',created_by:S.user.id};
    const {error}=await S.sb.from('assignments').insert(row);if(error){toast(error.message);return}
    if(typeof notifyRecipients==='function')await notifyRecipients('Новая тренировка',`${row.title}${row.due?' · до '+row.due:''}`,rec,'assignment');
    closeModal();
    if(typeof syncAll==='function')await syncAll();
    if(typeof renderAssignments==='function')renderAssignments();
    toast('Тренировка назначена');
  };

  /* Employee start routing for non-content assignments. */
  window.startAssignment=function(id){
    const a=arr(S?.assignments).find(x=>String(x.id)===String(id));if(!a)return;
    if(a.section==='soft'&&String(a.topic||'')==='Работа с негативом · ИИ'){
      if(typeof window.shAiSoftIntro==='function'){window.shAiSoftIntro();return}
      toast('ИИ-тренажёр сейчас недоступен');return;
    }
    if(a.section==='typing'&&!a.content_id){if(typeof startTyping==='function'){startTyping();return}}
    if(baseStartAssignment)return baseStartAssignment.apply(this,arguments);
    if(a.content_id&&typeof startContent==='function')return startContent(a.content_id);
    if(typeof startTopic==='function')return startTopic(a.section,a.topic);
  };
  try{startAssignment=window.startAssignment}catch(_){}

  /* Manual assignments can be completed by an accepted manual answer. */
  window.assignmentCompletedForUser=function(a,userLogin,attemptRows=S.attempts){
    try{
      const created=new Date(a.created_at||0).getTime();
      if(a.section==='soft'){
        const content=a.content_id?arr(S.content).find(x=>String(x.id)===String(a.content_id)):null;
        const manualContent=content?.type==='manual';
        const manualTopic=!a.content_id&&a.topic&&arr(S.content).some(x=>x.section==='soft'&&x.type==='manual'&&x.topic===a.topic);
        if(manualContent||manualTopic){
          const ids=manualContent?[content.id]:arr(S.content).filter(x=>x.section==='soft'&&x.type==='manual'&&x.topic===a.topic).map(x=>x.id);
          return arr(S.manualAnswers).some(r=>String(r.login)===String(userLogin)&&ids.includes(r.content_id)&&r.status==='accepted'&&new Date(r.updated_at||r.created_at||0).getTime()>=created);
        }
      }
    }catch(_){}
    return baseCompleted?baseCompleted.apply(this,arguments):false;
  };
  try{assignmentCompletedForUser=window.assignmentCompletedForUser}catch(_){}

  /* Hide meaningless 0% target on manual/AI assignments on the employee home screen. */
  window.assignmentHtml=function(x){
    if(Number(x?.target||0)>0&&baseAssignmentHtml)return baseAssignmentHtml.apply(this,arguments);
    const due=x.due?new Date(x.due+'T12:00:00'):null,days=due?Math.ceil((due-new Date())/86400000):null;
    return `<div class="assignment"><div><b>${escSafe(x.title)}</b><div class="meta">${x.section?escSafe(sectionLabel(x.section)):''}${x.topic?' · '+escSafe(x.topic):''}${x.due?' · до '+escSafe(x.due):''}${days!==null&&days<=1?' · ⏰ скоро':''}</div></div><div class="actions"><button class="btn secondary" onclick="startAssignment('${jsSafe(x.id)}')">Начать</button></div></div>`;
  };
  try{assignmentHtml=window.assignmentHtml}catch(_){}

  /* Soft chooser: only Manual + AI. Ordinary fixed-choice Soft dialogues stay disabled. */
  function renderSoftChooser(){
    showModal(`<div class="modal-head"><div><h2>Soft Skills</h2><div class="muted small">Выберите формат тренировки</div></div><button class="btn secondary" onclick="closeModal()">✕</button></div><div class="sh-soft-choice-grid"><button class="sh-soft-choice-card sh-soft-ai-card" onclick="shAiSoftIntro()"><span class="sh-soft-choice-icon">✨</span><span class="sh-soft-choice-copy"><b>Работа с негативом · ИИ</b><small>Живой сложный клиент и подробный разбор после диалога</small><em>ИИ-тренажёр</em></span><span class="sh-soft-choice-arrow">→</span></button><button class="sh-soft-choice-card" onclick="shSoftManualIntro()"><span class="sh-soft-choice-icon">✍️</span><span class="sh-soft-choice-copy"><b>Ручные тренажёры</b><small>Свободный ответ с проверкой руководителя</small><em>${manualSoft().length} тренажёров</em></span><span class="sh-soft-choice-arrow">→</span></button></div>`);
  }
  window.openSoftHub=renderSoftChooser;
  window.shSoftBackToChooser=renderSoftChooser;
  window.shSoftOrdinaryIntro=function(){renderSoftChooser();toast('Обычные Soft-диалоги убраны. Используйте ручной или ИИ-тренажёр.');};
  window.shSoftStartOrdinary=window.shSoftOrdinaryIntro;
  try{openSoftHub=window.openSoftHub;shSoftBackToChooser=window.shSoftBackToChooser}catch(_){}

  if(!document.getElementById('shAssignmentComposeStyle')){
    const s=document.createElement('style');s.id='shAssignmentComposeStyle';s.textContent=`
      .sh-as-picker{display:grid;gap:10px;max-height:48vh;overflow:auto;padding-right:3px}
      .sh-as-section,.sh-as-sub,.sh-as-topic{border:1px solid var(--line);border-radius:16px;background:var(--panel)}
      .sh-as-section>summary,.sh-as-sub>summary,.sh-as-topic>summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px}
      .sh-as-section>summary::-webkit-details-marker,.sh-as-sub>summary::-webkit-details-marker,.sh-as-topic>summary::-webkit-details-marker{display:none}
      .sh-as-section>summary>span,.sh-as-sub>summary>span{display:grid;gap:2px}.sh-as-section>summary small,.sh-as-sub>summary small{color:var(--muted);font-weight:500}
      .sh-as-section>summary strong,.sh-as-sub>summary strong,.sh-as-topic>summary span{color:var(--muted);font-size:13px}
      .sh-as-section-body,.sh-as-sub-body{display:grid;gap:9px;padding:0 10px 10px}.sh-as-topic-body{display:grid;gap:7px;padding:0 9px 9px}
      .sh-as-sub{background:transparent}.sh-as-topic{border-radius:13px;background:transparent}.sh-as-topic>summary{padding:11px 12px}
      .sh-as-item,.sh-as-whole{width:100%;border:1px solid var(--line);background:var(--bg);color:var(--ink);border-radius:13px;padding:12px 13px;text-align:left;cursor:pointer}
      .sh-as-item{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:10px}.sh-as-item>span:first-child{display:grid;gap:3px}.sh-as-item small{color:var(--muted)}.sh-as-check{opacity:0;color:var(--primary);font-weight:900}.sh-as-item.selected{border-color:var(--primary);box-shadow:0 0 0 1px var(--primary) inset}.sh-as-item.selected .sh-as-check{opacity:1}.sh-as-whole{color:var(--primary);font-weight:800}
      .sh-as-selected{margin:13px 0;border:1px solid var(--line);border-radius:15px;padding:12px 14px;display:grid;gap:3px;background:color-mix(in srgb,var(--primary) 7%,var(--panel))}.sh-as-selected span{color:var(--muted);font-size:13px}
      .sh-as-meta input[readonly]{opacity:.9}.sh-as-nohit{display:none!important}.sh-as-empty{padding:12px;color:var(--muted)}
      @media(max-width:620px){.sh-as-picker{max-height:45vh}.sh-as-section>summary,.sh-as-sub>summary{padding:13px}.sh-as-item{padding:12px}.sh-as-meta{grid-template-columns:1fr!important}}
    `;document.head.appendChild(s);
  }

  console.info('SkillHub: compact grouped assignments enabled; legacy ordinary Soft dialogues excluded');
})();
