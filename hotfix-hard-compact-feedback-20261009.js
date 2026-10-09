/* SkillHub Hard Skills result polish — 2026-10-09
   UI only: does not change scoring, content, attempts or training mechanics.
   - removes the redundant "Коротко по результату" block if an older cached renderer adds it;
   - collapses the detailed review and each step by default;
   - shows the actual text of alternative answers before explaining why they are weaker;
   - reduces vertical spacing on mobile.
*/
(function(){
  'use strict';

  const $run=()=>document.getElementById('page-run');
  const norm=s=>String(s||'').replace(/\s+/g,' ').trim();
  const hardRun=()=>{
    try{return S?.currentRun?.x?.section==='hard'&&!!S.currentRun?.finished}catch(_){return false}
  };

  function removeShortResult(root){
    const nodes=[...root.querySelectorAll('h1,h2,h3,h4,b,strong,span')];
    for(const el of nodes){
      if(norm(el.textContent).toLowerCase()!=='коротко по результату')continue;
      const card=el.closest('.card,.sh831-result-section,section,article,div');
      if(card&&card!==root)card.remove();
    }
  }

  function detailsRows(){
    try{return Array.isArray(S?.currentRun?.details)?S.currentRun.details:[]}catch(_){return[]}
  }

  function addAlternativeTexts(root){
    const rows=detailsRows();
    root.querySelectorAll('.sh831-review-step').forEach((stepEl,stepIndex)=>{
      const d=rows[stepIndex]||{};
      const options=Array.isArray(d.options)?d.options:[];
      stepEl.querySelectorAll('.sh837-hard-wrong').forEach(card=>{
        if(card.dataset.shOptionTextDone==='1')return;
        card.dataset.shOptionTextDone='1';
        const head=card.querySelector('.sh837-hard-card-head');
        const m=norm(head?.textContent).match(/Вариант\s*(\d+)/i);
        const n=m?Number(m[1]):NaN;
        const text=Number.isFinite(n)?String(options[n-1]||'').trim():'';
        if(text&&head){
          const quote=document.createElement('div');
          quote.className='sh-hard-option-text';
          quote.textContent=text;
          head.insertAdjacentElement('afterend',quote);
        }

        const minis=[...card.querySelectorAll(':scope > .sh837-hard-mini')];
        if(minis.length&&!card.querySelector(':scope > details.sh-hard-alt-details')){
          const dEl=document.createElement('details');
          dEl.className='sh-hard-alt-details';
          const s=document.createElement('summary');
          s.textContent='Почему слабее';
          dEl.appendChild(s);
          const body=document.createElement('div');
          body.className='sh-hard-alt-body';
          minis.forEach(x=>body.appendChild(x));
          dEl.appendChild(body);
          card.appendChild(dEl);
        }
      });
    });
  }

  function collapseSteps(root){
    root.querySelectorAll('.sh831-review-step').forEach(step=>{
      if(step.dataset.shCompactStep==='1')return;
      step.dataset.shCompactStep='1';
      const head=step.querySelector(':scope > .sh831-review-step-head');
      if(!head)return;
      const rest=[...step.children].filter(x=>x!==head);
      if(!rest.length)return;
      const det=document.createElement('details');
      det.className='sh-hard-step-details';
      const sum=document.createElement('summary');
      sum.textContent='Посмотреть разбор';
      det.appendChild(sum);
      const body=document.createElement('div');
      body.className='sh-hard-step-body';
      rest.forEach(x=>body.appendChild(x));
      det.appendChild(body);
      step.appendChild(det);
    });
  }

  function collapseWholeReview(root){
    const section=root.querySelector('.sh831-result-section');
    if(section&&!section.closest('details.sh-hard-review-details')){
      const det=document.createElement('details');
      det.className='card sh-hard-review-details';
      const sum=document.createElement('summary');
      sum.textContent='Посмотреть подробнее';
      section.parentNode.insertBefore(det,section);
      const h=section.querySelector(':scope > h3');
      if(h)h.remove();
      det.appendChild(sum);
      det.appendChild(section);
    }

    // If another renderer already provides this accordion, keep it closed initially.
    root.querySelectorAll('details').forEach(d=>{
      const s=norm(d.querySelector(':scope > summary')?.textContent).toLowerCase();
      if(s==='посмотреть подробнее'&&!d.dataset.shInitialClose){
        d.dataset.shInitialClose='1';
        d.open=false;
      }
    });
  }

  function compactTop(root){
    const head=root.querySelector('.sh831-result-head');
    if(head)head.classList.add('sh-hard-result-head-compact');
  }

  function optimize(){
    const root=$run();
    if(!root||!hardRun())return;
    root.classList.add('sh-hard-compact-page');
    removeShortResult(root);
    addAlternativeTexts(root);
    collapseSteps(root);
    collapseWholeReview(root);
    compactTop(root);
  }

  if(!document.getElementById('shHardCompactFeedbackStyle')){
    const st=document.createElement('style');
    st.id='shHardCompactFeedbackStyle';
    st.textContent=`
      .sh-hard-compact-page .sh-hard-result-head-compact{padding:16px 18px!important;gap:14px!important;margin-bottom:12px!important}
      .sh-hard-compact-page .sh-hard-result-head-compact p{display:none!important}
      .sh-hard-compact-page .sh831-score strong{font-size:42px!important;line-height:1!important}
      .sh-hard-review-details{padding:0!important;overflow:hidden;margin:12px 0!important}
      .sh-hard-review-details>summary{cursor:pointer;list-style:none;padding:15px 18px;font-weight:850;font-size:17px;display:flex;align-items:center;justify-content:space-between;color:var(--primary)}
      .sh-hard-review-details>summary::-webkit-details-marker{display:none}
      .sh-hard-review-details>summary:after{content:'⌄';font-size:18px;transition:transform .18s ease}
      .sh-hard-review-details[open]>summary:after{transform:rotate(180deg)}
      .sh-hard-review-details>.sh831-result-section{margin:0!important;padding:0 12px 12px!important}
      .sh-hard-compact-page .sh831-review-step{padding:12px!important;margin:8px 0!important;border-radius:14px!important}
      .sh-hard-compact-page .sh831-review-step-head{margin:0!important}
      .sh-hard-step-details>summary,.sh-hard-alt-details>summary{cursor:pointer;list-style:none;font-weight:800;color:var(--muted);padding:10px 0 2px}
      .sh-hard-step-details>summary::-webkit-details-marker,.sh-hard-alt-details>summary::-webkit-details-marker{display:none}
      .sh-hard-step-details>summary:after,.sh-hard-alt-details>summary:after{content:'  +';color:var(--primary)}
      .sh-hard-step-details[open]>summary:after,.sh-hard-alt-details[open]>summary:after{content:'  −'}
      .sh-hard-step-body{padding-top:8px}
      .sh-hard-compact-page .sh837-hard-explain{margin-top:10px!important}
      .sh-hard-compact-page .sh837-hard-card{padding:11px!important;margin-top:8px!important;border-radius:13px!important}
      .sh-hard-compact-page .sh837-hard-subtitle{margin:12px 0 6px!important}
      .sh-hard-compact-page .sh837-hard-wrong-grid{gap:8px!important}
      .sh-hard-option-text{font-size:14px;line-height:1.42;font-weight:650;margin:8px 0 2px;padding:9px 10px;border-radius:10px;background:color-mix(in srgb,var(--panel) 78%,var(--primary) 5%);border:1px solid var(--line)}
      .sh-hard-alt-body{padding-top:5px}
      .sh-hard-compact-page .sh837-hard-mini{padding:9px 10px!important;margin-top:6px!important}
      .sh-hard-compact-page .sh837-hard-mini p,.sh-hard-compact-page .sh837-hard-card p{margin:4px 0 0!important;line-height:1.42!important}
      @media(max-width:620px){
        .sh-hard-compact-page .sh-hard-result-head-compact{padding:14px!important}
        .sh-hard-compact-page .sh-hard-result-head-compact h2{font-size:25px!important;line-height:1.12!important;margin:5px 0!important}
        .sh-hard-compact-page .sh831-score strong{font-size:36px!important}
        .sh-hard-review-details>summary{padding:13px 14px;font-size:16px}
        .sh-hard-review-details>.sh831-result-section{padding:0 8px 8px!important}
        .sh-hard-compact-page .sh831-review-step{padding:10px!important}
      }
    `;
    document.head.appendChild(st);
  }

  let timer=null;
  const page=$run();
  if(page){
    const obs=new MutationObserver(()=>{
      clearTimeout(timer);
      timer=setTimeout(optimize,25);
    });
    obs.observe(page,{childList:true,subtree:true});
  }

  // Also catch a result that was rendered before this hotfix finished loading.
  setTimeout(optimize,0);
  console.info('SkillHub: compact Hard Skills feedback enabled');
})();
