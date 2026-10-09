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
