# Maze Golf — Claude Context

This file gives Claude (the AI assistant) context about this project so it can help effectively.

## Project summary

**Maze Golf** is a beginner-built browser game. The developer is learning HTML, CSS, and JavaScript for the first time. The priority is always clarity and simplicity — not cleverness.

## Tech stack

- Plain HTML5, CSS3, JavaScript (ES6+)
- HTML Canvas API for rendering
- No frameworks, no build tools, no npm
- Runs by opening `index.html` directly in a browser

## Developer level

Beginner. Explain things clearly. Avoid jargon. When suggesting code, prefer readable over terse. Always add short comments explaining *why*, not just *what*.

## Code conventions

- All game logic lives in `game.js`
- Styling lives in `style.css`
- Do not introduce external libraries without discussing it first
- Keep functions short and single-purpose
- Use `const` for things that don't change, `let` for things that do

## Current prototype scope

The current version (v0.1) is a single-level prototype. It has:
- One canvas, 700×500 px
- A white ball, a hole with a red flag, and 5 wall obstacles
- Pull-back slingshot aiming
- Friction-based physics and AABB wall collision
- Shot counter and win screen

## What to avoid

- Do not add features not discussed first
- Do not refactor working code without a clear reason
- Do not introduce TypeScript, bundlers, or build steps
- Do not split game logic into multiple files yet

## Where to look

- All game state and constants are at the top of `game.js`
- Level data (walls, hole position, ball start) is in the `WALLS`, `HOLE`, and `BALL_START` objects in `game.js`
- The game loop is `gameLoop()` at the bottom of `game.js`
