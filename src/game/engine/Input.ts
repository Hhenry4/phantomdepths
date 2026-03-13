export class InputManager {
  keys: Set<string> = new Set();
  justPressed: Set<string> = new Set();
  mouseX: number = 0;
  mouseY: number = 0;
  mouseDown: boolean = false;
  mouseJustPressed: boolean = false;
  private keydownHandler: (e: KeyboardEvent) => void;
  private keyupHandler: (e: KeyboardEvent) => void;
  private mousemoveHandler: (e: MouseEvent) => void;
  private mousedownHandler: (e: MouseEvent) => void;
  private mouseupHandler: (e: MouseEvent) => void;

  constructor() {
    this.keydownHandler = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', ' ', 'e', 'f', 'q', 'r', 'Escape', '1', '2', '3', '4', '5', '6', '7', '8'].includes(e.key)) {
        e.preventDefault();
      }
      if (!this.keys.has(e.key)) {
        this.justPressed.add(e.key);
      }
      this.keys.add(e.key);
    };

    this.keyupHandler = (e: KeyboardEvent) => {
      this.keys.delete(e.key);
    };

    this.mousemoveHandler = (e: MouseEvent) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    };

    this.mousedownHandler = (e: MouseEvent) => {
      if (e.button === 0) {
        this.mouseDown = true;
        this.mouseJustPressed = true;
      }
    };

    this.mouseupHandler = (e: MouseEvent) => {
      if (e.button === 0) {
        this.mouseDown = false;
      }
    };

    window.addEventListener('keydown', this.keydownHandler);
    window.addEventListener('keyup', this.keyupHandler);
    window.addEventListener('mousemove', this.mousemoveHandler);
    window.addEventListener('mousedown', this.mousedownHandler);
    window.addEventListener('mouseup', this.mouseupHandler);
  }

  isDown(key: string): boolean {
    return this.keys.has(key);
  }

  wasPressed(key: string): boolean {
    return this.justPressed.has(key);
  }

  clearFrame() {
    this.justPressed.clear();
    this.mouseJustPressed = false;
  }

  destroy() {
    window.removeEventListener('keydown', this.keydownHandler);
    window.removeEventListener('keyup', this.keyupHandler);
    window.removeEventListener('mousemove', this.mousemoveHandler);
    window.removeEventListener('mousedown', this.mousedownHandler);
    window.removeEventListener('mouseup', this.mouseupHandler);
    this.keys.clear();
    this.justPressed.clear();
  }
}
