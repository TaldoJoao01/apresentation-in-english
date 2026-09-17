import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

const activities = [
  { name: 'WAKE UP', time: '06:30', frequency: 'EVERY DAY', color: 0xff6138 },
  { name: 'TAKE A SHOWER', time: '06:40', frequency: 'ALWAYS', color: 0x5ab9ff },
  { name: 'BREAKFAST', time: '07:00', frequency: 'USUALLY', color: 0xffc857 },
  { name: 'GO TO SCHOOL', time: '07:30', frequency: 'MON — FRI', color: 0xa98bff },
  { name: 'HAVE LUNCH', time: '12:30', frequency: 'EVERY DAY', color: 0x62d89a },
  { name: 'DO HOMEWORK', time: '16:00', frequency: 'USUALLY', color: 0xff7eb6 },
  { name: 'WORK OUT', time: '18:00', frequency: '3× A WEEK', color: 0xff4b26 },
  { name: 'HAVE DINNER', time: '20:00', frequency: 'EVERY DAY', color: 0xf2a65a },
  { name: 'GO TO SLEEP', time: '23:00', frequency: 'ALWAYS', color: 0x6f78d8 }
];

const experience = document.querySelector('#experience3d');
const canvas = document.querySelector('#threeCanvas');
const loader = document.querySelector('#threeLoader');
const objectCard = document.querySelector('#objectCard');
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const clock = new THREE.Clock();
let renderer;
let scene;
let camera;
let activeRoot;
let orbitRoot;
let roomRoot;
let timelineRoot;
let clickable = [];
let currentMode = 'orbit';
let running = false;
let dragging = false;
let previousPointer = { x: 0, y: 0 };
let pointerStart = { x: 0, y: 0 };
let targetRotation = { x: -0.12, y: 0.25 };
let targetZoom = 13;
let timelineProgress = 0;
let timelineCurve;

function labelTexture(top, bottom, accent = '#ff4b26') {
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 512;
  labelCanvas.height = 180;
  const ctx = labelCanvas.getContext('2d');
  ctx.fillStyle = 'rgba(10,11,13,.82)';
  ctx.roundRect(5, 5, 502, 170, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.22)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.fillRect(28, 28, 46, 5);
  ctx.fillStyle = '#f5f1eb';
  ctx.font = '700 42px Arial';
  ctx.fillText(top, 28, 92);
  ctx.fillStyle = '#8c8d91';
  ctx.font = '700 21px Arial';
  ctx.fillText(bottom, 28, 136);
  const texture = new THREE.CanvasTexture(labelCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createLabel(top, bottom, position, scale = 2.1) {
  const material = new THREE.SpriteMaterial({ map: labelTexture(top, bottom), transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.position.copy(position);
  sprite.scale.set(scale * 2.84, scale, 1);
  return sprite;
}

function box(size, position, color, roughness = 0.65) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(...size),
    new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.08 })
  );
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function addStars() {
  const count = 1500;
  const points = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const radius = 20 + Math.random() * 65;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    points[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    points[i * 3 + 1] = radius * Math.cos(phi);
    points[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
  scene.add(new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xffffff, size: 0.065, transparent: true, opacity: 0.65 })));
}

