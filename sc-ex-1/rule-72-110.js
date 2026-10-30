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
  pop() { this.tone(580, "sine", 0.05, 0.08); }
  doubled() {
    [440, 554.37, 659.25].forEach((f, i) => {
      setTimeout(() => this.tone(f, "sine", 0.12, 0.1), i * 40);
    });
  }
  win() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      setTimeout(() => this.tone(f, "sine", 0.15, 0.12), i * 55);
    });
  }
  lose() { this.tone(180, "sawtooth", 0.22, 0.14); }
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

// --- BIOLOGICAL PETRI DISH SIMULATOR ---
const pCvs = document.getElementById("petriCanvas");
const pCtx = pCvs.getContext("2d");
const rateSlider = document.getElementById("rateSlider");
const rateDisplay = document.getElementById("rateDisplay");
const popCount = document.getElementById("popCount");
const doubleEvents = document.getElementById("doubleEvents");
const playPauseBtn = document.getElementById("playPauseBtn");
const resetSimBtn = document.getElementById("resetSimBtn");

const rule72Time = document.getElementById("rule72Time");
const exact2Time = document.getElementById("exact2Time");
const rule110Time = document.getElementById("rule110Time");
const exact3Time = document.getElementById("exact3Time");

let currentRate = 8;
let currentModel = "bacteria";
let isSimRunning = false;
let cells = [];
let simTime = 0;
let initialPop = 100;
let lastDoubleThreshold = 200;
let doubleCount = 0;
let rippleRadius = 0;
let rippleAlpha = 0;

function initCells() {
  cells = [];
  const dishRadius = Math.min(pCvs.clientWidth, pCvs.clientHeight) * 0.38;
  const cx = pCvs.clientWidth / 2, cy = pCvs.clientHeight / 2;

  for (let i = 0; i < 40; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * (dishRadius * 0.6);
    cells.push({
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      size: 3.5 + Math.random() * 2.5,
      color: currentModel === "bacteria" ? "#4ade80" : currentModel === "algae" ? "#06b6d4" : "#f59e0b"
    });
  }
  simTime = 0;
  doubleCount = 0;
  lastDoubleThreshold = 200;
  popCount.textContent = "100";
  doubleEvents.textContent = "0x";
}

function updateMathEngine() {
  currentRate = +rateSlider.value;
  rateDisplay.textContent = `${currentRate}%`;

  const rDec = currentRate / 100;
  const t72 = 72 / currentRate;
  const t110 = 110 / currentRate;
  const tExact2 = Math.log(2) / Math.log(1 + rDec);
  const tExact3 = Math.log(3) / Math.log(1 + rDec);

  rule72Time.textContent = `${t72.toFixed(1)} hrs`;
  exact2Time.textContent = `${tExact2.toFixed(2)} hrs`;
  rule110Time.textContent = `${t110.toFixed(1)} hrs`;
  exact3Time.textContent = `${tExact3.toFixed(2)} hrs`;

  drawWheel();
}

