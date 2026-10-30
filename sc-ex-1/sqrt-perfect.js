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
  click() { this.tone(740, "triangle", 0.04, 0.05); }
  laser() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(1100, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(250, this.ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
    } catch(e) {}
  }
  win() {
    [440, 554.37, 659.25, 880].forEach((f, i) => {
      setTimeout(() => this.tone(f, "sine", 0.15, 0.12), i * 55);
    });
  }
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

// --- DOM ELEMENTS & STATE ---
const squareSelect = document.getElementById("squareSelect");
const prefixVal = document.getElementById("prefixVal");
const suffixVal = document.getElementById("suffixVal");
const rootResultBadge = document.getElementById("rootResultBadge");
const scaleDecision = document.getElementById("scaleDecision");

const tensTrack = document.getElementById("tensTrack");
const unitsTrack = document.getElementById("unitsTrack");
const benchmarkTrack = document.getElementById("benchmarkTrack");

const scaleCanvas = document.getElementById("scaleCanvas");
const sCtx = scaleCanvas.getContext("2d");

let currentSquare = 5776;
let currentTiltAngle = 0;
let targetTiltAngle = 0;

// Unit digit candidate mapping
const UNIT_MAP = {
  0: [0],
  1: [1, 9],
  4: [2, 8],
  5: [5],
  6: [4, 6],
  9: [3, 7]
};

function calculateRoot() {
  currentSquare = +squareSelect.value;
  const str = String(currentSquare);
  const prefix = Math.floor(currentSquare / 100);
  const suffix = currentSquare % 100;
  const padSuffix = String(suffix).padStart(2, "0");
  const lastDigit = suffix % 10;

  prefixVal.textContent = prefix;
  suffixVal.textContent = padSuffix;

  // Tens digit t: largest t with t^2 <= prefix
  let t = 1;
  while ((t + 1) * (t + 1) <= prefix) t++;

  // Candidates
  const cands = UNIT_MAP[lastDigit] || [0];
  const benchmark = t * (t + 1);

  let chosenUnit = cands[0];
  let decisionText = "";

  if (cands.length === 1) {
    chosenUnit = cands[0];
    targetTiltAngle = 0;
    decisionText = `Unique ending ${lastDigit} &rarr; Unit digit is ${chosenUnit}`;
  } else {
    if (prefix > benchmark) {
      chosenUnit = Math.max(cands[0], cands[1]);
      targetTiltAngle = -0.18; // Tilt left (towards prefix)
      decisionText = `Prefix ${prefix} > ${t}×${t+1} (${benchmark}) → Tilt Left (Choose LARGER: ${chosenUnit})`;
    } else {
      chosenUnit = Math.min(cands[0], cands[1]);
      targetTiltAngle = 0.18; // Tilt right (towards benchmark)
      decisionText = `Prefix ${prefix} < ${t}×${t+1} (${benchmark}) → Tilt Right (Choose SMALLER: ${chosenUnit})`;
    }
  }

  const finalRoot = t * 10 + chosenUnit;
  rootResultBadge.textContent = `√${currentSquare} = ${finalRoot}`;
  scaleDecision.innerHTML = decisionText;

  // Render Tracks
  tensTrack.innerHTML = `
    <span class="chip tens">${t}&sup2; = ${t*t} &le; ${prefix}</span>
    <span class="op">&rarr;</span>
    <span class="chip tens">Tens Digit t = ${t}</span>
  `;

  unitsTrack.innerHTML = `
    <span class="chip">Ending in ${lastDigit}</span>
    <span class="op">&rarr;</span>
    ${cands.map(c => `<span class="chip cand ${c === chosenUnit ? 'chosen' : ''}">${c} (since ${c}&sup2; ends in ${lastDigit})</span>`).join("")}
  `;

  benchmarkTrack.innerHTML = `
    <span class="chip">Compare: Prefix (${prefix}) vs t(t+1) = ${t}&times;${t+1} = ${benchmark}</span>
    <span class="op">&rarr;</span>
    <span class="chip chosen">${prefix > benchmark ? `${prefix} > ${benchmark} &rarr; Larger (${chosenUnit})` : `${prefix} < ${benchmark} &rarr; Smaller (${chosenUnit})`}</span>
    <span class="op">&rarr;</span>
    <span class="chip chosen">Final: ${finalRoot}</span>
  `;

  gsap.fromTo(".splitter-chamber", { scale: 0.96 }, { scale: 1, duration: 0.3, ease: "back.out(2)" });
  gsap.to({ a: currentTiltAngle }, {
    a: targetTiltAngle,
    duration: 0.8,
    ease: "power2.out",
    onUpdate: function () {
      currentTiltAngle = this.targets()[0].a;
      drawBalanceScale(prefix, benchmark);
    }
  });
}

