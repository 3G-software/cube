import {
  LevelData,
  CubeOrientation,
  Direction,
  TileType,
} from '../utils/Types';
import { MapValidator } from './MapValidator';
import { DifficultyEvaluator } from './DifficultyEvaluator';

interface GeneratorOptions {
  width: number;
  height: number;
  minMoves: number;
  maxMoves: number;
  useSand: boolean;
  useFragile: boolean;
  sandRatio: number;
  fragileRatio: number;
}

const DEFAULT_OPTIONS: GeneratorOptions = {
  width: 7,
  height: 7,
  minMoves: 4,
  maxMoves: 15,
  useSand: false,
  useFragile: false,
  sandRatio: 0.1,
  fragileRatio: 0.05,
};

// Reverse direction for reverse-play generation
function reverseDirection(dir: Direction): Direction {
  switch (dir) {
    case Direction.UP: return Direction.DOWN;
    case Direction.DOWN: return Direction.UP;
    case Direction.LEFT: return Direction.RIGHT;
    case Direction.RIGHT: return Direction.LEFT;
  }
}

export class MapGenerator {
  private options: GeneratorOptions;

  constructor(options: Partial<GeneratorOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  // Generate a map using reverse-play algorithm
  public generate(): LevelData | null {
    const maxAttempts = 100;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const result = this.generateAttempt();
      if (result) {
        return result;
      }
    }

    return null;
  }

  private generateAttempt(): LevelData | null {
    const { width, height, minMoves, maxMoves } = this.options;

    // Initialize empty tiles grid
    const tiles: number[][] = Array(height)
      .fill(null)
      .map(() => Array(width).fill(TileType.EMPTY));

    // Place goal somewhere in the middle region
    const goalX = Math.floor(width / 2) + Math.floor(Math.random() * 3) - 1;
    const goalZ = Math.floor(height / 2) + Math.floor(Math.random() * 3) - 1;

    // Mark goal tile
    tiles[goalZ][goalX] = TileType.GOAL;

    // Start from goal and work backwards
    let currentX = goalX;
    let currentZ = goalZ;
    let currentOrientation = CubeOrientation.STANDING;

    const targetMoves = minMoves + Math.floor(Math.random() * (maxMoves - minMoves + 1));
    const path: Direction[] = [];
    const visitedStates = new Set<string>();

    for (let move = 0; move < targetMoves; move++) {
      // Get valid reverse moves from current position
      const validMoves = this.getValidReverseMoves(
        tiles,
        currentX,
        currentZ,
        currentOrientation,
        visitedStates
      );

      if (validMoves.length === 0) {
        break;
      }

      // Pick random valid move
      const moveInfo = validMoves[Math.floor(Math.random() * validMoves.length)];

      // Apply the reverse move
      this.applyReverseMove(tiles, moveInfo);

      // Update position
      currentX = moveInfo.newX;
      currentZ = moveInfo.newZ;
      currentOrientation = moveInfo.newOrientation;

      // Record path (reversed direction for solution)
      path.unshift(reverseDirection(moveInfo.direction));

      // Mark visited state
      visitedStates.add(`${currentX},${currentZ},${currentOrientation}`);
    }

    // Check if we generated enough moves
    if (path.length < minMoves) {
      return null;
    }

    // Add some random tiles for variety (not on the path)
    this.addRandomTiles(tiles);

    // Apply special tiles if enabled
    if (this.options.useSand) {
      this.applySandTiles(tiles);
    }
    if (this.options.useFragile) {
      this.applyFragileTiles(tiles);
    }

    // Create level data
    const levelData: LevelData = {
      id: `generated_${Date.now()}`,
      name: 'Generated Level',
      difficulty: 0,
      size: { width, height },
      start: { x: currentX, z: currentZ, orientation: currentOrientation },
      goal: { x: goalX, z: goalZ },
      tiles,
      solution: path,
      minMoves: path.length,
    };

    // Validate the generated level
    const solverResult = MapValidator.validate(levelData);
    if (!solverResult.solvable) {
      return null;
    }

    // Evaluate difficulty
    const difficulty = DifficultyEvaluator.evaluate(levelData);
    levelData.difficulty = difficulty.score;
    levelData.minMoves = solverResult.minMoves;
    levelData.solution = solverResult.solution;

    return levelData;
  }

  private getValidReverseMoves(
    tiles: number[][],
    x: number,
    z: number,
    orientation: CubeOrientation,
    visited: Set<string>
  ): Array<{
    direction: Direction;
    newX: number;
    newZ: number;
    newOrientation: CubeOrientation;
    tilesToAdd: Array<{ x: number; z: number }>;
  }> {
    const moves: Array<{
      direction: Direction;
      newX: number;
      newZ: number;
      newOrientation: CubeOrientation;
      tilesToAdd: Array<{ x: number; z: number }>;
    }> = [];

    const directions = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];

    for (const dir of directions) {
      const result = this.calculateReverseMove(x, z, orientation, dir);
      if (!result) continue;

      const { newX, newZ, newOrientation, tilesToAdd } = result;

      // Check bounds
      const allInBounds = tilesToAdd.every(
        t => t.x >= 0 && t.x < this.options.width && t.z >= 0 && t.z < this.options.height
      );
      if (!allInBounds) continue;

      // Check not already visited
      const stateKey = `${newX},${newZ},${newOrientation}`;
      if (visited.has(stateKey)) continue;

      moves.push({ direction: dir, newX, newZ, newOrientation, tilesToAdd });
    }

