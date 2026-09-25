window.createGameTimer = function (gameState) {
  const formatStopwatch = (ms) => window.Utils ? window.Utils.formatStopwatch(ms) : `${Math.floor(ms / 1000)}s`;

  function startTimer() {
    if (gameState.timer.running) return;
    gameState.timer.startTime = Date.now() - gameState.timer.elapsedMs;
    gameState.timer.running = true;

    gameState.timer.intervalId = setInterval(() => {
      gameState.timer.elapsedMs = Date.now() - gameState.timer.startTime;
      const formatted = formatStopwatch(gameState.timer.elapsedMs);
      const timerEl = document.getElementById('timer-display');
      if (timerEl) {
        timerEl.innerText = formatted;
      }
    }, 41);
  }

  function addTimerPenalty(ms = 60000) {
    if (gameState.timer.startTime) {
      gameState.timer.startTime -= ms;
    }
    gameState.timer.elapsedMs += ms;
    const formatted = formatStopwatch(gameState.timer.elapsedMs);
    const timerEl = document.getElementById('timer-display');
    if (timerEl) {
      timerEl.innerText = formatted;
      timerEl.style.color = '#ef4444';
      setTimeout(() => {
        if (timerEl) timerEl.style.color = '#ffffff';
      }, 700);
    }
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
      timerEl.innerText = '00:00.00';
    }
  }

  return { formatStopwatch, startTimer, stopTimer, resetTimer, addTimerPenalty };
};
