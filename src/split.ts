import { baseSinglePuyo, setSinglePuyo } from "./types"
import { gameConfig } from "./config"
import { recordPuyoSteps } from "./record"
import { Board } from "./board";

export class Split {
  // this initializing is ok?
  private _splittedPuyo: baseSinglePuyo;
  private _unsplittedPuyo: baseSinglePuyo;

  constructor(
    private _board: Board,
  ) {
    // this.initSplittedPuyo();
    // this.initUnsplittedPuyo();
    this._unsplittedPuyo = null;
    this._splittedPuyo = null;
  }

  lockUnsplittedPuyo() {
    this._board.lockPuyo(this._board.board, this._unsplittedPuyo.posX, this._unsplittedPuyo.posY, this._unsplittedPuyo.color, recordPuyoSteps.MANIPULATE_PUYO_REC_FLAG);
    this._unsplittedPuyo = null;
  }

  setSplittedPuyo(singlePuyo: baseSinglePuyo) {
    // this.initSplittedPuyo();
    this._splittedPuyo = { posX: -1, posY: -1, color: -1 };
    this._splittedPuyo.posX = singlePuyo.posX;
    this._splittedPuyo.posY = singlePuyo.posY;
    this._splittedPuyo.color = singlePuyo.color;
  };

  setUnsplittedPuyo(singlePuyo: baseSinglePuyo) {
    // this.initUnsplittedPuyo();
    this._unsplittedPuyo = { posX: -1, posY: -1, color: -1 };
    this._unsplittedPuyo.posX = singlePuyo.posX;
    this._unsplittedPuyo.posY = singlePuyo.posY;
    this._unsplittedPuyo.color = singlePuyo.color;
  };

  initSplittedPuyo() { this._splittedPuyo = null; }
  initUnsplittedPuyo() { this._unsplittedPuyo = null; }

  get splittedPuyo() { return this._splittedPuyo; }
  set splittedPuyo(singlePuyo: baseSinglePuyo) { this._splittedPuyo = singlePuyo; }

}
