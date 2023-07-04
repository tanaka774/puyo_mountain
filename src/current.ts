import { baseManiPuyo } from "./types.ts"
import { gameConfig } from "./config.ts"
import { recordPuyoSteps } from "./record.ts"
import { gameState } from "./state.ts"
import { Board } from "./board";

export class Current {
  private _currentPuyo: baseManiPuyo;
  private _nextPuyo: baseManiPuyo;
  private _doubleNextPuyo: baseManiPuyo;
  private _versatilePuyo: baseManiPuyo;
  private _isBeingVPuyoUsed: boolean;
  private _hasVPuyoUsed: boolean;
  private _afterVPuyoSwitching: () => void;

  constructor(
    private _board: Board,
  ) {
    this._currentPuyo = null;
    this._nextPuyo = null;
    this._doubleNextPuyo = null;
    this._versatilePuyo = null;
    this._isBeingVPuyoUsed = false;
    this._hasVPuyoUsed = false;

    document.addEventListener('keydown', e => {
      if (e.key === 'c') {
        if (gameState.currentState !== gameState.MANIPULATING ||
          this._hasVPuyoUsed || !this._versatilePuyo
        ) return;

        this._versatilePuyo.parentColor = (this._versatilePuyo.parentColor) % 4 + 1;
        this._versatilePuyo.childColor = (this._versatilePuyo.childColor) % 4 + 1;
      }
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'd') {
        if (gameState.currentState !== gameState.MANIPULATING &&
          this._hasVPuyoUsed
        ) return;

        // is this copy ok???
        this._currentPuyo.parentX = gameConfig.PUYO_BIRTH_POSX;
        this._currentPuyo.parentY = gameConfig.PUYO_BIRTH_POSY;
        this._currentPuyo.angle = 0;
        const temp = this._currentPuyo;
        this._currentPuyo = this._versatilePuyo;
        this._versatilePuyo = temp;
        this._isBeingVPuyoUsed = true;
        this._hasVPuyoUsed = true;

        this._afterVPuyoSwitching();
      }
    });
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
    if (this._isBeingVPuyoUsed) {
      this._currentPuyo = this._versatilePuyo;
      this._versatilePuyo = null;
      this._isBeingVPuyoUsed = false;
    } else {
      this._currentPuyo = (gameState.prevState !== gameState.UNINIT)
        ? this._nextPuyo
        : this.getRandomPuyo();
      this._nextPuyo = (this._nextPuyo !== null) ? this._doubleNextPuyo : this.getRandomPuyo();
      this._doubleNextPuyo = this.getRandomPuyo();
    }

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

  initPuyos() {
    this._currentPuyo = null;
    this._nextPuyo = null;
    this._doubleNextPuyo = null;
    this._versatilePuyo = null;
  }

  get versatilePuyo() { return this._versatilePuyo; }
  initVPuyo() {
    this._isBeingVPuyoUsed = false;
    this._hasVPuyoUsed = false;

    this._versatilePuyo = {
      parentColor: 1,
      childColor: 1,
      parentX: gameConfig.PUYO_BIRTH_POSX,
      parentY: gameConfig.PUYO_BIRTH_POSY,
      angle: 0,
    }
  }

  setCallback(afterVPuyoSwitching: () => void) {
    this._afterVPuyoSwitching = afterVPuyoSwitching;
  }
}
