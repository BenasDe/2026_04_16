/**
 * @file main.js
 * @description Main Game Controller, Level Progression Orchestrator, Stopwatch Timer,
 * Pipeline Diagnostic Engine, and Persistent Leaderboard.
 */

// =============================================================================
// GLOBAL STATE & SYSTEM INITIALIZATION
// =============================================================================
const gameState = {
  levelIndex: 0,
  redBulls: 0, // Player starts with 0 Red Bulls per specifications
  gridSize: 5,
  board: [],
  player: {
    gridX: 0,
    gridY: 0
  },
  stagedTasks: {}, // taskId -> { task, chosenSkill, gridX, gridY }
  isMoving: false,
  inBattle: false,
  gameOver: false,
  pipelineRunning: false,
  timer: {
    startTime: null,
    elapsedMs: 0,
    intervalId: null,
    running: false
  }
};

// Instantiate 3D Engine
const engine = new GameEngine('webgl-canvas');

// Instantiate Battle System with Blind Staging Hook
const battleSystem = new BattleSystem(engine, gameState, (task, chosenSkill) => {
  handleTaskStaged(task, chosenSkill);
});

// =============================================================================
// TIMER / STOPWATCH SUBSYSTEM
// =============================================================================
function formatStopwatch(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hundredths = Math.floor((ms % 1000) / 10);

  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  return `${pad(minutes)}:${pad(seconds)}.${pad(hundredths)}`;
}

function startTimer() {
  if (gameState.timer.running) return;
  gameState.timer.startTime = Date.now() - gameState.timer.elapsedMs;
  gameState.timer.running = true;

  gameState.timer.intervalId = setInterval(() => {
    gameState.timer.elapsedMs = Date.now() - gameState.timer.startTime;
    const formatted = formatStopwatch(gameState.timer.elapsedMs);
    const timerEl = document.getElementById('timer-display');
    if (timerEl) {
      timerEl.innerText = `⏱️ ${formatted}`;
    }
  }, 41); // ~24 fps update for smooth hundredths
}

function stopTimer() {
  if (gameState.timer.intervalId) {
    clearInterval(gameState.timer.intervalId);
    gameState.timer.intervalId = null;
  }
  gameState.timer.running = false;
}

function resetTimer() {
  stopTimer();
  gameState.timer.elapsedMs = 0;
  gameState.timer.startTime = null;
  const timerEl = document.getElementById('timer-display');
  if (timerEl) {
    timerEl.innerText = `⏱️ 00:00.00`;
  }
}

