const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d");

let width = 0;
let height = 0;
let particles = [];
let interactiveBurstParticles = [];
let isNight = false;

const settings = {
  bgColor: "#ffffff",
  nightBgColor: "#0d1117",

  minWind: 1,
  maxWind: 10,

  minSize: 14,
  maxSize: 38,

  emitterY: 0.15,
  emitterSpread: 0.85,

  gravity: 0.6,
  turbulence: 0.8,

  rotationSpeed: 0.05,
  tumbleStrength: 0.4,
  staticTilt: 0,

  particleCount: 150,

  // -1 = right to left, 1 = left to right
  direction: -1
};

const cache = {
  minSize: 0,
  maxSize: 0,
  minWind: 0,
  maxWind: 0,
  tiltRad: 0
};

function updateCache() {
  cache.minSize = Math.min(settings.minSize, settings.maxSize);
  cache.maxSize = Math.max(settings.minSize, settings.maxSize);
  cache.minWind = Math.min(settings.minWind, settings.maxWind);
  cache.maxWind = Math.max(settings.minWind, settings.maxWind);
  cache.tiltRad = (settings.staticTilt * Math.PI) / 180;
}

function createDefaultImage() {
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = 128;
  tempCanvas.height = 128;

  const tCtx = tempCanvas.getContext("2d");

  tCtx.scale(2, 2);
  tCtx.beginPath();
  tCtx.moveTo(32, 5);
  tCtx.quadraticCurveTo(5, 32, 32, 59);
  tCtx.quadraticCurveTo(59, 32, 32, 5);

  tCtx.fillStyle = "#d66161";
  tCtx.fill();

  tCtx.strokeStyle = "#F20404";
  tCtx.lineWidth = 2;
  tCtx.stroke();

  tCtx.beginPath();
  tCtx.moveTo(32, 5);
  tCtx.lineTo(32, 59);
  tCtx.stroke();

  const img = new Image();
  img.src = tempCanvas.toDataURL();

  return img;
}

const particleImage = createDefaultImage();

function rotateVector(x, y, z, ax, ay, az) {
  let cos = Math.cos(az);
  let sin = Math.sin(az);

  const x1 = x * cos - y * sin;
  const y1 = x * sin + y * cos;
  const z1 = z;

  cos = Math.cos(ay);
  sin = Math.sin(ay);

  const x2 = x1 * cos + z1 * sin;
  const y2 = y1;
  const z2 = -x1 * sin + z1 * cos;

  cos = Math.cos(ax);
  sin = Math.sin(ax);

  return {
    x: x2,
    y: y2 * cos - z2 * sin,
    z: y2 * sin + z2 * cos
  };
}

class Particle {
  constructor(initOnScreen = false) {
    this.reset(initOnScreen);
  }

  reset(initOnScreen = false) {
    this.image = particleImage;

    this.width =
      cache.minSize + Math.random() * (cache.maxSize - cache.minSize);
    this.height = this.width;

    const centerY = height * settings.emitterY;
    const spreadHeight = height * settings.emitterSpread;
    const minY = centerY - spreadHeight / 2;
    const maxY = centerY + spreadHeight / 2;

    this.y = minY + Math.random() * (maxY - minY);

    if (initOnScreen) {
      this.x = Math.random() * width;
    } else {
      this.x =
        settings.direction === -1
          ? width + this.width + Math.random() * width
          : -this.width - Math.random() * width;
    }

    const sizeFactor =
      (this.width - cache.minSize) / (cache.maxSize - cache.minSize || 1);

    this.windFactor = 1 - (sizeFactor * 0.5 + Math.random() * 0.5);
    this.windFactor = Math.max(0.1, Math.min(1, this.windFactor));

    this.vx = 0;
    this.vy = 0;

    this.waveOffset = Math.random() * Math.PI * 2;

    this.angleZ = Math.random() * Math.PI * 2;
    this.spinZ = (Math.random() - 0.5) * settings.rotationSpeed;

    this.angleX = 0;
    this.angleY = 0;

    this.spinX = (Math.random() - 0.5) * 0.1;
    this.spinY = (Math.random() - 0.5) * 0.1;
  }

