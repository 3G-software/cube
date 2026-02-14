import {
  LevelData,
  CubeOrientation,
  Direction,
  TileType,
  DifficultyResult,
} from '../utils/Types';
import { MapValidator } from './MapValidator';

export class DifficultyEvaluator {
  // Evaluate difficulty of a level
  public static evaluate(levelData: LevelData): DifficultyResult {
    const validator = new MapValidator(levelData);
    const solverResult = validator.solve({
      x: levelData.start.x,
      z: levelData.start.z,
      orientation: levelData.start.orientation,
      fragileMask: 0,
    });

    if (!solverResult.solvable) {
      return {
        score: -1,
        minMoves: -1,
        boardSize: 0,
        tileVariety: 0,
        branchingFactor: 0,
        deadEnds: 0,
      };
    }

    const boardSize = this.calculateBoardSize(levelData);
    const tileVariety = this.calculateTileVariety(levelData);
    const branchingFactor = this.estimateBranchingFactor(levelData);
    const deadEnds = this.countDeadEnds(levelData);

    // Calculate composite score (1-10 scale)
    const score = this.calculateScore(
      solverResult.minMoves,
      boardSize,
      tileVariety,
      branchingFactor,
      deadEnds
    );

    return {
      score,
      minMoves: solverResult.minMoves,
      boardSize,
      tileVariety,
      branchingFactor,
      deadEnds,
    };
  }

  private static calculateBoardSize(levelData: LevelData): number {
    let tileCount = 0;
    for (const row of levelData.tiles) {
      for (const tile of row) {
        if (tile !== TileType.EMPTY) {
          tileCount++;
        }
      }
    }
    return tileCount;
  }

  private static calculateTileVariety(levelData: LevelData): number {
    const typeCounts = new Map<TileType, number>();

    for (const row of levelData.tiles) {
      for (const tile of row) {
        if (tile !== TileType.EMPTY) {
          typeCounts.set(tile, (typeCounts.get(tile) || 0) + 1);
        }
      }
    }

    // Variety score based on number of different tile types used
    return typeCounts.size;
  }

  private static estimateBranchingFactor(levelData: LevelData): number {
    // Estimate average number of valid moves per position
    const tiles = levelData.tiles;
    let totalOptions = 0;
    let positions = 0;

    for (let z = 0; z < tiles.length; z++) {
      for (let x = 0; x < tiles[z].length; x++) {
        if (tiles[z][x] !== TileType.EMPTY) {
          let options = 0;

          // Check each direction for valid adjacent tiles
          if (z > 0 && tiles[z - 1]?.[x] !== TileType.EMPTY) options++;
          if (z < tiles.length - 1 && tiles[z + 1]?.[x] !== TileType.EMPTY) options++;
          if (x > 0 && tiles[z]?.[x - 1] !== TileType.EMPTY) options++;
          if (x < tiles[z].length - 1 && tiles[z]?.[x + 1] !== TileType.EMPTY) options++;

          totalOptions += options;
          positions++;
        }
      }
    }

    return positions > 0 ? totalOptions / positions : 0;
  }

  private static countDeadEnds(levelData: LevelData): number {
    const tiles = levelData.tiles;
    let deadEnds = 0;

    for (let z = 0; z < tiles.length; z++) {
      for (let x = 0; x < tiles[z].length; x++) {
        if (tiles[z][x] !== TileType.EMPTY) {
          let connections = 0;

          if (z > 0 && tiles[z - 1]?.[x] !== TileType.EMPTY) connections++;
          if (z < tiles.length - 1 && tiles[z + 1]?.[x] !== TileType.EMPTY) connections++;
          if (x > 0 && tiles[z]?.[x - 1] !== TileType.EMPTY) connections++;
          if (x < tiles[z].length - 1 && tiles[z]?.[x + 1] !== TileType.EMPTY) connections++;

          // A dead end has only one connection
          if (connections === 1) {
            deadEnds++;
          }
        }
      }
    }

    return deadEnds;
  }

  private static calculateScore(
    minMoves: number,
    boardSize: number,
    tileVariety: number,
    branchingFactor: number,
    deadEnds: number
  ): number {
    // Weighted scoring formula
    let score = 0;

    // Move complexity (primary factor)
    if (minMoves <= 3) score += 1;
    else if (minMoves <= 5) score += 2;
    else if (minMoves <= 8) score += 3;
    else if (minMoves <= 12) score += 4;
    else score += 5;

    // Board size factor
    if (boardSize > 30) score += 2;
    else if (boardSize > 20) score += 1;

    // Tile variety bonus
    if (tileVariety >= 3) score += 2;
    else if (tileVariety >= 2) score += 1;

    // Branching factor (lower = harder navigation)
    if (branchingFactor < 2.5) score += 1;

    // Dead ends penalty/bonus (too many can trap players)
    if (deadEnds > 5) score += 1;

    // Normalize to 1-10
    return Math.min(10, Math.max(1, score));
  }
}
