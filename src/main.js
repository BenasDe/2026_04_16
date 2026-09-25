/**
 * @file main.js
 * @description Main Game Controller, State Management, Input Handling, and HUD Orchestrator.
 */

const gameState = {
  player: {
    gridX: 0, gridY: 0, hp: 100, maxHp: 100, sanity: 100, maxSanity: 100,
    xp: 0, level: 1, redBulls: 2, clearedCount: 0, totalEnemies: 6
  },
  gridSize: 5, board: [], isMoving: false, inBattle: false, gameOver: false
};

const engine = new GameEngine('webgl-canvas');
gameState.board = engine.buildBoard(gameState.gridSize, window.ANOMALY_DATABASE);
gameState.player.totalEnemies = engine.interactiveObjects.filter(o => o.userData.isEnemy).length;
engine.setPlayerGridPosition(gameState.player.gridX, gameState.player.gridY, gameState.gridSize);

const battleSystem = new BattleSystem(engine, gameState, (won, enemy) => {
  if (won) {
    const cell = gameState.board[gameState.player.gridX][gameState.player.gridY];
    cell.cleared = true;
    gameState.player.clearedCount++;
    gameState.player.xp += 35;
    showToast('🎉 Transformation Succeeded! Anomaly resolved (+35 EXP)');
    engine.removeInteractiveObject(gameState.player.gridX, gameState.player.gridY);
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
    const remainingEnemies = engine.interactiveObjects.filter(o => o.userData.isEnemy);
    if (gameState.player.clearedCount >= gameState.player.totalEnemies || remainingEnemies.length === 0) triggerVictory();
  } else triggerGameOver();
});

function movePlayer(dx, dy) {
  if (gameState.isMoving || gameState.inBattle || gameState.gameOver) return;
  const newX = gameState.player.gridX + dx;
  const newY = gameState.player.gridY + dy;
  if (newX >= 0 && newX < gameState.gridSize && newY >= 0 && newY < gameState.gridSize) {
    gameState.player.gridX = newX;
    gameState.player.gridY = newY;
    gameState.isMoving = true;
    window.sfx.step();
    engine.animatePlayerMovement(newX, newY, gameState.gridSize, () => { gameState.isMoving = false; checkCurrentTile(); });
  }
}

/** Checks the contents of the current grid tile (Red Bull pickup or Data Anomaly). */
function checkCurrentTile() {
  const cell = gameState.board[gameState.player.gridX][gameState.player.gridY];
  if (!cell || cell.cleared) return;
  if (cell.type === 'redBull') {
    cell.cleared = true;
    gameState.player.redBulls++;
    gameState.player.sanity = Math.min(gameState.player.maxSanity, gameState.player.sanity + 25);
    gameState.player.hp = Math.min(gameState.player.maxHp, gameState.player.hp + 15);
    window.sfx.redBull();
    showToast('🥤 Red Bull & StackOverflow Break! Found +1 can (+25 Sanity, +15 Health)');
    engine.removeInteractiveObject(gameState.player.gridX, gameState.player.gridY);
    updateHUD();
  } else if (cell.type === 'enemy' && cell.data) battleSystem.startBattle(cell.data);
}

/** Restores Sanity and Health by consuming a can of Red Bull. */
function drinkRedBull() {
  if (gameState.player.redBulls > 0 && (gameState.player.sanity < gameState.player.maxSanity || gameState.player.hp < gameState.player.maxHp)) {
    gameState.player.redBulls--;
    gameState.player.sanity = Math.min(gameState.player.maxSanity, gameState.player.sanity + 30);
    gameState.player.hp = Math.min(gameState.player.maxHp, gameState.player.hp + 15);
    window.sfx.redBull();
    showToast('🥤 Gulp! Drank Red Bull (+30 Sanity, +15 Health)');
    updateHUD();
  } else if (gameState.player.redBulls <= 0) showToast('⚠️ No more Red Bull left! Find a can on the grid.');
  else showToast('⚡ Sanity and Health are already at 100%!');
}

