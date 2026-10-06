/* SkillHub: compact Soft Skills feedback with optional detailed explanation. */
(function(){
  'use strict';

  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function norm(v){return String(v??'').replace(/\s+/g,' ').trim()}
  function clamp(v,n=180){const s=norm(v);return s.length>n?s.slice(0,n-1).trimEnd()+'…':s}

  function softRows(){
    try{return (Array.isArray(S?.content)?S.content:[]).filter(x=>x&&x.status==='published'&&x.section==='soft'&&x.type==='dialogue')}
    catch(_){return[]}
  }

  function explanations(){
    const out=[];
    softRows().forEach(row=>{
      (row?.payload?.steps||[]).forEach(step=>{
        const raw=String(step?.explanation||'').trim();
        if(raw)out.push(raw);
      });
    });
    return [...new Set(out)];
  }

  function compactText(raw){
    const s=String(raw||'').trim();
    if(!s)return 'Главная мысль ответа сохранена.';
    const strength=s.match(/(?:✅\s*)?(?:ПОЧЕМУ СИЛЬНЕЕ|ПОЧЕМУ ЭТО ЛУЧШИЙ ВАРИАНТ)\s*\n?([\s\S]*?)(?=\n\s*(?:⚠️|📌|📍|🎯)|$)/i);
    let text=(strength?.[1]||s).replace(/^\s*\d+[.)]\s*/gm,'').replace(/\s+/g,' ').trim();
    const sentences=text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[];
    text=sentences.slice(0,2).join(' ').trim();
    return clamp(text,210)||'Посмотрите, почему этот вариант сильнее остальных.';
  }

  function findCandidate(raw){
    const root=document.getElementById('modalCard')||document.getElementById('page-run')||document.body;
    const target=norm(raw),anchor=target.slice(0,70);
    if(!anchor)return null;
    const nodes=[...root.querySelectorAll('div,p,section,article,aside')].filter(el=>!el.dataset.shSoftCompactFeedback);
    let best=null,bestLen=Infinity;
    for(const el of nodes){
      if(el.closest('[data-sh-soft-compact-feedback]'))continue;
      const t=norm(el.textContent);
      if(!t.includes(anchor))continue;
      if(t.length>Math.max(target.length*1.9,target.length+350))continue;
      if(t.length<bestLen){best=el;bestLen=t.length}
    }
    return best;
  }

  function compactInlineExplanations(){
    explanations().forEach(raw=>{
      const node=findCandidate(raw);if(!node)return;
      const full=String(raw).trim(),short=compactText(full);
      node.dataset.shSoftCompactFeedback='1';
      node.classList.add('sh-soft-compact-feedback');
      node.innerHTML=`<div class="sh-soft-feedback-short"><b>Коротко</b><p>${esc(short)}</p></div><button type="button" class="sh-soft-feedback-toggle" aria-expanded="false">Посмотреть подробнее</button><div class="sh-soft-feedback-details hidden">${esc(full).replace(/\n/g,'<br>')}</div>`;
      const btn=node.querySelector('.sh-soft-feedback-toggle'),details=node.querySelector('.sh-soft-feedback-details');
      btn?.addEventListener('click',()=>{const open=details.classList.toggle('hidden')===false;btn.textContent=open?'Скрыть подробности':'Посмотреть подробнее';btn.setAttribute('aria-expanded',open?'true':'false')});
    });
  }

  function themesFromFailed(steps){
    const text=norm(steps.map(x=>x.textContent).join(' ')).toLowerCase();
    const themes=[];
    const add=s=>{if(!themes.includes(s)&&themes.length<3)themes.push(s)};
    if(/заново|повтор|ещ[её] раз|всё сначала/.test(text))add('не просить клиента повторять то, что уже есть в истории');
    if(/скорее всего|возможно|гадать|предполож/.test(text))add('не предполагать причину без проверки фактов');
    if(/руководител|передат|профильн|эскал/.test(text))add('не передавать вопрос дальше раньше времени');
    if(/срок|обещ|ожидайте|быстр/.test(text))add('не давать неподтверждённых обещаний и точнее обозначать следующий шаг');
    if(/истори|контекст|прошл/.test(text))add('использовать уже известный контекст разговора');
    if(/провер|свер/.test(text))add('сначала проверить данные, затем давать уверенный ответ');
    if(!themes.length)add('точнее выбирать следующий шаг и не добавлять клиенту лишних действий');
    return themes;
  }

  function compactFinalReview(){
    const wrap=document.querySelector('.sh831-result-wrap');
    if(!wrap||wrap.dataset.shSoftOverallCompact)return;
    const section=wrap.querySelector('.sh831-result-section');
    if(!section)return;
    wrap.dataset.shSoftOverallCompact='1';
    wrap.classList.add('sh-soft-result-compact');

    const steps=[...section.querySelectorAll('.sh831-review-step')];
    const failed=steps.filter(step=>!/сильный выбор/i.test(norm(step.querySelector('.sh831-review-step-head b')?.textContent)));
    const total=steps.length;
    const good=total-failed.length;
    const themes=themesFromFailed(failed);

    const summary=document.createElement('div');
    summary.className='card sh-soft-overall-summary';
    summary.innerHTML=failed.length
      ? `<span class="sh-soft-summary-kicker">Коротко по результату</span><h3>${good} из ${total} сильных решений</h3><p>Основные точки роста: ${esc(themes.join('; '))}.</p>`
      : `<span class="sh-soft-summary-kicker">Коротко по результату</span><h3>Сильный диалог</h3><p>Вы последовательно держали фокус на ситуации клиента, не добавляли лишних действий и давали понятный следующий шаг.</p>`;

    const detail=document.createElement('details');
    detail.className='card sh-soft-full-review';
    detail.innerHTML='<summary><span>Посмотреть подробнее</span><i class="sh-soft-disclosure" aria-hidden="true">⌄</i></summary><div class="sh-soft-full-review-body"></div>';
    const body=detail.querySelector('.sh-soft-full-review-body');
    const oldTitle=section.querySelector(':scope > h3');if(oldTitle)oldTitle.remove();
    while(section.firstChild)body.appendChild(section.firstChild);
    section.replaceWith(summary,detail);

    const criteria=wrap.querySelector('.sh831-criteria');
    if(criteria)body.appendChild(criteria);

    const strong=wrap.querySelector('.sh831-strong-dialog');
    if(strong){
      const sm=strong.querySelector('summary');
      if(sm)sm.innerHTML='<span>Как мог выглядеть полностью сильный диалог</span><i class="sh-soft-disclosure" aria-hidden="true">⌄</i>';
      strong.classList.add('sh-soft-strong-dialog-compact');
    }
  }

  function decorate(){compactFinalReview();compactInlineExplanations()}

  if(!document.getElementById('shSoftCompactFeedbackStyle')){
    const style=document.createElement('style');style.id='shSoftCompactFeedbackStyle';
    style.textContent=`
      .sh-soft-compact-feedback{padding:14px!important;border-radius:15px!important}.sh-soft-feedback-short{display:grid;gap:5px}.sh-soft-feedback-short b{font-size:12px;color:var(--primary);text-transform:uppercase;letter-spacing:.05em}.sh-soft-feedback-short p{margin:0!important;line-height:1.45;color:var(--ink)}.sh-soft-feedback-toggle{margin-top:9px;border:0;background:transparent;color:var(--primary);font:inherit;font-size:13px;font-weight:850;padding:0;cursor:pointer;text-align:left}.sh-soft-feedback-details{margin-top:11px;padding-top:11px;border-top:1px solid var(--line);color:var(--muted);font-size:13px;line-height:1.55}.sh-soft-feedback-details.hidden{display:none!important}
      .sh-soft-overall-summary{padding:18px!important;margin-top:8px}.sh-soft-summary-kicker{display:block;color:var(--primary);font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;margin-bottom:7px}.sh-soft-overall-summary h3{margin:0 0 7px;font-size:20px}.sh-soft-overall-summary p{margin:0;color:var(--muted);line-height:1.5}
      .sh-soft-full-review{padding:0!important;overflow:hidden}.sh-soft-full-review>summary,.sh-soft-strong-dialog-compact>summary{list-style:none;cursor:pointer;padding:16px 18px;font-weight:900;color:var(--primary);display:flex;align-items:center;justify-content:space-between;gap:14px}.sh-soft-full-review>summary::-webkit-details-marker,.sh-soft-strong-dialog-compact>summary::-webkit-details-marker{display:none}.sh-soft-full-review>summary span,.sh-soft-strong-dialog-compact>summary span{min-width:0}.sh-soft-disclosure{font-style:normal;font-size:28px;line-height:1;color:var(--primary);flex:0 0 auto;transform:rotate(0deg);transition:transform .18s ease}.sh-soft-full-review[open]>summary .sh-soft-disclosure,.sh-soft-strong-dialog-compact[open]>summary .sh-soft-disclosure{transform:rotate(180deg)}.sh-soft-full-review[open]>summary,.sh-soft-strong-dialog-compact[open]>summary{border-bottom:1px solid var(--line)}.sh-soft-full-review-body{padding:16px;display:grid;gap:12px}.sh-soft-full-review-body .sh831-review-step{margin:0}.sh-soft-full-review-body .sh831-criteria{margin:0}.sh-soft-strong-dialog-compact{margin-top:10px}.sh-soft-result-compact .sh831-result-actions{margin-top:14px}
      @media(max-width:620px){.sh-soft-overall-summary{padding:15px!important}.sh-soft-full-review>summary,.sh-soft-strong-dialog-compact>summary{padding:14px 15px}.sh-soft-full-review-body{padding:12px}.sh-soft-disclosure{font-size:26px}}
    `;document.head.appendChild(style);
  }

  const observer=new MutationObserver(()=>{clearTimeout(decorate.t);decorate.t=setTimeout(decorate,35)});
  observer.observe(document.body,{subtree:true,childList:true});
  setTimeout(decorate,0);setTimeout(decorate,350);
  console.info('SkillHub: overall compact Soft feedback enabled');
})();