// 2D Balance Scale Canvas with Pan, Tilt & Zoom
let isPointerDown = false, pointerButton = 0, prevX = 0, prevY = 0;
let panX = 0, panY = 0, zoomScale = 1, tiltAngle = 0;

scaleCanvas.addEventListener("pointerdown", e => {
  isPointerDown = true;
  pointerButton = e.button;
  prevX = e.clientX;
  prevY = e.clientY;
  try { scaleCanvas.setPointerCapture(e.pointerId); } catch(err) {}
});

scaleCanvas.addEventListener("pointermove", e => {
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
  const p = Math.floor(currentSquare / 100);
  const t = Math.floor(Math.sqrt(p));
  drawBalanceScale(p, t * (t + 1));
});

scaleCanvas.addEventListener("pointerup", e => {
  isPointerDown = false;
  try { scaleCanvas.releasePointerCapture(e.pointerId); } catch(err) {}
});

scaleCanvas.addEventListener("wheel", e => {
  e.preventDefault();
  const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
  zoomScale = Math.max(0.5, Math.min(3.0, zoomScale * zoomFactor));
  const p = Math.floor(currentSquare / 100);
  const t = Math.floor(Math.sqrt(p));
  drawBalanceScale(p, t * (t + 1));
}, { passive: false });

scaleCanvas.addEventListener("dblclick", () => {
  panX = 0; panY = 0; zoomScale = 1; tiltAngle = 0;
  const p = Math.floor(currentSquare / 100);
  const t = Math.floor(Math.sqrt(p));
  drawBalanceScale(p, t * (t + 1));
});

function drawBalanceScale(prefix, benchmark) {
  const dpr = window.devicePixelRatio || 1;
  const w = scaleCanvas.clientWidth, h = scaleCanvas.clientHeight;
  scaleCanvas.width = w * dpr; scaleCanvas.height = h * dpr;
  sCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  sCtx.clearRect(0, 0, w, h);

  const cx = w / 2, cy = h * 0.45;
  const beamLength = Math.min(w * 0.7, 280);

  sCtx.save();
  sCtx.translate(cx + panX, cy + panY);
  sCtx.scale(zoomScale, zoomScale);
  sCtx.rotate(tiltAngle);
  sCtx.translate(-cx, -cy);

  // Fulcrum Base
  sCtx.fillStyle = "#1e293b";
  sCtx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  sCtx.lineWidth = 2;
  sCtx.beginPath();
  sCtx.moveTo(cx, cy);
  sCtx.lineTo(cx - 25, cy + 65);
  sCtx.lineTo(cx + 25, cy + 65);
  sCtx.closePath();
  sCtx.fill();
  sCtx.stroke();

  // Fulcrum Pivot Pin
  sCtx.fillStyle = "#38bdf8";
  sCtx.beginPath();
  sCtx.arc(cx, cy, 6, 0, Math.PI * 2);
  sCtx.fill();

  // Rotating Beam
  sCtx.save();
  sCtx.translate(cx, cy);
  sCtx.rotate(currentTiltAngle);

  sCtx.strokeStyle = "#94a3b8";
  sCtx.lineWidth = 6;
  sCtx.lineCap = "round";
  sCtx.beginPath();
  sCtx.moveTo(-beamLength / 2, 0);
  sCtx.lineTo(beamLength / 2, 0);
  sCtx.stroke();

  sCtx.restore(); // Draw pans in world space to hang straight down

  const cosA = Math.cos(currentTiltAngle);
  const sinA = Math.sin(currentTiltAngle);

  const pLeftX = cx - (beamLength / 2) * cosA;
  const pLeftY = cy - (beamLength / 2) * sinA;
  const pRightX = cx + (beamLength / 2) * cosA;
  const pRightY = cy + (beamLength / 2) * sinA;

  function drawPan(x, y, label, subLabel, colorHex) {
    const stringLen = 45;
    sCtx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    sCtx.lineWidth = 1.5;
    sCtx.beginPath();
    sCtx.moveTo(x, y);
    sCtx.lineTo(x - 22, y + stringLen);
    sCtx.moveTo(x, y);
    sCtx.lineTo(x + 22, y + stringLen);
    sCtx.stroke();

    // Pan plate
    sCtx.strokeStyle = colorHex;
    sCtx.lineWidth = 3;
    sCtx.fillStyle = "rgba(15, 23, 42, 0.85)";
    sCtx.beginPath();
    sCtx.arc(x, y + stringLen, 26, 0, Math.PI);
    sCtx.closePath();
    sCtx.fill();
    sCtx.stroke();

    // Labels
    sCtx.fillStyle = "#ffffff";
    sCtx.font = "bold 13px monospace";
    sCtx.textAlign = "center";
    sCtx.fillText(label, x, y + stringLen - 6);

    sCtx.fillStyle = colorHex;
    sCtx.font = "bold 10px monospace";
    sCtx.fillText(subLabel, x, y + stringLen + 18);
  }

  drawPan(pLeftX, pLeftY, `${prefix}`, "PREFIX", "#38bdf8");
  drawPan(pRightX, pRightY, `${benchmark}`, "t(t+1)", "#f43f5e");

  sCtx.restore(); // restore scene transform
}

