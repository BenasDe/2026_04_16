class GameBoard {
  constructor(scene, gridSpacing) {
    this.scene = scene;
    this.GRID_SPACING = gridSpacing;
    this.tileMeshes = [];
    this.interactiveObjects = [];
  }

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

  buildBoard(gridSize, tasks, fuelToPlace = 2) {
    this.clearBoard();

    const offset = ((gridSize - 1) * this.GRID_SPACING) / 2;
    const board = [];

    for (let x = 0; x < gridSize; x++) {
      board[x] = [];
      for (let y = 0; y < gridSize; y++) {
        board[x][y] = { type: 'empty', data: null, staged: false };
      }
    }

    board[0][0].type = 'start';

    const candidateCoords = [];
    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        if (x !== 0 || y !== 0) {
          candidateCoords.push({ x, y });
        }
      }
    }

    if (window.Utils) {
      window.Utils.shuffle(candidateCoords);
    } else {
      for (let i = candidateCoords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidateCoords[i], candidateCoords[j]] = [candidateCoords[j], candidateCoords[i]];
      }
    }

    let coordIdx = 0;
    for (let i = 0; i < fuelToPlace && coordIdx < candidateCoords.length; i++) {
      const c = candidateCoords[coordIdx++];
      board[c.x][c.y].type = 'fuel';
    }

    const shuffledTasks = window.Utils ? window.Utils.shuffle([...tasks]) : [...tasks].sort(() => Math.random() - 0.5);
    for (let i = 0; i < shuffledTasks.length && coordIdx < candidateCoords.length; i++) {
      const c = candidateCoords[coordIdx++];
      board[c.x][c.y].type = 'enemy';
      board[c.x][c.y].data = shuffledTasks[i];
    }

    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        const cell = board[x][y];
        const tileGeo = new THREE.BoxGeometry(this.GRID_SPACING * 0.92, 0.2, this.GRID_SPACING * 0.92);
        
        let tileColor = 0x1c2128;
        if (cell.type === 'start') tileColor = 0x30363d;
        else if (cell.type === 'fuel') tileColor = 0x21262d;

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

        const wireGeo = new THREE.EdgesGeometry(tileGeo);
        const wireMat = new THREE.LineBasicMaterial({
          color: cell.type === 'start' ? 0xffffff : 0x545d6e,
          linewidth: 1
        });
        const wireMesh = new THREE.LineSegments(wireGeo, wireMat);
        tileMesh.add(wireMesh);

        if (cell.type === 'enemy' && cell.data) {
          const enemyGroup = new THREE.Group();

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

          const hexWireGeo = new THREE.EdgesGeometry(hexPrismGeo);
          const hexWireMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
          const hexWire = new THREE.LineSegments(hexWireGeo, hexWireMat);
          hexMesh.add(hexWire);

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
        } else if (cell.type === 'fuel') {
          const fuelGroup = new THREE.Group();
          const pickupMesh = window.GameFuel.createMesh();
          pickupMesh.position.y = 0.78;
          fuelGroup.add(pickupMesh);

          fuelGroup.position.set(x * this.GRID_SPACING - offset, 0, y * this.GRID_SPACING - offset);
          fuelGroup.userData = { isFuel: true, gridX: x, gridY: y, mesh: pickupMesh };
          this.scene.add(fuelGroup);
          this.interactiveObjects.push(fuelGroup);
        }
      }
    }

    return board;
  }

  removeInteractiveObject(gridX, gridY) {
    const idx = this.interactiveObjects.findIndex(
      o => o.userData.gridX === gridX && o.userData.gridY === gridY
    );
    if (idx !== -1) {
      this.scene.remove(this.interactiveObjects[idx]);
      this.interactiveObjects.splice(idx, 1);
    }
  }

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
