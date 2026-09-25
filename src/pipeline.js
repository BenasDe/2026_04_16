/** Pipeline subsystem. Dependencies are supplied by the game controller. */
window.createPipelineRunner = function ({ gameState, updateHUD, showToast, addTimerPenalty, triggerGameOver, triggerVictory, loadLevel }) {
  async function executePipelineRun() {
    const levels = window.GAME_LEVELS || [];
    const currentLevel = levels[gameState.levelIndex];
    if (!currentLevel || gameState.pipelineRunning) return;

    const totalTasks = currentLevel.tasks.length;
    const stagedCount = Object.keys(gameState.stagedTasks).length;
    if (stagedCount < totalTasks) {
      showToast(`⚠️ You must stage all ${totalTasks} tasks before running the pipeline! (${stagedCount}/${totalTasks} staged)`);
      return;
    }

    gameState.pipelineRunning = true;
    updateHUD();

    // Show Diagnostic Terminal Modal
    const modal = document.getElementById('pipeline-diagnostic-modal');
    const terminal = document.getElementById('diagnostic-terminal');
    const footer = document.getElementById('diagnostic-footer');
    const summaryEl = document.getElementById('diagnostic-status-summary');
    const actionBtn = document.getElementById('btn-diagnostic-action');
    const targetLabel = document.getElementById('diagnostic-level-label');

    if (targetLabel) targetLabel.innerText = `TARGET: ${currentLevel.name.toUpperCase().replace(/\s+/g, '_')}_DAG`;
    terminal.innerHTML = '';
    footer.style.display = 'none';
    modal.style.display = 'flex';

    appendDiagLine('diag-info', `[INIT] Booting compilation engine (${currentLevel.engine})...`);
    await delay(400);
    appendDiagLine('diag-info', `[DAG] Resolving dependencies for ${currentLevel.tasks.length} staged nodes...`);
    await delay(500);

    let mistakesCount = 0;
    const startLevelRb = gameState.redBulls;
    const stagedList = Object.values(gameState.stagedTasks);

    for (let i = 0; i < stagedList.length; i++) {
      const item = stagedList[i];
      const task = item.task;
      const skill = item.chosenSkill;
      const isCorrect = !!(skill && (skill.correct === true || skill.isCorrect === true));

      appendDiagLine('diag-info', `─── [NODE ${i + 1}/${stagedList.length}] Checking "${task.name}"...`);
      if (window.sfx && window.sfx.pipelineBeep) window.sfx.pipelineBeep();
      await delay(450);

      if (isCorrect) {
        appendDiagLine('diag-pass', `  ✔ PASSED: Logic compiled cleanly. [0 Red Bulls used]`);
        if (skill && skill.explain) {
          appendDiagLine('diag-info', `    ${skill.explain}`);
        }
      } else {
        mistakesCount++;
        gameState.redBulls -= 1;
        if (gameState.stats) gameState.stats.totalMistakes += 1;
        addTimerPenalty(60000); // Add +60s penalty for each used Red Bull
        if (window.sfx && window.sfx.pipelineHotfix) window.sfx.pipelineHotfix();
        appendDiagLine('diag-warn', `  ✖ BUG DETECTED in query logic! Hotfix required.`);
        if (skill && skill.explain) {
          appendDiagLine('diag-info', `    Issue: ${skill.explain}`);
        }
        appendDiagLine('diag-warn', `  ⚡ Hotfix deployed: -1 Red Bull consumed [+60s TIME PENALTY] (Remaining: ${gameState.redBulls})`);
        updateHUD();
      }
      await delay(350);
    }

    await delay(400);

    // Print exact Hotfix Audit
    appendDiagLine('diag-info', `[AUDIT] Level Starting Fuel: ${startLevelRb} | Hotfixes: -${mistakesCount} (+${mistakesCount * 60}s penalty) | Remaining Red Bulls: ${gameState.redBulls}`);

    // Resolution Evaluation
    if (gameState.redBulls < 0) {
      // CRITICAL FAILURE: Out of Red Bulls
      if (window.sfx && window.sfx.pipelineCrash) window.sfx.pipelineCrash();
      appendDiagLine('diag-fail', `💥 [FATAL CRASH] OUT OF MEMORY (OOM) / UNRESOLVED ANOMALIES!`);
      appendDiagLine('diag-fail', `You lacked sufficient Red Bull to hotfix all pipeline bugs.`);

      summaryEl.innerHTML = `<span style="color:#ef4444;">STATUS: FAILED (OOM) | Red Bulls: 0</span>`;
      actionBtn.innerText = 'ABORT & RESTART';
      actionBtn.onclick = () => {
        actionBtn.onclick = null;
        modal.style.display = 'none';
        gameState.pipelineRunning = false;
        triggerGameOver();
      };
      footer.style.display = 'flex';
    } else {
      // SUCCESSFUL RUN
      if (window.sfx && window.sfx.levelClear) window.sfx.levelClear();
      appendDiagLine('diag-pass', `✔ [DEPLOYED] Pipeline completed validation and reached target tables!`);
      appendDiagLine('diag-info', `[STATS] Bugs Hotfixed: ${mistakesCount} | Red Bulls Surviving: ${gameState.redBulls}`);

      const isLastLevel = gameState.levelIndex >= levels.length - 1;
      summaryEl.innerHTML = `<span style="color:#4ade80;">STATUS: DEPLOYED SUCCESS | Surviving Red Bulls: ${gameState.redBulls}</span>`;
      actionBtn.innerText = isLastLevel ? '👑 CLAIM PRODUCTION VICTORY' : '➔ NEXT LEVEL PIPELINE';

      actionBtn.onclick = () => {
        actionBtn.onclick = null;
        modal.style.display = 'none';
        gameState.pipelineRunning = false;
        if (isLastLevel) {
          triggerVictory();
        } else {
          loadLevel(gameState.levelIndex + 1);
        }
      };
      footer.style.display = 'flex';
    }
  }

  function appendDiagLine(cssClass, text) {
    const terminal = document.getElementById('diagnostic-terminal');
    if (!terminal) return;
    const line = document.createElement('div');
    line.className = `diag-line ${cssClass}`;
    line.innerText = text;
    terminal.appendChild(line);
    terminal.scrollTop = terminal.scrollHeight;
  }

  const delay = (ms) => window.Utils ? window.Utils.delay(ms) : new Promise(r => setTimeout(r, ms));

  return { executePipelineRun };
};
