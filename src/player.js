window.createPlayerCharacter = function () {
  const group = new THREE.Group();
  const rig = new THREE.Group();
  group.add(rig);

  const material = (color, options = {}) => new THREE.MeshStandardMaterial({
    color, roughness: 0.65, ...options
  });
  const suit = material(0xe8edf0);
  const seams = material(0x273746);
  const orange = material(0xf99a45);
  const glass = material(0x102b3b, { metalness: 0.45, roughness: 0.2 });
  const glow = material(0x79e6ff, { emissive: 0x35c9ed, emissiveIntensity: 0.7 });

  function mesh(parent, geometry, mat, x, y, z) {
    const part = new THREE.Mesh(geometry, mat);
    part.position.set(x, y, z);
    part.castShadow = true;
    part.receiveShadow = true;
    parent.add(part);
    return part;
  }

  function ellipsoid(parent, mat, x, y, z, sx, sy, sz) {
    const part = mesh(parent, new THREE.SphereGeometry(1, 16, 12), mat, x, y, z);
    part.scale.set(sx, sy, sz);
    return part;
  }

  ellipsoid(rig, suit, 0, 0.85, 0, 0.37, 0.43, 0.27);
  mesh(rig, new THREE.CylinderGeometry(0.25, 0.29, 0.12, 16), seams, 0, 1.15, 0);
  const helmet = new THREE.Group();
  helmet.position.y = 1.48;
  rig.add(helmet);
  ellipsoid(helmet, suit, 0, 0, 0, 0.46, 0.43, 0.41);
  ellipsoid(helmet, glass, 0, 0.015, 0.20, 0.405, 0.30, 0.29);
  [-0.14, 0.14].forEach(x => {
    mesh(helmet, new THREE.BoxGeometry(0.065, 0.12, 0.025), glow, x, 0.035, 0.48);
  });
  const reflection = mesh(helmet, new THREE.BoxGeometry(0.15, 0.025, 0.025), suit, -0.12, 0.18, 0.43);
  reflection.rotation.z = -0.2;
  [-1, 1].forEach(side => {
    const ear = mesh(helmet, new THREE.CylinderGeometry(0.13, 0.13, 0.09, 12), orange, side * 0.44, 0, 0);
    ear.rotation.z = Math.PI / 2;
  });

  mesh(rig, new THREE.BoxGeometry(0.52, 0.55, 0.22), orange, 0, 0.87, -0.29);
  [-0.16, 0.16].forEach(x => {
    mesh(rig, new THREE.CylinderGeometry(0.085, 0.085, 0.46, 10), seams, x, 0.87, -0.43);
  });
  mesh(rig, new THREE.CylinderGeometry(0.018, 0.018, 0.4, 6), seams, 0.29, 1.34, -0.27);
  ellipsoid(rig, glow, 0.29, 1.55, -0.27, 0.05, 0.05, 0.05);
  mesh(rig, new THREE.BoxGeometry(0.27, 0.21, 0.06), seams, 0, 0.9, 0.26);
  mesh(rig, new THREE.BoxGeometry(0.16, 0.045, 0.02), glow, 0, 0.94, 0.30);
  mesh(rig, new THREE.BoxGeometry(0.07, 0.035, 0.02), orange, 0.045, 0.86, 0.30);

  const arms = [], legs = [];
  [-1, 1].forEach(side => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.38, 1.03, 0);
    rig.add(arm);
    ellipsoid(arm, suit, side * 0.045, -0.15, 0, 0.135, 0.24, 0.14);
    ellipsoid(arm, orange, side * 0.065, -0.34, 0.015, 0.125, 0.09, 0.13);
    ellipsoid(arm, seams, side * 0.065, -0.41, 0.035, 0.12, 0.11, 0.13);
    arms.push(arm);

    const leg = new THREE.Group();
    leg.position.set(side * 0.18, 0.55, 0);
    rig.add(leg);
    ellipsoid(leg, suit, 0, -0.15, 0, 0.145, 0.24, 0.15);
    ellipsoid(leg, seams, 0, -0.33, 0.065, 0.16, 0.115, 0.23);
    mesh(leg, new THREE.BoxGeometry(0.25, 0.035, 0.25), orange, 0, -0.33, 0.12);
    legs.push(leg);
  });

  const ring = mesh(group, new THREE.RingGeometry(0.62, 0.66, 40),
    new THREE.MeshBasicMaterial({ color: 0x79e6ff, side: THREE.DoubleSide }), 0, 0.115, 0);
  ring.rotation.x = -Math.PI / 2;
  ring.castShadow = false;

  return {
    group,
    face(dx, dz) { rig.rotation.y = Math.atan2(dx, dz); },
    pose(progress = 0) {
      const stride = Math.sin(progress * Math.PI * 2) * 0.55;
      legs[0].rotation.x = stride;
      legs[1].rotation.x = -stride;
      arms[0].rotation.x = -stride * 0.7;
      arms[1].rotation.x = stride * 0.7;
      rig.position.y = Math.sin(progress * Math.PI) * 0.13;
    },
    idle(time) { helmet.rotation.z = Math.sin(time * 1.8) * 0.025; },
    reset() { this.face(0, 1); this.pose(); helmet.rotation.z = 0; }
  };
};
