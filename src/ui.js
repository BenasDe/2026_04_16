/** HUD, game-end presentation, and menu/button bindings. Game transitions stay in main.js. */
window.createGameUI = function ({ gameState, formatStopwatch }) {
  function renderLevel(currentLevel, levelIndex) {
    // Update Top Bar HUD Info
    const rankEl = document.getElementById('dev-rank');
    const statusEl = document.getElementById('pipeline-status');
    const engineEl = document.getElementById('pipeline-engine-text');
    if (rankEl) rankEl.innerText = `LEVEL ${levelIndex + 1}`;
    if (statusEl) statusEl.innerText = currentLevel.name;
    if (engineEl) engineEl.innerText = currentLevel.engine;

    // Reset Run Pipeline Button
    const btnRun = document.getElementById('btn-run-pipeline');
    if (btnRun) {
      btnRun.disabled = true;
      btnRun.classList.remove('ready');
    }

  }

  function updateHUD() {
    const levels = window.GAME_LEVELS || [];
    const currentLevel = levels[gameState.levelIndex];
    const totalTasks = currentLevel ? currentLevel.tasks.length : 5;
    const stagedCount = Object.keys(gameState.stagedTasks).length;

    // Red Bull Count
    const rbEl = document.getElementById('red-bull-count');
    if (rbEl) rbEl.innerText = gameState.redBulls;

    // Staged Count
    const stagedEl = document.getElementById('staged-count');
    if (stagedEl) stagedEl.innerText = `${stagedCount} / ${totalTasks}`;

    // Run Pipeline Button State
    const btnRun = document.getElementById('btn-run-pipeline');
    if (btnRun) {
      if (stagedCount >= totalTasks && !gameState.pipelineRunning) {
        btnRun.disabled = false;
        btnRun.classList.add('ready');
      } else {
        btnRun.disabled = true;
        btnRun.classList.remove('ready');
      }
    }
  }

  function showGameOver() {
    const modal = document.getElementById('game-end-modal');
    document.getElementById('end-title').innerText = '💥 PIPELINE CRASHED (OOM)';
    document.getElementById('end-title').style.color = '#ef4444';
    document.getElementById('end-desc').innerText =
      'Your pipeline ran out of Red Bull while attempting to patch faulty queries. Critical deadlock reached.';
    document.getElementById('victory-score-entry').style.display = 'none';
    modal.style.display = 'flex';
  }

  function showVictory() {
    // Trigger celebration confetti
    if (window.confetti) {
      window.confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    }

    const finalFormatted = formatStopwatch(gameState.timer.elapsedMs);
    const modal = document.getElementById('game-end-modal');
    document.getElementById('end-title').innerText = '🏆 GOLD PRODUCTION CERTIFIED!';
    document.getElementById('end-title').style.color = '#ffffff';
    document.getElementById('end-desc').innerText =
      'All 3 data pipeline layers (Bronze PySpark, Silver Analytical SQL, Gold Spark/Delta Optimization) successfully deployed to production!';

    const victoryEntry = document.getElementById('victory-score-entry');
    victoryEntry.style.display = 'block';
    document.getElementById('victory-time-val').innerText = finalFormatted;
    document.getElementById('victory-rb-val').innerText = gameState.redBulls;

    const auditEl = document.getElementById('victory-audit-breakdown');
    if (auditEl) {
      const scavenged = gameState.stats ? gameState.stats.totalScavenged : gameState.redBulls;
      const mistakes = gameState.stats ? gameState.stats.totalMistakes : 0;
      const penaltySec = mistakes * 60;
      auditEl.innerHTML = `
        <div>Fuel: Scavenged <strong>${scavenged}</strong> cans − <strong>${mistakes}</strong> hotfixes = <strong>${gameState.redBulls}</strong> remaining</div>
        <div style="margin-top: 3px; color: ${mistakes > 0 ? '#facc15' : '#4ade80'};">
          ${mistakes > 0 ? `⏱️ Red Bull Penalty: <strong>+${penaltySec}s</strong> (${mistakes} hotfixes × 60s added to final time)` : `✔ Clean Deploy: Zero hotfix penalties!`}
        </div>
      `;
    }

    modal.style.display = 'flex';

    // Automatically focus and select the callsign input field
    const playerInput = document.getElementById('player-name-input');
    if (playerInput) {
      setTimeout(() => {
        playerInput.focus();
        playerInput.select();
      }, 100);
    }
  }

  function bindButtons({ startGame, executePipelineRun, saveLeaderboardRecord, openLeaderboard, closeLeaderboard, clearLocalLeaderboard }) {
    const musicButtons = document.querySelectorAll('[data-music-toggle]');
    const updateMusicButtons = () => {
      musicButtons.forEach(button => {
        button.textContent = `Music: ${window.music.enabled ? 'On' : 'Off'}`;
        button.setAttribute('aria-pressed', String(window.music.enabled));
        button.title = window.music.enabled ? 'Turn background music off' : 'Turn background music on';
      });
    };
    window.music.onChange = updateMusicButtons;
    musicButtons.forEach(button => button.addEventListener('click', () => window.music.toggle()));
    updateMusicButtons();

    // Start Menu Buttons
    document.getElementById('btn-start-game').addEventListener('click', startGame);
    document.getElementById('btn-menu-leaderboard').addEventListener('click', openLeaderboard);

    // Leaderboard Modal Buttons
    document.getElementById('btn-open-leaderboard').addEventListener('click', openLeaderboard);
    document.getElementById('btn-close-leaderboard').addEventListener('click', closeLeaderboard);
    document.getElementById('btn-close-leaderboard-btn').addEventListener('click', closeLeaderboard);
    document.getElementById('btn-clear-leaderboard').addEventListener('click', () => {
      if (confirm('Clear local leaderboard records?')) {
        clearLocalLeaderboard();
      }
    });

    // Run Pipeline Button
    document.getElementById('btn-run-pipeline').addEventListener('click', () => {
      executePipelineRun();
    });

    // Restart Game Button
    document.getElementById('btn-restart').addEventListener('click', () => {
      const endModal = document.getElementById('game-end-modal');
      if (endModal) endModal.style.display = 'none';
      startGame();
    });

    // Submit Score Button
    document.getElementById('btn-save-score').addEventListener('click', async () => {
      const input = document.getElementById('player-name-input');
      const name = input ? input.value : 'ANON_DE';
      const saveBtn = document.getElementById('btn-save-score');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerText = 'PUBLISHING...';
      }
      await saveLeaderboardRecord(name, gameState.timer.elapsedMs, gameState.redBulls);
      document.getElementById('victory-score-entry').style.display = 'none';
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerText = 'SUBMIT SCORE';
      }
      showToast('🏆 Score submitted to Global Leaderboard!');
      openLeaderboard();
    });
  }

  /**
   * Toast Notification Display (delegates to Utils)
   */
  function showToast(msg, duration = 2500) {
    if (window.Utils) {
      window.Utils.showToast(msg, duration);
    } else {
      const toast = document.getElementById('toast-msg');
      if (!toast) return;
      toast.innerHTML = msg;
      toast.style.display = 'block';
      clearTimeout(toast.timer);
      toast.timer = setTimeout(() => { toast.style.display = 'none'; }, duration);
    }
  }

  function setStartMenuVisible(visible) {
    const modal = document.getElementById('start-menu-modal');
    if (modal) modal.style.display = visible ? 'flex' : 'none';
  }

  return { renderLevel, updateHUD, showGameOver, showVictory, showToast, setStartMenuVisible, bindButtons };
};
