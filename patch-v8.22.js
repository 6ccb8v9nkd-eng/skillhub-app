/* SkillHub V8.22 — advanced Soft distractors for experienced employees */
(function(){
  const SOFT_TOPICS=new Set(['Извинение','Конфликтная коммуникация','Ограничение обещаний','Ожидание','Повторное обращение','Присоединение','Работа с негативом','Работа с претензией']);
  const STEP_SUFFIXES=[
    [
      'После этого проверю один ключевой факт и обозначу, какой следующий шаг доступен сейчас.',
      'Сначала сверю факты, затем коротко обозначу, что можно сделать на этом этапе.',
      'После проверки вернусь к вам с конкретным действием без лишних обещаний.'
    ],
    [
      'Затем уточню, что для вас сейчас важнее всего, и от этого предложу дальнейшее действие.',
      'После этого зафиксирую приоритет и объясню, какой вариант можно использовать дальше.',
      'Дальше уточню главный ориентир для вас и свяжу его со следующим шагом.'
    ],
    [
      'При этом сначала отделю подтверждённые факты от того, что ещё требует проверки.',
      'Сначала проверю основания, чтобы не строить ответ на предположении и не обещать лишнего.',
      'Перед выводом сверю факты и обозначу только то, что можно подтвердить сейчас.'
    ],
    [
      'Если этот шаг не даст результата, сразу обозначу следующий доступный маршрут.',
      'После первого действия дам понятный ориентир, что делать дальше при любом результате.',
      'Сразу обозначу и основной шаг, и что будем делать, если он не решит вопрос.'
    ],
    [
      'В конце зафиксирую договорённость и ориентир по следующей связи, чтобы вопрос не потерялся.',
      'По итогам коротко подведу, что сделано, что остаётся и когда стоит вернуться к вопросу.',
      'Завершу разговор понятной фиксацией следующего шага и точки контроля.'
    ]
  ];
  const SHORT_SUFFIXES=[
    'После проверки обозначу следующий шаг.',
    'Дальше дам конкретный ориентир по действию.',
    'После этого обозначу, что можно сделать дальше.',
    'Затем зафиксирую понятный следующий шаг.'
  ];
  function clone(v){try{return structuredClone(v)}catch(e){return JSON.parse(JSON.stringify(v))}}
  function hash(s){let h=2166136261;for(const ch of String(s||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
  function punct(s){const t=String(s||'').trim();return /[.!?…]$/.test(t)?t:t+'.'}
  function enrichWrong(text,stepIndex,seed,target){
    let out=punct(text);
    if(out.length>=target-12)return out;
    const pool=[...STEP_SUFFIXES[Math.min(4,Math.max(0,stepIndex))],...SHORT_SUFFIXES];
    const stems=['провер','факт','следующ','шаг','обознач','уточн','действ','зафикс','ориентир','обещ'];
    const low=out.toLowerCase();
    const ranked=pool.map((phrase,i)=>{
      const nextLen=out.length+1+phrase.length;
      let score=Math.abs(nextLen-target);
      const pl=phrase.toLowerCase();
      score+=stems.reduce((z,stem)=>z+((low.includes(stem)&&pl.includes(stem))?28:0),0);
      score+=((hash(seed+'|'+i)%17)/100);
      return {phrase,score,nextLen};
    }).sort((a,b)=>a.score-b.score);
    out+=' '+ranked[0].phrase;
    return out;
  }
  function shuffleStep(step,seed){
    const pairs=(step.options||[]).map((text,i)=>({text,i,correct:i===Number(step.correct)}));
    let state=hash(seed)||1;
    function rnd(){state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296}
    for(let i=pairs.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[pairs[i],pairs[j]]=[pairs[j],pairs[i]]}
    step.options=pairs.map(x=>x.text);
    step.correct=pairs.findIndex(x=>x.correct);
    return step;
  }
  function makeAdvancedSoftDialogue(x){
    if(!x||String(x.section||'').toLowerCase()!=='soft'||!Array.isArray(x.steps)||!SOFT_TOPICS.has(String(x.topic||'')))return x;
    const y=clone(x);
    y.difficulty='Сложный';
    y.steps=(y.steps||[]).map((step,si)=>{
      if(!Array.isArray(step.options)||step.options.length<3)return step;
      const correct=Number(step.correct);
      const correctText=String(step.options[correct]||'');
      const target=Math.max(140,Math.min(182,correctText.length+4));
      step.options=step.options.map((txt,oi)=>oi===correct?punct(txt):enrichWrong(txt,si,`${y.id}|${si}|${oi}|${y.topic}`,target));
      return shuffleStep(step,`${y.id}|${si}|${Date.now()}|${Math.random()}`);
    });
    return y;
  }
  const baseStartDialogue=window.startDialogue;
  window.startDialogue=function(x){
    const prepared=makeAdvancedSoftDialogue(x);
    return baseStartDialogue(prepared);
  };
  window.__skillhubSoftAdvancedV822={makeAdvancedSoftDialogue};
  console.info('SkillHub patch V8.22: advanced Soft distractors enabled');
})();
