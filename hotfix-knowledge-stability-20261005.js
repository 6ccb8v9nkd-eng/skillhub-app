/* SkillHub hotfix: keep an opened Knowledge Base document open during background sync/re-render. */
(function(){
  'use strict';

  if (typeof renderCurrent !== 'function') {
    console.warn('SkillHub KB stability hotfix: renderCurrent is unavailable');
    return;
  }

  const baseRenderCurrent = renderCurrent;

  renderCurrent = function(){
    const openedKnowledgeDoc = window.__shNativeKbDoc || window.__sh845KbDoc;
    const currentPage = (typeof S !== 'undefined' && S) ? S.currentPage : null;

    // syncAll()/Realtime call renderCurrent() after data refresh. While a document
    // is open this must not redraw the Knowledge Base home screen, otherwise the
    // user is thrown back to the Reglament/Handbook selection and has to tap twice.
    if (currentPage === 'knowledge' && openedKnowledgeDoc) return;

    return baseRenderCurrent.apply(this, arguments);
  };

  console.info('SkillHub: Knowledge Base background re-render guard enabled');
})();

/* Remove redundant explanatory captions from the Knowledge Base home screen. */
(function(){
  'use strict';

  function cleanKnowledgeHome(){
    const page=document.getElementById('page-knowledge');
    if(!page)return;
    page.querySelector('.sh842-kb-hero p')?.remove();
    page.querySelector('.sh842-kb-note')?.remove();
  }

  const baseKbRender=window.sh842RenderKnowledge;
  if(typeof baseKbRender==='function'){
    window.sh842RenderKnowledge=function(){
      const result=baseKbRender.apply(this,arguments);
      cleanKnowledgeHome();
      return result;
    };
  }

  cleanKnowledgeHome();
  console.info('SkillHub: Knowledge Base extra captions removed');
})();
