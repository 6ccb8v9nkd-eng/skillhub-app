console.info('SkillHub build 20260924_v8.17_restore_original_rg');
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
function subscribeRealtime(){if(S.subscription)S.sb.removeChannel(S.subscription);S.subscription=S.sb.channel('skillhub-live').on('postgres_changes',{event:'*',schema:'public',table:'content'},()=>onCloudChange('Обновлены материалы')).on('postgres_changes',{event:'*',schema:'public',table:'assignments'},()=>onCloudChange('Обновлены задания')).on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications'},p=>onCloudChange(p.new?.title||'Новое уведомление')).on('postgres_changes',{event:'*',schema:'public',table:'manual_answers'},p=>onCloudChange(p.new?.status==='submitted'?'Новая работа на проверку':'Обновлена ручная работа')).subscribe()}
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
  const src=String(text||'').replace(/\\+n/g,'\n').replace(/\r/g,'').trim();
  if(!src)return null;

  // V8.30: current Soft explanation format used in the content database.
  // Keep this parser before the legacy formats so each section can render as its own card.
  const modernCheck=(src.match(/🎯\s*ЧТО ПРОВЕРЯЕМ\s*\n+([\s\S]*?)(?=\n+✅\s*ПОЧЕМУ СИЛЬНЕЕ|\n+⚠️\s*ЧТО СЛАБЕЕ|\n+📌\s*(?:ПО ОКК|КРИТЕРИИ ОЦЕНКИ КАЧЕСТВА)|$)/i)||[])[1]?.trim()||'';
  const modernBest=(src.match(/✅\s*ПОЧЕМУ СИЛЬНЕЕ\s*\n+([\s\S]*?)(?=\n+⚠️\s*ЧТО СЛАБЕЕ|\n+📌\s*(?:ПО ОКК|КРИТЕРИИ ОЦЕНКИ КАЧЕСТВА)|$)/i)||[])[1]?.trim()||'';
  const modernWeak=(src.match(/⚠️\s*ЧТО СЛАБЕЕ(?:\s+В\s+ДРУГИХ)?\s*\n+([\s\S]*?)(?=\n+📌\s*(?:ПО ОКК|КРИТЕРИИ ОЦЕНКИ КАЧЕСТВА)|$)/i)||[])[1]?.trim()||'';
  const modernOkk=(src.match(/📌\s*(?:ПО ОКК|КРИТЕРИИ ОЦЕНКИ КАЧЕСТВА)\s*\n+([\s\S]*)$/i)||[])[1]?.trim()||'';
  if(modernCheck||modernBest||modernWeak||modernOkk){
    return {
      softPsych:{skill:modernCheck,emotion:'',need:'',best:modernBest,others:modernWeak,okk:modernOkk,modern:true},
      correct:{blocks:[]},wrong:[],skill:modernCheck,raw:src
    };
  }

  const psychSkill=(src.match(/🎯\s*ЧТО ПРОВЕРЯЕМ:\s*([^\n]+)/i)||[])[1]?.trim()||'';
  const emotion=(src.match(/Эмоция клиента:\s*([^\n]+)/i)||[])[1]?.trim().replace(/[.]+$/,'')||'';
  const need=(src.match(/Потребность клиента:\s*([^\n]+)/i)||[])[1]?.trim().replace(/[.]+$/,'')||'';
  const bestMatch=src.match(/✅\s*ПОЧЕМУ ЭТО ЛУЧШИЙ ВАРИАНТ\s*\n+([\s\S]*?)(?=\n+⚖️\s*ПОЧЕМУ ДРУГИЕ ВАРИАНТЫ|$)/i);
  const othersMatch=src.match(/⚖️\s*ПОЧЕМУ ДРУГИЕ ВАРИАНТЫ[^\n]*\s*\n+([\s\S]*)$/i);
  if(psychSkill||emotion||need||bestMatch||othersMatch){
    return {
      softPsych:{
        skill:psychSkill,
        emotion,
        need,
        best:(bestMatch?.[1]||'').trim(),
        others:(othersMatch?.[1]||'').trim()
      },
      correct:{blocks:[]},
      wrong:[],
      skill:psychSkill,
      raw:src
    };
  }

  const skill=(src.match(/🎯\s*КЛЮЧЕВОЙ НАВЫК:\s*([^\n]+)/i)||[])[1]?.trim()||'';
  const procedurePath=(src.match(/📍\s*ГДЕ ПРОВЕРИТЬ\s*\n([^\n]+)/i)||[])[1]?.trim()||'';
  let procedureName='';
  if(procedurePath){
    const quoted=procedurePath.match(/Процедура\s*[«\"]([^»\"]+)[»\"]/i);
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

const psych=e.softPsych||null;
const softReview=psych?`<div class="sh-soft-review">
  <div class="sh-soft-review-head">
    <span>Разбор ответа</span>
    ${psych.skill?`<b>🎯 ${esc(psych.skill)}</b>`:''}
  </div>
  <div class="sh-soft-signals">
    <div class="sh-soft-signal"><span>Эмоция клиента</span><strong>${esc(psych.emotion||'—')}</strong></div>
    <div class="sh-soft-signal"><span>Что ему важно</span><strong>${esc(psych.need||'—')}</strong></div>
  </div>
  ${psych.best?`<div class="sh-soft-best"><div class="sh-soft-card-title">✓ Почему этот ответ точнее</div><p>${esc(psych.best)}</p></div>`:''}
  ${psych.others?`<div class="sh-soft-others"><div class="sh-soft-card-title">↔ А что с другими вариантами?</div><p>${esc(psych.others)}</p></div>`:''}
</div>`:'';

const isHard=String(x.section||'').toLowerCase()==='hard';
const procedurePath=e.procedurePath||e.source?.path||'';
const procedureName=e.procedureName||e.source?.name||'';
const sourceCard=psych?'':(isHard&&procedurePath?`<div class="skill-card procedure-card"><b>📚 Взято из процедуры</b><br><strong>${esc(procedureName||'Процедура')}</strong><div class="small" style="margin-top:6px">${esc(procedurePath)}</div></div>`:(!isHard&&e.skill?`<div class="skill-card"><b>🎯 Главный навык</b><br>${esc(e.skill)}</div>`:''));
const fallback=(!psych&&!correctBlocks&&!wrongBlocks&&!sourceCard&&legacyExplanation)?`<div class="explain">${esc(String(legacyExplanation).replace(/\\+n/g,'\n')).replace(/\n/g,'<br>')}</div>`:'';
const total=isNew?1:(x.steps||[]).length,isLast=r.i>=total-1;
$('runFeedback').innerHTML=`${softReview}${!psych&&correctBlocks?`<div class="review-title success">✅ Почему выбранный ответ правильный</div><div>${correctBlocks}</div>`:''}${!psych&&wrongBlocks?`<div class="review-title danger">❌ Почему другие варианты не подходят</div><div>${wrongBlocks}</div>`:''}${sourceCard}${fallback}<div class="actions" style="justify-content:flex-end;margin-top:14px"><button id="dialogueAdvanceBtn" type="button" class="btn primary sh-run-advance">${isLast?'Завершить кейс →':'Продолжить'}</button></div>`;
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
  for(const r of cases){const answers=[1,2,3,4].map(i=>String(r['Ответ '+i]||'').trim());if(answers.some(x=>!x))continue;const audience=String(r['Кому']||'ALL').split(',').map(x=>x.trim()).filter(Boolean);const row={type:String(r['Тип']||'quiz'),status:String(r['Статус']||'draft'),section:String(r['Раздел']||'soft'),topic:String(r['Тема']||'Общий'),difficulty:String(r['Сложность']||'Средний'),title:String(r['Заголовок']||''),payload:{question:String(r['Вопрос']||''),answers,correct:Math.max(0,Number(r['Правильный ответ']||1)-1),explanation:String(r['Объяснение']||'')},audience,created_by:S.user.id,updated_at:new Date().toISOString()};if(String(r['ID']||'').match(/^[0-9a-f-]{36}$/i))row.id=r['ID'];const {data,error}=await S.sb.from('content').upsert(row).select().single();if(error)throw error}
  const stepRows=sheets['Шаги диалогов']||[];for(const r of dialogs){const did=String(r['ID диалога']).trim(),steps=stepRows.filter(s=>String(s['ID диалога']).trim()===did).sort((a,b)=>Number(a['Шаг'])-Number(b['Шаг'])).map(s=>({client:String(s['Реплика клиента']||''),options:[1,2,3].map(i=>String(s['Ответ '+i]||'')),correct:Math.max(0,Number(s['Правильный ответ']||1)-1),next_client:String(s['Следующая реплика клиента']||''),explanation:String(s['Объяснение']||'')}));if(!steps.length)continue;const audience=String(r['Кому']||'ALL').split(',').map(x=>x.trim()).filter(Boolean);const row={type:'dialogue',status:String(r['Статус']||'draft'),section:String(r['Раздел']||'needs'),topic:String(r['Тема']||'Общий'),difficulty:'Средний',title:String(r['Название']||did),payload:{description:String(r['Описание']||''),steps},audience,created_by:S.user.id,updated_at:new Date().toISOString()};if(did.match(/^[0-9a-f-]{36}$/i))row.id=did;const {error}=await S.sb.from('content').upsert(row);if(error)throw error}
  for(const r of assignments){let rec=String(r['Кому']||'ALL').split(',').map(x=>x.trim()).filter(Boolean);if(S.profile.role==='mentor'&&rec.includes('ALL'))rec=S.allowed.filter(x=>x.active&&x.role==='employee').map(x=>x.login);const row={title:String(r['Название']),content_id:String(r['ID материала']||'').match(/^[0-9a-f-]{36}$/i)?String(r['ID материала']):null,section:String(r['Раздел']||''),topic:String(r['Тема']||''),due:String(r['Дедлайн']||'')||null,target:Number(r['Минимум %']||90),recipients:rec,status:String(r['Статус']||'active'),created_by:S.user.id};const {error}=await S.sb.from('assignments').insert(row);if(error)throw error;if(yn(r['Уведомить']))await notifyRecipients('Новое задание',`${row.title}${row.due?' · до '+row.due:''}`,rec,'assignment')}
  await syncAll();toast('Импорт завершён');if(generated.length)showCodes(generated,'Коды для новых сотрудников');contentTab='library';renderContent();
}catch(e){console.error(e);toast('Ошибка импорта: '+(e.message||e))}}
function exportExcel(){const wb=XLSX.utils.book_new();const cases=[],dialogs=[],steps=[];for(const x of S.content){if(x.type==='dialogue'){dialogs.push({'ID диалога':x.id,'Статус':x.status,'Раздел':x.section,'Тема':x.topic,'Название':x.title,'Описание':x.description||'','Кому':(x.audience||['ALL']).join(', '),'Уведомить':'Нет'});(x.steps||[]).forEach((s,i)=>steps.push({'ID диалога':x.id,'Шаг':i+1,'Реплика клиента':s.client,'Ответ 1':s.options?.[0]||'','Ответ 2':s.options?.[1]||'','Ответ 3':s.options?.[2]||'','Правильный ответ':Number(s.correct)+1,'Следующая реплика клиента':s.next_client||'','Объяснение':s.explanation||''}))}else cases.push({'ID':x.id,'Статус':x.status,'Раздел':x.section,'Тема':x.topic,'Сложность':x.difficulty,'Тип':x.type,'Заголовок':x.title,'Вопрос':x.question,'Ответ 1':x.answers?.[0]||'','Ответ 2':x.answers?.[1]||'','Ответ 3':x.answers?.[2]||'','Ответ 4':x.answers?.[3]||'','Правильный ответ':Number(x.correct)+1,'Объяснение':x.explanation||'','Кому':(x.audience||['ALL']).join(', '),'Уведомить':'Нет'})}XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(cases),'Кейсы');XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(dialogs),'Диалоги');XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(steps),'Шаги диалогов');XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(S.allowed.map(x=>({'Логин':x.login,'Имя':x.name,'Роль':roleName(x.role),'Группа':x.group_name,'Статус':x.active?'active':'inactive'}))),'Сотрудники');XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(S.assignments.map(x=>({'ID':x.id,'Название':x.title,'Раздел':x.section,'Тема':x.topic,'ID материала':x.content_id||'','Кому':(x.recipients||['ALL']).join(', '),'Дедлайн':x.due||'','Минимум %':x.target,'Уведомить':'Нет','Статус':x.status}))),'Назначения');XLSX.writeFile(wb,'SkillHub_export.xlsx')}
function openCaseEditor(type,x=null){S.editing=x?.id||null;showModal(`<div class="modal-head"><h2>${x?'Редактировать':type==='hardcase'?'Новый Hard-кейс':'Новый кейс'}</h2><button class="btn secondary" onclick="closeModal()">✕</button></div><div class="form-grid"><div class="field"><label>Раздел</label><select id="ecSec"><option value="soft">Soft</option><option value="hard">Hard</option><option value="needs">Потребность</option></select></div><div class="field"><label>Тема для аналитики</label><input id="ecTopic" placeholder="Например, Кредиты / Тарифы / Госорганы"><div class="meta">Все кейсы одной темы объединяются в аналитику сотрудника.</div></div><div class="field"><label>Статус</label><select id="ecStatus"><option value="draft">Черновик</option><option value="published">Опубликовать</option></select></div><div class="field"><label>Сложность</label><select id="ecDiff"><option>Лёгкий</option><option>Средний</option><option>Сложный</option></select></div><div class="field full"><label>Заголовок</label><input id="ecTitle"></div><div class="field full"><label>Вопрос / ситуация</label><textarea id="ecQ"></textarea></div>${[1,2,3,4].map(i=>`<div class="field"><label>Ответ ${i}</label><textarea id="ecA${i}"></textarea></div>`).join('')}<div class="field"><label>Правильный ответ</label><select id="ecCorrect">${[1,2,3,4].map(i=>`<option value="${i-1}">${i}</option>`).join('')}</select></div><div class="field"><label>Кому</label><input id="ecAudience" value="ALL"></div><div class="field full"><label>Объяснение</label><textarea id="ecExpl"></textarea></div></div><div class="actions" style="justify-content:flex-end;margin-top:13px"><button class="btn primary" onclick="saveCaseEditor('${type}')">Сохранить</button></div>`);$('ecSec').value=x?.section|| (type==='hardcase'?'hard':'soft');$('ecTopic').value=x?.topic||'';$('ecStatus').value=x?.status||'draft';$('ecDiff').value=x?.difficulty||'Средний';$('ecTitle').value=x?.title||'';$('ecQ').value=x?.question||'';[1,2,3,4].forEach((i,k)=>$('ecA'+i).value=x?.answers?.[k]||'');$('ecCorrect').value=String(x?.correct??0);$('ecAudience').value=(x?.audience||['ALL']).join(', ');$('ecExpl').value=x?.explanation||''}
async function saveCaseEditor(type){const answers=[1,2,3,4].map(i=>$('ecA'+i).value.trim());if(!$('ecTopic').value.trim()||!$('ecQ').value.trim()||answers.some(x=>!x)){toast('Заполните тему, вопрос и 4 ответа');return}const row={type,section:$('ecSec').value,topic:$('ecTopic').value.trim(),status:$('ecStatus').value,difficulty:$('ecDiff').value,title:$('ecTitle').value.trim(),payload:{question:$('ecQ').value.trim(),answers,correct:Number($('ecCorrect').value),explanation:$('ecExpl').value.trim()},audience:$('ecAudience').value.split(',').map(x=>x.trim()).filter(Boolean),created_by:S.user.id,updated_at:new Date().toISOString()};if(S.editing)row.id=S.editing;const {data,error}=await S.sb.from('content').upsert(row).select().single();if(error){toast(error.message);return}closeModal();await syncAll();contentTab='library';renderContent();toast('Материал сохранён')}
function openDialogueEditor(x=null){S.editing=x?.id||null;S.dialogDraft=x?.steps?structuredClone(x.steps):[{client:'',options:['','',''],correct:0,next_client:'',explanation:''}];showModal(`<div class="modal-head"><h2>${x?'Редактировать диалог':'Новый живой диалог'}</h2><button class="btn secondary" onclick="closeModal()">✕</button></div><div class="form-grid"><div class="field"><label>Раздел</label><select id="edSec"><option value="needs">Потребность</option><option value="soft">Soft</option><option value="hard">Hard</option></select></div><div class="field"><label>Тема для аналитики</label><input id="edTopic" placeholder="Например, Выявление потребности"><div class="meta">Используйте одинаковое название для материалов одной темы.</div></div><div class="field full"><label>Название</label><input id="edTitle"></div><div class="field"><label>Статус</label><select id="edStatus"><option value="draft">Черновик</option><option value="published">Опубликовать</option></select></div><div class="field"><label>Кому</label><input id="edAudience" value="ALL"></div></div><div id="dialogSteps"></div><div class="actions" style="justify-content:space-between;margin-top:13px"><button class="btn secondary" onclick="addDialogStep()">+ Шаг</button><button class="btn primary" onclick="saveDialogueEditor()">Сохранить</button></div>`);$('edSec').value=x?.section||'needs';$('edTopic').value=x?.topic||'';$('edTitle').value=x?.title||'';$('edStatus').value=x?.status||'draft';$('edAudience').value=(x?.audience||['ALL']).join(', ');renderDialogSteps()}
function addDialogStep(){S.dialogDraft.push({client:'',options:['','',''],correct:0,next_client:'',explanation:''});renderDialogSteps()}
function removeDialogStep(i){if(S.dialogDraft.length===1)return;S.dialogDraft.splice(i,1);renderDialogSteps()}
function renderDialogSteps(){$('dialogSteps').innerHTML=S.dialogDraft.map((s,i)=>`<div class="card" style="margin-top:11px"><div class="toolbar"><b>Шаг ${i+1}</b><button class="btn danger" onclick="removeDialogStep(${i})">Удалить</button></div><div class="field"><label>Реплика клиента</label><textarea oninput="S.dialogDraft[${i}].client=this.value">${esc(s.client)}</textarea></div>${[0,1,2].map(j=>`<div class="field"><label>Ответ ${j+1}${j===Number(s.correct)?' ✓':''}</label><input value="${esc(s.options[j])}" oninput="S.dialogDraft[${i}].options[${j}]=this.value"><button class="btn secondary" style="margin-top:5px" onclick="S.dialogDraft[${i}].correct=${j};renderDialogSteps()">Сделать правильным</button></div>`).join('')}<div class="field"><label>Следующая реплика клиента</label><textarea oninput="S.dialogDraft[${i}].next_client=this.value">${esc(s.next_client||'')}</textarea></div><div class="field"><label>Объяснение</label><textarea oninput="S.dialogDraft[${i}].explanation=this.value">${esc(s.explanation||'')}</textarea></div></div>`).join('')}
async function saveDialogueEditor(){if(!$('edTopic').value.trim()||!$('edTitle').value.trim()){toast('Заполните тему и название');return}const row={type:'dialogue',section:$('edSec').value,topic:$('edTopic').value.trim(),status:$('edStatus').value,difficulty:'Средний',title:$('edTitle').value.trim(),payload:{steps:S.dialogDraft},audience:$('edAudience').value.split(',').map(x=>x.trim()).filter(Boolean),created_by:S.user.id,updated_at:new Date().toISOString()};if(S.editing)row.id=S.editing;const {error}=await S.sb.from('content').upsert(row);if(error){toast(error.message);return}closeModal();await syncAll();contentTab='library';renderContent();toast('Диалог сохранён')}
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
    let authData=null;
    if(S.authMode==='register'){
      const {data,error}=await S.sb.auth.signUp({email:emailFor(login),password:pin,options:{data:{login,invite_code:invite}}});
      if(error)throw error;authData=data;
      if(!data.session)throw new Error('В Supabase включено подтверждение e-mail. Отключите Confirm email в Authentication → Providers → Email.');
    }else{
      const {data,error}=await S.sb.auth.signInWithPassword({email:emailFor(login),password:pin});
      if(error)throw error;authData=data;
    }
    if(authData?.session?.access_token&&authData?.session?.refresh_token){
      await S.sb.auth.setSession({access_token:authData.session.access_token,refresh_token:authData.session.refresh_token});
    }
    await afterAuth(authData?.user||authData?.session?.user||null,authData?.session?.access_token||null);
  }catch(e){
    let m=e.message||String(e),low=m.toLowerCase();
    if(m.includes('Database error saving new user'))m='Не удалось создать доступ. Проверьте корпоративный логин. Для сотрудника также проверьте код первого входа. Руководителям и техадминистратору код не нужен. Если PIN уже создавался — используйте обычный вход или сбросьте доступ.';
    if(low.includes('invalid login')||low.includes('invalid credentials'))m='Неверный логин или PIN.';
    if(low.includes('already registered')||low.includes('user already registered'))m='Для этого логина PIN уже создан. Используйте обычный вход или сбросьте доступ.';
    if(low.includes('load failed')||low.includes('failed to fetch')||low.includes('network'))m='Нет связи с базой SkillHub. Обновите страницу и проверьте интернет.';
    if(low.includes('cannot coerce')||low.includes('json object'))m='Не удалось загрузить профиль после входа. Обновите страницу и войдите ещё раз.';
    $('loginError').textContent=m;
  }
}
async function afterAuth(userHint=null,tokenHint=null){
  let session=null,user=userHint;
  const sessionRes=await S.sb.auth.getSession();
  session=sessionRes?.data?.session||null;
  user=user||session?.user||null;
  tokenHint=tokenHint||session?.access_token||null;
  if(!user)throw new Error('Нет сессии');

  S.user=user;
  let profile=null,profileError=null;
  const q=await S.sb.from('profiles').select('*').eq('id',user.id).maybeSingle();
  profile=q.data||null;profileError=q.error||null;

  // Safari/новая CDN-версия клиента иногда успевала сделать первый REST-запрос
  // без пользовательского Authorization. Дублируем профильный запрос с JWT явно.
  if(!profile&&tokenHint){
    try{
      const cfg=currentConfig();
      const resp=await fetch(cfg.url+'/rest/v1/profiles?select=*&id=eq.'+encodeURIComponent(user.id),{
        headers:{apikey:cfg.key,Authorization:'Bearer '+tokenHint,Accept:'application/json'}
      });
      if(resp.ok){
        const rows=await resp.json();
        if(Array.isArray(rows)&&rows.length===1)profile=rows[0];
      }
    }catch(_){}
  }

  if(!profile){
    if(profileError)console.warn('Profile load error',profileError);
    throw new Error('Профиль SkillHub не найден. Обновите страницу и войдите ещё раз.');
  }
  if(!profile.active){await S.sb.auth.signOut();throw new Error('Доступ к SkillHub отключён.')}
  S.profile=profile;
  localStorage.setItem('sh7_profile',JSON.stringify(profile));
  enterApp();
  await syncAll();
}
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
  $('page-employees').innerHTML=`<div class="toolbar"><div><b>${title}</b><div id="employeeSearchCount" class="muted small">${rows.length} записей</div></div><div class="actions"><a class="btn secondary" href="./skillhub_users_template.xlsx" download>⬇ Шаблон Excel</a><label class="btn secondary">⬆ Импорт Excel<input type="file" accept=".xlsx" class="hidden" onchange="previewUsersExcel(event)"></label>${(isTechAdmin()||S.profile.role==='mentor')?'<button class="btn secondary" onclick="generateAllCodes()">🔐 Коды новым</button>':''}<button class="btn primary" onclick="openEmployeeEditor()">+ Добавить</button></div></div><div id="userImportPreview"></div><div class="user-search-box"><span class="user-search-icon">⌕</span><input id="employeeSearch" type="search" inputmode="search" autocomplete="off" placeholder="${placeholder}" oninput="filterEmployeeRows()"></div><div id="employeeRows" class="card" style="margin-top:10px">${rows.map(x=>{const edit=canEditUserLocal(x),reset=canResetUserLocal(x),search=employeeSearchText(x);return `<div class="employee-row" data-search="${esc(search)}"><div><b>${esc(x.name||x.login)}</b><div class="meta">${userMeta(x)}</div></div><div class="actions"><span class="pill ${x.active?'good':'bad'}">${x.active?'Активен':'Отключён'}</span>${edit?`<button class="btn secondary" onclick="openEmployeeEditor(S.allowed.find(u=>u.login==='${jsq(x.login)}'))">Изменить</button>`:''}${reset&&!x.claimed_user_id&&x.role==='employee'?`<button class="btn secondary" onclick="makeCode('${jsq(x.login)}')">Новый код</button>`:''}${reset&&x.claimed_user_id?`<button class="btn danger" onclick="resetAccess('${jsq(x.login)}')">Сбросить доступ</button>`:''}${S.profile?.role==='mentor'&&x.role==='employee'&&x.manager_login===S.profile.login?`<button class="btn danger" onclick="removeEmployeeFromTeam('${jsq(x.login)}')">Удалить</button>`:''}</div></div>`}).join('')||'<div class="muted">Пользователей пока нет.</div>'}<div id="employeeSearchEmpty" class="muted hidden" style="padding:18px 0;text-align:center">Ничего не найдено.</div></div>`;
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
async function removeEmployeeFromTeam(login){
  const x=S.allowed.find(u=>u.login===login);
  if(!x||S.profile?.role!=='mentor'||x.role!=='employee'||x.manager_login!==S.profile.login)return;
  if(!confirm(`Удалить ${x.name||x.login} из моей команды? Доступ в SkillHub будет закрыт сразу. История тренировок и ручных работ сохранится.`))return;
  const {error}=await S.sb.rpc('remove_employee_from_team',{p_login:login});
  if(error){let m=error.message||String(error);if(m.includes('OUTSIDE_YOUR_SCOPE'))m='Можно удалять только сотрудников своей команды.';toast(m);return}
  await syncAll();renderEmployees();if(S.currentPage==='mentor')renderMentor();toast('Сотрудник удалён из команды');
}

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
    for(const r of cases){const answers=[1,2,3,4].map(i=>String(r['Ответ '+i]||'').trim());if(answers.some(x=>!x))continue;const audience=String(r['Кому']||'ALL').split(',').map(x=>x.trim()).filter(Boolean),row={type:String(r['Тип']||'quiz'),status:String(r['Статус']||'draft'),section:String(r['Раздел']||'soft'),topic:String(r['Тема']||'Общий'),difficulty:String(r['Сложность']||'Средний'),title:String(r['Заголовок']||''),payload:{question:String(r['Вопрос']||''),answers,correct:Math.max(0,Number(r['Правильный ответ']||1)-1),explanation:String(r['Объяснение']||'')},audience,created_by:S.user.id,updated_at:new Date().toISOString()};if(String(r['ID']||'').match(/^[0-9a-f-]{36}$/i))row.id=r['ID'];const {error}=await S.sb.from('content').upsert(row);if(error)throw error}
    const stepRows=sheets['Шаги диалогов']||[];for(const r of dialogs){const did=String(r['ID диалога']).trim(),steps=stepRows.filter(s=>String(s['ID диалога']).trim()===did).sort((a,b)=>Number(a['Шаг'])-Number(b['Шаг'])).map(s=>({client:String(s['Реплика клиента']||''),options:[1,2,3].map(i=>String(s['Ответ '+i]||'')),correct:Math.max(0,Number(s['Правильный ответ']||1)-1),next_client:String(s['Следующая реплика клиента']||''),explanation:String(s['Объяснение']||'')}));if(!steps.length)continue;const audience=String(r['Кому']||'ALL').split(',').map(x=>x.trim()).filter(Boolean),row={type:'dialogue',status:String(r['Статус']||'draft'),section:String(r['Раздел']||'needs'),topic:String(r['Тема']||'Общий'),difficulty:'Средний',title:String(r['Название']||did),payload:{description:String(r['Описание']||''),steps},audience,created_by:S.user.id,updated_at:new Date().toISOString()};if(did.match(/^[0-9a-f-]{36}$/i))row.id=did;const {error}=await S.sb.from('content').upsert(row);if(error)throw error}
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
  // Employees should see only the main training cards. The content library is a manager/admin tool.
  if(S.profile?.role==='employee'){
    $('page-training').innerHTML=trainingCards();
    return;
  }
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
  const hideEmployeeSoftMaterials=sec==='soft'&&S.profile?.role==='employee';
  const subtitle=hideEmployeeSoftMaterials?'Выберите нужный блок':'Выберите тему или конкретный материал';
  const materials=hideEmployeeSoftMaterials?'':`<div class="section-title"><h2>Материалы</h2></div>${arr.map(x=>`<div class="content-row"><div><span class="pill">${manualTypeName(x.type)}</span><b>${esc(x.title||x.question)}</b><div class="meta">${esc(x.topic)}${seenContentMap().has(x.id)?' · ✓ пройден':' · ещё не пройден'}</div></div><button class="btn secondary" onclick="closeModal();startContent('${x.id}')">Начать</button></div>`).join('')||'<p class="muted">Пока пусто.</p>'}`;
  showModal(`<div class="modal-head"><div><h2>${secName(sec)}${sec==='soft'?' · обычные тренажёры':''}</h2><div class="muted small">${subtitle}</div></div><button class="btn secondary" onclick="closeModal()">✕</button></div><div class="topic-grid">${topics.map(t=>{const p=topicProgress(sec,t);return `<button class="topic" onclick="closeModal();startTopic('${sec}','${jsq(t)}')">${esc(t)}<small>Пройдено ${p.done} из ${p.total} · умная выдача</small></button>`}).join('')}</div>${materials}`);
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
  return (S.manualAnswers||[]).filter(x=>x.status==='submitted'&&team.has(x.login)).slice().sort((a,b)=>Date.parse(b.created_at||0)-Date.parse(a.created_at||0));
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
  const {error}=await S.sb.from('content').upsert(row);if(error){toast(error.message);return}closeModal();await syncAll();contentTab='library';renderContent();toast('Ручной тренажёр сохранён');
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
    <article class="sh750-training-card sh750-game"><div class="sh750-card-icon">${sh750TrainingIcon('game')}</div><div class="sh750-card-copy"><span class="sh750-card-kicker">ИНТЕРАКТИВ</span><h3>Игровой формат</h3><p>Практика навыков в игровом формате.</p><a class="sh750-card-btn" href="${MASTER_LINE_URL}" target="_blank" rel="noopener noreferrer">Запустить →</a></div></article>
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
  <div class="card"><div class="sh74-profile-card"><div class="sh74-profile-photo">${url?`<img src="${esc(url)}" alt="Фото профиля">`:esc(initials(S.profile?.name||S.profile?.login))}</div><div><h3 style="margin:0">${esc(S.profile?.name||S.profile?.login)}</h3><div class="meta">${esc(S.profile?.login||'')}</div><div class="sh74-profile-actions"><label class="btn primary">${url?'Заменить фото':'Загрузить фото'}<input class="hidden" type="file" accept="image/*" onchange="uploadProfilePhoto(event)"></label>${url?'<button class="btn secondary" onclick="removeProfilePhoto()">Удалить фото</button>':''}</div></div></div><div class="sh74-profile-meta"><div><small>Роль</small><b>${esc(roleName(S.profile?.role))}</b></div><div><small>${S.profile?.role==='employee'?'Команда':'Сектор / команда'}</small><b>${esc(S.profile?.group_name||S.profile?.sector_name||'—')}</b></div></div></div>
  <div class="card" style="margin-top:12px"><h3 style="margin-top:0">О SkillHub</h3><div class="meta" style="margin-bottom:12px">Корпоративная платформа обучения сотрудников</div><div class="sh74-profile-meta"><div><small>Создатель</small><b>d.i.sharipova</b></div><div><small>Дата создания</small><b>1 сентября 2026</b></div><div><small>Текущая версия</small><b>V8.42</b></div><div><small>Инструменты разработки</small><b>GitHub · Supabase</b></div></div></div>`)
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
    <article class="sh750-training-card sh750-game"><div class="sh750-card-icon">${sh750TrainingIcon('game')}</div><div class="sh750-card-copy"><span class="sh750-card-kicker">ИНТЕРАКТИВ</span><h3>Игровой формат</h3><p>Практика навыков в игровом формате.</p><a class="sh750-card-btn" target="_blank" rel="noopener noreferrer" href="${MASTER_LINE_URL}">Запустить →</a></div></article>
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
  showModal(`<div class="modal-head"><div><h2>${secName(sec)}</h2><div class="muted small">Выберите тему или конкретный материал</div></div><button class="btn secondary" onclick="closeModal()">✕</button></div><div class="topic-grid">${topics.map(t=>{const p=topicProgress(sec,t);return `<button class="topic" onclick="closeModal();startTopic('${sec}','${jsq(t)}')">${esc(t)}<small>Пройдено ${p.done} из ${p.total} · умная выдача</small></button>`}).join('')}</div><div class="section-title"><h2>Материалы</h2></div>${arr.map(x=>`<div class="content-row"><div><span class="pill">${x.type==='dialogue'?'Диалог':shHardSortIsCase(x)?'Карточки':shHardNumericIsCase(x)?'Расчёт':shHardScenarioIsCase(x)?'Ситуация':x.type==='hardcase'?'Hard-кейс':'Кейс'}</span><b>${esc(x.title||x.question)}</b><div class="meta">${esc(x.topic)}${seenContentMap().has(x.id)?' · ✓ пройден':' · ещё не пройден'}</div></div><button class="btn secondary" onclick="closeModal();startContent('${x.id}')">Начать</button></div>`).join('')||'<p class="muted">Пока пусто.</p>'}`)
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
function shHardFlowStartFromTopic(topic,id){
  const arr=shHardFlowItems(topic),seen=seenContentMap();
  const selected=arr.find(x=>x.id===id);
  if(!selected){toast('Материал не найден');return}
  const remaining=arr.filter(x=>x.id!==id&&!seen.has(x.id)).map(x=>x.id);
  shHardFlow={mode:'topic',section:'hard',topic,queue:[id,...remaining],index:0};
  closeModal();shHardFlowLaunch(id);
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
  showModal(`<div class="modal-head"><div><h2>${esc(topic)}</h2><div class="muted small">Hard Skills · пройдено ${p.done} из ${p.total}</div></div><button class="btn secondary" onclick="closeModal()">✕</button></div>
  <div class="sh-hard-topic-hero"><div><b>Выберите материал ниже</b><p>После завершения кейса SkillHub предложит следующий непройденный материал, а в конце блока — переход к следующему блоку.</p></div></div>
  <div class="section-title"><h2>Материалы блока</h2></div>${arr.map(x=>`<div class="content-row"><div><span class="pill">${x.type==='dialogue'?'Диалог':shHardSortIsCase(x)?'Карточки':shHardNumericIsCase(x)?'Расчёт':shHardScenarioIsCase(x)?'Ситуация':x.type==='hardcase'?'Hard-кейс':'Кейс'}</span><b>${esc(x.title||x.question)}</b><div class="meta">${seen.has(x.id)?'✓ пройден':'ещё не пройден'}</div></div><button class="btn secondary" onclick="shHardFlowStartFromTopic('${jsq(topic)}','${x.id}')">Открыть</button></div>`).join('')||'<p class="muted">Пока пусто.</p>'}`);
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
    if(hasNext)return `<button class="btn primary" onclick="shHardFlowNext()">Следующий кейс →</button><button class="btn secondary" onclick="shHardFlowBack()">К Hard Skills</button>`;
    const nextTopic=shHardFlowNextIncompleteTopic(f.topic);
    if(nextTopic)return `<button class="btn primary" onclick="shHardFlowGoNextTopic()">Следующий блок: ${esc(nextTopic)} →</button><button class="btn secondary" onclick="shHardFlowBack()">К Hard Skills</button>`;
    return `<button class="btn primary" onclick="shHardFlowBack()">К Hard Skills</button><button class="btn secondary" onclick="shHardFlowStartMix()">Повторить вразброс</button>`;
  }
  return hasNext
    ? `<button class="btn primary" onclick="shHardFlowNext()">Следующий случайный кейс →</button><button class="btn secondary" onclick="shHardFlowBack()">К Hard Skills</button>`
    : `<button class="btn primary" onclick="shHardFlowBack()">К Hard Skills</button>`;
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

function shHardFlowTopicIcon(topic){
  const t=String(topic||'').toLowerCase();
  if(t.includes('гос'))return '🏛️';
  if(t.includes('бух'))return '🧾';
  if(t.includes('усн')||t.includes('аусн')||t.includes('налог'))return '📄';
  if(t.includes('закры')||t.includes('прекращ')||t.includes('банкрот'))return '📦';
  if(t.includes('тариф'))return '🧮';
  if(t.includes('кредит'))return '💳';
  if(t.includes('зарплат'))return '👥';
  return '📘';
}

const shHardFlowOpenSectionBase=openSection;
openSection=function(sec,...args){
  if(sec!=='hard')return shHardFlowOpenSectionBase(sec,...args);
  const arr=shHardFlowItems(),topics=[...new Set(arr.map(x=>x.topic))],seen=seenContentMap();
  const doneTopics=topics.filter(t=>{const p=topicProgress('hard',t);return p.total>0&&p.done>=p.total}).length;
  const doneMaterials=arr.filter(x=>seen.has(x.id)).length;
  const materialsSection=isManager()?`
  <div class="section-title sh-hard-section-title"><h2>Все материалы</h2><span class="muted small">Можно открыть конкретный кейс</span></div>
  <div class="sh-hard-materials">${arr.map(x=>`<div class="content-row sh-hard-material-row"><div><span class="pill">${x.type==='dialogue'?'Диалог':shHardSortIsCase(x)?'Карточки':shHardNumericIsCase(x)?'Расчёт':shHardScenarioIsCase(x)?'Ситуация':x.type==='hardcase'?'Hard-кейс':'Кейс'}</span><b>${esc(x.title||x.question)}</b><div class="meta">${esc(x.topic)}${seen.has(x.id)?' · ✓ пройден':' · ещё не пройден'}</div></div><button class="btn secondary" onclick="shHardFlowStartSingle('${x.id}')">Начать</button></div>`).join('')||'<p class="muted">Пока пусто.</p>'}</div>`:'';
  showModal(`<div class="modal-head sh-hard-root-head"><div><h2>Hard Skills</h2><div class="muted small">Выберите блок или продолжите тренировку</div></div><button class="btn secondary" onclick="closeModal()">✕</button></div>
  <div class="sh-hard-root-hero"><div><span>HARD SKILLS</span><h3>Прокачивайте знания по рабочим блокам</h3><p>Можно выбрать конкретный блок или пройти непройденные кейсы вразброс.</p></div><div class="sh-hard-root-stats"><b>${doneTopics} / ${topics.length}</b><small>блоков пройдено</small><b>${doneMaterials} / ${arr.length}</b><small>материалов пройдено</small></div></div>
  <div class="sh-hard-mode-row sh-hard-mode-row-left"><div class="sh-hard-mode-copy"><span>🎲</span><div><b>Вразброс по всем блокам</b><small>Непройденные кейсы из разных тем в случайном порядке.</small></div></div><button class="btn primary" onclick="shHardFlowStartMix()">Начать микс →</button></div>
  <div class="section-title sh-hard-section-title"><h2>Все блоки</h2><span class="muted small">Выберите нужный блок</span></div>
  <div class="sh-hard-block-grid">${topics.map(t=>{const p=topicProgress('hard',t);return `<button class="sh-hard-block-card" onclick="shHardFlowOpenTopic('${jsq(t)}')"><span class="sh-hard-block-icon">${shHardFlowTopicIcon(t)}</span><span class="sh-hard-block-copy"><b>${esc(t)}</b><small>Пройдено ${p.done} из ${p.total} · открыть блок</small></span><span class="sh-hard-block-arrow">→</span></button>`}).join('')}</div>${materialsSection}`);
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


/* ===== SkillHub 7.5.2 — HARD numeric situational tasks =====================
   payload.mode = "numeric" renders a calculation task with a numeric field.
   Payload also keeps ordinary quiz fields for backward compatibility.
============================================================================ */
function shHardNumericIsCase(x){
  return !!(x && x.type==='hardcase' && x.payload && x.payload.mode==='numeric' && Number.isFinite(Number(x.payload.answer)));
}
function shHardNumericFormat(n,unit='₽'){
  const v=Number(n);
  if(!Number.isFinite(v))return '';
  return `${new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(v)} ${unit||''}`.trim();
}
function shHardNumericParse(raw){
  const s=String(raw??'').replace(/\u00a0/g,' ').replace(/\s+/g,'').replace(/₽/g,'').replace(/,/g,'.').replace(/[^0-9.\-]/g,'');
  if(!s||s==='-'||s==='.'||s==='-.')return null;
  const v=Number(s);return Number.isFinite(v)?v:null;
}
function startHardNumeric(x){
  S.currentRun={type:'hard-numeric',x,checked:false,recorded:false,value:null,ok:false};
  goRun();renderHardNumeric();
}
function shHardNumericSourceHtml(x){
  const src=x?.payload?.source||{};
  if(!src.path)return '';
  return `<div class="skill-card procedure-card sh-hard-num-source"><b>📚 Взято из процедуры</b>${src.name?`<br><strong>${esc(src.name)}</strong>`:''}<div class="small" style="margin-top:6px">${esc(src.path)}</div></div>`;
}
function shHardNumericFactsHtml(p){
  const facts=Array.isArray(p?.facts)?p.facts:[];
  if(!facts.length)return '';
  return `<div class="sh-hard-num-facts">${facts.map(f=>`<div class="sh-hard-num-fact"><span>${esc(f?.label||'')}</span><strong>${esc(f?.value||'')}</strong></div>`).join('')}</div>`;
}
function renderHardNumeric(){
  const r=S.currentRun;if(!r||r.type!=='hard-numeric')return;
  const x=r.x,p=x.payload||{},unit=p.unit||'₽';
  const result=r.checked?`<div class="sh-hard-num-result ${r.ok?'is-correct':'is-wrong'}"><div class="sh-hard-num-result-icon">${r.ok?'✓':'!'}</div><div><b>${r.ok?'Верно':'Не совсем'}</b><p>Правильный ответ: <strong>${esc(shHardNumericFormat(p.answer,unit))}</strong></p></div></div><div class="explain sh-hard-num-explain">${esc(p.explanation||x.explanation||'')}</div>${shHardNumericSourceHtml(x)}${shHardFlowCompletionMeta()}<div class="sh-hard-flow-actions">${shHardFlowCompletionButtons()}</div>`:'';
  const situation=esc(p.situation||p.problem||p.question||x.question||'');
  $('page-run').innerHTML=`<div class="sh-hard-num-wrap"><div class="card sh-hard-num-shell"><div class="actions sh-hard-num-top"><button class="btn secondary" onclick="shHardFlowBack()">← Выйти</button><span class="sh-hard-num-kicker">РАСЧЁТНАЯ ЗАДАЧА</span></div><h2>${esc(x.title||'Расчётная задача')}</h2><div class="sh-hard-num-scenario"><div class="sh-hard-num-scenario-head"><div class="sh-hard-num-scenario-icon">₽</div><div><span>СИТУАЦИЯ КЛИЕНТА</span><b>${esc(p.agency||'ФНС')}</b></div></div><p>${situation}</p>${shHardNumericFactsHtml(p)}</div><div class="sh-hard-num-question"><span>ВОПРОС СОТРУДНИКУ</span><strong>${esc(p.prompt||'Введите ответ')}</strong></div>${r.checked?`<div class="sh-hard-num-answer-readonly"><span>Ваш ответ</span><strong>${esc(shHardNumericFormat(r.value,unit))}</strong></div>`:`<form class="sh-hard-num-form" onsubmit="event.preventDefault();checkHardNumeric()"><label for="hardNumericInput">Введите сумму</label><div class="sh-hard-num-input-row"><input id="hardNumericInput" type="text" inputmode="decimal" autocomplete="off" placeholder="Например, 162000" aria-describedby="hardNumericHelp"><span>${esc(unit)}</span></div><small id="hardNumericHelp">Введите только число — пробелы в сумме допустимы.</small><button class="btn primary" type="submit">Проверить ответ →</button></form>`}${result}</div></div>`;
  if(!r.checked){const inp=$('hardNumericInput');if(inp)setTimeout(()=>inp.focus(),0)}
}
function checkHardNumeric(){
  const r=S.currentRun;if(!r||r.type!=='hard-numeric'||r.checked)return;
  const inp=$('hardNumericInput'),v=shHardNumericParse(inp?.value);
  if(v===null){toast('Введите сумму числом');if(inp)inp.focus();return}
  const right=Number(r.x.payload.answer),tol=Math.max(0,Number(r.x.payload.tolerance||0));
  r.value=v;r.ok=Math.abs(v-right)<=tol;r.checked=true;
  if(!r.recorded){
    const d={kind:'hard-numeric',content_id:r.x.id||null,title:r.x.title||'',question:r.x.payload.prompt||r.x.payload.problem||'',selected_value:v,correct_value:right,is_correct:r.ok,explanation:r.x.payload.explanation||''};
    try{recordAttempt({section:r.x.section,topic:r.x.topic,score:r.ok?100:0,type:'hardcase',cpm:0,details:[d]})}catch(e){console.error('numeric task save failed',e)}
    r.recorded=true;
  }
  renderHardNumeric();
}

// Numeric mode is checked before the existing Hard flow/sort/quiz chain.
const shHardNumericStartContentBase=startContent;
startContent=function(id){
  const x=S.content.find(c=>c.id===id);
  if(shHardNumericIsCase(x)){if(!shHardFlowLaunching)shHardFlow=null;startHardNumeric(x);return}
  return shHardNumericStartContentBase(id);
};
/* ===== end SkillHub 7.5.2 ================================================ */


/* ===== SkillHub 7.5.4 — rich HARD situational tasks =======================
   payload.mode = "scenario" renders a full client case with document details,
   payment/queue facts and decision options.
============================================================================ */
function shHardScenarioIsCase(x){
  return !!(x && x.type==='hardcase' && x.payload && x.payload.mode==='scenario' && Array.isArray(x.payload.options) && x.payload.options.length>=2);
}
function shHardScenarioFactsHtml(p){
  const facts=Array.isArray(p?.facts)?p.facts:[];
  if(!facts.length)return '';
  return `<div class="sh-hard-sc-facts">${facts.map(f=>`<div class="sh-hard-sc-fact ${f?.tone?`tone-${esc(f.tone)}`:''}"><span>${esc(f?.label||'')}</span><strong>${esc(f?.value||'')}</strong></div>`).join('')}</div>`;
}
function shHardScenarioDocumentHtml(p){
  const d=p?.document||{};
  if(!d.number&&!d.date&&!d.received&&!d.type)return '';
  const meta=[d.number?`№ ${esc(d.number)}`:'',d.date?`от ${esc(d.date)}`:'',d.received?`поступило ${esc(d.received)}`:''].filter(Boolean).join(' · ');
  return `<div class="sh-hard-sc-docline"><span>ОГРАНИЧЕНИЕ</span><div><b>${esc(d.type||'Решение госоргана')}</b>${meta?`<small>${meta}</small>`:''}</div></div>`;
}
function shHardScenarioPaymentHtml(p){
  const a=p?.action||{};
  if(!a.title&&!a.amount&&!a.queue&&!a.recipient)return '';
  const meta=[a.queue?`Очередность: ${esc(a.queue)}`:'',a.purpose?`Назначение: ${esc(a.purpose)}`:''].filter(Boolean);
  return `<div class="sh-hard-sc-wants"><div class="sh-hard-sc-wants-head"><span>КЛИЕНТ ХОЧЕТ</span><b>${esc(a.title||'Платёж')}</b></div><div class="sh-hard-sc-wants-main">${a.amount?`<strong>${esc(a.amount)}</strong>`:''}${a.recipient?`<span>${esc(a.recipient)}</span>`:''}</div>${meta.length?`<div class="sh-hard-sc-wants-meta">${meta.map(x=>`<span>${x}</span>`).join('')}</div>`:''}</div>`;
}
function startHardScenario(x){
  S.currentRun={type:'hard-scenario',x,checked:false,recorded:false,selected:null,ok:false};
  goRun();renderHardScenario();
}
function renderHardScenario(){
  const r=S.currentRun;if(!r||r.type!=='hard-scenario')return;
  const x=r.x,p=x.payload||{},opts=p.options||[],right=Number(p.correct);
  const options=opts.map((o,i)=>{
    let cls='sh-hard-sc-option';
    if(r.checked){if(i===right)cls+=' is-correct';if(i===r.selected&&i!==right)cls+=' is-wrong'}
    return `<button type="button" class="${cls}" ${r.checked?'disabled':''} onclick="answerHardScenario(${i})"><span class="sh-hard-sc-option-num">${i+1}</span><span>${esc(o)}</span></button>`;
  }).join('');
  const result=r.checked?`<div class="sh-hard-sc-result ${r.ok?'is-correct':'is-wrong'}"><div class="sh-hard-sc-result-icon">${r.ok?'✓':'!'}</div><div><b>${r.ok?'Верно':'Неверно'}</b><p>${r.ok?'Вы выбрали корректное решение по условиям задачи.':'Ниже показан правильный вариант и логика решения.'}</p></div></div><div class="explain sh-hard-sc-explain">${esc(p.explanation||x.explanation||'')}</div>${shHardNumericSourceHtml(x)}${shHardFlowCompletionMeta()}<div class="sh-hard-flow-actions">${shHardFlowCompletionButtons()}</div>`:'';
  const scenario=esc(p.scenario||p.situation||p.problem||p.question||x.question||'');
  $('page-run').innerHTML=`<div class="sh-hard-sc-wrap"><div class="card sh-hard-sc-shell"><div class="actions sh-hard-sc-top"><button class="btn secondary" onclick="shHardFlowBack()">← Выйти</button><span class="sh-hard-sc-kicker">СИТУАЦИОННАЯ ЗАДАЧА</span></div><h2>${esc(x.title||'Ситуационная задача')}</h2><div class="sh-hard-sc-scenario"><div class="sh-hard-sc-scenario-head"><div class="sh-hard-sc-scenario-icon">🏛</div><div><span>СИТУАЦИЯ</span><b>${esc(p.agency||'Госорганы')}</b></div></div><p>${scenario}</p>${shHardScenarioDocumentHtml(p)}${shHardScenarioFactsHtml(p)}${shHardScenarioPaymentHtml(p)}</div><div class="sh-hard-sc-question"><span>ВОПРОС СОТРУДНИКУ</span><strong>${esc(p.question||'Какое решение верное?')}</strong></div><div class="sh-hard-sc-options">${options}</div>${result}</div></div>`;
}
function answerHardScenario(i){
  const r=S.currentRun;if(!r||r.type!=='hard-scenario'||r.checked)return;
  const right=Number(r.x.payload.correct);
  r.selected=i;r.ok=i===right;r.checked=true;
  if(!r.recorded){
    const d={kind:'hard-scenario',content_id:r.x.id||null,title:r.x.title||'',question:r.x.payload.question||'',options:[...(r.x.payload.options||[])],selected:i,correct:right,is_correct:r.ok,explanation:r.x.payload.explanation||''};
    try{recordAttempt({section:r.x.section,topic:r.x.topic,score:r.ok?100:0,type:'hardcase',cpm:0,details:[d]})}catch(e){console.error('scenario task save failed',e)}
    r.recorded=true;
  }
  renderHardScenario();
}
const shHardScenarioStartContentBase=startContent;
startContent=function(id){
  const x=S.content.find(c=>c.id===id);
  if(shHardScenarioIsCase(x)){if(!shHardFlowLaunching)shHardFlow=null;startHardScenario(x);return}
  return shHardScenarioStartContentBase(id);
};
/* ===== end SkillHub 7.5.4 ================================================ */


/* ===== SkillHub 2026-09-24 — two-step tariff calculation task ============
   payload.mode = "tariff_calc"
   Step 1: employee calculates a commission in a numeric field.
   Step 2: client adds a condition; employee chooses the better tariff option.
============================================================================ */
function shTariffCalcIsCase(x){
  const p=x&&x.payload;
  return !!(x&&x.type==='hardcase'&&p&&p.mode==='tariff_calc'&&p.step1&&Number.isFinite(Number(p.step1.answer))&&p.step2&&(Array.isArray(p.step2.options)||Number.isFinite(Number(p.step2.answer))));
}
function shTariffCalcMetaHtml(p){
  const items=[
    p?.client?['КЛИЕНТ',p.client]:null,
    p?.date?['ДАТА ОБРАЩЕНИЯ',p.date]:null,
    p?.subject?['ТЕМА',p.subject]:null
  ].filter(Boolean);
  if(!items.length)return '';
  return `<div class="sh-tcalc-meta">${items.map(([k,v])=>`<div><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('')}</div>`;
}
function shTariffCalcFactsHtml(p){
  const facts=Array.isArray(p?.facts)?p.facts:[];
  if(!facts.length)return '';
  return `<div class="sh-tcalc-conditions-title">УСЛОВИЯ ЗАДАЧИ</div><div class="sh-tcalc-facts">${facts.map(f=>`<div class="sh-tcalc-fact ${f?.tone?`tone-${esc(f.tone)}`:''}"><span>${esc(f?.label||'')}</span><strong>${esc(f?.value||'')}</strong></div>`).join('')}</div>`;
}
function shTariffCalcActionHtml(p){
  const a=p?.action||{};
  if(!a.title&&!a.amount&&!a.recipient&&!a.method)return '';
  const descriptor=[a.title||'Провести перевод',a.recipient||''].filter(Boolean).join(' ');
  return `<div class="sh-tcalc-wants"><div class="sh-tcalc-wants-head"><span>КЛИЕНТ ХОЧЕТ</span><b>${esc(descriptor)}</b></div><div class="sh-tcalc-wants-main">${a.amount?`<strong>${esc(a.amount)}</strong>`:''}</div>${a.method?`<div class="sh-tcalc-wants-meta"><span>${esc(a.method)}</span></div>`:''}</div>`;
}
function shTariffCalcSourceHtml(p){
  const src=p?.source||{};
  if(!src.path&&!src.name)return '';
  return `<div class="skill-card procedure-card sh-tcalc-source"><b>📚 Где проверить</b>${src.name?`<br><strong>${esc(src.name)}</strong>`:''}${src.path?`<div class="small" style="margin-top:6px">${esc(src.path)}</div>`:''}</div>`;
}
function shTariffCalcScenarioHtml(p){
  return `<div class="sh-tcalc-scenario"><div class="sh-tcalc-scenario-head"><div class="sh-tcalc-icon">₽</div><div><span>СИТУАЦИЯ</span><b>${esc(p.label||'Тарифы')}</b></div></div>${shTariffCalcMetaHtml(p)}${p.scenario||p.situation?`<p>${esc(p.scenario||p.situation||'')}</p>`:''}${shTariffCalcFactsHtml(p)}${shTariffCalcActionHtml(p)}</div>`;
}
function startTariffCalc(x){
  S.currentRun={type:'tariff-calc',x,step:1,step1Checked:false,step1Value:null,step1Ok:false,step2Checked:false,step2Selected:null,step2Value:null,step2Ok:false,recorded:false};
  goRun();renderTariffCalc();
}
function shTariffCalcStepPill(step){
  return `<div class="sh-tcalc-progress"><span class="${step===1?'active':'done'}">1</span><i></i><span class="${step===2?'active':''}">2</span><b>Шаг ${step} из 2</b></div>`;
}
function renderTariffCalc(){
  const r=S.currentRun;if(!r||r.type!=='tariff-calc')return;
  const x=r.x,p=x.payload||{},s1=p.step1||{},s2=p.step2||{};
  let body='';
  if(r.step===1){
    const checked=r.step1Checked;
    const result=checked?`<div class="sh-tcalc-result ${r.step1Ok?'is-correct':'is-wrong'}"><div class="sh-tcalc-result-icon">${r.step1Ok?'✓':'!'}</div><div><b>${r.step1Ok?'Верно':'Не совсем'}</b><p>Правильная комиссия: <strong>${esc(shHardNumericFormat(s1.answer,s1.unit||'₽'))}</strong></p></div></div><div class="sh-tcalc-explain"><b>Расчёт</b><p>${esc(s1.formula||'')}</p>${s1.explanation?`<small>${esc(s1.explanation)}</small>`:''}</div><div class="sh-tcalc-next"><button class="btn primary" type="button" onclick="shTariffCalcNextStep()">Продолжить →</button></div>`:'';
    body=`${shTariffCalcStepPill(1)}<div class="sh-tcalc-question"><span>ВОПРОС СОТРУДНИКУ</span><strong>${esc(s1.prompt||'Рассчитайте комиссию')}</strong></div>${checked?`<div class="sh-tcalc-answer-readonly"><span>Ваш ответ</span><strong>${esc(shHardNumericFormat(r.step1Value,s1.unit||'₽'))}</strong></div>`:`<form class="sh-tcalc-form" onsubmit="event.preventDefault();checkTariffCalcStep1()"><label for="tariffCalcInput">Комиссия</label><div class="sh-tcalc-input"><input id="tariffCalcInput" type="text" inputmode="decimal" autocomplete="off" placeholder="Введите сумму"><span>${esc(s1.unit||'₽')}</span></div><small>Посчитайте сумму самостоятельно и введите только число.</small><button class="btn primary" type="submit">Проверить ответ →</button></form>`}${result}`;
  }else{
    const comp=Array.isArray(s2.comparison)?`<div class="sh-tcalc-compare">${s2.comparison.map(c=>`<div><span>${esc(c.label||'')}</span><strong>${esc(c.value||'')}</strong>${c.note?`<small>${esc(c.note)}</small>`:''}</div>`).join('')}</div>`:'';
    const cond=Array.isArray(s2.condition)&&s2.condition.length?`<div class="sh-tcalc-step2-conditions">${s2.condition.map(c=>`<div><span>${esc(c.label||'')}</span><strong>${esc(c.value||'')}</strong></div>`).join('')}</div>`:'';
    if(Number.isFinite(Number(s2.answer))){
      const checked=r.step2Checked;
      const result=checked?`<div class="sh-tcalc-result ${r.step2Ok?'is-correct':'is-wrong'}"><div class="sh-tcalc-result-icon">${r.step2Ok?'✓':'!'}</div><div><b>${r.step2Ok?'Верно':'Не совсем'}</b><p>Экономия клиента: <strong>${esc(shHardNumericFormat(s2.answer,s2.unit||'₽'))}</strong></p></div></div>${comp}<div class="sh-tcalc-explain"><b>Расчёт выгоды</b><p>${esc(s2.formula||'')}</p>${s2.explanation?`<small>${esc(s2.explanation)}</small>`:''}</div>${shTariffCalcSourceHtml(p)}${shHardFlowCompletionMeta()}<div class="sh-hard-flow-actions">${shHardFlowCompletionButtons()}</div>`:'';
      body=`${shTariffCalcStepPill(2)}<div class="sh-tcalc-client"><div class="sh-tcalc-client-mark">2</div><div><span>НОВОЕ УСЛОВИЕ ОТ КЛИЕНТА</span><p>${esc(s2.client||'')}</p></div></div>${cond}<div class="sh-tcalc-question"><span>ВОПРОС СОТРУДНИКУ</span><strong>${esc(s2.question||'Рассчитайте выгоду клиента')}</strong></div>${checked?`<div class="sh-tcalc-answer-readonly"><span>Ваш ответ</span><strong>${esc(shHardNumericFormat(r.step2Value,s2.unit||'₽'))}</strong></div>`:`<form class="sh-tcalc-form" onsubmit="event.preventDefault();checkTariffCalcStep2()"><label for="tariffCalcInput2">Экономия клиента</label><div class="sh-tcalc-input"><input id="tariffCalcInput2" type="text" inputmode="decimal" autocomplete="off" placeholder="Введите сумму"><span>${esc(s2.unit||'₽')}</span></div><small>Сравните расходы без пакета и с пакетом и введите сумму экономии.</small><button class="btn primary" type="submit">Проверить ответ →</button></form>`}${result}`;
    }else{
      const right=Number(s2.correct);
      const opts=(s2.options||[]).map((o,i)=>{let cls='sh-tcalc-option';if(r.step2Checked){if(i===right)cls+=' is-correct';if(i===r.step2Selected&&i!==right)cls+=' is-wrong'}return `<button type="button" class="${cls}" ${r.step2Checked?'disabled':''} onclick="answerTariffCalcStep2(${i})"><span>${i+1}</span><b>${esc(o)}</b></button>`}).join('');
      const result=r.step2Checked?`<div class="sh-tcalc-result ${r.step2Ok?'is-correct':'is-wrong'}"><div class="sh-tcalc-result-icon">${r.step2Ok?'✓':'!'}</div><div><b>${r.step2Ok?'Верно':'Неверно'}</b><p>${r.step2Ok?'Вы выбрали более выгодный вариант для этой ситуации.':'Сравните итоговые расходы по двум вариантам.'}</p></div></div>${comp}<div class="sh-tcalc-explain"><b>Почему</b><p>${esc(s2.explanation||'')}</p></div>${shTariffCalcSourceHtml(p)}${shHardFlowCompletionMeta()}<div class="sh-hard-flow-actions">${shHardFlowCompletionButtons()}</div>`:'';
      body=`${shTariffCalcStepPill(2)}<div class="sh-tcalc-client"><div class="sh-tcalc-client-mark">2</div><div><span>НОВОЕ УСЛОВИЕ ОТ КЛИЕНТА</span><p>${esc(s2.client||'')}</p></div></div>${cond}<div class="sh-tcalc-question"><span>ВОПРОС СОТРУДНИКУ</span><strong>${esc(s2.question||'Какой вариант выгоднее?')}</strong></div><div class="sh-tcalc-options">${opts}</div>${result}`;
    }
  }
  $('page-run').innerHTML=`<div class="sh-tcalc-wrap"><div class="card sh-tcalc-shell"><div class="actions sh-tcalc-top"><button class="btn secondary" onclick="shHardFlowBack()">← Выйти</button><span class="sh-tcalc-kicker">РАСЧЁТНАЯ ЗАДАЧА · ТАРИФЫ</span></div><h2>${esc(x.title||'Расчёт комиссии')}</h2>${shTariffCalcScenarioHtml(p)}${body}</div></div>`;
  if(r.step===1&&!r.step1Checked){const inp=$('tariffCalcInput');if(inp)setTimeout(()=>inp.focus(),0)}else if(r.step===2&&!r.step2Checked&&Number.isFinite(Number(s2.answer))){const inp=$('tariffCalcInput2');if(inp)setTimeout(()=>inp.focus(),0)}
}
function checkTariffCalcStep1(){
  const r=S.currentRun;if(!r||r.type!=='tariff-calc'||r.step!==1||r.step1Checked)return;
  const inp=$('tariffCalcInput'),v=shHardNumericParse(inp?.value);
  if(v===null){toast('Введите сумму комиссии числом');if(inp)inp.focus();return}
  const s1=r.x.payload.step1,right=Number(s1.answer),tol=Math.max(0,Number(s1.tolerance||0));
  r.step1Value=v;r.step1Ok=Math.abs(v-right)<=tol;r.step1Checked=true;renderTariffCalc();
}
function shTariffCalcNextStep(){
  const r=S.currentRun;if(!r||r.type!=='tariff-calc'||!r.step1Checked)return;r.step=2;renderTariffCalc();
}
function checkTariffCalcStep2(){
  const r=S.currentRun;if(!r||r.type!=='tariff-calc'||r.step!==2||r.step2Checked)return;
  const s2=r.x.payload.step2;if(!Number.isFinite(Number(s2.answer)))return;
  const inp=$('tariffCalcInput2'),v=shHardNumericParse(inp?.value);
  if(v===null){toast('Введите сумму экономии числом');if(inp)inp.focus();return}
  const right=Number(s2.answer),tol=Math.max(0,Number(s2.tolerance||0));
  r.step2Value=v;r.step2Ok=Math.abs(v-right)<=tol;r.step2Checked=true;
  if(!r.recorded){
    const score=Math.round(((r.step1Ok?1:0)+(r.step2Ok?1:0))/2*100);
    const details=[
      {kind:'tariff-calc',content_id:r.x.id||null,title:r.x.title||'',step:1,question:r.x.payload.step1.prompt||'',selected_value:r.step1Value,correct_value:Number(r.x.payload.step1.answer),is_correct:r.step1Ok,explanation:r.x.payload.step1.explanation||''},
      {kind:'tariff-calc',content_id:r.x.id||null,title:r.x.title||'',step:2,question:s2.question||'',selected_value:v,correct_value:right,is_correct:r.step2Ok,explanation:s2.explanation||''}
    ];
    try{recordAttempt({section:r.x.section,topic:r.x.topic,score,type:'hardcase',cpm:0,details})}catch(e){console.error('tariff calc save failed',e)}
    r.recorded=true;
  }
  renderTariffCalc();
}
function answerTariffCalcStep2(i){
  const r=S.currentRun;if(!r||r.type!=='tariff-calc'||r.step!==2||r.step2Checked)return;
  const s2=r.x.payload.step2,right=Number(s2.correct);
  r.step2Selected=i;r.step2Ok=i===right;r.step2Checked=true;
  if(!r.recorded){
    const score=Math.round(((r.step1Ok?1:0)+(r.step2Ok?1:0))/2*100);
    const details=[
      {kind:'tariff-calc',content_id:r.x.id||null,title:r.x.title||'',step:1,question:r.x.payload.step1.prompt||'',selected_value:r.step1Value,correct_value:Number(r.x.payload.step1.answer),is_correct:r.step1Ok,explanation:r.x.payload.step1.explanation||''},
      {kind:'tariff-calc',content_id:r.x.id||null,title:r.x.title||'',step:2,question:s2.question||'',options:[...(s2.options||[])],selected:i,correct:right,is_correct:r.step2Ok,explanation:s2.explanation||''}
    ];
    try{recordAttempt({section:r.x.section,topic:r.x.topic,score,type:'hardcase',cpm:0,details})}catch(e){console.error('tariff calc save failed',e)}
    r.recorded=true;
  }
  renderTariffCalc();
}
const shTariffCalcStartContentBase=startContent;
startContent=function(id){
  const x=S.content.find(c=>c.id===id);
  if(shTariffCalcIsCase(x)){if(!shHardFlowLaunching)shHardFlow=null;startTariffCalc(x);return}
  return shTariffCalcStartContentBase(id);
};
/* ===== end two-step tariff calculation task ============================== */

/* ===== SkillHub V8 — user-selectable dark / light theme ================ */
function shThemeCurrent(){
  const t=localStorage.getItem('sh_theme');
  return t==='light'?'light':'dark';
}
function applyTheme(theme,save=true){
  const t=theme==='light'?'light':'dark';
  document.documentElement.dataset.theme=t;
  if(save)localStorage.setItem('sh_theme',t);
  const meta=document.querySelector('meta[name="theme-color"]');
  if(meta)meta.setAttribute('content',t==='light'?'#f4f5f7':'#0b0b0c');
  const apple=document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  if(apple)apple.setAttribute('content',t==='light'?'default':'black-translucent');
  const btn=document.getElementById('themeToggleBtn');
  if(btn)btn.textContent=t==='dark'?'☀️ Светлая тема':'🌙 Тёмная тема';
}
function toggleTheme(){
  const next=shThemeCurrent()==='dark'?'light':'dark';
  applyTheme(next,true);
  try{toast(next==='light'?'Светлая тема включена':'Тёмная тема включена')}catch(e){}
}
applyTheme(shThemeCurrent(),false);
/* ===== end theme switch ================================================= */

/* ===== SkillHub 2026-09-24 — grouped RG manual review queue v8.6 ===== */
let shManualReviewBatch={login:null,ids:[],pos:0,total:0};

function shManualCaseWord(n){
  const a=Math.abs(Number(n)||0)%100,b=a%10;
  if(a>10&&a<20)return 'кейсов';
  if(b===1)return 'кейс';
  if(b>=2&&b<=4)return 'кейса';
  return 'кейсов';
}
function shManualWorkWord(n){
  const a=Math.abs(Number(n)||0)%100,b=a%10;
  if(a>10&&a<20)return 'работ';
  if(b===1)return 'работа';
  if(b>=2&&b<=4)return 'работы';
  return 'работ';
}
function shManualDateParts(v){
  const d=new Date(v);if(Number.isNaN(d.getTime()))return{date:'—',time:'—',full:'—'};
  return {
    date:d.toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit'}),
    time:d.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}),
    full:d.toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})
  };
}
function shManualRangeText(rows){
  if(!rows?.length)return '';
  const sorted=rows.slice().sort((a,b)=>Date.parse(a.created_at||0)-Date.parse(b.created_at||0));
  const first=shManualDateParts(sorted[0].created_at),last=shManualDateParts(sorted[sorted.length-1].created_at);
  if(first.date===last.date)return `${first.date} · ${first.time}–${last.time}`;
  return `${first.date} ${first.time} — ${last.date} ${last.time}`;
}
function shManualPendingGroups(){
  const rows=typeof pendingManualForMentor==='function'?pendingManualForMentor():[];
  const map=new Map();
  for(const r of rows){
    if(!map.has(r.login))map.set(r.login,[]);
    map.get(r.login).push(r);
  }
  return [...map.entries()].map(([login,items])=>{
    items.sort((a,b)=>Date.parse(b.created_at||0)-Date.parse(a.created_at||0));
    const user=(S.allowed||[]).find(x=>x.login===login)||{};
    const latest=items[0],latestContent=(S.content||[]).find(x=>x.id===latest?.content_id);
    return {login,user,name:user.name||login,rows:items,count:items.length,latest,latestContent,latestTs:Date.parse(latest?.created_at||0)||0};
  }).sort((a,b)=>b.latestTs-a.latestTs);
}

manualReviewPanelHtml=function(){
  const groups=shManualPendingGroups(),total=groups.reduce((n,g)=>n+g.count,0);
  if(!groups.length){
    return `<section class="sh-manual-review-section"><div class="sh-manual-review-head"><div><h2>✍️ Проверка работ</h2><p>Ручные кейсы сотрудников</p></div><span class="pill good">0 на проверке</span></div><div class="sh-manual-review-empty">Новых работ на проверку нет 🎉</div></section>`;
  }
  return `<section class="sh-manual-review-section"><div class="sh-manual-review-head"><div><h2>✍️ Проверка работ</h2><p>${groups.length} ${groups.length===1?'сотрудник':'сотрудников'} · ${total} ${shManualCaseWord(total)} на проверке</p></div><span class="pill warn">${total} на проверке</span></div><div class="sh-manual-review-grid">${groups.map(g=>{
    const initialsText=typeof initials==='function'?initials(g.name):String(g.name||g.login).slice(0,2).toUpperCase();
    return `<button class="sh-manual-review-card" onclick="openManualReviewGroup('${jsq(g.login)}')"><span class="sh-manual-review-avatar">${esc(initialsText)}</span><span class="sh-manual-review-copy"><b>${esc(g.name)}</b><strong>${g.count} ручн. ${shManualCaseWord(g.count)} на проверке</strong><small>${esc(shManualRangeText(g.rows))}</small><em>Последняя: ${esc(g.latestContent?.title||'Ручной тренажёр')}</em></span><span class="sh-manual-review-open">Проверить ${g.count} →</span></button>`;
  }).join('')}</div></section>`;
};

function openManualReviewGroup(login){
  const rows=(typeof pendingManualForMentor==='function'?pendingManualForMentor():[]).filter(x=>x.login===login).sort((a,b)=>Date.parse(b.created_at||0)-Date.parse(a.created_at||0));
  if(!rows.length){toast('У сотрудника уже нет работ на проверке');renderMentor();return}
  shManualReviewBatch={login,ids:rows.map(x=>x.id),pos:0,total:rows.length};
  openManualReview(rows[0].id);
}
function closeManualReviewBatch(){
  shManualReviewBatch={login:null,ids:[],pos:0,total:0};
  closeModal();
}
function shManualBatchPosition(answerId){
  if(!shManualReviewBatch.login)return null;
  const idx=shManualReviewBatch.ids.indexOf(answerId);
  return idx<0?null:{index:idx+1,total:shManualReviewBatch.total};
}

openManualReview=function(answerId){
  const r=(S.manualAnswers||[]).find(x=>x.id===answerId);if(!r)return;
  const c=S.content.find(x=>x.id===r.content_id),u=S.allowed.find(x=>x.login===r.login),history=manualHistory(r.content_id,r.login),batch=shManualBatchPosition(answerId);
  const nextId=batch?shManualReviewBatch.ids.slice(batch.index).find(id=>(S.manualAnswers||[]).some(x=>x.id===id&&x.status==='submitted')):null;
  const nextRow=nextId?(S.manualAnswers||[]).find(x=>x.id===nextId):null,nextContent=nextRow?S.content.find(x=>x.id===nextRow.content_id):null;
  showModal(`<div class="modal-head"><div><div class="sh-manual-review-modal-kicker">${batch?`Работа ${batch.index} из ${batch.total}`:'Ручная проверка'}</div><h2>${esc(c?.title||'Ручной тренажёр')}</h2><div class="meta">${esc(u?.name||r.login)} · ${esc(r.login)} · версия ${r.version} · ${new Date(r.created_at).toLocaleString('ru-RU')}</div></div><button class="btn secondary" onclick="${batch?'closeManualReviewBatch()':'closeModal()'}">✕</button></div>${batch?`<div class="sh-manual-review-progress"><span style="width:${Math.round(batch.index/batch.total*100)}%"></span></div>`:''}<div class="review-prompt"><b>Задание</b><div>${esc(c?.question||'')}</div>${c?.instruction?`<small>${esc(c.instruction)}</small>`:''}</div><div class="review-current-answer"><b>Ответ сотрудника</b><div>${esc(r.answer)}</div></div><div class="form-grid"><div class="field full"><label>Комментарий РГ</label><textarea id="manualReviewComment" rows="4" placeholder="Что хорошо / что нужно поправить"></textarea></div><div class="field full"><label>Как можно было сформулировать <span class="muted">(необязательно)</span></label><textarea id="manualReviewSuggestion" rows="4" placeholder="Ваш рекомендуемый вариант"></textarea></div></div>${batch&&nextContent?`<div class="sh-manual-review-next"><span>Следующая работа</span><b>${esc(nextContent.title||'Ручной тренажёр')}</b></div>`:''}<div class="actions review-actions"><button class="btn secondary" onclick="reviewManualAnswer('${r.id}','revision_requested')">↩ На доработку</button><button class="btn primary" onclick="reviewManualAnswer('${r.id}','accepted')">✓ Принято</button></div>${history.length>1?`<details class="sh-manual-history-details"><summary>Предыдущие версии (${history.length-1})</summary>${history.filter(x=>x.id!==r.id).map(x=>`<div class="manual-history-item"><div class="actions" style="justify-content:space-between"><b>Версия ${x.version}</b><span class="pill ${manualStatusClass(x.status)}">${manualStatusText(x.status)}</span></div><div class="manual-answer-text">${esc(x.answer)}</div>${x.mentor_comment?`<div class="review-note"><b>Ваш комментарий:</b> ${esc(x.mentor_comment)}</div>`:''}</div>`).join('')}</details>`:''}`);
};

reviewManualAnswer=async function(answerId,decision){
  const comment=$('manualReviewComment')?.value.trim()||'',suggestion=$('manualReviewSuggestion')?.value.trim()||'';
  if(decision==='revision_requested'&&!comment){toast('Для доработки добавьте комментарий');return}
  const batchActive=!!shManualReviewBatch.login,batchIds=shManualReviewBatch.ids.slice(),currentPos=batchIds.indexOf(answerId);
  const {error}=await S.sb.rpc('review_manual_answer',{p_answer_id:answerId,p_decision:decision,p_comment:comment||null,p_suggestion:suggestion||null});
  if(error){toast(error.message||String(error));return}
  closeModal();await syncAll();
  if(batchActive){
    let nextPos=currentPos+1,nextId=null;
    while(nextPos<batchIds.length){const candidate=(S.manualAnswers||[]).find(x=>x.id===batchIds[nextPos]);if(candidate?.status==='submitted'){nextId=candidate.id;break}nextPos++}
    if(nextId){shManualReviewBatch.pos=nextPos;openManualReview(nextId);toast(decision==='accepted'?'Принято · открыта следующая работа':'На доработку · открыта следующая работа');return}
    const login=shManualReviewBatch.login;shManualReviewBatch={login:null,ids:[],pos:0,total:0};renderMentor();toast(`Готово — все работы ${login} из этой очереди проверены`);return;
  }
  renderMentor();toast(decision==='accepted'?'Работа принята':'Отправлено на доработку');
};

// Keep the main RG dashboard compact: one attention row per employee, not one row per manual case.
renderManagerMentor=function(){
  renderManagerMentorV718();
  const page=$('page-mentor');if(!page)return;
  const groups=shManualPendingGroups(),u=teamRows(S.profile.login),overdueUsers=u.filter(x=>x.overdue),attentionCard=page.querySelector('.sh74-manager-main .sh74-light-card');
  if(attentionCard){
    const items=[];
    for(const g of groups.slice(0,4))items.push(`<div class="sh74-attention-row">${sh74AvatarHtml(g.login,g.name)}<div><b>${esc(g.name)}</b><div class="meta">${g.count} ${shManualWorkWord(g.count)} на проверке · ${esc(shManualRangeText(g.rows))}</div></div><button class="sh74-attention-status" onclick="openManualReviewGroup('${jsq(g.login)}')">Проверить ${g.count}</button></div>`);
    for(const x of overdueUsers.slice(0,Math.max(0,4-items.length)))items.push(`<div class="sh74-attention-row">${sh74AvatarHtml(x.login,x.name||x.login)}<div><b>${esc(x.name||x.login)}</b><div class="meta">Просрочено назначений: ${x.overdue}</div></div><button class="sh74-attention-status bad" onclick="openUserAttempts('${jsq(x.login)}')">Просрочено</button></div>`);
    attentionCard.innerHTML=`<div class="sh74-card-head"><h3>Требуют внимания</h3><small>${items.length?'Актуальные задачи':'Всё спокойно'}</small></div>${items.join('')||'<div class="muted">Новых работ и просрочек сейчас нет 🎉</div>'}`;
  }
  const kpis=page.querySelector('.sh74-kpis');
  if(kpis)kpis.insertAdjacentHTML('afterend',manualReviewPanelHtml());
  else page.insertAdjacentHTML('afterbegin',manualReviewPanelHtml());
};
/* ===== end grouped RG manual review queue v8.6 ===== */

/* ===== SkillHub 2026-09-24 — RG self-practice sandbox v8.7 ===== */
titles.rgpractice=['Демо','Пройдите путь сотрудника и руководителя на ручном кейсе'];
function sh816DemoRoleShort(){return S.profile?.role==='rs'?'РС':'РГ'}
function sh816DemoRoleLong(){return S.profile?.role==='rs'?'РУКОВОДИТЕЛЯ СЕКТОРА':'РУКОВОДИТЕЛЯ ГРУППЫ'}
function sh816DemoAllowed(){return ['mentor','rs'].includes(S.profile?.role)}

function rgDemoKey(){return 'skillhub_rg_demo_'+String(S.profile?.login||'mentor')}
function rgDemoLoad(){try{const v=JSON.parse(localStorage.getItem(rgDemoKey())||'[]');return Array.isArray(v)?v:[]}catch(e){return []}}
function rgDemoSave(rows){localStorage.setItem(rgDemoKey(),JSON.stringify(rows||[]))}
function rgDemoLatest(contentId){return rgDemoLoad().filter(x=>x.content_id===contentId).sort((a,b)=>Number(b.version||0)-Number(a.version||0))[0]||null}
function rgDemoManualContent(){return (S.content||[]).filter(x=>x.status==='published'&&x.type==='manual'&&x.section==='soft')}
function rgDemoStatusText(s){return s==='submitted'?'На проверке':s==='revision_requested'?'На доработке':s==='accepted'?'Принято':'Не начато'}
function rgDemoStatusClass(s){return s==='accepted'?'good':s==='revision_requested'?'warn':s==='submitted'?'bad':''}
function rgDemoRowsByStatus(s){return rgDemoLoad().filter(x=>x.status===s).sort((a,b)=>Date.parse(b.updated_at||b.created_at||0)-Date.parse(a.updated_at||a.created_at||0))}
function rgDemoReset(){const role=sh816DemoRoleShort();if(!confirm(`Сбросить тестовые ответы в разделе «Демо ${role}»? Рабочие данные сотрудников не изменятся.`))return;localStorage.removeItem(rgDemoKey());renderRgPractice();toast('Демо очищено')}

function rgDemoOwnAttempts(sec){return (S.attempts||[]).filter(x=>x.login===S.profile?.login&&x.section===sec)}
function rgDemoAvg(sec){const a=rgDemoOwnAttempts(sec);return a.length?Math.round(a.reduce((s,x)=>s+Number(x.score||0),0)/a.length):null}
function rgDemoLast(sec){return rgDemoOwnAttempts(sec).slice().sort((a,b)=>Date.parse(b.created_at||0)-Date.parse(a.created_at||0))[0]||null}
function rgDemoTypingStats(){const a=rgDemoOwnAttempts('typing');if(!a.length)return{count:0,bestCpm:null,lastAcc:null,last:null};const bySpeed=a.slice().sort((x,y)=>Number(y.cpm||0)-Number(x.cpm||0));const last=a.slice().sort((x,y)=>Date.parse(y.created_at||0)-Date.parse(x.created_at||0))[0];return{count:a.length,bestCpm:Number(bySpeed[0]?.cpm||0)||null,lastAcc:last?Number(last.score||0):null,last}}
function rgDemoResultsHtml(){
  const rows=(S.attempts||[]).filter(x=>x.login===S.profile?.login&&['soft','hard','typing'].includes(x.section)).slice().sort((a,b)=>Date.parse(b.created_at||0)-Date.parse(a.created_at||0));
  const soft=rows.filter(x=>x.section==='soft'),hard=rows.filter(x=>x.section==='hard'),typing=rows.filter(x=>x.section==='typing');
  const avg=a=>a.length?Math.round(a.reduce((s,x)=>s+Number(x.score||0),0)/a.length):null;
  const last=a=>a[0]||null;
  const bestTyping=typing.length?typing.slice().sort((a,b)=>Number(b.cpm||0)-Number(a.cpm||0))[0]:null;
  const role=sh816DemoRoleShort();
  const name=S.profile?.name||S.profile?.login||(role==='РС'?'Руководитель сектора':'Руководитель группы');
  const login=S.profile?.login||'';
  const attempts=rows.length;
  const lastAt=rows[0]?.created_at?new Date(rows[0].created_at).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'—';
  return `<section class="rg-demo-results">
    <div class="rg-demo-results-head"><div><h3>📊 Как ${role} увидит результаты сотрудника</h3><p>Здесь вы сами выступаете как сотрудник. После прохождения Soft / Hard / Печати откройте карточку и посмотрите попытки, ответы и ошибки.</p></div></div>
    <div class="rg-demo-self-card">
      <div class="rg-demo-self-main">
        ${sh74AvatarHtml(login,name)}
        <div class="rg-demo-self-person"><b>${esc(name)}</b><small>${esc(login)} · Демо ${role}</small><span>${attempts?`${attempts} попыток · последняя ${lastAt}`:'Попыток пока нет'}</span></div>
        <button class="btn primary rg-demo-open-card" onclick="openRgDemoSelfAttempts()">Открыть карточку →</button>
      </div>
      <div class="rg-demo-self-metrics">
        <div><span>Soft Skills</span><strong>${soft.length?avg(soft)+'%':'—'}</strong><small>${soft.length?`${soft.length} попыток · последняя ${Number(last(soft)?.score||0)}%`:'нет попыток'}</small></div>
        <div><span>Hard Skills</span><strong>${hard.length?avg(hard)+'%':'—'}</strong><small>${hard.length?`${hard.length} попыток · последняя ${Number(last(hard)?.score||0)}%`:'нет попыток'}</small></div>
        <div><span>Печать</span><strong>${bestTyping?Number(bestTyping.cpm||0)+' зн/мин':'—'}</strong><small>${typing.length?`${typing.length} попыток · последняя точность ${Number(last(typing)?.score||0)}%`:'нет попыток'}</small></div>
      </div>
      <div class="rg-demo-self-actions"><span>Сначала пройдите как сотрудник:</span><button class="btn secondary" onclick="openSoftHub()">Soft</button><button class="btn secondary" onclick="openSection('hard')">Hard</button><button class="btn secondary" onclick="startTyping()">Печать</button></div>
    </div>
  </section>`;
}
function openRgDemoSelfAttempts(){
  if(!sh816DemoAllowed())return;
  const role=sh816DemoRoleShort();
  const rows=(S.attempts||[]).filter(x=>x.login===S.profile.login&&['soft','hard','typing'].includes(x.section)).slice().sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  const name=S.profile?.name||S.profile?.login||(role==='РС'?'Руководитель сектора':'Руководитель группы');
  const avg=sec=>{const a=rows.filter(x=>x.section===sec);return a.length?Math.round(a.reduce((s,x)=>s+Number(x.score||0),0)/a.length):null};
  const typing=rows.filter(x=>x.section==='typing'),bestTyping=typing.length?typing.slice().sort((a,b)=>Number(b.cpm||0)-Number(a.cpm||0))[0]:null;
  showModal(`<div class="modal-head"><div><span class="rg-demo-kicker">ДЕМО ${role} · КАК КАРТОЧКА СОТРУДНИКА</span><h2>${esc(name)}</h2><div class="meta">${esc(S.profile.login)} · история попыток</div></div><button class="btn secondary" onclick="closeModal()">✕</button></div>
    <div class="rg-demo-modal-kpis"><div><small>Soft</small><strong>${avg('soft')===null?'—':avg('soft')+'%'}</strong></div><div><small>Hard</small><strong>${avg('hard')===null?'—':avg('hard')+'%'}</strong></div><div><small>Печать</small><strong>${bestTyping?Number(bestTyping.cpm||0)+' зн/мин':'—'}</strong></div><div><small>Попыток</small><strong>${rows.length}</strong></div></div>
    <div class="hint rg-demo-card-hint">Нажмите «Ответы» у попытки — увидите, какой вариант «сотрудник» выбрал, какой был правильным и где была ошибка. Это тот же просмотр, который руководитель использует в карточке сотрудника.</div>
    <div class="card table-wrap"><table class="table"><thead><tr><th>Дата</th><th>Раздел</th><th>Тема</th><th>Результат</th><th>Детали</th></tr></thead><tbody>${rows.length?rows.map(a=>`<tr><td>${new Date(a.created_at).toLocaleString('ru-RU')}</td><td>${secName(a.section)}</td><td>${esc(a.topic||'—')}</td><td>${a.type==='typing'?`<span class="pill good">${Number(a.cpm||0)} зн/мин</span><div class="muted small">точность ${Number(a.score||0)}%</div>`:`<span class="pill ${Number(a.score)>=90?'good':Number(a.score)>=75?'warn':'bad'}">${a.score}%</span>`}</td><td>${a.type==='typing'?'<span class="muted small">скорость / точность</span>':attemptDetails(a).length?`<button class="btn secondary" onclick="openAttemptReview('${a.id}')">Ответы</button>`:'<span class="muted small">нет детализации</span>'}</td></tr>`).join(''):'<tr><td colspan="5" class="muted">Сначала пройдите Soft Skills, Hard Skills или Печать в «Демо ${role}».</td></tr>'}</tbody></table></div>`);
}
function renderRgPractice(){
  if(!sh816DemoAllowed()){go('mentor');return}
  const role=sh816DemoRoleShort(),roleLong=sh816DemoRoleLong();
  $('pageTitle').textContent=`Демо ${role}`;$('pageSub').textContent='Пройдите путь сотрудника и руководителя на ручном кейсе';
  const page=$('page-rgpractice'),manual=rgDemoManualContent(),pending=rgDemoRowsByStatus('submitted'),revision=rgDemoRowsByStatus('revision_requested'),accepted=rgDemoRowsByStatus('accepted');
  const pendingCard=pending.length?pending.map(r=>{const c=S.content.find(x=>x.id===r.content_id);return `<button class="rg-demo-review-row" onclick="openRgDemoReview('${r.id}')"><span><b>${esc(c?.title||'Ручной тренажёр')}</b><small>версия ${r.version} · ${new Date(r.updated_at||r.created_at).toLocaleString('ru-RU')}</small></span><span>Проверить →</span></button>`}).join(''):'<div class="rg-demo-empty">Пока нет тестовых работ на проверке.</div>';
  const revisionCard=revision.length?revision.map(r=>{const c=S.content.find(x=>x.id===r.content_id);return `<button class="rg-demo-review-row" onclick="startRgDemoManual('${r.content_id}')"><span><b>${esc(c?.title||'Ручной тренажёр')}</b><small>${r.mentor_comment?'Комментарий: '+esc(r.mentor_comment):'Верните кейс в работу и отправьте новую версию'}</small></span><span>Доработать →</span></button>`}).join(''):'';
  page.innerHTML=`<div class="rg-demo-intro"><div><span class="rg-demo-kicker">ТОЛЬКО ДЛЯ ${roleLong}</span><h2>Попробуйте весь цикл ручного тренажёра</h2><p>Ручной демо-кейс безопасный и хранится только в вашем браузере. Автоматические Soft, Hard и Печать сохраняют только ваши личные результаты ${role} и не смешиваются со статистикой сотрудников.</p></div><button class="btn secondary" onclick="rgDemoReset()">Сбросить демо</button></div>
  ${rgDemoResultsHtml()}
  <div class="rg-demo-steps"><div><b>1</b><span>Пройдите ручной кейс</span></div><div><b>2</b><span>Отправьте себе на проверку</span></div><div><b>3</b><span>Оставьте комментарий / верните на доработку</span></div></div>
  <div class="rg-demo-grid"><section class="card"><div class="rg-demo-card-head"><div><h3>✍️ Ручные кейсы</h3><p>Выберите любой опубликованный кейс Soft Skills</p></div><span class="pill">${manual.length}</span></div><div class="rg-demo-case-list">${manual.slice(0,12).map(c=>{const last=rgDemoLatest(c.id);return `<button class="rg-demo-case" onclick="startRgDemoManual('${c.id}')"><span><b>${esc(c.title||c.question||'Ручной кейс')}</b><small>${esc(c.topic||'Soft Skills')}</small></span>${last?`<em class="pill ${rgDemoStatusClass(last.status)}">${rgDemoStatusText(last.status)}</em>`:'<em>Открыть →</em>'}</button>`}).join('')||'<div class="rg-demo-empty">Ручные кейсы пока не опубликованы.</div>'}</div></section>
  <section class="card"><div class="rg-demo-card-head"><div><h3>📥 На проверке у меня</h3><p>То, что вы только что отправили как «сотрудник»</p></div><span class="pill ${pending.length?'warn':'good'}">${pending.length}</span></div><div class="rg-demo-case-list">${pendingCard}</div>${revisionCard?`<div class="rg-demo-subhead">↩ На доработке</div><div class="rg-demo-case-list">${revisionCard}</div>`:''}${accepted.length?`<div class="rg-demo-subhead">✓ Уже принято: ${accepted.length}</div>`:''}</section></div>`;
}

function startRgDemoManual(contentId){
  if(!sh816DemoAllowed())return;
  const role=sh816DemoRoleShort();
  const c=S.content.find(x=>x.id===contentId);if(!c||c.type!=='manual'){toast('Ручной кейс не найден');return}
  const last=rgDemoLatest(contentId),editable=!last||last.status==='revision_requested',prefill=last?.status==='revision_requested'?last.answer:'';
  goRun();$('pageTitle').textContent=`Демо ${role}`;$('pageSub').textContent='Сейчас вы в роли сотрудника';
  $('page-run').innerHTML=`<div class="card manual-run-card rg-demo-run"><div class="actions" style="justify-content:space-between"><button class="btn secondary" onclick="go('rgpractice')">← Назад</button><span class="pill">Демо · роль сотрудника</span></div><div class="meta" style="margin-top:14px">${esc(c.topic||'Soft Skills')}</div><h2>${esc(c.title||'Ручной тренажёр')}</h2><p class="muted">${esc(c.instruction||'Сформулируйте ответ своими словами.')}</p><div class="manual-prompt">${esc(c.question||c.title||'')}</div>${last&&last.status==='revision_requested'?`<div class="manual-status-box warn"><b>Руководитель вернул работу на доработку</b><div>${esc(last.mentor_comment||'Попробуйте улучшить формулировку.')}</div>${last.mentor_suggestion?`<div class="review-note suggestion"><b>Пример:</b> ${esc(last.mentor_suggestion)}</div>`:''}</div>`:''}${last&&last.status==='accepted'?`<div class="manual-status-box good"><b>Работа уже принята</b><div class="muted small">Для нового цикла нажмите «Сбросить демо» в разделе Демо ${role}.</div></div>`:''}${last&&last.status==='submitted'?`<div class="manual-status-box"><b>Работа уже отправлена вам на проверку</b><div class="muted small">Вернитесь в «Демо ${role}» и откройте её в блоке «На проверке у меня».</div></div>`:''}${editable?`<div class="field manual-answer-field"><label>${last?'Исправленный вариант':'Ваш ответ'}</label><textarea id="rgDemoAnswer" rows="7" placeholder="Напишите ответ так, как сказали бы его клиенту...">${esc(prefill)}</textarea></div><div class="actions" style="justify-content:flex-end"><button class="btn primary" onclick="submitRgDemoManual('${contentId}')">Отправить себе на проверку →</button></div>`:`<div class="actions" style="justify-content:flex-end"><button class="btn primary" onclick="go('rgpractice')">Перейти к проверке →</button></div>`}</div>`;
}

function submitRgDemoManual(contentId){
  const answer=$('rgDemoAnswer')?.value.trim()||'';if(answer.length<3){toast('Напишите тестовый ответ');return}
  const rows=rgDemoLoad(),prev=rows.filter(x=>x.content_id===contentId).sort((a,b)=>Number(b.version||0)-Number(a.version||0))[0],version=prev?Number(prev.version||1)+1:1,now=new Date().toISOString();
  rows.push({id:'rgdemo-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),content_id:contentId,version,answer,status:'submitted',mentor_comment:null,mentor_suggestion:null,created_at:now,updated_at:now});rgDemoSave(rows);go('rgpractice');toast('Отправлено себе на проверку')
}

function openRgDemoReview(id){
  const rows=rgDemoLoad(),r=rows.find(x=>x.id===id);if(!r||r.status!=='submitted'){renderRgPractice();return}const c=S.content.find(x=>x.id===r.content_id);
  showModal(`<div class="modal-head"><div><span class="rg-demo-kicker">ДЕМО · РОЛЬ РУКОВОДИТЕЛЯ</span><h2>${esc(c?.title||'Ручной тренажёр')}</h2><div class="meta">Ваш тестовый ответ · версия ${r.version}</div></div><button class="btn secondary" onclick="closeModal()">✕</button></div><div class="review-prompt"><b>Задание</b><div>${esc(c?.question||'')}</div>${c?.instruction?`<small>${esc(c.instruction)}</small>`:''}</div><div class="review-current-answer"><b>Ответ «сотрудника»</b><div>${esc(r.answer)}</div></div><div class="form-grid"><div class="field full"><label>Комментарий руководителя</label><textarea id="rgDemoComment" rows="4" placeholder="Например: добавьте больше присоединения к эмоции клиента"></textarea></div><div class="field full"><label>Как можно было сформулировать <span class="muted">(необязательно)</span></label><textarea id="rgDemoSuggestion" rows="3" placeholder="Ваш пример"></textarea></div></div><div class="actions review-actions"><button class="btn secondary" onclick="saveRgDemoReview('${id}','revision_requested')">↩ На доработку</button><button class="btn primary" onclick="saveRgDemoReview('${id}','accepted')">✓ Принято</button></div>`)
}

function saveRgDemoReview(id,decision){
  const rows=rgDemoLoad(),i=rows.findIndex(x=>x.id===id);if(i<0)return;const comment=$('rgDemoComment')?.value.trim()||'',suggestion=$('rgDemoSuggestion')?.value.trim()||'';if(decision==='revision_requested'&&!comment){toast('Для доработки напишите комментарий');return}rows[i]={...rows[i],status:decision,mentor_comment:comment||null,mentor_suggestion:suggestion||null,updated_at:new Date().toISOString()};rgDemoSave(rows);closeModal();go('rgpractice');toast(decision==='accepted'?'Тестовая работа принята':'Тестовая работа возвращена на доработку')
}

const sh87RenderBase=render;
render=function(p){if(p==='rgpractice')return renderRgPractice();return sh87RenderBase(p)};
const sh87EnterBase=enterApp;
enterApp=function(){sh87EnterBase();document.querySelectorAll('.rg-only').forEach(x=>x.classList.toggle('hidden',S.profile?.role!=='mentor'))};
/* ===== end RG self-practice sandbox v8.7 ===== */


/* ===== SkillHub V8.14 — simplified RG / RS workspaces ===== */
function sh814SetNavLabel(page,label){
  const el=document.querySelector(`.nav-btn[data-page="${page}"] .nav-text`);if(el)el.textContent=label;
}
function sh814ConfigureRoleNavigation(){
  if(!S.profile)return;
  const nav=document.querySelector('.sidebar nav');if(!nav)return;
  const buttons=[...nav.querySelectorAll('.nav-btn')];
  const byPage=page=>nav.querySelector(`.nav-btn[data-page="${page}"]`);
  const apply=(order,labels={})=>{
    buttons.forEach(b=>b.classList.add('hidden'));
    for(const page of order){const b=byPage(page);if(!b)continue;b.classList.remove('hidden');nav.appendChild(b);}
    Object.entries(labels).forEach(([page,label])=>sh814SetNavLabel(page,label));
  };
  if(S.profile.role==='mentor'){
    apply(['mentor','employees','training','assignments','content','rgpractice'],{
      mentor:'Моя группа',employees:'Сотрудники',training:'Тренировки',assignments:'Назначения',content:'Контент',rgpractice:'Демо РГ'
    });
  }else if(S.profile.role==='rs'){
    apply(['mentor','employees','training','content','progress','rgpractice'],{
      mentor:'Мой сектор',employees:'Руководители',training:'Тренировки',content:'Контент',progress:'Отчёты',rgpractice:'Демо РС'
    });
  }
}

function sh814MentorPendingGroups(){
  return typeof shManualPendingGroups==='function'?shManualPendingGroups():[];
}
function sh814AttentionEmployees(users,pendingGroups){
  const ids=new Set();
  for(const g of pendingGroups)ids.add(g.login);
  for(const u of users){if((u.overdue||0)>0||(u.gaps?.length||0)>0)ids.add(u.login)}
  return ids.size;
}
function sh814ManagerPendingCount(managerLogin){
  const team=new Set(employeesForManager(managerLogin).map(x=>x.login));
  return (S.manualAnswers||[]).filter(x=>x.status==='submitted'&&team.has(x.login)).length;
}
function sh814TeamCompactSummary(users){
  const soft=sh74Avg(users.map(x=>x.soft)),hard=sh74Avg(users.map(x=>x.hard)),prog=sh74TeamAssignmentProgress(users);
  return `<div class="sh74-kpis"><div class="sh74-kpi"><small>Soft Skills</small><strong>${soft||'—'}${soft?'%':''}</strong></div><div class="sh74-kpi"><small>Hard Skills</small><strong>${hard||'—'}${hard?'%':''}</strong></div><div class="sh74-kpi"><small>Выполнение назначений</small><strong>${prog.pct}%</strong></div><div class="sh74-kpi"><small>Завершено</small><strong>${prog.done}/${prog.total}</strong></div></div>`;
}

renderManagerMentor=function(){
  const users=teamRows(S.profile.login),pendingGroups=sh814MentorPendingGroups(),pendingCount=pendingGroups.reduce((n,g)=>n+Number(g.count||0),0),overdueUsers=users.filter(x=>(x.overdue||0)>0),attentionCount=sh814AttentionEmployees(users,pendingGroups);
  $('pageTitle').textContent='Моя группа';$('pageSub').textContent=`${S.profile.group_name||S.profile.name} · главное по команде`;
  const attention=[];const used=new Set();
  for(const g of pendingGroups.slice(0,4)){
    used.add(g.login);attention.push(`<div class="sh74-attention-row">${sh74AvatarHtml(g.login,g.name)}<div><b>${esc(g.name)}</b><div class="meta">${g.count} ${shManualWorkWord(g.count)} на проверке · ${esc(shManualRangeText(g.rows))}</div></div><button class="sh74-attention-status" onclick="openManualReviewGroup('${jsq(g.login)}')">Проверить ${g.count}</button></div>`);
  }
  for(const u of overdueUsers){if(attention.length>=5||used.has(u.login))continue;used.add(u.login);attention.push(`<div class="sh74-attention-row">${sh74AvatarHtml(u.login,u.name||u.login)}<div><b>${esc(u.name||u.login)}</b><div class="meta">Просрочено назначений: ${u.overdue}</div></div><button class="sh74-attention-status bad" onclick="openUserAttempts('${jsq(u.login)}')">Открыть</button></div>`)}
  for(const u of users.filter(x=>(x.gaps?.length||0)>0)){if(attention.length>=5||used.has(u.login))continue;used.add(u.login);attention.push(`<div class="sh74-attention-row">${sh74AvatarHtml(u.login,u.name||u.login)}<div><b>${esc(u.name||u.login)}</b><div class="meta">Зон развития: ${u.gaps.length}</div></div><button class="sh74-attention-status" onclick="openUserAttempts('${jsq(u.login)}')">Карточка</button></div>`)}
  $('page-mentor').innerHTML=`<div class="sh74-manager"><div class="sh74-manager-top"><div><h2>Моя группа</h2><p>Только то, что требует внимания прямо сейчас</p></div><div class="actions"><button class="btn secondary" onclick="openMentorExport('','${jsq(S.profile.login)}','')">Отчёт Excel</button><button class="btn primary" onclick="openAssignmentEditor()">+ Назначить</button></div></div>
  <div class="sh74-kpis"><div class="sh74-kpi"><small>Сотрудники</small><strong>${users.length}</strong></div><div class="sh74-kpi warn"><small>На проверке</small><strong>${pendingCount}</strong></div><div class="sh74-kpi bad"><small>Просрочено</small><strong>${overdueUsers.reduce((n,x)=>n+Number(x.overdue||0),0)}</strong></div><div class="sh74-kpi ${attentionCount?'warn':'good'}"><small>Нужна помощь</small><strong>${attentionCount}</strong></div></div>
  <div class="sh74-light-card"><div class="sh74-card-head"><h3>Требуют внимания</h3><small>${attention.length?'Актуальные задачи':'Всё спокойно'}</small></div>${attention.join('')||'<div class="muted">Новых работ, просрочек и явных зон развития сейчас нет 🎉</div>'}</div>
  <div class="sh74-section-head"><h2>Моя группа</h2><button class="sh74-link" onclick="go('employees')">Смотреть всех</button></div>${sh74TeamRowsHtml(users.slice(0,6))}
  <div class="sh74-section-head"><h2>Команда в целом</h2></div>${sh814TeamCompactSummary(users)}</div>`;
};

renderSectorAdmin=function(){
  const sector=S.profile.sector_name||'Основной сектор',managers=managersInSector(sector),groups=managers.map(m=>managerMetrics(m.login)),employees=scopeEmployees();
  const pendingByManager=new Map(managers.map(m=>[m.login,sh814ManagerPendingCount(m.login)]));
  const attentionGroups=groups.filter(g=>(g.overdue||0)>0||(g.gaps||0)>0||(pendingByManager.get(g.manager?.login)||0)>0)
    .sort((a,b)=>((b.overdue||0)+(b.gaps||0)+(pendingByManager.get(b.manager?.login)||0))-((a.overdue||0)+(a.gaps||0)+(pendingByManager.get(a.manager?.login)||0)));
  const pendingTotal=[...pendingByManager.values()].reduce((a,b)=>a+b,0);
  $('pageTitle').textContent='Мой сектор';$('pageSub').textContent=`${sector} · обзор групп и руководителей`;
  $('page-mentor').innerHTML=`<div class="sh74-manager"><div class="sh74-manager-top"><div><h2>Мой сектор</h2><p>Сначала группы — затем конкретный сотрудник</p></div><div class="actions"><button class="btn secondary" onclick="go('progress')">Отчёты</button></div></div>
  <div class="sh74-kpis"><div class="sh74-kpi"><small>Руководители</small><strong>${managers.length}</strong></div><div class="sh74-kpi"><small>Сотрудники</small><strong>${employees.length}</strong></div><div class="sh74-kpi warn"><small>На проверке у РГ</small><strong>${pendingTotal}</strong></div><div class="sh74-kpi ${attentionGroups.length?'warn':'good'}"><small>Группы внимания</small><strong>${attentionGroups.length}</strong></div></div>
  <div class="sh74-light-card"><div class="sh74-card-head"><h3>Группы, которые требуют внимания</h3><small>${attentionGroups.length?attentionGroups.length+' групп':'Всё спокойно'}</small></div>${attentionGroups.slice(0,5).map(g=>{const login=g.manager?.login||'',p=pendingByManager.get(login)||0;const details=[p?`${p} на проверке`:'',g.overdue?`${g.overdue} просрочено`:'',g.gaps?`${g.gaps} зон развития`:''].filter(Boolean).join(' · ');return `<div class="sh74-attention-row">${sh74AvatarHtml(login,g.manager?.name||login)}<div><b>${esc(g.manager?.name||login||'РГ')}</b><div class="meta">${g.count} сотрудников${details?' · '+esc(details):''}</div></div><button class="sh74-attention-status ${g.overdue?'bad':''}" onclick="openManagerDashboard('${jsq(login)}')">Открыть</button></div>`}).join('')||'<div class="muted">Сейчас нет групп с просрочками, работами на проверке или подтверждёнными зонами развития.</div>'}</div>
  <div class="sh74-section-head"><h2>Руководители</h2><button class="sh74-link" onclick="go('employees')">Смотреть всех</button></div><div class="sh74-manager-list">${groups.slice(0,6).map(g=>{const login=g.manager?.login||'';return `<div class="sh74-team-row">${sh74AvatarHtml(login,g.manager?.name||login)}<div><b>${esc(g.manager?.name||login||'РГ')}</b><small>${esc(g.manager?.group_name||'Команда')} · ${g.count} сотрудников</small></div><span class="sh74-score">${g.attempts||0}</span><button class="btn secondary" onclick="openManagerDashboard('${jsq(login)}')">Команда</button></div>`}).join('')||'<div class="muted">Руководителей пока нет.</div>'}</div></div>`;
};

function sh814RenderRSManagers(){
  const sector=S.profile.sector_name||'Основной сектор',managers=managersInSector(sector),groups=managers.map(m=>managerMetrics(m.login));
  $('pageTitle').textContent='Руководители';$('pageSub').textContent=`${sector} · группы и нагрузка`;
  $('page-employees').innerHTML=`<div class="sh74-manager"><div class="sh74-manager-top"><div><h2>Руководители групп</h2><p>${groups.length} руководителей в секторе</p></div></div><div class="sh74-manager-list">${groups.map(g=>{const login=g.manager?.login||'',p=sh814ManagerPendingCount(login);return `<div class="sh74-team-row">${sh74AvatarHtml(login,g.manager?.name||login)}<div><b>${esc(g.manager?.name||login||'РГ')}</b><small>${esc(g.manager?.group_name||'Команда')} · ${g.count} сотрудников · ${g.attempts||0} попыток${p?' · '+p+' на проверке':''}${g.overdue?' · '+g.overdue+' просрочено':''}</small></div><span class="sh74-score">${g.gaps||0}</span><button class="btn secondary" onclick="openManagerDashboard('${jsq(login)}')">Открыть группу</button></div>`}).join('')||'<div class="muted">Руководителей пока нет.</div>'}</div></div>`;
}
const sh814RenderEmployeesBase=renderEmployees;
renderEmployees=function(){if(isRS())return sh814RenderRSManagers();return sh814RenderEmployeesBase()};

function sh814RenderRSReports(){
  const sector=S.profile.sector_name||'Основной сектор',managers=managersInSector(sector),employees=scopeEmployees(),attempts=S.attempts.filter(a=>employees.some(u=>u.login===a.login));
  const avg=attempts.length?Math.round(attempts.reduce((s,a)=>s+Number(a.score||0),0)/attempts.length):null;
  $('pageTitle').textContent='Отчёты';$('pageSub').textContent=`${sector} · выгрузки по сектору и группам`;
  $('page-progress').innerHTML=`<div class="sh74-manager"><div class="sh74-manager-top"><div><h2>Отчёты сектора</h2><p>Детальные Excel-выгрузки без операционных действий</p></div><button class="btn primary" onclick="openMentorExport('${jsq(sector)}','','')">⬇ Полный отчёт сектора</button></div><div class="sh74-kpis"><div class="sh74-kpi"><small>Руководители</small><strong>${managers.length}</strong></div><div class="sh74-kpi"><small>Сотрудники</small><strong>${employees.length}</strong></div><div class="sh74-kpi"><small>Попытки</small><strong>${attempts.length}</strong></div><div class="sh74-kpi"><small>Средний результат</small><strong>${avg===null?'—':avg+'%'}</strong></div></div><div class="sh74-section-head"><h2>Отчёты по группам</h2></div><div class="sh74-manager-list">${managers.map(m=>{const g=managerMetrics(m.login);return `<div class="sh74-team-row">${sh74AvatarHtml(m.login,m.name||m.login)}<div><b>${esc(m.name||m.login)}</b><small>${esc(m.group_name||'Команда')} · ${g.count} сотрудников</small></div><span class="sh74-score">${g.attempts||0}</span><button class="btn secondary" onclick="openMentorExport('${jsq(sector)}','${jsq(m.login)}','')">Excel</button></div>`}).join('')||'<div class="muted">Руководителей пока нет.</div>'}</div></div>`;
}
const sh814RenderProgressBase=renderProgress;
renderProgress=function(){if(isRS())return sh814RenderRSReports();return sh814RenderProgressBase()};

const sh814OpenAssignmentEditorBase=openAssignmentEditor;
openAssignmentEditor=function(prefill={}){if(isRS()){toast('Назначения сотрудникам выполняет руководитель группы');return}return sh814OpenAssignmentEditorBase(prefill)};

const sh814GoBase=go;
go=function(page){if(isRS()&&page==='assignments')page='mentor';sh814GoBase(page);sh814ConfigureRoleNavigation()};

const sh814EnterAppBase=enterApp;
enterApp=function(){sh814EnterAppBase();sh814ConfigureRoleNavigation()};
/* ===== end SkillHub V8.14 ===== */

/* ===== SkillHub V8.15 — RG/RS navigation + modal back step ===== */
let sh815EmployeeContext={login:'',managerLogin:''};

function sh815ConfigureRoleNavigation(){
  if(!S.profile)return;
  const nav=document.querySelector('.sidebar nav');if(!nav)return;
  const buttons=[...nav.querySelectorAll('.nav-btn')];
  const byPage=page=>nav.querySelector(`.nav-btn[data-page="${page}"]`);
  const apply=(order,labels={})=>{
    buttons.forEach(b=>b.classList.add('hidden'));
    for(const page of order){const b=byPage(page);if(!b)continue;b.classList.remove('hidden');nav.appendChild(b)}
    Object.entries(labels).forEach(([page,label])=>sh814SetNavLabel(page,label));
  };
  if(S.profile.role==='mentor'){
    apply(['mentor','employees','training','assignments','content','rgpractice','notifications','profile'],{
      mentor:'Моя группа',employees:'Сотрудники',training:'Тренировки',assignments:'Назначения',content:'Контент',rgpractice:'Демо РГ',notifications:'Уведомления',profile:'Профиль'
    });
  }else if(S.profile.role==='rs'){
    apply(['mentor','employees','training','content','progress','rgpractice','notifications','profile'],{
      mentor:'Мой сектор',employees:'Руководители',training:'Тренировки',content:'Контент',progress:'Отчёты',rgpractice:'Демо РС',notifications:'Уведомления',profile:'Профиль'
    });
  }
}

function sh815TeamTableHtml(users,managerLogin=''){
  return `<div class="card table-wrap"><table class="table"><thead><tr><th>Сотрудник</th><th>Soft</th><th>Hard</th><th>Потребность</th><th>Пробелов</th><th>Назначения</th><th>Попыток</th><th></th></tr></thead><tbody>${users.map(x=>`<tr><td><b>${esc(x.name||x.login)}</b><div class="meta">${esc(x.login)}</div></td><td>${x.soft===null?'—':x.soft+'%'}</td><td>${x.hard===null?'—':x.hard+'%'}</td><td>${x.needs===null?'—':x.needs+'%'}</td><td>${x.gaps.length?`<span class="pill bad">${x.gaps.length}</span>`:'—'}</td><td>${x.overdue?`<span class="pill bad">${x.overdue} проср.</span>`:`${x.completed} вып.`}</td><td>${x.attempts}</td><td><button class="btn secondary" onclick="openUserAttempts('${jsq(x.login)}','${jsq(managerLogin)}')">Карточка</button></td></tr>`).join('')||'<tr><td colspan="8" class="muted">Сотрудников нет.</td></tr>'}</tbody></table></div>`;
}

openManagerDashboard=function(login){
  const g=managerMetrics(login);
  sh815EmployeeContext={login:'',managerLogin:login};
  showModal(`<div class="modal-head"><div><h2>${esc(g.manager?.name||login)}</h2><div class="meta">${esc(g.manager?.group_name||'Команда')} · ${g.count} сотрудников</div></div><div class="actions"><button class="btn secondary" onclick="openMentorExport('','${jsq(login)}','')">⬇ Excel</button><button class="btn secondary" onclick="closeModal()">✕</button></div></div>${sh815TeamTableHtml(g.u,login)}`);
};

openUserAttempts=function(login,managerLogin=''){
  sh815EmployeeContext={login,managerLogin:managerLogin||''};
  const rows=S.attempts.filter(x=>x.login===login).slice().sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)),u=S.allowed.find(x=>x.login===login);
  const back=managerLogin?`<button class="btn secondary sh815-back-btn" onclick="openManagerDashboard('${jsq(managerLogin)}')">← К группе</button>`:'';
  showModal(`<div class="modal-head"><div><div class="sh815-modal-nav">${back}</div><h2>${esc(u?.name||login)}</h2><div class="meta">${esc(login)} · карточка сотрудника</div></div><div class="actions">${isManager()?`<button class="btn secondary" onclick="openMentorExport('', '${jsq(login)}')">⬇ Excel</button>`:''}<button class="btn secondary" onclick="closeModal()">✕</button></div></div><div class="sh74-section-head"><h2>Автоматические тренировки</h2></div><div class="card table-wrap"><table class="table"><thead><tr><th>Дата</th><th>Раздел</th><th>Тема</th><th>Результат</th><th>Детали</th></tr></thead><tbody>${rows.length?rows.map(a=>`<tr><td>${new Date(a.created_at).toLocaleString('ru-RU')}</td><td>${secName(a.section)}</td><td>${esc(a.topic)}</td><td><span class="pill ${Number(a.score)>=90?'good':Number(a.score)>=75?'warn':'bad'}">${a.score}%</span></td><td>${a.type==='typing'?'Скорость печати':attemptDetails(a).length?`<button class="btn secondary" onclick="openAttemptReview('${a.id}','${jsq(login)}','${jsq(managerLogin||'')}')">Ответы</button>`:'<span class="muted small">без детализации</span>'}</td></tr>`).join(''):'<tr><td colspan="5" class="muted">Автоматических попыток пока нет.</td></tr>'}</tbody></table></div>${sh742ManualReportHtml(login)}`);
};

openAttemptReview=function(id,returnLogin='',managerLogin=''){
  const a=S.attempts.find(x=>x.id===id);if(!a)return;
  const d=attemptDetails(a),correct=d.filter(x=>x.is_correct).length;
  const employeeLogin=returnLogin||((isManager()&&sh815EmployeeContext.login===a.login)?sh815EmployeeContext.login:'');
  const parentManager=managerLogin||((employeeLogin&&sh815EmployeeContext.login===employeeLogin)?sh815EmployeeContext.managerLogin:'');
  const body=d.length?d.map((q,idx)=>{
    const opts=Array.isArray(q.options)?q.options:[];
    return `<div class="review-item"><div class="review-head"><b>${q.kind==='dialogue'?'Шаг ':'Вопрос '}${q.step||idx+1}</b><span class="pill ${q.is_correct?'good':'bad'}">${q.is_correct?'Верно':'Ошибка'}</span></div>${q.title?`<div class="meta">${esc(q.title)}</div>`:''}<div class="review-question">${esc(q.question||'')}</div><div class="review-options">${opts.map((o,i)=>`<div class="review-option ${i===Number(q.correct)?'right':''} ${i===Number(q.selected)&&i!==Number(q.correct)?'picked-wrong':''}"><span class="review-num">${i+1}</span><span>${esc(o)}</span><span class="review-tag">${i===Number(q.selected)?'Выбрано':''}${i===Number(q.selected)&&i===Number(q.correct)?' · ':''}${i===Number(q.correct)?'Правильный':''}</span></div>`).join('')}</div>${q.explanation?`<div class="explain">${esc(q.explanation)}</div>`:''}</div>`;
  }).join(''):`<div class="hint">Эта попытка была сделана до обновления SkillHub 6.2, поэтому выбранные варианты тогда ещё не сохранялись. Процент и тема попытки сохранены.</div>`;
  const back=employeeLogin?`<button class="btn secondary sh815-back-btn" onclick="openUserAttempts('${jsq(employeeLogin)}','${jsq(parentManager||'')}')">← К карточке сотрудника</button>`:'';
  showModal(`<div class="modal-head"><div><div class="sh815-modal-nav">${back}</div><h2>Ответы сотрудника</h2><div class="meta">${esc(a.login)} · ${secName(a.section)} · ${esc(a.topic)} · ${new Date(a.created_at).toLocaleString('ru-RU')}</div></div><button class="btn secondary" onclick="closeModal()">✕</button></div><div class="review-summary"><span class="pill ${Number(a.score)>=90?'good':Number(a.score)>=75?'warn':'bad'}">${a.score}%</span><b>${attemptTypeName(a.type)}</b>${d.length?`<span class="muted small">${correct} из ${d.length} верно</span>`:''}</div>${body}`);
};

const sh815ManualHistoryBase=sh742OpenManualHistory;
sh742OpenManualHistory=function(contentId,login){
  const c=S.content.find(x=>x.id===contentId),rows=manualHistory(contentId,login),parent=(sh815EmployeeContext.login===login?sh815EmployeeContext.managerLogin:'');
  const back=`<button class="btn secondary sh815-back-btn" onclick="openUserAttempts('${jsq(login)}','${jsq(parent||'')}')">← К карточке сотрудника</button>`;
  showModal(`<div class="modal-head"><div><div class="sh815-modal-nav">${back}</div><h2>${esc(c?.title||'Ручная практика')}</h2><div class="meta">${esc(login)} · все версии</div></div><button class="btn secondary" onclick="closeModal()">✕</button></div>${rows.map(r=>`<div class="manual-history-item"><div class="actions" style="justify-content:space-between"><b>Версия ${r.version}</b><span class="pill ${manualStatusClass(r.status)}">${manualStatusText(r.status)}</span></div><div class="manual-answer-text">${esc(r.answer)}</div>${r.mentor_comment?`<div class="review-note"><b>Комментарий РГ</b><div>${esc(r.mentor_comment)}</div></div>`:''}${r.mentor_suggestion?`<div class="review-note suggestion"><b>Рекомендуемый вариант</b><div>${esc(r.mentor_suggestion)}</div></div>`:''}</div>`).join('')||'<div class="muted">Истории пока нет.</div>'}`);
};

const sh815GoBase=go;
go=function(page){sh815EmployeeContext={login:'',managerLogin:''};sh815GoBase(page);sh815ConfigureRoleNavigation()};

const sh815EnterAppBase=enterApp;
enterApp=function(){sh815EnterAppBase();sh815ConfigureRoleNavigation()};
/* ===== end SkillHub V8.15 ===== */

/* ===== SkillHub V8.16 — RS Training + Demo RS; RG layout unchanged ===== */

/* ===== SkillHub V8.17 — restore original RG workspace; keep RS V8.16 + back navigation ===== */
function sh817RestoreOriginalRgNavigation(){
  if(S.profile?.role!=='mentor')return;
  const nav=document.querySelector('.sidebar nav');if(!nav)return;
  const order=['home','training','progress','notifications','mentor','rgpractice','content','assignments','profile','employees'];
  const labels={home:'Главная',training:'Тренировки',progress:'Прогресс',notifications:'Уведомления',mentor:'Моя группа',rgpractice:'Демо РГ',content:'Контент',assignments:'Назначения',employees:'Сотрудники',profile:'Профиль'};
  const buttons=[...nav.querySelectorAll('.nav-btn')];
  buttons.forEach(b=>b.classList.add('hidden'));
  for(const page of order){const b=nav.querySelector(`.nav-btn[data-page="${page}"]`);if(!b)continue;b.classList.remove('hidden');nav.appendChild(b);const t=b.querySelector('.nav-text');if(t&&labels[page])t.textContent=labels[page]}
  const admin=nav.querySelector('.nav-btn[data-page="admin"]');if(admin)admin.classList.add('hidden');
}

function sh817RenderOriginalRgWorkspace(){
  renderManagerMentorV718();
  const page=$('page-mentor');if(!page)return;
  const groups=shManualPendingGroups(),u=teamRows(S.profile.login),overdueUsers=u.filter(x=>x.overdue),attentionCard=page.querySelector('.sh74-manager-main .sh74-light-card');
  if(attentionCard){
    const items=[];
    for(const g of groups.slice(0,4))items.push(`<div class="sh74-attention-row">${sh74AvatarHtml(g.login,g.name)}<div><b>${esc(g.name)}</b><div class="meta">${g.count} ${shManualWorkWord(g.count)} на проверке · ${esc(shManualRangeText(g.rows))}</div></div><button class="sh74-attention-status" onclick="openManualReviewGroup('${jsq(g.login)}')">Проверить ${g.count}</button></div>`);
    for(const x of overdueUsers.slice(0,Math.max(0,4-items.length)))items.push(`<div class="sh74-attention-row">${sh74AvatarHtml(x.login,x.name||x.login)}<div><b>${esc(x.name||x.login)}</b><div class="meta">Просрочено назначений: ${x.overdue}</div></div><button class="sh74-attention-status bad" onclick="openUserAttempts('${jsq(x.login)}')">Просрочено</button></div>`);
    attentionCard.innerHTML=`<div class="sh74-card-head"><h3>Требуют внимания</h3><small>${items.length?'Актуальные задачи':'Всё спокойно'}</small></div>${items.join('')||'<div class="muted">Новых работ и просрочек сейчас нет 🎉</div>'}`;
  }
  const kpis=page.querySelector('.sh74-kpis');
  if(kpis)kpis.insertAdjacentHTML('afterend',manualReviewPanelHtml());
  else page.insertAdjacentHTML('afterbegin',manualReviewPanelHtml());
}

renderManagerMentor=function(){return sh817RenderOriginalRgWorkspace()};

const sh817GoBase=go;
go=function(page){sh817GoBase(page);if(S.profile?.role==='mentor')sh817RestoreOriginalRgNavigation()};

const sh817EnterAppBase=enterApp;
enterApp=function(){sh817EnterAppBase();if(S.profile?.role==='mentor')sh817RestoreOriginalRgNavigation()};
/* ===== end SkillHub V8.17 ===== */

/* ===== SkillHub V8.18 — RG home restored + access-code action last ===== */
function sh818RestoreRgNavigation(){
  if(S.profile?.role!=='mentor')return;
  const nav=document.querySelector('.sidebar nav');if(!nav)return;
  const order=['home','training','progress','notifications','mentor','rgpractice','content','assignments','profile','employees'];
  const labels={home:'Главная',training:'Тренировки',progress:'Прогресс',notifications:'Уведомления',mentor:'Моя группа',rgpractice:'Демо РГ',content:'Контент',assignments:'Назначения',employees:'Сотрудники',profile:'Профиль'};
  const buttons=[...nav.querySelectorAll('.nav-btn')];
  buttons.forEach(b=>b.classList.add('hidden'));
  for(const page of order){
    const b=nav.querySelector(`.nav-btn[data-page="${page}"]`);if(!b)continue;
    b.classList.remove('hidden');nav.appendChild(b);
    const t=b.querySelector('.nav-text');if(t&&labels[page])t.textContent=labels[page];
  }
  const admin=nav.querySelector('.nav-btn[data-page="admin"]');if(admin)admin.classList.add('hidden');
}

function sh818MoveMentorCodesToEnd(){
  if(S.profile?.role!=='mentor')return;
  const actions=$('page-employees')?.querySelector('.toolbar .actions');if(!actions)return;
  const codeBtn=[...actions.querySelectorAll('button')].find(b=>/Коды новым/i.test(b.textContent||''));
  if(codeBtn)actions.appendChild(codeBtn);
}

const sh818RenderEmployeesBase=renderEmployees;
renderEmployees=function(){
  sh818RenderEmployeesBase();
  sh818MoveMentorCodesToEnd();
};

const sh818GoBase=go;
go=function(page){
  sh818GoBase(page);
  if(S.profile?.role==='mentor'){
    sh818RestoreRgNavigation();
    if(page==='employees')sh818MoveMentorCodesToEnd();
  }
};

const sh818EnterAppBase=enterApp;
enterApp=function(){
  sh818EnterAppBase();
  if(S.profile?.role==='mentor'){
    sh818RestoreRgNavigation();
    go('home');
  }
};
/* ===== end SkillHub V8.18 ===== */
/* SkillHub V8.21 — structured explanations + full theme contrast */
(function(){
  function norm(text){return String(text||'').replace(/\\+n/g,'\n').replace(/\r/g,'').trim()}
  function softSignals(text){
    const s=String(text||'').toLowerCase();
    return {
      emotion:/(понима|слышу|вижу|похоже|раздраж|тревог|пережив|неприят|устал|растер|разочар|эмоци)/i.test(s),
      action:/(провер|уточн|посмотр|предлага|зафикс|следующ|шаг|план|действ|сейчас|разбер)/i.test(s),
      need:/(важно|нужн|результат|понятн|чтобы|ожид|контрол|опора|маршрут)/i.test(s),
      question:/[?]|(уточн|расскаж|какой|что для вас|правильно понимаю)/i.test(s),
      vague:/(постараюсь|давайте разбер[её]мся|чем могу помочь|что можно сделать|вернусь к вам)/i.test(s),
      promise:/(обещ|гарант|точно|обязательно|ускорить|буду контролировать)/i.test(s)
    };
  }
  function correctReason(topic,answer,psych){
    const sig=softSignals(answer),t=String(topic||'').toLowerCase();
    const emotion=psych?.emotion||'состояние клиента',need=psych?.need||'его реальную задачу';
    let core='';
    if(t.includes('ожид')) core='Ответ делает ожидание управляемым: клиент понимает, что происходит сейчас, какой будет следующий шаг и где появится точка контроля.';
    else if(t.includes('негатив')) core='Ответ признаёт негатив без спора и не пытается успокоить клиента общими словами. Разговор переводится к конкретному действию.';
    else if(t.includes('присоедин')) core=`Ответ точно присоединяется к состоянию клиента — ${emotion} — и связывает его с потребностью: ${need}.`;
    else if(t.includes('извин')) core='Извинение связано с конкретной ситуацией клиента, а не звучит формально. После признания неудобства сотрудник показывает, что будет сделано дальше.';
    else if(t.includes('претенз')) core='Ответ не защищается и не спорит с претензией, а фиксирует суть проблемы и переводит её в проверяемый следующий шаг.';
    else if(t.includes('обещ')) core='Ответ не даёт непроверяемого обещания и обозначает только то, что сотрудник действительно может проверить или сделать сейчас.';
    else if(t.includes('повтор')) core='Ответ учитывает, что клиент уже обращался раньше: не заставляет начинать всё заново и продолжает решение с текущей точки.';
    else if(t.includes('конфликт')) core='Ответ снижает напряжение за счёт спокойной фиксации фактов и следующего действия, не усиливая конфликт спором.';
    else core='Ответ лучше всего попадает в ситуацию клиента и ведёт разговор к понятному следующему действию.';
    const plus=[];
    if(sig.emotion) plus.push('эмоция клиента не пропущена');
    if(sig.action) plus.push('есть конкретный следующий шаг');
    if(sig.question) plus.push('уточнение связано с задачей, а не заставляет клиента повторять всё заново');
    if(sig.need) plus.push('ответ опирается на реальную потребность клиента');
    return `${core} ${plus.length?'Здесь '+plus.slice(0,2).join(' и ')+'.':''}`.trim();
  }
  function altReason(answer,correct){
    const a=softSignals(answer),c=softSignals(correct);
    let good=a.emotion?'Вариант звучит бережно и показывает, что состояние клиента замечено.':a.action?'Вариант быстро ведёт к действию и не затягивает разговор.':a.question?'Вариант пытается уточнить ситуацию до ответа.':'Вариант звучит профессионально и не конфликтует с клиентом.';
    let weak='';
    if(a.promise) weak='Но появляется обещание или ожидание результата, которое пока нельзя подтвердить.';
    else if(a.vague) weak='Но формулировка остаётся слишком общей: клиент не понимает, что именно произойдёт дальше.';
    else if(a.action&&!a.emotion&&c.emotion) weak='Но ответ слишком быстро перескакивает к действию и почти не присоединяется к эмоции клиента.';
    else if(a.emotion&&!a.action&&c.action) weak='Но одной эмпатии недостаточно: не хватает конкретного следующего шага.';
    else if(a.question&&!a.need) weak='Но вопрос слишком широкий и может заставить клиента снова объяснять уже понятный контекст.';
    else if(!a.need&&c.need) weak='Но вариант хуже попадает в реальную потребность клиента и поэтому выглядит менее точным.';
    else weak='Но по сравнению с правильным ответом он хуже связывает контекст клиента с проверяемым следующим шагом.';
    return {good,weak};
  }
  function softReviewHtml(options,correct,topic,psych){
    const correctText=String(options?.[correct]||'');

    // V8.29: database explanations are already curated. Render those exact sections
    // as separate cards instead of flattening them into one yellow block.
    if(psych?.modern||psych?.best||psych?.others||psych?.okk){
      const cards=[];
      if(psych?.skill)cards.push(`<div class="sh-soft-v829-card sh-soft-v829-check"><div class="sh-soft-v829-title">🎯 Что проверяем</div><p>${esc(psych.skill)}</p></div>`);
      if(psych?.best)cards.push(`<div class="sh-soft-v829-card sh-soft-v829-best"><div class="sh-soft-v829-title">✅ Почему сильнее</div><p>${esc(psych.best)}</p></div>`);
      if(psych?.others)cards.push(`<div class="sh-soft-v829-card sh-soft-v829-weak"><div class="sh-soft-v829-title">⚠️ Что слабее в других</div><p>${esc(psych.others)}</p></div>`);
      if(psych?.okk)cards.push(`<div class="sh-soft-v829-card sh-soft-v829-okk"><div class="sh-soft-v829-title">📌 Критерии оценки качества</div><p>${esc(psych.okk)}</p></div>`);
      return `<div class="sh-soft-review sh-soft-review-v829">
        <div class="sh-soft-review-head"><span>Разбор ответа</span><b>Правильный вариант</b></div>
        <div class="sh-soft-answer-quote">${esc(correctText)}</div>
        <div class="sh-soft-v829-grid">${cards.join('')}</div>
      </div>`;
    }

    const others=(options||[]).map((text,i)=>({text:String(text||''),i})).filter(x=>x.i!==Number(correct)).map(x=>({...x,...altReason(x.text,correctText)}));
    const signals=[];
    if(psych?.emotion&&String(psych.emotion).trim()&&String(psych.emotion).trim()!=='—')signals.push(['Эмоция клиента',psych.emotion]);
    if(psych?.need&&String(psych.need).trim()&&String(psych.need).trim()!=='—')signals.push(['Что ему важно',psych.need]);
    const signalHtml=signals.length?`<div class="sh-soft-signals">${signals.map(([label,value])=>`<div class="sh-soft-signal"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join('')}</div>`:'';
    return `<div class="sh-soft-review sh-soft-review-v821">
      <div class="sh-soft-review-head"><span>Разбор ответа</span>${psych?.skill?`<b>🎯 ${esc(psych.skill)}</b>`:''}</div>
      ${signalHtml}
      <div class="sh-soft-best"><div class="sh-soft-card-title">✅ Почему правильный ответ лучший</div><div class="sh-soft-answer-quote">${esc(correctText)}</div><p>${esc(correctReason(topic,correctText,psych||{}))}</p></div>
      <div class="sh-soft-alt-grid">${others.map(x=>`<div class="sh-soft-alt-card"><div class="sh-soft-alt-title">Вариант ${x.i+1}</div><div class="sh-soft-alt-quote">${esc(x.text)}</div><div class="sh-soft-alt-good"><b>Что в нём хорошо</b><span>${esc(x.good)}</span></div><div class="sh-soft-alt-weak"><b>Почему слабее</b><span>${esc(x.weak)}</span></div></div>`).join('')}</div>
    </div>`;
  }
  function hardPlainHtml(text){
    const src=norm(text); if(!src)return '';
    const clean=src.replace(/^✅\s*ПРАВИЛЬНЫЙ ОТВЕТ\s*/i,'').trim();
    const parts=clean.split(/\n{2,}/).map(x=>x.trim()).filter(Boolean); if(!parts.length)return '';
    const first=parts.shift();
    const cards=parts.map((p,idx)=>{let title='Почему',icon='🧩';if(/[=−+\-×÷]\s*\d|₽|остаток|расч[её]т/i.test(p)){title='Расчёт';icon='🧮'}else if(/важно|исключен|обратите|нельзя ориентироваться/i.test(p)){title='Важно';icon='⚠️'}else if(idx>0){title='Логика решения';icon='📌'}return `<div class="sh-hard-review-step"><div class="sh-hard-review-step-title">${icon} ${title}</div><p>${esc(p).replace(/\n/g,'<br>')}</p></div>`}).join('');
    return `<div class="sh-hard-review"><div class="sh-hard-review-answer"><span>✅ Правильный ответ</span><strong>${esc(first).replace(/\n/g,'<br>')}</strong></div>${cards}</div>`;
  }
  function hardDialogueHtml(text){
    const src=norm(text); if(!src)return '';
    const wrongMarker=/(?:⚠️|⚖️)\s*ПОЧЕМУ\s+(?:ОСТАЛЬНЫЕ\s+ВАРИАНТЫ\s+СЛАБЕЕ|ДРУГИЕ\s+ВАРИАНТЫ[^\n]*)/i;
    const sourceMarker=/📍\s*ГДЕ\s+ПРОВЕРИТЬ/i;
    const keyMarker=/🎯\s*КЛЮЧЕВОЙ\s+НАВЫК/i;
    const header=/✅\s*(?:ПОЧЕМУ\s+ЭТО\s+ЛУЧШИЙ\s+ВАРИАНТ|ПРАВИЛЬНЫЙ\s+ОТВЕТ)/i;
    const hasStructure=header.test(src)||wrongMarker.test(src)||sourceMarker.test(src);
    if(!hasStructure)return hardPlainHtml(src);

    const sourceMatch=src.match(/📍\s*ГДЕ\s+ПРОВЕРИТЬ\s*([\s\S]*?)(?=(?:⚠️|⚖️)\s*ПОЧЕМУ|🎯\s*КЛЮЧЕВОЙ\s+НАВЫК|$)/i);
    const source=(sourceMatch?.[1]||'').trim();
    const wrongMatch=src.match(/(?:⚠️|⚖️)\s*ПОЧЕМУ\s+(?:ОСТАЛЬНЫЕ\s+ВАРИАНТЫ\s+СЛАБЕЕ|ДРУГИЕ\s+ВАРИАНТЫ[^\n]*)\s*([\s\S]*?)(?=🎯\s*КЛЮЧЕВОЙ\s+НАВЫК|📍\s*ГДЕ\s+ПРОВЕРИТЬ|$)/i);
    const wrongChunk=(wrongMatch?.[1]||'').trim();

    let correct=src.replace(/^([\s\S]*?)✅\s*(?:ПОЧЕМУ\s+ЭТО\s+ЛУЧШИЙ\s+ВАРИАНТ|ПРАВИЛЬНЫЙ\s+ОТВЕТ)\s*/i,'').trim();
    const cuts=[correct.search(sourceMarker),correct.search(wrongMarker),correct.search(keyMarker)].filter(i=>i>=0);
    if(cuts.length)correct=correct.slice(0,Math.min(...cuts)).trim();

    const numbered=[];
    const nr=/(?:^|\s)(\d+)\.\s+([\s\S]*?)(?=(?:\s+\d+\.\s+)|$)/g;
    let nm; while((nm=nr.exec(correct))){numbered.push({n:nm[1],text:nm[2].trim()})}
    const correctCards=(numbered.length?numbered:[{n:'',text:correct}]).filter(x=>x.text).map((x,idx)=>`<div class="sh-hard-review-step"><div class="sh-hard-review-step-title">${idx===0?'🧩':'📌'} ${x.n?`${esc(x.n)}. `:''}${idx===0?'Почему это верно':'Логика решения'}</div><p>${esc(x.text)}</p></div>`).join('');

    const wrong=[];
    const vr=/Вариант\s+(\d+)\s*([\s\S]*?)(?=\s*Вариант\s+\d+|$)/gi;
    let vm; while((vm=vr.exec(wrongChunk))){
      const body=vm[2].trim();
      const good=(body.match(/Что\s+хорошо:\s*([\s\S]*?)(?=Где\s+(?:ошибка|слабое\s+место):|Риск:|$)/i)||[])[1]?.trim()||'';
      const mistake=(body.match(/Где\s+(?:ошибка|слабое\s+место):\s*([\s\S]*?)(?=Риск:|$)/i)||[])[1]?.trim()||'';
      const risk=(body.match(/Риск:\s*([\s\S]*)$/i)||[])[1]?.trim()||'';
      wrong.push({n:vm[1],good,mistake,risk,body});
    }
    const wrongHtml=wrong.length?`<div class="sh-hard-review-section-title bad">⚠️ Почему остальные варианты слабее</div><div class="sh-hard-wrong-grid">${wrong.map(w=>`<div class="sh-hard-wrong-card"><b>Вариант ${esc(w.n)}</b>${w.good?`<div><span>Что хорошо</span><p>${esc(w.good)}</p></div>`:''}${w.mistake?`<div><span>Где ошибка</span><p>${esc(w.mistake)}</p></div>`:''}${w.risk?`<div><span>Риск</span><p>${esc(w.risk)}</p></div>`:''}${(!w.good&&!w.mistake&&!w.risk)?`<p>${esc(w.body)}</p>`:''}</div>`).join('')}</div>`:'';
    const sourceHtml=source?`<div class="sh-hard-source-card"><span>📚 Где проверить</span><strong>Процедура / база знаний</strong><small>${esc(source)}</small></div>`:'';
    return `<div class="sh-hard-review sh-hard-dialogue-review">${correctCards?`<div class="sh-hard-review-section-title good">✅ Почему правильный ответ</div>${correctCards}`:''}${wrongHtml}${sourceHtml}</div>`;
  }
  function attemptExplanation(q,a){
    const text=String(q?.explanation||'');if(!text)return '';
    if(String(a?.section||'')==='soft'&&Array.isArray(q.options)&&q.options.length){const p=parseDialogueExplanation(text);return softReviewHtml(q.options,Number(q.correct),a.topic,p?.softPsych||{})}
    if(String(a?.section||'')==='hard')return /ПОЧЕМУ ЭТО ЛУЧШИЙ ВАРИАНТ|ПОЧЕМУ ОСТАЛЬНЫЕ ВАРИАНТЫ СЛАБЕЕ|ГДЕ ПРОВЕРИТЬ/i.test(norm(text))?hardDialogueHtml(text):hardPlainHtml(text);
    return `<div class="explain">${esc(norm(text)).replace(/\n/g,'<br>')}</div>`;
  }

  const baseAnswerDialogue=window.answerDialogue;
  window.answerDialogue=function(i){
    baseAnswerDialogue(i);
    try{
      const r=S.currentRun,detail=r?.details?.[r.details.length-1],section=String(r?.x?.section||'').toLowerCase();
      const softBox=document.querySelector('#runFeedback .sh-soft-review');
      if(section==='soft'&&softBox&&detail?.options?.length){
        const p=parseDialogueExplanation(detail.explanation||'');
        softBox.outerHTML=softReviewHtml(detail.options,Number(detail.correct),r.x.topic,p?.softPsych||{});
      }else if(section==='hard'&&detail?.explanation){
        const hardTarget=softBox||document.querySelector('#runFeedback .explain');
        if(hardTarget)hardTarget.outerHTML=hardDialogueHtml(detail.explanation);
      }
    }catch(e){console.warn('V8.21 dialogue review patch',e)}
  };

  const baseAnswerQuiz=window.answerQuiz;
  window.answerQuiz=function(i){
    baseAnswerQuiz(i);
    try{
      const r=S.currentRun,detail=r?.details?.[r.details.length-1];
      if(String(r?.sec||'').toLowerCase()==='hard'&&detail?.explanation){
        const old=document.querySelector('#runFeedback .explain');
        if(old)old.outerHTML=hardDialogueHtml(detail.explanation);
      }
    }catch(e){console.warn('V8.21 hard quiz review patch',e)}
  };

  const baseHardNumeric=window.renderHardNumeric;
  window.renderHardNumeric=function(){baseHardNumeric();try{const el=document.querySelector('.sh-hard-num-explain');if(el)el.outerHTML=hardDialogueHtml(el.textContent||'')}catch(e){console.warn(e)}};
  const baseHardScenario=window.renderHardScenario;
  window.renderHardScenario=function(){baseHardScenario();try{const el=document.querySelector('.sh-hard-sc-explain');if(el)el.outerHTML=hardDialogueHtml(el.textContent||'')}catch(e){console.warn(e)}};

  const baseAttemptReview=window.openAttemptReview;
  window.openAttemptReview=function(id,returnLogin='',managerLogin=''){
    baseAttemptReview(id,returnLogin,managerLogin);
    try{
      const a=S.attempts.find(x=>x.id===id),d=attemptDetails(a),items=[...document.querySelectorAll('.modal-card .review-item')];
      items.forEach((item,idx)=>{const q=d[idx],old=item.querySelector('.explain');if(q?.explanation&&old)old.outerHTML=attemptExplanation(q,a)});
    }catch(e){console.warn('V8.20 attempt review patch',e)}
  };
})();
/* SkillHub V8.25 — curated Soft + Tech Admin RG demo access */
(function(){
  'use strict';

  function clone(v){
    try{return structuredClone(v)}catch(e){return JSON.parse(JSON.stringify(v))}
  }
  function hash(s){
    let h=2166136261;
    for(const ch of String(s||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}
    return h>>>0;
  }
  function shuffleSoftDialogue(x){
    if(!x || String(x.section||'').toLowerCase()!=='soft' || !Array.isArray(x.steps)) return x;
    const y=clone(x);
    y.steps=y.steps.map((step,si)=>{
      if(!Array.isArray(step.options) || step.options.length<2) return step;
      const pairs=step.options.map((text,i)=>({text,correct:i===Number(step.correct)}));
      let state=hash(`${y.id||y.title||'soft'}|${si}|${Date.now()}|${Math.random()}`)||1;
      const rnd=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296};
      for(let i=pairs.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[pairs[i],pairs[j]]=[pairs[j],pairs[i]]}
      step.options=pairs.map(p=>p.text);
      step.correct=pairs.findIndex(p=>p.correct);
      return step;
    });
    return y;
  }

  // Preserve carefully curated answer wording from Supabase; only randomize answer order.
  if(typeof window.startDialogue==='function'){
    const baseStartDialogue=window.startDialogue;
    window.startDialogue=function(x){return baseStartDialogue(shuffleSoftDialogue(x))};
  }

  // Tech admin must be able to walk through the same safe RG demo flow before a presentation.
  window.sh816DemoAllowed=function(){return ['mentor','rs','tech_admin'].includes(S?.profile?.role)};
  window.sh816DemoRoleShort=function(){return S?.profile?.role==='rs'?'РС':'РГ'};
  window.sh816DemoRoleLong=function(){
    const role=S?.profile?.role;
    return role==='rs'?'РУКОВОДИТЕЛЯ СЕКТОРА':role==='tech_admin'?'ТЕХАДМИНА · ДЕМО РГ':'РУКОВОДИТЕЛЯ ГРУППЫ';
  };

  function applyTechAdminDemoAccess(){
    if(S?.profile?.role!=='tech_admin') return;
    document.querySelectorAll('.rg-only').forEach(el=>el.classList.remove('hidden'));
    const btn=document.querySelector('.nav-btn[data-page="rgpractice"]');
    if(btn){
      btn.classList.remove('hidden');
      const label=btn.querySelector('.nav-text');
      if(label) label.textContent='Демо РГ';
      const nav=btn.closest('nav');
      const training=nav?.querySelector('.nav-btn[data-page="training"]');
      if(nav && training && training.nextSibling!==btn) training.insertAdjacentElement('afterend',btn);
    }
  }

  if(typeof window.go==='function'){
    const baseGo=window.go;
    window.go=function(page){const r=baseGo(page);applyTechAdminDemoAccess();return r};
  }
  if(typeof window.enterApp==='function'){
    const baseEnterApp=window.enterApp;
    window.enterApp=function(){const r=baseEnterApp();applyTechAdminDemoAccess();return r};
  }

  // Expose a tiny diagnostic hook for pre-release checks.
  window.__skillhubV825={shuffleSoftDialogue,applyTechAdminDemoAccess};
  console.info('SkillHub V8.25: curated Soft preserved; Tech Admin RG demo enabled');
})();

/* ===== SkillHub V8.31 — Soft continuous chat + feedback only at the end ===== */
(function(){
  'use strict';

  const baseStartDialogue831=window.startDialogue;
  const baseRenderDialogue831=window.renderDialogue;
  const baseAnswerDialogue831=window.answerDialogue;
  const baseFinishDialogue831=window.finishDialogue;

  const isSoftContent831=x=>String(x?.section||'').toLowerCase()==='soft';
  const isSoftRun831=()=>S?.currentRun?.type==='dialogue'&&isSoftContent831(S.currentRun.x);

  function softStep831(x,i){
    if(x?.payload?.scenario){
      return {
        client:x.payload.scenario?.client||'',
        options:(x.payload.answers||[]).map(a=>a.text),
        correct:(x.payload.answers||[]).findIndex(a=>a.correct),
        explanation:x.payload.review?.explanation||''
      };
    }
    const s=x?.steps?.[i]||{};
    return {client:s.client||'',options:[...(s.options||[])],correct:Number(s.correct),explanation:s.explanation||''};
  }

  function softTotal831(x){return x?.payload?.scenario?1:(x?.steps||[]).length}

  function softHistory831(r,includeCurrent=true){
    const rows=[];
    for(const d of (r.details||[])){
      const picked=(d.options||[])[Number(d.selected)]||'';
      rows.push(`<div class="sh831-msg sh831-client"><div class="sh831-who">Клиент</div><div>${esc(d.question||'')}</div></div>`);
      rows.push(`<div class="sh831-msg sh831-worker"><div class="sh831-who">Вы</div><div>${esc(picked)}</div></div>`);
    }
    if(includeCurrent && r.i<softTotal831(r.x)){
      const s=softStep831(r.x,r.i);
      rows.push(`<div class="sh831-msg sh831-client"><div class="sh831-who">Клиент</div><div>${esc(s.client)}</div></div>`);
    }
    return rows.join('');
  }

  function renderSoftDialogue831(){
    const r=S.currentRun,x=r.x,total=softTotal831(x);
    if(r.i>=total){finishSoftDialogue831();return}
    const s=softStep831(x,r.i);
    $('page-run').innerHTML=`
      <div class="sh831-soft-wrap">
        <div class="card sh831-soft-shell">
          <div class="sh831-soft-top">
            <button class="btn secondary" onclick="go('training')">← Выйти</button>
            <div class="sh831-soft-title"><small>Диалог · ${r.i+1} из ${total}</small><b>${esc(x.title||x.topic||'Soft Skills')}</b></div>
            <span class="pill">${esc(x.topic||'Soft Skills')}</span>
          </div>
          <div class="progress"><span style="width:${Math.max(4,(r.i/Math.max(1,total))*100)}%"></span></div>
          <div id="sh831Thread" class="sh831-chat-thread">${softHistory831(r,true)}</div>
          <div id="sh831Choice" class="sh831-choice">
            <div class="sh831-choice-title">Выберите, как ответить клиенту</div>
            <div class="sh831-options">${s.options.map((a,i)=>`<button class="sh831-option" onclick="answerDialogue(${i})">${esc(a)}</button>`).join('')}</div>
          </div>
        </div>
      </div>`;
    setTimeout(()=>{const t=$('sh831Thread');if(t)t.scrollTop=t.scrollHeight},20);
  }

  function answerSoftDialogue831(i){
    const r=S.currentRun;if(!r||r.transitioning)return;
    const x=r.x,s=softStep831(x,r.i),correct=Number(s.correct),ok=Number(i)===correct;
    if(i<0||i>=s.options.length)return;
    r.transitioning=true;
    r.details.push({kind:'dialogue',content_id:x.id||null,title:x.title||'',step:r.i+1,question:s.client,selected:Number(i),correct,is_correct:ok,options:[...s.options],explanation:s.explanation||''});
    if(ok)r.score++;
    document.querySelectorAll('.sh831-option').forEach(b=>b.disabled=true);
    const choice=$('sh831Choice');if(choice)choice.classList.add('is-sent');
    const thread=$('sh831Thread');
    if(thread){
      thread.insertAdjacentHTML('beforeend',`<div class="sh831-msg sh831-worker sh831-just-sent"><div class="sh831-who">Вы</div><div>${esc(s.options[i])}</div></div>`);
      if(r.i<softTotal831(x)-1)thread.insertAdjacentHTML('beforeend',`<div class="sh831-typing"><span></span><span></span><span></span><em>Клиент печатает…</em></div>`);
      thread.scrollTop=thread.scrollHeight;
    }
    setTimeout(()=>{
      if(r.i>=softTotal831(x)-1){finishSoftDialogue831();return}
      r.i++;r.transitioning=false;renderSoftDialogue831();
    },520);
  }

  function parseCriteria831(text){
    return String(text||'').split(/\s*[•;]\s*/).map(x=>x.trim()).filter(Boolean);
  }

  function feedbackCards831(d,topic){
    const parsed=parseDialogueExplanation(d.explanation||'')||{};
    const p=parsed.softPsych||{};
    const selected=(d.options||[])[Number(d.selected)]||'';
    const correct=(d.options||[])[Number(d.correct)]||'';
    const ok=!!d.is_correct;
    const cards=[];
    if(p.skill)cards.push(`<div class="sh831-review-note sh831-note-check"><b>🎯 Что проверяем</b><p>${esc(p.skill)}</p></div>`);
    if(p.best)cards.push(`<div class="sh831-review-note sh831-note-best"><b>✅ Почему сильнее</b><p>${esc(p.best)}</p></div>`);
    if(p.others)cards.push(`<div class="sh831-review-note sh831-note-weak"><b>⚠️ Что слабее в других</b><p>${esc(p.others)}</p></div>`);
    if(p.okk)cards.push(`<div class="sh831-review-note sh831-note-okk"><b>📌 Критерии оценки качества</b><p>${esc(p.okk)}</p></div>`);
    return `<section class="sh831-review-step ${ok?'is-good':'is-fix'}">
      <div class="sh831-review-step-head"><span>Шаг ${d.step}</span><b>${ok?'Сильный выбор':'Есть что улучшить'}</b></div>
      <div class="sh831-review-chat">
        <div class="sh831-msg sh831-client"><div class="sh831-who">Клиент</div><div>${esc(d.question||'')}</div></div>
        <div class="sh831-msg sh831-worker"><div class="sh831-who">Вы выбрали</div><div>${esc(selected)}</div></div>
      </div>
      ${!ok?`<div class="sh831-better"><span>Сильнее было бы</span><strong>${esc(correct)}</strong></div>`:''}
      <div class="sh831-review-grid">${cards.join('')}</div>
    </section>`;
  }

  function strongDialogue831(r){
    return (r.details||[]).map(d=>{
      const correct=(d.options||[])[Number(d.correct)]||'';
      return `<div class="sh831-msg sh831-client"><div class="sh831-who">Клиент</div><div>${esc(d.question||'')}</div></div><div class="sh831-msg sh831-worker"><div class="sh831-who">Сильный ответ</div><div>${esc(correct)}</div></div>`;
    }).join('');
  }

  function nextSoftCase831(x){
    const all=(S.content||[]).filter(c=>c&&c.status==='published'&&c.section==='soft'&&c.type==='dialogue'&&c.id!==x?.id);
    if(!all.length)return null;
    const seen=seenContentMap();
    const same=all.filter(c=>c.topic===x?.topic);
    return same.find(c=>!seen.has(c.id)) || all.find(c=>!seen.has(c.id)) || same[0] || all[0] || null;
  }

  function finishSoftDialogue831(){
    const r=S.currentRun;if(!r||r.finished)return;
    r.finished=true;r.transitioning=false;
    const total=softTotal831(r.x),p=Math.round(r.score/Math.max(1,total)*100);
    recordAttempt({section:r.x.section,topic:r.x.topic,score:p,type:'dialogue',cpm:0,details:r.details||[]});
    const nextCase=nextSoftCase831(r.x);
    const criteria=[];
    for(const d of (r.details||[])){
      const parsed=parseDialogueExplanation(d.explanation||'');
      for(const c of parseCriteria831(parsed?.softPsych?.okk||''))if(c&&!criteria.includes(c))criteria.push(c);
    }
    $('page-run').innerHTML=`
      <div class="sh831-soft-wrap sh831-result-wrap">
        <div class="card sh831-result-head">
          <div><span class="sh831-result-kicker">Диалог завершён</span><h2>${esc(r.x.title||r.x.topic||'Soft Skills')}</h2><p>Теперь — разбор именно вашего разговора. Во время диалога подсказок о правильности не было.</p></div>
          <div class="sh831-score"><strong>${p}%</strong><span>${r.score} из ${total} сильных решений</span></div>
        </div>
        <div class="sh831-result-section"><h3>Ваш диалог и обратная связь</h3>${(r.details||[]).map(d=>feedbackCards831(d,r.x.topic)).join('')}</div>
        ${criteria.length?`<div class="card sh831-criteria"><h3>📌 Критерии оценки качества</h3><div class="sh831-criteria-list">${criteria.map(c=>`<span>✓ ${esc(c)}</span>`).join('')}</div></div>`:''}
        <details class="card sh831-strong-dialog"><summary>Показать сильный диалог целиком</summary><div class="sh831-chat-thread">${strongDialogue831(r)}</div></details>
        <div class="actions sh831-result-actions"><button class="btn secondary" onclick="go('training')">К тренировкам</button><button class="btn secondary" onclick="startContent('${jsq(r.x.id||'')}')">Пройти ещё раз</button>${nextCase?`<button class="btn primary" onclick="startContent('${jsq(nextCase.id)}')">Следующий кейс →</button>`:''}</div>
      </div>`;
  }

  window.startDialogue=function(x){
    if(!isSoftContent831(x))return baseStartDialogue831(x);
    const shuffled=window.__skillhubV825?.shuffleSoftDialogue?window.__skillhubV825.shuffleSoftDialogue(x):x;
    S.currentRun={type:'dialogue',x:shuffled,i:0,score:0,details:[],finished:false,transitioning:false};
    goRun();renderSoftDialogue831();
  };
  window.renderDialogue=function(){return isSoftRun831()?renderSoftDialogue831():baseRenderDialogue831()};
  window.answerDialogue=function(i){return isSoftRun831()?answerSoftDialogue831(i):baseAnswerDialogue831(i)};
  window.finishDialogue=function(){return isSoftRun831()?finishSoftDialogue831():baseFinishDialogue831()};
  window.__skillhubV831={renderSoftDialogue831,finishSoftDialogue831};
  console.info('SkillHub V8.31: Soft is a continuous chat; feedback appears only after the dialogue.');
})();
/* ===== end SkillHub V8.31 ===== */

/* ===== SkillHub V8.32 — Tech Admin complete demo hub ===== */
(function(){
  'use strict';

  // Tech admin gets the same safe self-demo flow as RG/RS, but with an explicit
  // four-part launchpad: Soft, Hard, Typing and Manual trainer.
  const baseRoleShort832=window.sh816DemoRoleShort;
  const baseRoleLong832=window.sh816DemoRoleLong;
  window.sh816DemoRoleShort=function(){
    if(S?.profile?.role==='tech_admin')return 'Техадмин';
    return typeof baseRoleShort832==='function'?baseRoleShort832():'РГ';
  };
  window.sh816DemoRoleLong=function(){
    if(S?.profile?.role==='tech_admin')return 'ТЕХНИЧЕСКОГО АДМИНИСТРАТОРА';
    return typeof baseRoleLong832==='function'?baseRoleLong832():'РУКОВОДИТЕЛЯ ГРУППЫ';
  };

  function ensureTechDemoNav832(){
    if(S?.profile?.role!=='tech_admin')return;
    document.querySelectorAll('.rg-only').forEach(el=>el.classList.remove('hidden'));
    const btn=document.querySelector('.nav-btn[data-page="rgpractice"]');
    if(!btn)return;
    btn.classList.remove('hidden');
    const label=btn.querySelector('.nav-text');
    if(label)label.textContent='Демо техадмина';
    const nav=btn.closest('nav');
    const training=nav?.querySelector('.nav-btn[data-page="training"]');
    if(nav&&training&&training.nextSibling!==btn)training.insertAdjacentElement('afterend',btn);
  }

  window.openTechDemoSoft832=function(){
    if(S?.profile?.role!=='tech_admin')return;
    openSection('soft','auto');
  };
  window.openTechDemoHard832=function(){
    if(S?.profile?.role!=='tech_admin')return;
    openSection('hard');
  };
  window.openTechDemoTyping832=function(){
    if(S?.profile?.role!=='tech_admin')return;
    startTyping();
  };
  window.openTechDemoManual832=function(){
    if(S?.profile?.role!=='tech_admin')return;
    const arr=rgDemoManualContent();
    const topics=[...new Set(arr.map(x=>x.topic||'Soft Skills'))];
    showModal(`<div class="modal-head"><div><h2>Ручной тренажёр · демо техадмина</h2><div class="muted small">Выберите кейс. Ответ хранится только в вашем браузере и можно пройти полный цикл: сотрудник → проверка → доработка / принятие.</div></div><button class="btn secondary" onclick="closeModal()">✕</button></div>${topics.map(topic=>`<div class="card sh832-manual-topic"><div class="sh832-manual-topic-head"><b>${esc(topic)}</b><span class="pill">${arr.filter(x=>(x.topic||'Soft Skills')===topic).length}</span></div><div class="rg-demo-case-list">${arr.filter(x=>(x.topic||'Soft Skills')===topic).map(c=>{const last=rgDemoLatest(c.id);return `<button class="rg-demo-case" onclick="closeModal();startRgDemoManual('${c.id}')"><span><b>${esc(c.title||c.question||'Ручной кейс')}</b><small>${esc(c.topic||'Soft Skills')}</small></span>${last?`<em class="pill ${rgDemoStatusClass(last.status)}">${rgDemoStatusText(last.status)}</em>`:'<em>Открыть →</em>'}</button>`}).join('')}</div></div>`).join('')||'<div class="muted">Ручные кейсы пока не опубликованы.</div>'}`);
  };

  // In tech-admin mode, opening any manual content must enter the safe demo
  // manual flow rather than a read-only preview (and never Typing).
  const baseStartManualContent832=window.startManualContent;
  window.startManualContent=function(id){
    if(S?.profile?.role==='tech_admin'){
      const x=(S.content||[]).find(c=>c.id===id);
      if(!x||x.type!=='manual'){toast('Ручной кейс не найден');return;}
      return startRgDemoManual(id);
    }
    return baseStartManualContent832(id);
  };

  const baseRenderRgPractice832=window.renderRgPractice;
  window.renderRgPractice=function(){
    if(S?.profile?.role!=='tech_admin')return baseRenderRgPractice832();
    baseRenderRgPractice832();
    const page=$('page-rgpractice');if(!page)return;
    $('pageTitle').textContent='Демо техадмина';
    $('pageSub').textContent='Проверьте все тренажёры глазами сотрудника';
    const intro=page.querySelector('.rg-demo-intro');
    if(intro){
      const kicker=intro.querySelector('.rg-demo-kicker');if(kicker)kicker.textContent='ТОЛЬКО ДЛЯ ТЕХНИЧЕСКОГО АДМИНИСТРАТОРА';
      const h=intro.querySelector('h2');if(h)h.textContent='Демо всех типов тренировок';
      const p=intro.querySelector('p');if(p)p.textContent='Здесь можно безопасно проверить Soft Skills, Hard Skills, скорость печати и полный цикл ручного тренажёра. Результаты автоматических тренировок сохраняются только как ваши личные попытки техадмина, а ручное демо хранится локально в браузере.';
    }
    const oldLaunch=page.querySelector('.sh832-tech-demo-launch');
    if(oldLaunch)oldLaunch.remove();
    const launch=document.createElement('section');
    launch.className='sh832-tech-demo-launch';
    launch.innerHTML=`<div class="sh832-tech-demo-head"><div><h3>Выберите, что проверить</h3><p>Четыре независимых демо-режима</p></div></div><div class="sh832-tech-demo-grid">
      <button class="sh832-tech-demo-card" onclick="openTechDemoSoft832()"><span class="sh832-tech-demo-icon">💬</span><b>Soft Skills</b><small>Обычные диалоги и автоматическая оценка</small><em>Открыть →</em></button>
      <button class="sh832-tech-demo-card" onclick="openTechDemoHard832()"><span class="sh832-tech-demo-icon">🧠</span><b>Hard Skills</b><small>Продукты, процессы и клиентские кейсы</small><em>Открыть →</em></button>
      <button class="sh832-tech-demo-card" onclick="openTechDemoTyping832()"><span class="sh832-tech-demo-icon">⌨️</span><b>Печать</b><small>Скорость и точность набора</small><em>Начать →</em></button>
      <button class="sh832-tech-demo-card" onclick="openTechDemoManual832()"><span class="sh832-tech-demo-icon">✍️</span><b>Ручной тренажёр</b><small>Ответ → проверка → доработка / принятие</small><em>Открыть →</em></button>
    </div>`;
    const results=page.querySelector('.rg-demo-results');
    if(results)results.insertAdjacentElement('beforebegin',launch);
    else if(intro)intro.insertAdjacentElement('afterend',launch);
    else page.prepend(launch);
    // The generic RG result widget has its own Soft/Hard/Typing shortcut row.
    // Remove it for tech admin so the four explicit cards above are the only launcher.
    page.querySelectorAll('.rg-demo-self-actions').forEach(el=>el.remove());
    const resultTitle=page.querySelector('.rg-demo-results-head h3');
    if(resultTitle)resultTitle.textContent='📊 Как техадмин увидит результаты тестового прохождения';
    const resultText=page.querySelector('.rg-demo-results-head p');
    if(resultText)resultText.textContent='После прохождения Soft, Hard или Печати здесь можно открыть свою тестовую карточку и посмотреть попытки, ответы и ошибки.';
    const steps=page.querySelector('.rg-demo-steps');
    if(steps)steps.insertAdjacentHTML('beforebegin','<div class="sh832-manual-demo-title"><h3>✍️ Полный цикл ручного тренажёра</h3><p>Ниже остаётся отдельное демо ручной проверки — оно не смешивается с Печатью.</p></div>');
    ensureTechDemoNav832();
  };

  const baseGo832=window.go;
  window.go=function(page){const r=baseGo832(page);ensureTechDemoNav832();return r;};
  const baseEnterApp832=window.enterApp;
  window.enterApp=function(){const r=baseEnterApp832();ensureTechDemoNav832();return r;};

  ensureTechDemoNav832();
  window.__skillhubV832={ensureTechDemoNav832};
  console.info('SkillHub V8.32: Tech Admin full demo hub enabled');
})();
/* ===== end SkillHub V8.32 ===== */

console.info('SkillHub V8.33: Soft result now includes Next case button.');

/* ===== SkillHub V8.35 — Hard dialogues use the same continuous-chat flow as Soft ===== */
(function(){
  'use strict';

  const baseStartDialogue835=window.startDialogue;
  const baseRenderDialogue835=window.renderDialogue;
  const baseAnswerDialogue835=window.answerDialogue;
  const baseFinishDialogue835=window.finishDialogue;

  const isHardContent835=x=>String(x?.section||'').toLowerCase()==='hard';
  const isHardRun835=()=>S?.currentRun?.type==='dialogue'&&isHardContent835(S.currentRun.x);

  function hardStep835(x,i){
    if(x?.payload?.scenario){
      return {
        client:x.payload.scenario?.client||'',
        options:(x.payload.answers||[]).map(a=>a.text),
        correct:(x.payload.answers||[]).findIndex(a=>a.correct),
        explanation:x.payload.review?.explanation||x.payload.explanation||''
      };
    }
    const s=x?.steps?.[i]||{};
    return {client:s.client||'',options:[...(s.options||[])],correct:Number(s.correct),explanation:s.explanation||''};
  }

  function hardTotal835(x){return x?.payload?.scenario?1:(x?.steps||[]).length}

  function hardHistory835(r,includeCurrent=true){
    const rows=[];
    for(const d of (r.details||[])){
      const picked=(d.options||[])[Number(d.selected)]||'';
      rows.push(`<div class="sh831-msg sh831-client"><div class="sh831-who">Клиент</div><div>${esc(d.question||'')}</div></div>`);
      rows.push(`<div class="sh831-msg sh831-worker"><div class="sh831-who">Вы</div><div>${esc(picked)}</div></div>`);
    }
    if(includeCurrent && r.i<hardTotal835(r.x)){
      const s=hardStep835(r.x,r.i);
      rows.push(`<div class="sh831-msg sh831-client"><div class="sh831-who">Клиент</div><div>${esc(s.client)}</div></div>`);
    }
    return rows.join('');
  }

  function renderHardDialogue835(){
    const r=S.currentRun,x=r.x,total=hardTotal835(x);
    if(r.i>=total){finishHardDialogue835();return}
    const s=hardStep835(x,r.i);
    $('page-run').innerHTML=`
      <div class="sh831-soft-wrap sh835-hard-wrap">
        <div class="card sh831-soft-shell">
          <div class="sh831-soft-top">
            <button class="btn secondary" onclick="go('training')">← Выйти</button>
            <div class="sh831-soft-title"><small>Hard Skills · диалог · ${r.i+1} из ${total}</small><b>${esc(x.title||x.topic||'Hard Skills')}</b></div>
            <span class="pill">${esc(x.topic||'Hard Skills')}</span>
          </div>
          <div class="progress"><span style="width:${Math.max(4,(r.i/Math.max(1,total))*100)}%"></span></div>
          <div id="sh835HardThread" class="sh831-chat-thread">${hardHistory835(r,true)}</div>
          <div id="sh835HardChoice" class="sh831-choice">
            <div class="sh831-choice-title">Выберите, как ответить клиенту</div>
            <div class="sh831-options">${s.options.map((a,i)=>`<button class="sh831-option" onclick="answerDialogue(${i})">${esc(a)}</button>`).join('')}</div>
          </div>
        </div>
      </div>`;
    setTimeout(()=>{const t=$('sh835HardThread');if(t)t.scrollTop=t.scrollHeight},20);
  }

  function answerHardDialogue835(i){
    const r=S.currentRun;if(!r||r.transitioning)return;
    const x=r.x,s=hardStep835(x,r.i),correct=Number(s.correct),ok=Number(i)===correct;
    if(i<0||i>=s.options.length)return;
    r.transitioning=true;
    r.details.push({kind:'dialogue',content_id:x.id||null,title:x.title||'',step:r.i+1,question:s.client,selected:Number(i),correct,is_correct:ok,options:[...s.options],explanation:s.explanation||''});
    if(ok)r.score++;
    document.querySelectorAll('.sh831-option').forEach(b=>b.disabled=true);
    const choice=$('sh835HardChoice');if(choice)choice.classList.add('is-sent');
    const thread=$('sh835HardThread');
    if(thread){
      thread.insertAdjacentHTML('beforeend',`<div class="sh831-msg sh831-worker sh831-just-sent"><div class="sh831-who">Вы</div><div>${esc(s.options[i])}</div></div>`);
      if(r.i<hardTotal835(x)-1)thread.insertAdjacentHTML('beforeend',`<div class="sh831-typing"><span></span><span></span><span></span><em>Клиент печатает…</em></div>`);
      thread.scrollTop=thread.scrollHeight;
    }
    setTimeout(()=>{
      if(r.i>=hardTotal835(x)-1){finishHardDialogue835();return}
      r.i++;r.transitioning=false;renderHardDialogue835();
    },520);
  }

  function hardExplanation835(text){
    // V8.37: deliberately parse the curated Hard explanation into visibly
    // separate cards. This parser is line-based so it also handles the exact
    // database format where «ГДЕ ПРОВЕРИТЬ» sits between the rationale and
    // weaker alternatives.
    const src=String(text||'').replace(/\\+n/g,'\n').replace(/\r/g,'').trim();
    if(!src)return '';
    const why=[],source=[],wrong=[];let mode='why',cur=null;
    for(const raw of src.split('\n')){
      const line=String(raw||'').trim();if(!line)continue;
      if(/^✅\s*(?:ПОЧЕМУ\s+ЭТО\s+ЛУЧШИЙ\s+ВАРИАНТ|ПРАВИЛЬНЫЙ\s+ОТВЕТ)/i.test(line)){mode='why';continue}
      if(/^📍\s*ГДЕ\s+ПРОВЕРИТЬ/i.test(line)){mode='source';cur=null;continue}
      if(/^(?:⚠️|⚖️)\s*ПОЧЕМУ\s+(?:ОСТАЛЬНЫЕ\s+ВАРИАНТЫ\s+СЛАБЕЕ|ДРУГИЕ\s+ВАРИАНТЫ)/i.test(line)){mode='wrong';cur=null;continue}
      if(/^🎯\s*КЛЮЧЕВОЙ\s+НАВЫК/i.test(line))continue;
      if(mode==='why'){
        const m=line.match(/^(\d+)\.\s*(.+)$/);why.push({n:m?m[1]:'',text:m?m[2]:line});continue;
      }
      if(mode==='source'){source.push(line);continue}
      const v=line.match(/^Вариант\s+(\d+)$/i);
      if(v){cur={n:v[1],good:'',mistake:'',risk:'',other:[]};wrong.push(cur);continue}
      if(!cur){cur={n:String(wrong.length+1),good:'',mistake:'',risk:'',other:[]};wrong.push(cur)}
      let m=line.match(/^Что\s+хорошо:\s*(.*)$/i);if(m){cur.good=m[1];continue}
      m=line.match(/^Где\s+(?:ошибка|слабое\s+место):\s*(.*)$/i);if(m){cur.mistake=m[1];continue}
      m=line.match(/^Риск:\s*(.*)$/i);if(m){cur.risk=m[1];continue}
      cur.other.push(line);
    }
    const whyHtml=(why.length?why:[{n:'',text:src}]).map((x,i)=>`<div class="sh837-hard-card sh837-hard-why"><div class="sh837-hard-card-head"><span>${x.n?esc(x.n):'✓'}</span><b>${i===0?'Почему это верно':'Логика решения'}</b></div><p>${esc(x.text)}</p></div>`).join('');
    const sourceHtml=source.length?`<div class="sh837-hard-card sh837-hard-source"><div class="sh837-hard-card-head"><span>📚</span><b>Где проверить</b></div><p>${esc(source.join(' '))}</p></div>`:'';
    const wrongHtml=wrong.length?`<div class="sh837-hard-subtitle">⚠️ Почему остальные варианты слабее</div><div class="sh837-hard-wrong-grid">${wrong.map(w=>`<div class="sh837-hard-card sh837-hard-wrong"><div class="sh837-hard-card-head"><span>${esc(w.n)}</span><b>Вариант ${esc(w.n)}</b></div>${w.good?`<div class="sh837-hard-mini good"><b>Что хорошо</b><p>${esc(w.good)}</p></div>`:''}${w.mistake?`<div class="sh837-hard-mini mistake"><b>Где ошибка</b><p>${esc(w.mistake)}</p></div>`:''}${w.risk?`<div class="sh837-hard-mini risk"><b>Риск</b><p>${esc(w.risk)}</p></div>`:''}${w.other?.length?`<p>${esc(w.other.join(' '))}</p>`:''}</div>`).join('')}</div>`:'';
    return `<div class="sh837-hard-explain"><div class="sh837-hard-subtitle">✅ Почему правильный ответ</div><div class="sh837-hard-why-grid">${whyHtml}</div>${sourceHtml}${wrongHtml}</div>`;
  }

  function hardFeedback835(d){
    const selected=(d.options||[])[Number(d.selected)]||'';
    const correct=(d.options||[])[Number(d.correct)]||'';
    const ok=!!d.is_correct;
    return `<section class="sh831-review-step ${ok?'is-good':'is-fix'}">
      <div class="sh831-review-step-head"><span>Шаг ${d.step}</span><b>${ok?'Верно':'Есть ошибка'}</b></div>
      <div class="sh831-review-chat">
        <div class="sh831-msg sh831-client"><div class="sh831-who">Клиент</div><div>${esc(d.question||'')}</div></div>
        <div class="sh831-msg sh831-worker"><div class="sh831-who">Вы выбрали</div><div>${esc(selected)}</div></div>
      </div>
      ${!ok?`<div class="sh831-better"><span>Правильный ответ</span><strong>${esc(correct)}</strong></div>`:''}
      ${hardExplanation835(d.explanation||'')}
    </section>`;
  }

  function strongHardDialogue835(r){
    return (r.details||[]).map(d=>{
      const correct=(d.options||[])[Number(d.correct)]||'';
      return `<div class="sh831-msg sh831-client"><div class="sh831-who">Клиент</div><div>${esc(d.question||'')}</div></div><div class="sh831-msg sh831-worker"><div class="sh831-who">Правильный ответ</div><div>${esc(correct)}</div></div>`;
    }).join('');
  }

  function nextHardDialogue835(x){
    const all=(S.content||[]).filter(c=>c&&c.status==='published'&&c.section==='hard'&&c.type==='dialogue'&&c.id!==x?.id);
    if(!all.length)return null;
    const seen=seenContentMap();
    const same=all.filter(c=>c.topic===x?.topic);
    return same.find(c=>!seen.has(c.id)) || all.find(c=>!seen.has(c.id)) || same[0] || all[0] || null;
  }

  function finishHardDialogue835(){
    const r=S.currentRun;if(!r||r.finished)return;
    r.finished=true;r.transitioning=false;
    const total=hardTotal835(r.x),p=Math.round(r.score/Math.max(1,total)*100);
    recordAttempt({section:r.x.section,topic:r.x.topic,score:p,type:'dialogue',cpm:0,details:r.details||[]});
    const nextCase=nextHardDialogue835(r.x);
    $('page-run').innerHTML=`
      <div class="sh831-soft-wrap sh831-result-wrap sh835-hard-result">
        <div class="card sh831-result-head">
          <div><span class="sh831-result-kicker">Диалог завершён</span><h2>${esc(r.x.title||r.x.topic||'Hard Skills')}</h2><p>Разбор показан после завершения всего разговора — во время диалога правильность ответов не подсказывается.</p></div>
          <div class="sh831-score"><strong>${p}%</strong><span>${r.score} из ${total} верных решений</span></div>
        </div>
        <div class="sh831-result-section"><h3>Ваш диалог и разбор</h3>${(r.details||[]).map(hardFeedback835).join('')}</div>
        <details class="card sh831-strong-dialog"><summary>Показать правильный диалог целиком</summary><div class="sh831-chat-thread">${strongHardDialogue835(r)}</div></details>
        <div class="actions sh831-result-actions"><button class="btn secondary" onclick="go('training')">К тренировкам</button><button class="btn secondary" onclick="startContent('${jsq(r.x.id||'')}')">Пройти ещё раз</button>${nextCase?`<button class="btn primary" onclick="startContent('${jsq(nextCase.id)}')">Следующий кейс →</button>`:''}</div>
      </div>`;
  }

  window.startDialogue=function(x){
    if(!isHardContent835(x))return baseStartDialogue835(x);
    S.currentRun={type:'dialogue',x,i:0,score:0,details:[],finished:false,transitioning:false};
    goRun();renderHardDialogue835();
  };
  window.renderDialogue=function(){return isHardRun835()?renderHardDialogue835():baseRenderDialogue835()};
  window.answerDialogue=function(i){return isHardRun835()?answerHardDialogue835(i):baseAnswerDialogue835(i)};
  window.finishDialogue=function(){return isHardRun835()?finishHardDialogue835():baseFinishDialogue835()};

  window.__skillhubV835={renderHardDialogue835,finishHardDialogue835};
  console.info('SkillHub V8.36: Hard dialogue explanations use structured cards; other training flows are unchanged.');
})();
/* ===== end SkillHub V8.35 ===== */

/* ===== SkillHub V8.36 — structured Hard dialogue explanations ===== */


/* ===== SkillHub V8.37 — RG attention analytics + separate manual review queue ===== */
(function(){
  'use strict';
  function sh837MentorRecommendations(users){
    const rows=[];
    for(const u of users||[]){
      for(const t of topicStats(u.login)){
        if(!t.diagnosed||!['soft','hard'].includes(t.section))continue;
        if(!['gap','attention'].includes(t.status))continue;
        rows.push({...t,login:u.login,name:u.name||u.login,priority:t.status==='gap'?0:1});
      }
    }
    return rows.sort((a,b)=>a.priority-b.priority||a.avgRecent-b.avgRecent||String(a.name).localeCompare(String(b.name),'ru'));
  }
  function sh837AttentionRow(r){
    const assigned=hasActiveTopicAssignment(r.login,r.section,r.topic),available=hasTopicContent(r.section,r.topic),bad=r.status==='gap';
    const label=bad?'Зона развития':'Нужно закрепить';
    return `<div class="sh837-att-row">${sh74AvatarHtml(r.login,r.name)}<div class="sh837-att-copy"><div class="sh837-att-top"><b>${esc(r.name)}</b><span class="pill ${bad?'bad':'warn'}">${esc(label)}</span></div><div class="meta">${secName(r.section)} · ${esc(r.topic)} · ${r.avgRecent}% за последние ${Math.min(r.attempts,ADAPTIVE.recentWindow)} попытки</div><small>SkillHub рекомендует: ${esc(secName(r.section))} → ${esc(r.topic)}</small></div><div class="sh837-att-action">${assigned?'<span class="pill good">Уже назначено</span>':available?`<button class="btn primary" onclick="openRecommendedAssignment('${jsq(r.login)}','${r.section}','${jsq(r.topic)}')">Назначить курс</button>`:'<span class="muted small">Нет материалов</span>'}</div></div>`;
  }
  renderManagerMentor=function(){
    const users=teamRows(S.profile.login),pending=typeof pendingManualForMentor==='function'?pendingManualForMentor():[],recs=sh837MentorRecommendations(users),prog=sh74TeamAssignmentProgress(users),completed=users.reduce((n,x)=>n+Number(x.completed||0),0),overdue=users.reduce((n,x)=>n+Number(x.overdue||0),0),attentionUsers=new Set(recs.map(x=>x.login)).size;
    $('pageTitle').textContent='Моя группа';$('pageSub').textContent=`${S.profile.group_name||S.profile.name} · команда и развитие`;
    const attentionHtml=recs.slice(0,8).map(sh837AttentionRow).join('');
    const more=recs.length>8?`<div class="sh837-att-more">Ещё рекомендаций: ${recs.length-8}. Все результаты доступны в карточках сотрудников.</div>`:'';
    $('page-mentor').innerHTML=`<div class="sh74-manager"><div class="sh74-manager-top"><div><h2>Моя группа</h2><p>Результаты сотрудников и рекомендации SkillHub</p></div><div class="actions"><button class="btn secondary" onclick="openMentorExport('','${jsq(S.profile.login)}','')">Отчёт Excel</button><button class="btn primary" onclick="openAssignmentEditor()">+ Назначить</button></div></div>
    <div class="sh74-kpis"><div class="sh74-kpi"><small>Сотрудники</small><strong>${users.length}</strong></div><div class="sh74-kpi warn"><small>На проверке</small><strong>${pending.length}</strong></div><div class="sh74-kpi ${attentionUsers?'warn':'good'}"><small>Обратить внимание</small><strong>${attentionUsers}</strong></div><div class="sh74-kpi good"><small>Выполнено</small><strong>${completed}</strong></div></div>
    <div class="sh74-manager-main"><div class="sh74-light-card sh837-attention"><div class="sh74-card-head"><h3>Обратить внимание</h3><small>${recs.length?recs.length+' рекомендаций':'Всё спокойно'}</small></div>${attentionHtml||'<div class="muted">По Soft и Hard сейчас нет подтверждённых зон развития. Аналитика появится после минимум двух попыток по теме.</div>'}${more}</div><div class="card sh74-ring-card"><h3>Прогресс команды</h3><div class="sh74-ring" style="--p:${prog.pct}"><strong>${prog.pct}%</strong></div><div class="sh74-ring-label">Выполнение назначений · ${prog.done}/${prog.total}</div>${overdue?`<div class="sh837-overdue">Просрочено назначений: ${overdue}</div>`:''}</div></div>
    ${manualReviewPanelHtml()}
    <div class="sh74-section-head"><h2>Моя группа</h2><button class="sh74-link" onclick="go('employees')">Смотреть всех</button></div>${sh74TeamRowsHtml(users)}
    <div class="sh74-section-head"><h2>Прогресс по направлениям</h2></div><div class="card">${sh74DirectionsHtml(users)}</div></div>`;
  };
  console.info('SkillHub V8.37: RG attention uses Soft/Hard analytics; manual work review stays separate.');
})();
/* ===== end SkillHub V8.37 ===== */

/* ===== SkillHub V8.38 — RG recommendations, compact manual queue, no RG Progress tab ===== */
(function(){
  'use strict';

  const sh838BaseRenderManagerMentor = renderManagerMentor;
  renderManagerMentor = function(){
    sh838BaseRenderManagerMentor();
    const page=$('page-mentor'); if(!page) return;

    // Make the recommendation explicit: the system shows WHAT to assign and then offers the action.
    page.querySelectorAll('.sh837-att-row').forEach(row=>{
      const copy=row.querySelector('.sh837-att-copy');
      if(copy){
        const hint=copy.querySelector('small');
        if(hint && /SkillHub рекомендует:/i.test(hint.textContent||'')){
          hint.textContent=(hint.textContent||'').replace(/SkillHub рекомендует:/i,'Рекомендованный курс:');
          hint.classList.add('sh838-course-label');
        }
      }
      const btn=row.querySelector('.sh837-att-action .btn');
      if(btn && /Назначить курс/i.test(btn.textContent||'')) btn.textContent='Назначить рекомендованный курс';
    });

    // The separate progress ring is redundant for RG: analytics live in "Обратить внимание".
    page.querySelector('.sh74-ring-card')?.remove();
    const main=page.querySelector('.sh74-manager-main');
    if(main) main.classList.add('sh838-manager-main-single');
  };

  // Manual review stays grouped by employee: one employee card on the dashboard.
  manualReviewPanelHtml = function(){
    const groups=shManualPendingGroups(),total=groups.reduce((n,g)=>n+g.count,0);
    if(!groups.length){
      return `<section class="sh-manual-review-section"><div class="sh-manual-review-head"><div><h2>✍️ Проверка работ</h2><p>Ручные кейсы сотрудников</p></div><span class="pill good">0 на проверке</span></div><div class="sh-manual-review-empty">Новых работ на проверку нет 🎉</div></section>`;
    }
    return `<section class="sh-manual-review-section"><div class="sh-manual-review-head"><div><h2>✍️ Проверка работ</h2><p>${groups.length} ${groups.length===1?'сотрудник':'сотрудников'} · ${total} ${shManualCaseWord(total)} на проверке</p></div><span class="pill warn">${total} на проверке</span></div><div class="sh-manual-review-grid">${groups.map(g=>{
      const initialsText=typeof initials==='function'?initials(g.name):String(g.name||g.login).slice(0,2).toUpperCase();
      return `<button class="sh-manual-review-card" onclick="openManualReviewGroup('${jsq(g.login)}')"><span class="sh-manual-review-avatar">${esc(initialsText)}</span><span class="sh-manual-review-copy"><b>${esc(g.name)}</b><strong>${g.count} ${shManualWorkWord(g.count)} на проверке</strong><small>${esc(shManualRangeText(g.rows))}</small><em>Открыть карточку сотрудника и все ручные работы</em></span><span class="sh-manual-review-open">Открыть →</span></button>`;
    }).join('')}</div></section>`;
  };

  window.openManualReviewGroup = function(login){
    const rows=(typeof pendingManualForMentor==='function'?pendingManualForMentor():[])
      .filter(x=>x.login===login)
      .sort((a,b)=>Date.parse(b.created_at||0)-Date.parse(a.created_at||0));
    if(!rows.length){toast('У сотрудника уже нет работ на проверке');renderMentor();return}
    const user=(S.allowed||[]).find(x=>x.login===login)||{};
    shManualReviewBatch={login,ids:rows.map(x=>x.id),pos:0,total:rows.length};
    showModal(`<div class="modal-head"><div><div class="sh-manual-review-modal-kicker">Карточка сотрудника</div><h2>${esc(user.name||login)}</h2><div class="meta">${rows.length} ${shManualWorkWord(rows.length)} на проверке · ${esc(login)}</div></div><button class="btn secondary" onclick="closeManualReviewBatch()">✕</button></div><div class="sh838-manual-list">${rows.map((r,i)=>{const c=(S.content||[]).find(x=>x.id===r.content_id),d=shManualDateParts(r.created_at);return `<button class="sh838-manual-item" onclick="sh838OpenManualWork('${r.id}')"><span class="sh838-manual-num">${i+1}</span><span class="sh838-manual-item-copy"><b>${esc(c?.title||'Ручной тренажёр')}</b><small>${esc(c?.topic||'Soft Skills')} · версия ${r.version} · ${esc(d.full)}</small></span><span class="sh838-manual-arrow">Проверить →</span></button>`}).join('')}</div>`);
  };

  window.sh838OpenManualWork = function(answerId){
    const r=(S.manualAnswers||[]).find(x=>x.id===answerId);
    if(!r)return;
    if(shManualReviewBatch?.login){
      const idx=shManualReviewBatch.ids.indexOf(answerId);
      if(idx>=0) shManualReviewBatch.pos=idx;
    }
    openManualReview(answerId);
    const head=$('modalCard')?.querySelector('.modal-head');
    if(head && shManualReviewBatch?.login && !head.querySelector('.sh838-back-to-manual-list')){
      const btn=document.createElement('button');
      btn.className='btn secondary sh838-back-to-manual-list';
      btn.textContent='← Все работы сотрудника';
      btn.onclick=()=>openManualReviewGroup(shManualReviewBatch.login);
      head.insertBefore(btn, head.firstChild);
    }
  };

  function sh838ConfigureRgNavigation(){
    if(S.profile?.role!=='mentor')return;
    const nav=document.querySelector('.sidebar nav'); if(!nav)return;
    const progress=nav.querySelector('.nav-btn[data-page="progress"]');
    if(progress)progress.classList.add('hidden');
    const order=['home','training','notifications','mentor','rgpractice','content','assignments','profile','employees'];
    for(const page of order){const b=nav.querySelector(`.nav-btn[data-page="${page}"]`);if(b&&!b.classList.contains('hidden'))nav.appendChild(b)}
  }

  const sh838BaseGo=go;
  go=function(page){
    if(S.profile?.role==='mentor'&&page==='progress')page='mentor';
    sh838BaseGo(page);
    sh838ConfigureRgNavigation();
  };
  const sh838BaseEnterApp=enterApp;
  enterApp=function(){sh838BaseEnterApp();sh838ConfigureRgNavigation()};

  // Apply the final RG navigation state immediately after role-specific renderers run.
  setTimeout(sh838ConfigureRgNavigation,0);
  console.info('SkillHub V8.38: RG shows explicit recommended courses, manual works drill into employee cards, RG Progress tab hidden.');
})();
/* ===== end SkillHub V8.38 ===== */


/* ===== SkillHub V8.39 — compact RG attention cards ===== */
(function(){
  'use strict';

  function sh839RecommendationsForUsers(users){
    const rows=[];
    for(const u of users||[]){
      for(const t of topicStats(u.login)){
        if(!t.diagnosed||!['soft','hard'].includes(t.section))continue;
        if(!['gap','attention'].includes(t.status))continue;
        rows.push({...t,login:u.login,name:u.name||u.login,priority:t.status==='gap'?0:1});
      }
    }
    return rows.sort((a,b)=>a.priority-b.priority||a.avgRecent-b.avgRecent||String(a.name).localeCompare(String(b.name),'ru'));
  }

  function sh839AttentionGroups(users){
    const recs=sh839RecommendationsForUsers(users),map=new Map();
    for(const r of recs){
      if(!map.has(r.login))map.set(r.login,{login:r.login,name:r.name,recs:[]});
      map.get(r.login).recs.push(r);
    }
    return [...map.values()].sort((a,b)=>{
      const aw=Math.min(...a.recs.map(x=>Number(x.avgRecent||100)));
      const bw=Math.min(...b.recs.map(x=>Number(x.avgRecent||100)));
      return aw-bw||String(a.name).localeCompare(String(b.name),'ru');
    });
  }

  function sh839AttentionEmployeeCard(g){
    const initialsText=typeof initials==='function'?initials(g.name):String(g.name||g.login).slice(0,2).toUpperCase();
    const sections=[...new Set(g.recs.map(r=>secName(r.section)))];
    const worst=Math.min(...g.recs.map(r=>Number(r.avgRecent||0)));
    const severe=g.recs.some(r=>r.status==='gap');
    return `<button class="sh839-att-card" onclick="openAttentionEmployee('${jsq(g.login)}')">
      <span class="sh839-att-avatar">${esc(initialsText)}</span>
      <span class="sh839-att-card-copy">
        <span class="sh839-att-card-top"><b>${esc(g.name)}</b><span class="pill ${severe?'bad':'warn'}">${g.recs.length} ${g.recs.length===1?'рекомендация':'рекомендации'}</span></span>
        <small>${esc(sections.join(' · '))} · минимальный результат ${worst}%</small>
        <em>Открыть аналитику и рекомендации</em>
      </span>
      <span class="sh839-att-open">Открыть →</span>
    </button>`;
  }

  window.openAttentionEmployee=function(login){
    const users=teamRows(S.profile.login),u=users.find(x=>x.login===login)||(S.allowed||[]).find(x=>x.login===login)||{login,name:login};
    const recs=sh839RecommendationsForUsers([u]);
    if(!recs.length){toast('Сейчас для сотрудника нет подтверждённых рекомендаций');renderMentor();return}
    const list=recs.map(r=>{
      const assigned=hasActiveTopicAssignment(r.login,r.section,r.topic),available=hasTopicContent(r.section,r.topic),bad=r.status==='gap';
      return `<div class="sh839-rec-card">
        <div class="sh839-rec-head"><div><span class="sh839-rec-section">${esc(secName(r.section))}</span><h3>${esc(r.topic)}</h3></div><span class="pill ${bad?'bad':'warn'}">${r.avgRecent}%</span></div>
        <div class="sh839-rec-meta">${bad?'Зона развития':'Нужно закрепить'} · ${r.attempts} попыток</div>
        <div class="sh839-rec-reason">SkillHub рекомендует назначить курс по этой теме.</div>
        <div class="sh839-rec-actions">${assigned?'<span class="pill good">Уже назначено</span>':available?`<button class="btn primary" onclick="openRecommendedAssignment('${jsq(r.login)}','${r.section}','${jsq(r.topic)}')">Назначить рекомендованный курс</button>`:'<span class="muted small">По этой теме пока нет опубликованных материалов</span>'}</div>
      </div>`;
    }).join('');
    showModal(`<div class="modal-head"><div><div class="sh-manual-review-modal-kicker">Обратить внимание</div><h2>${esc(u.name||login)}</h2><div class="meta">${recs.length} ${recs.length===1?'рекомендация':'рекомендации'} SkillHub</div></div><button class="btn secondary" onclick="closeModal()">✕</button></div>
      <div class="sh839-rec-list">${list}</div>
      <div class="sh839-rec-footer"><button class="btn secondary" onclick="openAssignmentEditor({recipients:['${jsq(login)}']})">Назначить другой курс</button></div>`);
  };

  const sh839BaseRenderManagerMentor=renderManagerMentor;
  renderManagerMentor=function(){
    sh839BaseRenderManagerMentor();
    if(S.profile?.role!=='mentor')return;
    const page=$('page-mentor');if(!page)return;
    const users=teamRows(S.profile.login),groups=sh839AttentionGroups(users),attention=page.querySelector('.sh837-attention');
    if(attention){
      attention.innerHTML=`<div class="sh74-card-head"><div><h3>Обратить внимание</h3><small>Аналитика Soft и Hard</small></div><span class="pill ${groups.length?'warn':'good'}">${groups.length} ${groups.length===1?'сотрудник':'сотрудников'}</span></div>
        ${groups.length?`<div class="sh839-att-grid">${groups.map(sh839AttentionEmployeeCard).join('')}</div>`:'<div class="muted">По Soft и Hard сейчас нет подтверждённых зон развития. Аналитика появится после минимум двух попыток по теме.</div>'}`;
    }
    // RG does not need a separate progress block: all actionable analytics are in "Обратить внимание".
    [...page.querySelectorAll('.sh74-section-head')].forEach(head=>{
      if(/Прогресс\s+по\s+направлениям/i.test(head.textContent||'')){
        const next=head.nextElementSibling;head.remove();if(next?.classList.contains('card'))next.remove();
      }
    });
  };

  console.info('SkillHub V8.39: RG attention is grouped into employee cards; recommendations open inside the employee card; manual review remains grouped by employee; RG progress block removed.');
})();
/* ===== end SkillHub V8.39 ===== */

/* ===== SkillHub V8.40 — pilot RG full employee mode + Spam self-cabinet ===== */
(function(){
  'use strict';
  const PILOT_RG_LOGINS=new Set(['v.arabova','a.eliseev1','e.g.kobzar','i.m.aliev']);
  window.sh840IsPilotRg=function(){return S?.profile?.role==='mentor'&&PILOT_RG_LOGINS.has(String(S.profile.login||'').toLowerCase())};

  function sh840OwnAttempts(){return (S.attempts||[]).filter(x=>x.login===S.profile?.login).slice().sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))}
  function sh840Avg(sec){const r=sh840OwnAttempts().filter(x=>x.section===sec&&x.type!=='typing');return r.length?Math.round(r.reduce((n,x)=>n+Number(x.score||0),0)/r.length):null}
  function sh840LatestTyping(){return sh840OwnAttempts().find(x=>x.type==='typing')||null}
  function sh840LatestManualRows(){const map=new Map();for(const r of (S.manualAnswers||[]).filter(x=>x.login===S.profile?.login).sort((a,b)=>Number(a.version)-Number(b.version)))map.set(r.content_id,r);return [...map.values()].sort((a,b)=>new Date(b.updated_at||b.created_at)-new Date(a.updated_at||a.created_at))}
  function sh840OwnRecommendations(){try{return (topicStats(S.profile.login)||[]).filter(x=>x.diagnosed&&['soft','hard'].includes(x.section)).sort((a,b)=>Number(a.avgRecent||100)-Number(b.avgRecent||100));}catch(e){return[]}}
  function sh840ManualCard(r){const c=(S.content||[]).find(x=>x.id===r.content_id);const status=manualStatusText(r.status);const cls=manualStatusClass(r.status);let action='';if(r.status==='submitted')action=`<button class="btn primary" onclick="sh840OpenSelfReview('${r.id}')">Проверить</button>`;else if(r.status==='revision_requested')action=`<button class="btn primary" onclick="startManualContent('${r.content_id}')">Доработать</button>`;else action=`<button class="btn secondary" onclick="sh742OpenManualHistory('${r.content_id}','${jsq(S.profile.login)}')">История</button>`;return `<div class="card sh840-manual-card"><div class="actions" style="justify-content:space-between;align-items:flex-start"><div><b>${esc(c?.title||'Ручной тренажёр')}</b><div class="meta">${esc(c?.topic||'Soft Skills')} · версия ${r.version}</div></div><span class="pill ${cls}">${status}</span></div><div class="manual-answer-text" style="margin-top:10px">${esc(r.answer)}</div>${r.mentor_comment?`<div class="review-note"><b>Комментарий</b><div>${esc(r.mentor_comment)}</div></div>`:''}<div class="actions" style="justify-content:flex-end;margin-top:10px">${action}</div></div>`}

  window.sh840OpenSelfReview=function(answerId){const r=(S.manualAnswers||[]).find(x=>x.id===answerId&&x.login===S.profile?.login);if(!r)return;const c=(S.content||[]).find(x=>x.id===r.content_id);showModal(`<div class="modal-head"><div><h2>Проверка своей работы</h2><div class="meta">${esc(c?.title||'Ручной тренажёр')} · ${esc(c?.topic||'Soft Skills')}</div></div><button class="btn secondary" onclick="closeModal()">✕</button></div><div class="card"><div class="manual-prompt">${esc(c?.question||c?.title||'')}</div><div class="manual-answer-text" style="margin-top:12px">${esc(r.answer)}</div></div><div class="field" style="margin-top:12px"><label>Комментарий к доработке</label><textarea id="sh840SelfComment" rows="4" placeholder="Что нужно исправить или улучшить"></textarea></div><div class="field"><label>Как можно сформулировать лучше (необязательно)</label><textarea id="sh840SelfSuggestion" rows="3" placeholder="Пример улучшенного ответа"></textarea></div><div class="actions" style="justify-content:flex-end"><button class="btn warn" onclick="sh840ReviewSelf('${r.id}','revision_requested')">На доработку</button><button class="btn primary" onclick="sh840ReviewSelf('${r.id}','accepted')">Принять</button></div>`)};
  window.sh840ReviewSelf=async function(answerId,decision){if(!sh840IsPilotRg())return;const comment=$('sh840SelfComment')?.value.trim()||'',suggestion=$('sh840SelfSuggestion')?.value.trim()||'';if(decision==='revision_requested'&&!comment){toast('Для доработки добавьте комментарий');return}const {error}=await S.sb.rpc('pilot_review_manual_answer',{p_answer_id:answerId,p_decision:decision,p_comment:comment||null,p_suggestion:suggestion||null});if(error){toast(error.message||'Не удалось сохранить проверку');return}closeModal();await syncAll();go('rgpractice');toast(decision==='accepted'?'Работа принята':'Работа отправлена на доработку')};

  const baseSubmitManual840=window.submitManualAnswer;
  window.submitManualAnswer=async function(contentId){if(!sh840IsPilotRg())return baseSubmitManual840(contentId);const answer=$('manualAnswerInput')?.value.trim()||'';if(answer.length<3){toast('Напишите ответ');return}const btn=document.querySelector(`[onclick="submitManualAnswer('${contentId}')"]`);if(btn){btn.disabled=true;btn.textContent='Отправляем…'}const {error}=await S.sb.rpc('pilot_submit_manual_answer',{p_content_id:contentId,p_answer:answer});if(error){let m=error.message||String(error);if(m.includes('ALREADY_PENDING'))m='Эта работа уже находится в Спаме на проверке.';else if(m.includes('ALREADY_ACCEPTED'))m='Эта работа уже принята.';toast(m);if(btn){btn.disabled=false;btn.textContent='Отправить на проверку'}return}await syncAll();go('rgpractice');toast('Ответ сохранён в Спаме — теперь его можно проверить')};

  const baseStartManual840=window.startManualContent;
  window.startManualContent=function(id){if(!sh840IsPilotRg())return baseStartManual840(id);const old=S.profile.role;S.profile.role='employee';try{return baseStartManual840(id)}finally{S.profile.role=old}};

  const baseRenderTraining840=window.renderTraining;
  window.renderTraining=function(){if(!sh840IsPilotRg())return baseRenderTraining840();$('pageTitle').textContent='Тренировки';$('pageSub').textContent='Проходите обучение так же, как сотрудник';$('page-training').innerHTML=trainingCards()};

  function sh840RenderSpam(){const soft=sh840Avg('soft'),hard=sh840Avg('hard'),typing=sh840LatestTyping(),manual=sh840LatestManualRows(),recs=sh840OwnRecommendations();const pending=manual.filter(x=>x.status==='submitted').length,revision=manual.filter(x=>x.status==='revision_requested').length,accepted=manual.filter(x=>x.status==='accepted').length;$('pageTitle').textContent='Спам';$('pageSub').textContent='Личный кабинет тестовой группы · только ваши результаты';$('page-rgpractice').innerHTML=`<div class="card rg-demo-intro"><div><div class="rg-demo-kicker">ЛИЧНЫЙ РЕЖИМ РГ</div><h2>${esc(S.profile.name||S.profile.login)}</h2><p>Здесь отображаются только ваши собственные результаты. Данные сотрудников остаются в «Моей группе» и сюда не попадают.</p></div><button class="btn primary" onclick="go('training')">Перейти к тренировкам</button></div><div class="grid4"><div class="card kpi"><small>Soft</small><strong>${soft===null?'—':soft+'%'}</strong></div><div class="card kpi"><small>Hard</small><strong>${hard===null?'—':hard+'%'}</strong></div><div class="card kpi"><small>Печать</small><strong>${typing?Number(typing.score||0)+' зн/мин':'—'}</strong></div><div class="card kpi"><small>Ручные работы</small><strong>${manual.length}</strong><span class="muted small">${pending} на проверке · ${revision} на доработке · ${accepted} принято</span></div></div><div class="section-title"><h2>🧭 Обратить внимание</h2><span class="muted small">аналитика только по вашим попыткам</span></div><div class="card">${recs.length?recs.map(x=>`<div class="gap-row"><div class="gap-topic"><b>${secName(x.section)} · ${esc(x.topic)}</b><span class="muted small">${x.attempts||0} попыток</span></div><div class="gap-score"><span class="pill bad">${Math.round(Number(x.avgRecent||0))}%</span></div><div class="gap-action"><button class="btn primary" onclick="startTopic('${x.section}','${jsq(x.topic)}')">Пройти рекомендованный курс</button></div></div>`).join(''):'<div class="muted">Пока нет подтверждённых зон развития.</div>'}</div><div class="section-title"><h2>✍️ Мои ручные работы</h2><span class="muted small">можно проверить самому, принять или вернуть на доработку</span></div><div class="sh840-manual-grid">${manual.length?manual.map(sh840ManualCard).join(''):'<div class="card"><div class="muted">Ручных работ пока нет. Откройте «Тренировки → Soft Skills → Ручные тренажёры».</div></div>'}</div>`}

  const baseRenderRgPractice840=window.renderRgPractice;
  window.renderRgPractice=function(){return sh840IsPilotRg()?sh840RenderSpam():baseRenderRgPractice840()};
  function sh840ConfigureNav(){if(!sh840IsPilotRg())return;const btn=document.querySelector('.nav-btn[data-page="rgpractice"]');if(btn){btn.classList.remove('hidden');const t=btn.querySelector('.nav-text');if(t)t.textContent='Спам'}document.querySelector('.nav-btn[data-page="progress"]')?.classList.add('hidden')}
  const baseGo840=window.go;window.go=function(page){const r=baseGo840(page);sh840ConfigureNav();return r};
  const baseEnter840=window.enterApp;window.enterApp=function(){baseEnter840();sh840ConfigureNav()};
  setTimeout(sh840ConfigureNav,0);
  console.info('SkillHub V8.40: pilot RGs get full employee training and isolated Spam self-cabinet.');
})();
/* ===== end SkillHub V8.40 ===== */

/* ===== SkillHub V8.41 — compact Spam cards for pilot RGs ===== */
(function(){
  'use strict';

  function sh841OwnAttempts(){
    return (S.attempts||[]).filter(x=>x.login===S.profile?.login).slice().sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  }
  function sh841Avg(section){
    const rows=sh841OwnAttempts().filter(x=>x.section===section&&x.type!=='typing');
    return rows.length?Math.round(rows.reduce((n,x)=>n+Number(x.score||0),0)/rows.length):null;
  }
  function sh841LatestTyping(){return sh841OwnAttempts().find(x=>x.type==='typing')||null}
  function sh841LatestManualRows(){
    const map=new Map();
    for(const r of (S.manualAnswers||[]).filter(x=>x.login===S.profile?.login).sort((a,b)=>Number(a.version)-Number(b.version))) map.set(r.content_id,r);
    return [...map.values()].sort((a,b)=>new Date(b.updated_at||b.created_at)-new Date(a.updated_at||a.created_at));
  }
  function sh841OwnRecommendations(){
    try{
      return (topicStats(S.profile.login)||[])
        .filter(x=>x.diagnosed&&['soft','hard'].includes(x.section)&&['gap','attention'].includes(x.status))
        .sort((a,b)=>Number(a.avgRecent||100)-Number(b.avgRecent||100));
    }catch(e){return[]}
  }
  function sh841Initials(){
    const n=String(S.profile?.name||S.profile?.login||'RG');
    return typeof initials==='function'?initials(n):n.slice(0,2).toUpperCase();
  }
  function sh841ResultText(soft,hard,typing){
    const a=[];
    a.push(`Soft ${soft===null?'—':soft+'%'}`);
    a.push(`Hard ${hard===null?'—':hard+'%'}`);
    a.push(`Печать ${typing?Number(typing.score||0)+' зн/мин':'—'}`);
    return a.join(' · ');
  }
  function sh841ManualCounts(rows){
    return {
      pending:rows.filter(x=>x.status==='submitted').length,
      revision:rows.filter(x=>x.status==='revision_requested').length,
      accepted:rows.filter(x=>x.status==='accepted').length
    };
  }

  window.sh841OpenOwnAttention=function(){
    const recs=sh841OwnRecommendations();
    if(!recs.length){toast('Сейчас для вас нет подтверждённых рекомендаций');return}
    const list=recs.map(r=>{
      const bad=r.status==='gap';
      return `<div class="sh839-rec-card">
        <div class="sh839-rec-head"><div><span class="sh839-rec-section">${esc(secName(r.section))}</span><h3>${esc(r.topic)}</h3></div><span class="pill ${bad?'bad':'warn'}">${Math.round(Number(r.avgRecent||0))}%</span></div>
        <div class="sh839-rec-meta">${bad?'Зона развития':'Нужно закрепить'} · ${r.attempts||0} попыток</div>
        <div class="sh839-rec-reason">SkillHub рекомендует повторно пройти обучение по этой теме.</div>
        <div class="sh839-rec-actions"><button class="btn primary" onclick="closeModal();startTopic('${r.section}','${jsq(r.topic)}')">Пройти рекомендованный курс</button></div>
      </div>`;
    }).join('');
    showModal(`<div class="modal-head"><div><div class="sh-manual-review-modal-kicker">Моя аналитика</div><h2>${esc(S.profile.name||S.profile.login)}</h2><div class="meta">${recs.length} ${recs.length===1?'рекомендация':'рекомендации'} SkillHub</div></div><button class="btn secondary" onclick="closeModal()">✕</button></div>
      <div class="sh839-rec-list">${list}</div>
      <div class="sh839-rec-footer"><button class="btn secondary" onclick="closeModal();go('training')">Выбрать другой курс</button></div>`);
  };

  window.sh841OpenOwnManuals=function(){
    const rows=sh841LatestManualRows();
    if(!rows.length){toast('Ручных работ пока нет');return}
    const items=rows.map((r,i)=>{
      const c=(S.content||[]).find(x=>x.id===r.content_id);
      const status=manualStatusText(r.status), cls=manualStatusClass(r.status);
      let action='Открыть →';
      if(r.status==='submitted') action='Проверить →';
      else if(r.status==='revision_requested') action='Доработать →';
      else if(r.status==='accepted') action='История →';
      return `<button class="sh841-own-manual-item" onclick="sh841OpenOwnManualItem('${r.id}')">
        <span class="sh838-manual-num">${i+1}</span>
        <span class="sh838-manual-item-copy"><b>${esc(c?.title||'Ручной тренажёр')}</b><small>${esc(c?.topic||'Soft Skills')} · версия ${r.version}</small><span class="pill ${cls}">${esc(status)}</span></span>
        <span class="sh838-manual-arrow">${action}</span>
      </button>`;
    }).join('');
    showModal(`<div class="modal-head"><div><div class="sh-manual-review-modal-kicker">Мои ручные работы</div><h2>${esc(S.profile.name||S.profile.login)}</h2><div class="meta">${rows.length} ${rows.length===1?'работа':'работ'}</div></div><button class="btn secondary" onclick="closeModal()">✕</button></div><div class="sh838-manual-list">${items}</div>`);
  };

  window.sh841OpenOwnManualItem=function(answerId){
    const r=(S.manualAnswers||[]).find(x=>x.id===answerId&&x.login===S.profile?.login);
    if(!r)return;
    closeModal();
    if(r.status==='submitted') return sh840OpenSelfReview(r.id);
    if(r.status==='revision_requested') return startManualContent(r.content_id);
    if(typeof sh742OpenManualHistory==='function') return sh742OpenManualHistory(r.content_id,S.profile.login);
  };

  function sh841RenderSpam(){
    const soft=sh841Avg('soft'), hard=sh841Avg('hard'), typing=sh841LatestTyping();
    const manual=sh841LatestManualRows(), recs=sh841OwnRecommendations(), counts=sh841ManualCounts(manual);
    const worst=recs.length?Math.min(...recs.map(x=>Math.round(Number(x.avgRecent||0)))):null;
    const sections=[...new Set(recs.map(x=>secName(x.section)))];
    const severe=recs.some(x=>x.status==='gap');
    const name=esc(S.profile.name||S.profile.login), login=esc(S.profile.login||'');
    const avatar=esc(sh841Initials());

    $('pageTitle').textContent='Спам';
    $('pageSub').textContent='Ваш личный тестовый кабинет';
    $('page-rgpractice').innerHTML=`
      <div class="sh841-spam-summary card">
        <div><div class="rg-demo-kicker">ЛИЧНЫЙ РЕЖИМ РГ</div><h2>${name}</h2><p>${esc(sh841ResultText(soft,hard,typing))}</p></div>
        <button class="btn primary" onclick="go('training')">Перейти к тренировкам</button>
      </div>

      <div class="sh74-light-card sh841-spam-block">
        <div class="sh74-card-head"><div><h3>Обратить внимание</h3><small>Аналитика Soft и Hard</small></div><span class="pill ${recs.length?'warn':'good'}">${recs.length} ${recs.length===1?'рекомендация':'рекомендаций'}</span></div>
        ${recs.length?`<div class="sh839-att-grid sh841-one-card"><button class="sh839-att-card" onclick="sh841OpenOwnAttention()">
          <span class="sh839-att-avatar">${avatar}</span>
          <span class="sh839-att-card-copy"><span class="sh839-att-card-top"><b>${name}</b><span class="pill ${severe?'bad':'warn'}">${recs.length} ${recs.length===1?'рекомендация':'рекомендации'}</span></span><small>${esc(sections.join(' · '))}${worst!==null?' · минимальный результат '+worst+'%':''}</small><em>Открыть аналитику и рекомендованные курсы</em></span>
          <span class="sh839-att-open">Открыть →</span>
        </button></div>`:'<div class="muted">По вашим Soft и Hard сейчас нет подтверждённых зон развития.</div>'}
      </div>

      <section class="sh-manual-review-section sh841-spam-manual">
        <div class="sh-manual-review-head"><div><h2>✍️ Мои ручные работы</h2><p>Все работы открываются внутри одной карточки</p></div><span class="pill ${counts.pending?'warn':'good'}">${counts.pending} на проверке</span></div>
        ${manual.length?`<div class="sh-manual-review-grid sh841-one-card"><button class="sh-manual-review-card" onclick="sh841OpenOwnManuals()">
          <span class="sh-manual-review-avatar">${avatar}</span>
          <span class="sh-manual-review-copy"><b>${name}</b><strong>${manual.length} ${manual.length===1?'ручная работа':'ручных работ'}</strong><small>${counts.pending} на проверке · ${counts.revision} на доработке · ${counts.accepted} принято</small><em>Открыть карточку и все ручные работы</em></span>
          <span class="sh-manual-review-open">Открыть →</span>
        </button></div>`:'<div class="sh-manual-review-empty">Ручных работ пока нет. Пройдите ручной тренажёр в «Тренировках».</div>'}
      </section>`;
  }

  const sh841BaseRenderRgPractice=window.renderRgPractice;
  window.renderRgPractice=function(){return sh840IsPilotRg()?sh841RenderSpam():sh841BaseRenderRgPractice()};

  console.info('SkillHub V8.41: pilot RG Spam uses compact self-cards for recommendations and manual work, matching My Group drill-down pattern.');
})();
/* ===== end SkillHub V8.41 ===== */


/* ===== SkillHub V8.46 — Knowledge Base: embedded index + full offline cache ===== */
(function(){
  'use strict';

  const DOCS={
    reglament:{
      title:'Регламент работы в чате',
      short:'Регламент',
      description:'Пошаговые инструкции и сценарии для работы с клиентскими обращениями',
      pages:53,
      files:{light:'./knowledge/reglament-light.pdf',dark:'./knowledge/reglament-dark.pdf'},
      previews:{light:'./knowledge/previews/reglament-light.webp',dark:'./knowledge/previews/reglament-dark.webp'},
      contentsPage:2,
      updated:'10.09.2026'
    },
    handbook:{
      title:'Настольная книга',
      short:'Настольная книга',
      description:'Рабочие процессы, системы, коммуникация и развитие',
      pages:49,
      files:{light:'./knowledge/handbook-light.pdf',dark:'./knowledge/handbook-dark.pdf'},
      previews:{light:'./knowledge/previews/handbook-light.webp',dark:'./knowledge/previews/handbook-dark.webp'},
      contentsPage:2,
      updated:'11.09.2026'
    }
  };

  const K={docKey:null,index:null,observer:null,loaded:new Set(),zoom:1,currentPage:1,searchToken:0,baseWidth:930};

  const KB_INDEX={reglament:{"doc":"reglament","pageCount":53,"pages":[{"n":1,"width":595.28,"height":841.89,"text":"S-СЕГМЕНТ / РЕГЛАМЕНТ ЧАТОВ Регламент работы в чате. Пошаговые инструкции и сценарии для работы с клиентскими обращениями White edition • обновлено 10.09.2026 Открыть содержание","links":[{"x":0.072235,"y":0.688926,"w":0.265421,"h":0.03801,"page":2}]},{"n":2,"width":595.28,"height":841.89,"text":"S-СЕГМЕНТ / РЕГЛАМЕНТ Работа в чате. Нажимай на кнопки и карточки со стрелкой, чтобы открыть нужный раздел. СТАРТ Порядок работы в чате От получения диалога до завершения вопроса НАЧАЛО ДИАЛОГА Первый ответ и контекст диалога Приветствие → история → уточнения БЕЗОПАСНОСТЬ ИД, 3-е лицо, мошенничество Как проверить клиента и защитить его данные ИД Доп. пользователь без ЭЦП 3-е лицо в ЛК Мошенничество СЛОЖНЫЙ КЕЙС Негатив, запрос старшего, отказ от продукта Выбери ситуацию Негатив Старший РСВ ЗВОНОК Когда звоним, клиент пропал и НДЗ Выбери ситуацию Когда звонить Клиент пропал Не дозвонился Связаться с ЕИО ВИДЕОЗВОНОК ИД по ВЗ, дипфейк, ошибки и отказ Как провести видеозвонок: от приглашения до результата ФИНИШ Закрытие диалога и конец рабочего дня Проверь незавершённые действия перед выходом Закрытие Конец рабочего дня СВЯЗАНО Отложенная работа Когда создать таск и как передать вопрос коллеге Регламент • S-сегмент 1","links":[{"x":0.070555,"y":0.138973,"w":0.85842,"h":0.073644,"page":3},{"x":0.070555,"y":0.220931,"w":0.85842,"h":0.073644,"page":4},{"x":0.097433,"y":0.367031,"w":0.117592,"h":0.033259,"page":7},{"x":0.228464,"y":0.367031,"w":0.270384,"h":0.033259,"page":8},{"x":0.512287,"y":0.367031,"w":0.169441,"h":0.033259,"page":9},{"x":0.695168,"y":0.367031,"w":0.188308,"h":0.033259,"page":53},{"x":0.097433,"y":0.482248,"w":0.14279,"h":0.033259,"page":11},{"x":0.253662,"y":0.482248,"w":0.14279,"h":0.033259,"page":11},{"x":0.409891,"y":0.482248,"w":0.14279,"h":0.033259,"page":13},{"x":0.097433,"y":0.597465,"w":0.173645,"h":0.033259,"page":15},{"x":0.284518,"y":0.597465,"w":0.177215,"h":0.033259,"page":19},{"x":0.475172,"y":0.597465,"w":0.17771,"h":0.033259,"page":16},{"x":0.666321,"y":0.597465,"w":0.190651,"h":0.033259,"page":17},{"x":0.070555,"y":0.648541,"w":0.85842,"h":0.073644,"page":34},{"x":0.097433,"y":0.794641,"w":0.14279,"h":0.033259,"page":24},{"x":0.253662,"y":0.794641,"w":0.21522,"h":0.033259,"page":25},{"x":0.070555,"y":0.845716,"w":0.85842,"h":0.073644,"page":26}]},{"n":3,"width":595.28,"height":841.89,"text":"02 / РЕГЛАМЕНТ ЧАТОВ Порядок работы в чате. Переходи в нужный сценарий по ситуации - карточки кликабельны. Получил диалог Изучи историю, текущие обращения и контекст до уточняющих вопросов. Потребность неясна? Сначала проверь системы и историю. Если без уточнений нельзя - задай их одним сообщением. Ответ займёт дольше 5 минут? В течение 1-2 минут обозначь, что занимаешься вопросом. Есть негатив / отказ от продукта? Негатив - сначала отработай. Отказ / закрытие - перейди к РСВ. Негатив РСВ Клиент перестал отвечать? Через 1,5-3 минуты решение зависит от контекста обращения. Вопрос завершён? Проверь все вопросы, обещания, передачи и только затем закрой диалог. Предыдущая Содержание Регламент • S-сегмент 2","links":[{"x":0.070555,"y":0.135279,"w":0.85842,"h":0.071316,"page":5},{"x":0.070555,"y":0.217285,"w":0.85842,"h":0.071316,"page":6},{"x":0.070555,"y":0.299291,"w":0.85842,"h":0.071316,"page":4},{"x":0.097433,"y":0.454988,"w":0.173028,"h":0.034446,"page":11},{"x":0.2839,"y":0.454988,"w":0.173028,"h":0.034446,"page":13},{"x":0.070555,"y":0.508439,"w":0.85842,"h":0.071316,"page":19},{"x":0.070555,"y":0.590445,"w":0.85842,"h":0.071316,"page":24},{"x":0.319903,"y":0.683141,"w":0.173727,"h":0.035634,"page":2},{"x":0.507069,"y":0.683141,"w":0.173028,"h":0.035634,"page":2}]},{"n":4,"width":595.28,"height":841.89,"text":"03 / РЕГЛАМЕНТ ЧАТОВ Приветствие и «завешивание». Приветствие Ориентируйся на контекст: первое обращение, продолжение диалога, уже было приветствие или нет. Если вопрос понятен Ответь сразу - до 5 минут. Если вопрос вне твоего обучения и нужен перевод на ЛП - передай без завешивания; лишнее приветствие перед переводом не нужно. Если ответ займёт дольше 5 минут В течение 1-2 минут обозначь, что занимаешься вопросом: «Сейчас посмотрю», «Занимаюсь вашим вопросом...» и т.п. «Спасибо» ≠ всегда конец Проверь историю и контекст. Ответ на «Сейчас посмотрю» не означает, что вопрос уже решён. Искренняя благодарность / отзыв Если вопрос решён и клиент делится эмоциями или отзывом - поблагодари и поддержи позитивный тон. Первый ответ и ожидание Диалог в чате Предыдущая История обращений Содержание Регламент • S-сегмент 3","links":[{"x":0.270246,"y":0.576061,"w":0.266882,"h":0.035634,"page":43},{"x":0.550567,"y":0.576061,"w":0.179186,"h":0.035634,"page":46},{"x":0.200795,"y":0.631888,"w":0.173727,"h":0.035634,"page":3},{"x":0.387961,"y":0.631888,"w":0.224777,"h":0.035634,"page":5},{"x":0.626177,"y":0.631888,"w":0.173028,"h":0.035634,"page":2}]},{"n":5,"width":595.28,"height":841.89,"text":"04 / РЕГЛАМЕНТ ЧАТОВ Сначала история, потом вопросы. Продолжение старого контекста Если чат пришёл после коллеги или вопрос опирается на прошлый диалог - обязательно изучи всю историю и запросы. Два диалога одновременно Забери второй чат на себя, сообщи, что работа идёт в другом диалоге; в основном чате ответь на вопросы из обоих. Контекст всё ещё неясен Сначала проверь переписку, активности, запросы и обращения. Только потом попроси клиента подробнее описать вопрос Не спрашивай то, что видно в системе Ориентируйся на данные системы. Если есть расхождение - покажи, что информацию уже проверил, и уточни только необходимое. Не раскрывай данные, запрещённые правилами ИД. Правила конфиденциальности Карточка клиента и параллельные чаты Предыдущая Уточняющие вопросы Содержание Регламент • S-сегмент 4","links":[{"x":0.16002,"y":0.521113,"w":0.299554,"h":0.035634,"page":33},{"x":0.473013,"y":0.521113,"w":0.366968,"h":0.035634,"page":45},{"x":0.194314,"y":0.57694,"w":0.173727,"h":0.035634,"page":4},{"x":0.38148,"y":0.57694,"w":0.237739,"h":0.035634,"page":6},{"x":0.632658,"y":0.57694,"w":0.173028,"h":0.035634,"page":2}]},{"n":6,"width":595.28,"height":841.89,"text":"05 / РЕГЛАМЕНТ ЧАТОВ Уточняющие вопросы: меньше касаний. Собери вопросы одним сообщением Если без уточнений нельзя - задай сразу все вопросы, которые нужны. Используй нумерацию 1-2-... или другое деление. Есть гипотеза - сразу дай пользу Сначала уточни предположение, затем сразу дай ответ для этого варианта. Если гипотеза неверна, клиент поправит; если верна - сократишь диалог. Несколько вопросов, один нужно перевести Сначала реши то, что можешь решить сам, и только потом передай другой вопрос на нужный сплит. Чат пришёл с оценкой КСАТ ниже 4 Причина снижения понятна - обрабатывай чат как обычный. Причина непонятна - уточни у клиента, можешь ли чем-то помочь. Таск по КСАТ не бери в работу и не изменяй: он предназначен для выделенных групп. Предыдущая Идентификация Содержание Регламент • S-сегмент 5","links":[{"x":0.216343,"y":0.511148,"w":0.173727,"h":0.035634,"page":5},{"x":0.403509,"y":0.511148,"w":0.193681,"h":0.035634,"page":7},{"x":0.610629,"y":0.511148,"w":0.173028,"h":0.035634,"page":2}]},{"n":7,"width":595.28,"height":841.89,"text":"06 / РЕГЛАМЕНТ ЧАТОВ Идентификация: финансовую информацию не раскрываем без нужного уровня. Финансовая информация Всё, что видно в системах, считается финансовой информацией. Без соответствующего уровня ИД её предоставлять нельзя. Например, контактный номер - только последние 4 цифры. Процедура ИД - источник правил Соблюдай все условия и действия из процедуры «Идентификация» если она появляется. Этот регламент не заменяет её. Видеозвонок Если процедура требует ВЗ - используй его как способ идентификации. При срыве звони через процедуру «Перезвонить в рамках видеозвонка», а не кнопкой TCRM. Если неудобно говорить - предложи продолжить в чате. Клиент пропал во время ИД Конфиденциальность Видеозвонок Клиент пропал: ИД и НДЗ Предыдущая Пользователь без ЭЦП Содержание Регламент • S-сегмент 6 Если клиент перестал отвечать во время любой идентификации в чате, позвони ему по телефону. Это относится к ИД, видеозвонку и подтверждению буквенным кодом. При НДЗ сначала обязательно пройди процедуру до конца по соответствующим шагам. Не закрывай её через крестик. Затем отправь сообщение по сценарию «НДЗ: ИД / ВЗ / код» и закрой чат по регламенту.","links":[{"x":0.14966,"y":0.577142,"w":0.23603,"h":0.035634,"page":33},{"x":0.399129,"y":0.577142,"w":0.173162,"h":0.035634,"page":34},{"x":0.585731,"y":0.577142,"w":0.264609,"h":0.035634,"page":21},{"x":0.191613,"y":0.632969,"w":0.173727,"h":0.035634,"page":6},{"x":0.378779,"y":0.632969,"w":0.243142,"h":0.035634,"page":8},{"x":0.63536,"y":0.632969,"w":0.173028,"h":0.035634,"page":2}]},{"n":8,"width":595.28,"height":841.89,"text":"07 / РЕГЛАМЕНТ ЧАТОВ Доп. пользователь без ЭЦП. В звонке Консультируй согласно полномочиям и информации базы знаний «Дополнительные пользователи без ЭЦП». Нужна информация из недоступного раздела Уточни, кому из сотрудников с ЭЦП удобнее получить информацию, и направь её с указанным комментарием. Запрещено Не следуй описанию из заметок как основанию для раскрытия данных - это нарушает безопасность. Если сомневаешься в заметках, обратись на линию помощи. Доп. пользователь без ЭЦП Предыдущая Третье лицо в кабинете Содержание Регламент • S-сегмент 7","links":[{"x":0.360608,"y":0.39852,"w":0.278784,"h":0.035634,"page":49},{"x":0.188248,"y":0.454347,"w":0.173727,"h":0.035634,"page":7},{"x":0.375415,"y":0.454347,"w":0.24987,"h":0.035634,"page":9},{"x":0.638724,"y":0.454347,"w":0.173028,"h":0.035634,"page":2}]},{"n":9,"width":595.28,"height":841.89,"text":"08 / РЕГЛАМЕНТ ЧАТОВ Подозрение на 3-е лицо в ЛК. Пример сигнала: клиент мужского пола пишет в женском роде. Первая «опечатка» - можно уточнить, при повторе действуй по алгоритму. Сначала проверь, кто на связи Позвони на контактный номер. Спроси: «ИО/И клиента, верно?» / «Могу услышать ИО/И клиента?» и уточни, он ли пишет в чате. Ответил клиент и подтвердил, что это он ЛК не блокируй. Объясни, что звонок из соображений безопасности; 3-е лицо не должно находиться в ЛК без отдельного доступа/ЭЦП. Ответил не клиент / клиент не может подойти Заблокируй ЛК по процедуре и выясни, можно ли связаться с клиентом. Если нет - сообщи о блокировке и перейди к отложенной работе. Если да - свяжись с ЕИО, разблокируй, объясни причину и предложи ЭЦП/доступ пользователя. НДЗ или недопустимое время Заблокируй ЛК по процедуре, оставь в заметке причину и дату блокировки и создай таск по регламенту отложенной работы. Подозрение на мошенничество Отложенная работа Консультация 3-го лица Предыдущая Безопасность после контакта Содержание Регламент • S-сегмент 8","links":[{"x":0.070555,"y":0.448942,"w":0.85842,"h":0.084845,"page":29},{"x":0.095444,"y":0.551604,"w":0.306833,"h":0.035634,"page":53},{"x":0.415716,"y":0.551604,"w":0.221772,"h":0.035634,"page":26},{"x":0.650927,"y":0.551604,"w":0.253628,"h":0.035634,"page":51},{"x":0.166774,"y":0.607431,"w":0.173727,"h":0.035634,"page":8},{"x":0.35394,"y":0.607431,"w":0.292819,"h":0.035634,"page":10},{"x":0.660198,"y":0.607431,"w":0.173028,"h":0.035634,"page":2}]},{"n":10,"width":595.28,"height":841.89,"text":"09 / РЕГЛАМЕНТ ЧАТОВ Безопасность после контакта. Контактный телефон Проговори, что контактный телефон должен принадлежать клиенту. Если указан чужой/общий - смени. При категорическом отказе оставь телефон клиента в заметках на компании с пояснением. Исходящий звонок После представления обязательно уточни ИО/И клиента. Если возраст/пол не соответствует, а человек представляется клиентом - действуй по правилам подозрения на мошенничество. Это не отменяет процедуру ИД. Клиент стал жертвой мошенничества Передай информацию по соответствующей процедуре и рекомендуй обратиться в правоохранительные органы Предыдущая Содержание Регламент • S-сегмент 9","links":[{"x":0.070555,"y":0.227381,"w":0.85842,"h":0.098374,"page":53},{"x":0.319903,"y":0.429142,"w":0.173727,"h":0.035634,"page":9},{"x":0.507069,"y":0.429142,"w":0.173028,"h":0.035634,"page":2}]},{"n":11,"width":595.28,"height":841.89,"text":"10 / РЕГЛАМЕНТ ЧАТОВ Негатив: сначала отработай, потом продолжай процесс. Негативом считаем не только прямые жалобы: слова, пунктуация, CAPS, обвинения банка/сотрудника, сообщение о неработающем оборудовании или продукте. Не перенимай тон Цель - показать, что проблему услышали и готовы решать. Не воспринимай грубость как личную атаку. Найди причину За негативом чаще всего стоит нерешённая проблема или неудобство. Покажи участие и возьми ситуацию в работу. Ошибка не решается сразу Объясни простыми словами, почему нужно время, покажи контроль, извинись при необходимости и предложи альтернативы. Провокация / переход на личности Обозначь границу: готовы общаться по продуктам и услугам компании, но продолжай помогать по сути вопроса. Клиент просит старшего Позвони на линию помощи и передай клиента. Предыдущая Негатив продолжается Содержание Регламент • S-сегмент 10","links":[{"x":0.190633,"y":0.641592,"w":0.173727,"h":0.035634,"page":10},{"x":0.377799,"y":0.641592,"w":0.245101,"h":0.035634,"page":12},{"x":0.636339,"y":0.641592,"w":0.173028,"h":0.035634,"page":2}]},{"n":12,"width":595.28,"height":841.89,"text":"11 / РЕГЛАМЕНТ ЧАТОВ Если негатив продолжается. Предупреждения - только при оскорблениях Предупреждай о прекращении общения только если клиент оскорбляет, троллит, провоцирует или переходит на личности. Сначала обозначь границу и продолжай помогать по сути. При повторении - два предупреждения; на третий раз можно вежливо завершить диалог Не избавляйся от клиента Объясняй, что ситуацию можно решить; при необходимости предложи другой способ решения. Нужно перевести негативного клиента Если ты уже написал хотя бы одно сообщение, сначала отработай негатив и только потом переключай на другой скилл. Обещание предыдущего коллеги Если ранее согласовали нестандартное решение или льготу - выполни обещание. Если исключение разовое, предупреди клиента, что оно согласовано один раз. Предыдущая Содержание Регламент • S-сегмент 11","links":[{"x":0.319903,"y":0.524677,"w":0.173727,"h":0.035634,"page":11},{"x":0.507069,"y":0.524677,"w":0.173028,"h":0.035634,"page":2}]},{"n":13,"width":595.28,"height":841.89,"text":"12 / РЕГЛАМЕНТ ЧАТОВ РСВ по услугам и закрытию счета. Отказ от продукта / сервиса / дешёвый тариф Проведи работу с возражениями: выясни причину отказа и потребность. Если после РСВ клиенту действительно невыгодно - не настаивай; зафиксируй, при каких условиях продукт может стать выгоден. Клиент пропал после отказа Дальше нужен звонок. При НДЗ решение зависит от остатка расчётного периода и риска списания. Перейти к сценарию «РСВ → НДЗ» Там отдельно разведены продукт/тариф и закрытие счёта. Юридически важно Закрыть счёт без подтверждения фразой-распоряжением из процедуры «Закрыть счёт» нельзя. Распоряжение принимается только фразой из процедуры. К выбору ситуации Предыдущая Содержание Регламент • S-сегмент 12","links":[{"x":0.070555,"y":0.309387,"w":0.85842,"h":0.071316,"page":14},{"x":0.391254,"y":0.494055,"w":0.217491,"h":0.035634,"page":19},{"x":0.319903,"y":0.549882,"w":0.173727,"h":0.035634,"page":12},{"x":0.507069,"y":0.549882,"w":0.173028,"h":0.035634,"page":2}]},{"n":14,"width":595.28,"height":841.89,"text":"13 / РЕГЛАМЕНТ ЧАТОВ РСВ → клиент пропал → НДЗ. Срок в каждой ветке считай до конца расчётного периода. Отказ от продукта / переход на дешёвый тариф: 15 дней и больше до конца расчётного периода и плата не спишется Оставь таск согласно регламенту по отложенной работе. Отказ от продукта / тариф: меньше 15 дней до конца расчётного периода и/или КВ не успеют обработать, плата спишется Выполни запрос без подтверждения и напиши клиенту в чат. Таск не нужен. Закрытие счёта: 15 дней и больше до конца расчётного периода и плата не спишется Предупреди, что без ответа закрыть счёт нельзя; сообщи расчётную дату списания в чате/SMS (если чат не отправился) и попроси обратиться повторно. Закрытие счёта: меньше 15 дней до конца расчётного периода и/или таск не успеют обработать, плата спишется То же предупреждение + расчётная дата + повторное обращение. Дополнительно передай таск по регламенту отложенной работы. Предыдущая Содержание Регламент • S-сегмент 13","links":[{"x":0.070555,"y":0.135279,"w":0.85842,"h":0.087529,"page":30},{"x":0.070555,"y":0.427253,"w":0.85842,"h":0.101058,"page":31},{"x":0.319903,"y":0.549692,"w":0.173727,"h":0.035634,"page":13},{"x":0.507069,"y":0.549692,"w":0.173028,"h":0.035634,"page":2}]},{"n":15,"width":595.28,"height":841.89,"text":"14 / РЕГЛАМЕНТ ЧАТОВ Когда перезваниваем клиенту. Время звонка 9:00-21:00 по времени клиента. Если клиент сам просит позвонить сейчас, звони и вне этого интервала. Клиент сам попросил Звони даже вне интервала 9:00-21:00. Если выпал другой чат - завесь его; если звонок затягивается, перезавесь, потому что через 30 минут бездействия чат слетит. Обещал вернуться, но кейс забрала ЛП Сам не перезванивай. Сообщи коллеге, что клиента нужно проинформировать о решении в звонке. Звонок сорвался / клиента не слышно Скажи, что не слышно, и предупреди, что перезвонишь. Если клиент просит звонок - звони сразу; при другом активном чате сначала ответь там, затем звони. Просит перезвонить позже Не договаривайся о звонке на определённое время. Предложи клиенту самостоятельно позвонить на линию или написать в чат в удобное время. Если клиент обращается в чат и просит позвонить сейчас, звони сам. Предыдущая Не удалось дозвониться Содержание Регламент • S-сегмент 14","links":[{"x":0.185114,"y":0.593153,"w":0.173727,"h":0.035634,"page":14},{"x":0.372281,"y":0.593153,"w":0.256138,"h":0.035634,"page":16},{"x":0.641858,"y":0.593153,"w":0.173028,"h":0.035634,"page":2}]},{"n":16,"width":595.28,"height":841.89,"text":"15 / РЕГЛАМЕНТ ЧАТОВ НДЗ или звонок сорвался два раза. Вопрос в чате не озвучен Напиши: «К сожалению, не дозвонились, будем рады решить ваш вопрос». Вопрос озвучен и ответ уже есть Предоставь информацию в чате. Вопрос критичный Проверь критерии отложенной работы в связанном модуле ниже. Открыть «Отложенную работу» Там - два типа тасков, критерии выбора и порядок действий Открыть первоисточник Предыдущая Содержание Регламент • S-сегмент 15","links":[{"x":0.070555,"y":0.377864,"w":0.85842,"h":0.071316,"page":26},{"x":0.373046,"y":0.466997,"w":0.253907,"h":0.035634,"url":"https://twork.tinkoff.ru/workspace/knowledge-base/subsection/f028b3e4-13d1-4feb-ae18-2ed8a9e0f0e8/article/3cca9bd0-468c-43c1-8a62-38a026d08985"},{"x":0.319903,"y":0.522824,"w":0.173727,"h":0.035634,"page":15},{"x":0.507069,"y":0.522824,"w":0.173028,"h":0.035634,"page":2}]},{"n":17,"width":595.28,"height":841.89,"text":"16 / РЕГЛАМЕНТ ЧАТОВ Звонок при обращении третьего лица. Есть подозрение на мошенничество Используй алгоритм безопасности/подозрения на мошенничество. Вопрос 3-го лица касается финансовой информации Сообщи, что для решения вопроса сейчас свяжемся с ЕИО. 3-е лицо имеет доступ в ЛК Заблокируй доступ и перезвони ЕИО. При НДЗ - отложенная работа. Если 3-е лицо звонит с номера ЕИО, можно уточнить номер для связи с ЕИО. Права и доступы 3-го лица Подписант / пользователь ЛК / 3-е лицо хочет закрыть счёт Самостоятельно свяжись с ЕИО для РСВ и решения вопроса. Хочет отключить услугу / перейти на дешёвый тариф Свяжись с ЕИО, проведи РСВ, выяви потребность и закрой её. Процедура говорит «рекомендовать обратиться к ЕИО» Не ограничивайся рекомендацией - самостоятельно позвони ЕИО и реши вопрос. Предыдущая Нет связи с ЕИО Содержание Регламент • S-сегмент 16","links":[{"x":0.070555,"y":0.131846,"w":0.85842,"h":0.071316,"page":53},{"x":0.097433,"y":0.383079,"w":0.26634,"h":0.034446,"page":51},{"x":0.070555,"y":0.43653,"w":0.85842,"h":0.071316,"page":13},{"x":0.070555,"y":0.518536,"w":0.85842,"h":0.071316,"page":13},{"x":0.215506,"y":0.693238,"w":0.173727,"h":0.035634,"page":16},{"x":0.402672,"y":0.693238,"w":0.195355,"h":0.035634,"page":18},{"x":0.611466,"y":0.693238,"w":0.173028,"h":0.035634,"page":2}]},{"n":18,"width":595.28,"height":841.89,"text":"17 / РЕГЛАМЕНТ ЧАТОВ Не получилось связаться с ЕИО. Раннее / позднее время Открой «SME. Сервис. Создать перезвон клиенту» и оставь таск. До ЕИО НДЗ Вернись к 3-му лицу и сообщи, что связаться не получилось. Напиши ЕИО в чат, с каким вопросом обращалось 3-е лицо. Оставь таск через «SME. Сервис. Создать перезвон клиенту», подробно описав ситуацию. Перейти к «Перезвону клиенту» Если до ЕИО НДЗ, проверь критерии таска и вернись к коммуникации по сценарию. Предыдущая Содержание Регламент • S-сегмент 17","links":[{"x":0.070555,"y":0.309387,"w":0.85842,"h":0.071316,"page":29},{"x":0.319903,"y":0.402083,"w":0.173727,"h":0.035634,"page":17},{"x":0.507069,"y":0.402083,"w":0.173028,"h":0.035634,"page":2}]},{"n":19,"width":595.28,"height":841.89,"text":"18 / РЕГЛАМЕНТ ЧАТОВ Клиент перестал отвечать: 1,5–3 минуты. Сам факт молчания не означает звонок. Сначала определи контекст. Нужен РСВ / риск финансовых потерь Например: закрытие счёта, отключение услуги, переход на более дешёвый тариф. ОБЯЗАТЕЛЬНО ПОЗВОНИ Встреча / изменение встречи / ситуация приведёт к встрече ПОЗВОНИ Клиент пропал во время любой ИД в чате ИД / ВЗ / буквенный код - ПОЗВОНИ ПО ТЕЛЕФОНУ. Процедура требует связаться с клиентом / ЕИО ПОЗВОНИ Нельзя завершить подключение / отказ без ответа Если можешь завершить процесс сам и данных достаточно - звонок не нужен. Нет селфсервиса / нужно согласие клиента - ПОЗВОНИ. Примеры подключения - стр. 21 Клиент спрашивает номер телефона банка Дай номер + предложи свой звонок; звони только при согласии Все остальные случаи Сообщение ожидания + предложение попросить звонок → закрыть чат Примеры остальных случаев - стр. 22 Критерии отложенной работы Предыдущая Содержание Регламент • S-сегмент 18","links":[{"x":0.070555,"y":0.135279,"w":0.85842,"h":0.091188,"page":13},{"x":0.070555,"y":0.237157,"w":0.85842,"h":0.072907,"page":20},{"x":0.070555,"y":0.320755,"w":0.85842,"h":0.072907,"page":21},{"x":0.070555,"y":0.404352,"w":0.85842,"h":0.072907,"page":21},{"x":0.070555,"y":0.48795,"w":0.85842,"h":0.109468,"page":22},{"x":0.070555,"y":0.608108,"w":0.85842,"h":0.071316,"page":23},{"x":0.070555,"y":0.690114,"w":0.85842,"h":0.089596,"page":23},{"x":0.351611,"y":0.797527,"w":0.296779,"h":0.035634,"page":26},{"x":0.319903,"y":0.853354,"w":0.173727,"h":0.035634,"page":18},{"x":0.507069,"y":0.853354,"w":0.173028,"h":0.035634,"page":2}]},{"n":20,"width":595.28,"height":841.89,"text":"19 / РЕГЛАМЕНТ ЧАТОВ Клиент пропал в сценарии встречи. Не может / отказывается назначать встречу по ссылке Предложи назначить встречу в чате или перезвонить по телефону. Изменение встречи или ситуация приведёт к назначению Если клиент перестал отвечать - позвони, чтобы переназначить встречу / прояснить данные. Это важно, потому что клиент может вернуться позже или на следующий день. Примеры Перевыпуск карты → нужна встреча на доставку. Бумажная справка → встреча. Электронная справка, которую клиент может заказать сам → дай инструкцию и закрой чат; звонок не нужен. При НДЗ Напиши: «Не получилось до вас дозвониться по назначению встречи. Когда вам удобно её провести?» и оставь таск «SME. Сервис. Создать перезвон клиенту» с тематикой «Коммуникация с клиентом прервалась». К выбору ситуации Предыдущая Содержание Регламент • S-сегмент 19","links":[{"x":0.070555,"y":0.404922,"w":0.85842,"h":0.098374,"page":29},{"x":0.391254,"y":0.521113,"w":0.217491,"h":0.035634,"page":19},{"x":0.319903,"y":0.57694,"w":0.173727,"h":0.035634,"page":19},{"x":0.507069,"y":0.57694,"w":0.173028,"h":0.035634,"page":2}]},{"n":21,"width":595.28,"height":841.89,"text":"20 / РЕГЛАМЕНТ ЧАТОВ НДЗ: ИД / ВЗ / код или обязательный звонок процедуры. Если клиент пропал во время любой ИД в чате, сначала позвони ему по телефону. Ниже - действия при НДЗ. Нужна ИД / ВЗ / буквенный код Процедура просит связаться с клиентом / ЕИО При НДЗ напиши: «Имя, хочу помочь вам в решении вопроса и ожидаю вашего ответа в чате. Для решения вопроса нужно связаться с вами по звонку» и закрой чат. К выбору ситуации Предыдущая Содержание Регламент • S-сегмент 20 При НДЗ сначала обязательно пройди процедуру ДО КОНЦА. Если клиент не подключился, отказался или возникла другая ситуация, выполни соответствующие шаги процедуры. Не закрывай её через крестик. Затем напиши: «Имя, для решения вопроса требуется Идентификация/Видеозвонок/буквенный код. Хочу помочь вам в решении вопроса и ожидаю вашего ответа в чате» и закрой чат.","links":[{"x":0.391254,"y":0.396762,"w":0.217491,"h":0.035634,"page":19},{"x":0.319903,"y":0.452589,"w":0.173727,"h":0.035634,"page":20},{"x":0.507069,"y":0.452589,"w":0.173028,"h":0.035634,"page":2}]},{"n":22,"width":595.28,"height":841.89,"text":"21 / РЕГЛАМЕНТ ЧАТОВ Клиент пропал при подключении / отказе. Можешь завершить сам Если процесс оформления заявки можно завершить самостоятельно и информации достаточно - звонок не нужен. «Как подключить?» + есть селфсервис Расскажи условия, дай инструкцию на подключение в ЛК/МП. Звонить не нужно. «Как подключить?» + селфсервиса нет Расскажи условия, дай инструкцию и спроси, хочет ли подключить сейчас. Нет ответа - ЗВОНИ Клиент говорит «ПОДКЛЮЧИТЕ» Расскажи все условия, дай инструкцию на подключение. Если ответа нет - ЗВОНИ. После звонка НДЗ / звонок сорвался два раза? Перейти к действиям после НДЗ. К выбору ситуации Предыдущая Содержание Регламент • S-сегмент 21","links":[{"x":0.070555,"y":0.473399,"w":0.85842,"h":0.071316,"page":16},{"x":0.391254,"y":0.562532,"w":0.217491,"h":0.035634,"page":19},{"x":0.319903,"y":0.618359,"w":0.173727,"h":0.035634,"page":21},{"x":0.507069,"y":0.618359,"w":0.173028,"h":0.035634,"page":2}]},{"n":23,"width":595.28,"height":841.89,"text":"22 / РЕГЛАМЕНТ ЧАТОВ Номер телефона банка и остальные случаи. Клиент просит номер телефона Напиши номер и предложи самостоятельно связаться с клиентом. Если согласен - позвони. Если ответа нет - закрой чат. Все остальные случаи Напиши: «Имя, хочу помочь вам в решении вопроса и ожидаю вашего ответа в чате. Если нужно связаться с вами по звонку, напишите в ответном сообщении» и закрой чат. Вопрос решён в звонке В этом же чате зафиксируй, о чём договорились, либо напиши «Вопрос решен в рамках звонка» и сразу закрой чат. Зачем перезваниваем Решить вопрос здесь и сейчас, не заставлять клиента повторять контекст, не создавать повторные обращения и дополнительную нагрузку на линию. К выбору ситуации Предыдущая Содержание Регламент • S-сегмент 22","links":[{"x":0.391254,"y":0.521113,"w":0.217491,"h":0.035634,"page":19},{"x":0.319903,"y":0.57694,"w":0.173727,"h":0.035634,"page":22},{"x":0.507069,"y":0.57694,"w":0.173028,"h":0.035634,"page":2}]},{"n":24,"width":595.28,"height":841.89,"text":"23 / РЕГЛАМЕНТ ЧАТОВ Закрытие диалога. Закрыть с таймером Без ответа клиента продолжить нельзя И звонок не требуется. Нажми «Закрыть с таймером» - чат закроется автоматически в течение 1 секунды. Закрыть сразу Логическое окончание консультации / понятно, что клиент получил ответ. Попрощайся и закрой сразу. Не затягивай диалог - это задерживает другие обращения и увеличивает нагрузку. Перед закрытием Все вопросы решены; обращения переданы/эскалированы; информация записана; претензии урегулированы; каждая просьба и возражение отработаны. Не держи завершённый чат Если чат завершён или без ответа продолжить нельзя - закрывай сразу. Исключение: сценарии, где нужен звонок клиенту. Одно касание и завершение Предыдущая Конец рабочего дня Содержание Регламент • S-сегмент 23","links":[{"x":0.358851,"y":0.521113,"w":0.282298,"h":0.035634,"page":48},{"x":0.201374,"y":0.57694,"w":0.173727,"h":0.035634,"page":23},{"x":0.38854,"y":0.57694,"w":0.22362,"h":0.035634,"page":25},{"x":0.625599,"y":0.57694,"w":0.173028,"h":0.035634,"page":2}]},{"n":25,"width":595.28,"height":841.89,"text":"24 / РЕГЛАМЕНТ ЧАТОВ Конец рабочего дня. После окончания рабочего времени Доработай все оставшиеся коммуникации. Если срочно нужно закончить и быстро завершить нельзя - согласуй с РГ передачу кейсов на ЛП. Предыдущая Содержание Регламент • S-сегмент 24","links":[{"x":0.319903,"y":0.238071,"w":0.173727,"h":0.035634,"page":24},{"x":0.507069,"y":0.238071,"w":0.173028,"h":0.035634,"page":2}]},{"n":26,"width":595.28,"height":841.89,"text":"S-СЕГМЕНТ / РЕГЛАМЕНТ Отложенная работа. Выбери ситуацию - раздел откроется по нажатию. Перезвон или отложенная работа? Как действовать в зависимости от ситуации Выполнение отложенной работы Действие после наступления события Перезвон клиенту Возвращение к коммуникации Клиент пропал + НДЗ Критерии процедуры «Перезвон клиенту» Закрытие счёта после НДЗ Проверь срок и риск списания Передача кейса коллеге Контекст для следующего сотрудника ЦВЕТОВАЯ ЛОГИКА Выполнение Перезвон Проверить условие К выбору ситуации Содержание Регламент • S-сегмент 25","links":[{"x":0.070555,"y":0.135279,"w":0.85842,"h":0.071316,"page":27},{"x":0.070555,"y":0.217285,"w":0.85842,"h":0.071316,"page":28},{"x":0.070555,"y":0.299291,"w":0.85842,"h":0.071316,"page":29},{"x":0.070555,"y":0.381297,"w":0.85842,"h":0.071316,"page":30},{"x":0.070555,"y":0.463303,"w":0.85842,"h":0.071316,"page":31},{"x":0.070555,"y":0.545309,"w":0.85842,"h":0.071316,"page":32},{"x":0.298021,"y":0.681144,"w":0.217491,"h":0.035634,"page":19},{"x":0.528951,"y":0.681144,"w":0.173028,"h":0.035634,"page":2}]},{"n":27,"width":595.28,"height":841.89,"text":"26 / ОТЛОЖЕННАЯ РАБОТА В отложенной работе бывает два типа тасков. Какой нужен - зависит от ситуации и результата по кейсу. Выполнение отложенной работы Работа после работы Нужно выполнить определённое действие после наступления события. Выполнение отложенной работы Перезвон клиенту Вернуться к коммуникации Нужно связаться с клиентом или контактным лицом позже. Перезвон клиенту Быстрая проверка Действие должно произойти после события? → «Выполнение отложенной работы» Нужно вернуться к клиенту / контактному лицу? → «Перезвон клиенту» Дальше проверь критерии выбранного таска. Выполнение отложенной работы Перезвон клиенту К карте модуля Содержание Регламент • S-сегмент 26","links":[{"x":0.097433,"y":0.272256,"w":0.30993,"h":0.034446,"page":28},{"x":0.537562,"y":0.272256,"w":0.203144,"h":0.034446,"page":29},{"x":0.097433,"y":0.43596,"w":0.30993,"h":0.034446,"page":28},{"x":0.420802,"y":0.43596,"w":0.203144,"h":0.034446,"page":29},{"x":0.311136,"y":0.500101,"w":0.191262,"h":0.035634,"page":26},{"x":0.515837,"y":0.500101,"w":0.173028,"h":0.035634,"page":2}]},{"n":28,"width":595.28,"height":841.89,"text":"27 / ОТЛОЖЕННАЯ РАБОТА Когда выбрать «Выполнение отложенной работы». Используй эту процедуру, когда после наступления события нужно выполнить конкретное действие. Закрытие счёта Клиент просит закрыть счёт после события — например, после того как у него заберут терминал ТЭ Действие после жалобы После рассмотрения жалобы клиента необходимо выполнить дополнительное действие. Подписка или тариф Отключить подписку или изменить тариф в конце расчётного периода по просьбе клиента. Проверка погашения кредита Клиент внёс оплату, но задолженность ещё не погасилась. Позже может потребоваться оспаривание комиссии / штрафов. Логика Если задача - не связаться с клиентом, а выполнить действие после события, выбирай этот тип отложенной работы. Как описать и передать таск К выбору таска Содержание Регламент • S-сегмент 27","links":[{"x":0.097433,"y":0.595529,"w":0.278569,"h":0.034446,"page":32},{"x":0.311714,"y":0.65967,"w":0.190105,"h":0.035634,"page":27},{"x":0.515258,"y":0.65967,"w":0.173028,"h":0.035634,"page":2}]},{"n":29,"width":595.28,"height":841.89,"text":"28 / ОТЛОЖЕННАЯ РАБОТА Когда выбрать «Перезвон клиенту». Используй эту процедуру, когда кейс требует вернуться к коммуникации. Клиент просит перезвонить позже Не договаривайся о звонке на определённое время. Предложи клиенту самостоятельно позвонить на линию или написать в чат в удобное время. Если клиент обращается в чат и просит позвонить сейчас, звони сам. Сама по себе просьба позвонить позже не основание для таска «Перезвон клиенту». Остальные основания проверь ниже. Нужно связаться с контактным лицом До нужного контактного лица НДЗ; похожей коммуникации в «Событиях» / «Что с обращением» нет, но контакт нужен для решения вопроса. Обратилось 3-е лицо Нужно связаться с директором либо 3-е лицо находится в ЛК директора, а время для звонка ЕИО раннее / позднее Клиент пропал При повторной попытке связи НДЗ и вопрос клиента соответствует хотя бы одному из критериев на следующей странице. Важно Для сценария «клиент пропал» одного НДЗ недостаточно - проверь критерии кейса. К выбору таска Содержание Регламент • S-сегмент 28","links":[{"x":0.070555,"y":0.135279,"w":0.85842,"h":0.116654,"page":15},{"x":0.070555,"y":0.262623,"w":0.85842,"h":0.084845,"page":32},{"x":0.070555,"y":0.358158,"w":0.85842,"h":0.084845,"page":32},{"x":0.070555,"y":0.453693,"w":0.85842,"h":0.084845,"page":30},{"x":0.311714,"y":0.641925,"w":0.190105,"h":0.035634,"page":27},{"x":0.515258,"y":0.641925,"w":0.173028,"h":0.035634,"page":2}]},{"n":30,"width":595.28,"height":841.89,"text":"29 / ОТЛОЖЕННАЯ РАБОТА Клиент пропал + НДЗ: когда оставить «Перезвон». Если клиент пропал и при повторной попытке связи до него НДЗ, таск подходит только при наличии одного из условий ниже. Сильный негатив Клиент открыто и сильно проявляет негатив. Исключение: не заводи таск, если негатив связан с тем, что мы и так слишком часто связываемся. Финансовые потери Если вопрос не решить в кратчайшие сроки, клиент точно понесёт финансовые потери. Платная услуга Коммуникация касалась отключения или подключения платной услуги, и процесс не был доведён до конца. Перевыпуск карты Клиент обратился за перевыпуском карты, но дополнительных тасков в процессе решения вопроса создано не было. Закрытие счёта Клиент хотел закрыть счёт, пропал, а согласие так и не было получено. Для этого кейса есть отдельная развилка. Следующий шаг Если кейс - закрытие счёта, не оставляй таск автоматически. Проверь срок до конца расчётного периода. К выбору таска Содержание Регламент • S-сегмент 29","links":[{"x":0.070555,"y":0.180285,"w":0.85842,"h":0.084845,"page":32},{"x":0.070555,"y":0.27582,"w":0.85842,"h":0.071316,"page":32},{"x":0.070555,"y":0.357826,"w":0.85842,"h":0.071316,"page":32},{"x":0.070555,"y":0.439832,"w":0.85842,"h":0.084845,"page":32},{"x":0.070555,"y":0.535367,"w":0.85842,"h":0.084845,"page":31},{"x":0.070555,"y":0.630902,"w":0.85842,"h":0.071316,"page":31},{"x":0.311714,"y":0.723598,"w":0.190105,"h":0.035634,"page":27},{"x":0.515258,"y":0.723598,"w":0.173028,"h":0.035634,"page":2}]},{"n":31,"width":595.28,"height":841.89,"text":"30 / ОТЛОЖЕННАЯ РАБОТА Закрытие счета после НДЗ: таск или без таска? Клиент хотел закрыть счёт, пропал, согласие не получено. Действие зависит от срока и риска списания платы. 15 дней и больше до конца расчётного периода И плата не спишется в ближайшее время. Предупреди клиента, что без его ответа закрыть счёт не можем. Сообщи расчётную дату списания платы в чате / SMS, если чат отправить не получилось. Добавь, что клиенту нужно обратиться повторно. ТАСК НЕ НУЖЕН Меньше 15 дней до конца расчётного периода / есть риск списания Или есть понимание, что таск не успеют обработать до конца расчётного периода. Предупреди клиента, что без его ответа закрыть счёт не можем. Сообщи расчётную дату списания платы в чате / SMS, если чат отправить не получилось. Добавь, что клиенту нужно обратиться повторно. НЕ ЗАБУДЬ ОСТАВИТЬ ТАСК Проверь перед завершением Срок → риск списания → сообщение клиенту → нужен ли таск. К выбору таска Содержание Регламент • S-сегмент 30","links":[{"x":0.070555,"y":0.300443,"w":0.85842,"h":0.122997,"page":32},{"x":0.311714,"y":0.526827,"w":0.190105,"h":0.035634,"page":27},{"x":0.515258,"y":0.526827,"w":0.173028,"h":0.035634,"page":2}]},{"n":32,"width":595.28,"height":841.89,"text":"31 / ОТЛОЖЕННАЯ РАБОТА Передай кейс так, чтобы коллеге не пришлось восстанавливать контекст. Описание таска - часть решения кейса. Следующий сотрудник должен понять ситуацию без повторного изучения всей истории. В ОПИСАНИИ ДОЛЖНО БЫТЬ ПОНЯТНО • Что произошло с клиентом. • Что уже сделано. • С кем и когда пытались связаться. • Какой результат нужен после события / при перезвоне. • Какой контекст важно знать следующему сотруднику. Финальная проверка 1. Выбран правильный тип таска. 2. Кейс соответствует его критериям. 3. Для закрытия счёта проверена развилка по сроку и списанию. Сначала ситуация → затем решение → затем действие. К выбору таска Содержание Регламент • S-сегмент 31","links":[{"x":0.311714,"y":0.473447,"w":0.190105,"h":0.035634,"page":27},{"x":0.515258,"y":0.473447,"w":0.173028,"h":0.035634,"page":2}]},{"n":33,"width":595.28,"height":841.89,"text":"01 / ВСТРОЕННЫЕ ИНСТРУКЦИИ Конфиденциальная информация. Что относится к конфиденциальной информации Персональные данные • банковская тайна • коммерческая тайна • тайна связи • другая информация, отнесённая к конфиденциальной. Что относится к критичным данным Данные - это любая информация о компании или клиенте. Например: стоимость разработки приложения, итоги исследований, остаток на счёте клиента. Критичные данные нельзя передавать или разглашать. • Персональные данные сотрудников и клиентов компании. • Карточные данные. • Платёжная информация. • Тайна связи и аутентификационные данные. К персональным данным относится • ФИО. • Информация о месте прописки, проживании. • Паспортные данные (серия, номер, дата и место выдачи и т. п.). • Водительское удостоверение, СНИЛС, ИНН и другие документы физического лица. • Сведения об образовании. • Контактные данные (телефон, адрес электронной почты). • Сведения о работе. • Другие данные, которые позволяют идентифицировать человека. Работа в письмах со смежными подразделениями 1. В письмах по шаблонам ОПБ допустимо указывать ФИО клиента, но недопустимо писать ФИО и ПД/ДР клиента. 2. Не пересылай документы клиента. 3. Если нужно отправить какие-либо данные, обратись к руководителю. 4. Не забывай, что владельцами персональных данных могут быть как сотрудники и клиенты, так и третьи лица, которые предоставили нам согласие на их обработку. Не допускай их попадания в чужие руки. 5. За утечками персональных данных следит Роскомнадзор и Центральный Банк России. 6. Передачу критичных или персональных данных согласовывай с руководителем. 7. Не храни у себя никакие персональные данные клиентов или сотрудников. 8. Удаляй локальные копии с ПК и Share, как только передашь данные. 9. Если тебе передают информацию не так, как положено, это не твоя ответственность. 10. Скрины из открытых источников можно сохранять. 11. В конце каждого рабочего дня чисти папку. Скриншоты клиенту • Отправляй только если это разрешает процедура: после ИД, из ЛК/МП клиента и только с его данными. • Не показывай данные вне роли клиента и не создавай впечатление, что сотрудник может входить в его ЛК. К сценарию ИД Содержание Регламент • S-сегмент 32","links":[{"x":0.310829,"y":0.89248,"w":0.191876,"h":0.035634,"page":7},{"x":0.516143,"y":0.89248,"w":0.173028,"h":0.035634,"page":2}]},{"n":34,"width":595.28,"height":841.89,"text":"02 / ВСТРОЕННЫЕ ИНСТРУКЦИИ Видеозвонок. Быстрый старт и карта раздела. Как начинается видеозвонок Видеозвонок - способ аутентификации клиента по изображению его лица. Если процедура предлагает ВЗ, перейди по ссылке из процедуры. Все поля в интерфейсе заполнятся автоматически. Если возникла техническая сложность, открой FAQ кнопкой «Возникла ошибка». Она доступна при переходе в интерфейс, во время ВЗ и на этапе результата. Важно Разделы модуля FAQ клиента Признаки дипфейка Действия при дипфейке Особенности работы Видеозвонок в чате Ошибки и обратная связь Отказ / результат Клиент пропал: ИД и НДЗ К сценарию ИД Содержание Регламент • S-сегмент 33 Процедуру ВЗ всегда проходи ДО КОНЦА, даже если клиенту неудобно, он может позже, отказывается, прерывает звонок или говорит, что перезвонит. Если процедура запрашивает ВЗ, а клиент не отвечает в чате, в том числе на этапе предложения ВЗ, позвони ему по телефону. При НДЗ сначала пройди процедуру до конца. Затем напиши: «Имя, для решения вопроса требуется Идентификация/Видеозвонок/буквенный код. Хочу помочь вам в решении вопроса и ожидаю вашего ответа в чате» и закрой чат. Если клиент не подключился, отказался или возникла другая ситуация, выбирай соответствующие шаги процедуры и выполняй их до завершения. Не закрывай процедуру через крестик.","links":[{"x":0.162064,"y":0.613014,"w":0.173028,"h":0.035634,"page":35},{"x":0.348531,"y":0.613014,"w":0.222707,"h":0.035634,"page":37},{"x":0.584677,"y":0.613014,"w":0.253259,"h":0.035634,"page":38},{"x":0.129643,"y":0.65815,"w":0.230557,"h":0.035634,"page":39},{"x":0.373639,"y":0.65815,"w":0.220719,"h":0.035634,"page":40},{"x":0.607798,"y":0.65815,"w":0.262559,"h":0.035634,"page":41},{"x":0.258292,"y":0.703287,"w":0.205367,"h":0.035634,"page":42},{"x":0.477098,"y":0.703287,"w":0.264609,"h":0.035634,"page":21},{"x":0.310829,"y":0.759113,"w":0.191876,"h":0.035634,"page":7},{"x":0.516143,"y":0.759113,"w":0.173028,"h":0.035634,"page":2}]},{"n":35,"width":595.28,"height":841.89,"text":"02 / ВИДЕОЗВОНОК / 02 FAQ клиента. Основные вопросы о том, зачем нужен ВЗ и что видит сотрудник. Почему вы не задаете вопросы, а предлагаете видеозвонок? Способ подтверждения личности выбирают внутренние системы, а не сотрудник поддержки. Выбрать способ по пожеланию клиента нельзя. Вы будете меня видеть? Да. Нужно видеть клиента примерно 15-20 секунд, чтобы подтвердить, что обращается действительно он. Буду ли я вас видеть? Нет. Клиент сотрудника не видит, камеру включить нельзя. Как вы поймете, что на ВЗ клиент, а не кто-то еще? Изображение с видеозвонка сравнивается с фотографиями со встреч с клиентом. FAQ: данные и безопасность К модулю ВЗ Содержание Регламент • S-сегмент 34","links":[{"x":0.356693,"y":0.483959,"w":0.286613,"h":0.035634,"page":36},{"x":0.320199,"y":0.539785,"w":0.173134,"h":0.035634,"page":34},{"x":0.506773,"y":0.539785,"w":0.173028,"h":0.035634,"page":2}]},{"n":36,"width":595.28,"height":841.89,"text":"02 / ВИДЕОЗВОНОК / 03 FAQ клиента: данные и безопасность. Что отвечать про биометрию, записи и безопасность сервиса. Почему вы используете мою биометрию? Я не давал согласия. Во время ВЗ решение фиксирует сотрудник, биометрия не используется. Биометрические данные - это цифровой слепок с фото или голоса; для ВЗ такой слепок не создается. Вы не имеете права хранить мои фото и записи звонков. Фото со встречи и записи звонков - персональные, а не биометрические данные. Фото нужно для подтверждения личности, записи звонков хранятся по закону. Без персональных данных Банк не имеет права обслуживать клиента. Согласие на их обработку дается при оформлении продукта; обработка прекращается после расторжения всех договоров с Банком. Это безопасно? Используется шифрование? Есть регистрация? Да. Подключение к ВЗ безопасно, используются актуальные стандарты и современные методы шифрования. Т-Видеозвонки зарегистрированы в официальном реестре российского ПО. С какого устройства можно принять видеозвонок? Подойдет телефон с камерой и выходом в Интернет. FAQ также доступен в процедуре во время ВЗ. Признаки дипфейка Реестр российского ПО К модулю ВЗ Содержание Регламент • S-сегмент 35","links":[{"x":0.25687,"y":0.538075,"w":0.222707,"h":0.035634,"page":37},{"x":0.493016,"y":0.538075,"w":0.250114,"h":0.035634,"url":"https://reestr.digital.gov.ru/reestr/3347789/"},{"x":0.320199,"y":0.593902,"w":0.173134,"h":0.035634,"page":34},{"x":0.506773,"y":0.593902,"w":0.173028,"h":0.035634,"page":2}]},{"n":37,"width":595.28,"height":841.89,"text":"02 / ВИДЕОЗВОНОК / 04 Подозрение на дипфейк. Признаки, на которые обязательно обращаем внимание. Что такое дипфейк Дипфейк - подмена изображения лица алгоритмами машинного обучения. Подделка может выдавать себя за клиента и иметь заметные артефакты или небольшие отклонения. Визуальные артефакты • неестественная текстура кожи: слишком гладкая, маслянистая, без пор или морщин • «дыры» или искажения там, где волосы или очки закрывают лицо • разное качество участков видео: лицо чёткое, фон хуже • разный оттенок кожи лица, шеи и рук • нечёткие границы лица, особенно волосы, уши, шея Речь и мимика • губы не синхронизированы со звуком • мимика не соответствует эмоциям в речи • «безжизненный» взгляд, редкое моргание, неподвижные зрачки • резкие неестественные движения бровей, губ, щёк Освещение и фон • резкие изменения яркости или теней • свет на лице и фоне направлен по-разному • фон статичный, заливной или неестественный • устройство клиента неподвижно - возможный признак записи Пропорции и масштаб • лицо растянуто, сжато или искажено относительно фото со встречи • не совпадают пропорции лица: например, лоб уже, глаза ближе друг к другу Действия при подозрении К модулю ВЗ Содержание Регламент • S-сегмент 36","links":[{"x":0.365837,"y":0.749231,"w":0.268325,"h":0.035634,"page":38},{"x":0.320199,"y":0.805058,"w":0.173134,"h":0.035634,"page":34},{"x":0.506773,"y":0.805058,"w":0.173028,"h":0.035634,"page":2}]},{"n":38,"width":595.28,"height":841.89,"text":"02 / ВИДЕОЗВОНОК / 05 Если есть подозрение на дипфейк. Проверка, решение в процедуре и примеры. 1. Попроси выполнить простые действия Повернуть голову влево/вправо; моргнуть несколько раз; снять очки или головной убор, если они надеты; подвинуть камеру ближе. Не настаивай, если действие неуместно или противоречит религии клиента. 2. Наблюдай за реакцией Неестественные движения, «рассыпание» лица или новые артефакты - повод для подозрения. Отказ от простых действий без объяснения тоже важный сигнал. 3. Прими решение Выбирай «Подозрение на дипфейк» в процедуре аутентификации при любых сомнениях или признаках. Так подозрение на мошенничество уйдёт в нужный отдел. Также выбирай этот результат, если видишь съёмку устройства или вместо клиента показаны скриншот, запись, фото и т. п. Примеры реальных дипфейков • Камуфляжная кепка с флагом России у «клиента». • Видео не на полный экран, остальное пространство залито цветом. • Неподвижный или однотонный фон. Особенно смотри на границы лица, резкую мимику, моргание, движения бровей/губ и рассинхрон речи с губами. Открыть примеры видео Особенности работы К модулю ВЗ Содержание Регламент • S-сегмент 37","links":[{"x":0.097433,"y":0.555631,"w":0.250527,"h":0.034446,"url":"https://twork.tinkoff.ru/workspace/knowledge-base/subsection/b309b3f8-3393-424c-8fd5-c7ad79f2f8d8/article/494e9f6c-4f1d-4dea-aacc-7e315df1611e"},{"x":0.384721,"y":0.616209,"w":0.230557,"h":0.035634,"page":39},{"x":0.320199,"y":0.672036,"w":0.173134,"h":0.035634,"page":34},{"x":0.506773,"y":0.672036,"w":0.173028,"h":0.035634,"page":2}]},{"n":39,"width":595.28,"height":841.89,"text":"02 / ВИДЕОЗВОНОК / 06 Особенности работы. Что делать во время ВЗ и после подтверждения личности. Процедуру обязательно пройти до конца Можно консультировать прямо на ВЗ Если у клиента появились другие вопросы, можно ответить, но только когда не нужен перевод в другое подразделение. Сорвался звонок / клиенту неудобно Перезвони через процедуру «Перезвонить в рамках видеозвонка». Используй именно её, а не кнопку «Перезвонить» в TCRM. Если личность уже подтверждена, но что-то пошло не так - правило то же. После ВЗ нужен перевод другому сотруднику / ассисту Используй «Перезвонить в рамках видеозвонка», вернись к аудио-звонку и затем переведи клиента обычным способом. Снимаем необработанное подозрение на мошенничество Процедура может предложить убрать подозрение через ВЗ без повторной передачи в ОУИ. Спроси, обращался ли клиент раньше и по какому вопросу; сверь это с записью сотрудника; предложи ВЗ. Используй «Подозрение на мошенничество» или другую процедуру, которая запрашивает аутентификацию. Видеозвонок в чате Не подключился / отказ / результат Клиент пропал: ИД и НДЗ К модулю ВЗ Содержание Регламент • S-сегмент 38 Процедуру ВЗ всегда проходи ДО КОНЦА, даже если клиенту неудобно, он может позже, отказывается, прерывает звонок или говорит, что перезвонит. Если процедура запрашивает ВЗ, а клиент не отвечает в чате, в том числе на этапе предложения ВЗ, позвони ему по телефону. При НДЗ сначала пройди процедуру до конца. Затем напиши: «Имя, для решения вопроса требуется Идентификация/Видеозвонок/буквенный код. Хочу помочь вам в решении вопроса и ожидаю вашего ответа в чате» и закрой чат. Если клиент не подключился, отказался или возникла другая ситуация, выбирай соответствующие шаги процедуры и выполняй их до завершения. Не закрывай процедуру через крестик.","links":[{"x":0.075919,"y":0.742567,"w":0.220719,"h":0.035634,"page":40},{"x":0.310077,"y":0.742567,"w":0.335955,"h":0.035634,"page":42},{"x":0.659472,"y":0.742567,"w":0.264609,"h":0.035634,"page":21},{"x":0.320199,"y":0.798394,"w":0.173134,"h":0.035634,"page":34},{"x":0.506773,"y":0.798394,"w":0.173028,"h":0.035634,"page":2}]},{"n":40,"width":595.28,"height":841.89,"text":"02 / ВИДЕОЗВОНОК / 07 Видеозвонок в чате. Как пригласить клиента и что делать, если он не подключается. Как связаться с клиентом ВЗ в чате проходит так же, как и на звонках. Основные способы: позвонить через приложение (при сбое отправится СМС) или отправить ссылку в чат. Ссылку также можно отправить по СМС или Email. Как отправить ссылку в чат 1. Выбери способ приглашения «Чат» и нажми «Скопировать приглашение». 2. Вставь ссылку в поле ввода процедуры: Ctrl+V или «Вставить». 3. Отправь клиенту текст из процедуры. 4. После перехода по ссылке и выдачи доступов ВЗ начнётся автоматически. Если клиент не подключается / молчит Ошибки и обратная связь Клиент пропал: ИД и НДЗ К модулю ВЗ Содержание Регламент • S-сегмент 39 Если ВЗ не получается, процедура предложит повторить попытку, перезвонить или передать подозрение на мошенничество. Если клиент не подключается, отметь это в процедуре и выполни её дальнейшие действия. Время ожидания - по обычному регламенту. Если процедура запрашивает ВЗ, а клиент не отвечает в чате, в том числе на этапе предложения ВЗ, позвони ему по телефону. При НДЗ сначала пройди процедуру до конца. Затем напиши: «Имя, для решения вопроса требуется Идентификация/Видеозвонок/буквенный код. Хочу помочь вам в решении вопроса и ожидаю вашего ответа в чате» и закрой чат. Если клиент не подключился, отказался или возникла другая ситуация, выбирай соответствующие шаги процедуры и выполняй их до завершения. Не закрывай процедуру через крестик. Если клиент пропал во время другого типа ИД в чате, также позвони ему по телефону. При НДЗ пройди процедуру до конца, затем действуй по сценарию «НДЗ: ИД / ВЗ / код».","links":[{"x":0.229696,"y":0.729668,"w":0.262559,"h":0.035634,"page":41},{"x":0.505695,"y":0.729668,"w":0.264609,"h":0.035634,"page":21},{"x":0.320199,"y":0.785495,"w":0.173134,"h":0.035634,"page":34},{"x":0.506773,"y":0.785495,"w":0.173028,"h":0.035634,"page":2}]},{"n":41,"width":595.28,"height":841.89,"text":"02 / ВИДЕОЗВОНОК / 08 Ошибки и обратная связь. Внутренний FAQ для сотрудника. Могут ли сотрудники чата звонить по видео? Да. Пока прямой ВЗ в чате доступен не всем, процедура иногда сначала просит позвонить клиенту, а затем подключиться по видео. Проблема с процедурой Если сложность возникла во время работы с процедурой, оставь обратную связь через процедуру «Обратная связь по процедуре TCRM». Проблема с самим Видеозвонком После завершения используй форму «Видеозвонок прошёл хорошо?». В большинстве случаев обратную связь оставляем именно там. Когда заводить задачу через Информер 1) Сервис ВЗ работает так, что ты не можешь из-за этого работать. 2) Нет возможности оставить обратную связь через сервис. Например, не работает кнопка «Отправить СМС». В остальных случаях Оставляй обратную связь через форму, которая появляется после завершения видеозвонка. Отказ / результат К модулю ВЗ Содержание Регламент • S-сегмент 40","links":[{"x":0.397317,"y":0.605364,"w":0.205367,"h":0.035634,"page":42},{"x":0.320199,"y":0.661191,"w":0.173134,"h":0.035634,"page":34},{"x":0.506773,"y":0.661191,"w":0.173028,"h":0.035634,"page":2}]},{"n":42,"width":595.28,"height":841.89,"text":"02 / ВИДЕОЗВОНОК / 09 Отказ, не подключился, результат. Как завершать сложные ветки без потери процедуры. Если клиент отказывается от видеозвонка 1. Узнай причину отказа. 2. Проведи работу с возражениями, если процедура просит. 3. Если клиент всё равно не согласен - укажи причину в процедуре. Дальше процедура может предложить вопросы для аутентификации. Если подтвердить личность не удалось, после звонка передай подозрение на мошенничество: выбери «Не клиент», процедура сама передаст подозрение. Если клиент не подключается Если занят / техническая причина / не хочет ВЗ Результат видеозвонка В сервисе могут отображаться: • Клиент подтверждён • Клиент не подтверждён • Проверки пройдены частично • Проверки не пройдены • Что-то пошло не так Если процедура просит указать результат вручную, выбери вариант, который слово-в-слово совпадает с результатом в сервисе ВЗ. К модулю ВЗ Содержание Регламент • S-сегмент 41 Минута - ориентировочное время ожидания. Если клиент не подключился: 1) заверши ВЗ красной трубкой; 2) выбери «Клиент не подключился»; 3) перезвони и выясни причину. Ссылка на ВЗ действует 1 час. Дальше обязательно пройди процедуру до конца по соответствующим шагам. Не закрывай её через крестик. Занят: в начале процедуры зафиксируй отказ и выбери «Конкретно сейчас не может, но может позже». Техническая причина: выбери наиболее подходящую причину отказа. Не хочет ВЗ: уточни причину, отработай возражение и объясни, что ВЗ - не наша прихоть, а способ защиты денег клиента. При любом из этих вариантов выполни все дальнейшие шаги процедуры до конца, а не закрывай её через крестик.","links":[{"x":0.320199,"y":0.741997,"w":0.173134,"h":0.035634,"page":34},{"x":0.506773,"y":0.741997,"w":0.173028,"h":0.035634,"page":2}]},{"n":43,"width":595.28,"height":841.89,"text":"03 / ВСТРОЕННЫЕ ИНСТРУКЦИИ Первый ответ и ожидание. Приветствие, ожидание и первый ответ. Приветствие • Поддерживай дружескую атмосферу. Одного приветствия на диалог достаточно. • Если в эту дату уже здоровался другой сотрудник - повторно не здоровайся. • Каждое сообщение создаёт push-уведомление: приветствие совмещай с ответом. • Если сразу переводишь клиента - лишнее приветствие не нужно. • Для «Доброе утро / день / вечер» сначала проверь часовой пояс клиента. Безопасность Если клиент прислал фото карты, полный номер карты, CVC или код подтверждения из SMS - предупреди, что это небезопасно. Для работы достаточно последних 4 цифр карты. Первый ответ / ожидание • Первый ответ - в течение 5 минут. • Если ответ не готов - нажми «Завесить» или напиши, что занимаешься вопросом. • Перезавешивай клиента каждые 5 минут. • 30 минут без сообщений - чат автоматически снимется с тебя; это считается грубым нарушением. • Не придумывай срок от себя. Если процедура устанавливает срок ответа / решения или требует его озвучить - назови клиенту срок по процедуре и соблюдай его. Если срока нет - скажи, что занимаешься вопросом и скоро ответишь. Важно Кнопка «Завесить» не срабатывает два раза подряд - чередуй кнопку с текстовой фразой. Когда клиент просит перезвонить К приветствию Содержание Регламент • S-сегмент 42","links":[{"x":0.338182,"y":0.645381,"w":0.323636,"h":0.035634,"page":44},{"x":0.313192,"y":0.701208,"w":0.187149,"h":0.035634,"page":4},{"x":0.51378,"y":0.701208,"w":0.173028,"h":0.035634,"page":2}]},{"n":44,"width":595.28,"height":841.89,"text":"03 / МАНЕРА ОБЩЕНИЯ / 02 Когда клиент просит перезвонить. Выбери действие по ситуации клиента. Клиент спрашивает, как нам позвонить Вопроса не было: дай контакты КЦ и закрой чат по регламенту. Вопрос был, но ответа не было: дай контакты КЦ, предложи самому перезвонить клиенту и одновременно ответь на вопрос в чате. Если ответ ещё не готов / нужны вопросы - напиши, что готов помочь и в чате. Клиент сам попросил перезвонить Не проси клиента звонить нам самостоятельно и не подменяй его просьбу предложением «давайте решим в чате». Свяжись сам через процедуру «Перезвонить клиенту». Подробнее: сценарий перезвона Сколько чатов в работе? 1 чат: сообщи, что сейчас перезвонишь. Чат НЕ закрывай - иначе закроется карточка клиента. Более 1 чата: предупреди клиента, что свяжешься с ним в ближайшее время. Просит перезвонить позже Не договаривайся о звонке на определённое время. Предложи клиенту самостоятельно позвонить на линию или написать в чат в удобное время. Если клиент обращается в чат и просит позвонить сейчас, звони сам. Просит звонок после окончания рабочего дня Если попросил «прямо сейчас», а просьба пришла ещё в рабочее время - перезвони по стандартному порядку. Если заранее просит связаться уже после рабочего дня - объясни техническое ограничение и дай номера: 995 - с Т-Мобайла; +7 800 555-97-77 - звонки по России; +7 499 649-59-95 - звонки из других стран. «Ответим быстро и поможем разобраться в вашем вопросе.» Карточка клиента и параллельные чаты Предыдущая Содержание Регламент • S-сегмент 43","links":[{"x":0.097433,"y":0.336315,"w":0.309044,"h":0.034446,"page":15},{"x":0.316516,"y":0.715307,"w":0.366968,"h":0.035634,"page":45},{"x":0.319903,"y":0.771134,"w":0.173727,"h":0.035634,"page":43},{"x":0.507069,"y":0.771134,"w":0.173028,"h":0.035634,"page":2}]},{"n":45,"width":595.28,"height":841.89,"text":"03 / МАНЕРА ОБЩЕНИЯ / 03 Карточка клиента и параллельные чаты. Контакт, приоритет и контекст. Подгрузился пустой контакт • Запроси информацию для поиска карточки, открой карточку и проконсультируй. • Если клиент не хочет предоставлять данные или это потенциальный клиент - дай общую информацию, используя БЗ или другие официальные источники. • Если контакт всё же нужен - запроси ФИО + дату рождения либо ФИО + КН. Параллельные чаты Обычно работаем в порядке поступления. Быстрее отрабатывай критичные ситуации: угрозы жалоб в суд, Роспотребнадзор, Банки.ру, социальные сети; клиент остался без связи / сети в России или в роуминге. Контекст при поступлении чата • Обязательно прочитай переписку и пойми суть вопроса. • При необходимости посмотри диалоги за последние дни. • Проверь запросы на клиенте. Сначала история, потом вопросы Клиент нервничает или спрашивает срок Не придумывай срок от себя. Если процедура устанавливает срок или требует его озвучить - назови срок по процедуре и соблюдай его. Если срока нет - скажи, что занимаешься вопросом и ответишь в ближайшее время. Переписка затянулась, решение не находится Предложи звонок, чтобы решить вопрос быстрее. Диалог в чате Предыдущая Содержание Регламент • S-сегмент 44","links":[{"x":0.097433,"y":0.466035,"w":0.314092,"h":0.034446,"page":5},{"x":0.410407,"y":0.704154,"w":0.179186,"h":0.035634,"page":46},{"x":0.319903,"y":0.759981,"w":0.173727,"h":0.035634,"page":44},{"x":0.507069,"y":0.759981,"w":0.173028,"h":0.035634,"page":2}]},{"n":46,"width":595.28,"height":841.89,"text":"04 / ВСТРОЕННЫЕ ИНСТРУКЦИИ Диалог в чате. Контекст, приоритет и темп работы. Старт диалога • Оцени ситуацию целиком: контекст переписки, это первое обращение или продолжение, было ли приветствие и будешь ли ты сам вести диалог. • Если сразу переводишь клиента - не отправляй лишнее приветствие и push-уведомление. • Не используй фразу «Доброго времени суток». • Срок ответа - максимально быстро. Если процедура задаёт срок ответа или решения - озвучь его клиенту ровно по процедуре и соблюдай. В остальных случаях срок от себя не обещай. Приветствие и ожидание Параллельные чаты: что приоритетнее • Угрозы жалоб в ЦБ РФ, Банки.ру, социальные сети. • Совершение или невозможность совершения сделок. • Нет возможности зайти в МП, ЛК или терминал. • Просьба отменить сделку по внебиржевой бумаге. • Клиент приехал в офис банка. • Клиент написал вчера или ранее. • Потенциальный клиент. • В одном диалоге клиента переключали два и более раз. Список не исчерпывающий: уникальный кейс может быть важнее - оцени обращение индивидуально. Речь на языке клиента Объясняй легко и без сложных терминов, сохраняй вежливость и не переоценивай уровень подготовки клиента. Ответ должен быть понятен именно ему. Передача и контекст К приветствию Содержание Регламент • S-сегмент 45","links":[{"x":0.097433,"y":0.286118,"w":0.253748,"h":0.034446,"page":43},{"x":0.385007,"y":0.660977,"w":0.229986,"h":0.035634,"page":47},{"x":0.313192,"y":0.716804,"w":0.187149,"h":0.035634,"page":4},{"x":0.51378,"y":0.716804,"w":0.173028,"h":0.035634,"page":2}]},{"n":47,"width":595.28,"height":841.89,"text":"04 / ДИАЛОГ В ЧАТЕ / 02 Передача и контекст. Сначала разберись, затем передавай. Диалог переключили на тебя • Сначала прочитай переписку и пойми суть вопроса. • При необходимости посмотри диалоги за последние дни, запросы на клиенте и переписку в почте. • Не заставляй клиента повторять то, что уже видно в истории. Нужно перевести диалог • Сопроводи переключение словами, например: «По данному вопросу переключу вас на коллегу». • Обязательно оставь коллеге комментарий: кратко укажи, с чем клиенту нужно помочь. Перевод негативного клиента Перед передачей на бэк • Сначала убедись, что сам не можешь решить вопрос клиента. • Если нужную информацию можно проверить в доступных системах и дать в своей компетенции - реши вопрос сам. • Передавай дальше только ту часть, которая действительно требует другой компетенции. Уточняющие вопросы: меньше касаний Переписка затягивается Если звонок уместен и реально поможет решить вопрос быстрее - предложи клиенту принять звонок. При негативе голосом иногда проще показать вовлечённость и снизить напряжение. Когда перезваниваем клиенту Одно касание и завершение Предыдущая Содержание Регламент • S-сегмент 46","links":[{"x":0.097433,"y":0.339878,"w":0.287968,"h":0.034446,"page":12},{"x":0.097433,"y":0.513547,"w":0.359174,"h":0.034446,"page":6},{"x":0.097433,"y":0.654219,"w":0.291726,"h":0.034446,"page":15},{"x":0.358851,"y":0.714796,"w":0.282298,"h":0.035634,"page":48},{"x":0.319903,"y":0.770623,"w":0.173727,"h":0.035634,"page":46},{"x":0.507069,"y":0.770623,"w":0.173028,"h":0.035634,"page":2}]},{"n":48,"width":595.28,"height":841.89,"text":"04 / ДИАЛОГ В ЧАТЕ / 04 Одно касание и завершение. Закрой максимум потребностей без повторного обращения. Несколько вопросов • Если клиент задал несколько вопросов - ответь на все в одном логично структурированном сообщении или серии сообщений. • Разделяй ответы отступами / блоками: «по первому вопросу...», «по вопросу с...» • Не отвечай только на один вопрос так, чтобы остальные потерялись в продолжении переписки. Уточняющие вопросы: меньше касаний Развёрнутый ответ - когда полезно Если рядом есть важная информация, которая поможет клиенту дальше и снизит вероятность повторного обращения, добавь её после прямого ответа. Дополнительные ссылки тоже уместны. Перед закрытием диалога • Не закрывай диалог, пока не ответил на заданные вопросы. • Проверь, что ничего не потерялось после переводов, уточнений и нескольких тем в одном обращении. Закрытие диалога Конец рабочего дня • Если остались активные диалоги, ответь всем клиентам. • Перед завершением работы убедись, что не оставил завешенный диалог без ответа. Порядок конца рабочего дня Предыдущая Содержание Регламент • S-сегмент 47","links":[{"x":0.097433,"y":0.255497,"w":0.359174,"h":0.034446,"page":6},{"x":0.097433,"y":0.494079,"w":0.203514,"h":0.034446,"page":24},{"x":0.097433,"y":0.637126,"w":0.280765,"h":0.034446,"page":25},{"x":0.319903,"y":0.701267,"w":0.173727,"h":0.035634,"page":47},{"x":0.507069,"y":0.701267,"w":0.173028,"h":0.035634,"page":2}]},{"n":49,"width":595.28,"height":841.89,"text":"05 / ВСТРОЕННЫЕ ИНСТРУКЦИИ Доп. пользователь без ЭЦП. Сначала определи роль и полномочия. Кто перед нами • ЕИО - управляет компанией от имени юрлица; консультируем согласно доступам по компании. • Суперподписант - сотрудник с ЭЦП, права приравнены к генеральному директору. • Подписант - сотрудник с ЭЦП, права не приравнены к генеральному директору. • Пользователь - сотрудник с доступом к просмотру информации в ЛК, без ЭЦП. • Сотрудник - нет доступа в ЛК и ЭЦП; консультируем как 3-е лицо. Доп. пользователь без активной ЭЦП • В звонке консультируй согласно полномочиям по компании. • Проверка полномочий происходит внутри системы - сотрудник их отдельно не видит. • Если процедура открылась, можно консультировать в звонке и чате и предоставлять информацию, которую она открыла в рамках полномочий пользователя. Если перед тобой сотрудник без ЛК и ЭЦП Это 3-е лицо. Общая консультация возможна по правилам для 3-х лиц; финансовая информация и доступы требуют отдельного сценария. Перейти к правилам 3-го лица Что можно сообщить К доп. пользователю Содержание Регламент • S-сегмент 48","links":[{"x":0.097433,"y":0.50022,"w":0.291823,"h":0.034446,"page":51},{"x":0.383794,"y":0.560798,"w":0.232412,"h":0.035634,"page":50},{"x":0.291767,"y":0.616624,"w":0.229999,"h":0.035634,"page":8},{"x":0.535205,"y":0.616624,"w":0.173028,"h":0.035634,"page":2}]},{"n":50,"width":595.28,"height":841.89,"text":"05 / ДОП. ПОЛЬЗОВАТЕЛЬ БЕЗ ЭЦП / 02 Что можно сообщить. Процедура и Twork задают границы раскрытия. Если процедура открылась Система уже проверила полномочия пользователя. Консультируй в пределах открывшейся процедуры и тех данных, которые она разрешает предоставить. Информация из Twork Из Twork разрешено предоставлять информацию по счетам клиента после соответствующего уровня идентификации. Контактные данные, номера карт и другие конфиденциальные данные раскрывать нельзя, кроме перечисленных исключений. Конфиденциальная информация Исключения после идентификации • Последние 4 цифры номера карты. • Последние 4 цифры любого номера телефона на контакте клиента. • Тип адреса: регистрация или проживание. • Город, улицу, дом и квартиру из Twork - только при работе со встречей или отправкой карты по почте. Срок действия карты - отдельное исключение • Только исходящий звонок на контактный номер и тематика «перевыпуск карты по сроку действия». • Можно сказать только «через месяц» или «в этом месяце» - точную дату не называй. Консультация 3-го лица Предыдущая Содержание Регламент • S-сегмент 49","links":[{"x":0.097433,"y":0.331564,"w":0.30818,"h":0.034446,"page":33},{"x":0.373186,"y":0.622148,"w":0.253628,"h":0.035634,"page":51},{"x":0.319903,"y":0.677975,"w":0.173727,"h":0.035634,"page":49},{"x":0.507069,"y":0.677975,"w":0.173028,"h":0.035634,"page":2}]},{"n":51,"width":595.28,"height":841.89,"text":"05 / ДОП. ПОЛЬЗОВАТЕЛЬ БЕЗ ЭЦП / 03 Консультация 3-го лица. Общий вопрос - помоги. Доступ в ЛК - сначала безопасность. 3-е лицо задаёт общий вопрос Если вопрос общий, например о способах пополнения, предоставь информацию. Уточнять ФИО клиента для такой консультации не обязательно. У 3-го лица есть доступ в ЛК • Заблокируй ЛК. • Обязательно перезвони ИП / ЕИО и сообщи причину блокировки. • После этого проведи разблокировку и проконсультируй по вопросу обратившегося. Подозрение на 3-е лицо в ЛК ЕИО хочет дать доступ 3-му лицу • Запиши ФИО. • Запиши номер телефона. • Если есть - ID контакта в системе. Дальше предложи два варианта Рекомендуемый - оформить пользователя ЛК с доступом к счетам. Если ЕИО отказывается, можно использовать кодовое слово и временное право по правилам следующей страницы. Документы от 3-го лица Документы для оформления продуктов и изменения данных, заверенные печатями / подписями, можно принять в почте или чате даже от 3-го лица. AML / ФинМон - действуют отдельные требования профильной процедуры. Как оформить доступ Предыдущая Содержание Регламент • S-сегмент 50","links":[{"x":0.097433,"y":0.337503,"w":0.283024,"h":0.034446,"page":9},{"x":0.382354,"y":0.704154,"w":0.235291,"h":0.035634,"page":52},{"x":0.319903,"y":0.759981,"w":0.173727,"h":0.035634,"page":50},{"x":0.507069,"y":0.759981,"w":0.173028,"h":0.035634,"page":2}]},{"n":52,"width":595.28,"height":841.89,"text":"05 / ДОП. ПОЛЬЗОВАТЕЛЬ БЕЗ ЭЦП / 04 Как оформить доступ. Два варианта для ЕИО - с разными возможностями. Вариант А - рекомендуемый • Добавить сотрудника в личный кабинет как пользователя с доступом к счетам. • Он сможет самостоятельно просматривать доступную информацию в ЛК. Вариант Б - если ЕИО отказывается от А • Установить кодовое слово на компании. • Выдать сотруднику временное право: на 1 день или на 6 месяцев. Что даёт кодовое слово • ЕИО может дать доступ к данным без доступа к ЛК и без оформления ЭЦП. • 3-е лицо сможет получить финансовую информацию только во время звонка в поддержку. • Совершать действия 3-е лицо не сможет. Звонок при обращении 3-го лица Связанные процедуры Кодовое слово на компании Проверка доступов и исключения Предыдущая Содержание Регламент • S-сегмент 51","links":[{"x":0.097433,"y":0.437789,"w":0.311248,"h":0.034446,"page":17},{"x":0.190031,"y":0.522586,"w":0.282242,"h":0.035634,"url":"https://twork.tinkoff.ru/workspace/knowledge-base/subsection/b958bbc0-dd92-49ad-ad4d-31775a5b3018/article/d6d11352-2aca-4c31-a4cf-a4319d0da211"},{"x":0.485712,"y":0.522586,"w":0.324256,"h":0.035634,"url":"https://twork.tinkoff.ru/workspace/knowledge-base/subsection/b958bbc0-dd92-49ad-ad4d-31775a5b3018/article/cbeae33a-9e8c-462b-bc23-163d701309b8"},{"x":0.319903,"y":0.578413,"w":0.173727,"h":0.035634,"page":51},{"x":0.507069,"y":0.578413,"w":0.173028,"h":0.035634,"page":2}]},{"n":53,"width":595.28,"height":841.89,"text":"06 / ВСТРОЕННЫЕ ИНСТРУКЦИИ Подозрение на мошенничество. Спец.инфо, аутентификация и корректная передача по процедуре. 01 / Сначала проверь спец.инфо При взаимодействии с клиентом обязательно проверь спец.инфо. Там может быть указано, что подозрение на мошенничество уже передано. 02 / Клиент не прошёл аутентификацию Если клиент не проходит аутентификацию на первой линии, при необходимости процедура сама направит подозрение на вторую линию усиленной аутентификации. 03 / Передача на усиленную аутентификацию Сотрудники усиленной аутентификации связываются с клиентом только если подозрение правильно передано по TCRM-процедуре. Все вопросы решай по стандартным порядкам и процедурам. 04 / Если подозрение уже есть Можно сообщать общую информацию о продуктах, услугах, тарифах и банке. Дальше обязательно работай в рамках процедур - они подскажут верный порядок. Важно Строго придерживайся правил. Безопасность в деталях. Идентификация 3-е лицо в ЛК После контакта К безопасности Содержание Регламент • S-сегмент 52","links":[{"x":0.205127,"y":0.606552,"w":0.193681,"h":0.035634,"page":7},{"x":0.412247,"y":0.606552,"w":0.177841,"h":0.035634,"page":9},{"x":0.603527,"y":0.606552,"w":0.191346,"h":0.035634,"page":10},{"x":0.310592,"y":0.662379,"w":0.19235,"h":0.035634,"page":7},{"x":0.51638,"y":0.662379,"w":0.173028,"h":0.035634,"page":2}]}]},handbook:{"doc":"handbook","pageCount":49,"pages":[{"n":1,"width":595.28,"height":841.89,"text":"S-СЕГМЕНТ / НАСТОЛЬНАЯ КНИГА Настольная книга сотрудника непрерывного обслуживания бизнеса Рабочие процессы, системы, коммуникация и развитие White edition • обновлено 11.09.2026 Открыть содержание","links":[{"x":0.075595,"y":0.457304,"w":0.265421,"h":0.040385,"page":2}]},{"n":2,"width":595.28,"height":841.89,"text":"01 / СОДЕРЖАНИЕ Содержание. Выбери раздел по своей задаче. 01 О книге Что есть в книге и как обычно проходит рабочий день 02 Общение с клиентом Понятные ответы, эмоции клиента, проверка прав и передача диалога 03 Кто за что отвечает Задачи подразделений и помощь коллег Безопасность и удержание клиентов 04 Рабочие программы TWork, Админка чатов, TQM, Информер и Forge 05 Рабочий день Расписание, перерывы, рабочие режимы и помощь Дежурных 06 Больничный и технические сбои Что делать и кому сообщить, если не можешь работать 07 Обучение и развитие Курсы, Линк и возможности карьерного роста Общение с клиентом Программы и рабочий день Настольная книга • S-сегмент 2","links":[{"x":0.070555,"y":0.135279,"w":0.85842,"h":0.048106,"page":5},{"x":0.070555,"y":0.190512,"w":0.85842,"h":0.048106,"page":6},{"x":0.070555,"y":0.245745,"w":0.85842,"h":0.048106,"page":22},{"x":0.149509,"y":0.296226,"w":0.314064,"h":0.033259,"page":23},{"x":0.070555,"y":0.338987,"w":0.85842,"h":0.048106,"page":24},{"x":0.070555,"y":0.39422,"w":0.85842,"h":0.048106,"page":37},{"x":0.070555,"y":0.449453,"w":0.85842,"h":0.048106,"page":45},{"x":0.070555,"y":0.504686,"w":0.85842,"h":0.048106,"page":47},{"x":0.238401,"y":0.570609,"w":0.230522,"h":0.035634,"page":3},{"x":0.482362,"y":0.570609,"w":0.279237,"h":0.035634,"page":4}]},{"n":3,"width":595.28,"height":841.89,"text":"02 / СОДЕРЖАНИЕ Общение с клиентом. Общение, безопасность, помощь и передача диалога. 08 Как общаться с клиентом Что уточнить и как ответить клиенту понятно и по делу Правила общения Как оформить ответ Примеры фраз 09 Как работать с эмоциями клиента Как снизить напряжение, извиниться и объяснить решение Когда извиняться Как поддержать Как объяснить решение 10 Клиент общается на английском Порядок действий для чата и звонка 11 Что проверить перед ответом Новости, изменения в работе и ситуация клиента 12 Когда обращаться на линию помощи Когда нужна помощь коллег и что выяснить перед обращением 13 Идентификация и права клиента С кем ты общаешься и какую информацию можно сообщить 14 Старший сотрудник и контроль действий Клиент просит старшего или нужно выполнить действие после события Скриншоты, обещания, перевод и пауза в чате 15 Если вопрос нельзя решить сразу Как определить следующий шаг и выбрать нужный сценарий 16 Как передать диалог коллеге Что проверить самому и какую информацию оставить коллеге 17 Частые ситуации и обратная связь Примеры обращений, предложения клиентов и замечания к процедурам Предыдущая Программы и рабочий день Настольная книга • S-сегмент 3","links":[{"x":0.070555,"y":0.135279,"w":0.85842,"h":0.048106,"page":6},{"x":0.149509,"y":0.185761,"w":0.175792,"h":0.033259,"page":11},{"x":0.398692,"y":0.185761,"w":0.192497,"h":0.033259,"page":12},{"x":0.647874,"y":0.185761,"w":0.153934,"h":0.033259,"page":13},{"x":0.070555,"y":0.228522,"w":0.85842,"h":0.048106,"page":7},{"x":0.149509,"y":0.279003,"w":0.174767,"h":0.033259,"page":8},{"x":0.398692,"y":0.279003,"w":0.165731,"h":0.033259,"page":9},{"x":0.647874,"y":0.279003,"w":0.220497,"h":0.033259,"page":10},{"x":0.070555,"y":0.321764,"w":0.85842,"h":0.048106,"page":14},{"x":0.070555,"y":0.376997,"w":0.85842,"h":0.048106,"page":15},{"x":0.070555,"y":0.43223,"w":0.85842,"h":0.048106,"page":15},{"x":0.070555,"y":0.487463,"w":0.85842,"h":0.048106,"page":16},{"x":0.070555,"y":0.542696,"w":0.85842,"h":0.048106,"page":18},{"x":0.149509,"y":0.593177,"w":0.384141,"h":0.033259,"page":19},{"x":0.070555,"y":0.635938,"w":0.85842,"h":0.048106,"page":20},{"x":0.070555,"y":0.691171,"w":0.85842,"h":0.048106,"page":21},{"x":0.070555,"y":0.746404,"w":0.85842,"h":0.048106,"page":17},{"x":0.266798,"y":0.812327,"w":0.173727,"h":0.035634,"page":2},{"x":0.453965,"y":0.812327,"w":0.279237,"h":0.035634,"page":4}]},{"n":4,"width":595.28,"height":841.89,"text":"03 / СОДЕРЖАНИЕ Программы и рабочий день. Рабочие программы, расписание, режимы и обучение. 18 TWork: где искать информацию Рабочие программы, новости и актуальные процедуры 19 Где что находится в TWork Панели, карточка компании и полезные сочетания клавиш Правила работы в TWork 20 Начало работы в TWork Как перейти к работе и выбрать «Чаты» или «Звонки» 21 Связь, почта и оценки качества Для чего нужны Connect, Outlook и TQM TQM: как посмотреть оценку 22 Диалоги, запросы и документы Как найти чат, создать запрос и работать с документами Создать запрос в Информере Отследить запрос в Forge 23 Календарь и расписание Где смотреть расписание и как согласовать его изменения Подготовка к работе и перерывы 24 Как выбрать режим в чате Режимы для звонков, перерывов, обучения и конца рабочего дня 25 Когда обращаться к Дежурным Помощь с нагрузкой, рабочими режимами и переходом на звонки 26 Технические проблемы Как зафиксировать сбой, сообщить руководителю и согласовать отработку 27 Обучение и развитие Как проходить обучение и найти возможности роста в компании Линк и карьерная карта Заключение Предыдущая Настольная книга • S-сегмент 4","links":[{"x":0.070555,"y":0.135279,"w":0.85842,"h":0.048106,"page":24},{"x":0.070555,"y":0.190512,"w":0.85842,"h":0.048106,"page":25},{"x":0.149509,"y":0.240993,"w":0.226542,"h":0.033259,"page":31},{"x":0.070555,"y":0.283754,"w":0.85842,"h":0.048106,"page":27},{"x":0.070555,"y":0.338987,"w":0.85842,"h":0.048106,"page":32},{"x":0.149509,"y":0.389469,"w":0.257443,"h":0.033259,"page":33},{"x":0.070555,"y":0.43223,"w":0.85842,"h":0.048106,"page":29},{"x":0.149509,"y":0.482712,"w":0.260336,"h":0.033259,"page":34},{"x":0.523283,"y":0.482712,"w":0.232775,"h":0.033259,"page":35},{"x":0.070555,"y":0.525472,"w":0.85842,"h":0.048106,"page":37},{"x":0.149509,"y":0.575954,"w":0.286043,"h":0.033259,"page":39},{"x":0.070555,"y":0.618715,"w":0.85842,"h":0.048106,"page":41},{"x":0.070555,"y":0.673948,"w":0.85842,"h":0.048106,"page":40},{"x":0.070555,"y":0.729181,"w":0.85842,"h":0.048106,"page":46},{"x":0.070555,"y":0.784414,"w":0.85842,"h":0.048106,"page":47},{"x":0.149509,"y":0.834895,"w":0.219277,"h":0.033259,"page":48},{"x":0.523283,"y":0.834895,"w":0.136015,"h":0.033259,"page":49},{"x":0.413136,"y":0.888346,"w":0.173727,"h":0.035634,"page":3}]},{"n":5,"width":595.28,"height":841.89,"text":"01 / НАВИГАЦИЯ О чём эта книга? Главная опора сотрудника НО — без поиска по десяткам документов. Привет! Быть сотрудником непрерывного обслуживания — это почти как быть супергероем. Мы первые, кто приходит на помощь, когда у клиентов возникают проблемы. Здесь собраны рабочие ориентиры и точки входа в нужные инструкции. Если что-то осталось непонятным — обратись к руководителю группы. Как обычно проходит работа Ориентир на первые недели: что проверить до решения и перед завершением. Подготовься к рабочему дню Проверь почту и новости, открой системы и к началу рабочего времени будь готов принимать обращения. Сначала разберись Посмотри карточку, историю и текущие процессы. Не спрашивай заново то, что уже известно. Пойми потребность Уточни, что нужно клиенту, собери необходимые вопросы и выбери подходящий сценарий. Проверь безопасность Перед раскрытием информации убедись, с кем общаешься и какой уровень проверки нужен. Реши вопрос Используй актуальную процедуру. Если сам не можешь решить — подключи нужного коллегу и сохрани контекст. Заверши незаконченные действия Проверь все вопросы и действия, а также следующий шаг клиента. Перед концом рабочего дня не оставляй незавершённое. Предыдущая Содержание Настольная книга • S-сегмент 5","links":[{"x":0.319903,"y":0.822112,"w":0.173727,"h":0.035634,"page":4},{"x":0.507069,"y":0.822112,"w":0.173028,"h":0.035634,"page":2}]},{"n":6,"width":595.28,"height":841.89,"text":"02 / КЛИЕНТ Как общаться с клиентом. Понятно, по-человечески и без внутреннего сленга. Регламенты общения на звонках и в чате Твоя основная работа — общение с клиентами и помощь в решении их вопросов. Подстраивай подачу под клиента: выбирай понятные слова, оставайся вовлечённым и веди к решению. Принципы общения Регламент для чатов Регламент для звонков Сначала посмотри контекст Карточка клиента → история обращений → активные процессы → только потом вопросы. Не заставляй клиента повторять уже известное; связанные уточнения собирай вместе. Если часть ответа уже понятна — дай эту часть ответа сразу. Не используй внутренний сленг и сокращения «Передам таск», «зайдите в ЛК» и другие внутренние формулировки клиенту могут быть непонятны. Сокращение допустимо, если клиент сам его использует и очевидно понимает смысл. Порядок общения зависит от канала У звонков и чатов разные рабочие сценарии. Обязательно ознакомься с обоими регламентами: помощь может понадобиться и на другом функционале. Главный ориентир Регламент помогает быстро и одинаково качественно решать вопросы. Не запоминай процедуру «навсегда» — перед действием сверяйся с актуальной версией. Софт-навыки Принципы диалога Формат ответа Примеры фраз Предыдущая Содержание Настольная книга • S-сегмент 6","links":[{"x":0.13848,"y":0.230814,"w":0.221012,"h":0.035634,"url":"https://twork.tinkoff.ru/workspace/knowledge-base/subsection/2c7fdf9b-84b3-485a-9313-ed53028771ba/article/29ae4db0-96ea-4132-9c1c-ac7813f0b680"},{"x":0.372931,"y":0.230814,"w":0.22894,"h":0.035634,"url":"https://twork.tbank.ru/workspace/knowledge-base/subsection/f028b3e4-13d1-4feb-ae18-2ed8a9e0f0e8/article/1b74db1e-486b-4905-8d2f-e05e8a9e6fc8"},{"x":0.61531,"y":0.230814,"w":0.24621,"h":0.035634,"url":"https://twork.tbank.ru/workspace/knowledge-base/subsection/f028b3e4-13d1-4feb-ae18-2ed8a9e0f0e8/article/aa65629b-73ec-4ad4-a63c-43da1db5747f"},{"x":0.41215,"y":0.673995,"w":0.1757,"h":0.035634,"page":7},{"x":0.192884,"y":0.727447,"w":0.215135,"h":0.035634,"page":11},{"x":0.421458,"y":0.727447,"w":0.186368,"h":0.035634,"page":12},{"x":0.621264,"y":0.727447,"w":0.185852,"h":0.035634,"page":13},{"x":0.319903,"y":0.783273,"w":0.173727,"h":0.035634,"page":5},{"x":0.507069,"y":0.783273,"w":0.173028,"h":0.035634,"page":2}]},{"n":7,"width":595.28,"height":841.89,"text":"02 / СОФТ-НАВЫКИ Софт-навыки: от эмоций к решению. Сначала услышь клиента, затем помоги перейти к решению. 1. Дай клиенту высказаться • Покажи, что слышишь и слушаешь клиента; не прерывай его, особенно при негативных эмоциях. • Встань на сторону совместного решения: задача — снизить эмоциональное напряжение и вернуть разговор к рациональному поиску выхода. К базовым принципам 2. Уточни причину эмоций • Задавай только уместные вопросы, которые раскрывают ситуацию и важные детали. • Вопросом можно отзеркалить суть претензии и проверить, правильно ли ты понял запрос. • Открытые вопросы помогают увидеть скрытую потребность и перевести разговор к решению. Эмпатия без воды 3. Дальше выбери действие Проверь, есть ли подтверждённая ошибка банка и нужно ли извинение. Затем поддержи клиента по ситуации, объясни свои действия и ценность решения. Когда нужно извиниться Предыдущая Содержание Настольная книга • S-сегмент 7","links":[{"x":0.379586,"y":0.246719,"w":0.240827,"h":0.035634,"page":6},{"x":0.394758,"y":0.409234,"w":0.210484,"h":0.035634,"page":9},{"x":0.371251,"y":0.552281,"w":0.257498,"h":0.035634,"page":8},{"x":0.319903,"y":0.610484,"w":0.173727,"h":0.035634,"page":6},{"x":0.507069,"y":0.610484,"w":0.173028,"h":0.035634,"page":2}]},{"n":8,"width":595.28,"height":841.89,"text":"02 / СОФТ-НАВЫКИ Извинение: когда да, когда нет. Извиняемся за нашу ошибку — не используем извинение автоматически. Стоит извиниться • Ошибка сотрудника подтверждена. • Есть сбой в банковской системе, оборудовании или приложении. Не нужно извиняться • В ситуации нет вины банка или причин для извинения. • За эту же ситуацию уже извинялись: не повторяй извинение излишне. Если не уверен, что была наша ошибка Не извиняйся заранее. Сначала сделай акцент на разборе ситуации и на том, что необходимо выяснить причину. Как извиниться правильно • Извинение должно быть индивидуальным и искренним. • Не используй безличный шаблон «извините за ситуацию». • Назови конкретную причину, за что приносишь извинение: так клиент видит, что ты понял, что произошло и чем вызваны его эмоции. Эмпатия без воды Предыдущая Содержание Настольная книга • S-сегмент 8","links":[{"x":0.394758,"y":0.470786,"w":0.210484,"h":0.035634,"page":9},{"x":0.319903,"y":0.528988,"w":0.173727,"h":0.035634,"page":7},{"x":0.507069,"y":0.528988,"w":0.173028,"h":0.035634,"page":2}]},{"n":9,"width":595.28,"height":841.89,"text":"02 / СОФТ-НАВЫКИ Эмпатия без воды. Поддержка должна соответствовать состоянию клиента. Считай состояние клиента Негатив Поддержи, покажи вовлечённость и дай почувствовать, что его не оставят с проблемой. Позитив Поддержи позитивную эмоцию клиента и раздели её. Только решение Не добавляй лишнюю эмоциональную подводку — сразу переходи к решению. Объясняй свои действия по ходу решения • Скажи, что конкретно сейчас делаешь для решения вопроса. • Если клиенту нужно оставаться на линии или подождать, объясни зачем это необходимо. • Поясняй действия так, чтобы клиент понимал: вопрос не брошен и работа идёт. Как общаться Смысл эмпатии Не добавить больше слов, а показать участие и помочь клиенту перейти к следующему рациональному шагу. Объясни ценность и адаптируй Предыдущая Содержание Настольная книга • S-сегмент 9","links":[{"x":0.410665,"y":0.396311,"w":0.17867,"h":0.035634,"page":6},{"x":0.347521,"y":0.525829,"w":0.304957,"h":0.035634,"page":10},{"x":0.319903,"y":0.584031,"w":0.173727,"h":0.035634,"page":8},{"x":0.507069,"y":0.584031,"w":0.173028,"h":0.035634,"page":2}]},{"n":10,"width":595.28,"height":841.89,"text":"02 / СОФТ-НАВЫКИ Объясни ценность и адаптируй. Решение должно быть понятно именно этому клиенту. Почему решение поможет Объясни простым языком, в чём польза предложенного решения и какую ценность оно даёт конкретному клиенту или его бизнес-ситуации. Адаптируй информацию под клиента • Учитывай потребность и особенности конкретного клиента. • Подстрой подачу под его манеру общения, уровень знаний и понимания. • При необходимости переформулируй ответ, замени сложные термины и добавь понятный пример. Говори на языке клиента Если клиенту комфортнее простые формулировки — объясняй без лишних терминов. Если он хорошо разбирается в теме и уместны профессиональные формулировки, можно говорить на соответствующем уровне. Как общаться с клиентом Контрольный вопрос перед отправкой Клиент поймёт, что именно мы предлагаем, зачем это ему и что будет происходить дальше? Если нет — упрости и адаптируй ответ. Формат ответа под клиента Предыдущая Содержание Настольная книга • S-сегмент 10","links":[{"x":0.368072,"y":0.441352,"w":0.263856,"h":0.035634,"page":6},{"x":0.361054,"y":0.590338,"w":0.277891,"h":0.035634,"page":12},{"x":0.319903,"y":0.646165,"w":0.173727,"h":0.035634,"page":9},{"x":0.507069,"y":0.646165,"w":0.173028,"h":0.035634,"page":2}]},{"n":11,"width":595.28,"height":841.89,"text":"02 / ОБЩЕНИЕ С КЛИЕНТОМ Принципы понятного диалога. Сначала прямой ответ Сначала ответь на вопрос простыми словами. Затем дай дополнительную информацию и адаптируй ответ под ситуацию клиента. Одно касание Старайся решить вопрос в одно касание: компонуй вопросы, быстро собирай всю нужную информацию и будь проактивным. Заботливый подход Предлагай альтернативу, когда уместно. После решения продвигай селфсервис. Цель - повысить лояльность и снизить негатив. Если основной путь не работает, предложи уместную альтернативу, которая всё равно закрывает потребность клиента. Покажи, что ищешь решение, а не просто фиксируешь проблему. Язык клиента Пиши легко, без перегруза терминами. Сохраняй вежливость и дружелюбие. При негативе используй фразы амортизации. Если клиент не понял Не повторяй тот же ответ теми же словами. Перефразируй, упрости подачу и при необходимости приведи пример. Неуверенные формулировки По возможности исключай: «Предполагаю», «Не знаю», «Возможно», «Вероятнее всего», «Вроде бы так», «Не могу» и похожие. Ответ должен быть чётким, понятным и содержать рекомендацию. Формат ответа под клиента К общению с клиентом Содержание Настольная книга • S-сегмент 11","links":[{"x":0.361054,"y":0.61938,"w":0.277891,"h":0.035634,"page":12},{"x":0.283916,"y":0.675207,"w":0.245701,"h":0.035634,"page":6},{"x":0.543056,"y":0.675207,"w":0.173028,"h":0.035634,"page":2}]},{"n":12,"width":595.28,"height":841.89,"text":"02 / ОБЩЕНИЕ С КЛИЕНТОМ Формат ответа под клиента. Ответ по конкретной ситуации • Отвечай именно по ситуации клиента, а не общим текстом из процедуры. • Используй данные и контекст обращения, чтобы клиент сразу понимал, что ответ относится к его кейсу • Не копируй тот же шаблон, если выше в переписке он уже не помог. Большой ответ Если текст >7-10 предложений - раздели на 2-3 сообщения. Можно дать ответ по одному вопросу и предупредить, что готовишь второй. Рабочие сокращения Не используй ЛК, ТЭ и другие внутренние сокращения, если клиент сам их не использует. Пиши полностью или поясняй. Кнопки и разделы Названия элементов интерфейса пиши в кавычках: «Создать», «...». Смайлики Можно использовать с любыми клиентами, но умеренно. Ставь после законченной мысли, не в середине предложения. Если критично ошибся смайликом - извинись и исправь. Точность и актуальность Перед ответом проверь всё, что связано с вопросом клиента. Предоставляй информацию только когда уверен, что она точная и актуальная. Примеры рабочих формулировок К общению с клиентом Содержание Настольная книга • S-сегмент 12","links":[{"x":0.338974,"y":0.716935,"w":0.322053,"h":0.035634,"page":13},{"x":0.283916,"y":0.772761,"w":0.245701,"h":0.035634,"page":6},{"x":0.543056,"y":0.772761,"w":0.173028,"h":0.035634,"page":2}]},{"n":13,"width":595.28,"height":841.89,"text":"02 / ОБЩЕНИЕ С КЛИЕНТОМ Примеры рабочих формулировок. Выбери подходящую фразу и адаптируй её к реальной ситуации клиента. Срок - только по процедуре Не придумывай срок от себя. Если процедура устанавливает срок ответа / решения или требует его озвучить - назови клиенту срок по процедуре и соблюдай его. Как обозначить ожидание • «Уже проверяю, в чём дело и очень скоро вернусь с ответом. Пожалуйста, ожидайте». • «Чтобы разобраться в ситуации и всё прояснить, нужно некоторое время. Сделаю всё, чтобы вернуться с решением как можно скорее». • «Сейчас всё проверю и вам расскажу. Прошу немного подождать». • «Сейчас уточню и вернусь с ответом». • «Я вас понял(а). Сейчас обязательно разберёмся». • «Сейчас всё проверю и расскажу подробнее». • «Уже разбираюсь в ситуации с [вопросом клиента]. Как только закончу, сразу сообщу». Плохо «Не знаю, это подсказать не смогу». Лучше «По этому вопросу вам поможет...» К общению с клиентом Содержание Настольная книга • S-сегмент 13","links":[{"x":0.283916,"y":0.49263,"w":0.245701,"h":0.035634,"page":6},{"x":0.543056,"y":0.49263,"w":0.173028,"h":0.035634,"page":2}]},{"n":14,"width":595.28,"height":841.89,"text":"02 / АНГЛОЯЗЫЧНЫЙ КЛИЕНТ Англоговорящий клиент. Порядок зависит от языка и канала — не смешивай сценарии. Используй процедуру «Англоговорящий клиент» Для звонка запусти процедуру и прочитай английскую фразу / транскрипцию; для чата процедура сама отправит сообщение. В обоих случаях создаётся задача на выделенную группу, которая связывается с клиентом. Передача с функциональной линии (ФЛ) Попроси коллегу с ФЛ сообщить клиенту ожидать связи. Определённого срока нет; если процедура устанавливает ориентир, используй только его. Другие иностранные языки Не передавай их через процедуру для английского и напрямую через дежурных. Рекомендуй переводчика или консультируй самостоятельно с онлайн-переводчиком, если это допустимо. Предыдущая Содержание Настольная книга • S-сегмент 14","links":[{"x":0.319903,"y":0.432574,"w":0.173727,"h":0.035634,"page":13},{"x":0.507069,"y":0.432574,"w":0.173028,"h":0.035634,"page":2}]},{"n":15,"width":595.28,"height":841.89,"text":"02 / КЛИЕНТ Перед консультацией: контекст и помощь. Новости, эмоции клиента и момент, когда стоит подключить коллег. Новости На TWork каждый рабочий день публикуют изменения процессов, функций и продуктов. Новость может выйти раньше обновления процедуры, поэтому проверяй её перед началом работы и в течение дня. Новости Новости должны быть прочитаны день в день Если новость описывает изменение процесса, учитывай её как актуальный источник до обновления информации в процедуре. Боль клиента Важно не только решить вопрос, но и показать, что ты понимаешь влияние ситуации на клиента. Если неприятная ситуация возникла из-за действий сотрудника, зафиксируй её через процедуру TCRM «Жалоба на сотрудника». Линия помощи Если вопрос сложный, ответа нет в процедуре / Базе знаний или ты не можешь помочь самостоятельно — обратись на линию помощи. Перед обращением собери контекст. Как звонить на ЛП Дальше — безопасность Перед раскрытием информации сначала пойми, с кем общаешься и какой объём данных можно сообщить. На следующей странице — короткая логика выбора. Перейти к безопасности Предыдущая Содержание Настольная книга • S-сегмент 15","links":[{"x":0.413486,"y":0.230814,"w":0.173028,"h":0.035634,"url":"https://twork.tbank.ru/workspace/feed"},{"x":0.394333,"y":0.57846,"w":0.211335,"h":0.035634,"url":"https://twork.tbank.ru/workspace/knowledge-base/subsection/f028b3e4-13d1-4feb-ae18-2ed8a9e0f0e8/article/ebc50ad7-c981-4fb5-9b3b-828e7c496d3e"},{"x":0.372482,"y":0.721508,"w":0.255036,"h":0.035634,"page":16},{"x":0.319903,"y":0.77971,"w":0.173727,"h":0.035634,"page":14},{"x":0.507069,"y":0.77971,"w":0.173028,"h":0.035634,"page":2}]},{"n":16,"width":595.28,"height":841.89,"text":"02 / БЕЗОПАСНОСТЬ Сначала пойми, с кем общаешься. Безопасность определяет, что можно обсуждать и какой сценарий использовать. Кто перед тобой Перед раскрытием информации пойми, кто обращается и какие права у него есть. Знание данных компании само по себе не даёт права на консультацию. Третье лицо Бухгалтер, помощник или другой сотрудник компании не получает доступ к информации клиента автоматически. Возможность консультации зависит от роли, доступов и требований процедуры. Что-то не сходится Если человек не может подтвердить информацию, ведёт себя необычно или есть признаки доступа третьего лица — не определяй мошенничество «на глаз». Перейди к сценарию проверки. Процедура определяет уровень проверки Для разных вопросов нужен разный уровень идентификации. Не запрашивай больше данных, чем требуется, но и не раскрывай защищённую информацию раньше необходимой проверки. Быстрые переходы Идентификация Частые ситуации Видеозвонок Главное правило Финансовую и другую защищённую информацию раскрывай только после проверки, которую требует актуальная процедура. Клиент пропал во время ИД Если клиент перестал отвечать во время любой идентификации в чате, позвони ему по телефону. Это относится к ИД, видеозвонку и подтверждению буквенным кодом. При НДЗ отправь сообщение по сценарию «НДЗ: ИД / ВЗ / код» и закрой чат по регламенту. Если клиент замолчал ещё на этапе предложения ВЗ, после звонка и НДЗ процедуру ВЗ можно не доводить до конца. При явном отказе зафиксируй отказ и заверши процедуру. Предыдущая Содержание Настольная книга • S-сегмент 16","links":[{"x":0.201571,"y":0.540854,"w":0.193681,"h":0.035634,"url":"https://twork.tinkoff.ru/workspace/knowledge-base/subsection/b309b3f8-3393-424c-8fd5-c7ad79f2f8d8/article/d80cdef4-2413-4ce6-b88e-cbe363931b03"},{"x":0.408692,"y":0.540854,"w":0.203136,"h":0.035634,"page":17},{"x":0.625266,"y":0.540854,"w":0.173162,"h":0.035634,"url":"https://twork.tinkoff.ru/workspace/knowledge-base/subsection/2a5639cd-3319-4f8a-9392-d3cddec17317/article/3d6e4347-3bf9-4d05-937a-eb710ab36881"},{"x":0.319903,"y":0.835465,"w":0.173727,"h":0.035634,"page":15},{"x":0.507069,"y":0.835465,"w":0.173028,"h":0.035634,"page":2}]},{"n":17,"width":595.28,"height":841.89,"text":"02 / КЛИЕНТ Частые ситуации и обратная связь. Примеры помогают распознать сценарий, а точные действия всегда бери из актуальной процедуры. Пример: звонит бухгалтер Если человека нет среди пользователей / контактных лиц с нужными правами, не обсуждай конкретные данные клиента. Общую информацию сообщай только в разрешённом процедурой объёме. Пример: данные для входа передали другому человеку То, что директор сам передал данные помощнику, не означает автоматического права на консультацию. Ориентируйся на роль, доступы и процедуру; отдельно предупреди о рисках передачи данных. Пример: человек вызывает подозрение Голос, возраст или поведение сами по себе не доказывают мошенничество. Это повод перейти к проверке по процедуре и не раскрывать защищённую информацию до её завершения. Пример: нестандартный запрос Если вопрос не связан напрямую с банковским продуктом, но ты можешь безопасно помочь — не отказывай автоматически. Если сомневаешься, посоветуйся с руководителем. Т—Ж Обратная связь Предложения клиентов фиксируй через процедуру TCRM «Предложение от клиента». Обратную связь по Базе знаний и новостям оставляй через процедуру TCRM «Обратная связь по процедуре TCRM». Идентификация Видеозвонок Предыдущая Содержание Настольная книга • S-сегмент 17","links":[{"x":0.413486,"y":0.517419,"w":0.173028,"h":0.035634,"url":"https://journal.tinkoff.ru/"},{"x":0.309859,"y":0.660466,"w":0.193681,"h":0.035634,"url":"https://twork.tinkoff.ru/workspace/knowledge-base/subsection/b309b3f8-3393-424c-8fd5-c7ad79f2f8d8/article/d80cdef4-2413-4ce6-b88e-cbe363931b03"},{"x":0.516979,"y":0.660466,"w":0.173162,"h":0.035634,"url":"https://twork.tinkoff.ru/workspace/knowledge-base/subsection/2a5639cd-3319-4f8a-9392-d3cddec17317/article/3d6e4347-3bf9-4d05-937a-eb710ab36881"},{"x":0.319903,"y":0.718669,"w":0.173727,"h":0.035634,"page":16},{"x":0.507069,"y":0.718669,"w":0.173028,"h":0.035634,"page":2}]},{"n":18,"width":595.28,"height":841.89,"text":"02 / СТАРШИЙ И КОНТРОЛЬ Клиент просит старшего / нужен контроль. Когда подключать коллег и как не создавать лишнюю работу. Просит старшего или более компетентного сотрудника Позвони на линию помощи и передай клиента. Контроль выполнения Если после события нужно выполнить конкретное действие, используй предусмотренный сценарий отложенной работы. Важно Не создавай задачу «на всякий случай». Выполнение отложенной работы Другие рекомендации Предыдущая Содержание Настольная книга • S-сегмент 18","links":[{"x":0.341675,"y":0.394826,"w":0.31665,"h":0.035634,"page":20},{"x":0.378844,"y":0.448277,"w":0.242312,"h":0.035634,"page":19},{"x":0.319903,"y":0.504104,"w":0.173727,"h":0.035634,"page":17},{"x":0.507069,"y":0.504104,"w":0.173028,"h":0.035634,"page":2}]},{"n":19,"width":595.28,"height":841.89,"text":"02 / СТАРШИЙ И КОНТРОЛЬ Другие рекомендации. Короткие правила, которые часто всплывают в нестандартных ситуациях. Скриншоты Если процедура не разрешает отправку скриншотов — это запрещено. Допустим скрин из ЛК / МП клиента при идентификации и только по его данным. Не показывай данные вне роли клиента и не создавай впечатление, что сотрудник может входить в его ЛК. Обещания коллег Нестандартное решение или льгота, согласованная ранее, должна быть выполнена. Разовое исключение обозначь как разовое. Перевод негативного клиента Если уже участвовал в диалоге — сначала отработай негатив, потом переключай. 30 минут бездействия Диалог автоматически вернётся в общую очередь. Передача диалога и контекст Предыдущая Содержание Настольная книга • S-сегмент 19","links":[{"x":0.35425,"y":0.50389,"w":0.291501,"h":0.035634,"page":21},{"x":0.319903,"y":0.562092,"w":0.173727,"h":0.035634,"page":18},{"x":0.507069,"y":0.562092,"w":0.173028,"h":0.035634,"page":2}]},{"n":20,"width":595.28,"height":841.89,"text":"02 / КЛИЕНТ Если вопрос нельзя завершить сейчас. Распознай ситуацию, а конкретный тип работы выбери по актуальному регламенту. Не выбирай сценарий по памяти Если результат зависит от события, другого подразделения или повторного контакта с клиентом, не придумывай способ самостоятельно. Открой регламент отложенной работы и выбери ветку по фактической ситуации. Что важно до перехода в регламент Сначала пойми, что должно произойти дальше: действие после события, повторный контакт или передача кейса. Зафиксируй контекст так, чтобы следующий шаг был понятен тебе или коллеге. Не обещай срок от себя Если процедура устанавливает срок ответа / решения или требует его озвучить — используй срок процедуры. В остальных случаях не называй точный срок, которого нет в процессе. Регламент отложенной работы К старшему и контролю Предыдущая Содержание Настольная книга • S-сегмент 20","links":[{"x":0.34824,"y":0.421884,"w":0.303521,"h":0.035634,"url":"https://twork.tinkoff.ru/workspace/knowledge-base/subsection/f028b3e4-13d1-4feb-ae18-2ed8a9e0f0e8/article/3cca9bd0-468c-43c1-8a62-38a026d08985"},{"x":0.373838,"y":0.469396,"w":0.252324,"h":0.035634,"page":18},{"x":0.319903,"y":0.527599,"w":0.173727,"h":0.035634,"page":19},{"x":0.507069,"y":0.527599,"w":0.173028,"h":0.035634,"page":2}]},{"n":21,"width":595.28,"height":841.89,"text":"02 / ПЕРЕДАЧА ДИАЛОГА Передача диалога и контекст. Сначала разберись, затем передавай — без повторного допроса клиента. Диалог переключили на тебя Просмотри историю вопроса, последние действия, запросы к клиенту и переписку. Не заставляй клиента повторять то, что уже видно. Нужно перевести диалог Сопроводи переключение словами и оставь коллеге короткий комментарий: с чем пришёл клиент, что уже сделано и какая помощь нужна. Перед линией помощи или бэк-офисом Сначала убедись, что сам не можешь решить вопрос. Если информации достаточно и она в твоей компетенции — реши сам. Передавай дальше только ту часть, которая требует другой компетенции. Если переписка затягивается Когда вопрос быстрее решить голосом, предложи клиенту звонок. При негативе сначала прояви вовлечённость и снизь напряжение. Клиент просит позвонить Не договаривайся о звонке на определённое время. Предложи клиенту самостоятельно позвонить на линию или написать в чат в удобное время. Если клиент обращается в чат и просит позвонить сейчас, звони сам. Перед завершением проверь три вещи 1. Вопрос — ответил ли я на всё, с чем пришёл клиент? 2. Действие — всё ли сделал сам или корректно передал дальше? 3. Следующий шаг — понимает ли клиент, что произойдёт дальше, если вопрос ещё не завершён? К старшему и контролю Предыдущая Содержание Настольная книга • S-сегмент 21","links":[{"x":0.373838,"y":0.727957,"w":0.252324,"h":0.035634,"page":18},{"x":0.319903,"y":0.78616,"w":0.173727,"h":0.035634,"page":20},{"x":0.507069,"y":0.78616,"w":0.173028,"h":0.035634,"page":2}]},{"n":22,"width":595.28,"height":841.89,"text":"03 / КОМАНДА Взаимодействие с подразделениями. Кому передаём вопрос и за что отвечает каждое направление. Как работать с этим разделом Большинство взаимодействий — это передача запросов в TCRM. Иногда коллеги попросят сообщить клиенту информацию, запросить документы или созвониться. Ниже — ориентир, кто за что отвечает. Бэк-офис Справки, претензии и начисления льгот. Например, списание за неиспользованную услугу или недовольство обслуживанием. Управление Развитие Качества (УРК) Разбор ошибок на линии, положительных и негативных отзывов, анализ частых ошибок. Отсюда могут приходить КО с описанием ошибок. Валютный контроль Валютные операции и переводы на иностранные счета. Если клиент прислал документы в чат — передай их валютному контролю. Отдел проверки надёжности клиентов (ОПНК) При подозрении, что обращается не клиент, передаём запрос в ОПНК. Пока идёт проверка, не консультируем. Если опасения не подтверждаются, блокировка снимается. Телемаркетинг Помогает организовывать встречи по зарплатному проекту и координировать вопросы подготовки / доставки. Техническая поддержка Разбирает проблемы оборудования и систем сотрудников и клиентов. Запросы ставим через Информер; при массовой проблеме может появиться инцидент с ориентиром и обходным решением. Дежурные Координируют нагрузку и режимы линии, помогают с техническими моментами при входе на удалёнку и операционными вопросами. Риск, операции и удержание Создать запрос в Информере Предыдущая Содержание Настольная книга • S-сегмент 22","links":[{"x":0.203129,"y":0.834955,"w":0.28805,"h":0.035634,"page":23},{"x":0.504617,"y":0.834955,"w":0.292254,"h":0.035634,"page":34},{"x":0.319903,"y":0.890781,"w":0.173727,"h":0.035634,"page":21},{"x":0.507069,"y":0.890781,"w":0.173028,"h":0.035634,"page":2}]},{"n":23,"width":595.28,"height":841.89,"text":"03 / КОМАНДА Взаимодействие с подразделениями. Продолжение: риск, операции и удержание клиента. SME Guard Если у банка есть вопросы по деятельности клиента, помогает разобрать запрос, возражения по предоставлению документов и объяснить позицию банка / рекомендации Compliance. Compliance При подозрении на незаконные действия может запросить пакет документов. Обычно с клиентом общается персональный менеджер или Guard; если клиент обратился раньше — сообщаем о запросе, принимаем документы и возвращаем их в Compliance. Финансовый мониторинг Работает с операциями клиента и запрашивает документы по платежам, которые требуют дополнительной проверки. Фрод-мониторинг Проверяет, действительно ли клиент совершал подозрительную операцию. Мы идентифицируем клиента и уточняем операцию; после успешной проверки она может пройти. SME Saving Работает с клиентами, которые хотят уйти: выясняет причину, разбирает негатив и помогает вернуть доверие; в отдельных случаях — предложить доступное решение или льготу. Отдел усиленной идентификации Если клиент не проходит идентификацию, процедура может передать подозрение на мошенничество в Отдел усиленной идентификации — ОУИ / ЦЭБ / ДПСиОП. Они обрабатывают TCRM-таски «Подозрения на мошенничество». Предыдущая Содержание Настольная книга • S-сегмент 23","links":[{"x":0.319903,"y":0.746238,"w":0.173727,"h":0.035634,"page":22},{"x":0.507069,"y":0.746238,"w":0.173028,"h":0.035634,"page":2}]},{"n":24,"width":595.28,"height":841.89,"text":"04 / СИСТЕМЫ Основные рабочие программы. TWork и базовая подготовка рабочего интерфейса. Что здесь важно На обучении ты уже знакомился с системами. Здесь — короткая карта: где начать работу и что открыть первым. TWork Основная точка входа в рабочие системы. Здесь начинается работа с клиентом и открываются нужные инструменты. Учебная среда Рабочая среда Как начать работу 1. Открой TWork и нажми «Перейти к работе». 2. Выбери нужный функционал. 3. Для приёма обращения используй соответствующий рабочий режим. Где искать важную информацию и процедуры В TWork используй поиск процедур и продуктовые разделы - здесь находишь актуальные инструкции по вопросу клиента. Для поиска актуальной информации также используй раздел «Новости» на сайте TWork. TQM: интерфейс и оценки Создать запрос в Информере Отследить запрос в Forge Предыдущая Содержание Настольная книга • S-сегмент 24","links":[{"x":0.307777,"y":0.31282,"w":0.185831,"h":0.035634,"url":"https://crm-sme-service-learn.tcsbank.ru/login"},{"x":0.507047,"y":0.31282,"w":0.185175,"h":0.035634,"url":"https://crm-sme-service.tinkoff.ru/login"},{"x":0.074817,"y":0.749286,"w":0.266541,"h":0.035634,"page":33},{"x":0.354797,"y":0.749286,"w":0.292254,"h":0.035634,"page":34},{"x":0.66049,"y":0.749286,"w":0.264693,"h":0.035634,"page":35},{"x":0.319903,"y":0.805113,"w":0.173727,"h":0.035634,"page":23},{"x":0.507069,"y":0.805113,"w":0.173028,"h":0.035634,"page":2}]},{"n":25,"width":595.28,"height":841.89,"text":"04 / ИНТЕРФЕЙС И СТАТУСЫ Интерфейс: где что находится. Короткий ориентир, чтобы не искать основные элементы по всему экрану. Начало работы В TWork нажми «Перейти к работе» и выбери «Чаты» или «Звонки» по текущему функционалу. Дальше используй нужный рабочий режим. Левая панель Последние диалоги, возврат к очереди и таймер ответа. Если клиент ждёт слишком долго, таймер меняет цвет. Справа вверху Здесь находятся системные действия, связанные с текущей коммуникацией и рабочим сценарием. Карточка компании Контакты, важная информация, поиск процедур, продукты, события и другие данные клиента. Клавиши Shift+Enter — новая строка. Enter — отправить сообщение. Alt+8 — вставить символ ₽. Открыть TWork Начать работу Экран чата Предыдущая Содержание Настольная книга • S-сегмент 25","links":[{"x":0.213069,"y":0.558838,"w":0.190642,"h":0.035634,"url":"https://twork.tinkoff.ru/workspace/customer-serv/?cache-boost=1"},{"x":0.41715,"y":0.558838,"w":0.183314,"h":0.035634,"page":27},{"x":0.613903,"y":0.558838,"w":0.173028,"h":0.035634,"page":28},{"x":0.319903,"y":0.61704,"w":0.173727,"h":0.035634,"page":24},{"x":0.507069,"y":0.61704,"w":0.173028,"h":0.035634,"page":2}]},{"n":26,"width":595.28,"height":841.89,"text":"04 / ИНТЕРФЕЙС И СТАТУСЫ Статусы и смена функционала. Переходы должны быть предсказуемыми: сначала нужная предактивность, затем новая работа. В конце дня Если есть 1+ чат — за 2 минуты до конца рабочего дня выбери предактивность «Офлайн» и заверши текущие обращения. Если чатов нет — переходи в «Офлайн» в момент окончания. Плановая смена активности Если в работе есть 1+ чат, за 2 минуты до плановой смены выбери предактивность нужного режима. Если активных чатов нет — переходи по расписанию без лишнего ожидания. Переход на звонки Если есть 1+ чат, за 2 минуты до плановой смены выбери «Звонки» — это предактивность для завершения текущих чатов. После их закрытия режим активируется. Важно Если чаты долго не выпадают — проинформируй дежурного. 30 минут без сообщений — диалог автоматически вернётся в общую очередь. Памятка по режимам Регламент звонков Режимы в чатах Рабочие режимы Предыдущая Содержание Настольная книга • S-сегмент 26","links":[{"x":0.26768,"y":0.517419,"w":0.23442,"h":0.035634,"url":"https://twork.tinkoff.ru/workspace/knowledge-base/subsection/7950d59a-ee17-44de-b1ec-880a0e0913be/article/31ed706e-1631-47d5-8c99-ca70a0fcd577"},{"x":0.515539,"y":0.517419,"w":0.21678,"h":0.035634,"url":"https://twork.tinkoff.ru/workspace/knowledge-base/subsection/f028b3e4-13d1-4feb-ae18-2ed8a9e0f0e8/article/aa65629b-73ec-4ad4-a63c-43da1db5747f"},{"x":0.402277,"y":0.564931,"w":0.195445,"h":0.035634,"page":41},{"x":0.39815,"y":0.618382,"w":0.2037,"h":0.035634,"page":31},{"x":0.319903,"y":0.674209,"w":0.173727,"h":0.035634,"page":25},{"x":0.507069,"y":0.674209,"w":0.173028,"h":0.035634,"page":2}]},{"n":27,"width":595.28,"height":841.89,"text":"04 / ВИЗУАЛЬНЫЙ ОРИЕНТИР Начало работы в TWork. Два шага: перейти к работе и выбрать нужный функционал. 1. В TWork нажми «Перейти к работе» 2. Выбери «Чаты» или «Звонки» При трудностях с TWork нажмите на кнопку «Сообщить о проблеме». Ориентируйся по названию нужного функционала — расположение плиток может немного меняться. К интерфейсу и статусам Предыдущая Содержание Настольная книга • S-сегмент 27","links":[{"x":0.369024,"y":0.681954,"w":0.261953,"h":0.035634,"page":25},{"x":0.319903,"y":0.740156,"w":0.173727,"h":0.035634,"page":26},{"x":0.507069,"y":0.740156,"w":0.173028,"h":0.035634,"page":2}]},{"n":28,"width":595.28,"height":841.89,"text":"04 / ВИЗУАЛЬНЫЙ ОРИЕНТИР Основной экран чата. Сначала пойми, где диалог, системные действия и карточка компании. Три зоны, которые нужны чаще всего 1. Диалог — общение с клиентом. 2. Системные сообщения и действия. 3. Карточка компании — контекст по клиенту. 1. Общий экран: чат слева, карточка компании справа ИИ-помощник Нажмите на «Рекомендованный ответ», чтобы получить подсказку для ответа клиенту. 2. Системные сообщения / действия 3. Карточка компании К интерфейсу и статусам Предыдущая Содержание Настольная книга • S-сегмент 28","links":[{"x":0.369024,"y":0.78289,"w":0.261953,"h":0.035634,"page":25},{"x":0.319903,"y":0.841092,"w":0.173727,"h":0.035634,"page":27},{"x":0.507069,"y":0.841092,"w":0.173028,"h":0.035634,"page":2}]},{"n":29,"width":595.28,"height":841.89,"text":"04 / ВИЗУАЛЬНЫЙ ОРИЕНТИР Админка чатов: найти диалог. Сначала найди нужный диалог — дальше можно открыть его и забрать в работу. Как искать Ищи по ID физлица, ID компании, ФИО клиента или по сотруднику. При необходимости используй фильтры справа. 1. Найди диалог в Админке чатов Когда нашёл нужный диалог, переходи к следующему шагу — «Посмотреть чат» и «Взять чат в работу». Открыть Админку чатов Диалоги Взять чат в работу Предыдущая Содержание Настольная книга • S-сегмент 29","links":[{"x":0.167496,"y":0.647845,"w":0.253349,"h":0.035634,"url":"https://tmsg-support.tinkoff.ru/"},{"x":0.434284,"y":0.647845,"w":0.173028,"h":0.035634,"url":"https://tmsg-support.tinkoff.ru/threads"},{"x":0.620751,"y":0.647845,"w":0.211753,"h":0.035634,"page":30},{"x":0.319903,"y":0.706047,"w":0.173727,"h":0.035634,"page":28},{"x":0.507069,"y":0.706047,"w":0.173028,"h":0.035634,"page":2}]},{"n":30,"width":595.28,"height":841.89,"text":"04 / АДМИНКА ЧАТОВ И ДОКУМЕНТЫ Админка чатов: взять чат в работу. После того как нашёл нужный диалог — открой его, возьми в работу и выбери скилл. 1. Открой найденный диалог Нажми «Посмотреть чат», чтобы проверить историю и убедиться, что это нужный диалог. 2. Возьми чат в работу В открытом диалоге нажми «Взять чат в работу». 3. Выбери скилл Укажи скилл по тематике вопроса — после этого станет доступна кнопка «Продолжить». Как это выглядит Если сначала нужно найти сам диалог, открой визуальный ориентир с поиском и фильтрами. Где найти диалог Документы Админка чатов Рабочие режимы Предыдущая Содержание Настольная книга • S-сегмент 30","links":[{"x":0.204431,"y":0.705801,"w":0.203289,"h":0.035634,"page":29},{"x":0.421159,"y":0.705801,"w":0.173028,"h":0.035634,"page":36},{"x":0.607626,"y":0.705801,"w":0.187943,"h":0.035634,"url":"https://tmsg-support.tinkoff.ru/"},{"x":0.39815,"y":0.759252,"w":0.2037,"h":0.035634,"page":31},{"x":0.319903,"y":0.815079,"w":0.173727,"h":0.035634,"page":29},{"x":0.507069,"y":0.815079,"w":0.173028,"h":0.035634,"page":2}]},{"n":31,"width":595.28,"height":841.89,"text":"04 / СИСТЕМЫ Рабочие режимы. Функционал, клиентский приоритет и завершение рабочего дня. Режимы функционала Перед сменой функционала ориентируйся на расписание. Если впереди плановая смена активности и в работе есть 1+ чат, за 2 минуты выбери предактивность нужного режима. Режимы функционала Режимы в чатах Песочница ЛК клиента Используй учебную среду только для тренировочных сценариев. Для реальной консультации работай в основной среде под своей учётной записью. Клиент на первом месте • Клиентский звонок / чат — приоритет перед новостями и письмами. • Звонок принимай сразу: ожидание более 3 секунд считается рингом. • Объясняй просто, без лишних банковских терминов. • Время ожидания называй только когда это требуется процессом или клиент уточняет его. Перед окончанием рабочего дня Проверь письма, неотвеченные и отложенные чаты. Всё начатое заверши до конца рабочего дня. После этого выйди из TWork, закрой программы и выйди из учётной записи. Предыдущая Содержание Настольная книга • S-сегмент 31","links":[{"x":0.275737,"y":0.230814,"w":0.239642,"h":0.035634,"url":"https://twork.tinkoff.ru/workspace/knowledge-base/subsection/60619aa5-e65c-4d4a-8967-2a39594ccbb4/article/79ef0ed4-ece5-4652-a902-ee790e3a538c"},{"x":0.528818,"y":0.230814,"w":0.195445,"h":0.035634,"page":41},{"x":0.319903,"y":0.612182,"w":0.173727,"h":0.035634,"page":30},{"x":0.507069,"y":0.612182,"w":0.173028,"h":0.035634,"page":2}]},{"n":32,"width":595.28,"height":841.89,"text":"04 / СИСТЕМЫ Программы и контроль качества. Connect, Outlook и TQM — основные инструменты связи и контроля качества. Самое важное За 15 минут до начала рабочего дня войди в систему. К началу рабочего дня установи нужный статус. В свободное от обращений время проверяй почту и новости; после рабочего дня выйди из систем. Connect Виджет телефонии для связи с клиентами. Инструкция по настройке находится в Базе знаний. Настройка Connect Microsoft Outlook Корпоративная почта. Настрой правила сортировки и папку с письмами от РГ. Проверяй почту несколько раз в день: там могут быть задачи руководителя и сообщения о недоступности систем. T Quality Management (TQM) Руководители и сотрудники развития качества выборочно оценивают консультации; полученные баллы влияют на премию. В TQM можно посмотреть оценки, комментарии, записи звонков и чаты. Фильтр помогает отсортировать оценки и понять текущий средний балл. Формула среднего балла: сумму оценок, которые влияют на рейтинг, разделить на количество этих оценок. После оценки создаётся обсуждение: если согласен — при необходимости оставь комментарий и нажми «Согласен»; если не согласен — аргументируй позицию и выбери «Хочу обсудить». Разбирай оценки в ближайшее рабочее время. В TQM также выгружаются другие ошибки, например «КО» — такие случаи подробно разбирай с РГ. TQM: интерфейс и оценки Предыдущая Содержание Настольная книга • S-сегмент 32","links":[{"x":0.391024,"y":0.31282,"w":0.217952,"h":0.035634,"url":"https://twork.tinkoff.ru/workspace/knowledge-base/subsection/eed2416a-ea77-4dd2-9acd-f436875baf59/article/419b7354-b386-4761-9a3f-0e01f9067a3b"},{"x":0.36673,"y":0.657521,"w":0.266541,"h":0.035634,"page":33},{"x":0.319903,"y":0.713347,"w":0.173727,"h":0.035634,"page":31},{"x":0.507069,"y":0.713347,"w":0.173028,"h":0.035634,"page":2}]},{"n":33,"width":595.28,"height":841.89,"text":"04 / СИСТЕМЫ TQM: интерфейс контроля качества. Где посмотреть оценку и что делать, если её нужно обсудить. Что здесь проверяешь В TQM смотри оценку, комментарий оценщика и связанную задачу. Основные правила работы с оценками — на предыдущей странице. Как выглядит раздел с задачами Если хочешь обсудить оценку Открой «Найдена связанная задача», добавь аргументированный комментарий для руководителя / оценщика и нажми «Хочу обсудить». Если согласен При необходимости оставь комментарий и нажми «Согласен». Оценки разбирай в ближайшее рабочее время. К правилам TQM Предыдущая Содержание Настольная книга • S-сегмент 33","links":[{"x":0.399715,"y":0.774394,"w":0.20057,"h":0.035634,"page":32},{"x":0.319903,"y":0.830221,"w":0.173727,"h":0.035634,"page":32},{"x":0.507069,"y":0.830221,"w":0.173028,"h":0.035634,"page":2}]},{"n":34,"width":595.28,"height":841.89,"text":"04 / СИСТЕМЫ Информер: как создать запрос. Открой Информер в TWork, выбери категорию и подробно опиши проблему. Когда использовать Когда не работает система, оборудование, доступ или другой рабочий инструмент и нужен запрос в техподдержку. Открой Информер через значок молнии Тут вводить запрос для поиска Нажмите на кнопку молнии, чтобы открыть Информер 1. Найди категорию Начни вводить название проблемы в строке поиска и выбери подходящую категорию. 2. Опиши проблему Укажи, что не работает, когда началось и что уже проверено. Это сокращает лишние уточнения. 3. Приложи подтверждение Если нужно по ситуации, приложи фото, видео или другое подтверждение проблемы. После отправки запрос получает номер. По нему можно отслеживать статус и возвращаться к задаче. Отследить запрос в Forge Предыдущая Содержание Настольная книга • S-сегмент 34","links":[{"x":0.367654,"y":0.649527,"w":0.264693,"h":0.035634,"page":35},{"x":0.319903,"y":0.707729,"w":0.173727,"h":0.035634,"page":33},{"x":0.507069,"y":0.707729,"w":0.173028,"h":0.035634,"page":2}]},{"n":35,"width":595.28,"height":841.89,"text":"04 / СИСТЕМЫ Forge: где отслеживать запрос. После отправки запроса через Информер его статус можно проверить в Forge. Что делать в Forge Найди свой запрос на главной странице или в разделе «Запросы» → открой нужную задачу → проверь статус и результат. Пример: список активных запросов Как понять, что делать дальше Если задача ещё в работе — ориентируйся на её статус. Когда появился результат, открой запрос и выполни следующий шаг по ситуации. Открыть Forge К созданию запроса Предыдущая Содержание Настольная книга • S-сегмент 35","links":[{"x":0.407855,"y":0.554327,"w":0.18429,"h":0.035634,"url":"https://forge.tcsbank.ru/"},{"x":0.387061,"y":0.607779,"w":0.225879,"h":0.035634,"page":34},{"x":0.319903,"y":0.663605,"w":0.173727,"h":0.035634,"page":34},{"x":0.507069,"y":0.663605,"w":0.173028,"h":0.035634,"page":2}]},{"n":36,"width":595.28,"height":841.89,"text":"04 / АДМИНКА ЧАТОВ И ДОКУМЕНТЫ Документы. Что можно принять и когда действуют отдельные требования. Можно принять от 3-го лица Документы для оформления продуктов и изменения данных, заверенные печатями / подписями, можно принять в почте или чате даже от 3-го лица. AML / ФинМон Для документов при проверке AML и ФинМон действуют отдельные требования из профильной процедуры «Требования к документам AML и ФинМон». Перед приёмом проверь сценарий Если запрос связан с профильной проверкой или есть сомнение, сначала открой актуальную процедуру. Настольная книга даёт ориентир, но не заменяет требования процесса. Предыдущая Содержание Настольная книга • S-сегмент 36","links":[{"x":0.319903,"y":0.432574,"w":0.173727,"h":0.035634,"page":35},{"x":0.507069,"y":0.432574,"w":0.173028,"h":0.035634,"page":2}]},{"n":37,"width":595.28,"height":841.89,"text":"05 / РАБОЧИЙ ДЕНЬ Календарь и расписание. Где смотреть рабочий день, перерывы, обед и учебные активности. Календарь Личное расписание открывается в Календаре после TWork-авторизации. Здесь видны рабочие часы и все активности на день. Открыть Календарь Расписание в браузере Майти: расписание Что видно в Календаре На скриншоте выделена дополнительная активность по обучению. Смотри день целиком В расписании видны функционал, перерывы, обед и обучение. Для быстрого обзора переключай «День / Неделя / Месяц» сверху. Пожелания и обмены Подготовка и перерывы Предыдущая Содержание Настольная книга • S-сегмент 37","links":[{"x":0.142573,"y":0.230814,"w":0.22263,"h":0.035634,"url":"https://twork.tbank.ru/twfm/admin/schedule-edit"},{"x":0.378642,"y":0.230814,"w":0.247088,"h":0.035634,"url":"https://twork.tinkoff.ru/workspace/knowledge-base/subsection/49593716-4613-405f-929a-0562fa66bd41/article/e86d0a54-5b84-462d-bff6-b5bd884fcc17"},{"x":0.639169,"y":0.230814,"w":0.218258,"h":0.035634,"url":"https://twork.tinkoff.ru/workspace/knowledge-base/subsection/49593716-4613-405f-929a-0562fa66bd41/article/a1564dbc-5b6d-462e-abc6-3d5e6f5be56a"},{"x":0.38295,"y":0.783241,"w":0.234099,"h":0.035634,"page":38},{"x":0.373657,"y":0.836692,"w":0.252687,"h":0.035634,"page":39},{"x":0.319903,"y":0.892519,"w":0.173727,"h":0.035634,"page":36},{"x":0.507069,"y":0.892519,"w":0.173028,"h":0.035634,"page":2}]},{"n":38,"width":595.28,"height":841.89,"text":"05 / РАБОЧИЙ ДЕНЬ Пожелания и обмены. Как влиять на график и что делать, если нужен обмен. Пожелания к расписанию Каждый месяц на почту приходит опрос по пожеланиям. Внимательно прочитай письмо и отправь пожелания до указанного срока — после закрытия опроса добавить их уже нельзя. Когда их собирают Обычно примерно за 2 месяца, чтобы планирование успело подготовить рабочие часы, обучения и другие активности. Обмен рабочим временем Если нужен обмен, оформи его через приложение и ищи вариант заранее. Обмен возможен с сотрудниками на своём функционале и в одинаковом графике. Если подходящего обмена нет — обратись к РГ. Обмен рабочим временем Обмен сменами - звонки Обмен сменами - чаты Обратная связь по расписанию Пример письма После завершения месяца может прийти отдельный опрос. Он помогает планированию понять, насколько расписание было удобным. Срок и условия всегда смотри в актуальном письме. Увеличенный фрагмент письма Предыдущая Содержание Настольная книга • S-сегмент 38","links":[{"x":0.098836,"y":0.382687,"w":0.271268,"h":0.035634,"url":"https://twork.tinkoff.ru/workspace/knowledge-base/subsection/49593716-4613-405f-929a-0562fa66bd41/article/7ee8125d-fa4c-4e70-8d31-2ba7c088c848"},{"x":0.383543,"y":0.382687,"w":0.259506,"h":0.035634,"url":"https://time-ops.tinkoff.ru/dko/channels/obmen-smenami-no-zvonki"},{"x":0.656488,"y":0.382687,"w":0.244676,"h":0.035634,"url":"https://time-ops.tinkoff.ru/dko/channels/obmen-smenami-no-chaty"},{"x":0.319903,"y":0.880958,"w":0.173727,"h":0.035634,"page":37},{"x":0.507069,"y":0.880958,"w":0.173028,"h":0.035634,"page":2}]},{"n":39,"width":595.28,"height":841.89,"text":"05 / РАБОЧИЙ ДЕНЬ Рабочее время и расписание. Подготовка, дисциплина и перерывы — компактно и по делу. Дисциплинарные и прочие нарушения Для операционного подразделения важен точный учёт рабочего времени и соблюдение режимов. В первую неделю РГ отдельно проговорит ключевые правила; полный порядок нарушений — по ссылке. Порядок нарушений Подготовка к началу рабочего дня Оптимально зайти за 15 минут до начала: загрузить VDI, проверить почту и новости, подключить Connect и открыть TWork. К началу рабочего времени ты уже должен быть готов принимать обращения. Если забыл логин / пароль, в рабочее время обратись к РГ, вне его рабочего времени — к дежурному. Подготовка к работе Обед и личные перерывы Обед — 40 минут. При графике 5/2: 4 перерыва по 10 минут; при 2/2: 6 перерывов по 10 минут. Обед используем полностью и по расписанию; личные — тоже по расписанию. Если перерыв сдвинулся Первый перерыв — не раньше чем через час после начала работы; последний должен закончиться не позже чем за 30 минут до конца. Если задержал клиент — иди сразу после обращения. При срочной необходимости или просьбе дежурных перерыв можно сдвинуть; два соседних 10-минутных иногда объединяются в 20 минут. Важно при смене режима Если в работе есть 1+ чат и впереди плановая активность, за 2 минуты выбери предактивность нужного режима. Точный сценарий перехода смотри в разделе «Режимы в чатах». Режимы в чатах Предыдущая Содержание Настольная книга • S-сегмент 39","links":[{"x":0.387029,"y":0.230814,"w":0.225942,"h":0.035634,"url":"https://twork.tinkoff.ru/knowledge-base/api/resources/a79df9e2-33c2-4412-81f3-ffb601f394e3.pdf"},{"x":0.385935,"y":0.38739,"w":0.228131,"h":0.035634,"url":"https://twork.tinkoff.ru/workspace/knowledge-base/subsection/a35de09e-7d32-4ebd-b0b0-1ac5bcee2470/article/fe206918-d48b-4988-a83a-b8c4e5d566d4"},{"x":0.402277,"y":0.735037,"w":0.195445,"h":0.035634,"page":41},{"x":0.319903,"y":0.793239,"w":0.173727,"h":0.035634,"page":38},{"x":0.507069,"y":0.793239,"w":0.173028,"h":0.035634,"page":2}]},{"n":40,"width":595.28,"height":841.89,"text":"05 / РАБОЧИЙ ДЕНЬ Рабочее время и расписание. Смена режимов и Дежурные. Оперативность обслуживания зависит от нас Чем меньше сотрудников на линии, тем больше время ожидания клиента. Поэтому важно быть на месте в течение рабочего дня и не задерживаться на перерывах без причины. Смена режимов в рабочее время Если в работе есть 1+ чат и впереди плановая смена активности, за 2 минуты выбери предактивность нужного режима. После завершения текущих чатов активируется целевой режим. Правила режимов в чатах Команда Дежурных В рабочее время основная точка — РГ; вне его рабочего времени по операционным вопросам обращайся к дежурному. Дежурные контролируют режимы, сообщают о нагрузке на линию, пересадках и смене функционала «звонки ↔ чаты», помогают с техническими моментами. Канал sme_duty работает 24/7. Канал sme_duty Не путай зоны ответственности Дежурные помогают с операционными действиями линии. Как ответить клиенту по продукту или процедуре — вопрос для линии помощи / актуальной процедуры, а не Дежурных. Предыдущая Содержание Настольная книга • S-сегмент 40","links":[{"x":0.367103,"y":0.326349,"w":0.265795,"h":0.035634,"url":"https://twork.tinkoff.ru/workspace/knowledge-base/subsection/2c7fdf9b-84b3-485a-9313-ed53028771ba/article/999635d6-5ee6-41bb-ac2b-ad586dd097a7"},{"x":0.403435,"y":0.482925,"w":0.193131,"h":0.035634,"url":"https://time-ops.tinkoff.ru/dko/channels/sme_duty"},{"x":0.319903,"y":0.636663,"w":0.173727,"h":0.035634,"page":39},{"x":0.507069,"y":0.636663,"w":0.173028,"h":0.035634,"page":2}]},{"n":41,"width":595.28,"height":841.89,"text":"05 / РЕЖИМЫ В ЧАТАХ Режимы в чатах. Быстрый выбор режима по ситуации. Начало рабочего дня Залогинься заранее. К моменту начала рабочего дня выбери режим «Чаты» — без опоздания на линию. Нужно позвонить Клиенту из чата — используй «Исходящий» и после звонка вернись в «Чаты». Ассисту — чаты не закрывай и режим не меняй. Для видеозвонка действуй по отдельному сценарию. Меняется рабочая активность Если в работе есть 1+ чат, за 2 минуты до плановой активности выбери предактивность нужного режима. Переход на звонки, обучение, наставничество, встречу, перерыв и конец рабочего дня имеют свои целевые режимы. Важно Не переключай режимы вне регламента. Система видит активации режимов; несогласованная смена может расцениваться как нарушение и повлиять на премирование. Исходящий звонок и видеозвонок Переход на звонки и активности Статусы и режимы Предыдущая Содержание Настольная книга • S-сегмент 41","links":[{"x":0.337795,"y":0.517419,"w":0.32441,"h":0.035634,"page":42},{"x":0.343457,"y":0.564931,"w":0.313087,"h":0.035634,"page":43},{"x":0.391795,"y":0.612443,"w":0.216411,"h":0.035634,"page":26},{"x":0.319903,"y":0.670646,"w":0.173727,"h":0.035634,"page":40},{"x":0.507069,"y":0.670646,"w":0.173028,"h":0.035634,"page":2}]},{"n":42,"width":595.28,"height":841.89,"text":"05 / РЕЖИМЫ В ЧАТАХ Исходящий звонок и видеозвонок. Что делать с клиентом, пока в работе остаётся чат. Клиенту из чата Выбери режим «Исходящий». Доработай текущие чаты; когда останется один активный — позвони клиенту. После звонка вернись в «Чаты» и продолжай очередь. Нужно позвонить ассисту Не закрывай чаты и не меняй режим. Позвони во время обработки чата, затем вернись к клиенту. При необходимости корректно обозначь ожидание. Видеозвонок — часть процедуры Если процедура требует ВЗ, используй его как предусмотренный способ идентификации / проверки. Обычно закрывать чаты и менять режим не нужно. При отказе, проблемах со связью или срыве ВЗ не придумывай обходной вариант — продолжай по предусмотренной ветке. Если клиент перестал отвечать во время любой ИД в чате, в том числе видеозвонка или подтверждения буквенным кодом, позвони ему по телефону. При НДЗ отправь сообщение по регламенту и закрой чат. Исключение: если клиент перестал отвечать в чате ещё на этапе предложения ВЗ, сначала позвони ему по телефону. При НДЗ отправь сообщение по регламенту и закрой чат; в этом случае процедуру ВЗ можно не доводить до конца. При явном отказе зафиксируй отказ и заверши процедуру. Открыть видеозвонок Перейти к смене режима Предыдущая Содержание Настольная книга • S-сегмент 42","links":[{"x":0.381434,"y":0.512561,"w":0.237132,"h":0.035634,"url":"https://twork.tinkoff.ru/workspace/knowledge-base/subsection/2a5639cd-3319-4f8a-9392-d3cddec17317/article/3d6e4347-3bf9-4d05-937a-eb710ab36881"},{"x":0.36902,"y":0.560073,"w":0.26196,"h":0.035634,"page":43},{"x":0.319903,"y":0.618276,"w":0.173727,"h":0.035634,"page":41},{"x":0.507069,"y":0.618276,"w":0.173028,"h":0.035634,"page":2}]},{"n":43,"width":595.28,"height":841.89,"text":"05 / РЕЖИМЫ В ЧАТАХ Переход с чатов на звонки. Переключайся только по расписанию или рабочей необходимости. Переход по расписанию Если в работе есть 1+ чат, за 2 минуты до плановой смены активности выбери режим «Звонки» — это предактивность для завершения текущих чатов. После их закрытия режим активируется. Если чатов нет — переходи в «Звонки» по расписанию. Переход по звонку Дежурного После звонка Дежурного выбери нужную предактивность. Заверши текущие обращения; чаты закрывай с таймером 1 секунду. После этого переходи в режим «Звонки». Другая активность Выбери режим по цели активности: • Встреча с РГ → Беседа с РГ • Наставничество → Наставничество • Общая встреча → Встречи • Обучение → Обучение Не переключайся самовольно Любое переключение должно соответствовать расписанию или рабочему сценарию. Система видит активации режимов, при которых перестают поступать новые чаты. Правила режимов в чатах Статусы и смена функционала Перерывы и конец рабочего дня Предыдущая Содержание Настольная книга • S-сегмент 43","links":[{"x":0.367103,"y":0.585789,"w":0.265795,"h":0.035634,"url":"https://twork.tinkoff.ru/workspace/knowledge-base/subsection/2c7fdf9b-84b3-485a-9313-ed53028771ba/article/999635d6-5ee6-41bb-ac2b-ad586dd097a7"},{"x":0.349822,"y":0.633301,"w":0.300356,"h":0.035634,"page":26},{"x":0.343227,"y":0.680813,"w":0.313547,"h":0.035634,"page":44},{"x":0.319903,"y":0.739016,"w":0.173727,"h":0.035634,"page":42},{"x":0.507069,"y":0.739016,"w":0.173028,"h":0.035634,"page":2}]},{"n":44,"width":595.28,"height":841.89,"text":"05 / РЕЖИМЫ В ЧАТАХ Перерывы и конец рабочего дня. Тайминг и выход: сначала предактивность, затем завершение текущих чатов. Перерыв Следуй расписанию перерывов в Календаре. Если за 2 минуты до планового перерыва в работе есть 1+ чат — выбери режим «Личный» как предактивность. Новые чаты перестанут поступать; после завершения текущих обращений «Личный» активируется автоматически. Конец рабочего дня Если в работе есть 1+ чат — за 2 минуты до конца рабочего дня выбери предактивность «Офлайн» и заверши текущие диалоги. В эти 2 минуты закрывай их с таймером 2 минуты; после окончания рабочего дня — по стандартному регламенту. Если чатов нет — перейди в «Офлайн» в момент окончания рабочего дня. Не завершай рабочий день в «Служебном», «Обеде» или «Онлайн». Важно После предперерыва должен следовать запланированный перерыв. Смена режима вне регламента может расцениваться как нарушение и отразиться на премировании. Предыдущая Содержание Настольная книга • S-сегмент 44","links":[{"x":0.319903,"y":0.473162,"w":0.173727,"h":0.035634,"page":43},{"x":0.507069,"y":0.473162,"w":0.173028,"h":0.035634,"page":2}]},{"n":45,"width":595.28,"height":841.89,"text":"06 / НЕШТАТНЫЕ СИТУАЦИИ Больничный. Как действовать, если не можешь выйти на работу по болезни. Сначала сообщи руководителю Как только понял, что не сможешь выйти в рабочее время, предупреди РГ удобным способом. Это позволяет заранее учесть нагрузку на линию. Пропуск без оформленного основания может считаться нарушением. Открытие и закрытие больничного (БЛ) 1. Обратись к врачу и открой электронный листок нетрудоспособности (ЭЛН). 2. Проверь название компании: АО ТБанк. 3. Сообщи РГ об открытии БЛ и дате повторного визита; если РГ отсутствует — замещающему. Социальный фонд России (СФР) получает сведения об открытии, продлении и закрытии ЭЛН. Расчёт и оплата Пособие рассчитывается по 255-ФЗ с учётом среднего заработка за два предыдущих календарных года и страхового стажа. Если заработок отсутствует / ниже установленного минимума или стаж менее 6 месяцев, применяются правила с учётом МРОТ. Стаж: менее 5 лет — 60%; от 5 до 8 лет — 80%; 8 лет и более — 100%. При болезни / бытовой травме самого сотрудника первые 3 дня оплачивает работодатель, последующие — СФР. Отдельные случаи: СФР с первого дня Код 03 — карантин. Код 09 — уход за больным членом семьи. В этих случаях пособие выплачивается за счёт СФР с первого дня нетрудоспособности. Для ухода за ребёнком действуют отдельные правила расчёта. Сроки выплат Первые 3 дня, которые оплачивает работодатель, выплачиваются по внутреннему графику. СФР назначает свою часть после получения необходимых сведений; действующий ориентир — до 10 рабочих дней. Предыдущая Содержание Настольная книга • S-сегмент 45","links":[{"x":0.319903,"y":0.697229,"w":0.173727,"h":0.035634,"page":44},{"x":0.507069,"y":0.697229,"w":0.173028,"h":0.035634,"page":2}]},{"n":46,"width":595.28,"height":841.89,"text":"06 / НЕШТАТНЫЕ СИТУАЦИИ Технические проблемы. Фиксация сбоя, уведомление руководителя и отработка времени. Сразу зафиксируй Напиши РГ и приложи фото / видео с пояснением. При необходимости обратись в техподдержку и сохрани подтверждение проблемы: например, сообщение провайдера или документ об отсутствии света / интернета. Зафиксируй время Считай время влияния на рабочую активность с начала своего рабочего дня. Если сбой начался раньше, фиксируй только тот промежуток, который пересекается с рабочим временем. После восстановления Сообщи РГ общее время отсутствия и согласуй отработку. Для отдельной задачи на отработку обратись к РГ; по актуальному порядку задача заводится при отработке более 30 минут, в остальных случаях время согласовывается до / после основного рабочего дня. Важно Техническая причина не считается обоснованием опоздания, если до начала рабочего времени не было сообщения РГ / дежурному о возникшей проблеме. Предыдущая Содержание Настольная книга • S-сегмент 46","links":[{"x":0.319903,"y":0.541638,"w":0.173727,"h":0.035634,"page":45},{"x":0.507069,"y":0.541638,"w":0.173028,"h":0.035634,"page":2}]},{"n":47,"width":595.28,"height":841.89,"text":"07 / РАЗВИТИЕ Обучение и развитие. Корпоративное обучение и активности в расписании. Корпоративное обучение В первые месяцы будут тренинги и электронные курсы. Обучение с тренером проходит в рабочее время и обязательно; часть самостоятельных курсов можно проходить из дома. У каждой активности есть срок. Курс «Всё о зарплате» Активности в расписании Режим «Обучение» Если обучение стоит в рабочем времени, используй режим «Обучение», если тренер не сообщил иначе. За 5 минут до начала начни дорабатывать обращения. Если за 2 минуты до активности в работе есть 1+ чат — выбери предактивность «Обучение» и заверши текущие обращения. Если клиент не отпускает Если до начала осталось несколько минут и клиент не отпускает, передай обращение на линию помощи с пояснением ситуации, а клиенту сообщи, что коллега продолжит консультацию. Не бросай клиента ради таймера активности. Только в случае прямого вопроса клиента Можно кратко сказать, что дальше у тебя корпоративное обучение для развития навыков. Лишние внутренние детали клиенту не нужны. Если назначен тест, доработай обращения и при необходимости согласуй корректировку активности с РГ / дежурным. Линк и карьерная карта Предыдущая Содержание Настольная книга • S-сегмент 47","links":[{"x":0.378181,"y":0.230814,"w":0.243637,"h":0.035634,"url":"https://hr-portal.tinkoff.ru/view_doc.html?mode=course&object_id=6353139521919593862"},{"x":0.374403,"y":0.783322,"w":0.251195,"h":0.035634,"page":48},{"x":0.319903,"y":0.839149,"w":0.173727,"h":0.035634,"page":46},{"x":0.507069,"y":0.839149,"w":0.173028,"h":0.035634,"page":2}]},{"n":48,"width":595.28,"height":841.89,"text":"07 / РАЗВИТИЕ Обучение и развитие. Линк и карьерная карта. Линк Внутренний блог компании: события, акции, скидки, идеи, объявления и тематические блоги. Можно подписываться на интересные разделы и предлагать свои идеи. Развитие в компании «Карьерная карта» помогает изучить функции других отделов и направлений. Если хочешь понять возможный следующий шаг — открой карту и соответствующую процедуру. Главный принцип Развитие — это не отдельная «жизнь после работы», а способ лучше понимать процессы, клиентов и соседние команды. Используй карту как ориентир, а не как список обязательных переходов. Линк Карьерная карта Процедура карьерной карты К практике Предыдущая Содержание Настольная книга • S-сегмент 48","links":[{"x":0.156027,"y":0.421884,"w":0.173028,"h":0.035634,"url":"https://space.tinkoff.ru/"},{"x":0.342493,"y":0.421884,"w":0.200884,"h":0.035634,"url":"https://space.tinkoff.ru/blog/entry/karernaya-karta-shagaj-po-kar/"},{"x":0.556816,"y":0.421884,"w":0.287157,"h":0.035634,"url":"https://crm-light.tinkoff.ru/procedure/sme_root_career_card"},{"x":0.413486,"y":0.475335,"w":0.173028,"h":0.035634,"page":49},{"x":0.319903,"y":0.531162,"w":0.173727,"h":0.035634,"page":47},{"x":0.507069,"y":0.531162,"w":0.173028,"h":0.035634,"page":2}]},{"n":49,"width":595.28,"height":841.89,"text":"08 / ФИНИШ Заключение. К практике — с понятной картой под рукой. Вот и всё, что мы хотели тебе рассказать. Конечно же, по мере твоего развития ты будешь узнавать ещё больше, однако мы постарались кратко затронуть все аспекты, актуальные с первых дней работы. Если понадобится помощь По любому вопросу ты можешь обратиться к своему руководителю: он поможет тебе и подскажет, что делать в той или иной ситуации. Теперь пора приступать к практике! Клиенты ждут тебя ☺ Успехов в работе! Предыдущая Содержание Настольная книга • S-сегмент 49","links":[{"x":0.319903,"y":0.537459,"w":0.173727,"h":0.035634,"page":48},{"x":0.507069,"y":0.537459,"w":0.173028,"h":0.035634,"page":2}]}]}};

  try{titles.knowledge=['База знаний','Регламент и настольная книга'];}catch(e){}

  function theme(){try{return shThemeCurrent()}catch(e){return document.documentElement.dataset.theme==='light'?'light':'dark'}}
  function meta(){return DOCS[K.docKey]||null}
  function lastKey(){return `sh844_kb_last_${K.docKey||'doc'}`}
  function rememberPage(n){if(!K.docKey)return;K.currentPage=n;try{localStorage.setItem(lastKey(),String(n))}catch(e){};const el=document.getElementById('sh842PageIndicator');if(el)el.textContent=`${n} / ${K.index?.pageCount||meta()?.pages||'—'}`}
  function rememberedPage(){try{return Math.max(1,Number(localStorage.getItem(lastKey())||1)||1)}catch(e){return 1}}
  function pad(n){return String(n).padStart(3,'0')}
  function imgPath(n){return `./knowledge/rendered/${K.docKey}-${theme()}/page-${pad(n)}.webp`}
  function indexPath(){return `./knowledge/index/${K.docKey}.json`}

  function navCard(docKey){
    const d=DOCS[docKey],t=theme();
    return `<button class="sh842-kb-card" onclick="sh842OpenKnowledgeDoc('${docKey}')">
      <span class="sh842-kb-preview"><img src="${d.previews[t]}" alt="${esc(d.title)}"></span>
      <span class="sh842-kb-card-copy"><span class="sh842-kb-label">ОСНОВНОЙ ДОКУМЕНТ</span><b>${esc(d.title)}</b><small>${esc(d.description)}</small><span class="sh842-kb-card-meta">${d.pages} стр. · обновлено ${d.updated}</span><em>Открыть в SkillHub →</em></span>
    </button>`;
  }

  window.sh842RenderKnowledge=function(){
    cleanupObserver();K.docKey=null;K.index=null;K.loaded.clear();
    const page=document.getElementById('page-knowledge');if(!page)return;
    page.classList.remove('sh842-reader-page');
    page.innerHTML=`<div class="sh842-kb-home">
      <section class="sh842-kb-hero"><div class="sh842-kb-kicker">БАЗА ЗНАНИЙ</div><h2>Основные рабочие документы — прямо в SkillHub</h2><p>Оригинальные проекты автора открываются внутри приложения. Светлая и тёмная версии переключаются автоматически.</p><span id="sh845KbOfflineStatus" class="sh845-kb-offline">Готовим офлайн-доступ…</span></section>
      <div class="sh842-kb-grid">${navCard('reglament')}${navCard('handbook')}</div>
      <div class="sh842-kb-note"><span>💡</span><div><b>Исходные PDF не меняются</b><small>SkillHub использует их как оригинал, а для быстрого просмотра показывает точные изображения страниц с сохранёнными переходами и поиском.</small></div></div>
    </div>`;
  };

  function viewerMarkup(d){
    return `<div class="sh842-reader" id="sh842ReaderRoot">
      <div class="sh842-reader-head">
        <button class="sh842-back" onclick="sh842BackToKnowledge()">← База знаний</button>
        <div class="sh842-reader-title"><span>БАЗА ЗНАНИЙ</span><h2>${esc(d.title)}</h2><small>Обновлено ${d.updated} · ${d.pages} страниц</small></div>
        <div class="sh842-doc-switch"><button class="${K.docKey==='reglament'?'active':''}" onclick="sh842OpenKnowledgeDoc('reglament',{page:1})">Регламент</button><button class="${K.docKey==='handbook'?'active':''}" onclick="sh842OpenKnowledgeDoc('handbook',{page:1})">Настольная книга</button></div>
      </div>
      <div class="sh842-reader-toolbar">
        <div class="sh842-toolbar-left"><button onclick="sh842GoContents()">☰ Содержание</button><button onclick="sh842PrevPage()" aria-label="Предыдущая страница">←</button><span id="sh842PageIndicator">— / —</span><button onclick="sh842NextPage()" aria-label="Следующая страница">→</button></div>
        <div class="sh842-search"><input id="sh842PdfSearch" placeholder="Поиск по документу" onkeydown="if(event.key==='Enter')sh842SearchKnowledge()"><button onclick="sh842SearchKnowledge()">Найти</button></div>
        <div class="sh842-toolbar-right"><button onclick="sh842Zoom(-0.1)" aria-label="Уменьшить">−</button><span id="sh842ZoomLabel">100%</span><button onclick="sh842Zoom(0.1)" aria-label="Увеличить">+</button><button onclick="sh842Fullscreen()" aria-label="На весь экран">⛶</button></div>
      </div>
      <div id="sh842PdfSearchResults" class="sh842-search-results hidden"></div>
      <div class="sh842-pdf-stage" id="sh842PdfScroller"><div class="sh842-pdf-pages" id="sh842PdfPages"><div class="sh842-pdf-loading"><span class="sh842-loader"></span><b>Открываем документ…</b><small>Загружаем ${theme()==='dark'?'тёмную':'светлую'} версию</small></div></div></div>
    </div>`;
  }

  window.sh842OpenKnowledgeDoc=async function(docKey,opts={}){
    if(!DOCS[docKey])return;
    cleanupObserver();K.docKey=docKey;K.zoom=1;K.currentPage=Math.max(1,Number(opts.page||rememberedPage())||1);K.loaded.clear();K.index=null;
    S.currentPage='knowledge';document.querySelectorAll('.page').forEach(x=>x.classList.add('hidden'));
    const page=document.getElementById('page-knowledge');if(!page)return;
    page.classList.remove('hidden');page.classList.add('sh842-reader-page');
    document.querySelectorAll('.nav-btn').forEach(x=>x.classList.toggle('active',x.dataset.page==='knowledge'));
    document.getElementById('pageTitle').textContent='База знаний';document.getElementById('pageSub').textContent=DOCS[docKey].title;
    page.innerHTML=viewerMarkup(DOCS[docKey]);
    await sh842LoadDocument(K.currentPage);
  };

  window.sh842BackToKnowledge=function(){cleanupObserver();K.docKey=null;K.index=null;K.loaded.clear();sh842RenderKnowledge();document.getElementById('pageTitle').textContent='База знаний';document.getElementById('pageSub').textContent='Регламент и настольная книга'};

  function cleanupObserver(){if(K.observer){try{K.observer.disconnect()}catch(e){}K.observer=null}}

  async function sh842LoadDocument(targetPage=1){
    const host=document.getElementById('sh842PdfPages');if(!host)return;
    try{
      K.index=KB_INDEX[K.docKey];if(!K.index?.pages?.length)throw new Error('EMPTY_EMBEDDED_INDEX');
      targetPage=Math.min(Math.max(1,targetPage),K.index.pageCount);K.currentPage=targetPage;
      buildPageShells();setTimeout(()=>sh842ScrollPage(targetPage,false),90);
      sh845EnsureKnowledgeOffline();
    }catch(err){
      console.error('Knowledge document load failed',err);
      host.innerHTML=`<div class="sh842-pdf-fallback"><b>Не удалось открыть документ</b><small>Проверьте соединение и попробуйте ещё раз.</small><button class="btn primary" onclick="sh842OpenKnowledgeDoc('${K.docKey}',{page:${targetPage}})">Повторить</button><a class="sh844-source-link" href="${meta()?.files?.[theme()]||'#'}" target="_blank" rel="noopener">Открыть исходный PDF</a></div>`;
    }
  }

  function computeBaseWidth(){const sc=document.getElementById('sh842PdfScroller');return Math.max(280,Math.min(930,(sc?.clientWidth||954)-24))}
  function pageWidth(){return Math.max(260,Math.round(K.baseWidth*K.zoom))}
  function applyPageWidths(){K.baseWidth=computeBaseWidth();const w=pageWidth();document.querySelectorAll('.sh842-pdf-page').forEach(el=>el.style.width=w+'px')}

  function buildPageShells(){
    const host=document.getElementById('sh842PdfPages');if(!host||!K.index)return;
    cleanupObserver();K.loaded.clear();host.innerHTML='';K.baseWidth=computeBaseWidth();const frag=document.createDocumentFragment();
    for(const p of K.index.pages){
      const wrap=document.createElement('div');wrap.className='sh842-pdf-page';wrap.id=`sh842PdfPage${p.n}`;wrap.dataset.page=String(p.n);wrap.style.setProperty('--ratio',String(p.height/p.width));wrap.style.width=pageWidth()+'px';
      wrap.innerHTML=`<div class="sh842-page-placeholder"><span>${p.n}</span></div>`;frag.appendChild(wrap);
    }
    host.appendChild(frag);rememberPage(K.currentPage);setupObserver();
  }

  function setupObserver(){
    cleanupObserver();const root=document.getElementById('sh842PdfScroller');if(!root)return;
    K.observer=new IntersectionObserver(entries=>{
      let best=null;
      for(const e of entries){const n=Number(e.target.dataset.page||0);if(e.isIntersecting){sh842RenderPage(n);if(!best||e.intersectionRatio>best.ratio)best={n,ratio:e.intersectionRatio}}}
      if(best&&best.ratio>.16)rememberPage(best.n);
    },{root,rootMargin:'1100px 0px 1100px 0px',threshold:[0,.16,.4,.7]});
    document.querySelectorAll('.sh842-pdf-page').forEach(el=>K.observer.observe(el));
  }

  function linkLayer(pageMeta){
    const layer=document.createElement('div');layer.className='sh842-annotation-layer';
    for(const a of (pageMeta.links||[])){
      const link=document.createElement('a');link.className='sh842-pdf-link';link.style.left=(a.x*100)+'%';link.style.top=(a.y*100)+'%';link.style.width=(a.w*100)+'%';link.style.height=(a.h*100)+'%';link.setAttribute('aria-label','Переход в документе');
      if(a.page){link.href='#';link.onclick=ev=>{ev.preventDefault();sh842ScrollPage(a.page)}}
      else if(a.url){link.href=a.url;link.target='_blank';link.rel='noopener noreferrer'}
      layer.appendChild(link);
    }
    return layer;
  }

  function sh842RenderPage(n){
    if(!K.index||K.loaded.has(n))return;const wrap=document.getElementById(`sh842PdfPage${n}`),p=K.index.pages[n-1];if(!wrap||!p)return;K.loaded.add(n);wrap.innerHTML='';
    const img=document.createElement('img');img.className='sh844-page-image';img.alt=`${meta()?.title||'Документ'}, страница ${n}`;img.loading='lazy';img.decoding='async';img.src=imgPath(n);
    img.onerror=()=>{K.loaded.delete(n);wrap.innerHTML=`<div class="sh842-page-error"><div><b>Не удалось загрузить страницу ${n}</b><br><button onclick="sh844RetryPage(${n})">Повторить</button></div></div>`};
    wrap.appendChild(img);if(p.links?.length)wrap.appendChild(linkLayer(p));
  }
  window.sh844RetryPage=function(n){const w=document.getElementById(`sh842PdfPage${n}`);if(w){K.loaded.delete(n);sh842RenderPage(n)}};

  window.sh842ScrollPage=function(n,smooth=true){if(!K.index)return;n=Math.min(Math.max(1,Number(n)||1),K.index.pageCount);rememberPage(n);const el=document.getElementById(`sh842PdfPage${n}`);if(el){sh842RenderPage(n);el.scrollIntoView({behavior:smooth?'smooth':'auto',block:'start'})}};
  window.sh842GoContents=function(){const d=meta();if(d)sh842ScrollPage(d.contentsPage||2)};
  window.sh842PrevPage=function(){sh842ScrollPage(Math.max(1,K.currentPage-1))};
  window.sh842NextPage=function(){sh842ScrollPage(Math.min(K.index?.pageCount||999,K.currentPage+1))};
  window.sh842Zoom=function(delta){if(!K.index)return;const next=Math.min(1.8,Math.max(.7,Math.round((K.zoom+delta)*10)/10));if(next===K.zoom)return;K.zoom=next;const lab=document.getElementById('sh842ZoomLabel');if(lab)lab.textContent=Math.round(K.zoom*100)+'%';applyPageWidths()};
  window.sh842Fullscreen=function(){const el=document.getElementById('sh842ReaderRoot');if(!el)return;if(document.fullscreenElement){document.exitFullscreen?.()}else el.requestFullscreen?.()};

  function searchSnippet(text,q){const low=(text||'').toLocaleLowerCase('ru-RU'),i=low.indexOf(q);if(i<0)return '';const from=Math.max(0,i-70),to=Math.min(text.length,i+q.length+110);return `${from?'…':''}${text.slice(from,to).replace(/\s+/g,' ')}${to<text.length?'…':''}`}
  window.sh842SearchKnowledge=function(){
    if(!K.index)return;const inp=document.getElementById('sh842PdfSearch'),box=document.getElementById('sh842PdfSearchResults');if(!inp||!box)return;const raw=inp.value.trim(),q=raw.toLocaleLowerCase('ru-RU');if(q.length<2){box.classList.add('hidden');box.innerHTML='';return}
    const found=[];for(const p of K.index.pages){if((p.text||'').toLocaleLowerCase('ru-RU').includes(q)){found.push({page:p.n,snippet:searchSnippet(p.text,q)});if(found.length>=40)break}}
    box.classList.remove('hidden');box.innerHTML=found.length?`<div class="sh842-search-head"><b>Найдено: ${found.length}${found.length===40?'+':''}</b><button onclick="document.getElementById('sh842PdfSearchResults').classList.add('hidden')">✕</button></div><div class="sh842-search-list">${found.map(r=>`<button onclick="sh842ScrollPage(${r.page});document.getElementById('sh842PdfSearchResults').classList.add('hidden')"><b>Страница ${r.page}</b><span>${esc(r.snippet)}</span></button>`).join('')}</div>`:`<div class="sh842-search-head"><b>Совпадений нет</b><button onclick="document.getElementById('sh842PdfSearchResults').classList.add('hidden')">✕</button></div><div class="sh842-search-empty">Попробуйте другое слово или формулировку.</div>`;
  };

  function sh845EnsureKnowledgeOffline(){
    if(!('serviceWorker' in navigator))return;
    const send=reg=>{try{reg?.active?.postMessage({type:'CACHE_KNOWLEDGE'})}catch(e){}};
    navigator.serviceWorker.ready.then(send).catch(()=>{});
  }
  window.sh845EnsureKnowledgeOffline=sh845EnsureKnowledgeOffline;
  if('serviceWorker' in navigator){
    navigator.serviceWorker.addEventListener('message',ev=>{
      const d=ev.data||{};
      if(d.type!=='KNOWLEDGE_CACHE_PROGRESS')return;
      try{localStorage.setItem('sh845_kb_offline_status',JSON.stringify(d))}catch(e){}
      const badge=document.getElementById('sh845KbOfflineStatus');
      if(badge){
        if(d.done) badge.textContent='Офлайн-доступ готов';
        else if(d.total) badge.textContent=`Офлайн-доступ: ${d.doneCount||0}/${d.total}`;
      }
    });
  }

  function injectHomeQuick(){
    const page=document.getElementById('page-home');if(!page||page.querySelector('.sh842-home-kb'))return;
    page.insertAdjacentHTML('beforeend',`<section class="sh842-home-kb"><div class="sh842-home-kb-head"><div><span>БАЗА ЗНАНИЙ</span><h2>Регламент и настольная книга</h2><p>Быстрый доступ к основным рабочим документам</p></div><button onclick="go('knowledge')">Открыть всё →</button></div><div class="sh842-home-kb-links"><button onclick="sh842OpenKnowledgeDoc('reglament')"><b>Регламент</b><small>Сценарии работы в чате</small><em>Открыть →</em></button><button onclick="sh842OpenKnowledgeDoc('handbook')"><b>Настольная книга</b><small>Процессы, системы и развитие</small><em>Открыть →</em></button></div></section>`);
  }
  function placeNav(){const nav=document.querySelector('.sidebar nav'),kb=nav?.querySelector('.nav-btn[data-page="knowledge"]'),training=nav?.querySelector('.nav-btn[data-page="training"]');if(!nav||!kb||!training)return;training.insertAdjacentElement('afterend',kb);kb.classList.remove('hidden')}

  const baseRender=render;render=function(p){if(p==='knowledge')return sh842RenderKnowledge();return baseRender(p)};
  const baseRenderHome=renderHome;renderHome=function(){const r=baseRenderHome();setTimeout(injectHomeQuick,0);return r};
  const baseGo=go;go=function(page){if(page==='knowledge'){S.currentPage='knowledge';document.querySelectorAll('.page').forEach(x=>x.classList.add('hidden'));document.getElementById('page-knowledge')?.classList.remove('hidden');document.querySelectorAll('.nav-btn').forEach(x=>x.classList.toggle('active',x.dataset.page==='knowledge'));document.getElementById('pageTitle').textContent='База знаний';document.getElementById('pageSub').textContent='Регламент и настольная книга';sh842RenderKnowledge();placeNav();return}const r=baseGo(page);placeNav();return r};
  const baseEnterApp=enterApp;enterApp=function(){const r=baseEnterApp();setTimeout(()=>{placeNav();sh845EnsureKnowledgeOffline()},0);return r};
  const baseApplyTheme=applyTheme;applyTheme=function(t,save=true){const r=baseApplyTheme(t,save);if(S.currentPage==='knowledge'){if(K.docKey){const p=K.currentPage;K.loaded.clear();document.querySelectorAll('.sh842-pdf-page').forEach(w=>{w.innerHTML=`<div class="sh842-page-placeholder"><span>${w.dataset.page}</span></div>`});setTimeout(()=>{setupObserver();sh842ScrollPage(p,false)},0)}else setTimeout(()=>sh842RenderKnowledge(),0)}return r};
  window.addEventListener('resize',()=>{if(S.currentPage==='knowledge'&&K.docKey&&K.index)applyPageWidths()},{passive:true});

  setTimeout(()=>{placeNav();if(S.currentPage==='home')injectHomeQuick()},0);
  console.info('SkillHub V8.46: Knowledge Base uses embedded document indexes and background offline caching for both documents and both themes.');
})();
/* ===== end SkillHub V8.46 ===== */
