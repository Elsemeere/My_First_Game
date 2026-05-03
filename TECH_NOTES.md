# Maze Golf — Technical Notes

Notes on how the code works and why certain decisions were made.

---

## Rendering: HTML Canvas

The game uses the HTML `<canvas>` element and its 2D drawing API (`canvas.getContext("2d")`). Every frame:

1. The canvas is fully cleared with `clearRect`
2. Everything is redrawn from scratch (hole, walls, ball, aim line)

This is called **immediate mode rendering** — simpler than retained-mode systems but fine for small 2D games.

The game loop uses `requestAnimationFrame`, which syncs to the display's refresh rate (~60 fps). This is better than `setInterval` because the browser pauses it when the tab is hidden, saving battery.

## Physics

### Velocity and friction

The ball has `velX` and `velY` — how many pixels it moves per frame. Each frame, both are multiplied by `FRICTION` (0.985). This means the ball loses 1.5% of its speed per frame, creating a realistic slowdown. When speed drops below `MIN_SPEED`, velocity is zeroed out and the ball stops.

### Wall collision (AABB vs circle)

Each wall is an axis-aligned rectangle. To detect if the ball (a circle) has hit a wall:

1. Find the **closest point on the rectangle** to the ball's center using clamping:
   `closestX = clamp(ball.x, wall.left, wall.right)`
2. Measure the distance from the ball center to that closest point
3. If the distance is less than the ball's radius → collision
4. Push the ball out by the overlap amount, along the collision normal
5. Reflect the velocity across the same normal: `vel -= 2 * dot(vel, normal) * normal`

This correctly handles corner hits and prevents the ball from tunnelling through thin walls at low speeds.

### Why the ball might occasionally clip through a wall

At very high speeds, the ball can move more than its diameter in a single frame and skip over a thin wall. This is called **tunnelling**. A proper fix uses **continuous collision detection (CCD)**, which is more complex. For this prototype the wall thickness is kept large enough that tunnelling is rarely noticeable.

## Aiming mechanic

The player drags *away* from the ball. The shot fires in the *opposite* direction. This is the classic slingshot / pool-cue pull-back feel. The formula:

```
direction = normalise(mouseStart - mouseRelease)
power     = min(dragDistance, MAX_POWER)
velocity  = direction * power * POWER_SCALE
```

`POWER_SCALE` (0.12) converts pixel drag distance to a reasonable velocity. `MAX_POWER` (180px) caps the drag so the player can't accidentally fire the ball at extreme speed.

## Input coordinates

Mouse events report coordinates relative to the page (`clientX`, `clientY`). `getCanvasPos()` subtracts the canvas's bounding rect to get canvas-local coordinates. This is important if the canvas is not at (0, 0) on the page.

## Constants to tweak for feel

| Constant | Location | Effect |
|----------|----------|--------|
| `FRICTION` | `game.js` | Higher = ball rolls further; lower = stops fast |
| `MAX_POWER` | `game.js` | Maximum drag distance (pixels) |
| `POWER_SCALE` | `game.js` | Shot speed multiplier |
| `MIN_SPEED` | `game.js` | How slow is "stopped" |
| `HOLE.radius` | `game.js` | How big the win area is |
