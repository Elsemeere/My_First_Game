# Maze Golf — Feature Backlog

Ideas for future versions, roughly ordered from easiest to hardest. Don't implement these until the current version is stable and fun.

---

## Easy wins (good next steps)

- [x] **Golf course visual theme** — green fairway + rough border, mown stripes, stone-bevelled walls, radial-gradient ball, turf shadow around hole, cream flag pole, yellow-to-red aim line
- [ ] **Multiple levels** — add a `levels` array and a "Next Level" button on the win screen
- [ ] **Par system** — define a par score per level; show "2 under par!" on the win screen
- [ ] **Best score memory** — use `localStorage` to remember the player's best shot count per level
- [ ] **Ball colour picker** — let the player choose the ball colour before playing
- [ ] **Sound effects** — a click when shooting, a thud on wall bounce, a cheer on win (Web Audio API)

## Medium complexity

- [ ] **Animated hole** — spinning or pulsing hole to make it more visible
- [ ] **Shot power meter** — a bar UI showing power level while dragging (alternative to the aim line)
- [ ] **Dotted preview path** — show a few predicted bounce points before releasing (requires reflection math)
- [ ] **Scoring screen** — cumulative score across all levels, shown after the final level
- [ ] **Smooth camera pan** — if levels get bigger than the canvas, pan the view to follow the ball

## Harder features

- [ ] **Moving walls** — walls that oscillate back and forth on a timer
- [ ] **Wind** — a directional force applied each shot (shown as an arrow indicator)
- [ ] **Ramps / slopes** — angled surfaces that redirect the ball (requires rotated rectangle collision)
- [ ] **Level editor** — drag-and-drop interface to place walls and save levels as JSON
- [ ] **Touch polish** — pinch-to-zoom, larger hit targets for mobile play

## Stretch goals

- [ ] **Multiplayer (local)** — two players alternate shots on the same device
- [ ] **Procedural levels** — randomly generated mazes
- [ ] **Online leaderboard** — submit scores to a backend (requires a server)