function createOrbitScene() {
  const root = new THREE.Group();
  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(2.55, 64, 64),
    new THREE.MeshStandardMaterial({ color: 0xd93616, roughness: 0.55, metalness: 0.18, emissive: 0x451006, emissiveIntensity: 0.65 })
  );
  planet.castShadow = true;
  root.add(planet);

  const wire = new THREE.Mesh(
    new THREE.SphereGeometry(2.59, 32, 20),
    new THREE.MeshBasicMaterial({ color: 0xff8a68, wireframe: true, transparent: true, opacity: 0.15 })
  );
  root.add(wire);

  [4.1, 5.7, 7.2].forEach((radius, ringIndex) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.012, 8, 180),
      new THREE.MeshBasicMaterial({ color: ringIndex === 1 ? 0xff4b26 : 0x777777, transparent: true, opacity: 0.43 })
    );
    ring.rotation.x = Math.PI / 2.5 + ringIndex * 0.09;
    ring.rotation.y = -0.22 + ringIndex * 0.07;
    root.add(ring);
  });

  activities.forEach((activity, index) => {
    const ring = index % 3;
    const radius = [4.1, 5.7, 7.2][ring];
    const angle = (index / activities.length) * Math.PI * 2 + ring * 0.7;
    const node = new THREE.Mesh(
      new THREE.IcosahedronGeometry(index === 0 ? 0.34 : 0.23, 2),
      new THREE.MeshStandardMaterial({ color: activity.color, emissive: activity.color, emissiveIntensity: 0.6, roughness: 0.3 })
    );
    node.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.34, Math.sin(angle) * radius);
    node.userData = { ...activity, type: 'activity', index };
    node.castShadow = true;
    clickable.push(node);
    root.add(node);
    if ([0, 3, 6].includes(index)) {
      const labelPosition = node.position.clone().add(new THREE.Vector3(0, 0.7, 0));
      root.add(createLabel(activity.time, activity.name, labelPosition, 0.68));
    }
  });
  root.position.x = 2.25;
  orbitRoot = root;
  scene.add(root);
}

function interactiveObject(mesh, data) {
  mesh.userData = { ...data, type: 'roomObject' };
  clickable.push(mesh);
  return mesh;
}

