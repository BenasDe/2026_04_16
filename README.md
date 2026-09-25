# PySpark Survivor: Data Lake Chronicles

A 2.5D isometric data engineering puzzle game built with vanilla JavaScript, Three.js, and Web Audio API.

Live: [houstonwehavedata.org](https://houstonwehavedata.org)

## Overview

Deploy data pipelines across Bronze, Silver, and Gold medallion layers. Inspect dirty tables and data anomalies on the grid, stage transformation queries into your DAG, and run compilation to validate logic.

### Mechanics

- **Bronze Layer (Raw Ingestion):** PySpark transformations covering deduplication, null imputation, regex cleansing, type casting, and string trimming.
- **Silver Layer (Analytical SQL):** Dimensional transforms using SQL window functions (`ROW_NUMBER() OVER`), `GROUP BY ... HAVING`, `COALESCE`, anti-joins, and `CASE WHEN`.
- **Gold Layer (Production Optimization):** Big data optimizations including broadcast hash joins, Delta Lake `MERGE INTO`, partition pruning, and key salting.
- **Red Bull Fuel & Hotfixes:** Each level contains cans to collect. Unresolved query bugs consume 1 Red Bull per hotfix and add a 60-second penalty to your final time. Running out of cans causes an out-of-memory (OOM) pipeline crash.
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

## Local Development

Serve the root directory with any static HTTP server:

```bash
# Python 3
python -m http.server 8000

# Node.js
npx serve .
```

Open `http://localhost:8000` in your browser.