function renderPetriDish() {
  const dpr = window.devicePixelRatio || 1;
  const w = pCvs.clientWidth, h = pCvs.clientHeight;
  pCvs.width = w * dpr; pCvs.height = h * dpr;
  pCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  pCtx.clearRect(0, 0, w, h);

  const cx = w / 2, cy = h / 2;
  const dishR = Math.min(w, h) * 0.42;

  // Petri Dish Glass Rim
  const rimGrad = pCtx.createRadialGradient(cx, cy, dishR * 0.7, cx, cy, dishR);
  rimGrad.addColorStop(0, "rgba(15, 23, 42, 0.4)");
  rimGrad.addColorStop(1, "rgba(30, 41, 59, 0.85)");
  pCtx.fillStyle = rimGrad;
  pCtx.strokeStyle = "rgba(74, 222, 128, 0.35)";
  pCtx.lineWidth = 4;
  pCtx.beginPath();
  pCtx.arc(cx, cy, dishR, 0, Math.PI * 2);
  pCtx.fill();
  pCtx.stroke();

  // Doubling shockwave ripple
  if (rippleAlpha > 0.01) {
    pCtx.save();
    pCtx.strokeStyle = `rgba(74, 222, 128, ${rippleAlpha})`;
    pCtx.lineWidth = 3;
    pCtx.beginPath();
    pCtx.arc(cx, cy, rippleRadius, 0, Math.PI * 2);
    pCtx.stroke();
    rippleRadius += 4;
    rippleAlpha *= 0.94;
    pCtx.restore();
  }

  // Update and draw cells
  cells.forEach(c => {
    if (isSimRunning) {
      c.x += c.vx;
      c.y += c.vy;

      // Bounce off dish wall
      const dx = c.x - cx, dy = c.y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > dishR - 12) {
        c.vx = -c.vx * 0.8;
        c.vy = -c.vy * 0.8;
        c.x = cx + (dx / dist) * (dishR - 13);
        c.y = cy + (dy / dist) * (dishR - 13);
      }
    }

    pCtx.save();
    pCtx.fillStyle = c.color;
    pCtx.shadowBlur = 8;
    pCtx.shadowColor = c.color;
    pCtx.beginPath();
    if (currentModel === "bacteria") {
      // Rod shape
      pCtx.ellipse(c.x, c.y, c.size * 1.5, c.size * 0.8, Math.atan2(c.vy, c.vx), 0, Math.PI * 2);
    } else {
      pCtx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
    }
    pCtx.fill();
    pCtx.restore();
  });

  // Population growth step
  if (isSimRunning) {
    simTime += 0.05;
    // Population formula: N(t) = N0 * (1 + r)^t
    const currentPop = Math.round(initialPop * Math.pow(1 + currentRate / 100, simTime));
    popCount.textContent = currentPop.toLocaleString();

    // Check for doubling events
    if (currentPop >= lastDoubleThreshold) {
      doubleCount++;
      doubleEvents.textContent = `${doubleCount}x`;
      lastDoubleThreshold *= 2;
      rippleRadius = 10;
      rippleAlpha = 0.85;
      audio.doubled();

      // Spawn extra cell visuals (capped at 250 for performance)
      if (cells.length < 240) {
        const extraCount = Math.min(25, Math.floor(cells.length * 0.4));
        for (let i = 0; i < extraCount; i++) {
          const parent = cells[Math.floor(Math.random() * cells.length)];
          cells.push({
            x: parent.x + (Math.random() - 0.5) * 8,
            y: parent.y + (Math.random() - 0.5) * 8,
            vx: (Math.random() - 0.5) * 0.8,
            vy: (Math.random() - 0.5) * 0.8,
            size: parent.size,
            color: parent.color
          });
        }
      }
    }
  }

  requestAnimationFrame(renderPetriDish);
}

// 72 Factor Wheel Canvas
const wCvs = document.getElementById("wheelCanvas");
const wCtx = wCvs.getContext("2d");
const DIVISORS = [1, 2, 3, 4, 6, 8, 9, 12, 18, 24, 36, 72];
let wheelRotation = 0;

function drawWheel() {
  const dpr = window.devicePixelRatio || 1;
  const w = wCvs.clientWidth, h = wCvs.clientHeight;
  wCvs.width = w * dpr; wCvs.height = h * dpr;
  wCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  wCtx.clearRect(0, 0, w, h);

  const cx = w / 2, cy = h / 2;
  const R = Math.min(w, h) * 0.44;
  const slice = (Math.PI * 2) / DIVISORS.length;

  DIVISORS.forEach((div, i) => {
    const a1 = i * slice + wheelRotation;
    const a2 = (i + 1) * slice + wheelRotation;

    wCtx.save();
    wCtx.beginPath();
    wCtx.moveTo(cx, cy);
    wCtx.arc(cx, cy, R, a1, a2);
    wCtx.closePath();

    const isMatch = div === currentRate;
    wCtx.fillStyle = isMatch ? "rgba(74, 222, 128, 0.4)" : i % 2 === 0 ? "rgba(15, 23, 42, 0.8)" : "rgba(30, 41, 59, 0.8)";
    wCtx.strokeStyle = isMatch ? "#4ade80" : "rgba(255, 255, 255, 0.1)";
    wCtx.lineWidth = isMatch ? 3 : 1;
    wCtx.fill();
    wCtx.stroke();

    // Divisor label
    const midA = (a1 + a2) / 2;
    const tx = cx + Math.cos(midA) * (R * 0.7);
    const ty = cy + Math.sin(midA) * (R * 0.7);
    wCtx.fillStyle = isMatch ? "#bbf7d0" : "#cbd5e1";
    wCtx.font = "bold 11px monospace";
    wCtx.textAlign = "center";
    wCtx.textBaseline = "middle";
    wCtx.fillText(div, tx, ty);
    wCtx.restore();
  });

  // Center Hub
  wCtx.fillStyle = "#070b19";
  wCtx.strokeStyle = "#4ade80";
  wCtx.lineWidth = 2;
  wCtx.beginPath();
  wCtx.arc(cx, cy, 22, 0, Math.PI * 2);
  wCtx.fill();
  wCtx.stroke();

  wCtx.fillStyle = "#fff";
  wCtx.font = "bold 11px monospace";
  wCtx.textAlign = "center";
  wCtx.textBaseline = "middle";
  wCtx.fillText("72", cx, cy);
}

