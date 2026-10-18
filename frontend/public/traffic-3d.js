(() => {
const THREE = window.THREE;
const host = document.getElementById('threeCanvas');
if (!THREE) {
  host.innerHTML = '<div class="scene-error"><strong>No se pudo iniciar la maqueta 3D.</strong><span>Vuelve a cargar la página. Si continúa, revisa que la carpeta vendor esté junto al HTML.</span></div>';
  return;
}
const scene = new THREE.Scene();
scene.background = new THREE.Color('#f7f9f6');
scene.fog = new THREE.Fog('#f7f9f6', 35, 70);

const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
camera.position.set(22, 20, 23);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
host.appendChild(renderer.domElement);

const controls = (() => {
  const target = new THREE.Vector3(0, 0.45, 0);
  const offset = camera.position.clone().sub(target);
  const spherical = new THREE.Spherical().setFromVector3(offset);
  let theta = spherical.theta, phi = spherical.phi, radius = spherical.radius;
  let start = null, saved = null;
  const canvas = renderer.domElement;
  canvas.style.cursor = 'grab';
  const apply = () => {
    camera.position.setFromSpherical(new THREE.Spherical(radius, phi, theta)).add(target);
    camera.lookAt(target);
  };
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    start = { id: event.pointerId, x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId); canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('pointermove', event => {
    if (!start || start.id !== event.pointerId) return;
    theta -= (event.clientX - start.x) * 0.008;
    phi = THREE.MathUtils.clamp(phi - (event.clientY - start.y) * 0.008, 0.32, 1.34);
    start.x = event.clientX; start.y = event.clientY; apply();
  });
  const stop = () => { start = null; canvas.style.cursor = 'grab'; };
  canvas.addEventListener('pointerup', stop); canvas.addEventListener('pointercancel', stop);
  canvas.addEventListener('wheel', event => {
    event.preventDefault(); radius = THREE.MathUtils.clamp(radius * Math.exp(event.deltaY * 0.001), 16, 42); apply();
  }, { passive: false });
  return {
    target,
    update: () => camera.lookAt(target),
    saveState: () => { saved = { target: target.clone(), theta, phi, radius }; },
    reset: () => { if (!saved) return; target.copy(saved.target); theta = saved.theta; phi = saved.phi; radius = saved.radius; apply(); },
  };
})();
controls.update();
controls.saveState();
document.getElementById('resetCamera')?.addEventListener('click', () => controls.reset());

scene.add(new THREE.HemisphereLight('#ffffff', '#98a39a', 2.1));
const sun = new THREE.DirectionalLight('#fff5df', 3.0);
sun.position.set(-12, 24, 14);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -20;
sun.shadow.camera.right = 20;
sun.shadow.camera.top = 20;
sun.shadow.camera.bottom = -20;
scene.add(sun);

const mats = {
  base: new THREE.MeshStandardMaterial({ color: '#d6d5ca', roughness: 0.92 }),
  sidewalk: new THREE.MeshStandardMaterial({ color: '#deded5', roughness: 0.88 }),
  curb: new THREE.MeshStandardMaterial({ color: '#a9aaa1', roughness: 0.9 }),
  asphalt: new THREE.MeshStandardMaterial({ color: '#495451', roughness: 0.95 }),
  paint: new THREE.MeshStandardMaterial({ color: '#f4f0d8', roughness: 0.8 }),
  dark: new THREE.MeshStandardMaterial({ color: '#202725', roughness: 0.72 }),
  pole: new THREE.MeshStandardMaterial({ color: '#3c4541', metalness: 0.45, roughness: 0.48 }),
  sensor: new THREE.MeshStandardMaterial({ color: '#247ca7', metalness: 0.28, roughness: 0.48 }),
  transducer: new THREE.MeshStandardMaterial({ color: '#d9e0dc', metalness: 0.78, roughness: 0.25 }),
  pcb: new THREE.MeshStandardMaterial({ color: '#18714c', metalness: 0.26, roughness: 0.5 }),
  chip: new THREE.MeshStandardMaterial({ color: '#1d2724', roughness: 0.58 }),
  glass: new THREE.MeshStandardMaterial({ color: '#b9d1d7', metalness: 0.05, roughness: 0.22 }),
  buildingA: new THREE.MeshStandardMaterial({ color: '#d6c4a6', roughness: 0.85 }),
  buildingB: new THREE.MeshStandardMaterial({ color: '#bac8c0', roughness: 0.85 }),
  tree: new THREE.MeshStandardMaterial({ color: '#6f966d', roughness: 0.9 }),
  trunk: new THREE.MeshStandardMaterial({ color: '#80694f', roughness: 0.9 }),
};
const makeBox = (w, h, d, material, x, y, z, parent = scene) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
};
const makeCylinder = (radiusTop, radiusBottom, height, material, x, y, z, parent = scene) => {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 16), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
};

