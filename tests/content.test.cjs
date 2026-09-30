const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const {spawnSync} = require('node:child_process');
const {loadContent} = require('../scripts/validate-content.cjs');
const {createGame, ROOT, scripts} = require('./helpers/game-harness.cjs');
const {pack: sourcePack, validate} = loadContent();
const clone = value => JSON.parse(JSON.stringify(value));
const firstTask = pack => pack.levels[0].tasks[0];
const firstSkill = pack => firstTask(pack).skills[0];

test('registered content passes schema v1 and loads before localization/gameplay', () => {
  const pack = clone(sourcePack);
  assert.equal(validate(pack), pack);
  assert.equal(pack.levels.length, 3);
  assert.equal(pack.levels.flatMap(level => level.tasks).length, 15);
  assert.equal(pack.levels.flatMap(level => level.tasks.flatMap(task => task.skills)).length, 60);
  assert(scripts.indexOf('src/data.js') < scripts.indexOf('src/i18n.js'));
  assert(scripts.indexOf('src/data.js') < scripts.indexOf('src/main.js'));
});

test('missing or duplicate registered levels cannot silently change the campaign', () => {
  const context = {window: {}};
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'src/content-pack.js'), 'utf8'), context);
  const api = context.window.GameContent;
  assert.throws(() => api.getLevel('missing'), /level "missing" is not registered/);
  api.registerLevel(clone(sourcePack.levels[0]));
  assert.equal(api.getLevel('bronze').id, 'bronze');
  assert.throws(() => api.registerLevel(clone(sourcePack.levels[0])), /duplicate level registration/);
  assert.throws(() => api.getLevel('bronze'), /duplicate level registration/);
});

const invalidCases = [
  ['unsupported version', p => {p.schemaVersion = 2;}, /pack.schemaVersion/],
  ['unsupported base language', p => {p.defaultLanguage = 'lt';}, /pack.defaultLanguage/],
  ['missing supported language', p => {p.languages = ['en'];}, /missing required language "lt"/],
  ['unsupported language', p => {p.languages.push('fr');}, /unsupported language/],
  ['duplicate language', p => {p.languages.push('lt');}, /duplicate language/],
  ['fractional grid size', p => {p.gridSize = 4.5;}, /pack.gridSize/],
  ['invalid grid size', p => {p.gridSize = 0;}, /pack.gridSize/],
  ['unsafe board area', p => {p.gridSize = Number.MAX_SAFE_INTEGER;}, /board area/],
  ['empty campaign', p => {p.levels = [];}, /pack.levels/],
  ['duplicate level ID', p => {p.levels[1].id = p.levels[0].id;}, /duplicate ID "bronze"/],
  ['duplicate task ID within a level', p => {p.levels[0].tasks[1].id = firstTask(p).id;}, /duplicate ID "b_chimera"/],
  ['duplicate task ID across levels', p => {p.levels[1].tasks[0].id = firstTask(p).id;}, /duplicate ID "b_chimera"/],
  ['duplicate answer ID within a task', p => {firstTask(p).skills[1].id = firstSkill(p).id;}, /duplicate ID "deduplicate_by_transaction_id"/],
  ['duplicate answer ID across tasks', p => {p.levels[1].tasks[0].skills[0].id = firstSkill(p).id;}, /duplicate ID "deduplicate_by_transaction_id"/],
  ['unstable numeric answer ID', p => {firstSkill(p).id = 1;}, /skills\[0\].id/],
  ['reserved task ID', p => {firstTask(p).id = 'constructor';}, /non-reserved/],
  ['no correct answer', p => {firstSkill(p).correct = false;}, /exactly one correct answer; found 0/],
  ['multiple correct answers', p => {firstTask(p).skills[1].correct = true;}, /exactly one correct answer; found 2/],
  ['truthy correctness string', p => {firstSkill(p).correct = 'true';}, /correct: must be a boolean/],
  ['only one choice', p => {firstTask(p).skills.length = 1;}, /at least 2/],
  ['negative fuel', p => {p.levels[0].fuelToPlace = -1;}, /fuelToPlace/],
  ['fractional fuel', p => {p.levels[0].fuelToPlace = 1.5;}, /fuelToPlace/],
  ['board overflow including reserved start', p => {p.levels[0].fuelToPlace = 20;}, /one cell is reserved for the start/],
  ['missing level translation', p => {p.levels[0].translations = {};}, /translations.lt/],
  ['missing task translation', p => {firstTask(p).translations = {};}, /translations.lt/],
  ['missing answer translation', p => {delete firstTask(p).translations.lt.skills[firstSkill(p).id];}, /translations.lt.skills.deduplicate_by_transaction_id/],
  ['stale answer translation ID', p => {firstTask(p).translations.lt.skills.deleted_answer = {label: 'Old', explain: 'Old'};}, /deleted_answer: unknown field/],
  ['positional answer translations', p => {firstTask(p).translations.lt.skills = Object.values(firstTask(p).translations.lt.skills);}, /translations.lt.skills: must be an object/],
  ['blank translated explanation', p => {firstTask(p).translations.lt.skills[firstSkill(p).id].explain = ' ';}, /explain: must be a non-empty string/],
  ['translated correctness override', p => {firstTask(p).translations.lt.skills[firstSkill(p).id].correct = false;}, /correct: unknown field/],
  ['unknown field typo', p => {p.levels[0].fuelToPLace = 2;}, /fuelToPLace: unknown field/],
  ['wrong preview row width', p => {firstTask(p).tableRows[0].pop();}, /cell count must match/],
  ['invalid preview cell', p => {firstTask(p).tableRows[0][0] = {};}, /finite number/],
  ['invalid highlight index', p => {firstTask(p).glitchIndices = [4];}, /row index is out of bounds/],
  ['duplicate highlight index', p => {firstTask(p).glitchIndices = [1, 1];}, /duplicate row index/],
  ['sparse task array', p => {delete p.levels[0].tasks[0];}, /tasks\[0\]: must be an object/],
  ['inherited required field', p => {const skill = firstSkill(p); delete skill.code; Object.setPrototypeOf(skill, {code: 'inherited'});}, /code: required field is missing/]
];
for (const [name, mutate, expected] of invalidCases) {
  test(`validation rejects ${name}`, () => {
    const pack = clone(sourcePack);
    mutate(pack);
    assert.throws(() => validate(pack), error => error.name === 'ContentPackValidationError' && expected.test(error.message));
  });
}

