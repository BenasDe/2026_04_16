/**
 * @file main.js
 * @description Game controller: shared state, level progression, and subsystem wiring.
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
  stats: {
    totalScavenged: 0,
    totalMistakes: 0
  },
  timer: {
    startTime: null,
    elapsedMs: 0,
    intervalId: null,
    running: false
  }
};

// Create subsystems with explicit dependencies. Callbacks run after initialization.
const { formatStopwatch, startTimer, stopTimer, resetTimer, addTimerPenalty } = createGameTimer(gameState);
const { saveLeaderboardRecord, openLeaderboard, closeLeaderboard, clearLocalLeaderboard } = createLeaderboard(formatStopwatch);
const { executePipelineRun } = createPipelineRunner({
  gameState, updateHUD, showToast, addTimerPenalty, triggerGameOver, triggerVictory, loadLevel
});

// Instantiate 3D Engine
const engine = new GameEngine('webgl-canvas');

// Instantiate Battle System with Blind Staging Hook
const battleSystem = new BattleSystem(engine, gameState, (task, chosenSkill) => {
  handleTaskStaged(task, chosenSkill);
});

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
    currentLevel.redBullsToPlace !== undefined ? currentLevel.redBullsToPlace : 2
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
    if (gameState.stats) gameState.stats.totalScavenged += 1;
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
  gameState.stats = { totalScavenged: 0, totalMistakes: 0 };
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

bindGameControls({ gameState, engine, movePlayer, executePipelineRun, showToast });

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
