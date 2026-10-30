// --- AUDIO ENGINE ---
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem("sc_ex_muted") === "true";
  }
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  }
  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem("sc_ex_muted", this.muted);
    return this.muted;
  }
  tone(freq, type = "sine", duration = 0.08, gainVal = 0.12) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }
  click() { this.tone(700, "triangle", 0.04, 0.06); }
  slide() { this.tone(400, "sine", 0.02, 0.02); }
  switch() { this.tone(900, "sine", 0.08, 0.1); }
  win() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      setTimeout(() => this.tone(f, "sine", 0.15, 0.15), i * 60);
    });
  }
  lose() {
    this.tone(200, "sawtooth", 0.2, 0.15);
  }
}
const audio = new SoundEngine();

// Topbar Audio & Nav
const soundToggle = document.getElementById("soundToggle");
const soundLabel = document.getElementById("soundLabel");
function updateSoundUI() {
  soundLabel.textContent = audio.muted ? "Audio: OFF" : "Audio: ON";
  soundToggle.style.opacity = audio.muted ? "0.6" : "1";
}
soundToggle.addEventListener("click", () => {
  audio.toggleMute();
  updateSoundUI();
  audio.click();
});
updateSoundUI();

document.getElementById("quickNav").addEventListener("change", e => {
  if (e.target.value) window.location.href = e.target.value;
});

// --- THREE.JS 3D SCENE ---
const box = document.getElementById("threeBox");
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, box.clientWidth / box.clientHeight, 0.1, 100);
camera.position.set(0, 1.3, 7.5);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(box.clientWidth, box.clientHeight);
box.appendChild(renderer.domElement);

const world = new THREE.Group();
scene.add(world);

scene.add(new THREE.AmbientLight(0xffffff, 0.9));
const light1 = new THREE.PointLight(0x38bdf8, 1.8, 25);
light1.position.set(-3, 4, 5);
const light2 = new THREE.PointLight(0xa855f7, 1.8, 25);
light2.position.set(3, 4, 5);
scene.add(light1, light2);

// Clock Dial Canvas Texture
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
    const r1 = isHour ? 200 : 218, r2 = 232;
    ctx.strokeStyle = isHour ? accentHex : "rgba(148,163,184,0.3)";
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
    ctx.fillText(n, 256 + Math.sin(a) * 168, 256 - Math.cos(a) * 168);
  }
  return new THREE.CanvasTexture(c);
}

function buildClock(hexNum, hexStr, xPos, yPos = 0) {
  const grp = new THREE.Group();
  grp.position.set(xPos, yPos, 0);
  const face = new THREE.Mesh(
    new THREE.CircleGeometry(1.4, 64),
    new THREE.MeshBasicMaterial({ map: createDialTexture(hexStr), side: THREE.DoubleSide })
  );
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(1.43, 0.08, 20, 64),
    new THREE.MeshStandardMaterial({ color: hexNum, metalness: 0.7, roughness: 0.2 })
  );
  const hHand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.78, 0.05), new THREE.MeshBasicMaterial({ color: 0xf43f5e }));
  hHand.geometry.translate(0, 0.35, 0.04);
  const mHand = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.1, 0.05), new THREE.MeshBasicMaterial({ color: hexNum }));
  mHand.geometry.translate(0, 0.5, 0.06);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  cap.position.z = 0.08;
  grp.add(face, rim, hHand, mHand, cap);
  world.add(grp);
  return { grp, hHand, mHand };
}

const realClock = buildClock(0x38bdf8, "#38bdf8", -1.95, 0);
const mirrClock = buildClock(0xa855f7, "#a855f7", 1.95, 0);

