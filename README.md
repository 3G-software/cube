# Cube - 3D Puzzle Game

A 3D puzzle game inspired by Bloxorz, built with Babylon.js and TypeScript.

## Game Rules

- Control a 1x1x2 cuboid block to reach the goal tile
- The block can stand upright (1x1 footprint) or lie flat (1x2 footprint)
- Don't fall off the edges!
- Special tiles:
  - Normal (gray): Safe to stand or lie on
  - Sand (yellow): Cannot stand upright on these tiles
  - Fragile (brown): Breaks after you leave, can only be used once
  - Goal (green): Stand upright on this tile to win

## Controls

- Arrow keys or WASD: Move the block
- On-screen D-pad for touch devices
- Undo button: Revert last move
- Restart button: Reset the level

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

## Tech Stack

- Babylon.js - 3D rendering engine
- TypeScript - Type-safe JavaScript
- Vite - Build tool and dev server
