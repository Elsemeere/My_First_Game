// =============================================
//  Maze Golf — game.js
//  All game logic lives here.
// =============================================

// --- Canvas setup ---
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d"); // ctx is the drawing "pen" for the canvas

// --- UI elements ---
const shotCounterEl = document.getElementById("shot-counter");
const winScreen = document.getElementById("win-screen");
const winShotsEl = document.getElementById("win-shots");
document.getElementById("reset-btn").addEventListener("click", resetGame);
document.getElementById("play-again-btn").addEventListener("click", resetGame);

// =============================================
//  LEVEL DATA
//  Each wall is a rectangle: { x, y, w, h }
//  x/y = top-left corner, w = width, h = height
// =============================================
const WALLS = [
  // Horizontal divider across the upper third
  { x: 0,   y: 160, w: 500, h: 18 },
  // Vertical wall on the right side of that divider
  { x: 500, y: 160, w: 18,  h: 140 },
  // Lower horizontal barrier
  { x: 150, y: 320, w: 400, h: 18 },
  // Short vertical blocker near the middle
  { x: 280, y: 220, w: 18,  h: 100 },
  // Left-side vertical wall segment
  { x: 100, y: 50,  w: 18,  h: 130 },
];

// =============================================
//  GAME OBJECTS
// =============================================

// The hole — a circle the ball must reach
const HOLE = {
  x: 630,  // center x
  y: 60,   // center y
  radius: 14,
};

// The ball — starts near the bottom-left
// vel = velocity (how fast it moves each frame)
const ball = {
  x: 60,
  y: 440,
  radius: 10,
  velX: 0,
  velY: 0,
};

// Starting position so reset() can restore it
const BALL_START = { x: ball.x, y: ball.y };

// =============================================
//  GAME STATE
// =============================================
let shots = 0;          // how many times the player has fired
let gameWon = false;    // true once the ball reaches the hole
let isMoving = false;   // true while the ball is rolling

// Aiming state — tracks the mouse drag
const aim = {
  active: false,  // true while the player is holding the mouse down
  startX: 0,      // where the drag started
  startY: 0,
};

// Physics constants
const FRICTION = 0.985;      // multiply velocity by this each frame (1.0 = no friction, 0.0 = stops instantly)
const MIN_SPEED = 0.15;      // below this speed the ball is considered stopped
const MAX_POWER = 180;       // maximum drag distance (in pixels) — caps shot power
const POWER_SCALE = 0.12;    // converts drag pixels to velocity units

// =============================================
//  INPUT — Mouse events for aiming
// =============================================

canvas.addEventListener("mousedown", onMouseDown);
canvas.addEventListener("mousemove", onMouseMove);
canvas.addEventListener("mouseup", onMouseUp);
canvas.addEventListener("mouseleave", cancelAim); // abandon aim if mouse leaves canvas without releasing

// Also support touch for mobile/tablet
canvas.addEventListener("touchstart",  e => { e.preventDefault(); onMouseDown(e.touches[0]); }, { passive: false });
canvas.addEventListener("touchmove",   e => { e.preventDefault(); onMouseMove(e.touches[0]); }, { passive: false });
canvas.addEventListener("touchend",    e => { e.preventDefault(); onMouseUp(e.changedTouches[0]); }, { passive: false });

