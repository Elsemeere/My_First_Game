# Maze Golf — Game Design Document

## Concept

The player shoots a golf ball through a maze using a pull-back slingshot mechanic. The goal is to reach the hole in as few shots as possible. Walls bounce the ball, and friction slows it down. Skill comes from predicting bounces and controlling power.

## Core loop

1. Player aims by clicking and dragging away from the ball
2. Player releases — ball launches in the opposite direction of the drag
3. Ball bounces off walls and slows down due to friction
4. Ball either stops (player takes another shot) or reaches the hole (level ends)
5. Win screen shows the shot count; player can reset and try again

## Feel goals

- Satisfying bounce physics — bank shots should feel rewarding
- Aiming should feel intuitive — the colour-coded line helps judge power
- No time pressure — this is a casual puzzle game
- Simple enough for anyone to pick up in 10 seconds

## Current level (v0.1)

```
Canvas: 700 × 500 px

Hole:  top-right area (~630, 60)
Ball:  bottom-left area (~60, 440)

Walls:
  - Long horizontal wall across upper third, gap on the right
  - Vertical wall on the right side of that gap
  - Lower horizontal barrier (forces ball around it)
  - Short vertical blocker in the middle
  - Left-side vertical wall segment near the top
```

The intended solution path: shoot right along the bottom, bank off the right wall, navigate the gap in the upper wall, reach the hole. Multiple paths are possible.

## Scoring

- Count shots only (no time bonus in v0.1)
- No par system yet — just "you did it in N shots!"
- Future: add par targets per level, leaderboard

## Planned future levels

| Level | Theme / gimmick |
|-------|----------------|
| 2 | Longer corridor, requires a bank shot off the top wall |
| 3 | L-shaped path — no direct line to the hole |
| 4 | Moving wall obstacle |
| 5 | Two holes — player picks their path |

## Difficulty progression ideas

- Early levels: open layouts, wide gaps
- Mid levels: tight corridors, bank shots required
- Late levels: moving walls, multiple bounces required