// =============================================================================
// LEVEL & BOARD MANAGEMENT
// =============================================================================
function loadLevel(levelIndex) {
  const levels = window.GAME_LEVELS || [];
  if (levelIndex >= levels.length) {
    triggerVictory();
    return;
  }

  gameState.levelIndex = levelIndex;
  const currentLevel = levels[levelIndex];

  // Reset Level-specific State
  gameState.stagedTasks = {};
  gameState.player.gridX = 0;
  gameState.player.gridY = 0;
  gameState.isMoving = false;
  gameState.inBattle = false;
  gameState.pipelineRunning = false;

  // Build Procedural 3D Board
  gameState.board = engine.buildBoard(
    gameState.gridSize,
    currentLevel.tasks,
    currentLevel.redBullsToPlace || 3
  );

  // Position Player at Start (0, 0)
  engine.setPlayerGridPosition(0, 0, gameState.gridSize);

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

  updateHUD();
  showToast(`🚀 Entered ${currentLevel.name}! Collect Red Bull & stage fixes.`);
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

// =============================================================================
// PLAYER MOVEMENT & TILE INTERACTION
// =============================================================================
function movePlayer(dx, dy) {
  if (gameState.isMoving || gameState.inBattle || gameState.gameOver || gameState.pipelineRunning) return;

  const newX = gameState.player.gridX + dx;
  const newY = gameState.player.gridY + dy;

  if (newX >= 0 && newX < gameState.gridSize && newY >= 0 && newY < gameState.gridSize) {
    gameState.player.gridX = newX;
    gameState.player.gridY = newY;
    gameState.isMoving = true;
    if (window.sfx && window.sfx.step) window.sfx.step();

    engine.animatePlayerMovement(newX, newY, gameState.gridSize, () => {
      gameState.isMoving = false;
      checkCurrentTile();
    });
  }
}

function checkCurrentTile() {
  const cell = gameState.board[gameState.player.gridX][gameState.player.gridY];
  if (!cell) return;

  // 1. Red Bull Scavenge Pickup
  if (cell.type === 'redBull' && !cell.cleared) {
    cell.cleared = true;
    gameState.redBulls += 1;
    if (window.sfx && window.sfx.redBull) window.sfx.redBull();
    showToast(`⚡ Scavenged Red Bull! (+1 Hotfix Fuel, Total: ${gameState.redBulls})`);
    engine.removeInteractiveObject(gameState.player.gridX, gameState.player.gridY);
    updateHUD();
    return;
  }

  // 2. Data Anomaly Task
  if (cell.type === 'enemy' && cell.data) {
    const currentLevel = (window.GAME_LEVELS || [])[gameState.levelIndex];
    const isAlreadyStaged = !!gameState.stagedTasks[cell.data.id];

    if (isAlreadyStaged) {
      showToast(`📦 Task already staged into DAG. (All staged: ${Object.keys(gameState.stagedTasks).length}/${currentLevel.tasks.length})`);
    } else {
      battleSystem.startBattle(cell.data, currentLevel.engine);
    }
  }
}

function handleTaskStaged(task, chosenSkill) {
  // Record blind staging
  gameState.stagedTasks[task.id] = {
    task,
    chosenSkill,
    gridX: gameState.player.gridX,
    gridY: gameState.player.gridY
  };

  // Visually highlight 3D Hexagon node as staged (glowing emerald)
  engine.markTaskAsStaged(gameState.player.gridX, gameState.player.gridY);

  const levels = window.GAME_LEVELS || [];
  const currentLevel = levels[gameState.levelIndex];
  const stagedCount = Object.keys(gameState.stagedTasks).length;
  const totalTasks = currentLevel ? currentLevel.tasks.length : 5;

  updateHUD();

  if (stagedCount >= totalTasks) {
    if (window.sfx && window.sfx.levelClear) window.sfx.levelClear();
    showToast('🚀 ALL TASKS STAGED! Click "⚡ RUN PIPELINE" to execute deployment!', 3500);
  } else {
    showToast(`📦 Staged fix for "${task.name}" (${stagedCount} / ${totalTasks})`);
  }
}

// =============================================================================
// PIPELINE RUN DIAGNOSTIC RUNNER (DEFERRED VALIDATION)
// =============================================================================
async function executePipelineRun() {
  const levels = window.GAME_LEVELS || [];
  const currentLevel = levels[gameState.levelIndex];
  if (!currentLevel || gameState.pipelineRunning) return;

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
      if (window.sfx && window.sfx.pipelineHotfix) window.sfx.pipelineHotfix();
      appendDiagLine('diag-warn', `  ✖ BUG DETECTED in query logic! Hotfix required.`);
      if (skill && skill.explain) {
        appendDiagLine('diag-info', `    Issue: ${skill.explain}`);
      }
      appendDiagLine('diag-warn', `  ⚡ Hotfix deployed: -1 Red Bull consumed (Remaining: ${gameState.redBulls})`);
      updateHUD();
    }
    await delay(350);
  }

  await delay(400);

  // Resolution Evaluation
  if (gameState.redBulls < 0) {
    // CRITICAL FAILURE: Out of Red Bulls
    if (window.sfx && window.sfx.pipelineCrash) window.sfx.pipelineCrash();
    appendDiagLine('diag-fail', `💥 [FATAL CRASH] OUT OF MEMORY (OOM) / UNRESOLVED ANOMALIES!`);
    appendDiagLine('diag-fail', `You lacked sufficient Red Bull to hotfix all pipeline bugs.`);

    summaryEl.innerHTML = `<span style="color:#ef4444;">STATUS: FAILED (OOM) | Red Bulls: 0</span>`;
    actionBtn.innerText = 'ABORT & RESTART';
    actionBtn.onclick = () => {
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

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// GAME OVER & VICTORY
// =============================================================================
function triggerGameOver() {
  stopTimer();
  gameState.gameOver = true;
  if (window.sfx && window.sfx.wrong) window.sfx.wrong();

  const modal = document.getElementById('game-end-modal');
  document.getElementById('end-title').innerText = '💥 PIPELINE CRASHED (OOM)';
  document.getElementById('end-title').style.color = '#ef4444';
  document.getElementById('end-desc').innerText =
    'Your pipeline ran out of Red Bull while attempting to patch faulty queries. Critical deadlock reached.';
  document.getElementById('victory-score-entry').style.display = 'none';
  modal.style.display = 'flex';
}

function triggerVictory() {
  stopTimer();
  gameState.gameOver = true;
  if (window.sfx && window.sfx.victory) window.sfx.victory();

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

  modal.style.display = 'flex';
}

// =============================================================================
// LEADERBOARD SUBSYSTEM (LOCALSTORAGE)
// =============================================================================
const LEADERBOARD_KEY = 'pyspark_survivor_leaderboard';

function getLeaderboard() {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Purge any previously seeded demo/fake entries
        const fakeNames = ['SATOSHI_DE', 'SPARK_WIZARD', 'DELTA_LAKE_PRO', 'SQL_CHIEF'];
        const clean = parsed.filter(item => !fakeNames.includes(item.name));
        if (clean.length !== parsed.length) {
          localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(clean));
        }
        return clean;
      }
    }
  } catch (err) {
    console.error('Failed to parse leaderboard from localStorage', err);
  }
  return [];
}