test('all documented required fields are enforced, including English and LT text', () => {
  const records = [
    [p => p, ['schemaVersion', 'id', 'defaultLanguage', 'languages', 'gridSize', 'levels']],
    [p => p.levels[0], ['id', 'name', 'engine', 'description', 'fuelToPlace', 'tasks', 'translations']],
    [firstTask, ['id', 'name', 'desc', 'tableHeaders', 'tableRows', 'glitchIndices', 'skills', 'translations']],
    [firstSkill, ['id', 'code', 'label', 'correct', 'explain']],
    [p => p.levels[0].translations.lt, ['name', 'description']],
    [p => firstTask(p).translations.lt, ['name', 'desc', 'skills']],
    [p => firstTask(p).translations.lt.skills[firstSkill(p).id], ['label', 'explain']]
  ];
  for (const [getRecord, fields] of records) for (const field of fields) {
    const pack = clone(sourcePack);
    delete getRecord(pack)[field];
    assert.throws(() => validate(pack), /required field is missing/, field);
  }
  for (const value of [null, [], 'pack']) assert.throws(() => validate(value), /pack: must be an object/);
});

test('exact board capacity is accepted and every task/pickup is placed', () => {
  const game = createGame({prepareContent(pack) {pack.levels[0].fuelToPlace = 19;}});
  const cells = game.state.board.flat();
  assert.equal(cells.filter(cell => cell.type === 'start').length, 1);
  assert.equal(cells.filter(cell => cell.type === 'fuel').length, 19);
  assert.equal(cells.filter(cell => cell.type === 'enemy').length, 5);
});

test('the game uses the validated pack grid size', () => {
  const game = createGame({prepareContent(pack) {
    pack.gridSize = 2;
    for (const level of pack.levels) level.tasks = level.tasks.slice(0, 1);
  }});
  assert.equal(game.state.gridSize, 2);
  assert.equal(game.state.board.flat().length, 4);
  assert.equal(game.state.board.flat().filter(cell => cell.type === 'enemy').length, 1);
});

test('reordering levels, tasks, choices and translation keys preserves LT associations', () => {
  const expected = new Map(sourcePack.levels.flatMap(level => level.tasks.map(task => [task.id, clone(task)])));
  const game = createGame({language: 'lt', prepareContent(pack) {
    pack.levels.reverse();
    for (const level of pack.levels) {
      level.tasks.reverse();
      for (const task of level.tasks) {
        task.skills.reverse();
        task.translations.lt.skills = Object.fromEntries(Object.entries(task.translations.lt.skills).reverse());
      }
    }
  }});
  for (const level of game.context.GAME_LEVELS) {
    assert.equal(game.context.i18n.getLocalizedLevel(level).name, level.translations.lt.name);
    for (const task of level.tasks) {
      const original = expected.get(task.id), localized = game.context.i18n.getLocalizedTask(task);
      assert.equal(localized.name, original.translations.lt.name);
      for (const answer of localized.skills) {
        assert.equal(answer.label, original.translations.lt.skills[answer.id].label);
        assert.equal(answer.explain, original.translations.lt.skills[answer.id].explain);
        assert.equal(answer.correct, original.skills.find(skill => skill.id === answer.id).correct);
      }
    }
  }
  game.context.i18n.setLanguage('en');
  const task = game.context.GAME_LEVELS[0].tasks[0];
  assert.equal(game.context.i18n.getLocalizedTask(task), task);
});

