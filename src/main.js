/**
 * @file main.js
 * @description Main Game Controller, State Management, Input Handling, and HUD Orchestrator.
 */

// Global Game State
const gameState = {
  player: {
    gridX: 0,
    gridY: 0,
    hp: 100,
    maxHp: 100,
    sanity: 100,
    maxSanity: 100,
    xp: 0,
    level: 1,
    redBulls: 2,
    clearedCount: 0,
    totalEnemies: 6
  },
  gridSize: 5,
  board: [],
  isMoving: false,
  inBattle: false,
  gameOver: false
};

// Initialize Engine and Systems
const engine = new GameEngine('webgl-canvas');
gameState.board = engine.buildBoard(gameState.gridSize, window.ANOMALY_DATABASE);
gameState.player.totalEnemies = engine.interactiveObjects.filter(o => o.userData.isEnemy).length;

// Snap player and camera to the initial start tile (0, 0) on initial load
engine.setPlayerGridPosition(gameState.player.gridX, gameState.player.gridY, gameState.gridSize);

// Initialize Battle Manager with resolution callback
const battleSystem = new BattleSystem(engine, gameState, (won, enemy) => {
  if (won) {
    const cell = gameState.board[gameState.player.gridX][gameState.player.gridY];
    cell.cleared = true;
    gameState.player.clearedCount++;
    gameState.player.xp += 35;
    showToast(`🎉 Transformation Succeeded! Anomaly resolved (+35 EXP)`);

    // Remove 3D Mesh
    engine.removeInteractiveObject(gameState.player.gridX, gameState.player.gridY);

    // Level Up Progression Check
    if (gameState.player.xp >= 100 && gameState.player.level === 1) {
      gameState.player.level = 2;
      gameState.player.xp -= 100;
      document.getElementById('dev-rank').innerText = 'LVL 2 SENIOR DE';
      document.getElementById('pipeline-status').innerText = 'Silver Layer (Refined)';
      showToast('🌟 PROMOTED TO SENIOR DATA ENGINEER! Pipeline elevated to Silver Layer!');
    } else if (gameState.player.xp >= 100 && gameState.player.level === 2) {
      gameState.player.level = 3;
      document.getElementById('dev-rank').innerText = 'LVL 3 SPARK ARCHITECT';
      document.getElementById('pipeline-status').innerText = 'Gold Layer (Production Gold)';
      showToast('👑 PROMOTED TO PRINCIPAL SPARK ARCHITECT!');
    }

    updateHUD();

    // Check Victory Condition
    const remainingEnemies = engine.interactiveObjects.filter(o => o.userData.isEnemy);
    if (gameState.player.clearedCount >= gameState.player.totalEnemies || remainingEnemies.length === 0) {
      triggerVictory();
    }
  } else {
    triggerGameOver();
  }
});

/**
 * Moves the player on the grid by a relative delta (dx, dy).
 * @param {number} dx - Change in X (-1, 0, 1).
 * @param {number} dy - Change in Y (-1, 0, 1).
 */
function movePlayer(dx, dy) {
  if (gameState.isMoving || gameState.inBattle || gameState.gameOver) return;

  const newX = gameState.player.gridX + dx;
  const newY = gameState.player.gridY + dy;

  if (newX >= 0 && newX < gameState.gridSize && newY >= 0 && newY < gameState.gridSize) {
    gameState.player.gridX = newX;
    gameState.player.gridY = newY;
    gameState.isMoving = true;
    window.sfx.step();

    engine.animatePlayerMovement(newX, newY, gameState.gridSize, () => {
      gameState.isMoving = false;
      checkCurrentTile();
    });
  }
}

/**
 * Checks the contents of the current grid tile (Red Bull pickup or Data Anomaly).
 */
function checkCurrentTile() {
  const cell = gameState.board[gameState.player.gridX][gameState.player.gridY];
  if (!cell || cell.cleared) return;

  if (cell.type === 'redBull') {
    cell.cleared = true;
    gameState.player.redBulls += 1;
    gameState.player.sanity = Math.min(gameState.player.maxSanity, gameState.player.sanity + 25);
    gameState.player.hp = Math.min(gameState.player.maxHp, gameState.player.hp + 15);
    window.sfx.redBull();
    showToast('⚡ Red Bull & StackOverflow Break! Found +1 can (+25 Sanity, +15 Health)');

    engine.removeInteractiveObject(gameState.player.gridX, gameState.player.gridY);
    updateHUD();
  } else if (cell.type === 'enemy' && cell.data) {
    battleSystem.startBattle(cell.data);
  }
}

/**
 * Restores Sanity and Health by consuming a can of Red Bull.
 */
function drinkRedBull() {
  if (
    gameState.player.redBulls > 0 &&
    (gameState.player.sanity < gameState.player.maxSanity || gameState.player.hp < gameState.player.maxHp)
  ) {
    gameState.player.redBulls--;
    gameState.player.sanity = Math.min(gameState.player.maxSanity, gameState.player.sanity + 30);
    gameState.player.hp = Math.min(gameState.player.maxHp, gameState.player.hp + 15);
    window.sfx.redBull();
    showToast('⚡ Gulp! Drank Red Bull (+30 Sanity, +15 Health)');
    updateHUD();
  } else if (gameState.player.redBulls <= 0) {
    showToast('⚠️ No more Red Bull left! Find a can on the grid.');
  } else {
    showToast('⚡ Sanity and Health are already at 100%!');
  }
}

