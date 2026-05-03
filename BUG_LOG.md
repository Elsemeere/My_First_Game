# Maze Golf — Bug Log

Log known bugs here as you find them. Include what you were doing when it happened and whether it's been fixed.

---

## Format

```
### [BUG-###] Short description
- **Status:** Open / Fixed / Won't Fix
- **Found:** YYYY-MM-DD
- **Fixed:** YYYY-MM-DD (if applicable)
- **How to reproduce:** Steps to trigger the bug
- **Notes:** What causes it / what was tried
```

---

## Known bugs

### [BUG-001] Ball can clip through thin walls at very high speed
- **Status:** Won't Fix (v0.1)
- **Found:** 2026-05-02
- **How to reproduce:** Drag to full power and shoot directly at a thin wall end-on
- **Notes:** Caused by tunnelling — the ball moves more than its width in one frame. Walls are thick enough that this is rare in normal play. A proper fix requires continuous collision detection (see TECH_NOTES.md). Deferred until it becomes a real problem.

---

## Fixed bugs

### [BUG-002] Drag could start anywhere on the canvas, not just from the ball
- **Status:** Fixed
- **Found:** 2026-05-02
- **Fixed:** 2026-05-02
- **How to reproduce:** Click far from the ball and drag — ball fires in that direction but the aim line originates from the ball, making the visual inconsistent.
- **Notes:** `onMouseDown` was recording the click position as the drag origin. Fixed by always setting `aim.startX = ball.x` and `aim.startY = ball.y` on mousedown, anchoring the slingshot to the ball.

### [BUG-003] Moving mouse off the canvas accidentally fired a shot
- **Status:** Fixed
- **Found:** 2026-05-02
- **Fixed:** 2026-05-02
- **How to reproduce:** Start a drag, drift the mouse off the canvas edge — a shot fires from the exit position.
- **Notes:** `mouseleave` was wired to `onMouseUp`, which fires a shot. Fixed by adding a separate `cancelAim()` function that clears the drag state without firing.

### [BUG-004] Win triggered before ball visually reached the hole; ball snapped to hole center
- **Status:** Fixed
- **Found:** 2026-05-02
- **Fixed:** 2026-05-02
- **How to reproduce:** Roll the ball toward the hole — the win screen appeared while the ball was still visibly outside the hole, then the ball teleported to the hole center.
- **Notes:** Win threshold was `HOLE.radius + ball.radius * 0.5` (19px), allowing the win to fire when the ball center was 5px outside the hole's drawn edge. Fixed threshold to `HOLE.radius` (14px) so the ball must visually enter the hole. Also removed the position snap (`ball.x = HOLE.x`).

### [BUG-005] No visual feedback that the ball was rolling — clicks silently failed
- **Status:** Fixed
- **Found:** 2026-05-02
- **Fixed:** 2026-05-02
- **How to reproduce:** Fire a shot, then immediately click — nothing happens and there is no indication why.
- **Notes:** `isMoving` blocked input but the cursor stayed as `crosshair`. Fixed by toggling a `ball-rolling` CSS class on the canvas when a shot fires and removing it when the ball stops, switching the cursor to `not-allowed`.

### [BUG-006] No in-game instructions — first-time players didn't know how to shoot
- **Status:** Fixed
- **Found:** 2026-05-02
- **Fixed:** 2026-05-02
- **How to reproduce:** Open the game fresh — a ball and hole appear with no hint of what to do.
- **Notes:** Added `drawHint()` which renders a semi-transparent pill with "Click and drag from the ball — release to shoot" at the bottom of the canvas. It only shows before the first shot and disappears permanently once the player fires.

---

*Add new bugs above this line.*
