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
  click() { this.tone(700, "triangle", 0.04, 0.05); }
  explode() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(450, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.2);
    } catch (e) {}
  }
  win() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      setTimeout(() => this.tone(f, "sine", 0.15, 0.12), i * 55);
    });
  }
  lose() { this.tone(170, "sawtooth", 0.22, 0.14); }
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

// --- THREE.JS 3D EXPLODING VOXEL CUBE ---
const box = document.getElementById("cubeBox");
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, box.clientWidth / box.clientHeight, 0.1, 100);
camera.position.set(3.5, 3.2, 5.2);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(box.clientWidth, box.clientHeight);
box.appendChild(renderer.domElement);

const world = new THREE.Group();
scene.add(world);

scene.add(new THREE.AmbientLight(0xffffff, 0.85));
const light1 = new THREE.PointLight(0x38bdf8, 2, 25);
light1.position.set(-4, 5, 5);
const light2 = new THREE.PointLight(0xa855f7, 2, 25);
light2.position.set(4, 5, 5);
scene.add(light1, light2);

// Build the 8 Algebraic Voxel Sub-Blocks for (10a + b)³
// Block 1: 1000a³ (cyan, large)
// Blocks 2-4: 300a²b (purple, 3 slabs)
// Blocks 5-7: 30ab² (pink, 3 pillars)
// Block 8: b³ (green, small corner cube)

const voxels = [];
const S1 = 1.4; // a dimension
const S2 = 0.65; // b dimension

function createVoxel(w, h, d, colorHex, homeX, homeY, homeZ, dirX, dirY, dirZ) {
  const grp = new THREE.Group();
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.25,
    metalness: 0.6,
    transparent: true,
    opacity: 0.88
  });
  const mesh = new THREE.Mesh(geo, mat);
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.4, transparent: true })
  );
  grp.add(mesh, edges);
  world.add(grp);

  voxels.push({
    grp,
    home: new THREE.Vector3(homeX, homeY, homeZ),
    dir: new THREE.Vector3(dirX, dirY, dirZ).normalize()
  });
}

// 1. Large 1000a³ Cube
createVoxel(S1, S1, S1, 0x38bdf8, -S2/2, -S2/2, -S2/2, -1, -1, -1);

// 2-4. 300a²b Slabs
createVoxel(S2, S1, S1, 0xa855f7, S1/2, -S2/2, -S2/2, 1, -0.4, -0.4);
createVoxel(S1, S2, S1, 0xa855f7, -S2/2, S1/2, -S2/2, -0.4, 1, -0.4);
createVoxel(S1, S1, S2, 0xa855f7, -S2/2, -S2/2, S1/2, -0.4, -0.4, 1);

// 5-7. 30ab² Pillars
createVoxel(S1, S2, S2, 0xf43f5e, -S2/2, S1/2, S1/2, -0.4, 1, 1);
createVoxel(S2, S1, S2, 0xf43f5e, S1/2, -S2/2, S1/2, 1, -0.4, 1);
createVoxel(S2, S2, S1, 0xf43f5e, S1/2, S1/2, -S2/2, 1, 1, -0.4);

// 8. b³ Corner Cube
createVoxel(S2, S2, S2, 0x4ade80, S1/2, S1/2, S1/2, 1.2, 1.2, 1.2);

// Explosion Logic
let explosionDist = 0; // 0 to 2.5
function updateExplosion() {
  voxels.forEach(v => {
    v.grp.position.copy(v.home).addScaledVector(v.dir, explosionDist);
  });
}
updateExplosion();

// Mouse/Touch Orbit
let isDragging = false, prevX = 0, prevY = 0, rotY = 0.5, rotX = 0.3;
box.addEventListener("pointerdown", e => { isDragging = true; prevX = e.clientX; prevY = e.clientY; });
window.addEventListener("pointerup", () => isDragging = false);
window.addEventListener("pointermove", e => {
  if (!isDragging) return;
  rotY += (e.clientX - prevX) * 0.007;
  rotX = Math.max(-0.6, Math.min(0.6, rotX + (e.clientY - prevY) * 0.007));
  prevX = e.clientX; prevY = e.clientY;
});

