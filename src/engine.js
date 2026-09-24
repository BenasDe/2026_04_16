/**
 * @file engine.js
 * @description Three.js 2.5D Isometric Rendering Engine, Grid generation, Meshes, and Animations.
 */

class GameEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.GRID_SPACING = 2.4;
    this.tileMeshes = [];
    this.interactiveObjects = [];
    this.cameraOffset = new THREE.Vector3(12, 16, 14);
    this.clock = new THREE.Clock();

    this.initScene();
    this.initLighting();
    this.initPlayerMesh();
    this.initRaycaster();
    this.initResizeListener();
  }

  /**
   * Initializes Three.js Scene, Renderer, and Isometric Perspective Camera.
   */
  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e14);
    this.scene.fog = new THREE.FogExp2(0x0a0e14, 0.04);

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.copy(this.cameraOffset);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  /**
   * Configures environmental lighting (Ambient, Directional with shadow, PointLight on player).
   */
  initLighting() {
    const ambientLight = new THREE.AmbientLight(0xd0e0ff, 0.65);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight.position.set(15, 30, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    this.scene.add(dirLight);

    this.pointLight = new THREE.PointLight(0x58a6ff, 1.2, 25);
    this.pointLight.position.set(0, 5, 0);
    this.scene.add(this.pointLight);
  }

  /**
   * Constructs the 3D low-poly developer character model with a glowing laptop screen.
   */
  initPlayerMesh() {
    this.playerGroup = new THREE.Group();

    // Body
    const bodyGeo = new THREE.CylinderGeometry(0.35, 0.4, 0.9, 16);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x24292e, roughness: 0.3 });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.y = 0.55;
    bodyMesh.castShadow = true;
    this.playerGroup.add(bodyMesh);

    // Head
    const headGeo = new THREE.SphereGeometry(0.28, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xf6d8b8 });
    const headMesh = new THREE.Mesh(headGeo, headMat);
    headMesh.position.y = 1.2;
    headMesh.castShadow = true;
    this.playerGroup.add(headMesh);

    // Hair
    const hairGeo = new THREE.BoxGeometry(0.38, 0.15, 0.38);
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x1f2328 });
    const hairMesh = new THREE.Mesh(hairGeo, hairMat);
    hairMesh.position.y = 1.38;
    this.playerGroup.add(hairMesh);

    // Glowing Laptop Screen
    const laptopGeo = new THREE.BoxGeometry(0.35, 0.04, 0.28);
    const laptopMat = new THREE.MeshStandardMaterial({
      color: 0x58a6ff,
      emissive: 0x1f6feb,
      emissiveIntensity: 0.8
    });
    const laptopMesh = new THREE.Mesh(laptopGeo, laptopMat);
    laptopMesh.position.set(0, 0.7, 0.4);
    laptopMesh.rotation.x = 0.2;
    this.playerGroup.add(laptopMesh);

    // Glowing Target Ring under player feet
    const ringGeo = new THREE.RingGeometry(0.45, 0.55, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x58a6ff, side: THREE.DoubleSide });
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
   * Handles window resizing events to maintain aspect ratio.
   */
  initResizeListener() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  /**
   * Builds the 2.5D Isometric Grid and spawns 3D anomaly and coffee props.
   * @param {number} gridSize - Grid width and height (e.g. 5x5).
   * @param {Array} anomalies - Array of anomaly database entries.
   * @returns {Array<Array<Object>>} Board 2D matrix data.
   */
  buildBoard(gridSize, anomalies) {
    const offset = ((gridSize - 1) * this.GRID_SPACING) / 2;
    const anomalyQueue = [...anomalies].sort(() => Math.random() - 0.5);
    const board = [];

    for (let x = 0; x < gridSize; x++) {
      board[x] = [];
      for (let y = 0; y < gridSize; y++) {
        let type = 'empty';
        let data = null;

        if (x === 0 && y === 0) {
          type = 'start';
        } else if ((x === 2 && y === 0) || (x === 0 && y === 3) || (x === 4 && y === 2)) {
          type = 'coffee';
        } else if (anomalyQueue.length > 0 && Math.random() < 0.45 || (anomalyQueue.length > 0 && x + y >= 2)) {
          type = 'enemy';
          data = anomalyQueue.pop();
        }

        board[x][y] = { type, data, cleared: false };

        // 3D Tile Geometry & Shader
        const tileGeo = new THREE.BoxGeometry(this.GRID_SPACING * 0.9, 0.2, this.GRID_SPACING * 0.9);
        let tileColor = 0x161b22;
        if (type === 'start') tileColor = 0x1f6feb;
        else if (type === 'coffee') tileColor = 0xd29922;

        const tileMat = new THREE.MeshStandardMaterial({
          color: tileColor,
          roughness: 0.4,
          metalness: 0.1
        });
        const tileMesh = new THREE.Mesh(tileGeo, tileMat);
        tileMesh.position.set(x * this.GRID_SPACING - offset, 0, y * this.GRID_SPACING - offset);
        tileMesh.receiveShadow = true;
        tileMesh.userData = { gridX: x, gridY: y };
        this.scene.add(tileMesh);
        this.tileMeshes.push(tileMesh);

        // Cyber Grid Lines
        const wireGeo = new THREE.EdgesGeometry(tileGeo);
        const wireMat = new THREE.LineBasicMaterial({ color: 0x30363d, linewidth: 1 });
        const wireMesh = new THREE.LineSegments(wireGeo, wireMat);
        tileMesh.add(wireMesh);

        // Spawn 3D Props on the tile
        if (type === 'enemy' && data) {
          const enemyGroup = new THREE.Group();
          const geom = new THREE.OctahedronGeometry(0.45, 0);
          const mat = new THREE.MeshStandardMaterial({
            color: data.meshColor,
            emissive: data.meshColor,
            emissiveIntensity: 0.5,
            roughness: 0.2
          });
          const enemyMesh = new THREE.Mesh(geom, mat);
          enemyMesh.position.y = 0.85;
          enemyMesh.castShadow = true;
          enemyGroup.add(enemyMesh);

          // Glowing danger ring
          const warnRingGeo = new THREE.RingGeometry(0.3, 0.4, 16);
          const warnRingMat = new THREE.MeshBasicMaterial({ color: data.meshColor, side: THREE.DoubleSide });
          const warnRing = new THREE.Mesh(warnRingGeo, warnRingMat);
          warnRing.rotation.x = -Math.PI / 2;
          warnRing.position.y = 0.05;
          enemyGroup.add(warnRing);

          enemyGroup.position.set(x * this.GRID_SPACING - offset, 0, y * this.GRID_SPACING - offset);
          enemyGroup.userData = { isEnemy: true, gridX: x, gridY: y, data: data, mesh: enemyMesh };
          this.scene.add(enemyGroup);
          this.interactiveObjects.push(enemyGroup);
        } else if (type === 'coffee') {
          const coffeeGroup = new THREE.Group();
          const cupGeo = new THREE.CylinderGeometry(0.2, 0.15, 0.35, 12);
          const cupMat = new THREE.MeshStandardMaterial({
            color: 0xffa657,
            emissive: 0xd29922,
            emissiveIntensity: 0.3
          });
          const cupMesh = new THREE.Mesh(cupGeo, cupMat);
          cupMesh.position.y = 0.35;
          coffeeGroup.add(cupMesh);

          coffeeGroup.position.set(x * this.GRID_SPACING - offset, 0, y * this.GRID_SPACING - offset);
          coffeeGroup.userData = { isCoffee: true, gridX: x, gridY: y, mesh: cupMesh };
          this.scene.add(coffeeGroup);
          this.interactiveObjects.push(coffeeGroup);
        }
      }
    }

    return board;
  }

  /**
   * Immediately snaps player and camera to the specified grid coordinates without animation.
   * @param {number} gridX
   * @param {number} gridY
   * @param {number} gridSize
   */
  setPlayerGridPosition(gridX, gridY, gridSize) {
    const offset = ((gridSize - 1) * this.GRID_SPACING) / 2;
    const targetX = gridX * this.GRID_SPACING - offset;
    const targetZ = gridY * this.GRID_SPACING - offset;

    this.playerGroup.position.set(targetX, 0, targetZ);
    this.pointLight.position.set(targetX, 4, targetZ);
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
   * Smoothly animates player movement from current tile to target tile.
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
    const duration = 220; // ms

    const stepAnimation = (now) => {
      const t = Math.min((now - startTime) / duration, 1);
      // Ease out Quad
      const ease = t * (2 - t);
      this.playerGroup.position.lerpVectors(startPos, endPos, ease);
      // Hop curve
      this.playerGroup.position.y = Math.sin(ease * Math.PI) * 0.35;

      this.pointLight.position.set(this.playerGroup.position.x, 4, this.playerGroup.position.z);
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

      // Floating bob & rotation on anomaly and coffee meshes
      this.interactiveObjects.forEach(obj => {
        if (obj.userData.mesh) {
          obj.userData.mesh.rotation.y = time * 1.5;
          obj.userData.mesh.rotation.x = Math.sin(time * 2) * 0.1;
          obj.userData.mesh.position.y = 0.85 + Math.sin(time * 3) * 0.1;
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
