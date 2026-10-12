/* SkillHub auth recovery — 2026-10-12
   Repairs stale browser auth sessions before an explicit PIN login.
   This is intentionally login-only: registration/first entry keeps the base flow.
*/
(function(){
  'use strict';
  if(window.__shAuthRecovery20261012)return;
  window.__shAuthRecovery20261012=true;

  const base=window.submitAuth;
  if(typeof base!=='function')return;

  function el(id){return document.getElementById(id)}
  function msgText(e){return String(e?.message||e||'')}
  function stale(e){return /refresh[_ ]?token|invalid refresh|refresh token not found/i.test(msgText(e))}
  function transient(e){return /load failed|failed to fetch|network|fetch|timeout|connection/i.test(msgText(e))}

  function clearProjectAuthStorage(){
    try{
      const c=typeof currentConfig==='function'?currentConfig():null;
      const ref=String(c?.url||'').match(/https:\/\/([^.]+)\.supabase\.co/i)?.[1]||'';
      for(let i=localStorage.length-1;i>=0;i--){
        const k=localStorage.key(i)||'';
        if(k.startsWith('sb-')&&k.endsWith('-auth-token')&&(!ref||k.includes(ref)))localStorage.removeItem(k);
      }
    }catch(_){ }
  }

  function freshClient(){
    try{
      clearProjectAuthStorage();
      const c=typeof currentConfig==='function'?currentConfig():null;
      if(c?.url&&c?.key&&window.supabase?.createClient){
        S.sb=window.supabase.createClient(c.url,c.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
      }
    }catch(e){console.warn('SkillHub auth recovery: fresh client skipped',e)}
  }

  async function finishLogin(){
    try{return await afterAuth()}
    catch(e){
      if(!transient(e)&&!stale(e))throw e;
      await new Promise(r=>setTimeout(r,450));
      return await afterAuth();
    }
  }

  window.submitAuth=async function(){
    if(typeof S==='undefined'||S?.authMode!=='login')return base.apply(this,arguments);

    const login=typeof normalizeLogin==='function'?normalizeLogin(el('loginInput')?.value):String(el('loginInput')?.value||'').trim().toLowerCase();
    const pin=String(el('pinInput')?.value||'');
    const errBox=el('loginError'),btn=el('authBtn');
    if(errBox)errBox.textContent='';
    if(!login||pin.length<6){if(errBox)errBox.textContent='Введите логин и PIN минимум из 6 символов.';return}

    const oldText=btn?.textContent||'Войти';
    if(btn){btn.disabled=true;btn.textContent='Входим…'}

    try{
      // A login button click means the old local session is no longer authoritative.
      // Recreate the client without its stale refresh token, then establish a clean session.
      freshClient();
      const email=typeof emailFor==='function'?emailFor(login):login;
      let r=await S.sb.auth.signInWithPassword({email,password:pin});
      if(r?.error&&stale(r.error)){
        freshClient();
        r=await S.sb.auth.signInWithPassword({email,password:pin});
      }
      if(r?.error)throw r.error;
      await finishLogin();
    }catch(e){
      let m=msgText(e);
      const low=m.toLowerCase();
      if(low.includes('invalid login'))m='Неверный логин или PIN.';
      else if(stale(e))m='Старая сессия браузера была сброшена. Нажмите «Войти» ещё раз.';
      else if(transient(e))m='Не удалось загрузить данные с этого браузера. Обновите страницу и повторите вход.';
      if(errBox)errBox.textContent=m||'Не удалось войти';
      console.warn('SkillHub auth recovery: login failed',e);
    }finally{
      if(btn&&!(el('loginView')?.classList.contains('hidden'))){btn.disabled=false;btn.textContent=oldText}
    }
  };

  console.info('SkillHub: browser auth recovery enabled');
})();
