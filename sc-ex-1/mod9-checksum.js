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
  zap() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(850, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.16);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.16);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.16);
    } catch (e) {}
  }
  alarm() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(320, this.ctx.currentTime);
      osc.frequency.setValueAtTime(260, this.ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.25);
    } catch (e) {}
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

// --- DIGITAL ROOT UTILITIES ---
function digitalRoot(n) {
  let val = Math.abs(n);
  while (val >= 10) {
    let sum = 0;
    while (val > 0) {
      sum += val % 10;
      val = Math.floor(val / 10);
    }
    val = sum;
  }
  return val;
}

// --- PARTICLE COLLIDER CANVAS ---
const cCvs = document.getElementById("colliderCanvas");
const cCtx = cCvs.getContext("2d");
const castNinesBtn = document.getElementById("castNinesBtn");
const resetColliderBtn = document.getElementById("resetColliderBtn");
const drResultBadge = document.getElementById("drResultBadge");

let colliderDigits = [5, 4, 9, 2, 7];
let orbs = [];
let sparks = [];

function initColliderOrbs() {
  orbs = [];
  sparks = [];
  const dpr = window.devicePixelRatio || 1;
  const w = cCvs.clientWidth, h = cCvs.clientHeight;
  const cx = w / 2, cy = h / 2;
  const ringR = Math.min(w, h) * 0.38;

  colliderDigits.forEach((digit, i) => {
    const angle = (i * Math.PI * 2) / colliderDigits.length - Math.PI / 2;
    orbs.push({
      digit,
      x: cx + Math.cos(angle) * (ringR * 0.7),
      y: cy + Math.sin(angle) * (ringR * 0.7),
      origX: cx + Math.cos(angle) * (ringR * 0.7),
      origY: cy + Math.sin(angle) * (ringR * 0.7),
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      r: 22,
      active: true,
      color: digit === 9 ? "#f43f5e" : "#a855f7"
    });
  });

  const fullNum = colliderDigits.join("");
  const dr = digitalRoot(+fullNum);
  drResultBadge.textContent = `dr(${fullNum}) = ${dr} (≡ ${dr % 9})`;
}

function castOutNinesAnimation() {
  audio.zap();
  const dpr = window.devicePixelRatio || 1;
  const cx = cCvs.clientWidth / 2, cy = cCvs.clientHeight / 2;

  // 1. Find single 9s
  orbs.forEach(orb => {
    if (orb.active && orb.digit === 9) {
      gsap.to(orb, {
        x: cx,
        y: cy,
        duration: 0.6,
        ease: "power2.in",
        onComplete: () => {
          orb.active = false;
          createSparks(cx, cy, "#f43f5e");
        }
      });
    }
  });

  // 2. Find pairs summing to 9
  const activeOrbs = orbs.filter(o => o.active && o.digit !== 9);
  const used = new Set();

  for (let i = 0; i < activeOrbs.length; i++) {
    if (used.has(i)) continue;
    for (let j = i + 1; j < activeOrbs.length; j++) {
      if (used.has(j)) continue;
      if (activeOrbs[i].digit + activeOrbs[j].digit === 9) {
        used.add(i);
        used.add(j);
        const o1 = activeOrbs[i];
        const o2 = activeOrbs[j];

        gsap.to([o1, o2], {
          x: cx,
          y: cy,
          duration: 0.7,
          ease: "power2.in",
          onComplete: () => {
            o1.active = false;
            o2.active = false;
            createSparks(cx, cy, "#a855f7");
          }
        });
        break;
      }
    }
  }
}

function createSparks(x, y, color) {
  for (let i = 0; i < 25; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 3.5;
    sparks.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 0.03 + Math.random() * 0.03,
      color
    });
  }
}

// --- MOUSE TRANSLATE, ORBIT/TILT & ZOOM CONTROLS ---
let isPointerDown = false, pointerButton = 0, prevX = 0, prevY = 0;
let panX = 0, panY = 0, zoomScale = 1, tiltAngle = 0;

cCvs.addEventListener("pointerdown", e => {
  isPointerDown = true;
  pointerButton = e.button;
  prevX = e.clientX;
  prevY = e.clientY;
  try { cCvs.setPointerCapture(e.pointerId); } catch(err) {}
});

cCvs.addEventListener("pointermove", e => {
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
});

cCvs.addEventListener("pointerup", e => {
  isPointerDown = false;
  try { cCvs.releasePointerCapture(e.pointerId); } catch(err) {}
});

cCvs.addEventListener("wheel", e => {
  e.preventDefault();
  const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
  zoomScale = Math.max(0.5, Math.min(3.0, zoomScale * zoomFactor));
}, { passive: false });

cCvs.addEventListener("dblclick", () => {
  panX = 0; panY = 0; zoomScale = 1; tiltAngle = 0;
});

