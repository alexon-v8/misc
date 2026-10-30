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
  click() { this.tone(720, "triangle", 0.04, 0.06); }
  zap() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.18);
    } catch (e) {}
  }
  win() {
    [440, 554.37, 659.25, 880].forEach((f, i) => {
      setTimeout(() => this.tone(f, "sine", 0.15, 0.12), i * 55);
    });
  }
  launch() { this.tone(520, "sine", 0.12, 0.1); }
  lose() { this.tone(180, "sawtooth", 0.22, 0.14); }
}
const audio = new SoundEngine();

// Topbar Controls
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

// --- THREE.JS 3D HEPTAGONAL TIME GEAR ---
const box = document.getElementById("gearBox");
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, box.clientWidth / box.clientHeight, 0.1, 100);
camera.position.set(0, 1.2, 5.8);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(box.clientWidth, box.clientHeight);
box.appendChild(renderer.domElement);

const world = new THREE.Group();
scene.add(world);

scene.add(new THREE.AmbientLight(0xffffff, 0.9));
const light1 = new THREE.PointLight(0xa855f7, 2, 25);
light1.position.set(-3, 3, 4);
const light2 = new THREE.PointLight(0x38bdf8, 2, 25);
light2.position.set(3, 3, 4);
scene.add(light1, light2);

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_COLORS = ["#f43f5e", "#38bdf8", "#a855f7", "#4ade80", "#f59e0b", "#06b6d4", "#ec4899"];

// Procedural Face Canvas Texture for each weekday face
function createFaceTexture(name, index, colorHex) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 256;
  const ctx = c.getContext("2d");

  // Background
  const grad = ctx.createLinearGradient(0, 0, 512, 256);
  grad.addColorStop(0, "#0f172a");
  grad.addColorStop(1, "#020617");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);

  // Border glow
  ctx.strokeStyle = colorHex;
  ctx.lineWidth = 14;
  ctx.strokeRect(7, 7, 498, 242);

  // Day Number Badge
  ctx.fillStyle = colorHex;
  ctx.font = "bold 42px monospace";
  ctx.fillText(`REM: ${index}`, 36, 68);

  // Day Name
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 68px monospace";
  ctx.fillText(name.toUpperCase(), 36, 160);

  return new THREE.CanvasTexture(c);
}

// Build 7-Sided Prism Gear
const gearGroup = new THREE.Group();
world.add(gearGroup);

const R = 1.6; // Circumradius
const prismHeight = 1.1;
const faceMeshes = [];

for (let i = 0; i < 7; i++) {
  const angle1 = (i * Math.PI * 2) / 7;
  const angle2 = ((i + 1) * Math.PI * 2) / 7;
  const midAngle = (angle1 + angle2) / 2;

  const w = 2 * R * Math.sin(Math.PI / 7);
  const faceGeo = new THREE.PlaneGeometry(w * 0.98, prismHeight);
  const faceMat = new THREE.MeshBasicMaterial({
    map: createFaceTexture(DAYS[i], i, DAY_COLORS[i]),
    side: THREE.DoubleSide
  });
  const faceMesh = new THREE.Mesh(faceGeo, faceMat);

  // Position at midpoint facing outwards
  const dist = R * Math.cos(Math.PI / 7);
  faceMesh.position.set(Math.sin(midAngle) * dist, 0, Math.cos(midAngle) * dist);
  faceMesh.rotation.y = midAngle;
  gearGroup.add(faceMesh);
  faceMeshes.push(faceMesh);
}

// Gear Core Hub & Teeth Accents
const hub = new THREE.Mesh(
  new THREE.CylinderGeometry(R * 0.85, R * 0.85, prismHeight * 0.9, 7),
  new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.2, wireframe: true })
);
gearGroup.add(hub);

// Orbit & Translate Controls
let isPointerDown = false, pointerButton = 0, prevX = 0, prevY = 0;
let panX = 0, panY = 0, rotY = 0, rotX = 0, camZ = 5.8;

box.addEventListener("pointerdown", e => {
  isPointerDown = true;
  pointerButton = e.button;
  prevX = e.clientX;
  prevY = e.clientY;
  try { box.setPointerCapture(e.pointerId); } catch(err) {}
});