function createRoomScene() {
  const root = new THREE.Group();
  root.visible = false;

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(15, 11), new THREE.MeshStandardMaterial({ color: 0x242326, roughness: 0.92 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  root.add(floor);
  const backWall = box([15, 7, 0.15], [0, 3.5, -5.4], 0x18191d);
  const sideWall = box([0.15, 7, 11], [-7.4, 3.5, 0], 0x202126);
  root.add(backWall, sideWall);

  for (let x = -6; x < 7; x += 1.5) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.014, 10.8), new THREE.MeshBasicMaterial({ color: 0x555156, transparent: true, opacity: 0.22 }));
    line.position.set(x, 0.012, 0);
    root.add(line);
  }

  const bedBase = interactiveObject(box([5.1, 0.55, 3.2], [-3.9, 0.55, -2.4], 0x49454b), { name: 'MAKE MY BED', time: '06:35', frequency: 'ALWAYS', hint: 'FIRST CHORE OF THE DAY' });
  const mattress = box([4.9, 0.45, 3], [-3.9, 1.02, -2.4], 0xe6dfd6);
  const blanket = box([2.6, 0.12, 3.02], [-2.75, 1.3, -2.4], 0xd64a2c);
  const pillow1 = box([1.1, 0.27, 1.15], [-5.35, 1.37, -3.1], 0xf2eee8);
  const pillow2 = box([1.1, 0.27, 1.15], [-5.35, 1.37, -1.75], 0xf2eee8);
  root.add(bedBase, mattress, blanket, pillow1, pillow2);

  const desk = interactiveObject(box([4.5, 0.24, 1.8], [3.8, 2.05, -4.25], 0x8b5a38), { name: 'DO HOMEWORK', time: '16:00', frequency: 'USUALLY', hint: 'FOCUS TIME AT MY DESK' });
  const leg1 = box([0.25, 2, 0.25], [2.1, 1, -4.25], 0x4a3021);
  const leg2 = box([0.25, 2, 0.25], [5.5, 1, -4.25], 0x4a3021);
  const laptopBase = box([1.8, 0.08, 1.15], [3.9, 2.23, -4.15], 0x34363b, 0.25);
  const laptopScreen = box([1.8, 1.15, 0.08], [3.9, 2.8, -4.68], 0x20232a, 0.25);
  const screenGlow = new THREE.PointLight(0x7aa7ff, 2.2, 5);
  screenGlow.position.set(3.9, 2.9, -3.9);
  root.add(desk, leg1, leg2, laptopBase, laptopScreen, screenGlow);

  const tvUnit = box([3.4, 0.65, 1.25], [4.6, 0.45, 2.9], 0x29282b);
  const tv = interactiveObject(box([3.3, 2.05, 0.18], [4.6, 2, 3.15], 0x111318, 0.2), { name: 'WATCH SERIES', time: '21:00', frequency: 'SOMETIMES', hint: 'TIME TO RELAX' });
  const tvLight = new THREE.RectAreaLight(0x567eff, 4, 3, 1.8);
  tvLight.position.set(4.6, 2, 2.8);
  tvLight.lookAt(0, 1, 0);
  root.add(tvUnit, tv, tvLight);

  const wardrobe = interactiveObject(box([2.6, 5.2, 1.3], [-5.7, 2.6, 3.8], 0x6c4a36), { name: 'DO THE LAUNDRY', time: 'SATURDAY', frequency: 'ONCE A WEEK', hint: 'KEEP EVERYTHING FRESH' });
  root.add(wardrobe);
  for (let i = -1; i <= 1; i += 1) {
    const doorLine = box([0.025, 4.7, 0.03], [-5.7 + i * 0.8, 2.6, 3.13], 0x2f211a);
    root.add(doorLine);
  }

  const ball = interactiveObject(new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 24), new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.65 })), { name: 'PLAY SOCCER', time: '18:00', frequency: 'TWICE A WEEK', hint: 'MY FAVORITE SPORT' });
  ball.position.set(0.5, 0.55, 2.2);
  ball.castShadow = true;
  root.add(ball);

  const rug = new THREE.Mesh(new THREE.CircleGeometry(2.5, 48), new THREE.MeshStandardMaterial({ color: 0x8e2d1a, roughness: 1 }));
  rug.rotation.x = -Math.PI / 2;
  rug.scale.y = 0.65;
  rug.position.set(0.3, 0.025, 0.4);
  root.add(rug);

  const ceilingLight = new THREE.PointLight(0xffd8b0, 14, 17, 2);
  ceilingLight.position.set(0, 6.2, 0);
  root.add(ceilingLight);
  root.add(createLabel('CLICK OBJECTS', 'BED · DESK · TV · BALL', new THREE.Vector3(0, 5.5, -5), 0.85));
  roomRoot = root;
  scene.add(root);
}

function createTimelineScene() {
  const root = new THREE.Group();
  root.visible = false;
  const points = activities.map((_, index) => {
    const z = index * -5.2;
    const angle = index * 0.82;
    return new THREE.Vector3(Math.sin(angle) * 4.2, Math.cos(angle * 0.7) * 2.1, z);
  });
  timelineCurve = new THREE.CatmullRomCurve3(points);
  const tube = new THREE.Mesh(
    new THREE.TubeGeometry(timelineCurve, 180, 0.045, 8, false),
    new THREE.MeshBasicMaterial({ color: 0xff4b26, transparent: true, opacity: 0.7 })
  );
  root.add(tube);

  activities.forEach((activity, index) => {
    const position = points[index];
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.035, 8, 64),
      new THREE.MeshBasicMaterial({ color: activity.color, transparent: true, opacity: 0.55 })
    );
    halo.position.copy(position);
    halo.rotation.x = Math.PI / 2;
    const node = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.36, 2),
      new THREE.MeshStandardMaterial({ color: activity.color, emissive: activity.color, emissiveIntensity: 0.9 })
    );
    node.position.copy(position);
    node.userData = { ...activity, type: 'timeline', index };
    clickable.push(node);
    root.add(halo, node, createLabel(activity.time, activity.name, position.clone().add(new THREE.Vector3(1.1, 1, 0)), 0.62));
  });
  timelineRoot = root;
  scene.add(root);
}

