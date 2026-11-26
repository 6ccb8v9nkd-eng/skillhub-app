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
var kinds=[
 {id:'refund',label:'ВОЗВРАТ',hint:'Средства вернулись',amt:'+ 1 200 ₽',color:'#5febc4',sign:'↩'},
 {id:'hold',label:'РЕЗЕРВ',hint:'Временная блокировка',amt:'− 1 200 ₽',color:'#f6c76d',sign:'◷'},
 {id:'payment',label:'СПИСАНИЕ',hint:'Оплата исполнена',amt:'− 650 ₽',color:'#79c6ff',sign:'✓'},
 {id:'fee',label:'КОМИССИЯ',hint:'Плата за услугу',amt:'− 290 ₽',color:'#e7a0ff',sign:'◆'}
];
function clamp(v,a,b){return Math.min(b,Math.max(a,v))}
function mix(a,b,t){return a+(b-a)*t}
function rr(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r)}
function glowRect(c,x,y,w,h,r,fill,stroke,blur){c.save();c.shadowColor=stroke||'#f0c66c';c.shadowBlur=blur||14;rr(c,x,y,w,h,r);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke()}c.restore()}
function text(c,str,x,y,size,color,weight,align){c.fillStyle=color||'#fff';c.font=(weight||700)+' '+size+'px system-ui,"Segoe UI",sans-serif';c.textAlign=align||'left';c.textBaseline='middle';c.fillText(str,x,y)}
function fitLines(c,str,maxWidth,max){var words=str.split(/\s+/),out=[],line='';for(var i=0;i<words.length;i++){var t=(line?line+' ':'')+words[i];if(c.measureText(t).width>maxWidth&&line){out.push(line);line=words[i]}else line=t}if(line)out.push(line);return out.slice(0,max||4)}
function stars(c,t){for(var i=0;i<45;i++){var x=(i*131+37)%W,y=(i*91+17)%H,a=.1+(.12+.09*Math.sin(t*1.3+i));c.fillStyle='rgba(188,218,255,'+a+')';c.fillRect(x,y,i%7?2:3,i%7?2:3)}}
function start(opts){
 opts=opts||{};if(!opts.root)throw Error('Root missing');
 style();var mode=opts.mode==='runner'?'runner':'tennis',root=opts.root;
 var title=mode==='runner'?'Банковский раннер':'Клиентский теннис';
 var description=mode==='runner'?'Перестраивайся между полосами и собирай нужные операции. Ловушки отнимают жизни.':'Выбери правильный ответ и поймай мяч ракеткой. Держи доверие клиента.';
 var html='<section class="shcg"><div class="shcg-inner"><header class="shcg-head"><button type="button" class="shcg-back" id="shcgExit">← К играм</button><div class="shcg-logo">Skill<span>Hub</span><small class="shcg-sub">ARCADE · LIVE GAME</small></div><div class="shcg-headright"><button type="button" class="shcg-audio" id="shcgSound" title="Звуковые эффекты">♫ Вкл.</button><button type="button" class="shcg-pause" id="shcgPause">Ⅱ Пауза</button></div></header><div class="shcg-title"><div><h1>'+title+'</h1><p>'+description+'</p></div><span class="shcg-difficulty">⚡ ИГРОВОЙ РЕЖИМ</span></div><div class="shcg-stats"><div class="shcg-stat"><label>СЧЁТ</label><b id="shcgPoints">0 XP</b></div><div class="shcg-stat"><label>КОМБО</label><b id="shcgCombo">×0</b></div><div class="shcg-stat"><label>'+(mode==='tennis'?'ДОВЕРИЕ':'ЦЕЛЬ')+'</label><b id="shcgTrust">'+(mode==='tennis'?'48%':'0/12')+'</b></div><div class="shcg-stat"><label>ЖИЗНИ / ВРЕМЯ</label><b id="shcgLives">♥ ♥ ♥</b></div></div><div class="shcg-stage"><canvas id="shcgCanvas" width="1100" height="590" tabindex="0" role="img" aria-label="Игровое поле: управление мышью, касанием и клавиатурой"></canvas><div class="shcg-overlay" id="shcgOverlay"><div class="shcg-modal"><span class="shcg-badge">SKILLHUB · ARCADE</span><h2>'+title+'</h2><p>'+(mode==='tennis'?'Выбирай ответ кнопками снизу или клавишами 1–3. Передвигай ракетку мышью, пальцем или стрелками. <strong>Отбей летящий мяч</strong>!':'Лови только нужные банковские операции. <strong>Меняй дорожку</strong> стрелками ← →, A/D или касанием. Не собирай неверные записи!')+'</p><button type="button" class="shcg-cta" id="shcgStart">▶ Начать игру</button><button type="button" class="shcg-soft" id="shcgTraining">Полный тренажёр</button></div></div></div><div class="shcg-info"><div class="shcg-controls" id="shcgControls"></div><div class="shcg-hint" id="shcgHint"></div></div></div></section>';
 root.innerHTML=html;
 var canvas=root.querySelector('#shcgCanvas'),c=canvas.getContext('2d');
 if(!c){root.querySelector('#shcgOverlay').innerHTML='<div class="shcg-modal"><h2>Игра недоступна</h2><p>Браузер не поддерживает Canvas 2D.</p><button class="shcg-cta" id="shcgBackFallback">К играм</button></div>';root.querySelector('#shcgBackFallback').onclick=opts.onExit;return function(){}}
 var overlay=root.querySelector('#shcgOverlay'),button=root.querySelector('#shcgPause'),soundBtn=root.querySelector('#shcgSound');
 var alive=true,playing=false,paused=false,finished=false,raf=0,last=0,time=0,score=0,combo=0,maxCombo=0,lives=3,hearts=3,correct=0,shot=0,trust=48,aim=0,position=550,keys={},effects=[],noise=0,audioEnabled=true,audioCtx=null;
 var current=0,ball={x:550,y:330,vx:100,vy:235,r:15,trail:[],flying:false,tx:0,ty:0,startX:0,startY:0,progress:0},roundDelay=0,msg='',msgGood=false,gameTime=48,runnerLane=1,spawnClock=.5,objects=[],mission=0,missionTimer=0,missionId=0,runnerTarget=12,ranAt=0;
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
 function hud(){root.querySelector('#shcgPoints').textContent=score.toLocaleString('ru-RU')+' XP';root.querySelector('#shcgCombo').textContent='×'+combo;root.querySelector('#shcgTrust').textContent=mode==='tennis'?trust+'%':correct+'/'+runnerTarget;root.querySelector('#shcgLives').textContent=(mode==='tennis'?'♥ '.repeat(Math.max(0,lives))+'♡ '.repeat(3-Math.max(0,lives)):'♥ '.repeat(Math.max(0,lives))+' · '+Math.max(0,Math.ceil(gameTime))+'с')}
 function steer(l){runnerLane=clamp(l,0,2)}
 function updateControls(){
  var el=root.querySelector('#shcgControls');
  if(mode==='tennis'){
   el.innerHTML='<div class="shcg-answers">'+tennisCases[current].a.map((x,i)=>'<button type="button" class="shcg-answer'+(aim===i?' active':'')+'" data-aim="'+i+'"><b>'+String(i+1)+'. '+x+'</b><small>'+(i===aim?'✓ Выбрано':'Выбрать ответ')+'</small></button>').join('')+'</div><div class="shcg-steer"><button type="button" data-step="-1" aria-label="Передвинуть ракетку влево">←</button><button type="button" data-step="1" aria-label="Передвинуть ракетку вправо">→</button></div>';
   el.querySelectorAll('[data-aim]').forEach(b=>b.onclick=()=>{if(!playing||paused||roundDelay>0||ball.flying)return;aim=Number(b.dataset.aim);updateControls()});
   el.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>{if(!playing||paused)return;position=clamp(position+Number(b.dataset.step)*90,110,990)});
   root.querySelector('#shcgHint').textContent='Управление: ← → или мышь/палец · Цель: ответ + удар';
  }else{
   el.innerHTML='<div class="shcg-mission"><small>СОБИРАЙ ТОЛЬКО</small><span id="shcgTarget">'+kinds[mission].label+'</span></div><div class="shcg-steer"><button data-run="-1" aria-label="Сменить полосу влево">←</button><button data-run="1" aria-label="Сменить полосу вправо">→</button></div><div class="shcg-alert">Дорожки переключаются также клавишами A/D или касанием экрана.</div>';
   el.querySelectorAll('[data-run]').forEach(b=>b.onclick=()=>steer(runnerLane+Number(b.dataset.run)));
   root.querySelector('#shcgHint').textContent='Собери 12 верных операций · Ошибки отнимают жизни';
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
   c.font='800 21px system-ui';var lines=fitLines(c,tennisCases[current].a[i],262,2);
   lines.forEach((v,j)=>text(c,v,x+22,207+j*30,20,'#f6f7ff',800));
   if(i===aim){text(c,'● НАВЕДЕНО',x+289,176,11,'#ffe4a8',900,'right')}
  }
  glowRect(c,65,30,93,93,28,'#313c58','#e7b66a',18);
  if(portrait&&portrait.complete&&portrait.naturalWidth){c.save();rr(c,72,36,79,79,22);c.clip();c.drawImage(portrait,72,36,79,79);c.restore()}else text(c,'😠',112,80,47,'#fff',900,'center');
  glowRect(c,175,34,870,92,18,'#17253bf5','#78a9bd88',6);
  text(c,'КЛИЕНТ АТАКУЕТ',197,55,12,'#f4bb74',900);
  c.font='800 26px system-ui';fitLines(c,tennisCases[current].q,808,2).forEach((v,i)=>text(c,v,197,83+i*27,25,'#f9fbff',800));
  // paddle and tennis ball
  c.save();c.shadowColor='#45d5f9';c.shadowBlur=33;glowRect(c,position-102,517,204,22,10,'#5ce0ff','#b7f7ff',21);glowRect(c,position-67,519,134,11,5,'#e8c77c','#fff5c1',13);c.restore();
  if(ball.trail.length){c.save();for(var q=0;q<ball.trail.length;q++){var t=ball.trail[q];c.globalAlpha=(q+1)/ball.trail.length*.36;c.fillStyle='#6edaff';c.beginPath();c.arc(t.x,t.y,ball.r*(q+1)/ball.trail.length,0,Math.PI*2);c.fill()}c.restore()}
  c.save();c.shadowBlur=24;c.shadowColor=ball.flying?'#91f9ba':'#ffbe72';var grad=c.createRadialGradient(ball.x-4,ball.y-6,2,ball.x,ball.y,ball.r+8);grad.addColorStop(0,'#fffce8');grad.addColorStop(.42,ball.flying?'#9bfac1':'#ffe08c');grad.addColorStop(1,ball.flying?'#2deba1':'#f97d63');c.fillStyle=grad;c.beginPath();c.arc(ball.x,ball.y,ball.r,0,Math.PI*2);c.fill();c.restore();
  if(roundDelay>0){glowRect(c,365,340,370,55,14,msgGood?'#17513eee':'#5f2734ee',msgGood?'#80efb4':'#fa8e96',23);text(c,msg,550,367,23,'#fff',900,'center')}
  drawFx();
 }
 function resetBall(){
  aim=tennisCases[current].good===0?1:0;position=550;ball.x=280+Math.random()*540;ball.y=303;ball.vx=(Math.random()-.5)*95;ball.vy=190+current*17;ball.flying=false;ball.progress=0;ball.trail=[];roundDelay=0;updateControls();hud();
 }
 function tennisResolve(good,hitX,miss){
  if(roundDelay>0||finished)return;
  if(good){correct++;combo++;maxCombo=Math.max(maxCombo,combo);trust=clamp(trust+11,0,100);score+=200+combo*65;msg='★ ОТЛИЧНЫЙ ОТВЕТ  +'+(200+combo*65)+' XP';particles(hitX,330,'#75ffc0',32)}else{combo=0;trust=clamp(trust-14,0,100);lives--;msg=miss?'МЯЧ ПРОПУЩЕН! −1 ♥':'НЕВЕРНЫЙ ОТВЕТ! −1 ♥';particles(hitX,330,'#ff8d92',24)}
  msgGood=good;roundDelay=1.85;beep(good);hud();
 }
 function updateTennis(dt){
  if(roundDelay>0){roundDelay-=dt;if(roundDelay<=0){current++;if(current>=tennisCases.length||lives<=0){gameOver()}else resetBall()}return}
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
  gameTime-=dt;missionTimer+=dt;spawnClock-=dt;
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
 function gameOver(){
  if(finished||!alive)return;finished=true;playing=false;paused=false;root.querySelector('#shcgPause').disabled=true;
  var pct=mode==='tennis'?Math.round(correct/tennisCases.length*100):Math.round(clamp(correct/runnerTarget,0,1)*100);
  if(typeof opts.onSave==='function')opts.onSave(pct);
  var win=mode==='tennis'?correct>=4&&lives>0:correct>=runnerTarget;
  overlay.hidden=false;
  overlay.innerHTML='<div class="shcg-modal"><span class="shcg-badge">МИССИЯ ЗАВЕРШЕНА</span><h2>'+(win?'🏆 Победа!':'⚡ Новый рекорд ждёт!')+'</h2><div class="shcg-resultscore">'+pct+'%</div><p>'+(mode==='tennis'?'Точных отбиваний: '+correct+' из '+tennisCases.length+'. Доверие клиента: '+trust+'%.':'Верных операций: '+correct+'. Смена закончена, но каждую новую игру можно пройти лучше.')+'</p><div class="shcg-finalstats"><span>★ '+score+' XP</span><span>⚡ Комбо ×'+maxCombo+'</span><span>♥ '+Math.max(0,lives)+' жизни</span></div><button id="shcgAgain" class="shcg-cta">▶ Сыграть ещё раз</button><button id="shcgTrain" class="shcg-soft">Полный тренажёр</button><button id="shcgHome" class="shcg-soft">К игровым режимам</button></div>';
  overlay.querySelector('#shcgAgain').onclick=opts.onRestart||function(){start(opts)};
  overlay.querySelector('#shcgTrain').onclick=opts.onTraining;
  overlay.querySelector('#shcgHome').onclick=opts.onExit;
 }
 function pause(){if(!alive||finished)return;paused=true;playing=false;button.textContent='▶ Продолжить';overlay.hidden=false;overlay.innerHTML='<div class="shcg-modal"><span class="shcg-badge">ПАУЗА</span><h2>Игра на паузе</h2><p>Продолжишь с того же места. Очки и жизни сохраняются.</p><button type="button" class="shcg-cta" id="shcgResume">▶ Продолжить игру</button><button type="button" class="shcg-soft" id="shcgLeave">К играм</button></div>';overlay.querySelector('#shcgResume').onclick=resume;overlay.querySelector('#shcgLeave').onclick=opts.onExit}
 function resume(){if(!alive||finished)return;paused=false;playing=true;overlay.hidden=true;button.textContent='Ⅱ Пауза';last=performance.now();canvas.focus({preventScroll:true})}
 function begin(){if(!alive)return;playing=true;paused=false;finished=false;overlay.hidden=true;button.disabled=false;last=performance.now();current=0;time=0;score=0;combo=0;correct=0;trust=48;lives=3;gameTime=48;runnerLane=1;spawnClock=.7;mission=0;missionTimer=0;objects=[];effects=[];if(mode==='tennis')resetBall();else updateControls();hud();canvas.focus({preventScroll:true})}
 function pointer(e){
  if(!playing||paused)return;
  var b=canvas.getBoundingClientRect();var x=clamp((e.clientX-b.left)*W/b.width,0,W);if(mode==='tennis')position=clamp(x,112,988);else steer(clamp(Math.floor(x/W*3),0,2));
 }
 function onKey(e){
  if(!alive||!playing||paused||finished)return;
  if(['ArrowLeft','ArrowRight','Space','Digit1','Digit2','Digit3','KeyA','KeyD'].includes(e.code)){e.preventDefault()}
  keys[e.code]=true;
  if(mode==='tennis'){if(/^Digit[123]$/.test(e.code)&&roundDelay<=0&&!ball.flying){aim=Number(e.code.slice(-1))-1;updateControls()}}
  else if(e.code==='ArrowLeft'||e.code==='KeyA')steer(runnerLane-1);else if(e.code==='ArrowRight'||e.code==='KeyD')steer(runnerLane+1);else if(/^Digit[123]$/.test(e.code))steer(Number(e.code.slice(-1))-1);
 }
 function onUp(e){keys[e.code]=false}
 function onVisibility(){if(document.hidden&&playing)pause()}
 canvas.addEventListener('pointermove',pointer);canvas.addEventListener('pointerdown',pointer);
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
  if(playing&&!paused&&!finished){if(mode==='tennis')updateTennis(dt);else updateRunner(dt);updateFx(dt)}
  if(mode==='tennis')drawTennis();else drawRunner();
  raf=requestAnimationFrame(tick);
 }
 fit();updateControls();hud();raf=requestAnimationFrame(tick);
 return function stop(){
  if(!alive)return;alive=false;cancelAnimationFrame(raf);window.removeEventListener('resize',fit);window.removeEventListener('keydown',onKey);window.removeEventListener('keyup',onUp);document.removeEventListener('visibilitychange',onVisibility);
  if(resizeObserver)resizeObserver.disconnect();canvas.removeEventListener('pointermove',pointer);canvas.removeEventListener('pointerdown',pointer);if(audioCtx){audioCtx.close().catch(function(){});audioCtx=null}
 };
}
window.SkillHubCanvasGames={start:start,version:'1.0'};
})();