box.addEventListener("pointermove", e => {
  if (!isPointerDown) return;
  const dx = e.clientX - prevX;
  const dy = e.clientY - prevY;
  prevX = e.clientX;
  prevY = e.clientY;

  // Middle button / wheel pressed -> ORBIT
  if (pointerButton === 1 || (e.buttons & 4)) {
    rotY += dx * 0.008;
    rotX = Math.max(-0.8, Math.min(0.8, rotX + dy * 0.008));
  } else {
    // Left drag -> TRANSLATE
    panX += dx * 0.008;
    panY -= dy * 0.008;
  }
});

box.addEventListener("pointerup", e => {
  isPointerDown = false;
  try { box.releasePointerCapture(e.pointerId); } catch(err) {}
});

box.addEventListener("wheel", e => {
  e.preventDefault();
  camZ = Math.max(3.0, Math.min(12, camZ + e.deltaY * 0.005));
  camera.position.z = camZ;
}, { passive: false });

box.addEventListener("dblclick", () => {
  panX = 0; panY = 0; rotY = 0; rotX = 0; camZ = 5.8;
  camera.position.set(0, 1.2, 5.8);
});

// --- DATE CALCULATION & VAPORIZER ENGINE ---
const yearInput = document.getElementById("yearInput");
const monthInput = document.getElementById("monthInput");
const dayInput = document.getElementById("dayInput");
const dayResultBadge = document.getElementById("dayResultBadge");
const funnelChamber = document.getElementById("funnelChamber");
const vaporizeBtn = document.getElementById("vaporizeBtn");

const MONTH_CODES = [0, 3, 3, 6, 1, 4, 6, 2, 5, 0, 3, 5];

function isLeapYear(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function getCenturyCode(y) {
  const century = Math.floor(y / 100);
  const rem = century % 4;
  if (rem === 0) return 6; // 1600s, 2000s, 2400s
  if (rem === 1) return 4; // 1700s, 2100s
  if (rem === 2) return 2; // 1800s, 2200s
  return 0;               // 1900s, 2300s
}

let activeDayIndex = 0;

function calculateCalendar() {
  const Y = +yearInput.value;
  const M = +monthInput.value;
  const D = +dayInput.value;

  const centuryCode = getCenturyCode(Y);
  const yearLast2 = Y % 100;
  const leapQuotient = Math.floor(yearLast2 / 4);

  let monthCode = MONTH_CODES[M];
  if (isLeapYear(Y)) {
    if (M === 0) monthCode = 6;
    if (M === 1) monthCode = 2;
  }

  // Modulo-7 remainders
  const yearRem = yearLast2 % 7;
  const leapRem = leapQuotient % 7;
  const dayRem = D % 7;

  const totalSum = centuryCode + yearLast2 + leapQuotient + monthCode + D;
  const reducedSum = centuryCode + yearRem + leapRem + monthCode + dayRem;
  const finalRem = totalSum % 7;
  activeDayIndex = finalRem;

  const weekdayName = DAYS[finalRem];
  dayResultBadge.textContent = `${weekdayName} (Rem: ${finalRem})`;
  dayResultBadge.style.color = DAY_COLORS[finalRem];

  // Rotate gear to place active day face front and center
  // Face i is at midAngle = (i + 0.5) * (2π/7)
  // To rotate front (z > 0, angle = 0), gearGroup.rotation.y = -midAngle
  const targetFaceAngle = -((finalRem + 0.5) * (Math.PI * 2) / 7);
  gsap.to(gearGroup.rotation, { y: targetFaceAngle, duration: 1.2, ease: "power3.out" });

  // Render Vaporizer Funnel Breakdown
  funnelChamber.innerHTML = `
    <div class="funnel-step">
      <span class="step-label">Stage 1 // Raw Calendar Components</span>
      <div class="step-cards">
        <div class="num-chip"><span class="val">${centuryCode}</span><span class="sub">Century (${Math.floor(Y/100)}00s)</span></div>
        <span class="op">+</span>
        <div class="num-chip"><span class="val">${yearLast2}</span><span class="sub">Year ('${String(yearLast2).padStart(2, "0")})</span></div>
        <span class="op">+</span>
        <div class="num-chip"><span class="val">${leapQuotient}</span><span class="sub">&lfloor;${yearLast2}/4&rfloor; Leaps</span></div>
        <span class="op">+</span>
        <div class="num-chip"><span class="val">${monthCode}</span><span class="sub">Month Code</span></div>
        <span class="op">+</span>
        <div class="num-chip"><span class="val">${D}</span><span class="sub">Day</span></div>
        <span class="op">=</span>
        <div class="num-chip active-rem"><span class="val">${totalSum}</span><span class="sub">Total Sum</span></div>
      </div>
    </div>

    <div class="funnel-step">
      <span class="step-label">Stage 2 // Mod-7 Vaporizer Breakdown (Strip Multiples of 7)</span>
      <div class="step-cards">
        <div class="num-chip"><span class="val">${centuryCode}</span><span class="sub">C mod 7</span></div>
        <span class="op">+</span>
        <div class="num-chip ${yearLast2 >= 7 ? 'vaporized' : ''}">
          <span class="val">${yearRem}</span>
          <span class="sub">${yearLast2} mod 7</span>
        </div>
        <span class="op">+</span>
        <div class="num-chip ${leapQuotient >= 7 ? 'vaporized' : ''}">
          <span class="val">${leapRem}</span>
          <span class="sub">${leapQuotient} mod 7</span>
        </div>
        <span class="op">+</span>
        <div class="num-chip"><span class="val">${monthCode}</span><span class="sub">M mod 7</span></div>
        <span class="op">+</span>
        <div class="num-chip ${D >= 7 ? 'vaporized' : ''}">
          <span class="val">${dayRem}</span>
          <span class="sub">${D} mod 7</span>
        </div>
        <span class="op">=</span>
        <div class="num-chip active-rem"><span class="val">${reducedSum}</span><span class="sub">Reduced Sum</span></div>
      </div>
    </div>

    <div class="funnel-step">
      <span class="step-label">Stage 3 // Final Weekday Determination</span>
      <div class="step-cards">
        <div class="num-chip"><span class="val">${reducedSum}</span><span class="sub">Sum</span></div>
        <span class="op">&divide; 7 &rarr;</span>
        <div class="num-chip final-answer">
          <span class="val">${finalRem} &rarr; ${weekdayName.toUpperCase()}</span>
          <span class="sub">Remainder Face Locked</span>
        </div>
      </div>
    </div>
  `;

  gsap.fromTo(".funnel-step", { opacity: 0.3, y: 10 }, { opacity: 1, y: 0, duration: 0.35, stagger: 0.1, ease: "power2.out" });
}

[yearInput, monthInput, dayInput].forEach(el => {
  el.addEventListener("input", () => {
    audio.click();
    calculateCalendar();
  });
});

vaporizeBtn.addEventListener("click", () => {
  audio.zap();
  calculateCalendar();
  // Spark animation on vaporized chips
  gsap.fromTo(".vaporized", { scale: 1.2, filter: "brightness(2)" }, { scale: 0.92, filter: "brightness(1)", duration: 0.4 });
});

document.querySelectorAll(".preset-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    yearInput.value = chip.dataset.y;
    monthInput.value = chip.dataset.m;
    dayInput.value = chip.dataset.d;
    audio.click();
    calculateCalendar();
  });
});

