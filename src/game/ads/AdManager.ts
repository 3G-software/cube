export class AdManager {
  private retryCount: Map<string, number> = new Map();
  private readonly STORAGE_KEY = 'cube_puzzle_retry_count';

  constructor() {
    this.loadRetryCount();
  }

  // Record a retry for a level
  public recordRetry(levelId: string): void {
    const count = this.retryCount.get(levelId) || 0;
    this.retryCount.set(levelId, count + 1);
    this.saveRetryCount();
  }

  // Reset retry count for a level (when completed)
  public resetRetryCount(levelId: string): void {
    this.retryCount.set(levelId, 0);
    this.saveRetryCount();
  }

  // Get retry count for a level
  public getRetryCount(levelId: string): number {
    return this.retryCount.get(levelId) || 0;
  }

  // Calculate ad probability based on retry count
  // No-ad probability formula: 1 / 2^n
  // Ad probability formula: 1 - 1 / 2^n
  // 1st retry (n=1): ad probability = 1 - 1/2 = 50%
  // 2nd retry (n=2): ad probability = 1 - 1/4 = 75%
  // 3rd retry (n=3): ad probability = 1 - 1/8 = 87.5%
  // 4th retry (n=4): ad probability = 1 - 1/16 = 93.75%
  // etc.
  public shouldShowAd(levelId: string): boolean {
    const retries = this.getRetryCount(levelId);

    if (retries === 0) {
      return false; // First attempt, no ad
    }

    // Ad probability = 1 - 1 / 2^n
    const noAdProbability = 1 / Math.pow(2, retries);
    const adProbability = 1 - noAdProbability;

    return Math.random() < adProbability;
  }

  // Show ad (placeholder for actual ad implementation)
  public showAd(onAdComplete: () => void): void {
    // This is a placeholder. In production, integrate with actual ad SDK
    console.log('Showing ad...');

    // Simulate ad display
    this.showAdOverlay(onAdComplete);
  }

  private showAdOverlay(onAdComplete: () => void): void {
    const overlay = document.getElementById('ui-overlay');
    if (!overlay) return;

    const adContainer = document.createElement('div');
    adContainer.id = 'ad-overlay';
    adContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.95);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 2000;
    `;

    const adContent = document.createElement('div');
    adContent.style.cssText = `
      background: #1a1a1a;
      padding: 40px;
      border-radius: 12px;
      text-align: center;
      max-width: 90%;
      width: 400px;
      box-sizing: border-box;
    `;

    const adTitle = document.createElement('h3');
    adTitle.textContent = '广告';
    adTitle.style.cssText = `
      color: #fff;
      font-family: Arial, sans-serif;
      font-size: 24px;
      margin: 0 0 20px 0;
    `;
    adContent.appendChild(adTitle);

    const adText = document.createElement('p');
    adText.textContent = '这里将显示广告内容';
    adText.style.cssText = `
      color: #aaa;
      font-family: Arial, sans-serif;
      font-size: 16px;
      margin: 0 0 30px 0;
    `;
    adContent.appendChild(adText);

    const countdown = document.createElement('div');
    countdown.style.cssText = `
      color: #fff;
      font-family: Arial, sans-serif;
      font-size: 18px;
      margin: 0 0 20px 0;
    `;
    adContent.appendChild(countdown);

    const skipBtn = document.createElement('button');
    skipBtn.textContent = '跳过广告';
    skipBtn.disabled = true;
    skipBtn.style.cssText = `
      padding: 12px 30px;
      font-family: Arial, sans-serif;
      font-size: 16px;
      font-weight: bold;
      color: white;
      background: #666;
      border: none;
      border-radius: 8px;
      cursor: not-allowed;
      opacity: 0.5;
      width: 100%;
      max-width: 300px;
    `;
    adContent.appendChild(skipBtn);

    adContainer.appendChild(adContent);
    overlay.appendChild(adContainer);

    // Countdown timer (3 seconds)
    let timeLeft = 3;
    countdown.textContent = `${timeLeft} 秒后可跳过...`;

    const timer = setInterval(() => {
      timeLeft--;
      if (timeLeft > 0) {
        countdown.textContent = `${timeLeft} 秒后可跳过...`;
      } else {
        countdown.textContent = '现在可以跳过！';
        skipBtn.disabled = false;
        skipBtn.style.cssText = `
          padding: 12px 30px;
          font-family: Arial, sans-serif;
          font-size: 16px;
          font-weight: bold;
          color: white;
          background: #2ecc71;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          opacity: 1;
          width: 100%;
          max-width: 300px;
        `;
        clearInterval(timer);
      }
    }, 1000);

    skipBtn.addEventListener('click', () => {
      adContainer.remove();
      onAdComplete();
    });
  }

  private saveRetryCount(): void {
    try {
      const data: Record<string, number> = {};
      this.retryCount.forEach((count, levelId) => {
        data[levelId] = count;
      });
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save retry count:', e);
    }
  }

  private loadRetryCount(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const data: Record<string, number> = JSON.parse(saved);
        Object.entries(data).forEach(([levelId, count]) => {
          this.retryCount.set(levelId, count);
        });
      }
    } catch (e) {
      console.warn('Failed to load retry count:', e);
    }
  }
}
