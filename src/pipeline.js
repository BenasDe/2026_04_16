window.createPipelineRunner = function ({ gameState, updateHUD, showToast, addTimerPenalty, triggerGameOver, triggerVictory, loadLevel }) {
  async function executePipelineRun() {
    const levels = window.GAME_LEVELS || [];
    const currentLevel = levels[gameState.levelIndex];
    if (!currentLevel || gameState.pipelineRunning) return;

    const totalTasks = currentLevel.tasks.length;
    const stagedCount = Object.keys(gameState.stagedTasks).length;
    if (stagedCount < totalTasks) {
      const msg = window.i18n
        ? window.i18n.t('toast_stage_all_before_run', { staged: stagedCount, total: totalTasks })
        : `Stage all ${totalTasks} tasks before running the pipeline (${stagedCount}/${totalTasks} staged).`;
      showToast(msg);
      return;
    }

    gameState.pipelineRunning = true;
    updateHUD();

    const modal = document.getElementById('pipeline-diagnostic-modal');
    const terminal = document.getElementById('diagnostic-terminal');
    const footer = document.getElementById('diagnostic-footer');
    const summaryEl = document.getElementById('diagnostic-status-summary');
    const actionBtn = document.getElementById('btn-diagnostic-action');
    const targetLabel = document.getElementById('diagnostic-level-label');

    const locLevel = window.i18n ? window.i18n.getLocalizedLevel(currentLevel) : currentLevel;
    if (targetLabel) {
      const targetSlug = `${locLevel.name.toUpperCase().replace(/\s+/g, '_')}_DAG`;
      targetLabel.innerText = window.i18n ? window.i18n.t('diag_target', { target: targetSlug }) : `TARGET: ${targetSlug}`;
    }
    terminal.innerHTML = '';
    footer.style.display = 'none';
    modal.style.display = 'flex';

    const initMsg = window.i18n
      ? window.i18n.t('diag_init', { engine: currentLevel.engine })
      : `[INIT] Booting compilation engine (${currentLevel.engine})...`;
    appendDiagLine('diag-info', initMsg);
    await delay(400);

    const resolvingMsg = window.i18n
      ? window.i18n.t('diag_dag_resolving', { count: currentLevel.tasks.length })
      : `[DAG] Resolving dependencies for ${currentLevel.tasks.length} staged nodes...`;
    appendDiagLine('diag-info', resolvingMsg);
    await delay(500);

    let mistakesCount = 0;
    const startLevelFuel = gameState.fuel;
    const stagedList = Object.values(gameState.stagedTasks);

    for (let i = 0; i < stagedList.length; i++) {
      const item = stagedList[i];
      const task = item.task;
      const skill = item.chosenSkill;
      const isCorrect = !!(skill && (skill.correct === true || skill.isCorrect === true));

      const locTask = window.i18n ? window.i18n.getLocalizedTask(task) : task;
      const locSkill = locTask.skills.find(s => s.code === skill.code) || skill;

      const checkingMsg = window.i18n
        ? window.i18n.t('diag_checking_node', { current: i + 1, total: stagedList.length, name: locTask.name })
        : `--- [NODE ${i + 1}/${stagedList.length}] Checking "${task.name}"...`;
      appendDiagLine('diag-info', checkingMsg);
      if (window.sfx && window.sfx.pipelineBeep) window.sfx.pipelineBeep();
      await delay(450);

      if (isCorrect) {
        const passMsg = window.i18n ? window.i18n.t('diag_pass') : `  [PASS] Logic compiled cleanly.`;
        appendDiagLine('diag-pass', passMsg);
        if (locSkill && locSkill.explain) {
          appendDiagLine('diag-info', `    ${locSkill.explain}`);
        }
      } else {
        mistakesCount++;
        gameState.fuel -= 1;
        if (gameState.stats) gameState.stats.totalMistakes += 1;
        addTimerPenalty(60000);
        if (window.sfx && window.sfx.pipelineHotfix) window.sfx.pipelineHotfix();

        const failMsg = window.i18n ? window.i18n.t('diag_fail') : `  [FAIL] Bug detected in query logic. Hotfix required.`;
        appendDiagLine('diag-warn', failMsg);
        if (locSkill && locSkill.explain) {
          const issueMsg = window.i18n ? window.i18n.t('diag_issue', { explain: locSkill.explain }) : `    Issue: ${locSkill.explain}`;
          appendDiagLine('diag-info', issueMsg);
        }
        const hotfixMsg = window.i18n
          ? window.i18n.t('diag_hotfix', { remaining: gameState.fuel })
          : `  [HOTFIX] -1 Fuel consumed (+60s penalty). Remaining: ${gameState.fuel}`;
        appendDiagLine('diag-warn', hotfixMsg);
        updateHUD();
      }
      await delay(350);
    }

    await delay(400);
    const auditMsg = window.i18n
      ? window.i18n.t('diag_audit', { start: startLevelFuel, mistakes: mistakesCount, penalty: mistakesCount * 60, remaining: gameState.fuel })
      : `[AUDIT] Starting Fuel: ${startLevelFuel} | Hotfixes: -${mistakesCount} (+${mistakesCount * 60}s penalty) | Remaining: ${gameState.fuel}`;
    appendDiagLine('diag-info', auditMsg);

    if (gameState.fuel < 0) {
      if (window.sfx && window.sfx.pipelineCrash) window.sfx.pipelineCrash();
      const critMsg = window.i18n
        ? window.i18n.t('diag_critical_oom')
        : `[CRITICAL] Out of memory (OOM). Insufficient Fuel to resolve bugs.`;
      appendDiagLine('diag-fail', critMsg);
      const failStatus = window.i18n ? window.i18n.t('status_failed_oom') : 'STATUS: FAILED (OOM) | Fuel: 0';
      summaryEl.innerHTML = `<span style="color:#ef4444;">${failStatus}</span>`;
      actionBtn.innerText = window.i18n ? window.i18n.t('btn_abort_restart') : 'ABORT & RESTART';
      actionBtn.onclick = () => {
        actionBtn.onclick = null;
        modal.style.display = 'none';
        gameState.pipelineRunning = false;
        triggerGameOver();
      };
      footer.style.display = 'flex';
    } else {
      if (window.sfx && window.sfx.levelClear) window.sfx.levelClear();
      const deployedMsg = window.i18n
        ? window.i18n.t('diag_deployed')
        : `[DEPLOYED] Pipeline completed validation and reached target tables.`;
      appendDiagLine('diag-pass', deployedMsg);
      const statsMsg = window.i18n
        ? window.i18n.t('diag_stats', { mistakes: mistakesCount, remaining: gameState.fuel })
        : `[STATS] Bugs Hotfixed: ${mistakesCount} | Surviving Fuel: ${gameState.fuel}`;
      appendDiagLine('diag-info', statsMsg);

      const isLastLevel = gameState.levelIndex >= levels.length - 1;
      const successStatus = window.i18n
        ? window.i18n.t('status_deployed_success', { remaining: gameState.fuel })
        : `STATUS: DEPLOYED SUCCESS | Surviving Fuel: ${gameState.fuel}`;
      summaryEl.innerHTML = `<span style="color:#4ade80;">${successStatus}</span>`;
      actionBtn.innerText = isLastLevel
        ? (window.i18n ? window.i18n.t('btn_claim_victory') : 'CLAIM PRODUCTION VICTORY')
        : (window.i18n ? window.i18n.t('btn_next_level') : 'NEXT LEVEL PIPELINE');

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
