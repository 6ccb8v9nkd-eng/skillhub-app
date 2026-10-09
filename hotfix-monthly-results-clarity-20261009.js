/* SkillHub — monthly assessment result clarity — 2026-10-09
   Makes pass/fail explicit in manager results and makes Hard answer review easier to scan.
   UI-only: does not change scoring, answers, attempts or database data.
*/
(function(){
  'use strict';
  if(window.__shMonthlyResultsClarity20261009)return;
  window.__shMonthlyResultsClarity20261009=true;

  function pctFrom(text){
    const m=String(text||'').match(/(-?\d+(?:[.,]\d+)?)\s*%/);
    return m?Number(m[1].replace(',','.')):NaN;
  }

  function passFrom(root){
    const text=root?.querySelector('header p')?.textContent||'';
    const m=text.match(/проходн(?:ой|ая)\s+(\d+(?:[.,]\d+)?)\s*%/i);
    return m?Number(m[1].replace(',','.')):75;
  }

  function polishResults(root){
    if(!root)return;

    const closeBtn=root.querySelector('header button[onclick*="closeModal"]');
    if(closeBtn){
      closeBtn.textContent='Закрыть';
      closeBtn.classList.add('shmr-close');
      closeBtn.setAttribute('aria-label','Закрыть результаты');
    }

    const pass=passFrom(root);
    root.querySelectorAll('tbody tr').forEach(tr=>{
      const cells=tr.querySelectorAll('td');
      if(cells.length<4)return;
      const cell=cells[3];
      const score=pctFrom(cell.textContent);
      cell.querySelector('.shmr-result-status')?.remove();
      if(!Number.isFinite(score))return;
      const passed=score>=pass;
      const badge=document.createElement('span');
      badge.className='shmr-result-status '+(passed?'good':'bad');
      badge.textContent=passed?'Пройдена':'Не пройдена';
      cell.appendChild(badge);
    });
  }

  function polishMistakes(root){
    (root||document).querySelectorAll('.shfb-mistake').forEach(box=>{
      const smalls=[...box.querySelectorAll('small')];
      smalls.forEach(el=>{
        const t=String(el.textContent||'').trim();
        if(/^Выбрано:/i.test(t)){
          el.classList.add('shmr-chosen');
          el.textContent='Ответ сотрудника: '+t.replace(/^Выбрано:\s*/i,'');
        }else if(/^Правильно:/i.test(t)){
          el.classList.add('shmr-correct');
          el.textContent='Верный ответ: '+t.replace(/^Правильно:\s*/i,'');
        }
      });
    });
  }

  const baseResults=window.shMonthlyCleanResults;
  if(typeof baseResults==='function'){
    window.shMonthlyCleanResults=async function(){
      const result=await baseResults.apply(this,arguments);
      requestAnimationFrame(()=>{
        const root=document.querySelector('#modalCard .shmc-results');
        polishResults(root);
        polishMistakes(root);
      });
      return result;
    };
  }

  const target=document.getElementById('modalCard')||document.body;
  const observer=new MutationObserver(()=>{
    const root=document.querySelector('#modalCard .shmc-results');
    if(root)polishResults(root);
    polishMistakes(document.getElementById('modalCard')||document);
  });
  observer.observe(target,{subtree:true,childList:true});
  polishMistakes(document);

  const st=document.createElement('style');
  st.id='shMonthlyResultsClarityStyle';
  st.textContent=`
    .shmc-results td:nth-child(4){vertical-align:middle}
    .shmr-result-status{display:block;width:max-content;margin-top:6px;padding:4px 9px;border-radius:999px;font-size:12px;font-weight:900;line-height:1.2;white-space:nowrap;border:1px solid var(--line)}
    .shmr-result-status.good{color:#34c759;border-color:color-mix(in srgb,#34c759 52%,var(--line));background:color-mix(in srgb,#34c759 10%,var(--panel))}
    .shmr-result-status.bad{color:#ff6961;border-color:color-mix(in srgb,#ff453a 55%,var(--line));background:color-mix(in srgb,#ff453a 10%,var(--panel))}

    .shmc-results header .shmr-close{width:auto!important;min-width:96px!important;align-self:flex-start}

    .shfb-details[open] summary{padding-bottom:10px;margin-bottom:2px;border-bottom:1px solid var(--line)}
    .shfb-mistakes{gap:10px!important;margin-top:10px!important}
    .shfb-mistake{gap:8px!important;padding:12px!important;border:1px solid var(--line);border-radius:12px!important;background:var(--panel)!important}
    .shfb-mistake>b{display:block;line-height:1.35;margin-bottom:1px;color:var(--text)}
    .shfb-mistake .shmr-chosen,.shfb-mistake .shmr-correct{display:block!important;padding:8px 10px;border-radius:8px;font-size:13px;line-height:1.35;font-weight:750!important;color:var(--text)!important}
    .shfb-mistake .shmr-chosen{border-left:3px solid #ff453a;background:color-mix(in srgb,#ff453a 8%,var(--panel2))}
    .shfb-mistake .shmr-correct{border-left:3px solid #34c759;background:color-mix(in srgb,#34c759 8%,var(--panel2))}

    @media (max-width:700px){
      .shmc-results header .shmr-close{align-self:flex-end!important;min-width:0!important;padding:8px 12px!important;font-size:13px!important}
      .shmr-result-status{font-size:11px;padding:4px 8px}
      .shfb-mistake{padding:11px!important}
      .shfb-mistake .shmr-chosen,.shfb-mistake .shmr-correct{font-size:12.5px}
    }
  `;
  document.head.appendChild(st);

  console.info('SkillHub: monthly assessment result clarity enabled');
})();
