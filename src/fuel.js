/** Drink-specific text and models. Gameplay only consumes neutral fuel units. */
(function () {
  'use strict';

  const types = {
    espresso: {
      createMesh: createEspressoCup,
      text: {
        en: { name: 'Espresso', genitive: 'espresso', pickups: 'espresso cups', unit: 'cup', units: 'cups' },
        lt: { name: 'Espreso', genitive: 'espreso', pickups: 'espreso puodelius', unit: 'puod.', units: 'puod.' }
      }
    },
    redbull: {
      createMesh: createRedBullCan,
      text: {
        en: { name: 'Red Bull', genitive: 'Red Bull', pickups: 'Red Bull cans', unit: 'can', units: 'cans' },
        lt: { name: 'Red Bull', genitive: '„Red Bull“', pickups: '„Red Bull“ skardines', unit: 'skard.', units: 'skard.' }
      }
    }
  };

  const type = window.GAME_CONFIG.fuelType;
  if (!Object.prototype.hasOwnProperty.call(types, type)) {
    throw new Error(`Unknown fuelType "${type}". Choose one of: ${Object.keys(types).join(', ')}.`);
  }
  const selected = types[type];

  window.GameFuel = Object.freeze({
    type,
    // Both models are created lazily, after Three.js and the page are ready.
    createMesh() { return selected.createMesh(); },
    tokens(language, count) {
      const text = selected.text[language] || selected.text.en;
      return {
        fuelName: text.name,
        fuelGenitive: text.genitive,
        fuelPickups: text.pickups,
        fuelUnit: text.unit,
        fuelUnits: text.units,
        fuelCountUnit: count === 1 ? text.unit : text.units
      };
    }
  });

  function createEspressoCup() {
    const cupGroup = new THREE.Group();

    const ceramicMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
      metalness: 0.1
    });

    // Cup body
    const cupGeo = new THREE.CylinderGeometry(0.28, 0.2, 0.42, 24);
    const cupMesh = new THREE.Mesh(cupGeo, ceramicMat);
    cupMesh.castShadow = true;
    cupGroup.add(cupMesh);

    // Saucer / Plate underneath
    const saucerGeo = new THREE.CylinderGeometry(0.44, 0.38, 0.05, 24);
    const saucerMesh = new THREE.Mesh(saucerGeo, ceramicMat);
    saucerMesh.position.y = -0.21;
    saucerMesh.castShadow = true;
    cupGroup.add(saucerMesh);

    // Dark espresso coffee liquid surface
    const coffeeMat = new THREE.MeshStandardMaterial({
      color: 0x2b170b,
      roughness: 0.2,
      metalness: 0.2
    });
    const coffeeGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.02, 24);
    const coffeeMesh = new THREE.Mesh(coffeeGeo, coffeeMat);
    coffeeMesh.position.y = 0.18;
    cupGroup.add(coffeeMesh);

    // Golden crema swirl
    const cremaMat = new THREE.MeshStandardMaterial({
      color: 0xc89d66,
      roughness: 0.45
    });
    const cremaGeo = new THREE.CircleGeometry(0.18, 16);
    const cremaMesh = new THREE.Mesh(cremaGeo, cremaMat);
    cremaMesh.rotation.x = -Math.PI / 2;
    cremaMesh.position.y = 0.191;
    cupGroup.add(cremaMesh);

    // Cup handle
    const handleGeo = new THREE.TorusGeometry(0.12, 0.035, 12, 24, Math.PI * 1.2);
    const handleMesh = new THREE.Mesh(handleGeo, ceramicMat);
    handleMesh.rotation.y = -Math.PI / 2;
    handleMesh.rotation.z = Math.PI * 0.15;
    handleMesh.position.set(0.25, 0.02, 0);
    handleMesh.castShadow = true;
    cupGroup.add(handleMesh);

    return cupGroup;
  }

  function createRedBullCan() {
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

    const canMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.7, 24),
      [bodyMat, silverMat, silverMat]
    );
    canMesh.castShadow = true;

    [0.35, -0.35].forEach(y => {
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.19, 0.018, 6, 24),
        silverMat
      );
      rim.rotation.x = Math.PI / 2;
      rim.position.y = y;
      canMesh.add(rim);
    });

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
})();