// Raised model base with sidewalks and a four-way asphalt intersection.
makeBox(25, 0.42, 21, mats.base, 0, -0.25, 0);
makeBox(24.4, 0.08, 20.4, mats.sidewalk, 0, 0.0, 0);
makeBox(24.0, 0.10, 5.8, mats.asphalt, 0, 0.095, 0);
makeBox(5.8, 0.105, 20.0, mats.asphalt, 0, 0.10, 0);

// Road center markings and stop/crosswalk markings.
for (let x = -11.5; x <= 11.5; x += 2.2) {
  if (Math.abs(x) > 3.5) makeBox(1.05, 0.025, 0.11, mats.paint, x, 0.16, 0);
}
for (let z = -9.5; z <= 9.5; z += 2.2) {
  if (Math.abs(z) > 3.5) makeBox(0.11, 0.025, 1.05, mats.paint, 0, 0.165, z);
}
for (const x of [-4.15, 4.15]) {
  for (let z = -2.35; z <= 2.2; z += 0.72) makeBox(0.25, 0.035, 0.42, mats.paint, x, 0.17, z);
  makeBox(0.13, 0.035, 5.4, mats.paint, x + (x < 0 ? 0.38 : -0.38), 0.17, 0);
}
for (const z of [-4.15, 4.15]) {
  for (let x = -2.35; x <= 2.2; x += 0.72) makeBox(0.42, 0.035, 0.25, mats.paint, x, 0.17, z);
  makeBox(5.4, 0.035, 0.13, mats.paint, 0, 0.17, z + (z < 0 ? 0.38 : -0.38));
}

// Simple low-rise buildings and trees make the model read as a street scene.
function building(x, z, material, w = 3.2, d = 2.5, h = 2.2) {
  makeBox(w, 0.18, d, mats.curb, x, 0.18, z);
  makeBox(w - 0.22, h, d - 0.22, material, x, 0.28 + h / 2, z);
  makeBox(w + 0.1, 0.18, d + 0.1, mats.dark, x, 0.36 + h, z);
  const windowMat = new THREE.MeshStandardMaterial({ color: '#b5d4d5', metalness: 0.12, roughness: 0.27 });
  for (let wx = -1; wx <= 1; wx += 2) makeBox(0.52, 0.68, 0.06, windowMat, x + wx * (w / 4), 0.45 + h * 0.64, z - d / 2 - 0.01);
}
building(-8.3, -7.0, mats.buildingA, 3.6, 3.0, 2.5);
building(8.2, -7.0, mats.buildingB, 3.6, 3.0, 2.0);
building(-8.3, 7.2, mats.buildingB, 3.4, 2.8, 1.8);
function tree(x, z) {
  makeCylinder(0.14, 0.22, 0.9, mats.trunk, x, 0.5, z);
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.72, 12, 10), mats.tree);
  crown.position.set(x, 1.35, z); crown.castShadow = true; scene.add(crown);
}
tree(-10.2, 2.6); tree(10.1, 2.7); tree(-6.2, -9.0); tree(6.2, -9.0);

// Two traffic lights with individually addressable red, amber and green lamps.
function trafficHead(name, x, z, frontRotation) {
  const group = new THREE.Group();
  group.position.set(x, 0.1, z); group.rotation.y = frontRotation; scene.add(group);
  makeBox(0.12, 2.2, 0.12, mats.pole, 0, 1.1, 0, group);
  makeBox(0.42, 1.18, 0.38, mats.dark, 0, 2.62, 0, group);
  const lamps = {};
  for (const [color, y] of [['red', 3.0], ['yellow', 2.62], ['green', 2.24]]) {
    const bulbMat = new THREE.MeshStandardMaterial({ color: '#222827', emissive: '#080a09', roughness: 0.24 });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.135, 18, 14), bulbMat);
    bulb.position.set(0, y, 0.215); bulb.castShadow = true; group.add(bulb); lamps[color] = bulb;
  }
  return lamps;
}
const signalLamps = {
  a: trafficHead('a', -4.7, -2.7, -Math.PI / 2),
  b: trafficHead('b', 2.7, 4.7, 0),
};

