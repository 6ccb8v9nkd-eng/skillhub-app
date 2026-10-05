/* SkillHub native knowledge reader — 2026-10-05
   Keeps the author's source PDFs untouched while presenting them as a seamless SkillHub section.
*/
(function(){
  'use strict';

  const DOCS={
    reglament:{title:'Регламент работы в чате'},
    handbook:{title:'Настольная книга'}
  };

  function currentTheme(){
    try{return typeof shThemeCurrent==='function'?shThemeCurrent():(document.documentElement.dataset.theme==='light'?'light':'dark')}
    catch(_){return document.documentElement.dataset.theme==='light'?'light':'dark'}
  }

  function installStyle(){
    if(document.getElementById('shNativeKbStyle'))return;
    const s=document.createElement('style');s.id='shNativeKbStyle';s.textContent=`
      #page-knowledge.sh-native-kb-reader{padding:0!important;overflow:hidden!important}
      .sh-native-kb-host{width:100%;height:calc(100dvh - 92px);min-height:560px;background:var(--bg);overflow:hidden}
      .sh-native-kb-frame{display:block;width:100%;height:100%;border:0;background:var(--bg)}
      @media(max-width:760px){
        .sh-native-kb-host{height:calc(100dvh - 132px);min-height:460px}
      }
    `;document.head.appendChild(s);
  }

  const baseBack=window.sh842BackToKnowledge;

  window.sh842OpenKnowledgeDoc=function(docKey,opts={}){
    const doc=DOCS[docKey];if(!doc)return;
    installStyle();window.__shNativeKbDoc=docKey;window.__sh845KbDoc=docKey;
    S.currentPage='knowledge';

    document.querySelectorAll('.page').forEach(x=>x.classList.add('hidden'));
    const page=document.getElementById('page-knowledge');if(!page)return;
    page.classList.remove('hidden');page.classList.add('sh842-reader-page','sh-native-kb-reader');
    document.querySelectorAll('.nav-btn').forEach(x=>x.classList.toggle('active',x.dataset.page==='knowledge'));

    const title=document.getElementById('pageTitle'),sub=document.getElementById('pageSub');
    if(title)title.textContent='База знаний';
    if(sub)sub.textContent=doc.title;

    const theme=currentTheme();
    const start=Math.max(1,Number(opts.page||1)||1);
    const src=`./knowledge-viewer.html?v=20261005_native_v1&doc=${encodeURIComponent(docKey)}&theme=${encodeURIComponent(theme)}&embed=1&page=${start}`;
    page.innerHTML=`<div class="sh-native-kb-host"><iframe class="sh-native-kb-frame" id="shNativeKbFrame" title="${esc(doc.title)}" src="${src}" loading="eager"></iframe></div>`;
  };

  window.sh842BackToKnowledge=function(){
    window.__shNativeKbDoc=null;window.__sh845KbDoc=null;
    const page=document.getElementById('page-knowledge');
    if(page)page.classList.remove('sh-native-kb-reader','sh842-reader-page');
    if(typeof baseBack==='function')return baseBack();
    if(typeof window.sh842RenderKnowledge==='function')window.sh842RenderKnowledge();
  };

  const baseApplyTheme=window.applyTheme;
  if(typeof baseApplyTheme==='function'){
    window.applyTheme=function(t,save=true){
      const r=baseApplyTheme(t,save);
      const docKey=window.__shNativeKbDoc;
      const frame=document.getElementById('shNativeKbFrame');
      if(docKey&&frame){
        const src=new URL(frame.src,location.href);src.searchParams.set('theme',t==='light'?'light':'dark');src.searchParams.set('v','20261005_native_v1');frame.src=src.toString();
      }
      return r;
    };
  }

  installStyle();
  console.info('SkillHub: native continuous knowledge reader enabled');
})();