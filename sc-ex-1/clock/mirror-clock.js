const box = document.getElementById("threeBox");
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, box.clientWidth / box.clientHeight, 0.1, 100);
camera.position.set(0, 1.4, 7.6);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(box.clientWidth, box.clientHeight);
box.appendChild(renderer.domElement);

const world = new THREE.Group();
scene.add(world);

scene.add(new THREE.AmbientLight(0xffffff, 0.85));
const light1 = new THREE.PointLight(0x38bdf8, 1.6, 20);
light1.position.set(-3, 4, 5);
const light2 = new THREE.PointLight(0xc084fc, 1.6, 20);
light2.position.set(3, 4, 5);
scene.add(light1, light2);

// Procedural High-Res Clock Dial Texture
function createDialTexture(accentHex) {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d");
  const grad = ctx.createRadialGradient(256, 256, 20, 256, 256, 245);
  grad.addColorStop(0, "#0f172a");
  grad.addColorStop(1, "#020617");
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(256, 256, 245, 0, Math.PI * 2); ctx.fill();

  for (let i = 0; i < 60; i++) {
    const a = (i * Math.PI) / 30;
    const isHour = i % 5 === 0;
    const r1 = isHour ? 202 : 216, r2 = 230;
    ctx.strokeStyle = isHour ? accentHex : "rgba(148,163,184,0.35)";
    ctx.lineWidth = isHour ? 5 : 2;
    ctx.beginPath();
    ctx.moveTo(256 + Math.sin(a) * r1, 256 - Math.cos(a) * r1);
    ctx.lineTo(256 + Math.sin(a) * r2, 256 - Math.cos(a) * r2);
    ctx.stroke();
  }
  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 34px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let n = 1; n <= 12; n++) {
    const a = (n * Math.PI) / 6;
    ctx.fillText(n, 256 + Math.sin(a) * 170, 256 - Math.cos(a) * 170);
  }
  return new THREE.CanvasTexture(c);
}

function buildClock(hexNum, hexStr, xPos) {
  const grp = new THREE.Group();
  grp.position.x = xPos;
  const face = new THREE.Mesh(
    new THREE.CircleGeometry(1.42, 64),
    new THREE.MeshBasicMaterial({ map: createDialTexture(hexStr), side: THREE.DoubleSide })
  );
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(1.45, 0.08, 24, 64),
    new THREE.MeshStandardMaterial({ color: hexNum, metalness: 0.7, roughness: 0.2 })
  );
  const hHand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.06), new THREE.MeshBasicMaterial({ color: 0xf43f5e }));
  hHand.geometry.translate(0, 0.35, 0.04);
  const mHand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.12, 0.06), new THREE.MeshBasicMaterial({ color: hexNum }));
  mHand.geometry.translate(0, 0.5, 0.06);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  cap.position.z = 0.08;
  grp.add(face, rim, hHand, mHand, cap);
  world.add(grp);
  return { grp, hHand, mHand };
}

const realClock = buildClock(0x38bdf8, "#38bdf8", -1.95);
const mirrClock = buildClock(0xc084fc, "#c084fc", 1.95);

// Glowing Glass Mirror Plane
const mirrorGroup = new THREE.Group();
const mirrorGlass = new THREE.Mesh(
  new THREE.BoxGeometry(0.05, 3.3, 2.2),
  new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.32, metalness: 0.9, roughness: 0.1 })
);
const mirrorEdges = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(0.06, 3.32, 2.22)),
  new THREE.LineBasicMaterial({ color: 0x38bdf8 })
);
mirrorGroup.add(mirrorGlass, mirrorEdges);
world.add(mirrorGroup);

// 3D Symmetry Laser Lines connecting Real & Reflected Hand Tips
const laserGeo = new THREE.BufferGeometry();
const laserMat = new THREE.LineBasicMaterial({ color: 0xf472b6, transparent: true, opacity: 0.75 });
const laserLines = new THREE.LineSegments(laserGeo, laserMat);
world.add(laserLines);

// Touch & Mouse Orbit Drag
let isDragging = false, prevX = 0, prevY = 0, rotY = 0.25, rotX = 0.12;
box.addEventListener("pointerdown", e => { isDragging = true; prevX = e.clientX; prevY = e.clientY; });
window.addEventListener("pointerup", () => isDragging = false);
window.addEventListener("pointermove", e => {
  if (!isDragging) return;
  rotY += (e.clientX - prevX) * 0.008;
  rotX = Math.max(-0.6, Math.min(0.6, rotX + (e.clientY - prevY) * 0.008));
  prevX = e.clientX; prevY = e.clientY;
});

let verticalMode = true;
const hSlider = document.getElementById("hSlider"), mSlider = document.getElementById("mSlider");
const rCvs = document.getElementById("radarCanvas"), rCtx = rCvs.getContext("2d");

function pad(n) { return String(n).padStart(2, "0"); }

