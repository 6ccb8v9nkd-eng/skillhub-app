/* SkillHub hotfix: keep an opened Knowledge Base document open during background sync/re-render. */
(function(){
  'use strict';

  if (typeof window.renderCurrent !== 'function') {
    console.warn('SkillHub KB stability hotfix: renderCurrent is unavailable');
    return;
  }

  const baseRenderCurrent = window.renderCurrent;

  window.renderCurrent = function(){
    const openedKnowledgeDoc = window.__shNativeKbDoc || window.__sh845KbDoc;

    // syncAll()/Realtime call renderCurrent() after data refresh. While a document
    // is open this must not redraw the Knowledge Base home screen, otherwise the
    // user is thrown back to the Reglament/Handbook selection and has to tap twice.
    if (window.S?.currentPage === 'knowledge' && openedKnowledgeDoc) return;

    return baseRenderCurrent.apply(this, arguments);
  };

  console.info('SkillHub: Knowledge Base background re-render guard enabled');
})();
