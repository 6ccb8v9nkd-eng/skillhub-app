/* SkillHub: compact Soft Skills feedback with optional detailed explanation. */
(function(){
  'use strict';

  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function norm(v){return String(v??'').replace(/\s+/g,' ').trim()}

  function softRows(){
    try{return (Array.isArray(S?.content)?S.content:[]).filter(x=>x&&x.status==='published'&&x.section==='soft'&&x.type==='dialogue')}
    catch(_){return[]}
  }

  function explanations(){
    const out=[];
    softRows().forEach(row=>{
      (row?.payload?.steps||[]).forEach(step=>{
        const raw=String(step?.explanation||'').trim();
        if(raw)out.push(raw);
      });
    });
    return [...new Set(out)];
  }

  function compactText(raw){
    const s=String(raw||'').trim();
    if(!s)return 'Разберите ответ и переходите к следующему шагу.';
    const strength=s.match(/(?:✅\s*)?(?:ПОЧЕМУ СИЛЬНЕЕ|ПОЧЕМУ ЭТО ЛУЧШИЙ ВАРИАНТ)\s*\n?([\s\S]*?)(?=\n\s*(?:⚠️|📌|📍|🎯)|$)/i);
    let text=(strength?.[1]||s)
      .replace(/^\s*\d+[.)]\s*/gm,'')
      .replace(/\s+/g,' ')
      .trim();
    const sentences=text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[];
    text=sentences.slice(0,2).join(' ').trim();
    if(text.length>210)text=text.slice(0,207).trimEnd()+'…';
    return text||'Посмотрите, почему этот вариант сильнее остальных.';
  }

  function findCandidate(raw){
    const root=document.getElementById('modalCard')||document.getElementById('page-run')||document.body;
    const target=norm(raw), anchor=target.slice(0,70);
    if(!anchor)return null;
    const nodes=[...root.querySelectorAll('div,p,section,article,aside')].filter(el=>!el.dataset.shSoftCompactFeedback);
    let best=null,bestLen=Infinity;
    for(const el of nodes){
      if(el.closest('[data-sh-soft-compact-feedback]'))continue;
      const t=norm(el.textContent);
      if(!t.includes(anchor))continue;
      if(t.length>Math.max(target.length*1.9,target.length+350))continue;
      if(t.length<bestLen){best=el;bestLen=t.length}
    }
    return best;
  }

  function decorate(){
    const exps=explanations();
    if(!exps.length)return;
    exps.forEach(raw=>{
      const node=findCandidate(raw);if(!node)return;
      const full=String(raw).trim(),short=compactText(full);
      node.dataset.shSoftCompactFeedback='1';
      node.classList.add('sh-soft-compact-feedback');
      node.innerHTML=`<div class="sh-soft-feedback-short"><b>Коротко</b><p>${esc(short)}</p></div><button type="button" class="sh-soft-feedback-toggle" aria-expanded="false">Посмотреть подробнее</button><div class="sh-soft-feedback-details hidden">${esc(full).replace(/\n/g,'<br>')}</div>`;
      const btn=node.querySelector('.sh-soft-feedback-toggle');
      const details=node.querySelector('.sh-soft-feedback-details');
      btn?.addEventListener('click',()=>{
        const open=details.classList.toggle('hidden')===false;
        btn.textContent=open?'Скрыть подробности':'Посмотреть подробнее';
        btn.setAttribute('aria-expanded',open?'true':'false');
      });
    });
  }

  if(!document.getElementById('shSoftCompactFeedbackStyle')){
    const style=document.createElement('style');style.id='shSoftCompactFeedbackStyle';
    style.textContent=`
      .sh-soft-compact-feedback{padding:14px!important;border-radius:15px!important}
      .sh-soft-feedback-short{display:grid;gap:5px}
      .sh-soft-feedback-short b{font-size:12px;color:var(--primary);text-transform:uppercase;letter-spacing:.05em}
      .sh-soft-feedback-short p{margin:0!important;line-height:1.45;color:var(--ink)}
      .sh-soft-feedback-toggle{margin-top:9px;border:0;background:transparent;color:var(--primary);font:inherit;font-size:13px;font-weight:850;padding:0;cursor:pointer;text-align:left}
      .sh-soft-feedback-details{margin-top:11px;padding-top:11px;border-top:1px solid var(--line);color:var(--muted);font-size:13px;line-height:1.55}
      .sh-soft-feedback-details.hidden{display:none!important}
    `;document.head.appendChild(style);
  }

  const observer=new MutationObserver(()=>{clearTimeout(decorate.t);decorate.t=setTimeout(decorate,40)});
  observer.observe(document.body,{subtree:true,childList:true});
  setTimeout(decorate,0);setTimeout(decorate,500);
  console.info('SkillHub: compact expandable feedback enabled for Soft Skills');
})();