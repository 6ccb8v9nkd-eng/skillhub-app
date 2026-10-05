/* SkillHub RG employee actions — 2026-10-05 */
(function(){
  'use strict';
  const baseRenderEmployees=renderEmployees;

  function currentMentorEmployee(login){
    return (S.allowed||[]).find(x=>x.login===login&&x.role==='employee'&&x.active!==false&&S.profile?.role==='mentor'&&x.manager_login===S.profile.login)||null;
  }

  window.shRgNewCode=async function(login){
    const x=currentMentorEmployee(login);if(!x)return;
    return x.claimed_user_id?resetAccess(login):makeCode(login);
  };

  window.shRgOpenManagement=function(login){
    const x=currentMentorEmployee(login);if(!x)return;
    showModal(`<div class="modal-head"><div><h2>Управление сотрудником</h2><div class="meta">${esc(x.name||x.login)} · ${esc(x.login)}</div></div><button class="btn secondary" onclick="closeModal()">✕</button></div><div class="card" style="margin-top:12px"><div class="employee-row"><div><b>Открепить</b><div class="meta">Сотрудник останется в SkillHub. PIN, результаты и история сохранятся; другой РГ сможет закрепить его за собой.</div></div><button class="btn secondary" onclick="shRgDetach('${jsq(login)}')">Открепить</button></div><div class="employee-row"><div><b>Удалить</b><div class="meta">Сотрудник будет убран из активных и потеряет доступ. Все результаты и история сохранятся для восстановления.</div></div><button class="btn danger" onclick="shRgArchive('${jsq(login)}')">Удалить</button></div></div>`);
  };

  window.shRgDetach=async function(login){
    if(!currentMentorEmployee(login))return;
    closeModal();
    await removeEmployeeFromTeam(login);
  };

  window.shRgArchive=async function(login){
    const x=currentMentorEmployee(login);if(!x)return;
    if(!confirm(`Удалить ${x.name||x.login} из активных сотрудников? Доступ будет отключён, но результаты и вся история сохранятся для восстановления.`))return;
    const {error}=await S.sb.rpc('mentor_archive_employee',{p_login:login});
    if(error){let m=error.message||String(error);if(m.includes('OUTSIDE_YOUR_SCOPE'))m='Можно удалять только сотрудников своей команды.';else if(m.includes('EMPLOYEE_NOT_FOUND'))m='Сотрудник не найден.';else if(m.includes('FORBIDDEN'))m='Недостаточно прав для удаления сотрудника.';toast(m);return}
    closeModal();await syncAll();renderEmployees();if(S.currentPage==='mentor')renderMentor();toast('Сотрудник удалён из активных. История сохранена.');
  };

  function applyMentorEmployeeActions(){
    if(S.profile?.role!=='mentor')return;
    const users=employeeListForAdmin();
    const nodes=[...document.querySelectorAll('#employeeRows > .employee-row')];
    if(!nodes.length||nodes.length!==users.length)return;
    nodes.forEach((row,i)=>{
      const x=users[i];if(!x||x.role!=='employee'||x.manager_login!==S.profile.login)return;
      const actions=row.querySelector('.actions');if(!actions)return;
      actions.innerHTML=`<span class="pill ${x.active?'good':'bad'}">${x.active?'Активен':'Отключён'}</span><button class="btn secondary" onclick="shRgNewCode('${jsq(x.login)}')">Новый код</button><button class="btn secondary" onclick="openEmployeeEditor(S.allowed.find(u=>u.login==='${jsq(x.login)}'))">Изменить</button><button class="btn secondary" onclick="shRgOpenManagement('${jsq(x.login)}')">Управление</button>`;
    });
  }

  renderEmployees=function(){const r=baseRenderEmployees();applyMentorEmployeeActions();return r};
  console.info('SkillHub: RG employee actions enabled');
})();
