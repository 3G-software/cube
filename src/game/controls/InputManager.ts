import { Direction, InputEvent } from '../../utils/Types';
import { DPAD_SIZE, DPAD_BUTTON_SIZE, DPAD_MARGIN } from '../../utils/Constants';

export type InputCallback = (direction: Direction) => void;

export class InputManager {
  private canvas: HTMLCanvasElement;
  private overlay: HTMLElement;
  private dpadContainer: HTMLElement | null = null;
  private callbacks: InputCallback[] = [];
  private enabled: boolean = true;

  private keyMap: Record<string, Direction> = {
    'ArrowUp': Direction.UP,
    'ArrowDown': Direction.DOWN,
    'ArrowLeft': Direction.RIGHT,
    'ArrowRight': Direction.LEFT,
    'w': Direction.UP,
    'W': Direction.UP,
    's': Direction.DOWN,
    'S': Direction.DOWN,
    'a': Direction.RIGHT,
    'A': Direction.RIGHT,
    'd': Direction.LEFT,
    'D': Direction.LEFT,
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.overlay = document.getElementById('ui-overlay')!;
    this.setupKeyboardControls();
    this.createDPad();
  }

  private setupKeyboardControls(): void {
    window.addEventListener('keydown', (e) => {
      if (!this.enabled) return;

      const direction = this.keyMap[e.key];
      if (direction) {
        e.preventDefault();
        this.emitInput(direction);
      }
    });
  }

  private createDPad(): void {
    this.dpadContainer = document.createElement('div');
    this.dpadContainer.id = 'dpad-container';
    this.dpadContainer.style.cssText = `
      position: absolute;
      bottom: ${DPAD_MARGIN}px;
      left: ${DPAD_MARGIN}px;
      width: ${DPAD_SIZE}px;
      height: ${DPAD_SIZE}px;
      pointer-events: none;
    `;

    const buttonStyle = `
      position: absolute;
      width: ${DPAD_BUTTON_SIZE}px;
      height: ${DPAD_BUTTON_SIZE}px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.2);
      border: 2px solid rgba(255, 255, 255, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      color: rgba(255, 255, 255, 0.8);
      pointer-events: auto;
      cursor: pointer;
      user-select: none;
      -webkit-user-select: none;
      touch-action: manipulation;
      transition: background 0.1s, transform 0.1s;
    `;

    const buttons = [
      { dir: Direction.UP, symbol: '▲', top: 0, left: (DPAD_SIZE - DPAD_BUTTON_SIZE) / 2 },
      { dir: Direction.DOWN, symbol: '▼', top: DPAD_SIZE - DPAD_BUTTON_SIZE, left: (DPAD_SIZE - DPAD_BUTTON_SIZE) / 2 },
      { dir: Direction.RIGHT, symbol: '◀', top: (DPAD_SIZE - DPAD_BUTTON_SIZE) / 2, left: 0 },
      { dir: Direction.LEFT, symbol: '▶', top: (DPAD_SIZE - DPAD_BUTTON_SIZE) / 2, left: DPAD_SIZE - DPAD_BUTTON_SIZE },
    ];

    buttons.forEach(({ dir, symbol, top, left }) => {
      const btn = document.createElement('button');
      btn.className = 'dpad-btn';
      btn.dataset.direction = dir;
      btn.innerHTML = symbol;
      btn.style.cssText = buttonStyle + `top: ${top}px; left: ${left}px;`;

      // Touch/click handlers
      const handlePress = (e: Event) => {
        e.preventDefault();
        if (!this.enabled) return;
        btn.style.background = 'rgba(255, 255, 255, 0.5)';
        btn.style.transform = 'scale(0.95)';
        this.emitInput(dir);
      };

      const handleRelease = () => {
        btn.style.background = 'rgba(255, 255, 255, 0.2)';
        btn.style.transform = 'scale(1)';
      };

      btn.addEventListener('touchstart', handlePress, { passive: false });
      btn.addEventListener('mousedown', handlePress);
      btn.addEventListener('touchend', handleRelease);
      btn.addEventListener('mouseup', handleRelease);
      btn.addEventListener('mouseleave', handleRelease);

      this.dpadContainer!.appendChild(btn);
    });

    this.overlay.appendChild(this.dpadContainer);
  }

  private emitInput(direction: Direction): void {
    this.callbacks.forEach(cb => cb(direction));
  }

  public onInput(callback: InputCallback): void {
    this.callbacks.push(callback);
  }

  public offInput(callback: InputCallback): void {
    const index = this.callbacks.indexOf(callback);
    if (index > -1) {
      this.callbacks.splice(index, 1);
    }
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (this.dpadContainer) {
      this.dpadContainer.style.opacity = enabled ? '1' : '0.5';
    }
  }

  public showDPad(): void {
    if (this.dpadContainer) {
      this.dpadContainer.style.display = 'block';
    }
  }

  public hideDPad(): void {
    if (this.dpadContainer) {
      this.dpadContainer.style.display = 'none';
    }
  }

  public dispose(): void {
    if (this.dpadContainer) {
      this.dpadContainer.remove();
    }
    this.callbacks = [];
  }
}
