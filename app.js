console.info('SkillHub build 20260924_0730_finish_click_fix');
const S={
  sb:null,user:null,profile:null,content:[],assignments:[],attempts:[],notifications:[],allowed:[],profiles:[],
  queue:JSON.parse(localStorage.getItem('sh7_queue')||'[]'),deferredInstall:null,currentRun:null,
  authMode:'login',currentPage:'home',subscription:null,importDraft:null,dialogDraft:[],editing:null,reportFrom:'',reportTo:''
};
const titles={home:['Главная','Персональная траектория развития'],training:['Тренировки','Практика по навыкам'],progress:['Мой прогресс','Результаты и история'],notifications:['Уведомления','Новые материалы, задания и дедлайны'],mentor:['Наставник','Команда и зоны развития'],content:['Студия контента','Кейсы, Hard и живые диалоги'],assignments:['Назначения','Задания и дедлайны'],employees:['Сотрудники','Доступы, команды и Excel-импорт'],admin:['Тех. администратор','Управление доступами SkillHub']};
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const jsq=s=>String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'");
const secName=s=>s==='soft'?'Soft Skills':s==='hard'?'Hard Skills':s==='needs'?'Потребность':s==='typing'?'Скорость печати':'Скорость печати';
const ADAPTIVE={gap:75,target:90,minAttempts:2,recentWindow:3};
const isTechAdmin=()=>S.profile?.role==='tech_admin';
const isRS=()=>S.profile?.role==='rs';
const isManager=()=>['mentor','rs','tech_admin'].includes(S.profile?.role);
const roleName=r=>r==='tech_admin'?'Технический администратор':r==='rs'?'Руководитель сектора':r==='mentor'?'Руководитель группы':'Сотрудник';
function managerNames(group){return S.allowed.filter(x=>x.active&&x.role==='mentor'&&x.group_name===group).map(x=>x.name||x.login).join(', ')||'—'}
function seenContentMap(login=S.profile?.login){const m=new Map();S.attempts.filter(a=>a.login===login).forEach(a=>(attemptDetails(a)||[]).forEach(d=>{if(!d.content_id)return;const t=new Date(a.created_at).getTime();if(!m.has(d.content_id)||t>m.get(d.content_id))m.set(d.content_id,t)}));return m}
function topicProgress(sec,topic,login=S.profile?.login){const arr=S.content.filter(x=>x.status==='published'&&x.section===sec&&x.topic===topic),seen=seenContentMap(login);return {done:arr.filter(x=>seen.has(x.id)).length,total:arr.length}}
function pickSmartContent(sec,topic){const arr=S.content.filter(x=>x.status==='published'&&x.section===sec&&x.topic===topic);if(!arr.length)return null;const seen=seenContentMap(S.profile.login),unseen=arr.filter(x=>!seen.has(x.id));let pool=unseen.length?unseen:[...arr];if(!unseen.length&&pool.length>1){let last=null,lastT=-1;for(const x of pool){const t=seen.get(x.id)||0;if(t>lastT){last=x.id;lastT=t}}const alt=pool.filter(x=>x.id!==last);if(alt.length)pool=alt}return pool[Math.floor(Math.random()*pool.length)]}
function filterByPeriod(rows,from,to){return rows.filter(x=>{const d=new Date(x.created_at);if(from&&d<new Date(from+'T00:00:00'))return false;if(to&&d>new Date(to+'T23:59:59'))return false;return true})}
function safeFilePart(s){return String(s||'').replace(/[\\/:*?\"<>|]+/g,'_').replace(/\s+/g,'_').slice(0,60)}
function topicStatsFromRows(login,source=S.attempts){
  const map=new Map();
  source.filter(x=>x.login===login&&['soft','hard','needs'].includes(x.section)&&String(x.topic||'').trim()).forEach(x=>{
    const key=x.section+'|||'+String(x.topic).trim();if(!map.has(key))map.set(key,{section:x.section,topic:String(x.topic).trim(),rows:[]});map.get(key).rows.push(x);
  });
  return [...map.values()].map(g=>{const rows=g.rows.slice().sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)),recent=rows.slice(-ADAPTIVE.recentWindow),avgRecent=Math.round(recent.reduce((z,x)=>z+Number(x.score),0)/recent.length),avgAll=Math.round(rows.reduce((z,x)=>z+Number(x.score),0)/rows.length),last=Number(rows[rows.length-1].score),prev=rows.length>1?Number(rows[rows.length-2].score):null,trend=prev===null?0:last-prev;return {...g,attempts:rows.length,avgRecent,avgAll,last,trend,rows,diagnosed:rows.length>=ADAPTIVE.minAttempts,status:rows.length<ADAPTIVE.minAttempts?'unknown':avgRecent<ADAPTIVE.gap?'gap':avgRecent<ADAPTIVE.target?'attention':'strong'}}).sort((a,b)=>a.avgRecent-b.avgRecent);
}
function topicStats(login){return topicStatsFromRows(login,S.attempts)}
function gapTopics(login){return topicStats(login).filter(x=>x.status==='gap')}
function statusText(x){return x.status==='gap'?'Зона развития':x.status==='attention'?'Закрепить':x.status==='strong'?'Сильная тема':'Мало данных'}
function statusClass(x){return x.status==='gap'?'bad':x.status==='attention'?'warn':x.status==='strong'?'good':''}
function trendText(n){return n>0?'↑ +'+n:n<0?'↓ '+n:'→ 0'}
function hasTopicContent(sec,topic){return S.content.some(x=>x.status==='published'&&x.section===sec&&x.topic===topic)}
function hasActiveTopicAssignment(login,sec,topic){return S.assignments.some(x=>x.status==='active'&&x.section===sec&&x.topic===topic&&((x.recipients||[]).includes('ALL')||(x.recipients||[]).includes(login)))}
function addDaysISO(days){const d=new Date();d.setDate(d.getDate()+days);return d.toISOString().slice(0,10)}
function adaptiveRuleHtml(){return `<div class="adaptive-rule"><b>Как SkillHub определяет пробел:</b> минимум ${ADAPTIVE.minAttempts} попытки по теме, затем средний результат последних ${ADAPTIVE.recentWindow} попыток ниже ${ADAPTIVE.gap}%. Цель после отработки — ${ADAPTIVE.target}%+.</div>`}
const initials=s=>String(s||'SH').split(/[\s.]+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function toast(t){$('toast').textContent=t;$('toast').classList.remove('hidden');setTimeout(()=>$('toast').classList.add('hidden'),2400)}
function randCode(){return String(Math.floor(100000+Math.random()*900000))}
function showModal(html){$('modalCard').innerHTML=html;$('modal').classList.remove('hidden')}
function closeModal(){$('modal').classList.add('hidden')}
function normalizeLogin(s){return String(s||'').trim().toLowerCase()}
function emailFor(login){return normalizeLogin(login).replace(/[^a-z0-9._-]/g,'')+'@skillhub.example.com'}
const BUILTIN_SUPABASE_URL='https://yglmovhdmzbpnwsqcntb.supabase.co';
const BUILTIN_SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnbG1vdmhkbXpicG53c3FjbnRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2OTY1MjIsImV4cCI6MjEwNTI3MjUyMn0.39CHtbuq6B-xmCXZrRmDAZJ_hfls4ouhT7o3fJ2w1H8';
function currentConfig(){
  // 7.1.2: bundled config is preferred, but the public project URL/key are also
  // embedded as a safe fallback so a missing/cached config.js cannot strand the app
  // on the setup screen. The anon/publishable key is intentionally public.
  const bundledUrl=window.SKILLHUB_CONFIG?.SUPABASE_URL||BUILTIN_SUPABASE_URL;
  const bundledKey=window.SKILLHUB_CONFIG?.SUPABASE_ANON_KEY||BUILTIN_SUPABASE_KEY;
  localStorage.setItem('sh6_sb_url',bundledUrl);
  localStorage.setItem('sh6_sb_key',bundledKey);
  const q=new URLSearchParams(location.search);
  if(q.has('sburl')||q.has('sbkey'))history.replaceState({},'',location.pathname+location.hash);
  return {url:bundledUrl,key:bundledKey};
}
function saveSetup(){const url=$('setupUrl').value.trim(),key=$('setupKey').value.trim();if(!/^https:\/\//.test(url)||key.length<40){toast('Проверьте Project URL и anon key');return}localStorage.setItem('sh6_sb_url',url);localStorage.setItem('sh6_sb_key',key);location.reload()}
function initClient(){const c=currentConfig();if(!c.url||!c.key){$('setupView').classList.remove('hidden');return false}S.sb=supabase.createClient(c.url,c.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});return true}

function setAuthMode(mode,opts={}){S.authMode=mode;const reg=mode==='register';$('authTitle').textContent=opts.title||(reg?'Первый вход':'Давайте потренируемся');$('authText').textContent=opts.text||(reg?'Руководители и техадминистратор создают PIN без кода. Сотрудникам нужен код первого входа от руководителя группы.':'Введите корпоративный логин и ваш PIN.');$('inviteWrap').classList.toggle('hidden',!reg||opts.hideInvite===true);$('pinLabel').textContent=reg?(opts.pinLabel||'Придумайте PIN'):'PIN';$('pinInput').setAttribute('autocomplete',reg?'new-password':'current-password');$('authBtn').textContent=reg?(opts.button||'Создать профиль'):'Войти';$('authModeBtn').textContent=reg?'У меня уже есть PIN':'Первый вход / создать PIN';$('loginError').textContent=''}
function toggleAuthMode(){setAuthMode(S.authMode==='login'?'register':'login')}
async function submitAuth(){const login=normalizeLogin($('loginInput').value),pin=$('pinInput').value,invite=$('inviteInput').value.trim();$('loginError').textContent='';if(!login||pin.length<6){$('loginError').textContent='Введите логин и PIN минимум из 6 символов.';return}try{
  if(S.authMode==='register'){
    const {data,error}=await S.sb.auth.signUp({email:emailFor(login),password:pin,options:{data:{login,invite_code:invite}}});
    if(error)throw error;if(!data.session){throw new Error('В Supabase включено подтверждение e-mail. Отключите Confirm email в Authentication → Providers → Email.')}
  }else{const {error}=await S.sb.auth.signInWithPassword({email:emailFor(login),password:pin});if(error)throw error}
  await afterAuth();
}catch(e){let m=e.message||String(e);if(m.includes('Database error saving new user'))m='Не удалось создать профиль. Проверьте код первого входа. Если это самый первый профиль в новом проекте — код оставьте пустым.';if(m.toLowerCase().includes('invalid login'))m='Неверный логин или PIN.';if(m.toLowerCase().includes('load failed')||m.toLowerCase().includes('failed to fetch'))m='Нет связи с Supabase. Обновите страницу и повторите попытку.';$('loginError').textContent=m}}
async function afterAuth(){const {data:{user}}=await S.sb.auth.getUser();if(!user)throw new Error('Нет сессии');S.user=user;const {data,error}=await S.sb.from('profiles').select('*').eq('id',user.id).single();if(error)throw error;if(!data.active){await S.sb.auth.signOut();throw new Error('Доступ к SkillHub отключён наставником.')}S.profile=data;localStorage.setItem('sh7_profile',JSON.stringify(data));enterApp();await syncAll()}
async function logout(){if(S.sb)await S.sb.auth.signOut();if(S.subscription)S.sb.removeChannel(S.subscription);S.user=null;S.profile=null;$('appView').classList.add('hidden');$('loginView').classList.remove('hidden');$('profileMenu').classList.add('hidden')}
function updateRoleNavLabels(){const mentorNav=document.querySelector('.nav-btn[data-page="mentor"] span');if(!mentorNav||!S.profile)return;mentorNav.textContent=S.profile.role==='mentor'?'Моя группа':S.profile.role==='rs'?'Сектор':'Руководитель группы'}
function enterApp(){$('setupView').classList.add('hidden');$('loginView').classList.add('hidden');$('appView').classList.remove('hidden');$('profileName').textContent=S.profile.name||S.profile.login;$('roleLabel').textContent=roleName(S.profile.role);$('avatar').textContent=initials(S.profile.name||S.profile.login);document.querySelectorAll('.mentor-only').forEach(x=>x.classList.toggle('hidden',!isManager()));updateRoleNavLabels();go(isManager()?'mentor':'home');subscribeRealtime()}

function go(page){updateRoleNavLabels();S.currentPage=page;document.querySelectorAll('.page').forEach(x=>x.classList.add('hidden'));const el=$('page-'+page);if(el)el.classList.remove('hidden');document.querySelectorAll('.nav-btn').forEach(x=>x.classList.toggle('active',x.dataset.page===page));if(titles[page]){$('pageTitle').textContent=titles[page][0];$('pageSub').textContent=titles[page][1]}render(page);updateRoleNavLabels()}
function render(p){({home:renderHome,training:renderTraining,progress:renderProgress,notifications:renderNotifications,mentor:renderMentor,content:renderContent,assignments:renderAssignments,employees:renderEmployees,admin:renderTechAdmin}[p]||(()=>{}))()}
function renderCurrent(){render(S.currentPage)}
function updateNetwork(){const on=navigator.onLine;$('offlineBanner').classList.toggle('hidden',on);$('syncDot').classList.toggle('off',!on);$('syncLabel').textContent=on?(S.queue.length?'Ожидает отправки':'Синхронизировано'):'Офлайн';$('syncSub').textContent=on?(S.queue.length?`${S.queue.length} в очереди`:'облачная база'):`${S.queue.length} в очереди`}
function normalizeContent(r){return {...r,...(r.payload||{})}}
async function syncAll(manual=false){updateNetwork();if(!S.user)return;if(navigator.onLine)await flushQueue();try{
  const qs=[S.sb.from('content').select('*').order('updated_at',{ascending:false}),S.sb.from('assignments').select('*').order('created_at',{ascending:false}),S.sb.from('attempts').select('*').order('created_at',{ascending:true}),S.sb.from('notifications').select('*').order('created_at',{ascending:true})];
  const [c,a,t,n]=await Promise.all(qs);for(const r of [c,a,t,n])if(r.error)throw r.error;S.content=(c.data||[]).map(normalizeContent);S.assignments=a.data||[];S.attempts=t.data||[];S.notifications=n.data||[];
  if(isManager()){const [al,pr]=await Promise.all([S.sb.from('allowed_logins').select('*').order('login'),S.sb.from('profiles').select('*').order('login')]);if(al.error)throw al.error;if(pr.error)throw pr.error;S.allowed=al.data||[];S.profiles=pr.data||[]}else{S.allowed=[];S.profiles=[S.profile]}
  localStorage.setItem('sh7_cache_'+S.profile.login,JSON.stringify({content:S.content,assignments:S.assignments,attempts:S.attempts,notifications:S.notifications,allowed:S.allowed,profiles:S.profiles}));renderUnread();renderCurrent();if(manual)toast('Данные обновлены');
}catch(e){const c=JSON.parse(localStorage.getItem('sh7_cache_'+S.profile.login)||'null');if(c){Object.assign(S,c);renderUnread();renderCurrent()}if(manual)toast('Нет связи с базой — показана локальная копия')}}
function subscribeRealtime(){if(S.subscription)S.sb.removeChannel(S.subscription);S.subscription=S.sb.channel('skillhub-live').on('postgres_changes',{event:'*',schema:'public',table:'content'},()=>onCloudChange('Обновлены материалы')).on('postgres_changes',{event:'*',schema:'public',table:'assignments'},()=>onCloudChange('Обновлены задания')).on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications'},p=>onCloudChange(p.new?.title||'Новое уведомление')).subscribe()}
let refreshTimer=null;function onCloudChange(text){clearTimeout(refreshTimer);refreshTimer=setTimeout(async()=>{await syncAll();if('Notification'in window&&Notification.permission==='granted')new Notification('SkillHub',{body:text,icon:'./icon-192-v718.png'});toast(text)},500)}
function renderUnread(){const n=S.notifications.filter(x=>!x.read).length;$('bellBadge').textContent=n;$('bellBadge').classList.toggle('hidden',!n);if(navigator.setAppBadge){if(n)navigator.setAppBadge(n).catch(()=>{});else navigator.clearAppBadge?.().catch(()=>{})}}
function shCreateAttemptId(){
  try{if(globalThis.crypto&&typeof globalThis.crypto.randomUUID==='function')return globalThis.crypto.randomUUID()}catch(e){console.warn('randomUUID unavailable',e)}
  return `sh-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
}
function recordAttempt(a){
  const row={id:shCreateAttemptId(),user_id:S.user.id,login:S.profile.login,created_at:new Date().toISOString(),...a};
  S.attempts.push(row);S.queue.push(row);
  try{localStorage.setItem('sh7_queue',JSON.stringify(S.queue))}catch(e){console.warn('SkillHub queue save failed',e)}
  updateNetwork();
  if(navigator.onLine)Promise.resolve(flushQueue()).catch(e=>console.warn('SkillHub attempt sync failed',e));
  return row;
}
async function flushQueue(){if(!S.queue.length||!navigator.onLine)return;const copy=[...S.queue];const {error}=await S.sb.from('attempts').insert(copy);if(!error){S.queue=[];localStorage.setItem('sh7_queue','[]');updateNetwork()}}

function assignmentHtml(x){const due=x.due?new Date(x.due+'T12:00:00'):null,days=due?Math.ceil((due-new Date())/86400000):null;return `<div class="assignment"><div><b>${esc(x.title)}</b><div class="meta">${x.section?secName(x.section):''}${x.topic?' · '+esc(x.topic):''}${x.due?' · до '+esc(x.due):''}${days!==null&&days<=1?' · ⏰ скоро':''}</div></div><div class="actions"><span class="pill">${x.target}%+</span><button class="btn secondary" onclick="startAssignment('${x.id}')">Начать</button></div></div>`}
function trainingCards(){return `<div class="grid4"><div class="card train-card"><div class="icon">💬</div><h3>Soft Skills</h3><p>Присоединение, негатив, отказ и формулировки.</p><button class="btn primary" onclick="openSection('soft')">Тренировать</button></div><div class="card train-card"><div class="icon">🧠</div><h3>Hard Skills</h3><p>Решение реальных клиентских кейсов по продуктам.</p><button class="btn primary" onclick="openSection('hard')">Тренировать</button></div><div class="card train-card"><div class="icon">🎯</div><h3>Потребность</h3><p>Вопросы, критерии и живые диалоги.</p><button class="btn primary" onclick="openSection('needs')">Тренировать</button></div><div class="card train-card"><div class="icon">⌨️</div><h3>Печать</h3><p>50 текстов для тренировки скорости и точности.</p><button class="btn primary" onclick="startTyping()">Начать</button></div></div>`}
function avgSection(sec){const a=S.attempts.filter(x=>x.login===S.profile.login&&x.section===sec);return a.length?Math.round(a.reduce((s,x)=>s+Number(x.score),0)/a.length):null}
function renderHome(){const ass=S.assignments.filter(x=>x.status==='active'),recs=gapTopics(S.profile.login).slice(0,3),topicCount=topicStats(S.profile.login).filter(x=>x.diagnosed).length;const adaptive=recs.length?`<div class="section-title"><h2>🧭 Рекомендуем подтянуть</h2><span class="muted small">по вашим результатам</span></div><div class="recommend-grid">${recs.map(x=>`<div class="card recommendation"><div class="actions" style="justify-content:space-between"><span class="pill bad">${x.avgRecent}%</span><span class="muted small">${secName(x.section)}</span></div><h3>${esc(x.topic)}</h3><p class="muted">${x.attempts} попыток · последние ${Math.min(x.attempts,ADAPTIVE.recentWindow)}: ${x.avgRecent}% · ${trendText(x.trend)}</p>${hasTopicContent(x.section,x.topic)?`<button class="btn primary" onclick="startTopic('${x.section}','${jsq(x.topic)}')">Потренироваться</button>`:'<span class="muted small">Пока нет опубликованных материалов для повторения.</span>'}</div>`).join('')}</div>`:`<div class="section-title"><h2>🧭 Персональные рекомендации</h2></div><div class="card"><div class="muted">${topicCount?`Выраженных пробелов сейчас нет. Темы ниже ${ADAPTIVE.target}% будут отмечены как «закрепить».`:`Когда появятся минимум ${ADAPTIVE.minAttempts} результата по одной теме, SkillHub начнёт определять персональные зоны развития.`}</div></div>`;$('page-home').innerHTML=`<div class="grid4"><div class="card kpi"><small>Soft Skills</small><strong>${avgSection('soft')===null?'—':avgSection('soft')+'%'}</strong></div><div class="card kpi"><small>Hard Skills</small><strong>${avgSection('hard')===null?'—':avgSection('hard')+'%'}</strong></div><div class="card kpi"><small>Потребность</small><strong>${avgSection('needs')===null?'—':avgSection('needs')+'%'}</strong></div><div class="card kpi"><small>Активные задания</small><strong>${ass.length}</strong></div></div>${adaptive}<div class="section-title"><h2>📌 Мои задания</h2></div><div class="card">${ass.length?ass.map(assignmentHtml).join(''):'<div class="muted">Активных заданий пока нет.</div>'}</div><div class="section-title"><h2>Быстрый старт</h2></div>${trainingCards()}<div class="section-title"><h2>📲 На телефоне</h2></div><div class="card mobile-install"><h3>Установите SkillHub</h3><p class="muted">После установки появится отдельная иконка. Загруженные тренировки сохраняются для офлайн-работы.</p><div class="actions"><button class="btn primary" onclick="installApp()">Установить / инструкция</button><button class="btn secondary" onclick="enableNotifications()">🔔 Уведомления</button></div></div>`}
function renderTraining(){$('page-training').innerHTML=trainingCards()+`<div class="section-title"><h2>Библиотека</h2><span class="muted small">${S.content.filter(x=>x.status==='published').length} материалов</span></div><div class="card">${['soft','hard','needs'].map(sec=>`<div class="assignment"><div><b>${secName(sec)}</b><div class="meta">${S.content.filter(x=>x.section===sec&&x.status==='published').length} материалов</div></div><button class="btn secondary" onclick="openSection('${sec}')">Открыть</button></div>`).join('')}</div>`}
function openSection(sec){const arr=S.content.filter(x=>x.section===sec&&x.status==='published'),topics=[...new Set(arr.map(x=>x.topic))];showModal(`<div class="modal-head"><div><h2>${secName(sec)}</h2><div class="muted small">Выберите тему или конкретный материал</div></div><button class="btn secondary" onclick="closeModal()">✕</button></div><div class="topic-grid">${topics.map(t=>{const p=topicProgress(sec,t);return `<button class="topic" onclick="closeModal();startTopic('${sec}','${jsq(t)}')">${esc(t)}<small>Пройдено ${p.done} из ${p.total} · умная выдача</small></button>`}).join('')}</div><div class="section-title"><h2>Материалы</h2></div>${arr.map(x=>`<div class="content-row"><div><span class="pill">${x.type==='dialogue'?'Диалог':x.type==='hardcase'?'Hard-кейс':'Кейс'}</span><b>${esc(x.title||x.question)}</b><div class="meta">${esc(x.topic)}${seenContentMap().has(x.id)?' · ✓ пройден':' · ещё не пройден'}</div></div><button class="btn secondary" onclick="closeModal();startContent('${x.id}')">Начать</button></div>`).join('')||'<p class="muted">Пока пусто.</p>'}`)}
function startTopic(sec,topic){const x=pickSmartContent(sec,topic);if(!x){toast('В теме пока нет опубликованных материалов');return}startContent(x.id)}
function startContent(id){const x=S.content.find(c=>c.id===id);if(!x)return;x.type==='dialogue'?startDialogue(x):startQuiz([x],x.section,x.topic)}
function startAssignment(id){const a=S.assignments.find(x=>x.id===id);if(!a)return;a.content_id?startContent(a.content_id):startTopic(a.section,a.topic)}
function goRun(){document.querySelectorAll('.page').forEach(x=>x.classList.add('hidden'));$('page-run').classList.remove('hidden');$('pageTitle').textContent='Тренировка';$('pageSub').textContent='Практика'}
function startQuiz(items,sec,topic){S.currentRun={type:'quiz',items:[...items].sort(()=>Math.random()-.5),i:0,score:0,sec,topic,details:[]};goRun();renderQuiz()}
function renderQuiz(){const r=S.currentRun;if(r.i>=r.items.length){finishQuiz();return}const x=r.items[r.i];$('page-run').innerHTML=`<div class="card" style="max-width:850px;margin:auto"><div class="actions" style="justify-content:space-between"><button class="btn secondary" onclick="go('training')">← Выйти</button><b>${esc(x.topic)}</b><span class="muted small">${r.i+1}/${r.items.length}</span></div><div class="progress"><span style="width:${r.i/r.items.length*100}%"></span></div><div class="question">${esc(x.question)}</div><div class="options">${(x.answers||[]).map((a,i)=>`<button class="option" onclick="answerQuiz(${i})">${esc(a)}</button>`).join('')}</div><div id="runFeedback"></div></div>`}
function answerQuiz(i){const r=S.currentRun,x=r.items[r.i],correct=Number(x.correct),ok=i===correct;document.querySelectorAll('.option').forEach((b,k)=>{b.disabled=true;if(k===correct)b.classList.add('correct');if(k===i&&k!==correct)b.classList.add('wrong')});r.details.push({kind:'quiz',content_id:x.id||null,title:x.title||'',question:x.question||'',options:[...(x.answers||[])],selected:i,correct,is_correct:ok,explanation:x.explanation||''});if(ok)r.score++;const isLast=r.i>=r.items.length-1;$('runFeedback').innerHTML=`<div class="explain">${esc(x.explanation||'')}</div><div class="actions" style="justify-content:flex-end;margin-top:12px"><button id="quizAdvanceBtn" type="button" class="btn primary sh-run-advance">${isLast?'Завершить кейс →':'Дальше'}</button></div>`;
const nextBtn=$('quizAdvanceBtn');if(nextBtn)nextBtn.onclick=()=>advanceQuiz()}
function advanceQuiz(){
  const r=S.currentRun;if(!r||r.type!=='quiz')return;
  const btn=$('quizAdvanceBtn');if(btn)btn.disabled=true;
  try{if(r.i+1>=r.items.length){finishQuiz();return}r.i++;renderQuiz()}catch(e){console.error('advanceQuiz failed',e);if(btn)btn.disabled=false;toast('Не удалось перейти дальше. Попробуйте ещё раз.')}
}
function finishQuiz(){const r=S.currentRun;if(!r||r.finished)return;r.finished=true;const p=Math.round(r.score/Math.max(1,r.items.length)*100);recordAttempt({section:r.sec,topic:r.topic,score:p,type:'quiz',cpm:0,details:r.details||[]});$('page-run').innerHTML=`<div class="card" style="max-width:650px;margin:auto;text-align:center"><strong style="font-size:52px">${p}%</strong><h2>Тренировка завершена</h2><p class="muted">${r.score} из ${r.items.length} правильных решений</p><button class="btn primary" onclick="go('training')">Готово</button></div>`}
function startDialogue(x){S.currentRun={type:'dialogue',x,i:0,score:0,details:[]};goRun();renderDialogue()}
function renderDialogue(){
const r=S.currentRun,x=r.x;
const isNew=!!x.payload?.scenario;
const total=isNew?1:(x.steps||[]).length;
if(r.i>=total){finishDialogue();return}
const data=isNew?x.payload:{step:x.steps[r.i]};
const client=isNew?data.scenario.client:data.step.client;
const options=isNew?data.answers.map(a=>a.text):data.step.options;
$('page-run').innerHTML=`<div class="dialogue"><div class="card"><div class="actions" style="justify-content:space-between"><button class="btn secondary" onclick="go('training')">← Выйти</button><b>${esc(x.title)}</b><span class="muted small">${r.i+1}/${total}</span></div><div class="bubble client"><b>Клиент</b><br>${esc(client)}</div><div class="muted small" style="margin:14px 0 8px">Что ответит сотрудник?</div><div class="options">${options.map((a,i)=>`<button class="option" onclick="answerDialogue(${i})">${esc(a)}</button>`).join('')}</div><div id="runFeedback"></div></div></div>`}
function parseDialogueExplanation(text){
  const src=String(text||'').replace(/\r/g,'').trim();
  if(!src)return null;
  const skill=(src.match(/🎯\s*КЛЮЧЕВОЙ НАВЫК:\s*([^\n]+)/i)||[])[1]?.trim()||'';
  const procedurePath=(src.match(/📍\s*ГДЕ ПРОВЕРИТЬ\s*\n([^\n]+)/i)||[])[1]?.trim()||'';
  let procedureName='';
  if(procedurePath){
    const quoted=procedurePath.match(/Процедура\s*[«"]([^»"]+)[»"]/i);
    procedureName=quoted?quoted[1].trim():(procedurePath.split('→')[0]||procedurePath).replace(/^Процедура\s*/i,'').trim();
  }
  const correctPart=(src.split(/⚠️\s*ПОЧЕМУ ОСТАЛЬНЫЕ ВАРИАНТЫ СЛАБЕЕ/i)[0]||'')
    .replace(/✅\s*ПОЧЕМУ ЭТО ЛУЧШИЙ ВАРИАНТ/i,'').trim();
  const blocks=[...correctPart.matchAll(/^\s*(\d+)\.\s*(.+)$/gm)].map(m=>({title:`${m[1]}. ${m[2].trim()}`,text:''}));
  const wrong=[];
  const wrongPart=(src.split(/⚠️\s*ПОЧЕМУ ОСТАЛЬНЫЕ ВАРИАНТЫ СЛАБЕЕ/i)[1]||'').split(/🎯\s*КЛЮЧЕВОЙ НАВЫК/i)[0]||'';
  const re=/Вариант\s+(\d+)\s*\nЧто хорошо:\s*([^\n]+)\s*\nГде (?:слабое место|ошибка):\s*([^\n]+)\s*\nРиск:\s*([^\n]+)/gi;
  let m;
  while((m=re.exec(wrongPart))){wrong.push({answer:Number(m[1]),good:m[2].trim(),mistake:m[3].trim(),risk:m[4].trim()})}
  return {correct:{blocks},wrong,skill,procedurePath,procedureName,raw:src};
}
function answerDialogue(i){
const r=S.currentRun,x=r.x,isNew=!!x.payload?.scenario;
const data=isNew?x.payload:{step:x.steps[r.i]};
const options=isNew?data.answers.map(a=>a.text):data.step.options;
const correct=isNew?data.answers.findIndex(a=>a.correct):Number(data.step.correct);
const ok=i===correct;
document.querySelectorAll('.option').forEach((b,k)=>{b.disabled=true;if(k===correct)b.classList.add('correct');if(k===i&&k!==correct)b.classList.add('wrong')});
const legacyExplanation=!isNew?(data.step.explanation||''):'';
r.details.push({kind:'dialogue',content_id:x.id||null,title:x.title||'',step:r.i+1,question:isNew?(data.scenario?.client||''):(data.step.client||''),selected:i,correct,is_correct:ok,options:[...options],explanation:legacyExplanation});if(ok)r.score++;
const e=isNew?(data.review||{}):(data.step.review||parseDialogueExplanation(legacyExplanation)||{});
const blocks=e.correct?.blocks||[];
const wrong=e.wrong||[];
const correctBlocks=blocks.map(x=>`<div class="review-card"><b>${esc(x.title)}</b>${x.text?`<div>${esc(x.text)}</div>`:''}</div>`).join('');
const wrongBlocks=wrong.map(x=>`<div class="wrong-card"><h4>🔴 Вариант ${esc(x.answer??x.variant)}</h4><div class="mini"><b>✅ Что хорошо</b><br>${esc(x.good)}</div><div class="mini"><b>⚠️ Где ошибка</b><br>${esc(x.mistake||x.error)}</div><div class="mini"><b>🎯 Риск</b><br>${esc(x.risk)}</div></div>`).join('');
const isHard=String(x.section||'').toLowerCase()==='hard';
const procedurePath=e.procedurePath||e.source?.path||'';
const procedureName=e.procedureName||e.source?.name||'';
const sourceCard=isHard&&procedurePath?`<div class="skill-card procedure-card"><b>📚 Взято из процедуры</b><br><strong>${esc(procedureName||'Процедура')}</strong><div class="small" style="margin-top:6px">${esc(procedurePath)}</div></div>`:(!isHard&&e.skill?`<div class="skill-card"><b>🎯 Главный навык</b><br>${esc(e.skill)}</div>`:'');
const fallback=(!correctBlocks&&!wrongBlocks&&!sourceCard&&legacyExplanation)?`<div class="explain">${esc(legacyExplanation).replace(/\n/g,'<br>')}</div>`:'';
const total=isNew?1:(x.steps||[]).length,isLast=r.i>=total-1;
$('runFeedback').innerHTML=`${correctBlocks?`<div class="review-title success">✅ Почему выбранный ответ правильный</div><div>${correctBlocks}</div>`:''}${wrongBlocks?`<div class="review-title danger">❌ Почему другие варианты не подходят</div><div>${wrongBlocks}</div>`:''}${sourceCard}${fallback}<div class="actions" style="justify-content:flex-end;margin-top:12px"><button id="dialogueAdvanceBtn" type="button" class="btn primary sh-run-advance">${isLast?'Завершить кейс →':'Продолжить'}</button></div>`;
const nextBtn=$('dialogueAdvanceBtn');if(nextBtn)nextBtn.onclick=()=>advanceDialogue()}
function advanceDialogue(){
  const r=S.currentRun;if(!r||r.type!=='dialogue')return;
  const btn=$('dialogueAdvanceBtn');if(btn)btn.disabled=true;
  const x=r.x,total=x?.payload?.scenario?1:(x?.steps||[]).length;
  try{if(r.i+1>=total){finishDialogue();return}r.i++;renderDialogue()}catch(e){console.error('advanceDialogue failed',e);if(btn)btn.disabled=false;toast('Не удалось перейти дальше. Попробуйте ещё раз.')}
}
function finishDialogue(){const r=S.currentRun;if(!r||r.finished)return;r.finished=true;const total=r.x?.payload?.scenario?1:(r.x?.steps||[]).length,p=Math.round(r.score/Math.max(1,total)*100);recordAttempt({section:r.x.section,topic:r.x.topic,score:p,type:'dialogue',cpm:0,details:r.details||[]});$('page-run').innerHTML=`<div class="card" style="max-width:650px;margin:auto;text-align:center"><strong style="font-size:52px">${p}%</strong><h2>Диалог завершён</h2><p class="muted">${r.score} из ${total} правильных решений</p><button class="btn primary" onclick="go('training')">Готово</button></div>`}
const TYPING_TEXTS=[
  "Понимаю, что ситуация для вас важна. Давайте проверю информацию и подскажу, какие варианты доступны сейчас.",
  "Спасибо, что подробно описали ситуацию. Сейчас уточню детали по операции и вернусь к вам с понятным решением.",
  "Вижу, что платёж пока не прошёл. Проверю статус операции и расскажу, что можно сделать дальше.",
  "Понимаю ваше беспокойство из-за задержки. Давайте посмотрим, на каком этапе находится перевод и когда ожидать результат.",
  "Сейчас проверю условия по вашему тарифу и подскажу, можно ли подключить нужную услугу без дополнительных расходов.",
  "Спасибо за ожидание. Я уже проверяю информацию по вашему обращению и постараюсь решить вопрос как можно быстрее.",
  "Чтобы помочь точнее, уточните, пожалуйста, дату операции и последние четыре цифры карты, с которой проводилась оплата.",
  "Вижу причину отклонения операции. Сейчас объясню её простыми словами и подскажу, как повторить платёж успешно.",
  "Понимаю, что повторно вводить данные неудобно. Проверю, можно ли восстановить доступ другим способом.",
  "Давайте сначала уточним, что именно вы хотите изменить. После этого подберём самый быстрый вариант решения.",
  "Проверил информацию: ограничение временное. Расскажу, что нужно сделать, чтобы снова пользоваться услугой.",
  "Сейчас операция находится в обработке. Как только статус изменится, информация появится в приложении автоматически.",
  "Понимаю, что вам важно получить деньги вовремя. Проверю сроки зачисления и возможные причины задержки.",
  "Для безопасности нужно подтвердить личность. Это займёт несколько минут, после чего мы сможем продолжить решение вопроса.",
  "Спасибо, данные получил. Сейчас сверю их с системой и подскажу следующий шаг без лишних действий с вашей стороны.",
  "В этом тарифе услуга не включена, но есть другой вариант. Сейчас расскажу, чем он отличается и сколько стоит.",
  "Отменить операцию уже не получится, потому что она ушла в обработку. Проверю, какие варианты остаются в вашей ситуации.",
  "Понимаю, что ответ поддержки мог показаться сложным. Объясню проще и по шагам, что происходит с вашим обращением.",
  "Чтобы обновить данные, понадобится подтверждающий документ. Подскажу, где его загрузить и сколько займёт проверка.",
  "Проверка ещё не завершена. Как только появится решение, вы получите уведомление в доступном канале связи.",
  "Сейчас посмотрю, почему изменились условия обслуживания, и объясню, какие параметры действуют по вашему продукту.",
  "Возврат уже оформлен. Срок зачисления зависит от платёжной системы, но я подскажу ориентировочную дату поступления денег.",
  "Вижу, что у вас нет доступа к этому разделу. Проверю причину и подскажу, как получить нужные права.",
  "Для решения вопроса не хватает одной детали. Уточните её, пожалуйста, и я сразу продолжу проверку.",
  "По счёту действует ограничение, поэтому операция сейчас недоступна. Объясню, откуда оно появилось и что можно сделать.",
  "Часть данных не совпадает с информацией в системе. Давайте сверим их вместе, чтобы быстро найти расхождение.",
  "Перед подключением услуги нужно подтвердить данные. Расскажу, как это сделать в приложении без обращения в офис.",
  "Повторно сформировать документ можно после завершения текущей операции. Проверю её статус и подскажу, сколько ждать.",
  "После оформления заявки способ получения изменить нельзя. Но я проверю, есть ли подходящая альтернатива для вас.",
  "Чтобы восстановить доступ, потребуется повторное подтверждение личности. Проведу вас по шагам, чтобы всё получилось с первого раза.",
  "Перевод отправлен, но банк получателя ещё обрабатывает его. Подскажу стандартные сроки и когда стоит обратиться повторно.",
  "Нужно подключить профильных специалистов. Я передам им обращение и объясню, когда ожидать результат проверки.",
  "Текущий лимит меньше суммы операции. Покажу, где посмотреть ограничения и какие варианты доступны для проведения платежа.",
  "Результат проверки придёт уведомлением. Вам не нужно постоянно обновлять страницу или создавать новое обращение.",
  "Проверьте реквизиты ещё раз, особенно номер счёта и данные получателя. После этого можно безопасно повторить операцию.",
  "Условия продукта меняются после завершения расчётного периода. Подскажу точную дату, с которой начнут действовать новые параметры.",
  "Сейчас проходят технические работы, поэтому часть функций временно недоступна. Сообщу, когда сервис должен восстановиться.",
  "Эту информацию можем предоставить только владельцу продукта. Подскажу быстрый способ подтвердить личность и продолжить.",
  "Перед закрытием продукта нужно погасить задолженность. Сейчас покажу её размер и варианты оплаты.",
  "Решение по заявке формируется автоматически на основе доступных данных. Объясню, где увидеть итоговый статус.",
  "Понимаю, что списание оказалось неожиданным. Проверю назначение операции и помогу разобраться, можно ли вернуть деньги.",
  "Если карта потеряна, лучше сразу ограничить операции. Подскажу, как заблокировать её и заказать новую в приложении.",
  "Сейчас проверю, почему не приходит код подтверждения. Заодно посмотрим, правильно ли указан номер телефона.",
  "Уведомления можно настроить в приложении. Расскажу, где выбрать нужные события и отключить лишние сообщения.",
  "Проверю, почему комиссия отличается от ожидаемой. Объясню расчёт и покажу, где заранее увидеть стоимость операции.",
  "Понимаю, что вам неудобно ждать ответа. Уточню текущий статус обращения и сообщу, есть ли возможность ускорить проверку.",
  "Если приложение не открывается, начнём с самых простых шагов. Проверим интернет, обновление и повторный вход в аккаунт.",
  "Платёж мог пройти, даже если чек ещё не появился. Сначала проверю статус операции, чтобы не создавать повторное списание.",
  "Давайте разберёмся с подпиской. Проверю дату подключения, стоимость и доступные способы отключения без лишних списаний.",
  "Вижу, что вопрос касается нескольких операций. Разберём их по очереди, чтобы ничего не пропустить и дать точный ответ."
];
let typingInt=null;
function shuffledTypingTexts(){
  const a=TYPING_TEXTS.map((text,i)=>({text,n:i+1}));
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
  return a;
}
function startTyping(){
  if(typingInt)clearInterval(typingInt);
  S.currentRun={type:'typing',items:shuffledTypingTexts(),i:0,start:0,saved:false,finished:false};
  goRun();renderTypingRound();
}
function typingRound(){return S.currentRun?.items?.[S.currentRun.i]||null}
function renderTypingRound(){
  if(typingInt)clearInterval(typingInt);typingInt=null;
  const r=S.currentRun,item=typingRound();if(!r||!item){go('training');return}
  r.start=0;r.saved=false;r.finished=false;
  $('page-run').innerHTML=`<div class="card typing-run-card" style="max-width:900px;margin:auto"><div class="actions" style="justify-content:space-between;align-items:center"><button class="btn secondary" onclick="exitTyping()">← Выйти</button><div style="text-align:center"><b>Скорость печати</b><div class="muted small">Текст ${r.i+1} из ${r.items.length}</div></div><span id="typingTimer" class="pill">60 сек.</span></div><div class="typing-source-label">Перепечатайте текст</div><div id="typingSource" class="typing-source no-copy" oncopy="return false" oncut="return false" oncontextmenu="return false" ondragstart="return false" onselectstart="return false" draggable="false">${esc(item.text)}</div><textarea id="typingBox" class="typing-box" rows="8" placeholder="Начните печатать…" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" oninput="typingInput()"></textarea><div id="typingStats" class="grid3" style="margin-top:12px"></div><div id="typingRoundResult" class="hidden"></div><div class="actions typing-actions"><button class="btn secondary" onclick="exitTyping()">Выйти</button><button id="typingNextBtn" class="btn primary" onclick="nextTyping()">Далее →</button></div><div class="hint">При нажатии «Далее» или «Выйти» текущий результат сохраняется. Исходный текст выделить и скопировать нельзя.</div></div>`;
  typingInput();
  setTimeout(()=>$('typingBox')?.focus(),50);
}
function typingMetrics(){
  const b=$('typingBox'),r=S.currentRun,item=typingRound();if(!b||!r||!item)return{v:'',elapsed:0,left:60,matched:0,accuracy:100,cpm:0};
  const v=b.value,elapsed=r.start?Math.max((Date.now()-r.start)/1000,1):0,left=Math.max(0,60-Math.floor(elapsed));let matched=0;
  for(let i=0;i<v.length;i++)if(v[i]===item.text[i])matched++;
  const accuracy=v.length?Math.round(matched/v.length*100):100,cpm=elapsed?Math.round(v.length/(elapsed/60)):0;
  return{v,elapsed,left,matched,accuracy,cpm};
}
function typingInput(){
  const b=$('typingBox'),r=S.currentRun;if(!b||!r||r.finished)return;
  if(!r.start&&b.value.length){r.start=Date.now();typingInt=setInterval(updateTyping,500)}
  updateTyping();
}
function updateTyping(){
  const b=$('typingBox'),r=S.currentRun;if(!b||!r)return;const m=typingMetrics();
  $('typingTimer').textContent=m.left+' сек.';
  $('typingStats').innerHTML=`<div class="card kpi"><small>Скорость</small><strong>${m.cpm}</strong><span class="muted small">зн./мин</span></div><div class="card kpi"><small>Точность</small><strong>${m.accuracy}%</strong></div><div class="card kpi"><small>Знаков</small><strong>${m.v.length}</strong></div>`;
  if(m.left<=0)finishTypingRound(false);
}
function saveTypingRound(){
  const r=S.currentRun,item=typingRound();if(!r||!item||r.saved)return false;const m=typingMetrics();
  if(!r.start&&!m.v.length)return false;
  recordAttempt({section:'typing',topic:'Текст '+String(item.n).padStart(2,'0'),score:m.accuracy,type:'typing',cpm:m.cpm});
  r.saved=true;return true;
}
function finishTypingRound(showToast=true){
  const r=S.currentRun;if(!r||r.finished)return;if(typingInt)clearInterval(typingInt);typingInt=null;r.finished=true;
  const m=typingMetrics(),b=$('typingBox');if(b)b.disabled=true;saveTypingRound();
  const result=$('typingRoundResult');if(result){result.classList.remove('hidden');result.innerHTML=`<div class="typing-result"><b>Результат сохранён</b><span>${m.cpm} зн./мин · точность ${m.accuracy}%</span></div>`}
  if(r.i>=r.items.length-1){const n=$('typingNextBtn');if(n)n.textContent='Завершить'}
  if(showToast)toast('Результат сохранён');
}
function nextTyping(){
  const r=S.currentRun;if(!r)return;finishTypingRound(false);
  if(r.i>=r.items.length-1){toast('Все 50 текстов завершены');go('training');return}
  r.i++;renderTypingRound();
}
function exitTyping(){
  const r=S.currentRun;if(r)finishTypingRound(false);if(typingInt)clearInterval(typingInt);typingInt=null;go('training');toast('Результат сохранён');
}

function attemptDetails(a){return Array.isArray(a?.details)?a.details:[]}
function attemptTypeName(t){return t==='dialogue'?'Живой диалог':t==='typing'?'Скорость печати':'Тест'}
function openAttemptReview(id){
  const a=S.attempts.find(x=>x.id===id);if(!a)return;
  const d=attemptDetails(a),correct=d.filter(x=>x.is_correct).length;
  const body=d.length?d.map((q,idx)=>{
    const opts=Array.isArray(q.options)?q.options:[];
    return `<div class="review-item">
      <div class="review-head"><b>${q.kind==='dialogue'?'Шаг ':'Вопрос '}${q.step||idx+1}</b><span class="pill ${q.is_correct?'good':'bad'}">${q.is_correct?'Верно':'Ошибка'}</span></div>
      ${q.title?`<div class="meta">${esc(q.title)}</div>`:''}
      <div class="review-question">${esc(q.question||'')}</div>
      <div class="review-options">${opts.map((o,i)=>`<div class="review-option ${i===Number(q.correct)?'right':''} ${i===Number(q.selected)&&i!==Number(q.correct)?'picked-wrong':''}">
        <span class="review-num">${i+1}</span><span>${esc(o)}</span>
        <span class="review-tag">${i===Number(q.selected)?'Выбрано':''}${i===Number(q.selected)&&i===Number(q.correct)?' · ':''}${i===Number(q.correct)?'Правильный':''}</span>
      </div>`).join('')}</div>
      ${q.explanation?`<div class="explain">${esc(q.explanation)}</div>`:''}
    </div>`;
  }).join(''):`<div class="hint">Эта попытка была сделана до обновления SkillHub 6.2, поэтому выбранные варианты тогда ещё не сохранялись. Процент и тема попытки сохранены.</div>`;
  showModal(`<div class="modal-head"><div><h2>Ответы сотрудника</h2><div class="meta">${esc(a.login)} · ${secName(a.section)} · ${esc(a.topic)} · ${new Date(a.created_at).toLocaleString('ru-RU')}</div></div><button class="btn secondary" onclick="closeModal()">✕</button></div>
    <div class="review-summary"><span class="pill ${Number(a.score)>=90?'good':Number(a.score)>=75?'warn':'bad'}">${a.score}%</span><b>${attemptTypeName(a.type)}</b>${d.length?`<span class="muted small">${correct} из ${d.length} верно</span>`:''}</div>${body}`);
}
function openUserAttempts(login){
  const rows=S.attempts.filter(x=>x.login===login).slice().sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  const u=S.allowed.find(x=>x.login===login);
  showModal(`<div class="modal-head"><div><h2>${esc(u?.name||login)}</h2><div class="meta">${esc(login)} · история попыток</div></div><div class="actions">${isManager()?`<button class="btn secondary" onclick="openMentorExport('', '${jsq(login)}')">⬇ Excel</button>`:''}<button class="btn secondary" onclick="closeModal()">✕</button></div></div>
  <div class="card table-wrap"><table class="table"><thead><tr><th>Дата</th><th>Раздел</th><th>Тема</th><th>Результат</th><th>Детали</th></tr></thead><tbody>${rows.length?rows.map(a=>`<tr><td>${new Date(a.created_at).toLocaleString('ru-RU')}</td><td>${secName(a.section)}</td><td>${esc(a.topic)}</td><td><span class="pill ${Number(a.score)>=90?'good':Number(a.score)>=75?'warn':'bad'}">${a.score}%</span></td><td>${a.type==='typing'?'—':attemptDetails(a).length?`<button class="btn secondary" onclick="openAttemptReview('${a.id}')">Ответы</button>`:'<span class="muted small">до 6.2</span>'}</td></tr>`).join(''):'<tr><td colspan="5" class="muted">У сотрудника пока нет попыток.</td></tr>'}</tbody></table></div>`);
}
function reportEmployees(group='',login=''){let a=S.allowed.filter(x=>x.active&&x.role==='employee');if(group)a=a.filter(x=>x.group_name===group);if(login)a=a.filter(x=>x.login===login);return a}
function employeeMetrics(u,attemptRows=S.attempts){const a=attemptRows.filter(x=>x.login===u.login),avg=sec=>{const q=a.filter(x=>x.section===sec);return q.length?Math.round(q.reduce((z,x)=>z+Number(x.score),0)/q.length):null};const t=topicStatsFromRows(u.login,attemptRows),g=t.filter(x=>x.status==='gap');return {...u,soft:avg('soft'),hard:avg('hard'),needs:avg('needs'),attempts:a.length,gaps:g,last:a.length?a.slice().sort((x,y)=>new Date(y.created_at)-new Date(x.created_at))[0].created_at:null}}
function openMentorExport(group='',login=''){const title=login?'Отчёт по сотруднику':group?'Отчёт по команде':'Отчёт по сектору';showModal(`<div class="modal-head"><div><h2>${title}</h2><div class="meta">Excel: сводка, динамика, зоны развития, история ответов, назначения</div></div><button class="btn secondary" onclick="closeModal()">✕</button></div><div class="form-grid"><div class="field"><label>С даты</label><input id="repFrom" type="date"></div><div class="field"><label>По дату</label><input id="repTo" type="date"></div></div><div class="hint">Если даты не указывать — выгрузится вся доступная история.</div><div class="actions" style="justify-content:flex-end;margin-top:14px"><button class="btn primary" onclick="exportMentorExcel('${jsq(group)}','${jsq(login)}',$('repFrom').value,$('repTo').value)">⬇ Выгрузить Excel</button></div>`)}
function exportMentorExcel(group='',login='',from='',to=''){const users=reportEmployees(group,login),logs=new Set(users.map(x=>x.login)),attempts=filterByPeriod(S.attempts.filter(x=>logs.has(x.login)),from,to),profileByLogin=new Map(S.allowed.map(x=>[x.login,x]));const managerFor=g=>managerNames(g);const summary=users.map(u=>{const m=employeeMetrics(u,attempts);return {'Руководитель':managerFor(u.group_name),'Группа':u.group_name,'Сотрудник':u.name||u.login,'Логин':u.login,'Soft %':m.soft??'','Hard %':m.hard??'','Потребность %':m.needs??'','Зон развития':m.gaps.length,'Попыток':m.attempts,'Последняя активность':m.last?new Date(m.last).toLocaleString('ru-RU'):''}});const dynamics=attempts.slice().sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)).map(a=>{const u=profileByLogin.get(a.login)||{};return {'Руководитель':managerFor(u.group_name),'Группа':u.group_name||'','Сотрудник':u.name||a.login,'Логин':a.login,'Дата':new Date(a.created_at).toLocaleString('ru-RU'),'Раздел':secName(a.section),'Тема':a.topic,'Результат %':Number(a.score),'Тип':attemptTypeName(a.type)}});const zones=[];for(const u of users){for(const t of topicStatsFromRows(u.login,attempts)){zones.push({'Руководитель':managerFor(u.group_name),'Группа':u.group_name,'Сотрудник':u.name||u.login,'Логин':u.login,'Раздел':secName(t.section),'Тема':t.topic,'Последние %':t.avgRecent,'Попыток':t.attempts,'Тренд':trendText(t.trend),'Статус':statusText(t)})}}const answers=[];for(const a of attempts){const u=profileByLogin.get(a.login)||{};(attemptDetails(a)||[]).forEach((d,i)=>{const opts=Array.isArray(d.options)?d.options:[];answers.push({'Руководитель':managerFor(u.group_name),'Группа':u.group_name||'','Сотрудник':u.name||a.login,'Логин':a.login,'Дата':new Date(a.created_at).toLocaleString('ru-RU'),'Раздел':secName(a.section),'Тема':a.topic,'Материал':d.title||'','Шаг / вопрос':d.step||i+1,'Вопрос':d.question||'','Выбранный ответ':opts[Number(d.selected)]||'','Правильный ответ':opts[Number(d.correct)]||'','Верно':d.is_correct?'Да':'Нет','Объяснение':d.explanation||''})})}const assignments=[];for(const x of S.assignments){let rec=(x.recipients||[]);let relevant=rec.includes('ALL')?users:users.filter(u=>rec.includes(u.login));for(const u of relevant)assignments.push({'Руководитель':managerFor(u.group_name),'Группа':u.group_name,'Сотрудник':u.name||u.login,'Логин':u.login,'Назначение':x.title,'Раздел':x.section?secName(x.section):'','Тема':x.topic||'','Дедлайн':x.due||'','Цель %':x.target,'Статус':x.status})}const wb=XLSX.utils.book_new();const add=(name,rows,headers)=>{const ws=rows.length?XLSX.utils.json_to_sheet(rows):XLSX.utils.aoa_to_sheet([headers]);XLSX.utils.book_append_sheet(wb,ws,name)};add('Сводка',summary,['Руководитель','Группа','Сотрудник','Логин','Soft %','Hard %','Потребность %','Зон развития','Попыток','Последняя активность']);add('Динамика',dynamics,['Руководитель','Группа','Сотрудник','Логин','Дата','Раздел','Тема','Результат %','Тип']);add('Зоны развития',zones,['Руководитель','Группа','Сотрудник','Логин','Раздел','Тема','Последние %','Попыток','Тренд','Статус']);add('История ответов',answers,['Руководитель','Группа','Сотрудник','Логин','Дата','Раздел','Тема','Материал','Шаг / вопрос','Вопрос','Выбранный ответ','Правильный ответ','Верно','Объяснение']);add('Назначения',assignments,['Руководитель','Группа','Сотрудник','Логин','Назначение','Раздел','Тема','Дедлайн','Цель %','Статус']);const scope=login?login:group||'Сектор',period=(from||to)?`_${from||'start'}_${to||'today'}`:'';XLSX.writeFile(wb,`SkillHub_Отчёт_${safeFilePart(scope)}${period}.xlsx`);toast('Excel сформирован')}
function renderProgress(){const a=S.attempts.filter(x=>x.login===S.profile.login).slice().reverse(),ts=topicStats(S.profile.login);$('page-progress').innerHTML=`<div class="grid3"><div class="card kpi"><small>Попыток</small><strong>${a.length}</strong></div><div class="card kpi"><small>Средний результат</small><strong>${a.length?Math.round(a.reduce((s,x)=>s+Number(x.score),0)/a.length)+'%':'—'}</strong></div><div class="card kpi"><small>Последняя активность</small><strong style="font-size:17px">${a[0]?new Date(a[0].created_at).toLocaleDateString('ru-RU'):'—'}</strong></div></div><div class="section-title"><h2>🧭 Темы и зоны развития</h2></div>${adaptiveRuleHtml()}<div class="card table-wrap"><table class="table"><thead><tr><th>Раздел</th><th>Тема</th><th>Последние</th><th>Попыток</th><th>Статус</th><th></th></tr></thead><tbody>${ts.length?ts.map(x=>`<tr><td>${secName(x.section)}</td><td><b>${esc(x.topic)}</b></td><td>${x.avgRecent}% <span class="trend ${x.trend>0?'up':x.trend<0?'down':''}">${trendText(x.trend)}</span></td><td>${x.attempts}</td><td><span class="pill ${statusClass(x)}">${statusText(x)}</span></td><td>${x.status==='gap'&&hasTopicContent(x.section,x.topic)?`<button class="btn secondary" onclick="startTopic('${x.section}','${jsq(x.topic)}')">Повторить</button>`:''}</td></tr>`).join(''):'<tr><td colspan="6" class="muted">Пока нет результатов для анализа.</td></tr>'}</tbody></table></div><div class="section-title"><h2>История</h2></div><div class="card table-wrap"><table class="table"><thead><tr><th>Дата</th><th>Раздел</th><th>Тема</th><th>Результат</th><th>Ответы</th></tr></thead><tbody>${a.map(x=>`<tr><td>${new Date(x.created_at).toLocaleString('ru-RU')}</td><td>${secName(x.section)}</td><td>${esc(x.topic)}</td><td><span class="pill ${Number(x.score)>=90?'good':Number(x.score)>=75?'warn':'bad'}">${x.score}%</span></td><td>${x.type==='typing'?'—':attemptDetails(x).length?`<button class="btn secondary" onclick="openAttemptReview('${x.id}')">Посмотреть</button>`:'<span class="muted small">до 6.2</span>'}</td></tr>`).join('')}</tbody></table></div>`}
async function markAllRead(){const ids=S.notifications.filter(x=>!x.read).map(x=>x.id);if(!ids.length)return;const {error}=await S.sb.from('notifications').update({read:true}).in('id',ids);if(!error){S.notifications.forEach(n=>n.read=true);renderUnread();renderNotifications()}}
function renderNotifications(){$('page-notifications').innerHTML=`<div class="actions" style="justify-content:flex-end"><button class="btn secondary" onclick="markAllRead()">Прочитать всё</button></div><div class="card" style="margin-top:10px">${S.notifications.length?S.notifications.slice().reverse().map(n=>`<div class="notification"><div><b>${n.read?'':'● '}${esc(n.title)}</b><div class="meta">${esc(n.body)} · ${new Date(n.created_at).toLocaleString('ru-RU')}</div></div></div>`).join(''):'<div class="muted">Уведомлений нет.</div>'}</div>`}

function teamRows(group=''){let active=S.allowed.filter(x=>x.active&&x.role==='employee');if(group)active=active.filter(x=>x.group_name===group);return active.map(u=>employeeMetrics(u,S.attempts))}
function teamTableHtml(u){return `<div class="card table-wrap"><table class="table"><thead><tr><th>Сотрудник</th><th>Soft</th><th>Hard</th><th>Потребность</th><th>Пробелов</th><th>Попыток</th><th></th></tr></thead><tbody>${u.map(x=>`<tr><td><b>${esc(x.name||x.login)}</b><div class="meta">${esc(x.login)}</div></td><td>${x.soft===null?'—':x.soft+'%'}</td><td>${x.hard===null?'—':x.hard+'%'}</td><td>${x.needs===null?'—':x.needs+'%'}</td><td>${x.gaps.length?`<span class="pill bad">${x.gaps.length}</span>`:'—'}</td><td>${x.attempts}</td><td>${x.attempts?`<button class="btn secondary" onclick="openUserAttempts('${jsq(x.login)}')">История</button>`:'—'}</td></tr>`).join('')||'<tr><td colspan="7" class="muted">Сотрудников нет.</td></tr>'}</tbody></table></div>`}
function renderManagerMentor(){const u=teamRows(),avg=k=>{const vals=u.map(x=>x[k]).filter(x=>x!==null);return vals.length?Math.round(vals.reduce((s,x)=>s+x,0)/vals.length):null},gaps=u.flatMap(emp=>emp.gaps.map(g=>({...g,login:emp.login,name:emp.name||emp.login}))).sort((a,b)=>a.avgRecent-b.avgRecent),diagnosedUsers=u.filter(x=>topicStats(x.login).some(t=>t.diagnosed)).length;$('pageTitle').textContent='Наставник';$('pageSub').textContent=`Моя команда · ${S.profile.group_name}`;$('page-mentor').innerHTML=`<div class="toolbar"><div><b>Команда: ${esc(S.profile.group_name)}</b><div class="muted small">Руководитель видит только свою группу</div></div><button class="btn secondary" onclick="openMentorExport()">⬇ Отчёт Excel</button></div><div class="grid4"><div class="card kpi"><small>Команда</small><strong>${u.length}</strong><span class="muted small">активных сотрудников</span></div><div class="card kpi"><small>Hard</small><strong>${avg('hard')===null?'—':avg('hard')+'%'}</strong></div><div class="card kpi"><small>Диагностировано</small><strong>${diagnosedUsers}</strong></div><div class="card kpi"><small>Зоны развития</small><strong>${gaps.length}</strong></div></div><div class="section-title"><h2>🧭 Зоны развития и рекомендации</h2><span class="muted small">назначение подтверждаете вы</span></div>${adaptiveRuleHtml()}<div class="card">${gaps.length?gaps.map(x=>{const assigned=hasActiveTopicAssignment(x.login,x.section,x.topic),available=hasTopicContent(x.section,x.topic);return `<div class="gap-row"><div class="gap-person"><b>${esc(x.name)}</b><span class="muted small">${esc(x.login)}</span></div><div class="gap-topic"><b>${esc(x.topic)}</b><span class="muted small">${secName(x.section)} · ${x.attempts} попыток</span></div><div class="gap-score"><span class="pill bad">${x.avgRecent}%</span><span class="trend ${x.trend>0?'up':x.trend<0?'down':''}">${trendText(x.trend)}</span></div><div class="gap-action">${assigned?'<span class="pill good">Уже назначено</span>':available?`<button class="btn primary" onclick="openRecommendedAssignment('${jsq(x.login)}','${x.section}','${jsq(x.topic)}')">Назначить отработку</button>`:'<span class="muted small">Нет материалов</span>'}</div></div>`}).join(''):'<div class="muted">Пока нет подтверждённых зон развития.</div>'}</div><div class="section-title"><h2>Моя команда</h2></div>${teamTableHtml(u)}`}
function groupMetrics(group){const u=teamRows(group),avg=k=>{const vals=u.map(x=>x[k]).filter(x=>x!==null);return vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):null};return {group,u,count:u.length,soft:avg('soft'),hard:avg('hard'),needs:avg('needs'),gaps:u.reduce((n,x)=>n+x.gaps.length,0),attempts:u.reduce((n,x)=>n+x.attempts,0)}}
function openGroupDashboard(group){const g=groupMetrics(group);showModal(`<div class="modal-head"><div><h2>${esc(group)}</h2><div class="meta">Руководитель: ${esc(managerNames(group))} · ${g.count} сотрудников</div></div><div class="actions"><button class="btn secondary" onclick="openMentorExport('${jsq(group)}','')">⬇ Excel</button><button class="btn secondary" onclick="closeModal()">✕</button></div></div>${teamTableHtml(g.u)}`)}
function filterSectorGroups(q){q=String(q||'').toLowerCase();document.querySelectorAll('[data-sector-row]').forEach(r=>r.classList.toggle('hidden',!r.dataset.sectorRow.includes(q)))}
function renderSectorAdmin(){const groups=[...new Set(S.allowed.filter(x=>x.active&&x.role==='employee').map(x=>x.group_name))].sort(),gs=groups.map(groupMetrics),all=teamRows();$('pageTitle').textContent='РС / сектор';$('pageSub').textContent='Руководители, команды и общая динамика';$('page-mentor').innerHTML=`<div class="toolbar"><div><b>Сектор</b><div class="muted small">${gs.length} команд · ${all.length} сотрудников</div></div><div class="actions"><button class="btn secondary" onclick="openMentorExport()">⬇ Отчёт Excel</button></div></div><div class="grid4"><div class="card kpi"><small>Руководителей</small><strong>${S.allowed.filter(x=>x.active&&x.role==='mentor').length}</strong></div><div class="card kpi"><small>Сотрудников</small><strong>${all.length}</strong></div><div class="card kpi"><small>Попыток</small><strong>${all.reduce((n,x)=>n+x.attempts,0)}</strong></div><div class="card kpi"><small>Зон развития</small><strong>${all.reduce((n,x)=>n+x.gaps.length,0)}</strong></div></div><div class="section-title"><h2>Руководители и команды</h2></div><div class="field" style="max-width:420px;margin-bottom:10px"><input placeholder="Поиск руководителя или группы" oninput="filterSectorGroups(this.value)"></div><div class="card table-wrap"><table class="table"><thead><tr><th>Руководитель</th><th>Группа</th><th>Сотрудников</th><th>Soft</th><th>Hard</th><th>Потребность</th><th>Пробелов</th><th>Попыток</th><th></th></tr></thead><tbody>${gs.map(g=>`<tr data-sector-row="${esc((managerNames(g.group)+' '+g.group).toLowerCase())}"><td><b>${esc(managerNames(g.group))}</b></td><td>${esc(g.group)}</td><td>${g.count}</td><td>${g.soft===null?'—':g.soft+'%'}</td><td>${g.hard===null?'—':g.hard+'%'}</td><td>${g.needs===null?'—':g.needs+'%'}</td><td>${g.gaps||'—'}</td><td>${g.attempts}</td><td><button class="btn secondary" onclick="openGroupDashboard('${jsq(g.group)}')">Команда</button></td></tr>`).join('')}</tbody></table></div>`}
function renderMentor(){isRS()?renderSectorAdmin():renderManagerMentor()}

let contentTab='library';function renderContent(){$('page-content').innerHTML=`<div class="tabs"><button class="tab ${contentTab==='library'?'active':''}" onclick="contentTab='library';renderContent()">Библиотека</button><button class="tab ${contentTab==='create'?'active':''}" onclick="contentTab='create';renderContent()">Создать</button><button class="tab ${contentTab==='import'?'active':''}" onclick="contentTab='import';renderContent()">Импорт Excel</button></div><div id="contentPane"></div>`;contentTab==='library'?renderContentLibrary():contentTab==='create'?renderCreateContent():renderImportPane()}
function renderContentLibrary(){$('contentPane').innerHTML=`<div class="toolbar"><span class="muted small">${S.content.length} материалов</span><div><button class="btn secondary" onclick="exportExcel()">⬇ Экспорт Excel</button></div></div><div class="card" style="margin-top:10px">${S.content.map(x=>`<div class="content-row"><div><span class="pill ${x.status==='published'?'status-published':'status-draft'}">${x.status==='published'?'Опубликовано':'Черновик'}</span> <span class="pill">${x.type==='dialogue'?'Диалог':x.type==='hardcase'?'Hard-кейс':'Кейс'}</span><b>${esc(x.title||x.question)}</b><div class="meta">${secName(x.section)} · ${esc(x.topic)}</div></div><div class="actions"><button class="btn secondary" onclick="editContent('${x.id}')">Изменить</button><button class="btn danger" onclick="deleteContent('${x.id}')">Удалить</button></div></div>`).join('')||'<div class="muted">Материалов нет.</div>'}</div>`}
function renderCreateContent(){$('contentPane').innerHTML=`<div class="grid3"><button class="topic" onclick="openCaseEditor('quiz')">✅ Обычный кейс<small>Soft / Hard / потребность</small></button><button class="topic" onclick="openCaseEditor('hardcase')">🧠 Hard-кейс<small>Клиентская ситуация → решение</small></button><button class="topic" onclick="openDialogueEditor()">💬 Живой диалог<small>Несколько последовательных шагов</small></button></div>`}
function renderImportPane(){$('contentPane').innerHTML=`<div class="import-box"><h3>Импорт из Excel</h3><p>Кейсы, диалоги, сотрудники и назначения можно загрузить одним файлом.</p><div class="actions" style="justify-content:center"><a class="btn secondary" href="./skillhub_cases_template.xlsx" download>⬇ Скачать шаблон</a><label class="btn primary">Выбрать Excel<input type="file" accept=".xlsx" class="hidden" onchange="previewExcel(event)"></label></div></div><div id="importPreview"></div>`}
function parseWorkbook(file){return new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>{try{const wb=XLSX.read(fr.result,{type:'array'}),out={};for(const n of wb.SheetNames)out[n]=XLSX.utils.sheet_to_json(wb.Sheets[n],{defval:''});resolve(out)}catch(e){reject(e)}};fr.onerror=reject;fr.readAsArrayBuffer(file)})}
async function previewExcel(ev){try{const sheets=await parseWorkbook(ev.target.files[0]);const cases=(sheets['Кейсы']||[]).filter(r=>String(r['Вопрос']||'').trim()),dialogs=(sheets['Диалоги']||[]).filter(r=>String(r['ID диалога']||'').trim()),employees=(sheets['Сотрудники']||[]).filter(r=>String(r['Логин']||'').trim()),assignments=(sheets['Назначения']||[]).filter(r=>String(r['Название']||'').trim());S.importDraft={sheets,cases,dialogs,employees,assignments};$('importPreview').innerHTML=`<div class="card" style="margin-top:12px"><h3>Предпросмотр</h3><div class="grid4"><div class="kpi"><small>Кейсы</small><strong>${cases.length}</strong></div><div class="kpi"><small>Диалоги</small><strong>${dialogs.length}</strong></div><div class="kpi"><small>Сотрудники</small><strong>${employees.length}</strong></div><div class="kpi"><small>Назначения</small><strong>${assignments.length}</strong></div></div><div class="actions" style="justify-content:flex-end;margin-top:12px"><button class="btn primary" onclick="commitExcel()">Импортировать</button></div></div>`}catch(e){$('importPreview').innerHTML='<div class="explain">Не удалось прочитать Excel. Используйте шаблон SkillHub.</div>'}}
function yn(x){return ['да','yes','true','1'].includes(String(x).trim().toLowerCase())}
async function notifyRecipients(title,body,recipients,kind='content'){let logs=recipients.includes('ALL')?S.allowed.filter(x=>x.active&&x.role==='employee').map(x=>x.login):recipients;logs=[...new Set(logs)];if(!logs.length)return;const rows=logs.map(login=>({login,title,body,kind,read:false}));const {error}=await S.sb.from('notifications').insert(rows);if(error)console.warn(error)}
async function commitExcel(){if(!S.importDraft)return;const {sheets,cases,dialogs,employees,assignments}=S.importDraft;const generated=[];try{
  for(const r of employees){const login=normalizeLogin(r['Логин']);if(!login)continue;const existing=S.allowed.find(x=>x.login===login),claimed=!!existing?.claimed_user_id;let code='';if(!claimed)code=randCode();const rr=String(r['Роль']||'').toLowerCase(),role=rr.includes('рс')?'rs':(rr.startsWith('настав')||rr.startsWith('руковод'))?'mentor':'employee';const {error}=await S.sb.rpc('mentor_upsert_allowed_user',{p_login:login,p_name:String(r['Имя']||login),p_role:role,p_group_name:String(r['Группа']||'Группа'),p_active:String(r['Статус']||'active').toLowerCase()!=='inactive',p_invite_code:code||null});if(error)throw error;if(code)generated.push([login,code])}
  for(const r of cases){const answers=[1,2,3,4].map(i=>String(r['Ответ '+i]||'').trim());if(answers.some(x=>!x))continue;const audience=String(r['Кому']||'ALL').split(',').map(x=>x.trim()).filter(Boolean);const row={type:String(r['Тип']||'quiz'),status:String(r['Статус']||'draft'),section:String(r['Раздел']||'soft'),topic:String(r['Тема']||'Общий'),difficulty:String(r['Сложность']||'Средний'),title:String(r['Заголовок']||''),payload:{question:String(r['Вопрос']||''),answers,correct:Math.max(0,Number(r['Правильный ответ']||1)-1),explanation:String(r['Объяснение']||'')},audience,created_by:S.user.id,updated_at:new Date().toISOString()};if(String(r['ID']||'').match(/^[0-9a-f-]{36}$/i))row.id=r['ID'];const {data,error}=await S.sb.from('content').upsert(row).select().single();if(error)throw error;if(row.status==='published'&&yn(r['Уведомить']))await notifyRecipients('Новый материал',row.title||row.payload.question.slice(0,80),audience)}
  const stepRows=sheets['Шаги диалогов']||[];for(const r of dialogs){const did=String(r['ID диалога']).trim(),steps=stepRows.filter(s=>String(s['ID диалога']).trim()===did).sort((a,b)=>Number(a['Шаг'])-Number(b['Шаг'])).map(s=>({client:String(s['Реплика клиента']||''),options:[1,2,3].map(i=>String(s['Ответ '+i]||'')),correct:Math.max(0,Number(s['Правильный ответ']||1)-1),next_client:String(s['Следующая реплика клиента']||''),explanation:String(s['Объяснение']||'')}));if(!steps.length)continue;const audience=String(r['Кому']||'ALL').split(',').map(x=>x.trim()).filter(Boolean);const row={type:'dialogue',status:String(r['Статус']||'draft'),section:String(r['Раздел']||'needs'),topic:String(r['Тема']||'Общий'),difficulty:'Средний',title:String(r['Название']||did),payload:{description:String(r['Описание']||''),steps},audience,created_by:S.user.id,updated_at:new Date().toISOString()};if(did.match(/^[0-9a-f-]{36}$/i))row.id=did;const {error}=await S.sb.from('content').upsert(row);if(error)throw error;if(row.status==='published'&&yn(r['Уведомить']))await notifyRecipients('Новый диалог',row.title,audience)}
  for(const r of assignments){let rec=String(r['Кому']||'ALL').split(',').map(x=>x.trim()).filter(Boolean);if(S.profile.role==='mentor'&&rec.includes('ALL'))rec=S.allowed.filter(x=>x.active&&x.role==='employee').map(x=>x.login);const row={title:String(r['Название']),content_id:String(r['ID материала']||'').match(/^[0-9a-f-]{36}$/i)?String(r['ID материала']):null,section:String(r['Раздел']||''),topic:String(r['Тема']||''),due:String(r['Дедлайн']||'')||null,target:Number(r['Минимум %']||90),recipients:rec,status:String(r['Статус']||'active'),created_by:S.user.id};const {error}=await S.sb.from('assignments').insert(row);if(error)throw error;if(yn(r['Уведомить']))await notifyRecipients('Новое задание',`${row.title}${row.due?' · до '+row.due:''}`,rec,'assignment')}
  await syncAll();toast('Импорт завершён');if(generated.length)showCodes(generated,'Коды для новых сотрудников');contentTab='library';renderContent();
}catch(e){console.error(e);toast('Ошибка импорта: '+(e.message||e))}}
function exportExcel(){const wb=XLSX.utils.book_new();const cases=[],dialogs=[],steps=[];for(const x of S.content){if(x.type==='dialogue'){dialogs.push({'ID диалога':x.id,'Статус':x.status,'Раздел':x.section,'Тема':x.topic,'Название':x.title,'Описание':x.description||'','Кому':(x.audience||['ALL']).join(', '),'Уведомить':'Нет'});(x.steps||[]).forEach((s,i)=>steps.push({'ID диалога':x.id,'Шаг':i+1,'Реплика клиента':s.client,'Ответ 1':s.options?.[0]||'','Ответ 2':s.options?.[1]||'','Ответ 3':s.options?.[2]||'','Правильный ответ':Number(s.correct)+1,'Следующая реплика клиента':s.next_client||'','Объяснение':s.explanation||''}))}else cases.push({'ID':x.id,'Статус':x.status,'Раздел':x.section,'Тема':x.topic,'Сложность':x.difficulty,'Тип':x.type,'Заголовок':x.title,'Вопрос':x.question,'Ответ 1':x.answers?.[0]||'','Ответ 2':x.answers?.[1]||'','Ответ 3':x.answers?.[2]||'','Ответ 4':x.answers?.[3]||'','Правильный ответ':Number(x.correct)+1,'Объяснение':x.explanation||'','Кому':(x.audience||['ALL']).join(', '),'Уведомить':'Нет'})}XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(cases),'Кейсы');XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(dialogs),'Диалоги');XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(steps),'Шаги диалогов');XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(S.allowed.map(x=>({'Логин':x.login,'Имя':x.name,'Роль':roleName(x.role),'Группа':x.group_name,'Статус':x.active?'active':'inactive'}))),'Сотрудники');XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(S.assignments.map(x=>({'ID':x.id,'Название':x.title,'Раздел':x.section,'Тема':x.topic,'ID материала':x.content_id||'','Кому':(x.recipients||['ALL']).join(', '),'Дедлайн':x.due||'','Минимум %':x.target,'Уведомить':'Нет','Статус':x.status}))),'Назначения');XLSX.writeFile(wb,'SkillHub_export.xlsx')}
function openCaseEditor(type,x=null){S.editing=x?.id||null;showModal(`<div class="modal-head"><h2>${x?'Редактировать':type==='hardcase'?'Новый Hard-кейс':'Новый кейс'}</h2><button class="btn secondary" onclick="closeModal()">✕</button></div><div class="form-grid"><div class="field"><label>Раздел</label><select id="ecSec"><option value="soft">Soft</option><option value="hard">Hard</option><option value="needs">Потребность</option></select></div><div class="field"><label>Тема для аналитики</label><input id="ecTopic" placeholder="Например, Кредиты / Тарифы / Госорганы"><div class="meta">Все кейсы одной темы объединяются в аналитику сотрудника.</div></div><div class="field"><label>Статус</label><select id="ecStatus"><option value="draft">Черновик</option><option value="published">Опубликовать</option></select></div><div class="field"><label>Сложность</label><select id="ecDiff"><option>Лёгкий</option><option>Средний</option><option>Сложный</option></select></div><div class="field full"><label>Заголовок</label><input id="ecTitle"></div><div class="field full"><label>Вопрос / ситуация</label><textarea id="ecQ"></textarea></div>${[1,2,3,4].map(i=>`<div class="field"><label>Ответ ${i}</label><textarea id="ecA${i}"></textarea></div>`).join('')}<div class="field"><label>Правильный ответ</label><select id="ecCorrect">${[1,2,3,4].map(i=>`<option value="${i-1}">${i}</option>`).join('')}</select></div><div class="field"><label>Кому</label><input id="ecAudience" value="ALL"></div><div class="field full"><label>Объяснение</label><textarea id="ecExpl"></textarea></div></div><div class="actions" style="justify-content:flex-end;margin-top:13px"><button class="btn primary" onclick="saveCaseEditor('${type}')">Сохранить</button></div>`);$('ecSec').value=x?.section|| (type==='hardcase'?'hard':'soft');$('ecTopic').value=x?.topic||'';$('ecStatus').value=x?.status||'draft';$('ecDiff').value=x?.difficulty||'Средний';$('ecTitle').value=x?.title||'';$('ecQ').value=x?.question||'';[1,2,3,4].forEach((i,k)=>$('ecA'+i).value=x?.answers?.[k]||'');$('ecCorrect').value=String(x?.correct??0);$('ecAudience').value=(x?.audience||['ALL']).join(', ');$('ecExpl').value=x?.explanation||''}
async function saveCaseEditor(type){const answers=[1,2,3,4].map(i=>$('ecA'+i).value.trim());if(!$('ecTopic').value.trim()||!$('ecQ').value.trim()||answers.some(x=>!x)){toast('Заполните тему, вопрос и 4 ответа');return}const row={type,section:$('ecSec').value,topic:$('ecTopic').value.trim(),status:$('ecStatus').value,difficulty:$('ecDiff').value,title:$('ecTitle').value.trim(),payload:{question:$('ecQ').value.trim(),answers,correct:Number($('ecCorrect').value),explanation:$('ecExpl').value.trim()},audience:$('ecAudience').value.split(',').map(x=>x.trim()).filter(Boolean),created_by:S.user.id,updated_at:new Date().toISOString()};if(S.editing)row.id=S.editing;const {data,error}=await S.sb.from('content').upsert(row).select().single();if(error){toast(error.message);return}if(row.status==='published')await notifyRecipients('Новый материал',row.title||row.payload.question.slice(0,80),row.audience);closeModal();await syncAll();contentTab='library';renderContent();toast('Материал сохранён')}
function openDialogueEditor(x=null){S.editing=x?.id||null;S.dialogDraft=x?.steps?structuredClone(x.steps):[{client:'',options:['','',''],correct:0,next_client:'',explanation:''}];showModal(`<div class="modal-head"><h2>${x?'Редактировать диалог':'Новый живой диалог'}</h2><button class="btn secondary" onclick="closeModal()">✕</button></div><div class="form-grid"><div class="field"><label>Раздел</label><select id="edSec"><option value="needs">Потребность</option><option value="soft">Soft</option><option value="hard">Hard</option></select></div><div class="field"><label>Тема для аналитики</label><input id="edTopic" placeholder="Например, Выявление потребности"><div class="meta">Используйте одинаковое название для материалов одной темы.</div></div><div class="field full"><label>Название</label><input id="edTitle"></div><div class="field"><label>Статус</label><select id="edStatus"><option value="draft">Черновик</option><option value="published">Опубликовать</option></select></div><div class="field"><label>Кому</label><input id="edAudience" value="ALL"></div></div><div id="dialogSteps"></div><div class="actions" style="justify-content:space-between;margin-top:13px"><button class="btn secondary" onclick="addDialogStep()">+ Шаг</button><button class="btn primary" onclick="saveDialogueEditor()">Сохранить</button></div>`);$('edSec').value=x?.section||'needs';$('edTopic').value=x?.topic||'';$('edTitle').value=x?.title||'';$('edStatus').value=x?.status||'draft';$('edAudience').value=(x?.audience||['ALL']).join(', ');renderDialogSteps()}
function addDialogStep(){S.dialogDraft.push({client:'',options:['','',''],correct:0,next_client:'',explanation:''});renderDialogSteps()}
function removeDialogStep(i){if(S.dialogDraft.length===1)return;S.dialogDraft.splice(i,1);renderDialogSteps()}
function renderDialogSteps(){$('dialogSteps').innerHTML=S.dialogDraft.map((s,i)=>`<div class="card" style="margin-top:11px"><div class="toolbar"><b>Шаг ${i+1}</b><button class="btn danger" onclick="removeDialogStep(${i})">Удалить</button></div><div class="field"><label>Реплика клиента</label><textarea oninput="S.dialogDraft[${i}].client=this.value">${esc(s.client)}</textarea></div>${[0,1,2].map(j=>`<div class="field"><label>Ответ ${j+1}${j===Number(s.correct)?' ✓':''}</label><input value="${esc(s.options[j])}" oninput="S.dialogDraft[${i}].options[${j}]=this.value"><button class="btn secondary" style="margin-top:5px" onclick="S.dialogDraft[${i}].correct=${j};renderDialogSteps()">Сделать правильным</button></div>`).join('')}<div class="field"><label>Следующая реплика клиента</label><textarea oninput="S.dialogDraft[${i}].next_client=this.value">${esc(s.next_client||'')}</textarea></div><div class="field"><label>Объяснение</label><textarea oninput="S.dialogDraft[${i}].explanation=this.value">${esc(s.explanation||'')}</textarea></div></div>`).join('')}
async function saveDialogueEditor(){if(!$('edTopic').value.trim()||!$('edTitle').value.trim()){toast('Заполните тему и название');return}const row={type:'dialogue',section:$('edSec').value,topic:$('edTopic').value.trim(),status:$('edStatus').value,difficulty:'Средний',title:$('edTitle').value.trim(),payload:{steps:S.dialogDraft},audience:$('edAudience').value.split(',').map(x=>x.trim()).filter(Boolean),created_by:S.user.id,updated_at:new Date().toISOString()};if(S.editing)row.id=S.editing;const {error}=await S.sb.from('content').upsert(row);if(error){toast(error.message);return}if(row.status==='published')await notifyRecipients('Новый диалог',row.title,row.audience);closeModal();await syncAll();contentTab='library';renderContent();toast('Диалог сохранён')}
function editContent(id){const x=S.content.find(c=>c.id===id);if(!x)return;x.type==='dialogue'?openDialogueEditor(x):openCaseEditor(x.type,x)}
async function deleteContent(id){if(!confirm('Удалить материал?'))return;const {error}=await S.sb.from('content').delete().eq('id',id);if(error)toast(error.message);else{await syncAll();renderContent();toast('Материал удалён')}}

