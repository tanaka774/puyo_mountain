import { throttle, keyPressedTwice } from "./util.js"
import { gameState } from "./state.ts"
import { gameConfig } from "./config.ts"
import { Move } from "./move.ts"
import { Game } from "./game.ts"
import { Current } from "./current.ts"
import { Board } from "./board"


export class Input {

  private isRightKeyPressed = false;
  private isLeftKeyPressed = false;
  private isDownKeyPressed = false;

  // private throttleHandler = this.throttleInitializer();
  private throttleHandler;

  constructor(
    // private _game: Game,
    private _board: Board,
    private _current: Current,
    private _move: Move,
  ) {
    // TODO: be careful enough for these eventlistener
    document.addEventListener('keydown', e => {
      // is this condition necessary? yes for rotation
      if (this.canTakeInput()) {
        if (e.key === 'ArrowLeft') { this.isLeftKeyPressed = true; }
        if (e.key === 'ArrowRight') { this.isRightKeyPressed = true; }
        if (e.key === 'ArrowDown') { this.isDownKeyPressed = true; }
        if (e.key === 'z') { this._move.rotatePuyo(-90); }
        if (e.key === 'x') { this._move.rotatePuyo(90); }
      } else {
        this.keyInputInit();
      }
    });

    // for quickturn
    document.addEventListener('keydown', keyPressedTwice('x', () => {
      if (this._move.quickTurn.isPossible && this._current.currentPuyo) {
        this._move.quickTurn.willExecute = true;
        // quickTurn.turnCW();
        this._move.rotatePuyo(90);
        this._move.rotatePuyo(90);
      }
    }, () => { this._move.quickTurn.willExecute = false; }, 1000));

    document.addEventListener('keydown', keyPressedTwice('z', () => {
      if (this._move.quickTurn.isPossible && this._current.currentPuyo) {
        this._move.quickTurn.willExecute = true;
        // quickTurn.turnACW();
        this._move.rotatePuyo(-90);
        this._move.rotatePuyo(-90);
      }
    }, () => { this._move.quickTurn.willExecute = false; }, 1000));

    document.addEventListener('keyup', e => {
      // if (canTakeInput()) {
      if (e.key === 'ArrowLeft') {
        this.isLeftKeyPressed = false;
      }
      if (e.key === 'ArrowRight') {
        this.isRightKeyPressed = false;
      }
      if (e.key === 'ArrowDown') {
        this.isDownKeyPressed = false;
      }
      // }
    });

    this.throttleHandler = this.throttleInitializer(this.downKeyHandle.bind(this), this.horKeyhandle.bind(this));

  }

  // TODO: do smarter and think again this function's necessity
  throttleInitializer(keyHandle1, keyHandle2) {
    let downThrottleHandler;
    let horThrottleHandler;
    // let rotateThrottleHandler;
    let initialized = false;
    return function() {
      if (!initialized) {
        // downThrottleHandler = throttle(this.downKeyHandle, 10); // not affecting with value less than this(10)
        // horThrottleHandler = throttle(this.horKeyhandle, 90);
        // TODO: unsure this works, verify with original code firsy
        downThrottleHandler = throttle(keyHandle1, 10); // not affecting with value less than this(10)
        horThrottleHandler = throttle(keyHandle2, 90);
        // TODO: perhaps rotate doesn't need to do this(simple addevent is enough?)
        // rotateThrottleHandler = throttle(rotateKeyHandle, 100);
        initialized = true;
      }
      downThrottleHandler();
      horThrottleHandler();
      // rotateThrottleHandler();
    }
  }

  canTakeInput() {
    return (gameState.currentState === gameState.MANIPULATING)
  }

  inputHandle() {
    this.throttleHandler();
  }

  downKeyHandle() {
    // if (!canTakeInput()) return;

    if (this.isDownKeyPressed) {
      let keyMoveDownRate = 15.0; // TODO: thro into config
      // I'm afraid of more than 0.5, which could get this world upside down
      if (keyMoveDownRate * gameConfig.moveYDiff >= 0.5) keyMoveDownRate = 0.5 / gameConfig.moveYDiff;
      if (this._move.canPuyoMoveDown(keyMoveDownRate)) {
        this._current.currentPuyo.parentY = this._move.movePuyoDown(this._current.currentPuyo.parentY, keyMoveDownRate);
      } else if (this._current.currentPuyo && this._move.canPuyoMoveDown(keyMoveDownRate / 2)) {
        this._current.currentPuyo.parentY = this._move.movePuyoDown(this._current.currentPuyo.parentY, keyMoveDownRate / 2);
      } else if (this._current.currentPuyo && this._move.canPuyoMoveDown(keyMoveDownRate / 4)) {
        this._current.currentPuyo.parentY = this._move.movePuyoDown(this._current.currentPuyo.parentY, keyMoveDownRate / 4);
      } else {
        // get puyo being able to lock immediately
        // TODO: find good timing or consider better logic
        this._board.endLockWait();
      }
    }
  }

  horKeyhandle() {
    if (!this.canTakeInput()) return;

    if (this.isRightKeyPressed) {
      if (this._move.canPuyoMoveRight(this._current.currentPuyo)) {
        this._current.currentPuyo.parentX = this._move.movePuyoHor_ori(this._current.currentPuyo.parentX, 1.0);
        // this._current.currentPuyo.parentX = moveHorStart(this._current.currentPuyo.parentX, 1.0);
      }
    }
    if (this.isLeftKeyPressed) {
      if (this._move.canPuyoMoveLeft(this._current.currentPuyo)) {
        this._current.currentPuyo.parentX = this._move.movePuyoHor_ori(this._current.currentPuyo.parentX, -1.0);
        // this._current.currentPuyo.parentX = moveHorStart(this._current.currentPuyo.parentX, -1.0);
      }
    }
  }

  keyInputInit() {
    this.isDownKeyPressed = false;
    this.isRightKeyPressed = false;
    this.isLeftKeyPressed = false;
  }

}
