
const track = document.getElementById("track");
const player = document.getElementById("player");
const overlay = document.getElementById("overlay");

const scoreEl = document.getElementById("score");
const levelEl = document.getElementById("level");
const timeEl = document.getElementById("time");
const bestEl = document.getElementById("best");
const statusEl = document.getElementById("status");

const startBtn = document.getElementById("startBtn");
const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");
const pauseBtn = document.getElementById("pauseBtn");

const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");

let running = false;
let paused = false;
let score = 0;
let level = 1;
let elapsed = 0;
let playerX = 0;
let enemies = [];
let lastTime = 0;
let spawnTimer = 0;
let animationId = null;
let lastTimestamp = 0;

let best = 0;

try {
  best = Number(localStorage.getItem("alimardonRacingBest")) || 0;
} catch (error) {
  best = 0;
}

bestEl.textContent = best;

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return String(mins).padStart(2, "0") + ":" +
         String(secs).padStart(2, "0");
}

function getRoadBounds() {
  return {
    left: track.clientWidth * 0.15,
    right: track.clientWidth * 0.85
  };
}

function setPlayerPosition() {
  const bounds = getRoadBounds();
  const carWidth = player.offsetWidth;

  playerX = Math.max(
    bounds.left,
    Math.min(bounds.right - carWidth, playerX)
  );

  player.style.left = playerX + "px";
}

function movePlayer(direction) {
  if (!running || paused) return;

  playerX += direction * 32;
  setPlayerPosition();
}

function createEnemy() {
  const enemy = document.createElement("div");
  enemy.className = "car enemy";

  enemy.innerHTML = `
    <div class="car-window"></div>
    <div class="car-light light-left"></div>
    <div class="car-light light-right"></div>
    <div class="wheel wheel-left"></div>
    <div class="wheel wheel-right"></div>
  `;

  const bounds = getRoadBounds();
  const carWidth = 43;
  const available = bounds.right - bounds.left - carWidth;

  const laneCount = 3;
  const laneWidth = available / laneCount;
  const lane = Math.floor(Math.random() * laneCount);

  enemy.style.left =
    (bounds.left + lane * laneWidth + (laneWidth - carWidth) / 2) + "px";

  enemy.style.top = "-90px";
  track.appendChild(enemy);

  enemies.push({
    element: enemy,
    y: -90,
    passed: false
  });
}

function clearEnemies() {
  enemies.forEach(enemy => enemy.element.remove());
  enemies = [];
}

function updateHUD() {
  scoreEl.textContent = Math.floor(score);
  levelEl.textContent = level;
  timeEl.textContent = formatTime(elapsed);
  bestEl.textContent = best;
}

function showOverlay(title, message, buttonText) {
  overlayTitle.textContent = title;
  overlayText.textContent = message;
  startBtn.textContent = buttonText;
  overlay.classList.remove("hidden");
}

function startGame() {
  if (running && paused) {
    paused = false;
    lastTimestamp = 0;
    statusEl.textContent = "POYGA DAVOM ETMOQDA";
    pauseBtn.textContent = "Ⅱ PAUZA";
    overlay.classList.add("hidden");
    animationId = requestAnimationFrame(gameLoop);
    return;
  }

  if (running) return;

  if (animationId !== null) {
    cancelAnimationFrame(animationId);
  }

  clearEnemies();

  score = 0;
  level = 1;
  elapsed = 0;
  spawnTimer = 0;
  lastTime = 0;
  lastTimestamp = 0;

  playerX = (track.clientWidth - player.offsetWidth) / 2;
  setPlayerPosition();

  running = true;
  paused = false;

  statusEl.textContent = "POYGA BOSHLANDI";
  pauseBtn.textContent = "Ⅱ PAUZA";
  overlay.classList.add("hidden");

  animationId = requestAnimationFrame(gameLoop);
}