function saveLeaderboardRecord(name, timeMs, redBulls) {
  const records = getLeaderboard();
  const timeFormatted = formatStopwatch(timeMs);
  const dateStr = new Date().toISOString().split('T')[0];

  records.push({
    name: (name || 'ANON_DE').trim().toUpperCase().substring(0, 15),
    timeMs,
    timeFormatted,
    redBulls,
    date: dateStr
  });

  // Sort by timeMs ascending, then redBulls descending
  records.sort((a, b) => {
    if (a.timeMs !== b.timeMs) return a.timeMs - b.timeMs;
    return b.redBulls - a.redBulls;
  });

  // Keep top 20
  const trimmed = records.slice(0, 20);
  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.error('Failed to save leaderboard', err);
  }
  return trimmed;
}

function renderLeaderboard() {
  const records = getLeaderboard();
  const tbody = document.getElementById('leaderboard-body');
  if (!tbody) return;

  tbody.innerHTML = '';
  if (records.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td colspan="5" style="text-align: center; color: #777777; padding: 28px 12px; font-style: italic; font-family: 'Fira Code', monospace;">
        No completed pipeline runs yet. Deploy Bronze, Silver, & Gold to claim #1!
      </td>
    `;
    tbody.appendChild(tr);
    return;
  }

  records.forEach((rec, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight:700; color:${idx === 0 ? '#facc15' : idx === 1 ? '#e2e8f0' : idx === 2 ? '#b45309' : '#ffffff'};">#${idx + 1}</td>
      <td style="font-weight:600; color:#ffffff;">${rec.name}</td>
      <td style="font-family:'Fira Code'; font-weight:700;">⏱️ ${rec.timeFormatted}</td>
      <td>⚡ ${rec.redBulls} cans</td>
      <td style="color:#777777;">${rec.date || '-'}</td>
    `;
    tbody.appendChild(tr);
  });
}

function openLeaderboard() {
  renderLeaderboard();
  const modal = document.getElementById('leaderboard-modal');
  if (modal) modal.style.display = 'flex';
}

function closeLeaderboard() {
  const modal = document.getElementById('leaderboard-modal');
  if (modal) modal.style.display = 'none';
}

// =============================================================================
// GAME START / RESET FLOW
// =============================================================================
function startGame() {
  // Initialize audio synthesizer on user gesture
  if (window.sfx && window.sfx.initAudio) {
    window.sfx.initAudio();
  }

  // Close Start Menu
  const startModal = document.getElementById('start-menu-modal');
  if (startModal) startModal.style.display = 'none';

  // Reset Game State
  gameState.redBulls = 0; // Starts strictly at 0
  gameState.gameOver = false;
  gameState.pipelineRunning = false;
  resetTimer();
  startTimer();

  // Load Level 1 (Bronze Ingestion)
  loadLevel(0);
}

