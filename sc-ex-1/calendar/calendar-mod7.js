 const box = document.getElementById("threePrism");
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, box.clientWidth / box.clientHeight, 0.1, 100);
camera.position.set(0, 1.2, 5.2);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(box.clientWidth, box.clientHeight);
box.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const dir = new THREE.DirectionalLight(0x38bdf8, 1.3);
dir.position.set(3, 5, 4);
scene.add(dir);

// 7-sided Heptagonal Weekday Prism
const geo = new THREE.CylinderGeometry(1.4, 1.4, 2.2, 7);
const mat = new THREE.MeshStandardMaterial({ color: 0x6366f1, flatShading: true });
const prism = new THREE.Mesh(geo, mat);
prism.rotation.z = Math.PI / 2;
scene.add(prism);

const wire = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x38bdf8 }));
prism.add(wire);

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const mCodes = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
let targetAngle = 0;

function computeDate() {
  const val = document.getElementById("dateInput").value;
  if (!val) return;
  let [y, m, d] = val.split("-").map(Number);
  const origY = y;
  if (m < 3) y -= 1;

  const yMod = y % 7;
  const leapTotal = Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400);
  const leapMod = leapTotal % 7;
  const mCode = mCodes[m - 1];
  const dMod = d % 7;

  const total = yMod + leapMod + mCode + dMod;
  const wIdx = total % 7;
  targetAngle = (wIdx * 2 * Math.PI) / 7;

  document.getElementById("funnelStage").innerHTML = `
    <div class="step-row"><span>Day (${d})</span><span><span class="vapor">&minus;${d - dMod}</span> &rarr; <span class="rem">${dMod}</span></span></div>
    <div class="step-row"><span>Month Offset (M=${m})</span><span>Code &rarr; <span class="rem">${mCode}</span></span></div>
    <div class="step-row"><span>Adj. Year (${y})</span><span><span class="vapor">&minus;${y - yMod}</span> &rarr; <span class="rem">${yMod}</span></span></div>
    <div class="step-row"><span>Leap Days (${leapTotal})</span><span><span class="vapor">&minus;${leapTotal - leapMod}</span> &rarr; <span class="rem">${leapMod}</span></span></div>
    <div class="step-row"><span>Sum of Remainders (${total})</span><span>${total} mod 7 &rarr; <span class="rem">${wIdx}</span></span></div>
  `;
  document.getElementById("weekdayBanner").textContent = `${origY}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")} is a ${days[wIdx].toUpperCase()} (Face #${wIdx})`;
}

document.getElementById("dateInput").addEventListener("change", computeDate);
document.getElementById("vaporBtn").addEventListener("click", () => {
  prism.rotation.x += Math.PI * 2;
  computeDate();
});
computeDate();

function animate() {
  requestAnimationFrame(animate);
  prism.rotation.x += (targetAngle - prism.rotation.x) * 0.08;
  renderer.render(scene, camera);
}
animate();
