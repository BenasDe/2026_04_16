/** Board generation, tile meshes, pickups, and question-marker presentation. */
class GameBoard {
  constructor(scene, gridSpacing) {
    this.scene = scene;
    this.GRID_SPACING = gridSpacing;
    this.tileMeshes = [];
    this.interactiveObjects = [];
  }

  /**
   * Cleans up all previous level tiles and 3D objects from the Three.js scene.
   */
  clearBoard() {
    this.tileMeshes.forEach(mesh => {
      this.scene.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
    });
    this.interactiveObjects.forEach(obj => {
      this.scene.remove(obj);
    });
    this.tileMeshes = [];
    this.interactiveObjects = [];
  }

  /**
   * Builds the 2.5D Grid with UNIFORM procedural distribution for the active level.
   * @param {number} gridSize - Grid width and height (e.g. 5x5).
   * @param {Array} tasks - Array of level tasks (PySpark or SQL).
   * @param {number} redBullsToPlace - Number of Red Bull pickups to generate.
   * @returns {Array<Array<Object>>} Board 2D matrix data.
   */
  buildBoard(gridSize, tasks, redBullsToPlace = 2) {
    this.clearBoard();

    const offset = ((gridSize - 1) * this.GRID_SPACING) / 2;
    const board = [];

    // 1. Initialize empty board matrix
    for (let x = 0; x < gridSize; x++) {
      board[x] = [];
      for (let y = 0; y < gridSize; y++) {
        board[x][y] = { type: 'empty', data: null, staged: false };
      }
    }

    // 2. Set Start Tile at (0, 0)
    board[0][0].type = 'start';

    // 3. Collect candidate coordinates (excluding start 0,0)
    const candidateCoords = [];
    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        if (x !== 0 || y !== 0) {
          candidateCoords.push({ x, y });
        }
      }
    }

    // Fisher-Yates shuffle to guarantee uniform distribution across all rows
    if (window.Utils) {
      window.Utils.shuffle(candidateCoords);
    } else {
      for (let i = candidateCoords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidateCoords[i], candidateCoords[j]] = [candidateCoords[j], candidateCoords[i]];
      }
    }

    // 4. Place Red Bull pickups
    let coordIdx = 0;
    for (let i = 0; i < redBullsToPlace && coordIdx < candidateCoords.length; i++) {
      const c = candidateCoords[coordIdx++];
      board[c.x][c.y].type = 'redBull';
    }

    // 5. Place Tasks (PySpark / SQL)
    const shuffledTasks = window.Utils ? window.Utils.shuffle([...tasks]) : [...tasks].sort(() => Math.random() - 0.5);
    for (let i = 0; i < shuffledTasks.length && coordIdx < candidateCoords.length; i++) {
      const c = candidateCoords[coordIdx++];
      board[c.x][c.y].type = 'enemy';
      board[c.x][c.y].data = shuffledTasks[i];
    }

    // 6. Construct 3D Visual Mesh Objects for every tile
    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        const cell = board[x][y];

        // 3D Grid Tile Geometry (High contrast slate with clear bevel)
        const tileGeo = new THREE.BoxGeometry(this.GRID_SPACING * 0.92, 0.2, this.GRID_SPACING * 0.92);
        
        let tileColor = 0x1c2128; // Clear visible dark slate
        if (cell.type === 'start') tileColor = 0x30363d;
        else if (cell.type === 'redBull') tileColor = 0x21262d;

        const tileMat = new THREE.MeshStandardMaterial({
          color: tileColor,
          roughness: 0.35,
          metalness: 0.15,
          transparent: true,
          opacity: 0.90
        });
        const tileMesh = new THREE.Mesh(tileGeo, tileMat);
        tileMesh.position.set(x * this.GRID_SPACING - offset, 0, y * this.GRID_SPACING - offset);
        tileMesh.receiveShadow = true;
        tileMesh.userData = { gridX: x, gridY: y, baseColor: tileColor, material: tileMat };
        this.scene.add(tileMesh);
        this.tileMeshes.push(tileMesh);

        // Crisp White / Silver Grid Border Wireframe
        const wireGeo = new THREE.EdgesGeometry(tileGeo);
        const wireMat = new THREE.LineBasicMaterial({
          color: cell.type === 'start' ? 0xffffff : 0x545d6e,
          linewidth: 1
        });
        const wireMesh = new THREE.LineSegments(wireGeo, wireMat);
        tileMesh.add(wireMesh);

        // =====================================================================
        // SPAWN 3D HEXAGONAL ENEMY MARKER
        // =====================================================================
        if (cell.type === 'enemy' && cell.data) {
          const enemyGroup = new THREE.Group();

          // 3D Hexagonal Prism (6-sided regular cylinder)
          const hexPrismGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 6);
          const hexMat = new THREE.MeshStandardMaterial({
            color: 0x161b22,
            emissive: 0xffffff,
            emissiveIntensity: 0.35,
            roughness: 0.2
          });
          const hexMesh = new THREE.Mesh(hexPrismGeo, hexMat);
          hexMesh.position.y = 0.85;
          hexMesh.castShadow = true;
          enemyGroup.add(hexMesh);

          // Crisp White Hexagonal Wireframe on the Prism
          const hexWireGeo = new THREE.EdgesGeometry(hexPrismGeo);
          const hexWireMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
          const hexWire = new THREE.LineSegments(hexWireGeo, hexWireMat);
          hexMesh.add(hexWire);

          // 2D Hexagonal Floor Ring on Tile Surface (6 segments)
          const hexFloorGeo = new THREE.RingGeometry(0.38, 0.52, 6);
          const hexFloorMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
          const hexFloor = new THREE.Mesh(hexFloorGeo, hexFloorMat);
          hexFloor.rotation.x = -Math.PI / 2;
          hexFloor.rotation.z = Math.PI / 6;
          hexFloor.position.y = 0.115;
          enemyGroup.add(hexFloor);

          enemyGroup.position.set(x * this.GRID_SPACING - offset, 0, y * this.GRID_SPACING - offset);
          enemyGroup.userData = { isEnemy: true, gridX: x, gridY: y, data: cell.data, mesh: hexMesh };
          this.scene.add(enemyGroup);
          this.interactiveObjects.push(enemyGroup);
        } else if (cell.type === 'redBull') {
          // Red Bull pickup
          const redBullGroup = new THREE.Group();
          const canMesh = this.createRedBullCan();
          canMesh.position.y = 0.85;
          redBullGroup.add(canMesh);

          redBullGroup.position.set(x * this.GRID_SPACING - offset, 0, y * this.GRID_SPACING - offset);
          redBullGroup.userData = { isRedBull: true, gridX: x, gridY: y, mesh: canMesh };
          this.scene.add(redBullGroup);
          this.interactiveObjects.push(redBullGroup);
        }
      }
    }

    return board;
  }

  /**
   * Creates a blue-and-silver Red Bull can using a locally drawn label.
   * @returns {THREE.Mesh} Can body with metallic rims and a pull tab.
   */
  createRedBullCan() {
    const label = document.createElement('canvas');
    label.width = 256;
    label.height = 256;
    const ctx = label.getContext('2d');

    // Silver base with alternating blue panels.
    ctx.fillStyle = '#cbd0d8';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#173fa5';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillRect(128, 128, 128, 128);

    // Repeat the name on opposite sides so it remains visible while rotating.
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 30px Arial, sans-serif';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#df1634';
    [64, 192].forEach(x => {
      ctx.strokeText('Red Bull', x, 128);
      ctx.fillText('Red Bull', x, 128);
    });

    const labelTexture = new THREE.CanvasTexture(label);
    labelTexture.encoding = THREE.sRGBEncoding;
    const bodyMat = new THREE.MeshStandardMaterial({
      map: labelTexture,
      metalness: 0.35,
      roughness: 0.35
    });
    const silverMat = new THREE.MeshStandardMaterial({
      color: 0xd9dce2,
      metalness: 0.65,
      roughness: 0.25
    });

    // Tall, narrow cylinder shaped like an energy-drink can.
    const canMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.7, 24),
      [bodyMat, silverMat, silverMat]
    );
    canMesh.castShadow = true;

    // Raised metallic rims at the top and bottom.
    [0.35, -0.35].forEach(y => {
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.19, 0.018, 6, 24),
        silverMat
      );
      rim.rotation.x = Math.PI / 2;
      rim.position.y = y;
      canMesh.add(rim);
    });

    // Small pull tab on the lid.
    const pullTab = new THREE.Mesh(
      new THREE.TorusGeometry(0.045, 0.012, 6, 12),
      silverMat
    );
    pullTab.rotation.x = Math.PI / 2;
    pullTab.scale.y = 1.5;
    pullTab.position.set(0, 0.37, 0.025);
    canMesh.add(pullTab);

    return canMesh;
  }

  /**
   * Removes an interactive 3D prop at the specified grid coordinate.
   * @param {number} gridX
   * @param {number} gridY
   */
  removeInteractiveObject(gridX, gridY) {
    const idx = this.interactiveObjects.findIndex(
      o => o.userData.gridX === gridX && o.userData.gridY === gridY
    );
    if (idx !== -1) {
      this.scene.remove(this.interactiveObjects[idx]);
      this.interactiveObjects.splice(idx, 1);
    }
  }

  /**
   * Visually highlights an interactive anomaly node as STAGED into the pipeline DAG.
   * @param {number} gridX
   * @param {number} gridY
   */
  markTaskAsStaged(gridX, gridY) {
    const obj = this.interactiveObjects.find(
      o => o.userData.gridX === gridX && o.userData.gridY === gridY
    );
    if (obj) {
      obj.userData.staged = true;
      obj.traverse(child => {
        if (child.isMesh && child.material) {
          if (child.material.emissive) {
            child.material.emissive.setHex(0x22c55e);
            child.material.emissiveIntensity = 0.55;
          }
          if (child.material.color && !child.material.map) {
            child.material.color.setHex(0x15803d);
          }
        }
        if (child.isLineSegments && child.material) {
          child.material.color.setHex(0x4ade80);
        }
      });
    }
  }

  /**
   * Lift nearby question markers above the helmet before the player reaches them.
   * Distance-based positioning also handles leaving, revisiting, and level resets.
   */
  updateInteractiveObjects(time, playerPosition) {
    this.interactiveObjects.forEach(obj => {
      const mesh = obj.userData.mesh;
      if (!mesh) return;

      let height = 0.85;
      if (obj.userData.isEnemy) {
        const distance = Math.hypot(
          obj.position.x - playerPosition.x,
          obj.position.z - playerPosition.z
        );
        // Fully raised before the two silhouettes can touch, including walking poses.
        const proximity = THREE.MathUtils.clamp((1.8 - distance) / 0.65, 0, 1);
        const lift = proximity * proximity * (3 - 2 * proximity);
        height += lift * 1.7;
      }

      mesh.rotation.y = time * 1.5;
      mesh.position.y = height + Math.sin(time * 3) * 0.08;
    });
  }
}

window.GameBoard = GameBoard;