function renderAssignments(){$('page-assignments').innerHTML=`<div class="toolbar"><span class="muted small">${S.assignments.length} назначений</span><div><button class="btn primary" onclick="openAssignmentEditor()">+ Назначить</button></div></div><div class="card" style="margin-top:10px">${S.assignments.map(x=>`<div class="assignment"><div><b>${esc(x.title)}</b><div class="meta">${x.section?secName(x.section):''}${x.topic?' · '+esc(x.topic):''}${x.due?' · до '+x.due:''} · ${(x.recipients||[]).join(', ')}</div></div><div class="actions"><span class="pill">${x.target}%+</span><button class="btn danger" onclick="deleteAssignment('${x.id}')">Удалить</button></div></div>`).join('')||'<div class="muted">Назначений нет.</div>'}</div>`}
function openAssignmentEditor(prefill={}){const opts=S.content.filter(x=>x.status==='published').map(x=>`<option value="${x.id}">${esc(x.title||x.question)} — ${esc(x.topic)}</option>`).join('');showModal(`<div class="modal-head"><h2>Новое назначение</h2><button class="btn secondary" onclick="closeModal()">✕</button></div><div class="form-grid"><div class="field full"><label>Название</label><input id="asTitle"></div><div class="field"><label>Материал</label><select id="asContent"><option value="">По теме</option>${opts}</select></div><div class="field"><label>Раздел</label><select id="asSec"><option value="soft">Soft</option><option value="hard">Hard</option><option value="needs">Потребность</option></select></div><div class="field"><label>Тема</label><input id="asTopic" placeholder="Например, Кредиты или Тарифы"></div><div class="field"><label>Дедлайн</label><input id="asDue" type="date"></div><div class="field"><label>Минимум %</label><input id="asTarget" type="number" value="${ADAPTIVE.target}"></div><div class="field full"><label>Кому</label><input id="asUsers" value="ALL" placeholder="ALL или логины через запятую"><div class="meta">Для руководителя ALL = вся его команда. Для РС ALL = весь сектор.</div></div></div><div class="actions" style="justify-content:flex-end;margin-top:13px"><button class="btn primary" onclick="saveAssignment()">Назначить и уведомить</button></div>`);$('asTitle').value=prefill.title||'';$('asContent').value=prefill.content_id||'';$('asSec').value=prefill.section||'soft';$('asTopic').value=prefill.topic||'';$('asDue').value=prefill.due||'';$('asTarget').value=String(prefill.target??ADAPTIVE.target);$('asUsers').value=(prefill.recipients||['ALL']).join(', ')}
function openRecommendedAssignment(login,section,topic){openAssignmentEditor({title:'Отработка: '+topic,section,topic,due:addDaysISO(7),target:ADAPTIVE.target,recipients:[login]})}
async function saveAssignment(){let rec=$('asUsers').value.split(',').map(x=>x.trim()).filter(Boolean);if(!rec.length)rec=['ALL'];if(S.profile.role==='mentor'&&rec.includes('ALL'))rec=S.allowed.filter(x=>x.active&&x.role==='employee').map(x=>x.login);if(S.profile.role==='mentor'){const ok=new Set(S.allowed.filter(x=>x.active&&x.role==='employee').map(x=>x.login));if(rec.some(x=>!ok.has(x))){toast('Можно назначать только своей команде');return}}const row={title:$('asTitle').value.trim(),content_id:$('asContent').value||null,section:$('asSec').value,topic:$('asTopic').value.trim(),due:$('asDue').value||null,target:Number($('asTarget').value||90),recipients:rec,status:'active',created_by:S.user.id};if(!row.title){toast('Введите название');return}const {error}=await S.sb.from('assignments').insert(row);if(error){toast(error.message);return}await notifyRecipients('Новое задание',`${row.title}${row.due?' · до '+row.due:''}`,rec,'assignment');closeModal();await syncAll();renderAssignments();toast('Задание назначено')}
async function deleteAssignment(id){if(!confirm('Удалить назначение?'))return;const {error}=await S.sb.from('assignments').delete().eq('id',id);if(error)toast(error.message);else{await syncAll();renderAssignments()}}