function renderCollider() {
  const dpr = window.devicePixelRatio || 1;
  const w = cCvs.clientWidth, h = cCvs.clientHeight;
  cCvs.width = w * dpr; cCvs.height = h * dpr;
  cCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cCtx.clearRect(0, 0, w, h);

  const cx = w / 2, cy = h / 2;
  const ringR = Math.min(w, h) * 0.4;

  cCtx.save();
  cCtx.translate(cx + panX, cy + panY);
  cCtx.scale(zoomScale, zoomScale);
  cCtx.rotate(tiltAngle);
  cCtx.translate(-cx, -cy);

  // Collider Chamber Ring
  cCtx.strokeStyle = "rgba(168, 85, 247, 0.35)";
  cCtx.lineWidth = 3;
  cCtx.beginPath();
  cCtx.arc(cx, cy, ringR, 0, Math.PI * 2);
  cCtx.stroke();

  // Core Singularity Point
  cCtx.fillStyle = "#38bdf8";
  cCtx.shadowBlur = 10;
  cCtx.shadowColor = "#38bdf8";
  cCtx.beginPath();
  cCtx.arc(cx, cy, 4, 0, Math.PI * 2);
  cCtx.fill();

  // Draw Orbs
  orbs.forEach(orb => {
    if (!orb.active) return;
    cCtx.save();
    cCtx.fillStyle = "rgba(15, 23, 42, 0.9)";
    cCtx.strokeStyle = orb.color;
    cCtx.lineWidth = 2.5;
    cCtx.shadowBlur = 12;
    cCtx.shadowColor = orb.color;
    cCtx.beginPath();
    cCtx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
    cCtx.fill();
    cCtx.stroke();

    cCtx.fillStyle = "#ffffff";
    cCtx.font = "bold 18px monospace";
    cCtx.textAlign = "center";
    cCtx.textBaseline = "middle";
    cCtx.fillText(orb.digit, orb.x, orb.y);
    cCtx.restore();
  });

  // Draw Sparks
  sparks.forEach((s, idx) => {
    s.x += s.vx;
    s.y += s.vy;
    s.life -= s.decay;
    if (s.life <= 0) {
      sparks.splice(idx, 1);
      return;
    }
    cCtx.save();
    cCtx.globalAlpha = s.life;
    cCtx.fillStyle = s.color;
    cCtx.shadowBlur = 8;
    cCtx.shadowColor = s.color;
    cCtx.beginPath();
    cCtx.arc(s.x, s.y, 2.5, 0, Math.PI * 2);
    cCtx.fill();
    cCtx.restore();
  });

  cCtx.restore(); // restore scene transform
  requestAnimationFrame(renderCollider);
}

castNinesBtn.addEventListener("click", castOutNinesAnimation);
resetColliderBtn.addEventListener("click", () => {
  audio.click();
  initColliderOrbs();
});

// --- MULTIPLICATION CHECKSUM X-RAY SCANNER ---
const numAInput = document.getElementById("numA");
const numBInput = document.getElementById("numB");
const productDigits = document.getElementById("productDigits");
const drA = document.getElementById("drA");
const drB = document.getElementById("drB");
const expectedDR = document.getElementById("expectedDR");
const actualDR = document.getElementById("actualDR");
const verdictBanner = document.getElementById("verdictBanner");

let factorA = 487;
let factorB = 63;
let currentProductDigits = [];
let isTampered = false;

function updateScanner() {
  factorA = +numAInput.value;
  factorB = +numBInput.value;
  const trueProduct = factorA * factorB;

  // Initialize product digits if untampered
  if (!isTampered) {
    currentProductDigits = String(trueProduct).split("").map(Number);
  }

  // Render product digits
  productDigits.innerHTML = "";
  currentProductDigits.forEach((d, idx) => {
    const span = document.createElement("span");
    span.className = `tamper-digit ${isTampered ? 'corrupted' : ''}`;
    span.textContent = d;
    span.title = "Click to alter digit (Tamper Test)";
    span.addEventListener("click", () => tamperDigit(idx));
    productDigits.appendChild(span);
  });

  // Calculate Digital Roots
  const rA = digitalRoot(factorA);
  const rB = digitalRoot(factorB);
  const expRoot = (rA * rB) % 9;

  const currentDisplayNum = +currentProductDigits.join("");
  const actRoot = digitalRoot(currentDisplayNum) % 9;

  drA.textContent = `dr(${factorA}) = ${rA}`;
  drB.textContent = `dr(${factorB}) = ${rB}`;
  expectedDR.textContent = `${rA} × ${rB} = ${rA * rB} ≡ ${expRoot}`;
  actualDR.textContent = `dr(${currentDisplayNum}) ≡ ${actRoot}`;

  // Checksum comparison
  if (expRoot === actRoot) {
    verdictBanner.className = "verdict-banner pass";
    verdictBanner.innerHTML = "&#10004; CHECKSUM VERIFIED &bull; CALCULATION IS VALID";
  } else {
    audio.alarm();
    verdictBanner.className = "verdict-banner fail";
    verdictBanner.innerHTML = "&#9888; TAMPER DETECTED &bull; DIGIT CORRUPTED &bull; CHECKSUM FAILED!";
  }
}

