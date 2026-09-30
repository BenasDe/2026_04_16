/** Schema v1 campaign manifest. Load content-pack.js and all level files first. */
window.GAME_LEVELS = null;
try {
  window.GAME_CONTENT_PACK = {
    schemaVersion: 1,
    id: 'data_lake',
    defaultLanguage: 'en',
    languages: ['en', 'lt'],
    gridSize: 5,
    // Explicit order also makes missing or misnamed level files fail validation.
    levels: ['bronze', 'silver', 'gold'].map(id => window.GameContent.getLevel(id))
  };
  window.GAME_LEVELS = window.GameContent.validate(window.GAME_CONTENT_PACK).levels;
} catch (error) {
  if (typeof document !== 'undefined') {
    const message = document.getElementById('content-error');
    if (message) {
      message.hidden = false;
      message.textContent = error.message;
    }
    const start = document.getElementById('btn-start-game');
    if (start) start.disabled = true;
    const menu = document.getElementById('start-menu-modal');
    if (menu) menu.style.display = 'flex';
  }
  throw error;
}