function employeeListForAdmin(){return isRS()?S.allowed:S.allowed.filter(x=>x.role==='employee')}
function renderEmployees(){const rows=employeeListForAdmin();$('page-employees').innerHTML=`<div class="toolbar"><div><b>${isRS()?'Пользователи сектора':'Сотрудники моей команды'}</b><div class="muted small">${rows.length} записей${!isRS()?' · '+esc(S.profile.group_name):''}</div></div><div><button class="btn secondary" onclick="generateAllCodes()">🔐 Коды новым</button><button class="btn primary" onclick="openEmployeeEditor()">+ Добавить</button></div></div><div class="card" style="margin-top:10px">${rows.map(x=>{const canEdit=isRS()||(x.role==='employee');const self=x.login===S.profile.login;return `<div class="employee-row"><div><b>${esc(x.name||x.login)}</b><div class="meta">${esc(x.login)} · ${roleName(x.role)} · ${esc(x.group_name)} · ${x.claimed_user_id?'PIN создан':'первый вход не выполнен'}</div></div><div class="actions"><span class="pill ${x.active?'good':'bad'}">${x.active?'Активен':'Отключён'}</span>${canEdit&&!self?`<button class="btn secondary" onclick="openEmployeeEditor(S.allowed.find(u=>u.login==='${jsq(x.login)}'))">Изменить</button>`:''}${canEdit&&!self&&!x.claimed_user_id?`<button class="btn secondary" onclick="makeCode('${jsq(x.login)}')">Новый код</button>`:''}${canEdit&&!self?`<button class="btn secondary" onclick="toggleEmployee('${jsq(x.login)}',${x.active?'false':'true'})">${x.active?'Отключить':'Включить'}</button>`:''}${canEdit&&!self&&x.claimed_user_id?`<button class="btn danger" onclick="resetAccess('${jsq(x.login)}')">Сбросить PIN</button>`:''}</div></div>`}).join('')}</div>`}
function openEmployeeEditor(x=null){const code=x?'':randCode(),rs=isRS();showModal(`<div class="modal-head"><h2>${x?'Изменить пользователя':'Новый пользователь'}</h2><button class="btn secondary" onclick="closeModal()">✕</button></div><div class="form-grid"><div class="field full"><label>Корпоративный логин</label><input id="euLogin" ${x?'readonly':''}></div><div class="field full"><label>Имя</label><input id="euName"></div><div class="field"><label>Роль</label><select id="euRole" ${rs?'':'disabled'}>${rs?'<option value="employee">Сотрудник</option><option value="mentor">Руководитель</option><option value="rs">РС / администратор сектора</option>':'<option value="employee">Сотрудник</option>'}</select></div><div class="field"><label>Группа / команда</label><input id="euGroup" ${rs?'': 'readonly'}></div>${x?'':`<div class="field full"><label>Код первого входа</label><input id="euCode" value="${code}"></div>`}</div><div class="actions" style="justify-content:flex-end;margin-top:13px"><button class="btn primary" onclick="saveEmployee()">${x?'Сохранить':'Добавить'}</button></div>`);$('euLogin').value=x?.login||'';$('euName').value=x?.name||'';$('euRole').value=x?.role||'employee';$('euGroup').value=x?.group_name||S.profile.group_name||'Группа'}
async function saveEmployee(){const login=normalizeLogin($('euLogin').value),code=$('euCode')?.value.trim()||'',role=isRS()?$('euRole').value:'employee',group=isRS()?$('euGroup').value.trim()||'Группа':S.profile.group_name;const {error}=await S.sb.rpc('mentor_upsert_allowed_user',{p_login:login,p_name:$('euName').value.trim()||login,p_role:role,p_group_name:group,p_active:true,p_invite_code:code||null});if(error){toast(error.message);return}closeModal();await syncAll();if(code)showCodes([[login,code]],'Передайте код пользователю');else{renderEmployees();toast('Данные сохранены')}}
async function makeCode(login){const code=randCode(),{error}=await S.sb.rpc('mentor_set_invite_code',{p_login:login,p_code:code});if(error){toast(error.message);return}showCodes([[login,code]],'Новый код первого входа')}
async function generateAllCodes(){const target=employeeListForAdmin().filter(x=>x.active&&!x.claimed_user_id&&x.login!==S.profile.login),rows=[];for(const x of target){const code=randCode(),{error}=await S.sb.rpc('mentor_set_invite_code',{p_login:x.login,p_code:code});if(!error)rows.push([x.login,code])}if(!rows.length){toast('Нет пользователей, которым нужен код');return}showCodes(rows,'Коды первого входа')}
function showCodes(rows,title){showModal(`<div class="modal-head"><h2>${esc(title)}</h2><button class="btn secondary" onclick="closeModal()">✕</button></div><p class="muted small">Код нужен только при первом входе. После него сотрудник использует свой PIN.</p><div class="card">${rows.map(r=>`<div class="employee-row"><b>${esc(r[0])}</b><span class="access-code">${esc(r[1])}</span></div>`).join('')}</div><div class="actions" style="justify-content:flex-end;margin-top:12px"><button class="btn secondary" onclick='downloadCodes(${JSON.stringify(rows)})'>⬇ CSV</button></div>`)}
function downloadCodes(rows){const csv='\uFEFFЛогин;Код первого входа\r\n'+rows.map(r=>`${r[0]};${r[1]}`).join('\r\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='SkillHub_коды_первого_входа.csv';a.click();URL.revokeObjectURL(a.href)}
async function toggleEmployee(login,active){const x=S.allowed.find(u=>u.login===login);const {error}=await S.sb.rpc('mentor_upsert_allowed_user',{p_login:login,p_name:x.name,p_role:x.role,p_group_name:x.group_name,p_active:active,p_invite_code:null});if(error)toast(error.message);else{await syncAll();renderEmployees()}}
async function resetAccess(login){if(!confirm('Старый PIN перестанет работать. Продолжить?'))return;const code=randCode(),{error}=await S.sb.rpc('mentor_reset_access',{p_login:login,p_new_code:code});if(error){toast(error.message);return}await syncAll();showCodes([[login,code]],'Доступ сброшен')}

function toggleProfileMenu(){$('profileMenu').classList.toggle('hidden')}
async function enableNotifications(){$('profileMenu').classList.add('hidden');if(!('Notification'in window)){toast('Браузер не поддерживает уведомления');return}const p=await Notification.requestPermission();toast(p==='granted'?'Уведомления включены':'Разрешение не выдано')}
function showInstallHelp(){$('profileMenu').classList.add('hidden');const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);showModal(`<div class="modal-head"><h2>Установка SkillHub</h2><button class="btn secondary" onclick="closeModal()">✕</button></div>${ios?'<p>iPhone: откройте SkillHub в Safari → <b>Поделиться</b> → <b>На экран «Домой»</b> → Добавить.</p>':'<p>Android/Chrome: меню браузера → <b>Установить приложение</b> / «Добавить на главный экран».</p>'}<p class="muted small">Внутренние уведомления работают всегда при синхронизации. Полноценный push при полностью закрытом приложении требует отдельной push-настройки.</p>`)}
function showShareLink(){$('profileMenu').classList.add('hidden');const c=currentConfig(),base=location.origin+location.pathname,link=base+'?sburl='+encodeURIComponent(c.url)+'&sbkey='+encodeURIComponent(c.key);showModal(`<div class="modal-head"><h2>Ссылка для сотрудников</h2><button class="btn secondary" onclick="closeModal()">✕</button></div><p>Отправьте эту ссылку группе один раз. Она сохранит подключение к общей базе на устройстве.</p><div class="code-card" id="shareLinkText">${esc(link)}</div><div class="actions" style="justify-content:flex-end;margin-top:12px"><button class="btn primary" onclick="navigator.clipboard.writeText(document.getElementById('shareLinkText').textContent);toast('Ссылка скопирована')">Копировать</button></div><div class="hint">Anon key является публичным ключом клиентского приложения. Доступ к таблицам ограничивается политиками RLS из schema.sql.</div>`)}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();S.deferredInstall=e;$('installBtn').classList.remove('hidden')});async function installApp(){if(S.deferredInstall){S.deferredInstall.prompt();await S.deferredInstall.userChoice;S.deferredInstall=null;$('installBtn').classList.add('hidden')}else showInstallHelp()}
window.addEventListener('online',()=>{updateNetwork();syncAll()});window.addEventListener('offline',updateNetwork);setInterval(()=>{if(S.user&&navigator.onLine)syncAll()},60000);document.addEventListener('click',e=>{if(!$('profileMenu').classList.contains('hidden')&&!e.target.closest('.profile')&&!e.target.closest('#profileMenu'))$('profileMenu').classList.add('hidden')});


// ===== SkillHub 7.0: роли, прямая иерархия, Excel пользователей, тех. администратор =====
function managerUser(login){return S.allowed.find(x=>x.login===login&&x.role==='mentor')||null}
function managerDisplay(login){const m=managerUser(login);return m?(m.name||m.login):'Не назначен'}
function teamDisplay(login){const m=managerUser(login);return m?(m.group_name||m.name||m.login):'Без команды'}
function sectorOf(u){return String(u?.sector_name||'Основной сектор')}
function scopeEmployees(){return S.allowed.filter(x=>x.active&&x.role==='employee')}
function employeesForManager(login){return scopeEmployees().filter(x=>x.manager_login===login)}
function managersInSector(sector){return S.allowed.filter(x=>x.active&&x.role==='mentor'&&sectorOf(x)===sector)}
function rsInSector(sector){return S.allowed.filter(x=>x.active&&x.role==='rs'&&sectorOf(x)===sector)}
function managerNames(groupOrLogin){const direct=managerUser(groupOrLogin);if(direct)return direct.name||direct.login;return S.allowed.filter(x=>x.active&&x.role==='mentor'&&x.group_name===groupOrLogin).map(x=>x.name||x.login).join(', ')||'—'}
function roleRank(r){return r==='tech_admin'?4:r==='rs'?3:r==='mentor'?2:1}
function canEditUserLocal(x){if(!x||x.login===S.profile?.login)return false;if(isTechAdmin())return true;if(isRS())return x.sector_name===S.profile.sector_name&&['mentor','employee'].includes(x.role);if(S.profile?.role==='mentor')return x.role==='employee'&&x.manager_login===S.profile.login;return false}
function canResetUserLocal(x){if(!x||x.login===S.profile?.login)return false;if(isTechAdmin())return ['employee','mentor','rs'].includes(x.role);if(S.profile?.role==='mentor')return x.role==='employee'&&x.manager_login===S.profile.login;return false}
function roleValueFromExcel(v){const s=String(v||'').trim().toLowerCase();if(s.includes('тех')||s==='tech_admin')return'tech_admin';if(s==='rs'||s==='рс'||s.includes('сектор'))return'rs';if(s==='mentor'||s.includes('руководитель группы')||s.includes('руководитель')||s.includes('настав'))return'mentor';return'employee'}
function yesActive(v){const s=String(v??'Да').trim().toLowerCase();return !['нет','no','false','0','inactive','отключен','отключён'].includes(s)}
function roleSelfActivationNote(role){return role==='employee'?'Сотруднику нужен код первого входа от руководителя группы.':'Пользователь создаёт PIN при первом входе без кода.'}

function toggleAuthMode(){
  S.authMode=S.authMode==='login'?'register':'login';const reg=S.authMode==='register';
  $('authTitle').textContent=reg?'Первый вход':'Давайте потренируемся';
  $('authText').textContent=reg?'Технический администратор, руководитель сектора и руководитель группы при первом входе вводят только корпоративный логин и придумывают свой PIN. Код первого входа нужен только сотрудникам.':'Введите корпоративный логин и ваш PIN.';
  $('inviteWrap').classList.toggle('hidden',!reg);
  $('pinLabel').textContent=reg?'Придумайте PIN':'PIN';
  $('pinInput').setAttribute('autocomplete',reg?'new-password':'current-password');
  $('authBtn').textContent=reg?'Создать профиль':'Войти';
  $('authModeBtn').textContent=reg?'У меня уже есть PIN':'Первый вход / создать PIN';
  $('loginError').textContent='';
}
async function submitAuth(){
  const login=normalizeLogin($('loginInput').value),pin=$('pinInput').value,invite=$('inviteInput').value.trim();
  $('loginError').textContent='';
  if(!login||pin.length<6){$('loginError').textContent='Введите корпоративный логин и PIN минимум из 6 символов.';return}
  try{
    if(S.authMode==='register'){
      const {data,error}=await S.sb.auth.signUp({email:emailFor(login),password:pin,options:{data:{login,invite_code:invite}}});
      if(error)throw error;
      if(!data.session)throw new Error('В Supabase включено подтверждение e-mail. Отключите Confirm email в Authentication → Providers → Email.');
    }else{
      const {error}=await S.sb.auth.signInWithPassword({email:emailFor(login),password:pin});if(error)throw error;
    }
    await afterAuth();
  }catch(e){
    let m=e.message||String(e),low=m.toLowerCase();
    if(m.includes('Database error saving new user'))m='Не удалось создать доступ. Проверьте корпоративный логин. Для сотрудника также проверьте код первого входа. Руководителям и техадминистратору код не нужен. Если PIN уже создавался — используйте обычный вход или сбросьте доступ.';
    if(low.includes('invalid login')||low.includes('invalid credentials'))m='Неверный логин или PIN.';
    if(low.includes('already registered')||low.includes('user already registered'))m='Для этого логина PIN уже создан. Используйте обычный вход или сбросьте доступ.';
    if(low.includes('load failed')||low.includes('failed to fetch')||low.includes('network'))m='Нет связи с базой SkillHub. Обновите страницу и проверьте интернет. Настройки подключения обновляются автоматически.';
    if(m==='Load failed'||m.toLowerCase().includes('failed to fetch'))m='Не удалось связаться с Supabase. Обновите страницу и повторите. Если ошибка останется — проверьте защиту Safari/VPN.';$('loginError').textContent=m;
  }
}
async function afterAuth(){const {data:{user}}=await S.sb.auth.getUser();if(!user)throw new Error('Нет сессии');S.user=user;const {data,error}=await S.sb.from('profiles').select('*').eq('id',user.id).single();if(error)throw error;if(!data.active){await S.sb.auth.signOut();throw new Error('Доступ к SkillHub отключён.')}S.profile=data;localStorage.setItem('sh7_profile',JSON.stringify(data));enterApp();await syncAll()}
function enterApp(){
  $('setupView').classList.add('hidden');$('loginView').classList.add('hidden');$('appView').classList.remove('hidden');
  $('profileName').textContent=S.profile.name||S.profile.login;$('roleLabel').textContent=roleName(S.profile.role);$('avatar').textContent=initials(S.profile.name||S.profile.login);
  document.querySelectorAll('.mentor-only').forEach(x=>x.classList.toggle('hidden',!isManager()));
  document.querySelectorAll('.tech-only').forEach(x=>x.classList.toggle('hidden',!isTechAdmin()));
  go(isManager()?'mentor':'home');subscribeRealtime();
}
function render(p){({home:renderHome,training:renderTraining,progress:renderProgress,notifications:renderNotifications,mentor:renderMentor,content:renderContent,assignments:renderAssignments,employees:renderEmployees,admin:renderTechAdmin}[p]||(()=>{}))()}

async function syncAll(manual=false){
  updateNetwork();if(!S.user)return;if(navigator.onLine)await flushQueue();
  try{
    const qs=[S.sb.from('content').select('*').order('updated_at',{ascending:false}),S.sb.from('assignments').select('*').order('created_at',{ascending:false}),S.sb.from('attempts').select('*').order('created_at',{ascending:true}),S.sb.from('notifications').select('*').order('created_at',{ascending:true})];
    const [c,a,t,n]=await Promise.all(qs);for(const r of [c,a,t,n])if(r.error)throw r.error;
    S.content=(c.data||[]).map(normalizeContent);S.assignments=a.data||[];S.attempts=t.data||[];S.notifications=n.data||[];
    if(isManager()){
      const [al,pr]=await Promise.all([S.sb.from('allowed_logins').select('*').order('login'),S.sb.from('profiles').select('*').order('login')]);
      if(al.error)throw al.error;if(pr.error)throw pr.error;S.allowed=al.data||[];S.profiles=pr.data||[];
    }else{S.allowed=[];S.profiles=[S.profile]}
    localStorage.setItem('sh7_cache_'+S.profile.login,JSON.stringify({content:S.content,assignments:S.assignments,attempts:S.attempts,notifications:S.notifications,allowed:S.allowed,profiles:S.profiles}));
    renderUnread();renderCurrent();if(manual)toast('Данные обновлены');
  }catch(e){const c=JSON.parse(localStorage.getItem('sh7_cache_'+S.profile.login)||'null');if(c){Object.assign(S,c);renderUnread();renderCurrent()}if(manual)toast('Нет связи с базой — показана локальная копия')}
}

function assignmentCompletedForUser(x,login,attemptRows=S.attempts){
  const start=new Date(x.created_at||0).getTime();return attemptRows.some(a=>a.login===login&&new Date(a.created_at).getTime()>=start&&Number(a.score)>=Number(x.target||0)&&(
    (x.content_id&&(attemptDetails(a)||[]).some(d=>d.content_id===x.content_id)) ||
    (!x.content_id&&(!x.section||a.section===x.section)&&(!x.topic||a.topic===x.topic))
  ));
}
function assignmentStatusForUser(x,login,attemptRows=S.attempts){if(assignmentCompletedForUser(x,login,attemptRows))return'Выполнено';if(x.due&&new Date(x.due+'T23:59:59')<new Date())return'Просрочено';return x.status==='inactive'?'Неактивно':'В работе'}
function userAssignmentMetrics(login,attemptRows=S.attempts){let completed=0,overdue=0,work=0;for(const x of S.assignments){const rec=x.recipients||[];if(!(rec.includes('ALL')||rec.includes(login)))continue;const st=assignmentStatusForUser(x,login,attemptRows);if(st==='Выполнено')completed++;else if(st==='Просрочено')overdue++;else if(st==='В работе')work++}return{completed,overdue,work}}

function reportEmployees(sector='',manager='',login=''){
  let a=scopeEmployees();if(sector)a=a.filter(x=>sectorOf(x)===sector);if(manager)a=a.filter(x=>x.manager_login===manager);if(login)a=a.filter(x=>x.login===login);return a;
}
function employeeMetrics(u,attemptRows=S.attempts){const a=attemptRows.filter(x=>x.login===u.login),avg=sec=>{const q=a.filter(x=>x.section===sec);return q.length?Math.round(q.reduce((z,x)=>z+Number(x.score),0)/q.length):null};const t=topicStatsFromRows(u.login,attemptRows),g=t.filter(x=>x.status==='gap'),am=userAssignmentMetrics(u.login,attemptRows);return {...u,soft:avg('soft'),hard:avg('hard'),needs:avg('needs'),attempts:a.length,gaps:g,last:a.length?a.slice().sort((x,y)=>new Date(y.created_at)-new Date(x.created_at))[0].created_at:null,...am}}
function teamRows(manager=''){let active=scopeEmployees();if(manager)active=active.filter(x=>x.manager_login===manager);return active.map(u=>employeeMetrics(u,S.attempts))}
function teamTableHtml(u){return `<div class="card table-wrap"><table class="table"><thead><tr><th>Сотрудник</th><th>Soft</th><th>Hard</th><th>Потребность</th><th>Пробелов</th><th>Назначения</th><th>Попыток</th><th></th></tr></thead><tbody>${u.map(x=>`<tr><td><b>${esc(x.name||x.login)}</b><div class="meta">${esc(x.login)}</div></td><td>${x.soft===null?'—':x.soft+'%'}</td><td>${x.hard===null?'—':x.hard+'%'}</td><td>${x.needs===null?'—':x.needs+'%'}</td><td>${x.gaps.length?`<span class="pill bad">${x.gaps.length}</span>`:'—'}</td><td>${x.overdue?`<span class="pill bad">${x.overdue} проср.</span>`:`${x.completed} вып.`}</td><td>${x.attempts}</td><td><button class="btn secondary" onclick="openUserAttempts('${jsq(x.login)}')">Карточка</button></td></tr>`).join('')||'<tr><td colspan="8" class="muted">Сотрудников нет.</td></tr>'}</tbody></table></div>`}
function openUserAttempts(login){
  const rows=S.attempts.filter(x=>x.login===login).slice().sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)),u=S.allowed.find(x=>x.login===login),m=u?employeeMetrics(u,S.attempts):null;
  const metrics=m?`<div class="grid4"><div class="card kpi"><small>Soft</small><strong>${m.soft===null?'—':m.soft+'%'}</strong></div><div class="card kpi"><small>Hard</small><strong>${m.hard===null?'—':m.hard+'%'}</strong></div><div class="card kpi"><small>Потребность</small><strong>${m.needs===null?'—':m.needs+'%'}</strong></div><div class="card kpi"><small>Зон развития</small><strong>${m.gaps.length}</strong></div></div>`:'';
  showModal(`<div class="modal-head"><div><h2>${esc(u?.name||login)}</h2><div class="meta">${esc(login)} · ${esc(managerDisplay(u?.manager_login))} · ${esc(sectorOf(u))}</div></div><div class="actions">${isManager()?`<button class="btn secondary" onclick="openMentorExport('','','${jsq(login)}')">⬇ Excel</button>`:''}<button class="btn secondary" onclick="closeModal()">✕</button></div></div>${metrics}<div class="card table-wrap"><table class="table"><thead><tr><th>Дата</th><th>Раздел</th><th>Тема</th><th>Результат</th><th>Детали</th></tr></thead><tbody>${rows.length?rows.map(a=>`<tr><td>${new Date(a.created_at).toLocaleString('ru-RU')}</td><td>${secName(a.section)}</td><td>${esc(a.topic)}</td><td><span class="pill ${Number(a.score)>=90?'good':Number(a.score)>=75?'warn':'bad'}">${a.score}%</span></td><td>${a.type==='typing'?'—':attemptDetails(a).length?`<button class="btn secondary" onclick="openAttemptReview('${a.id}')">Ответы</button>`:'<span class="muted small">до 6.2</span>'}</td></tr>`).join(''):'<tr><td colspan="5" class="muted">У сотрудника пока нет попыток.</td></tr>'}</tbody></table></div>`);
}
function openMentorExport(sector='',manager='',login=''){
  const title=login?'Отчёт по сотруднику':manager?'Отчёт по команде':sector?'Отчёт по сектору':isTechAdmin()?'Отчёт SkillHub':'Отчёт по доступной команде';
  showModal(`<div class="modal-head"><div><h2>${title}</h2><div class="meta">Excel: параметры, сводка, динамика, зоны развития, история ответов, назначения</div></div><button class="btn secondary" onclick="closeModal()">✕</button></div><div class="form-grid"><div class="field"><label>С даты</label><input id="repFrom" type="date"></div><div class="field"><label>По дату</label><input id="repTo" type="date"></div></div><div class="hint">Если даты не указывать — выгрузится вся доступная история.</div><div class="actions" style="justify-content:flex-end;margin-top:14px"><button class="btn primary" onclick="exportMentorExcel('${jsq(sector)}','${jsq(manager)}','${jsq(login)}',$('repFrom').value,$('repTo').value)">⬇ Выгрузить Excel</button></div>`)
}
function formatExportSheet(ws,widths=[]){ws['!autofilter']=ws['!ref']?{ref:ws['!ref']}:undefined;if(widths.length)ws['!cols']=widths.map(w=>({wch:w}))}
function exportMentorExcel(sector='',manager='',login='',from='',to=''){
  const users=reportEmployees(sector,manager,login),logs=new Set(users.map(x=>x.login)),attempts=filterByPeriod(S.attempts.filter(x=>logs.has(x.login)),from,to),byLogin=new Map(S.allowed.map(x=>[x.login,x]));
  const summary=users.map(u=>{const m=employeeMetrics(u,attempts),am=userAssignmentMetrics(u.login,S.attempts);return {'Сектор':sectorOf(u),'Руководитель':managerDisplay(u.manager_login),'Команда':teamDisplay(u.manager_login),'Сотрудник':u.name||u.login,'Логин':u.login,'Soft %':m.soft??'','Hard %':m.hard??'','Потребность %':m.needs??'','Зон развития':m.gaps.length,'Попыток':m.attempts,'Назначений выполнено':am.completed,'Назначений просрочено':am.overdue,'Назначений в работе':am.work,'Последняя активность':m.last?new Date(m.last).toLocaleString('ru-RU'):''}});
  const dynamics=attempts.slice().sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)).map(a=>{const u=byLogin.get(a.login)||{};return {'Сектор':sectorOf(u),'Руководитель':managerDisplay(u.manager_login),'Сотрудник':u.name||a.login,'Логин':a.login,'Дата':new Date(a.created_at).toLocaleString('ru-RU'),'Раздел':secName(a.section),'Тема':a.topic,'Результат %':Number(a.score),'Тип':attemptTypeName(a.type)}});
  const zones=[];for(const u of users)for(const t of topicStatsFromRows(u.login,attempts))zones.push({'Сектор':sectorOf(u),'Руководитель':managerDisplay(u.manager_login),'Сотрудник':u.name||u.login,'Логин':u.login,'Раздел':secName(t.section),'Тема':t.topic,'Последние %':t.avgRecent,'Попыток':t.attempts,'Тренд':trendText(t.trend),'Статус':statusText(t)});
  const answers=[];for(const a of attempts){const u=byLogin.get(a.login)||{};(attemptDetails(a)||[]).forEach((d,i)=>{const opts=Array.isArray(d.options)?d.options:[];answers.push({'Сектор':sectorOf(u),'Руководитель':managerDisplay(u.manager_login),'Сотрудник':u.name||a.login,'Логин':a.login,'Дата':new Date(a.created_at).toLocaleString('ru-RU'),'Раздел':secName(a.section),'Тема':a.topic,'Материал':d.title||'','Шаг / вопрос':d.step||i+1,'Вопрос':d.question||'','Выбранный ответ':opts[Number(d.selected)]||'','Правильный ответ':opts[Number(d.correct)]||'','Верно':d.is_correct?'Да':'Нет','Объяснение':d.explanation||''})})}
  const assignmentRows=[];for(const x of S.assignments){const rec=x.recipients||[],relevant=rec.includes('ALL')?users:users.filter(u=>rec.includes(u.login));for(const u of relevant)assignmentRows.push({'Сектор':sectorOf(u),'Руководитель':managerDisplay(u.manager_login),'Сотрудник':u.name||u.login,'Логин':u.login,'Назначение':x.title,'Раздел':x.section?secName(x.section):'','Тема':x.topic||'','Создано':x.created_at?new Date(x.created_at).toLocaleString('ru-RU'):'','Дедлайн':x.due||'','Цель %':x.target,'Статус сотрудника':assignmentStatusForUser(x,u.login,S.attempts)})}
  const scope=login?login:manager?teamDisplay(manager):sector|| (isTechAdmin()?'Все_сектора':S.profile.sector_name||'Команда');
  const params=[['Параметр','Значение'],['Дата формирования',new Date().toLocaleString('ru-RU')],['Область',scope],['Период с',from||'Вся история'],['Период по',to||'Вся история'],['Сотрудников в отчёте',users.length],['Формула зоны развития',`минимум ${ADAPTIVE.minAttempts} попытки; среднее последних ${ADAPTIVE.recentWindow} < ${ADAPTIVE.gap}%`]];
  const wb=XLSX.utils.book_new();
  const wsp=XLSX.utils.aoa_to_sheet(params);formatExportSheet(wsp,[26,48]);XLSX.utils.book_append_sheet(wb,wsp,'Параметры');
  const add=(name,rows,headers,widths)=>{const ws=rows.length?XLSX.utils.json_to_sheet(rows):XLSX.utils.aoa_to_sheet([headers]);formatExportSheet(ws,widths);XLSX.utils.book_append_sheet(wb,ws,name)};
  add('Сводка',summary,['Сектор','Руководитель','Команда','Сотрудник','Логин','Soft %','Hard %','Потребность %','Зон развития','Попыток','Назначений выполнено','Назначений просрочено','Назначений в работе','Последняя активность'],[18,24,22,28,20,10,10,14,14,10,18,19,17,21]);
  add('Динамика',dynamics,['Сектор','Руководитель','Сотрудник','Логин','Дата','Раздел','Тема','Результат %','Тип'],[18,24,28,20,21,20,28,13,16]);
  add('Зоны развития',zones,['Сектор','Руководитель','Сотрудник','Логин','Раздел','Тема','Последние %','Попыток','Тренд','Статус'],[18,24,28,20,20,30,13,10,12,18]);
  add('История ответов',answers,['Сектор','Руководитель','Сотрудник','Логин','Дата','Раздел','Тема','Материал','Шаг / вопрос','Вопрос','Выбранный ответ','Правильный ответ','Верно','Объяснение'],[18,24,28,20,21,18,24,30,12,45,45,45,9,55]);
  add('Назначения',assignmentRows,['Сектор','Руководитель','Сотрудник','Логин','Назначение','Раздел','Тема','Создано','Дедлайн','Цель %','Статус сотрудника'],[18,24,28,20,35,18,25,21,13,10,18]);
  const period=(from||to)?`_${from||'start'}_${to||'today'}`:'';XLSX.writeFile(wb,`SkillHub_Отчёт_${safeFilePart(scope)}${period}.xlsx`);toast('Excel сформирован');
}