function updateHUD() {
  const hpPct = Math.max(0, gameState.player.hp / gameState.player.maxHp * 100);
  document.getElementById('hp-bar').style.width = `${hpPct}%`;
  document.getElementById('hp-text').innerText = `${gameState.player.hp} / ${gameState.player.maxHp}`;
  const sanityPct = Math.max(0, gameState.player.sanity / gameState.player.maxSanity * 100);
  document.getElementById('sanity-bar').style.width = `${sanityPct}%`;
  document.getElementById('sanity-text').innerText = `${gameState.player.sanity} / ${gameState.player.maxSanity}`;
  document.body.classList.toggle('low-sanity', gameState.player.sanity < 30);
  const xpPct = Math.min(100, gameState.player.xp);
  document.getElementById('xp-bar').style.width = `${xpPct}%`;
  document.getElementById('xp-text').innerText = `${gameState.player.xp} / 100`;
  document.getElementById('red-bull-count').innerText = gameState.player.redBulls;
  document.getElementById('cleared-count').innerText = `${gameState.player.clearedCount} / ${gameState.player.totalEnemies}`;
}
window.updateHUD = updateHUD;

function showToast(msg, duration = 2500) {
  const toast = document.getElementById('toast-msg');
  toast.innerHTML = msg;
  toast.style.display = 'block';
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { toast.style.display = 'none'; }, duration);
}

function triggerGameOver() {
  gameState.gameOver = true;
  window.sfx.wrong();
  const modal = document.getElementById('game-end-modal');
  document.getElementById('end-title').innerText = '💥 PIPELINE CRASHED (OOM)';
  document.getElementById('end-title').style.color = 'var(--warning-red)';
  document.getElementById('end-desc').innerText = 'Your sanity reached zero or bad transformations corrupted the schema. The data pipeline reached critical deadlock.';
  modal.style.display = 'flex';
}

function triggerVictory() {
  gameState.gameOver = true;
  window.sfx.victory();
  const modal = document.getElementById('game-end-modal');
  document.getElementById('end-title').innerText = '🏆 GOLD LAYER CERTIFIED!';
  document.getElementById('end-title').style.color = '#7ee787';
  document.getElementById('end-desc').innerText = 'Outstanding PySpark mastery! All anomalies cleansed, nulls imputed, and duplicate records neutralized. Clean Gold tables delivered to production!';
  modal.style.display = 'flex';
}

window.addEventListener('keydown', e => {
  if (['ArrowUp', 'KeyW'].includes(e.code)) { e.preventDefault(); movePlayer(0, -1); }
  if (['ArrowDown', 'KeyS'].includes(e.code)) { e.preventDefault(); movePlayer(0, 1); }
  if (['ArrowLeft', 'KeyA'].includes(e.code)) { e.preventDefault(); movePlayer(-1, 0); }
  if (['ArrowRight', 'KeyD'].includes(e.code)) { e.preventDefault(); movePlayer(1, 0); }
  if (e.code === 'KeyC') drinkRedBull();
});

window.addEventListener('pointerdown', e => {
  if (gameState.inBattle || gameState.gameOver || e.target.closest('#ui-layer') || e.target.closest('#battle-modal')) return;
  engine.mouse.x = e.clientX / window.innerWidth * 2 - 1;
  engine.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  engine.raycaster.setFromCamera(engine.mouse, engine.camera);
  const intersects = engine.raycaster.intersectObjects(engine.tileMeshes);
  if (intersects.length > 0) {
    const targetTile = intersects[0].object;
    const dx = targetTile.userData.gridX - gameState.player.gridX;
    const dy = targetTile.userData.gridY - gameState.player.gridY;
    if (Math.abs(dx) + Math.abs(dy) === 1) movePlayer(dx, dy);
  }
});

document.getElementById('btn-drink-red-bull').addEventListener('click', drinkRedBull);
document.getElementById('btn-restart').addEventListener('click', () => window.location.reload());
updateHUD();
engine.startRenderLoop(gameState);
