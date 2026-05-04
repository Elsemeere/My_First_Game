// =============================================
//  Maze Golf — game.js
//  All game logic lives here.
// =============================================

// --- Canvas setup ---
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d"); // ctx is the drawing "pen" for the canvas

// --- UI elements ---
const shotCounterEl  = document.getElementById("shot-counter");
const levelLabelEl   = document.getElementById("level-label");
const winScreen      = document.getElementById("win-screen");
const winShotsEl     = document.getElementById("win-shots");
const winTitleEl     = document.getElementById("win-title");
const nextHoleBtn    = document.getElementById("next-hole-btn");
document.getElementById("reset-btn").addEventListener("click", resetGame);
document.getElementById("play-again-btn").addEventListener("click", resetGame);
nextHoleBtn.addEventListener("click", nextLevel);

// =============================================
//  AUDIO
//  new Audio() works with local file:// URLs; fetch()-based Web Audio does not.
//  currentTime = 0 rewinds before each play so rapid shots don't get cut off.
// =============================================
const hitSound    = new Audio('Sound Effects/Ball Hit on Fairway.wav');
const bounceSound = new Audio('Sound Effects/Metal Wall Bounce.wav');

function playHitSound() {
  hitSound.currentTime = 0.0;
  hitSound.play().catch(() => {});
}

function playBounceSound() {
  bounceSound.currentTime = 0.0;
  bounceSound.play().catch(() => {});
}

// Background music — loops at low volume.
// Starts on title screen; loadLevel() swaps the src for each hole.
// Autoplay is blocked until first user interaction, so we retry on click or keydown.
const bgMusic  = new Audio('Music/Title Music.mp3');
bgMusic.loop   = true;
bgMusic.volume = 0.05;

// Music starts when the player begins the game (inside a user gesture).
// No autoplay attempt here — browsers block it anyway.
let currentMusicSrc = ''; // tracks what's playing so we don't restart the same track

// =============================================
//  TILE IMAGES
//  Loaded asynchronously — the game loop starts only once all 3 are ready.
// =============================================
const imgFairway = new Image();
const imgRough   = new Image();
const imgGreen   = new Image();

let tilesLoaded = 0;
function onTileLoaded() {
  tilesLoaded++;
  if (tilesLoaded === 3) {
    // Tile assets ready — start the game loop in title-screen mode.
    // loadLevel(0) is called only when the player presses Enter / clicks Start.
    gameLoop();
  }
}
imgFairway.onload = onTileLoaded;
imgRough.onload   = onTileLoaded;
imgGreen.onload   = onTileLoaded;

imgFairway.src = 'Graphic Assets/Tiles/Fairway Tile.png';
imgRough.src   = 'Graphic Assets/Tiles/Rough Tile.png';
imgGreen.src   = 'Graphic Assets/Tiles/Green Tile.png';

// Wall tile images — horizontal and vertical variants.
const imgHorzWall = new Image();
const imgVertWall = new Image();
imgHorzWall.src = 'Graphic Assets/Tiles/Horz_Wall-removebg-preview.png';
imgVertWall.src = 'Graphic Assets/Tiles/Vert_Wall-removebg-preview.png';

// Starting zone marker — drawn centered on the ball's start position.
const imgStartZone = new Image();
imgStartZone.src = 'Graphic Assets/Tiles/Start Zone.png';

// Title screen animation frames — cycled on the title screen before the game starts.
const imgTitle = [];
for (let i = 1; i <= 5; i++) {
  const img = new Image();
  img.src = `Graphic Assets/Title Screen/Title ${i}.png`;
  imgTitle.push(img);
}

// Ball roll sprites — 3 frames cycled while the ball is moving.
// Images already have transparent backgrounds so they can be drawn directly.
const imgBallRoll = [new Image(), new Image(), new Image()];
imgBallRoll[0].src = 'Graphic Assets/Golf Ball/Ball_Roll_1.png';
imgBallRoll[1].src = 'Graphic Assets/Golf Ball/Ball_Roll_2.png';
imgBallRoll[2].src = 'Graphic Assets/Golf Ball/Ball_Roll_3.png';

