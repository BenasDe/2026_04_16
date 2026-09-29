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
      color: 0xf4f0e8,
      roughness: 0.65,
      metalness: 0
    });
    // Unlit outlines stay dark under the board's bright lights. Mesh outlines
    // also avoid WebGL's platform-dependent support for thick line widths.
    const outlineMat = new THREE.MeshBasicMaterial({ color: 0x101317, side: THREE.BackSide });
    const rimMat = new THREE.MeshBasicMaterial({ color: 0x101317 });

    function addCeramicPart(name, geometry, outlineGeometry = geometry) {
      const mesh = new THREE.Mesh(geometry, ceramicMat);
      mesh.name = name;
      mesh.castShadow = true;
      const outline = new THREE.Mesh(outlineGeometry, outlineMat);
      outline.name = `${name}-outline`;
      if (outlineGeometry === geometry) outline.scale.set(1.045, 1.045, 1.045);
      mesh.add(outline);
      cupGroup.add(mesh);
      return mesh;
    }

    // Revolve a hollow ceramic wall and lip, leaving the drink visible.
    // A capped cylinder would hide the coffee just below the rim.
    const cupProfile = [
      [0, -0.21], [0.18, -0.21], [0.2, -0.19], [0.24, -0.03],
      [0.28, 0.18], [0.28, 0.205], [0.271, 0.216], [0.249, 0.216],
      [0.24, 0.202], [0.239, 0.183], [0.203, -0.115], [0, -0.135]
    ].map(([radius, height]) => new THREE.Vector2(radius, height));
    addCeramicPart('espresso-cup', new THREE.LatheGeometry(cupProfile, 32));

    // A shallow raised edge gives the saucer a separate silhouette.
    const saucerProfile = [
      [0, -0.025], [0.35, -0.025], [0.42, -0.018], [0.445, 0],
      [0.445, 0.016], [0.42, 0.027], [0.34, 0.006], [0, 0.006]
    ].map(([radius, height]) => new THREE.Vector2(radius, height));
    const saucerMesh = addCeramicPart('espresso-saucer', new THREE.LatheGeometry(saucerProfile, 32));
    saucerMesh.position.y = -0.21;

    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.276, 0.007, 6, 32), rimMat);
    lip.name = 'espresso-rim';
    lip.rotation.x = Math.PI / 2;
    lip.position.y = 0.211;
    cupGroup.add(lip);

    // Fill the opening almost to the lip, with a thin crescent of crema.
    const coffeeMat = new THREE.MeshStandardMaterial({
      color: 0x2b170b,
      roughness: 0.5,
      metalness: 0
    });
    const coffeeGeo = new THREE.CircleGeometry(0.242, 32);
    const coffeeMesh = new THREE.Mesh(coffeeGeo, coffeeMat);
    coffeeMesh.name = 'espresso-coffee';
    coffeeMesh.rotation.x = -Math.PI / 2;
    coffeeMesh.position.y = 0.181;
    cupGroup.add(coffeeMesh);

    const cremaMat = new THREE.MeshStandardMaterial({
      color: 0xc49652,
      roughness: 0.8
    });
    const cremaGeo = new THREE.RingGeometry(0.19, 0.229, 32, 1, Math.PI * 0.12, Math.PI * 1.45);
    const cremaMesh = new THREE.Mesh(cremaGeo, cremaMat);
    cremaMesh.name = 'espresso-crema';
    cremaMesh.rotation.x = -Math.PI / 2;
    cremaMesh.position.y = 0.183;
    cupGroup.add(cremaMesh);

    // The loop lies in the XY plane, extending out of the cup's side.
    // Thicken its outline tube instead of scaling the loop, so the hole is outlined too.
    const handleMesh = addCeramicPart('espresso-handle',
      new THREE.TorusGeometry(0.15, 0.035, 8, 32),
      new THREE.TorusGeometry(0.15, 0.043, 8, 32));
    handleMesh.position.set(0.325, -0.005, 0);
    handleMesh.scale.y = 1.05;

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
