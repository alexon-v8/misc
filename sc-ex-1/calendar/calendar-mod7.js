const box = document.getElementById("prismBox");
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, box.clientWidth / box.clientHeight, 0.1, 100);
camera.position.set(0, 0.6, 5.4);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(box.clientWidth, box.clientHeight);
box.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.85));
const pLight = new THREE.PointLight(0x38bdf8, 1.8, 20);
pLight.position.set(2, 4, 5);
scene.add(pLight);

const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const faceColors = ["#f43f5e", "#38bdf8", "#a855f7", "#10b981", "#f59e0b", "#ec4899", "#6366f1"];

// Create 7-face CanvasTexture wrapped around the Cylinder side
function createWrapTexture() {
  const c = document.createElement("canvas");
  c.width = 1400; c.height = 360;
  const ctx = c.getContext("2d");
  for (let i = 0; i < 7; i++) {
    const x = i * 200;
    ctx.fillStyle = "#090d1e";
    ctx.fillRect(x, 0, 200, 360);
    ctx.strokeStyle = faceColors[i];
    ctx.lineWidth = 6;
    ctx.strokeRect(x + 6, 6, 188, 348);

    ctx.save();
    ctx.translate(x + 100, 180);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = faceColors[i];
    ctx.font = "900 28px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`MOD 7 ≡ ${i}`, 0, -35);
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 32px sans-serif";
    ctx.fillText(days[i], 0, 5);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 18px monospace";
    ctx.fillText(`+${i}, +${i+7}, +${i+14}...`, 0, 42);
    ctx.restore();
  }
  return new THREE.CanvasTexture(c);
}

const geo = new THREE.CylinderGeometry(1.45, 1.45, 2.8, 7, 1, false);
const sideMat = new THREE.MeshStandardMaterial({ map: createWrapTexture(), roughness: 0.25, metalness: 0.3 });
const capMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, metalness: 0.8, roughness: 0.2 });
const prism = new THREE.Mesh(geo, [sideMat, capMat, capMat]);
prism.rotation.z = Math.PI / 2;
scene.add(prism);

// Glowing orbital rings
const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.03, 16, 64), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
ring1.rotation.y = Math.PI / 2;
ring1.position.x = -1.45;
const ring2 = ring1.clone();
ring2.position.x = 1.45;
scene.add(ring1, ring2);

let targetRotX = 0;
const mCodes = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];

// 2D Particle Vaporizer Canvas
const vCvs = document.getElementById("vaporCanvas"), vCtx = vCvs.getContext("2d");
let sparks = [], orbs = [];

function spawnVaporSparks(items) {
  const w = vCvs.clientWidth, h = vCvs.clientHeight;
  sparks = []; orbs = [];
  items.forEach((it, idx) => {
    const x = (w / 5) * (idx + 0.7);
    orbs.push({ x, y: h / 2, label: it.name, orig: it.val, rem: it.rem, color: faceColors[idx] });
    for (let s = 0; s < 22; s++) {
      const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 3.2;
      sparks.push({ x, y: h / 2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, col: "#fb7185" });
    }
  });
}

function compute() {
  const val = document.getElementById("dateInput").value;
  if (!val) return;
  let [y, m, d] = val.split("-").map(Number);
  const origY = y;
  if (m < 3) y -= 1;

  const dMod = d % 7;
  const mCode = mCodes[m - 1];
  const yMod = y % 7;
  const leaps = Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400);
  const lMod = leaps % 7;
  const sum = dMod + mCode + yMod + lMod;
  const wIdx = sum % 7;

  // Align selected face toward camera (+Z)
  const step = (Math.PI * 2) / 7;
  prism.rotation.x -= Math.PI * 2;
  targetRotX = -wIdx * step - step * 0.5;

  spawnVaporSparks([
    { name: "Day", val: d, rem: dMod },
    { name: "Month", val: mCode, rem: mCode },
    { name: "Year", val: y, rem: yMod },
    { name: "Leaps", val: leaps, rem: lMod }
  ]);

  document.getElementById("tokenSteps").innerHTML = `
    <div class="v-row"><span>Day (${d})</span><span><span class="burn">&minus;${d - dMod}</span> &rarr; <span class="keep">${dMod}</span></span></div>
    <div class="v-row"><span>Month Code (M=${m})</span><span>Offset &rarr; <span class="keep">${mCode}</span></span></div>
    <div class="v-row"><span>Adj. Year (${y})</span><span><span class="burn">&minus;${y - yMod}</span> &rarr; <span class="keep">${yMod}</span></span></div>
    <div class="v-row"><span>Leap Years (${leaps})</span><span><span class="burn">&minus;${leaps - lMod}</span> &rarr; <span class="keep">${lMod}</span></span></div>
    <div class="v-row"><span>Total Remainders (${sum})</span><span>${sum} mod 7 &rarr; <span class="keep">Face #${wIdx}</span></span></div>
  `;
  gsap.fromTo(".v-row", { x: -20, opacity: 0 }, { x: 0, opacity: 1, stagger: 0.06, duration: 0.35 });
  document.getElementById("resultBanner").innerHTML = `${origY}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")} &bull; ${days[wIdx]} (Remainder ${wIdx})`;
}

document.getElementById("dateInput").addEventListener("change", compute);
document.getElementById("vaporBtn").addEventListener("click", compute);
compute();

function loop() {
  requestAnimationFrame(loop);
  prism.rotation.x += (targetRotX - prism.rotation.x) * 0.08;
  renderer.render(scene, camera);

  // Render 2D Vaporizer Chamber
  const dpr = window.devicePixelRatio || 1;
  const w = vCvs.clientWidth, h = vCvs.clientHeight;
  vCvs.width = w * dpr; vCvs.height = h * dpr;
  vCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  vCtx.clearRect(0, 0, w, h);

  // Laser beam across middle
  vCtx.strokeStyle = "rgba(56, 189, 248, 0.35)";
  vCtx.lineWidth = 3;
  vCtx.beginPath(); vCtx.moveTo(0, h / 2); vCtx.lineTo(w, h / 2); vCtx.stroke();

  sparks.forEach(s => {
    s.x += s.vx; s.y += s.vy; s.life *= 0.94;
    if (s.life > 0.05) {
      vCtx.fillStyle = `rgba(251, 113, 133, ${s.life})`;
      vCtx.beginPath(); vCtx.arc(s.x, s.y, 2.5, 0, Math.PI * 2); vCtx.fill();
    }
  });

  orbs.forEach(o => {
    vCtx.save();
    vCtx.shadowBlur = 16; vCtx.shadowColor = o.color;
    vCtx.fillStyle = "#0f172a"; vCtx.strokeStyle = o.color; vCtx.lineWidth = 3;
    vCtx.beginPath(); vCtx.arc(o.x, o.y, 26, 0, Math.PI * 2); vCtx.fill(); vCtx.stroke();
    vCtx.restore();
    vCtx.fillStyle = "#fff"; vCtx.font = "bold 16px monospace"; vCtx.textAlign = "center";
    vCtx.fillText(o.rem, o.x, o.y + 5);
    vCtx.fillStyle = "#94a3b8"; vCtx.font = "11px sans-serif";
    vCtx.fillText(o.label, o.x, o.y - 34);
  });
}
loop();