function getCanvasPos(event) {
  // Converts a page-level mouse/touch position to canvas-local coordinates.
  // This is needed because the canvas may be offset from the top-left of the page.
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function onMouseDown(event) {
  if (gameWon || isMoving) return; // ignore input while ball is rolling or game is over
  aim.active = true;
  // Always anchor the drag origin to the ball, not the click point.
  // This keeps the aim line and the drag handle on opposite sides of the
  // ball — the classic slingshot visual: pull back here, launches that way.
  aim.startX = ball.x;
  aim.startY = ball.y;
  // Seed currentX/Y so the aim line appears immediately on mousedown.
  const pos = getCanvasPos(event);
  aim.currentX = pos.x;
  aim.currentY = pos.y;
}

function onMouseMove(event) {
  if (!aim.active) return;
  // We only need to store the current mouse position so draw() can show the aim line.
  // The canvas redraws every frame via the game loop, so just update aim coords here.
  const pos = getCanvasPos(event);
  aim.currentX = pos.x;
  aim.currentY = pos.y;
}

function onMouseUp(event) {
  if (!aim.active) return;
  aim.active = false;

  const pos = getCanvasPos(event);
  const dx = pos.x - aim.startX; // horizontal drag distance
  const dy = pos.y - aim.startY; // vertical drag distance
  const distance = Math.sqrt(dx * dx + dy * dy); // total drag length (Pythagoras)

  if (distance < 5) return; // ignore accidental tiny clicks

  // Clamp the power so the player can't shoot too hard
  const power = Math.min(distance, MAX_POWER);

  // The ball shoots in the OPPOSITE direction of the drag (pull-back slingshot mechanic)
  ball.velX = -(dx / distance) * power * POWER_SCALE;
  ball.velY = -(dy / distance) * power * POWER_SCALE;

  shots++;
  isMoving = true;
  canvas.classList.add("ball-rolling"); // cursor → not-allowed while ball moves
  updateShotCounter();
}

function cancelAim() {
  // Called when the mouse leaves the canvas — silently drops the drag
  // without firing a shot, so accidental edge-exits don't count as shots.
  aim.active = false;
  aim.currentX = undefined;
}

// =============================================
//  PHYSICS — called every frame while ball moves
// =============================================

function updateBall() {
  if (!isMoving) return;

  // Move ball by its velocity
  ball.x += ball.velX;
  ball.y += ball.velY;

  // Apply friction — slows the ball down a little each frame
  ball.velX *= FRICTION;
  ball.velY *= FRICTION;

  // Bounce off canvas edges
  if (ball.x - ball.radius < 0) {
    ball.x = ball.radius;
    ball.velX = Math.abs(ball.velX); // reverse horizontal direction
  }
  if (ball.x + ball.radius > canvas.width) {
    ball.x = canvas.width - ball.radius;
    ball.velX = -Math.abs(ball.velX);
  }
  if (ball.y - ball.radius < 0) {
    ball.y = ball.radius;
    ball.velY = Math.abs(ball.velY); // reverse vertical direction
  }
  if (ball.y + ball.radius > canvas.height) {
    ball.y = canvas.height - ball.radius;
    ball.velY = -Math.abs(ball.velY);
  }

  // Bounce off walls
  for (const wall of WALLS) {
    resolveWallCollision(ball, wall);
  }

  // Check if the ball has nearly stopped
  const speed = Math.sqrt(ball.velX * ball.velX + ball.velY * ball.velY);
  if (speed < MIN_SPEED) {
    ball.velX = 0;
    ball.velY = 0;
    isMoving = false;
    canvas.classList.remove("ball-rolling"); // cursor → crosshair, ready to shoot
  }

  // Check win condition — ball center reaches the edge of the hole circle.
  // Using HOLE.radius (not HOLE.radius + something) means the ball must
  // visually enter the hole before the win fires. No position snap — the
  // ball already looks inside the hole at this distance.
  const distToHole = Math.sqrt(
    (ball.x - HOLE.x) * (ball.x - HOLE.x) +
    (ball.y - HOLE.y) * (ball.y - HOLE.y)
  );
  if (distToHole < HOLE.radius) {
    ball.velX = 0;
    ball.velY = 0;
    isMoving = false;
    canvas.classList.remove("ball-rolling");
    triggerWin();
  }
}

// =============================================
//  WALL COLLISION
//  Axis-Aligned Bounding Box (AABB) vs circle.
//  Figures out which side the ball hit and
//  reverses the correct velocity component.
// =============================================
function resolveWallCollision(ball, wall) {
  // Find the closest point on the wall rectangle to the ball's center
  const closestX = Math.max(wall.x, Math.min(ball.x, wall.x + wall.w));
  const closestY = Math.max(wall.y, Math.min(ball.y, wall.y + wall.h));

  const distX = ball.x - closestX;
  const distY = ball.y - closestY;
  const distance = Math.sqrt(distX * distX + distY * distY);

  if (distance >= ball.radius) return; // no collision

  // Overlap amount — push the ball out by this much
  const overlap = ball.radius - distance;

  if (distance === 0) {
    // Ball center is exactly inside the wall (rare edge case) — push upward
    ball.y -= ball.radius;
    ball.velY = -Math.abs(ball.velY);
    return;
  }

  // Normalise direction to push ball out of the wall
  const nx = distX / distance;
  const ny = distY / distance;

  ball.x += nx * overlap;
  ball.y += ny * overlap;

  // Reflect velocity along the collision normal
  const dot = ball.velX * nx + ball.velY * ny;
  ball.velX -= 2 * dot * nx;
  ball.velY -= 2 * dot * ny;
}

// =============================================
//  DRAWING — clears and redraws every frame
// =============================================

function draw() {
  // Clear the whole canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawBackground();
  drawHole();
  drawWalls();
  drawBall();

  if (aim.active && aim.currentX !== undefined) {
    drawAimLine();
  }

  // Show a one-time hint before the first shot so players know how to aim.
  // Disappears after shots > 0 so it never gets in the way.
  if (!gameWon && shots === 0 && !isMoving) {
    drawHint();
  }
}

function drawBackground() {
  // Rough — the darker green border around the edge of the course
  ctx.fillStyle = "#2d6044";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Fairway — the lighter playing surface, inset from the rough border
  ctx.fillStyle = "#4d9960";
  ctx.fillRect(14, 14, canvas.width - 28, canvas.height - 28);

  // Mown stripes — alternating 40px bands, barely visible, like a real fairway
  ctx.fillStyle = "rgba(0, 0, 0, 0.04)";
  for (let x = 14; x < canvas.width - 14; x += 80) {
    ctx.fillRect(x, 14, 40, canvas.height - 28);
  }
}

function drawHole() {
  // Turf shadow — a soft dark ring around the cup to suggest it's cut into the green
  ctx.beginPath();
  ctx.arc(HOLE.x, HOLE.y, HOLE.radius + 5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
  ctx.fill();

  // The cup itself
  ctx.beginPath();
  ctx.arc(HOLE.x, HOLE.y, HOLE.radius, 0, Math.PI * 2);
  ctx.fillStyle = "#111";
  ctx.fill();

  // Flag pole — cream colour so it reads against both green and black
  ctx.beginPath();
  ctx.moveTo(HOLE.x, HOLE.y - HOLE.radius);
  ctx.lineTo(HOLE.x, HOLE.y - HOLE.radius - 22);
  ctx.strokeStyle = "#e8e0c8";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Flag
  ctx.beginPath();
  ctx.moveTo(HOLE.x, HOLE.y - HOLE.radius - 22);
  ctx.lineTo(HOLE.x + 14, HOLE.y - HOLE.radius - 15);
  ctx.lineTo(HOLE.x, HOLE.y - HOLE.radius - 8);
  ctx.fillStyle = "#e74c3c";
  ctx.fill();
}

function drawWalls() {
  for (const wall of WALLS) {
    // Main stone fill
    ctx.fillStyle = "#9e9e8e";
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);

    // Top highlight — catches the light, makes the wall feel solid
    ctx.fillStyle = "#c8c8b4";
    ctx.fillRect(wall.x, wall.y, wall.w, 3);

    // Left highlight
    ctx.fillStyle = "#b4b4a0";
    ctx.fillRect(wall.x, wall.y + 3, 3, wall.h - 3);

    // Bottom shadow
    ctx.fillStyle = "#6a6a5a";
    ctx.fillRect(wall.x, wall.y + wall.h - 3, wall.w, 3);

    // Right shadow
    ctx.fillRect(wall.x + wall.w - 3, wall.y, 3, wall.h);
  }
}

function drawBall() {
  // Radial gradient: bright highlight top-left fading to gray at the edges.
  // This makes the flat circle read as a 3D sphere under a light source.
  const gradient = ctx.createRadialGradient(
    ball.x - 3, ball.y - 3, 1,        // small highlight circle, offset top-left
    ball.x,     ball.y,     ball.radius // full ball circle
  );
  gradient.addColorStop(0, "#ffffff"); // bright white at the highlight
  gradient.addColorStop(1, "#a0a0a0"); // mid-gray at the shadowed edge

  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
}

function drawAimLine() {
  const dx = aim.currentX - aim.startX;
  const dy = aim.currentY - aim.startY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const power = Math.min(distance, MAX_POWER);

  // Direction the ball will actually travel (opposite to drag)
  const angle = Math.atan2(dy, dx);
  const launchX = ball.x - Math.cos(angle) * power;
  const launchY = ball.y - Math.sin(angle) * power;

  // Dashed line from ball toward launch direction
  ctx.save();
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(ball.x, ball.y);
  ctx.lineTo(launchX, launchY);

  // Colour shifts from yellow (gentle) to red (full power).
  // Yellow and red both contrast well against the green fairway.
  const powerRatio = power / MAX_POWER;
  const r = Math.round(200 + powerRatio * 55);   // 200 → 255
  const g = Math.round(200 - powerRatio * 200);  // 200 → 0
  ctx.strokeStyle = `rgb(${r}, ${g}, 0)`;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Draw a drag handle circle where the mouse is
  ctx.beginPath();
  ctx.arc(aim.currentX, aim.currentY, 5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fill();
}

function drawHint() {
  const text = "Click and drag from the ball — release to shoot";
  ctx.font = "13px Arial";
  ctx.textAlign = "center";

  // Semi-transparent dark pill behind the text so it's readable on any background
  const textWidth = ctx.measureText(text).width;
  const px = 16; // horizontal padding inside the pill
  const rx = canvas.width / 2 - textWidth / 2 - px;
  const ry = canvas.height - 36;
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.beginPath();
  ctx.roundRect(rx, ry, textWidth + px * 2, 26, 6);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.fillText(text, canvas.width / 2, canvas.height - 18);
}

// =============================================
//  GAME LOOP — runs ~60 times per second
// =============================================

function gameLoop() {
  updateBall();
  draw();
  requestAnimationFrame(gameLoop); // schedules the next frame
}

// =============================================
//  WIN / RESET
// =============================================

function triggerWin() {
  gameWon = true;
  winShotsEl.textContent = shots;
  winScreen.classList.remove("hidden");
}

function resetGame() {
  // Restore ball to start position
  ball.x = BALL_START.x;
  ball.y = BALL_START.y;
  ball.velX = 0;
  ball.velY = 0;

  shots = 0;
  gameWon = false;
  isMoving = false;
  canvas.classList.remove("ball-rolling");
  aim.active = false;
  aim.currentX = undefined;

  updateShotCounter();
  winScreen.classList.add("hidden");
}

function updateShotCounter() {
  shotCounterEl.textContent = `Shots: ${shots}`;
}

// =============================================
//  START
// =============================================
gameLoop();