test('diagnostics match the selected answer ID after a language change, even with identical code', async () => {
  const game = createGame({language: 'en', prepareContent(pack) {
    const task = firstTask(pack);
    task.skills[1].code = task.skills[0].code;
    task.translations.lt.skills[task.skills[0].id].explain = 'CORRECT_ANSWER_EXPLANATION';
    task.translations.lt.skills[task.skills[1].id].explain = 'SELECTED_WRONG_ANSWER_EXPLANATION';
  }});
  game.run('startGame()');
  game.collect();
  game.stage(0);
  const task = game.context.GAME_LEVELS[0].tasks[0];
  game.state.stagedTasks[task.id].chosenSkill = task.skills[1];
  game.context.i18n.setLanguage('lt');
  await game.run('executePipelineRun()');
  const diagnostic = game.byId.get('diagnostic-terminal').children.map(line => line.innerText).join('\n');
  assert.match(diagnostic, /SELECTED_WRONG_ANSWER_EXPLANATION/);
  assert.doesNotMatch(diagnostic, /CORRECT_ANSWER_EXPLANATION/);
  assert.equal(game.state.fuel, 1);
  assert.equal(game.state.stats.totalMistakes, 1);
});

function extraLevel(base, id) {
  const level = clone(base);
  level.id = id;
  level.name = `Fixture ${id}`;
  level.translations.lt.name = `Bandymas ${id}`;
  level.tasks = level.tasks.slice(0, 1);
  for (const task of level.tasks) {
    task.id = `${id}_${task.id}`;
    const translated = {};
    for (const skill of task.skills) {
      const oldId = skill.id;
      skill.id = `${id}_${oldId}`;
      translated[skill.id] = task.translations.lt.skills[oldId];
    }
    task.translations.lt.skills = translated;
  }
  return level;
}

for (const length of [4, 5]) for (const language of ['lt', 'en']) {
  test(`${length}-level campaign completes in ${language} without engine changes`, async () => {
    const game = createGame({language, prepareContent(pack) {
      pack.levels.push(extraLevel(pack.levels[0], 'streaming'));
      if (length === 5) pack.levels.push(extraLevel(pack.levels[0], 'iceberg'));
    }});
    assert(game.context.i18n.t('rule_levels').includes(String(length)));
    assert(game.context.i18n.t('rule_levels').includes(language === 'lt' ? 'Bandymas streaming' : 'Fixture streaming'));
    game.run('startGame()');
    for (let index = 0; index < length; index++) {
      assert.equal(game.state.levelIndex, index);
      game.collect();
      game.stage(0);
      await game.run('executePipelineRun()');
      await game.byId.get('btn-diagnostic-action').click();
      assert.equal(game.state.gameOver, index === length - 1);
    }
    assert.equal(game.state.stats.totalMistakes, 0);
    assert.equal(game.state.fuel, length * 2);
    assert.equal(game.state.timer.running, false);
    assert.equal(game.byId.get('end-desc').innerText, game.context.i18n.t('victory_desc'));
    assert(game.byId.get('end-desc').innerText.includes(String(length)));
  });
}

test('invalid content displays its error and gates startup even if later scripts execute', () => {
  const errorNode = {hidden: true}, startButton = {disabled: false}, menu = {style: {display: 'none'}};
  const context = {
    window: {GameContent: {validate, getLevel: () => undefined}},
    document: {getElementById: id => ({'content-error': errorNode, 'btn-start-game': startButton, 'start-menu-modal': menu})[id]}
  };
  vm.createContext(context);
  assert.throws(() => vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/data.js'), 'utf8'), context), /Invalid content pack/);
  assert.equal(context.window.GAME_LEVELS, null);
  assert.equal(errorNode.hidden, false);
  assert.match(errorNode.textContent, /pack.levels/);
  assert.equal(startButton.disabled, true);
  assert.equal(menu.style.display, 'flex');
  assert.throws(() => vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/main.js'), 'utf8'), context), /Game content was not validated/);
});

test('development CLI validates the HTML-registered pack and fails for invalid content', t => {
  const valid = spawnSync(process.execPath, ['scripts/validate-content.cjs'], {cwd: ROOT, encoding: 'utf8'});
  assert.equal(valid.status, 0, valid.stderr);
  assert.match(valid.stdout, /3 levels, 15 tasks, 60 answers/);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'content-pack-test-'));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  for (const file of ['src/content-pack.js', 'src/data.js', 'scripts/validate-content.cjs']) {
    fs.mkdirSync(path.dirname(path.join(directory, file)), {recursive: true});
    fs.copyFileSync(path.join(ROOT, file), path.join(directory, file));
  }
  // No level scripts registered: the same manifest used by the browser must fail.
  fs.writeFileSync(path.join(directory, 'index.html'), '<script src="src/content-pack.js"></script><script src="src/data.js"></script>');
  const invalid = spawnSync(process.execPath, ['scripts/validate-content.cjs'], {cwd: directory, encoding: 'utf8'});
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /Invalid content pack/);
});
