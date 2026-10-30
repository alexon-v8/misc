// --- AUDIO SYNTHESIS ENGINE (Web Audio API) ---
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
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem("sc_ex_muted", this.muted);
    return this.muted;
  }

  playTone(freq, type = "sine", duration = 0.1, gainVal = 0.15) {
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
    } catch (e) {
      // Audio fallback safety
    }
  }

  click() { this.playTone(800, "triangle", 0.05, 0.08); }
  hover() { this.playTone(520, "sine", 0.04, 0.04); }
  launch() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [440, 554.37, 659.25, 880].forEach((f, idx) => {
        setTimeout(() => this.playTone(f, "sine", 0.2, 0.12), idx * 45);
      });
    } catch(e) {}
  }
}

const audio = new SoundEngine();

// --- MODULE CATALOGUE ---
const MODULES = [
  {
    id: "01",
    file: "mirror-clock.html",
    title: "3D Mirror Clock & Hand Angles",
    desc: "Interactive 3D analog clock facing a glowing mirror with vertical & horizontal water reflection axes, 3D laser symmetry rays, and live |30H - 5.5M| protractor.",
    formula: "θ = |30H − 5.5M|",
    category: "geometry",
    accent: "#38bdf8",
    glow: "rgba(56, 189, 248, 0.35)",
    tech: "3D WebGL (Three.js) + Canvas",
    tags: ["Reflection Symmetry", "11:60 Subtraction", "Angle Protractor"],
    type: "clock"
  },
  {
    id: "02",
    file: "calendar-mod7.html",
    title: "Calendar Modulo-7 Arithmetic",
    desc: "Rotating 3D Heptagonal Time Gear and Mod-7 Remainder Vaporizer Funnel that deconstructs any calendar date into leap offsets and strikes out multiples of 7.",
    formula: "Day = (C + Y + ⌊Y/4⌋ + M + D) mod 7",
    category: "modular",
    accent: "#a855f7",
    glow: "rgba(168, 85, 247, 0.35)",
    tech: "3D Heptagonal Prism + Particles",
    tags: ["Time Gear", "Vaporizer Funnel", "Century Codes"],
    type: "calendar"
  },
  {
    id: "03",
    file: "squaring-shortcut.html",
    title: "Squaring Shortcut: (a+d)(a-d) + d²",
    desc: "Dynamic geometric algebra transformation where slicing an a×a square glides a strip around to form an (a+d)(a-d) rectangle plus a d² corner square.",
    formula: "a² = (a + d)(a − d) + d²",
    category: "vedic",
    accent: "#4ade80",
    glow: "rgba(74, 222, 128, 0.35)",
    tech: "Interactive 2D Canvas Morph",
    tags: ["Vedic Algebra", "Geometric Slicing", "Mental Math"],
    type: "squaring"
  },
  {
    id: "04",
    file: "sqrt-perfect.html",
    title: "Perfect Square Roots (√N)",
    desc: "High-tech laser digit-splitter, unit-digit cycle wheel, and animated mechanical balance scale comparing prefix vs t(t+1) to solve roots in seconds.",
    formula: "√N: Split [Prefix | Last 2] & Compare t(t+1)",
    category: "vedic",
    accent: "#f43f5e",
    glow: "rgba(244, 63, 94, 0.35)",
    tech: "Canvas Splitter & Balance Scale",
    tags: ["Balance Scale", "Laser Splitter", "Square Root Duel"],
    type: "sqrt"
  },
  {
    id: "05",
    file: "newton-sqrt.html",
    title: "Newton-Raphson Imperfect Square Roots",
    desc: "Visualizing √N ≈ a + d/(2a) via 'Liquid Border Geometry' where surplus area flows along two edges with a zoom magnifier highlighting the corner error (d/2a)².",
    formula: "√N ≈ a + d/(2a) − (d/2a)² / (2a)",
    category: "calculus",
    accent: "#f59e0b",
    glow: "rgba(245, 158, 11, 0.35)",
    tech: "Liquid Canvas + Tangent Curve",
    tags: ["Liquid Border", "Tangent Iteration", "Corner Error"],
    type: "newton"
  },
  {
    id: "06",
    file: "cbrt-perfect.html",
    title: "Perfect Cube Roots (∛N)",
    desc: "Exploding 3D Voxel Cube illustrating (10a + b)³ expansion blocks, coupled with the unique 2↔8 and 3↔7 Unit Digit Flip Gate and cube staircase bracket.",
    formula: "(10a + b)³ = 1000a³ + 300a²b + 30ab² + b³",
    category: "vedic",
    accent: "#38bdf8",
    glow: "rgba(56, 189, 248, 0.35)",
    tech: "3D Exploding Voxels (Three.js)",
    tags: ["3D Voxel Cube", "Flip Gate (2↔8, 3↔7)", "Staircase Lookup"],
    type: "cbrt"
  },
  {
    id: "07",
    file: "rule-72-110.html",
    title: "Bio-Growth Rule of 72 & 110",
    desc: "Interactive Petri dish cellular automata of bacterial binary fission, algae blooms, and 72-factor pie chart slicer showing why biology and finance rely on 72 & 110.",
    formula: "t_double ≈ 72 / r%  |  t_triple ≈ 110 / r%",
    category: "calculus",
    accent: "#4ade80",
    glow: "rgba(74, 222, 128, 0.35)",
    tech: "Petri Dish Simulator + Exponential Curve",
    tags: ["Binary Fission", "12 Divisors of 72", "Doubling Time"],
    type: "bio"
  },
  {
    id: "08",
    file: "mod9-checksum.html",
    title: "Mod-9 Digital Roots & Checksums",
    desc: "Base-10 laser slicer, 'Casting Out Nines' particle collider where digits summing to 9 annihilate, and Multiplication Checksum X-Ray scanner catching tampered digits.",
    formula: "dr(A × B) ≡ dr(A) × dr(B) (mod 9)",
    category: "modular",
    accent: "#a855f7",
    glow: "rgba(168, 85, 247, 0.35)",
    tech: "Particle Collider + Tamper Scanner",
    tags: ["Casting Out 9s", "Digit Annihilator", "Tamper Detective"],
    type: "mod9"
  }
];

