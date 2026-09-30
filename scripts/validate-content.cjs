#!/usr/bin/env node
// Load exactly the content scripts registered in the browser's manifest order.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadContent(root = path.resolve(__dirname, '..')) {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script src="(src\/[^"]+)"/g)].map(match => match[1]);
  const contentScripts = scripts.filter(file => file === 'src/content-pack.js' || file.startsWith('src/content/') || file === 'src/data.js');
  const context = {window: {}};
  vm.createContext(context);
  for (const file of contentScripts) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file});
  }
  if (!context.window.GAME_LEVELS) throw new Error('Content scripts did not publish a validated campaign. Check index.html script order.');
  return {pack: context.window.GAME_CONTENT_PACK, validate: context.window.GameContent.validate};
}

if (require.main === module) {
  try {
    const {pack} = loadContent();
    const tasks = pack.levels.flatMap(level => level.tasks);
    const skills = tasks.flatMap(task => task.skills);
    console.log(`Content pack "${pack.id}" is valid: ${pack.levels.length} levels, ${tasks.length} tasks, ${skills.length} answers; ${pack.languages.join(', ')}.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = {loadContent};
