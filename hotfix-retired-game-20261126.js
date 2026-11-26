/* SkillHub — remove retired external game from employee home, 2026-11-26 */
(function(){
  'use strict';

  const RETIRED_HOST='masterlinii-game.website.yandexcloud.net';

  function patchRetiredGame(){
    const page=document.getElementById('page-home');
    if(!page)return;

    const links=[...page.querySelectorAll('a[href]')].filter(a=>{
      try{return new URL(a.href,location.href).host===RETIRED_HOST}catch(_){return false}
    });

    for(const a of links){
      const card=a.closest('article')||a.parentElement;
      const btn=document.createElement('button');
      btn.className=a.className;
      btn.type='button';
      btn.disabled=true;
      btn.setAttribute('aria-disabled','true');
      btn.textContent='Новая игра — скоро';
      a.replaceWith(btn);

      if(card){
        card.removeAttribute('onclick');
        card.removeAttribute('onkeydown');
        card.removeAttribute('role');
        card.removeAttribute('tabindex');
        const title=card.querySelector('h3');
        const copy=card.querySelector('p');
        if(title)title.textContent='Поиграть';
        if(copy)copy.textContent='Готовим новую игровую тренировку прямо внутри SkillHub.';
      }
    }

    const heroText=[...page.querySelectorAll('header p, .sh748-hero-text')];
    for(const p of heroText){
      if(/игр/i.test(p.textContent||''))p.textContent='Выберите формат для тренировки навыков.';
    }
  }

  const obs=new MutationObserver(()=>patchRetiredGame());
  document.addEventListener('DOMContentLoaded',()=>{
    const page=document.getElementById('page-home');
    if(page)obs.observe(page,{childList:true,subtree:true});
    patchRetiredGame();
  });
  window.addEventListener('load',patchRetiredGame);
  setTimeout(patchRetiredGame,0);

  console.info('SkillHub: retired Master Line link removed from employee home');
})();