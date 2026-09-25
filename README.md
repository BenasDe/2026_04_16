#  PySpark Survivor: Data Lake Chronicles

> **Zero to Production: A Data Engineering Roguelike**  
> Live at [houstonwehavedata.org](https://houstonwehavedata.org)

[![Three.js](https://img.shields.io/badge/Three.js-r128-black?logo=three.js)](https://threejs.org/)
[![Web Audio API](https://img.shields.io/badge/Audio-Web%20Audio%20API-black)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
[![Firebase](https://img.shields.io/badge/Database-Firebase%20Realtime-orange?logo=firebase)](https://firebase.google.com/)

**PySpark Survivor** is a 2.5D isometric Data Engineering adventure game built in pure vanilla HTML5, CSS3, and modern ES6 JavaScript.
---

## Core Game Mechanics

- **Medallion Architecture Levels:**
  1. **Level 1 (Bronze Ingestion):** Clean raw streaming & batch landing tables with **PySpark 3.5.0** (Deduplication, NULL imputation, Regex string cleansing, Type casting, and whitespace trimming).
  2. **Level 2 (Silver Analytical SQL):** Author robust dimensional transforms using **Spark SQL / ANSI SQL** (`ROW_NUMBER() OVER(PARTITION BY...)`, `GROUP BY HAVING`, `COALESCE`, `JOIN ON`, `CASE WHEN`).
  3. **Level 3 (Gold Production Optimization):** Optimize mission-critical big data workloads (**Broadcast Hash Joins**, **Delta Lake `MERGE INTO`**, **Partition Pruning**, and **Salted Join Keys** for severe skew).
- ** Red Bull Fuel:**
  - You start each run with **0 Red Bulls**.
  - Collect 2 cans per level hidden across the grid.
  - Red Bull is your only life support! If a staged query contains a bug during pipeline compilation, it consumes **1 Red Bull** to deploy an emergency hotfix.
  - If you run out of Red Bull and have unpatched bugs, your pipeline crashes with a fatal **Out Of Memory (OOM)** error.
- ** Blind Staging:**
  - You won't know if your code transformations are correct when inspecting anomalies. Choices are committed directly into the DAG.
  - Validation occurs only when you press ** RUN PIPELINE**.
- ** Stopwatch & Time Penalty:**
  - A live precision stopwatch records elapsed time from start to gold deployment.
  - **Penalty:** Every used Red Bull (hotfix) inflicts a **+60-second penalty** on your final time.
- ** Global Cloud Leaderboard:**
  - Backed by **Firebase Realtime Database REST API**.
  - Scores (time, surviving Red Bulls, engineer callsign, and date) sync live across all players and devices globally, with local storage fallback for offline support.

---

##  Controls

| Control | Action |
| :--- | :--- |
| <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> or <kbd>↑</kbd> <kbd>←</kbd> <kbd>↓</kbd> <kbd>→</kbd> | Move Engineer across grid |
| **Mouse Click / Tap** | Click any adjacent tile to move |
| **Touch Swipes** | Swipe Up, Down, Left, or Right on mobile/tablet screens |
| **On-Screen D-Pad** | Directional touch controls for phones & handhelds |
| <kbd>Space</kbd> / <kbd>Enter</kbd> / Center  | Trigger ** RUN PIPELINE** once all nodes are staged |