window.addEventListener("resize", () => {
  camera.aspect = box.clientWidth / box.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(box.clientWidth, box.clientHeight);
});

function animate() {
  requestAnimationFrame(animate);
  world.position.x = panX;
  world.position.y = panY + (isPointerDown ? 0 : Math.sin(Date.now() * 0.0015) * 0.04);
  world.rotation.y = rotY;
  world.rotation.x = rotX;
  renderer.render(scene, camera);
}
animate();
calculateCalendar();

// --- AUTO-DEMO KIOSK MODE ---
const autoDemoBtn = document.getElementById("autoDemoBtn");
let demoTimer = null;
const demoDates = [
  { y: 1969, m: 6, d: 20 },
  { y: 2000, m: 0, d: 1 },
  { y: 1947, m: 7, d: 15 },
  { y: 1776, m: 6, d: 4 },
  { y: 2026, m: 9, d: 30 }
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
      demoIdx = (demoIdx + 1) % demoDates.length;
      const d = demoDates[demoIdx];
      yearInput.value = d.y;
      monthInput.value = d.m;
      dayInput.value = d.d;
      audio.zap();
      calculateCalendar();
    }, 5000);
  }
  audio.click();
});

[yearInput, monthInput, dayInput, box].forEach(el => {
  el.addEventListener("pointerdown", () => {
    if (demoTimer) autoDemoBtn.click();
  });
});