// Mirror Plane
const mirrorGroup = new THREE.Group();
const mirrorGlass = new THREE.Mesh(
  new THREE.BoxGeometry(0.05, 3.4, 2.3),
  new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35, metalness: 0.9, roughness: 0.1 })
);
const mirrorEdges = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(0.06, 3.42, 2.32)),
  new THREE.LineBasicMaterial({ color: 0x38bdf8 })
);
mirrorGroup.add(mirrorGlass, mirrorEdges);
world.add(mirrorGroup);

// Laser Symmetry Rays
const laserGeo = new THREE.BufferGeometry();
const laserMat = new THREE.LineBasicMaterial({ color: 0xf472b6, transparent: true, opacity: 0.8 });
const laserLines = new THREE.LineSegments(laserGeo, laserMat);
world.add(laserLines);

// Touch/Mouse Orbit
let isDragging = false, prevX = 0, prevY = 0, rotY = 0.2, rotX = 0.1;
box.addEventListener("pointerdown", e => { isDragging = true; prevX = e.clientX; prevY = e.clientY; });
window.addEventListener("pointerup", () => isDragging = false);
window.addEventListener("pointermove", e => {
  if (!isDragging) return;
  rotY += (e.clientX - prevX) * 0.007;
  rotX = Math.max(-0.5, Math.min(0.5, rotX + (e.clientY - prevY) * 0.007));
  prevX = e.clientX; prevY = e.clientY;
});

// Mode State
let isVertical = true;
const verticalBtn = document.getElementById("verticalBtn");
const waterBtn = document.getElementById("waterBtn");
const axisTag = document.getElementById("axisTag");
const axisFormula = document.getElementById("axisFormula");
const ruleExplainer = document.getElementById("ruleExplainer");

verticalBtn.addEventListener("click", () => {
  if (isVertical) return;
  isVertical = true;
  verticalBtn.classList.add("active");
  waterBtn.classList.remove("active");
  axisTag.textContent = "Vertical Mirror Subtraction";
  axisFormula.textContent = "Formula: 11:60 − H:M";
  ruleExplainer.textContent = "Standard vertical mirror flips the horizontal X-axis. Subtract minutes from 60 and hours from 11 (or 12:00 for exact hours).";
  audio.switch();
  update();
});

waterBtn.addEventListener("click", () => {
  if (!isVertical) return;
  isVertical = false;
  waterBtn.classList.add("active");
  verticalBtn.classList.remove("active");
  axisTag.textContent = "Horizontal Water Subtraction";
  axisFormula.textContent = "Formula: 18:30 (or 17:90) − H:M";
  ruleExplainer.textContent = "Horizontal water surface flips the vertical Y-axis. Subtract from 18:30 if minutes ≤ 30, or from 17:90 if minutes > 30.";
  audio.switch();
  update();
});

// Controls & Protractor
const hSlider = document.getElementById("hSlider");
const mSlider = document.getElementById("mSlider");
const hVal = document.getElementById("hVal");
const mVal = document.getElementById("mVal");
const rCvs = document.getElementById("radarCanvas");
const rCtx = rCvs.getContext("2d");

function pad(n) { return String(n).padStart(2, "0"); }