function renderManagerMentor(){
  const u=teamRows(S.profile.login),avg=k=>{const vals=u.map(x=>x[k]).filter(x=>x!==null);return vals.length?Math.round(vals.reduce((s,x)=>s+x,0)/vals.length):null},gaps=u.flatMap(emp=>emp.gaps.map(g=>({...g,login:emp.login,name:emp.name||emp.login}))).sort((a,b)=>a.avgRecent-b.avgRecent),diagnosedUsers=u.filter(x=>topicStats(x.login).some(t=>t.diagnosed)).length;
  $('pageTitle').textContent='Моя группа';$('pageSub').textContent=`Команда · ${S.profile.group_name||S.profile.name}`;
  $('page-mentor').innerHTML=`<div class="toolbar"><div><b>${esc(S.profile.group_name||'Моя команда')}</b><div class="muted small">Вы видите только сотрудников, закреплённых за вашим логином</div></div><button class="btn secondary" onclick="openMentorExport('','${jsq(S.profile.login)}','')">⬇ Отчёт Excel</button></div><div class="grid4"><div class="card kpi"><small>Команда</small><strong>${u.length}</strong><span class="muted small">активных сотрудников</span></div><div class="card kpi"><small>Hard</small><strong>${avg('hard')===null?'—':avg('hard')+'%'}</strong></div><div class="card kpi"><small>Диагностировано</small><strong>${diagnosedUsers}</strong></div><div class="card kpi"><small>Зоны развития</small><strong>${gaps.length}</strong></div></div><div class="section-title"><h2>🧭 Зоны развития и рекомендации</h2><span class="muted small">назначение подтверждаете вы</span></div>${adaptiveRuleHtml()}<div class="card">${gaps.length?gaps.map(x=>{const assigned=hasActiveTopicAssignment(x.login,x.section,x.topic),available=hasTopicContent(x.section,x.topic);return `<div class="gap-row"><div class="gap-person"><b>${esc(x.name)}</b><span class="muted small">${esc(x.login)}</span></div><div class="gap-topic"><b>${esc(x.topic)}</b><span class="muted small">${secName(x.section)} · ${x.attempts} попыток</span></div><div class="gap-score"><span class="pill bad">${x.avgRecent}%</span><span class="trend ${x.trend>0?'up':x.trend<0?'down':''}">${trendText(x.trend)}</span></div><div class="gap-action">${assigned?'<span class="pill good">Уже назначено</span>':available?`<button class="btn primary" onclick="openRecommendedAssignment('${jsq(x.login)}','${x.section}','${jsq(x.topic)}')">Назначить отработку</button>`:'<span class="muted small">Нет материалов</span>'}</div></div>`}).join(''):'<div class="muted">Пока нет подтверждённых зон развития.</div>'}</div><div class="section-title"><h2>Моя команда</h2></div>${teamTableHtml(u)}`;
}
function managerMetrics(login){const u=teamRows(login),avg=k=>{const vals=u.map(x=>x[k]).filter(x=>x!==null);return vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):null};return{manager:managerUser(login),u,count:u.length,soft:avg('soft'),hard:avg('hard'),needs:avg('needs'),gaps:u.reduce((n,x)=>n+x.gaps.length,0),attempts:u.reduce((n,x)=>n+x.attempts,0),overdue:u.reduce((n,x)=>n+x.overdue,0)}}
function openManagerDashboard(login){const g=managerMetrics(login);showModal(`<div class="modal-head"><div><h2>${esc(g.manager?.name||login)}</h2><div class="meta">${esc(g.manager?.group_name||'Команда')} · ${g.count} сотрудников</div></div><div class="actions"><button class="btn secondary" onclick="openMentorExport('','${jsq(login)}','')">⬇ Excel</button><button class="btn secondary" onclick="closeModal()">✕</button></div></div>${teamTableHtml(g.u)}`)}
function renderSectorAdmin(){
  const sector=S.profile.sector_name||'Основной сектор',managers=managersInSector(sector),gs=managers.map(m=>managerMetrics(m.login)),all=scopeEmployees(),unassigned=all.filter(x=>!x.manager_login);
  $('pageTitle').textContent='Сектор';$('pageSub').textContent=`${sector} · руководители, команды и динамика`;
  $('page-mentor').innerHTML=`<div class="toolbar"><div><b>${esc(sector)}</b><div class="muted small">${managers.length} руководителей · ${all.length} сотрудников</div></div><button class="btn secondary" onclick="openMentorExport('${jsq(sector)}','','')">⬇ Отчёт Excel</button></div><div class="grid4"><div class="card kpi"><small>Руководителей</small><strong>${managers.length}</strong></div><div class="card kpi"><small>Сотрудников</small><strong>${all.length}</strong></div><div class="card kpi"><small>Попыток</small><strong>${gs.reduce((n,x)=>n+x.attempts,0)}</strong></div><div class="card kpi"><small>Зон развития</small><strong>${gs.reduce((n,x)=>n+x.gaps,0)}</strong></div></div>${unassigned.length?`<div class="explain"><b>Без руководителя:</b> ${unassigned.map(x=>esc(x.name||x.login)).join(', ')}. Их можно распределить в разделе «Сотрудники».</div>`:''}<div class="section-title"><h2>Руководители и команды</h2></div><div class="card table-wrap"><table class="table"><thead><tr><th>Руководитель</th><th>Команда</th><th>Сотрудников</th><th>Soft</th><th>Hard</th><th>Потребность</th><th>Пробелов</th><th>Просрочено</th><th></th></tr></thead><tbody>${gs.map(g=>`<tr><td><b>${esc(g.manager?.name||g.manager?.login)}</b><div class="meta">${esc(g.manager?.login||'')}</div></td><td>${esc(g.manager?.group_name||'—')}</td><td>${g.count}</td><td>${g.soft===null?'—':g.soft+'%'}</td><td>${g.hard===null?'—':g.hard+'%'}</td><td>${g.needs===null?'—':g.needs+'%'}</td><td>${g.gaps||'—'}</td><td>${g.overdue||'—'}</td><td><button class="btn secondary" onclick="openManagerDashboard('${jsq(g.manager.login)}')">Команда</button></td></tr>`).join('')||'<tr><td colspan="9" class="muted">Руководителей пока нет.</td></tr>'}</tbody></table></div>`;
}
function renderTechAdminMentor(){
  const sectors=[...new Set(scopeEmployees().map(sectorOf).concat(S.allowed.filter(x=>x.active&&['rs','mentor'].includes(x.role)).map(sectorOf)))].filter(x=>x&&x!=='ALL').sort();
  const rows=sectors.map(sec=>{const employees=scopeEmployees().filter(x=>sectorOf(x)===sec),mans=managersInSector(sec),metrics=employees.map(u=>employeeMetrics(u,S.attempts));return{sec,employees,mans,rs:rsInSector(sec),attempts:metrics.reduce((n,x)=>n+x.attempts,0),gaps:metrics.reduce((n,x)=>n+x.gaps.length,0),overdue:metrics.reduce((n,x)=>n+x.overdue,0)}});
  $('pageTitle').textContent='SkillHub / все сектора';$('pageSub').textContent='Технический администратор · полная аналитика';
  $('page-mentor').innerHTML=`<div class="toolbar"><div><b>Все доступные сектора</b><div class="muted small">${rows.length} секторов · ${scopeEmployees().length} сотрудников</div></div><div class="actions"><button class="btn secondary" onclick="openMentorExport()">⬇ Общий Excel</button><button class="btn primary" onclick="go('admin')">⚙ Управление доступами</button></div></div><div class="grid4"><div class="card kpi"><small>Секторов</small><strong>${rows.length}</strong></div><div class="card kpi"><small>РС</small><strong>${S.allowed.filter(x=>x.active&&x.role==='rs').length}</strong></div><div class="card kpi"><small>Руководителей групп</small><strong>${S.allowed.filter(x=>x.active&&x.role==='mentor').length}</strong></div><div class="card kpi"><small>Сотрудников</small><strong>${scopeEmployees().length}</strong></div></div><div class="section-title"><h2>Сектора</h2></div><div class="card table-wrap"><table class="table"><thead><tr><th>Сектор</th><th>РС</th><th>Руководителей</th><th>Сотрудников</th><th>Попыток</th><th>Зон развития</th><th>Просрочено</th><th></th></tr></thead><tbody>${rows.map(r=>`<tr><td><b>${esc(r.sec)}</b></td><td>${esc(r.rs.map(x=>x.name||x.login).join(', ')||'—')}</td><td>${r.mans.length}</td><td>${r.employees.length}</td><td>${r.attempts}</td><td>${r.gaps||'—'}</td><td>${r.overdue||'—'}</td><td><button class="btn secondary" onclick="openSectorDashboard70('${jsq(r.sec)}')">Открыть</button></td></tr>`).join('')||'<tr><td colspan="8" class="muted">Сектора пока не созданы.</td></tr>'}</tbody></table></div>`;
}
function openSectorDashboard70(sector){const mans=managersInSector(sector),gs=mans.map(m=>managerMetrics(m.login)),un=scopeEmployees().filter(x=>sectorOf(x)===sector&&!x.manager_login);showModal(`<div class="modal-head"><div><h2>${esc(sector)}</h2><div class="meta">РС: ${esc(rsInSector(sector).map(x=>x.name||x.login).join(', ')||'не назначен')}</div></div><div class="actions"><button class="btn secondary" onclick="openMentorExport('${jsq(sector)}','','')">⬇ Excel</button><button class="btn secondary" onclick="closeModal()">✕</button></div></div>${un.length?`<div class="explain">Без руководителя: ${un.map(x=>esc(x.name||x.login)).join(', ')}</div>`:''}<div class="card table-wrap"><table class="table"><thead><tr><th>Руководитель</th><th>Команда</th><th>Сотрудников</th><th>Hard</th><th>Пробелов</th><th></th></tr></thead><tbody>${gs.map(g=>`<tr><td>${esc(g.manager?.name||g.manager?.login)}</td><td>${esc(g.manager?.group_name||'')}</td><td>${g.count}</td><td>${g.hard===null?'—':g.hard+'%'}</td><td>${g.gaps||'—'}</td><td><button class="btn secondary" onclick="openManagerDashboard('${jsq(g.manager.login)}')">Команда</button></td></tr>`).join('')||'<tr><td colspan="6" class="muted">Руководителей нет.</td></tr>'}</tbody></table></div>`)}
function renderMentor(){isTechAdmin()?renderTechAdminMentor():isRS()?renderSectorAdmin():renderManagerMentor()}

function assignmentScopeEmployees(){if(isTechAdmin())return scopeEmployees();if(isRS())return scopeEmployees();if(S.profile.role==='mentor')return employeesForManager(S.profile.login);return[]}
function openAssignmentEditor(prefill={}){const opts=S.content.filter(x=>x.status==='published').map(x=>`<option value="${x.id}">${esc(x.title||x.question)} — ${esc(x.topic)}</option>`).join(''),scope=isTechAdmin()?'ALL = все сотрудники SkillHub':isRS()?'ALL = все сотрудники моего сектора':'ALL = вся моя команда';showModal(`<div class="modal-head"><h2>Новое назначение</h2><button class="btn secondary" onclick="closeModal()">✕</button></div><div class="form-grid"><div class="field full"><label>Название</label><input id="asTitle"></div><div class="field"><label>Материал</label><select id="asContent"><option value="">По теме</option>${opts}</select></div><div class="field"><label>Раздел</label><select id="asSec"><option value="soft">Soft</option><option value="hard">Hard</option><option value="needs">Потребность</option></select></div><div class="field"><label>Тема</label><input id="asTopic" placeholder="Например, Кредиты или Тарифы"></div><div class="field"><label>Дедлайн</label><input id="asDue" type="date"></div><div class="field"><label>Минимум %</label><input id="asTarget" type="number" value="${ADAPTIVE.target}"></div><div class="field full"><label>Кому</label><input id="asUsers" value="ALL" placeholder="ALL или логины через запятую"><div class="meta">${scope}</div></div></div><div class="actions" style="justify-content:flex-end;margin-top:13px"><button class="btn primary" onclick="saveAssignment()">Назначить и уведомить</button></div>`);$('asTitle').value=prefill.title||'';$('asContent').value=prefill.content_id||'';$('asSec').value=prefill.section||'soft';$('asTopic').value=prefill.topic||'';$('asDue').value=prefill.due||'';$('asTarget').value=String(prefill.target??ADAPTIVE.target);$('asUsers').value=(prefill.recipients||['ALL']).join(', ')}
async function saveAssignment(){
  let rec=$('asUsers').value.split(',').map(normalizeLogin).filter(Boolean);if(!rec.length)rec=['ALL'];
  if(!isTechAdmin()&&rec.includes('ALL'))rec=assignmentScopeEmployees().map(x=>x.login);
  if(!isTechAdmin()){
    const ok=new Set(assignmentScopeEmployees().map(x=>x.login));if(rec.some(x=>!ok.has(x))){toast(isRS()?'Можно назначать только сотрудникам своего сектора':'Можно назначать только своей команде');return}
  }
  const row={title:$('asTitle').value.trim(),content_id:$('asContent').value||null,section:$('asSec').value,topic:$('asTopic').value.trim(),due:$('asDue').value||null,target:Number($('asTarget').value||90),recipients:rec,status:'active',created_by:S.user.id};if(!row.title){toast('Введите название');return}
  const {error}=await S.sb.from('assignments').insert(row);if(error){toast(error.message);return}await notifyRecipients('Новое задание',`${row.title}${row.due?' · до '+row.due:''}`,rec,'assignment');closeModal();await syncAll();renderAssignments();toast('Задание назначено')
}
async function notifyRecipients(title,body,recipients,kind='content'){
  let logs=recipients.includes('ALL')?assignmentScopeEmployees().map(x=>x.login):recipients;logs=[...new Set(logs.map(normalizeLogin))];if(!logs.length)return;const rows=logs.map(login=>({login,title,body,kind,read:false}));const {error}=await S.sb.from('notifications').insert(rows);if(error)console.warn(error)
}

function employeeListForAdmin(){if(isTechAdmin()||isRS())return S.allowed.filter(x=>x.login!==S.profile.login);return employeesForManager(S.profile.login)}
function userMeta(x){const manager=x.role==='employee'?` · руководитель: ${esc(managerDisplay(x.manager_login))}`:'',sector=x.role==='tech_admin'?'':` · ${esc(sectorOf(x))}`;return `${esc(x.login)} · ${roleName(x.role)}${sector}${manager} · ${x.claimed_user_id?'PIN создан':'первый вход не выполнен'}`}
function employeeSearchText(x){return [x.name,x.login,roleName(x.role),x.group_name,x.sector_name,x.manager_login,managerDisplay(x.manager_login)].filter(Boolean).join(' ').toLowerCase()}
function filterEmployeeRows(){
  const input=$('employeeSearch'),q=(input?.value||'').trim().toLowerCase(),wrap=$('employeeRows');if(!wrap)return;
  const items=[...wrap.querySelectorAll('.employee-row')];let shown=0;
  for(const el of items){const ok=!q||(el.dataset.search||'').includes(q);el.classList.toggle('hidden',!ok);if(ok)shown++}
  const c=$('employeeSearchCount');if(c)c.textContent=q?`${shown} найдено из ${items.length}`:`${items.length} записей`;
  const empty=$('employeeSearchEmpty');if(empty)empty.classList.toggle('hidden',shown!==0);
}
function renderEmployees(){
  const rows=employeeListForAdmin(),title=isTechAdmin()?'Пользователи SkillHub':isRS()?'Пользователи моего сектора':'Сотрудники моей команды';
  const placeholder=isTechAdmin()||isRS()?'Поиск по ФИО, логину, РГ, сектору…':'Поиск по ФИО или логину…';
  $('page-employees').innerHTML=`<div class="toolbar"><div><b>${title}</b><div id="employeeSearchCount" class="muted small">${rows.length} записей</div></div><div class="actions"><a class="btn secondary" href="./skillhub_users_template.xlsx" download>⬇ Шаблон Excel</a><label class="btn secondary">⬆ Импорт Excel<input type="file" accept=".xlsx" class="hidden" onchange="previewUsersExcel(event)"></label>${(isTechAdmin()||S.profile.role==='mentor')?'<button class="btn secondary" onclick="generateAllCodes()">🔐 Коды новым</button>':''}<button class="btn primary" onclick="openEmployeeEditor()">+ Добавить</button></div></div><div id="userImportPreview"></div><div class="user-search-box"><span class="user-search-icon">⌕</span><input id="employeeSearch" type="search" inputmode="search" autocomplete="off" placeholder="${placeholder}" oninput="filterEmployeeRows()"></div><div id="employeeRows" class="card" style="margin-top:10px">${rows.map(x=>{const edit=canEditUserLocal(x),reset=canResetUserLocal(x),search=employeeSearchText(x);return `<div class="employee-row" data-search="${esc(search)}"><div><b>${esc(x.name||x.login)}</b><div class="meta">${userMeta(x)}</div></div><div class="actions"><span class="pill ${x.active?'good':'bad'}">${x.active?'Активен':'Отключён'}</span>${edit?`<button class="btn secondary" onclick="openEmployeeEditor(S.allowed.find(u=>u.login==='${jsq(x.login)}'))">Изменить</button>`:''}${reset&&!x.claimed_user_id&&x.role==='employee'?`<button class="btn secondary" onclick="makeCode('${jsq(x.login)}')">Новый код</button>`:''}${reset&&x.claimed_user_id?`<button class="btn danger" onclick="resetAccess('${jsq(x.login)}')">Сбросить доступ</button>`:''}</div></div>`}).join('')||'<div class="muted">Пользователей пока нет.</div>'}<div id="employeeSearchEmpty" class="muted hidden" style="padding:18px 0;text-align:center">Ничего не найдено.</div></div>`;
}
function roleOptionsForEditor(){if(isTechAdmin())return[['employee','Сотрудник'],['mentor','Руководитель группы'],['rs','Руководитель сектора'],['tech_admin','Технический администратор']];if(isRS())return[['employee','Сотрудник'],['mentor','Руководитель группы']];return[['employee','Сотрудник']]}
function openEmployeeEditor(x=null){
  const opts=roleOptionsForEditor(),role=x?.role||'employee',managerOptions=S.allowed.filter(u=>u.active&&u.role==='mentor').map(m=>`<option value="${esc(m.login)}">${esc(m.name||m.login)} · ${esc(sectorOf(m))}</option>`).join('');
  showModal(`<div class="modal-head"><h2>${x?'Изменить пользователя':'Новый пользователь'}</h2><button class="btn secondary" onclick="closeModal()">✕</button></div><div class="form-grid"><div class="field full"><label>Корпоративный логин</label><input id="euLogin" ${x?'readonly':''}></div><div class="field full"><label>ФИО / имя</label><input id="euName"></div><div class="field"><label>Роль</label><select id="euRole" onchange="userEditorRoleChanged()" ${opts.length===1?'disabled':''}>${opts.map(o=>`<option value="${o[0]}">${o[1]}</option>`).join('')}</select></div><div class="field" id="euSectorWrap"><label>Сектор</label><input id="euSector"></div><div class="field" id="euManagerWrap"><label>Руководитель группы</label><select id="euManager"><option value="">Выберите руководителя</option>${managerOptions}</select></div><div class="field" id="euGroupWrap"><label>Название команды</label><input id="euGroup" placeholder="Например, Команда Барашкова"></div><div class="field full" id="euCodeWrap"><label>Код первого входа</label><input id="euCode" value="${x?'':(role==='employee'&&!isRS()?randCode():'')}"><div class="meta">Код нужен только сотруднику. Руководитель группы и руководитель сектора создают PIN без кода.</div></div><div class="field full"><label><input id="euActive" type="checkbox" checked> Активен</label></div></div><div id="euRoleNote" class="hint"></div><div class="actions" style="justify-content:flex-end;margin-top:13px"><button class="btn primary" onclick="saveEmployee()">${x?'Сохранить':'Добавить'}</button></div>`);
  $('euLogin').value=x?.login||'';$('euName').value=x?.name||'';$('euRole').value=role;$('euSector').value=x?.sector_name||(isRS()?S.profile.sector_name:(isTechAdmin()?'Основной сектор':S.profile.sector_name||'Основной сектор'));$('euManager').value=x?.manager_login||(S.profile.role==='mentor'?S.profile.login:'');$('euGroup').value=x?.group_name||'';$('euActive').checked=x?.active!==false;userEditorRoleChanged();
}
function userEditorRoleChanged(){
  const role=$('euRole')?.value||'employee',manager=role==='employee',team=role==='mentor',sector=!['tech_admin'].includes(role)&&S.profile.role!=='mentor',showCode=role==='employee';
  $('euManagerWrap')?.classList.toggle('hidden',!manager||S.profile.role==='mentor');$('euGroupWrap')?.classList.toggle('hidden',!team);$('euSectorWrap')?.classList.toggle('hidden',!sector);$('euCodeWrap')?.classList.toggle('hidden',!showCode);
  if($('euRoleNote'))$('euRoleNote').textContent=roleSelfActivationNote(role);
}
async function saveEmployee(){
  const login=normalizeLogin($('euLogin').value),name=$('euName').value.trim()||login,role=S.profile.role==='mentor'?'employee':$('euRole').value,sector=S.profile.role==='mentor'?S.profile.sector_name:($('euSector')?.value.trim()||S.profile.sector_name||'Основной сектор'),manager=S.profile.role==='mentor'?S.profile.login:($('euManager')?.value||null),group=$('euGroup')?.value.trim()||'',active=$('euActive').checked,code=role==='employee'?($('euCode')?.value.trim()||''):'';
  const existing=S.allowed.find(x=>x.login===login);if(!login){toast('Введите корпоративный логин');return}if(role==='employee'&&!manager){toast('Выберите руководителя группы');return}if(role==='employee'&&!existing&&!code&&S.profile.role!=='rs'){toast('Для нового сотрудника нужен код первого входа');return}
  const {error}=await S.sb.rpc('admin_upsert_user',{p_login:login,p_name:name,p_role:role,p_sector_name:sector,p_manager_login:manager,p_group_name:group,p_active:active,p_invite_code:code||null});if(error){toast(error.message);return}
  closeModal();await syncAll();if(code)showCodes([[login,code]],'Код первого входа');else{renderEmployees();toast(role==='employee'&&S.profile.role==='rs'?'Сотрудник добавлен. Код первого входа выдаст его руководитель группы.':'Данные сохранены')}
}
async function makeCode(login){const x=S.allowed.find(u=>u.login===login);if(!x||x.login===S.profile.login||x.role!=='employee')return;const code=randCode(),{error}=await S.sb.rpc('set_employee_invite_code',{p_login:login,p_code:code});if(error){toast(error.message);return}showCodes([[login,code]],'Новый код первого входа')}
async function generateAllCodes(){const target=employeeListForAdmin().filter(x=>x.active&&!x.claimed_user_id&&x.login!==S.profile.login&&x.role==='employee'),rows=[];for(const x of target){const code=randCode(),{error}=await S.sb.rpc('set_employee_invite_code',{p_login:x.login,p_code:code});if(!error)rows.push([x.login,code])}if(!rows.length){toast('Нет сотрудников, которым нужен код');return}showCodes(rows,'Коды первого входа сотрудников')}
async function toggleEmployee(login,active){const x=S.allowed.find(u=>u.login===login);if(!x)return;const {error}=await S.sb.rpc('admin_upsert_user',{p_login:x.login,p_name:x.name,p_role:x.role,p_sector_name:x.sector_name,p_manager_login:x.manager_login,p_group_name:x.group_name,p_active:active,p_invite_code:null});if(error)toast(error.message);else{await syncAll();renderEmployees();if(isTechAdmin())renderTechAdmin()}}
async function resetAccess(login){
  const x=S.allowed.find(u=>u.login===login);if(!x||!canResetUserLocal(x))return;const code=randCode();
  if(x.role==='employee'){
    if(!confirm('Старый PIN сотрудника перестанет работать. Создать новый код первого входа?'))return;const {error}=await S.sb.rpc('reset_employee_access',{p_login:login,p_new_code:code});if(error){toast(error.message);return}await syncAll();showCodes([[login,code]],'Доступ сотрудника сброшен');
  }else{
    if(!isTechAdmin())return;if(!confirm(`Сбросить доступ для ${x.name||x.login}? Старый PIN перестанет работать. После сброса руководитель создаст новый PIN при первом входе без кода.`))return;const {error}=await S.sb.rpc('tech_reset_access',{p_login:login,p_new_code:null});if(error){toast(error.message);return}await syncAll();toast('Доступ сброшен. Руководитель может создать новый PIN без кода.');
  }
}
function showCodes(rows,title){showModal(`<div class="modal-head"><h2>${esc(title)}</h2><button class="btn secondary" onclick="closeModal()">✕</button></div><p class="muted small">Код используется только при первом входе после создания или сброса. Затем пользователь входит по своему PIN.</p><div class="card">${rows.map(r=>`<div class="employee-row"><b>${esc(r[0])}</b><span class="access-code">${esc(r[1])}</span></div>`).join('')}</div><div class="actions" style="justify-content:flex-end;margin-top:12px"><button class="btn secondary" onclick='downloadCodes(${JSON.stringify(rows)})'>⬇ CSV</button></div>`)}

async function previewUsersExcel(ev){
  try{const sheets=await parseWorkbook(ev.target.files[0]),rows=(sheets['Пользователи']||sheets['Сотрудники']||[]).filter(r=>String(r['Логин']||'').trim());S.userImportDraft=rows;$('userImportPreview').innerHTML=`<div class="card" style="margin-top:12px"><h3>Импорт пользователей</h3><div class="grid3"><div class="kpi"><small>Строк</small><strong>${rows.length}</strong></div><div class="kpi"><small>Новых сотрудников</small><strong>${rows.filter(r=>roleValueFromExcel(r['Роль'])==='employee').length}</strong></div><div class="kpi"><small>Руководителей / РС</small><strong>${rows.filter(r=>roleValueFromExcel(r['Роль'])!=='employee').length}</strong></div></div><div class="hint">Если импорт делает руководитель группы, все строки автоматически станут сотрудниками его команды — роли, сектор и руководитель из Excel будут проигнорированы.</div><div class="actions" style="justify-content:flex-end;margin-top:12px"><button class="btn primary" onclick="commitUsersExcel()">Импортировать</button></div></div>`}catch(e){$('userImportPreview').innerHTML='<div class="explain">Не удалось прочитать Excel. Используйте шаблон SkillHub 7.0.</div>'}
}
async function commitUsersExcel(){
  const rows=S.userImportDraft||[];if(!rows.length)return;const codes=[],errors=[];let ok=0;
  for(let i=0;i<rows.length;i++){
    const r=rows[i],login=normalizeLogin(r['Логин']),name=String(r['ФИО']||r['Имя']||login).trim()||login;if(!login){errors.push(`Строка ${i+2}: нет логина`);continue}
    let role=S.profile.role==='mentor'?'employee':roleValueFromExcel(r['Роль']),sector=S.profile.role==='mentor'?S.profile.sector_name:String(r['Сектор']||(isTechAdmin()?'Основной сектор':S.profile.sector_name)||'Основной сектор').trim(),manager=S.profile.role==='mentor'?S.profile.login:normalizeLogin(r['Руководитель']||r['Логин руководителя']||''),group=String(r['Название команды']||r['Группа']||'').trim(),active=yesActive(r['Активен']||r['Статус']);
    if(isRS()&&['rs','tech_admin'].includes(role)){errors.push(`${login}: РС может импортировать только руководителей групп и сотрудников`);continue;}
    if(role==='employee'&&!manager){errors.push(`${login}: не указан руководитель группы`);continue}
    const existing=S.allowed.find(x=>x.login===login),code=role==='employee'&&!existing?.claimed_user_id&&!isRS()?randCode():'';
    const {error}=await S.sb.rpc('admin_upsert_user',{p_login:login,p_name:name,p_role:role,p_sector_name:sector,p_manager_login:manager||null,p_group_name:group,p_active:active,p_invite_code:code||null});
    if(error){errors.push(`${login}: ${error.message}`);continue}ok++;if(code)codes.push([login,code]);
  }
  await syncAll();renderEmployees();S.userImportDraft=null;
  const msg=`Импорт завершён: ${ok} успешно${errors.length?`, ${errors.length} с ошибками`:''}`;toast(msg);
  if(codes.length||errors.length)showModal(`<div class="modal-head"><div><h2>${msg}</h2><div class="meta">Коды сформированы только для сотрудников без созданного PIN</div></div><button class="btn secondary" onclick="closeModal()">✕</button></div>${codes.length?`<div class="card">${codes.map(r=>`<div class="employee-row"><b>${esc(r[0])}</b><span class="access-code">${esc(r[1])}</span></div>`).join('')}</div><div class="actions" style="justify-content:flex-end;margin-top:10px"><button class="btn secondary" onclick='downloadCodes(${JSON.stringify(codes)})'>⬇ Скачать коды CSV</button></div>`:''}${errors.length?`<div class="explain" style="margin-top:12px"><b>Не импортированы:</b><br>${errors.map(esc).join('<br>')}</div>`:''}`)
}

function renderImportPane(){$('contentPane').innerHTML=`<div class="import-box"><h3>Импорт контента из Excel</h3><p>Кейсы, диалоги и назначения можно загрузить одним файлом. Пользователи теперь импортируются отдельно в разделе «Сотрудники».</p><div class="actions" style="justify-content:center"><a class="btn secondary" href="./skillhub_cases_template.xlsx" download>⬇ Скачать шаблон кейсов</a><label class="btn primary">Выбрать Excel<input type="file" accept=".xlsx" class="hidden" onchange="previewExcel(event)"></label></div></div><div id="importPreview"></div>`}
async function previewExcel(ev){try{const sheets=await parseWorkbook(ev.target.files[0]),cases=(sheets['Кейсы']||[]).filter(r=>String(r['Вопрос']||'').trim()),dialogs=(sheets['Диалоги']||[]).filter(r=>String(r['ID диалога']||'').trim()),assignments=(sheets['Назначения']||[]).filter(r=>String(r['Название']||'').trim());S.importDraft={sheets,cases,dialogs,employees:[],assignments};$('importPreview').innerHTML=`<div class="card" style="margin-top:12px"><h3>Предпросмотр</h3><div class="grid3"><div class="kpi"><small>Кейсы</small><strong>${cases.length}</strong></div><div class="kpi"><small>Диалоги</small><strong>${dialogs.length}</strong></div><div class="kpi"><small>Назначения</small><strong>${assignments.length}</strong></div></div><div class="actions" style="justify-content:flex-end;margin-top:12px"><button class="btn primary" onclick="commitExcel()">Импортировать</button></div></div>`}catch(e){$('importPreview').innerHTML='<div class="explain">Не удалось прочитать Excel. Используйте шаблон SkillHub.</div>'}}
async function commitExcel(){
  if(!S.importDraft)return;const {sheets,cases,dialogs,assignments}=S.importDraft;try{
    for(const r of cases){const answers=[1,2,3,4].map(i=>String(r['Ответ '+i]||'').trim());if(answers.some(x=>!x))continue;const audience=String(r['Кому']||'ALL').split(',').map(x=>x.trim()).filter(Boolean),row={type:String(r['Тип']||'quiz'),status:String(r['Статус']||'draft'),section:String(r['Раздел']||'soft'),topic:String(r['Тема']||'Общий'),difficulty:String(r['Сложность']||'Средний'),title:String(r['Заголовок']||''),payload:{question:String(r['Вопрос']||''),answers,correct:Math.max(0,Number(r['Правильный ответ']||1)-1),explanation:String(r['Объяснение']||'')},audience,created_by:S.user.id,updated_at:new Date().toISOString()};if(String(r['ID']||'').match(/^[0-9a-f-]{36}$/i))row.id=r['ID'];const {error}=await S.sb.from('content').upsert(row);if(error)throw error;if(row.status==='published'&&yn(r['Уведомить']))await notifyRecipients('Новый материал',row.title||row.payload.question.slice(0,80),audience)}
    const stepRows=sheets['Шаги диалогов']||[];for(const r of dialogs){const did=String(r['ID диалога']).trim(),steps=stepRows.filter(s=>String(s['ID диалога']).trim()===did).sort((a,b)=>Number(a['Шаг'])-Number(b['Шаг'])).map(s=>({client:String(s['Реплика клиента']||''),options:[1,2,3].map(i=>String(s['Ответ '+i]||'')),correct:Math.max(0,Number(s['Правильный ответ']||1)-1),next_client:String(s['Следующая реплика клиента']||''),explanation:String(s['Объяснение']||'')}));if(!steps.length)continue;const audience=String(r['Кому']||'ALL').split(',').map(x=>x.trim()).filter(Boolean),row={type:'dialogue',status:String(r['Статус']||'draft'),section:String(r['Раздел']||'needs'),topic:String(r['Тема']||'Общий'),difficulty:'Средний',title:String(r['Название']||did),payload:{description:String(r['Описание']||''),steps},audience,created_by:S.user.id,updated_at:new Date().toISOString()};if(did.match(/^[0-9a-f-]{36}$/i))row.id=did;const {error}=await S.sb.from('content').upsert(row);if(error)throw error;if(row.status==='published'&&yn(r['Уведомить']))await notifyRecipients('Новый диалог',row.title,audience)}
    for(const r of assignments){let rec=String(r['Кому']||'ALL').split(',').map(normalizeLogin).filter(Boolean);if(!rec.length)rec=['ALL'];if(!isTechAdmin()&&rec.includes('ALL'))rec=assignmentScopeEmployees().map(x=>x.login);const row={title:String(r['Название']),content_id:String(r['ID материала']||'').match(/^[0-9a-f-]{36}$/i)?String(r['ID материала']):null,section:String(r['Раздел']||''),topic:String(r['Тема']||''),due:String(r['Дедлайн']||'')||null,target:Number(r['Минимум %']||90),recipients:rec,status:String(r['Статус']||'active'),created_by:S.user.id};const {error}=await S.sb.from('assignments').insert(row);if(error)throw error;if(yn(r['Уведомить']))await notifyRecipients('Новое задание',`${row.title}${row.due?' · до '+row.due:''}`,rec,'assignment')}
    await syncAll();toast('Импорт завершён');contentTab='library';renderContent();
  }catch(e){console.error(e);toast('Ошибка импорта: '+(e.message||e))}
}
function exportExcel(){const wb=XLSX.utils.book_new(),cases=[],dialogs=[],steps=[];for(const x of S.content){if(x.type==='dialogue'){dialogs.push({'ID диалога':x.id,'Статус':x.status,'Раздел':x.section,'Тема':x.topic,'Название':x.title,'Описание':x.description||'','Кому':(x.audience||['ALL']).join(', '),'Уведомить':'Нет'});(x.steps||[]).forEach((s,i)=>steps.push({'ID диалога':x.id,'Шаг':i+1,'Реплика клиента':s.client,'Ответ 1':s.options?.[0]||'','Ответ 2':s.options?.[1]||'','Ответ 3':s.options?.[2]||'','Правильный ответ':Number(s.correct)+1,'Следующая реплика клиента':s.next_client||'','Объяснение':s.explanation||''}))}else cases.push({'ID':x.id,'Статус':x.status,'Раздел':x.section,'Тема':x.topic,'Сложность':x.difficulty,'Тип':x.type,'Заголовок':x.title,'Вопрос':x.question,'Ответ 1':x.answers?.[0]||'','Ответ 2':x.answers?.[1]||'','Ответ 3':x.answers?.[2]||'','Ответ 4':x.answers?.[3]||'','Правильный ответ':Number(x.correct)+1,'Объяснение':x.explanation||'','Кому':(x.audience||['ALL']).join(', '),'Уведомить':'Нет'})}XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(cases),'Кейсы');XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(dialogs),'Диалоги');XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(steps),'Шаги диалогов');XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(S.allowed.map(x=>({'Логин':x.login,'ФИО':x.name,'Роль':roleName(x.role),'Сектор':x.sector_name,'Руководитель':x.manager_login||'','Название команды':x.group_name,'Активен':x.active?'Да':'Нет'}))),'Пользователи');XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(S.assignments.map(x=>({'ID':x.id,'Название':x.title,'Раздел':x.section,'Тема':x.topic,'ID материала':x.content_id||'','Кому':(x.recipients||['ALL']).join(', '),'Дедлайн':x.due||'','Минимум %':x.target,'Уведомить':'Нет','Статус':x.status}))),'Назначения');XLSX.writeFile(wb,'SkillHub_export_7_0.xlsx')}

