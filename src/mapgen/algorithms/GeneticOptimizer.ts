import { LevelData, TileType } from '../../utils/Types';
import { MapValidator } from '../MapValidator';
import { DifficultyEvaluator } from '../DifficultyEvaluator';
import { MapGenerator } from '../MapGenerator';

interface Individual {
  level: LevelData;
  fitness: number;
}

interface GeneticOptions {
  populationSize: number;
  generations: number;
  mutationRate: number;
  crossoverRate: number;
  targetDifficulty: number;
}

const DEFAULT_OPTIONS: GeneticOptions = {
  populationSize: 20,
  generations: 50,
  mutationRate: 0.1,
  crossoverRate: 0.7,
  targetDifficulty: 5,
};

// Genetic algorithm to optimize maps for desired difficulty
export class GeneticOptimizer {
  private options: GeneticOptions;
  private generator: MapGenerator;

  constructor(options: Partial<GeneticOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.generator = new MapGenerator();
  }

  public optimize(): LevelData | null {
    // Initialize population
    let population = this.initializePopulation();

    if (population.length === 0) {
      return null;
    }

    for (let gen = 0; gen < this.options.generations; gen++) {
      // Sort by fitness
      population.sort((a, b) => b.fitness - a.fitness);

      // Check for perfect match
      if (population[0].fitness >= 0.95) {
        return population[0].level;
      }

      // Create next generation
      const nextGen: Individual[] = [];

      // Elitism: keep top 2
      nextGen.push(population[0], population[1]);

      // Fill rest with crossover and mutation
      while (nextGen.length < this.options.populationSize) {
        const parent1 = this.selectParent(population);
        const parent2 = this.selectParent(population);

        let child: LevelData;

        if (Math.random() < this.options.crossoverRate) {
          child = this.crossover(parent1.level, parent2.level);
        } else {
          child = { ...parent1.level };
        }

        if (Math.random() < this.options.mutationRate) {
          child = this.mutate(child);
        }

        const fitness = this.evaluateFitness(child);
        if (fitness > 0) {
          nextGen.push({ level: child, fitness });
        }
      }

      population = nextGen;
    }

    // Return best from final population
    population.sort((a, b) => b.fitness - a.fitness);
    return population[0]?.level || null;
  }

  private initializePopulation(): Individual[] {
    const population: Individual[] = [];

    for (let i = 0; i < this.options.populationSize * 3; i++) {
      const level = this.generator.generate();
      if (level) {
        const fitness = this.evaluateFitness(level);
        if (fitness > 0) {
          population.push({ level, fitness });
        }
      }

      if (population.length >= this.options.populationSize) {
        break;
      }
    }

    return population;
  }

  private evaluateFitness(level: LevelData): number {
    const result = MapValidator.validate(level);

    if (!result.solvable) {
      return 0;
    }

    const difficulty = DifficultyEvaluator.evaluate(level);

    // Fitness based on how close to target difficulty
    const difficultyDiff = Math.abs(difficulty.score - this.options.targetDifficulty);
    const difficultyFitness = 1 - difficultyDiff / 10;

    // Bonus for reasonable move counts
    const moveFitness = result.minMoves >= 3 && result.minMoves <= 20 ? 0.2 : 0;

    return Math.max(0, difficultyFitness + moveFitness);
  }

  private selectParent(population: Individual[]): Individual {
    // Tournament selection
    const tournamentSize = 3;
    let best: Individual | null = null;

    for (let i = 0; i < tournamentSize; i++) {
      const idx = Math.floor(Math.random() * population.length);
      if (!best || population[idx].fitness > best.fitness) {
        best = population[idx];
      }
    }

    return best!;
  }

  private crossover(parent1: LevelData, parent2: LevelData): LevelData {
    // Simple crossover: take tiles from both parents
    const width = Math.max(parent1.size.width, parent2.size.width);
    const height = Math.max(parent1.size.height, parent2.size.height);

    const tiles: number[][] = Array(height)
      .fill(null)
      .map(() => Array(width).fill(TileType.EMPTY));

    // Crossover point
    const crossZ = Math.floor(height / 2);

    for (let z = 0; z < height; z++) {
      for (let x = 0; x < width; x++) {
        if (z < crossZ) {
          tiles[z][x] = parent1.tiles[z]?.[x] ?? TileType.EMPTY;
        } else {
          tiles[z][x] = parent2.tiles[z]?.[x] ?? TileType.EMPTY;
        }
      }
    }

    return {
      ...parent1,
      tiles,
      size: { width, height },
    };
  }

  private mutate(level: LevelData): LevelData {
    const tiles = level.tiles.map(row => [...row]);

    // Random mutation: add or remove a tile
    const z = Math.floor(Math.random() * tiles.length);
    const x = Math.floor(Math.random() * tiles[0].length);

    if (tiles[z][x] === TileType.EMPTY) {
      // Add tile if adjacent to existing
      const hasAdjacent =
        (z > 0 && tiles[z - 1][x] !== TileType.EMPTY) ||
        (z < tiles.length - 1 && tiles[z + 1][x] !== TileType.EMPTY) ||
        (x > 0 && tiles[z][x - 1] !== TileType.EMPTY) ||
        (x < tiles[0].length - 1 && tiles[z][x + 1] !== TileType.EMPTY);

      if (hasAdjacent) {
        tiles[z][x] = TileType.NORMAL;
      }
    } else if (tiles[z][x] === TileType.NORMAL) {
      // Potentially remove or change tile type
      const action = Math.random();
      if (action < 0.3) {
        tiles[z][x] = TileType.EMPTY;
      } else if (action < 0.5) {
        tiles[z][x] = TileType.SAND;
      } else if (action < 0.6) {
        tiles[z][x] = TileType.FRAGILE;
      }
    }

    return { ...level, tiles };
  }
}
