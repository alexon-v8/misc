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
  flow() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(320, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(560, this.ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.18);
    } catch(e) {}
  }
  win() {
    [440, 554.37, 659.25, 880].forEach((f, i) => {
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

// --- STATE & DOM ---
const nSlider = document.getElementById("nSlider");
const nValDisplay = document.getElementById("nValDisplay");
const approxBadge = document.getElementById("approxBadge");
const mOrder1 = document.getElementById("mOrder1");
const mErr1 = document.getElementById("mErr1");
const mOrder2 = document.getElementById("mOrder2");
const mErr2 = document.getElementById("mErr2");
const mTrue = document.getElementById("mTrue");
const cornerText = document.getElementById("cornerText");

const lCvs = document.getElementById("liquidCanvas");
const lCtx = lCvs.getContext("2d");
const cCvs = document.getElementById("curveCanvas");
const cCtx = cCvs.getContext("2d");

let N = 67;

function findClosestBase(num) {
  let a = Math.round(Math.sqrt(num));
  let d = num - a * a;
  return { a, d };
}

function updateSimulation() {
  N = +nSlider.value;
  nValDisplay.textContent = N;

  const { a, d } = findClosestBase(N);
  const stripW = d / (2 * a);
  const x1 = a + stripW;
  const x2 = 0.5 * (x1 + N / x1);
  const trueVal = Math.sqrt(N);

  const err1 = Math.abs(x1 - trueVal) / trueVal * 100;
  const err2 = Math.abs(x2 - trueVal) / trueVal * 100;
  const cornerArea = Math.pow(Math.abs(stripW), 2);

  approxBadge.textContent = `√${N} ≈ ${x1.toFixed(4)}`;
  mOrder1.textContent = x1.toFixed(6);
  mErr1.textContent = `Error: ${err1 >= 0.0001 ? err1.toFixed(4) : '<0.0001'}%`;

  mOrder2.textContent = x2.toFixed(6);
  mErr2.textContent = `Error: ${err2 >= 0.000001 ? err2.toFixed(6) : '<0.000001'}%`;

  mTrue.textContent = `${trueVal.toFixed(9)}...`;

  cornerText.innerHTML = `
    Because the two border strips of width <strong>|d|/(2a) = ${Math.abs(d)}/${2*a} = ${Math.abs(stripW).toFixed(4)}</strong> meet at the corner, a tiny square of area <strong>(|d|/2a)² = ${cornerArea.toFixed(5)}</strong> is ${d >= 0 ? 'over-counted' : 'under-counted'}! Correcting it gives Newton's 2nd order precision.
  `;

  drawLiquidScene(a, d, stripW);
  drawCurve(N, a, x1, trueVal);
}

// 2D Liquid Border Canvas
function drawLiquidScene(a, d, stripW) {
  const dpr = window.devicePixelRatio || 1;
  const w = lCvs.clientWidth, h = lCvs.clientHeight;
  lCvs.width = w * dpr; lCvs.height = h * dpr;
  lCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  lCtx.clearRect(0, 0, w, h);

  const cx = w * 0.42, cy = h * 0.55;
  const scale = Math.min(w, h) * 0.016;

  const baseSize = Math.max(50, a * 12) * (scale / 10);
  const borderThick = Math.min(baseSize * 0.35, Math.max(10, Math.abs(stripW) * 45 * (scale / 10)));

  const bx = cx - baseSize / 2;
  const by = cy - baseSize / 2;

  // 1. Base Square a x a
  lCtx.fillStyle = "rgba(15, 23, 42, 0.9)";
  lCtx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  lCtx.lineWidth = 2;
  lCtx.fillRect(bx, by, baseSize, baseSize);
  lCtx.strokeRect(bx, by, baseSize, baseSize);

  lCtx.fillStyle = "#e2e8f0";
  lCtx.font = "bold 13px monospace";
  lCtx.textAlign = "center";
  lCtx.fillText(`Base Square: a² = ${a}² = ${a*a}`, bx + baseSize / 2, by + baseSize / 2 + 5);

  // 2. Liquid Strips
  const isSurplus = d >= 0;
  const liquidColor = isSurplus ? "rgba(245, 158, 11, 0.3)" : "rgba(56, 189, 248, 0.25)";
  const liquidStroke = isSurplus ? "#f59e0b" : "#38bdf8";

  // Top Strip: baseSize x borderThick
  lCtx.fillStyle = liquidColor;
  lCtx.strokeStyle = liquidStroke;
  lCtx.lineWidth = 2;
  const topY = isSurplus ? by - borderThick : by;
  lCtx.fillRect(bx, topY, baseSize, borderThick);
  lCtx.strokeRect(bx, topY, baseSize, borderThick);

  // Right Strip: borderThick x baseSize
  const rightX = isSurplus ? bx + baseSize : bx + baseSize - borderThick;
  lCtx.fillRect(rightX, by, borderThick, baseSize);
  lCtx.strokeRect(rightX, by, borderThick, baseSize);

  // Labels for strips
  lCtx.fillStyle = liquidStroke;
  lCtx.font = "bold 11px monospace";
  lCtx.fillText(`Strip width = |d|/(2a) = ${Math.abs(stripW).toFixed(3)}`, bx + baseSize / 2, topY - 8);

  // 3. Flashing Overlap Corner Square
  const cornerX = isSurplus ? bx + baseSize : bx + baseSize - borderThick;
  const cornerY = isSurplus ? by - borderThick : by;

  lCtx.save();
  lCtx.fillStyle = "rgba(244, 63, 94, 0.4)";
  lCtx.strokeStyle = "#f43f5e";
  lCtx.lineWidth = 2;
  lCtx.shadowBlur = 12;
  lCtx.shadowColor = "#f43f5e";
  lCtx.fillRect(cornerX, cornerY, borderThick, borderThick);
  lCtx.strokeRect(cornerX, cornerY, borderThick, borderThick);

  // Draw magnifying glass circle pointing to corner
  const magX = w * 0.85, magY = h * 0.28, magR = 38;
  lCtx.strokeStyle = "#f43f5e";
  lCtx.lineWidth = 3;
  lCtx.fillStyle = "rgba(15, 23, 42, 0.95)";
  lCtx.beginPath();
  lCtx.arc(magX, magY, magR, 0, Math.PI * 2);
  lCtx.fill();
  lCtx.stroke();

  // Pointer dotted line
  lCtx.setLineDash([3, 3]);
  lCtx.beginPath();
  lCtx.moveTo(cornerX + borderThick / 2, cornerY + borderThick / 2);
  lCtx.lineTo(magX - magR, magY);
  lCtx.stroke();
  lCtx.setLineDash([]);

  // Magnified detail in circle
  lCtx.fillStyle = "rgba(244, 63, 94, 0.5)";
  lCtx.fillRect(magX - 16, magY - 16, 32, 32);
  lCtx.strokeStyle = "#f43f5e";
  lCtx.strokeRect(magX - 16, magY - 16, 32, 32);

  lCtx.fillStyle = "#fff";
  lCtx.font = "bold 9px monospace";
  lCtx.fillText("(d/2a)²", magX, magY + 3);
  lCtx.fillStyle = "#f43f5e";
  lCtx.fillText("CORNER GAP", magX, magY + magR + 14);
  lCtx.restore();
}

// Tangent Curve Canvas Plot
function drawCurve(N, a, x1, trueVal) {
  const dpr = window.devicePixelRatio || 1;
  const w = cCvs.clientWidth, h = cCvs.clientHeight;
  cCvs.width = w * dpr; cCvs.height = h * dpr;
  cCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cCtx.clearRect(0, 0, w, h);

  const xMin = Math.max(0, trueVal - 3);
  const xMax = trueVal + 3;
  const yMin = -20;
  const yMax = 40;

  function toPx(x, y) {
    const px = ((x - xMin) / (xMax - xMin)) * w;
    const py = h - ((y - yMin) / (yMax - yMin)) * h;
    return [px, py];
  }

  // Draw Axes
  const [ox, oy] = toPx(0, 0);
  cCtx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  cCtx.lineWidth = 1;
  cCtx.beginPath();
  cCtx.moveTo(0, oy); cCtx.lineTo(w, oy); // X-axis
  cCtx.stroke();

  // Plot f(x) = x^2 - N
  cCtx.strokeStyle = "#38bdf8";
  cCtx.lineWidth = 2.5;
  cCtx.beginPath();
  for (let px = 0; px <= w; px += 2) {
    const x = xMin + (px / w) * (xMax - xMin);
    const y = x * x - N;
    const [_, py] = toPx(x, y);
    if (px === 0) cCtx.moveTo(px, py);
    else cCtx.lineTo(px, py);
  }
  cCtx.stroke();

  // Root point (√N, 0)
  const [rx, ry] = toPx(trueVal, 0);
  cCtx.fillStyle = "#4ade80";
  cCtx.beginPath(); cCtx.arc(rx, ry, 5, 0, Math.PI * 2); cCtx.fill();

  // Point (a, f(a)) and Tangent Line
  const fa = a * a - N;
  const [ax, ay] = toPx(a, fa);
  cCtx.fillStyle = "#f59e0b";
  cCtx.beginPath(); cCtx.arc(ax, ay, 5, 0, Math.PI * 2); cCtx.fill();

  // Tangent line to (x1, 0)
  const [t1x, t1y] = toPx(x1, 0);
  cCtx.strokeStyle = "#f43f5e";
  cCtx.lineWidth = 2;
  cCtx.beginPath();
  cCtx.moveTo(ax, ay);
  cCtx.lineTo(t1x, t1y);
  cCtx.stroke();

  // Mark x1 on axis
  cCtx.fillStyle = "#f43f5e";
  cCtx.beginPath(); cCtx.arc(t1x, t1y, 4, 0, Math.PI * 2); cCtx.fill();

  // Text labels
  cCtx.fillStyle = "#e2e8f0";
  cCtx.font = "bold 10px monospace";
  cCtx.fillText(`√N=${trueVal.toFixed(2)}`, rx - 10, ry + 16);
  cCtx.fillStyle = "#f43f5e";
  cCtx.fillText(`x₁=${x1.toFixed(2)}`, t1x - 10, t1y - 8);
}

nSlider.addEventListener("input", () => {
  audio.flow();
  updateSimulation();
});

document.querySelectorAll(".preset-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    nSlider.value = chip.dataset.n;
    audio.flow();
    updateSimulation();
  });
});

