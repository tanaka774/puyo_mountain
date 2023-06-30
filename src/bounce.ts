import { gameConfig } from "./config.ts";

export class Bounce {
  // TODO: these bounce should be saparated into other file.
  private _willBounce = false;
  private _BOUNCING_TIME = 10; // TODO: throw into config
  private _bouncePuyoNum = 3;
  private _bouncePuyos = new Set(); // ["x1,y1", "x2,y2", ...]
  private _bounceQuantities = 0; // increase by 180 / BOUNCING_TIME

  start(x, y) {
    this._willBounce = true;
    for (let n = 0; (n <= this._bouncePuyoNum) && (y + n < gameConfig.BOARD_BOTTOM_EDGE); n++) {
      this._bouncePuyos.add(`${x},${y + n}`);
    }
  }

  end() {
    this._willBounce = false;
    this._bounceQuantities = 0;
    this._bouncePuyos.clear();
    // TODO: this.__bounceEffect.is shit (dealing with connecting glue not returning)
    // execute by callback
    // this._chain.findConnectedPuyos(this._board, (_) => { /*do nothing*/ });
  }

  delete(x, y) {
    [...this._bouncePuyos].forEach((elem: string) => {
      const posX = parseInt(elem.split(',')[0], 10);
      const posY = parseInt(elem.split(',')[1], 10);
      if (x === posX && y === posY) {
        this._bouncePuyos.delete(elem);
        this._willBounce = false;
      }
    })
  }

  timeElapses(afterEnd) {
    this._bounceQuantities = (this._bounceQuantities > 180)
      ? 180
      : this._bounceQuantities + 180 / this._BOUNCING_TIME;

    if (this._bounceQuantities >= 180) {
      this.end();
      afterEnd();
    }
  }

  get willBounce() { return this._willBounce; }
  get bouncePuyos() { return this._bouncePuyos; }
  get bounceQuantities() { return this._bounceQuantities; }
}
