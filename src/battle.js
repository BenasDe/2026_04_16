class BattleSystem {
  constructor(engine, state, onTaskStaged) {
    this.engine = engine;
    this.state = state;
    this.onTaskStaged = onTaskStaged;

    this.modal = document.getElementById('battle-modal');
    this.enemyNameEl = document.getElementById('enemy-name');
    this.enemyDescEl = document.getElementById('enemy-desc');
    this.engineBadgeEl = document.getElementById('battle-engine-badge');
    this.tableContainer = document.getElementById('table-preview-container');
    this.skillsGrid = document.getElementById('skills-grid');
    this.battleLog = document.getElementById('battle-log');
  }

  startBattle(taskData, engineName = "PySpark 3.5.0") {
    this.state.inBattle = true;
    this.currentTask = taskData;

    window.sfx.encounter();

    this.enemyNameEl.innerText = taskData.name;
    this.enemyDescEl.innerText = taskData.desc;
    if (this.engineBadgeEl) {
      this.engineBadgeEl.innerText = `ENGINE: ${engineName}`;
    }

    this.renderCorruptedTable(taskData);
    this.renderSkillCards(taskData);

    this.battleLog.innerHTML = `<div>[READY] Inspect records and commit transformation logic to the DAG.</div>`;
    this.modal.style.display = 'flex';
  }

  renderCorruptedTable(taskData) {
    this.tableContainer.innerHTML = '';
    const table = document.createElement('table');
    table.className = 'table-preview';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    taskData.tableHeaders.forEach(header => {
      const th = document.createElement('th');
      th.innerText = header;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    taskData.tableRows.forEach((row, rIdx) => {
      const tr = document.createElement('tr');
      const isCorruptedRow = taskData.glitchIndices.includes(rIdx);
      if (isCorruptedRow) {
        tr.className = 'glitch-row';
      }

      row.forEach(cell => {
        const td = document.createElement('td');
        td.innerText = cell;
        if (isCorruptedRow) {
          td.className = 'corrupted';
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    this.tableContainer.appendChild(table);
  }

  renderSkillCards(taskData) {
    this.skillsGrid.innerHTML = '';
    const shuffled = window.Utils ? window.Utils.shuffle([...taskData.skills]) : [...taskData.skills].sort(() => Math.random() - 0.5);

    shuffled.forEach(skill => {
      const btn = document.createElement('button');
      btn.className = 'skill-card';
      btn.innerHTML = `
        <div class="skill-code">${skill.code}</div>
        <div class="skill-effect">${skill.label}</div>
      `;
      btn.onclick = () => this.stageSkill(skill);
      this.skillsGrid.appendChild(btn);
    });
  }

  stageSkill(skill) {
    const skillButtons = this.skillsGrid.querySelectorAll('.skill-card');
    skillButtons.forEach(b => (b.disabled = true));

    window.sfx.stageTask();

    this.battleLog.innerHTML =
      `<div style="color:#ffffff; font-weight:700;">[STAGED] Logic committed to DAG (validation deferred to 'Run Pipeline').</div>` +
      this.battleLog.innerHTML;

    setTimeout(() => {
      this.finishTask(skill);
    }, 650);
  }

  finishTask(chosenSkill) {
    this.modal.style.display = 'none';
    this.state.inBattle = false;
    if (this.onTaskStaged) {
      this.onTaskStaged(this.currentTask, chosenSkill);
    }
  }
}

window.BattleSystem = BattleSystem;
