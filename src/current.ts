import { baseManiPuyo } from "./types"
import { gameConfig } from "./config"
import { recordPuyoSteps } from "./record"
import { GameState, stateHandle } from "./state"
import { Board } from "./board";

export class Current {
  private _currentPuyo: baseManiPuyo;
  private _nextPuyo: baseManiPuyo;
  private _doubleNextPuyo: baseManiPuyo;
  private _versatilePuyo: baseManiPuyo;
  private _isBeingVPuyoUsed: boolean;
  private _hasVPuyoUsed: boolean;
  private _afterVPuyoSwitching: () => void;
  private _puyoPool: number[][];
  private _nextMovingCount: number;

  constructor(
    private _board: Board,
  ) {
    this._currentPuyo = null;
    this._nextPuyo = null;
    this._doubleNextPuyo = null;
    this._versatilePuyo = null;
    this._isBeingVPuyoUsed = false;
    this._hasVPuyoUsed = false;
    this.initPuyoPool();
    this.initNextMovingCount();

    document.addEventListener('keyup', e => {
      if (e.key === 'c') {
        if (!stateHandle.checkCurrentState(GameState.MANIPULATING) ||
          !this._versatilePuyo
        ) return;

        if (!this._isBeingVPuyoUsed) {
          this._versatilePuyo.parentColor = (this._versatilePuyo.parentColor) % gameConfig.PUYO_COLOR_NUM + 1;
          this._versatilePuyo.childColor = (this._versatilePuyo.childColor) % gameConfig.PUYO_COLOR_NUM + 1;
        } else {
          // is this ok? be careful
          this._currentPuyo.parentColor = (this._currentPuyo.parentColor) % gameConfig.PUYO_COLOR_NUM + 1;
          this._currentPuyo.childColor = (this._currentPuyo.childColor) % gameConfig.PUYO_COLOR_NUM + 1;
        }
      }
    });

    document.addEventListener('keyup', e => {
      if (e.key === 'd') {
        if (!stateHandle.checkCurrentState(GameState.MANIPULATING) ||
          this._hasVPuyoUsed
        ) return;

        // is this copy ok???
        this._currentPuyo.parentX = gameConfig.PUYO_BIRTH_POSX;
        this._currentPuyo.parentY = gameConfig.PUYO_BIRTH_POSY_REAL;
        this._currentPuyo.angle = 180;
        const temp = this._currentPuyo;
        this._currentPuyo = this._versatilePuyo;
        this._versatilePuyo = temp;
        this._isBeingVPuyoUsed = true;
        this._hasVPuyoUsed = true;

        this._afterVPuyoSwitching();
      }
    });
  }

  initPuyoPool() {
    this._puyoPool = [];
    const frequencies = Array.from({ length: gameConfig.PUYO_COLOR_NUM })
      .fill(gameConfig.PUYO_POOL_LOOP * 2 / gameConfig.PUYO_COLOR_NUM) as number[];
    const getRandomIndex = () => Math.floor(Math.random() * gameConfig.PUYO_COLOR_NUM);
    for (let n = 0; n < gameConfig.PUYO_POOL_LOOP; n++) {
      let index1 = getRandomIndex();
      let index2 = getRandomIndex();
      while (frequencies[index1] === 0) { index1 = getRandomIndex(); }
      frequencies[index1]--;
      while (frequencies[index2] === 0) { index2 = getRandomIndex(); }
      frequencies[index2]--;
      this._puyoPool.push([index1 + 1, index2 + 1]);
    }
  }

  usePuyoPool() {
    const res: baseManiPuyo = {
      parentColor: this._puyoPool[0][0],
      childColor: this._puyoPool[0][1],
      parentX: gameConfig.PUYO_BIRTH_POSX,
      parentY: gameConfig.PUYO_BIRTH_POSY_REAL,
      angle: 180,
    }
    this._puyoPool = this._puyoPool.slice(1);
    return res;
  }


  newPuyoSet() {
    if (this._isBeingVPuyoUsed) {
      this._currentPuyo = this._versatilePuyo;
      this._versatilePuyo = null;
      this._isBeingVPuyoUsed = false;
      this._afterVPuyoSwitching();
    } else {
      if (this._puyoPool.length === 0) { this.initPuyoPool(); }

      // this._currentPuyo = (!stateHandle.checkPrevState(GameState.UNINIT))
      //   ? this._nextPuyo
      //   : this.usePuyoPool();
      if (!stateHandle.checkPrevState(GameState.UNINIT)) {
        this._currentPuyo = this._nextPuyo;
        this.initNextMovingCount();
      } else {
        this._currentPuyo = this.usePuyoPool();
      }
      this._nextPuyo = (this._nextPuyo !== null)
        ? this._doubleNextPuyo
        : this.usePuyoPool();
      this._doubleNextPuyo = this.usePuyoPool();
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

  initManiPuyos() {
    this._currentPuyo = null;
    this._nextPuyo = null;
    this._doubleNextPuyo = null;
    this._versatilePuyo = null;
  }

  initPuyos() {
    this.initManiPuyos();
    this.initPuyoPool();
  }

  get versatilePuyo() { return this._versatilePuyo; }
  initVPuyo() {
    this._isBeingVPuyoUsed = false;
    this._hasVPuyoUsed = false;

    this._versatilePuyo = {
      parentColor: 1,
      childColor: 1,
      parentX: gameConfig.PUYO_BIRTH_POSX,
      parentY: gameConfig.PUYO_BIRTH_POSY_REAL,
      angle: 180,
    }
  }


  get nextMovingCount() { return this._nextMovingCount; }
  initNextMovingCount() { this._nextMovingCount = 0; }
  incrementNextMovingCount() { this._nextMovingCount++; }

  setCallback(afterVPuyoSwitching: () => void) {
    this._afterVPuyoSwitching = afterVPuyoSwitching;
  }
}