function pauseGame() {
  if (!running) return;

  paused = !paused;

  if (paused) {
    cancelAnimationFrame(animationId);
    statusEl.textContent = "PAUZA";
    pauseBtn.textContent = "▶ DAVOM";
    showOverlay("O‘YIN PAUZADA", "Davom etish uchun tugmani bosing.", "▶ DAVOM ETISH");
  } else {
    overlay.classList.add("hidden");
    pauseBtn.textContent = "Ⅱ PAUZA";
    statusEl.textContent = "POYGA DAVOM ETMOQDA";
    lastTimestamp = 0;
    animationId = requestAnimationFrame(gameLoop);
  }
}

function endGame() {
  running = false;
  paused = false;

  cancelAnimationFrame(animationId);

  if (score > best) {
    best = Math.floor(score);

    try {
      localStorage.setItem("alimardonRacingBest", String(best));
    } catch (error) {
      // Saqlash imkoni bo'lmasa ham o'yin davom etadi.
    }
  }

  updateHUD();
  statusEl.textContent = "POYGA TUGADI";
  pauseBtn.textContent = "Ⅱ PAUZA";

  showOverlay(
    "🏁 Poyga tugadi!",
    `Natija: ${Math.floor(score)} ball. Level: ${level}. Vaqt: ${formatTime(elapsed)}. Rekord: ${best} ball.`,
    "↻ QAYTA BOSHLASH"
  );
}

function gameLoop(timestamp) {
  if (!running || paused) return;

  if (!lastTimestamp) lastTimestamp = timestamp;

  // Kadrlar oralig'idagi vaqtni cheklash
  const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
  lastTimestamp = timestamp;

  elapsed += dt;

  // Harakat va vaqt uchun ball
  score += dt * (10 + level * 2);

  // Har 500 ballda keyingi level
  const newLevel = Math.floor(score / 500) + 1;

  if (newLevel > level) {
    level = newLevel;
    statusEl.textContent = "LEVEL " + level + " OCHILDI!";
  }

  // Level oshgani sari mashinalar tezlashadi
  const speed = 190 + (level - 1) * 30;
  const spawnInterval = Math.max(0.42, 1.05 - (level - 1) * 0.07);

  spawnTimer += dt;

  if (spawnTimer >= spawnInterval) {
    spawnTimer = 0;
    createEnemy();
  }

  const playerRect = player.getBoundingClientRect();

  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];

    enemy.y += speed * dt;
    enemy.element.style.top = enemy.y + "px";

    const enemyRect = enemy.element.getBoundingClientRect();

    // To'qnashuvni tekshirish
    const hit =
      playerRect.left + 7 < enemyRect.right - 7 &&
      playerRect.right - 7 > enemyRect.left + 7 &&
      playerRect.top + 9 < enemyRect.bottom - 9 &&
      playerRect.bottom - 5 > enemyRect.top + 9;

    if (hit) {
      endGame();
      return;
    }

    // Raqibdan o'tib ketganda qo'shimcha ball
    if (!enemy.passed && enemy.y > track.clientHeight) {
      enemy.passed = true;
      score += 25 + level * 5;
      enemy.element.remove();
      enemies.splice(i, 1);
      continue;
    }
  }

  updateHUD();
  animationId = requestAnimationFrame(gameLoop);
}

document.addEventListener("keydown", event => {
  const key = event.key.toLowerCase();

  if (["arrowleft", "arrowright", " "].includes(key)) {
    event.preventDefault();
  }

  if (key === "arrowleft" || key === "a") {
    movePlayer(-1);
  }

  if (key === "arrowright" || key === "d") {
    movePlayer(1);
  }

  if (key === "p" || key === " ") {
    if (!running) return;
    pauseGame();
  }

  if (key === "enter" && !running) {
    startGame();
  }
});

startBtn.addEventListener("click", startGame);

leftBtn.addEventListener("click", () => movePlayer(-1));
rightBtn.addEventListener("click", () => movePlayer(1));
pauseBtn.addEventListener("click", pauseGame);

window.addEventListener("resize", () => {
  setPlayerPosition();
});

setPlayerPosition();
updateHUD();
