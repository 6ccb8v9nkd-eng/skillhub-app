/* SkillHub hotfix: Soft chooser — manual trainers + AI pilot. Ordinary fixed-choice dialogues are removed from the training hub. */
(function(){
  'use strict';

  const baseOpenSection=window.openSection;

  function allSoft(){
    return (typeof S!=='undefined'&&Array.isArray(S.content)?S.content:[])
      .filter(x=>x&&x.status==='published'&&x.section==='soft');
  }
  function manuals(){return allSoft().filter(x=>x.type==='manual');}

  function nextBySeen(rows){
    if(!rows.length)return null;
    const seen=typeof seenContentMap==='function'?seenContentMap():new Map();
    const unseen=rows.filter(x=>!seen.has(x.id));
    if(unseen.length)return unseen[Math.floor(Math.random()*unseen.length)];
    return rows.slice().sort((a,b)=>(seen.get(a.id)||0)-(seen.get(b.id)||0))[0]||rows[0];
  }
  function nextManual(){return nextBySeen(manuals());}

  function renderChooser(){
    const card=document.getElementById('modalCard');if(!card)return;
    card.innerHTML=`
      <div class="modal-head">
        <div><h2>Soft Skills</h2><div class="muted small">Выберите формат тренировки</div></div>
        <button class="btn secondary" onclick="closeModal()">✕</button>
      </div>
      <div class="sh-soft-choice-grid">
        <button class="sh-soft-choice-card" onclick="shSoftManualIntro()">
          <span class="sh-soft-choice-icon">✍️</span>
          <span class="sh-soft-choice-copy"><b>Ручные тренажёры</b><small>Свободный ответ с проверкой руководителя</small><em>${manuals().length} тренажёров</em></span>
          <span class="sh-soft-choice-arrow">→</span>
        </button>
      </div>`;
  }

  function renderManualIntro(){
    const card=document.getElementById('modalCard');if(!card)return;
    const seen=typeof seenContentMap==='function'?seenContentMap():new Map();
    const total=manuals().length;
    const done=manuals().filter(x=>seen.has(x.id)).length;
    card.innerHTML=`
      <div class="modal-head">
        <div><button class="sh-soft-back" onclick="shSoftBackToChooser()">← Назад</button><h2>Ручные тренажёры</h2></div>
        <button class="btn secondary" onclick="closeModal()">✕</button>
      </div>
      <div class="sh-soft-start-card">
        <div class="sh-soft-start-icon">✍️</div>
        <h3>Ручные тренажёры Soft Skills</h3>
        <p>Вы формулируете ответ самостоятельно. После отправки работа уходит руководителю на проверку.</p>
        <div class="meta">Пройдено ${done} из ${total}</div>
        <button class="btn primary full" onclick="shSoftStartManual()">Начать</button>
      </div>`;
  }

  window.openSoftHub=function(){showModal('<div></div>');renderChooser();};
  window.shSoftBackToChooser=function(){renderChooser();};
  window.shSoftManualIntro=function(){renderManualIntro();};
  window.shSoftStartManual=function(){
    const x=nextManual();
    if(!x){toast('В Soft Skills пока нет ручных тренажёров');return}
    closeModal();
    if(typeof startManualContent==='function'){startManualContent(x.id);return}
    if(typeof openManualSoft==='function'){openManualSoft();return}
    toast('Ручной тренажёр сейчас недоступен');
  };
  window.shSoftOpenManual=window.shSoftManualIntro;

  // Legacy ordinary-dialogue entry points are intentionally disabled so old cached buttons cannot start them.
  window.shSoftOrdinaryIntro=function(){renderChooser();toast('Обычные Soft-тренировки убраны. Используйте ручной или ИИ-тренажёр.');};
  window.shSoftStartOrdinary=window.shSoftOrdinaryIntro;

  window.openSection=function(sec){
    if(sec==='soft'){openSoftHub();return}
    return baseOpenSection.apply(this,arguments);
  };

  if(!document.getElementById('shSoftChooserStyle')){
    const s=document.createElement('style');s.id='shSoftChooserStyle';s.textContent=`
      .sh-soft-choice-grid{display:grid;gap:12px;margin-top:8px}
      .sh-soft-choice-card{width:100%;border:1px solid var(--line);background:var(--panel);color:var(--ink);border-radius:18px;padding:18px;display:grid;grid-template-columns:auto 1fr auto;gap:14px;align-items:center;text-align:left;cursor:pointer}
      .sh-soft-choice-card:hover{border-color:var(--primary)}
      .sh-soft-choice-icon{font-size:30px}.sh-soft-choice-copy{display:grid;gap:4px}.sh-soft-choice-copy b{font-size:18px}.sh-soft-choice-copy small{color:var(--muted);line-height:1.4}.sh-soft-choice-copy em{font-style:normal;color:var(--muted);font-size:12px}.sh-soft-choice-arrow{font-size:22px;color:var(--primary)}
      .sh-soft-start-card{border:1px solid var(--line);background:var(--panel);border-radius:18px;padding:22px;text-align:center}.sh-soft-start-icon{font-size:38px;margin-bottom:8px}.sh-soft-start-card h3{margin:4px 0 8px}.sh-soft-start-card p{color:var(--muted);line-height:1.5;max-width:560px;margin:0 auto 10px}.sh-soft-start-card .btn{margin-top:18px}
      .sh-soft-back{border:0;background:transparent;color:var(--primary);font:inherit;font-weight:800;padding:0 0 5px;cursor:pointer}
      @media(max-width:620px){.sh-soft-choice-card{padding:15px}.sh-soft-choice-copy b{font-size:17px}}
    `;document.head.appendChild(s);
  }

  console.info('SkillHub: Soft chooser now contains manual trainers; AI pilot is injected separately');
})();

(function(){
  function loadRunner(){
    if(document.getElementById('shMonthlyRunnerLoader'))return;
    const r=document.createElement('script');
    r.id='shMonthlyRunnerLoader';
    r.src='./hotfix-monthly-runner-20261006.js?v=1';
    document.head.appendChild(r);
  }
  if(document.getElementById('shMonthlyCheckLoader')){
    if(typeof window.shMonthlyBegin==='function')loadRunner();
    else document.getElementById('shMonthlyCheckLoader').addEventListener('load',loadRunner,{once:true});
  }else{
    const s=document.createElement('script');
    s.id='shMonthlyCheckLoader';
    s.src='./hotfix-monthly-check-20261006.js?v=2';
    s.addEventListener('load',loadRunner,{once:true});
    document.head.appendChild(s);
  }

  if(!document.getElementById('shSoftCompactFeedbackLoader')){
    const f=document.createElement('script');
    f.id='shSoftCompactFeedbackLoader';
    f.src='./hotfix-soft-compact-feedback-20261006.js?v=4';
    document.head.appendChild(f);
  }

  if(!document.getElementById('shTypingProgressLoader')){
    const t=document.createElement('script');
    t.id='shTypingProgressLoader';
    t.src='./hotfix-typing-progress-20261008.js?v=1';
    document.head.appendChild(t);
  }
})();
