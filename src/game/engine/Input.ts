export class InputManager {
  keys: Set<string> = new Set();
  justPressed: Set<string> = new Set();

  constructor() {
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', ' ', 'e', 'f', 'q', 'Escape'].includes(e.key)) {
        e.preventDefault();
      }
      if (!this.keys.has(e.key)) {
        this.justPressed.add(e.key);
      }
      this.keys.add(e.key);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key);
    });
  }

  isDown(key: string): boolean {
    return this.keys.has(key);
  }

  wasPressed(key: string): boolean {
    return this.justPressed.has(key);
  }

  clearFrame() {
    this.justPressed.clear();
  }

  destroy() {
    this.keys.clear();
    this.justPressed.clear();
  }
}
