import { throttle, throttleEX, keyPressedTwice } from "./util.js"
import { GameState, stateHandle } from "./state"
import { gameConfig } from "./config"
import { Move } from "./move"
import { Game } from "./game"
import { Current } from "./current"
import { Board } from "./board"
import { Rotate } from "./rotate"


export class Input {

  private isRightKeyPressed = false;
  private isLeftKeyPressed = false;
  private isDownKeyPressed = false;

  private throttleHandler;

  constructor(
    private _board: Board,
    private _current: Current,
    private _move: Move,
    private _rotate: Rotate,
  ) {
    // TODO: be careful enough for these eventlistener
    document.addEventListener('keydown', e => {
      // is this condition necessary? yes for rotation
      if (this.canTakeInput()) {
        if (e.key === 'ArrowLeft') {
          // if (!this.isRightKeyPressed)
          this.isLeftKeyPressed = true;
        }
        if (e.key === 'ArrowRight') {
          // if (!this.isLeftKeyPressed)
          this.isRightKeyPressed = true;
        }
        if (e.key === 'ArrowDown') { this.isDownKeyPressed = true; }
        if (e.key === 'z') { this._rotate.rotatePuyo(this._board, -90); }
        if (e.key === 'x') { this._rotate.rotatePuyo(this._board, 90); }
      } else {
        this.keyInputInit();
      }
    });

    // for quickturn
    document.addEventListener('keydown', keyPressedTwice('x', () => {
      if (this._rotate.quickTurn.isPossible && this._current.currentPuyo) {
        this._rotate.quickTurn.willExecute = true;
        // quickTurn.turnCW();
        this._rotate.rotatePuyo(this._board, 90);
        this._rotate.rotatePuyo(this._board, 90);
      }
    }, () => { this._rotate.quickTurn.willExecute = false; }, 1000));

    document.addEventListener('keydown', keyPressedTwice('z', () => {
      if (this._rotate.quickTurn.isPossible && this._current.currentPuyo) {
        this._rotate.quickTurn.willExecute = true;
        // quickTurn.turnACW();
        this._rotate.rotatePuyo(this._board, -90);
        this._rotate.rotatePuyo(this._board, -90);
      }
    }, () => { this._rotate.quickTurn.willExecute = false; }, 1000));

    document.addEventListener('keyup', e => {
      // if (canTakeInput()) {
      if (e.key === 'ArrowLeft') {
        this.isLeftKeyPressed = false;
        this._firstOccuredLeft = false;
        this._secondOccuredLeft = false;
      }
      if (e.key === 'ArrowRight') {
        this.isRightKeyPressed = false;
        this._firstOccuredRight = false;
        this._secondOccuredRight = false;
      }
      if (e.key === 'ArrowDown') {
        this.isDownKeyPressed = false;
      }
      // TODO: rotate?
      // }
    });

    this.throttleHandler = this.throttleInitializer(
      this.downKeyHandle.bind(this),
      this.rightKeyHandle.bind(this),
      this.leftKeyHandle.bind(this)
    );

    this._lastExecutionRight = 0;
    this._firstOccuredRight = false;
    this._secondOccuredRight = false;
    this._lastExecutionLeft = 0;
    this._firstOccuredLeft = false;
    this._secondOccuredLeft = false;
  }

  // TODO: do smarter and think again this function's necessity
  throttleInitializer(keyHandle1, keyHandle2, keyHandle3) {
    let downThrottleHandler;
    // let horThrottleHandler;
    let rightThrottleHandler;
    let leftThrottleHandler;
    // let rotateThrottleHandler;
    let initialized = false;
    return function() {
      if (!initialized) {
        // downThrottleHandler = throttle(this.downKeyHandle, 10); // not affecting with value less than this(10)
        // horThrottleHandler = throttle(this.horKeyhandle, 90);
        // TODO: unsure this works, verify with original code firsy
        downThrottleHandler = this.throttle(keyHandle1, 10); // not affecting with value less than this(10)
        // rightThrottleHandler = this.throttleEX(keyHandle2, 200, 70, 300);
        // leftThrottleHandler = this.throttleEX(keyHandle3, 200, 70, 300);
        // rightThrottleHandler = throttle(keyHandle2, 150);
        // leftThrottleHandler = throttle(keyHandle3, 150);
        // TODO: perhaps rotate doesn't need to do this(simple addevent is enough?)
        // rotateThrottleHandler = throttle(rotateKeyHandle, 100);
        initialized = true;
      }
      if (this.isDownKeyPressed)
        downThrottleHandler();
      // if (this.isRightKeyPressed)
      //   rightThrottleHandler();
      // if (this.isLeftKeyPressed)
      //   leftThrottleHandler();
    }
  }