function update() {
  const H = +hSlider.value, M = +mSlider.value;
  document.getElementById("hVal").textContent = H;
  document.getElementById("mVal").textContent = pad(M);

  const hDeg = (H % 12) * 30 + M * 0.5;
  const mDeg = M * 6;
  const hRad = -THREE.MathUtils.degToRad(hDeg);
  const mRad = -THREE.MathUtils.degToRad(mDeg);
  realClock.hHand.rotation.z = hRad;
  realClock.mHand.rotation.z = mRad;

  let baseH, baseM, mH, mM;
  if (verticalMode) {
    baseH = M === 0 ? 12 : 11;
    baseM = M === 0 ? 0 : 60;
    mH = baseH - (H % 12); if (mH <= 0) mH += 12;
    mM = (baseM - M) % 60;
    mirrorGroup.rotation.z = 0;
  } else {
    baseH = M <= 30 ? 18 : 17;
    baseM = M <= 30 ? 30 : 90;
    mH = (baseH - H) % 12; if (mH <= 0) mH += 12;
    mM = baseM - M;
    mirrorGroup.rotation.z = Math.PI / 2;
  }

  const mhDeg = (mH % 12) * 30 + mM * 0.5;
  const mmDeg = mM * 6;
  const mhRad = -THREE.MathUtils.degToRad(mhDeg);
  const mmRad = -THREE.MathUtils.degToRad(mmDeg);
  mirrClock.hHand.rotation.z = mhRad;
  mirrClock.mHand.rotation.z = mmRad;

  // Update 3D Symmetry Rays connecting hand tips
  const pts = new Float32Array([
    -1.95 - Math.sin(hRad) * 0.75, Math.cos(hRad) * 0.75, 0.08,
     1.95 - Math.sin(mhRad) * 0.75, Math.cos(mhRad) * 0.75, 0.08,
    -1.95 - Math.sin(mRad) * 1.05, Math.cos(mRad) * 1.05, 0.08,
     1.95 - Math.sin(mmRad) * 1.05, Math.cos(mmRad) * 1.05, 0.08
  ]);
  laserGeo.setAttribute("position", new THREE.BufferAttribute(pts, 3));

  // Moving Digits Choreography
  document.getElementById("mirrorStage").innerHTML = `
    <span class="d-card">${baseH}:${pad(baseM)}</span>
    <span class="op">&minus;</span>
    <span class="d-card sub">${pad(H)}:${pad(M)}</span>
    <span class="op">=</span>
    <span class="d-card res">${pad(mH)}:${pad(mM)}</span>
  `;

  const termH = 30 * (H % 12), termM = 5.5 * M;
  const diff = Math.abs(termH - termM);
  const inner = diff > 180 ? 360 - diff : diff;
  document.getElementById("angleStage").innerHTML = `
    <span class="d-card">|30(${H % 12})</span>
    <span class="op">&minus;</span>
    <span class="d-card sub">5.5(${M})|</span>
    <span class="op">=</span>
    <span class="d-card">|${termH} &minus; ${termM.toFixed(1)}|</span>
    <span class="op">=</span>
    <span class="d-card res">${inner.toFixed(1)}&deg;</span>
  `;
  gsap.fromTo(".d-card", { scale: 0.8, opacity: 0.3 }, { scale: 1, opacity: 1, duration: 0.3, stagger: 0.04, ease: "back.out(2)" });

  drawRadar(hDeg, mDeg, inner);
}

function drawRadar(hDeg, mDeg, inner) {
  const dpr = window.devicePixelRatio || 1;
  const w = rCvs.clientWidth, h = rCvs.clientHeight;
  rCvs.width = w * dpr; rCvs.height = h * dpr;
  rCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  rCtx.clearRect(0, 0, w, h);

  const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.39;
  for (let r = R * 0.33; r <= R; r += R * 0.33) {
    rCtx.strokeStyle = "rgba(56, 189, 248, 0.16)";
    rCtx.beginPath(); rCtx.arc(cx, cy, r, 0, Math.PI * 2); rCtx.stroke();
  }

  let a1 = ((hDeg - 90) * Math.PI) / 180;
  let a2 = ((mDeg - 90) * Math.PI) / 180;
  let start = a1, end = a2;
  if (((end - start + Math.PI * 2) % (Math.PI * 2)) > Math.PI) [start, end] = [end, start];

  const grad = rCtx.createRadialGradient(cx, cy, 5, cx, cy, R);
  grad.addColorStop(0, "rgba(168, 85, 247, 0.55)");
  grad.addColorStop(1, "rgba(56, 189, 248, 0.15)");
  rCtx.fillStyle = grad;
  rCtx.beginPath(); rCtx.moveTo(cx, cy); rCtx.arc(cx, cy, R * 0.78, start, end); rCtx.closePath(); rCtx.fill();

  rCtx.save();
  rCtx.shadowBlur = 14;
  rCtx.shadowColor = "#f43f5e";
  rCtx.strokeStyle = "#f43f5e"; rCtx.lineWidth = 4;
  rCtx.beginPath(); rCtx.moveTo(cx, cy); rCtx.lineTo(cx + Math.cos(a1) * (R * 0.68), cy + Math.sin(a1) * (R * 0.68)); rCtx.stroke();

  rCtx.shadowColor = "#38bdf8";
  rCtx.strokeStyle = "#38bdf8"; rCtx.lineWidth = 3;
  rCtx.beginPath(); rCtx.moveTo(cx, cy); rCtx.lineTo(cx + Math.cos(a2) * (R * 0.94), cy + Math.sin(a2) * (R * 0.94)); rCtx.stroke();
  rCtx.restore();

  rCtx.fillStyle = "#f8fafc"; rCtx.font = "bold 14px monospace";
  rCtx.fillText(`Inner: ${inner.toFixed(1)}° | Reflex: ${(360 - inner).toFixed(1)}°`, 16, h - 14);
}

hSlider.addEventListener("input", update);
mSlider.addEventListener("input", update);
document.getElementById("modeBtn").addEventListener("click", e => {
  verticalMode = !verticalMode;
  e.target.textContent = verticalMode ? "Axis: Vertical Mirror (11:60 Subtraction)" : "Axis: Horizontal Water (18:30 Subtraction)";
  update();
});
window.addEventListener("resize", update);
update();

function animate() {
  requestAnimationFrame(animate);
  if (!isDragging) rotY += 0.0025;
  world.rotation.y += (rotY - world.rotation.y) * 0.1;
  world.rotation.x += (rotX - world.rotation.x) * 0.1;
  renderer.render(scene, camera);
}
animate();
    
