import { Cube } from '../entities/Cube';
import { Tile } from '../entities/Tile';
import { FragileTile } from '../entities/FragileTile';
import { SandTile } from '../entities/SandTile';
import { GoalTile } from '../entities/GoalTile';
import {
  Direction,
  CubeOrientation,
  CubeState,
  Position,
  OccupiedTiles,
  GameMove,
  TileType,
} from '../../utils/Types';

export type MoveCallback = (move: GameMove) => void;
export type WinCallback = () => void;
export type LoseCallback = () => void;

export class CubeController {
  private cube: Cube;
  private tiles: Map<string, Tile>;
  private levelWidth: number;
  private levelHeight: number;
  private goalPosition: Position;

  private onMoveCallbacks: MoveCallback[] = [];
  private onWinCallbacks: WinCallback[] = [];
  private onLoseCallbacks: LoseCallback[] = [];

  constructor(
    cube: Cube,
    tiles: Map<string, Tile>,
    levelWidth: number,
    levelHeight: number,
    goalPosition: Position
  ) {
    this.cube = cube;
    this.tiles = tiles;
    this.levelWidth = levelWidth;
    this.levelHeight = levelHeight;
    this.goalPosition = goalPosition;
  }

  // Try to move the cube in a direction
  public tryMove(direction: Direction): boolean {
    if (this.cube.getIsAnimating()) {
      return false;
    }

    const currentState = this.cube.getState();
    const nextState = this.calculateNextState(currentState, direction);

    // Check if move is valid
    if (!this.isValidMove(nextState)) {
      return false;
    }

    // Get tiles that will be left
    const currentOccupied = this.getOccupiedTiles(currentState);
    const brokenTiles: Position[] = [];

    // Create move record for undo
    const move: GameMove = {
      direction,
      previousState: { ...currentState },
      brokenTiles: [],
    };

    // Perform the move
    this.cube.move(direction, () => {
      // Handle tile interactions after move completes
      this.handleTileLeave(currentOccupied, brokenTiles);
      move.brokenTiles = [...brokenTiles];

      // Check for win/lose conditions
      const newOccupied = this.cube.getOccupiedTiles();

      const fallResult = this.checkFall(newOccupied);
      if (fallResult.shouldFall) {
        this.handleLose(fallResult.fallSide);
        return;
      }

      // Check sand tile standing violation
      if (this.cube.isStanding()) {
        const tile = this.getTileAt(newOccupied.primary);
        if (tile instanceof SandTile) {
          this.handleLose('both', 'sand');
          return;
        }
      }

      // Handle stepping on tiles
      this.handleTileStep(newOccupied);

      // Check win condition
      if (this.checkWin()) {
        this.handleWin();
        return;
      }

      // Emit move event
      this.onMoveCallbacks.forEach(cb => cb(move));
    });

    return true;
  }

  // Calculate next state after a move
  private calculateNextState(current: CubeState, direction: Direction): CubeState {
    let newX = current.x;
    let newZ = current.z;
    let newOrientation = current.orientation;

    switch (current.orientation) {
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

    return { x: newX, z: newZ, orientation: newOrientation };
  }

  // Get occupied tiles for a state
  private getOccupiedTiles(state: CubeState): OccupiedTiles {
    const primary: Position = { x: state.x, z: state.z };

    switch (state.orientation) {
      case CubeOrientation.STANDING:
        return { primary };
      case CubeOrientation.LYING_X:
        return { primary, secondary: { x: state.x + 1, z: state.z } };
      case CubeOrientation.LYING_Z:
        return { primary, secondary: { x: state.x, z: state.z + 1 } };
    }
  }

  // Check if a move results in a valid position
  private isValidMove(nextState: CubeState): boolean {
    const occupied = this.getOccupiedTiles(nextState);

    // Check primary tile
    const primaryTile = this.getTileAt(occupied.primary);
    if (!primaryTile || !primaryTile.isActive()) {
      return true; // Will fall, but move is valid
    }

    // Check secondary tile if lying
    if (occupied.secondary) {
      const secondaryTile = this.getTileAt(occupied.secondary);
      if (!secondaryTile || !secondaryTile.isActive()) {
        return true; // Will fall, but move is valid
      }
    }

    // Check standing on sand
    if (nextState.orientation === CubeOrientation.STANDING) {
      if (primaryTile instanceof SandTile) {
        return true; // Will fail, but move is valid
      }
    }

    return true;
  }

  // Get tile at position
  private getTileAt(pos: Position): Tile | undefined {
    return this.tiles.get(`${pos.x},${pos.z}`);
  }

  // Handle leaving tiles (fragile breaking)
  private handleTileLeave(occupied: OccupiedTiles, brokenTiles: Position[]): void {
    const positions = [occupied.primary];
    if (occupied.secondary) {
      positions.push(occupied.secondary);
    }

    positions.forEach(pos => {
      const tile = this.getTileAt(pos);
      if (tile) {
        tile.onLeave();
        if (tile instanceof FragileTile && !tile.isActive()) {
          brokenTiles.push(pos);
        }
      }
    });
  }

  // Handle stepping on tiles
  private handleTileStep(occupied: OccupiedTiles): void {
    const positions = [occupied.primary];
    if (occupied.secondary) {
      positions.push(occupied.secondary);
    }

    positions.forEach(pos => {
      const tile = this.getTileAt(pos);
      if (tile) {
        tile.onStep();
      }
    });
  }

  // Check if cube should fall and return which side is empty
  private checkFall(occupied: OccupiedTiles): { shouldFall: boolean; fallSide: 'primary' | 'secondary' | 'both' } {
    const primaryTile = this.getTileAt(occupied.primary);
    const primaryEmpty = !primaryTile || !primaryTile.isActive();

    if (occupied.secondary) {
      const secondaryTile = this.getTileAt(occupied.secondary);
      const secondaryEmpty = !secondaryTile || !secondaryTile.isActive();

      if (primaryEmpty && secondaryEmpty) {
        return { shouldFall: true, fallSide: 'both' };
      } else if (primaryEmpty) {
        return { shouldFall: true, fallSide: 'primary' };
      } else if (secondaryEmpty) {
        return { shouldFall: true, fallSide: 'secondary' };
      }
      return { shouldFall: false, fallSide: 'both' };
    }

    // Standing - only primary matters
    if (primaryEmpty) {
      return { shouldFall: true, fallSide: 'both' };
    }
    return { shouldFall: false, fallSide: 'both' };
  }

  // Check win condition
  private checkWin(): boolean {
    if (!this.cube.isStanding()) {
      return false;
    }

    const state = this.cube.getState();
    return state.x === this.goalPosition.x && state.z === this.goalPosition.z;
  }

  // Handle win
  private handleWin(): void {
    this.onWinCallbacks.forEach(cb => cb());
  }

  // Handle lose
  private handleLose(fallSide: 'primary' | 'secondary' | 'both' = 'both', fallType: 'normal' | 'sand' = 'normal'): void {
    this.cube.animateFall(() => {
      this.onLoseCallbacks.forEach(cb => cb());
    }, fallSide, fallType);
  };


  // Event subscriptions
  public onMove(callback: MoveCallback): void {
    this.onMoveCallbacks.push(callback);
  }

  public onWin(callback: WinCallback): void {
    this.onWinCallbacks.push(callback);
  }

  public onLose(callback: LoseCallback): void {
    this.onLoseCallbacks.push(callback);
  }

  // Update tiles reference (for level reload)
  public updateTiles(tiles: Map<string, Tile>): void {
    this.tiles = tiles;
  }

  public updateGoal(goal: Position): void {
    this.goalPosition = goal;
  }
}
