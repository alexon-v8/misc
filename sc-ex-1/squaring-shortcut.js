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
  click() { this.tone(680, "triangle", 0.04, 0.05); }
  slice() { this.tone(920, "sine", 0.06, 0.08); }
  snap() { this.tone(480, "sine", 0.1, 0.12); }
  win() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      setTimeout(() => this.tone(f, "sine", 0.15, 0.12), i * 55);
    });
  }
  launch() { this.tone(520, "sine", 0.12, 0.1); }
  lose() { this.tone(175, "sawtooth", 0.22, 0.14); }
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

// --- CANVAS GEOMETRIC MORPH ENGINE ---
const cvs = document.getElementById("morphCanvas");
const ctx = cvs.getContext("2d");
const progressSlider = document.getElementById("progressSlider");
const progressVal = document.getElementById("progressVal");
const playBtn = document.getElementById("playBtn");
const resetBtn = document.getElementById("resetBtn");
const morphStateLabel = document.getElementById("morphStateLabel");

const numSlider = document.getElementById("numSlider");
const aDisplay = document.getElementById("aDisplay");
const dDisplay = document.getElementById("dDisplay");
const stepsFlow = document.getElementById("stepsFlow");

let aVal = 97;
let dVal = 3;
let morphProgress = 0; // 0 to 1
let isPlaying = false;
let morphTween = null;

function calculateDeviation(num) {
  // Nearest multiple of 10
  const decade = Math.round(num / 10) * 10;
  let d = Math.abs(num - decade);
  if (d === 0) d = 5; // Fallback if already decade
  return { d, base: decade };
}

function updateValues() {
  aVal = +numSlider.value;
  aDisplay.textContent = aVal;
  const dev = calculateDeviation(aVal);
  dVal = dev.d;
  dDisplay.textContent = `±${dVal}`;

  updateStepCards();
  drawScene();
}

function updateStepCards() {
  const roundBase = aVal < 100 && aVal > 80 ? 100 : Math.round(aVal / 10) * 10;
  const d = Math.abs(aVal - roundBase);
  const term1 = aVal + (aVal < roundBase ? d : -d);
  const term2 = aVal - (aVal < roundBase ? d : -d);
  const bigProduct = term1 * term2;
  const cornerSquare = d * d;
  const finalAnswer = bigProduct + cornerSquare;

  stepsFlow.innerHTML = `
    <div class="calc-step">
      <div class="step-heading">
        <span class="step-num">Step 1 // Nearest Decade Rounding</span>
        <span class="step-desc">Target round base: ${roundBase}</span>
      </div>
      <div class="step-cards">
        <span class="c-card">a = ${aVal}</span>
        <span class="op">&rarr;</span>
        <span class="c-card round">Deviation d = ${d}</span>
        <span class="op">&rarr;</span>
        <span class="c-card">(a + d) = ${term1}</span>
        <span class="c-card">(a &minus; d) = ${term2}</span>
      </div>
    </div>

    <div class="calc-step">
      <div class="step-heading">
        <span class="step-num">Step 2 // Single-Digit Decade Multiplication</span>
        <span class="step-desc">Multiply the simplified factors</span>
      </div>
      <div class="step-cards">
        <span class="c-card round">${term1}</span>
        <span class="op">&times;</span>
        <span class="c-card">${term2}</span>
        <span class="op">=</span>
        <span class="c-card round">${bigProduct}</span>
      </div>
    </div>

    <div class="calc-step">
      <div class="step-heading">
        <span class="step-num">Step 3 // Add Corner Square (d&sup2;)</span>
        <span class="step-desc">Restore the sliced difference</span>
      </div>
      <div class="step-cards">
        <span class="c-card round">${bigProduct}</span>
        <span class="op">+</span>
        <span class="c-card corner">${d}&sup2; (${cornerSquare})</span>
        <span class="op">=</span>
        <span class="c-card final">${finalAnswer}</span>
      </div>
    </div>
  `;
}