// Controls
rateSlider.addEventListener("input", () => {
  audio.click();
  updateMathEngine();
});

document.querySelectorAll(".preset-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    rateSlider.value = chip.dataset.r;
    audio.click();
    updateMathEngine();
  });
});

document.querySelectorAll(".model-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".model-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentModel = btn.dataset.model;
    audio.click();
    initCells();
  });
});

playPauseBtn.addEventListener("click", () => {
  isSimRunning = !isSimRunning;
  playPauseBtn.textContent = isSimRunning ? "❚❚ Pause Growth" : "▶ Start Growth";
  audio.pop();
});

resetSimBtn.addEventListener("click", () => {
  isSimRunning = false;
  playPauseBtn.textContent = "▶ Start Growth";
  audio.click();
  initCells();
});

window.addEventListener("resize", () => {
  initCells();
  updateMathEngine();
});

initCells();
updateMathEngine();
renderPetriDish();

// --- AUTO-DEMO KIOSK MODE ---
const autoDemoBtn = document.getElementById("autoDemoBtn");
let demoTimer = null;
const demoRates = [6, 8, 9, 12, 18];
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
    if (!isSimRunning) playPauseBtn.click();
    demoTimer = setInterval(() => {
      demoIdx = (demoIdx + 1) % demoRates.length;
      rateSlider.value = demoRates[demoIdx];
      updateMathEngine();
      initCells();
    }, 5500);
  }
  audio.click();
});

[rateSlider, pCvs].forEach(el => {
  el.addEventListener("pointerdown", () => {
    if (demoTimer) autoDemoBtn.click();
  });
});

// --- CHALLENGE: DOUBLING TIME BLITZ ---
const challengeBtn = document.getElementById("challengeBtn");
const challengeModal = document.getElementById("challengeModal");
const closeChallenge = document.getElementById("closeChallenge");
const streakCount = document.getElementById("streakCount");
const timerVal = document.getElementById("timerVal");
const targetPrompt = document.getElementById("targetPrompt");
const optionsGrid = document.getElementById("optionsGrid");

let streak = 0, timeLeft = 20, quizTimer = null, correctDoubleTime = 0;

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
  timeLeft = 20;
  timerVal.textContent = timeLeft + "s";

  const rateOptions = [4, 6, 8, 9, 12, 18, 24];
  const qRate = rateOptions[Math.floor(Math.random() * rateOptions.length)];
  targetPrompt.textContent = `${qRate}% Rate → ? hrs`;
  correctDoubleTime = 72 / qRate;

  const opts = new Set([`${correctDoubleTime} hrs`]);
  while (opts.size < 4) {
    const fake = Math.abs(correctDoubleTime + (Math.floor(Math.random() * 5) - 2) * 2);
    if (fake > 0) opts.add(`${fake} hrs`);
  }
  const shuffled = Array.from(opts).sort(() => Math.random() - 0.5);

  optionsGrid.innerHTML = "";
  shuffled.forEach(ans => {
    const btn = document.createElement("button");
    btn.className = "quiz-btn";
    btn.textContent = ans;
    btn.addEventListener("click", () => checkQuiz(parseInt(ans)));
    optionsGrid.appendChild(btn);
  });

  quizTimer = setInterval(() => {
    timeLeft--;
    timerVal.textContent = timeLeft + "s";
    if (timeLeft <= 0) {
      clearInterval(quizTimer);
      audio.lose();
      alert(`Time up! At ${qRate}%, 72 / ${qRate} = ${correctDoubleTime} hrs`);
      startNextQuiz();
    }
  }, 1000);
}

function checkQuiz(choice) {
  clearInterval(quizTimer);
  if (choice === correctDoubleTime) {
    audio.win();
    streak++;
    streakCount.textContent = streak;
    optionsGrid.innerHTML = `<div style="grid-column: 1/-1; color: #4ade80; font-weight: bold; font-size: 1.15rem; text-align: center;">Correct! +1 Streak</div>`;
    setTimeout(startNextQuiz, 900);
  } else {
    audio.lose();
    optionsGrid.innerHTML = `<div style="grid-column: 1/-1; color: #f43f5e; font-weight: bold; font-size: 1.15rem; text-align: center;">Incorrect! Answer was ${correctDoubleTime} hrs</div>`;
    streak = 0;
    streakCount.textContent = streak;
    setTimeout(startNextQuiz, 1400);
  }
}
