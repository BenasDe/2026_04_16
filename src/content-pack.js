/** Content-pack schema v1. No renderer, DOM, network or third-party dependencies. */
(function () {
  'use strict';

  const SUPPORTED_LANGUAGES = Object.freeze(['en', 'lt']);
  const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const definitions = new Map();
  let registrationError = null;

  function registerLevel(level) {
    if (!level || typeof level.id !== 'string' || !level.id.trim()) {
      registrationError = new Error('Invalid content pack: a registered level must have a stable string ID.');
    } else if (definitions.has(level.id)) {
      registrationError = new Error(`Invalid content pack: duplicate level registration "${level.id}".`);
    }
    if (registrationError) throw registrationError;
    definitions.set(level.id, level);
  }

  function getLevel(id) {
    // Earlier script errors must still block startup if the browser continues.
    if (registrationError) throw registrationError;
    if (!definitions.has(id)) throw new Error(`Invalid content pack: level "${id}" is not registered. Check its script in index.html.`);
    return definitions.get(id);
  }

  function validate(pack) {
    const errors = [];
    const levelIds = new Map(), taskIds = new Map(), skillIds = new Map();
    const issue = (path, message) => errors.push(`${path}: ${message}`);

    function record(value, path, keys) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        issue(path, 'must be an object');
        return false;
      }
      for (const key of Object.keys(value)) {
        if (!keys.includes(key)) issue(`${path}.${key}`, 'unknown field');
      }
      for (const key of keys) {
        if (!hasOwn(value, key)) issue(`${path}.${key}`, 'required field is missing');
      }
      return true;
    }

    function text(value, path) {
      if (typeof value !== 'string' || !value.trim()) {
        issue(path, 'must be a non-empty string');
        return false;
      }
      return true;
    }

    function array(value, path, minimum = 0) {
      if (!Array.isArray(value) || value.length < minimum) {
        issue(path, `must be an array with at least ${minimum} item(s)`);
        return false;
      }
      return true;
    }

    function identifier(value, path, seen) {
      if (!text(value, path)) return;
      if (!/^[a-z][a-z0-9_]*$/.test(value) || hasOwn(Object.prototype, value)) {
        issue(path, 'must be a non-reserved lowercase snake_case ID');
      } else if (seen) {
        if (seen.has(value)) issue(path, `duplicate ID "${value}"; first used at ${seen.get(value)}`);
        else seen.set(value, path);
      }
    }

    function integer(value, path, minimum) {
      if (!Number.isSafeInteger(value) || value < minimum) {
        issue(path, `must be an integer >= ${minimum}`);
        return false;
      }
      return true;
    }

    function translations(value, path, fields, skills) {
      // English lives in the base fields. Every other supported language is required.
      const languages = SUPPORTED_LANGUAGES.filter(language => language !== 'en');
      if (!record(value, path, languages)) return;
      for (const language of languages) {
        const entryPath = `${path}.${language}`;
        const entry = hasOwn(value, language) ? value[language] : undefined;
        if (!record(entry, entryPath, skills ? [...fields, 'skills'] : fields)) continue;
        for (const field of fields) text(entry[field], `${entryPath}.${field}`);
        if (!skills) continue;
        const ids = skills.filter(skill => skill && typeof skill.id === 'string').map(skill => skill.id);
        if (!record(entry.skills, `${entryPath}.skills`, ids)) continue;
        for (const id of ids) {
          const answerPath = `${entryPath}.skills.${id}`;
          const answer = hasOwn(entry.skills, id) ? entry.skills[id] : undefined;
          if (!record(answer, answerPath, ['label', 'explain'])) continue;
          text(answer.label, `${answerPath}.label`);
          text(answer.explain, `${answerPath}.explain`);
        }
      }
    }

    function task(value, path) {
      if (!record(value, path, ['id', 'name', 'desc', 'tableHeaders', 'tableRows', 'glitchIndices', 'skills', 'translations'])) return;
      identifier(value.id, `${path}.id`, taskIds);
      for (const field of ['name', 'desc']) text(value[field], `${path}.${field}`);
      const headersValid = array(value.tableHeaders, `${path}.tableHeaders`, 1);
      if (headersValid) {
        for (const [index, header] of value.tableHeaders.entries()) text(header, `${path}.tableHeaders[${index}]`);
      }
      const rowsValid = array(value.tableRows, `${path}.tableRows`, 1);
      if (rowsValid) {
        for (const [index, row] of value.tableRows.entries()) {
          const rowPath = `${path}.tableRows[${index}]`;
          if (!array(row, rowPath)) continue;
          if (headersValid && row.length !== value.tableHeaders.length) issue(rowPath, 'cell count must match tableHeaders');
          for (const [column, cell] of row.entries()) {
            if (cell !== null && typeof cell !== 'string' && typeof cell !== 'boolean' && !(typeof cell === 'number' && Number.isFinite(cell))) {
              issue(`${rowPath}[${column}]`, 'must be a string, finite number, boolean or null');
            }
          }
        }
      }
      if (array(value.glitchIndices, `${path}.glitchIndices`)) {
        const seen = new Set();
        for (const [index, row] of value.glitchIndices.entries()) {
          const rowPath = `${path}.glitchIndices[${index}]`;
          if (integer(row, rowPath, 0) && rowsValid && row >= value.tableRows.length) issue(rowPath, 'row index is out of bounds');
          if (seen.has(row)) issue(rowPath, 'duplicate row index');
          seen.add(row);
        }
      }
      const skillsValid = array(value.skills, `${path}.skills`, 2);
      if (skillsValid) {
        let correctCount = 0;
        for (const [index, skill] of value.skills.entries()) {
          const skillPath = `${path}.skills[${index}]`;
          if (!record(skill, skillPath, ['id', 'code', 'label', 'correct', 'explain'])) continue;
          identifier(skill.id, `${skillPath}.id`, skillIds);
          for (const field of ['code', 'label', 'explain']) text(skill[field], `${skillPath}.${field}`);
          if (typeof skill.correct !== 'boolean') issue(`${skillPath}.correct`, 'must be a boolean');
          if (skill.correct === true) correctCount++;
        }
        if (correctCount !== 1) issue(`${path}.skills`, `must have exactly one correct answer; found ${correctCount}`);
      }
      translations(value.translations, `${path}.translations`, ['name', 'desc'], skillsValid ? value.skills : []);
    }

    if (record(pack, 'pack', ['schemaVersion', 'id', 'defaultLanguage', 'languages', 'gridSize', 'levels'])) {
      if (pack.schemaVersion !== 1) issue('pack.schemaVersion', 'must be 1');
      identifier(pack.id, 'pack.id');
      if (pack.defaultLanguage !== 'en') issue('pack.defaultLanguage', 'schema v1 uses English (en) base fields');
      if (array(pack.languages, 'pack.languages', 1)) {
        const seen = new Set();
        for (const [index, language] of pack.languages.entries()) {
          if (!SUPPORTED_LANGUAGES.includes(language)) issue(`pack.languages[${index}]`, 'unsupported language');
          if (seen.has(language)) issue(`pack.languages[${index}]`, 'duplicate language');
          seen.add(language);
        }
        for (const language of SUPPORTED_LANGUAGES) {
          if (!seen.has(language)) issue('pack.languages', `missing required language "${language}"`);
        }
      }
      const gridValid = integer(pack.gridSize, 'pack.gridSize', 2) && Number.isSafeInteger(pack.gridSize ** 2);
      if (Number.isSafeInteger(pack.gridSize) && !Number.isSafeInteger(pack.gridSize ** 2)) issue('pack.gridSize', 'board area exceeds the safe integer range');
      if (array(pack.levels, 'pack.levels', 1)) {
        for (const [index, level] of pack.levels.entries()) {
          const path = `pack.levels[${index}]`;
          if (!record(level, path, ['id', 'name', 'engine', 'description', 'fuelToPlace', 'tasks', 'translations'])) continue;
          identifier(level.id, `${path}.id`, levelIds);
          for (const field of ['name', 'engine', 'description']) text(level[field], `${path}.${field}`);
          const fuelValid = integer(level.fuelToPlace, `${path}.fuelToPlace`, 0);
          if (array(level.tasks, `${path}.tasks`, 1)) {
            if (gridValid && fuelValid && level.fuelToPlace + level.tasks.length > pack.gridSize ** 2 - 1) {
              issue(path, `${level.tasks.length} tasks + ${level.fuelToPlace} fuel pickups exceed ${pack.gridSize ** 2 - 1} usable cells (one cell is reserved for the start)`);
            }
            for (const [taskIndex, value] of level.tasks.entries()) task(value, `${path}.tasks[${taskIndex}]`);
          }
          translations(level.translations, `${path}.translations`, ['name', 'description']);
        }
      }
    }

    if (errors.length) {
      const error = new Error(`Invalid content pack:\n- ${errors.join('\n- ')}`);
      error.name = 'ContentPackValidationError';
      error.errors = errors;
      throw error;
    }
    return pack;
  }

  window.GameContent = Object.freeze({
    validate,
    registerLevel,
    getLevel,
    supportedLanguages: SUPPORTED_LANGUAGES
  });
})();