    return moves;
  }

  private calculateReverseMove(
    x: number,
    z: number,
    orientation: CubeOrientation,
    direction: Direction
  ): {
    newX: number;
    newZ: number;
    newOrientation: CubeOrientation;
    tilesToAdd: Array<{ x: number; z: number }>;
  } | null {
    let newX = x;
    let newZ = z;
    let newOrientation = orientation;
    const tilesToAdd: Array<{ x: number; z: number }> = [];

    // Reverse move calculation (opposite of forward move)
    switch (orientation) {
      case CubeOrientation.STANDING:
        switch (direction) {
          case Direction.UP:
            newZ += 1;
            newOrientation = CubeOrientation.LYING_Z;
            tilesToAdd.push({ x: newX, z: newZ }, { x: newX, z: newZ + 1 });
            break;
          case Direction.DOWN:
            newZ -= 2;
            newOrientation = CubeOrientation.LYING_Z;
            tilesToAdd.push({ x: newX, z: newZ }, { x: newX, z: newZ + 1 });
            break;
          case Direction.LEFT:
            newX += 1;
            newOrientation = CubeOrientation.LYING_X;
            tilesToAdd.push({ x: newX, z: newZ }, { x: newX + 1, z: newZ });
            break;
          case Direction.RIGHT:
            newX -= 2;
            newOrientation = CubeOrientation.LYING_X;
            tilesToAdd.push({ x: newX, z: newZ }, { x: newX + 1, z: newZ });
            break;
        }
        break;

      case CubeOrientation.LYING_X:
        switch (direction) {
          case Direction.UP:
            newZ += 1;
            tilesToAdd.push({ x: newX, z: newZ }, { x: newX + 1, z: newZ });
            break;
          case Direction.DOWN:
            newZ -= 1;
            tilesToAdd.push({ x: newX, z: newZ }, { x: newX + 1, z: newZ });
            break;
          case Direction.LEFT:
            newX += 2;
            newOrientation = CubeOrientation.STANDING;
            tilesToAdd.push({ x: newX, z: newZ });
            break;
          case Direction.RIGHT:
            newX -= 1;
            newOrientation = CubeOrientation.STANDING;
            tilesToAdd.push({ x: newX, z: newZ });
            break;
        }
        break;

      case CubeOrientation.LYING_Z:
        switch (direction) {
          case Direction.UP:
            newZ += 2;
            newOrientation = CubeOrientation.STANDING;
            tilesToAdd.push({ x: newX, z: newZ });
            break;
          case Direction.DOWN:
            newZ -= 1;
            newOrientation = CubeOrientation.STANDING;
            tilesToAdd.push({ x: newX, z: newZ });
            break;
          case Direction.LEFT:
            newX += 1;
            tilesToAdd.push({ x: newX, z: newZ }, { x: newX, z: newZ + 1 });
            break;
          case Direction.RIGHT:
            newX -= 1;
            tilesToAdd.push({ x: newX, z: newZ }, { x: newX, z: newZ + 1 });
            break;
        }
        break;
    }

    return { newX, newZ, newOrientation, tilesToAdd };
  }

  private applyReverseMove(
    tiles: number[][],
    move: {
      tilesToAdd: Array<{ x: number; z: number }>;
    }
  ): void {
    for (const tile of move.tilesToAdd) {
      if (tiles[tile.z][tile.x] === TileType.EMPTY) {
        tiles[tile.z][tile.x] = TileType.NORMAL;
      }
    }
  }

  private addRandomTiles(tiles: number[][]): void {
    // Add some random adjacent tiles for variety
    const { width, height } = this.options;
    const additions = Math.floor(Math.random() * 5) + 2;

    for (let i = 0; i < additions; i++) {
      // Find a tile that has at least one adjacent normal tile
      for (let attempt = 0; attempt < 20; attempt++) {
        const x = Math.floor(Math.random() * width);
        const z = Math.floor(Math.random() * height);

        if (tiles[z][x] === TileType.EMPTY) {
          const hasAdjacent =
            (z > 0 && tiles[z - 1][x] !== TileType.EMPTY) ||
            (z < height - 1 && tiles[z + 1][x] !== TileType.EMPTY) ||
            (x > 0 && tiles[z][x - 1] !== TileType.EMPTY) ||
            (x < width - 1 && tiles[z][x + 1] !== TileType.EMPTY);

          if (hasAdjacent) {
            tiles[z][x] = TileType.NORMAL;
            break;
          }
        }
      }
    }
  }

  private applySandTiles(tiles: number[][]): void {
    const { sandRatio } = this.options;
    const normalTiles: Array<{ x: number; z: number }> = [];

    for (let z = 0; z < tiles.length; z++) {
      for (let x = 0; x < tiles[z].length; x++) {
        if (tiles[z][x] === TileType.NORMAL) {
          normalTiles.push({ x, z });
        }
      }
    }

    const sandCount = Math.floor(normalTiles.length * sandRatio);
    for (let i = 0; i < sandCount && normalTiles.length > 0; i++) {
      const idx = Math.floor(Math.random() * normalTiles.length);
      const tile = normalTiles.splice(idx, 1)[0];
      tiles[tile.z][tile.x] = TileType.SAND;
    }
  }

  private applyFragileTiles(tiles: number[][]): void {
    const { fragileRatio } = this.options;
    const normalTiles: Array<{ x: number; z: number }> = [];

    for (let z = 0; z < tiles.length; z++) {
      for (let x = 0; x < tiles[z].length; x++) {
        if (tiles[z][x] === TileType.NORMAL) {
          normalTiles.push({ x, z });
        }
      }
    }

    const fragileCount = Math.floor(normalTiles.length * fragileRatio);
    for (let i = 0; i < fragileCount && normalTiles.length > 0; i++) {
      const idx = Math.floor(Math.random() * normalTiles.length);
      const tile = normalTiles.splice(idx, 1)[0];
      tiles[tile.z][tile.x] = TileType.FRAGILE;
    }
  }
}
