/**
 * @file engine.js
 * @description Three.js 2.5D Rendering Engine with aligned top-down perspective,
 * enhanced scene brightness/contrast, and uniform procedural enemy distribution across all grid rows.
 */

class GameEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.GRID_SPACING = 2.4;
    this.tileMeshes = [];
    this.interactiveObjects = [];
    // Straight-on aligned top-down tilted 2.5D camera (Up is North/Z-, Down is South/Z+, Left is West/X-, Right is East/X+)
    this.cameraOffset = new THREE.Vector3(0, 19, 13.5);
    this.clock = new THREE.Clock();

    this.initScene();
    this.initLighting();
    this.initPlayerMesh();
    this.initRaycaster();
    this.initResizeListener();
  }

  /**
   * Initializes Three.js Scene with enhanced ambient contrast and clear aligned camera.
   */
  initScene() {
    this.scene = new THREE.Scene();
    // Transparent scene background to reveal background logo watermark
    this.scene.background = null;

    this.camera = new THREE.PerspectiveCamera(
      42,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.copy(this.cameraOffset);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Add subtle floor grid plane underneath tiles for spatial depth & orientation
    const gridHelper = new THREE.GridHelper(30, 30, 0x3b4252, 0x1f232d);
    gridHelper.position.y = -0.15;
    this.scene.add(gridHelper);
  }

  /**
   * Configures bright, crisp lighting so the board and characters are clearly visible.
   */
  initLighting() {
    // Ambient fill light
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
    this.scene.add(ambientLight);

    // Main Key directional light with soft shadows
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.15);
    dirLight.position.set(10, 28, 15);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 60;
    this.scene.add(dirLight);

    // Player Follow PointLight
    this.pointLight = new THREE.PointLight(0xffffff, 1.6, 22);
    this.pointLight.position.set(0, 5, 0);
    this.scene.add(this.pointLight);
  }

  /**
   * Constructs the 3D low-poly developer character model with high contrast and glowing screen.
   */
  initPlayerMesh() {
    this.playerGroup = new THREE.Group();

    // Body (Matte Black Hoodie)
    const bodyGeo = new THREE.CylinderGeometry(0.35, 0.42, 0.9, 16);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1c2128, roughness: 0.3 });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.y = 0.55;
    bodyMesh.castShadow = true;
    this.playerGroup.add(bodyMesh);

    // Head (Light Ivory/Silver)
    const headGeo = new THREE.SphereGeometry(0.28, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xe6edf3, roughness: 0.4 });
    const headMesh = new THREE.Mesh(headGeo, headMat);
    headMesh.position.y = 1.2;
    headMesh.castShadow = true;
    this.playerGroup.add(headMesh);

    // Hair / Cap (Dark Charcoal)
    const hairGeo = new THREE.BoxGeometry(0.38, 0.15, 0.38);
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x0d1117 });
    const hairMesh = new THREE.Mesh(hairGeo, hairMat);
    hairMesh.position.y = 1.38;
    this.playerGroup.add(hairMesh);

    // Glowing Laptop Screen (Crisp White)
    const laptopGeo = new THREE.BoxGeometry(0.38, 0.04, 0.3);
    const laptopMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 1.0
    });
    const laptopMesh = new THREE.Mesh(laptopGeo, laptopMat);
    laptopMesh.position.set(0, 0.7, 0.4);
    laptopMesh.rotation.x = 0.2;
    this.playerGroup.add(laptopMesh);

    // Glowing Target Ring under player feet (Solid White)
    const ringGeo = new THREE.RingGeometry(0.45, 0.58, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.05;
    this.playerGroup.add(ringMesh);

    this.scene.add(this.playerGroup);
  }

  /**
   * Initializes raycasting for mouse click-to-move tile detection.
   */
  initRaycaster() {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
  }

  /**
   * Dynamically computes the optimal camera distance and FOV based on device orientation and viewport aspect ratio.
   */
  computeResponsiveCamera() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / height;

    if (aspect < 0.75) {
      // Mobile Portrait (e.g. phones, 9:16 aspect)
      const factor = Math.max(1.3, 0.95 / aspect);
      this.cameraOffset.set(0, 19 * factor, 13.5 * factor);
      this.camera.fov = 50;
    } else if (aspect < 1.2) {
      // Tablet / iPad / Square Aspect
      this.cameraOffset.set(0, 22, 15.5);
      this.camera.fov = 44;
    } else {
      // Desktop / Laptop Widescreen (16:9, 16:10, ultrawide)
      this.cameraOffset.set(0, 19, 13.5);
      this.camera.fov = 42;
    }
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Handles window resizing events across all screen resolutions and device pixel ratios.
   */
  initResizeListener() {
    this.computeResponsiveCamera();
    window.addEventListener('resize', () => {
      this.computeResponsiveCamera();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      // Re-center camera on player current position
      this.camera.position.set(
        this.playerGroup.position.x + this.cameraOffset.x,
        this.cameraOffset.y,
        this.playerGroup.position.z + this.cameraOffset.z
      );
      this.camera.lookAt(this.playerGroup.position.x, 0, this.playerGroup.position.z);
    });
  }

  /**
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
          hexFloor.position.y = 0.05;
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
   * Snaps player and camera to the specified grid coordinates without diagonal offset.
   * @param {number} gridX
   * @param {number} gridY
   * @param {number} gridSize
   */
  setPlayerGridPosition(gridX, gridY, gridSize) {
    const offset = ((gridSize - 1) * this.GRID_SPACING) / 2;
    const targetX = gridX * this.GRID_SPACING - offset;
    const targetZ = gridY * this.GRID_SPACING - offset;

    this.playerGroup.position.set(targetX, 0, targetZ);
    this.pointLight.position.set(targetX, 5, targetZ);
    this.camera.position.set(
      targetX + this.cameraOffset.x,
      this.cameraOffset.y,
      targetZ + this.cameraOffset.z
    );
    this.camera.lookAt(targetX, 0, targetZ);
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
   * Smoothly animates player movement with direct North/South/East/West tracking.
   * @param {number} gridX - Target grid X.
   * @param {number} gridY - Target grid Y.
   * @param {number} gridSize - Grid dimension.
   * @param {Function} onComplete - Callback executed when move finishes.
   */
  animatePlayerMovement(gridX, gridY, gridSize, onComplete) {
    const offset = ((gridSize - 1) * this.GRID_SPACING) / 2;
    const targetX = gridX * this.GRID_SPACING - offset;
    const targetZ = gridY * this.GRID_SPACING - offset;

    const startPos = this.playerGroup.position.clone();
    const endPos = new THREE.Vector3(targetX, 0, targetZ);
    const startTime = performance.now();
    const duration = 200; // ms

    const stepAnimation = (now) => {
      const t = Math.min((now - startTime) / duration, 1);
      const ease = t * (2 - t);
      this.playerGroup.position.lerpVectors(startPos, endPos, ease);
      // Hop curve
      this.playerGroup.position.y = Math.sin(ease * Math.PI) * 0.35;

      this.pointLight.position.set(this.playerGroup.position.x, 5, this.playerGroup.position.z);
      this.camera.position.set(
        this.playerGroup.position.x + this.cameraOffset.x,
        this.cameraOffset.y,
        this.playerGroup.position.z + this.cameraOffset.z
      );
      this.camera.lookAt(this.playerGroup.position.x, 0, this.playerGroup.position.z);

      if (t < 1) {
        requestAnimationFrame(stepAnimation);
      } else {
        this.playerGroup.position.copy(endPos);
        this.playerGroup.position.y = 0;
        if (onComplete) onComplete();
      }
    };

    requestAnimationFrame(stepAnimation);
  }

  /**
   * Main animation and render loop.
   * @param {Object} state - Current global game state.
   */
  startRenderLoop(state) {
    const render = () => {
      requestAnimationFrame(render);
      const time = this.clock.getElapsedTime();

      // Floating bob & rotation on hexagonal anomaly and Red Bull meshes
      this.interactiveObjects.forEach(obj => {
        if (obj.userData.mesh) {
          obj.userData.mesh.rotation.y = time * 1.5;
          obj.userData.mesh.position.y = 0.85 + Math.sin(time * 3) * 0.08;
        }
      });

      // Player idle breath
      if (!state.isMoving) {
        this.playerGroup.position.y = Math.sin(time * 2.5) * 0.04;
      }

      this.renderer.render(this.scene, this.camera);
    };

    render();
  }
}

// Export engine class to window
window.GameEngine = GameEngine;
