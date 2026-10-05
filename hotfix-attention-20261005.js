/* SkillHub RG attention completion hotfix — 2026-10-05
   A recommendation stays visible until the RG-assigned task is actually completed.
   When all recommendation tasks for an employee are completed, the employee disappears
   from the RG "Обратить внимание" block. */
(function(){
  'use strict';

  function rawRecommendationsForUsers(users){
    const rows=[];
    for(const u of users||[]){
      for(const t of topicStats(u.login)){
        if(!t.diagnosed||!['soft','hard'].includes(t.section))continue;
        if(!['gap','attention'].includes(t.status))continue;
        rows.push({...t,login:u.login,name:u.name||u.login});
      }
    }
    return rows;
  }

  function assignedTo(a,login){
    const r=a?.recipients||[];
    return r.includes('ALL')||r.includes(login);
  }

  function latestBadTime(rec){
    const bad=(rec.rows||[]).filter(x=>Number(x.score)<Number(ADAPTIVE.target||90));
    const src=bad.length?bad:(rec.rows||[]);
    return src.reduce((m,x)=>Math.max(m,new Date(x.created_at||0).getTime()||0),0);
  }

  function relevantAssignments(rec){
    const badAt=latestBadTime(rec);
    return (S.assignments||[]).filter(a=>
      a.status==='active' &&
      assignedTo(a,rec.login) &&
      a.section===rec.section &&
      String(a.topic||'').trim()===String(rec.topic||'').trim() &&
      (new Date(a.created_at||0).getTime()||0)>=badAt
    );
  }

  function recommendationCompleted(rec){
    const assignments=relevantAssignments(rec);
    if(!assignments.length)return false;
    return assignments.every(a=>assignmentCompletedForUser(a,rec.login,S.attempts));
  }

  function activeRecommendationsForUsers(users){
    return rawRecommendationsForUsers(users).filter(r=>!recommendationCompleted(r));
  }

  function groupRecommendations(rows){
    const map=new Map();
    for(const r of rows){
      if(!map.has(r.login))map.set(r.login,{login:r.login,name:r.name||r.login,recs:[]});
      map.get(r.login).recs.push(r);
    }
    return [...map.values()];
  }

  function initialsText(name){
    return String(name||'').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'•';
  }

  function recommendationCard(g){
    const sections=[...new Set(g.recs.map(r=>secName(r.section)))];
    const worst=Math.min(...g.recs.map(r=>Number(r.avgRecent||0)));
    const severe=g.recs.some(r=>r.status==='gap');
    return `<button class="sh839-att-card" onclick="openAttentionEmployee('${jsq(g.login)}')">
      <span class="sh839-att-avatar">${esc(initialsText(g.name))}</span>
      <span class="sh839-att-card-copy">
        <span class="sh839-att-card-top"><b>${esc(g.name)}</b><span class="pill ${severe?'bad':'warn'}">${g.recs.length} ${g.recs.length===1?'рекомендация':'рекомендации'}</span></span>
        <small>${esc(sections.join(' · '))} · минимальный результат ${worst}%</small>
        <em>Открыть аналитику и рекомендации</em>
      </span>
      <span class="sh839-att-open">Открыть →</span>
    </button>`;
  }

  function updateAttentionKpi(count){
    const cards=[...document.querySelectorAll('#page-mentor .sh74-kpi')];
    const card=cards.find(x=>(x.querySelector('small')?.textContent||'').trim()==='Обратить внимание');
    if(!card)return;
    const strong=card.querySelector('strong');if(strong)strong.textContent=String(count);
    card.classList.toggle('warn',count>0);
    card.classList.toggle('good',count===0);
  }

  function repaintAttention(){
    if(S.profile?.role!=='mentor')return;
    const page=$('page-mentor');if(!page)return;
    const attention=page.querySelector('.sh837-attention');if(!attention)return;
    const users=teamRows(S.profile.login);
    const raw=rawRecommendationsForUsers(users);
    const active=activeRecommendationsForUsers(users);
    const groups=groupRecommendations(active);
    const total=active.length;

    updateAttentionKpi(groups.length);

    let body='';
    if(groups.length){
      body=`<div class="sh839-att-grid">${groups.map(recommendationCard).join('')}</div>`;
    }else if(raw.length){
      body='<div class="muted">Все рекомендации отработаны и выполнены. Вы красавчик 🎉</div>';
    }else{
      body='<div class="muted">По Soft и Hard сейчас нет подтверждённых зон развития. Аналитика появится после минимум двух попыток по теме.</div>';
    }

    attention.innerHTML=`<div class="sh74-card-head"><div><h3>Обратить внимание</h3><small>Аналитика Soft и Hard</small></div><span class="pill ${groups.length?'warn':'good'}">${total} ${total===1?'рекомендация':'рекомендаций'}</span></div>${body}`;
  }

  window.openAttentionEmployee=function(login){
    const users=teamRows(S.profile.login);
    const u=users.find(x=>x.login===login)||(S.allowed||[]).find(x=>x.login===login)||{login,name:login};
    const recs=activeRecommendationsForUsers([u]);
    if(!recs.length){
      toast('Все рекомендации по сотруднику выполнены');
      renderMentor();
      return;
    }

    const list=recs.map(r=>{
      const assignments=relevantAssignments(r);
      const available=hasTopicContent(r.section,r.topic);
      const bad=r.status==='gap';
      const state=assignments.length
        ? '<span class="pill warn">Назначено · ждём выполнения</span>'
        : available
          ? `<button class="btn primary" onclick="openRecommendedAssignment('${jsq(r.login)}','${r.section}','${jsq(r.topic)}')">Назначить рекомендованный курс</button>`
          : '<span class="muted small">По этой теме пока нет опубликованных материалов</span>';
      return `<div class="sh839-rec-card">
        <div class="sh839-rec-head"><div><span class="sh839-rec-section">${esc(secName(r.section))}</span><h3>${esc(r.topic)}</h3></div><span class="pill ${bad?'bad':'warn'}">${Math.round(Number(r.avgRecent||0))}%</span></div>
        <div class="sh839-rec-meta">${bad?'Зона развития':'Нужно закрепить'} · ${r.attempts||0} попыток</div>
        <div class="sh839-rec-reason">SkillHub рекомендует назначить курс по этой теме.</div>
        <div class="sh839-rec-actions">${state}</div>
      </div>`;
    }).join('');

    showModal(`<div class="modal-head"><div><div class="sh-manual-review-modal-kicker">Обратить внимание</div><h2>${esc(u.name||login)}</h2><div class="meta">${recs.length} ${recs.length===1?'рекомендация':'рекомендации'} SkillHub</div></div><button class="btn secondary" onclick="closeModal()">✕</button></div>
      <div class="sh839-rec-list">${list}</div>
      <div class="sh839-rec-footer"><button class="btn secondary" onclick="openAssignmentEditor({recipients:['${jsq(login)}']})">Назначить другой курс</button></div>`);
  };

  const baseRenderManagerMentor=renderManagerMentor;
  renderManagerMentor=function(){
    const r=baseRenderManagerMentor();
    repaintAttention();
    return r;
  };

  console.info('SkillHub: completed recommendation tasks are removed from RG attention');
})();
