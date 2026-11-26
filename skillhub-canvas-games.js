/* SkillHub Canvas Arcade Engine v1 - original, self-contained gameplay. */
(function(){
'use strict';
var W=1100,H=590,stylesAdded=false;

function style(){
 if(stylesAdded||document.getElementById('shcanvas-engine-style'))return;
 stylesAdded=true;var el=document.createElement('style');el.id='shcanvas-engine-style';
 el.textContent=[
 '.shcg{min-height:100dvh;background:radial-gradient(circle at 90% 15%,#4f608529,transparent 38%),linear-gradient(140deg,#0d111a,#192438 54%,#080d17);color:#f5f8ff;padding:18px clamp(12px,3vw,40px) 60px;font-family:Inter,system-ui,-apple-system,"Segoe UI",Arial,sans-serif}',
 '.shcg-inner{max-width:1380px;margin:auto}',
 '.shcg-head{display:flex;justify-content:space-between;gap:12px;align-items:center;margin:0 0 14px}',
 '.shcg-back,.shcg-pause,.shcg-audio{border:1px solid #ffffff35;background:#ffffff0c;color:#eef4fc;border-radius:13px;padding:11px 16px;font-size:13px;font-weight:780;cursor:pointer}',
 '.shcg-headright{display:flex;gap:8px}',
 '.shcg-logo{font-size:22px;font-weight:950;letter-spacing:-1px}.shcg-logo span{color:#f6c96c}',
 '.shcg-sub{font-size:10px;letter-spacing:2.3px;color:#9aacc4;font-weight:900;display:block;margin-top:3px}',
 '.shcg-title{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin:0 0 15px}',
 '.shcg-title h1{font-weight:950;font-size:clamp(26px,3.7vw,43px);margin:0 0 5px;letter-spacing:-1.4px;line-height:1.1}',
 '.shcg-title p{color:#b5c6d9;margin:0;font-size:14px;line-height:1.45}',
 '.shcg-difficulty{font-size:11px;letter-spacing:1px;color:#f4d186;padding:9px 12px;border:1px solid #e7c16c60;background:#e8bb6220;border-radius:99px;white-space:nowrap}',
 '.shcg-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:13px}',
 '.shcg-stat{min-width:0;border:1px solid #ffffff24;border-radius:15px;background:linear-gradient(160deg,#293547,#172131);padding:11px 17px;box-shadow:inset 0 1px #ffffff0f}',
 '.shcg-stat label{display:block;font-size:10px;letter-spacing:1.1px;color:#aebfd1;font-weight:830;margin-bottom:5px}',
 '.shcg-stat b{font-size:clamp(18px,2.3vw,25px);font-weight:950;color:#ffda81;line-height:1.1;font-variant-numeric:tabular-nums}',
 '.shcg-stage{position:relative;overflow:hidden;border-radius:25px;border:1px solid #d3b06c80;background:#091421;box-shadow:0 22px 55px #0009,0 0 45px #5ea7ea1a,inset 0 0 0 1px #ffffff12}',
 '.shcg-stage canvas{display:block;width:100%;height:auto;aspect-ratio:1100 / 590;touch-action:none;outline:none}',
 '.shcg-stage:after{content:"";position:absolute;inset:0;box-shadow:inset 0 0 0 1px #ffffff19,inset 0 0 55px #030b2370;pointer-events:none;border-radius:25px}',
 '.shcg-overlay{position:absolute;inset:0;display:grid;place-items:center;background:#080e18b5;backdrop-filter:blur(9px);padding:20px;z-index:4;text-align:center}',
 '.shcg-overlay[hidden]{display:none}',
 '.shcg-modal{max-width:570px;width:100%;border:1px solid #e6c06b70;border-radius:23px;padding:25px 25px 23px;background:linear-gradient(145deg,#303e51,#161f2c);box-shadow:0 20px 70px #0009}',
 '.shcg-modal .shcg-badge{display:block;font-size:11px;color:#f3d48c;letter-spacing:2px;font-weight:850}',
 '.shcg-modal h2{font-size:clamp(26px,4vw,38px);letter-spacing:-1px;margin:10px 0;line-height:1.14}',
 '.shcg-modal p{color:#d5dfeb;line-height:1.55;font-size:14px;margin:11px 0 17px}',
 '.shcg-modal strong{color:#ffe28b}',
 '.shcg-modal .shcg-cta{width:100%;display:block;border:0;border-radius:14px;background:linear-gradient(100deg,#ffe59e,#f1ba49);color:#261c0d;padding:15px 17px;font-weight:950;font-size:16px;cursor:pointer}',
 '.shcg-modal .shcg-soft{width:100%;border:1px solid #ffffff25;background:#ffffff13;color:#edf3fd;padding:12px;border-radius:12px;margin-top:9px;font-size:13px;font-weight:750;cursor:pointer}',
 '.shcg-info{display:flex;gap:12px;align-items:center;justify-content:space-between;margin-top:14px;flex-wrap:wrap}',
 '.shcg-hint{font-size:12px;color:#b9c8dd;line-height:1.5}',
 '.shcg-hint b{color:#f6d087}',
 '.shcg-controls{display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:space-between;width:100%}',
 '.shcg-answers{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;flex:1;min-width:0}',
 '.shcg-answer{min-width:0;min-height:62px;border-radius:12px;padding:10px 12px;background:#223247;border:1px solid #7890ae55;color:#f2f6fd;text-align:left;cursor:pointer}',
 '.shcg-answer b{display:block;font-size:12px;line-height:1.24}.shcg-answer small{display:block;font-size:11px;color:#b9c8da;margin-top:4px;line-height:1.3}',
 '.shcg-answer.active{border-color:#ffd67c;background:#5d48286b;box-shadow:0 0 0 2px #ffcb6d22,inset 0 0 12px #ffca4520}',
 '.shcg-answer:disabled{cursor:default;opacity:.65}',
 '.shcg-steer{display:flex;gap:7px;justify-content:center}',
 '.shcg-steer button{min-width:58px;min-height:59px;border:1px solid #91c8df6b;background:#22526b6b;color:#d7f5ff;font-size:25px;font-weight:900;border-radius:13px;touch-action:manipulation;cursor:pointer}',
 '.shcg-shot{min-width:155px;min-height:62px;border:1px solid #ffdf9b;background:linear-gradient(120deg,#ffdd88,#e8a942);color:#2d200d;font-size:16px;font-weight:950;border-radius:13px;box-shadow:0 9px 25px #f6ca6c29;cursor:pointer}',
 '.shcg-shot:disabled{opacity:.6;cursor:default}',
 '.shcg-mission{font-weight:850;color:#ffe29d;font-size:14px;flex:1;min-width:170px}',
 '.shcg-mission small{display:block;color:#aac3d9;font-size:11px;margin-bottom:3px;letter-spacing:1px}',
 '.shcg-alert{font-size:12px;color:#bfdeec;flex:1;min-width:170px}',
 '.shcg-resultscore{font-size:72px;font-weight:950;letter-spacing:-4px;color:#fbd681;line-height:1.1;margin:8px 0}',
 '.shcg-finalstats{display:flex;justify-content:center;gap:16px;flex-wrap:wrap;margin:12px 0 18px;font-size:13px;color:#d6e6f4}',
 '.shcg-finalstats span{background:#ffffff10;border:1px solid #ffffff21;border-radius:10px;padding:9px 13px}',
 '@media(max-width:740px){.shcg{padding:12px 10px 55px}.shcg-head{margin-bottom:12px}.shcg-logo{font-size:18px}.shcg-title{align-items:flex-start}.shcg-title p{font-size:12px}.shcg-difficulty{display:none}.shcg-stats{gap:6px}.shcg-stat{border-radius:11px;padding:9px 8px}.shcg-stat label{font-size:9px;letter-spacing:.3px}.shcg-stat b{font-size:16px}.shcg-stage{border-radius:15px}.shcg-stage:after{border-radius:15px}.shcg-controls{justify-content:center}.shcg-answers{width:100%;flex-basis:100%}.shcg-answer{padding:8px 7px;min-height:68px}.shcg-answer b{font-size:11px}.shcg-answer small{font-size:10px}.shcg-overlay{padding:8px}.shcg-modal{padding:17px;border-radius:15px}.shcg-modal h2{font-size:25px}.shcg-modal p{font-size:12px}.shcg-back,.shcg-pause,.shcg-audio{padding:9px 10px;font-size:12px}.shcg-hint{font-size:11px}.shcg-info{margin-top:11px}}',
 '@media(max-width:380px){.shcg-headright{gap:4px}.shcg-logo{font-size:16px}.shcg-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.shcg-title h1{font-size:25px}.shcg-answer b{font-size:10px}}',
 '@media(prefers-reduced-motion:reduce){.shcg-answer,.shcg-stage{transition:none}}'
 ].join('\n');document.head.appendChild(el);
}
var tennisCases=[
 {q:'«Опять комиссия?! Вы издеваетесь?»',a:['Проверю начисление','Успокойтесь','Верну без проверки'],good:0,why:'Проверяем основание списания, не даём пустых обещаний.'},
 {q:'«В истории два платежа. Вы списали дважды!»',a:['Да, наверняка дважды','Проверю резерв и оплату','Ничего не произошло'],good:1,why:'Один из пунктов может оказаться временным резервом.'},
 {q:'«Где мои 4 800 ₽? Поставщик не получил!»',a:['Повторите платёж','Подождите месяц','Проверю статус и реквизиты'],good:2,why:'Перед повторной отправкой нужно сверить статус и данные.'},
 {q:'«Почему вы так долго отвечаете?»',a:['Назову следующий шаг','Не задавайте вопросов','Точно решу за минуту'],good:0,why:'Нужно обозначить проверяемый следующий шаг, а не придумывать срок.'},
 {q:'«Я вам жалобу напишу!»',a:['Не надо угрожать','Помогу и зафиксирую','Тогда я отказываюсь'],good:1,why:'Право на жалобу нужно уважать и продолжать помощь.'},
 {q:'«Что в итоге вы сделали по моему вопросу?»',a:['Всё написано выше','Читайте договор','Подытожу проверку и действия'],good:2,why:'Чёткое резюме помогает клиенту понять результат.'}
];

var dispatchCases=[
 {name:'Анна',q:'Нужна выписка за прошлый месяц',kind:0},
 {name:'Максим',q:'Почему списалась комиссия?',kind:1},
 {name:'Ирина',q:'Не дошёл перевод поставщику',kind:2},
 {name:'Руслан',q:'Хочу скачать историю операций',kind:0},
 {name:'София',q:'Как отключить платную подписку?',kind:1},
 {name:'Марат',q:'Платёж отклонён, что делать?',kind:2},
 {name:'Елена',q:'Нужен документ по движению денег',kind:0},
 {name:'Олег',q:'Не согласен с платой за пакет',kind:1},
 {name:'Диана',q:'Проверить статус перевода',kind:2},
 {name:'Наталья',q:'Где посмотреть старые операции?',kind:0},
 {name:'Тимур',q:'Два списания за сервис, помогите',kind:1},
 {name:'Артур',q:'Деньги получателю не пришли',kind:2}
];
var departments=[
 {label:'ВЫПИСКИ',color:'#7adcf1',sub:'История и справки'},
 {label:'СПИСАНИЯ',color:'#efc778',sub:'Комиссии и услуги'},
 {label:'ПЛАТЕЖИ',color:'#b7a2ff',sub:'Переводы и статус'}
];

var kinds=[
 {id:'refund',label:'ВОЗВРАТ',hint:'Средства вернулись',amt:'+ 1 200 ₽',color:'#5febc4',sign:'↩'},
 {id:'hold',label:'РЕЗЕРВ',hint:'Временная блокировка',amt:'− 1 200 ₽',color:'#f6c76d',sign:'◷'},
 {id:'payment',label:'СПИСАНИЕ',hint:'Оплата исполнена',amt:'− 650 ₽',color:'#79c6ff',sign:'✓'},
 {id:'fee',label:'КОМИССИЯ',hint:'Плата за услугу',amt:'− 290 ₽',color:'#e7a0ff',sign:'◆'}
];
function clamp(v,a,b){return Math.min(b,Math.max(a,v))}
function mix(a,b,t){return a+(b-a)*t}
function rr(c,x,y,w,h,r){r=Math.max(0,Math.min(r,w/2,h/2));c.beginPath();c.moveTo(x+r,y);c.lineTo(x+w-r,y);c.quadraticCurveTo(x+w,y,x+w,y+r);c.lineTo(x+w,y+h-r);c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);c.lineTo(x+r,y+h);c.quadraticCurveTo(x,y+h,x,y+h-r);c.lineTo(x,y+r);c.quadraticCurveTo(x,y,x+r,y)}
function glowRect(c,x,y,w,h,r,fill,stroke,blur){c.save();c.shadowColor=stroke||'#f0c66c';c.shadowBlur=blur||14;rr(c,x,y,w,h,r);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke()}c.restore()}
function text(c,str,x,y,size,color,weight,align){c.fillStyle=color||'#fff';c.font=(weight||700)+' '+size+'px system-ui,"Segoe UI",sans-serif';c.textAlign=align||'left';c.textBaseline='middle';c.fillText(str,x,y)}
function fitLines(c,str,maxWidth,max){var words=str.split(/\s+/),out=[],line='';for(var i=0;i<words.length;i++){var t=(line?line+' ':'')+words[i];if(c.measureText(t).width>maxWidth&&line){out.push(line);line=words[i]}else line=t}if(line)out.push(line);return out.slice(0,max||4)}
function stars(c,t){for(var i=0;i<45;i++){var x=(i*131+37)%W,y=(i*91+17)%H,a=.1+(.12+.09*Math.sin(t*1.3+i));c.fillStyle='rgba(188,218,255,'+a+')';c.fillRect(x,y,i%7?2:3,i%7?2:3)}}
function start(opts){
 opts=opts||{};if(!opts.root)throw Error('Root missing');
 style();var mode=['runner','tennis','football','dispatch'].includes(opts.mode)?opts.mode:'tennis',root=opts.root;
 var title={runner:'Банковский раннер',tennis:'Клиентский теннис',football:'Футбольная дуэль',dispatch:'Чат-переполох'}[mode];
 var description={runner:'Перестраивайся между полосами и собирай нужные операции. Ловушки отнимают жизни.',tennis:'Выбери правильный ответ и поймай мяч ракеткой. Держи доверие клиента.',football:'Выбери ответ Алексею, поймай силу удара и забей гол.',dispatch:'Распределяй сообщения по правильным стойкам. Перетаскивай обращения и спасай очередь.'}[mode];
 var html='<section class="shcg"><div class="shcg-inner"><header class="shcg-head"><button type="button" class="shcg-back" id="shcgExit">← К играм</button><div class="shcg-logo">Skill<span>Hub</span><small class="shcg-sub">ARCADE · LIVE GAME</small></div><div class="shcg-headright"><button type="button" class="shcg-audio" id="shcgSound" title="Звуковые эффекты">♫ Вкл.</button><button type="button" class="shcg-pause" id="shcgPause">Ⅱ Пауза</button></div></header><div class="shcg-title"><div><h1>'+title+'</h1><p>'+description+'</p></div><span class="shcg-difficulty">⚡ ИГРОВОЙ РЕЖИМ</span></div><div class="shcg-stats"><div class="shcg-stat"><label>СЧЁТ</label><b id="shcgPoints">0 XP</b></div><div class="shcg-stat"><label>КОМБО</label><b id="shcgCombo">×0</b></div><div class="shcg-stat"><label>'+((mode==='tennis'||mode==='football')?'ДОВЕРИЕ':'ЦЕЛЬ')+'</label><b id="shcgTrust">'+((mode==='tennis'||mode==='football')?'48%':'0/12')+'</b></div><div class="shcg-stat"><label>ЖИЗНИ / ВРЕМЯ</label><b id="shcgLives">♥ ♥ ♥</b></div></div><div class="shcg-stage"><canvas id="shcgCanvas" width="1100" height="590" tabindex="0" role="img" aria-label="Игровое поле: управление мышью, касанием и клавиатурой"></canvas><div class="shcg-overlay" id="shcgOverlay"><div class="shcg-modal"><span class="shcg-badge">SKILLHUB · ARCADE</span><h2>'+title+'</h2><p>'+(({tennis:'Выбирай ответ клавишами 1–3. Двигай ракетку мышью или пальцем и <strong>отбивай мяч</strong>!',runner:'Лови нужные операции и <strong>меняй дорожку</strong> ← →, A/D или касанием.',football:'Выбирай ответ, затем <strong>бей по воротам</strong>, когда сила удара в зелёной зоне. Управление: 1–3 и пробел.',dispatch:'<strong>Перетащи обращение</strong> в подходящий отдел или нажми его кнопку. Спеши, клиенты ждут!'}[mode]))+'</p><button type="button" class="shcg-cta" id="shcgStart">▶ Начать игру</button><button type="button" class="shcg-soft" id="shcgTraining">Полный тренажёр</button></div></div></div><div class="shcg-info"><div class="shcg-controls" id="shcgControls"></div><div class="shcg-hint" id="shcgHint"></div></div></div></section>';
 root.innerHTML=html;
 var canvas=root.querySelector('#shcgCanvas'),c=canvas.getContext('2d');
 if(!c){root.querySelector('#shcgOverlay').innerHTML='<div class="shcg-modal"><h2>Игра недоступна</h2><p>Браузер не поддерживает Canvas 2D.</p><button class="shcg-cta" id="shcgBackFallback">К играм</button></div>';root.querySelector('#shcgBackFallback').onclick=opts.onExit;return function(){}}
 var overlay=root.querySelector('#shcgOverlay'),button=root.querySelector('#shcgPause'),soundBtn=root.querySelector('#shcgSound');
 var alive=true,playing=false,paused=false,finished=false,raf=0,last=0,time=0,score=0,combo=0,maxCombo=0,lives=3,hearts=3,correct=0,shot=0,trust=48,aim=0,position=550,keys={},effects=[],noise=0,audioEnabled=true,audioCtx=null;
 var current=0,ball={x:550,y:330,vx:100,vy:235,r:15,trail:[],flying:false,tx:0,ty:0,startX:0,startY:0,progress:0},roundDelay=0,msg='',msgGood=false,gameTime=48,runnerLane=1,spawnClock=.5,objects=[],mission=0,missionTimer=0,missionId=0,runnerTarget=12,ranAt=0,kick={active:false,progress:0,tx:550,good:false,power:0},kickDelay=0,kickPower=.5,goalkeeper=550,dispatchTime=9,dispatchDelay=0,dispatchChoice=-1,dispatchDrag=false,dispatchDragX=550,dispatchDragY=440;
 var portrait=null;
 if(opts.portrait){portrait=new Image();portrait.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(opts.portrait)}
 function beep(ok){
  if(!audioEnabled||!playing)return;
  try{if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();var o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=ok?'sine':'triangle';o.frequency.value=ok?740:185;g.gain.setValueAtTime(.0001,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.065,audioCtx.currentTime+.012);g.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+.13);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+.14)}catch(_){}
 }
 function fit(){if(!alive)return;var b=canvas.getBoundingClientRect(),dpr=Math.min(2.5,window.devicePixelRatio||1),cw=Math.max(1,Math.round(b.width*dpr)),ch=Math.max(1,Math.round(b.height*dpr));if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch}c.setTransform(cw/W,0,0,ch/H,0,0)}
 var resizeObserver=typeof ResizeObserver!=='undefined'?new ResizeObserver(fit):null;
 if(resizeObserver)resizeObserver.observe(canvas);window.addEventListener('resize',fit);
 function particles(x,y,color,n){for(var i=0;i<n;i++){var ang=Math.random()*Math.PI*2,v=60+Math.random()*220;effects.push({x:x,y:y,vx:Math.cos(ang)*v,vy:Math.sin(ang)*v,life:.6+Math.random()*.5,max:1,color:color,r:2+Math.random()*5})}}
 function updateFx(dt){for(var i=effects.length-1;i>=0;i--){var a=effects[i];a.x+=a.vx*dt;a.y+=a.vy*dt;a.vy+=65*dt;a.life-=dt;if(a.life<=0)effects.splice(i,1)}}
 function drawFx(){for(var i=0;i<effects.length;i++){var p=effects[i];c.globalAlpha=clamp(p.life,0,1);c.shadowBlur=17;c.shadowColor=p.color;c.fillStyle=p.color;c.beginPath();c.arc(p.x,p.y,p.r*clamp(p.life,0,1),0,Math.PI*2);c.fill()}c.globalAlpha=1;c.shadowBlur=0}
 function hud(){root.querySelector('#shcgPoints').textContent=score.toLocaleString('ru-RU')+' XP';root.querySelector('#shcgCombo').textContent='×'+combo;root.querySelector('#shcgTrust').textContent=(mode==='tennis'||mode==='football')?trust+'%':correct+'/'+runnerTarget;root.querySelector('#shcgLives').textContent=(mode==='tennis'||mode==='football'?'♥ '.repeat(Math.max(0,lives))+'♡ '.repeat(3-Math.max(0,lives)):'♥ '.repeat(Math.max(0,lives))+' · '+Math.max(0,Math.ceil(mode==='runner'?gameTime:dispatchTime))+'с')}
 function steer(l){runnerLane=clamp(l,0,2)}
 function updateControls(){
  var el=root.querySelector('#shcgControls');
  if(mode==='tennis'||mode==='football'){
   var choiceCases=tennisCases;
   el.innerHTML='<div class="shcg-answers">'+choiceCases[Math.min(current,5)].a.map((x,i)=>'<button type="button" class="shcg-answer'+(aim===i?' active':'')+'" data-aim="'+i+'"><b>'+String(i+1)+'. '+x+'</b><small>'+(i===aim?'✓ Выбрано':'Выбрать ответ')+'</small></button>').join('')+'</div>'+
    (mode==='tennis'?'<div class="shcg-steer"><button type="button" data-step="-1" aria-label="Передвинуть ракетку влево">←</button><button type="button" data-step="1" aria-label="Передвинуть ракетку вправо">→</button></div>':'<button type="button" class="shcg-shot" id="shcgKick">⚽ УДАР!</button>');
   el.querySelectorAll('[data-aim]').forEach(b=>b.onclick=()=>{if(!playing||paused||roundDelay>0||kick.active||kickDelay>0||ball.flying)return;aim=Number(b.dataset.aim);updateControls()});
   if(mode==='tennis'){
    el.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>{if(!playing||paused)return;position=clamp(position+Number(b.dataset.step)*90,110,990)});
    root.querySelector('#shcgHint').textContent='Выбери ответ (1–3), затем отбей мяч мышью, пальцем или стрелками';
   }else{
    el.querySelector('#shcgKick').onclick=shoot;
    root.querySelector('#shcgHint').textContent='Выбери ответ (1–3), поймай силу удара в зелёной зоне и нажми «УДАР!» / пробел';
   }
  }else if(mode==='runner'){
   el.innerHTML='<div class="shcg-mission"><small>СОБИРАЙ ТОЛЬКО</small><span id="shcgTarget">'+kinds[mission].label+'</span></div><div class="shcg-steer"><button data-run="-1" aria-label="Сменить полосу влево">←</button><button data-run="1" aria-label="Сменить полосу вправо">→</button></div><div class="shcg-alert">Дорожки переключаются также клавишами A/D или касанием экрана.</div>';
   el.querySelectorAll('[data-run]').forEach(b=>b.onclick=()=>steer(runnerLane+Number(b.dataset.run)));
   root.querySelector('#shcgHint').textContent='Собери 12 верных операций · Ошибки отнимают жизни';
  }else{
   el.innerHTML='<div class="shcg-answers">'+departments.map((x,i)=>'<button type="button" class="shcg-answer" data-department="'+i+'"><b>'+String(i+1)+'. '+x.label+'</b><small>'+x.sub+'</small></button>').join('')+'</div>';
   el.querySelectorAll('[data-department]').forEach(b=>b.onclick=()=>dispatchChoose(Number(b.dataset.department)));
   root.querySelector('#shcgHint').textContent='Перетяни карточку к отделу или нажми 1, 2, 3 · Успей распределить 12 обращений';
  }
 }
 function fillBg(){
  var sky=c.createLinearGradient(0,0,W,H);sky.addColorStop(0,'#131f35');sky.addColorStop(.5,'#132e46');sky.addColorStop(1,'#070f1e');c.fillStyle=sky;c.fillRect(0,0,W,H);
  c.save();var light=c.createRadialGradient(550,145,10,550,145,480);light.addColorStop(0,'#7ab9df45');light.addColorStop(1,'#0e162200');c.fillStyle=light;c.fillRect(0,0,W,H);c.restore();
  stars(c,time);
  for(var n=0;n<9;n++){var x=20+n*138;c.fillStyle=n%2?'#253c51':'#1a3045';c.fillRect(x,20,42,220);c.fillStyle='#88c4e622';c.fillRect(x+8,20,8,185);c.fillStyle='#f7c77755';c.fillRect(x+3,224,48,5)}
 }
 function drawTennis(){
  fillBg();
  var floor=c.createLinearGradient(0,270,0,H);floor.addColorStop(0,'#102f4c');floor.addColorStop(.55,'#133251');floor.addColorStop(1,'#0a1e37');c.fillStyle=floor;c.beginPath();c.moveTo(180,278);c.lineTo(920,278);c.lineTo(1090,590);c.lineTo(10,590);c.closePath();c.fill();
  c.lineWidth=3;c.strokeStyle='#63bce888';c.stroke();
  for(var k=0;k<8;k++){var z=k/8,y=280+310*z*z;c.strokeStyle='#7fc9ec24';c.lineWidth=2;c.beginPath();c.moveTo(mix(180,10,z),y);c.lineTo(mix(920,1090,z),y);c.stroke()}
  for(var j=0;j<=3;j++){c.beginPath();c.moveTo(180+j*740/3,278);c.lineTo(10+j*1080/3,590);c.strokeStyle='#89dbff38';c.stroke()}
  c.save();c.shadowBlur=30;c.shadowColor='#47cafa';c.strokeStyle='#53ccfd';c.lineWidth=4;c.beginPath();c.moveTo(10,583);c.lineTo(1090,583);c.stroke();c.restore();
  // premium response gates
  for(var i=0;i<3;i++){
   var x=55+i*338,col=i===aim?'#f5cd73':'#6295b5',shade=i===aim?'#5a472dcc':'#1c2d42e6';
   glowRect(c,x,154,312,123,15,shade,col,i===aim?30:9);
   text(c,'0'+(i+1),x+22,177,14,col,900);
   c.font='800 21px system-ui';var lines=fitLines(c,tennisCases[Math.min(current,tennisCases.length-1)].a[i],262,2);
   lines.forEach((v,j)=>text(c,v,x+22,207+j*30,20,'#f6f7ff',800));
   if(i===aim){text(c,'● НАВЕДЕНО',x+289,176,11,'#ffe4a8',900,'right')}
  }
  glowRect(c,65,30,93,93,28,'#313c58','#e7b66a',18);
  if(portrait&&portrait.complete&&portrait.naturalWidth){c.save();rr(c,72,36,79,79,22);c.clip();c.drawImage(portrait,72,36,79,79);c.restore()}else text(c,'😠',112,80,47,'#fff',900,'center');
  glowRect(c,175,34,870,92,18,'#17253bf5','#78a9bd88',6);
  text(c,'КЛИЕНТ АТАКУЕТ',197,55,12,'#f4bb74',900);
  c.font='800 26px system-ui';fitLines(c,tennisCases[Math.min(current,tennisCases.length-1)].q,808,2).forEach((v,i)=>text(c,v,197,83+i*27,25,'#f9fbff',800));
  // paddle and tennis ball
  c.save();c.shadowColor='#45d5f9';c.shadowBlur=33;glowRect(c,position-102,517,204,22,10,'#5ce0ff','#b7f7ff',21);glowRect(c,position-67,519,134,11,5,'#e8c77c','#fff5c1',13);c.restore();
  if(ball.trail.length){c.save();for(var q=0;q<ball.trail.length;q++){var t=ball.trail[q];c.globalAlpha=(q+1)/ball.trail.length*.36;c.fillStyle='#6edaff';c.beginPath();c.arc(t.x,t.y,ball.r*(q+1)/ball.trail.length,0,Math.PI*2);c.fill()}c.restore()}
  c.save();c.shadowBlur=24;c.shadowColor=ball.flying?'#91f9ba':'#ffbe72';var grad=c.createRadialGradient(ball.x-4,ball.y-6,2,ball.x,ball.y,ball.r+8);grad.addColorStop(0,'#fffce8');grad.addColorStop(.42,ball.flying?'#9bfac1':'#ffe08c');grad.addColorStop(1,ball.flying?'#2deba1':'#f97d63');c.fillStyle=grad;c.beginPath();c.arc(ball.x,ball.y,ball.r,0,Math.PI*2);c.fill();c.restore();
  if(roundDelay>0){glowRect(c,365,340,370,55,14,msgGood?'#17513eee':'#5f2734ee',msgGood?'#80efb4':'#fa8e96',23);text(c,msg,550,367,23,'#fff',900,'center')}
  drawFx();
 }
 function resetBall(){
  aim=tennisCases[current].good===0?1:0;position=550;ball.x=280+Math.random()*540;ball.y=303;ball.vx=(Math.random()-.5)*95;ball.vy=112+current*12;ball.flying=false;ball.progress=0;ball.trail=[];ball.delay=current===0?1.5:.75;roundDelay=0;updateControls();hud();
 }
 function tennisResolve(good,hitX,miss){
  if(roundDelay>0||finished)return;
  if(good){correct++;combo++;maxCombo=Math.max(maxCombo,combo);trust=clamp(trust+11,0,100);score+=200+combo*65;msg='★ ОТЛИЧНЫЙ ОТВЕТ  +'+(200+combo*65)+' XP';particles(hitX,330,'#75ffc0',32)}else{combo=0;trust=clamp(trust-14,0,100);lives--;msg=miss?'МЯЧ ПРОПУЩЕН! −1 ♥':'НЕВЕРНЫЙ ОТВЕТ! −1 ♥';particles(hitX,330,'#ff8d92',24)}
  msgGood=good;roundDelay=1.85;beep(good);hud();
 }
 function updateTennis(dt){
  if(roundDelay>0){roundDelay-=dt;if(roundDelay<=0){current++;if(current>=tennisCases.length||lives<=0){gameOver()}else resetBall()}return}
  if(ball.delay>0){ball.delay-=dt;return}
  if(!ball.flying){
   if(keys.ArrowLeft||keys.KeyA)position=clamp(position-520*dt,112,988);
   if(keys.ArrowRight||keys.KeyD)position=clamp(position+520*dt,112,988);
   ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;
   if(ball.x<40||ball.x>W-40){ball.vx=-ball.vx;ball.x=clamp(ball.x,40,W-40)}
   if(ball.y>=506&&ball.y<535){if(Math.abs(ball.x-position)<115){
     ball.flying=true;ball.progress=0;ball.startX=ball.x;ball.startY=ball.y;ball.tx=210+338*aim;ball.ty=213;particles(ball.x,510,'#7df0ff',17);beep(true);
   }else tennisResolve(false,ball.x,true)}
   else if(ball.y>545)tennisResolve(false,ball.x,true);
  }else{
   ball.progress+=dt*1.45;var p=clamp(ball.progress,0,1);
   ball.x=mix(ball.startX,ball.tx,p);ball.y=mix(ball.startY,ball.ty,p)-105*Math.sin(p*Math.PI);
   if(p>=1)tennisResolve(aim===tennisCases[current].good,ball.tx,false);
  }
  ball.trail.push({x:ball.x,y:ball.y});if(ball.trail.length>13)ball.trail.shift();
 }
 // 3 lane data-runner geometry and crisp original vector visual
 function runnerX(l,y){var z=clamp((y-120)/445,0,1);return 550+(l-1)*(57+294*z)}
 function drawRunner(){
  fillBg();
  // neon skyline and run corridor
  for(var k=0;k<13;k++){var xx=k*90-20,h=75+(k*57)%125;var shade=k%2?'#152b42':'#1b354e';c.fillStyle=shade;c.fillRect(xx,185-h,56,h);for(var j=0;j<4;j++){c.fillStyle='#eec67a66';c.fillRect(xx+9+j*12,206-h,5,7);c.fillRect(xx+9+j*12,229-h,5,7)}}
  var road=c.createLinearGradient(0,120,0,H);road.addColorStop(0,'#1e5375');road.addColorStop(.5,'#173955');road.addColorStop(1,'#0b213a');c.beginPath();c.moveTo(480,120);c.lineTo(620,120);c.lineTo(1060,590);c.lineTo(40,590);c.closePath();c.fillStyle=road;c.fill();c.lineWidth=5;c.strokeStyle='#55ceff99';c.stroke();
  c.save();c.lineWidth=3;c.shadowColor='#5bdcff';c.shadowBlur=13;
  for(var l=0;l<4;l++){var x1=480+l*140/3,x2=40+l*1020/3;c.beginPath();c.moveTo(x1,120);c.lineTo(x2,590);c.strokeStyle=l===0||l===3?'#72daff':'#a2bfff55';c.stroke()}
  c.restore();
  for(var j=0;j<18;j++){var z=((j/18)+time*.55%1)%1;var y=120+470*z*z;var rw=mix(140,1020,z);c.strokeStyle='rgba(131,216,249,'+(0.06+z*.24)+')';c.beginPath();c.moveTo(550-rw/2,y);c.lineTo(550+rw/2,y);c.stroke()}
  // current target beacon
  glowRect(c,300,15,500,87,17,'#15273aed',kinds[mission].color,20);
  text(c,'МИССИЯ: СОБЕРИ НУЖНЫЕ ОПЕРАЦИИ',550,38,12,'#c2d7e5',900,'center');text(c,kinds[mission].label,550,75,31,kinds[mission].color,950,'center');
  objects.sort((a,b)=>a.z-b.z);
  for(var oi=0;oi<objects.length;oi++){
   var obj=objects[oi],kind=kinds[obj.type],z=obj.z,yy=122+440*z*z,xx=runnerX(obj.lane,yy),scale=.42+z*.85;
   c.save();c.translate(xx,yy);c.scale(scale,scale);
   var ok=obj.type===mission;
   glowRect(c,-105,-48,210,96,16,ok?'#174747e8':'#263248ed',kind.color,ok?25:11);
   glowRect(c,-89,-32,54,62,11,kind.color+'33',kind.color,5);
   text(c,kind.sign,-62,0,32,kind.color,900,'center');
   text(c,kind.label,-25,-16,16,'#ffffff',900);text(c,kind.amt,-25,18,17,kind.color,900);
   c.restore();
  }
  var playerX=runnerX(runnerLane,507);
  c.save();c.translate(playerX,511);
  c.shadowBlur=24;c.shadowColor='#76eaff';c.fillStyle='#6be6ff25';c.beginPath();c.ellipse(0,47,87,18,0,0,2*Math.PI);c.fill();
  var glow=c.createLinearGradient(-80,0,80,0);glow.addColorStop(0,'#3cccea');glow.addColorStop(.5,'#e9dd8e');glow.addColorStop(1,'#34c8fa');
  rr(c,-69,-26,138,58,19);c.fillStyle='#0b314c';c.fill();c.lineWidth=4;c.strokeStyle=glow;c.stroke();
  c.beginPath();c.moveTo(-27,-18);c.lineTo(0,-49);c.lineTo(27,-18);c.closePath();c.fillStyle='#ffe3a6';c.fill();
  text(c,'SH',0,8,27,'#c5f4ff',950,'center');
  c.restore();
  drawFx();
 }
 function spawn(){
  var type=Math.random()<.54?mission:Math.floor(Math.random()*kinds.length),lane=Math.floor(Math.random()*3);
  objects.push({type,lane,z:0,hit:false});
 }
 function updateRunner(dt){
  gameTime-=dt;if(Math.ceil(gameTime)!==Math.ceil(gameTime+dt))hud();missionTimer+=dt;spawnClock-=dt;
  if(missionTimer>=12){missionTimer=0;mission=(mission+1)%kinds.length;objects=[];root.querySelector('#shcgTarget').textContent=kinds[mission].label;particles(550,155,kinds[mission].color,27);beep(true)}
  if(spawnClock<=0){spawn();spawnClock=.98+Math.random()*.37-Math.min(.22,(48-gameTime)*.004)}
  for(var i=objects.length-1;i>=0;i--){var o=objects[i];o.z+=dt*(.29+(48-gameTime)*.004);
   if(o.z>=1){objects.splice(i,1);if(o.lane===runnerLane){
    if(o.type===mission){correct++;combo++;maxCombo=Math.max(maxCombo,combo);score+=130+Math.min(combo,10)*40;particles(runnerX(o.lane,511),505,kinds[o.type].color,22);beep(true)}
    else{lives--;combo=0;particles(runnerX(o.lane,511),505,'#ff7777',23);beep(false)}
    hud();
   }}
  }
  if(gameTime<=0||lives<=0||correct>=runnerTarget)gameOver();
 }

 function drawFootball(){
  fillBg();
  // stadium floodlights, crowd tiers, pitch
  var halo=c.createRadialGradient(550,180,30,550,180,520);halo.addColorStop(0,'#f7da8339');halo.addColorStop(1,'#213c5b00');c.fillStyle=halo;c.fillRect(0,0,W,H);
  for(var n=0;n<9;n++){var x=n*144-20;c.fillStyle=n%2?'#19283a':'#26354a';c.fillRect(x,185,130,80);for(var j=0;j<14;j++){c.fillStyle=j%2?'#e7c9748c':'#66a1d182';c.fillRect(x+j*9,209+(j%3)*11,4,4)}}
  var grass=c.createLinearGradient(0,360,0,590);grass.addColorStop(0,'#205747');grass.addColorStop(.7,'#15513d');grass.addColorStop(1,'#092f2f');c.fillStyle=grass;c.beginPath();c.moveTo(90,364);c.lineTo(1010,364);c.lineTo(1098,590);c.lineTo(2,590);c.fill();
  c.lineWidth=3;c.strokeStyle='#b6f1d04e';c.beginPath();c.moveTo(150,366);c.lineTo(950,366);c.lineTo(1060,585);c.lineTo(40,585);c.closePath();c.stroke();
  for(var j=0;j<6;j++){var p=j/6,y=400+185*p*p;c.beginPath();c.moveTo(110-p*110,y);c.lineTo(990+p*110,y);c.strokeStyle='#d0ffda16';c.stroke()}
  // goal, net and glowing answer targets
  c.save();c.shadowColor='#94d5eb';c.shadowBlur=17;c.strokeStyle='#e1f5f8';c.lineWidth=11;rr(c,77,165,946,215,8);c.stroke();c.restore();
  c.lineWidth=1;c.strokeStyle='#d7eff138';
  for(var k=0;k<18;k++){var x=94+k*52;c.beginPath();c.moveTo(x,175);c.lineTo(x,375);c.stroke()}
  for(var k=0;k<8;k++){var y=188+k*26;c.beginPath();c.moveTo(88,y);c.lineTo(1010,y);c.stroke()}
  for(var i=0;i<3;i++){
   var x=105+i*299,color=i===aim?'#ffd47f':'#80b2d6',bg=i===aim?'#806129b5':'#152f4fc2';
   glowRect(c,x,188,280,138,13,bg,color,i===aim?28:8);
   text(c,'ЗОНА '+(i+1),x+18,213,12,color,900);
   c.font='800 20px system-ui';fitLines(c,tennisCases[Math.min(current,5)].a[i],246,3).forEach((v,j)=>text(c,v,x+18,247+j*28,19,'#f8fafd',900));
  }
  // goalkeeper movement is intentionally visible and game-like
  var gx=goalkeeper;
  c.save();c.translate(gx,356);c.shadowColor='#62bcff';c.shadowBlur=23;
  c.fillStyle='#15263a';rr(c,-24,-31,48,78,9);c.fill();
  c.strokeStyle='#71d5fc';c.lineWidth=7;c.beginPath();c.moveTo(-18,0);c.lineTo(-52,-28);c.moveTo(18,0);c.lineTo(52,-28);c.moveTo(-10,37);c.lineTo(-24,56);c.moveTo(10,37);c.lineTo(24,56);c.stroke();
  c.beginPath();c.arc(0,-54,22,0,Math.PI*2);c.fillStyle='#d7ab8b';c.fill();c.strokeStyle='#ffe2bf';c.lineWidth=3;c.stroke();
  c.fillStyle='#26222e';c.beginPath();c.arc(0,-62,20,Math.PI,2*Math.PI);c.fill();
  text(c,'SH',0,7,21,'#ffda8b',900,'center');c.restore();
  // Alexey voice bubble, portrait
  glowRect(c,55,20,91,91,24,'#2d3e55','#e8bf77',15);
  if(portrait&&portrait.complete&&portrait.naturalWidth){c.save();rr(c,62,27,77,77,20);c.clip();c.drawImage(portrait,62,27,77,77);c.restore()}else text(c,'😏',101,66,42,'#fff',900,'center');
  glowRect(c,165,22,878,86,16,'#152438ed','#7ba9c877',7);
  text(c,'АЛЕКСЕЙ АТАКУЕТ',184,40,12,'#ffca7e',950);
  c.font='800 25px system-ui';fitLines(c,tennisCases[Math.min(current,5)].q,828,2).forEach((v,j)=>text(c,v,184,69+j*26,24,'#f8faff',850));
  // shooting ball, curve + glowing accuracy meter
  var bx=550,by=503;
  if(kick.active){
   var p=clamp(kick.progress,0,1);bx=mix(550,kick.tx,p);by=mix(502,286,p)-122*Math.sin(Math.PI*p);
   c.save();c.strokeStyle='#f8d48b77';c.lineWidth=8;c.shadowColor='#ffdc8a';c.shadowBlur=24;c.beginPath();c.moveTo(550,502);c.quadraticCurveTo(mix(550,kick.tx,.5),340,bx,by);c.stroke();c.restore();
  }
  c.save();c.shadowColor='#ffe29a';c.shadowBlur=25;c.fillStyle='#fff4cf';c.beginPath();c.arc(bx,by,kick.active?14-5*kick.progress:23,0,Math.PI*2);c.fill();c.strokeStyle='#5d6e77';c.lineWidth=3;c.stroke();text(c,'★',bx,by,15,'#384d5f',900,'center');c.restore();
  glowRect(c,350,548,400,25,12,'#071625bd','#b3cbe766',4);
  c.fillStyle='#3fdf9675';c.fillRect(350+400*.35,553,400*.48,15);
  c.fillStyle='#f4d27b';c.fillRect(350,553,clamp(kickPower,0,1)*400,15);
  c.save();c.shadowColor='#ffe4a6';c.shadowBlur=18;c.fillStyle='#fff4bc';c.fillRect(348+clamp(kickPower,0,1)*400,545,5,31);c.restore();
  text(c,'СИЛА УДАРА · ЛОВИ ЗЕЛЁНУЮ ЗОНУ',550,536,12,'#e8f2ff',850,'center');
  if(kickDelay>0){glowRect(c,365,419,370,56,13,msgGood?'#16513fe8':'#5c2f3beb',msgGood?'#74f2bd':'#ff9a99',23);text(c,msg,550,447,23,'#fff',900,'center')}
  drawFx();
 }
 function shoot(){
  if(mode!=='football'||!playing||paused||finished||kick.active||kickDelay>0)return;
  kick={active:true,progress:0,tx:228+322*aim,power:kickPower,good:aim===tennisCases[current].good&&kickPower>=.35&&kickPower<=.83};
  beep(true);
  var b=root.querySelector('#shcgKick');if(b)b.disabled=true;
 }
 function updateFootball(dt){
  goalkeeper=550+140*Math.sin(time*1.75);
  if(kickDelay>0){kickDelay-=dt;if(kickDelay<=0){current++;if(current>=tennisCases.length||lives<=0)gameOver();else{aim=(current+1)%3;kick.active=false;kickDelay=0;updateControls();hud()}}return}
  if(!kick.active){kickPower=(Math.sin(time*3.6)+1)/2;return}
  kick.progress+=dt*1.18;
  if(kick.progress>=1){
   kick.active=false;var good=kick.good;
   if(good){correct++;combo++;maxCombo=Math.max(combo,maxCombo);trust=clamp(trust+12,0,100);score+=240+combo*75;msg='⚽ ГОООЛ! +'+(240+combo*75)+' XP';particles(kick.tx,280,'#7cffbe',38)}
   else{lives--;combo=0;trust=clamp(trust-13,0,100);msg=kick.power<.35||kick.power>.83?'СИЛА УДАРА ПОДВЕЛА!':'СЕЙВ АЛЕКСЕЯ!';particles(kick.tx,280,'#fa929c',30)}
   msgGood=good;kickDelay=1.65;beep(good);hud();
  }
 }
 function drawDispatch(){
  fillBg();
  var lens=c.createRadialGradient(550,280,50,550,280,500);lens.addColorStop(0,'#79c7ff34');lens.addColorStop(1,'#243f5f00');c.fillStyle=lens;c.fillRect(0,0,W,H);
  // animated support floor and three customer service portals
  glowRect(c,255,20,590,83,16,'#142638e8','#c7ad6b9b',16);
  text(c,'ВОЗЬМИ ОБРАЩЕНИЕ И НАПРАВЬ В ПРАВИЛЬНЫЙ ОТДЕЛ',550,47,17,'#edf6fd',900,'center');
  text(c,'КЛИЕНТЫ ЖДУТ · РЕШЕНИЕ ЗА СЕКУНДЫ',550,77,12,'#bbcede',800,'center');
  for(var i=0;i<3;i++){
   var d=departments[i],x=50+i*339,high=dispatchDrag&&Math.abs(dispatchDragX-(x+151))<170;
   glowRect(c,x,152,317,165,17,high?'#2b4d61':'#15283be8',d.color,high?30:13);
   glowRect(c,x+24,171,51,51,12,d.color+'26',d.color,7);
   text(c,i===0?'▤':i===1?'◇':'⇄',x+50,196,31,d.color,900,'center');
   text(c,d.label,x+91,197,21,'#f7fbff',900);
   text(c,d.sub,x+24,252,15,'#bdcede',730);
   text(c,'СТОЙКА 0'+(i+1),x+286,293,11,d.color,900,'right');
  }
  // conveyor
  c.fillStyle='#0c2335';rr(c,80,352,940,198,20);c.fill();c.strokeStyle='#61bada89';c.lineWidth=3;c.stroke();
  for(var j=0;j<12;j++){var xx=(j*110+(time*115)%110)%940+80;c.fillStyle='#e9cf8d28';c.fillRect(xx,363,5,178)}
  text(c,'ОЧЕРЕДЬ ЧАТОВ',110,376,12,'#8cbcd4',880);
  text(c,'ЗАЯВКА '+String(Math.min(current+1,dispatchCases.length)).padStart(2,'0')+' / '+dispatchCases.length,982,376,12,'#e2c47a',880,'right');
  var dcase=dispatchCases[Math.min(current,dispatchCases.length-1)];
  var tx=dispatchDrag?dispatchDragX:550,ty=dispatchDrag?dispatchDragY:455;
  if(dispatchDelay>0&&dispatchChoice>=0){var z=1-clamp(dispatchDelay/.75,0,1);tx=mix(550,211+339*dispatchChoice,z);ty=mix(455,236,z)}
  c.save();c.translate(tx,ty);c.rotate(dispatchDrag?Math.sin(time*5)*.025:0);
  glowRect(c,-335,-69,670,138,17,'#e8f1fa','#a2cfe5',dispatchDrag?30:14);
  c.fillStyle='#1f5672';rr(c,-317,-50,82,98,14);c.fill();text(c,dcase.name[0],-276,0,47,'#ffe4a5',950,'center');
  text(c,dcase.name,-217,-31,19,'#273d53',900);
  c.font='800 24px system-ui';fitLines(c,dcase.q,500,2).forEach((v,j)=>text(c,v,-217,7+j*29,23,'#182f44',880));
  c.restore();
  // deadline urgency indicator
  glowRect(c,344,558,411,18,9,'#0d1c2b','#b4cfdd7b',4);
  var ratio=clamp(dispatchTime/((current%4===3)?6:9),0,1);c.fillStyle=ratio>.4?'#76deb1':'#ff9e8f';rr(c,347,561,Math.max(0,405*ratio),12,6);c.fill();
  text(c,'ВРЕМЯ НА ОБРАЩЕНИЕ: '+Math.max(0,Math.ceil(dispatchTime))+' с',550,536,13,'#d8ebf7',850,'center');
  if(dispatchDelay>0){glowRect(c,365,335,370,52,12,msgGood?'#1a624fec':'#603741ed',msgGood?'#79f1bc':'#fb999b',18);text(c,msg,550,360,20,'#fff',900,'center')}
  drawFx();
 }
 function dispatchChoose(lane){
  if(mode!=='dispatch'||!playing||paused||finished||dispatchDelay>0)return;
  var good=lane===dispatchCases[current].kind;
  dispatchChoice=lane;
  if(good){correct++;combo++;maxCombo=Math.max(maxCombo,combo);score+=160+combo*60+(dispatchTime>4?100:0);msg='★ ОТПРАВЛЕНО ВЕРНО!';particles(211+339*lane,244,'#79eec0',24)}
  else{lives--;combo=0;msg=lane<0?'ВРЕМЯ ИСТЕКЛО!':'НЕ ТОТ ОТДЕЛ!';particles(550,440,'#fb8f95',22)}
  msgGood=good;dispatchDelay=.75;beep(good);hud();
 }
 function updateDispatch(dt){
  if(dispatchDelay>0){dispatchDelay-=dt;if(dispatchDelay<=0){current++;if(current>=dispatchCases.length||lives<=0)gameOver();else{dispatchTime=current%4===3?6:9;dispatchChoice=-1;dispatchDrag=false;hud()}}return}
  dispatchTime-=dt;if(Math.ceil(dispatchTime)!==Math.ceil(dispatchTime+dt))hud();
  if(dispatchTime<=0)dispatchChoose(-1);
 }

 function gameOver(){
  if(finished||!alive)return;finished=true;playing=false;paused=false;root.querySelector('#shcgPause').disabled=true;
  var pct=mode==='tennis'||mode==='football'?Math.round(correct/tennisCases.length*100):Math.round(clamp(correct/runnerTarget,0,1)*100);
  if(typeof opts.onSave==='function')opts.onSave(pct);
  var win=mode==='tennis'||mode==='football'?correct>=4&&lives>0:correct>=runnerTarget;
  overlay.hidden=false;
  overlay.innerHTML='<div class="shcg-modal"><span class="shcg-badge">МИССИЯ ЗАВЕРШЕНА</span><h2>'+(win?'🏆 Победа!':'⚡ Новый рекорд ждёт!')+'</h2><div class="shcg-resultscore">'+pct+'%</div><p>'+(mode==='tennis'?'Точных отбиваний: '+correct+' из '+tennisCases.length+'. Доверие клиента: '+trust+'%.':mode==='football'?'Забито голов: '+correct+' из '+tennisCases.length+'. Доверие Алексея: '+trust+'%.':mode==='dispatch'?'Правильно распределено обращений: '+correct+' из '+dispatchCases.length+'.':'Верных операций: '+correct+'. Смена закончена, но каждую новую игру можно пройти лучше.')+'</p><div class="shcg-finalstats"><span>★ '+score+' XP</span><span>⚡ Комбо ×'+maxCombo+'</span><span>♥ '+Math.max(0,lives)+' жизни</span></div><button id="shcgAgain" class="shcg-cta">▶ Сыграть ещё раз</button><button id="shcgTrain" class="shcg-soft">Полный тренажёр</button><button id="shcgHome" class="shcg-soft">К игровым режимам</button></div>';
  overlay.querySelector('#shcgAgain').onclick=opts.onRestart||function(){start(opts)};
  overlay.querySelector('#shcgTrain').onclick=opts.onTraining;
  overlay.querySelector('#shcgHome').onclick=opts.onExit;
 }
 function pause(){if(!alive||finished)return;paused=true;playing=false;button.textContent='▶ Продолжить';overlay.hidden=false;overlay.innerHTML='<div class="shcg-modal"><span class="shcg-badge">ПАУЗА</span><h2>Игра на паузе</h2><p>Продолжишь с того же места. Очки и жизни сохраняются.</p><button type="button" class="shcg-cta" id="shcgResume">▶ Продолжить игру</button><button type="button" class="shcg-soft" id="shcgLeave">К играм</button></div>';overlay.querySelector('#shcgResume').onclick=resume;overlay.querySelector('#shcgLeave').onclick=opts.onExit}
 function resume(){if(!alive||finished)return;paused=false;playing=true;overlay.hidden=true;button.textContent='Ⅱ Пауза';last=performance.now();canvas.focus({preventScroll:true})}
 function begin(){if(!alive)return;playing=true;paused=false;finished=false;overlay.hidden=true;button.disabled=false;last=performance.now();current=0;time=0;score=0;combo=0;correct=0;trust=48;lives=3;gameTime=48;runnerLane=1;spawnClock=.7;mission=0;missionTimer=0;objects=[];effects=[];kick.active=false;kickDelay=0;kickPower=.5;dispatchTime=9;dispatchDelay=0;dispatchChoice=-1;dispatchDrag=false;aim=0;if(mode==='tennis')resetBall();else updateControls();hud();canvas.focus({preventScroll:true})}
 function pointer(e){
  if(!playing||paused||finished)return;
  var b=canvas.getBoundingClientRect(),x=clamp((e.clientX-b.left)*W/b.width,0,W),y=clamp((e.clientY-b.top)*H/b.height,0,H);
  if(mode==='tennis')position=clamp(x,112,988);
  else if(mode==='runner')steer(clamp(Math.floor(x/W*3),0,2));
  else if(mode==='dispatch'&&dispatchDrag){dispatchDragX=x;dispatchDragY=y}
 }
 function onDown(e){
  if(!playing||paused||finished)return;
  var b=canvas.getBoundingClientRect(),x=clamp((e.clientX-b.left)*W/b.width,0,W),y=clamp((e.clientY-b.top)*H/b.height,0,H);
  if(mode==='dispatch'&&dispatchDelay<=0&&y>=340&&y<=545){dispatchDrag=true;dispatchDragX=x;dispatchDragY=y;if(canvas.setPointerCapture)try{canvas.setPointerCapture(e.pointerId)}catch(_){}}
  else if(mode==='dispatch'&&y>=135&&y<=330)dispatchChoose(clamp(Math.floor(x/W*3),0,2));
  else if(mode==='football'&&y>160&&y<350&&!kick.active&&kickDelay<=0){aim=clamp(Math.floor(x/W*3),0,2);updateControls()}
  else pointer(e);
 }
 function onPointerUp(e){
  if(!playing||paused||finished||mode!=='dispatch'||!dispatchDrag)return;
  var b=canvas.getBoundingClientRect(),x=clamp((e.clientX-b.left)*W/b.width,0,W);
  dispatchDrag=false;dispatchChoose(clamp(Math.floor(x/W*3),0,2));
 }
 function onKey(e){
  if(!alive||!playing||paused||finished)return;
  if(['ArrowLeft','ArrowRight','Space','Digit1','Digit2','Digit3','KeyA','KeyD'].includes(e.code))e.preventDefault();
  keys[e.code]=true;
  if(mode==='tennis'||mode==='football'){
   if(/^Digit[123]$/.test(e.code)&&roundDelay<=0&&!ball.flying&&!kick.active&&kickDelay<=0){aim=Number(e.code.slice(-1))-1;updateControls()}
   if(mode==='football'&&e.code==='Space')shoot();
  }else if(mode==='runner'){
   if(e.code==='ArrowLeft'||e.code==='KeyA')steer(runnerLane-1);
   else if(e.code==='ArrowRight'||e.code==='KeyD')steer(runnerLane+1);
   else if(/^Digit[123]$/.test(e.code))steer(Number(e.code.slice(-1))-1);
  }else if(mode==='dispatch'&&/^Digit[123]$/.test(e.code))dispatchChoose(Number(e.code.slice(-1))-1);
 }
 function onUp(e){keys[e.code]=false}
 function onVisibility(){if(document.hidden&&playing)pause()}
 canvas.addEventListener('pointermove',pointer);canvas.addEventListener('pointerdown',onDown);canvas.addEventListener('pointerup',onPointerUp);canvas.addEventListener('pointercancel',onPointerUp);
 window.addEventListener('keydown',onKey);window.addEventListener('keyup',onUp);document.addEventListener('visibilitychange',onVisibility);
 root.querySelector('#shcgExit').onclick=opts.onExit;
 root.querySelector('#shcgStart').onclick=begin;
 root.querySelector('#shcgTraining').onclick=opts.onTraining;
 button.onclick=function(){if(!finished){if(playing)pause();else if(paused)resume()}};
 soundBtn.onclick=function(){audioEnabled=!audioEnabled;soundBtn.textContent=audioEnabled?'♫ Вкл.':'♫ Выкл.'};
 // Render continuously for crisp animated environment; game state updates only when active.
 function tick(now){
  if(!alive)return;var dt=clamp((now-(last||now))/1000,0,.05);last=now;time+=dt*.8;
  c.clearRect(0,0,W,H);
  if(playing&&!paused&&!finished){if(mode==='tennis')updateTennis(dt);else if(mode==='runner')updateRunner(dt);else if(mode==='football')updateFootball(dt);else updateDispatch(dt);updateFx(dt)}
  if(mode==='tennis')drawTennis();else if(mode==='runner')drawRunner();else if(mode==='football')drawFootball();else drawDispatch();
  raf=requestAnimationFrame(tick);
 }
 fit();updateControls();hud();raf=requestAnimationFrame(tick);
 return function stop(){
  if(!alive)return;alive=false;cancelAnimationFrame(raf);window.removeEventListener('resize',fit);window.removeEventListener('keydown',onKey);window.removeEventListener('keyup',onUp);document.removeEventListener('visibilitychange',onVisibility);
  if(resizeObserver)resizeObserver.disconnect();canvas.removeEventListener('pointermove',pointer);canvas.removeEventListener('pointerdown',onDown);canvas.removeEventListener('pointerup',onPointerUp);canvas.removeEventListener('pointercancel',onPointerUp);if(audioCtx){audioCtx.close().catch(function(){});audioCtx=null}
 };
}
window.SkillHubCanvasGames={start:start,version:'1.0'};
})();