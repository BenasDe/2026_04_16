const gameState = {
  levelIndex: 0,
  redBulls: 0,
  gridSize: 5,
  board: [],
  player: {
    gridX: 0,
    gridY: 0
  },
  stagedTasks: {},
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

const { formatStopwatch, startTimer, stopTimer, resetTimer, addTimerPenalty } = createGameTimer(gameState);
const { saveLeaderboardRecord, openLeaderboard, closeLeaderboard, clearLocalLeaderboard } = createLeaderboard(formatStopwatch);
const { renderLevel, updateHUD, showGameOver, showVictory, showToast, setStartMenuVisible, bindButtons } = createGameUI({ gameState, formatStopwatch });
const { executePipelineRun } = createPipelineRunner({
  gameState, updateHUD, showToast, addTimerPenalty, triggerGameOver, triggerVictory, loadLevel
});

const engine = new GameEngine('webgl-canvas');
const battleSystem = new BattleSystem(engine, gameState, (task, chosenSkill) => {
  handleTaskStaged(task, chosenSkill);
});

function loadLevel(levelIndex) {
  const levels = window.GAME_LEVELS || [];
  if (levelIndex >= levels.length) {
    triggerVictory();
    return;
  }

  gameState.levelIndex = levelIndex;
  const currentLevel = levels[levelIndex];

  gameState.stagedTasks = {};
  gameState.player.gridX = 0;
  gameState.player.gridY = 0;
  gameState.isMoving = false;
  gameState.inBattle = false;
  gameState.pipelineRunning = false;

  gameState.board = engine.buildBoard(
    gameState.gridSize,
    currentLevel.tasks,
    currentLevel.redBullsToPlace !== undefined ? currentLevel.redBullsToPlace : 2
  );

  engine.setPlayerGridPosition(0, 0, gameState.gridSize);
  renderLevel(currentLevel, levelIndex);
  updateHUD();
  showToast(`Entered ${currentLevel.name}. Collect Red Bull and stage queries.`);
}

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

  if (cell.type === 'redBull' && !cell.cleared) {
    cell.cleared = true;
    gameState.redBulls += 1;
    if (gameState.stats) gameState.stats.totalScavenged += 1;
    if (window.sfx && window.sfx.redBull) window.sfx.redBull();
    showToast(`Scavenged Red Bull (+1 hotfix fuel, total: ${gameState.redBulls}).`);
    engine.removeInteractiveObject(gameState.player.gridX, gameState.player.gridY);
    updateHUD();
    return;
  }

  if (cell.type === 'enemy' && cell.data) {
    const currentLevel = (window.GAME_LEVELS || [])[gameState.levelIndex];
    const isAlreadyStaged = !!gameState.stagedTasks[cell.data.id];

    if (isAlreadyStaged) {
      showToast(`Task already staged into DAG (${Object.keys(gameState.stagedTasks).length}/${currentLevel.tasks.length}).`);
    } else {
      battleSystem.startBattle(cell.data, currentLevel.engine);
    }
  }
}

function handleTaskStaged(task, chosenSkill) {
  gameState.stagedTasks[task.id] = {
    task,
    chosenSkill,
    gridX: gameState.player.gridX,
    gridY: gameState.player.gridY
  };

  engine.markTaskAsStaged(gameState.player.gridX, gameState.player.gridY);

  const levels = window.GAME_LEVELS || [];
  const currentLevel = levels[gameState.levelIndex];
  const stagedCount = Object.keys(gameState.stagedTasks).length;
  const totalTasks = currentLevel ? currentLevel.tasks.length : 5;

  updateHUD();

  if (stagedCount >= totalTasks) {
    if (window.sfx && window.sfx.levelClear) window.sfx.levelClear();
    showToast('All tasks staged. Run pipeline to compile and deploy.', 3500);
  } else {
    showToast(`Staged query for "${task.name}" (${stagedCount}/${totalTasks}).`);
  }
}

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

function startGame() {
  window.music.start();
  if (window.sfx && window.sfx.initAudio) {
    window.sfx.initAudio();
  }

  setStartMenuVisible(false);
  gameState.redBulls = 0;
  gameState.stats = { totalScavenged: 0, totalMistakes: 0 };
  gameState.gameOver = false;
  gameState.pipelineRunning = false;
  resetTimer();
  startTimer();
  loadLevel(0);
}

bindButtons({
  startGame, executePipelineRun, saveLeaderboardRecord,
  openLeaderboard, closeLeaderboard, clearLocalLeaderboard
});

bindGameControls({ gameState, engine, movePlayer, executePipelineRun, showToast });

loadLevel(0);
setStartMenuVisible(true);
engine.startRenderLoop(gameState);