// --- MOUSE TRANSLATE, ORBIT/TILT & ZOOM CONTROLS ---
let isPointerDown = false, pointerButton = 0, prevX = 0, prevY = 0;
let panX = 0, panY = 0, zoomScale = 1, tiltAngle = 0;

cvs.addEventListener("pointerdown", e => {
  isPointerDown = true;
  pointerButton = e.button;
  prevX = e.clientX;
  prevY = e.clientY;
  try { cvs.setPointerCapture(e.pointerId); } catch(err) {}
});

cvs.addEventListener("pointermove", e => {
  if (!isPointerDown) return;
  const dx = e.clientX - prevX;
  const dy = e.clientY - prevY;
  prevX = e.clientX;
  prevY = e.clientY;

  // Middle click / wheel-drag -> orbit/tilt around center
  if (pointerButton === 1 || (e.buttons & 4)) {
    tiltAngle += dx * 0.005;
  } else {
    // Left drag -> translate scene
    panX += dx;
    panY += dy;
  }
  drawScene();
});

cvs.addEventListener("pointerup", e => {
  isPointerDown = false;
  try { cvs.releasePointerCapture(e.pointerId); } catch(err) {}
});

cvs.addEventListener("wheel", e => {
  e.preventDefault();
  const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
  zoomScale = Math.max(0.5, Math.min(3.0, zoomScale * zoomFactor));
  drawScene();
}, { passive: false });

cvs.addEventListener("dblclick", () => {
  panX = 0; panY = 0; zoomScale = 1; tiltAngle = 0;
  drawScene();
});

