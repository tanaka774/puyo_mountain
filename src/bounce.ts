import { gameConfig } from "./config.ts";

export class Bounce {
  // TODO: these bounce should be saparated into other file.
  private _willBounce = false;
  private _BOUNCING_TIME = gameConfig.BOUNCING_TIME;
  private _bouncePuyoNum = gameConfig.BOUNCING_PUYO_NUM;
  private _bouncePuyos: Map<string, number> = new Map(); // manage each puyo's quantities ("x,y", quantities)

  start(x, y) {
    this._willBounce = true;
    for (let n = 0; (n <= this._bouncePuyoNum) && (y + n < gameConfig.BOARD_BOTTOM_EDGE); n++) {
      this.setBounceQuantities(x, y + n, 0);
    }
  }

  end() {
    this._willBounce = false;
    // this._bouncePuyos.clear(); // should be unnecessary
  }

  timeElapses(x, y, afterEnd) {
    this.setBounceQuantities(x, y,
      (this.getBounceQuantities(x, y) > 180)
        ? 180
        : this.getBounceQuantities(x, y) + 180 / this._BOUNCING_TIME
    );

    if (this.getBounceQuantities(x, y) >= 180) {
      this.deleteBouncePuyo(x, y);
    }

    if (this._bouncePuyos.size === 0) {
      this.end();
      afterEnd();
    }
  }

  get willBounce() { return this._willBounce; }
  getBounceQuantities(x, y) { return this._bouncePuyos.get(`${x},${y}`); }
  setBounceQuantities(x, y, val) { this._bouncePuyos.set(`${x},${y}`, val); }
  deleteBouncePuyo(x, y) { this._bouncePuyos.delete(`${x},${y}`); }
  searchBouncePuyo(x, y) { return this._bouncePuyos.has(`${x},${y}`); }
}
