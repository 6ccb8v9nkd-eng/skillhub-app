/* SkillHub hotfix: Soft chooser — ordinary dialogues or manual trainers. */
(function(){
  'use strict';

  const baseOpenSection=window.openSection;

  function allSoft(){
    return (typeof S!=='undefined'&&Array.isArray(S.content)?S.content:[])
      .filter(x=>x&&x.status==='published'&&x.section==='soft');
  }
  function dialogues(){return allSoft().filter(x=>x.type==='dialogue');}
  function manuals(){return allSoft().filter(x=>x.type==='manual');}

  function nextBySeen(rows){
    if(!rows.length)return null;
    const seen=typeof seenContentMap==='function'?seenContentMap():new Map();
    const unseen=rows.filter(x=>!seen.has(x.id));
    if(unseen.length)return unseen[Math.floor(Math.random()*unseen.length)];
    return rows.slice().sort((a,b)=>(seen.get(a.id)||0)-(seen.get(b.id)||0))[0]||rows[0];
  }
  function nextDialogue(){return nextBySeen(dialogues());}
  function nextManual(){return nextBySeen(manuals());}

  function renderChooser(){
    const card=document.getElementById('modalCard');if(!card)return;
    card.innerHTML=`
      <div class="modal-head">
        <div><h2>Soft Skills</h2><div class="muted small">Выберите формат тренировки</div></div>
        <button class="btn secondary" onclick="closeModal()">✕</button>
      </div>
      <div class="sh-soft-choice-grid">
        <button class="sh-soft-choice-card" onclick="shSoftOrdinaryIntro()">
          <span class="sh-soft-choice-icon">💬</span>
          <span class="sh-soft-choice-copy"><b>Обычные тренировки</b><small>Диалоги с клиентом и выбор лучшего ответа</small><em>${dialogues().length} кейсов</em></span>
          <span class="sh-soft-choice-arrow">→</span>
        </button>
        <button class="sh-soft-choice-card" onclick="shSoftManualIntro()">
          <span class="sh-soft-choice-icon">✍️</span>
          <span class="sh-soft-choice-copy"><b>Ручные тренажёры</b><small>Свободный ответ с проверкой руководителя</small><em>${manuals().length} тренажёров</em></span>
          <span class="sh-soft-choice-arrow">→</span>
        </button>
      </div>`;
  }

  function renderOrdinaryIntro(){
    const card=document.getElementById('modalCard');if(!card)return;
    const seen=typeof seenContentMap==='function'?seenContentMap():new Map();
    const total=dialogues().length;
    const done=dialogues().filter(x=>seen.has(x.id)).length;
    card.innerHTML=`
      <div class="modal-head">
        <div><button class="sh-soft-back" onclick="shSoftBackToChooser()">← Назад</button><h2>Обычные тренировки</h2></div>
        <button class="btn secondary" onclick="closeModal()">✕</button>
      </div>
      <div class="sh-soft-start-card">
        <div class="sh-soft-start-icon">💬</div>
        <h3>Диалоги Soft Skills</h3>
        <p>Кейсы идут один за другим. После завершения каждого диалога можно сразу перейти к следующему.</p>
        <div class="meta">Пройдено ${done} из ${total}</div>
        <button class="btn primary full" onclick="shSoftStartOrdinary()">Начать</button>
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
  window.shSoftOrdinaryIntro=function(){renderOrdinaryIntro();};
  window.shSoftManualIntro=function(){renderManualIntro();};
  window.shSoftStartOrdinary=function(){
    const x=nextDialogue();
    if(!x){toast('В Soft Skills пока нет опубликованных кейсов');return}
    closeModal();startContent(x.id);
  };
  window.shSoftStartManual=function(){
    const x=nextManual();
    if(!x){toast('В Soft Skills пока нет ручных тренажёров');return}
    closeModal();
    if(typeof startManualContent==='function'){startManualContent(x.id);return}
    if(typeof openManualSoft==='function'){openManualSoft();return}
    toast('Ручной тренажёр сейчас недоступен');
  };
  window.shSoftOpenManual=window.shSoftManualIntro;

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

  console.info('SkillHub: Soft chooser restored; ordinary and manual flows start from one Start button');
})();

(function(){
  if(document.getElementById('shMonthlyCheckLoader'))return;
  const s=document.createElement('script');
  s.id='shMonthlyCheckLoader';
  s.src='./hotfix-monthly-check-20261006.js?v=1';
  document.head.appendChild(s);
})();