// =============================================
//  LEVEL DATA
//  Each level defines walls, hole, ball start, and music track.
// =============================================
const levels = [
  {
    // Hole 1 — Z-path: ball bottom-left, hole top-right
    ballStart: { x: 60,  y: 440 },
    hole:      { x: 630, y: 60,  radius: 14 },
    walls: [
      { x: 0,   y: 325, w: 560, h: 18 }, // Gate 1: gap on RIGHT
      { x: 140, y: 168, w: 560, h: 18 }, // Gate 2: gap on LEFT
    ],
    music: 'Music/Level 1 Music.mp3',
  },
  {
    // Hole 2 — S-path: ball bottom-right, hole top-left, three gates
    ballStart: { x: 640, y: 440 },
    hole:      { x: 60,  y: 60,  radius: 14 },
    walls: [
      { x: 0,   y: 340, w: 540, h: 18 }, // Gate 1: gap on RIGHT (540-682)
      { x: 140, y: 230, w: 542, h: 18 }, // Gate 2: gap on LEFT  (18-140)
      { x: 0,   y: 130, w: 540, h: 18 }, // Gate 3: gap on RIGHT (540-682)
    ],
    music: 'Music/Level 1 Music.mp3',
  },
  {
    // Hole 3 — Z-path with a moving wall in the mid-corridor.
    // The moving wall slides left-right across the gap, so the player must
    // time their shot to pass through when the opening is on their side.
    ballStart: { x: 60,  y: 440 },
    hole:      { x: 630, y: 60,  radius: 14 },
    walls: [
      { x: 0,   y: 330, w: 520, h: 18 }, // Gate 1: gap on RIGHT (520-682)
      { x: 150, y: 165, w: 550, h: 18 }, // Gate 2: gap on LEFT  (18-150)
      // Moving wall — slides across the mid-corridor, always leaving a gap on one side
      { x: 175, y: 248, w: 350, h: 18,
        moveAxis: 'x', moveMin: 18, moveMax: 332, moveSpeed: 1.5, moveDir: 1 },
    ],
    music: 'Music/Level 1 Music.mp3',
  },
];

// =============================================
//  GAME OBJECTS
//  Initialised from levels[0]; loadLevel() updates these each hole.
// =============================================

const HOLE      = { x: 630, y: 60, radius: 14 };
const WALLS     = [];
const BALL_START = { x: 60, y: 440 };

// The ball — starts at BALL_START; vel = velocity per frame
const ball = {
  x: BALL_START.x,
  y: BALL_START.y,
  radius: 10,
  velX: 0,
  velY: 0,
};

// =============================================
//  GAME STATE
// =============================================
let gameState     = 'title'; // 'title' until the player presses Enter, then 'playing'
let titleFrame    = 0;       // which title image is currently showing (0-4)
let titleFrameTick = 0;      // tick counter for the title animation
let currentLevel  = 0;       // index into the levels array
let shots = 0;               // how many times the player has fired this hole
let gameWon = false;       // true once the ball reaches the hole
let isMoving = false;      // true while the ball is rolling
let ballFrame     = 0;     // which sprite frame (0-2) is currently showing
let ballFrameTick = 0;     // counts game ticks; frame advances every 6 ticks (~10fps)
let tileGrid = [];         // 2D array of 'rough'|'fairway'|'green', built once per level
let bgLayer  = null;       // offscreen canvas with pre-drawn background tiles (rebuilt per level)
let hintDismissed = false; // hint hides permanently after the player's first ever shot

// Aiming state — tracks the mouse drag
const aim = {
  active: false,  // true while the player is holding the mouse down
  startX: 0,      // where the drag started
  startY: 0,
};

// Physics constants
// Friction per surface type — applied every frame while the ball rolls.
// Values closer to 1.0 mean less slowdown (faster surface).
const FRICTION = {
  rough:   0.970,  // thick grass — ball slows noticeably
  fairway: 0.985,  // mown fairway — normal speed
  green:   0.992,  // putting green — ball runs fast and far
};
const MIN_SPEED = 0.15;      // below this speed the ball is considered stopped
const MAX_POWER = 180;       // maximum drag distance (in pixels) — caps shot power
const POWER_SCALE = 0.12;    // converts drag pixels to velocity units