function update() {
  const H = +hSlider.value, M = +mSlider.value;
  hVal.textContent = H;
  mVal.textContent = pad(M);

  const hDeg = (H % 12) * 30 + M * 0.5;
  const mDeg = M * 6;
  const hRad = -THREE.MathUtils.degToRad(hDeg);
  const mRad = -THREE.MathUtils.degToRad(mDeg);
  realClock.hHand.rotation.z = hRad;
  realClock.mHand.rotation.z = mRad;

  let baseH, baseM, mH, mM;
  if (isVertical) {
    // Vertical reflection
    mirrorGroup.rotation.z = 0;
    mirrClock.grp.position.set(1.95, 0, 0);
    realClock.grp.position.set(-1.95, 0, 0);

    baseH = M === 0 ? 12 : 11;
    baseM = M === 0 ? 0 : 60;
    mH = baseH - (H % 12);
    if (mH <= 0) mH += 12;
    mM = (baseM - M) % 60;
  } else {
    // Horizontal reflection
    mirrorGroup.rotation.z = Math.PI / 2;
    mirrClock.grp.position.set(0, -1.8, 0);
    realClock.grp.position.set(0, 1.8, 0);

    if (M <= 30) {
      baseH = 18; baseM = 30;
    } else {
      baseH = 17; baseM = 90;
    }
    mH = (baseH - H) % 12;
    if (mH <= 0) mH += 12;
    mM = baseM - M;
  }

  const mhDeg = (mH % 12) * 30 + mM * 0.5;
  const mmDeg = mM * 6;
  const mhRad = -THREE.MathUtils.degToRad(mhDeg);
  const mmRad = -THREE.MathUtils.degToRad(mmDeg);
  mirrClock.hHand.rotation.z = mhRad;
  mirrClock.mHand.rotation.z = mmRad;

  // Update Laser Points
  let pts;
  if (isVertical) {
    pts = new Float32Array([
      -1.95 - Math.sin(hRad) * 0.7, Math.cos(hRad) * 0.7, 0.08,
       1.95 - Math.sin(mhRad) * 0.7, Math.cos(mhRad) * 0.7, 0.08,
      -1.95 - Math.sin(mRad) * 1.05, Math.cos(mRad) * 1.05, 0.08,
       1.95 - Math.sin(mmRad) * 1.05, Math.cos(mmRad) * 1.05, 0.08
    ]);
  } else {
    pts = new Float32Array([
      -Math.sin(hRad) * 0.7, 1.8 + Math.cos(hRad) * 0.7, 0.08,
      -Math.sin(mhRad) * 0.7, -1.8 + Math.cos(mhRad) * 0.7, 0.08,
      -Math.sin(mRad) * 1.05, 1.8 + Math.cos(mRad) * 1.05, 0.08,
      -Math.sin(mmRad) * 1.05, -1.8 + Math.cos(mmRad) * 1.05, 0.08
    ]);
  }
  laserGeo.setAttribute("position", new THREE.BufferAttribute(pts, 3));

  // Mirror stage cards
  document.getElementById("mirrorStage").innerHTML = `
    <span class="d-card">${baseH}:${pad(baseM)}</span>
    <span class="op">&minus;</span>
    <span class="d-card sub">${pad(H)}:${pad(M)}</span>
    <span class="op">=</span>
    <span class="d-card res">${pad(mH)}:${pad(mM)}</span>
  `;

  // Hand angle calculation
  const termH = 30 * (H % 12);
  const termM = 5.5 * M;
  const diff = Math.abs(termH - termM);
  const innerAngle = diff > 180 ? 360 - diff : diff;
  const reflexAngle = 360 - innerAngle;

  document.getElementById("angleStage").innerHTML = `
    <span class="d-card">|30(${H % 12})</span>
    <span class="op">&minus;</span>
    <span class="d-card sub">5.5(${M})|</span>
    <span class="op">=</span>
    <span class="d-card">|${termH} &minus; ${termM.toFixed(1)}|</span>
    <span class="op">=</span>
    <span class="d-card res">${innerAngle.toFixed(1)}&deg;</span>
  `;

  document.getElementById("angleSummary").textContent = `Inner: ${innerAngle.toFixed(1)}° | Reflex: ${reflexAngle.toFixed(1)}°`;

  if (window.gsap) {
    gsap.fromTo(".d-card", { scale: 0.85, opacity: 0.5 }, { scale: 1, opacity: 1, duration: 0.25, stagger: 0.03, ease: "power2.out" });
  }

  drawRadar(hDeg, mDeg, innerAngle);
}

