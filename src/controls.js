window.bindGameControls = function ({ gameState, engine, movePlayer, executePipelineRun, showToast }) {
  window.addEventListener('keydown', e => {
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
      if (e.code === 'Enter' && document.activeElement?.id === 'player-name-input') {
        const saveBtn = document.getElementById('btn-save-score');
        if (saveBtn && !saveBtn.disabled) saveBtn.click();
      }
      return;
    }

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

      const dx = targetX - gameState.player.gridX;
      const dy = targetY - gameState.player.gridY;
      if (Math.abs(dx) + Math.abs(dy) === 1) {
        movePlayer(dx, dy);
      }
    }
  });

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
      showToast(`Staged ${stagedCount}/${total} tasks. Stage all tasks to run pipeline.`);
    }
  });

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
    const swipeThreshold = 35;

    if (Math.max(absDx, absDy) > swipeThreshold) {
      if (absDx > absDy) {
        if (dx > 0) movePlayer(1, 0);
        else movePlayer(-1, 0);
      } else {
        if (dy > 0) movePlayer(0, 1);
        else movePlayer(0, -1);
      }
    }
  }, { passive: true });
};
