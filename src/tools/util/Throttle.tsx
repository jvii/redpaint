type callback = Function;

export class Throttle {
  private interval: number;
  private enableCall: boolean;

  public constructor(interval: number) {
    this.interval = interval;
    this.enableCall = true;
  }

  public call(fn: callback): void {
    if (!this.enableCall) return;

    this.enableCall = false;
    fn();
    setTimeout((): void => {
      this.enableCall = true;
    }, this.interval);
  }
}
