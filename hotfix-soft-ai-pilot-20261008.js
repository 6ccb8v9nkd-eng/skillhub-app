/* SkillHub AI Soft trainer — universal rollout — 2026-10-09 */
(function(){
'use strict';
if(window.__shAiSoftUniversal)return;window.__shAiSoftUniversal=true;

const CASE_CODE='SOFT-AI-NEG',ROLES=new Set(['employee','mentor','rs','tech_admin']);
let run=null,busy=false;
const byId=id=>document.getElementById(id);
const esc=v=>typeof window.esc==='function'?window.esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toast=m=>{try{window.toast?.(m)}catch(_){}};
const canUse=()=>{try{return !!S?.profile?.active&&ROLES.has(S.profile.role)}catch(_){return false}};
const usage=(a,b)=>({input:Number(a?.input||0)+Number(b?.input||0),output:Number(a?.output||0)+Number(b?.output||0),total:Number(a?.total||0)+Number(b?.total||0)});

async function invoke(body){
  if(!canUse())throw new Error('ИИ-тренажёр недоступен для этой роли');
  const {data,error}=await S.sb.functions.invoke('soft-ai',{body});
  if(error){let d=null;try{if(error.context&&typeof error.context.json==='function')d=await error.context.json()}catch(_){}const e=new Error(d?.error||error.message||'Ошибка ИИ');e.code=d?.code||'';throw e}
  if(data?.error){const e=new Error(data.error);e.code=data.code||'';throw e}
  return data;
}

function addCard(){
  if(!canUse())return;
  const grid=byId('modalCard')?.querySelector('.sh-soft-choice-grid');if(!grid)return;
  grid.querySelectorAll('.sh-soft-ai-card').forEach(x=>x.remove());
  grid.insertAdjacentHTML('beforeend',`<button class="sh-soft-choice-card sh-soft-ai-card" onclick="shAiSoftIntro()"><span class="sh-soft-choice-icon">✨</span><span class="sh-soft-choice-copy"><b>Работа с негативом · ИИ</b><small>Живой сложный клиент: реагирует на ваши ответы, может быть жёстким, а после даёт подробный разбор.</small><em>ИИ-тренажёр</em></span><span class="sh-soft-choice-arrow">→</span></button>`);
}
const openBase=window.openSoftHub;if(typeof openBase==='function')window.openSoftHub=function(){const r=openBase.apply(this,arguments);setTimeout(addCard,0);return r};
const backBase=window.shSoftBackToChooser;if(typeof backBase==='function')window.shSoftBackToChooser=function(){const r=backBase.apply(this,arguments);setTimeout(addCard,0);return r};

window.shAiSoftIntro=async function(){
  if(!canUse()){toast('ИИ-тренажёр недоступен');return}
  showModal(`<div class="modal-head"><div><button class="sh-soft-back" onclick="shSoftBackToChooser()">← Назад</button><h2>Работа с негативом · ИИ</h2><div class="meta">${CASE_CODE} · живой кейс</div></div><button class="btn secondary" onclick="closeModal()">✕</button></div><div class="sh-ai-intro"><div class="sh-ai-badge">ALICE AI</div><h3>Снизьте негатив и выведите разговор в конструктив</h3><p>Клиент реагирует на конкретные ответы, может спорить, давить и отвечать жёстко. 4–6 ваших сообщений, до 600 символов, до 20 минут.</p><div id="shAiStatus" class="sh-ai-status">Проверяю подключение…</div><button id="shAiStartBtn" class="btn primary full" onclick="shAiSoftStart()" disabled>Получить новый кейс</button></div>`);
  try{const s=await invoke({action:'status'});const st=byId('shAiStatus'),b=byId('shAiStartBtn');if(s?.configured){if(st)st.innerHTML='<b>✓ ИИ готов</b><span>Можно начинать тренировку.</span>';if(b)b.disabled=false}else if(st)st.innerHTML='<b>ИИ временно недоступен</b><span>Попробуйте немного позже.</span>'}catch(e){const st=byId('shAiStatus');if(st)st.innerHTML=`<b>Не удалось подключиться</b><span>${esc(e.message)}</span>`}
};

window.shAiSoftStart=async function(){
  if(busy)return;busy=true;const b=byId('shAiStartBtn');if(b){b.disabled=true;b.textContent='Создаём кейс…'};
  try{const d=await invoke({action:'start'});run={scenario:d.scenario||{},minTurns:Number(d.minTurns||4),maxTurns:Number(d.maxTurns||6),maxChars:Number(d.maxChars||600),sessionMinutes:Number(d.sessionMinutes||20),startedAt:Date.now(),transcript:[{role:'client',content:d.message||''}],usage:usage(null,d.usage),finished:false};closeModal();if(typeof go==='function')go('run');render()}
  catch(e){toast(e.message||'Не удалось создать кейс');if(b){b.disabled=false;b.textContent='Получить новый кейс'}}finally{busy=false}
};

function messages(){return (run?.transcript||[]).map(m=>`<div class="sh-ai-msg ${m.role==='employee'?'is-employee':'is-client'}"><div class="sh-ai-who">${m.role==='employee'?'Сотрудник':'Клиент'}</div><div>${esc(m.content||'')}</div></div>`).join('')}
function render(){
  if(!run)return;const root=byId('page-run');if(!root)return;const turns=run.transcript.filter(x=>x.role==='employee').length,title=run.scenario?.title||'Сложный разговор',theme=run.scenario?.theme||'Работа с негативом';
  root.innerHTML=`<div class="sh-ai-wrap"><div class="card sh-ai-shell"><div class="sh-ai-top"><button class="btn secondary" onclick="shAiSoftExit()">← Выйти</button><div><span class="sh-ai-kicker">ИИ-ТРЕНИРОВКА · ${CASE_CODE}</span><b>${esc(title)}</b><small>${esc(theme)}</small></div><span class="pill">Ход ${turns} · максимум ${run.maxTurns}</span></div><div class="sh-ai-chat" id="shAiChat">${messages()}${busy?'<div class="sh-ai-msg is-client is-thinking"><div class="sh-ai-who">Клиент</div><div><span></span><span></span><span></span></div></div>':''}</div>${run.finished?'':`<form class="sh-ai-form" onsubmit="event.preventDefault();shAiSoftSend()"><textarea id="shAiInput" rows="3" maxlength="${run.maxChars}" placeholder="Напишите ответ клиенту своими словами…" ${busy?'disabled':''}></textarea><div class="sh-ai-form-bottom"><small>Не ищите «правильную фразу» — реагируйте на конкретного клиента.<br><span class="muted">До ${run.maxChars} символов.</span></small><button class="btn primary" type="submit" ${busy?'disabled':''}>Отправить →</button></div></form>`}</div></div>`;
  const chat=byId('shAiChat');if(chat)chat.scrollTop=chat.scrollHeight;
}

window.shAiSoftSend=async function(){
  if(!run||busy||run.finished)return;if(Date.now()-run.startedAt>run.sessionMinutes*60000){toast('Сессия завершена по времени');return}
  const inp=byId('shAiInput'),text=String(inp?.value||'').trim();if(!text){toast('Напишите ответ клиенту');return}if(text.length>run.maxChars){toast(`Максимум ${run.maxChars} символов`);return}
  run.transcript.push({role:'employee',content:text});busy=true;render();
  try{const d=await invoke({action:'reply',scenario:run.scenario,transcript:run.transcript,startedAt:run.startedAt});run.usage=usage(run.usage,d.usage);run.transcript.push({role:'client',content:d.message||''});run.finished=!!d.done;busy=false;render();if(run.finished)await review()}
  catch(e){if(run.transcript.at(-1)?.role==='employee')run.transcript.pop();busy=false;render();const x=byId('shAiInput');if(x)x.value=text;toast(e.message||'Не удалось получить ответ')}
};

async function review(){
  const root=byId('page-run');if(!root||!run)return;busy=true;root.innerHTML=`<div class="sh-ai-wrap"><div class="card sh-ai-shell sh-ai-evaluating"><div class="sh-ai-loader"></div><h2>ИИ разбирает диалог</h2><p class="muted">Проверяем работу с негативом и следующий шаг.</p></div></div>`;
  try{const d=await invoke({action:'review',scenario:run.scenario,transcript:run.transcript,usageSoFar:run.usage});run.review=d.review||{};run.usage=d.usage||run.usage;showResult()}
  catch(e){root.innerHTML=`<div class="sh-ai-wrap"><div class="card sh-ai-shell" style="text-align:center"><h2>Не удалось получить разбор</h2><p class="muted">${esc(e.message)}</p><button class="btn primary" onclick="shAiSoftRetryReview()">Повторить</button></div></div>`}finally{busy=false}
}
window.shAiSoftRetryReview=review;

function showResult(){
  const r=run?.review||{},root=byId('page-run');if(!root)return;const strengths=Array.isArray(r.strengths)?r.strengths:[],improvements=Array.isArray(r.improvements)?r.improvements:[];
  root.innerHTML=`<div class="sh-ai-wrap"><div class="card sh-ai-shell"><div class="sh-ai-result-head"><span class="sh-ai-kicker">ИИ-РАЗБОР</span><h2>Диалог завершён</h2><p>${esc(r.summary||'Разбор готов.')}</p></div><div class="sh-ai-result-grid"><section><h3>✓ Что сработало</h3>${strengths.map(x=>`<div class="sh-ai-point">${esc(x)}</div>`).join('')||'<p class="muted">—</p>'}</section><section><h3>↗ Что улучшить</h3>${improvements.map(x=>`<div class="sh-ai-point">${esc(x)}</div>`).join('')||'<p class="muted">—</p>'}</section></div>${r.betterApproach?`<div class="sh-ai-review-card"><b>Как можно было сильнее</b><p>${esc(r.betterApproach)}</p></div>`:''}${r.nextFocus?`<div class="sh-ai-review-card"><b>Что тренировать дальше</b><p>${esc(r.nextFocus)}</p></div>`:''}<div class="actions sh-ai-result-actions"><button class="btn primary" onclick="shAiSoftStart()">Новый кейс</button><button class="btn secondary" onclick="shAiSoftExit()">К тренировкам</button></div></div></div>`;
}
window.shAiSoftExit=function(){run=null;busy=false;if(typeof go==='function')go('training')};

if(!byId('shAiSoftStyle')){const s=document.createElement('style');s.id='shAiSoftStyle';s.textContent=`.sh-soft-ai-card{border-style:dashed}.sh-ai-intro{border:1px solid var(--line);border-radius:18px;background:var(--panel);padding:22px}.sh-ai-badge,.sh-ai-kicker{font-size:11px;font-weight:900;letter-spacing:.08em;color:var(--primary)}.sh-ai-status{margin:16px 0;padding:14px;border:1px solid var(--line);border-radius:14px;display:grid;gap:3px}.sh-ai-status span{font-size:13px;color:var(--muted)}.sh-ai-wrap{max-width:860px;margin:0 auto}.sh-ai-shell{padding:18px}.sh-ai-top{display:grid;grid-template-columns:auto 1fr auto;gap:13px;align-items:center;padding-bottom:14px;border-bottom:1px solid var(--line)}.sh-ai-top>div{display:grid;gap:2px}.sh-ai-top small{color:var(--muted)}.sh-ai-chat{height:min(56vh,520px);overflow:auto;padding:18px 4px;display:flex;flex-direction:column;gap:12px}.sh-ai-msg{max-width:82%;display:grid;gap:4px}.sh-ai-msg>div:last-child{border:1px solid var(--line);border-radius:16px;padding:11px 13px;line-height:1.48;background:var(--panel)}.sh-ai-msg.is-employee{align-self:flex-end}.sh-ai-msg.is-employee>div:last-child{background:color-mix(in srgb,var(--primary) 12%,var(--panel))}.sh-ai-who{font-size:11px;font-weight:800;color:var(--muted)}.sh-ai-form{border-top:1px solid var(--line);padding-top:14px}.sh-ai-form textarea{width:100%;min-height:78px}.sh-ai-form-bottom{display:flex;gap:12px;align-items:center;justify-content:space-between;margin-top:9px}.is-thinking>div:last-child{display:flex;gap:4px}.is-thinking span{width:6px;height:6px;border-radius:50%;background:currentColor;animation:shAiDot 1s infinite}@keyframes shAiDot{50%{opacity:.3}}.sh-ai-evaluating{text-align:center;padding:48px}.sh-ai-loader{width:42px;height:42px;border:4px solid var(--line);border-top-color:var(--primary);border-radius:50%;margin:0 auto 18px;animation:shAiSpin .8s linear infinite}@keyframes shAiSpin{to{transform:rotate(360deg)}}.sh-ai-result-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0}.sh-ai-result-grid section,.sh-ai-review-card{border:1px solid var(--line);border-radius:14px;padding:13px}.sh-ai-point{padding:7px 0;border-top:1px solid var(--line)}.sh-ai-result-actions{justify-content:flex-end;margin-top:16px}@media(max-width:620px){.sh-ai-top{grid-template-columns:auto 1fr}.sh-ai-top>.pill{grid-column:1/-1}.sh-ai-form-bottom{flex-direction:column;align-items:stretch}.sh-ai-result-grid{grid-template-columns:1fr}.sh-ai-msg{max-width:94%}}`;document.head.appendChild(s)}
console.info('SkillHub: AI Soft trainer enabled for all active employees and managers');
})();