squareSelect.addEventListener("change", () => {
  audio.laser();
  calculateRoot();
});

document.querySelectorAll(".preset-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    squareSelect.value = chip.dataset.n;
    audio.laser();
    calculateRoot();
  });
});

window.addEventListener("resize", () => drawBalanceScale(Math.floor(currentSquare / 100), 56));
calculateRoot();

// --- AUTO-DEMO KIOSK MODE ---
const autoDemoBtn = document.getElementById("autoDemoBtn");
let demoTimer = null;
const demoList = [5776, 7921, 3136, 9604, 12544, 4096];
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
      squareSelect.value = demoList[demoIdx];
      audio.laser();
      calculateRoot();
    }, 5000);
  }
  audio.click();
});

[squareSelect, scaleCanvas].forEach(el => {
  el.addEventListener("pointerdown", () => {
    if (demoTimer) autoDemoBtn.click();
  });
});

// --- CHALLENGE: SQUARE ROOT DUEL ---
const challengeBtn = document.getElementById("challengeBtn");
const challengeModal = document.getElementById("challengeModal");
const closeChallenge = document.getElementById("closeChallenge");
const streakCount = document.getElementById("streakCount");
const timerVal = document.getElementById("timerVal");
const timerBar = document.getElementById("timerBar");
const targetPrompt = document.getElementById("targetPrompt");
const optionsGrid = document.getElementById("optionsGrid");
const quizFeedback = document.getElementById("quizFeedback");

let streak = 0, timeLeft = 20, quizTimer = null, correctRoot = 0;

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
  if (timerBar) timerBar.style.width = "100%";
  if (quizFeedback) quizFeedback.textContent = "";

  const rootOptions = [24, 36, 43, 54, 56, 64, 72, 76, 84, 86, 89, 98];
  correctRoot = rootOptions[Math.floor(Math.random() * rootOptions.length)];
  const square = correctRoot * correctRoot;
  targetPrompt.textContent = `√${square}`;

  // Generate 3 plausible distractors
  const candidateDeltas = [2, -2, 10, -10, 4, -4, 8, -8];
  const distSet = new Set();
  for (const d of candidateDeltas) {
    const cand = correctRoot + d;
    if (cand > 10 && cand !== correctRoot) distSet.add(cand);
    if (distSet.size >= 3) break;
  }
  let fallback = 6;
  while (distSet.size < 3) {
    distSet.add(correctRoot + fallback);
    fallback += 4;
  }

  const allOpts = [correctRoot, ...Array.from(distSet)].sort(() => Math.random() - 0.5);

  optionsGrid.innerHTML = "";
  allOpts.forEach((ans, idx) => {
    const btn = document.createElement("button");
    btn.className = "quiz-btn";
    btn.setAttribute("data-ans", ans);
    btn.innerHTML = `<span class="key-badge">${idx + 1}</span> ${ans}`;
    btn.addEventListener("click", () => handleQuizAnswer(ans, btn, square));
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
      handleQuizTimeout(square);
    }
  }, 1000);
}

function handleQuizAnswer(choice, btn, square) {
  clearInterval(quizTimer);
  const btns = optionsGrid.querySelectorAll(".quiz-btn");
  btns.forEach(b => b.disabled = true);

  if (choice === correctRoot) {
    btn.classList.add("correct");
    streak++;
    streakCount.textContent = streak;
    if (quizFeedback) quizFeedback.innerHTML = `<span class="fb-pass">&#10004; Correct! +1 Streak</span>`;
    audio.win();
    setTimeout(startNextQuiz, 900);
  } else {
    btn.classList.add("wrong");
    btns.forEach(b => {
      if (+b.getAttribute("data-ans") === correctRoot) b.classList.add("correct");
    });
    streak = 0;
    streakCount.textContent = streak;
    if (quizFeedback) quizFeedback.innerHTML = `<span class="fb-fail">&#10008; Incorrect! Answer was ${correctRoot}</span>`;
    audio.lose();
    setTimeout(startNextQuiz, 1500);
  }
}

function handleQuizTimeout(square) {
  streak = 0;
  streakCount.textContent = streak;
  const btns = optionsGrid.querySelectorAll(".quiz-btn");
  btns.forEach(b => {
    b.disabled = true;
    if (+b.getAttribute("data-ans") === correctRoot) b.classList.add("correct");
  });
  if (quizFeedback) quizFeedback.innerHTML = `<span class="fb-fail">&#9200; Time's up! √${square} = ${correctRoot}</span>`;
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
