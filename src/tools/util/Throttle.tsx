export class Throttle {
  private milliSecs: number;
  private lastFunc: NodeJS.Timeout | null;
  private lastRan: number | null;

  public constructor(milliSecs: number) {
    this.milliSecs = milliSecs;
    this.lastFunc = null;
    this.lastRan = null;
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  public call(func: Function): void {
    if (!this.lastRan) {
      func();
      this.lastRan = Date.now();
    } else {
      if (this.lastFunc) {
        clearTimeout(this.lastFunc);
      }
      this.lastFunc = setTimeout(() => {
        if (Date.now() - this.lastRan! >= this.milliSecs) {
          func();
          this.lastRan = Date.now();
        }
      }, this.milliSecs - (Date.now() - this.lastRan));
    }
  }
}
