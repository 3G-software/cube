// Cube orientation states
export enum CubeOrientation {
  STANDING = 'standing',   // 1x1 footprint, vertical
  LYING_X = 'lying_x',     // 2x1 footprint, horizontal along X
  LYING_Z = 'lying_z',     // 1x2 footprint, horizontal along Z
}

// Movement directions
export enum Direction {
  UP = 'up',
  DOWN = 'down',
  LEFT = 'left',
  RIGHT = 'right',
}

// Tile types
export enum TileType {
  EMPTY = 0,
  NORMAL = 1,
  SAND = 2,
  FRAGILE = 3,
  GOAL = 9,
}

// Game states
export enum GameState {
  MENU = 'menu',
  LEVEL_SELECT = 'level_select',
  PLAYING = 'playing',
  PAUSED = 'paused',
  WON = 'won',
  LOST = 'lost',
}

// Position interface
export interface Position {
  x: number;
  z: number;
}

// Cube state for solver and undo
export interface CubeState {
  x: number;
  z: number;
  orientation: CubeOrientation;
}

// Level start configuration
export interface LevelStart {
  x: number;
  z: number;
  orientation: CubeOrientation;
}

// Level goal configuration
export interface LevelGoal {
  x: number;
  z: number;
}

// Level size
export interface LevelSize {
  width: number;
  height: number;
}

// Level data structure (JSON format)
export interface LevelData {
  id: string;
  name: string;
  difficulty: number;
  size: LevelSize;
  start: LevelStart;
  goal: LevelGoal;
  tiles: number[][];
  solution?: Direction[];
  minMoves?: number;
}

// Solver state for BFS
export interface SolverState {
  x: number;
  z: number;
  orientation: CubeOrientation;
  fragileMask: number;  // Bitmask of remaining fragile tiles
}

// Solver result
export interface SolverResult {
  solvable: boolean;
  minMoves: number;
  solution: Direction[];
  statesExplored: number;
}

// Difficulty evaluation result
export interface DifficultyResult {
  score: number;
  minMoves: number;
  boardSize: number;
  tileVariety: number;
  branchingFactor: number;
  deadEnds: number;
}

// Game move for undo system
export interface GameMove {
  direction: Direction;
  previousState: CubeState;
  brokenTiles: Position[];  // Fragile tiles that broke
}

// Level progress data
export interface LevelProgress {
  unlocked: boolean;
  completed: boolean;
  bestMoves?: number;
}

// Save data structure
export interface SaveData {
  currentLevel: number;
  levels: Record<string, LevelProgress>;
}

// Input event types
export interface InputEvent {
  direction: Direction;
  timestamp: number;
}

// Tile occupied positions (cube can occupy 1 or 2 tiles)
export interface OccupiedTiles {
  primary: Position;
  secondary?: Position;  // Only when lying
}

// Animation callback
export type AnimationCallback = () => void;

// Scene type enum
export enum SceneType {
  MENU = 'menu',
  LEVEL_SELECT = 'level_select',
  GAME = 'game',
  EDITOR = 'editor',
}