  update() {
    const targetSpeed =
      cache.minWind + (cache.maxWind - cache.minWind) * this.windFactor;

    this.vx += (targetSpeed - this.vx) * 0.1;
    this.x += this.vx * settings.direction;

    const gravityMod = 1.5 - this.windFactor;

    this.vy += settings.gravity * 0.05 * gravityMod;

    const wave = Math.sin(this.x * 0.01 * settings.direction + this.waveOffset);

    this.vy += wave * settings.turbulence * 0.05;
    this.vy *= 0.98;

    this.y += this.vy;

    this.angleZ += this.spinZ + this.vx * 0.002;

    if (settings.tumbleStrength > 0) {
      this.angleX += this.spinX * settings.tumbleStrength;
      this.angleY += this.spinY * settings.tumbleStrength;
    }

    const buffer = 200;

    const outByX =
      settings.direction === -1 ? this.x < -buffer : this.x > width + buffer;

    if (outByX || this.y > height + buffer || this.y < -buffer) {
      this.reset(false);
    }
  }

  draw() {
    const vecU = rotateVector(
      1,
      0,
      0,
      this.angleX,
      this.angleY + cache.tiltRad,
      this.angleZ
    );

    const vecV = rotateVector(
      0,
      1,
      0,
      this.angleX,
      this.angleY + cache.tiltRad,
      this.angleZ
    );

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.transform(vecU.x, vecU.y, vecV.x, vecV.y, 0, 0);
    ctx.drawImage(
      this.image,
      -this.width / 2,
      -this.height / 2,
      this.width,
      this.height
    );
    ctx.restore();
  }
}

// Interactive Burst Particle Class
class BurstParticle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 20 + 10;
    this.vx = (Math.random() - 0.5) * 12;
    this.vy = (Math.random() - 0.5) * 12;
    this.alpha = 1;
    this.decay = Math.random() * 0.02 + 0.015;
    this.rotation = Math.random() * Math.PI * 2;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.1; // mild gravity
    this.alpha -= this.decay;
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.drawImage(
      particleImage,
      -this.size / 2,
      -this.size / 2,
      this.size,
      this.size
    );
    ctx.restore();
  }
}

function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
}

function initParticles() {
  particles = [];
  for (let i = 0; i < settings.particleCount; i++) {
    const particle = new Particle(false);
    particle.x += Math.random() * width * 1.5;
    particles.push(particle);
  }
}

function animate() {
  ctx.fillStyle = isNight ? settings.nightBgColor : settings.bgColor;
  ctx.fillRect(0, 0, width, height);

  for (const particle of particles) {
    particle.update();
    particle.draw();
  }

  // Draw interactive burst particles
  for (let i = interactiveBurstParticles.length - 1; i >= 0; i--) {
    const bp = interactiveBurstParticles[i];
    bp.update();
    bp.draw();
    if (bp.alpha <= 0) {
      interactiveBurstParticles.splice(i, 1);
    }
  }

  requestAnimationFrame(animate);
}

// Interactive Burst on Click
window.addEventListener("click", (e) => {
  if (e.target.closest(".ui-container") || e.target.closest(".dev-card")) return;
  for (let i = 0; i < 15; i++) {
    interactiveBurstParticles.push(new BurstParticle(e.clientX, e.clientY));
  }
});

// Night Mode Toggle
const themeToggleBtn = document.getElementById("themeToggle");
themeToggleBtn.addEventListener("click", () => {
  isNight = !isNight;
  document.body.classList.toggle("night-mode", isNight);
  themeToggleBtn.querySelector("i").className = isNight ? "fas fa-sun" : "fas fa-moon";
});

// Synthesized Background Ambient Music (Web Audio API)
let audioCtx = null;
let isPlaying = false;
let musicInterval = null;

function playAmbientMelody() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }

  const pentatonicScale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33]; // C5 pentatonic

  function playNote() {
    if (!isPlaying) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    const freq = pentatonicScale[Math.floor(Math.random() * pentatonicScale.length)];
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, audioCtx.currentTime + 0.8);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 3.5);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 3.6);
  }

  isPlaying = true;
  musicInterval = setInterval(playNote, 1200);
}

function stopAmbientMelody() {
  isPlaying = false;
  if (musicInterval) clearInterval(musicInterval);
}

const musicToggleBtn = document.getElementById("musicToggle");
musicToggleBtn.addEventListener("click", () => {
  if (isPlaying) {
    stopAmbientMelody();
    musicToggleBtn.querySelector("i").className = "fas fa-music";
  } else {
    playAmbientMelody();
    musicToggleBtn.querySelector("i").className = "fas fa-pause";
  }
});

function start() {
  updateCache();
  resize();
  initParticles();
  animate();

  window.addEventListener("resize", resize);
}

start();