// --- VEDIC DEDUCTION & FLIP GATE ---
const cubeSelect = document.getElementById("cubeSelect");
const explodeSlider = document.getElementById("explodeSlider");
const explodeVal = document.getElementById("explodeVal");
const cbrtResultBadge = document.getElementById("cbrtResultBadge");

const prefixChunkVal = document.getElementById("prefixChunkVal");
const suffixChunkVal = document.getElementById("suffixChunkVal");
const flipGateBox = document.getElementById("flipGateBox");
const staircaseTrack = document.getElementById("staircaseTrack");

explodeSlider.addEventListener("input", e => {
  const pct = +e.target.value;
  explodeVal.textContent = `${pct}%`;
  explosionDist = (pct / 100) * 1.8;
  updateExplosion();
});

const CUBE_STAIRCASE = [
  { n: 1, c: 1 }, { n: 2, c: 8 }, { n: 3, c: 27 },
  { n: 4, c: 64 }, { n: 5, c: 125 }, { n: 6, c: 216 },
  { n: 7, c: 343 }, { n: 8, c: 512 }, { n: 9, c: 729 }
];

function getUnitFromGate(lastDigit) {
  if (lastDigit === 2) return { unit: 8, flipped: true };
  if (lastDigit === 8) return { unit: 2, flipped: true };
  if (lastDigit === 3) return { unit: 7, flipped: true };
  if (lastDigit === 7) return { unit: 3, flipped: true };
  return { unit: lastDigit, flipped: false };
}

function calculateCubeRoot() {
  const N = +cubeSelect.value;
  const prefix = Math.floor(N / 1000);
  const suffix = N % 1000;
  const padSuffix = String(suffix).padStart(3, "0");
  const lastDigit = suffix % 10;

  prefixChunkVal.textContent = prefix;
  suffixChunkVal.textContent = padSuffix;

  // Tens Digit Bracket
  let tens = 1;
  for (let i = 0; i < CUBE_STAIRCASE.length; i++) {
    if (CUBE_STAIRCASE[i].c <= prefix) tens = CUBE_STAIRCASE[i].n;
    else break;
  }

  // Unit Digit Flip Gate
  const gate = getUnitFromGate(lastDigit);
  const unit = gate.unit;
  const finalRoot = tens * 10 + unit;

  cbrtResultBadge.textContent = `∛${N.toLocaleString()} = ${finalRoot}`;

  // Render Flip Gate UI
  flipGateBox.innerHTML = `
    <div class="gate-card in">Ending Digit: ${lastDigit}</div>
    <span class="gate-arrow">&rarr;</span>
    <div class="gate-card out">
      ${gate.flipped ? `FLIP COMPLEMENT: ${unit} (since ${lastDigit}&harr;${unit})` : `SELF-INVARIANT: ${unit}`}
    </div>
  `;

  // Render Staircase Track
  staircaseTrack.innerHTML = CUBE_STAIRCASE.map(s => `
    <span class="stair-chip ${s.n === tens ? 'active-tens' : ''}">
      ${s.n}&sup3; = ${s.c}
    </span>
  `).join("");

  gsap.fromTo(".gate-card", { scale: 0.85 }, { scale: 1, duration: 0.35, ease: "back.out(2)" });
}

cubeSelect.addEventListener("change", () => {
  audio.explode();
  calculateCubeRoot();
});

document.querySelectorAll(".preset-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    cubeSelect.value = chip.dataset.n;
    audio.explode();
    calculateCubeRoot();
  });
});

window.addEventListener("resize", () => {
  camera.aspect = box.clientWidth / box.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(box.clientWidth, box.clientHeight);
});

function animate() {
  requestAnimationFrame(animate);
  if (!isDragging) rotY += 0.002;
  world.rotation.y += (rotY - world.rotation.y) * 0.1;
  world.rotation.x += (rotX - world.rotation.x) * 0.1;
  renderer.render(scene, camera);
}
animate();
calculateCubeRoot();

