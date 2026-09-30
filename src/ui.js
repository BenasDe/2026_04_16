window.createGameUI = function ({ gameState, formatStopwatch }) {
  function renderLevel(currentLevel, levelIndex) {
    const locLevel = window.i18n ? window.i18n.getLocalizedLevel(currentLevel) : currentLevel;
    const rankEl = document.getElementById('dev-rank');
    const statusEl = document.getElementById('pipeline-status');
    const engineEl = document.getElementById('pipeline-engine-text');
    if (rankEl) {
      rankEl.innerText = window.i18n ? window.i18n.t('hud_level', { num: levelIndex + 1 }) : `LEVEL ${levelIndex + 1}`;
    }
    if (statusEl && locLevel) statusEl.innerText = locLevel.name;
    if (engineEl && locLevel) engineEl.innerText = locLevel.engine;

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

    const fuelEl = document.getElementById('fuel-count');
    if (fuelEl) fuelEl.innerText = gameState.fuel;

    const stagedEl = document.getElementById('staged-count');
    if (stagedEl) stagedEl.innerText = `${stagedCount} / ${totalTasks}`;

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
    const titleEl = document.getElementById('end-title');
    const descEl = document.getElementById('end-desc');
    if (titleEl) {
      titleEl.innerText = window.i18n ? window.i18n.t('game_over_title') : 'PIPELINE CRASHED (OOM)';
      titleEl.style.color = '#ef4444';
    }
    if (descEl) {
      descEl.innerText = window.i18n
        ? window.i18n.t('game_over_desc')
        : 'Your pipeline ran out of fuel while attempting to patch faulty queries. Critical deadlock reached.';
    }
    document.getElementById('victory-score-entry').style.display = 'none';
    modal.style.display = 'flex';
  }

  function showVictory() {
    if (window.confetti) {
      window.confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    }

    const finalFormatted = formatStopwatch(gameState.timer.elapsedMs);
    const modal = document.getElementById('game-end-modal');
    const titleEl = document.getElementById('end-title');
    const descEl = document.getElementById('end-desc');
    if (titleEl) {
      titleEl.innerText = window.i18n ? window.i18n.t('victory_title') : 'PIPELINE PRODUCTION CERTIFIED';
      titleEl.style.color = '#ffffff';
    }
    if (descEl) {
      descEl.innerText = window.i18n
        ? window.i18n.t('victory_desc')
        : `All ${window.GAME_LEVELS.length} pipeline levels successfully deployed to production.`;
    }

    const victoryEntry = document.getElementById('victory-score-entry');
    victoryEntry.style.display = 'block';
    document.getElementById('victory-time-val').innerText = finalFormatted;
    const victoryFuel = document.getElementById('victory-fuel-val');
    if (victoryFuel) victoryFuel.innerText = gameState.fuel;

    const auditEl = document.getElementById('victory-audit-breakdown');
    if (auditEl) {
      const scavenged = gameState.stats ? gameState.stats.totalScavenged : gameState.fuel;
      const mistakes = gameState.stats ? gameState.stats.totalMistakes : 0;
      const penaltySec = mistakes * 60;
      const fuelHtml = window.i18n
        ? window.i18n.t('victory_fuel_summary', { scavenged, mistakes, remaining: gameState.fuel })
        : `Fuel: Scavenged <strong>${scavenged}</strong> units - <strong>${mistakes}</strong> hotfixes = <strong>${gameState.fuel}</strong> remaining`;
      const penaltyHtml = mistakes > 0
        ? (window.i18n ? window.i18n.t('victory_penalty_summary', { penalty: penaltySec, mistakes }) : `Fuel Penalty: <strong>+${penaltySec}s</strong> (${mistakes} hotfixes x 60s added)`)
        : (window.i18n ? window.i18n.t('victory_clean_deploy') : 'Clean Deploy: Zero hotfix penalties.');

      auditEl.innerHTML = `
        <div>${fuelHtml}</div>
        <div style="margin-top: 3px; color: ${mistakes > 0 ? '#facc15' : '#4ade80'};">
          ${penaltyHtml}
        </div>
      `;
    }

    modal.style.display = 'flex';

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
        const on = !!window.music.enabled;
        button.textContent = window.i18n ? window.i18n.t(on ? 'music_on' : 'music_off') : `Music: ${on ? 'On' : 'Off'}`;
        button.setAttribute('aria-pressed', String(on));
        button.title = window.i18n ? window.i18n.t(on ? 'music_title_on' : 'music_title_off') : (on ? 'Turn music off' : 'Turn music on');
      });
    };
    window.music.onChange = updateMusicButtons;
    musicButtons.forEach(button => button.addEventListener('click', () => window.music.toggle()));
    updateMusicButtons();

    const langToggleButtons = [document.getElementById('btn-lang-toggle'), document.getElementById('btn-menu-lang-toggle')];
    langToggleButtons.forEach(btn => {
      if (btn) {
        btn.addEventListener('click', () => {
          if (window.i18n) window.i18n.toggleLanguage();
        });
      }
    });

    if (window.i18n) {
      window.i18n.onLanguageChange(() => {
        const levels = window.GAME_LEVELS || [];
        const currentLevel = levels[gameState.levelIndex];
        if (currentLevel) renderLevel(currentLevel, gameState.levelIndex);
        updateMusicButtons();
        updateHUD();
      });
    }

    document.getElementById('btn-start-game').addEventListener('click', startGame);
    document.getElementById('btn-menu-leaderboard').addEventListener('click', openLeaderboard);

    document.getElementById('btn-open-leaderboard').addEventListener('click', openLeaderboard);
    document.getElementById('btn-close-leaderboard').addEventListener('click', closeLeaderboard);
    document.getElementById('btn-close-leaderboard-btn').addEventListener('click', closeLeaderboard);
    document.getElementById('btn-clear-leaderboard').addEventListener('click', () => {
      const confirmText = window.i18n ? window.i18n.t('confirm_clear_lb') : 'Clear local leaderboard records?';
      if (confirm(confirmText)) {
        clearLocalLeaderboard();
      }
    });

    document.getElementById('btn-run-pipeline').addEventListener('click', () => {
      executePipelineRun();
    });

    document.getElementById('btn-restart').addEventListener('click', () => {
      const endModal = document.getElementById('game-end-modal');
      if (endModal) endModal.style.display = 'none';
      startGame();
    });

    document.getElementById('btn-save-score').addEventListener('click', async () => {
      const input = document.getElementById('player-name-input');
      const name = input ? input.value : 'ANON_DE';
      const saveBtn = document.getElementById('btn-save-score');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerText = window.i18n ? window.i18n.t('btn_publishing') : 'PUBLISHING...';
      }
      await saveLeaderboardRecord(name, gameState.timer.elapsedMs, gameState.fuel);
      document.getElementById('victory-score-entry').style.display = 'none';
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerText = window.i18n ? window.i18n.t('btn_submit_score') : 'SUBMIT SCORE';
      }
      const successToast = window.i18n ? window.i18n.t('toast_score_submitted') : 'Score submitted to leaderboard.';
      showToast(successToast);
      openLeaderboard();
    });
  }

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