// Ultrasonic sensor boards and their two metal transducers.
function hcSr04(x, z, facing) {
  const root = new THREE.Group(); root.position.set(x, 1.0, z); root.rotation.y = facing; scene.add(root);
  makeBox(1.35, 0.12, 0.62, mats.sensor, 0, 0, 0, root);
  for (const tx of [-0.39, 0.39]) {
    const puck = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.14, 24), mats.transducer);
    puck.rotation.x = Math.PI / 2; puck.position.set(tx, 0.1, 0.02); root.add(puck);
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.145, 24), new THREE.MeshStandardMaterial({ color: '#87999a', metalness: 0.65, roughness: 0.26 }));
    inner.rotation.x = Math.PI / 2; inner.position.set(tx, 0.1, 0.025); root.add(inner);
  }
  makeCylinder(0.08, 0.08, 0.9, mats.pole, 0, -0.48, 0, root);
  return root;
}
const sensorA = hcSr04(-9.4, -1.65, Math.PI / 2);
const sensorB = hcSr04(1.65, 8.2, Math.PI);

// Arduino tray, board, USB socket, controller chip and pin headers.
makeBox(5.7, 0.28, 4.1, mats.curb, 7.6, 0.20, 6.4);
makeBox(5.0, 0.15, 3.5, mats.pcb, 7.6, 0.40, 6.4);
makeBox(1.3, 0.28, 1.15, mats.chip, 7.0, 0.61, 6.35);
makeBox(0.85, 0.32, 0.42, new THREE.MeshStandardMaterial({ color: '#c3c9c6', metalness: 0.65, roughness: 0.3 }), 9.42, 0.55, 6.38);
const pinMat = new THREE.MeshStandardMaterial({ color: '#e0be60', metalness: 0.72, roughness: 0.26 });
for (let i = 0; i < 8; i++) {
  makeBox(0.11, 0.12, 0.11, pinMat, 5.55 + i * 0.42, 0.54, 5.0);
  makeBox(0.11, 0.12, 0.11, pinMat, 5.55 + i * 0.42, 0.54, 7.8);
}

// Visible jumper wires follow the outside edge and join sensors/lights to the Arduino tray.
const wireMats = {
  red: new THREE.MeshStandardMaterial({ color: '#d65c50', emissive: '#3a0805' }),
  yellow: new THREE.MeshStandardMaterial({ color: '#e0ae44', emissive: '#382606' }),
  green: new THREE.MeshStandardMaterial({ color: '#4c9467', emissive: '#092614' }),
  blue: new THREE.MeshStandardMaterial({ color: '#2483a3', emissive: '#071e28' }),
  black: new THREE.MeshStandardMaterial({ color: '#292e2d' }),
  orange: new THREE.MeshStandardMaterial({ color: '#e78943', emissive: '#321707' }),
};
function wire(points, material, radius = 0.035) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, radius, 7, false), material);
  mesh.castShadow = true; scene.add(mesh);
}
const tray = [7.6, 0.62, 6.4];
const cableY = 0.28;
for (const [index, color] of ['red', 'black', 'blue', 'orange'].entries()) {
  wire([[-9.4, 1.0, -1.65], [-10.3, cableY, -2.2 - index * 0.13], [-10.5, cableY, 7.9 - index * 0.18], [4.7 + index * 0.18, cableY, 8.5], [tray[0] - 1.5 + index * 0.17, tray[1], tray[2] - 1.75]], wireMats[color], 0.028);
  wire([[1.65, 1.0, 8.2], [0.9 - index * 0.12, cableY, 9.0], [4.5 + index * 0.15, cableY, 9.35 - index * 0.12], [tray[0] + index * 0.16, tray[1], tray[2] + 1.75]], wireMats[color], 0.028);
}
for (const [lane, start] of [['a', [-4.7, 0.34, -2.7]], ['b', [2.7, 0.34, 4.7]]]) {
  for (const [i, color] of ['red', 'yellow', 'green'].entries()) {
    wire([[start[0], start[1] + 2.0 - i * 0.36, start[2]], [start[0] + (lane === 'a' ? -1 : 1) * 0.8, cableY, start[2] + 0.7], [5.0 + i * 0.16, cableY, 4.9 + i * 0.18], [tray[0] - 1.4 + i * 0.3, tray[1], tray[2] - 1.75]], wireMats[color], 0.027);
  }
}

