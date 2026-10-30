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

// 2D Balance Scale Canvas
function drawBalanceScale(prefix, benchmark) {
  const dpr = window.devicePixelRatio || 1;
  const w = scaleCanvas.clientWidth, h = scaleCanvas.clientHeight;
  scaleCanvas.width = w * dpr; scaleCanvas.height = h * dpr;
  sCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  sCtx.clearRect(0, 0, w, h);

  const cx = w / 2, cy = h * 0.45;
  const beamLength = Math.min(w * 0.7, 280);

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

  const leftX = -beamLength / 2;
  const rightX = beamLength / 2;

  // Hanging Pan Strings
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
const targetPrompt = document.getElementById("targetPrompt");
const optionsGrid = document.getElementById("optionsGrid");

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

  const rootOptions = [24, 36, 43, 54, 56, 64, 72, 76, 84, 86, 89, 98];
  correctRoot = rootOptions[Math.floor(Math.random() * rootOptions.length)];
  const square = correctRoot * correctRoot;
  targetPrompt.textContent = `√${square}`;

  const opts = new Set([correctRoot]);
  while (opts.size < 4) {
    const fake = correctRoot + (Math.floor(Math.random() * 5) - 2) * 2;
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
      alert(`Time up! √${square} = ${correctRoot}`);
      startNextQuiz();
    }
  }, 1000);
}

function checkQuiz(choice) {
  clearInterval(quizTimer);
  if (choice === correctRoot) {
    audio.win();
    streak++;
    streakCount.textContent = streak;
    optionsGrid.innerHTML = `<div style="grid-column: 1/-1; color: #4ade80; font-weight: bold; font-size: 1.15rem; text-align: center;">Correct! +1 Streak</div>`;
    setTimeout(startNextQuiz, 900);
  } else {
    audio.lose();
    optionsGrid.innerHTML = `<div style="grid-column: 1/-1; color: #f43f5e; font-weight: bold; font-size: 1.15rem; text-align: center;">Incorrect! Answer was ${correctRoot}</div>`;
    streak = 0;
    streakCount.textContent = streak;
    setTimeout(startNextQuiz, 1400);
  }
}
