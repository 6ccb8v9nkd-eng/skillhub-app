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
    let text=(strength?.[1]||s)
      .replace(/^\s*\d+[.)]\s*/gm,'')
      .replace(/\s+/g,' ')
      .trim();
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
    const exps=explanations();
    if(!exps.length)return;
    exps.forEach(raw=>{
      const node=findCandidate(raw);if(!node)return;
      const full=String(raw).trim(),short=compactText(full);
      node.dataset.shSoftCompactFeedback='1';
      node.classList.add('sh-soft-compact-feedback');
      node.innerHTML=`<div class="sh-soft-feedback-short"><b>Коротко</b><p>${esc(short)}</p></div><button type="button" class="sh-soft-feedback-toggle" aria-expanded="false">Посмотреть подробнее</button><div class="sh-soft-feedback-details hidden">${esc(full).replace(/\n/g,'<br>')}</div>`;
      const btn=node.querySelector('.sh-soft-feedback-toggle');
      const details=node.querySelector('.sh-soft-feedback-details');
      btn?.addEventListener('click',()=>{
        const open=details.classList.toggle('hidden')===false;
        btn.textContent=open?'Скрыть подробности':'Посмотреть подробнее';
        btn.setAttribute('aria-expanded',open?'true':'false');
      });
    });
  }

  function compactFinalReview(){
    const wrap=document.querySelector('.sh831-result-wrap');
    if(!wrap)return;
    wrap.classList.add('sh-soft-result-compact');

    wrap.querySelectorAll('.sh831-review-step').forEach(step=>{
      if(step.dataset.shSoftReviewCompact)return;
      step.dataset.shSoftReviewCompact='1';
      const head=step.querySelector('.sh831-review-step-head');
      if(!head)return;
      const status=norm(head.querySelector('b')?.textContent);
      const ok=/сильный/i.test(status);
      const chosen=norm(step.querySelector('.sh831-msg.sh831-worker div:last-child')?.textContent);
      const better=norm(step.querySelector('.sh831-better strong')?.textContent);
      const brief=document.createElement('div');
      brief.className='sh-soft-step-brief '+(ok?'good':'warn');
      brief.innerHTML=ok
        ? `<b>Хороший ответ</b><span>${esc(clamp(chosen,145)||'Вы выбрали сильный вариант.')}</span>`
        : `<b>Можно лучше</b><span>${better?`Сильнее: ${esc(clamp(better,155))}`:'В этом шаге есть более сильный вариант ответа.'}</span>`;

      const details=document.createElement('details');
      details.className='sh-soft-step-details';
      details.innerHTML='<summary>Посмотреть подробнее</summary><div class="sh-soft-step-details-body"></div>';
      const body=details.querySelector('.sh-soft-step-details-body');
      [...step.children].filter(n=>n!==head&&n!==brief&&n!==details).forEach(n=>body.appendChild(n));
      step.appendChild(brief);
      step.appendChild(details);
    });

    const criteria=wrap.querySelector('.sh831-criteria');
    if(criteria&&!criteria.dataset.shSoftCriteriaCompact){
      criteria.dataset.shSoftCriteriaCompact='1';
      const holder=document.createElement('details');
      holder.className='card sh-soft-criteria-details';
      holder.innerHTML='<summary>Критерии оценки</summary><div class="sh-soft-criteria-body"></div>';
      holder.querySelector('.sh-soft-criteria-body').append(...criteria.childNodes);
      criteria.replaceWith(holder);
    }
  }

  function decorate(){
    compactFinalReview();
    compactInlineExplanations();
  }

  if(!document.getElementById('shSoftCompactFeedbackStyle')){
    const style=document.createElement('style');style.id='shSoftCompactFeedbackStyle';
    style.textContent=`
      .sh-soft-compact-feedback{padding:14px!important;border-radius:15px!important}
      .sh-soft-feedback-short{display:grid;gap:5px}.sh-soft-feedback-short b{font-size:12px;color:var(--primary);text-transform:uppercase;letter-spacing:.05em}.sh-soft-feedback-short p{margin:0!important;line-height:1.45;color:var(--ink)}
      .sh-soft-feedback-toggle{margin-top:9px;border:0;background:transparent;color:var(--primary);font:inherit;font-size:13px;font-weight:850;padding:0;cursor:pointer;text-align:left}.sh-soft-feedback-details{margin-top:11px;padding-top:11px;border-top:1px solid var(--line);color:var(--muted);font-size:13px;line-height:1.55}.sh-soft-feedback-details.hidden{display:none!important}
      .sh-soft-result-compact .sh831-result-section{display:grid;gap:10px}.sh-soft-result-compact .sh831-result-section>h3{margin-bottom:2px}
      .sh-soft-result-compact .sh831-review-step{padding:15px!important}.sh-soft-result-compact .sh831-review-step-head{margin-bottom:8px!important}
      .sh-soft-step-brief{display:grid;gap:4px;padding:11px 12px;border-radius:13px;background:var(--panel2);border:1px solid var(--line)}.sh-soft-step-brief b{font-size:12px;text-transform:uppercase;letter-spacing:.04em}.sh-soft-step-brief.good b{color:#5ed4ad}.sh-soft-step-brief.warn b{color:var(--primary)}.sh-soft-step-brief span{font-size:14px;line-height:1.4;color:var(--ink);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
      .sh-soft-step-details{margin-top:8px}.sh-soft-step-details>summary,.sh-soft-criteria-details>summary{cursor:pointer;color:var(--primary);font-size:13px;font-weight:850;list-style:none}.sh-soft-step-details>summary::-webkit-details-marker,.sh-soft-criteria-details>summary::-webkit-details-marker{display:none}.sh-soft-step-details[open]>summary{margin-bottom:12px}.sh-soft-step-details-body{display:grid;gap:10px}.sh-soft-step-details-body .sh831-review-chat,.sh-soft-step-details-body .sh831-better,.sh-soft-step-details-body .sh831-review-grid{margin-top:0!important}
      .sh-soft-criteria-details{padding:14px 16px!important}.sh-soft-criteria-details[open]>summary{margin-bottom:12px}.sh-soft-criteria-body{display:grid;gap:10px}
      @media(max-width:620px){.sh-soft-result-compact .sh831-review-step{padding:13px!important}.sh-soft-step-brief{padding:10px 11px}}
    `;document.head.appendChild(style);
  }

  const observer=new MutationObserver(()=>{clearTimeout(decorate.t);decorate.t=setTimeout(decorate,35)});
  observer.observe(document.body,{subtree:true,childList:true});
  setTimeout(decorate,0);setTimeout(decorate,350);
  console.info('SkillHub: compact expandable feedback enabled for Soft Skills');
})();