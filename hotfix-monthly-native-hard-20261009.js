/* SkillHub monthly attestation: reuse native Hard Skills presentation.
   UI/interaction layer only; the monthly run, scoring and saved answers stay in the monthly runner.
*/
(function(){
  'use strict';

  const H={checkId:null,items:[],loadedFor:null,loading:null,states:new Map(),wrapped:false,busy:false};
  const q=s=>document.querySelector(s);
  const esc=s=>typeof window.esc==='function'?window.esc(s):String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const js=s=>String(s??'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");

  function client(){try{return window.S?.sb||null}catch(_){return null}}
  function isMonthlyRun(){return !!q('#page-run .sh-mr-wrap')}
  function currentIndex(){
    const t=q('#page-run .sh-mr-top-main b')?.textContent||'';
    const m=t.match(/(\d+)\s*\/\s*(\d+)/);
    return m?Math.max(0,Number(m[1])-1):0;
  }
  function currentItem(){return H.items[currentIndex()]||null}

  async function loadItems(checkId){
    if(!checkId||!client())return;
    if(H.loadedFor===checkId&&H.items.length)return;
    if(H.loading)return H.loading;
    H.loading=(async()=>{
      const r=await client().from('monthly_check_items').select('id,check_id,position,kind,snapshot,max_score').eq('check_id',checkId).order('position',{ascending:true});
      if(!r.error){H.items=r.data||[];H.loadedFor=checkId}
      H.loading=null;
    })();
    return H.loading;
  }

  function stateFor(item){
    if(!H.states.has(item.id))H.states.set(item.id,{placements:{},selected:null});
    return H.states.get(item.id);
  }

  function nativeShell(caseEl,kind){
    caseEl.className=`card sh-month-native-hard ${kind||''}`.trim();
    caseEl.dataset.shMonthlyNativeHard='1';
  }

  function sortCardHtml(item,c,placedIn){
    const st=stateFor(item),selected=st.selected===c.id;
    const click=placedIn?`shMonthlyNativeHardReturn('${js(item.id)}','${js(c.id)}')`:`shMonthlyNativeHardSelect('${js(item.id)}','${js(c.id)}')`;
    return `<button type="button" class="sh-hard-sort-card${selected?' is-selected':''}" draggable="true" ondragstart="shMonthlyNativeHardDrag(event,'${js(item.id)}','${js(c.id)}')" onclick="${click}"><span>${esc(c.text||'')}</span></button>`;
  }

  function renderSort(item,caseEl){
    const s=item.snapshot||{},p=s.payload||{},cards=Array.isArray(p.cards)?p.cards:[],cats=Array.isArray(p.categories)?p.categories:[];
    if(!cards.length||!cats.length)return false;
    const st=stateFor(item),placed=st.placements||{};
    const pool=cards.filter(c=>!placed[c.id]);
    const zones=cats.map(cat=>{
      const inZone=cards.filter(c=>placed[c.id]===cat.id);
      return `<div class="sh-hard-sort-zone" onclick="shMonthlyNativeHardPlaceSelected('${js(item.id)}','${js(cat.id)}')" ondragover="event.preventDefault()" ondrop="shMonthlyNativeHardDrop(event,'${js(item.id)}','${js(cat.id)}')">
        <div class="sh-hard-sort-zone-head"><span>${esc(cat.icon||'')}</span><div><h3>${esc(cat.title||'Категория')}</h3><p>${esc(cat.hint||'')}</p></div><b>${inZone.length}</b></div>
        <div class="sh-hard-sort-zone-body">${inZone.length?inZone.map(c=>sortCardHtml(item,c,cat.id)).join(''):'<div class="sh-hard-sort-empty">Поместите сюда карточки</div>'}</div>
      </div>`;
    }).join('');
    const hidden=cards.map((c,i)=>`<select data-sh-sort="${i}" data-sh-card="${esc(c.id)}" style="display:none"><option value=""></option>${cats.map(cat=>`<option value="${esc(cat.id)}"${placed[c.id]===cat.id?' selected':''}>${esc(cat.title||cat.id)}</option>`).join('')}</select>`).join('');
    const done=Object.keys(placed).length===cards.length;
    nativeShell(caseEl,'sh-hard-sort-shell');
    caseEl.innerHTML=`
      <div class="sh-hard-sort-intro"><span class="pill">Карточки</span><h2>${esc(p.question||s.title||'Распределите карточки')}</h2><p>${esc(p.instruction||'Распределите карточки по подходящим категориям.')}</p><div class="sh-hard-sort-tip">На телефоне: нажмите на карточку, затем на нужную колонку.</div></div>
      <div class="sh-hard-sort-pool"><div class="sh-hard-sort-pool-head"><b>Карточки для распределения</b>${st.selected?`<span>Карточка выбрана — нажмите на нужную колонку</span>`:''}</div><div class="sh-hard-sort-pool-body">${pool.length?pool.map(c=>sortCardHtml(item,c,null)).join(''):'<div class="sh-hard-sort-empty">Все карточки распределены</div>'}</div></div>
      <div class="sh-hard-sort-grid">${zones}</div>
      <div class="sh-month-native-hidden">${hidden}</div>
      <div class="actions" style="justify-content:flex-end;margin-top:16px"><button type="button" class="btn primary" ${done?'':'disabled'} onclick="shMonthlyNativeHardSubmitSort('${js(item.id)}')">Ответить</button></div>`;
    return true;
  }

  function scenarioFacts(p){
    const facts=Array.isArray(p.facts)?p.facts:[];
    if(!facts.length)return'';
    return `<div class="sh-hard-sc-facts">${facts.map(f=>`<div class="${esc(f.tone||'')}"><span>${esc(f.label||'')}</span><strong>${esc(f.value||'')}</strong></div>`).join('')}</div>`;
  }
  function scenarioAction(a){
    if(!a||(!a.title&&!a.amount&&!a.recipient&&!a.purpose&&!a.queue))return'';
    const meta=[a.queue?`Очередность: ${esc(a.queue)}`:'',a.purpose?`Назначение: ${esc(a.purpose)}`:''].filter(Boolean);
    return `<div class="sh-hard-sc-wants"><div class="sh-hard-sc-wants-head"><span>КЛИЕНТ ХОЧЕТ</span><b>${esc(a.title||'Действие')}</b></div><div class="sh-hard-sc-wants-main">${a.amount?`<strong>${esc(a.amount)}</strong>`:''}${a.recipient?`<span>${esc(a.recipient)}</span>`:''}</div>${meta.length?`<div class="sh-hard-sc-wants-meta">${meta.map(x=>`<span>${x}</span>`).join('')}</div>`:''}</div>`;
  }
  function renderScenario(item,caseEl){
    const s=item.snapshot||{},p=s.payload||{},opts=Array.isArray(p.options)?p.options:Array.isArray(p.answers)?p.answers:[];
    if(!opts.length)return false;
    nativeShell(caseEl,'sh-hard-sc-shell');
    caseEl.innerHTML=`
      <div class="actions sh-hard-sc-top"><span class="sh-hard-sc-kicker">СИТУАЦИОННАЯ ЗАДАЧА</span><span class="muted small">${esc(s.topic||'')}</span></div>
      <h2>${esc(s.title||'Ситуационная задача')}</h2>
      <div class="sh-hard-sc-scenario"><div class="sh-hard-sc-scenario-head"><div class="sh-hard-sc-scenario-icon">🏛</div><div><span>СИТУАЦИЯ</span><b>${esc(p.agency||s.topic||'Рабочая ситуация')}</b></div></div><p>${esc(p.scenario||p.situation||'')}</p>${scenarioFacts(p)}${scenarioAction(p.action)}</div>
      <div class="sh-hard-sc-question"><span>ВОПРОС СОТРУДНИКУ</span><strong>${esc(p.question||s.question||'Какое решение верное?')}</strong></div>
      <div class="sh-hard-sc-options">${opts.map((o,i)=>`<button type="button" class="sh-hard-sc-option" onclick="shMonthlyScenarioAnswer('${js(item.id)}',${i})"><span class="sh-hard-sc-option-num">${i+1}</span><span>${esc(o)}</span></button>`).join('')}</div>`;
    return true;
  }

  function renderTariff(item,caseEl){
    const s=item.snapshot||{},p=s.payload||{};
    if(!p.step1||!p.step2)return false;
    const second=!!q('#page-run #shMrNumber');
    nativeShell(caseEl,'sh-tcalc-shell');
    if(!second){
      const facts=Array.isArray(p.facts)?`<div class="sh-tcalc-facts">${p.facts.map(f=>`<div class="${esc(f.tone||'')}"><span>${esc(f.label||'')}</span><strong>${esc(f.value||'')}</strong></div>`).join('')}</div>`:'';
      caseEl.innerHTML=`
        <div class="sh-tcalc-progress"><span class="active">1</span><i></i><span>2</span><b>Шаг 1 из 2</b></div>
        <div class="sh-tcalc-scenario"><div class="sh-tcalc-scenario-head"><div class="sh-tcalc-icon">₽</div><div><span>СИТУАЦИЯ</span><b>${esc(p.label||s.topic||'Тарифы')}</b></div></div>${p.scenario?`<p>${esc(p.scenario)}</p>`:''}${facts}</div>
        <div class="sh-tcalc-question"><span>ВОПРОС СОТРУДНИКУ</span><strong>${esc(p.step1.prompt||p.question||'Рассчитайте сумму')}</strong></div>
        <form class="sh-tcalc-form" onsubmit="event.preventDefault();shMonthlyNativeTariffStep1('${js(item.id)}')"><label for="shMrNativeTariff1">Ответ</label><div class="sh-tcalc-input"><input id="shMrNativeTariff1" type="text" inputmode="decimal" autocomplete="off" placeholder="Введите сумму"><span>${esc(p.step1.unit||'₽')}</span></div><small>Посчитайте самостоятельно и введите только число.</small><button class="btn primary" type="submit">Ответить →</button></form>`;
    }else{
      const cond=Array.isArray(p.step2.condition)?`<div class="sh-tcalc-step2-conditions">${p.step2.condition.map(c=>`<div><span>${esc(c.label||'')}</span><strong>${esc(c.value||'')}</strong></div>`).join('')}</div>`:'';
      caseEl.innerHTML=`
        <div class="sh-tcalc-progress"><span class="done">1</span><i></i><span class="active">2</span><b>Шаг 2 из 2</b></div>
        <div class="sh-tcalc-client"><div class="sh-tcalc-client-mark">2</div><div><span>НОВОЕ УСЛОВИЕ ОТ КЛИЕНТА</span><p>${esc(p.step2.client||'')}</p></div></div>${cond}
        <div class="sh-tcalc-question"><span>ВОПРОС СОТРУДНИКУ</span><strong>${esc(p.step2.question||'Рассчитайте ответ')}</strong></div>
        <div class="sh-tcalc-form"><label for="shMrNumber">Ответ</label><div class="sh-tcalc-input"><input id="shMrNumber" type="number" inputmode="decimal" placeholder="Введите сумму"><span>${esc(p.step2.unit||'₽')}</span></div><small>Введите только число.</small><button class="btn primary" type="button" onclick="shMonthlyCalcNumber('${js(item.id)}')">Ответить →</button></div>`;
    }
    return true;
  }

  function enhance(){
    if(H.busy||!isMonthlyRun()||!H.items.length)return;
    const item=currentItem();if(!item||item.kind!=='hard')return;
    const caseEl=q('#page-run .sh-mr-case');if(!caseEl)return;
    if(caseEl.dataset.shMonthlyNativeHard==='1')return;
    const p=item.snapshot?.payload||{};
    H.busy=true;
    try{
      if(p.mode==='sort_cards')renderSort(item,caseEl);
      else if(p.mode==='scenario')renderScenario(item,caseEl);
      else if(p.mode==='tariff_calc')renderTariff(item,caseEl);
    }finally{H.busy=false}
  }

  window.shMonthlyNativeHardSelect=function(itemId,cardId){
    const item=H.items.find(x=>x.id===itemId);if(!item)return;const st=stateFor(item);st.selected=st.selected===cardId?null:cardId;const el=q('#page-run .sh-month-native-hard');if(el){el.dataset.shMonthlyNativeHard='';enhance()}
  };
  window.shMonthlyNativeHardPlaceSelected=function(itemId,catId){
    const item=H.items.find(x=>x.id===itemId);if(!item)return;const st=stateFor(item);if(!st.selected)return;st.placements[st.selected]=catId;st.selected=null;const el=q('#page-run .sh-month-native-hard');if(el){el.dataset.shMonthlyNativeHard='';enhance()}
  };
  window.shMonthlyNativeHardReturn=function(itemId,cardId){
    const item=H.items.find(x=>x.id===itemId);if(!item)return;const st=stateFor(item);delete st.placements[cardId];st.selected=null;const el=q('#page-run .sh-month-native-hard');if(el){el.dataset.shMonthlyNativeHard='';enhance()}
  };
  window.shMonthlyNativeHardDrag=function(ev,itemId,cardId){try{ev.dataTransfer.setData('text/plain',cardId);ev.dataTransfer.effectAllowed='move'}catch(_){}};
  window.shMonthlyNativeHardDrop=function(ev,itemId,catId){ev.preventDefault();const cardId=ev.dataTransfer?.getData('text/plain');const item=H.items.find(x=>x.id===itemId);if(!item||!cardId)return;const st=stateFor(item);st.placements[cardId]=catId;st.selected=null;const el=q('#page-run .sh-month-native-hard');if(el){el.dataset.shMonthlyNativeHard='';enhance()}};
  window.shMonthlyNativeHardSubmitSort=function(itemId){
    const item=H.items.find(x=>x.id===itemId);if(!item)return;const st=stateFor(item),cards=item.snapshot?.payload?.cards||[];
    if(cards.some(c=>!st.placements[c.id])){window.toast?.('Распределите все карточки');return}
    cards.forEach((c,i)=>{const el=q(`#page-run [data-sh-sort="${i}"]`);if(el)el.value=st.placements[c.id]||''});
    if(typeof window.shMonthlySubmitSort==='function')window.shMonthlySubmitSort(itemId);
  };
  window.shMonthlyNativeTariffStep1=function(itemId){
    const item=H.items.find(x=>x.id===itemId);if(!item)return;const p=item.snapshot?.payload||{},el=q('#shMrNativeTariff1');
    const raw=String(el?.value||'').replace(/\s+/g,'').replace(/₽/g,'').replace(',','.').replace(/[^0-9.\-]/g,'');const value=Number(raw);
    if(!Number.isFinite(value)){window.toast?.('Введите число');return}
    const expected=Number(p.step1?.answer),tol=Number(p.step1?.tolerance||0),ok=Number.isFinite(expected)&&Math.abs(value-expected)<=tol;
    const right=Number(p.correct),answers=Array.isArray(p.answers)?p.answers:[];
    let idx=ok?right:answers.findIndex((_,i)=>i!==right);if(idx<0)idx=right===0?1:0;
    if(typeof window.shMonthlyCalcChoice==='function')window.shMonthlyCalcChoice(itemId,idx);
  };

  function wrapBegin(){
    if(H.wrapped||typeof window.shMonthlyBegin!=='function')return false;
    const base=window.shMonthlyBegin;
    window.shMonthlyBegin=async function(id){H.checkId=id;await loadItems(id);const r=await base.apply(this,arguments);setTimeout(enhance,30);return r};
    H.wrapped=true;return true;
  }

  if(!document.getElementById('shMonthlyNativeHardStyle')){
    const st=document.createElement('style');st.id='shMonthlyNativeHardStyle';st.textContent=`
      .sh-month-native-hard{max-width:none!important;border-radius:24px!important;padding:22px!important;overflow:visible!important}
      .sh-month-native-hard .sh-hard-sort-intro{padding-top:0}
      .sh-month-native-hidden{display:none!important}
      .sh-month-native-hard .sh-hard-sort-card{touch-action:manipulation}
      @media(max-width:720px){.sh-month-native-hard{padding:14px!important;border-radius:20px!important}.sh-month-native-hard .sh-hard-sort-intro h2{font-size:22px!important}.sh-month-native-hard .sh-hard-sort-grid{grid-template-columns:1fr!important}}
    `;document.head.appendChild(st);
  }

  const obs=new MutationObserver(()=>setTimeout(enhance,0));
  const page=q('#page-run');if(page)obs.observe(page,{childList:true,subtree:true});
  if(!wrapBegin()){const t=setInterval(()=>{if(wrapBegin())clearInterval(t)},250);setTimeout(()=>clearInterval(t),10000)}
  console.info('SkillHub: monthly native Hard UI enabled');
})();
