/* SkillHub AI client tone guard — 2026-10-09
   Adds controlled realistic client profanity for high-negative cases,
   rejects obvious low-effort nonsense locally, and retries role-confused AI replies.
*/
(function(){
  'use strict';

  const baseSend=window.shAiSoftSend;
  if(typeof baseSend!=='function'||baseSend.__shClientToneGuard)return;

  function styleInstruction(s){
    const high=/высок/i.test(String(s?.intensity||''));
    const tone=high
      ? 'Для реалистичной тренировки клиент МОЖЕТ иногда использовать одно короткое умеренное ругательство или ненормативное слово, если раздражение высокое. Не матерись в каждой реплике, не превращай разговор в поток оскорблений и не используй унижения по признакам личности. Если сотрудник хорошо снижает напряжение, грубость должна исчезать.'
      : 'Клиент может говорить резко и раздражённо, но мат используй редко и только если напряжение естественно усилилось. Не делай клиента карикатурно агрессивным.';
    return tone+' Всегда оставайся только КЛИЕНТОМ, никогда не отвечай как сотрудник и не предлагай действия от его лица.';
  }

  function withStyle(s,extra=''){
    const x={...(s||{})};
    const base=String(x.negativeCause||'').trim();
    x.negativeCause=(base+' '+styleInstruction(x)+(extra?' '+extra:'')).trim().slice(0,500);
    return x;
  }

  function looksEmployeeVoice(v){
    const t=String(v||'').toLowerCase();
    return /(понимаю ваше (возмущение|недовольство|раздражение)|давайте (я|попробуем) (проверю|уточню|разбер|посмотр)|я (проверю|уточню|посмотрю|сообщу|помогу|передам)|попробую (оценить|исправить|разобраться|проверить|уточнить)|ситуация действительно критическ|расскажите подробнее.*попробую)/iu.test(t);
  }

  function lowEffortEmployee(body){
    const tr=Array.isArray(body?.transcript)?body.transcript:[];
    const last=[...tr].reverse().find(m=>m?.role==='employee');
    const t=String(last?.content||'').trim().toLowerCase().replace(/[.!?,;:]+$/g,'');
    if(!t)return false;
    if(/^(плакать|спать|лол|кек|хз|без понятия|отстаньте|отстань|не знаю|пофиг|ничего|потом|ага|угу)$/iu.test(t))return true;
    if(t.length<=4&&/^[^а-яёa-z0-9]+$/iu.test(t))return true;
    return false;
  }

  function localClientReply(body){
    const tr=Array.isArray(body?.transcript)?body.transcript:[];
    const n=tr.filter(m=>m?.role==='employee').length;
    const variants=[
      'Я не понимаю, как это относится к моей проблеме. Мне нужен конкретный ответ по ситуации, а не случайное слово.',
      'Это вообще не отвечает на мой вопрос. Скажите по существу: что вы собираетесь делать с моей проблемой?',
      'Такой ответ только сильнее раздражает. Мне нужен нормальный следующий шаг по моей ситуации.'
    ];
    return {ok:true,message:variants[Math.max(0,(n-1)%variants.length)],done:n>=6,employeeTurns:n,minTurns:4,maxTurns:6,usage:{input:0,output:0,total:0}};
  }

  function mergeUsage(a,b){return {input:Number(a?.input||0)+Number(b?.input||0),output:Number(a?.output||0)+Number(b?.output||0),total:Number(a?.total||0)+Number(b?.total||0)}}

  async function guardedInvoke(functions,rawInvoke,name,opts){
    if(name!=='soft-ai'||opts?.body?.action!=='reply')return rawInvoke.call(functions,name,opts);
    const body={...opts.body,scenario:withStyle(opts.body.scenario)};

    if(lowEffortEmployee(body))return {data:localClientReply(body),error:null};

    const first=await rawInvoke.call(functions,name,{...opts,body});
    if(first?.error||!looksEmployeeVoice(first?.data?.message))return first;

    const retryBody={...body,scenario:withStyle(opts.body.scenario,'Предыдущий черновик ошибочно звучал как сотрудник. Сейчас ответь ТОЛЬКО как клиент: раздражённо, требовательно или постепенно спокойнее — но без фраз сотрудника, без «я проверю», «я уточню», «давайте разберёмся» и без предложений действий от лица сотрудника.')};
    const second=await rawInvoke.call(functions,name,{...opts,body:retryBody});
    if(!second?.error&&second?.data){second.data.usage=mergeUsage(first?.data?.usage,second.data.usage)}
    return second?.error?first:second;
  }

  const wrapped=async function(){
    const functions=S?.sb?.functions;
    if(!functions||typeof functions.invoke!=='function')return baseSend.apply(this,arguments);
    const rawInvoke=functions.invoke;
    functions.invoke=function(name,opts){return guardedInvoke(functions,rawInvoke,name,opts)};
    try{return await baseSend.apply(this,arguments)}
    finally{functions.invoke=rawInvoke}
  };
  wrapped.__shClientToneGuard=true;
  window.shAiSoftSend=wrapped;

  console.info('SkillHub AI: realistic client tone + role guard enabled');
})();

/* SkillHub automatic release refresh — 2026-10-12
   Detects a new application release and refreshes clients automatically.
   Users should not need Ctrl+F5 after future deployments. */
(function(){
  'use strict';
  if(window.__shAutoReleaseRefresh)return;
  window.__shAutoReleaseRefresh=true;

  const KEY='sh_app_release_version';
  let checking=false,reloading=false;

  async function clearSkillHubCaches(){
    try{
      if('caches' in window){
        const keys=await caches.keys();
        await Promise.all(keys.filter(k=>String(k).startsWith('skillhub-')).map(k=>caches.delete(k)));
      }
    }catch(e){console.warn('SkillHub release refresh: cache clear skipped',e)}
    try{
      if('serviceWorker' in navigator){
        const regs=await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r=>r.update().catch(()=>{})));
      }
    }catch(e){console.warn('SkillHub release refresh: SW update skipped',e)}
  }

  async function checkRelease(){
    if(checking||reloading||!navigator.onLine)return;
    checking=true;
    try{
      const r=await fetch('./app-version.json?t='+Date.now(),{cache:'no-store'});
      if(!r.ok)return;
      const j=await r.json();
      const remote=String(j?.version||'').trim();
      if(!remote)return;
      const local=localStorage.getItem(KEY)||'';
      if(!local){localStorage.setItem(KEY,remote);return}
      if(local===remote)return;
      reloading=true;
      localStorage.setItem(KEY,remote);
      await clearSkillHubCaches();
      const u=new URL(location.href);
      u.searchParams.set('appv',remote);
      u.searchParams.set('_refresh',Date.now().toString());
      location.replace(u.toString());
    }catch(e){console.warn('SkillHub release refresh: check skipped',e)}
    finally{checking=false}
  }

  setTimeout(checkRelease,2500);
  setInterval(checkRelease,60000);
  window.addEventListener('focus',checkRelease);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkRelease()});
  console.info('SkillHub: automatic release refresh enabled');
})();
