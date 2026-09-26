/* SkillHub V8.20 — structured explanations + contrast helpers */
(function(){
  function norm(text){return String(text||'').replace(/\\+n/g,'\n').replace(/\r/g,'').trim()}
  function softSignals(text){
    const s=String(text||'').toLowerCase();
    return {
      emotion:/(понима|слышу|вижу|похоже|раздраж|тревог|пережив|неприят|устал|растер|разочар|эмоци)/i.test(s),
      action:/(провер|уточн|посмотр|предлага|зафикс|следующ|шаг|план|действ|сейчас|разбер)/i.test(s),
      need:/(важно|нужн|результат|понятн|чтобы|ожид|контрол|опора|маршрут)/i.test(s),
      question:/[?]|(уточн|расскаж|какой|что для вас|правильно понимаю)/i.test(s),
      vague:/(постараюсь|давайте разбер[её]мся|чем могу помочь|что можно сделать|вернусь к вам)/i.test(s),
      promise:/(обещ|гарант|точно|обязательно|ускорить|буду контролировать)/i.test(s)
    };
  }
  function correctReason(topic,answer,psych){
    const sig=softSignals(answer),t=String(topic||'').toLowerCase();
    const emotion=psych?.emotion||'состояние клиента',need=psych?.need||'его реальную задачу';
    let core='';
    if(t.includes('ожид')) core='Ответ делает ожидание управляемым: клиент понимает, что происходит сейчас, какой будет следующий шаг и где появится точка контроля.';
    else if(t.includes('негатив')) core='Ответ признаёт негатив без спора и не пытается успокоить клиента общими словами. Разговор переводится к конкретному действию.';
    else if(t.includes('присоедин')) core=`Ответ точно присоединяется к состоянию клиента — ${emotion} — и связывает его с потребностью: ${need}.`;
    else if(t.includes('извин')) core='Извинение связано с конкретной ситуацией клиента, а не звучит формально. После признания неудобства сотрудник показывает, что будет сделано дальше.';
    else if(t.includes('претенз')) core='Ответ не защищается и не спорит с претензией, а фиксирует суть проблемы и переводит её в проверяемый следующий шаг.';
    else if(t.includes('обещ')) core='Ответ не даёт непроверяемого обещания и обозначает только то, что сотрудник действительно может проверить или сделать сейчас.';
    else if(t.includes('повтор')) core='Ответ учитывает, что клиент уже обращался раньше: не заставляет начинать всё заново и продолжает решение с текущей точки.';
    else if(t.includes('конфликт')) core='Ответ снижает напряжение за счёт спокойной фиксации фактов и следующего действия, не усиливая конфликт спором.';
    else core='Ответ лучше всего попадает в ситуацию клиента и ведёт разговор к понятному следующему действию.';
    const plus=[];
    if(sig.emotion) plus.push('эмоция клиента не пропущена');
    if(sig.action) plus.push('есть конкретный следующий шаг');
    if(sig.question) plus.push('уточнение связано с задачей, а не заставляет клиента повторять всё заново');
    if(sig.need) plus.push('ответ опирается на реальную потребность клиента');
    return `${core} ${plus.length?'Здесь '+plus.slice(0,2).join(' и ')+'.':''}`.trim();
  }
  function altReason(answer,correct){
    const a=softSignals(answer),c=softSignals(correct);
    let good=a.emotion?'Вариант звучит бережно и показывает, что состояние клиента замечено.':a.action?'Вариант быстро ведёт к действию и не затягивает разговор.':a.question?'Вариант пытается уточнить ситуацию до ответа.':'Вариант звучит профессионально и не конфликтует с клиентом.';
    let weak='';
    if(a.promise) weak='Но появляется обещание или ожидание результата, которое пока нельзя подтвердить.';
    else if(a.vague) weak='Но формулировка остаётся слишком общей: клиент не понимает, что именно произойдёт дальше.';
    else if(a.action&&!a.emotion&&c.emotion) weak='Но ответ слишком быстро перескакивает к действию и почти не присоединяется к эмоции клиента.';
    else if(a.emotion&&!a.action&&c.action) weak='Но одной эмпатии недостаточно: не хватает конкретного следующего шага.';
    else if(a.question&&!a.need) weak='Но вопрос слишком широкий и может заставить клиента снова объяснять уже понятный контекст.';
    else if(!a.need&&c.need) weak='Но вариант хуже попадает в реальную потребность клиента и поэтому выглядит менее точным.';
    else weak='Но по сравнению с правильным ответом он хуже связывает контекст клиента с проверяемым следующим шагом.';
    return {good,weak};
  }
  function softReviewHtml(options,correct,topic,psych){
    const correctText=String(options?.[correct]||'');
    const others=(options||[]).map((text,i)=>({text:String(text||''),i})).filter(x=>x.i!==Number(correct)).map(x=>({...x,...altReason(x.text,correctText)}));
    return `<div class="sh-soft-review sh-soft-review-v820">
      <div class="sh-soft-review-head"><span>Разбор ответа</span>${psych?.skill?`<b>🎯 ${esc(psych.skill)}</b>`:''}</div>
      <div class="sh-soft-signals">
        <div class="sh-soft-signal"><span>Эмоция клиента</span><strong>${esc(psych?.emotion||'—')}</strong></div>
        <div class="sh-soft-signal"><span>Что ему важно</span><strong>${esc(psych?.need||'—')}</strong></div>
      </div>
      <div class="sh-soft-best"><div class="sh-soft-card-title">✅ Почему правильный ответ лучший</div><div class="sh-soft-answer-quote">${esc(correctText)}</div><p>${esc(correctReason(topic,correctText,psych||{}))}</p></div>
      <div class="sh-soft-alt-grid">${others.map(x=>`<div class="sh-soft-alt-card"><div class="sh-soft-alt-title">Вариант ${x.i+1}</div><div class="sh-soft-alt-quote">${esc(x.text)}</div><div class="sh-soft-alt-good"><b>Что в нём нормально</b><span>${esc(x.good)}</span></div><div class="sh-soft-alt-weak"><b>Почему слабее</b><span>${esc(x.weak)}</span></div></div>`).join('')}</div>
    </div>`;
  }
  function hardPlainHtml(text){
    const src=norm(text); if(!src)return '';
    const clean=src.replace(/^✅\s*ПРАВИЛЬНЫЙ ОТВЕТ\s*/i,'').trim();
    const parts=clean.split(/\n{2,}/).map(x=>x.trim()).filter(Boolean); if(!parts.length)return '';
    const first=parts.shift();
    const cards=parts.map((p,idx)=>{let title='Почему',icon='🧩';if(/[=−+\-×÷]\s*\d|₽|остаток|расч[её]т/i.test(p)){title='Расчёт';icon='🧮'}else if(/важно|исключен|обратите|нельзя ориентироваться/i.test(p)){title='Важно';icon='⚠️'}else if(idx>0){title='Логика решения';icon='📌'}return `<div class="sh-hard-review-step"><div class="sh-hard-review-step-title">${icon} ${title}</div><p>${esc(p).replace(/\n/g,'<br>')}</p></div>`}).join('');
    return `<div class="sh-hard-review"><div class="sh-hard-review-answer"><span>✅ Правильный ответ</span><strong>${esc(first).replace(/\n/g,'<br>')}</strong></div>${cards}</div>`;
  }
  function hardDialogueHtml(text){
    const e=parseDialogueExplanation(text||'');
    if(!e||e.softPsych)return hardPlainHtml(text);
    const blocks=e.correct?.blocks||[],wrong=e.wrong||[];
    if(!blocks.length&&!wrong.length&&!e.procedurePath)return hardPlainHtml(text);
    return `<div class="sh-hard-review sh-hard-dialogue-review">
      ${blocks.length?`<div class="sh-hard-review-section-title good">✅ Почему правильный ответ</div>${blocks.map(b=>`<div class="sh-hard-review-step"><div class="sh-hard-review-step-title">${esc(b.title)}</div>${b.text?`<p>${esc(b.text)}</p>`:''}</div>`).join('')}`:''}
      ${wrong.length?`<div class="sh-hard-review-section-title bad">Почему другие варианты слабее</div><div class="sh-hard-wrong-grid">${wrong.map(w=>`<div class="sh-hard-wrong-card"><b>Вариант ${esc(w.answer)}</b><div><span>Что хорошо</span><p>${esc(w.good)}</p></div><div><span>Где ошибка</span><p>${esc(w.mistake)}</p></div><div><span>Риск</span><p>${esc(w.risk)}</p></div></div>`).join('')}</div>`:''}
      ${e.procedurePath?`<div class="sh-hard-source-card"><span>📚 Где проверить</span><strong>${esc(e.procedureName||'Процедура')}</strong><small>${esc(e.procedurePath)}</small></div>`:''}
    </div>`;
  }
  function attemptExplanation(q,a){
    const text=String(q?.explanation||'');if(!text)return '';
    if(String(a?.section||'')==='soft'&&Array.isArray(q.options)&&q.options.length){const p=parseDialogueExplanation(text);return softReviewHtml(q.options,Number(q.correct),a.topic,p?.softPsych||{})}
    if(String(a?.section||'')==='hard')return /ПОЧЕМУ ЭТО ЛУЧШИЙ ВАРИАНТ|ПОЧЕМУ ОСТАЛЬНЫЕ ВАРИАНТЫ СЛАБЕЕ|ГДЕ ПРОВЕРИТЬ/i.test(norm(text))?hardDialogueHtml(text):hardPlainHtml(text);
    return `<div class="explain">${esc(norm(text)).replace(/\n/g,'<br>')}</div>`;
  }

  const baseAnswerDialogue=window.answerDialogue;
  window.answerDialogue=function(i){
    baseAnswerDialogue(i);
    try{
      const r=S.currentRun,detail=r?.details?.[r.details.length-1],box=document.querySelector('#runFeedback .sh-soft-review');
      if(box&&r?.x?.section==='soft'&&detail?.options?.length){const p=parseDialogueExplanation(detail.explanation||'');box.outerHTML=softReviewHtml(detail.options,Number(detail.correct),r.x.topic,p?.softPsych||{})}
    }catch(e){console.warn('V8.20 soft review patch',e)}
  };

  const baseHardNumeric=window.renderHardNumeric;
  window.renderHardNumeric=function(){baseHardNumeric();try{const el=document.querySelector('.sh-hard-num-explain');if(el)el.outerHTML=hardPlainHtml(el.textContent||'')}catch(e){console.warn(e)}};
  const baseHardScenario=window.renderHardScenario;
  window.renderHardScenario=function(){baseHardScenario();try{const el=document.querySelector('.sh-hard-sc-explain');if(el)el.outerHTML=hardPlainHtml(el.textContent||'')}catch(e){console.warn(e)}};

  const baseAttemptReview=window.openAttemptReview;
  window.openAttemptReview=function(id,returnLogin='',managerLogin=''){
    baseAttemptReview(id,returnLogin,managerLogin);
    try{
      const a=S.attempts.find(x=>x.id===id),d=attemptDetails(a),items=[...document.querySelectorAll('.modal-card .review-item')];
      items.forEach((item,idx)=>{const q=d[idx],old=item.querySelector('.explain');if(q?.explanation&&old)old.outerHTML=attemptExplanation(q,a)});
    }catch(e){console.warn('V8.20 attempt review patch',e)}
  };
})();