function drawRadar(hDeg, mDeg, inner) {
  const dpr = window.devicePixelRatio || 1;
  const w = rCvs.clientWidth, h = rCvs.clientHeight;
  rCvs.width = w * dpr; rCvs.height = h * dpr;
  rCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  rCtx.clearRect(0, 0, w, h);

  const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.42;

  // Grid rings
  for (let r = R * 0.33; r <= R; r += R * 0.33) {
    rCtx.strokeStyle = "rgba(56, 189, 248, 0.15)";
    rCtx.lineWidth = 1;
    rCtx.beginPath(); rCtx.arc(cx, cy, r, 0, Math.PI * 2); rCtx.stroke();
  }

  let a1 = ((hDeg - 90) * Math.PI) / 180;
  let a2 = ((mDeg - 90) * Math.PI) / 180;
  let start = a1, end = a2;
  if (((end - start + Math.PI * 2) % (Math.PI * 2)) > Math.PI) [start, end] = [end, start];

  // Shaded angle sector
  const grad = rCtx.createRadialGradient(cx, cy, 5, cx, cy, R);
  grad.addColorStop(0, "rgba(168, 85, 247, 0.55)");
  grad.addColorStop(1, "rgba(56, 189, 248, 0.15)");
  rCtx.fillStyle = grad;
  rCtx.beginPath(); rCtx.moveTo(cx, cy); rCtx.arc(cx, cy, R * 0.85, start, end); rCtx.closePath(); rCtx.fill();

  // Hands
  rCtx.save();
  rCtx.shadowBlur = 12;
  rCtx.shadowColor = "#f43f5e";
  rCtx.strokeStyle = "#f43f5e"; rCtx.lineWidth = 4;
  rCtx.beginPath(); rCtx.moveTo(cx, cy); rCtx.lineTo(cx + Math.cos(a1) * (R * 0.65), cy + Math.sin(a1) * (R * 0.65)); rCtx.stroke();

  rCtx.shadowColor = "#38bdf8";
  rCtx.strokeStyle = "#38bdf8"; rCtx.lineWidth = 3;
  rCtx.beginPath(); rCtx.moveTo(cx, cy); rCtx.lineTo(cx + Math.cos(a2) * (R * 0.95), cy + Math.sin(a2) * (R * 0.95)); rCtx.stroke();
  rCtx.restore();

  // Center pin
  rCtx.fillStyle = "#ffffff";
  rCtx.beginPath(); rCtx.arc(cx, cy, 4, 0, Math.PI * 2); rCtx.fill();
}

// Event Listeners
hSlider.addEventListener("input", () => { audio.slide(); update(); });
mSlider.addEventListener("input", () => { audio.slide(); update(); });

document.querySelectorAll(".preset-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    hSlider.value = chip.dataset.h;
    mSlider.value = chip.dataset.m;
    audio.click();
    update();
  });
});

window.addEventListener("resize", () => {
  camera.aspect = box.clientWidth / box.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(box.clientWidth, box.clientHeight);
  update();
});
update();

function animate() {
  requestAnimationFrame(animate);
  if (!isDragging) rotY += 0.002;
  world.rotation.y += (rotY - world.rotation.y) * 0.1;
  world.rotation.x += (rotX - world.rotation.x) * 0.1;
  renderer.render(scene, camera);
}
animate();

// --- AUTO-DEMO KIOSK MODE ---
const autoDemoBtn = document.getElementById("autoDemoBtn");
let demoTimer = null;
const demoPresets = [
  { h: 3, m: 40, v: true },
  { h: 9, m: 15, v: true },
  { h: 6, m: 30, v: false },
  { h: 12, m: 0, v: true },
  { h: 7, m: 24, v: false },
  { h: 10, m: 10, v: true }
];
let demoIdx = 0;