function renderTechAdmin(){
  if(!isTechAdmin()){$('page-admin').innerHTML='<div class="explain">Нет доступа.</div>';return}
  const rows=S.allowed.slice().sort((a,b)=>roleRank(b.role)-roleRank(a.role)||String(a.name||a.login).localeCompare(String(b.name||b.login),'ru'));
  $('page-admin').innerHTML=`<div class="toolbar"><div><b>Технический администратор SkillHub</b><div class="muted small">Ваш логин: ${esc(S.profile.login)} · доступ выше РС</div></div><div class="actions"><button class="btn secondary" onclick="generateAllCodes()">🔐 Коды новым</button><button class="btn secondary" onclick="go('employees')">👥 Пользователи / Excel</button></div></div><div class="grid4"><div class="card kpi"><small>РС</small><strong>${rows.filter(x=>x.role==='rs'&&x.active).length}</strong></div><div class="card kpi"><small>Руководителей групп</small><strong>${rows.filter(x=>x.role==='mentor'&&x.active).length}</strong></div><div class="card kpi"><small>Сотрудников</small><strong>${rows.filter(x=>x.role==='employee'&&x.active).length}</strong></div><div class="card kpi"><small>Не активировали PIN</small><strong>${rows.filter(x=>!x.claimed_user_id&&x.active).length}</strong></div></div><div class="section-title"><h2>Управление доступами</h2></div><div class="field" style="max-width:460px;margin-bottom:10px"><input placeholder="Поиск по ФИО или логину" oninput="filterAdminUsers(this.value)"></div><div class="card" id="adminUsersList">${rows.map(x=>adminUserRow(x)).join('')}</div><div class="hint" style="margin-top:12px">Код первого входа выдаётся только сотрудникам. Руководитель сектора и руководитель группы при первом входе создают PIN без кода. Техадминистратор может выдавать сотрудникам код первого входа, массово создавать коды новым сотрудникам и сбрасывать доступ. Руководитель сектора и руководитель группы создают PIN без кода.</div>`
}
function adminUserRow(x){const self=x.login===S.profile.login,reset=canResetUserLocal(x),firstCode=!self&&x.role==='employee'&&x.active&&!x.claimed_user_id;return `<div class="employee-row" data-admin-row="${esc((x.login+' '+(x.name||'')+' '+roleName(x.role)+' '+sectorOf(x)).toLowerCase())}"><div><b>${esc(x.name||x.login)}</b><div class="meta">${userMeta(x)}</div></div><div class="actions"><span class="pill ${x.active?'good':'bad'}">${x.active?'Активен':'Отключён'}</span>${firstCode?`<button class="btn secondary" onclick="makeCode('${jsq(x.login)}')">🔐 Выдать код</button>`:''}${!self?`<button class="btn secondary" onclick="openEmployeeEditor(S.allowed.find(u=>u.login==='${jsq(x.login)}'))">Изменить</button>`:''}${reset&&x.claimed_user_id?`<button class="btn danger" onclick="resetAccess('${jsq(x.login)}')">Сбросить доступ</button>`:''}${!self?`<button class="btn danger" onclick="deleteUser('${jsq(x.login)}')">Удалить</button>`:''}</div></div>`}
function filterAdminUsers(q){q=String(q||'').toLowerCase();document.querySelectorAll('[data-admin-row]').forEach(r=>r.classList.toggle('hidden',!r.dataset.adminRow.includes(q)))}
async function deleteUser(login){
  if(!isTechAdmin()||login===S.profile.login)return;
  const x=S.allowed.find(u=>u.login===login);if(!x)return;
  if(!confirm(`Удалить ${x.name||x.login} из SkillHub? Доступ будет удалён, но история тренировок и отчётные данные сохранятся.`))return;
  const {error}=await S.sb.rpc('tech_delete_user',{p_login:login});if(error){toast(error.message);return}
  await syncAll();renderTechAdmin();toast('Пользователь удалён')
}


function showForgotPinHelp(){showModal(`<div class="modal-head"><h2>Не помню PIN</h2><button class="btn secondary" onclick="closeModal()">✕</button></div><div class="field"><label>Корпоративный логин</label><input id="forgotLogin" autocomplete="username" placeholder="Например, a.eliseev1" value="${esc($('loginInput')?.value||'')}"></div><button class="btn primary full" onclick="startForgotPin()">Продолжить</button><div id="forgotError" class="error"></div><div class="hint" style="margin-top:10px">РГ, РС и техадминистратор смогут сразу придумать новый PIN. Сотруднику потребуется новый код первого входа от своего РГ.</div>`)}
async function startForgotPin(){const login=normalizeLogin($('forgotLogin')?.value);const err=$('forgotError');if(err)err.textContent='';if(!login){if(err)err.textContent='Введите корпоративный логин.';return}try{const {data,error}=await S.sb.rpc('forgot_pin_start',{p_login:login});if(error)throw error;closeModal();$('loginInput').value=login;$('pinInput').value='';$('inviteInput').value='';if(data==='employee'){setAuthMode('register',{title:'Создайте новый PIN',text:'Запросите у своего руководителя группы новый код первого входа. Затем введите код и придумайте новый PIN.',hideInvite:false,pinLabel:'Придумайте новый PIN',button:'Создать новый PIN'});$('inviteInput').focus()}else{setAuthMode('register',{title:'Создайте новый PIN',text:'Введите новый PIN. Код первого входа не нужен.',hideInvite:true,pinLabel:'Придумайте новый PIN',button:'Создать новый PIN'});$('pinInput').focus()}}catch(e){let m=e.message||String(e);if(m.includes('LOGIN_NOT_FOUND'))m='Такой активный логин не найден.';if(err)err.textContent=m}}

(async function init(){updateNetwork();if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});if(!initClient())return;const {data:{session}}=await S.sb.auth.getSession();if(session){try{await afterAuth();return}catch(e){console.warn(e)}}$('loginView').classList.remove('hidden')})();

/* ===== SkillHub 7.1.9 — manual Soft trainers ===== */
S.manualAnswers=S.manualAnswers||[];

function manualTypeName(x){return x==='manual'?'Ручной тренажёр':x==='dialogue'?'Диалог':x==='hardcase'?'Hard-кейс':'Кейс'}
function manualStatusText(s){return s==='submitted'?'На проверке':s==='revision_requested'?'На доработке':s==='accepted'?'Принято':'Не начато'}
function manualStatusClass(s){return s==='accepted'?'good':s==='revision_requested'?'warn':s==='submitted'?'':'status-draft'}
function manualHistory(contentId,login=S.profile?.login){return (S.manualAnswers||[]).filter(x=>x.content_id===contentId&&x.login===login).slice().sort((a,b)=>Number(a.version)-Number(b.version))}
function latestManualAnswer(contentId,login=S.profile?.login){const a=manualHistory(contentId,login);return a.length?a[a.length-1]:null}
function autoSoftContent(){return S.content.filter(x=>x.status==='published'&&x.section==='soft'&&x.type!=='manual')}
function manualSoftContent(){return S.content.filter(x=>x.status==='published'&&x.section==='soft'&&x.type==='manual')}
function manualTopicContent(topic){return manualSoftContent().filter(x=>x.topic===topic)}
function manualTopicStats(topic,login=S.profile?.login){
  const arr=manualTopicContent(topic),latest=arr.map(x=>latestManualAnswer(x.id,login));
  return {total:arr.length,started:latest.filter(Boolean).length,unseen:latest.filter(x=>!x).length,submitted:latest.filter(x=>x?.status==='submitted').length,revision:latest.filter(x=>x?.status==='revision_requested').length,accepted:latest.filter(x=>x?.status==='accepted').length};
}
function pickSmartManualContent(topic,excludeId=null){
  const arr=manualTopicContent(topic);if(!arr.length)return null;
  const unseen=arr.filter(x=>!latestManualAnswer(x.id,S.profile?.login)&&x.id!==excludeId);
  if(!unseen.length)return null;
  return unseen[Math.floor(Math.random()*unseen.length)];
}
function firstManualRevision(topic){
  return manualTopicContent(topic).map(x=>({content:x,last:latestManualAnswer(x.id)})).filter(x=>x.last?.status==='revision_requested').sort((a,b)=>new Date(a.last.reviewed_at||a.last.updated_at||0)-new Date(b.last.reviewed_at||b.last.updated_at||0))[0]?.content||null;
}
function startManualTopic(topic){
  const next=pickSmartManualContent(topic);if(next){startManualContent(next.id);return}
  const revision=firstManualRevision(topic);if(revision){toast('Новых кейсов нет — есть работа на доработке');startManualContent(revision.id);return}
  const st=manualTopicStats(topic);showModal(`<div class="modal-head"><div><h2>${esc(topic)}</h2><div class="muted small">Ручной тренажёр</div></div><button class="btn secondary" onclick="closeModal()">✕</button></div><div class="card"><h3>Все кейсы отправлены</h3><p class="muted">Вы отправили ${st.started} из ${st.total} кейсов. Новые кейсы больше не будут повторяться. Если РГ вернёт работу на доработку, она появится здесь отдельно.</p><div class="actions" style="justify-content:flex-end"><button class="btn primary" onclick="closeModal()">Готово</button></div></div>`);
}
function nextManualContent(currentId){
  const current=S.content.find(x=>x.id===currentId);if(!current)return go('training');
  const next=pickSmartManualContent(current.topic,currentId);if(next){startManualContent(next.id);return}
  const revision=firstManualRevision(current.topic);if(revision&&revision.id!==currentId){toast('Новых кейсов нет — открываю доработку');startManualContent(revision.id);return}
  const st=manualTopicStats(current.topic);go('training');toast(st.total?`Все ${st.total} кейсов отправлены — результат каждого сохранён`:'Новых кейсов нет');
}

// Manual trainers never participate in automatic score/adaptive selection.
topicProgress=function(sec,topic,login=S.profile?.login){const arr=S.content.filter(x=>x.status==='published'&&x.section===sec&&x.topic===topic&&x.type!=='manual'),seen=seenContentMap(login);return {done:arr.filter(x=>seen.has(x.id)).length,total:arr.length}};
pickSmartContent=function(sec,topic){const arr=S.content.filter(x=>x.status==='published'&&x.section===sec&&x.topic===topic&&x.type!=='manual');if(!arr.length)return null;const seen=seenContentMap(S.profile.login),unseen=arr.filter(x=>!seen.has(x.id));let pool=unseen.length?unseen:[...arr];if(!unseen.length&&pool.length>1){let last=null,lastT=-1;for(const x of pool){const t=seen.get(x.id)||0;if(t>lastT){last=x.id;lastT=t}}const alt=pool.filter(x=>x.id!==last);if(alt.length)pool=alt}return pool[Math.floor(Math.random()*pool.length)]};
hasTopicContent=function(sec,topic){return S.content.some(x=>x.status==='published'&&x.section===sec&&x.topic===topic&&x.type!=='manual')};

syncAll=async function(manual=false){
  updateNetwork();if(!S.user)return;if(navigator.onLine)await flushQueue();
  try{
    const qs=[
      S.sb.from('content').select('*').order('updated_at',{ascending:false}),
      S.sb.from('assignments').select('*').order('created_at',{ascending:false}),
      S.sb.from('attempts').select('*').order('created_at',{ascending:true}),
      S.sb.from('notifications').select('*').order('created_at',{ascending:true}),
      S.sb.from('manual_answers').select('*').order('created_at',{ascending:true})
    ];
    const [c,a,t,n,m]=await Promise.all(qs);for(const r of [c,a,t,n,m])if(r.error)throw r.error;
    S.content=(c.data||[]).map(normalizeContent);S.assignments=a.data||[];S.attempts=t.data||[];S.notifications=n.data||[];S.manualAnswers=m.data||[];
    if(isManager()){
      const [al,pr]=await Promise.all([S.sb.from('allowed_logins').select('*').order('login'),S.sb.from('profiles').select('*').order('login')]);
      if(al.error)throw al.error;if(pr.error)throw pr.error;S.allowed=al.data||[];S.profiles=pr.data||[];
    }else{S.allowed=[];S.profiles=[S.profile]}
    localStorage.setItem('sh7_cache_'+S.profile.login,JSON.stringify({content:S.content,assignments:S.assignments,attempts:S.attempts,notifications:S.notifications,manualAnswers:S.manualAnswers,allowed:S.allowed,profiles:S.profiles}));
    renderUnread();renderCurrent();if(manual)toast('Данные обновлены');
  }catch(e){const c=JSON.parse(localStorage.getItem('sh7_cache_'+S.profile.login)||'null');if(c){Object.assign(S,c);S.manualAnswers=S.manualAnswers||[];renderUnread();renderCurrent()}if(manual)toast('Нет связи с базой — показана локальная копия')}
};

trainingCards=function(){return `<div class="grid4"><div class="card train-card"><div class="icon">💬</div><h3>Soft Skills</h3><p>Автоматические тесты и ручные тренажёры с проверкой РГ.</p><button class="btn primary" onclick="openSoftHub()">Тренировать</button></div><div class="card train-card"><div class="icon">🧠</div><h3>Hard Skills</h3><p>Решение реальных клиентских кейсов по продуктам.</p><button class="btn primary" onclick="openSection('hard')">Тренировать</button></div><div class="card train-card"><div class="icon">🎯</div><h3>Потребность</h3><p>Вопросы, критерии и живые диалоги.</p><button class="btn primary" onclick="openSection('needs')">Тренировать</button></div><div class="card train-card"><div class="icon">⌨️</div><h3>Печать</h3><p>50 текстов для тренировки скорости и точности.</p><button class="btn primary" onclick="startTyping()">Начать</button></div></div>`};

renderTraining=function(){
  const auto=autoSoftContent().length,manual=manualSoftContent().length;
  $('page-training').innerHTML=trainingCards()+`<div class="section-title"><h2>Библиотека</h2><span class="muted small">${S.content.filter(x=>x.status==='published').length} материалов</span></div><div class="card"><div class="assignment"><div><b>Soft Skills</b><div class="meta">${auto} обычных · ${manual} ручных</div></div><button class="btn secondary" onclick="openSoftHub()">Открыть</button></div>${['hard','needs'].map(sec=>`<div class="assignment"><div><b>${secName(sec)}</b><div class="meta">${S.content.filter(x=>x.section===sec&&x.status==='published').length} материалов</div></div><button class="btn secondary" onclick="openSection('${sec}')">Открыть</button></div>`).join('')}</div>`;
};

function openSoftHub(){
  const auto=autoSoftContent().length,manual=manualSoftContent().length;
  showModal(`<div class="modal-head"><div><h2>Soft Skills</h2><div class="muted small">Выберите формат тренировки</div></div><button class="btn secondary" onclick="closeModal()">✕</button></div><div class="manual-choice-grid"><button class="manual-choice" onclick="openSection('soft','auto')"><span class="manual-choice-icon">⚡</span><b>Обычные тренажёры</b><small>Тесты с автоматической проверкой и результатом сразу</small><em>${auto} материалов</em></button><button class="manual-choice" onclick="openManualSoft()"><span class="manual-choice-icon">✍️</span><b>Ручные тренажёры</b><small>Свободный ответ → проверка руководителем группы</small><em>${manual} материалов</em></button></div>`);
}

openSection=function(sec,mode=''){
  if(sec==='soft'&&!mode){openSoftHub();return}
  let arr=S.content.filter(x=>x.section===sec&&x.status==='published');
  if(sec==='soft'&&mode==='auto')arr=arr.filter(x=>x.type!=='manual');
  else arr=arr.filter(x=>x.type!=='manual');
  const topics=[...new Set(arr.map(x=>x.topic))];
  showModal(`<div class="modal-head"><div><h2>${secName(sec)}${sec==='soft'?' · обычные тренажёры':''}</h2><div class="muted small">Выберите тему или конкретный материал</div></div><button class="btn secondary" onclick="closeModal()">✕</button></div><div class="topic-grid">${topics.map(t=>{const p=topicProgress(sec,t);return `<button class="topic" onclick="closeModal();startTopic('${sec}','${jsq(t)}')">${esc(t)}<small>Пройдено ${p.done} из ${p.total} · умная выдача</small></button>`}).join('')}</div><div class="section-title"><h2>Материалы</h2></div>${arr.map(x=>`<div class="content-row"><div><span class="pill">${manualTypeName(x.type)}</span><b>${esc(x.title||x.question)}</b><div class="meta">${esc(x.topic)}${seenContentMap().has(x.id)?' · ✓ пройден':' · ещё не пройден'}</div></div><button class="btn secondary" onclick="closeModal();startContent('${x.id}')">Начать</button></div>`).join('')||'<p class="muted">Пока пусто.</p>'}`);
};

function openManualSoft(){
  const arr=manualSoftContent(),topics=[...new Set(arr.map(x=>x.topic))];
  showModal(`<div class="modal-head"><div><h2>Ручные тренажёры</h2><div class="muted small">Кейсы идут по одному без повторов. Каждый ответ отдельно уходит РГ на проверку.</div></div><button class="btn secondary" onclick="closeModal()">✕</button></div>${topics.map(topic=>{
    const items=manualTopicContent(topic),st=manualTopicStats(topic),reworks=items.filter(x=>latestManualAnswer(x.id)?.status==='revision_requested');
    const pct=st.total?Math.round(st.started/st.total*100):0;
    const action=st.unseen>0?`<button class="btn primary" onclick="closeModal();startManualTopic('${jsq(topic)}')">${st.started?'Продолжить':'Начать'}</button>`:reworks.length?`<button class="btn primary" onclick="closeModal();startManualContent('${reworks[0].id}')">Доработать</button>`:`<button class="btn secondary" disabled>Все отправлено</button>`;
    return `<div class="card" style="margin-bottom:14px"><div class="toolbar"><div><h3 style="margin:0 0 4px">${esc(topic)}</h3><div class="meta">Отправлено ${st.started} из ${st.total} · на проверке ${st.submitted} · принято ${st.accepted}${st.revision?` · на доработке ${st.revision}`:''}</div></div>${action}</div><div class="progress"><span style="width:${pct}%"></span></div>${reworks.length?`<div class="manual-status-box warn"><b>Нужно доработать: ${reworks.length}</b><div class="muted small">Возвращённые РГ кейсы не теряются и доступны отдельно.</div>${reworks.slice(0,3).map(x=>`<button class="btn secondary" style="margin-top:8px" onclick="closeModal();startManualContent('${x.id}')">${esc(x.title||'Открыть доработку')}</button>`).join('')}</div>`:''}<details style="margin-top:12px"><summary class="muted small" style="cursor:pointer">Показать все кейсы и статусы</summary><div style="margin-top:8px">${items.map(x=>{const a=latestManualAnswer(x.id),state=a?.status||'';return `<div class="content-row manual-row"><div><span class="pill ${manualStatusClass(state)}">${manualStatusText(state)}</span><b>${esc(x.title||x.question)}</b>${a?`<div class="meta">версия ${a.version}</div>`:''}</div><button class="btn ${state==='revision_requested'?'primary':'secondary'}" onclick="closeModal();startManualContent('${x.id}')">${state==='revision_requested'?'Доработать':state==='submitted'?'Посмотреть':state==='accepted'?'Результат':'Открыть'}</button></div>`}).join('')}</div></details></div>`;
  }).join('')||'<div class="muted">Ручных тренажёров пока нет.</div>'}`);
}

startTopic=function(sec,topic){const x=pickSmartContent(sec,topic);if(!x){toast('В теме пока нет опубликованных обычных материалов');return}startContent(x.id)};
startContent=function(id){const x=S.content.find(c=>c.id===id);if(!x)return;if(x.type==='manual'){startManualContent(id);return}x.type==='dialogue'?startDialogue(x):startQuiz([x],x.section,x.topic)};
startAssignment=function(id){const a=S.assignments.find(x=>x.id===id);if(!a)return;a.content_id?startContent(a.content_id):startTopic(a.section,a.topic)};

function manualHistoryHtml(contentId,login){
  const rows=manualHistory(contentId,login);if(!rows.length)return'';
  return `<div class="manual-history"><h3>История</h3>${rows.map(r=>`<div class="manual-history-item"><div class="actions" style="justify-content:space-between"><b>Версия ${r.version}</b><span class="pill ${manualStatusClass(r.status)}">${manualStatusText(r.status)}</span></div><div class="manual-answer-text">${esc(r.answer)}</div>${r.mentor_comment?`<div class="review-note"><b>Комментарий РГ</b><div>${esc(r.mentor_comment)}</div></div>`:''}${r.mentor_suggestion?`<div class="review-note suggestion"><b>Как можно сформулировать</b><div>${esc(r.mentor_suggestion)}</div></div>`:''}</div>`).join('')}</div>`;
}

function startManualContent(id){
  const x=S.content.find(c=>c.id===id);if(!x||x.type!=='manual')return;goRun();
  const instruction=x.instruction||'Сформулируйте ответ своими словами.',question=x.question||x.title||'';
  if(S.profile.role!=='employee'){
    $('page-run').innerHTML=`<div class="card manual-run-card"><div class="actions" style="justify-content:space-between"><button class="btn secondary" onclick="go('training')">← Назад</button><span class="pill">Ручной тренажёр</span></div><h2>${esc(x.title||'Ручной тренажёр')}</h2><p class="muted">${esc(instruction)}</p><div class="manual-prompt">${esc(question)}</div><div class="hint">Это режим просмотра. Отправлять ответы на проверку могут сотрудники.</div></div>`;return;
  }
  const last=latestManualAnswer(id),canEdit=!last||last.status==='revision_requested',prefill=last?.status==='revision_requested'?last.answer:'';
  const stats=manualTopicStats(x.topic),currentNumber=Math.min(stats.total,stats.started+(last?0:1)),pct=stats.total?Math.round(stats.started/stats.total*100):0;
  const statusBlock=last?`<div class="manual-status-box ${manualStatusClass(last.status)}"><b>${manualStatusText(last.status)}</b>${last.status==='submitted'?'<div class="muted small">Ответ уже сохранён и отправлен РГ. Можно сразу перейти к следующему кейсу.</div>':''}${last.mentor_comment?`<div><b>Комментарий РГ:</b> ${esc(last.mentor_comment)}</div>`:''}${last.mentor_suggestion?`<div><b>Как можно сформулировать:</b> ${esc(last.mentor_suggestion)}</div>`:''}</div>`:'';
  const afterButtons=`<div class="actions manual-next-actions" style="justify-content:flex-end"><button class="btn secondary" onclick="go('training')">Выйти</button><button class="btn primary" onclick="nextManualContent('${id}')">Далее →</button></div>`;
  $('page-run').innerHTML=`<div class="card manual-run-card"><div class="actions" style="justify-content:space-between"><button class="btn secondary" onclick="go('training')">← Назад</button><span class="pill">Ручной тренажёр</span></div><div class="meta" style="margin-top:14px">${esc(x.topic)} · отправлено ${stats.started} из ${stats.total}${!last?` · текущий кейс ${currentNumber}`:''}</div><div class="progress"><span style="width:${pct}%"></span></div><h2>${esc(x.title||'Ручной тренажёр')}</h2><p class="muted">${esc(instruction)}</p><div class="manual-prompt">${esc(question)}</div>${statusBlock}${canEdit?`<div class="field manual-answer-field"><label>${last?'Доработанный вариант':'Ваш вариант ответа'}</label><textarea id="manualAnswerInput" rows="7" placeholder="Напишите ответ так, как сказали бы его клиенту...">${esc(prefill)}</textarea></div><div class="actions" style="justify-content:flex-end"><button class="btn secondary" onclick="go('training')">Выйти</button><button class="btn primary" onclick="submitManualAnswer('${id}')">${last?'Повторно отправить на проверку':'Отправить на проверку'}</button></div>`:afterButtons}${manualHistoryHtml(id,S.profile.login)}</div>`;
}

async function submitManualAnswer(contentId){
  const answer=$('manualAnswerInput')?.value.trim()||'';if(answer.length<3){toast('Напишите ответ');return}
  const btn=document.querySelector('[onclick="submitManualAnswer(\''+contentId+'\')"]');if(btn){btn.disabled=true;btn.textContent='Отправляем…'}
  const {error}=await S.sb.rpc('submit_manual_answer',{p_content_id:contentId,p_answer:answer});
  if(error){let m=error.message||String(error);if(m.includes('MANAGER_NOT_ASSIGNED'))m='К вам не закреплён руководитель группы. Обратитесь к администратору.';else if(m.includes('ALREADY_PENDING'))m='Этот ответ уже находится на проверке.';else if(m.includes('ALREADY_ACCEPTED'))m='Эта работа уже принята.';toast(m);if(btn){btn.disabled=false;btn.textContent='Отправить на проверку'}return}
  await syncAll();startManualContent(contentId);toast('Ответ сохранён и отправлен РГ — можно нажать «Далее»');
}

assignmentCompletedForUser=function(x,login,attemptRows=S.attempts){
  const start=new Date(x.created_at||0).getTime(),content=x.content_id?S.content.find(c=>c.id===x.content_id):null;
  if(content?.type==='manual')return (S.manualAnswers||[]).some(m=>m.login===login&&m.content_id===x.content_id&&m.status==='accepted'&&new Date(m.reviewed_at||m.updated_at||m.created_at).getTime()>=start);
  return attemptRows.some(a=>a.login===login&&new Date(a.created_at).getTime()>=start&&Number(a.score)>=Number(x.target||0)&&((x.content_id&&(attemptDetails(a)||[]).some(d=>d.content_id===x.content_id))||(!x.content_id&&(!x.section||a.section===x.section)&&(!x.topic||a.topic===x.topic))));
};

function pendingManualForMentor(){
  if(S.profile?.role!=='mentor')return[];const team=new Set((S.allowed||[]).filter(x=>x.active&&x.role==='employee'&&x.manager_login===S.profile.login).map(x=>x.login));
  return (S.manualAnswers||[]).filter(x=>x.status==='submitted'&&team.has(x.login)).slice().sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
}
function manualReviewPanelHtml(){
  const rows=pendingManualForMentor();
  return `<div class="section-title"><h2>✍️ Проверка работ</h2><span class="pill ${rows.length?'warn':'good'}">${rows.length} на проверке</span></div><div class="card manual-review-list">${rows.length?rows.map(r=>{const u=S.allowed.find(x=>x.login===r.login),c=S.content.find(x=>x.id===r.content_id);return `<div class="content-row"><div><b>${esc(u?.name||r.login)}</b><div class="meta">${esc(c?.title||'Ручной тренажёр')} · версия ${r.version} · ${new Date(r.created_at).toLocaleString('ru-RU')}</div></div><button class="btn primary" onclick="openManualReview('${r.id}')">Проверить</button></div>`}).join(''):'<div class="muted">Новых работ на проверку нет.</div>'}</div>`;
}
const renderManagerMentorV718=renderManagerMentor;
renderManagerMentor=function(){
  renderManagerMentorV718();const page=$('page-mentor'),toolbar=page?.querySelector('.toolbar');if(toolbar)toolbar.insertAdjacentHTML('afterend',manualReviewPanelHtml());else if(page)page.insertAdjacentHTML('afterbegin',manualReviewPanelHtml());
};

function openManualReview(answerId){
  const r=(S.manualAnswers||[]).find(x=>x.id===answerId);if(!r)return;const c=S.content.find(x=>x.id===r.content_id),u=S.allowed.find(x=>x.login===r.login);const history=manualHistory(r.content_id,r.login);
  showModal(`<div class="modal-head"><div><h2>${esc(c?.title||'Ручной тренажёр')}</h2><div class="meta">${esc(u?.name||r.login)} · ${esc(r.login)} · версия ${r.version}</div></div><button class="btn secondary" onclick="closeModal()">✕</button></div><div class="review-prompt"><b>Задание</b><div>${esc(c?.question||'')}</div>${c?.instruction?`<small>${esc(c.instruction)}</small>`:''}</div><div class="review-current-answer"><b>Ответ сотрудника</b><div>${esc(r.answer)}</div></div><div class="form-grid"><div class="field full"><label>Комментарий РГ</label><textarea id="manualReviewComment" rows="4" placeholder="Что хорошо / что нужно поправить"></textarea></div><div class="field full"><label>Как можно было сформулировать <span class="muted">(необязательно)</span></label><textarea id="manualReviewSuggestion" rows="4" placeholder="Ваш рекомендуемый вариант"></textarea></div></div><div class="actions review-actions"><button class="btn secondary" onclick="reviewManualAnswer('${r.id}','revision_requested')">↩ На доработку</button><button class="btn primary" onclick="reviewManualAnswer('${r.id}','accepted')">✓ Принято</button></div>${history.length>1?`<div class="section-title"><h3>Предыдущие версии</h3></div>${history.filter(x=>x.id!==r.id).map(x=>`<div class="manual-history-item"><div class="actions" style="justify-content:space-between"><b>Версия ${x.version}</b><span class="pill ${manualStatusClass(x.status)}">${manualStatusText(x.status)}</span></div><div class="manual-answer-text">${esc(x.answer)}</div>${x.mentor_comment?`<div class="review-note"><b>Ваш комментарий:</b> ${esc(x.mentor_comment)}</div>`:''}</div>`).join('')}`:''}`);
}
async function reviewManualAnswer(answerId,decision){
  const comment=$('manualReviewComment')?.value.trim()||'',suggestion=$('manualReviewSuggestion')?.value.trim()||'';if(decision==='revision_requested'&&!comment){toast('Для доработки добавьте комментарий');return}
  const {error}=await S.sb.rpc('review_manual_answer',{p_answer_id:answerId,p_decision:decision,p_comment:comment||null,p_suggestion:suggestion||null});
  if(error){toast(error.message||String(error));return}closeModal();await syncAll();toast(decision==='accepted'?'Работа принята':'Отправлено на доработку');
}

renderContentLibrary=function(){$('contentPane').innerHTML=`<div class="toolbar"><span class="muted small">${S.content.length} материалов</span><div><button class="btn secondary" onclick="exportExcel()">⬇ Экспорт Excel</button></div></div><div class="card" style="margin-top:10px">${S.content.map(x=>`<div class="content-row"><div><span class="pill ${x.status==='published'?'status-published':'status-draft'}">${x.status==='published'?'Опубликовано':'Черновик'}</span> <span class="pill">${manualTypeName(x.type)}</span><b>${esc(x.title||x.question)}</b><div class="meta">${secName(x.section)} · ${esc(x.topic)}</div></div><div class="actions"><button class="btn secondary" onclick="editContent('${x.id}')">Изменить</button><button class="btn danger" onclick="deleteContent('${x.id}')">Удалить</button></div></div>`).join('')||'<div class="muted">Материалов нет.</div>'}</div>`};
renderCreateContent=function(){$('contentPane').innerHTML=`<div class="grid4"><button class="topic" onclick="openCaseEditor('quiz')">✅ Обычный кейс<small>Автоматическая проверка</small></button><button class="topic" onclick="openManualEditor()">✍️ Ручной тренажёр<small>Свободный ответ → проверка РГ</small></button><button class="topic" onclick="openCaseEditor('hardcase')">🧠 Hard-кейс<small>Клиентская ситуация → решение</small></button><button class="topic" onclick="openDialogueEditor()">💬 Живой диалог<small>Несколько последовательных шагов</small></button></div>`};

function openManualEditor(x=null){
  S.editing=x?.id||null;showModal(`<div class="modal-head"><h2>${x?'Редактировать ручной тренажёр':'Новый ручной тренажёр'}</h2><button class="btn secondary" onclick="closeModal()">✕</button></div><div class="form-grid"><div class="field"><label>Раздел</label><input value="Soft Skills" disabled></div><div class="field"><label>Тема</label><input id="emTopic" placeholder="Например, Формулировки"></div><div class="field"><label>Статус</label><select id="emStatus"><option value="draft">Черновик</option><option value="published">Опубликовать</option></select></div><div class="field"><label>Кому</label><input id="emAudience" value="ALL"></div><div class="field full"><label>Название</label><input id="emTitle" placeholder="Например, С роботского на человеческий"></div><div class="field full"><label>Инструкция сотруднику</label><textarea id="emInstruction" rows="3" placeholder="Например: Переформулируйте фразу простым и понятным языком"></textarea></div><div class="field full"><label>Фраза / ситуация</label><textarea id="emQuestion" rows="6" placeholder="Текст, который сотрудник должен переработать"></textarea></div></div><div class="hint">Сотрудник напишет свободный ответ и отправит его своему РГ. РГ сможет принять работу или вернуть на доработку с комментарием.</div><div class="actions" style="justify-content:flex-end;margin-top:13px"><button class="btn primary" onclick="saveManualEditor()">Сохранить</button></div>`);$('emTopic').value=x?.topic||'';$('emStatus').value=x?.status||'draft';$('emAudience').value=(x?.audience||['ALL']).join(', ');$('emTitle').value=x?.title||'';$('emInstruction').value=x?.instruction||'';$('emQuestion').value=x?.question||'';
}
async function saveManualEditor(){
  const topic=$('emTopic').value.trim(),title=$('emTitle').value.trim(),question=$('emQuestion').value.trim(),instruction=$('emInstruction').value.trim();if(!topic||!title||!question){toast('Заполните тему, название и фразу / ситуацию');return}
  const row={type:'manual',section:'soft',topic,status:$('emStatus').value,difficulty:'Средний',title,payload:{instruction,question},audience:$('emAudience').value.split(',').map(x=>x.trim()).filter(Boolean),created_by:S.user.id,updated_at:new Date().toISOString()};if(S.editing)row.id=S.editing;
  const {error}=await S.sb.from('content').upsert(row);if(error){toast(error.message);return}if(row.status==='published')await notifyRecipients('Новый ручной тренажёр',row.title,row.audience);closeModal();await syncAll();contentTab='library';renderContent();toast('Ручной тренажёр сохранён');
}
editContent=function(id){const x=S.content.find(c=>c.id===id);if(!x)return;x.type==='manual'?openManualEditor(x):x.type==='dialogue'?openDialogueEditor(x):openCaseEditor(x.type,x)};

/* ===== end 7.1.9 ===== */

/* ===== SkillHub 7.2.3 — external game: Master Line ===== */
const MASTER_LINE_URL='https://masterlinii-game.website.yandexcloud.net/';
trainingCards=function(){
  return `<div class="sh750-training-grid">
    <article class="sh750-training-card sh750-soft"><div class="sh750-card-icon">${sh750TrainingIcon('soft')}</div><div class="sh750-card-copy"><span class="sh750-card-kicker">КОММУНИКАЦИЯ</span><h3>Soft Skills</h3><p>Диалоги, клиентский сервис и работа с формулировками.</p><button class="sh750-card-btn" onclick="openSoftHub()">Открыть →</button></div></article>
    <article class="sh750-training-card sh750-hard"><div class="sh750-card-icon">${sh750TrainingIcon('hard')}</div><div class="sh750-card-copy"><span class="sh750-card-kicker">ЗНАНИЯ</span><h3>Hard Skills</h3><p>Продукты, процессы, процедуры и реальные клиентские ситуации.</p><button class="sh750-card-btn" onclick="openSection('hard')">Открыть →</button></div></article>
    <article class="sh750-training-card sh750-typing"><div class="sh750-card-icon">${sh750TrainingIcon('typing')}</div><div class="sh750-card-copy"><span class="sh750-card-kicker">СКОРОСТЬ</span><h3>Печать</h3><p>Тренировка скорости и точности набора на рабочих текстах.</p><button class="sh750-card-btn" onclick="startTyping()">Начать →</button></div></article>
    <article class="sh750-training-card sh750-game"><div class="sh750-card-icon">${sh750TrainingIcon('game')}</div><div class="sh750-card-copy"><span class="sh750-card-kicker">ИГРОВОЙ ФОРМАТ</span><h3>Мастер линии</h3><p>Практика навыков в игровом формате.</p><a class="sh750-card-btn" href="${MASTER_LINE_URL}" target="_blank" rel="noopener noreferrer">Запустить →</a></div></article>
  </div>`;
};
/* ===== end 7.2.3 ===== */

/* ===== SkillHub 7.2.4 — manual sequence + smart no-repeat feed ===== */

/* ===== SkillHub 7.2.5 — multi-select assignments ===== */
function assignmentSelectedContentIds(){
  return [...document.querySelectorAll('.as-material-check:checked')].map(x=>x.value);
}
function assignmentSelectionChanged(){
  const ids=assignmentSelectedContentIds(),count=ids.length;
  const counter=$('asMaterialCount');if(counter)counter.textContent=count?`Выбрано: ${count}`:'Ничего не выбрано — назначение по теме';
  const topicWrap=$('asTopicMode');if(topicWrap){topicWrap.style.opacity=count?'.45':'1';topicWrap.querySelectorAll('select,input').forEach(el=>el.disabled=!!count)}
}
function filterAssignmentMaterials(){
  const q=String($('asMaterialSearch')?.value||'').trim().toLowerCase();
  document.querySelectorAll('.as-material-item').forEach(el=>{el.style.display=!q||String(el.dataset.search||'').includes(q)?'flex':'none'});
  document.querySelectorAll('.as-material-group').forEach(group=>{const visible=[...group.querySelectorAll('.as-material-item')].some(x=>x.style.display!=='none');group.style.display=visible?'block':'none'});
}
function clearAssignmentMaterials(){document.querySelectorAll('.as-material-check').forEach(x=>x.checked=false);assignmentSelectionChanged()}

