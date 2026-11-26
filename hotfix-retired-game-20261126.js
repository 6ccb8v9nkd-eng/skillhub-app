/* SkillHub native game zone — 2026-11-26 */
(function(){
'use strict';
var HOST='masterlinii-game.website.yandexcloud.net', KEY='sh_game_best_v1', timer=null;

var games=[
  {id:'pairs',title:'Смысловые пары',level:'Средний',icon:'◆',text:'Соотнеси рабочие понятия и их определения.'},
  {id:'negative',title:'Негативный клиент',level:'Босс',icon:'🎧',text:'Потренируйся в общении с недовольным клиентом и найди лучшее решение.'},
  {id:'quick',title:'Быстрый ответ',level:'Лёгкий',icon:'⚡',text:'Выбери лучший ответ в рабочей ситуации на время.'},
  {id:'voice',title:'Голосовой тренажёр',level:'Скоро',icon:'🎙',text:'Ответь клиенту голосом и отработай сложный разговор.',disabled:true}
];

var negative=[
  {q:'Вы вообще читаете, что я пишу? Третий раз объясняю одно и то же!',a:[
    ['Понимаю, что повторять ситуацию неприятно. Я изучу переписку и сначала проверю, что уже было сделано.',30],
    ['Не нужно нервничать. Напишите вопрос ещё раз коротко.',-20],
    ['Я только подключился к диалогу, поэтому не могу отвечать за коллег.',-10]
  ]},
  {q:'Хорошо. Но почему вопрос до сих пор не решён? Я уже полчаса жду.',a:[
    ['Сейчас проверю статус и вернусь с конкретным решением. Если потребуется больше пяти минут — сразу сообщу.',35],
    ['Ожидайте, пожалуйста.',0],
    ['Срок решения зависит не от меня.',-20]
  ]},
  {q:'Если сейчас опять ничего не получится, я буду жаловаться.',a:[
    ['Понимаю. Давайте сначала закроем сам вопрос: я уже проверил данные и сейчас предложу следующий шаг.',35],
    ['Жалоба — ваше право.',-15],
    ['Не думаю, что жалоба поможет решить вопрос быстрее.',-25]
  ]}
];

var pairs=[
  {q:'Завешивание',a:['Сообщить клиенту, что вопрос в работе, если ответ займёт время','Завершить диалог без ответа','Передать чат другому сотруднику'],ok:0},
  {q:'Контекст диалога',a:['Только последнее сообщение клиента','История, обращения и уже выполненные действия','Только данные из карточки клиента'],ok:1},
  {q:'Сложный негатив',a:['Сразу спорить с клиентом','Игнорировать эмоции и отвечать шаблоном','Сначала признать ситуацию, затем перейти к решению'],ok:2}
];

var quick=[
  {q:'Клиент пишет: «Почему вы так долго отвечаете?»',a:['Потому что обращений много.','Понимаю, ожидание неприятно. Уже занимаюсь вашим вопросом и скоро вернусь с ответом.','Подождите ещё немного.'],ok:1},
  {q:'Вопрос понятен и решение уже известно.',a:['Сразу дать решение.','Сначала задать уточняющий вопрос.','Написать, что нужно подождать 5 минут.'],ok:0},
  {q:'Клиент задаёт несколько связанных уточнений.',a:['Отвечать отдельным сообщением на каждое.','Выбрать только главный вопрос.','Собрать ответ структурно и закрыть все вопросы в одном сообщении.'],ok:2}
];

function q(s){return document.querySelector(s)}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
function best(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){return {}}}
function save(id,n){var b=best();b[id]=Math.max(Number(b[id]||0),Math.round(n));try{localStorage.setItem(KEY,JSON.stringify(b))}catch(e){}}

function addStyle(){
  if(q('#shGameZoneStyle'))return;
  var s=document.createElement('style');s.id='shGameZoneStyle';
  s.textContent=
  'body.sh-game-open .topbar{display:none!important}#page-games{padding:0!important}' +
  '.shg{min-height:100dvh;color:#fff;background:radial-gradient(circle at 96% 88%,rgba(255,184,0,.38),transparent 25%),linear-gradient(145deg,#0d0f13,#1b1e24 56%,#0b0d10);padding:14px 0 42px;overflow:hidden}' +
  '.shg-top{display:grid;grid-template-columns:48px 1fr 48px;align-items:center;padding:0 18px}.shg-top button{width:42px;height:42px;border-radius:50%;border:1px solid #ffffff26;background:#ffffff12;color:#fff;font-size:22px}.shg-brand{text-align:center;font-size:22px;font-weight:900}.shg-brand b{color:#ffd21b}' +
  '.shg-hero{text-align:center;padding:20px 20px 3px}.shg-hero-icon{width:64px;height:64px;margin:auto;border-radius:22px;display:grid;place-items:center;font-size:31px;background:linear-gradient(145deg,#ffe45d,#ff9f0a);box-shadow:0 15px 36px #ffb00045}.shg-hero h1{font-size:42px;margin:12px 0 8px;letter-spacing:-.04em}.shg-hero p{margin:auto;max-width:640px;color:#ffffffb5;line-height:1.45}' +
  '.shg-carousel{display:flex;gap:18px;overflow-x:auto;scroll-snap-type:x mandatory;padding:28px 11vw 17px;scrollbar-width:none;-webkit-overflow-scrolling:touch}.shg-carousel::-webkit-scrollbar{display:none}' +
  '.shg-card{flex:0 0 78vw;max-width:360px;min-height:500px;scroll-snap-align:center;border-radius:39px;padding:22px;display:flex;flex-direction:column;background:linear-gradient(160deg,#3b414c,#1c2027);border:1px solid #ffffff29;box-shadow:0 25px 58px #0007;transform:scale(.94);opacity:.8;transition:.2s}.shg-card.active{transform:scale(1);opacity:1}.shg-card[data-id=negative]{border:2px solid #ffd21b;background:linear-gradient(160deg,#333438,#71531e 66%,#b88110);box-shadow:0 0 42px #ffbd0038}' +
  '.shg-art{height:235px;display:grid;place-items:center;font-size:108px;filter:drop-shadow(0 15px 20px #0007)}.shg-card[data-id=pairs] .shg-art{color:#ffd21b;font-size:130px}.shg-tag{align-self:flex-start;border:1px solid #ffffff2d;background:#0004;border-radius:99px;padding:6px 11px;font-size:13px}.shg-card h2{font-size:29px;margin:16px 0 9px;letter-spacing:-.03em}.shg-card p{color:#ffffffe0;line-height:1.38;margin:0 0 18px}.shg-play{margin-top:auto;height:54px;border:0;border-radius:99px;background:#fff;font-weight:900;font-size:18px;color:#1a1a1a}.shg-card[data-id=negative] .shg-play{background:linear-gradient(#ffe76a,#ffc400)}.shg-play:disabled{opacity:.45}.shg-best{text-align:center;min-height:16px;color:#ffffff88;font-size:12px;margin-top:8px}.shg-dots{text-align:center}.shg-dots i{display:inline-block;width:8px;height:8px;border-radius:50%;background:#ffffff42;margin:0 4px}.shg-dots i.on{background:#ffd21b}' +
  '.shg-view{max-width:720px;margin:auto;padding:18px 20px}.shg-head{display:flex;gap:12px;align-items:center;margin-bottom:18px}.shg-head button{width:42px;height:42px;border-radius:50%;border:1px solid #ffffff25;background:#ffffff12;color:#fff;font-size:22px}.shg-head small{color:#ffffff88}.shg-head h2{margin:1px 0}.shg-panel{background:#ffffff10;border:1px solid #ffffff20;border-radius:28px;padding:20px;box-shadow:0 22px 50px #0004}.shg-msg{font-size:18px;line-height:1.45;background:#ffffff13;border-radius:20px 20px 20px 7px;padding:16px;margin:14px 0}.shg-options{display:grid;gap:10px}.shg-option{padding:15px;border-radius:17px;border:1px solid #ffffff22;background:#101217aa;color:#fff;text-align:left;line-height:1.35}.shg-bar{height:8px;background:#ffffff18;border-radius:99px;overflow:hidden}.shg-bar i{display:block;height:100%;background:linear-gradient(90deg,#ffad00,#ffe45b)}.shg-meta{display:flex;justify-content:space-between;color:#ffffffa0;font-size:13px;margin-bottom:7px}.shg-term,.shg-time{text-align:center;font-size:36px;font-weight:900;margin:10px 0 20px}.shg-time{color:#ffd21b}.shg-result{text-align:center;padding:25px 5px}.shg-score{font-size:62px;font-weight:950;color:#ffd21b}.shg-actions{display:flex;gap:9px;justify-content:center;margin-top:18px;flex-wrap:wrap}.shg-actions button{border:0;border-radius:99px;padding:13px 18px;font-weight:900}.shg-primary{background:#ffd21b}.shg-secondary{background:#ffffff18;color:#fff;border:1px solid #ffffff22!important}' +
  '@media(min-width:850px){.shg-carousel{padding-left:calc(50% - 180px);padding-right:calc(50% - 180px)}}';
  document.head.appendChild(s);
}

function ensurePage(){
  var p=q('#page-games');
  if(!p){
    p=document.createElement('section');p.id='page-games';p.className='page hidden';
    var main=q('.main');if(main)main.appendChild(p);
  }
  return p;
}
function showPage(){document.querySelectorAll('.page').forEach(function(x){x.classList.add('hidden')});var p=ensurePage();if(p)p.classList.remove('hidden');document.body.classList.add('sh-game-open')}
function gameHead(g,meta){return '<div class="shg-head"><button data-zone>‹</button><div><small>'+esc(meta||g.level)+'</small><h2>'+esc(g.title)+'</h2></div></div>'}

function renderZone(){
  var p=ensurePage(),b=best(),html='';
  html+='<div class="shg"><div class="shg-top"><button data-close>‹</button><div class="shg-brand">Skill<b>Hub</b></div><button data-info>ⓘ</button></div>';
  html+='<div class="shg-hero"><div class="shg-hero-icon">🎮</div><h1>Игровая зона</h1><p>Прокачивай рабочие навыки в коротких мини-играх. Листай карточки и выбирай свой вызов.</p></div>';
  html+='<div class="shg-carousel" id="shgCarousel">';
  games.forEach(function(g){
    html+='<article class="shg-card" data-id="'+g.id+'"><div class="shg-art">'+g.icon+'</div><span class="shg-tag">'+(g.level==='Босс'?'♛ ':'')+esc(g.level)+'</span><h2>'+esc(g.title)+'</h2><p>'+esc(g.text)+'</p><button class="shg-play" data-play="'+g.id+'" '+(g.disabled?'disabled':'')+'>'+(g.disabled?'Скоро':'Играть ▶')+'</button><div class="shg-best">'+(b[g.id]?'Лучший результат '+b[g.id]+'%':'')+'</div></article>';
  });
  html+='</div><div class="shg-dots">'+games.map(function(_,i){return '<i class="'+(i===1?'on':'')+'"></i>'}).join('')+'</div></div>';
  p.innerHTML=html;
  p.querySelector('[data-close]').onclick=closeGameZone;
  p.querySelector('[data-info]').onclick=function(){if(window.toast)window.toast('Мини-игры SkillHub: короткая практика рабочих навыков')};
  p.querySelectorAll('[data-play]').forEach(function(x){x.onclick=function(){play(x.dataset.play)}});
  var c=q('#shgCarousel');
  function mark(){
    var cards=[].slice.call(c.children),center=c.scrollLeft+c.clientWidth/2,ix=0,d=1e9;
    cards.forEach(function(x,i){var n=Math.abs(x.offsetLeft+x.clientWidth/2-center);if(n<d){d=n;ix=i}});
    cards.forEach(function(x,i){x.classList.toggle('active',i===ix)});
    p.querySelectorAll('.shg-dots i').forEach(function(x,i){x.classList.toggle('on',i===ix)});
  }
  c.addEventListener('scroll',mark,{passive:true});
  requestAnimationFrame(function(){var t=c.querySelector('[data-id=negative]');if(t){c.scrollLeft=t.offsetLeft-(c.clientWidth-t.clientWidth)/2;mark()}});
}
function openGameZone(){addStyle();showPage();renderZone()}
function closeGameZone(){clearInterval(timer);timer=null;document.body.classList.remove('sh-game-open');if(window.go)window.go('home');else{q('#page-games').classList.add('hidden');q('#page-home').classList.remove('hidden')}}
window.openGameZone=openGameZone;

function bindZoneBack(){var b=ensurePage().querySelector('[data-zone]');if(b)b.onclick=renderZone}
function finish(id,score,title,msg){
  save(id,score);var g=games.find(function(x){return x.id===id}),p=ensurePage();
  p.innerHTML='<div class="shg"><div class="shg-view">'+gameHead(g,'Результат')+'<div class="shg-panel shg-result"><div class="shg-score">'+Math.round(score)+'%</div><h2>'+esc(title)+'</h2><p>'+esc(msg)+'</p><div class="shg-actions"><button class="shg-primary" data-retry>Ещё раз</button><button class="shg-secondary" data-zone>К играм</button></div></div></div></div>';
  p.querySelector('[data-retry]').onclick=function(){play(id)};p.querySelectorAll('[data-zone]').forEach(function(x){x.onclick=renderZone});
}
function playNegative(step,loyalty){
  step=step||0;loyalty=loyalty==null?50:loyalty;
  if(!negative[step])return finish('negative',Math.max(0,Math.min(100,loyalty)),loyalty>=85?'Клиент успокоен':'Диалог завершён',loyalty>=85?'Сильная работа: ты признал эмоции и вернул разговор к решению.':'Попробуй ещё раз: меньше спора, больше конкретного следующего шага.');
  var r=negative[step],p=ensurePage(),pct=Math.max(0,Math.min(100,loyalty));
  p.innerHTML='<div class="shg"><div class="shg-view">'+gameHead(games[1],'Босс · этап '+(step+1)+'/3')+'<div class="shg-panel"><div class="shg-meta"><span>Лояльность клиента</span><b>'+pct+'%</b></div><div class="shg-bar"><i style="width:'+pct+'%"></i></div><div class="shg-msg">'+esc(r.q)+'</div><div class="shg-options">'+r.a.map(function(a,i){return '<button class="shg-option" data-a="'+i+'">'+esc(a[0])+'</button>'}).join('')+'</div></div></div></div>';
  bindZoneBack();p.querySelectorAll('[data-a]').forEach(function(x){x.onclick=function(){playNegative(step+1,loyalty+r.a[Number(x.dataset.a)][1])}});
}
function playPairs(step,correct){
  step=step||0;correct=correct||0;
  if(!pairs[step])return finish('pairs',correct/3*100,correct===3?'Идеальные пары':'Неплохо',correct===3?'Все понятия сопоставлены правильно.':'Есть пара терминов, которые стоит повторить.');
  var r=pairs[step],p=ensurePage();
  p.innerHTML='<div class="shg"><div class="shg-view">'+gameHead(games[0],'Раунд '+(step+1)+'/3')+'<div class="shg-panel"><div class="shg-term">'+esc(r.q)+'</div><div class="shg-options">'+r.a.map(function(a,i){return '<button class="shg-option" data-a="'+i+'">'+esc(a)+'</button>'}).join('')+'</div></div></div></div>';
  bindZoneBack();p.querySelectorAll('[data-a]').forEach(function(x){x.onclick=function(){playPairs(step+1,correct+(Number(x.dataset.a)===r.ok?1:0))}});
}
function playQuick(step,correct){
  clearInterval(timer);step=step||0;correct=correct||0;
  if(!quick[step])return finish('quick',correct/3*100,correct>=2?'Хорошая реакция':'Нужна ещё попытка','Здесь важны и скорость, и качество ответа.');
  var r=quick[step],p=ensurePage(),left=15;
  p.innerHTML='<div class="shg"><div class="shg-view">'+gameHead(games[2],'Вопрос '+(step+1)+'/3')+'<div class="shg-panel"><div class="shg-time" id="shgTime">'+left+'</div><div class="shg-msg">'+esc(r.q)+'</div><div class="shg-options">'+r.a.map(function(a,i){return '<button class="shg-option" data-a="'+i+'">'+esc(a)+'</button>'}).join('')+'</div></div></div></div>';
  bindZoneBack();
  timer=setInterval(function(){left--;var t=q('#shgTime');if(t)t.textContent=left;if(left<=0){clearInterval(timer);playQuick(step+1,correct)}},1000);
  p.querySelectorAll('[data-a]').forEach(function(x){x.onclick=function(){clearInterval(timer);playQuick(step+1,correct+(Number(x.dataset.a)===r.ok?1:0))}});
}
function play(id){if(id==='negative')playNegative();if(id==='pairs')playPairs();if(id==='quick')playQuick()}

function patchHome(){
  var h=q('#page-home');if(!h)return;
  [].slice.call(h.querySelectorAll('a[href]')).forEach(function(a){
    var old=false;try{old=new URL(a.href,location.href).host===HOST}catch(e){}
    if(old){
      var b=document.createElement('button');b.type='button';b.className=a.className;b.innerHTML='Играть <span>→</span>';
      b.onclick=function(e){e.preventDefault();e.stopPropagation();openGameZone()};a.replaceWith(b);
      var card=b.closest('article');if(card){card.onclick=openGameZone;card.style.cursor='pointer'}
    }
  });
  var card=[].slice.call(h.querySelectorAll('article')).find(function(x){return /поиграть|игров/i.test(x.textContent||'')});
  if(card){
    var p=card.querySelector('p'),b=card.querySelector('button');
    if(p)p.textContent='Мини-игры SkillHub: негатив, скорость ответа и рабочие ситуации.';
    if(b&&!b.disabled){b.onclick=function(e){e.stopPropagation();openGameZone()};card.onclick=openGameZone}
  }
}

addStyle();ensurePage();
var observer=new MutationObserver(patchHome);
document.addEventListener('DOMContentLoaded',function(){var h=q('#page-home');if(h)observer.observe(h,{childList:true,subtree:true});patchHome()});
window.addEventListener('load',patchHome);
setTimeout(patchHome,0);setTimeout(patchHome,800);
console.info('SkillHub: native game zone enabled');
})();