autoDemoBtn.addEventListener("click", () => {
  if (demoTimer) {
    clearInterval(demoTimer);
    demoTimer = null;
    autoDemoBtn.textContent = "Auto-Demo: OFF";
    autoDemoBtn.classList.remove("active");
  } else {
    autoDemoBtn.textContent = "Auto-Demo: ON";
    autoDemoBtn.classList.add("active");
    demoTimer = setInterval(() => {
      demoIdx = (demoIdx + 1) % demoPresets.length;
      const p = demoPresets[demoIdx];
      hSlider.value = p.h;
      mSlider.value = p.m;
      if (p.v !== isVertical) {
        if (p.v) verticalBtn.click();
        else waterBtn.click();
      } else {
        update();
      }
    }, 4500);
  }
  audio.click();
});

// Pause auto-demo if user touches controls
[hSlider, mSlider, box].forEach(el => {
  el.addEventListener("pointerdown", () => {
    if (demoTimer) autoDemoBtn.click();
  });
});

// --- CHALLENGE MODE: ANGLE SNIPER ---
const challengeBtn = document.getElementById("challengeBtn");
const challengeModal = document.getElementById("challengeModal");
const closeChallenge = document.getElementById("closeChallenge");
const streakCount = document.getElementById("streakCount");
const timerVal = document.getElementById("timerVal");
const targetTime = document.getElementById("targetTime");
const optionsGrid = document.getElementById("optionsGrid");

let streak = 0, timeLeft = 20, quizTimer = null, currentAnswer = 0;

challengeBtn.addEventListener("click", () => {
  challengeModal.style.display = "grid";
  streak = 0;
  streakCount.textContent = "0";
  audio.launch();
  startNextQuiz();
});

closeChallenge.addEventListener("click", () => {
  challengeModal.style.display = "none";
  if (quizTimer) clearInterval(quizTimer);
});

function startNextQuiz() {
  if (quizTimer) clearInterval(quizTimer);
  timeLeft = 20;
  timerVal.textContent = timeLeft + "s";

  const rh = Math.floor(Math.random() * 12) + 1;
  const rm = Math.floor(Math.random() * 12) * 5; // Clean 5-minute increments
  targetTime.textContent = `${rh}:${pad(rm)}`;

  const diff = Math.abs(30 * (rh % 12) - 5.5 * rm);
  const correct = diff > 180 ? 360 - diff : diff;
  currentAnswer = correct;

  // Generate 4 options
  const opts = new Set([correct.toFixed(1)]);
  while (opts.size < 4) {
    const fake = Math.abs(correct + (Math.floor(Math.random() * 5) - 2) * 15);
    opts.add(fake.toFixed(1));
  }
  const shuffled = Array.from(opts).sort(() => Math.random() - 0.5);

  optionsGrid.innerHTML = "";
  shuffled.forEach(opt => {
    const btn = document.createElement("button");
    btn.className = "quiz-btn";
    btn.textContent = `${opt}°`;
    btn.addEventListener("click", () => checkQuiz(+opt));
    optionsGrid.appendChild(btn);
  });

  quizTimer = setInterval(() => {
    timeLeft--;
    timerVal.textContent = timeLeft + "s";
    if (timeLeft <= 0) {
      clearInterval(quizTimer);
      audio.lose();
      alert(`Time up! The correct angle was ${correct.toFixed(1)}°`);
      startNextQuiz();
    }
  }, 1000);
}

function checkQuiz(val) {
  clearInterval(quizTimer);
  if (Math.abs(val - currentAnswer) < 0.1) {
    audio.win();
    streak++;
    streakCount.textContent = streak;
    optionsGrid.innerHTML = `<div style="grid-column: 1/-1; color: #4ade80; font-weight: bold; font-size: 1.2rem; text-align: center;">Correct! +1 Streak</div>`;
    setTimeout(startNextQuiz, 1000);
  } else {
    audio.lose();
    optionsGrid.innerHTML = `<div style="grid-column: 1/-1; color: #f43f5e; font-weight: bold; font-size: 1.2rem; text-align: center;">Wrong! Expected ${currentAnswer.toFixed(1)}°</div>`;
    streak = 0;
    streakCount.textContent = streak;
    setTimeout(startNextQuiz, 1500);
  }
}