function drawScene() {
  const dpr = window.devicePixelRatio || 1;
  const w = cvs.clientWidth, h = cvs.clientHeight;
  cvs.width = w * dpr; cvs.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const cx = w * 0.42, cy = h * 0.5;
  const scale = Math.min(w, h) * 0.0032;

  const aSize = 65 * scale;
  const dSize = Math.max(12, 18 * (dVal / 5)) * scale;
  const remSize = aSize - dSize;

  const t = morphProgress;

  // Update State Label
  if (t < 0.25) morphStateLabel.textContent = `Stage: Square a² (${aVal}×${aVal})`;
  else if (t < 0.65) morphStateLabel.textContent = `Stage: Strip of width d (${dVal}) Detached & Rotating`;
  else if (t < 0.9) morphStateLabel.textContent = `Stage: Snapped to (${aVal}+${dVal})×(${aVal}-${dVal}) Rectangle`;
  else morphStateLabel.textContent = `Stage: + Corner Square d² (${dVal}²=${dVal*dVal}) Locked`;

  ctx.save();
  // Apply scene translation, zoom, tilt
  ctx.translate(cx + panX, cy + panY);
  ctx.scale(zoomScale, zoomScale);
  ctx.rotate(tiltAngle);
  ctx.translate(-cx, -cy);

  // 1. Static Left Body: (a - d) x a
  ctx.save();
  ctx.fillStyle = "rgba(74, 222, 128, 0.18)";
  ctx.strokeStyle = "#4ade80";
  ctx.lineWidth = 2;
  const bodyX = cx - aSize / 2;
  const bodyY = cy - aSize / 2;
  ctx.fillRect(bodyX, bodyY, remSize, aSize);
  ctx.strokeRect(bodyX, bodyY, remSize, aSize);

  // Label for main body
  ctx.fillStyle = "#e2e8f0";
  ctx.font = `bold ${Math.max(11, 13 * scale)}px monospace`;
  ctx.textAlign = "center";
  ctx.fillText(`(a − d) = ${aVal - dVal}`, bodyX + remSize / 2, bodyY - 10);
  ctx.save();
  ctx.translate(bodyX - 12, bodyY + aSize / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`a = ${aVal}`, 0, 0);
  ctx.restore();
  ctx.restore();

  // 2. Morphing Right Strip of width d x a
  // Strip initial position: (bodyX + remSize, bodyY)
  // Final position: beneath the entire rectangle at (bodyX, bodyY + aSize)
  ctx.save();
  let stripX = bodyX + remSize;
  let stripY = bodyY;
  let stripRot = 0;
  let stripW = dSize;
  let stripH = aSize;

  if (t <= 0.3) {
    // Stage 1: Laser gap separates strip
    const gap = (t / 0.3) * (20 * scale);
    stripX += gap;
  } else if (t <= 0.75) {
    // Stage 2: Move down and rotate 90 degrees
    const p = (t - 0.3) / 0.45;
    const startX = bodyX + remSize + 20 * scale;
    const endX = bodyX + remSize / 2;
    const startY = bodyY;
    const endY = bodyY + aSize + 12 * scale;

    stripX = startX + (endX - startX) * p;
    stripY = startY + (endY - startY) * p;
    stripRot = p * (Math.PI / 2);
  } else {
    // Stage 3: Snap directly beneath main block to extend length
    const p = (t - 0.75) / 0.25;
    const startX = bodyX + remSize / 2;
    const endX = bodyX;
    const startY = bodyY + aSize + 12 * scale;
    const endY = bodyY + aSize;

    stripX = startX + (endX - startX) * p;
    stripY = startY + (endY - startY) * p;
    stripRot = Math.PI / 2;
  }

  ctx.translate(stripX, stripY);
  ctx.rotate(stripRot);
  ctx.fillStyle = "rgba(56, 189, 248, 0.22)";
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 2;
  ctx.fillRect(0, 0, stripW, stripH);
  ctx.strokeRect(0, 0, stripW, stripH);

  // Strip label
  ctx.fillStyle = "#38bdf8";
  ctx.font = `bold ${Math.max(10, 11 * scale)}px monospace`;
  ctx.textAlign = "center";
  ctx.fillText(`d=${dVal}`, stripW / 2, -6);
  ctx.restore();

  // 3. Corner d x d Square (Snaps in at 0.85 -> 1.0)
  if (t > 0.85) {
    const cp = (t - 0.85) / 0.15;
    ctx.save();
    const cornerX = bodyX + remSize;
    const cornerY = bodyY + aSize;
    ctx.fillStyle = `rgba(244, 63, 94, ${0.35 * cp})`;
    ctx.strokeStyle = "#f43f5e";
    ctx.lineWidth = 2;
    ctx.shadowBlur = 15 * cp;
    ctx.shadowColor = "#f43f5e";
    ctx.fillRect(cornerX, cornerY, dSize, dSize);
    ctx.strokeRect(cornerX, cornerY, dSize, dSize);

    ctx.fillStyle = "#fecdd3";
    ctx.font = `bold ${Math.max(10, 11 * scale)}px monospace`;
    ctx.textAlign = "center";
    ctx.fillText(`d²=${dVal*dVal}`, cornerX + dSize / 2, cornerY + dSize / 2 + 4);
    ctx.restore();
  }

  ctx.restore(); // restore scene transform
}

// Scrubber events
progressSlider.addEventListener("input", e => {
  morphProgress = +e.target.value / 100;
  progressVal.textContent = `${Math.round(morphProgress * 100)}%`;
  if (isPlaying) stopMorph();
  drawScene();
});

playBtn.addEventListener("click", () => {
  if (isPlaying) {
    stopMorph();
  } else {
    startMorph();
  }
});

resetBtn.addEventListener("click", () => {
  stopMorph();
  morphProgress = 0;
  progressSlider.value = 0;
  progressVal.textContent = "0%";
  audio.click();
  drawScene();
});

function startMorph() {
  isPlaying = true;
  playBtn.textContent = "❚❚ Pause";
  audio.slice();
  if (morphProgress >= 1) morphProgress = 0;

  morphTween = gsap.to({ p: morphProgress }, {
    p: 1,
    duration: 3.5,
    ease: "power1.inOut",
    onUpdate: function () {
      morphProgress = this.targets()[0].p;
      progressSlider.value = Math.round(morphProgress * 100);
      progressVal.textContent = `${Math.round(morphProgress * 100)}%`;
      drawScene();
    },
    onComplete: function () {
      audio.snap();
      stopMorph();
    }
  });
}

function stopMorph() {
  isPlaying = false;
  playBtn.textContent = "▶ Play Morph";
  if (morphTween) morphTween.kill();
}