openAssignmentEditor=function(prefill={}){
  const selected=new Set((prefill.content_ids||[prefill.content_id]).filter(Boolean));
  const published=S.content.filter(x=>x.status==='published').slice().sort((a,b)=>{
    const sr={soft:0,hard:1,needs:2};return (sr[a.section]??9)-(sr[b.section]??9)||String(a.topic||'').localeCompare(String(b.topic||''),'ru')||String(a.title||a.question||'').localeCompare(String(b.title||b.question||''),'ru')
  });
  const groups=['soft','hard','needs'].map(sec=>{
    const rows=published.filter(x=>x.section===sec);if(!rows.length)return'';
    return `<div class="as-material-group"><div class="as-material-group-title">${esc(secName(sec))} <span>${rows.length}</span></div>${rows.map(x=>{const name=x.title||x.question||'Материал';const search=`${name} ${x.topic||''} ${secName(sec)}`.toLowerCase();return `<label class="as-material-item" data-search="${esc(search)}"><input class="as-material-check" type="checkbox" value="${x.id}" ${selected.has(x.id)?'checked':''} onchange="assignmentSelectionChanged()"><span><b>${esc(name)}</b><small>${esc(x.topic||'Без темы')}${x.type==='manual'?' · ручной':''}</small></span></label>`}).join('')}</div>`
  }).join('');
  const scope=isTechAdmin()?'ALL = все сотрудники SkillHub':isRS()?'ALL = все сотрудники моего сектора':'ALL = вся моя команда';
  showModal(`<div class="modal-head"><h2>Новое назначение</h2><button class="btn secondary" onclick="closeModal()">✕</button></div>
  <div class="form-grid">
    <div class="field full"><label>Название назначения</label><input id="asTitle" placeholder="Можно оставить пустым — возьмём название материала"><div class="meta">Если выбрано несколько материалов, для каждого будет создано отдельное назначение.</div></div>
    <div class="field full"><label>Материалы <span class="muted">· можно выбрать один или несколько</span></label><input id="asMaterialSearch" placeholder="Поиск по названию или теме" oninput="filterAssignmentMaterials()"><div class="as-material-picker">${groups||'<div class="muted">Опубликованных материалов нет.</div>'}</div><div class="as-material-footer"><span id="asMaterialCount" class="meta"></span><button type="button" class="btn secondary" onclick="clearAssignmentMaterials()">Снять выбор</button></div></div>
    <div id="asTopicMode" class="field full"><div class="explain" style="margin-bottom:9px">Если конкретные материалы не выбраны, можно назначить всю тему.</div><div class="form-grid"><div class="field"><label>Раздел</label><select id="asSec"><option value="soft">Soft</option><option value="hard">Hard</option><option value="needs">Потребность</option></select></div><div class="field"><label>Тема</label><input id="asTopic" placeholder="Например, Кредиты или Тарифы"></div></div></div>
    <div class="field"><label>Дедлайн</label><input id="asDue" type="date"></div><div class="field"><label>Минимум %</label><input id="asTarget" type="number" value="${ADAPTIVE.target}"></div>
    <div class="field full"><label>Кому</label><input id="asUsers" value="ALL" placeholder="ALL или логины через запятую"><div class="meta">${scope}</div></div>
  </div><div class="actions" style="justify-content:flex-end;margin-top:13px"><button class="btn primary" onclick="saveAssignment()">Назначить и уведомить</button></div>`);
  $('asTitle').value=prefill.title||'';$('asSec').value=prefill.section||'soft';$('asTopic').value=prefill.topic||'';$('asDue').value=prefill.due||'';$('asTarget').value=String(prefill.target??ADAPTIVE.target);$('asUsers').value=(prefill.recipients||['ALL']).join(', ');assignmentSelectionChanged();
};

saveAssignment=async function(){
  let rec=$('asUsers').value.split(',').map(normalizeLogin).filter(Boolean);if(!rec.length)rec=['ALL'];
  if(!isTechAdmin()&&rec.includes('ALL'))rec=assignmentScopeEmployees().map(x=>x.login);
  if(!isTechAdmin()){
    const ok=new Set(assignmentScopeEmployees().map(x=>x.login));if(rec.some(x=>!ok.has(x))){toast(isRS()?'Можно назначать только сотрудникам своего сектора':'Можно назначать только своей команде');return}
  }
  const ids=assignmentSelectedContentIds(),baseTitle=$('asTitle').value.trim(),due=$('asDue').value||null,target=Number($('asTarget').value||90),common={due,target,recipients:rec,status:'active',created_by:S.user.id};
  let rows=[];
  if(ids.length){
    const byId=new Map(S.content.map(x=>[x.id,x]));
    rows=ids.map(id=>byId.get(id)).filter(Boolean).map(x=>({
      ...common,
      title:ids.length===1?(baseTitle||x.title||x.question||'Материал'):(baseTitle?`${baseTitle} · ${x.title||x.question||x.topic}`:(x.title||x.question||x.topic||'Материал')),
      content_id:x.id,section:x.section,topic:x.topic||''
    }));
  }else{
    const topic=$('asTopic').value.trim(),section=$('asSec').value;if(!baseTitle){toast('Введите название назначения');return}if(!topic){toast('Выберите материалы или укажите тему');return}
    rows=[{...common,title:baseTitle,content_id:null,section,topic}];
  }
  if(!rows.length){toast('Не удалось сформировать назначение');return}
  const {error}=await S.sb.from('assignments').insert(rows);if(error){toast(error.message);return}
  const note=rows.length===1?`Новое задание: ${rows[0].title}${due?' · до '+due:''}`:`Назначено материалов: ${rows.length}${baseTitle?' · '+baseTitle:''}${due?' · до '+due:''}`;
  await notifyRecipients('Новое задание',note,rec,'assignment');closeModal();await syncAll();renderAssignments();toast(rows.length===1?'Задание назначено':`Назначено материалов: ${rows.length}`)
};

/* ===== SkillHub 7.4.0 — APPROVED REFERENCE UI ===== */
function sh74SecName(s){return s==='soft'?'Soft Skills':s==='hard'?'Hard Skills':s==='needs'?'Потребность':s==='typing'?'Скорость печати':'Скорость печати'}
function sh74ProfileByLogin(login){if(login===S.profile?.login)return S.profile;return (S.profiles||[]).find(x=>x.login===login)||null}
function sh74AvatarHtml(login,name,cls='sh74-person-avatar'){const p=sh74ProfileByLogin(login),url=p?.avatar_url;return `<span class="${cls}">${url?`<img src="${esc(url)}" alt="">`:esc(initials(name||login))}</span>`}
function renderTopAvatar(){const el=$('avatar');if(!el||!S.profile)return;el.innerHTML=S.profile.avatar_url?`<img src="${esc(S.profile.avatar_url)}" alt="Фото профиля">`:esc(initials(S.profile.name||S.profile.login))}
function updateRoleNavLabels(){const el=document.querySelector('.nav-btn[data-page="mentor"] .nav-text');if(!el||!S.profile)return;el.textContent=S.profile.role==='mentor'?'Моя группа':S.profile.role==='rs'?'Сектор':'Управление'}
function enterApp(){
  $('setupView').classList.add('hidden');$('loginView').classList.add('hidden');$('appView').classList.remove('hidden');
  document.body.dataset.role=S.profile.role;$('profileName').textContent=S.profile.name||S.profile.login;$('roleLabel').textContent=roleName(S.profile.role);renderTopAvatar();
  document.querySelectorAll('.mentor-only').forEach(x=>x.classList.toggle('hidden',!isManager()));document.querySelectorAll('.tech-only').forEach(x=>x.classList.toggle('hidden',!isTechAdmin()));
  updateRoleNavLabels();go(isManager()?'mentor':'home');subscribeRealtime();
}
function renderUnread(){const n=S.notifications.filter(x=>!x.read).length;for(const id of ['bellBadge','topBellBadge']){const b=$(id);if(b){b.textContent=n;b.classList.toggle('hidden',!n)}}if(navigator.setAppBadge){if(n)navigator.setAppBadge(n).catch(()=>{});else navigator.clearAppBadge?.().catch(()=>{})}}

function sh741OpenProfile(){document.querySelectorAll('.nav-btn').forEach(x=>x.classList.toggle('active',x.dataset.page==='profile'));showProfileEditor()}
function showProfileEditor(){
  $('profileMenu').classList.add('hidden');const url=S.profile?.avatar_url||'';
  showModal(`<div class="modal-head"><div><h2>Мой профиль</h2><div class="meta">${esc(roleName(S.profile?.role))}</div></div><button class="btn secondary" onclick="closeModal()">✕</button></div>
  <div class="card"><div class="sh74-profile-card"><div class="sh74-profile-photo">${url?`<img src="${esc(url)}" alt="Фото профиля">`:esc(initials(S.profile?.name||S.profile?.login))}</div><div><h3 style="margin:0">${esc(S.profile?.name||S.profile?.login)}</h3><div class="meta">${esc(S.profile?.login||'')}</div><div class="sh74-profile-actions"><label class="btn primary">${url?'Заменить фото':'Загрузить фото'}<input class="hidden" type="file" accept="image/*" onchange="uploadProfilePhoto(event)"></label>${url?'<button class="btn secondary" onclick="removeProfilePhoto()">Удалить фото</button>':''}</div></div></div><div class="sh74-profile-meta"><div><small>Роль</small><b>${esc(roleName(S.profile?.role))}</b></div><div><small>${S.profile?.role==='employee'?'Команда':'Сектор / команда'}</small><b>${esc(S.profile?.group_name||S.profile?.sector_name||'—')}</b></div></div></div>`)
}
async function uploadProfilePhoto(ev){const file=ev?.target?.files?.[0];if(!file)return;if(!String(file.type||'').startsWith('image/')){toast('Выберите изображение');return}if(file.size>5*1024*1024){toast('Фото должно быть не больше 5 МБ');return}try{const path=`${S.user.id}/avatar`;const {error:up}=await S.sb.storage.from('avatars').upload(path,file,{upsert:true,contentType:file.type||'image/jpeg',cacheControl:'3600'});if(up)throw up;const {data}=S.sb.storage.from('avatars').getPublicUrl(path),url=(data?.publicUrl||'')+`?v=${Date.now()}`;const {error}=await S.sb.rpc('set_my_avatar_url',{p_url:url});if(error)throw error;S.profile.avatar_url=url;const p=(S.profiles||[]).find(x=>x.login===S.profile.login);if(p)p.avatar_url=url;localStorage.setItem('sh7_profile',JSON.stringify(S.profile));renderTopAvatar();showProfileEditor();renderCurrent();toast('Фото профиля обновлено')}catch(e){console.error(e);toast('Не удалось загрузить фото: '+(e.message||e))}}
async function removeProfilePhoto(){try{await S.sb.storage.from('avatars').remove([`${S.user.id}/avatar`]);const {error}=await S.sb.rpc('set_my_avatar_url',{p_url:null});if(error)throw error;S.profile.avatar_url=null;const p=(S.profiles||[]).find(x=>x.login===S.profile.login);if(p)p.avatar_url=null;localStorage.setItem('sh7_profile',JSON.stringify(S.profile));renderTopAvatar();showProfileEditor();renderCurrent();toast('Фото удалено')}catch(e){toast('Не удалось удалить фото: '+(e.message||e))}}

function sh74AssignedTo(x,login=S.profile?.login){const r=x.recipients||[];return r.includes('ALL')||r.includes(login)}
function sh74CurrentAssignment(){return S.assignments.filter(x=>x.status==='active'&&sh74AssignedTo(x)&&assignmentStatusForUser(x,S.profile.login,S.attempts)!=='Выполнено').sort((a,b)=>String(a.due||'9999').localeCompare(String(b.due||'9999')))[0]||null}
function sh74DateKey(v){const d=new Date(v);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function sh74ActiveDays(login=S.profile?.login){const set=new Set(S.attempts.filter(x=>x.login===login).map(x=>sh74DateKey(x.created_at)));(S.manualAnswers||[]).filter(x=>x.login===login).forEach(x=>set.add(sh74DateKey(x.created_at)));return set}
function sh74Streak(login=S.profile?.login){const active=sh74ActiveDays(login);if(!active.size)return 0;let d=new Date(),n=0;const today=sh74DateKey(d);if(!active.has(today)){d.setDate(d.getDate()-1)}for(;;){const k=sh74DateKey(d);if(!active.has(k))break;n++;d.setDate(d.getDate()-1)}return n}
function sh74WeekHtml(){const active=sh74ActiveDays(),fmt=new Intl.DateTimeFormat('ru-RU',{weekday:'short'}),days=[];for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const k=sh74DateKey(d);days.push(`<div class="sh74-day ${active.has(k)?'active':''}"><i>${active.has(k)?'✓':'·'}</i><span>${fmt.format(d).replace('.','')}</span></div>`)}return days.join('')}
function sh74SectionProgress(sec){
  if(sec==='typing'){const done=Math.min(50,S.attempts.filter(x=>x.login===S.profile.login&&x.type==='typing').length);return{done,total:50,pct:Math.round(done/50*100)}}
  const arr=S.content.filter(x=>x.status==='published'&&x.section===sec),seen=seenContentMap(S.profile.login);let done=arr.filter(x=>seen.has(x.id)).length;if(sec==='soft')done=arr.filter(x=>seen.has(x.id)||(S.manualAnswers||[]).some(m=>m.login===S.profile.login&&m.content_id===x.id)).length;const total=arr.length;return{done,total,pct:total?Math.round(done/total*100):0}
}
function sh74Name(){const n=String(S.profile?.name||S.profile?.login||'').trim();return n||'коллега'}
function sh741SkillIcon(sec){
  const icons={
    soft:`<span class="sh741-skill-icon soft"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.5h14a2.5 2.5 0 0 1 2.5 2.5v6A2.5 2.5 0 0 1 19 16.5H10l-5.5 3v-3.2A2.5 2.5 0 0 1 2.5 14V8A2.5 2.5 0 0 1 5 5.5Z"/><circle cx="8" cy="11" r="1"/><circle cx="12" cy="11" r="1"/><circle cx="16" cy="11" r="1"/></svg></span>`,
    hard:`<span class="sh741-skill-icon hard"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="13" width="4" height="7" rx="1"/><rect x="10" y="9" width="4" height="11" rx="1"/><rect x="16" y="4" width="4" height="16" rx="1"/></svg></span>`,
    needs:`<span class="sh741-skill-icon needs"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="13" r="7"/><circle cx="11" cy="13" r="3"/><path d="M14.5 9.5 21 3M17 3h4v4"/></svg></span>`,
    typing:`<span class="sh741-skill-icon typing"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6 10h1M10 10h1M14 10h1M18 10h.5M6 13.5h1M10 13.5h1M14 13.5h1M18 13.5h.5M7 16h10"/></svg></span>`
  };return icons[sec]||''
}

function sh750TrainingIcon(kind){
  const icons={
    soft:`<svg class="sh750-icon-svg" viewBox="0 0 150 150" aria-hidden="true"><defs><linearGradient id="s750softA" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff0a5"/><stop offset="1" stop-color="#ffd52e"/></linearGradient><linearGradient id="s750softB" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#323946"/><stop offset="1" stop-color="#11151c"/></linearGradient><filter id="s750softShadow" x="-30%" y="-30%" width="170%" height="180%"><feDropShadow dx="0" dy="10" stdDeviation="8" flood-color="#000" flood-opacity=".26"/></filter></defs><g filter="url(#s750softShadow)"><path d="M23 35c0-10 8-18 18-18h58c10 0 18 8 18 18v35c0 10-8 18-18 18H70L44 105l5-17h-8c-10 0-18-8-18-18V35Z" fill="url(#s750softA)"/><path d="M65 77c0-9 7-16 16-16h43c9 0 16 7 16 16v27c0 9-7 16-16 16h-18l-20 14 4-14h-9c-9 0-16-7-16-16V77Z" fill="url(#s750softB)"/><circle cx="50" cy="53" r="5" fill="#1a1d22"/><circle cx="70" cy="53" r="5" fill="#1a1d22"/><circle cx="90" cy="53" r="5" fill="#1a1d22"/><path d="m118 79 3.5 7 7.5 1-5.5 5.2 1.4 7.4-6.9-3.6-6.8 3.6 1.3-7.4-5.4-5.2 7.5-1z" fill="#ffdd2d"/></g></svg>`,
    hard:`<svg class="sh750-icon-svg" viewBox="0 0 150 150" aria-hidden="true"><defs><linearGradient id="s750hardBook" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffe77b"/><stop offset="1" stop-color="#ffc61f"/></linearGradient><linearGradient id="s750hardDark" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#343b47"/><stop offset="1" stop-color="#10141a"/></linearGradient><linearGradient id="s750hardPurple" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#8d6cff"/><stop offset="1" stop-color="#5a36df"/></linearGradient><filter id="s750hardShadow" x="-35%" y="-35%" width="180%" height="190%"><feDropShadow dx="0" dy="10" stdDeviation="8" flood-color="#000" flood-opacity=".28"/></filter></defs><g filter="url(#s750hardShadow)"><path d="M24 37c0-9 7-16 16-16h42c13 0 23 5 29 13v74c-7-6-16-9-28-9H40c-9 0-16-7-16-16V37Z" fill="url(#s750hardBook)"/><path d="M126 37c0-9-7-16-16-16H82c13 0 23 5 29 13v74c4-5 10-9 15-11V37Z" fill="url(#s750hardDark)"/><path d="M47 45h43M47 59h43M47 73h31" stroke="#292c32" stroke-width="6" stroke-linecap="round" opacity=".72"/><g transform="translate(91 77)"><circle cx="24" cy="24" r="22" fill="url(#s750hardPurple)"/><circle cx="24" cy="24" r="8" fill="#fff0a8"/><path d="M24 0v8M24 40v8M0 24h8M40 24h8M7 7l6 6M35 35l6 6M41 7l-6 6M13 35l-6 6" stroke="#fff0a8" stroke-width="5" stroke-linecap="round"/></g></g></svg>`,
    typing:`<svg class="sh750-icon-svg" viewBox="0 0 150 150" aria-hidden="true"><defs><linearGradient id="s750typeBody" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#333b47"/><stop offset="1" stop-color="#11151c"/></linearGradient><linearGradient id="s750typeKey" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff0a0"/><stop offset="1" stop-color="#ffd22e"/></linearGradient><linearGradient id="s750typePurple" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#9a7cff"/><stop offset="1" stop-color="#633be5"/></linearGradient><filter id="s750typeShadow" x="-30%" y="-40%" width="170%" height="200%"><feDropShadow dx="0" dy="11" stdDeviation="8" flood-color="#000" flood-opacity=".3"/></filter></defs><g filter="url(#s750typeShadow)" transform="rotate(-5 75 75)"><rect x="15" y="42" width="120" height="72" rx="18" fill="url(#s750typeBody)"/><g fill="#5f6874"><rect x="27" y="55" width="16" height="13" rx="4"/><rect x="48" y="55" width="16" height="13" rx="4"/><rect x="69" y="55" width="16" height="13" rx="4"/><rect x="90" y="55" width="16" height="13" rx="4"/><rect x="111" y="55" width="12" height="13" rx="4"/><rect x="27" y="73" width="16" height="13" rx="4"/><rect x="48" y="73" width="16" height="13" rx="4"/><rect x="90" y="73" width="16" height="13" rx="4"/><rect x="111" y="73" width="12" height="13" rx="4"/></g><rect x="69" y="73" width="16" height="13" rx="4" fill="url(#s750typeKey)"/><rect x="41" y="92" width="70" height="11" rx="5.5" fill="url(#s750typePurple)"/><path d="m119 29 8 15h-8l5 12-20-20h9l-4-7z" fill="url(#s750typeKey)"/></g></svg>`,
    game:`<svg class="sh750-icon-svg" viewBox="0 0 150 150" aria-hidden="true"><defs><linearGradient id="s750gameBody" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#353d49"/><stop offset=".55" stop-color="#161b23"/><stop offset="1" stop-color="#0a0d12"/></linearGradient><linearGradient id="s750gameGold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff080"/><stop offset="1" stop-color="#ffc61e"/></linearGradient><linearGradient id="s750gamePurple" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#9677ff"/><stop offset="1" stop-color="#5c35dc"/></linearGradient><filter id="s750gameShadow" x="-40%" y="-45%" width="190%" height="220%"><feDropShadow dx="0" dy="12" stdDeviation="9" flood-color="#000" flood-opacity=".35"/></filter></defs><g filter="url(#s750gameShadow)" transform="rotate(-6 75 78)"><path d="M26 66c7-17 21-26 39-25 9 1 16 5 22 5 7 0 14-4 23-5 19-1 33 8 40 26 8 19 9 47 1 57-6 8-16 7-24-2l-17-20c-5-6-12-9-23-9s-18 3-23 9l-17 20c-8 9-18 10-24 2-8-10-6-39 3-58Z" fill="url(#s750gameBody)" stroke="#4d5663" stroke-width="2"/><rect x="43" y="68" width="35" height="12" rx="6" fill="url(#s750gameGold)"/><rect x="55" y="56" width="12" height="35" rx="6" fill="url(#s750gameGold)"/><circle cx="108" cy="67" r="7" fill="url(#s750gamePurple)"/><circle cx="124" cy="77" r="7" fill="url(#s750gameGold)"/><circle cx="107" cy="86" r="7" fill="url(#s750gameGold)"/><circle cx="91" cy="76" r="7" fill="url(#s750gamePurple)"/><path d="m113 24 8 15h-8l5 12-20-20h9l-4-7z" fill="url(#s750gameGold)"/><circle cx="70" cy="104" r="7" fill="#11161d" stroke="#616b78" stroke-width="2"/><circle cx="94" cy="104" r="7" fill="#11161d" stroke="#616b78" stroke-width="2"/></g></svg>`
  };
  return icons[kind]||'';
}

function renderHome(){
  if(S.profile?.role!=='employee'){$('page-home').innerHTML='<div class="sh74-manager"><div class="sh74-light-card"><b>Для руководителя основная панель находится в разделе управления.</b><div class="meta">Откройте «'+(S.profile.role==='mentor'?'Моя группа':S.profile.role==='rs'?'Сектор':'Управление')+'».</div></div></div>';return}
  $('pageTitle').textContent='Главная';$('pageSub').textContent='Ваш прогресс и актуальные тренировки';
  const a=sh74CurrentAssignment(),streak=sh74Streak(),dirs=[['soft',sh741SkillIcon('soft'),'Soft Skills','Коммуникация и клиентский сервис',"openSoftHub()"],['hard',sh741SkillIcon('hard'),'Hard Skills','Продукты, процессы и регламенты',"openSection('hard')"],['needs',sh741SkillIcon('needs'),'Потребность','Выявление и развитие потребности',"openSection('needs')"],['typing',sh741SkillIcon('typing'),'Скорость печати','Точность и скорость набора',"startTyping()"]];
  let currentTitle='Выберите тренировку',currentMeta='Активных назначений сейчас нет — можно потренироваться самостоятельно.',action="go('training')",actionText='К тренировкам →',heroPct=0;
  if(a){currentTitle=a.title||'Текущее задание';currentMeta=`${a.due?'До '+a.due+' · ':''}${a.section?sh74SecName(a.section):''}${a.topic?' · '+a.topic:''}`;action=`startAssignment('${a.id}')`;actionText='Продолжить →';heroPct=assignmentCompletedForUser(a,S.profile.login,S.attempts)?100:20}
  $('page-home').innerHTML=`<div class="sh74-home"><div class="sh74-hero"><div class="sh74-hero-kicker">SkillHub</div><h2>Привет, ${esc(sh74Name())}! 👋</h2><div class="sh74-hero-sub">Продолжаем развиваться вместе</div><div class="sh74-current"><div class="sh74-current-label">СЕГОДНЯ</div><div class="sh74-current-title">${esc(currentTitle)}</div><div class="sh74-current-meta">${esc(currentMeta)}</div>${a?`<div class="sh74-hero-progress"><span style="width:${heroPct}%"></span></div>`:''}<button class="btn" onclick="${action}">${actionText}</button></div></div>
  <div class="sh74-streak"><div class="sh74-streak-head"><span class="sh74-streak-fire">🔥</span><div><div class="sh74-streak-label">Серия активности</div><strong>${streak} ${streak===1?'день':'дней'} подряд</strong></div></div><div class="sh74-week">${sh74WeekHtml()}</div><div class="sh74-streak-note">Любая завершённая тренировка засчитывается как активный день.</div></div>
  <div class="sh74-section-head"><h2>Мои направления</h2><button class="sh74-link" onclick="go('training')">Смотреть все</button></div><div class="sh74-directions">${dirs.map(([sec,icon,title,sub,onclick])=>{const p=sh74SectionProgress(sec);return `<button class="sh74-direction" onclick="${onclick}"><span class="sh74-direction-icon">${icon}</span><b>${title}</b><small>${sub}</small><div class="progress"><span style="width:${p.pct}%"></span></div><div class="sh74-direction-meta"><span>${p.done}/${p.total||0}</span><span>${p.pct}%</span></div></button>`}).join('')}</div></div>`
}

let sh74TrainingFilter='all';
function sh74SetTrainingFilter(v){sh74TrainingFilter=v;renderTraining()}
function sh74TrainingProgress(sec){if(S.profile?.role!=='employee'){const total=sec==='typing'?50:S.content.filter(x=>x.status==='published'&&x.section===sec).length;return{done:0,total,pct:0}}const p=sh74SectionProgress(sec);return p}
function renderTraining(){
  $('pageTitle').textContent='Тренировки';$('pageSub').textContent='Выберите формат и продолжайте в своём темпе';
  const soft=sh74TrainingProgress('soft'),hard=sh74TrainingProgress('hard'),typing=sh74TrainingProgress('typing');
  const progressHtml=p=>p.total?`<div class="sh750-progress"><div class="progress"><span style="width:${Math.round((p.done||0)/p.total*100)}%"></span></div><small>${p.done||0}/${p.total}</small></div>`:'';
  $('page-training').innerHTML=`<div class="sh750-training-head"><div><span>SKILLHUB</span><h2>Что потренируем сегодня?</h2><p>Только четыре основных направления — без лишних карточек.</p></div></div>
  <div class="sh750-training-grid">
    <article class="sh750-training-card sh750-soft"><div class="sh750-card-icon">${sh750TrainingIcon('soft')}</div><div class="sh750-card-copy"><span class="sh750-card-kicker">КОММУНИКАЦИЯ</span><h3>Soft Skills</h3><p>Диалоги, клиентский сервис и работа с формулировками.</p>${progressHtml(soft)}<button class="sh750-card-btn" onclick="openSoftHub()">Открыть →</button></div></article>
    <article class="sh750-training-card sh750-hard"><div class="sh750-card-icon">${sh750TrainingIcon('hard')}</div><div class="sh750-card-copy"><span class="sh750-card-kicker">ЗНАНИЯ</span><h3>Hard Skills</h3><p>Продукты, процессы, процедуры и реальные клиентские ситуации.</p>${progressHtml(hard)}<button class="sh750-card-btn" onclick="openSection('hard')">Открыть →</button></div></article>
    <article class="sh750-training-card sh750-typing"><div class="sh750-card-icon">${sh750TrainingIcon('typing')}</div><div class="sh750-card-copy"><span class="sh750-card-kicker">СКОРОСТЬ</span><h3>Печать</h3><p>Тренировка скорости и точности набора на рабочих текстах.</p>${progressHtml(typing)}<button class="sh750-card-btn" onclick="startTyping()">Начать →</button></div></article>
    <article class="sh750-training-card sh750-game"><div class="sh750-card-icon">${sh750TrainingIcon('game')}</div><div class="sh750-card-copy"><span class="sh750-card-kicker">ИГРОВОЙ ФОРМАТ</span><h3>Мастер линии</h3><p>Практика навыков в игровом формате.</p><a class="sh750-card-btn" target="_blank" rel="noopener noreferrer" href="${MASTER_LINE_URL}">Запустить →</a></div></article>
  </div>`;
}

function sh74TeamAssignmentProgress(users){let total=0,done=0;for(const a of S.assignments.filter(x=>x.status==='active'))for(const u of users){if(!sh74AssignedTo(a,u.login))continue;total++;if(assignmentCompletedForUser(a,u.login,S.attempts))done++}return{total,done,pct:total?Math.round(done/total*100):0}}
function sh74Avg(vals){const a=vals.filter(v=>v!==null&&v!==undefined&&Number.isFinite(Number(v))).map(Number);return a.length?Math.round(a.reduce((x,y)=>x+y,0)/a.length):0}
function sh74PendingRowsForMentor(){return typeof pendingManualForMentor==='function'?pendingManualForMentor():[]}
function sh74TeamRowsHtml(u){return `<div class="sh74-manager-list">${u.map(x=>{const avg=sh74Avg([x.soft,x.hard,x.needs]),trend=(x.gaps?.length||0)?'down':'up';return `<div class="sh74-team-row">${sh74AvatarHtml(x.login,x.name||x.login)}<div><b>${esc(x.name||x.login)}</b><small>${esc(x.login)} · ${x.attempts} попыток</small></div><span class="sh74-score">${avg||'—'}${avg?'%':''}</span><button class="btn secondary" onclick="openUserAttempts('${jsq(x.login)}')">Карточка</button></div>`}).join('')||'<div class="muted">Сотрудников пока нет.</div>'}</div>`}
function sh74DirectionsHtml(u){const vals=sec=>sh74Avg(u.map(x=>x[sec]));return `<div class="sh74-bars"><div class="sh74-bar-row"><span>Soft Skills</span><div class="progress"><span class="soft" style="width:${vals('soft')}%"></span></div><b>${vals('soft')||'—'}${vals('soft')?'%':''}</b></div><div class="sh74-bar-row"><span>Hard Skills</span><div class="progress"><span class="hard" style="width:${vals('hard')}%"></span></div><b>${vals('hard')||'—'}${vals('hard')?'%':''}</b></div><div class="sh74-bar-row"><span>Потребность</span><div class="progress"><span class="needs" style="width:${vals('needs')}%"></span></div><b>${vals('needs')||'—'}${vals('needs')?'%':''}</b></div></div>`}

function renderManagerMentor(){
  const u=teamRows(S.profile.login),pending=sh74PendingRowsForMentor(),prog=sh74TeamAssignmentProgress(u),overdue=u.reduce((n,x)=>n+x.overdue,0),gaps=u.reduce((n,x)=>n+x.gaps.length,0),completed=u.reduce((n,x)=>n+x.completed,0);
  $('pageTitle').textContent='Моя группа';$('pageSub').textContent=`${S.profile.group_name||S.profile.name} · команда и развитие`;
  const attention=[];for(const r of pending.slice(0,4)){const usr=S.allowed.find(x=>x.login===r.login),c=S.content.find(x=>x.id===r.content_id);attention.push(`<div class="sh74-attention-row">${sh74AvatarHtml(r.login,usr?.name||r.login)}<div><b>${esc(usr?.name||r.login)}</b><div class="meta">${esc(c?.title||'Ручной тренажёр')}</div></div><button class="sh74-attention-status" onclick="openManualReview('${r.id}')">На проверке</button></div>`)}for(const x of u.filter(x=>x.overdue).slice(0,3)){attention.push(`<div class="sh74-attention-row">${sh74AvatarHtml(x.login,x.name||x.login)}<div><b>${esc(x.name||x.login)}</b><div class="meta">Просрочено назначений: ${x.overdue}</div></div><button class="sh74-attention-status bad" onclick="openUserAttempts('${jsq(x.login)}')">Просрочено</button></div>`)}
  $('page-mentor').innerHTML=`<div class="sh74-manager"><div class="sh74-manager-top"><div><h2>Главная</h2><p>Краткая информация по вашей команде</p></div><div class="actions"><button class="btn secondary" onclick="openMentorExport('','${jsq(S.profile.login)}','')">Отчёт Excel</button><button class="btn primary" onclick="openAssignmentEditor()">Назначить</button></div></div><div class="sh74-kpis"><div class="sh74-kpi"><small>Сотрудников</small><strong>${u.length}</strong></div><div class="sh74-kpi warn"><small>На проверке</small><strong>${pending.length}</strong></div><div class="sh74-kpi bad"><small>Просрочено</small><strong>${overdue}</strong></div><div class="sh74-kpi good"><small>Выполнено</small><strong>${completed}</strong></div></div><div class="sh74-manager-main"><div class="sh74-light-card"><div class="sh74-card-head"><h3>Требуют внимания</h3><small>${attention.length?'Актуальные задачи':'Всё спокойно'}</small></div>${attention.join('')||'<div class="muted">Новых работ и просрочек сейчас нет 🎉</div>'}</div><div class="card sh74-ring-card"><h3>Прогресс команды</h3><div class="sh74-ring" style="--p:${prog.pct}"><strong>${prog.pct}%</strong></div><div class="sh74-ring-label">Выполнение назначений · ${prog.done}/${prog.total}</div></div></div><div class="sh74-section-head"><h2>Моя группа</h2><button class="sh74-link" onclick="go('employees')">Смотреть всех</button></div>${sh74TeamRowsHtml(u)}<div class="sh74-section-head"><h2>Прогресс по направлениям</h2></div><div class="card">${sh74DirectionsHtml(u)}</div></div>`
}

function renderSectorAdmin(){
  const sector=S.profile.sector_name||'Основной сектор',mans=managersInSector(sector),gs=mans.map(m=>managerMetrics(m.login)),all=scopeEmployees(),prog=sh74TeamAssignmentProgress(all),avgScore=sh74Avg(S.attempts.filter(a=>all.some(u=>u.login===a.login)).map(a=>Number(a.score))),attention=gs.filter(g=>g.overdue||g.gaps).length;
  $('pageTitle').textContent='Сектор';$('pageSub').textContent=`${sector} · общая аналитика и руководители`;
  $('page-mentor').innerHTML=`<div class="sh74-manager"><div class="sh74-manager-top"><div><h2>Общий обзор сектора</h2><p>${esc(sector)}</p></div><div class="actions"><button class="btn secondary" onclick="openMentorExport('${jsq(sector)}','','')">Отчёт Excel</button><button class="btn primary" onclick="openAssignmentEditor()">Назначить</button></div></div><div class="sh74-kpis"><div class="sh74-kpi"><small>Руководителей</small><strong>${mans.length}</strong></div><div class="sh74-kpi"><small>Сотрудников</small><strong>${all.length}</strong></div><div class="sh74-kpi good"><small>Средний результат</small><strong>${avgScore||'—'}${avgScore?'%':''}</strong></div><div class="sh74-kpi ${attention?'warn':'good'}"><small>Требуют внимания</small><strong>${attention}</strong></div></div><div class="sh74-manager-main"><div class="sh74-light-card"><div class="sh74-card-head"><h3>Руководители групп</h3><small>${mans.length} команд</small></div>${gs.map(g=>`<div class="sh74-attention-row">${sh74AvatarHtml(g.manager?.login,g.manager?.name||g.manager?.login)}<div><b>${esc(g.manager?.name||g.manager?.login||'РГ')}</b><div class="meta">${g.count} сотрудников · ${g.attempts} попыток</div></div><button class="sh74-attention-status ${g.overdue?'bad':''}" onclick="openManagerDashboard('${jsq(g.manager?.login||'')}')">${g.overdue?g.overdue+' проср.':'Открыть'}</button></div>`).join('')||'<div class="muted">Руководителей пока нет.</div>'}</div><div class="card sh74-ring-card"><h3>Прогресс сектора</h3><div class="sh74-ring" style="--p:${prog.pct}"><strong>${prog.pct}%</strong></div><div class="sh74-ring-label">Выполнение назначений · ${prog.done}/${prog.total}</div></div></div><div class="sh74-section-head"><h2>Прогресс по направлениям</h2></div><div class="card">${sh74DirectionsHtml(all)}</div><div class="sh74-section-head"><h2>Сотрудники сектора</h2><button class="sh74-link" onclick="go('employees')">Открыть список</button></div>${sh74TeamRowsHtml(all.slice(0,8))}</div>`
}

function renderTechAdminMentor(){
  const employees=scopeEmployees(),sectors=[...new Set(employees.map(sectorOf))].filter(x=>x&&x!=='ALL'),rs=S.allowed.filter(x=>x.active&&x.role==='rs'),mans=S.allowed.filter(x=>x.active&&x.role==='mentor'),prog=sh74TeamAssignmentProgress(employees),unclaimed=S.allowed.filter(x=>x.active&&x.role==='employee'&&!x.claimed_user_id).length;
  $('pageTitle').textContent='Управление';$('pageSub').textContent='SkillHub · все сектора и доступы';
  $('page-mentor').innerHTML=`<div class="sh74-manager"><div class="sh74-manager-top"><div><h2>SkillHub Control Center</h2><p>Общий обзор платформы</p></div><div class="actions"><button class="btn secondary" onclick="openMentorExport()">Общий Excel</button><button class="btn primary" onclick="go('admin')">Доступы</button></div></div><div class="sh74-kpis"><div class="sh74-kpi"><small>Секторов</small><strong>${sectors.length}</strong></div><div class="sh74-kpi"><small>РС / РГ</small><strong>${rs.length} / ${mans.length}</strong></div><div class="sh74-kpi"><small>Сотрудников</small><strong>${employees.length}</strong></div><div class="sh74-kpi ${unclaimed?'warn':'good'}"><small>Ждут первый вход</small><strong>${unclaimed}</strong></div></div><div class="sh74-manager-main"><div class="sh74-light-card"><div class="sh74-card-head"><h3>Сектора</h3><small>${sectors.length}</small></div>${sectors.map(sec=>{const us=employees.filter(x=>sectorOf(x)===sec),m=managersInSector(sec);return `<div class="sh74-attention-row"><span class="sh74-person-avatar">${esc(sec.slice(0,2).toUpperCase())}</span><div><b>${esc(sec)}</b><div class="meta">${m.length} РГ · ${us.length} сотрудников</div></div><button class="sh74-attention-status" onclick="openSectorDashboard70('${jsq(sec)}')">Открыть</button></div>`}).join('')||'<div class="muted">Секторов пока нет.</div>'}</div><div class="card sh74-ring-card"><h3>Прогресс платформы</h3><div class="sh74-ring" style="--p:${prog.pct}"><strong>${prog.pct}%</strong></div><div class="sh74-ring-label">Выполнение назначений</div></div></div><div class="sh74-section-head"><h2>Прогресс по направлениям</h2></div><div class="card">${sh74DirectionsHtml(employees.map(u=>employeeMetrics(u,S.attempts)))}</div></div>`
}
function renderMentor(){isTechAdmin()?renderTechAdminMentor():isRS()?renderSectorAdmin():renderManagerMentor()}

