/**
 * @file battle.js
 * @description Turn-Based JRPG Combat Controller with PySpark Transformations.
 * Handles anomaly encounters, DataFrame rendering, skill checks, and battle resolution.
 */

class BattleSystem {
  constructor(engine, state, onBattleEnd) {
    this.engine = engine;
    this.state = state;
    this.onBattleEnd = onBattleEnd;

    // DOM References
    this.modal = document.getElementById('battle-modal');
    this.enemyNameEl = document.getElementById('enemy-name');
    this.enemyDescEl = document.getElementById('enemy-desc');
    this.enemyHpBar = document.getElementById('enemy-hp-bar');
    this.tableContainer = document.getElementById('table-preview-container');
    this.skillsGrid = document.getElementById('skills-grid');
    this.battleLog = document.getElementById('battle-log');
  }

  /**
   * Initiates a turn-based combat encounter with a corrupted data anomaly.
   * @param {Object} enemyData - The anomaly definition object from ANOMALY_DATABASE.
   */
  startBattle(enemyData) {
    this.state.inBattle = true;
    this.currentEnemy = enemyData;

    window.sfx.encounter();

    // Populate Anomaly Information
    this.enemyNameEl.innerText = enemyData.name;
    this.enemyDescEl.innerText = enemyData.desc;
    this.enemyHpBar.style.width = '100%';

    // Render Preview of Corrupted DataFrame
    this.renderCorruptedTable(enemyData);

    // Render Shuffled PySpark Skill Cards
    this.renderSkillCards(enemyData);

    // Reset Battle Log
    this.battleLog.innerHTML = `<div>[ENCOUNTER] ${enemyData.name} blocking the ingestion partition!</div>`;

    // Show Modal
    this.modal.style.display = 'flex';
  }

  /**
   * Renders the mini preview table showing sample records with highlighted corrupted rows.
   * @param {Object} enemyData
   */
  renderCorruptedTable(enemyData) {
    this.tableContainer.innerHTML = '';
    const table = document.createElement('table');
    table.className = 'table-preview';

    // Table Header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    enemyData.tableHeaders.forEach(header => {
      const th = document.createElement('th');
      th.innerText = header;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Table Rows
    const tbody = document.createElement('tbody');
    enemyData.tableRows.forEach((row, rIdx) => {
      const tr = document.createElement('tr');
      const isCorruptedRow = enemyData.glitchIndices.includes(rIdx);
      if (isCorruptedRow) {
        tr.className = 'glitch-row';
      }

      row.forEach(cell => {
        const td = document.createElement('td');
        td.innerText = cell;
        if (
          isCorruptedRow &&
          (cell.includes('NULL') ||
            cell.includes('NaN') ||
            cell === '' ||
            cell.includes('-999') ||
            cell.includes('   '))
        ) {
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
   * Renders the PySpark skill choices as interactive cards.
   * @param {Object} enemyData
   */
  renderSkillCards(enemyData) {
    this.skillsGrid.innerHTML = '';
    const shuffled = [...enemyData.skills].sort(() => Math.random() - 0.5);

    shuffled.forEach(skill => {
      const btn = document.createElement('button');
      btn.className = 'skill-card';
      btn.innerHTML = `
        <div class="skill-code">${skill.code}</div>
        <div class="skill-effect">${skill.label}</div>
      `;
      btn.onclick = () => this.executeSkill(skill);
      this.skillsGrid.appendChild(btn);
    });
  }

  /**
   * Executes a chosen PySpark transformation and computes battle outcome.
   * @param {Object} skill - Selected skill object.
   */
  executeSkill(skill) {
    const skillButtons = this.skillsGrid.querySelectorAll('.skill-card');
    skillButtons.forEach(b => (b.disabled = true));

    if (skill.correct) {
      // Correct PySpark syntax & logic chosen
      window.sfx.correct();
      this.enemyHpBar.style.width = '0%';
      this.battleLog.innerHTML =
        `<div style="color:#7ee787;">[SUCCESS] ${skill.explain}</div>` +
        this.battleLog.innerHTML;

      setTimeout(() => {
        this.finishBattle(true);
      }, 1200);
    } else {
      // Syntax / Logic error -> Inflict Sanity & Health penalties
      window.sfx.wrong();
      const sanityLoss = 18;
      const hpLoss = 10;
      this.state.player.sanity = Math.max(0, this.state.player.sanity - sanityLoss);
      this.state.player.hp = Math.max(0, this.state.player.hp - hpLoss);

      // Trigger global HUD update
      if (window.updateHUD) window.updateHUD();

      this.battleLog.innerHTML =
        `<div style="color:#ff7b72;">[SYNTAX/LOGIC ERROR] ${skill.explain} (-${sanityLoss} Sanity, -${hpLoss} HP)</div>` +
        this.battleLog.innerHTML;

      // Check if developer crashed
      if (this.state.player.sanity <= 0 || this.state.player.hp <= 0) {
        setTimeout(() => {
          this.finishBattle(false);
        }, 1200);
      } else {
        setTimeout(() => {
          skillButtons.forEach(b => (b.disabled = false));
        }, 800);
      }
    }
  }

  /**
   * Closes the combat view and triggers completion callbacks.
   * @param {boolean} won - Whether the anomaly was resolved.
   */
  finishBattle(won) {
    this.modal.style.display = 'none';
    this.state.inBattle = false;
    if (this.onBattleEnd) {
      this.onBattleEnd(won, this.currentEnemy);
    }
  }
}

// Export battle class to window
window.BattleSystem = BattleSystem;
