/**
 * @file engine.js
 * @description Three.js 2.5D Rendering Engine with aligned top-down perspective,
 * enhanced scene brightness/contrast, and uniform procedural enemy distribution across all grid rows.
 */

class GameEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.GRID_SPACING = 2.4;
    // Straight-on aligned top-down tilted 2.5D camera (Up is North/Z-, Down is South/Z+, Left is West/X-, Right is East/X+)
    this.cameraOffset = new THREE.Vector3(0, 19, 13.5);
    this.clock = new THREE.Clock();

    this.initScene();
    this.board = new GameBoard(this.scene, this.GRID_SPACING);
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
   * Adds the procedural astronaut to the scene.
   */
  initPlayerMesh() {
    this.playerCharacter = createPlayerCharacter();
    this.playerGroup = this.playerCharacter.group;

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

  // Keep the controller and raycasting interfaces independent of board internals.
  get tileMeshes() { return this.board.tileMeshes; }
  get interactiveObjects() { return this.board.interactiveObjects; }

  buildBoard(gridSize, tasks, redBullsToPlace = 2) {
    return this.board.buildBoard(gridSize, tasks, redBullsToPlace);
  }

  removeInteractiveObject(gridX, gridY) {
    this.board.removeInteractiveObject(gridX, gridY);
  }

  markTaskAsStaged(gridX, gridY) {
    this.board.markTaskAsStaged(gridX, gridY);
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

    this.playerCharacter.reset();
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
    this.playerCharacter.face(targetX - startPos.x, targetZ - startPos.z);
    const startTime = performance.now();
    const duration = 200; // ms

    const stepAnimation = (now) => {
      const t = Math.min((now - startTime) / duration, 1);
      const ease = t * (2 - t);
      this.playerGroup.position.lerpVectors(startPos, endPos, ease);
      this.playerCharacter.pose(t);

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
        this.playerCharacter.pose();
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

      this.board.updateInteractiveObjects(time, this.playerGroup.position);

      // Player idle breath
      if (!state.isMoving) {
        this.playerCharacter.idle(time);
      }

      this.renderer.render(this.scene, this.camera);
    };

    render();
  }
}

// Export engine class to window
window.GameEngine = GameEngine;