// Tile constants
const TILE_SIZE    = 32;  // canvas pixels per background tile
const GREEN_RADIUS = 65;  // pixel radius of the putting green around the hole
const PERIM        = 18;  // perimeter wall thickness — must match drawPerimeterWall()

// =============================================
//  INPUT — Mouse events for aiming
// =============================================

canvas.addEventListener("mousedown", onMouseDown);

// Enter key starts the game from the title screen
// S key skips the current hole (for testing)
document.addEventListener("keydown", e => {
  if (e.key === "Enter" && gameState === "title") startGame();
  if (e.key === "s" && gameState === "playing" && !gameWon) triggerWin();
});
// mousemove and mouseup are on window, not canvas — this means the drag
// keeps working even when the cursor leaves the canvas boundary, so the
// player can pull back to full power from any ball position.
window.addEventListener("mousemove", onMouseMove);
window.addEventListener("mouseup", onMouseUp);

// Touch support — only intercept single-finger touches so pinch-to-zoom works naturally.
// When a second finger appears, cancel any in-progress aim and let the browser handle it.
canvas.addEventListener("touchstart", e => {
  if (e.touches.length === 1) {
    e.preventDefault();
    onMouseDown(e.touches[0]);
  } else {
    aim.active = false; // cancel aim if pinch starts mid-drag
  }
}, { passive: false });

canvas.addEventListener("touchmove", e => {
  if (e.touches.length === 1) {
    e.preventDefault();
    onMouseMove(e.touches[0]);
  }
}, { passive: false });

canvas.addEventListener("touchend", e => {
  // Only fire if this was the last finger lifting (not one finger of a pinch releasing)
  if (e.touches.length === 0 && e.changedTouches.length === 1) {
    e.preventDefault();
    onMouseUp(e.changedTouches[0]);
  }
}, { passive: false });