/**
 * Updates top status bar meters (Health, Sanity, EXP, Red Bull counts).
 */
function updateHUD() {
  // HP Bar
  const hpPct = Math.max(0, (gameState.player.hp / gameState.player.maxHp) * 100);
  document.getElementById('hp-bar').style.width = `${hpPct}%`;
  document.getElementById('hp-text').innerText = `${gameState.player.hp} / ${gameState.player.maxHp}`;

  // Sanity Bar
  const sanityPct = Math.max(0, (gameState.player.sanity / gameState.player.maxSanity) * 100);
  document.getElementById('sanity-bar').style.width = `${sanityPct}%`;
  document.getElementById('sanity-text').innerText = `${gameState.player.sanity} / ${gameState.player.maxSanity}`;

  // Glitch effect on low sanity
  if (gameState.player.sanity < 30) {
    document.body.classList.add('low-sanity');
  } else {
    document.body.classList.remove('low-sanity');
  }

  // XP Bar
  const xpPct = Math.min(100, gameState.player.xp);
  document.getElementById('xp-bar').style.width = `${xpPct}%`;
  document.getElementById('xp-text').innerText = `${gameState.player.xp} / 100`;

  // Counters
  document.getElementById('red-bull-count').innerText = gameState.player.redBulls;
  document.getElementById('cleared-count').innerText = `${gameState.player.clearedCount} / ${gameState.player.totalEnemies}`;
}
window.updateHUD = updateHUD;

/**
 * Displays a non-blocking toast message overlay.
 * @param {string} msg
 * @param {number} duration
 */
function showToast(msg, duration = 2500) {
  const toast = document.getElementById('toast-msg');
  toast.innerHTML = msg;
  toast.style.display = 'block';
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    toast.style.display = 'none';
  }, duration);
}

/**
 * Triggers Game Over modal on pipeline failure.
 */
function triggerGameOver() {
  gameState.gameOver = true;
  window.sfx.wrong();
  const modal = document.getElementById('game-end-modal');
  document.getElementById('end-title').innerText = '💥 PIPELINE CRASHED (OOM)';
  document.getElementById('end-title').style.color = 'var(--warning-red)';
  document.getElementById('end-desc').innerText =
    'Your sanity reached zero or bad transformations corrupted the schema. The data pipeline reached critical deadlock.';
  modal.style.display = 'flex';
}

/**
 * Triggers Victory modal on gold layer certification.
 */
function triggerVictory() {
  gameState.gameOver = true;
  window.sfx.victory();
  const modal = document.getElementById('game-end-modal');
  document.getElementById('end-title').innerText = '🏆 GOLD LAYER CERTIFIED!';
  document.getElementById('end-title').style.color = '#ffffff';
  document.getElementById('end-desc').innerText =
    'Outstanding PySpark mastery! All anomalies cleansed, nulls imputed, and duplicate records neutralized. Clean Gold tables delivered to production!';
  modal.style.display = 'flex';
}

/* =========================================================================
   KEYBOARD & MOUSE EVENT LISTENERS
   ========================================================================= */

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
  if (e.code === 'KeyC') {
    drinkRedBull();
  }
});

// Tile Hover Highlighting for intuitive cursor feedback
let hoveredTile = null;

window.addEventListener('pointermove', e => {
  if (gameState.inBattle || gameState.gameOver || e.target.closest('#ui-layer') || e.target.closest('#battle-modal')) {
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
    e.target.closest('#ui-layer') ||
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

// UI Button Handlers
document.getElementById('btn-drink-red-bull').addEventListener('click', drinkRedBull);
document.getElementById('btn-restart').addEventListener('click', () => {
  window.location.reload();
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
bindDpad('dpad-red-bull', () => drinkRedBull());

// Touch Swipe Gesture Support for Canvas
let touchStartX = 0;
let touchStartY = 0;

window.addEventListener('touchstart', e => {
  if (gameState.inBattle || gameState.gameOver || e.target.closest('#ui-layer') || e.target.closest('#battle-modal')) return;
  if (e.touches && e.touches.length === 1) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }
}, { passive: true });

window.addEventListener('touchend', e => {
  if (gameState.inBattle || gameState.gameOver || e.target.closest('#ui-layer') || e.target.closest('#battle-modal')) return;
  if (!e.changedTouches || e.changedTouches.length === 0) return;

  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  const swipeThreshold = 35; // px

  if (Math.max(absDx, absDy) > swipeThreshold) {
    if (absDx > absDy) {
      // Horizontal Swipe
      if (dx > 0) movePlayer(1, 0);  // Swipe Right
      else movePlayer(-1, 0);         // Swipe Left
    } else {
      // Vertical Swipe
      if (dy > 0) movePlayer(0, 1);  // Swipe Down
      else movePlayer(0, -1);         // Swipe Up
    }
  }
}, { passive: true });

// Start Render Loop & Initial HUD Sync
updateHUD();
engine.startRenderLoop(gameState);
