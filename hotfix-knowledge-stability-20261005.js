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
