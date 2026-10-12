/* SkillHub manager wording: use "training" instead of "course" — 2026-10-12 */
(function(){
  'use strict';
  if(window.__shTrainingTerminology)return;
  window.__shTrainingTerminology=true;

  const replacements=[
    ['Рекомендованные курсы','Рекомендованные тренировки'],
    ['курсы сейчас не требуются','тренировки сейчас не требуются'],
    ['По этой теме пока нет опубликованного курса','По этой теме пока нет опубликованной тренировки'],
    ['Курс уже назначен','Тренировка уже назначена'],
    ['Назначить курс','Назначить тренировку'],
    ['Нет тем, по которым требуется назначение курса. Курс рекомендуется только после минимум 2 попыток, если средний результат последних 3 ниже 70%.','Нет тем, по которым требуется назначение тренировки. Тренировка рекомендуется только после минимум 2 попыток, если средний результат последних 3 ниже 70%.'],
    ['курс рекомендован','тренировка рекомендована']
  ];

  function rewrite(root){
    const scopes=[];
    if(root?.nodeType===1 && (root.matches?.('.shm-recs,.shm-topic,.shm-groups')||root.closest?.('.shm-groups')))scopes.push(root);
    if(root?.querySelectorAll)scopes.push(...root.querySelectorAll('.shm-recs,.shm-topic,.shm-groups'));
    const seen=new Set();
    for(const scope of scopes){
      if(!scope||seen.has(scope))continue;seen.add(scope);
      const walker=document.createTreeWalker(scope,NodeFilter.SHOW_TEXT);
      let n;
      while((n=walker.nextNode())){
        let text=n.nodeValue||'',next=text;
        for(const [from,to] of replacements)next=next.split(from).join(to);
        if(next!==text)n.nodeValue=next;
      }
    }
  }

  const observer=new MutationObserver(muts=>{
    for(const m of muts){
      if(m.type==='characterData')rewrite(m.target.parentElement);
      for(const n of m.addedNodes)rewrite(n);
    }
  });
  observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  rewrite(document);
  console.info('SkillHub: manager training terminology enabled');
})();
