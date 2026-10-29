const box = document.getElementById("threeBox");
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, box.clientWidth / box.clientHeight, 0.1, 100);
camera.position.set(0, 1.8, 7.5);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(box.clientWidth, box.clientHeight);
box.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.8));
const pLight = new THREE.PointLight(0x38bdf8, 1.2, 20);
pLight.position.set(0, 4, 5);
scene.add(pLight);

function makeClock(color, xPos) {
  const grp = new THREE.Group();
  grp.position.x = xPos;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.08, 16, 48), new THREE.MeshStandardMaterial({ color }));
  grp.add(ring);
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    dot.position.set(Math.sin(a) * 1.15, Math.cos(a) * 1.15, 0);
    grp.add(dot);
  }
  const hHand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.75, 0.06), new THREE.MeshBasicMaterial({ color: 0xf43f5e }));
  hHand.geometry.translate(0, 0.32, 0);
  const mHand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.05, 0.06), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
  mHand.geometry.translate(0, 0.48, 0);
  grp.add(hHand, mHand);
  scene.add(grp);
  return { grp, hHand, mHand };
}

const realClock = makeClock(0x38bdf8, -1.85);
const mirrClock = makeClock(0xa855f7, 1.85);
const mirrorPlane = new THREE.Mesh(
  new THREE.BoxGeometry(0.06, 3.2, 1.8),
  new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35 })
);
scene.add(mirrorPlane);

let verticalMode = true;
const hSlider = document.getElementById("hSlider"), mSlider = document.getElementById("mSlider");
const angleCvs = document.getElementById("angleCanvas"), aCtx = angleCvs.getContext("2d");

function pad(n) { return String(n).padStart(2, "0"); }

function update() {
  const H = +hSlider.value, M = +mSlider.value;
  document.getElementById("hVal").textContent = H;
  document.getElementById("mVal").textContent = pad(M);

  const hDeg = (H % 12) * 30 + M * 0.5;
  const mDeg = M * 6;
  realClock.hHand.rotation.z = -THREE.MathUtils.degToRad(hDeg);
  realClock.mHand.rotation.z = -THREE.MathUtils.degToRad(mDeg);

  let mH, mM, ruleText;
  if (verticalMode) {
    let baseH = M === 0 ? 12 : 11;
    let baseM = M === 0 ? 0 : 60;
    mH = baseH - (H % 12); if (mH <= 0) mH += 12;
    mM = (baseM - M) % 60;
    ruleText = `<span class="tok">${baseH}:${pad(baseM)}</span> &minus; <span class="tok">${H}:${pad(M)}</span> = <span class="tok res">${mH}:${pad(mM)}</span>`;
    mirrorPlane.rotation.z = 0;
  } else {
    let baseH = M <= 30 ? 18 : 17;
    let baseM = M <= 30 ? 30 : 90;
    mH = (baseH - H) % 12; if (mH <= 0) mH += 12;
    mM = baseM - M;
    ruleText = `<span class="tok">${baseH}:${pad(baseM)}</span> &minus; <span class="tok">${H}:${pad(M)}</span> = <span class="tok res">${mH}:${pad(mM)}</span>`;
    mirrorPlane.rotation.z = Math.PI / 2;
  }
  const mhDeg = (mH % 12) * 30 + mM * 0.5;
  const mmDeg = mM * 6;
  mirrClock.hHand.rotation.z = -THREE.MathUtils.degToRad(mhDeg);
  mirrClock.mHand.rotation.z = -THREE.MathUtils.degToRad(mmDeg);
  document.getElementById("mirrorAnim").innerHTML = ruleText;

  // |30H - 5.5M| Angle calculation
  const termH = 30 * (H % 12), termM = 5.5 * M;
  const rawDiff = Math.abs(termH - termM);
  const innerAngle = rawDiff > 180 ? 360 - rawDiff : rawDiff;
  const reflexAngle = 360 - innerAngle;
  document.getElementById("angleAnim").innerHTML =
    `<span class="tok">|30(${H % 12}) &minus; 5.5(${M})|</span> = <span class="tok">|${termH} &minus; ${termM.toFixed(1)}|</span> = <span class="tok res">${innerAngle.toFixed(1)}&deg;</span> <small>(Reflex: ${reflexAngle.toFixed(1)}&deg;)</small>`;

  // Draw 2D Angle Protractor
  aCtx.clearRect(0, 0, 320, 240);
  const cx = 160, cy = 120, r = 90;
  aCtx.strokeStyle = "#334155"; aCtx.lineWidth = 2;
  aCtx.beginPath(); aCtx.arc(cx, cy, r, 0, Math.PI * 2); aCtx.stroke();

  const radH = (hDeg - 90) * (Math.PI / 180);
  const radM = (mDeg - 90) * (Math.PI / 180);
  aCtx.fillStyle = "rgba(56, 189, 248, 0.22)";
  aCtx.beginPath(); aCtx.moveTo(cx, cy);
  aCtx.arc(cx, cy, r * 0.65, Math.min(radH, radM), Math.max(radH, radM));
  aCtx.closePath(); aCtx.fill();

  aCtx.strokeStyle = "#f43f5e"; aCtx.lineWidth = 4;
  aCtx.beginPath(); aCtx.moveTo(cx, cy); aCtx.lineTo(cx + Math.cos(radH) * 60, cy + Math.sin(radH) * 60); aCtx.stroke();
  aCtx.strokeStyle = "#38bdf8"; aCtx.lineWidth = 3;
  aCtx.beginPath(); aCtx.moveTo(cx, cy); aCtx.lineTo(cx + Math.cos(radM) * 82, cy + Math.sin(radM) * 82); aCtx.stroke();

  aCtx.fillStyle = "#f8fafc"; aCtx.font = "bold 14px monospace";
  aCtx.fillText(`θ = ${innerAngle.toFixed(1)}°`, cx - 38, cy + r + 22);
}

hSlider.addEventListener("input", update);
mSlider.addEventListener("input", update);
document.getElementById("modeBtn").addEventListener("click", e => {
  verticalMode = !verticalMode;
  e.target.textContent = verticalMode ? "Mirror Mode: Vertical (11:60 Rule)" : "Mirror Mode: Horizontal Water (18:30 Rule)";
  update();
});
update();

function animate() {
  requestAnimationFrame(animate);
  scene.rotation.y = Math.sin(Date.now() * 0.0007) * 0.22;
  renderer.render(scene, camera);
}
animate();
