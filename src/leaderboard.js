/** Leaderboard subsystem. Dependencies are supplied by the game controller. */
window.createLeaderboard = function (formatStopwatch) {
  // Live Global Cloud Database URL for cross-device & cross-player score sync
  const FIREBASE_DB_URL = "https://pyspark-survivor-default-rtdb.europe-west1.firebasedatabase.app".replace(/\/+$/, '');
  const LEADERBOARD_KEY = 'pyspark_survivor_leaderboard';

  /**
   * Fetches scores either from Firebase Cloud (if configured) or local browser cache.
   */
  async function getLeaderboard() {
    // 1. Try Firebase Cloud Database
    if (FIREBASE_DB_URL) {
      try {
        const response = await fetch(`${FIREBASE_DB_URL}/scores.json`, { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          if (data) {
            const list = Object.values(data);
            // Sort by timeMs ascending, then redBulls descending
            list.sort((a, b) => {
              if (a.timeMs !== b.timeMs) return a.timeMs - b.timeMs;
              return b.redBulls - a.redBulls;
            });
            const trimmed = list.slice(0, 25);
            // Cache in local storage for offline resilience
            try {
              localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(trimmed));
            } catch (e) {}
            return trimmed;
          } else {
            return []; // Database is initialized but empty
          }
        }
      } catch (err) {
        console.warn('Firebase sync offline, falling back to local storage', err);
      }
    }

    // 2. Fallback to LocalStorage
    try {
      const raw = localStorage.getItem(LEADERBOARD_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (err) {
      console.error('Failed to parse local leaderboard', err);
    }
    return [];
  }

  /**
   * Saves a completed run to both Firebase Cloud and LocalStorage.
   */
  async function saveLeaderboardRecord(name, timeMs, redBulls) {
    const timeFormatted = formatStopwatch(timeMs);
    const dateStr = new Date().toISOString().split('T')[0];

    const record = {
      name: (name || 'ANON_DE').trim().toUpperCase().substring(0, 15),
      timeMs,
      timeFormatted,
      redBulls,
      date: dateStr,
      timestamp: Date.now()
    };

    // 1. Optimistic Local Save
    let localList = [];
    try {
      const raw = localStorage.getItem(LEADERBOARD_KEY);
      if (raw) localList = JSON.parse(raw) || [];
    } catch (e) {}
    localList.push(record);
    localList.sort((a, b) => {
      if (a.timeMs !== b.timeMs) return a.timeMs - b.timeMs;
      return b.redBulls - a.redBulls;
    });
    localList = localList.slice(0, 25);
    try {
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(localList));
    } catch (e) {}

    // 2. Cloud Save to Firebase Realtime Database
    if (FIREBASE_DB_URL) {
      try {
        const response = await fetch(`${FIREBASE_DB_URL}/scores.json`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record)
        });
        if (response.ok) {
          console.log('✔ Score successfully published to Global Firebase Leaderboard');
        } else {
          console.error('Firebase response error:', response.status, await response.text());
        }
      } catch (err) {
        console.error('Failed to publish score to Firebase Cloud', err);
      }
    }

    return localList;
  }

  /**
   * Renders leaderboard rows with asynchronous cloud fetching.
   */
  async function renderLeaderboard() {
    const tbody = document.getElementById('leaderboard-body');
    if (!tbody) return;

    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: #888888; padding: 22px 12px; font-family: 'Fira Code', monospace;">
          📡 Connecting to Global Leaderboard...
        </td>
      </tr>
    `;

    const records = await getLeaderboard();
    tbody.innerHTML = '';

    if (records.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td colspan="5" style="text-align: center; color: #777777; padding: 28px 12px; font-style: italic; font-family: 'Fira Code', monospace;">
          No completed pipeline runs yet. Deploy Bronze, Silver, & Gold to claim #1!
        </td>
      `;
      tbody.appendChild(tr);
      return;
    }

    records.forEach((rec, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight:700; color:${idx === 0 ? '#facc15' : idx === 1 ? '#e2e8f0' : idx === 2 ? '#b45309' : '#ffffff'};">#${idx + 1}</td>
        <td style="font-weight:600; color:#ffffff;">${rec.name}</td>
        <td style="font-family:'Fira Code'; font-weight:700;">⏱️ ${rec.timeFormatted}</td>
        <td> ${rec.redBulls} cans</td>
        <td style="color:#777777;">${rec.date || '-'}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function openLeaderboard() {
    renderLeaderboard();
    const modal = document.getElementById('leaderboard-modal');
    if (modal) modal.style.display = 'flex';
  }

  function closeLeaderboard() {
    const modal = document.getElementById('leaderboard-modal');
    if (modal) modal.style.display = 'none';
  }

  function clearLocalLeaderboard() {
    localStorage.removeItem(LEADERBOARD_KEY);
    renderLeaderboard();
  }

  return { saveLeaderboardRecord, openLeaderboard, closeLeaderboard, clearLocalLeaderboard };
};
