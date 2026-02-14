import { LevelData } from '../utils/Types';

export class MapExporter {
  // Export level to JSON string
  public static toJSON(level: LevelData, pretty: boolean = true): string {
    return JSON.stringify(level, null, pretty ? 2 : 0);
  }

  // Export multiple levels
  public static exportBatch(levels: LevelData[]): string {
    return JSON.stringify(levels, null, 2);
  }

  // Generate a filename for a level
  public static generateFilename(level: LevelData): string {
    const paddedId = level.id.padStart(3, '0');
    return `level_${paddedId}.json`;
  }

  // Format level for display/debugging
  public static formatForDisplay(level: LevelData): string {
    const lines: string[] = [];

    lines.push(`Level: ${level.name} (${level.id})`);
    lines.push(`Difficulty: ${level.difficulty}`);
    lines.push(`Size: ${level.size.width}x${level.size.height}`);
    lines.push(`Start: (${level.start.x}, ${level.start.z}) - ${level.start.orientation}`);
    lines.push(`Goal: (${level.goal.x}, ${level.goal.z})`);
    lines.push(`Min Moves: ${level.minMoves || 'unknown'}`);

    if (level.solution) {
      lines.push(`Solution: ${level.solution.join(', ')}`);
    }

    lines.push('');
    lines.push('Map:');

    // Create visual map
    const symbols: Record<number, string> = {
      0: '.',
      1: '#',
      2: '~',
      3: '!',
      9: 'G',
    };

    for (let z = 0; z < level.tiles.length; z++) {
      let row = '';
      for (let x = 0; x < level.tiles[z].length; x++) {
        if (x === level.start.x && z === level.start.z) {
          row += 'S';
        } else if (x === level.goal.x && z === level.goal.z) {
          row += 'G';
        } else {
          row += symbols[level.tiles[z][x]] || '?';
        }
      }
      lines.push(row);
    }

    return lines.join('\n');
  }
}
