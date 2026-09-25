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
const { renderLevel, updateHUD, showGameOver, showVictory, showToast, setStartMenuVisible, bindButtons } = createGameUI({ gameState, formatStopwatch });
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

  renderLevel(currentLevel, levelIndex);

  updateHUD();
  showToast(` Entered ${currentLevel.name}! Collect Red Bull & stage fixes.`);
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
    showToast(` Scavenged Red Bull! (+1 Hotfix Fuel, Total: ${gameState.redBulls})`);
    engine.removeInteractiveObject(gameState.player.gridX, gameState.player.gridY);
    updateHUD();
    return;
  }

  // 2. Data Anomaly Task
  if (cell.type === 'enemy' && cell.data) {
    const currentLevel = (window.GAME_LEVELS || [])[gameState.levelIndex];
    const isAlreadyStaged = !!gameState.stagedTasks[cell.data.id];

    if (isAlreadyStaged) {
      showToast(` Task already staged into DAG. (All staged: ${Object.keys(gameState.stagedTasks).length}/${currentLevel.tasks.length})`);
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
    showToast(' ALL TASKS STAGED! Click " RUN PIPELINE" to execute deployment!', 3500);
  } else {
    showToast(` Staged fix for "${task.name}" (${stagedCount} / ${totalTasks})`);
  }
}

// =============================================================================
// GAME OVER & VICTORY
// =============================================================================
function triggerGameOver() {
  stopTimer();
  gameState.gameOver = true;
  if (window.sfx && window.sfx.wrong) window.sfx.wrong();

  showGameOver();
}

function triggerVictory() {
  stopTimer();
  gameState.gameOver = true;
  if (window.sfx && window.sfx.victory) window.sfx.victory();

  showVictory();
}

// =============================================================================
// GAME START / RESET FLOW
// =============================================================================
function startGame() {
  window.music.start();
  // Initialize audio synthesizer on user gesture
  if (window.sfx && window.sfx.initAudio) {
    window.sfx.initAudio();
  }

  // Close Start Menu
  setStartMenuVisible(false);

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

bindButtons({
  startGame, executePipelineRun, saveLeaderboardRecord,
  openLeaderboard, closeLeaderboard, clearLocalLeaderboard
});

bindGameControls({ gameState, engine, movePlayer, executePipelineRun, showToast });

// =============================================================================
// INITIAL STARTUP: SHOW START MENU & START 3D RENDER LOOP
// =============================================================================
// Build initial board for background display behind menu
loadLevel(0);

// Display Start Menu Modal initially
setStartMenuVisible(true);

// Start Three.js Animation Loop
engine.startRenderLoop(gameState);
