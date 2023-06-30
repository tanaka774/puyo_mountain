import { baseSinglePuyo, setSinglePuyo } from "./puyo.ts"
import { gameConfig } from "./config.ts"
import { recordPuyoSteps } from "./record.ts"
// import { Game } from "./game.ts"
import { Move } from "./move.ts"
import { Board } from "./board";

export class Split {
  // this initializing is ok?
  private _splittedPuyo: baseSinglePuyo;
  private _unsplittedPuyo: baseSinglePuyo;

  constructor(
    // private _game: Game,
    private _board: Board,
    // private _move: Move,
  ) {
    this.initSplittedPuyo();
    this.initUnsplittedPuyo();
  }

  lockUnsplittedPuyo() {
    this._board.lockPuyo(this._board.board, this._unsplittedPuyo.posX, this._unsplittedPuyo.posY, this._unsplittedPuyo.color, recordPuyoSteps.MANIPULATE_PUYO_REC_FLAG);
    this._unsplittedPuyo = null;
  }

  // splittedpuyo falls off until it hits some puyo or bottom and lock pos
  // TODO: same logic as floatingpuyo can be applied to this
  letSplittedPuyoFall(
    // board: number[][],
    // movePuyoDown: (y: number, speed: number) => number,
    setNextState
  ) {
    // TODO: dont be stupid
    const splittedX = this._splittedPuyo.posX;
    const splittedY = this._splittedPuyo.posY;
    // const nextY = this._move.movePuyoDown(splittedY, 12.0);
    const nextY = this.moveSplittedPuyoDown(splittedY, 12.0);

    // need to verify this condition
    if (nextY >= gameConfig.BOARD_BOTTOM_EDGE - 1 ||
      this._board.board[Math.floor(nextY) + 1][splittedX] !== gameConfig.NO_COLOR
    ) {
      this._splittedPuyo.posY = Math.floor(nextY);

      this._board.lockPuyo(this._board.board,
        this._splittedPuyo.posX, this._splittedPuyo.posY, this._splittedPuyo.color,
        recordPuyoSteps.MANIPULATE_PUYO_REC_FLAG);

      this._splittedPuyo = null;
      // TODO: make use of the condition of splittedpuyo === null  for chaging state
      setNextState();
    } else {
      this._splittedPuyo.posY = nextY;
    }
  }

  moveSplittedPuyoDown(posY, rate) {
    return posY + gameConfig.moveYDiff * rate;
  }

  setSplittedPuyo(singlePuyo: baseSinglePuyo) {
    // setSplittedPuyo(splittedPuyo, x, y, color) {
    // setSinglePuyo(this._splittedPuyo, singlePuyo.posX, singlePuyo.posY, singlePuyo.color);
    this.initSplittedPuyo();
    this._splittedPuyo.posX = singlePuyo.posX;
    this._splittedPuyo.posY = singlePuyo.posY;
    this._splittedPuyo.color = singlePuyo.color;
  };

  setUnsplittedPuyo(singlePuyo: baseSinglePuyo) {
    // setSinglePuyo(this._unsplittedPuyo, singlePuyo.posX, singlePuyo.posY, singlePuyo.color);
    this.initUnsplittedPuyo();
    this._unsplittedPuyo.posX = singlePuyo.posX;
    this._unsplittedPuyo.posY = singlePuyo.posY;
    this._unsplittedPuyo.color = singlePuyo.color;
  };

  initSplittedPuyo() { this._splittedPuyo = { posX: -1, posY: -1, color: -1 }; }
  initUnsplittedPuyo() { this._unsplittedPuyo = { posX: -1, posY: -1, color: -1 }; }

  get splittedPuyo() { return this._splittedPuyo; }
}
