import {
  Scene,
  Engine,
  FreeCamera,
  Vector3,
  Color4,
} from '@babylonjs/core';
import { LevelManager } from '../level/LevelManager';
import { LevelLoader } from '../level/LevelLoader';
import { COLORS } from '../../utils/Constants';

export class LevelSelectScene {
  private engine: Engine;
  private scene: Scene;
  private levelManager: LevelManager;
  private container: HTMLElement | null = null;

  private onLevelSelectCallback: ((index: number) => void) | null = null;
  private onBackCallback: (() => void) | null = null;

  constructor(engine: Engine, levelManager: LevelManager) {
    this.engine = engine;
    this.levelManager = levelManager;
    this.scene = new Scene(engine);
    this.setupScene();
    this.createUI();
  }

  private setupScene(): void {
    this.scene.clearColor = Color4.FromHexString(COLORS.BACKGROUND + 'FF');

    const camera = new FreeCamera('levelSelectCamera', new Vector3(0, 0, -10), this.scene);
    camera.setTarget(Vector3.Zero());
  }

  private createUI(): void {
    const overlay = document.getElementById('ui-overlay')!;

    this.container = document.createElement('div');
    this.container.id = 'level-select-container';
    this.container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
      overflow-y: auto;
      padding: 20px;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      width: 100%;
      max-width: 600px;
      display: flex;
      align-items: center;
      margin-bottom: 30px;
    `;

    // Back button
    const backBtn = document.createElement('button');
    backBtn.innerHTML = '←';
    backBtn.style.cssText = `
      width: 40px;
      height: 40px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.1);
      border: 2px solid rgba(255, 255, 255, 0.3);
      color: white;
      font-size: 24px;
      cursor: pointer;
      margin-right: 20px;
    `;
    backBtn.addEventListener('click', () => {
      if (this.onBackCallback) {
        this.onBackCallback();
      }
    });
    header.appendChild(backBtn);

    // Title
    const title = document.createElement('h2');
    title.textContent = 'Select Level';
    title.style.cssText = `
      color: white;
      font-family: Arial, sans-serif;
      font-size: 24px;
      margin: 0;
    `;
    header.appendChild(title);

    this.container.appendChild(header);

    // Level grid
    const grid = document.createElement('div');
    grid.id = 'level-grid';
    grid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 15px;
      width: 100%;
      max-width: 600px;
    `;

    this.container.appendChild(grid);
    overlay.appendChild(this.container);
  }

  public refresh(): void {
    const grid = document.getElementById('level-grid');
    if (!grid) return;

    // Clear existing buttons
    grid.innerHTML = '';

    // Create level buttons
    const levels = this.levelManager.getAllLevelsWithProgress();

    levels.forEach(({ level, progress }, index) => {
      const btn = document.createElement('button');
      btn.style.cssText = `
        width: 100%;
        aspect-ratio: 1;
        border-radius: 8px;
        border: 2px solid;
        font-family: Arial, sans-serif;
        font-size: 20px;
        font-weight: bold;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        transition: transform 0.1s;
      `;

      if (progress.unlocked) {
        if (progress.completed) {
          // Completed level - green
          btn.style.background = 'rgba(46, 204, 113, 0.3)';
          btn.style.borderColor = '#2ecc71';
          btn.style.color = '#2ecc71';
        } else {
          // Unlocked but not completed - blue
          btn.style.background = 'rgba(74, 144, 217, 0.3)';
          btn.style.borderColor = '#4a90d9';
          btn.style.color = '#4a90d9';
        }

        btn.addEventListener('mouseenter', () => {
          btn.style.transform = 'scale(1.05)';
        });
        btn.addEventListener('mouseleave', () => {
          btn.style.transform = 'scale(1)';
        });
        btn.addEventListener('click', () => {
          if (this.onLevelSelectCallback) {
            this.onLevelSelectCallback(index);
          }
        });
      } else {
        // Locked level - gray
        btn.style.background = 'rgba(100, 100, 100, 0.2)';
        btn.style.borderColor = '#444';
        btn.style.color = '#666';
        btn.style.cursor = 'not-allowed';
      }

      // Level number
      const num = document.createElement('span');
      num.textContent = String(index + 1);
      btn.appendChild(num);

      // Star indicator for completed
      if (progress.completed) {
        const star = document.createElement('span');
        star.textContent = '★';
        star.style.fontSize = '12px';
        star.style.marginTop = '2px';
        btn.appendChild(star);
      }

      // Lock icon for locked levels
      if (!progress.unlocked) {
        btn.innerHTML = '🔒';
        btn.style.fontSize = '16px';
      }

      grid.appendChild(btn);
    });
  }

  public onLevelSelected(callback: (index: number) => void): void {
    this.onLevelSelectCallback = callback;
  }

  public onBack(callback: () => void): void {
    this.onBackCallback = callback;
  }

  public getScene(): Scene {
    return this.scene;
  }

  public show(): void {
    if (this.container) {
      this.container.style.display = 'flex';
    }
    this.refresh();
  }

  public hide(): void {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  public dispose(): void {
    if (this.container) {
      this.container.remove();
    }
    this.scene.dispose();
  }
}