numSlider.addEventListener("input", () => {
  audio.click();
  updateValues();
});

document.querySelectorAll(".preset-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    numSlider.value = chip.dataset.val;
    audio.click();
    updateValues();
    if (!isPlaying) startMorph();
  });
});

window.addEventListener("resize", drawScene);
updateValues();

// --- AUTO-DEMO KIOSK MODE ---
const autoDemoBtn = document.getElementById("autoDemoBtn");
let demoTimer = null;
const demoList = [97, 104, 48, 23, 89, 65];
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
      numSlider.value = demoList[demoIdx];
      updateValues();
      startMorph();
    }, 5500);
  }
  audio.click();
});

[numSlider, progressSlider, cvs].forEach(el => {
  el.addEventListener("pointerdown", () => {
    if (demoTimer) autoDemoBtn.click();
  });
});

// --- CHALLENGE: SQUARING DUEL ---
const challengeBtn = document.getElementById("challengeBtn");
const challengeModal = document.getElementById("challengeModal");
const closeChallenge = document.getElementById("closeChallenge");
const streakCount = document.getElementById("streakCount");
const timerVal = document.getElementById("timerVal");
const timerBar = document.getElementById("timerBar");
const targetSquare = document.getElementById("targetSquare");
const optionsGrid = document.getElementById("optionsGrid");
const quizFeedback = document.getElementById("quizFeedback");

let streak = 0, timeLeft = 20, quizTimer = null, currentTargetNum = 97, correctResult = 0;

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

  // Pick numbers close to decades for fast mental math
  const candidates = [98, 97, 96, 95, 94, 102, 103, 104, 49, 51, 24, 25, 26, 89, 91];
  currentTargetNum = candidates[Math.floor(Math.random() * candidates.length)];
  targetSquare.textContent = `${currentTargetNum}²`;
  correctResult = currentTargetNum * currentTargetNum;

  // Deterministically generate 3 distinct plausible distractors
  const candidateDeltas = [20, -20, 100, -100, 40, -40, 10, -10, 30, -30];
  const distSet = new Set();
  for (const d of candidateDeltas) {
    const cand = Math.abs(correctResult + d);
    if (cand !== correctResult) distSet.add(cand);
    if (distSet.size >= 3) break;
  }
  let fallback = 50;
  while (distSet.size < 3) {
    distSet.add(correctResult + fallback);
    fallback += 20;
  }

  const allOpts = [correctResult, ...Array.from(distSet)].sort(() => Math.random() - 0.5);

  optionsGrid.innerHTML = "";
  allOpts.forEach((ans, idx) => {
    const btn = document.createElement("button");
    btn.className = "quiz-btn";
    btn.setAttribute("data-ans", ans);
    btn.innerHTML = `<span class="key-badge">${idx + 1}</span> ${ans}`;
    btn.addEventListener("click", () => handleQuizAnswer(ans, btn));
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

function handleQuizAnswer(choice, btn) {
  clearInterval(quizTimer);
  const btns = optionsGrid.querySelectorAll(".quiz-btn");
  btns.forEach(b => b.disabled = true);

  if (choice === correctResult) {
    btn.classList.add("correct");
    streak++;
    streakCount.textContent = streak;
    if (quizFeedback) quizFeedback.innerHTML = `<span class="fb-pass">&#10004; Correct! +1 Streak</span>`;
    audio.win();
    setTimeout(startNextQuiz, 900);
  } else {
    btn.classList.add("wrong");
    btns.forEach(b => {
      if (+b.getAttribute("data-ans") === correctResult) b.classList.add("correct");
    });
    streak = 0;
    streakCount.textContent = streak;
    if (quizFeedback) quizFeedback.innerHTML = `<span class="fb-fail">&#10008; Incorrect! Answer was ${correctResult}</span>`;
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
    if (+b.getAttribute("data-ans") === correctResult) b.classList.add("correct");
  });
  if (quizFeedback) quizFeedback.innerHTML = `<span class="fb-fail">&#9200; Time's up! ${currentTargetNum}² = ${correctResult}</span>`;
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
