import { LevelData, TileType, CubeOrientation, Direction } from '../../utils/Types';

interface ReversePlayOptions {
  width: number;
  height: number;
  minMoves: number;
  maxMoves: number;
}

// State during reverse play generation
interface GenerationState {
  x: number;
  z: number;
  orientation: CubeOrientation;
  tiles: number[][];
  path: Direction[];
}

// Generate a map by starting from the goal and playing backwards
export class ReversePlay {
  public static generate(options: ReversePlayOptions): {
    tiles: number[][];
    start: { x: number; z: number; orientation: CubeOrientation };
    goal: { x: number; z: number };
    path: Direction[];
  } | null {
    const { width, height, minMoves, maxMoves } = options;

    // Initialize empty tiles
    const tiles: number[][] = Array(height)
      .fill(null)
      .map(() => Array(width).fill(TileType.EMPTY));

    // Place goal in center area
    const goalX = Math.floor(width / 2) + Math.floor(Math.random() * 3) - 1;
    const goalZ = Math.floor(height / 2) + Math.floor(Math.random() * 3) - 1;

    tiles[goalZ][goalX] = TileType.GOAL;

    // Start reverse generation from goal
    const state: GenerationState = {
      x: goalX,
      z: goalZ,
      orientation: CubeOrientation.STANDING,
      tiles,
      path: [],
    };

    const targetMoves = minMoves + Math.floor(Math.random() * (maxMoves - minMoves + 1));
    const visited = new Set<string>();
    visited.add(`${state.x},${state.z},${state.orientation}`);

    for (let i = 0; i < targetMoves; i++) {
      const success = this.reverseStep(state, width, height, visited);
      if (!success) break;
    }

    if (state.path.length < minMoves) {
      return null;
    }

    return {
      tiles: state.tiles,
      start: { x: state.x, z: state.z, orientation: state.orientation },
      goal: { x: goalX, z: goalZ },
      path: state.path.reverse().map(d => this.reverseDirection(d)),
    };
  }

  private static reverseStep(
    state: GenerationState,
    width: number,
    height: number,
    visited: Set<string>
  ): boolean {
    const validMoves = this.getValidReverseMoves(state, width, height, visited);

    if (validMoves.length === 0) {
      return false;
    }

    const move = validMoves[Math.floor(Math.random() * validMoves.length)];

    // Apply move
    for (const tile of move.newTiles) {
      if (state.tiles[tile.z][tile.x] === TileType.EMPTY) {
        state.tiles[tile.z][tile.x] = TileType.NORMAL;
      }
    }

    state.x = move.newX;
    state.z = move.newZ;
    state.orientation = move.newOrientation;
    state.path.push(move.direction);

    visited.add(`${state.x},${state.z},${state.orientation}`);

    return true;
  }

  private static getValidReverseMoves(
    state: GenerationState,
    width: number,
    height: number,
    visited: Set<string>
  ): Array<{
    direction: Direction;
    newX: number;
    newZ: number;
    newOrientation: CubeOrientation;
    newTiles: Array<{ x: number; z: number }>;
  }> {
    const moves: Array<{
      direction: Direction;
      newX: number;
      newZ: number;
      newOrientation: CubeOrientation;
      newTiles: Array<{ x: number; z: number }>;
    }> = [];

    const directions = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];

    for (const dir of directions) {
      const result = this.calculateReverseMove(state.x, state.z, state.orientation, dir);

      // Check bounds
      const allValid = result.newTiles.every(
        t => t.x >= 0 && t.x < width && t.z >= 0 && t.z < height
      );

      if (!allValid) continue;

      // Check not visited
      const key = `${result.newX},${result.newZ},${result.newOrientation}`;
      if (visited.has(key)) continue;

      moves.push({
        direction: dir,
        ...result,
      });
    }

    return moves;
  }

  private static calculateReverseMove(
    x: number,
    z: number,
    orientation: CubeOrientation,
    direction: Direction
  ): {
    newX: number;
    newZ: number;
    newOrientation: CubeOrientation;
    newTiles: Array<{ x: number; z: number }>;
  } {
    let newX = x;
    let newZ = z;
    let newOrientation = orientation;
    const newTiles: Array<{ x: number; z: number }> = [];

    switch (orientation) {
      case CubeOrientation.STANDING:
        switch (direction) {
          case Direction.UP:
            newZ += 1;
            newOrientation = CubeOrientation.LYING_Z;
            newTiles.push({ x: newX, z: newZ }, { x: newX, z: newZ + 1 });
            break;
          case Direction.DOWN:
            newZ -= 2;
            newOrientation = CubeOrientation.LYING_Z;
            newTiles.push({ x: newX, z: newZ }, { x: newX, z: newZ + 1 });
            break;
          case Direction.LEFT:
            newX += 1;
            newOrientation = CubeOrientation.LYING_X;
            newTiles.push({ x: newX, z: newZ }, { x: newX + 1, z: newZ });
            break;
          case Direction.RIGHT:
            newX -= 2;
            newOrientation = CubeOrientation.LYING_X;
            newTiles.push({ x: newX, z: newZ }, { x: newX + 1, z: newZ });
            break;
        }
        break;

      case CubeOrientation.LYING_X:
        switch (direction) {
          case Direction.UP:
            newZ += 1;
            newTiles.push({ x: newX, z: newZ }, { x: newX + 1, z: newZ });
            break;
          case Direction.DOWN:
            newZ -= 1;
            newTiles.push({ x: newX, z: newZ }, { x: newX + 1, z: newZ });
            break;
          case Direction.LEFT:
            newX += 2;
            newOrientation = CubeOrientation.STANDING;
            newTiles.push({ x: newX, z: newZ });
            break;
          case Direction.RIGHT:
            newX -= 1;
            newOrientation = CubeOrientation.STANDING;
            newTiles.push({ x: newX, z: newZ });
            break;
        }
        break;

      case CubeOrientation.LYING_Z:
        switch (direction) {
          case Direction.UP:
            newZ += 2;
            newOrientation = CubeOrientation.STANDING;
            newTiles.push({ x: newX, z: newZ });
            break;
          case Direction.DOWN:
            newZ -= 1;
            newOrientation = CubeOrientation.STANDING;
            newTiles.push({ x: newX, z: newZ });
            break;
          case Direction.LEFT:
            newX += 1;
            newTiles.push({ x: newX, z: newZ }, { x: newX, z: newZ + 1 });
            break;
          case Direction.RIGHT:
            newX -= 1;
            newTiles.push({ x: newX, z: newZ }, { x: newX, z: newZ + 1 });
            break;
        }
        break;
    }

    return { newX, newZ, newOrientation, newTiles };
  }

  private static reverseDirection(dir: Direction): Direction {
    switch (dir) {
      case Direction.UP: return Direction.DOWN;
      case Direction.DOWN: return Direction.UP;
      case Direction.LEFT: return Direction.RIGHT;
      case Direction.RIGHT: return Direction.LEFT;
    }
  }
}