window.addEventListener("resize", updateSimulation);
updateSimulation();

// --- AUTO-DEMO KIOSK MODE ---
const autoDemoBtn = document.getElementById("autoDemoBtn");
let demoTimer = null;
const demoList = [67, 29, 105, 10, 83, 50];
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
      nSlider.value = demoList[demoIdx];
      audio.flow();
      updateSimulation();
    }, 4500);
  }
  audio.click();
});

[nSlider, lCvs].forEach(el => {
  el.addEventListener("pointerdown", () => {
    if (demoTimer) autoDemoBtn.click();
  });
});

// --- CHALLENGE: ROOT ESTIMATOR ---
const challengeBtn = document.getElementById("challengeBtn");
const challengeModal = document.getElementById("challengeModal");
const closeChallenge = document.getElementById("closeChallenge");
const streakCount = document.getElementById("streakCount");
const timerVal = document.getElementById("timerVal");
const targetPrompt = document.getElementById("targetPrompt");
const optionsGrid = document.getElementById("optionsGrid");

let streak = 0, timeLeft = 20, quizTimer = null, currentApprox = 0;

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

  const candidates = [17, 26, 37, 50, 65, 82, 101, 38, 28, 83];
  const qN = candidates[Math.floor(Math.random() * candidates.length)];
  targetPrompt.textContent = `√${qN}`;

  const { a, d } = findClosestBase(qN);
  const correct = a + d / (2 * a);
  currentApprox = correct;

  const opts = new Set([correct.toFixed(3)]);
  while (opts.size < 4) {
    const fake = correct + (Math.floor(Math.random() * 5) - 2) * 0.12;
    opts.add(fake.toFixed(3));
  }
  const shuffled = Array.from(opts).sort(() => Math.random() - 0.5);

  optionsGrid.innerHTML = "";
  shuffled.forEach(ans => {
    const btn = document.createElement("button");
    btn.className = "quiz-btn";
    btn.textContent = ans;
    btn.addEventListener("click", () => checkQuiz(+ans));
    optionsGrid.appendChild(btn);
  });

  quizTimer = setInterval(() => {
    timeLeft--;
    timerVal.textContent = timeLeft + "s";
    if (timeLeft <= 0) {
      clearInterval(quizTimer);
      audio.lose();
      alert(`Time up! √${qN} ≈ ${correct.toFixed(3)}`);
      startNextQuiz();
    }
  }, 1000);
}

function checkQuiz(choice) {
  clearInterval(quizTimer);
  if (Math.abs(choice - currentApprox) < 0.005) {
    audio.win();
    streak++;
    streakCount.textContent = streak;
    optionsGrid.innerHTML = `<div style="grid-column: 1/-1; color: #4ade80; font-weight: bold; font-size: 1.15rem; text-align: center;">Correct! +1 Streak</div>`;
    setTimeout(startNextQuiz, 900);
  } else {
    audio.lose();
    optionsGrid.innerHTML = `<div style="grid-column: 1/-1; color: #f43f5e; font-weight: bold; font-size: 1.15rem; text-align: center;">Incorrect! Answer was ${currentApprox.toFixed(3)}</div>`;
    streak = 0;
    streakCount.textContent = streak;
    setTimeout(startNextQuiz, 1400);
  }
}