// =============================================================================
// EVENT LISTENERS & USER INPUT
// =============================================================================

// Start Menu Buttons
document.getElementById('btn-start-game').addEventListener('click', startGame);
document.getElementById('btn-menu-leaderboard').addEventListener('click', openLeaderboard);

// Leaderboard Modal Buttons
document.getElementById('btn-open-leaderboard').addEventListener('click', openLeaderboard);
document.getElementById('btn-close-leaderboard').addEventListener('click', closeLeaderboard);
document.getElementById('btn-close-leaderboard-btn').addEventListener('click', closeLeaderboard);
document.getElementById('btn-clear-leaderboard').addEventListener('click', () => {
  if (confirm('Clear local leaderboard records?')) {
    localStorage.removeItem(LEADERBOARD_KEY);
    renderLeaderboard();
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
document.getElementById('btn-save-score').addEventListener('click', () => {
  const input = document.getElementById('player-name-input');
  const name = input ? input.value : 'ANON_DE';
  saveLeaderboardRecord(name, gameState.timer.elapsedMs, gameState.redBulls);
  document.getElementById('victory-score-entry').style.display = 'none';
  showToast('🏆 Score submitted to leaderboard!');
  openLeaderboard();
});

// Keyboard Navigation
window.addEventListener('keydown', e => {
  if (['ArrowUp', 'KeyW'].includes(e.code)) {
    e.preventDefault();
    movePlayer(0, -1);
  }
  if (['ArrowDown', 'KeyS'].includes(e.code)) {
    e.preventDefault();
    movePlayer(0, 1);
  }
  if (['ArrowLeft', 'KeyA'].includes(e.code)) {
    e.preventDefault();
    movePlayer(-1, 0);
  }
  if (['ArrowRight', 'KeyD'].includes(e.code)) {
    e.preventDefault();
    movePlayer(1, 0);
  }
  if (e.code === 'Enter' || e.code === 'Space') {
    const btnRun = document.getElementById('btn-run-pipeline');
    if (btnRun && !btnRun.disabled && !gameState.pipelineRunning) {
      executePipelineRun();
    }
  }
});

// Mouse Hover Raycasting on Tiles
let hoveredTile = null;

window.addEventListener('pointermove', e => {
  if (
    gameState.inBattle ||
    gameState.gameOver ||
    gameState.pipelineRunning ||
    e.target.closest('#ui-layer') ||
    e.target.closest('.modal-backdrop') ||
    e.target.closest('#battle-modal')
  ) {
    if (hoveredTile) {
      hoveredTile.userData.material.color.setHex(hoveredTile.userData.baseColor);
      hoveredTile = null;
    }
    return;
  }

  engine.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  engine.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  engine.raycaster.setFromCamera(engine.mouse, engine.camera);

  const intersects = engine.raycaster.intersectObjects(engine.tileMeshes);
  if (intersects.length > 0) {
    const tile = intersects[0].object;
    if (hoveredTile && hoveredTile !== tile) {
      hoveredTile.userData.material.color.setHex(hoveredTile.userData.baseColor);
    }
    hoveredTile = tile;
    const dx = tile.userData.gridX - gameState.player.gridX;
    const dy = tile.userData.gridY - gameState.player.gridY;
    const isAdjacent = Math.abs(dx) + Math.abs(dy) === 1;

    // Highlight adjacent tiles brighter
    if (isAdjacent) {
      tile.userData.material.color.setHex(0x404856);
    } else {
      tile.userData.material.color.setHex(0x282e38);
    }
  } else if (hoveredTile) {
    hoveredTile.userData.material.color.setHex(hoveredTile.userData.baseColor);
    hoveredTile = null;
  }
});

// Click / Pointer Raycasting for Tile Movement
window.addEventListener('pointerdown', e => {
  if (
    gameState.inBattle ||
    gameState.gameOver ||
    gameState.pipelineRunning ||
    e.target.closest('#ui-layer') ||
    e.target.closest('.modal-backdrop') ||
    e.target.closest('#battle-modal')
  ) {
    return;
  }

  engine.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  engine.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  engine.raycaster.setFromCamera(engine.mouse, engine.camera);

  const intersects = engine.raycaster.intersectObjects(engine.tileMeshes);
  if (intersects.length > 0) {
    const targetTile = intersects[0].object;
    const targetX = targetTile.userData.gridX;
    const targetY = targetTile.userData.gridY;

    // Check if clicked tile is adjacent (Manhattan distance == 1)
    const dx = targetX - gameState.player.gridX;
    const dy = targetY - gameState.player.gridY;
    if (Math.abs(dx) + Math.abs(dy) === 1) {
      movePlayer(dx, dy);
    }
  }
});

// Mobile On-Screen D-Pad Controller Handlers
const bindDpad = (id, action) => {
  const btn = document.getElementById(id);
  if (!btn) return;
  const trigger = (e) => {
    e.preventDefault();
    e.stopPropagation();
    action();
  };
  btn.addEventListener('pointerdown', trigger);
};

bindDpad('dpad-up', () => movePlayer(0, -1));
bindDpad('dpad-down', () => movePlayer(0, 1));
bindDpad('dpad-left', () => movePlayer(-1, 0));
bindDpad('dpad-right', () => movePlayer(1, 0));
bindDpad('dpad-center-run', () => {
  const btnRun = document.getElementById('btn-run-pipeline');
  if (btnRun && !btnRun.disabled && !gameState.pipelineRunning) {
    executePipelineRun();
  } else {
    const levels = window.GAME_LEVELS || [];
    const currentLevel = levels[gameState.levelIndex];
    const stagedCount = Object.keys(gameState.stagedTasks).length;
    const total = currentLevel ? currentLevel.tasks.length : 5;
    showToast(`📦 Staged ${stagedCount}/${total} tasks. Stage all tasks to run pipeline!`);
  }
});

// Touch Swipe Gesture Support for Canvas
let touchStartX = 0;
let touchStartY = 0;

window.addEventListener('touchstart', e => {
  if (
    gameState.inBattle ||
    gameState.gameOver ||
    gameState.pipelineRunning ||
    e.target.closest('#ui-layer') ||
    e.target.closest('.modal-backdrop') ||
    e.target.closest('#battle-modal')
  ) {
    return;
  }
  if (e.touches && e.touches.length === 1) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }
}, { passive: true });

window.addEventListener('touchend', e => {
  if (
    gameState.inBattle ||
    gameState.gameOver ||
    gameState.pipelineRunning ||
    e.target.closest('#ui-layer') ||
    e.target.closest('.modal-backdrop') ||
    e.target.closest('#battle-modal')
  ) {
    return;
  }
  if (!e.changedTouches || e.changedTouches.length === 0) return;

  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  const swipeThreshold = 35; // px

  if (Math.max(absDx, absDy) > swipeThreshold) {
    if (absDx > absDy) {
      if (dx > 0) movePlayer(1, 0);  // Swipe Right
      else movePlayer(-1, 0);         // Swipe Left
    } else {
      if (dy > 0) movePlayer(0, 1);  // Swipe Down
      else movePlayer(0, -1);         // Swipe Up
    }
  }
}, { passive: true });

/**
 * Toast Notification Display
 */
function showToast(msg, duration = 2500) {
  const toast = document.getElementById('toast-msg');
  if (!toast) return;
  toast.innerHTML = msg;
  toast.style.display = 'block';
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    toast.style.display = 'none';
  }, duration);
}

// =============================================================================
// INITIAL STARTUP: SHOW START MENU & START 3D RENDER LOOP
// =============================================================================
// Build initial board for background display behind menu
loadLevel(0);

// Display Start Menu Modal initially
const initialStartModal = document.getElementById('start-menu-modal');
if (initialStartModal) {
  initialStartModal.style.display = 'flex';
}

// Start Three.js Animation Loop
engine.startRenderLoop(gameState);
