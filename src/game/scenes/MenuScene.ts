import {
  Scene,
  Engine,
  FreeCamera,
  Vector3,
  Color4,
} from '@babylonjs/core';
import { COLORS } from '../../utils/Constants';

export class MenuScene {
  private engine: Engine;
  private scene: Scene;
  private container: HTMLElement | null = null;

  private onPlayCallback: (() => void) | null = null;
  private onLevelSelectCallback: (() => void) | null = null;

  constructor(engine: Engine) {
    this.engine = engine;
    this.scene = new Scene(engine);
    this.setupScene();
    this.createUI();
  }

  private setupScene(): void {
    this.scene.clearColor = Color4.FromHexString(COLORS.BACKGROUND + 'FF');

    // Simple camera (not used for rendering, but required)
    const camera = new FreeCamera('menuCamera', new Vector3(0, 0, -10), this.scene);
    camera.setTarget(Vector3.Zero());
  }

  private createUI(): void {
    const overlay = document.getElementById('ui-overlay')!;

    this.container = document.createElement('div');
    this.container.id = 'menu-container';
    this.container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
    `;

    // Title
    const title = document.createElement('h1');
    title.textContent = 'CUBE';
    title.style.cssText = `
      color: #4a90d9;
      font-family: Arial, sans-serif;
      font-size: 64px;
      font-weight: bold;
      margin-bottom: 10px;
      text-shadow: 0 0 20px rgba(74, 144, 217, 0.5);
      letter-spacing: 8px;
    `;
    this.container.appendChild(title);

    // Subtitle
    const subtitle = document.createElement('p');
    subtitle.textContent = 'Rolling Puzzle';
    subtitle.style.cssText = `
      color: #888;
      font-family: Arial, sans-serif;
      font-size: 18px;
      margin-bottom: 60px;
      letter-spacing: 4px;
    `;
    this.container.appendChild(subtitle);

    // Play button
    const playBtn = this.createButton('PLAY', () => {
      if (this.onPlayCallback) {
        this.onPlayCallback();
      }
    });
    playBtn.style.marginBottom = '20px';
    this.container.appendChild(playBtn);

    // Level select button
    const levelSelectBtn = this.createButton('SELECT LEVEL', () => {
      if (this.onLevelSelectCallback) {
        this.onLevelSelectCallback();
      }
    });
    levelSelectBtn.style.background = 'rgba(255, 255, 255, 0.1)';
    this.container.appendChild(levelSelectBtn);

    overlay.appendChild(this.container);
  }

  private createButton(text: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = `
      padding: 15px 50px;
      font-family: Arial, sans-serif;
      font-size: 18px;
      font-weight: bold;
      color: white;
      background: linear-gradient(180deg, #4a90d9 0%, #357abd 100%);
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: transform 0.1s, box-shadow 0.1s;
      box-shadow: 0 4px 15px rgba(74, 144, 217, 0.3);
      letter-spacing: 2px;
    `;

    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'scale(1.05)';
      btn.style.boxShadow = '0 6px 20px rgba(74, 144, 217, 0.5)';
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'scale(1)';
      btn.style.boxShadow = '0 4px 15px rgba(74, 144, 217, 0.3)';
    });

    btn.addEventListener('click', onClick);

    return btn;
  }

  public onPlay(callback: () => void): void {
    this.onPlayCallback = callback;
  }

  public onLevelSelect(callback: () => void): void {
    this.onLevelSelectCallback = callback;
  }

  public getScene(): Scene {
    return this.scene;
  }

  public show(): void {
    if (this.container) {
      this.container.style.display = 'flex';
    }
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
