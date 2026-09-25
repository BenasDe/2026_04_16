/**
 * @file battle.js
 * @description Task Staging & Coding Challenge Controller for Pipeline Survivor.
 * Operates in "Blind Staging" mode: records candidate queries/transformations without
 * revealing correctness until the player executes "RUN PIPELINE".
 */

class BattleSystem {
  constructor(engine, state, onTaskStaged) {
    this.engine = engine;
    this.state = state;
    this.onTaskStaged = onTaskStaged;

    // DOM References
    this.modal = document.getElementById('battle-modal');
    this.enemyNameEl = document.getElementById('enemy-name');
    this.enemyDescEl = document.getElementById('enemy-desc');
    this.engineBadgeEl = document.getElementById('battle-engine-badge');
    this.tableContainer = document.getElementById('table-preview-container');
    this.skillsGrid = document.getElementById('skills-grid');
    this.battleLog = document.getElementById('battle-log');
  }

  /**
   * Initiates task view for a grid anomaly or SQL objective.
   * @param {Object} taskData - The task definition object.
   * @param {string} engineName - e.g. "PySpark 3.5.0" or "Spark SQL".
   */
  startBattle(taskData, engineName = "PySpark 3.5.0") {
    this.state.inBattle = true;
    this.currentTask = taskData;

    window.sfx.encounter();

    // Populate Task Information
    this.enemyNameEl.innerText = taskData.name;
    this.enemyDescEl.innerText = taskData.desc;
    if (this.engineBadgeEl) {
      this.engineBadgeEl.innerText = `ENGINE: ${engineName}`;
    }

    // Render Preview Table
    this.renderCorruptedTable(taskData);

    // Render Shuffled Candidate Queries / PySpark Functions
    this.renderSkillCards(taskData);

    // Initial log prompt
    this.battleLog.innerHTML = `<div>[READY] Inspect the records and commit your transformation logic to the DAG...</div>`;

    // Show Modal
    this.modal.style.display = 'flex';
  }

  /**
   * Renders the mini preview table showing sample records with highlighted anomaly rows.
   * @param {Object} taskData
   */
  renderCorruptedTable(taskData) {
    this.tableContainer.innerHTML = '';
    const table = document.createElement('table');
    table.className = 'table-preview';

    // Table Header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    taskData.tableHeaders.forEach(header => {
      const th = document.createElement('th');
      th.innerText = header;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Table Rows
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

  /**
   * Renders the query / transformation choices as interactive cards.
   * @param {Object} taskData
   */
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

  /**
   * Stages the chosen transformation blindly into the pipeline DAG without revealing if it is correct.
   * @param {Object} skill - Selected candidate skill/query.
   */
  stageSkill(skill) {
    const skillButtons = this.skillsGrid.querySelectorAll('.skill-card');
    skillButtons.forEach(b => (b.disabled = true));

    // Play neutral staging sound
    window.sfx.stageTask();

    // Feedback log: Blind notification
    this.battleLog.innerHTML =
      `<div style="color:#ffffff; font-weight:700;">[STAGED] Logic committed to pipeline DAG. (Validation deferred to 'Run Pipeline')</div>` +
      this.battleLog.innerHTML;

    setTimeout(() => {
      this.finishTask(skill);
    }, 650);
  }

  /**
   * Closes the task dialog and notifies main loop that this node is staged.
   * @param {Object} chosenSkill
   */
  finishTask(chosenSkill) {
    this.modal.style.display = 'none';
    this.state.inBattle = false;
    if (this.onTaskStaged) {
      this.onTaskStaged(this.currentTask, chosenSkill);
    }
  }
}

// Export battle class to window
window.BattleSystem = BattleSystem;