// --- AUTO-DEMO KIOSK MODE ---
const autoDemoBtn = document.getElementById("autoDemoBtn");
let demoTimer = null;
const demoList = [314432, 19683, 103823, 592704, 912673, 2197];
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
      demoIdx = (demoIdx + 1) % demoList.length;
      cubeSelect.value = demoList[demoIdx];
      audio.explode();
      calculateCubeRoot();
      // Morph explosion in and out
      gsap.to({ dist: 0 }, {
        dist: 1.5,
        duration: 1.5,
        yoyo: true,
        repeat: 1,
        onUpdate: function () {
          explosionDist = this.targets()[0].dist;
          explodeSlider.value = Math.round((explosionDist / 1.8) * 100);
          explodeVal.textContent = `${explodeSlider.value}%`;
          updateExplosion();
        }
      });
    }, 5500);
  }
  audio.click();
});

[cubeSelect, explodeSlider, box].forEach(el => {
  el.addEventListener("pointerdown", () => {
    if (demoTimer) autoDemoBtn.click();
  });
});

// --- CHALLENGE: CUBE ROOT SPRINT ---
const challengeBtn = document.getElementById("challengeBtn");
const challengeModal = document.getElementById("challengeModal");
const closeChallenge = document.getElementById("closeChallenge");
const streakCount = document.getElementById("streakCount");
const timerVal = document.getElementById("timerVal");
const targetPrompt = document.getElementById("targetPrompt");
const optionsGrid = document.getElementById("optionsGrid");

let streak = 0, timeLeft = 15, quizTimer = null, correctCubeRoot = 0;

challengeBtn.addEventListener("click", () => {
  challengeModal.style.display = "grid";
  streak = 0;
  streakCount.textContent = "0";
  audio.win();
  startNextQuiz();
});

closeChallenge.addEventListener("click", () => {
  challengeModal.style.display = "none";
  if (quizTimer) clearInterval(quizTimer);
});

function startNextQuiz() {
  if (quizTimer) clearInterval(quizTimer);
  timeLeft = 15;
  timerVal.textContent = timeLeft + "s";

  const candidates = [13, 17, 24, 27, 34, 42, 47, 56, 68, 73, 84, 93, 97];
  correctCubeRoot = candidates[Math.floor(Math.random() * candidates.length)];
  const cubeVal = Math.pow(correctCubeRoot, 3);
  targetPrompt.textContent = `∛${cubeVal.toLocaleString()}`;

  const opts = new Set([correctCubeRoot]);
  while (opts.size < 4) {
    const fake = correctCubeRoot + (Math.floor(Math.random() * 5) - 2) * 10;
    if (fake > 10) opts.add(fake);
  }
  const shuffled = Array.from(opts).sort(() => Math.random() - 0.5);

  optionsGrid.innerHTML = "";
  shuffled.forEach(ans => {
    const btn = document.createElement("button");
    btn.className = "quiz-btn";
    btn.textContent = ans;
    btn.addEventListener("click", () => checkQuiz(ans));
    optionsGrid.appendChild(btn);
  });

  quizTimer = setInterval(() => {
    timeLeft--;
    timerVal.textContent = timeLeft + "s";
    if (timeLeft <= 0) {
      clearInterval(quizTimer);
      audio.lose();
      alert(`Time up! ∛${cubeVal.toLocaleString()} = ${correctCubeRoot}`);
      startNextQuiz();
    }
  }, 1000);
}

function checkQuiz(choice) {
  clearInterval(quizTimer);
  if (choice === correctCubeRoot) {
    audio.win();
    streak++;
    streakCount.textContent = streak;
    optionsGrid.innerHTML = `<div style="grid-column: 1/-1; color: #4ade80; font-weight: bold; font-size: 1.15rem; text-align: center;">Correct! +1 Streak</div>`;
    setTimeout(startNextQuiz, 900);
  } else {
    audio.lose();
    optionsGrid.innerHTML = `<div style="grid-column: 1/-1; color: #f43f5e; font-weight: bold; font-size: 1.15rem; text-align: center;">Incorrect! Answer was ${correctCubeRoot}</div>`;
    streak = 0;
    streakCount.textContent = streak;
    setTimeout(startNextQuiz, 1400);
  }
}