function tamperDigit(index) {
  isTampered = true;
  // Corrupt digit by cycling
  currentProductDigits[index] = (currentProductDigits[index] + 1) % 10;
  audio.zap();
  updateScanner();
}

[numAInput, numBInput].forEach(el => {
  el.addEventListener("input", () => {
    isTampered = false;
    audio.click();
    updateScanner();
  });
});

document.querySelectorAll(".preset-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    numAInput.value = chip.dataset.a;
    numBInput.value = chip.dataset.b;
    isTampered = false;
    audio.click();
    updateScanner();
  });
});

window.addEventListener("resize", initColliderOrbs);
initColliderOrbs();
renderCollider();
updateScanner();

// --- AUTO-DEMO KIOSK MODE ---
const autoDemoBtn = document.getElementById("autoDemoBtn");
let demoTimer = null;
const demoPairs = [
  { a: 487, b: 63 },
  { a: 925, b: 418 },
  { a: 734, b: 29 },
  { a: 1234, b: 56 }
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
      demoIdx = (demoIdx + 1) % demoPairs.length;
      numAInput.value = demoPairs[demoIdx].a;
      numBInput.value = demoPairs[demoIdx].b;
      isTampered = false;
      updateScanner();
      castOutNinesBtn.click();
    }, 5500);
  }
  audio.click();
});

[numAInput, numBInput, cCvs].forEach(el => {
  el.addEventListener("pointerdown", () => {
    if (demoTimer) autoDemoBtn.click();
  });
});

// --- CHALLENGE: TAMPER DETECTIVE ---
const challengeBtn = document.getElementById("challengeBtn");
const challengeModal = document.getElementById("challengeModal");
const closeChallenge = document.getElementById("closeChallenge");
const streakCount = document.getElementById("streakCount");
const timerVal = document.getElementById("timerVal");
const timerBar = document.getElementById("timerBar");
const targetEquation = document.getElementById("targetEquation");
const btnValid = document.getElementById("btnValid");
const btnTampered = document.getElementById("btnTampered");
const quizFeedback = document.getElementById("quizFeedback");

let streak = 0, timeLeft = 20, quizTimer = null, isEquationTampered = false;

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

  btnValid.disabled = false;
  btnTampered.disabled = false;
  btnValid.classList.remove("correct", "wrong");
  btnTampered.classList.remove("correct", "wrong");

  const qA = Math.floor(Math.random() * 800) + 120;
  const qB = Math.floor(Math.random() * 80) + 12;
  const trueProd = qA * qB;

  // 50% chance of tampering
  isEquationTampered = Math.random() > 0.5;
  let displayedProd = trueProd;
  if (isEquationTampered) {
    const delta = (Math.floor(Math.random() * 5) + 1) * (Math.random() > 0.5 ? 1 : -1);
    displayedProd = trueProd + (delta % 9 === 0 ? 1 : delta);
  }

  targetEquation.textContent = `${qA} × ${qB} = ${displayedProd.toLocaleString()}`;

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

btnValid.addEventListener("click", () => checkDetectAnswer(false, btnValid));
btnTampered.addEventListener("click", () => checkDetectAnswer(true, btnTampered));

function checkDetectAnswer(userGuessTampered, btn) {
  clearInterval(quizTimer);
  btnValid.disabled = true;
  btnTampered.disabled = true;

  if (userGuessTampered === isEquationTampered) {
    btn.classList.add("correct");
    audio.win();
    streak++;
    streakCount.textContent = streak;
    if (quizFeedback) quizFeedback.innerHTML = `<span class="fb-pass">&#10004; Correct! You caught it! +1 Streak</span>`;
    setTimeout(startNextQuiz, 900);
  } else {
    btn.classList.add("wrong");
    const rightBtn = isEquationTampered ? btnTampered : btnValid;
    rightBtn.classList.add("correct");
    audio.lose();
    streak = 0;
    streakCount.textContent = streak;
    if (quizFeedback) quizFeedback.innerHTML = `<span class="fb-fail">&#10008; Incorrect! Equation was actually ${isEquationTampered ? 'TAMPERED' : 'VALID'}</span>`;
    setTimeout(startNextQuiz, 1500);
  }
}

function handleQuizTimeout() {
  streak = 0;
  streakCount.textContent = streak;
  btnValid.disabled = true;
  btnTampered.disabled = true;
  const rightBtn = isEquationTampered ? btnTampered : btnValid;
  rightBtn.classList.add("correct");
  audio.lose();
  if (quizFeedback) quizFeedback.innerHTML = `<span class="fb-fail">&#9200; Time's up! Calculation was ${isEquationTampered ? 'TAMPERED' : 'VALID'}</span>`;
  setTimeout(startNextQuiz, 1500);
}

// Keyboard shortcuts (1, 2, Esc)
window.addEventListener("keydown", e => {
  if (challengeModal.style.display !== "grid") return;
  if (e.key === "1" && !btnValid.disabled) btnValid.click();
  if (e.key === "2" && !btnTampered.disabled) btnTampered.click();
  if (e.key === "Escape") closeChallenge.click();
});
