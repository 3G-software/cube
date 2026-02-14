// Map Batch Generator CLI Tool
// Run with: npm run generate

import { MapGenerator } from '../src/mapgen/MapGenerator';
import { MapValidator } from '../src/mapgen/MapValidator';
import { DifficultyEvaluator } from '../src/mapgen/DifficultyEvaluator';
import { MapExporter } from '../src/mapgen/MapExporter';
import { LevelData } from '../src/utils/Types';
import * as fs from 'fs';
import * as path from 'path';

const args = process.argv.slice(2);
const isValidateMode = args.includes('--validate');

async function generateBatch() {
  console.log('=== Cube Puzzle Map Generator ===\n');

  const targetCount = 50;
  const generated: LevelData[] = [];

  const difficulties = [
    { min: 3, max: 5, sand: false, fragile: false },
    { min: 4, max: 7, sand: false, fragile: false },
    { min: 5, max: 10, sand: true, fragile: false },
    { min: 6, max: 12, sand: false, fragile: true },
    { min: 8, max: 15, sand: true, fragile: true },
  ];

  for (const config of difficulties) {
    console.log(`Generating maps with minMoves=${config.min}-${config.max}...`);

    const generator = new MapGenerator({
      width: 9,
      height: 9,
      minMoves: config.min,
      maxMoves: config.max,
      useSand: config.sand,
      useFragile: config.fragile,
      sandRatio: 0.15,
      fragileRatio: 0.1,
    });

    let count = 0;
    const target = 10;

    while (count < target) {
      const level = generator.generate();

      if (level) {
        const validation = MapValidator.validate(level);
        if (validation.solvable) {
          generated.push(level);
          count++;
          process.stdout.write(`  Generated ${count}/${target}\r`);
        }
      }
    }

    console.log(`  Generated ${count}/${target} maps`);
  }

  console.log(`\nTotal generated: ${generated.length}`);

  // Sort by difficulty
  generated.sort((a, b) => a.difficulty - b.difficulty);

  // Output results
  console.log('\n=== Generated Levels Summary ===\n');

  generated.forEach((level, index) => {
    console.log(`${index + 1}. ${level.name}`);
    console.log(`   Difficulty: ${level.difficulty}, Moves: ${level.minMoves}`);
    console.log(`   Size: ${level.size.width}x${level.size.height}`);
  });

  // Export to files (optional)
  const outputDir = path.join(process.cwd(), 'generated_maps');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  generated.forEach((level, index) => {
    level.id = `level_${String(index + 1).padStart(3, '0')}`;
    level.name = `Level ${index + 1}`;

    const filename = path.join(outputDir, MapExporter.generateFilename(level));
    fs.writeFileSync(filename, MapExporter.toJSON(level));
  });

  console.log(`\nExported ${generated.length} levels to ${outputDir}/`);
}

async function validateExistingLevels() {
  console.log('=== Validating Existing Levels ===\n');

  const levelsDir = path.join(process.cwd(), 'src', 'data', 'levels');

  if (!fs.existsSync(levelsDir)) {
    console.log('No levels directory found.');
    return;
  }

  const files = fs.readdirSync(levelsDir).filter(f => f.endsWith('.json'));

  let valid = 0;
  let invalid = 0;

  for (const file of files) {
    const filepath = path.join(levelsDir, file);
    const content = fs.readFileSync(filepath, 'utf-8');

    try {
      const level: LevelData = JSON.parse(content);
      const result = MapValidator.validate(level);

      if (result.solvable) {
        console.log(`✓ ${file} - Solvable in ${result.minMoves} moves`);
        valid++;
      } else {
        console.log(`✗ ${file} - NOT SOLVABLE`);
        invalid++;
      }
    } catch (e) {
      console.log(`✗ ${file} - Parse error: ${e}`);
      invalid++;
    }
  }

  console.log(`\nResults: ${valid} valid, ${invalid} invalid`);
}

// Main
if (isValidateMode) {
  validateExistingLevels();
} else {
  generateBatch();
}
