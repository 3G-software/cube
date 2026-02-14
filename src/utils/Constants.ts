// Game constants
export const TILE_SIZE = 1;
export const CUBE_WIDTH = 1;
export const CUBE_HEIGHT = 2;

// Camera settings
export const CAMERA_ANGLE = Math.PI / 4; // 45 degrees
export const CAMERA_DISTANCE = 15;
export const CAMERA_HEIGHT = 12;

// Animation settings
export const ROLL_DURATION = 150; // milliseconds
export const FALL_DURATION = 500;
export const TILE_BREAK_DURATION = 300;

// Colors
export const COLORS = {
  CUBE: '#4a90d9',
  CUBE_EDGE: '#2d5a8a',
  NORMAL_TILE: '#3d3d5c',
  SAND_TILE: '#d4a84b',
  SAND_TILE_DARK: '#a67c3d',
  FRAGILE_TILE: '#a8d8ea',
  FRAGILE_TILE_CRACKED: '#7ec8e3',
  GOAL_TILE: '#2ecc71',
  GOAL_GLOW: '#27ae60',
  BACKGROUND: '#1a1a2e',
  GRID_LINE: '#2a2a4a',
};

// Tile type codes (matching level JSON format)
export const TILE_CODES = {
  EMPTY: 0,
  NORMAL: 1,
  SAND: 2,
  FRAGILE: 3,
  GOAL: 9,
} as const;

// Direction vectors
export const DIRECTIONS = {
  UP: { x: 0, z: -1 },    // Negative Z
  DOWN: { x: 0, z: 1 },   // Positive Z
  LEFT: { x: -1, z: 0 },  // Negative X
  RIGHT: { x: 1, z: 0 },  // Positive X
} as const;

// UI settings
export const DPAD_SIZE = 160;
export const DPAD_BUTTON_SIZE = 50;
export const DPAD_MARGIN = 20;

// Game settings
export const MAX_UNDO_STEPS = 100;
