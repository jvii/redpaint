export class Debounce {
  private milliSecs: number;
  private lastFunc: NodeJS.Timeout | null;

  public constructor(milliSecs: number) {
    this.milliSecs = milliSecs;
    this.lastFunc = null;
  }

  public call(func: Function): void {
    if (this.lastFunc) {
      clearTimeout(this.lastFunc);
    }
    this.lastFunc = setTimeout(() => {
      func();
    }, this.milliSecs);
  }
}