function init() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x08090b);
  scene.fog = new THREE.FogExp2(0x08090b, 0.018);
  camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 160);
  camera.position.set(0, 1.2, 13);

  scene.add(new THREE.HemisphereLight(0x7d8ab5, 0x24150f, 2.2));
  const keyLight = new THREE.DirectionalLight(0xffb198, 5);
  keyLight.position.set(-5, 7, 8);
  keyLight.castShadow = true;
  scene.add(keyLight);
  const rimLight = new THREE.PointLight(0xff3218, 28, 28);
  rimLight.position.set(7, -1, -3);
  scene.add(rimLight);

  addStars();
  createOrbitScene();
  createRoomScene();
  createTimelineScene();
  activeRoot = orbitRoot;
  setTimeout(() => loader.classList.add('done'), 900);
}

const modeContent = {
  orbit: ['01 — MY UNIVERSE', 'EVERY DAY<br><i>IN ORBIT.</i>', 'DRAG TO ROTATE · SCROLL TO ZOOM<br>CLICK THE ORBITING MOMENTS', 'DRAG / EXPLORE'],
  room: ['02 — MY SPACE', 'WELCOME TO<br><i>MY ROOM.</i>', 'EXPLORE MY PERSONAL SPACE<br>CLICK THE INTERACTIVE OBJECTS', 'CLICK / DISCOVER'],
  timeline: ['03 — TIME TRAVEL', 'A DAY THROUGH<br><i>SPACE & TIME.</i>', 'SCROLL TO TRAVEL THROUGH MY DAY<br>CLICK A MOMENT TO DISCOVER IT', 'SCROLL / TRAVEL']
};

function switchMode(mode) {
  currentMode = mode;
  orbitRoot.visible = mode === 'orbit';
  roomRoot.visible = mode === 'room';
  timelineRoot.visible = mode === 'timeline';
  activeRoot = mode === 'orbit' ? orbitRoot : mode === 'room' ? roomRoot : timelineRoot;
  document.querySelectorAll('.three-modes button').forEach((button) => button.classList.toggle('active', button.dataset.mode === mode));
  const [chapter, title, description, instruction] = modeContent[mode];
  document.querySelector('#threeChapter').textContent = chapter;
  document.querySelector('#threeTitle').innerHTML = title;
  document.querySelector('#threeDescription').innerHTML = description;
  document.querySelector('#modeInstruction').textContent = instruction;
  objectCard.classList.remove('open');
  experience.classList.remove('mode-flash');
  void experience.offsetWidth;
  experience.classList.add('mode-flash');
  targetRotation = mode === 'room' ? { x: -0.32, y: -0.42 } : { x: -0.12, y: 0.25 };
  targetZoom = mode === 'room' ? 16 : 13;
  camera.position.set(mode === 'room' ? 0 : 0, mode === 'room' ? 6.3 : 1.2, targetZoom);
  timelineProgress = 0;
}

function showDetails(data) {
  document.querySelector('#objectFrequency').textContent = data.frequency;
  document.querySelector('#objectTime').textContent = data.time;
  document.querySelector('#objectName').textContent = data.name;
  document.querySelector('#objectHint').textContent = data.hint || 'A MOMENT IN MY DAILY ORBIT';
  document.querySelector('#threeCounter').textContent = `${String((data.index ?? 0) + 1).padStart(2, '0')} / ${data.type === 'roomObject' ? '05' : '09'}`;
  objectCard.classList.add('open');
}