// Reference-style manual trainer while preserving the existing submit/review workflow.
function startManualContent(id){
  const x=S.content.find(c=>c.id===id);if(!x||x.type!=='manual')return;goRun();const instruction=x.instruction||'Сформулируйте ответ своими словами.',question=x.question||x.title||'';
  if(S.profile.role!=='employee'){$('page-run').innerHTML=`<div class="sh74-run-card"><div class="sh74-run-top"><button class="back" onclick="go('training')">‹</button><span class="sh74-run-counter">Режим просмотра</span></div><h2>${esc(x.title||'Ручной тренажёр')}</h2><div class="sh74-prompt"><b>Ситуация</b>${esc(question)}</div><div class="meta">${esc(instruction)}</div></div>`;return}
  const last=latestManualAnswer(id),canEdit=!last||last.status==='revision_requested',prefill=last?.status==='revision_requested'?last.answer:'',stats=manualTopicStats(x.topic),num=Math.min(stats.total,stats.started+(last?0:1)),pct=stats.total?Math.round(stats.started/stats.total*100):0;
  if(last&&!canEdit){$('page-run').innerHTML=`<div class="sh74-run-card"><div class="sh74-run-top"><button class="back" onclick="go('training')">‹</button><span class="sh74-run-counter">${stats.started} из ${stats.total}</span></div><div class="progress"><span style="width:${pct}%"></span></div><div class="sh74-success"><div class="sh74-success-icon">🎉</div><h2>${last.status==='accepted'?'Ответ принят!':'Ответ отправлен!'}</h2><p>${last.status==='accepted'?'Работа принята руководителем группы.':'Кейс успешно отправлен руководителю на проверку. Можно переходить к следующему заданию.'}</p>${last.mentor_comment?`<div class="sh74-result-stats"><b>Комментарий РГ</b><div class="meta">${esc(last.mentor_comment)}</div></div>`:''}<div class="sh74-run-actions"><button class="btn primary" onclick="nextManualContent('${id}')">Далее →</button><button class="btn secondary" onclick="go('training')">Выйти из тренировки</button></div></div></div>`;return}
  $('page-run').innerHTML=`<div class="sh74-run-card"><div class="sh74-run-top"><button class="back" onclick="go('training')">‹</button><span class="sh74-run-counter">Кейс ${num||1} из ${stats.total||1}</span></div><div class="progress"><span style="width:${pct}%"></span></div><h2 style="margin:18px 0 5px">${esc(x.title||'Ручной тренажёр')}</h2><div class="meta">${esc(instruction)}</div><div class="sh74-prompt"><b>Ситуация</b>${esc(question)}</div>${last?.mentor_comment?`<div class="manual-status-box warn"><b>Комментарий РГ</b><div>${esc(last.mentor_comment)}</div></div>`:''}<div class="sh74-answer-panel"><label>${last?'Доработанный вариант':'Ваш ответ'}</label><textarea id="manualAnswerInput" rows="8" placeholder="Напишите ваш вариант решения...">${esc(prefill)}</textarea></div><div class="sh74-run-actions"><button class="btn primary" onclick="submitManualAnswer('${id}')">${last?'Повторно отправить на проверку':'Отправить на проверку'}</button><button class="btn secondary" onclick="go('training')">Выйти</button></div></div>`
}

/* ===== end SkillHub 7.4.0 ===== */

/* ===== SkillHub 7.4.2 — TECH ADMIN FULL ACCESS / MANUAL REPORT ===== */
function updateRoleNavLabels(){
  if(!S.profile)return;
  const mentor=document.querySelector('.nav-btn[data-page="mentor"] .nav-text');
  if(mentor)mentor.textContent=S.profile.role==='mentor'?'Моя группа':S.profile.role==='rs'?'Сектор':'Все сектора';
  const admin=document.querySelector('.nav-btn[data-page="admin"] .nav-text');
  if(admin)admin.textContent='Доступы';
}

enterApp=function(){
  $('setupView').classList.add('hidden');$('loginView').classList.add('hidden');$('appView').classList.remove('hidden');
  document.body.dataset.role=S.profile.role;$('profileName').textContent=S.profile.name||S.profile.login;$('roleLabel').textContent=roleName(S.profile.role);renderTopAvatar();
  document.querySelectorAll('.mentor-only').forEach(x=>x.classList.toggle('hidden',!isManager()));document.querySelectorAll('.tech-only').forEach(x=>x.classList.toggle('hidden',!isTechAdmin()));
  updateRoleNavLabels();go(isTechAdmin()?'home':isManager()?'mentor':'home');subscribeRealtime();
};

function sh742TechAdminHome(){
  $('pageTitle').textContent='Главная';$('pageSub').textContent='Технический администратор · полный доступ SkillHub';
  const employees=scopeEmployees(),sectors=[...new Set(employees.map(sectorOf))].filter(x=>x&&x!=='ALL'),rs=S.allowed.filter(x=>x.active&&x.role==='rs'),mans=S.allowed.filter(x=>x.active&&x.role==='mentor'),unclaimed=S.allowed.filter(x=>x.active&&x.role==='employee'&&!x.claimed_user_id).length,pending=(S.manualAnswers||[]).filter(x=>x.status==='submitted').length,prog=sh74TeamAssignmentProgress(employees);
  $('page-home').innerHTML=`<div class="sh74-manager"><div class="sh74-hero" style="margin-bottom:14px"><div class="sh74-hero-kicker">SkillHub Control Center</div><h2>Привет, ${esc(sh74Name())}! 👋</h2><div class="sh74-hero-sub">У вас полный доступ к тренировкам, аналитике и управлению платформой</div><div class="sh74-current"><div class="sh74-current-label">ОБЩИЙ ПРОГРЕСС</div><div class="sh74-current-title">${prog.pct}% назначений выполнено</div><div class="sh74-current-meta">${employees.length} сотрудников · ${sectors.length} секторов · ${pending} работ на проверке</div><div class="sh74-hero-progress"><span style="width:${prog.pct}%"></span></div></div></div><div class="sh74-kpis"><div class="sh74-kpi"><small>Секторов</small><strong>${sectors.length}</strong></div><div class="sh74-kpi"><small>РС / РГ</small><strong>${rs.length} / ${mans.length}</strong></div><div class="sh74-kpi"><small>Сотрудников</small><strong>${employees.length}</strong></div><div class="sh74-kpi ${unclaimed?'warn':'good'}"><small>Ждут первый вход</small><strong>${unclaimed}</strong></div></div><div class="sh74-section-head"><h2>Быстрый доступ</h2></div><div class="sh742-quick-grid"><button class="sh742-quick" onclick="go('mentor')"><b>Все сектора</b><small>РС, РГ, команды и общая аналитика</small></button><button class="sh742-quick" onclick="go('training')"><b>Тренировки</b><small>Открыть и проверить все тренажёры</small></button><button class="sh742-quick" onclick="go('progress')"><b>Прогресс</b><small>Общая динамика сотрудников</small></button><button class="sh742-quick" onclick="go('content')"><b>Контент</b><small>Создание и редактирование материалов</small></button><button class="sh742-quick" onclick="go('assignments')"><b>Назначения</b><small>Выдача одного или нескольких материалов</small></button><button class="sh742-quick" onclick="go('employees')"><b>Сотрудники</b><small>Поиск, карточки, коды и доступы</small></button><button class="sh742-quick" onclick="go('admin')"><b>Доступы</b><small>Роли, РС, РГ и техническое управление</small></button><button class="sh742-quick" onclick="sh741OpenProfile()"><b>Профиль</b><small>Фото и данные вашего профиля</small></button></div></div>`;
}
const sh742RenderHomeBase=renderHome;
renderHome=function(){if(isTechAdmin())return sh742TechAdminHome();return sh742RenderHomeBase()};

function sh742TechProgress(){
  $('pageTitle').textContent='Прогресс';$('pageSub').textContent='Аналитика по всей платформе';
  const employees=scopeEmployees(),metrics=employees.map(u=>employeeMetrics(u,S.attempts)),prog=sh74TeamAssignmentProgress(employees),attempts=S.attempts.filter(a=>employees.some(u=>u.login===a.login)),avg=attempts.length?Math.round(attempts.reduce((s,a)=>s+Number(a.score||0),0)/attempts.length):0,manual=(S.manualAnswers||[]),accepted=manual.filter(x=>x.status==='accepted').length,revision=manual.filter(x=>x.status==='revision_requested').length;
  $('page-progress').innerHTML=`<div class="sh74-manager"><div class="sh74-kpis"><div class="sh74-kpi"><small>Сотрудников</small><strong>${employees.length}</strong></div><div class="sh74-kpi good"><small>Средний результат</small><strong>${avg||'—'}${avg?'%':''}</strong></div><div class="sh74-kpi"><small>Выполнение назначений</small><strong>${prog.pct}%</strong></div><div class="sh74-kpi"><small>Ручная практика</small><strong>${accepted}</strong><span class="muted small">принято · ${revision} на доработке</span></div></div><div class="sh74-section-head"><h2>Прогресс по направлениям</h2></div><div class="card">${sh74DirectionsHtml(metrics)}</div><div class="sh74-section-head"><h2>Сотрудники</h2><button class="sh74-link" onclick="go('employees')">Открыть весь список</button></div>${sh74TeamRowsHtml(metrics.slice(0,12))}</div>`;
}
const sh742RenderProgressBase=renderProgress;
renderProgress=function(){if(isTechAdmin())return sh742TechProgress();return sh742RenderProgressBase()};

function sh742ManualLatestByContent(login){
  const map=new Map();for(const r of (S.manualAnswers||[]).filter(x=>x.login===login).sort((a,b)=>Number(a.version)-Number(b.version))){map.set(r.content_id,r)}return [...map.values()].sort((a,b)=>new Date(b.updated_at||b.created_at)-new Date(a.updated_at||a.created_at));
}
function sh742ManualReportHtml(login){
  const latest=sh742ManualLatestByContent(login),all=(S.manualAnswers||[]).filter(x=>x.login===login),accepted=latest.filter(x=>x.status==='accepted').length,pending=latest.filter(x=>x.status==='submitted').length,revision=latest.filter(x=>x.status==='revision_requested').length;
  if(!latest.length)return `<div class="sh74-section-head"><h2>Ручная практика Soft</h2></div><div class="card"><div class="muted">Сотрудник пока не выполнял ручные Soft-кейсы.</div></div>`;
  return `<div class="sh74-section-head"><h2>Ручная практика Soft</h2></div><div class="sh742-manual-summary"><div class="sh742-manual-kpi"><small>Кейсов</small><strong>${latest.length}</strong></div><div class="sh742-manual-kpi"><small>Принято</small><strong>${accepted}</strong></div><div class="sh742-manual-kpi"><small>На проверке</small><strong>${pending}</strong></div><div class="sh742-manual-kpi"><small>На доработке</small><strong>${revision}</strong></div></div><div class="sh742-manual-list">${latest.map(r=>{const c=S.content.find(x=>x.id===r.content_id),hist=manualHistory(r.content_id,login);return `<div class="sh742-manual-item"><div class="sh742-manual-item-head"><div><b>${esc(c?.title||'Ручной тренажёр')}</b><div class="meta">${esc(c?.topic||'Soft Skills')} · версия ${r.version} · ${new Date(r.updated_at||r.created_at).toLocaleString('ru-RU')}</div></div><span class="pill ${manualStatusClass(r.status)}">${manualStatusText(r.status)}</span></div><div class="manual-answer-text">${esc(r.answer)}</div>${r.mentor_comment?`<div class="review-note"><b>Комментарий РГ</b><div>${esc(r.mentor_comment)}</div></div>`:''}${r.mentor_suggestion?`<div class="review-note suggestion"><b>Рекомендуемый вариант</b><div>${esc(r.mentor_suggestion)}</div></div>`:''}<div class="sh742-report-actions"><button class="btn secondary" onclick="sh742OpenManualHistory('${r.content_id}','${jsq(login)}')">История (${hist.length})</button></div></div>`}).join('')}</div><div class="sh742-report-actions"><button class="btn secondary" onclick="sh742ExportManualPractice('${jsq(login)}')">⬇ Ручная практика Excel</button></div>`;
}
function sh742OpenManualHistory(contentId,login){
  const c=S.content.find(x=>x.id===contentId),rows=manualHistory(contentId,login);showModal(`<div class="modal-head"><div><h2>${esc(c?.title||'Ручная практика')}</h2><div class="meta">${esc(login)} · все версии</div></div><button class="btn secondary" onclick="closeModal()">✕</button></div>${rows.map(r=>`<div class="manual-history-item"><div class="actions" style="justify-content:space-between"><b>Версия ${r.version}</b><span class="pill ${manualStatusClass(r.status)}">${manualStatusText(r.status)}</span></div><div class="manual-answer-text">${esc(r.answer)}</div>${r.mentor_comment?`<div class="review-note"><b>Комментарий РГ</b><div>${esc(r.mentor_comment)}</div></div>`:''}${r.mentor_suggestion?`<div class="review-note suggestion"><b>Рекомендуемый вариант</b><div>${esc(r.mentor_suggestion)}</div></div>`:''}</div>`).join('')||'<div class="muted">Истории пока нет.</div>'}`)
}
function sh742ExportManualPractice(login){
  const u=S.allowed.find(x=>x.login===login)||{},rows=(S.manualAnswers||[]).filter(x=>x.login===login).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)).map(r=>{const c=S.content.find(x=>x.id===r.content_id);return {'Сотрудник':u.name||login,'Логин':login,'Дата':new Date(r.created_at).toLocaleString('ru-RU'),'Тренажёр':c?.title||'','Тема':c?.topic||'','Версия':r.version,'Ответ сотрудника':r.answer,'Статус':manualStatusText(r.status),'Комментарий РГ':r.mentor_comment||'','Рекомендуемый вариант':r.mentor_suggestion||'','Дата проверки':r.reviewed_at?new Date(r.reviewed_at).toLocaleString('ru-RU'):''}});const wb=XLSX.utils.book_new(),ws=rows.length?XLSX.utils.json_to_sheet(rows):XLSX.utils.aoa_to_sheet([['Сотрудник','Логин','Дата','Тренажёр','Тема','Версия','Ответ сотрудника','Статус','Комментарий РГ','Рекомендуемый вариант','Дата проверки']]);XLSX.utils.book_append_sheet(wb,ws,'Ручная практика');XLSX.writeFile(wb,`SkillHub_Ручная_практика_${safeFilePart(login)}.xlsx`);toast('Отчёт сформирован')
}

openUserAttempts=function(login){
  const rows=S.attempts.filter(x=>x.login===login).slice().sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)),u=S.allowed.find(x=>x.login===login);
  showModal(`<div class="modal-head"><div><h2>${esc(u?.name||login)}</h2><div class="meta">${esc(login)} · карточка сотрудника</div></div><div class="actions">${isManager()?`<button class="btn secondary" onclick="openMentorExport('', '${jsq(login)}')">⬇ Excel</button>`:''}<button class="btn secondary" onclick="closeModal()">✕</button></div></div><div class="sh74-section-head"><h2>Автоматические тренировки</h2></div><div class="card table-wrap"><table class="table"><thead><tr><th>Дата</th><th>Раздел</th><th>Тема</th><th>Результат</th><th>Детали</th></tr></thead><tbody>${rows.length?rows.map(a=>`<tr><td>${new Date(a.created_at).toLocaleString('ru-RU')}</td><td>${secName(a.section)}</td><td>${esc(a.topic)}</td><td><span class="pill ${Number(a.score)>=90?'good':Number(a.score)>=75?'warn':'bad'}">${a.score}%</span></td><td>${a.type==='typing'?'Скорость печати':attemptDetails(a).length?`<button class="btn secondary" onclick="openAttemptReview('${a.id}')">Ответы</button>`:'<span class="muted small">без детализации</span>'}</td></tr>`).join(''):'<tr><td colspan="5" class="muted">Автоматических попыток пока нет.</td></tr>'}</tbody></table></div>${sh742ManualReportHtml(login)}`);
};

// Tech admin can preview a manual Soft case without sending it to an RG.
const sh742StartManualContentBase=startManualContent;
startManualContent=function(id){
  if(!isTechAdmin())return sh742StartManualContentBase(id);
  const x=S.content.find(c=>c.id===id);if(!x||x.type!=='manual')return;goRun();const stats=manualTopicStats(x.topic),next=manualNextCandidate(x.topic,id);
  $('page-run').innerHTML=`<div class="sh74-run-card"><div class="sh74-run-top"><button class="back" onclick="go('training')">‹</button><span class="sh74-run-counter">Предпросмотр техадмина</span></div><h2 style="margin:18px 0 5px">${esc(x.title||'Ручной тренажёр')}</h2><div class="meta">${esc(x.instruction||'Сформулируйте ответ своими словами.')}</div><div class="sh74-prompt"><b>Ситуация</b>${esc(x.question||x.title||'')}</div><div class="sh74-answer-panel"><label>Ваш тестовый ответ</label><textarea rows="8" placeholder="Можно проверить, как выглядит ввод ответа. Результат не отправляется РГ."></textarea></div><div class="sh74-run-actions"><button class="btn secondary" onclick="go('training')">Выйти</button>${next?`<button class="btn primary" onclick="startManualContent('${next.id}')">Далее →</button>`:'<button class="btn primary" onclick="openManualSoft()">К списку</button>'}</div></div>`;
};
/* ===== end SkillHub 7.4.2 ===== */

/* ===== SkillHub 7.4.3 · unified reports incl. manual Soft practice ===== */
function sh743ManualRowsForUsers(users,from='',to=''){
  const logs=new Set((users||[]).map(x=>x.login));
  return filterByPeriod((S.manualAnswers||[]).filter(x=>logs.has(x.login)),from,to);
}
function sh743LatestManualRows(rows){
  const map=new Map();
  for(const r of (rows||[]).slice().sort((a,b)=>Number(a.version)-Number(b.version))){
    map.set(`${r.login}__${r.content_id}`,r);
  }
  return [...map.values()];
}
function sh743ManualCounts(login,rows){
  const latest=sh743LatestManualRows((rows||[]).filter(x=>x.login===login));
  return {
    total:latest.length,
    accepted:latest.filter(x=>x.status==='accepted').length,
    pending:latest.filter(x=>x.status==='submitted').length,
    revision:latest.filter(x=>x.status==='revision_requested').length
  };
}
openMentorExport=function(sector='',manager='',login=''){
  const title=login?'Полный отчёт по сотруднику':manager?'Полный отчёт по команде':sector?'Полный отчёт по сектору':isTechAdmin()?'Полный отчёт SkillHub':'Полный отчёт по доступной команде';
  showModal(`<div class="modal-head"><div><h2>${title}</h2><div class="meta">Один Excel: сводка, автоматические тренировки, ответы, назначения и ручная практика Soft со всеми комментариями РГ</div></div><button class="btn secondary" onclick="closeModal()">✕</button></div><div class="form-grid"><div class="field"><label>С даты</label><input id="repFrom" type="date"></div><div class="field"><label>По дату</label><input id="repTo" type="date"></div></div><div class="hint">Если даты не указывать — выгрузится вся доступная история. Для ручной практики в файле будут отдельные листы «итог» и «все версии».</div><div class="actions" style="justify-content:flex-end;margin-top:14px"><button class="btn primary" onclick="exportMentorExcel('${jsq(sector)}','${jsq(manager)}','${jsq(login)}',$('repFrom').value,$('repTo').value)">⬇ Скачать полный Excel</button></div>`)
};
exportMentorExcel=function(sector='',manager='',login='',from='',to=''){
  const users=reportEmployees(sector,manager,login),logs=new Set(users.map(x=>x.login)),attempts=filterByPeriod(S.attempts.filter(x=>logs.has(x.login)),from,to),byLogin=new Map(S.allowed.map(x=>[x.login,x]));
  const manualRows=sh743ManualRowsForUsers(users,from,to),manualLatest=sh743LatestManualRows(manualRows);
  const summary=users.map(u=>{const m=employeeMetrics(u,attempts),am=userAssignmentMetrics(u.login,S.attempts),mc=sh743ManualCounts(u.login,manualRows);return {'Сектор':sectorOf(u),'Руководитель':managerDisplay(u.manager_login),'Команда':teamDisplay(u.manager_login),'Сотрудник':u.name||u.login,'Логин':u.login,'Soft %':m.soft??'','Hard %':m.hard??'','Потребность %':m.needs??'','Ручных кейсов':mc.total,'Ручных принято':mc.accepted,'Ручных на проверке':mc.pending,'Ручных на доработке':mc.revision,'Зон развития':m.gaps.length,'Авто-попыток':m.attempts,'Назначений выполнено':am.completed,'Назначений просрочено':am.overdue,'Назначений в работе':am.work,'Последняя активность':m.last?new Date(m.last).toLocaleString('ru-RU'):''}});
  const dynamics=attempts.slice().sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)).map(a=>{const u=byLogin.get(a.login)||{};return {'Сектор':sectorOf(u),'Руководитель':managerDisplay(u.manager_login),'Сотрудник':u.name||a.login,'Логин':a.login,'Дата':new Date(a.created_at).toLocaleString('ru-RU'),'Раздел':secName(a.section),'Тема':a.topic,'Результат %':Number(a.score),'Тип':attemptTypeName(a.type)}});
  const zones=[];for(const u of users)for(const t of topicStatsFromRows(u.login,attempts))zones.push({'Сектор':sectorOf(u),'Руководитель':managerDisplay(u.manager_login),'Сотрудник':u.name||u.login,'Логин':u.login,'Раздел':secName(t.section),'Тема':t.topic,'Последние %':t.avgRecent,'Попыток':t.attempts,'Тренд':trendText(t.trend),'Статус':statusText(t)});
  const answers=[];for(const a of attempts){const u=byLogin.get(a.login)||{};(attemptDetails(a)||[]).forEach((d,i)=>{const opts=Array.isArray(d.options)?d.options:[];answers.push({'Сектор':sectorOf(u),'Руководитель':managerDisplay(u.manager_login),'Сотрудник':u.name||a.login,'Логин':a.login,'Дата':new Date(a.created_at).toLocaleString('ru-RU'),'Раздел':secName(a.section),'Тема':a.topic,'Материал':d.title||'','Шаг / вопрос':d.step||i+1,'Вопрос':d.question||'','Выбранный ответ':opts[Number(d.selected)]||'','Правильный ответ':opts[Number(d.correct)]||'','Верно':d.is_correct?'Да':'Нет','Объяснение':d.explanation||''})})}
  const assignmentRows=[];for(const x of S.assignments){const rec=x.recipients||[],relevant=rec.includes('ALL')?users:users.filter(u=>rec.includes(u.login));for(const u of relevant)assignmentRows.push({'Сектор':sectorOf(u),'Руководитель':managerDisplay(u.manager_login),'Сотрудник':u.name||u.login,'Логин':u.login,'Назначение':x.title,'Раздел':x.section?secName(x.section):'','Тема':x.topic||'','Создано':x.created_at?new Date(x.created_at).toLocaleString('ru-RU'):'','Дедлайн':x.due||'','Цель %':x.target,'Статус сотрудника':assignmentStatusForUser(x,u.login,S.attempts)})}
  const manualSummary=manualLatest.slice().sort((a,b)=>new Date(b.updated_at||b.created_at)-new Date(a.updated_at||a.created_at)).map(r=>{const u=byLogin.get(r.login)||{},c=S.content.find(x=>x.id===r.content_id),reviewer=r.reviewed_by?S.profiles.find(x=>x.id===r.reviewed_by):null;return {'Сектор':sectorOf(u),'Руководитель':managerDisplay(u.manager_login),'Сотрудник':u.name||r.login,'Логин':r.login,'Тренажёр':c?.title||'Ручной тренажёр','Тема':c?.topic||'Soft Skills','Последняя версия':r.version,'Последний ответ':r.answer,'Статус':manualStatusText(r.status),'Комментарий РГ':r.mentor_comment||'','Рекомендуемый вариант':r.mentor_suggestion||'','Проверил':reviewer?.name||reviewer?.login||'','Дата отправки':r.created_at?new Date(r.created_at).toLocaleString('ru-RU'):'','Дата проверки':r.reviewed_at?new Date(r.reviewed_at).toLocaleString('ru-RU'):''}});
  const manualHistory=manualRows.slice().sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)).map(r=>{const u=byLogin.get(r.login)||{},c=S.content.find(x=>x.id===r.content_id),reviewer=r.reviewed_by?S.profiles.find(x=>x.id===r.reviewed_by):null;return {'Сектор':sectorOf(u),'Руководитель':managerDisplay(u.manager_login),'Сотрудник':u.name||r.login,'Логин':r.login,'Тренажёр':c?.title||'Ручной тренажёр','Тема':c?.topic||'Soft Skills','Версия':r.version,'Ответ сотрудника':r.answer,'Статус':manualStatusText(r.status),'Комментарий РГ':r.mentor_comment||'','Рекомендуемый вариант':r.mentor_suggestion||'','Проверил':reviewer?.name||reviewer?.login||'','Дата отправки':r.created_at?new Date(r.created_at).toLocaleString('ru-RU'):'','Дата проверки':r.reviewed_at?new Date(r.reviewed_at).toLocaleString('ru-RU'):''}});
  const scope=login?login:manager?teamDisplay(manager):sector||(isTechAdmin()?'Все_сектора':S.profile.sector_name||'Команда');
  const params=[['Параметр','Значение'],['Дата формирования',new Date().toLocaleString('ru-RU')],['Область',scope],['Период с',from||'Вся история'],['Период по',to||'Вся история'],['Сотрудников в отчёте',users.length],['Ручных работ в периоде',manualRows.length],['Ручных кейсов (последние версии)',manualLatest.length],['Формула зоны развития',`минимум ${ADAPTIVE.minAttempts} попытки; среднее последних ${ADAPTIVE.recentWindow} < ${ADAPTIVE.gap}%`]];
  const wb=XLSX.utils.book_new();
  const wsp=XLSX.utils.aoa_to_sheet(params);formatExportSheet(wsp,[31,52]);XLSX.utils.book_append_sheet(wb,wsp,'Параметры');
  const add=(name,rows,headers,widths)=>{const ws=rows.length?XLSX.utils.json_to_sheet(rows):XLSX.utils.aoa_to_sheet([headers]);formatExportSheet(ws,widths);XLSX.utils.book_append_sheet(wb,ws,name)};
  add('Сводка',summary,['Сектор','Руководитель','Команда','Сотрудник','Логин','Soft %','Hard %','Потребность %','Ручных кейсов','Ручных принято','Ручных на проверке','Ручных на доработке','Зон развития','Авто-попыток','Назначений выполнено','Назначений просрочено','Назначений в работе','Последняя активность'],[18,24,22,28,20,10,10,14,15,15,18,19,14,14,18,19,17,21]);
  add('Динамика',dynamics,['Сектор','Руководитель','Сотрудник','Логин','Дата','Раздел','Тема','Результат %','Тип'],[18,24,28,20,21,20,28,13,16]);
  add('Зоны развития',zones,['Сектор','Руководитель','Сотрудник','Логин','Раздел','Тема','Последние %','Попыток','Тренд','Статус'],[18,24,28,20,20,30,13,10,12,18]);
  add('История ответов',answers,['Сектор','Руководитель','Сотрудник','Логин','Дата','Раздел','Тема','Материал','Шаг / вопрос','Вопрос','Выбранный ответ','Правильный ответ','Верно','Объяснение'],[18,24,28,20,21,18,24,30,12,45,45,45,9,55]);
  add('Назначения',assignmentRows,['Сектор','Руководитель','Сотрудник','Логин','Назначение','Раздел','Тема','Создано','Дедлайн','Цель %','Статус сотрудника'],[18,24,28,20,35,18,25,21,13,10,18]);
  add('Ручная практика итог',manualSummary,['Сектор','Руководитель','Сотрудник','Логин','Тренажёр','Тема','Последняя версия','Последний ответ','Статус','Комментарий РГ','Рекомендуемый вариант','Проверил','Дата отправки','Дата проверки'],[18,24,28,20,34,24,14,60,18,50,55,24,22,22]);
  add('Ручная практика история',manualHistory,['Сектор','Руководитель','Сотрудник','Логин','Тренажёр','Тема','Версия','Ответ сотрудника','Статус','Комментарий РГ','Рекомендуемый вариант','Проверил','Дата отправки','Дата проверки'],[18,24,28,20,34,24,10,60,18,50,55,24,22,22]);
  const period=(from||to)?`_${from||'start'}_${to||'today'}`:'';XLSX.writeFile(wb,`SkillHub_Полный_отчёт_${safeFilePart(scope)}${period}.xlsx`);toast('Полный Excel сформирован');
};
/* ===== end SkillHub 7.4.3 ===== */

/* ===== SkillHub 7.4.5 — employee manual rework visibility ===== */
function sh745EmployeeManualReworks(){
  if(S.profile?.role!=='employee')return [];
  const login=S.profile.login;
  const latest=new Map();
  for(const r of (S.manualAnswers||[]).filter(x=>x.login===login).sort((a,b)=>Number(a.version||0)-Number(b.version||0))){
    latest.set(r.content_id,r);
  }
  return [...latest.values()]
    .filter(r=>r.status==='revision_requested')
    .map(r=>({answer:r,content:S.content.find(c=>c.id===r.content_id)}))
    .sort((a,b)=>new Date(b.answer.reviewed_at||b.answer.updated_at||0)-new Date(a.answer.reviewed_at||a.answer.updated_at||0));
}
function sh745ReworkBannerHtml(compact=false){
  const rows=sh745EmployeeManualReworks();if(!rows.length)return'';
  const list=rows.slice(0,compact?2:4).map(({answer:r,content:c})=>`<div class="sh745-rework-item"><div class="sh745-rework-copy"><b>${esc(c?.title||'Ручной тренажёр')}</b><div class="meta">${esc(c?.topic||'Soft Skills')} · версия ${r.version}</div>${r.mentor_comment?`<div class="sh745-rework-comment"><b>Комментарий РГ:</b> ${esc(r.mentor_comment)}</div>`:''}</div><button class="btn primary" onclick="startManualContent('${r.content_id}')">Доработать</button></div>`).join('');
  return `<div class="sh745-rework-banner"><div class="sh745-rework-head"><div><span class="sh745-rework-icon">↩</span><b>Нужно доработать ${rows.length>1?'· '+rows.length:''}</b><div class="meta">Руководитель вернул ${rows.length>1?'работы':'работу'} с комментарием. Исправьте ответ и отправьте повторно.</div></div><button class="sh74-link" onclick="openManualSoft()">Все ручные</button></div>${list}${rows.length>(compact?2:4)?`<button class="btn secondary sh745-more" onclick="openManualSoft()">Показать все доработки (${rows.length})</button>`:''}</div>`;
}
function sh745InjectReworkBanner(pageId,afterSelector){
  const page=$(pageId),html=sh745ReworkBannerHtml(pageId==='page-home');if(!page||!html)return;
  const holder=document.createElement('div');holder.innerHTML=html;const banner=holder.firstElementChild;
  const anchor=afterSelector?page.querySelector(afterSelector):null;
  if(anchor)anchor.insertAdjacentElement('afterend',banner);else page.prepend(banner);
}
const sh745RenderHomeBase=renderHome;
renderHome=function(){
  sh745RenderHomeBase();
  if(S.profile?.role==='employee')sh745InjectReworkBanner('page-home','.sh74-hero');
};
const sh745RenderTrainingBase=renderTraining;
renderTraining=function(){
  sh745RenderTrainingBase();
  if(S.profile?.role==='employee')sh745InjectReworkBanner('page-training','.sh74-filterbar');
};
const sh745RenderNotificationsBase=renderNotifications;
renderNotifications=function(){
  sh745RenderNotificationsBase();
  if(S.profile?.role!=='employee')return;
  const rows=sh745EmployeeManualReworks(),page=$('page-notifications');if(!page||!rows.length)return;
  const box=document.createElement('div');box.className='sh745-notification-action';
  box.innerHTML=`<div><b>↩ Есть ${rows.length} ${rows.length===1?'работа':'работы'} на доработке</b><div class="meta">Откройте ручной тренажёр, посмотрите комментарий РГ и отправьте новую версию.</div></div><button class="btn primary" onclick="go('training');setTimeout(()=>openManualSoft(),0)">Открыть</button>`;
  page.prepend(box);
};
/* ===== end SkillHub 7.4.5 ===== */

/* ===== SkillHub 7.4.8 — Home dual cards refined ===== */
function sh748HomeCardsHtml(){
  return `<div class="sh748-hero-shell"><div class="sh748-hero-head"><div class="sh74-hero-kicker">SkillHub</div><h2>Привет, ${esc(sh74Name())}! 👋</h2><div class="sh748-hero-subtitle">Что выбираете сегодня?</div><p class="sh748-hero-text">Тренируйте навыки или попробуйте себя в игре.</p></div><div class="sh748-home-grid"><section class="sh748-card sh748-card-train"><div class="sh748-card-icon">${sh741SkillIcon('needs')}</div><div class="sh748-card-body"><h3>Потренироваться</h3><p><strong>Soft, Hard и Печать</strong><br>Три направления для регулярной практики.</p><button class="sh748-card-btn" onclick="go('training')">К тренировкам →</button></div><div class="sh748-card-note">Маленькие шаги — большие результаты!</div></section><section class="sh748-card sh748-card-game"><div class="sh748-card-icon sh748-card-icon-game"><img class="sh748-game-icon" src="./master-line-icon.png" alt="Мастер линии"></div><div class="sh748-card-body"><h3>Поиграть</h3><p><strong>Мастер линии</strong><br>Стань настоящим мастером линии.<br>Практика навыков в игровом формате.</p><a class="sh748-card-btn sh748-card-btn-dark" href="${MASTER_LINE_URL}" target="_blank" rel="noopener noreferrer">Запустить игру →</a></div><div class="sh748-card-side">Учись.<br>Играй.<br>Расти!</div></section></div></div>`;
}
function sh748ApplyEmployeeHome(pageId){
  const page=$(pageId),hero=page?.querySelector('.sh74-hero');
  if(!hero)return;
  hero.classList.add('sh748-home-hero');
  hero.innerHTML=sh748HomeCardsHtml();
}
const sh748RenderHomeBase=renderHome;
renderHome=function(){
  sh748RenderHomeBase();
  if(S.profile?.role==='employee'||S.profile?.role==='tech_admin')sh748ApplyEmployeeHome('page-home');
};
/* ===== end SkillHub 7.4.8 ===== */

/* ===== SkillHub 7.4.9 — Reference home: yellow choice stage ===== */
function sh749TrainingArt(){
  return `<svg class="sh749-art-svg" viewBox="0 0 220 170" aria-hidden="true">
    <defs>
      <linearGradient id="sh749TargetOuter" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#ffe978"/><stop offset="1" stop-color="#ffc928"/></linearGradient>
      <linearGradient id="sh749TargetInner" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#fff5bb"/><stop offset="1" stop-color="#ffe36e"/></linearGradient>
      <linearGradient id="sh749Arrow" x1="0" x2="1"><stop stop-color="#6d42ff"/><stop offset="1" stop-color="#3a1bc5"/></linearGradient>
      <filter id="sh749Shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="9" stdDeviation="8" flood-color="#9b7210" flood-opacity=".28"/></filter>
    </defs>
    <g filter="url(#sh749Shadow)">
      <circle cx="103" cy="91" r="60" fill="url(#sh749TargetOuter)"/>
      <circle cx="103" cy="91" r="44" fill="url(#sh749TargetInner)"/>
      <circle cx="103" cy="91" r="28" fill="#ffd92f"/>
      <circle cx="103" cy="91" r="13" fill="#fff4ab"/>
      <path d="M102 91 158 41" stroke="url(#sh749Arrow)" stroke-width="10" stroke-linecap="round"/>
      <path d="m154 28 28-10-10 28-10 1-1 10-18 17 4-26-19-1 18-17 8 4z" fill="url(#sh749Arrow)"/>
      <circle cx="103" cy="91" r="4.5" fill="#4625db"/>
    </g>
  </svg>`;
}
function sh749GameArt(){
  return `<svg class="sh749-art-svg sh749-game-svg" viewBox="0 0 260 180" aria-hidden="true">
    <defs>
      <linearGradient id="sh749PadBody" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#353942"/>
        <stop offset=".48" stop-color="#181b21"/>
        <stop offset="1" stop-color="#08090c"/>
      </linearGradient>
      <linearGradient id="sh749PadEdge" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#4d535f"/>
        <stop offset="1" stop-color="#15181d"/>
      </linearGradient>
      <linearGradient id="sh749Gold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fff27a"/>
        <stop offset=".55" stop-color="#ffda21"/>
        <stop offset="1" stop-color="#f0a700"/>
      </linearGradient>
      <linearGradient id="sh749Purple" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#a16dff"/>
        <stop offset="1" stop-color="#5b28e8"/>
      </linearGradient>
      <filter id="sh749GameShadow" x="-40%" y="-45%" width="190%" height="220%">
        <feDropShadow dx="0" dy="16" stdDeviation="11" flood-color="#000" flood-opacity=".55"/>
      </filter>
      <filter id="sh749GoldGlow" x="-100%" y="-100%" width="300%" height="300%">
        <feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="#ffd829" flood-opacity=".55"/>
      </filter>
    </defs>

    <!-- floating lightning like the reference -->
    <g filter="url(#sh749GoldGlow)" transform="translate(185 12) rotate(8)">
      <path d="M24 0 4 34h16l-7 30 30-40H27L35 0z" fill="url(#sh749Gold)"/>
    </g>
    <!-- purple confetti -->
    <g fill="url(#sh749Purple)">
      <rect x="183" y="69" width="18" height="6" rx="3" transform="rotate(-24 183 69)"/>
      <rect x="218" y="84" width="15" height="5" rx="2.5" transform="rotate(28 218 84)"/>
      <path d="M220 54 231 48 230 61z"/>
      <path d="m166 54 8-10 5 13z"/>
    </g>

    <g filter="url(#sh749GameShadow)" transform="translate(2 9)">
      <!-- controller shell -->
      <path d="M45 64c14-17 32-23 55-20 16 2 28 5 40 5 13 0 28-4 43-5 25-2 43 5 56 23 15 21 22 62 10 82-6 10-18 13-28 7-9-6-18-18-27-31-9-13-17-21-29-23-9-2-22-2-33-2-12 0-23 0-32 3-12 3-21 12-29 25-8 13-17 24-26 29-11 6-22 3-28-7-12-20-5-63 14-86z" fill="url(#sh749PadBody)" stroke="url(#sh749PadEdge)" stroke-width="3"/>
      <!-- soft highlights -->
      <path d="M53 68c15-14 31-18 49-16 18 2 29 7 41 7 12 0 25-4 40-6 21-2 36 4 47 18" fill="none" stroke="#5c6471" stroke-opacity=".36" stroke-width="3" stroke-linecap="round"/>

      <!-- yellow d-pad -->
      <g filter="url(#sh749GoldGlow)">
        <rect x="69" y="83" width="44" height="14" rx="7" fill="url(#sh749Gold)"/>
        <rect x="84" y="68" width="14" height="44" rx="7" fill="url(#sh749Gold)"/>
      </g>

      <!-- right buttons, like reference -->
      <g>
        <circle cx="181" cy="78" r="10" fill="url(#sh749Gold)"/>
        <circle cx="203" cy="95" r="10" fill="#f8c313"/>
        <circle cx="180" cy="111" r="10" fill="#ffc91a"/>
        <circle cx="207" cy="70" r="9" fill="#ffe76e"/>
        <circle cx="181" cy="78" r="3" fill="#fff7bd" opacity=".7"/>
        <circle cx="207" cy="70" r="3" fill="#fff9c9" opacity=".7"/>
      </g>

      <!-- center small buttons -->
      <rect x="126" y="76" width="11" height="4" rx="2" fill="#777f8b"/>
      <rect x="145" y="76" width="11" height="4" rx="2" fill="#777f8b"/>

      <!-- sticks -->
      <g>
        <circle cx="126" cy="112" r="13" fill="#0e1014" stroke="#4d535d" stroke-width="2"/>
        <circle cx="126" cy="112" r="8" fill="#252a31"/>
        <circle cx="154" cy="112" r="13" fill="#0e1014" stroke="#4d535d" stroke-width="2"/>
        <circle cx="154" cy="112" r="8" fill="#252a31"/>
      </g>
    </g>
  </svg>`;
}
function sh749ReferenceHomeHtml(){
  const rework = S.profile?.role==='employee' ? (sh745ReworkBannerHtml?.(true)||'') : '';
  return `<div class="sh749-home-wrap">
    <section class="sh749-choice-stage">
      <div class="sh749-orb sh749-orb-a"></div><div class="sh749-orb sh749-orb-b"></div>
      <header class="sh749-choice-head">
        <div class="sh749-kicker">SKILLHUB</div>
        <h1>Привет, ${esc(sh74Name())}! <span aria-hidden="true">👋</span></h1>
        <h2>Что выбираете сегодня?</h2>
        <p>Тренируйте навыки или попробуйте себя в игре.</p>
      </header>
      <div class="sh749-choice-grid">
        <article class="sh749-choice-card sh749-training-card">
          <div class="sh749-copy">
            <h3>Потренироваться</h3>
            <p>Отрабатывай навыки, чтобы<br>увереннее применять их в деле.</p>
            <button class="sh749-cta sh749-cta-train" onclick="go('training')">Начать тренировку <span>→</span></button>
          </div>
          <div class="sh749-visual sh749-target-art">${sh749TrainingArt()}</div>
        </article>
        <article class="sh749-choice-card sh749-game-card">
          <div class="sh749-copy">
            <h3>Поиграть</h3>
            <p>Решай игровые задачи<br>и оттачивай навыки в деле.</p>
            <a class="sh749-cta sh749-cta-game" href="${MASTER_LINE_URL}" target="_blank" rel="noopener noreferrer">Начать игру <span>→</span></a>
          </div>
          <div class="sh749-visual sh749-game-art">${sh749GameArt()}</div>
        </article>
      </div>
    </section>
    ${rework ? `<div class="sh749-under-stage">${rework}</div>` : ''}
  </div>`;
}
function sh749ApplyReferenceHome(){
  const page=$('page-home'); if(!page)return;
  page.classList.add('sh749-reference-home');
  page.innerHTML=sh749ReferenceHomeHtml();
}
const sh749RenderHomeBase=renderHome;
renderHome=function(){
  sh749RenderHomeBase();
  if(S.profile?.role==='employee'||S.profile?.role==='tech_admin')sh749ApplyReferenceHome();
};
/* ===== end SkillHub 7.4.9 ===== */

