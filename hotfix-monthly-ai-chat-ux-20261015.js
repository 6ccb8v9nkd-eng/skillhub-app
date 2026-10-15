/* SkillHub monthly assessment AI chat UX — 2026-10-15
   Visual-only enhancement: show employee answer immediately and client typing state.
   Does not change assessment composition, scoring or attempt rules.
*/
(function(){
  'use strict';
  if(window.__shMonthlyAiChatUx20261015)return;
  window.__shMonthlyAiChatUx20261015=true;

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function ensureStyle(){
    if(document.getElementById('sh-monthly-ai-chat-ux-style'))return;
    const s=document.createElement('style');
    s.id='sh-monthly-ai-chat-ux-style';
    s.textContent=`
      .shmc-chat .shmc-ai-pending{position:relative}
      .shmc-chat .shmc-ai-pending em{display:block;margin-top:5px;font-size:10px;font-style:normal;color:var(--muted)}
      .shmc-chat .shmc-ai-typing{justify-self:start!important;background:var(--panel2);min-width:138px}
      .shmc-ai-typing-line{display:flex;align-items:center;gap:7px;margin-top:5px;color:var(--muted);font-size:12px}
      .shmc-ai-typing-dots{display:inline-flex;gap:3px;align-items:center}
      .shmc-ai-typing-dots i{display:block;width:5px;height:5px;border-radius:50%;background:currentColor;animation:shMonthlyAiDot 1s infinite ease-in-out}
      .shmc-ai-typing-dots i:nth-child(2){animation-delay:.15s}.shmc-ai-typing-dots i:nth-child(3){animation-delay:.3s}
      @keyframes shMonthlyAiDot{0%,70%,100%{opacity:.3;transform:translateY(0)}35%{opacity:1;transform:translateY(-2px)}}
    `;
    document.head.appendChild(s);
  }

  function showPending(text){
    const chat=document.querySelector('.shmc-chat');
    if(!chat||chat.querySelector('[data-shmc-pending="1"]'))return;
    const mine=document.createElement('div');
    mine.className='employee shmc-ai-pending';
    mine.dataset.shmcPending='1';
    mine.innerHTML=`<small>Вы</small><p>${esc(text)}</p><em>Отправляется…</em>`;
    const typing=document.createElement('div');
    typing.className='client shmc-ai-typing';
    typing.dataset.shmcTyping='1';
    typing.innerHTML='<small>Клиент</small><div class="shmc-ai-typing-line"><span>печатает</span><span class="shmc-ai-typing-dots"><i></i><i></i><i></i></span></div>';
    chat.append(mine,typing);
    chat.scrollTop=chat.scrollHeight;
    const ta=document.getElementById('shmcAiAnswer');
    if(ta)ta.disabled=true;
  }

  function rollbackPending(text){
    document.querySelector('[data-shmc-pending="1"]')?.remove();
    document.querySelector('[data-shmc-typing="1"]')?.remove();
    const ta=document.getElementById('shmcAiAnswer');
    if(ta){ta.disabled=false;ta.value=text;ta.focus()}
  }

  function install(){
    ensureStyle();
    const base=window.shMonthlyAiSend;
    if(typeof base!=='function'||base.__shMonthlyAiChatUx)return false;
    const wrapped=async function(){
      const ta=document.getElementById('shmcAiAnswer');
      const text=String(ta?.value||'').trim();
      if(text.length<2)return base.apply(this,arguments);
      const p=base.apply(this,arguments);
      requestAnimationFrame(()=>showPending(text));
      try{return await p}
      finally{
        /* On success renderRun replaces the temporary nodes. If they still exist,
           the request failed and the original answer is restored for retry. */
        if(document.querySelector('[data-shmc-typing="1"]'))rollbackPending(text);
      }
    };
    wrapped.__shMonthlyAiChatUx=true;
    wrapped.__base=base;
    window.shMonthlyAiSend=wrapped;
    console.info('SkillHub: assessment AI chat instant-send UX enabled');
    return true;
  }

  if(!install()){
    let n=0;
    const t=setInterval(()=>{n++;if(install()||n>120)clearInterval(t)},100);
  }
})();