  canTakeInput() {
    return (stateHandle.checkCurrentState(GameState.MANIPULATING));
  }

  inputHandle() {
    this.throttleHandler();

    if (this.isRightKeyPressed && this.isLeftKeyPressed) return;

    if (this.isRightKeyPressed)
      this.throttleEXRight(() => { this.rightKeyHandle() }, 140, 60, 200);
    if (this.isLeftKeyPressed)
      // this.throttleEXLeft(() => { this.leftKeyHandle() }, 200, 70, 300);
      this.throttleEXLeft(() => { this.leftKeyHandle() }, 140, 60, 200);
  }

  downKeyHandle() {
    // if (!canTakeInput()) return;

    // if (this.isDownKeyPressed) {
    let keyMoveDownRate = 20.0; // TODO: thro into config
    // I'm afraid of more than 0.5, which could get this world upside down
    if (keyMoveDownRate * gameConfig.moveYDiff >= 0.5) keyMoveDownRate = 0.5 / gameConfig.moveYDiff;
    if (this._move.canPuyoMoveDown(this._board, keyMoveDownRate)) {
      this._current.currentPuyo.parentY = this._move.movePuyoDown(this._current.currentPuyo.parentY, keyMoveDownRate);
    } else if (this._current.currentPuyo && this._move.canPuyoMoveDown(this._board, keyMoveDownRate / 2)) {
      this._current.currentPuyo.parentY = this._move.movePuyoDown(this._current.currentPuyo.parentY, keyMoveDownRate / 2);
    } else if (this._current.currentPuyo && this._move.canPuyoMoveDown(this._board, keyMoveDownRate / 4)) {
      this._current.currentPuyo.parentY = this._move.movePuyoDown(this._current.currentPuyo.parentY, keyMoveDownRate / 4);
    } else {
      // get puyo being able to lock immediately
      // TODO: find good timing or consider better logic
      this._board.endLockWait();
    }
    // }
  }

  rightKeyHandle() {
    if (!this.canTakeInput()) return; // <- want to remove this

    // if (this.isRightKeyPressed) {
    if (this._move.canPuyoMoveRight(this._board, this._current.currentPuyo)) {
      this._current.currentPuyo.parentX = this._move.movePuyoHor_ori(this._current.currentPuyo.parentX, 1.0);
      // this._current.currentPuyo.parentX = moveHorStart(this._current.currentPuyo.parentX, 1.0);
    }
    // }
  }

  leftKeyHandle() {
    if (!this.canTakeInput()) return;

    // if (this.isLeftKeyPressed) {
    if (this._move.canPuyoMoveLeft(this._board, this._current.currentPuyo)) {
      this._current.currentPuyo.parentX = this._move.movePuyoHor_ori(this._current.currentPuyo.parentX, -1.0);
      // this._current.currentPuyo.parentX = moveHorStart(this._current.currentPuyo.parentX, -1.0);
    }
    // }
  }

