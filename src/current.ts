import { baseManiPuyo } from "./types.ts"
import { gameConfig } from "./config.ts"
import { recordPuyoSteps } from "./record.ts"
import { gameState } from "./state.ts"
import { Board } from "./board";

export class Current {
  private _currentPuyo: baseManiPuyo;
  private _nextPuyo: baseManiPuyo;
  private _doubleNextPuyo: baseManiPuyo;

  constructor(
    private _board: Board,
  ) {
    this._currentPuyo = null;
    this._nextPuyo = null;
    this._doubleNextPuyo = null;
  }

  getRandomPuyo() {
    const newPuyo: baseManiPuyo = {
      parentColor: Math.floor(Math.random() * 4) + 1,
      childColor: Math.floor(Math.random() * 4) + 1,
      parentX: gameConfig.PUYO_BIRTH_POSX,
      parentY: gameConfig.PUYO_BIRTH_POSY,
      angle: 0,
    }
    return newPuyo;
  }

  newPuyoSet() {
    this._currentPuyo = (gameState.prevState !== gameState.UNINIT) ? this._nextPuyo : this.getRandomPuyo();
    this._nextPuyo = (this._nextPuyo !== null) ? this._doubleNextPuyo : this.getRandomPuyo();
    this._doubleNextPuyo = this.getRandomPuyo();
  }

  getChildPos(puyo: baseManiPuyo) {
    // TODO: modify returning drawingX during rotating
    // const parentX = (_movingHorDrawing.isMovingHor) ? _movingHorDrawing.drawingX : puyo.parentX;
    const parentX = puyo.parentX;
    const diffs = [[0, 1], [-1, 0], [0, -1], [1, 0]];
    const childX = diffs[(puyo.angle / 90) % 4][0] + parentX;
    const childY = diffs[(puyo.angle / 90) % 4][1] + puyo.parentY;
    return [childX, childY];
  };

  // Lock the current puyo, this is the case splitting not happening
  lockCurrentPuyo() {
    if (this._board.lockWaitCount < gameConfig.LOCK_WAIT_TIME) {
      this._board.incrementLockWaitCount();
      return false;
    }
    // fix Y position into integer
    this._currentPuyo.parentY = Math.round(this._currentPuyo.parentY);
    // currentPuyo.parentY = 1 + Math.floor(currentPuyo.parentY);

    const [childX, childY] = this.getChildPos(this._currentPuyo);
    this._board.lockPuyo(this._board.board, this._currentPuyo.parentX, this._currentPuyo.parentY, this._currentPuyo.parentColor, recordPuyoSteps.MANIPULATE_PUYO_REC_FLAG);
    this._board.lockPuyo(this._board.board, childX, childY, this._currentPuyo.childColor, recordPuyoSteps.MANIPULATE_PUYO_REC_FLAG);

    this._currentPuyo = null;

    return true;
  }

  get currentPuyo() { return this._currentPuyo; }
  set currentPuyo(puyo: baseManiPuyo) { this._currentPuyo = puyo; }
  initCurrentPuyo() { this._currentPuyo = null; }

  get nextPuyo() { return this._nextPuyo; }
  get doubleNextPuyo() { return this._doubleNextPuyo; }

}
