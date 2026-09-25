/**
 * @file engine.js
 * @description Three.js 2.5D Isometric Rendering Engine with Monochrome Aesthetics and Red Bull Can Accents.
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

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.scene.fog = new THREE.FogExp2(0x000000, 0.04);
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.copy(this.cameraOffset);
    this.camera.lookAt(0, 0, 0);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  initLighting() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.75));
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

  initPlayerMesh() {
    this.playerGroup = new THREE.Group();
    const bodyMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.9, 16), new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.3 }));
    bodyMesh.position.y = 0.55;
    bodyMesh.castShadow = true;
    this.playerGroup.add(bodyMesh);
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), new THREE.MeshStandardMaterial({ color: 0xe0e0e0, roughness: 0.5 }));
    headMesh.position.y = 1.2;
    headMesh.castShadow = true;
    this.playerGroup.add(headMesh);
    const hairMesh = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.15, 0.38), new THREE.MeshStandardMaterial({ color: 0x050505 }));
    hairMesh.position.y = 1.38;
    this.playerGroup.add(hairMesh);
    const laptopMesh = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.04, 0.28), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.95 }));
    laptopMesh.position.set(0, 0.7, 0.4);
    laptopMesh.rotation.x = 0.2;
    this.playerGroup.add(laptopMesh);
    const ringMesh = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.55, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.05;
    this.playerGroup.add(ringMesh);
    this.scene.add(this.playerGroup);
  }

  initRaycaster() { this.raycaster = new THREE.Raycaster(); this.mouse = new THREE.Vector2(); }

  initResizeListener() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  buildBoard(gridSize, anomalies) {
    const offset = ((gridSize - 1) * this.GRID_SPACING) / 2;
    const anomalyQueue = [...anomalies].sort(() => Math.random() - 0.5);
    const board = [];
    for (let x = 0; x < gridSize; x++) {
      board[x] = [];
      for (let y = 0; y < gridSize; y++) {
        let type = 'empty';
        let data = null;
        if (x === 0 && y === 0) type = 'start';
        else if ((x === 2 && y === 0) || (x === 0 && y === 3) || (x === 4 && y === 2)) type = 'redBull';
        else if (anomalyQueue.length > 0 && (Math.random() < 0.45 || x + y >= 2)) { type = 'enemy'; data = anomalyQueue.pop(); }
        board[x][y] = { type, data, cleared: false };
        const tileGeo = new THREE.BoxGeometry(this.GRID_SPACING * 0.9, 0.2, this.GRID_SPACING * 0.9);
        let tileColor = 0x0c0c0c;
        if (type === 'start') tileColor = 0x242424;
        else if (type === 'redBull') tileColor = 0x181818;
        const tileMesh = new THREE.Mesh(tileGeo, new THREE.MeshStandardMaterial({ color: tileColor, roughness: 0.5, metalness: 0.1 }));
        tileMesh.position.set(x * this.GRID_SPACING - offset, 0, y * this.GRID_SPACING - offset);
        tileMesh.receiveShadow = true;
        tileMesh.userData = { gridX: x, gridY: y };
        this.scene.add(tileMesh);
        this.tileMeshes.push(tileMesh);
        const wireMesh = new THREE.LineSegments(new THREE.EdgesGeometry(tileGeo), new THREE.LineBasicMaterial({ color: type === 'start' ? 0xffffff : 0x333333, linewidth: 1 }));
        tileMesh.add(wireMesh);
        if (type === 'enemy' && data) {
          const enemyGroup = new THREE.Group();
          const hexPrismGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.35, 6);
          const hexMesh = new THREE.Mesh(hexPrismGeo, new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffffff, emissiveIntensity: 0.25, roughness: 0.2 }));
          hexMesh.position.y = 0.8;
          hexMesh.castShadow = true;
          enemyGroup.add(hexMesh);
          hexMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(hexPrismGeo), new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 })));
          const hexFloor = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.48, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
          hexFloor.rotation.x = -Math.PI / 2;
          hexFloor.rotation.z = Math.PI / 6;
          hexFloor.position.y = 0.05;
          enemyGroup.add(hexFloor);
          enemyGroup.position.set(x * this.GRID_SPACING - offset, 0, y * this.GRID_SPACING - offset);
          enemyGroup.userData = { isEnemy: true, gridX: x, gridY: y, data, mesh: hexMesh };
          this.scene.add(enemyGroup);
          this.interactiveObjects.push(enemyGroup);
        } else if (type === 'redBull') {
          const redBullGroup = new THREE.Group();
          const canMesh = this.createRedBullCan();
          canMesh.position.y = 0.8;
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

  createRedBullCan() {
    const label = document.createElement('canvas');
    label.width = 256;
    label.height = 256;
    const ctx = label.getContext('2d');
    ctx.fillStyle = '#cbd0d8';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#173fa5';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillRect(128, 128, 128, 128);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 30px Arial, sans-serif';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#df1634';
    [64, 192].forEach(x => { ctx.strokeText('Red Bull', x, 128); ctx.fillText('Red Bull', x, 128); });
    const labelTexture = new THREE.CanvasTexture(label);
    labelTexture.encoding = THREE.sRGBEncoding;
    const bodyMat = new THREE.MeshStandardMaterial({ map: labelTexture, metalness: 0.35, roughness: 0.35 });
    const silverMat = new THREE.MeshStandardMaterial({ color: 0xd9dce2, metalness: 0.65, roughness: 0.25 });
    const canMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.7, 24), [bodyMat, silverMat, silverMat]);
    canMesh.castShadow = true;
    [0.35, -0.35].forEach(y => {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.018, 6, 24), silverMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = y;
      canMesh.add(rim);
    });
    const pullTab = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 6, 12), silverMat);
    pullTab.rotation.x = Math.PI / 2;
    pullTab.scale.y = 1.5;
    pullTab.position.set(0, 0.37, 0.025);
    canMesh.add(pullTab);
    return canMesh;
  }

  setPlayerGridPosition(gridX, gridY, gridSize) {
    const offset = ((gridSize - 1) * this.GRID_SPACING) / 2;
    const targetX = gridX * this.GRID_SPACING - offset;
    const targetZ = gridY * this.GRID_SPACING - offset;
    this.playerGroup.position.set(targetX, 0, targetZ);
    this.pointLight.position.set(targetX, 4, targetZ);
    this.camera.position.set(targetX + this.cameraOffset.x, this.cameraOffset.y, targetZ + this.cameraOffset.z);
    this.camera.lookAt(targetX, 0, targetZ);
  }

  removeInteractiveObject(gridX, gridY) {
    const idx = this.interactiveObjects.findIndex(o => o.userData.gridX === gridX && o.userData.gridY === gridY);
    if (idx !== -1) { this.scene.remove(this.interactiveObjects[idx]); this.interactiveObjects.splice(idx, 1); }
  }

  animatePlayerMovement(gridX, gridY, gridSize, onComplete) {
    const offset = ((gridSize - 1) * this.GRID_SPACING) / 2;
    const endPos = new THREE.Vector3(gridX * this.GRID_SPACING - offset, 0, gridY * this.GRID_SPACING - offset);
    const startPos = this.playerGroup.position.clone();
    const startTime = performance.now();
    const stepAnimation = now => {
      const t = Math.min((now - startTime) / 220, 1);
      const ease = t * (2 - t);
      this.playerGroup.position.lerpVectors(startPos, endPos, ease);
      this.playerGroup.position.y = Math.sin(ease * Math.PI) * 0.35;
      this.pointLight.position.set(this.playerGroup.position.x, 4, this.playerGroup.position.z);
      this.camera.position.set(this.playerGroup.position.x + this.cameraOffset.x, this.cameraOffset.y, this.playerGroup.position.z + this.cameraOffset.z);
      this.camera.lookAt(this.playerGroup.position.x, 0, this.playerGroup.position.z);
      if (t < 1) requestAnimationFrame(stepAnimation);
      else { this.playerGroup.position.copy(endPos); this.playerGroup.position.y = 0; if (onComplete) onComplete(); }
    };
    requestAnimationFrame(stepAnimation);
  }

  startRenderLoop(state) {
    const render = () => {
      requestAnimationFrame(render);
      const time = this.clock.getElapsedTime();
      this.interactiveObjects.forEach(obj => {
        if (obj.userData.mesh) {
          obj.userData.mesh.rotation.y = time * 1.5;
          obj.userData.mesh.position.y = 0.8 + Math.sin(time * 3) * 0.08;
        }
      });
      if (!state.isMoving) this.playerGroup.position.y = Math.sin(time * 2.5) * 0.04;
      this.renderer.render(this.scene, this.camera);
    };
    render();
  }
}

window.GameEngine = GameEngine;
