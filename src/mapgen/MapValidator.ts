import {
  CubeOrientation,
  Direction,
  SolverState,
  SolverResult,
  LevelData,
  TileType,
} from '../utils/Types';

interface StateKey {
  x: number;
  z: number;
  orientation: CubeOrientation;
  fragileMask: number;
}

function stateToKey(state: SolverState): string {
  return `${state.x},${state.z},${state.orientation},${state.fragileMask}`;
}

export class MapValidator {
  private tiles: number[][];
  private width: number;
  private height: number;
  private goal: { x: number; z: number };
  private fragilePositions: Array<{ x: number; z: number; index: number }> = [];

  constructor(levelData: LevelData) {
    this.tiles = levelData.tiles;
    this.height = levelData.tiles.length;
    this.width = levelData.tiles[0]?.length || 0;
    this.goal = levelData.goal;

    // Index all fragile tiles for bitmask tracking
    let fragileIndex = 0;
    for (let z = 0; z < this.height; z++) {
      for (let x = 0; x < this.width; x++) {
        if (this.tiles[z][x] === TileType.FRAGILE) {
          this.fragilePositions.push({ x, z, index: fragileIndex++ });
        }
      }
    }
  }

  // BFS solver
  public solve(start: SolverState): SolverResult {
    const initialMask = (1 << this.fragilePositions.length) - 1; // All fragile tiles present
    const startState: SolverState = {
      ...start,
      fragileMask: initialMask,
    };

    const visited = new Set<string>();
    const queue: Array<{
      state: SolverState;
      path: Direction[];
    }> = [{ state: startState, path: [] }];

    visited.add(stateToKey(startState));
    let statesExplored = 0;

    while (queue.length > 0) {
      const current = queue.shift()!;
      statesExplored++;

      // Check win condition
      if (this.isWinState(current.state)) {
        return {
          solvable: true,
          minMoves: current.path.length,
          solution: current.path,
          statesExplored,
        };
      }

      // Try all four directions
      for (const direction of [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT]) {
        const nextResult = this.tryMove(current.state, direction);

        if (nextResult && !this.isFallState(nextResult)) {
          const key = stateToKey(nextResult);
          if (!visited.has(key)) {
            visited.add(key);
            queue.push({
              state: nextResult,
              path: [...current.path, direction],
            });
          }
        }
      }
    }

    return {
      solvable: false,
      minMoves: -1,
      solution: [],
      statesExplored,
    };
  }

  // Check if state is a winning state
  private isWinState(state: SolverState): boolean {
    return (
      state.orientation === CubeOrientation.STANDING &&
      state.x === this.goal.x &&
      state.z === this.goal.z
    );
  }

  // Try to move and return new state, or null if invalid
  private tryMove(state: SolverState, direction: Direction): SolverState | null {
    const next = this.calculateNextPosition(state, direction);

    // Check if we're standing on sand (not allowed)
    if (next.orientation === CubeOrientation.STANDING) {
      const tile = this.getTileAt(next.x, next.z, state.fragileMask);
      if (tile === TileType.SAND) {
        return null; // Will fall
      }
    }

    return next;
  }

  // Calculate next position after move
  private calculateNextPosition(state: SolverState, direction: Direction): SolverState {
    let newX = state.x;
    let newZ = state.z;
    let newOrientation = state.orientation;
    let newFragileMask = state.fragileMask;

    // Handle fragile tile cracking (when leaving a position)
    const currentPositions = this.getOccupiedPositions(state);
    for (const pos of currentPositions) {
      const fragile = this.fragilePositions.find(f => f.x === pos.x && f.z === pos.z);
      if (fragile && (state.fragileMask & (1 << fragile.index))) {
        // Mark as cracked (still present but will break when left again)
        // For simplicity, we break it immediately after one step
        newFragileMask &= ~(1 << fragile.index);
      }
    }

    switch (state.orientation) {
      case CubeOrientation.STANDING:
        switch (direction) {
          case Direction.UP:
            newZ -= 2;
            newOrientation = CubeOrientation.LYING_Z;
            break;
          case Direction.DOWN:
            newZ += 1;
            newOrientation = CubeOrientation.LYING_Z;
            break;
          case Direction.LEFT:
            newX -= 2;
            newOrientation = CubeOrientation.LYING_X;
            break;
          case Direction.RIGHT:
            newX += 1;
            newOrientation = CubeOrientation.LYING_X;
            break;
        }
        break;

      case CubeOrientation.LYING_X:
        switch (direction) {
          case Direction.UP:
            newZ -= 1;
            break;
          case Direction.DOWN:
            newZ += 1;
            break;
          case Direction.LEFT:
            newX -= 1;
            newOrientation = CubeOrientation.STANDING;
            break;
          case Direction.RIGHT:
            newX += 2;
            newOrientation = CubeOrientation.STANDING;
            break;
        }
        break;

      case CubeOrientation.LYING_Z:
        switch (direction) {
          case Direction.UP:
            newZ -= 1;
            newOrientation = CubeOrientation.STANDING;
            break;
          case Direction.DOWN:
            newZ += 2;
            newOrientation = CubeOrientation.STANDING;
            break;
          case Direction.LEFT:
            newX -= 1;
            break;
          case Direction.RIGHT:
            newX += 1;
            break;
        }
        break;
    }

    return {
      x: newX,
      z: newZ,
      orientation: newOrientation,
      fragileMask: newFragileMask,
    };
  }

  // Check if cube would fall
  private isFallState(state: SolverState): boolean {
    const positions = this.getOccupiedPositions(state);

    for (const pos of positions) {
      const tile = this.getTileAt(pos.x, pos.z, state.fragileMask);
      if (tile === TileType.EMPTY || tile === null) {
        return true;
      }
    }

    return false;
  }

  // Get occupied positions for a state
  private getOccupiedPositions(state: SolverState): Array<{ x: number; z: number }> {
    const positions = [{ x: state.x, z: state.z }];

    switch (state.orientation) {
      case CubeOrientation.LYING_X:
        positions.push({ x: state.x + 1, z: state.z });
        break;
      case CubeOrientation.LYING_Z:
        positions.push({ x: state.x, z: state.z + 1 });
        break;
    }

    return positions;
  }

  // Get tile at position considering fragile mask
  private getTileAt(x: number, z: number, fragileMask: number): TileType | null {
    if (x < 0 || x >= this.width || z < 0 || z >= this.height) {
      return null;
    }

    const tile = this.tiles[z][x];

    // Check if fragile tile has been broken
    if (tile === TileType.FRAGILE) {
      const fragile = this.fragilePositions.find(f => f.x === x && f.z === z);
      if (fragile && !(fragileMask & (1 << fragile.index))) {
        return TileType.EMPTY;
      }
    }

    return tile;
  }

  // Validate a level is solvable
  public static validate(levelData: LevelData): SolverResult {
    const validator = new MapValidator(levelData);
    return validator.solve({
      x: levelData.start.x,
      z: levelData.start.z,
      orientation: levelData.start.orientation,
      fragileMask: 0,
    });
  }
}