  // horKeyhandle() {
  //   if (!this.canTakeInput()) return;
  //
  //   if (this.isRightKeyPressed) {
  //     if (this._move.canPuyoMoveRight(this._board, this._current.currentPuyo)) {
  //       this._current.currentPuyo.parentX = this._move.movePuyoHor_ori(this._current.currentPuyo.parentX, 1.0);
  //       // this._current.currentPuyo.parentX = moveHorStart(this._current.currentPuyo.parentX, 1.0);
  //     }
  //   }
  //   if (this.isLeftKeyPressed) {
  //     if (this._move.canPuyoMoveLeft(this._board, this._current.currentPuyo)) {
  //       this._current.currentPuyo.parentX = this._move.movePuyoHor_ori(this._current.currentPuyo.parentX, -1.0);
  //       // this._current.currentPuyo.parentX = moveHorStart(this._current.currentPuyo.parentX, -1.0);
  //     }
  //   }
  // }

  keyInputInit() {
    this.isDownKeyPressed = false;
    this.isRightKeyPressed = false;
    this.isLeftKeyPressed = false;
  }

  keyPressedTwice(keyType, callbackInLimit, callbackAlways = null, limit) {
    let keyPressed = false;
    let firstKeyPressTime = 0;
    return function(e) {
      if (e.key !== keyType) return;
      if (!keyPressed) {
        keyPressed = true;
        firstKeyPressTime = Date.now()
      } else {
        const timeDifference = Date.now() - firstKeyPressTime;
        if (timeDifference < limit) {
          callbackInLimit(e);
        }

        keyPressed = false;
        callbackAlways();
      }
    }
  }


  throttle(callback, delay) {
    let lastExecution = 0;
    return function(event = null) {
      const now = Date.now();
      if (now - lastExecution >= delay) {
        callback();
        lastExecution = now;
      }
    };
  }

  private _lastExecutionRight: number;
  private _firstOccuredRight: boolean;
  private _secondOccuredRight: boolean;
  private _lastExecutionLeft: number;
  private _firstOccuredLeft: boolean;
  private _secondOccuredLeft: boolean;

  throttleEXRight(callback, firstDelay, sequenceDelay, resetTime) {
    const now = Date.now();
    const elapsedTime = now - this._lastExecutionRight;
    if (elapsedTime >= resetTime) {
      this._firstOccuredRight = false;
      this._secondOccuredRight = false;
    }

    if (elapsedTime >= firstDelay) {
      callback();
      this._lastExecutionRight = now;
      if (this._firstOccuredRight) this._secondOccuredRight = true;
      this._firstOccuredRight = true;
    } else if (this._secondOccuredRight && elapsedTime >= sequenceDelay) {
      callback();
      this._lastExecutionRight = now;
    }
  }

  throttleEXLeft(callback, firstDelay, sequenceDelay, resetTime) {
    const now = Date.now();
    const elapsedTime = now - this._lastExecutionLeft;
    if (elapsedTime >= resetTime) {
      this._firstOccuredLeft = false;
      this._secondOccuredLeft = false;
    }

    if (elapsedTime >= firstDelay) {
      callback();
      this._lastExecutionLeft = now;
      if (this._firstOccuredLeft) this._secondOccuredLeft = true;
      this._firstOccuredLeft = true;
    } else if (this._secondOccuredLeft && elapsedTime >= sequenceDelay) {
      callback();
      this._lastExecutionLeft = now;
    }
  }

  // throttleEX(callback, firstDelay, sequenceDelay, resetTime) {
  //   let lastExecution = 0;
  //   // let firstOccured = false;
  //   // let secondOccured = false;
  //   this._firstOccuredInThrottle = false;
  //   this._secondOccuredInThrottle = false;
  //   return function(event = null) {
  //     const now = Date.now();
  //     const elapsedTime = now - lastExecution;
  //     if (elapsedTime >= resetTime) {
  //       this._firstOccuredInThrottle = false;
  //       this._secondOccuredInThrottle = false;
  //     }
  //
  //     if (elapsedTime >= firstDelay) {
  //       callback();
  //       lastExecution = now;
  //       if (this._firstOccuredInThrottle) this._secondOccuredInThrottle = true;
  //       this._firstOccuredInThrottle = true;
  //     } else if (this._secondOccuredInThrottle && elapsedTime >= sequenceDelay) {
  //       callback();
  //       lastExecution = now;
  //     }
  //   };
  // }
}
