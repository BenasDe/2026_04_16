# PySpark Survivor: Data Lake Chronicles

A 2.5D isometric data engineering puzzle game built with vanilla JavaScript, Three.js, and Web Audio API.

Live: [houstonwehavedata.org](https://houstonwehavedata.org)

## Overview

Deploy data pipelines across Bronze, Silver, and Gold medallion layers. Inspect dirty tables and data anomalies on the grid, stage transformation queries into your DAG, and run compilation to validate logic.

### Mechanics

- **Bronze Layer (Raw Ingestion):** PySpark transformations covering deduplication, null imputation, regex cleansing, type casting, and string trimming.
- **Silver Layer (Analytical SQL):** Dimensional transforms using SQL window functions (`ROW_NUMBER() OVER`), `GROUP BY ... HAVING`, `COALESCE`, anti-joins, and `CASE WHEN`.
- **Gold Layer (Production Optimization):** Big data optimizations including broadcast hash joins, Delta Lake `MERGE INTO`, partition pruning, and key salting.
- **Fuel & Hotfixes:** Each level contains two fuel pickups. Each wrong answer consumes one fuel unit and adds a 60-second penalty. A negative fuel balance causes an out-of-memory (OOM) pipeline crash; exactly zero survives. Espresso cups are the default, with Red Bull cans also available.
- **Blind Staging:** Validation happens only during pipeline execution, testing understanding of the underlying engine behavior.
- **Global Leaderboard:** Track completion times across players using a Firebase Realtime Database backend with local storage fallback.

## Controls

| Control | Action |
| :--- | :--- |
| <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> / Arrows | Move across grid |
| Click / Tap | Move to adjacent tile |
| Touch Swipe | Directional swipe on mobile |
| On-Screen D-Pad | Touch controls on mobile screens |
| <kbd>Space</kbd> / <kbd>Enter</kbd> / RUN | Trigger pipeline execution when all nodes are staged |

## Tech Stack

- **Rendering:** Three.js (r128)
- **Audio:** Web Audio API (procedural SFX and synthesizer background loop)
- **Database:** Firebase Realtime Database (REST API)
- **Styling:** CSS3 (modular stylesheets, responsive layout)
- **Runtime:** Vanilla ES6 JavaScript (no bundler or build step required)
- **Internationalization:** Bilingual support (Lithuanian by default, English toggle)

## Local Development

Serve the root directory with any static HTTP server:

```bash
# Python 3
python -m http.server 8000

# Node.js
npx serve .
```

Open `http://localhost:8000` in your browser.

## Choose the fuel

Change one line in `src/config.js`, then reload the page:

```js
fuelType: 'redbull'
```

Use `'espresso'` (the default) for cups, or `'redbull'` for cans. The selection
controls the 3D pickup, LT/EN names, units, menus, HUD, diagnostics, toasts,
victory/game-over messages, and leaderboard labels. Both models live in
`src/fuel.js`; the espresso has an open cup, visible coffee, a loop handle and
dark outlines, and the can is restored from the project's earlier implementation.
Unsupported configuration values produce an explicit error instead of mixing two themes.

Gameplay uses `gameState.fuel`, `fuelToPlace`, `type: 'fuel'`, and
`sfx.collectFuel()`. Both drinks give one unit per pickup and use the same
scoring rules. A new theme belongs in `src/fuel.js`: add its mesh factory and
English/Lithuanian wording, then select its key in `src/config.js`.

Leaderboard records represent the same resource regardless of the selected
theme. The storage adapter in `src/leaderboard.js` reads `fuel`, `espresso`,
and legacy `redBulls` counts. Writes deliberately retain the existing
`espresso` and `redBulls` fields and payload shape so older clients and Firebase
rules do not require a migration. These names are storage compatibility only;
changing the selected drink does not rewrite or delete existing scores.

## Regression checks

With Node.js 20 or newer, run from the repository root:

```bash
node scripts/validate-content.cjs
node --test tests/content.test.cjs tests/fuel.test.cjs tests/controls.test.cjs
```

No packages need installing. Tests load scripts in HTML order and exercise both
drinks in LT and EN, pickup placement/collection, staging, penalties, level
progression, victory/restart, and legacy leaderboard reads/writes. D-pad RUN
checks cover incomplete staging in LT/EN and the text fallback, varying task
counts, and a successful run after all tasks are staged. The harness
uses an in-memory DOM, deterministic clocks, mocked network/audio/rendering,
and lightweight Three.js objects. It does not contact Firebase or replace a
visual browser check. `THREE_TEST_MODULE` can point to a local Three.js r128
CommonJS build to run these checks with real geometry/material constructors.
With that build, three additional raycasting checks verify coffee visibility
through a full rotation at gameplay camera angles, the open handle, and dark
cup/saucer outlines. These geometry checks are skipped by the default harness.

## Content packs

The campaign is a validated schema-v1 pack in `src/data.js`. Its manifest selects
registered level IDs in order and sets the board size. Level definitions live in
`src/content/bronze.js`, `silver.js`, and `gold.js`, with their English content
and Lithuanian translations together. Every level, task and answer has a stable
ID; translated answers and pipeline explanations use answer IDs, never array
positions or displayed code.

Validation runs before gameplay starts and through `node scripts/validate-content.cjs`.
It rejects duplicate IDs, incomplete EN/LT content, invalid correctness flags,
multiple/no correct answers, malformed table previews, unknown fields and board
overflow, including the reserved start tile. Invalid packs show an error and
disable startup. Tests also cover reordered content and four/five-level campaigns.

See [the content-pack authoring guide](docs/content-packs.md) for the complete
contract and a copyable level. Add a level file, load it in `index.html`, and add
its ID to the manifest; campaign menus and victory text derive their counts
from the loaded pack. No engine changes are required.