// --- CHALLENGE: DATE DAY BLITZ ---
const challengeBtn = document.getElementById("challengeBtn");
const challengeModal = document.getElementById("challengeModal");
const closeChallenge = document.getElementById("closeChallenge");
const streakCount = document.getElementById("streakCount");
const timerVal = document.getElementById("timerVal");
const timerBar = document.getElementById("timerBar");
const targetDatePrompt = document.getElementById("targetDatePrompt");
const optionsGrid = document.getElementById("optionsGrid");
const quizFeedback = document.getElementById("quizFeedback");

let streak = 0, timeLeft = 20, quizTimer = null, correctDayIndex = 0;

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
  if (timerBar) timerBar.style.width = "100%";
  if (quizFeedback) quizFeedback.textContent = "";

  // Pick random date between 1950 and 2050
  const qYear = Math.floor(Math.random() * 100) + 1950;
  const qMonth = Math.floor(Math.random() * 12);
  const qDay = Math.floor(Math.random() * 28) + 1;

  const dateObj = new Date(qYear, qMonth, qDay);
  correctDayIndex = dateObj.getDay();

  const padM = String(qMonth + 1).padStart(2, "0");
  const padD = String(qDay).padStart(2, "0");
  targetDatePrompt.textContent = `${qYear}-${padM}-${padD}`;

  // Deterministically select 3 distinct distractor days
  const otherDays = [0, 1, 2, 3, 4, 5, 6].filter(d => d !== correctDayIndex);
  otherDays.sort(() => Math.random() - 0.5);
  const chosenDistractors = otherDays.slice(0, 3);
  const allOpts = [correctDayIndex, ...chosenDistractors].sort(() => Math.random() - 0.5);

  optionsGrid.innerHTML = "";
  allOpts.forEach((dayIdx, idx) => {
    const btn = document.createElement("button");
    btn.className = "quiz-btn";
    btn.setAttribute("data-day", dayIdx);
    btn.innerHTML = `<span class="key-badge">${idx + 1}</span> ${DAYS[dayIdx]}`;
    btn.addEventListener("click", () => handleQuizAnswer(dayIdx, btn));
    optionsGrid.appendChild(btn);
  });

  const totalTime = 20;
  quizTimer = setInterval(() => {
    timeLeft--;
    timerVal.textContent = timeLeft + "s";
    if (timerBar) {
      const pct = Math.max(0, (timeLeft / totalTime) * 100);
      timerBar.style.width = `${pct}%`;
    }
    if (timeLeft <= 0) {
      clearInterval(quizTimer);
      handleQuizTimeout();
    }
  }, 1000);
}

function handleQuizAnswer(selectedIdx, btn) {
  clearInterval(quizTimer);
  const btns = optionsGrid.querySelectorAll(".quiz-btn");
  btns.forEach(b => b.disabled = true);

  if (selectedIdx === correctDayIndex) {
    btn.classList.add("correct");
    streak++;
    streakCount.textContent = streak;
    if (quizFeedback) quizFeedback.innerHTML = `<span class="fb-pass">&#10004; Correct! +1 Streak</span>`;
    audio.win();
    setTimeout(startNextQuiz, 900);
  } else {
    btn.classList.add("wrong");
    btns.forEach(b => {
      if (+b.getAttribute("data-day") === correctDayIndex) b.classList.add("correct");
    });
    streak = 0;
    streakCount.textContent = streak;
    if (quizFeedback) quizFeedback.innerHTML = `<span class="fb-fail">&#10008; Incorrect! It was ${DAYS[correctDayIndex]}</span>`;
    audio.lose();
    setTimeout(startNextQuiz, 1500);
  }
}

function handleQuizTimeout() {
  streak = 0;
  streakCount.textContent = streak;
  const btns = optionsGrid.querySelectorAll(".quiz-btn");
  btns.forEach(b => {
    b.disabled = true;
    if (+b.getAttribute("data-day") === correctDayIndex) b.classList.add("correct");
  });
  if (quizFeedback) quizFeedback.innerHTML = `<span class="fb-fail">&#9200; Time's up! It was ${DAYS[correctDayIndex]}</span>`;
  audio.lose();
  setTimeout(startNextQuiz, 1500);
}

// Keyboard shortcuts (1, 2, 3, 4, Esc)
window.addEventListener("keydown", e => {
  if (challengeModal.style.display !== "grid") return;
  if (["1", "2", "3", "4"].includes(e.key)) {
    const btns = optionsGrid.querySelectorAll(".quiz-btn");
    const idx = parseInt(e.key) - 1;
    if (btns[idx] && !btns[idx].disabled) btns[idx].click();
  }
  if (e.key === "Escape") closeChallenge.click();
});
