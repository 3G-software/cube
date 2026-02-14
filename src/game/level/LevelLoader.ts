import { LevelData, CubeOrientation, Direction } from '../../utils/Types';

// Import all level data
import level001 from '../../data/levels/level_001.json';
import level002 from '../../data/levels/level_002.json';
import level003 from '../../data/levels/level_003.json';
import level004 from '../../data/levels/level_004.json';
import level005 from '../../data/levels/level_005.json';
import level006 from '../../data/levels/level_006.json';
import level007 from '../../data/levels/level_007.json';
import level008 from '../../data/levels/level_008.json';
import level009 from '../../data/levels/level_009.json';
import level010 from '../../data/levels/level_010.json';
import level011 from '../../data/levels/level_011.json';
import level012 from '../../data/levels/level_012.json';
import level013 from '../../data/levels/level_013.json';
import level014 from '../../data/levels/level_014.json';
import level015 from '../../data/levels/level_015.json';
import level016 from '../../data/levels/level_016.json';
import level017 from '../../data/levels/level_017.json';
import level018 from '../../data/levels/level_018.json';
import level019 from '../../data/levels/level_019.json';
import level020 from '../../data/levels/level_020.json';
import level021 from '../../data/levels/level_021.json';
import level022 from '../../data/levels/level_022.json';
import level023 from '../../data/levels/level_023.json';
import level024 from '../../data/levels/level_024.json';
import level025 from '../../data/levels/level_025.json';
import level026 from '../../data/levels/level_026.json';
import level027 from '../../data/levels/level_027.json';
import level028 from '../../data/levels/level_028.json';
import level029 from '../../data/levels/level_029.json';
import level030 from '../../data/levels/level_030.json';
import level031 from '../../data/levels/level_031.json';
import level032 from '../../data/levels/level_032.json';
import level033 from '../../data/levels/level_033.json';
import level034 from '../../data/levels/level_034.json';
import level035 from '../../data/levels/level_035.json';
import level036 from '../../data/levels/level_036.json';
import level037 from '../../data/levels/level_037.json';
import level038 from '../../data/levels/level_038.json';
import level039 from '../../data/levels/level_039.json';
import level040 from '../../data/levels/level_040.json';
import level041 from '../../data/levels/level_041.json';
import level042 from '../../data/levels/level_042.json';
import level043 from '../../data/levels/level_043.json';
import level044 from '../../data/levels/level_044.json';
import level045 from '../../data/levels/level_045.json';
import level046 from '../../data/levels/level_046.json';
import level047 from '../../data/levels/level_047.json';
import level048 from '../../data/levels/level_048.json';
import level049 from '../../data/levels/level_049.json';
import level050 from '../../data/levels/level_050.json';

const levelModules = [
  level001, level002, level003, level004, level005,
  level006, level007, level008, level009, level010,
  level011, level012, level013, level014, level015,
  level016, level017, level018, level019, level020,
  level021, level022, level023, level024, level025,
  level026, level027, level028, level029, level030,
  level031, level032, level033, level034, level035,
  level036, level037, level038, level039, level040,
  level041, level042, level043, level044, level045,
  level046, level047, level048, level049, level050,
];

export class LevelLoader {
  private static levels: Map<string, LevelData> = new Map();
  private static levelOrder: string[] = [];

  // Initialize and load all levels
  public static initialize(): void {
    levelModules.forEach((levelJson) => {
      const level = this.parseLevel(levelJson);
      this.levels.set(level.id, level);
      this.levelOrder.push(level.id);
    });

    // Sort by level ID (level_001, level_002, etc.)
    this.levelOrder.sort((a, b) => {
      return a.localeCompare(b);
    });
  }

  // Parse raw JSON to LevelData with proper typing
  private static parseLevel(json: any): LevelData {
    return {
      id: json.id,
      name: json.name,
      difficulty: json.difficulty,
      size: json.size,
      start: {
        x: json.start.x,
        z: json.start.z,
        orientation: json.start.orientation as CubeOrientation,
      },
      goal: json.goal,
      tiles: json.tiles,
      solution: json.solution as Direction[] | undefined,
      minMoves: json.minMoves,
    };
  }

  // Get level by ID
  public static getLevel(id: string): LevelData | undefined {
    return this.levels.get(id);
  }

  // Get level by index
  public static getLevelByIndex(index: number): LevelData | undefined {
    const id = this.levelOrder[index];
    return id ? this.levels.get(id) : undefined;
  }

  // Get total level count
  public static getLevelCount(): number {
    return this.levelOrder.length;
  }

  // Get all level IDs in order
  public static getLevelIds(): string[] {
    return [...this.levelOrder];
  }

  // Get level index by ID
  public static getLevelIndex(id: string): number {
    return this.levelOrder.indexOf(id);
  }

  // Get next level ID
  public static getNextLevelId(currentId: string): string | undefined {
    const index = this.levelOrder.indexOf(currentId);
    return index < this.levelOrder.length - 1 ? this.levelOrder[index + 1] : undefined;
  }
}