// Two low-poly cars follow the approaches and cross only when their signal is green.
function car(color) {
  const group = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color, metalness: 0.28, roughness: 0.34 });
  makeBox(1.65, 0.48, 0.88, paint, 0, 0.53, 0, group);
  makeBox(0.88, 0.48, 0.70, paint, -0.10, 0.95, 0, group);
  makeBox(0.70, 0.28, 0.72, mats.glass, -0.10, 0.98, 0, group);
  const wheelMat = new THREE.MeshStandardMaterial({ color: '#202524', roughness: 0.83 });
  for (const wx of [-0.52, 0.52]) for (const wz of [-0.46, 0.46]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.12, 16), wheelMat);
    wheel.rotation.x = Math.PI / 2; wheel.position.set(wx, 0.30, wz); group.add(wheel);
  }
  const lamp = new THREE.MeshStandardMaterial({ color: '#f4d87a', emissive: '#69501b' });
  makeBox(0.08, 0.12, 0.18, lamp, 0.81, 0.55, -0.24, group);
  makeBox(0.08, 0.12, 0.18, lamp, 0.81, 0.55, 0.24, group);
  group.visible = false; scene.add(group); return group;
}
const cars = { a: car('#367b94'), b: car('#c67c45') };

// Sensor ping rings make the detections visible in 3D.
const pings = {};
for (const [lane, x, z] of [['a', -9.4, -1.65], ['b', 1.65, 8.2]]) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.035, 8, 48), new THREE.MeshBasicMaterial({ color: '#43a0bd', transparent: true, opacity: 0.3 }));
  ring.rotation.x = Math.PI / 2; ring.position.set(x, 0.24, z); scene.add(ring); pings[lane] = ring;
}

let current = { phase: 'greenA', occupied: { a: false, b: false }, carProgress: { a: null, b: null } };
function sync(snapshot) {
  if (!snapshot) return;
  current = snapshot;
  for (const lane of ['a', 'b']) {
    const color = current.phase === 'allRed' ? 'red' : current.phase === `yellow${lane.toUpperCase()}` ? 'yellow' : current.phase === `green${lane.toUpperCase()}` ? 'green' : 'red';
    for (const key of ['red', 'yellow', 'green']) {
      const bulb = signalLamps[lane][key];
      const active = key === color;
      const hex = active ? (key === 'red' ? '#ed5145' : key === 'yellow' ? '#f2bd4f' : '#52c879') : '#242927';
      bulb.material.color.set(hex);
      bulb.material.emissive.set(active ? hex : '#080a09');
      bulb.material.emissiveIntensity = active ? 1.7 : 0.04;
      bulb.scale.setScalar(active ? 1.12 : 0.9);
    }
    const progress = current.carProgress[lane];
    cars[lane].visible = !!current.occupied[lane] || progress !== null;
    if (cars[lane].visible) {
      const t = progress === null ? 0 : progress;
      if (lane === 'a') cars.a.position.set(-8.8 + 17.4 * t, 0.03, -1.4);
      else { cars.b.position.set(1.4, 0.03, 8.5 - 17 * t); cars.b.rotation.y = Math.PI / 2; }
    }
    pings[lane].material.opacity = current.occupied[lane] ? 0.7 : 0.18;
    pings[lane].scale.setScalar(current.occupied[lane] ? 1.25 : 0.8);
  }
}
window.trafficScene = { sync };
window.trafficSimSnapshot && sync(window.trafficSimSnapshot());

function resize() {
  const width = host.clientWidth || 800;
  const height = host.clientHeight || 480;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}
const resizeObserver = new ResizeObserver(resize);
resizeObserver.observe(host);
resize();
let animationFrameId;
function animate() {
  animationFrameId = requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
window.trafficScene = {
  sync,
  destroy() {
    cancelAnimationFrame(animationFrameId);
    resizeObserver.disconnect();
    renderer.dispose();
    renderer.domElement.remove();
  },
};
})();
