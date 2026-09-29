const test = require('node:test');
const assert = require('node:assert/strict');
const {createGame} = require('./helpers/game-harness.cjs');

function pressDpadRun(game) {
  const handlers = game.byId.get('dpad-center-run').listeners.pointerdown;
  assert.equal(handlers.length, 1);
  let prevented = false, stopped = false;
  handlers[0]({
    preventDefault() { prevented = true; },
    stopPropagation() { stopped = true; }
  });
  assert(prevented && stopped, 'D-pad input must not propagate to board controls');
}

for (const language of ['lt', 'en', 'fallback']) {
  for (const [total, staged] of [[5, 0], [3, 2]]) {
    test(`D-pad RUN: ${language}, ${staged}/${total} staged shows a warning without running`, () => {
      const game = createGame({language: language === 'fallback' ? 'en' : language});
      // Use the second level and a different task count to catch hard-coded totals.
      game.context.GAME_LEVELS[1].tasks.length = total;
      game.run('loadLevel(1)');
      game.state.stagedTasks = Object.fromEntries(
        Array.from({length: staged}, (_, index) => [String(index), {}])
      );
      game.run('updateHUD()');
      const expected = language === 'fallback'
        ? `Staged ${staged}/${total} tasks. Stage all tasks to run pipeline.`
        : game.context.i18n.t('toast_stage_all_before_run', {staged, total});
      if (language === 'fallback') game.context.i18n = undefined;

      assert.equal(game.byId.get('btn-run-pipeline').disabled, true);
      pressDpadRun(game);
      assert.equal(game.byId.get('toast-msg').innerHTML, expected);
      assert.equal(game.state.pipelineRunning, false);
      assert.equal(game.delays.length, 0);
    });
  }
}

test('D-pad RUN still executes the pipeline when every task is staged', async () => {
  const game = createGame({language: 'en'});
  game.run('startGame()');
  game.stage(0);
  assert.equal(game.byId.get('btn-run-pipeline').disabled, false);

  pressDpadRun(game);
  assert.equal(game.state.pipelineRunning, true);
  assert.equal(game.byId.get('pipeline-diagnostic-modal').style.display, 'flex');
  // The harness resolves diagnostic delays immediately; flush that async work.
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(game.byId.get('diagnostic-footer').style.display, 'flex');
  assert.equal(game.state.stats.totalMistakes, 0);
  assert.equal(game.delays.reduce((sum, delay) => sum + delay, 0), 5300);
});