/* ===== SkillHub 7.5.0 — strict reference home ===== */
function sh750ReferenceHomeHtml(){
  const rework = S.profile?.role==='employee' ? (sh745ReworkBannerHtml?.(true)||'') : '';
  return `<div class="sh750-home-wrap">
    <section class="sh750-choice-stage">
      <div class="sh750-orb"></div>
      <header class="sh750-choice-head">
        <div class="sh750-kicker">SKILLHUB</div>
        <h1>Привет, ${esc(sh74Name())}! <span aria-hidden="true">👋</span></h1>
        <h2>Что выбираете сегодня?</h2>
        <p>Тренируйте навыки или попробуйте себя в игре.</p>
      </header>
      <div class="sh750-choice-grid">
        <article class="sh750-choice-card sh750-training-card">
          <div class="sh750-copy">
            <h3>Потренироваться</h3>
            <p>Отрабатывай навыки, чтобы<br>увереннее применять их в деле.</p>
            <button class="sh750-cta" onclick="go('training')">Начать тренировку <span>→</span></button>
          </div>
          <div class="sh750-art sh750-target-art" aria-hidden="true"></div>
        </article>
        <article class="sh750-choice-card sh750-game-card">
          <div class="sh750-copy">
            <h3>Поиграть</h3>
            <p>Решай игровые задачи<br>и оттачивай навыки в деле.</p>
            <a class="sh750-cta" href="${MASTER_LINE_URL}" target="_blank" rel="noopener noreferrer">Начать игру <span>→</span></a>
          </div>
          <div class="sh750-art sh750-game-art" aria-hidden="true"></div>
        </article>
      </div>
    </section>
    ${rework ? `<div class="sh750-under-stage">${rework}</div>` : ''}
  </div>`;
}
function sh750ApplyReferenceHome(){
  const page=$('page-home'); if(!page)return;
  page.classList.add('sh750-reference-home');
  page.innerHTML=sh750ReferenceHomeHtml();
}
const sh750RenderHomeBase=renderHome;
renderHome=function(){
  sh750RenderHomeBase();
  if(S.profile)sh750ApplyReferenceHome();
};
/* ===== end SkillHub 7.5.0 ===== */


/* === SkillHub HARD card sorting case =======================================
   One Hard Skills material can use payload.mode = "sort_cards".
   It stays inside the normal Hard Skills library; only its exercise UI differs.
============================================================================ */
function shHardSortIsCase(x){
  return !!(x && x.type==='hardcase' && x.payload && x.payload.mode==='sort_cards' && Array.isArray(x.payload.cards));
}
function shHardSortSource(x){
  const src=x?.payload?.source||{};
  return {name:src.name||'Механизм работы тарифа',path:src.path||''};
}
function startHardSort(x){
  const cards=(x.payload.cards||[]).map(c=>({...c}));
  S.currentRun={type:'hard-sort',x,placements:{},selected:null,checked:false,recorded:false,cards};
  goRun();
  renderHardSort();
}
function shHardSortCategory(x,id){return (x.payload.categories||[]).find(c=>c.id===id)||null}
function shHardSortCard(id){return S.currentRun?.cards?.find(c=>c.id===id)||null}
function shHardSortSelect(id){
  const r=S.currentRun;if(!r||r.type!=='hard-sort'||r.checked)return;
  r.selected=r.selected===id?null:id;renderHardSort();
}
function shHardSortPlace(cardId,categoryId){
  const r=S.currentRun;if(!r||r.type!=='hard-sort'||r.checked)return;
  if(!shHardSortCard(cardId)||!shHardSortCategory(r.x,categoryId))return;
  r.placements[cardId]=categoryId;r.selected=null;renderHardSort();
}
function shHardSortPlaceSelected(categoryId){
  const r=S.currentRun;if(!r||r.type!=='hard-sort'||!r.selected||r.checked)return;
  shHardSortPlace(r.selected,categoryId);
}
function shHardSortReturn(cardId){
  const r=S.currentRun;if(!r||r.type!=='hard-sort'||r.checked)return;
  delete r.placements[cardId];r.selected=null;renderHardSort();
}
function shHardSortDragStart(ev,id){
  if(S.currentRun?.checked){ev.preventDefault();return}
  ev.dataTransfer.setData('text/plain',id);ev.dataTransfer.effectAllowed='move';
}
function shHardSortDrop(ev,categoryId){
  ev.preventDefault();const id=ev.dataTransfer.getData('text/plain');if(id)shHardSortPlace(id,categoryId);
}
function shHardSortCardHtml(c,placedIn=null){
  const r=S.currentRun,checked=!!r.checked;
  const isSelected=r.selected===c.id;
  let state='';
  if(checked&&placedIn)state=placedIn===c.category?' is-correct':' is-wrong';
  const cat=checked?shHardSortCategory(r.x,c.category):null;
  const result=checked&&placedIn&&placedIn!==c.category?`<small>Правильно: ${esc(cat?.title||'')}</small>`:'';
  const click=checked?'':(placedIn?`onclick="shHardSortReturn('${jsq(c.id)}')"`:`onclick="shHardSortSelect('${jsq(c.id)}')"`);
  return `<button class="sh-hard-sort-card${isSelected?' is-selected':''}${state}" draggable="${checked?'false':'true'}" ondragstart="shHardSortDragStart(event,'${jsq(c.id)}')" ${click}><span>${esc(c.text)}</span>${result}</button>`;
}
function shHardSortCorrectAnswerHtml(x,cards){
  const cats=x?.payload?.categories||[];
  const groups=cats.map(cat=>{
    const items=cards.filter(c=>c.category===cat.id);
    return `<div class="sh-hard-sort-answer-col"><div class="sh-hard-sort-answer-head"><span>${esc(cat.icon||'')}</span><b>${esc(cat.title)}</b><small>${items.length}</small></div><div class="sh-hard-sort-answer-list">${items.map(c=>`<div class="sh-hard-sort-answer-item"><span>✓</span><div>${esc(c.text)}</div></div>`).join('')}</div></div>`;
  }).join('');
  return `<div class="sh-hard-sort-answer"><div class="sh-hard-sort-answer-title"><span>✅</span><div><b>Правильное распределение карточек</b><p>Так операции должны быть распределены по процедуре.</p></div></div><div class="sh-hard-sort-answer-grid">${groups}</div></div>`;
}
function renderHardSort(){
  const r=S.currentRun;if(!r||r.type!=='hard-sort')return;
  const x=r.x,cats=x.payload.categories||[],cards=r.cards||[];
  const placedCount=Object.keys(r.placements).length,total=cards.length;
  const pool=cards.filter(c=>!r.placements[c.id]);
  const selectedCard=r.selected?shHardSortCard(r.selected):null;
  const instruction=x.payload.instruction||'Распределите карточки по двум категориям.';
  const zones=cats.map(cat=>{
    const inside=cards.filter(c=>r.placements[c.id]===cat.id);
    return `<section class="sh-hard-sort-zone" ondragover="event.preventDefault()" ondrop="shHardSortDrop(event,'${jsq(cat.id)}')" onclick="shHardSortPlaceSelected('${jsq(cat.id)}')"><div class="sh-hard-sort-zone-head"><span>${esc(cat.icon||'')}</span><div><h3>${esc(cat.title)}</h3>${cat.hint?`<p>${esc(cat.hint)}</p>`:''}</div><b>${inside.length}</b></div><div class="sh-hard-sort-zone-body">${inside.length?inside.map(c=>shHardSortCardHtml(c,cat.id)).join(''):`<div class="sh-hard-sort-empty">Перетащите карточку сюда${selectedCard?' или нажмите на область':''}</div>`}</div></section>`;
  }).join('');
  const source=shHardSortSource(x);
  let result='';
  if(r.checked){
    const correct=cards.filter(c=>r.placements[c.id]===c.category).length;
    const pct=Math.round(correct/Math.max(1,total)*100);
    result=`<div class="sh-hard-sort-result ${pct===100?'perfect':''}"><strong>${pct}%</strong><div><b>${correct} из ${total} карточек распределены верно</b><p>${pct===100?'Отлично: все операции классифицированы правильно.':'Карточки с ошибками отмечены красным — под ними показана правильная категория.'}</p></div></div>`;
  }
  const correctAnswer=r.checked?shHardSortCorrectAnswerHtml(x,cards):'';
  const sourceCard=r.checked&&source.path?`<div class="skill-card procedure-card sh-hard-sort-source"><b>📚 Взято из процедуры</b><br><strong>${esc(source.name)}</strong><div class="small" style="margin-top:6px">${esc(source.path)}</div></div>`:'';
  $('page-run').innerHTML=`<div class="sh-hard-sort-wrap"><div class="card sh-hard-sort-shell"><div class="actions sh-hard-sort-top"><button class="btn secondary" onclick="go('training')">← Выйти</button><b>${esc(x.title)}</b><span class="muted small">${placedCount}/${total}</span></div><div class="progress"><span style="width:${(r.checked?100:placedCount/Math.max(1,total)*100)}%"></span></div><div class="sh-hard-sort-intro"><span class="pill">Карточки</span><h2>${esc(x.payload.question||x.title)}</h2><p>${esc(instruction)}</p>${!r.checked?`<div class="sh-hard-sort-tip">На компьютере — перетащите карточку. На телефоне — нажмите на карточку, затем на нужную колонку.</div>`:''}</div>${result}<div class="sh-hard-sort-pool"><div class="sh-hard-sort-pool-head"><b>${r.checked?'Результат':'Карточки для распределения'}</b>${!r.checked&&selectedCard?`<span>Выбрано: ${esc(selectedCard.text)}</span>`:''}</div><div class="sh-hard-sort-pool-body">${pool.length?pool.map(c=>shHardSortCardHtml(c)).join(''):(r.checked?'':'<div class="sh-hard-sort-empty">Все карточки распределены</div>')}</div></div><div class="sh-hard-sort-grid">${zones}</div>${correctAnswer}${sourceCard}<div class="actions" style="justify-content:flex-end;margin-top:16px">${r.checked?`<button class="btn primary" onclick="go('training')">Готово</button>`:`<button class="btn primary" ${placedCount<total?'disabled':''} onclick="checkHardSort()">Проверить</button>`}</div></div></div>`;
}
function checkHardSort(){
  const r=S.currentRun;if(!r||r.type!=='hard-sort'||r.checked)return;
  const cards=r.cards||[],total=cards.length,placed=Object.keys(r.placements).length;
  if(placed<total){toast(`Распределите все карточки: осталось ${total-placed}`);return}
  r.checked=true;
  const cats=r.x.payload.categories||[];
  const correct=cards.filter(c=>r.placements[c.id]===c.category).length;
  const pct=Math.round(correct/Math.max(1,total)*100);
  if(!r.recorded){
    const details=cards.map((c,idx)=>{const selected=r.placements[c.id],right=c.category;return {kind:'hard-sort',content_id:r.x.id||null,title:r.x.title||'',step:idx+1,question:c.text,options:cats.map(k=>k.title),selected:Math.max(0,cats.findIndex(k=>k.id===selected)),correct:Math.max(0,cats.findIndex(k=>k.id===right)),is_correct:selected===right,explanation:`Правильная категория: ${shHardSortCategory(r.x,right)?.title||''}`}});
    recordAttempt({section:r.x.section,topic:r.x.topic,score:pct,type:'hardcase',cpm:0,details});r.recorded=true;
  }
  renderHardSort();
}

// Keep the material in Hard Skills, but render this one case as a card-sort exercise.
const shHardSortStartContentBase=startContent;
startContent=function(id){const x=S.content.find(c=>c.id===id);if(shHardSortIsCase(x)){startHardSort(x);return}return shHardSortStartContentBase(id)};

// Friendly label in the Hard Skills material list.
const shHardSortOpenSectionBase=openSection;
openSection=function(sec,...args){
  if(sec!=='hard')return shHardSortOpenSectionBase(sec,...args);
  const arr=S.content.filter(x=>x.section===sec&&x.status==='published'),topics=[...new Set(arr.map(x=>x.topic))];
  showModal(`<div class="modal-head"><div><h2>${secName(sec)}</h2><div class="muted small">Выберите тему или конкретный материал</div></div><button class="btn secondary" onclick="closeModal()">✕</button></div><div class="topic-grid">${topics.map(t=>{const p=topicProgress(sec,t);return `<button class="topic" onclick="closeModal();startTopic('${sec}','${jsq(t)}')">${esc(t)}<small>Пройдено ${p.done} из ${p.total} · умная выдача</small></button>`}).join('')}</div><div class="section-title"><h2>Материалы</h2></div>${arr.map(x=>`<div class="content-row"><div><span class="pill">${x.type==='dialogue'?'Диалог':shHardSortIsCase(x)?'Карточки':x.type==='hardcase'?'Hard-кейс':'Кейс'}</span><b>${esc(x.title||x.question)}</b><div class="meta">${esc(x.topic)}${seenContentMap().has(x.id)?' · ✓ пройден':' · ещё не пройден'}</div></div><button class="btn secondary" onclick="closeModal();startContent('${x.id}')">Начать</button></div>`).join('')||'<p class="muted">Пока пусто.</p>'}`)
};

/* ===== SkillHub HARD topic flow + mixed flow ===== */
let shHardFlow=null;
let shHardFlowLaunching=false;

function shHardFlowItems(topic=''){
  return S.content.filter(x=>x.status==='published'&&x.section==='hard'&&x.type!=='manual'&&(!topic||x.topic===topic));
}
function shHardFlowShuffle(arr){
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
  return a;
}
function shHardFlowQueue(topic='',mixed=false){
  const arr=shHardFlowItems(topic),seen=seenContentMap();
  const unseen=arr.filter(x=>!seen.has(x.id));
  const base=unseen.length?unseen:arr;
  return (mixed?shHardFlowShuffle(base):base).map(x=>x.id);
}
function shHardFlowLaunch(id){
  if(!id)return;
  shHardFlowLaunching=true;
  try{startContent(id)}finally{shHardFlowLaunching=false}
}
function shHardFlowStartTopic(topic){
  const queue=shHardFlowQueue(topic,false);
  if(!queue.length){toast('В этом блоке пока нет опубликованных материалов');return}
  shHardFlow={mode:'topic',section:'hard',topic,queue,index:0};
  closeModal();shHardFlowLaunch(queue[0]);
}
function shHardFlowStartMix(){
  const queue=shHardFlowQueue('',true);
  if(!queue.length){toast('В Hard Skills пока нет опубликованных материалов');return}
  shHardFlow={mode:'mix',section:'hard',topic:'',queue,index:0};
  closeModal();shHardFlowLaunch(queue[0]);
}
function shHardFlowStartSingle(id){
  shHardFlow=null;closeModal();shHardFlowLaunch(id);
}
function shHardFlowNext(){
  if(!shHardFlow)return shHardFlowBack();
  let i=shHardFlow.index+1;
  while(i<shHardFlow.queue.length){
    const id=shHardFlow.queue[i],x=S.content.find(c=>c.id===id&&c.status==='published');
    if(x){shHardFlow.index=i;shHardFlowLaunch(id);return}
    i++;
  }
  shHardFlowBack();
}
function shHardFlowBack(){
  shHardFlow=null;go('training');setTimeout(()=>openSection('hard'),0);
}
function shHardFlowFinishTraining(){
  shHardFlow=null;go('training');
}
function shHardFlowTopics(){
  return [...new Set(shHardFlowItems().map(x=>x.topic).filter(Boolean))];
}
function shHardFlowNextIncompleteTopic(current){
  const topics=shHardFlowTopics();
  if(topics.length<2)return '';
  const start=Math.max(0,topics.indexOf(current));
  for(let step=1;step<topics.length;step++){
    const topic=topics[(start+step)%topics.length],p=topicProgress('hard',topic);
    if(p.total>0&&p.done<p.total)return topic;
  }
  return '';
}
function shHardFlowGoNextTopic(){
  const f=shHardFlow;if(!f||f.mode!=='topic'){shHardFlowBack();return}
  const next=shHardFlowNextIncompleteTopic(f.topic);
  if(!next){shHardFlowFinishTraining();return}
  shHardFlowStartTopic(next);
}
function shHardFlowOpenTopic(topic){
  const arr=shHardFlowItems(topic),p=topicProgress('hard',topic),seen=seenContentMap();
  const label=p.done===0?'Начать блок':p.done<p.total?'Продолжить блок':'Пройти блок заново';
  showModal(`<div class="modal-head"><div><h2>${esc(topic)}</h2><div class="muted small">Hard Skills · пройдено ${p.done} из ${p.total}</div></div><button class="btn secondary" onclick="closeModal()">✕</button></div>
  <div class="sh-hard-topic-hero"><div><b>Проходите блок последовательно</b><p>После каждого кейса появится кнопка «Следующий кейс», поэтому возвращаться в меню не придётся.</p></div><button class="btn primary" onclick="shHardFlowStartTopic('${jsq(topic)}')">${label} →</button></div>
  <div class="section-title"><h2>Материалы блока</h2></div>${arr.map(x=>`<div class="content-row"><div><span class="pill">${x.type==='dialogue'?'Диалог':shHardSortIsCase(x)?'Карточки':x.type==='hardcase'?'Hard-кейс':'Кейс'}</span><b>${esc(x.title||x.question)}</b><div class="meta">${seen.has(x.id)?'✓ пройден':'ещё не пройден'}</div></div><button class="btn secondary" onclick="shHardFlowStartSingle('${x.id}')">Открыть</button></div>`).join('')||'<p class="muted">Пока пусто.</p>'}`);
}
function shHardFlowCompletionMeta(){
  const f=shHardFlow;if(!f)return '';
  if(f.mode==='topic'){
    const p=topicProgress('hard',f.topic),done=f.index>=f.queue.length-1;
    return `<div class="sh-hard-flow-meta ${done?'is-complete':''}"><b>${done?'✓ Блок пройден · ':''}${esc(f.topic)}</b><span>Пройдено ${p.done} из ${p.total}</span></div>`;
  }
  return `<div class="sh-hard-flow-meta"><b>Микс Hard Skills</b><span>${Math.min(f.index+1,f.queue.length)} из ${f.queue.length}</span></div>`;
}
function shHardFlowCompletionButtons(){
  const f=shHardFlow;
  if(!f)return `<button class="btn primary" onclick="shHardFlowBack()">К Hard Skills</button>`;
  const hasNext=f.index<f.queue.length-1;
  if(f.mode==='topic'){
    if(hasNext)return `<button class="btn primary" onclick="shHardFlowNext()">Следующий кейс →</button><button class="btn secondary" onclick="shHardFlowOpenTopic('${jsq(f.topic)}')">К блоку</button>`;
    const nextTopic=shHardFlowNextIncompleteTopic(f.topic);
    if(nextTopic)return `<button class="btn primary" onclick="shHardFlowGoNextTopic()">Следующий блок: ${esc(nextTopic)} →</button><button class="btn secondary" onclick="shHardFlowFinishTraining()">Завершить</button>`;
    return `<button class="btn primary" onclick="shHardFlowFinishTraining()">Все Hard Skills пройдены ✓</button><button class="btn secondary" onclick="shHardFlowStartMix()">Повторить вразброс</button>`;
  }
  return hasNext
    ? `<button class="btn primary" onclick="shHardFlowNext()">Следующий случайный кейс →</button><button class="btn secondary" onclick="shHardFlowFinishTraining()">Завершить</button>`
    : `<button class="btn primary" onclick="shHardFlowFinishTraining()">Микс завершён ✓</button>`;
}

const shHardFlowStartContentBase=startContent;
startContent=function(id){
  if(!shHardFlowLaunching)shHardFlow=null;
  return shHardFlowStartContentBase(id);
};

const shHardFlowStartTopicBase=startTopic;
startTopic=function(sec,topic){
  if(sec==='hard')return shHardFlowStartTopic(topic);
  return shHardFlowStartTopicBase(sec,topic);
};

const shHardFlowOpenSectionBase=openSection;
openSection=function(sec,...args){
  if(sec!=='hard')return shHardFlowOpenSectionBase(sec,...args);
  const arr=shHardFlowItems(),topics=[...new Set(arr.map(x=>x.topic))];
  showModal(`<div class="modal-head"><div><h2>Hard Skills</h2><div class="muted small">Выберите отдельный блок или тренировку вразброс</div></div><button class="btn secondary" onclick="closeModal()">✕</button></div>
  <div class="sh-hard-mode-row"><div class="sh-hard-mode-copy"><span>🎲</span><div><b>Вразброс по всем блокам</b><small>SkillHub будет выдавать непройденные кейсы из разных тем в случайном порядке.</small></div></div><button class="btn primary" onclick="shHardFlowStartMix()">Начать микс →</button></div>
  <div class="section-title"><h2>По отдельным блокам</h2><span class="muted small">Нажмите на блок, чтобы пройти его последовательно</span></div>
  <div class="topic-grid">${topics.map(t=>{const p=topicProgress('hard',t);return `<button class="topic" onclick="shHardFlowOpenTopic('${jsq(t)}')">${esc(t)}<small>Пройдено ${p.done} из ${p.total} · открыть блок</small></button>`}).join('')}</div>
  <div class="section-title"><h2>Все материалы</h2><span class="muted small">Можно запустить один конкретный кейс</span></div>
  ${arr.map(x=>`<div class="content-row"><div><span class="pill">${x.type==='dialogue'?'Диалог':shHardSortIsCase(x)?'Карточки':x.type==='hardcase'?'Hard-кейс':'Кейс'}</span><b>${esc(x.title||x.question)}</b><div class="meta">${esc(x.topic)}${seenContentMap().has(x.id)?' · ✓ пройден':' · ещё не пройден'}</div></div><button class="btn secondary" onclick="shHardFlowStartSingle('${x.id}')">Начать</button></div>`).join('')||'<p class="muted">Пока пусто.</p>'}`);
};

finishDialogue=function(){
  const r=S.currentRun;if(!r||r.finished)return;r.finished=true;const x=r.x,isNew=!!x.payload?.scenario,total=isNew?1:(x.steps||[]).length;
  const p=Math.round(r.score/Math.max(1,total)*100);
  try{recordAttempt({section:x.section,topic:x.topic,score:p,type:'dialogue',cpm:0,details:r.details||[]})}catch(e){console.error('finishDialogue save failed',e);toast('Кейс завершён. Результат не удалось сохранить локально, но можно продолжать.')}
  const blockDone=!!(shHardFlow&&shHardFlow.mode==='topic'&&shHardFlow.index>=shHardFlow.queue.length-1);
  const title=blockDone?`Блок «${esc(shHardFlow.topic)}» пройден`:'Диалог завершён';
  $('page-run').innerHTML=`<div class="card sh-hard-flow-finish" style="max-width:650px;margin:auto;text-align:center"><strong style="font-size:52px">${p}%</strong><h2>${title}</h2><p class="muted">${r.score} из ${total} правильных решений</p>${shHardFlowCompletionMeta()}<div class="sh-hard-flow-actions">${shHardFlowCompletionButtons()}</div></div>`;
};

finishQuiz=function(){
  const r=S.currentRun;if(!r||r.finished)return;r.finished=true;const p=Math.round(r.score/Math.max(1,r.items.length)*100);
  try{recordAttempt({section:r.sec,topic:r.topic,score:p,type:'quiz',cpm:0,details:r.details||[]})}catch(e){console.error('finishQuiz save failed',e);toast('Кейс завершён. Результат не удалось сохранить локально, но можно продолжать.')}
  const blockDone=!!(shHardFlow&&shHardFlow.mode==='topic'&&shHardFlow.index>=shHardFlow.queue.length-1);
  const title=blockDone?`Блок «${esc(shHardFlow.topic)}» пройден`:'Тренировка завершена';
  $('page-run').innerHTML=`<div class="card sh-hard-flow-finish" style="max-width:650px;margin:auto;text-align:center"><strong style="font-size:52px">${p}%</strong><h2>${title}</h2><p class="muted">${r.score} из ${r.items.length} правильных решений</p>${shHardFlowCompletionMeta()}<div class="sh-hard-flow-actions">${shHardFlowCompletionButtons()}</div></div>`;
};

const shHardFlowRenderSortBase=renderHardSort;
renderHardSort=function(){
  shHardFlowRenderSortBase();
  const r=S.currentRun;if(!r||r.type!=='hard-sort'||!r.checked)return;
  const shell=document.querySelector('#page-run .sh-hard-sort-shell');if(!shell)return;
  const actions=[...shell.querySelectorAll(':scope > .actions')].pop();
  if(actions){actions.classList.add('sh-hard-flow-actions');actions.innerHTML=shHardFlowCompletionButtons()}
  const result=shell.querySelector('.sh-hard-sort-result');
  if(result&&!shell.querySelector('.sh-hard-flow-meta'))result.insertAdjacentHTML('afterend',shHardFlowCompletionMeta());
};
/* ===== end HARD topic flow + mixed flow ===== */

/* ===== SkillHub 7.5.1 — premium conversion home CTA ===== */
function sh751TrainVisual(){
  return `<svg class="sh751-visual-svg sh751-target-svg" viewBox="0 0 300 230" role="img" aria-label="Мишень со стрелой">
    <defs>
      <filter id="sh752TargetShadow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="12" stdDeviation="10" flood-color="#7a5a00" flood-opacity=".20"/></filter>
      <filter id="sh753ArrowShadow" x="-40%" y="-50%" width="190%" height="210%"><feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="#111827" flood-opacity=".28"/></filter>
      <linearGradient id="sh752Gold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff178"/><stop offset=".45" stop-color="#ffd522"/><stop offset="1" stop-color="#e7a600"/></linearGradient>
      <linearGradient id="sh752Blue" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#7f91ff"/><stop offset="1" stop-color="#3357f4"/></linearGradient>
      <linearGradient id="sh753ArrowMetal" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#151922"/><stop offset=".48" stop-color="#444c59"/><stop offset="1" stop-color="#171b21"/></linearGradient>
      <linearGradient id="sh753FeatherBlue" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#7890ff"/><stop offset="1" stop-color="#3658f5"/></linearGradient>
      <radialGradient id="sh752TargetBase" cx="35%" cy="27%" r="78%"><stop stop-color="#fffef7"/><stop offset="1" stop-color="#ece5d0"/></radialGradient>
    </defs>
    <ellipse cx="146" cy="204" rx="88" ry="16" fill="#947100" opacity=".11"/>
    <g class="sh752-target-float">
      <circle cx="145" cy="120" r="78" fill="url(#sh752TargetBase)" stroke="#fff" stroke-width="5"/>
      <circle cx="145" cy="120" r="64" fill="url(#sh752Gold)"/>
      <circle cx="145" cy="120" r="46" fill="#fff8dc"/>
      <circle cx="145" cy="120" r="29" fill="url(#sh752Blue)"/>
      <circle class="sh752-center-pulse" cx="145" cy="120" r="12" fill="url(#sh752Gold)"/>
      <path d="M99 78 A65 65 0 0 1 133 58" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" opacity=".22"/>

      <!-- Arrow: tip is exactly at the target center (145,120). The full arrow is a single rigid group,
           so the shaft stays perfectly straight and both tail feathers remain symmetric. -->
      <g transform="rotate(-36.6 145 120)" filter="url(#sh753ArrowShadow)">
        <!-- straight shaft -->
        <line x1="160" y1="120" x2="250" y2="120" stroke="url(#sh753ArrowMetal)" stroke-width="8" stroke-linecap="round"/>
        <line x1="164" y1="117.8" x2="247" y2="117.8" stroke="#8f98a5" stroke-width="2" stroke-linecap="round" opacity=".55"/>

        <!-- arrowhead: the point is exactly the centre of the bullseye -->
        <path d="M145 120 L166 107 L166 133 Z" fill="url(#sh752Blue)"/>
        <path d="M148 120 L164 111 L164 117 Z" fill="#a7b5ff" opacity=".55"/>

        <!-- symmetric fletching, mirrored around the shaft -->
        <path d="M231 116 L252 101 L260 104 L247 120 L231 120 Z" fill="url(#sh753FeatherBlue)"/>
        <path d="M231 124 L252 139 L260 136 L247 120 L231 120 Z" fill="url(#sh753FeatherBlue)"/>
        <path d="M235 116.5 L252 105 L256 106.5 L246 117.8 Z" fill="#9aabff" opacity=".35"/>
        <path d="M235 123.5 L252 135 L256 133.5 L246 122.2 Z" fill="#2446d9" opacity=".35"/>
      </g>
    </g>
    <g class="sh752-spark"><path d="M246 101 l4 7 7 4-7 4-4 7-4-7-7-4 7-4z" fill="#ffd522"/></g>
    <g class="sh752-dot"><circle cx="265" cy="134" r="4.5" fill="#4b68ff"/><circle cx="278" cy="118" r="2.8" fill="#ffd522"/></g>
  </svg>`;
}
function sh751GameVisual(){
  return `<svg class="sh751-visual-svg sh751-game-svg" viewBox="0 0 320 230" role="img" aria-label="Современный игровой геймпад">
    <defs>
      <filter id="sh752PadShadow" x="-40%" y="-55%" width="190%" height="230%"><feDropShadow dx="0" dy="14" stdDeviation="11" flood-color="#000" flood-opacity=".48"/></filter>
      <filter id="sh752Glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="8" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <linearGradient id="sh752Pad" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#49515e"/><stop offset=".34" stop-color="#252b34"/><stop offset="1" stop-color="#090b0f"/></linearGradient>
      <linearGradient id="sh752PadEdge" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#737d8a"/><stop offset="1" stop-color="#14181e"/></linearGradient>
      <linearGradient id="sh752Gold2" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff17b"/><stop offset=".42" stop-color="#ffd522"/><stop offset="1" stop-color="#eea600"/></linearGradient>
      <linearGradient id="sh752Violet" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#9c83ff"/><stop offset="1" stop-color="#5d55ff"/></linearGradient>
      <linearGradient id="sh752BlueGlow" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#6ba0ff"/><stop offset="1" stop-color="#5864ff"/></linearGradient>
    </defs>
    <ellipse cx="165" cy="201" rx="103" ry="17" fill="#000" opacity=".27"/>
    <g class="sh752-game-halo" opacity=".7">
      <circle cx="172" cy="111" r="81" fill="none" stroke="url(#sh752Violet)" stroke-width="3" stroke-dasharray="7 11" opacity=".33"/>
      <circle cx="172" cy="111" r="67" fill="none" stroke="#ffd522" stroke-width="2" opacity=".12"/>
    </g>
    <g class="sh752-game-lines" opacity=".72">
      <path d="M59 66 h23" stroke="#7464ff" stroke-width="6" stroke-linecap="round"/>
      <path d="M261 67 h16" stroke="#ffd522" stroke-width="5" stroke-linecap="round"/>
      <circle cx="277" cy="120" r="4.5" fill="#6f62ff"/>
      <path d="M71 142 l6 10 10 6-10 6-6 10-6-10-10-6 10-6z" fill="#ffd522"/>
    </g>
    <g class="sh752-pad-float">
      <path d="M70 83 C83 64 107 59 134 66 C151 70 169 70 188 66 C216 59 240 65 252 84 C266 107 273 145 262 168 C254 185 237 188 221 173 L194 148 C183 138 173 133 160 133 C147 133 137 138 126 148 L98 174 C82 189 65 184 58 166 C48 143 56 104 70 83 Z" fill="url(#sh752Pad)" stroke="url(#sh752PadEdge)" stroke-width="4"/>
      <path d="M84 83 C105 69 128 75 146 82" fill="none" stroke="#a0a8b4" stroke-width="4" stroke-linecap="round" opacity=".20"/>
      <path d="M193 79 C214 71 233 76 244 88" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".09"/>
      <g>
        <rect x="91" y="99" width="50" height="16" rx="8" fill="#0d1117"/>
        <rect x="108" y="82" width="16" height="50" rx="8" fill="#0d1117"/>
        <rect x="95" y="102" width="42" height="10" rx="5" fill="url(#sh752Gold2)"/>
        <rect x="111" y="86" width="10" height="42" rx="5" fill="url(#sh752Gold2)"/>
      </g>
      <g>
        <circle cx="218" cy="92" r="10" fill="url(#sh752Gold2)"/>
        <circle cx="240" cy="109" r="10" fill="#f2b317"/>
        <circle cx="217" cy="127" r="10" fill="#ffd938"/>
        <circle cx="242" cy="82" r="9" fill="#fff08a"/>
        <circle cx="215" cy="89" r="3" fill="#fffbd0" opacity=".8"/>
      </g>
      <g>
        <circle cx="143" cy="127" r="15" fill="#0d1117" stroke="#65707d" stroke-width="3"/>
        <circle cx="143" cy="127" r="8.5" fill="#343b45"/>
        <circle cx="178" cy="127" r="15" fill="#0d1117" stroke="#65707d" stroke-width="3"/>
        <circle cx="178" cy="127" r="8.5" fill="#343b45"/>
      </g>
      <rect x="150" y="92" width="14" height="5" rx="2.5" fill="#8a94a1"/>
      <rect x="172" y="92" width="14" height="5" rx="2.5" fill="#8a94a1"/>
      <path d="M84 155 C99 174 113 169 128 153" fill="none" stroke="#313843" stroke-width="4" opacity=".45"/>
      <path d="M193 153 C210 169 226 176 240 156" fill="none" stroke="#313843" stroke-width="4" opacity=".45"/>
    </g>
  </svg>`;
}
function sh751PremiumHomeHtml(){
  const rework = S.profile?.role==='employee' ? (sh745ReworkBannerHtml?.(true)||'') : '';
  return `<div class="sh751-home-wrap">
    <section class="sh751-stage">
      <div class="sh751-stage-glow"></div>
      <header class="sh751-head">
        <div class="sh751-kicker">SKILLHUB</div>
        <h1>Привет, ${esc(sh74Name())}! <span aria-hidden="true">👋</span></h1>
        <h2>Что выбираете сегодня?</h2>
        <p>Выберите формат — практика или игра.</p>
      </header>
      <div class="sh751-grid">
        <article class="sh751-card sh751-card-train" role="button" tabindex="0" onclick="go('training')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();go('training')}">
          <div class="sh751-copy">
            <h3>Потренироваться</h3>
            <p>Прокачай навыки на реальных рабочих кейсах.</p>
            <button class="sh751-cta sh751-cta-train" onclick="event.stopPropagation();go('training')">Прокачаться <span>→</span></button>
          </div>
          <div class="sh751-art">${sh751TrainVisual()}</div>
        </article>
        <article class="sh751-card sh751-card-game" role="button" tabindex="0" onclick="window.open(MASTER_LINE_URL,'_blank','noopener,noreferrer')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();window.open(MASTER_LINE_URL,'_blank','noopener,noreferrer')}">
          <div class="sh751-copy">
            <h3>Поиграть</h3>
            <p>Брось себе вызов и побей свой лучший результат.</p>
            <a class="sh751-cta sh751-cta-game" href="${MASTER_LINE_URL}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">Играть <span>→</span></a>
          </div>
          <div class="sh751-art sh751-art-game">${sh751GameVisual()}</div>
        </article>
      </div>
    </section>
    ${rework ? `<div class="sh751-under-stage">${rework}</div>` : ''}
  </div>`;
}
function sh751ApplyPremiumHome(){
  const page=$('page-home'); if(!page)return;
  page.classList.add('sh751-premium-home');
  page.innerHTML=sh751PremiumHomeHtml();
}
const sh751RenderHomeBase=renderHome;
renderHome=function(){
  sh751RenderHomeBase();
  if(S.profile)sh751ApplyPremiumHome();
};
/* ===== end SkillHub 7.5.1 ===== */
