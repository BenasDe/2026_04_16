# 🚀 PySpark Survivor: Data Lake Chronicles

> **Zero to Production: A Data Engineering Roguelike**  
> Live at [houstonwehavedata.org](https://houstonwehavedata.org)

[![Three.js](https://img.shields.io/badge/Three.js-r128-black?logo=three.js)](https://threejs.org/)
[![Web Audio API](https://img.shields.io/badge/Audio-Web%20Audio%20API-black)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
[![Firebase](https://img.shields.io/badge/Database-Firebase%20Realtime-orange?logo=firebase)](https://firebase.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**PySpark Survivor** is a 2.5D isometric Data Engineering adventure game built in pure vanilla HTML5, CSS3, and modern ES6 JavaScript. Step onto the Medallion Architecture grid as a Data Engineer, navigate corrupted partitions, scavenge cans of Red Bull, and stage transformations into your DAG. Deploy the Bronze, Silver, and Gold layers to production without blowing up memory!

---

## 🎮 Core Game Mechanics

- **Medallion Architecture Levels:**
  1. **Level 1 (Bronze Ingestion):** Clean raw streaming & batch landing tables with **PySpark 3.5.0** (Deduplication, NULL imputation, Regex string cleansing, Type casting, and whitespace trimming).
  2. **Level 2 (Silver Analytical SQL):** Author robust dimensional transforms using **Spark SQL / ANSI SQL** (`ROW_NUMBER() OVER(PARTITION BY...)`, `GROUP BY HAVING`, `COALESCE`, `JOIN ON`, `CASE WHEN`).
  3. **Level 3 (Gold Production Optimization):** Optimize mission-critical big data workloads (**Broadcast Hash Joins**, **Delta Lake `MERGE INTO`**, **Partition Pruning**, and **Salted Join Keys** for severe skew).
- **⚡ Red Bull Fuel:**
  - You start each run with **0 Red Bulls**.
  - Collect 2 cans per level hidden across the grid.
  - Red Bull is your only life support! If a staged query contains a bug during pipeline compilation, it consumes **1 Red Bull** to deploy an emergency hotfix.
  - If you run out of Red Bull and have unpatched bugs, your pipeline crashes with a fatal **Out Of Memory (OOM)** error.
- **❓ Blind Staging:**
  - You won't know if your code transformations are correct when inspecting anomalies. Choices are committed directly into the DAG.
  - Validation occurs only when you press **⚡ RUN PIPELINE**.
- **⏱️ Stopwatch & Time Penalty:**
  - A live precision stopwatch records elapsed time from start to gold deployment.
  - **Penalty:** Every used Red Bull (hotfix) inflicts a **+60-second penalty** on your final time.
- **🏆 Global Cloud Leaderboard:**
  - Backed by **Firebase Realtime Database REST API**.
  - Scores (time, surviving Red Bulls, engineer callsign, and date) sync live across all players and devices globally, with local storage fallback for offline support.

---

## 🕹️ Controls

| Control | Action |
| :--- | :--- |
| <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> or <kbd>↑</kbd> <kbd>←</kbd> <kbd>↓</kbd> <kbd>→</kbd> | Move Engineer across grid |
| **Mouse Click / Tap** | Click any adjacent tile to move |
| **Touch Swipes** | Swipe Up, Down, Left, or Right on mobile/tablet screens |
| **On-Screen D-Pad** | Directional touch controls for phones & handhelds |
| <kbd>Space</kbd> / <kbd>Enter</kbd> / Center ⚡ | Trigger **⚡ RUN PIPELINE** once all nodes are staged |

---

## 🏗️ Project Architecture

```
├── CNAME               # Custom GitHub Pages domain (houstonwehavedata.org)
├── index.html          # Main HTML5 viewport, HUD status bar, modals & templates
├── style.css           # Pure monochrome / high-contrast Cyber Noir stylesheet
├── logo.png            # Background branding watermark
├── slideshow.html      # URL slideshow utility
└── src/
    ├── utils.js        # Shared helpers: stopwatch formatting, Fisher-Yates shuffle, toast, delays
    ├── audio.js        # Self-contained Web Audio API chiptune / 8-bit synthesizer
    ├── data.js         # Complete syllabus: 3 levels of Data Engineering anomalies & PySpark/SQL skills
    ├── engine.js       # Three.js 2.5D rendering engine, isometric camera, player mesh, Red Bull 3D model
    ├── battle.js       # JRPG combat / anomaly inspection controller with blind staging
    └── main.js         # Game controller, state orchestrator, pipeline compilation runner, Firebase REST sync
```

### Module Responsibilities

1. **`src/utils.js` (Shared Utilities):**
   - Centralizes reusable functions: `formatStopwatch(ms)`, `delay(ms)`, `shuffle(arr)`, `showToast(msg)`, and DOM element helpers.
2. **`src/audio.js` (Web Audio Synthesizer):**
   - Synthesizes all audio effects procedurally using oscillators and gain envelopes (`sine`, `triangle`, `sawtooth`, `square`). No external MP3/WAV assets needed.
3. **`src/data.js` (Curriculum & Knowledge Base):**
   - Defines the anomalies, corrupted sample tables, multiple-choice query transformations, and educational explanations for real-world PySpark, SQL, and Delta Lake scenarios.
4. **`src/engine.js` (3D Isometric Engine):**
   - Builds 5x5 procedural grids with Fisher-Yates uniform distribution.
   - Low-poly developer avatar with glowing laptop screen, 3D hexagonal anomaly prisms, and Adrian Moroz's 3D Red Bull can model with pull tab.
5. **`src/battle.js` (Turn-Based Challenge Modal):**
   - Renders corrupted sample tables with glitch highlights and dynamically presents shuffled query options.
6. **`src/main.js` (Core Orchestrator):**
   - Manages state, player coordinates, level progression, diagnostic terminal runner, and Firebase Realtime Database cloud sync.

---

## 💻 Local Development & Deployment

This project requires **no build tools, bundlers, or npm dependencies**. It runs natively in any modern web browser.

### Run Locally:
Using Python (recommended):
```bash
python -m http.server 8000
```
Then navigate to `http://localhost:8000` in your browser.

Or with Node's `npx serve`:
```bash
npx serve .
```

### Deploying to GitHub Pages:
Commit changes to the `main` branch:
```bash
git add .
git commit -m "feat: release new update"
git push origin main
```
GitHub Pages automatically serves the root directory on your configured domain.

---

## 📜 Educational Topics Covered

- **PySpark DataFrame API:** `dropDuplicates()`, `fillna()`, `withColumn()`, `regexp_replace()`, `trim()`, `cast()`.
- **Analytical SQL:** Window functions (`ROW_NUMBER() OVER(PARTITION BY...)`), `GROUP BY HAVING`, `COALESCE`, `LEFT JOIN`, `CASE WHEN`.
- **Spark & Delta Lake Optimization:** Broadcast Joins (`broadcast()`), Delta Lake MERGE (`MERGE INTO`), Dynamic Partition Pruning, Salting join keys (`rand()`, `concat()`).

---

## 📄 License
Released under the [MIT License](LICENSE).
