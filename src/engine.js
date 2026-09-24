/**
 * @file engine.js
 * @description Three.js 2.5D Isometric Rendering Engine with Pure Black & White Monochrome Aesthetics.
 * Marks enemy locations with 3D Hexagonal structures.
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
   * Initializes Three.js Scene, Renderer, and Isometric Perspective Camera in B&W.
   */
  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.scene.fog = new THREE.FogExp2(0x000000, 0.04);

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
   * Configures environmental lighting in pure monochrome white.
   */
  initLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.95);
    dirLight.position.set(15, 30, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    this.scene.add(dirLight);

    this.pointLight = new THREE.PointLight(0xffffff, 1.4, 25);
    this.pointLight.position.set(0, 5, 0);
    this.scene.add(this.pointLight);
  }

  /**
   * Constructs the 3D low-poly developer character model with monochrome finish and glowing white laptop.
   */
  initPlayerMesh() {
    this.playerGroup = new THREE.Group();

    // Body (Matte Black)
    const bodyGeo = new THREE.CylinderGeometry(0.35, 0.4, 0.9, 16);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.3 });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.y = 0.55;
    bodyMesh.castShadow = true;
    this.playerGroup.add(bodyMesh);

    // Head (Light Silver/White)
    const headGeo = new THREE.SphereGeometry(0.28, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, roughness: 0.5 });
    const headMesh = new THREE.Mesh(headGeo, headMat);
    headMesh.position.y = 1.2;
    headMesh.castShadow = true;
    this.playerGroup.add(headMesh);

    // Hair / Cap (Solid Black)
    const hairGeo = new THREE.BoxGeometry(0.38, 0.15, 0.38);
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x050505 });
    const hairMesh = new THREE.Mesh(hairGeo, hairMat);
    hairMesh.position.y = 1.38;
    this.playerGroup.add(hairMesh);

    // Glowing Laptop Screen (Crisp White)
    const laptopGeo = new THREE.BoxGeometry(0.35, 0.04, 0.28);
    const laptopMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.95
    });
    const laptopMesh = new THREE.Mesh(laptopGeo, laptopMat);
    laptopMesh.position.set(0, 0.7, 0.4);
    laptopMesh.rotation.x = 0.2;
    this.playerGroup.add(laptopMesh);

    // Glowing Target Ring under player feet (Solid White)
    const ringGeo = new THREE.RingGeometry(0.45, 0.55, 32);
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
   * Builds the 2.5D Isometric Grid with Hexagonal Enemy Markers in pure B&W.
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

        // 3D Grid Tile Geometry (Monochrome Dark Slate)
        const tileGeo = new THREE.BoxGeometry(this.GRID_SPACING * 0.9, 0.2, this.GRID_SPACING * 0.9);
        let tileColor = 0x0c0c0c;
        if (type === 'start') tileColor = 0x242424;
        else if (type === 'coffee') tileColor = 0x181818;

        const tileMat = new THREE.MeshStandardMaterial({
          color: tileColor,
          roughness: 0.5,
          metalness: 0.1
        });
        const tileMesh = new THREE.Mesh(tileGeo, tileMat);
        tileMesh.position.set(x * this.GRID_SPACING - offset, 0, y * this.GRID_SPACING - offset);
        tileMesh.receiveShadow = true;
        tileMesh.userData = { gridX: x, gridY: y };
        this.scene.add(tileMesh);
        this.tileMeshes.push(tileMesh);

        // Crisp White/Gray Grid Border Lines
        const wireGeo = new THREE.EdgesGeometry(tileGeo);
        const wireMat = new THREE.LineBasicMaterial({
          color: type === 'start' ? 0xffffff : 0x333333,
          linewidth: 1
        });
        const wireMesh = new THREE.LineSegments(wireGeo, wireMat);
        tileMesh.add(wireMesh);

        // =====================================================================
        // SPAWN 3D HEXAGONAL ENEMY MARKER
        // =====================================================================
        if (type === 'enemy' && data) {
          const enemyGroup = new THREE.Group();

          // 3D Hexagonal Prism (6-sided Cylinder)
          const hexPrismGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.35, 6);
          const hexMat = new THREE.MeshStandardMaterial({
            color: 0x111111,
            emissive: 0xffffff,
            emissiveIntensity: 0.25,
            roughness: 0.2
          });
          const hexMesh = new THREE.Mesh(hexPrismGeo, hexMat);
          hexMesh.position.y = 0.8;
          hexMesh.castShadow = true;
          enemyGroup.add(hexMesh);

          // Crisp White Hexagonal Wireframe Outline on the Prism
          const hexWireGeo = new THREE.EdgesGeometry(hexPrismGeo);
          const hexWireMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
          const hexWire = new THREE.LineSegments(hexWireGeo, hexWireMat);
          hexMesh.add(hexWire);

          // Floor Marker: 2D Hexagonal Ring on Tile Surface (6 segments = Hexagon)
          const hexFloorGeo = new THREE.RingGeometry(0.35, 0.48, 6);
          const hexFloorMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
          const hexFloor = new THREE.Mesh(hexFloorGeo, hexFloorMat);
          hexFloor.rotation.x = -Math.PI / 2;
          hexFloor.rotation.z = Math.PI / 6; // Align flat hexagon edges
          hexFloor.position.y = 0.05;
          enemyGroup.add(hexFloor);

          enemyGroup.position.set(x * this.GRID_SPACING - offset, 0, y * this.GRID_SPACING - offset);
          enemyGroup.userData = { isEnemy: true, gridX: x, gridY: y, data: data, mesh: hexMesh };
          this.scene.add(enemyGroup);
          this.interactiveObjects.push(enemyGroup);
        } else if (type === 'coffee') {
          // Monochrome Coffee Rest Station
          const coffeeGroup = new THREE.Group();
          const cupGeo = new THREE.CylinderGeometry(0.2, 0.15, 0.35, 12);
          const cupMat = new THREE.MeshStandardMaterial({
            color: 0x222222,
            emissive: 0xffffff,
            emissiveIntensity: 0.35
          });
          const cupMesh = new THREE.Mesh(cupGeo, cupMat);
          cupMesh.position.y = 0.35;
          coffeeGroup.add(cupMesh);

          // White wireframe on cup
          const cupWireGeo = new THREE.EdgesGeometry(cupGeo);
          const cupWireMat = new THREE.LineBasicMaterial({ color: 0xffffff });
          cupMesh.add(new THREE.LineSegments(cupWireGeo, cupWireMat));

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

      // Floating bob & rotation on hexagonal anomaly and coffee meshes
      this.interactiveObjects.forEach(obj => {
        if (obj.userData.mesh) {
          obj.userData.mesh.rotation.y = time * 1.5;
          obj.userData.mesh.position.y = 0.8 + Math.sin(time * 3) * 0.08;
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
