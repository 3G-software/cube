import { LevelData, LevelProgress, SaveData } from '../../utils/Types';
import { LevelLoader } from './LevelLoader';

const SAVE_KEY = 'cube_puzzle_save';

export class LevelManager {
  private currentLevelIndex: number = 0;
  private progress: Map<string, LevelProgress> = new Map();

  constructor() {
    this.loadProgress();
  }

  // Initialize manager
  public initialize(): void {
    LevelLoader.initialize();

    // Ensure first level is unlocked
    const firstLevelId = LevelLoader.getLevelIds()[0];
    if (firstLevelId && !this.progress.has(firstLevelId)) {
      this.progress.set(firstLevelId, { unlocked: true, completed: false });
    }
  }

  // Get current level
  public getCurrentLevel(): LevelData | undefined {
    return LevelLoader.getLevelByIndex(this.currentLevelIndex);
  }

  // Get current level index
  public getCurrentLevelIndex(): number {
    return this.currentLevelIndex;
  }

  // Set current level by index
  public setCurrentLevel(index: number): boolean {
    if (index >= 0 && index < LevelLoader.getLevelCount()) {
      this.currentLevelIndex = index;
      this.saveProgress();
      return true;
    }
    return false;
  }

  // Set current level by ID
  public setCurrentLevelById(id: string): boolean {
    const index = LevelLoader.getLevelIndex(id);
    if (index >= 0) {
      this.currentLevelIndex = index;
      this.saveProgress();
      return true;
    }
    return false;
  }

  // Complete current level
  public completeLevel(moves: number): void {
    const level = this.getCurrentLevel();
    if (!level) return;

    const progress = this.progress.get(level.id) || { unlocked: true, completed: false };
    progress.completed = true;

    if (!progress.bestMoves || moves < progress.bestMoves) {
      progress.bestMoves = moves;
    }

    this.progress.set(level.id, progress);

    // Unlock next level
    const nextId = LevelLoader.getNextLevelId(level.id);
    if (nextId) {
      const nextProgress = this.progress.get(nextId) || { unlocked: false, completed: false };
      nextProgress.unlocked = true;
      this.progress.set(nextId, nextProgress);
    }

    this.saveProgress();
  }

  // Go to next level
  public goToNextLevel(): boolean {
    if (this.currentLevelIndex < LevelLoader.getLevelCount() - 1) {
      this.currentLevelIndex++;
      this.saveProgress();
      return true;
    }
    return false;
  }

  // Go to previous level
  public goToPreviousLevel(): boolean {
    if (this.currentLevelIndex > 0) {
      this.currentLevelIndex--;
      this.saveProgress();
      return true;
    }
    return false;
  }

  // Check if level is unlocked
  public isLevelUnlocked(id: string): boolean {
    const progress = this.progress.get(id);
    return progress?.unlocked ?? false;
  }

  // Check if level is completed
  public isLevelCompleted(id: string): boolean {
    const progress = this.progress.get(id);
    return progress?.completed ?? false;
  }

  // Get level progress
  public getLevelProgress(id: string): LevelProgress | undefined {
    return this.progress.get(id);
  }

  // Get all levels with progress
  public getAllLevelsWithProgress(): Array<{ level: LevelData; progress: LevelProgress }> {
    return LevelLoader.getLevelIds().map(id => {
      const level = LevelLoader.getLevel(id)!;
      const progress = this.progress.get(id) || { unlocked: false, completed: false };
      return { level, progress };
    });
  }

  // Get total completed levels
  public getCompletedCount(): number {
    let count = 0;
    this.progress.forEach(p => {
      if (p.completed) count++;
    });
    return count;
  }

  // Save progress to localStorage
  private saveProgress(): void {
    const saveData: SaveData = {
      currentLevel: this.currentLevelIndex,
      levels: {},
    };

    this.progress.forEach((progress, id) => {
      saveData.levels[id] = progress;
    });

    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    } catch (e) {
      console.warn('Failed to save progress:', e);
    }
  }

  // Load progress from localStorage
  private loadProgress(): void {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) {
        const saveData: SaveData = JSON.parse(saved);
        this.currentLevelIndex = saveData.currentLevel || 0;

        Object.entries(saveData.levels).forEach(([id, progress]) => {
          this.progress.set(id, progress);
        });
      }
    } catch (e) {
      console.warn('Failed to load progress:', e);
    }

    // Always unlock first level
    const firstId = LevelLoader.getLevelIds()[0];
    if (firstId) {
      const progress = this.progress.get(firstId) || { unlocked: false, completed: false };
      progress.unlocked = true;
      this.progress.set(firstId, progress);
    }
  }

  // Reset all progress
  public resetProgress(): void {
    this.progress.clear();
    this.currentLevelIndex = 0;

    const firstId = LevelLoader.getLevelIds()[0];
    if (firstId) {
      this.progress.set(firstId, { unlocked: true, completed: false });
    }

    this.saveProgress();
  }
}