function onPointerDown(event) {
  dragging = true;
  previousPointer = { x: event.clientX, y: event.clientY };
  pointerStart = { x: event.clientX, y: event.clientY };
  experience.classList.add('interacting');
}
function onPointerMove(event) {
  if (!dragging || currentMode === 'timeline') return;
  const dx = event.clientX - previousPointer.x;
  const dy = event.clientY - previousPointer.y;
  targetRotation.y += dx * 0.005;
  targetRotation.x = THREE.MathUtils.clamp(targetRotation.x + dy * 0.004, -0.75, 0.55);
  previousPointer = { x: event.clientX, y: event.clientY };
}
function onPointerUp(event) {
  if (dragging && Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) < 8) pickObject(event);
  dragging = false;
  experience.classList.remove('interacting');
}
function pickObject(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const visibleObjects = clickable.filter((item) => item.visible && item.parent?.visible !== false);
  const hit = raycaster.intersectObjects(visibleObjects, false)[0];
  if (hit) showDetails(hit.object.userData);
}
function onWheel(event) {
  event.preventDefault();
  if (currentMode === 'timeline') {
    timelineProgress = THREE.MathUtils.clamp(timelineProgress + event.deltaY * 0.00055, 0, 1);
    const index = Math.min(8, Math.round(timelineProgress * 8));
    document.querySelector('#threeCounter').textContent = `${String(index + 1).padStart(2, '0')} / 09`;
  } else {
    targetZoom = THREE.MathUtils.clamp(targetZoom + event.deltaY * 0.008, currentMode === 'room' ? 10 : 8, 21);
  }
}

function animate() {
  if (!running) return;
  requestAnimationFrame(animate);
  const time = clock.getElapsedTime();
  if (currentMode === 'orbit') {
    orbitRoot.rotation.x += (targetRotation.x - orbitRoot.rotation.x) * 0.06;
    orbitRoot.rotation.y += (targetRotation.y - orbitRoot.rotation.y) * 0.06;
    orbitRoot.rotation.y += 0.0015;
    orbitRoot.children.forEach((child) => {
      if (child.userData.type === 'activity') {
        child.rotation.x += 0.012;
        child.rotation.y += 0.018;
        const scale = 1 + Math.sin(time * 2 + child.userData.index) * 0.12;
        child.scale.setScalar(scale);
      }
    });
    camera.position.z += (targetZoom - camera.position.z) * 0.08;
    camera.lookAt(1.4, 0, 0);
  } else if (currentMode === 'room') {
    roomRoot.rotation.x += (targetRotation.x - roomRoot.rotation.x) * 0.06;
    roomRoot.rotation.y += (targetRotation.y - roomRoot.rotation.y) * 0.06;
    camera.position.z += (targetZoom - camera.position.z) * 0.08;
    camera.lookAt(0, 1.8, -0.5);
  } else {
    const point = timelineCurve.getPointAt(timelineProgress);
    const ahead = timelineCurve.getPointAt(Math.min(1, timelineProgress + 0.025));
    camera.position.lerp(point.clone().add(new THREE.Vector3(0, 1.1, 4.6)), 0.075);
    camera.lookAt(ahead);
    timelineRoot.children.forEach((child) => {
      if (child.userData.type === 'timeline') {
        child.rotation.x += 0.018;
        child.rotation.y += 0.024;
      }
    });
  }
  renderer.render(scene, camera);
}

function openExperience() {
  experience.classList.add('open');
  experience.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  if (!renderer) init();
  running = true;
  clock.start();
  animate();
}
function closeExperience() {
  experience.classList.remove('open');
  experience.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  running = false;
}

document.querySelector('#enter3d').addEventListener('click', openExperience);
document.querySelector('#close3d').addEventListener('click', closeExperience);
document.querySelector('.object-card button').addEventListener('click', () => objectCard.classList.remove('open'));
document.querySelectorAll('.three-modes button').forEach((button) => button.addEventListener('click', () => switchMode(button.dataset.mode)));
canvas.addEventListener('pointerdown', onPointerDown);
canvas.addEventListener('pointermove', onPointerMove);
canvas.addEventListener('pointerup', onPointerUp);
canvas.addEventListener('pointerleave', () => { dragging = false; });
canvas.addEventListener('wheel', onWheel, { passive: false });
window.addEventListener('resize', () => {
  if (!renderer) return;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && experience.classList.contains('open')) closeExperience();
});
