const sections = [...document.querySelectorAll('.panel')];
const links = [...document.querySelectorAll('.nav-link')];
const dots = [...document.querySelectorAll('.chapter-dots a')];
const counter = document.querySelector('#currentSlide');
const progressBar = document.querySelector('#progressBar');
const transition = document.querySelector('#pageTransition');
let activeIndex = 0;
let isTransitioning = false;

function showChapter(index, animate = false) {
  const next = Math.max(0, Math.min(sections.length - 1, index));
  if (animate && next !== activeIndex) {
    transition.classList.remove('flash');
    void transition.offsetWidth;
    transition.classList.add('flash');
    setTimeout(() => sections[next].scrollIntoView({ behavior: 'instant' }), 360);
  } else {
    sections[next].scrollIntoView({ behavior: 'smooth' });
  }
}

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    activeIndex = sections.indexOf(entry.target);
    const id = entry.target.id;
    counter.textContent = entry.target.dataset.slide;
    links.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === `#${id}`));
    dots.forEach((dot) => dot.classList.toggle('active', dot.getAttribute('href') === `#${id}`));
  });
}, { threshold: 0.42 });
sections.forEach((section) => sectionObserver.observe(section));

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('visible');
    revealObserver.unobserve(entry.target);
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((element, index) => {
  element.style.transitionDelay = `${Math.min(index % 6, 4) * 70}ms`;
  revealObserver.observe(element);
});

function updateProgress() {
  const maxScroll = document.documentElement.scrollHeight - innerHeight;
  progressBar.style.width = `${maxScroll ? (scrollY / maxScroll) * 100 : 0}%`;
}
addEventListener('scroll', updateProgress, { passive: true });
updateProgress();

function updateClock() {
  document.querySelector('#liveClock').textContent = new Date().toLocaleTimeString('en-US', { hour12: false });
}
updateClock();
setInterval(updateClock, 1000);

const preloader = document.querySelector('#preloader');
const loadPercent = document.querySelector('#loadPercent');
const loadLine = document.querySelector('#loadLine');
let loaded = 0;
const loadingTimer = setInterval(() => {
  loaded = Math.min(100, loaded + Math.ceil(Math.random() * 13));
  loadPercent.textContent = String(loaded).padStart(2, '0');
  loadLine.style.width = `${loaded}%`;
  if (loaded === 100) {
    clearInterval(loadingTimer);
    setTimeout(() => preloader.classList.add('done'), 280);
  }
}, 75);

const cursor = document.querySelector('#cursorGlow');
const sun = document.querySelector('.sun-disc');
addEventListener('pointermove', (event) => {
  cursor.style.left = `${event.clientX}px`;
  cursor.style.top = `${event.clientY}px`;
  if (innerWidth < 700) return;
  const x = (event.clientX / innerWidth - 0.5) * 14;
  const y = (event.clientY / innerHeight - 0.5) * 14;
  sun.style.translate = `${x}px ${y}px`;
});

document.querySelectorAll('.day-card, .leisure-card, .chore-feature').forEach((card) => {
  card.addEventListener('pointermove', (event) => {
    if (innerWidth < 800) return;
    const rect = card.getBoundingClientRect();
    const rx = ((event.clientY - rect.top) / rect.height - 0.5) * -8;
    const ry = ((event.clientX - rect.left) / rect.width - 0.5) * 8;
    card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.018)`;
  });
  card.addEventListener('pointerleave', () => { card.style.transform = ''; });
});

function togglePresentation() {
  document.body.classList.toggle('presentation-mode');
  document.querySelector('#presentToggle').classList.toggle('active');
  if (document.body.classList.contains('presentation-mode') && !document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {});
  } else if (!document.body.classList.contains('presentation-mode') && document.fullscreenElement) {
    document.exitFullscreen?.().catch(() => {});
  }
}
document.querySelector('#presentToggle').addEventListener('click', togglePresentation);

document.addEventListener('keydown', (event) => {
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  if (event.key.toLowerCase() === 'f') togglePresentation();
  if (event.key === 'Escape') document.body.classList.remove('presentation-mode');
  if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(event.key)) {
    event.preventDefault();
    if (!isTransitioning) showChapter(activeIndex + 1, true);
  }
  if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) {
    event.preventDefault();
    if (!isTransitioning) showChapter(activeIndex - 1, true);
  }
});
transition.addEventListener('animationstart', () => { isTransitioning = true; });
transition.addEventListener('animationend', () => { isTransitioning = false; });

let audioContext;
let audioNodes = [];
let soundOn = false;
const soundButton = document.querySelector('#soundToggle');
function createAmbientSound() {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const master = audioContext.createGain();
  master.gain.setValueAtTime(0.0001, audioContext.currentTime);
  master.gain.exponentialRampToValueAtTime(0.055, audioContext.currentTime + 1.2);
  master.connect(audioContext.destination);
  [55, 82.41, 110, 164.81].forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = index % 2 ? 'sine' : 'triangle';
    oscillator.frequency.value = frequency;
    oscillator.detune.value = index * 2;
    gain.gain.value = 0.16 / (index + 1);
    oscillator.connect(gain).connect(master);
    oscillator.start();
    audioNodes.push(oscillator);
  });
  audioNodes.push(master);
}
function stopAmbientSound() {
  const master = audioNodes.at(-1);
  if (master?.gain && audioContext) {
    master.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.5);
  }
  setTimeout(() => {
    audioNodes.forEach((node) => node.stop?.());
    audioNodes = [];
    audioContext?.close();
    audioContext = null;
  }, 550);
}
soundButton.addEventListener('click', () => {
  soundOn = !soundOn;
  soundButton.classList.toggle('active', soundOn);
  soundButton.setAttribute('aria-label', soundOn ? 'Turn ambient sound off' : 'Turn ambient sound on');
  soundOn ? createAmbientSound() : stopAmbientSound();
});

const canvas = document.querySelector('#starfield');
const context = canvas.getContext('2d');
let particles = [];
function resizeCanvas() {
  const dpr = Math.min(devicePixelRatio, 2);
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  particles = Array.from({ length: Math.min(75, Math.floor(innerWidth / 16)) }, () => ({
    x: Math.random() * innerWidth,
    y: Math.random() * innerHeight,
    r: Math.random() * 1.2 + 0.2,
    speed: Math.random() * 0.16 + 0.03,
    alpha: Math.random() * 0.55 + 0.15
  }));
}
function drawStars() {
  context.clearRect(0, 0, innerWidth, innerHeight);
  const darkSection = activeIndex === 0 || activeIndex === 2;
  context.fillStyle = darkSection ? '#ffffff' : '#ff4b26';
  particles.forEach((particle) => {
    particle.y -= particle.speed;
    if (particle.y < -2) particle.y = innerHeight + 2;
    context.globalAlpha = particle.alpha;
    context.beginPath();
    context.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
    context.fill();
  });
  context.globalAlpha = 1;
  requestAnimationFrame(drawStars);
}
addEventListener('resize', resizeCanvas);
resizeCanvas();
drawStars();