// --- RENDER ARCADE GRID ---
const arcadeGrid = document.getElementById("arcadeGrid");

function renderGrid(modulesToRender) {
  arcadeGrid.innerHTML = "";
  if (modulesToRender.length === 0) {
    arcadeGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #94a3b8; font-family: var(--font-mono);">
        No simulation modules matched your search query. Try typing 'clock', 'modulo', or 'roots'.
      </div>
    `;
    return;
  }

  modulesToRender.forEach(mod => {
    const card = document.createElement("a");
    card.href = mod.file;
    card.className = "card";
    card.style.setProperty("--card-accent", mod.accent);
    card.style.setProperty("--card-glow", mod.glow);
    card.setAttribute("data-id", mod.id);

    card.innerHTML = `
      <div class="card-top">
        <span class="card-num">MODULE ${mod.id}</span>
        <span class="card-tech">${mod.tech}</span>
      </div>
      <div class="card-visual">
        <canvas id="thumb_${mod.id}"></canvas>
      </div>
      <div class="card-body">
        <h3>${mod.title}</h3>
        <p>${mod.desc}</p>
        <span class="formula-tag">${mod.formula}</span>
      </div>
      <div class="card-footer">
        <div class="tags">
          ${mod.tags.map(t => `<span class="tag">#${t}</span>`).join("")}
        </div>
        <span class="launch-btn">Explore &rarr;</span>
      </div>
    `;

    card.addEventListener("mouseenter", () => audio.hover());
    card.addEventListener("click", () => audio.launch());

    arcadeGrid.appendChild(card);
    initThumbnail(mod);
  });
}

// --- MINI THUMBNAIL CANVAS VISUALS ---
function initThumbnail(mod) {
  setTimeout(() => {
    const cvs = document.getElementById(`thumb_${mod.id}`);
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    const w = (cvs.width = cvs.clientWidth * (window.devicePixelRatio || 1));
    const h = (cvs.height = cvs.clientHeight * (window.devicePixelRatio || 1));
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    const rw = cvs.clientWidth, rh = cvs.clientHeight;

    // Draw unique mini-graphics for each card
    ctx.clearRect(0, 0, rw, rh);
    const cx = rw / 2, cy = rh / 2;

    if (mod.type === "clock") {
      // Dual clock dials with mirror line
      ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx - 36, cy, 26, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = "rgba(168, 85, 247, 0.4)";
      ctx.beginPath(); ctx.arc(cx + 36, cy, 26, 0, Math.PI * 2); ctx.stroke();
      // Mirror divider
      ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(cx, 15); ctx.lineTo(cx, rh - 15); ctx.stroke();
      ctx.setLineDash([]);
      // Hands
      ctx.strokeStyle = "#f43f5e"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx - 36, cy); ctx.lineTo(cx - 36, cy - 18); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + 36, cy); ctx.lineTo(cx + 36, cy - 18); ctx.stroke();
    } else if (mod.type === "calendar") {
      // Heptagon outline
      ctx.strokeStyle = mod.accent; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 7; i++) {
        const a = (i * Math.PI * 2) / 7 - Math.PI / 2;
        const x = cx + Math.cos(a) * 32, y = cy + Math.sin(a) * 32;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.font = "bold 13px monospace"; ctx.textAlign = "center";
      ctx.fillText("MOD 7", cx, cy + 4);
    } else if (mod.type === "squaring") {
      // Big square morphed into rectangle + small d^2 corner
      ctx.strokeStyle = mod.accent; ctx.lineWidth = 2;
      ctx.strokeRect(cx - 45, cy - 25, 60, 50);
      ctx.fillStyle = "rgba(74, 222, 128, 0.15)";
      ctx.fillRect(cx - 45, cy - 25, 60, 50);
      ctx.strokeStyle = "#f43f5e";
      ctx.strokeRect(cx + 18, cy - 25, 25, 25);
      ctx.fillStyle = "rgba(244, 63, 94, 0.25)";
      ctx.fillRect(cx + 18, cy - 25, 25, 25);
    } else if (mod.type === "sqrt") {
      // Split digits and balance scale
      ctx.fillStyle = "#f43f5e"; ctx.font = "bold 16px monospace"; ctx.textAlign = "center";
      ctx.fillText("57 | 76", cx, cy - 12);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx - 35, cy + 18); ctx.lineTo(cx + 35, cy + 14); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy + 6); ctx.lineTo(cx, cy + 28); ctx.stroke();
    } else if (mod.type === "newton") {
      // Liquid border with corner highlight
      ctx.strokeStyle = mod.accent; ctx.lineWidth = 2;
      ctx.strokeRect(cx - 28, cy - 28, 44, 44);
      ctx.fillStyle = "rgba(245, 158, 11, 0.2)";
      ctx.fillRect(cx - 28, cy - 28, 44, 44);
      // Liquid strips
      ctx.fillStyle = "rgba(56, 189, 248, 0.4)";
      ctx.fillRect(cx - 28, cy - 35, 44, 6);
      ctx.fillRect(cx + 17, cy - 28, 6, 44);
      // Corner error
      ctx.fillStyle = "#f43f5e";
      ctx.fillRect(cx + 17, cy - 35, 6, 6);
    } else if (mod.type === "cbrt") {
      // 3D wire cube
      ctx.strokeStyle = mod.accent; ctx.lineWidth = 2;
      ctx.strokeRect(cx - 20, cy - 14, 30, 30);
      ctx.strokeRect(cx - 10, cy - 24, 30, 30);
      ctx.beginPath();
      ctx.moveTo(cx - 20, cy - 14); ctx.lineTo(cx - 10, cy - 24);
      ctx.moveTo(cx + 10, cy - 14); ctx.lineTo(cx + 20, cy - 24);
      ctx.moveTo(cx - 20, cy + 16); ctx.lineTo(cx - 10, cy + 6);
      ctx.moveTo(cx + 10, cy + 16); ctx.lineTo(cx + 20, cy + 6);
      ctx.stroke();
    } else if (mod.type === "bio") {
      // Petri dish with multiplying cells
      ctx.strokeStyle = mod.accent; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, 32, 0, Math.PI * 2); ctx.stroke();
      const cells = [[cx - 8, cy - 6], [cx + 8, cy - 6], [cx - 6, cy + 10], [cx + 10, cy + 8]];
      ctx.fillStyle = "#4ade80";
      cells.forEach(([x, y]) => {
        ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
      });
    } else if (mod.type === "mod9") {
      // Collider rings & sparks
      ctx.strokeStyle = mod.accent; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, 28, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "#38bdf8"; ctx.font = "bold 13px monospace"; ctx.textAlign = "center";
      ctx.fillText("4 ⊕ 5", cx, cy - 4);
      ctx.fillStyle = "#f43f5e"; ctx.font = "bold 11px monospace";
      ctx.fillText("&rarr; 0", cx, cy + 12);
    }
  }, 50);
}

// --- SEARCH & FILTER LOGIC ---
const searchInput = document.getElementById("searchInput");
const clearBtn = document.getElementById("clearSearch");
const filterPills = document.querySelectorAll(".filter-pill");

let currentCategory = "all";
let searchQuery = "";

function applyFilters() {
  const q = searchQuery.toLowerCase().trim();
  const filtered = MODULES.filter(mod => {
    const matchCat = currentCategory === "all" || mod.category === currentCategory;
    const matchSearch =
      !q ||
      mod.title.toLowerCase().includes(q) ||
      mod.desc.toLowerCase().includes(q) ||
      mod.formula.toLowerCase().includes(q) ||
      mod.tags.some(t => t.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });
  renderGrid(filtered);
}

searchInput.addEventListener("input", e => {
  searchQuery = e.target.value;
  clearBtn.style.display = searchQuery ? "block" : "none";
  applyFilters();
});

clearBtn.addEventListener("click", () => {
  searchInput.value = "";
  searchQuery = "";
  clearBtn.style.display = "none";
  audio.click();
  applyFilters();
});

filterPills.forEach(pill => {
  pill.addEventListener("click", () => {
    filterPills.forEach(p => p.classList.remove("active"));
    pill.classList.add("active");
    currentCategory = pill.getAttribute("data-filter");
    audio.click();
    applyFilters();
  });
});

// --- SOUND TOGGLE ---
const soundToggle = document.getElementById("soundToggle");
const soundLabel = document.getElementById("soundLabel");

function updateSoundUI() {
  if (audio.muted) {
    soundLabel.textContent = "Audio: OFF";
    soundToggle.style.opacity = "0.6";
  } else {
    soundLabel.textContent = "Audio: ON";
    soundToggle.style.opacity = "1";
  }
}

soundToggle.addEventListener("click", () => {
  const isMuted = audio.toggleMute();
  updateSoundUI();
  if (!isMuted) audio.click();
});
updateSoundUI();

// --- EXHIBITION KIOSK AUTO-TOUR ---
const kioskBtn = document.getElementById("kioskTourBtn");
let kioskInterval = null;
let kioskIndex = 0;

kioskBtn.addEventListener("click", () => {
  audio.launch();
  if (kioskInterval) {
    clearInterval(kioskInterval);
    kioskInterval = null;
    kioskBtn.querySelector("span:last-child").textContent = "Kiosk Auto-Tour";
    document.querySelectorAll(".card").forEach(c => c.style.borderColor = "");
    return;
  }

  kioskBtn.querySelector("span:last-child").textContent = "Stop Auto-Tour";
  const cards = document.querySelectorAll(".card");
  if (!cards.length) return;

  kioskIndex = 0;
  highlightCard(cards[kioskIndex]);

  kioskInterval = setInterval(() => {
    kioskIndex = (kioskIndex + 1) % cards.length;
    highlightCard(cards[kioskIndex]);
  }, 3500);
});

function highlightCard(card) {
  document.querySelectorAll(".card").forEach(c => {
    c.style.transform = "";
    c.style.boxShadow = "";
  });
  if (card) {
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.style.transform = "translateY(-10px) scale(1.03)";
    card.style.boxShadow = "0 0 35px var(--card-glow, rgba(56, 189, 248, 0.6))";
    audio.click();
  }
}

// --- FLOATING MATH SYMBOLS BACKGROUND CANVAS ---
const bgCanvas = document.getElementById("particleCanvas");
const bgCtx = bgCanvas.getContext("2d");
let pWidth, pHeight;
const symbols = ["∑", "π", "√", "∫", "≈", "mod 7", "x²", "Δ", "∛", "λ", "∞", "θ", "d²", "8↔2", "72", "99+1"];
let particles = [];

function resizeParticles() {
  pWidth = bgCanvas.width = window.innerWidth;
  pHeight = bgCanvas.height = window.innerHeight;
  particles = [];
  const count = Math.floor((pWidth * pHeight) / 18000);
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * pWidth,
      y: Math.random() * pHeight,
      sym: symbols[Math.floor(Math.random() * symbols.length)],
      size: 14 + Math.random() * 20,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      alpha: 0.12 + Math.random() * 0.18,
      color: Math.random() > 0.5 ? "#38bdf8" : "#a855f7"
    });
  }
}

window.addEventListener("resize", resizeParticles);
resizeParticles();

let mouseX = -1000, mouseY = -1000;
window.addEventListener("mousemove", e => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

function animateParticles() {
  bgCtx.clearRect(0, 0, pWidth, pHeight);
  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < 0) p.x = pWidth;
    if (p.x > pWidth) p.x = 0;
    if (p.y < 0) p.y = pHeight;
    if (p.y > pHeight) p.y = 0;

    // Mouse repulsion
    const dx = p.x - mouseX, dy = p.y - mouseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 120) {
      const force = (120 - dist) / 120;
      p.x += (dx / dist) * force * 2;
      p.y += (dy / dist) * force * 2;
    }

    bgCtx.save();
    bgCtx.font = `${p.size}px monospace`;
    bgCtx.fillStyle = p.color;
    bgCtx.globalAlpha = p.alpha;
    bgCtx.fillText(p.sym, p.x, p.y);
    bgCtx.restore();
  });
  requestAnimationFrame(animateParticles);
}
animateParticles();

// Initial grid render
renderGrid(MODULES);