function getCanvasPos(event) {
  // Converts a page-level mouse/touch position to canvas-local coordinates.
  // With viewport width=700, CSS pixels match canvas pixels exactly — no scale needed.
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function onMouseDown(event) {
  if (gameState === 'title') { startGame(); return; }
  if (gameWon || isMoving) return;

  const pos = getCanvasPos(event);

  // Require the tap/click to start within 50px of the ball.
  // Without this, tapping anywhere on the fairway would instantly fire a shot.
  const dx = pos.x - ball.x;
  const dy = pos.y - ball.y;
  if (Math.sqrt(dx * dx + dy * dy) > 50) return;

  aim.active = true;
  aim.startX  = ball.x; // anchor drag origin to ball for slingshot feel
  aim.startY  = ball.y;
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
  hintDismissed = true;
  isMoving = true;
  canvas.classList.add("ball-rolling"); // cursor → not-allowed while ball moves
  playHitSound();
  updateShotCounter();
}

// =============================================
//  PHYSICS — called every frame while ball moves
// =============================================

function updateBall() {
  if (!isMoving) return;

  // Sub-stepping: split the move into small chunks so the ball can't tunnel
  // through a wall in a single frame. Each step is at most ball.radius pixels,
  // which is always smaller than the thinnest wall (18px).
  const speed = Math.sqrt(ball.velX * ball.velX + ball.velY * ball.velY);
  const steps = Math.max(1, Math.ceil(speed / ball.radius));
  const sx = ball.velX / steps;
  const sy = ball.velY / steps;

  for (let i = 0; i < steps; i++) {
    ball.x += sx;
    ball.y += sy;

    // Bounce off the perimeter wall
    if (ball.x - ball.radius < PERIM) {
      ball.x = PERIM + ball.radius;
      ball.velX = Math.abs(ball.velX);
      playBounceSound();
    }
    if (ball.x + ball.radius > canvas.width - PERIM) {
      ball.x = canvas.width - PERIM - ball.radius;
      ball.velX = -Math.abs(ball.velX);
      playBounceSound();
    }
    if (ball.y - ball.radius < PERIM) {
      ball.y = PERIM + ball.radius;
      ball.velY = Math.abs(ball.velY);
      playBounceSound();
    }
    if (ball.y + ball.radius > canvas.height - PERIM) {
      ball.y = canvas.height - PERIM - ball.radius;
      ball.velY = -Math.abs(ball.velY);
      playBounceSound();
    }

    // Bounce off inner walls
    for (const wall of WALLS) {
      resolveWallCollision(ball, wall);
    }
  }

  // Friction is applied once per frame (not per sub-step) based on current tile.
  const tileCol  = Math.floor(ball.x / TILE_SIZE);
  const tileRow  = Math.floor(ball.y / TILE_SIZE);
  const surface  = (tileGrid[tileRow] && tileGrid[tileRow][tileCol]) || 'fairway';
  ball.velX *= FRICTION[surface];
  ball.velY *= FRICTION[surface];

  // Check if the ball has nearly stopped
  if (speed < MIN_SPEED) {
    ball.velX = 0;
    ball.velY = 0;
    isMoving = false;
    canvas.classList.remove("ball-rolling");
  }

  // Check win condition
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
//  Dispatches to rect or arc collision based on wall type.
// =============================================
function resolveWallCollision(ball, wall) {
  if (wall.type === 'arc') {
    resolveArcWallCollision(ball, wall);
  } else {
    resolveRectWallCollision(ball, wall);
  }
}

// Rectangle collision — Axis-Aligned Bounding Box (AABB) vs circle.
function resolveRectWallCollision(ball, wall) {
  const closestX = Math.max(wall.x, Math.min(ball.x, wall.x + wall.w));
  const closestY = Math.max(wall.y, Math.min(ball.y, wall.y + wall.h));

  const distX = ball.x - closestX;
  const distY = ball.y - closestY;
  const distance = Math.sqrt(distX * distX + distY * distY);

  if (distance >= ball.radius) return;

  const overlap = ball.radius - distance;

  if (distance === 0) {
    ball.y -= ball.radius;
    ball.velY = -Math.abs(ball.velY);
    return;
  }

  const nx = distX / distance;
  const ny = distY / distance;
  ball.x += nx * overlap;
  ball.y += ny * overlap;

  const dot = ball.velX * nx + ball.velY * ny;
  ball.velX -= 2 * dot * nx;
  ball.velY -= 2 * dot * ny;
  playBounceSound();
}

// Arc (curved) wall collision — circle vs thick circular arc.
// The arc is treated as a curved stripe centred at radius r from (cx, cy).
function resolveArcWallCollision(ball, wall) {
  const { cx, cy, r, startAngle, endAngle, thickness } = wall;
  const span         = endAngle - startAngle; // angular width of the arc (> 0)
  const collisionDist = ball.radius + thickness / 2;

  // Ball's angle from the arc centre, in [-π, π]
  const ballAngle = Math.atan2(ball.y - cy, ball.x - cx);

  // Clockwise angular distance from startAngle to ballAngle, normalised to [0, 2π)
  const relAngle = ((ballAngle - startAngle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);

  // Closest angle on the arc to the ball
  let closestAngle;
  if (relAngle <= span) {
    closestAngle = ballAngle; // ball is within the arc's angular sweep
  } else {
    // Ball is outside the sweep — pick the nearer endpoint
    const distToEnd   = relAngle - span;
    const distToStart = 2 * Math.PI - relAngle;
    closestAngle = distToEnd < distToStart ? endAngle : startAngle;
  }

  // Closest point on the arc centreline
  const px = cx + r * Math.cos(closestAngle);
  const py = cy + r * Math.sin(closestAngle);

  const dx = ball.x - px;
  const dy = ball.y - py;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist >= collisionDist || dist === 0) return;

  // Push the ball out and reflect its velocity
  const nx = dx / dist;
  const ny = dy / dist;
  ball.x += nx * (collisionDist - dist);
  ball.y += ny * (collisionDist - dist);

  const dot = ball.velX * nx + ball.velY * ny;
  ball.velX -= 2 * dot * nx;
  ball.velY -= 2 * dot * ny;
  playBounceSound();
}

// =============================================
//  TILE GRID BUILDER
//  Runs once when images load. Classifies every 32×32 cell on the canvas
//  as 'rough', 'fairway', or 'green' so drawBackground() can stamp the
//  right image each frame without re-calculating anything.
// =============================================

function buildTileGrid() {
  const cols = Math.ceil(canvas.width  / TILE_SIZE) + 1;
  const rows = Math.ceil(canvas.height / TILE_SIZE) + 1;
  tileGrid = [];
  for (let row = 0; row < rows; row++) {
    tileGrid[row] = [];
    for (let col = 0; col < cols; col++) {
      // Use the centre of the cell for distance checks
      const cx = col * TILE_SIZE + TILE_SIZE / 2;
      const cy = row * TILE_SIZE + TILE_SIZE / 2;
      tileGrid[row][col] = classifyTile(col, row, cx, cy);
    }
  }

  // Bake all tiles into a single offscreen canvas so draw() only needs
  // one drawImage call instead of ~350 every frame — big mobile perf win.
  bgLayer = document.createElement('canvas');
  bgLayer.width  = canvas.width;
  bgLayer.height = canvas.height;
  const bgCtx = bgLayer.getContext('2d');
  for (let row = 0; row < tileGrid.length; row++) {
    for (let col = 0; col < tileGrid[row].length; col++) {
      const type = tileGrid[row][col];
      const img  = type === 'rough' ? imgRough
                 : type === 'green' ? imgGreen
                 :                    imgFairway;
      bgCtx.drawImage(img, col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }
}

function classifyTile(col, row, cx, cy) {
  // 1. Green — smooth putting surface around the hole (highest priority)
  const dHole = Math.sqrt((cx - HOLE.x) ** 2 + (cy - HOLE.y) ** 2);
  if (dHole < GREEN_RADIUS) return 'green';

  // 2. Rough near canvas edges only — depth varies 1–2 tiles with a low-frequency
  //    wave so the border undulates gently rather than cutting in choppy blocks.
  //    Walls are NOT given a rough fringe — they read clearly as stone obstacles
  //    and adding rough around them fragments the fairway corridors.
  const edgeDist = Math.min(cx, cy, canvas.width - cx, canvas.height - cy);
  if (edgeDist < roughVariance(col, row, 1, 2) * TILE_SIZE) return 'rough';

  // 3. Everything else is open fairway
  return 'fairway';
}

// Returns a consistent integer in [min, max] based on tile position.
// Low-frequency multipliers (0.3–0.5) produce long, slow waves so the rough
// edge curves gently rather than producing small choppy blocks.
function roughVariance(col, row, min, max) {
  const v = Math.sin(col * 0.35 + row * 0.5) * Math.cos(col * 0.28 - row * 0.42);
  // v is in [-1, 1]; map to [min, max]
  return min + Math.round(((v + 1) / 2) * (max - min));
}

// Returns the closest point on a wall rectangle to the given point.
// Shared between tile classification and wall collision.
function closestPointOnRect(px, py, wall) {
  return {
    x: Math.max(wall.x, Math.min(px, wall.x + wall.w)),
    y: Math.max(wall.y, Math.min(py, wall.y + wall.h)),
  };
}

// =============================================
//  DRAWING — clears and redraws every frame
// =============================================

function draw() {
  // Clear the whole canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawBackground();
  drawStartZone();   // drawn before perimeter so border covers any edge overflow
  drawPerimeterWall();
  drawWalls();
  drawHole();
  drawBall();

  if (aim.active && aim.currentX !== undefined) {
    drawAimLine();
  }

  // Show the hint until the player fires their very first shot ever.
  if (!gameWon && !hintDismissed && !isMoving) {
    drawHint();
  }
}

function drawBackground() {
  // Single drawImage from the pre-baked offscreen canvas — replaces ~350 calls per frame.
  if (bgLayer) ctx.drawImage(bgLayer, 0, 0);
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
    if (wall.type === 'arc') {
      drawArcWall(wall);
    } else {
      drawRectWall(wall);
    }
  }
}

function drawRectWall(wall) {
  const isHorz = wall.w >= wall.h;

  ctx.fillStyle = '#9a6828';
  ctx.fillRect(wall.x, wall.y, wall.w, wall.h);

  ctx.strokeStyle = 'rgba(0,0,0,0.09)';
  ctx.lineWidth = 1;
  if (isHorz) {
    for (let i = 3; i < wall.h - 2; i += 3) {
      ctx.beginPath();
      ctx.moveTo(wall.x, wall.y + i);
      ctx.lineTo(wall.x + wall.w, wall.y + i);
      ctx.stroke();
    }
  } else {
    for (let i = 3; i < wall.w - 2; i += 3) {
      ctx.beginPath();
      ctx.moveTo(wall.x + i, wall.y);
      ctx.lineTo(wall.x + i, wall.y + wall.h);
      ctx.stroke();
    }
  }

  ctx.fillStyle = 'rgba(255,210,130,0.4)';
  if (isHorz) ctx.fillRect(wall.x, wall.y, wall.w, 2);
  else        ctx.fillRect(wall.x, wall.y, 2, wall.h);

  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  if (isHorz) ctx.fillRect(wall.x, wall.y + wall.h - 2, wall.w, 2);
  else        ctx.fillRect(wall.x + wall.w - 2, wall.y, 2, wall.h);
}

function drawArcWall(wall) {
  const { cx, cy, r, startAngle, endAngle, thickness } = wall;

  // Main wood fill — a thick arc stroke
  ctx.beginPath();
  ctx.arc(cx, cy, r, startAngle, endAngle);
  ctx.strokeStyle = '#9a6828';
  ctx.lineWidth   = thickness;
  ctx.lineCap     = 'round';
  ctx.stroke();

  // Concentric grain lines along the arc (same feel as the rect walls)
  ctx.strokeStyle = 'rgba(0,0,0,0.09)';
  ctx.lineWidth   = 1;
  ctx.lineCap     = 'butt';
  for (let offset = -Math.floor(thickness / 2) + 3; offset < thickness / 2 - 2; offset += 3) {
    ctx.beginPath();
    ctx.arc(cx, cy, r + offset, startAngle, endAngle);
    ctx.stroke();
  }

  // Bright shimmer on the outer edge
  ctx.beginPath();
  ctx.arc(cx, cy, r - thickness / 2 + 1, startAngle, endAngle);
  ctx.strokeStyle = 'rgba(255,210,130,0.4)';
  ctx.lineWidth   = 2;
  ctx.lineCap     = 'round';
  ctx.stroke();

  // Dark shadow on the inner edge
  ctx.beginPath();
  ctx.arc(cx, cy, r + thickness / 2 - 1, startAngle, endAngle);
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth   = 2;
  ctx.stroke();
}

function drawStartZone() {
  if (!imgStartZone.complete || imgStartZone.naturalWidth === 0) return;
  // 3× the visual ball diameter so the marker is clearly visible
  const size = (ball.radius + 10) * 2 * 3; // = 120 px
  ctx.drawImage(
    imgStartZone,
    BALL_START.x - size / 2,
    BALL_START.y - size / 2,
    size, size
  );
}

function drawPerimeterWall() {
  const t = PERIM;
  const w = canvas.width;
  const h = canvas.height;

  // Draw the border as one single frame-shaped path using the even-odd fill rule.
  // The inner rect punches a hole in the outer rect, giving perfect mitered corners
  // with absolutely no seams or overlaps.
  ctx.beginPath();
  ctx.rect(0, 0, w, h);           // outer boundary
  ctx.rect(t, t, w - t*2, h - t*2); // inner cutout
  ctx.fillStyle = '#9a6828';
  ctx.fill('evenodd');

  // Horizontal wood grain lines on top and bottom strips
  ctx.strokeStyle = 'rgba(0,0,0,0.09)';
  ctx.lineWidth = 1;
  for (let i = 3; i < t - 2; i += 3) {
    ctx.beginPath();
    ctx.moveTo(0, i);       ctx.lineTo(w, i);           // top strip
    ctx.moveTo(0, h-t+i);   ctx.lineTo(w, h-t+i);       // bottom strip
    ctx.stroke();
  }
  // Vertical grain on left and right strips
  for (let i = 3; i < t - 2; i += 3) {
    ctx.beginPath();
    ctx.moveTo(i, t);       ctx.lineTo(i, h-t);          // left strip
    ctx.moveTo(w-t+i, t);   ctx.lineTo(w-t+i, h-t);     // right strip
    ctx.stroke();
  }

  // Bright outer rim (light catching the top surface)
  ctx.strokeStyle = 'rgba(255,210,130,0.4)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, w-2, h-2);

  // Dark inner rim (shadow where the wall drops to the fairway)
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 2;
  ctx.strokeRect(t, t, w - t*2, h - t*2);
}

function drawBall() {
  const img        = imgBallRoll[ballFrame];
  const drawRadius = ball.radius + 10; // visually larger than physics radius
  const size       = drawRadius * 2;

  if (img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, ball.x - drawRadius, ball.y - drawRadius, size, size);
  } else {
    // Fallback gradient while images are still loading.
    const gradient = ctx.createRadialGradient(
      ball.x - 3, ball.y - 3, 1,
      ball.x,     ball.y,     ball.radius
    );
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(1, "#a0a0a0");
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  }
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

function drawTitleScreen() {
  // Advance animation at ~8fps (every 8 game ticks at 60fps)
  titleFrameTick++;
  if (titleFrameTick >= 8) {
    titleFrameTick = 0;
    titleFrame = (titleFrame + 1) % imgTitle.length;
  }

  const img = imgTitle[titleFrame];
  if (img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  } else {
    // Fallback colour while images load
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function startGame() {
  gameState = 'playing';
  document.getElementById('ui-bar').style.visibility = 'visible';
  loadLevel(0);
}

function gameLoop() {
  if (gameState === 'title') {
    drawTitleScreen();
  } else {
    updateMovingWalls();
    updateBall();

    if (isMoving) {
      ballFrameTick++;
      if (ballFrameTick >= 6) {
        ballFrameTick = 0;
        ballFrame = (ballFrame + 1) % 3;
      }
    } else {
      ballFrame = 0;
      ballFrameTick = 0;
    }

    draw();
  }

  requestAnimationFrame(gameLoop);
}

// =============================================
//  MOVING WALLS — called every frame
// =============================================

function updateMovingWalls() {
  for (const wall of WALLS) {
    if (!wall.moveAxis) continue; // skip static walls

    if (wall.moveAxis === 'x') {
      wall.x += wall.moveSpeed * wall.moveDir;
      if (wall.x <= wall.moveMin) { wall.x = wall.moveMin; wall.moveDir =  1; }
      if (wall.x >= wall.moveMax) { wall.x = wall.moveMax; wall.moveDir = -1; }
    } else {
      wall.y += wall.moveSpeed * wall.moveDir;
      if (wall.y <= wall.moveMin) { wall.y = wall.moveMin; wall.moveDir =  1; }
      if (wall.y >= wall.moveMax) { wall.y = wall.moveMax; wall.moveDir = -1; }
    }
  }
}

// =============================================
//  WIN / RESET
// =============================================

function triggerWin() {
  gameWon = true;
  winShotsEl.textContent = shots;
  const isLastLevel = currentLevel === levels.length - 1;
  winTitleEl.textContent = isLastLevel ? 'Course Complete!' : 'Hole Complete!';
  nextHoleBtn.classList.toggle('hidden', isLastLevel);
  winScreen.classList.remove("hidden");
}

function nextLevel() {
  currentLevel++;
  loadLevel(currentLevel);
}

function loadLevel(index) {
  const level = levels[index];

  // Update active level data
  HOLE.x = level.hole.x;
  HOLE.y = level.hole.y;
  HOLE.radius = level.hole.radius;

  WALLS.length = 0;
  // Spread-copy each wall so moving wall positions don't mutate the source data on reset.
  level.walls.forEach(w => WALLS.push({ ...w }));

  BALL_START.x = level.ballStart.x;
  BALL_START.y = level.ballStart.y;

  // Rebuild tile grid so the green zone moves to the new hole position
  buildTileGrid();

  // Only swap the track if it's actually changing — keeps music continuous between holes.
  if (level.music !== currentMusicSrc) {
    currentMusicSrc = level.music;
    bgMusic.src = level.music;
    bgMusic.load();
    bgMusic.play().catch(() => {});
  }

  // Update hole label
  levelLabelEl.textContent = `Hole ${index + 1}`;

  // Reset game state for the new hole
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

function resetGame() {
  // Restart the current hole from scratch
  loadLevel(currentLevel);
}

function updateShotCounter() {
  shotCounterEl.textContent = `Shots: ${shots}`;
}

// =============================================
//  START
//  The game loop is kicked off by onTileLoaded() once all 3 tile
//  images have finished loading (see the TILE IMAGES section above).
// =============================================
