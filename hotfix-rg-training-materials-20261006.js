/* SkillHub hotfix: RG training drill-down shows topics/blocks only, not the full material feed. */
(function(){
  'use strict';

  function isRg(){
    try{return typeof S!=='undefined' && S?.profile?.role==='mentor'}catch(_){return false}
  }

  function cleanRgTrainingModal(){
    if(!isRg())return;
    const modal=document.getElementById('modalCard');
    if(!modal)return;

    // Hard Skills has a dedicated full-material wrapper in the latest flow.
    modal.querySelectorAll('.sh-hard-materials').forEach(el=>el.remove());

    // Older/generic Soft/Hard/Needs flows render every material directly in the modal.
    modal.querySelectorAll(':scope > .content-row').forEach(el=>el.remove());

    // Remove headings that belonged only to the deleted feed.
    modal.querySelectorAll('.section-title,.sh-hard-section-title').forEach(head=>{
      const title=(head.querySelector('h2')?.textContent||'').trim().toLowerCase();
      if(title==='материалы'||title==='все материалы')head.remove();
    });

    // The drill-down now works by block/topic, so the helper text should match it.
    modal.querySelectorAll('.modal-head .muted.small').forEach(el=>{
      const text=(el.textContent||'').trim();
      if(/выберите тему или конкретный материал/i.test(text))el.textContent='Выберите нужную тему';
    });
  }

  if(typeof openSection==='function'){
    const baseOpenSection=openSection;
    openSection=function(sec){
      const args=Array.prototype.slice.call(arguments,1);
      const result=baseOpenSection.apply(this,[sec,...args]);
      setTimeout(cleanRgTrainingModal,0);
      return result;
    };
  }

  console.info('SkillHub: RG training full-material feeds hidden; topic/block navigation preserved');
})();
