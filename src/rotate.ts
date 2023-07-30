import { Current } from "./current"
import { Board } from "./board"
import { gameConfig } from "./config"
import { Move } from "./move"

export class Rotate {

  private _rotateDrawing = {
    isRotating: false,
    changeAngle: 0,
    diffAngle: 0,
    prevAngle: 0,
    drawCount: 0,
  }

  private _quickTurn = {
    isPossible: false,
    willExecute: false,
    // turnCW: () => { rotatePuyo(90); rotatePuyo(90); },
    // turnACW: () => { rotatePuyo(-90); rotatePuyo(-90); },
  }

  private _pushupDrawing = {
    isPushedUp: false,
    preChildX: 0,
    preChildY: 0,
    upY: 0,
    drawCount: 0,
  }

  constructor(
    private _current: Current,
    private _move: Move,
  ) {
  }


  rotatePuyo(_board: Board, changeAngle) {
    const rotatedPuyo = { ...this._current.currentPuyo };
    rotatedPuyo.angle += changeAngle;
    rotatedPuyo.angle = rotatedPuyo.angle === 360 ? 0 : (rotatedPuyo.angle === -90 ? 270 : rotatedPuyo.angle);
    const [rotatedChildX, rotatedChildY] = this._current.getChildPos(rotatedPuyo);
    const [currentChildX, currentChildY] = this._current.getChildPos(this._current.currentPuyo);
    let canRotate = false;

    // only skip when angle:90 or 270 in quickturn
    if (this._quickTurn.willExecute && (rotatedPuyo.angle === 90 || rotatedPuyo.angle === 270)) {
      this.setRotateDrawing(changeAngle, this._current.currentPuyo.angle);
      this._current.currentPuyo = rotatedPuyo;
      return;
    }

    // anytime puyo can rotate in this case
    if (rotatedPuyo.angle === 180) {
      canRotate = true;
    } else if (rotatedPuyo.angle === 90) {
      // left is empty? if not, can move right? if not, cannot rotate
      const nextX = rotatedChildX;
      if (nextX >= gameConfig.BOARD_LEFT_EDGE &&
        // currentChildY + 1 < gameConfig.BOARD_HEIGHT &&
        _board.board[Math.floor(currentChildY)][nextX] === gameConfig.NO_COLOR &&
        // _board.board[Math.floor(currentChildY) + 1][nextX] === gameConfig.NO_COLOR &&
        _board.board[Math.floor(rotatedChildY)][nextX] === gameConfig.NO_COLOR &&
        _board.board[Math.floor(rotatedChildY) + 1][nextX] === gameConfig.NO_COLOR
      ) {
        canRotate = true;
      } else if (this._move.canPuyoMoveRight(_board, rotatedPuyo)) {
        // TODO: movestart instead of letting puyo actually move here?
        rotatedPuyo.parentX = this._move.movePuyoHor_ori(rotatedPuyo.parentX, 1.0);
        canRotate = true;
      } else if (
        this._current.currentPuyo.angle === 180 &&
        _board.board[Math.floor(currentChildY) + 1][nextX] === gameConfig.NO_COLOR &&
        _board.board[Math.floor(rotatedChildY) + 1][nextX] !== gameConfig.NO_COLOR
      ) {
        // run aground upper-left puyo, next priority to moveright
        rotatedPuyo.parentY = Math.floor(currentChildY) + 1;
        canRotate = true;
      } else {
        // stuck and cannot move
        // or quickturn?
        this._quickTurn.isPossible = true;
        // and do nothing here, rotate twice in eventlistener
        return;
      }
    } else if (rotatedPuyo.angle === 270) {
      // right is empty? if not, can move left? if not, cannot rotate
      const nextX = rotatedChildX;
      if (nextX < gameConfig.BOARD_RIGHT_EDGE &&
        // currentChildY + 1 < gameConfig.BOARD_HEIGHT &&
        _board.board[Math.floor(rotatedChildY)][nextX] === gameConfig.NO_COLOR &&
        _board.board[Math.floor(rotatedChildY) + 1][nextX] === gameConfig.NO_COLOR &&
        _board.board[Math.floor(currentChildY)][nextX] === gameConfig.NO_COLOR
        // && _board.board[Math.floor(currentChildY) + 1][nextX] === gameConfig.NO_COLOR
      ) {
        canRotate = true;
      } else if (this._move.canPuyoMoveLeft(_board, rotatedPuyo)) {
        rotatedPuyo.parentX = this._move.movePuyoHor_ori(rotatedPuyo.parentX, -1.0);
        canRotate = true;
      } else if (
        this._current.currentPuyo.angle === 180 &&
        _board.board[Math.floor(currentChildY) + 1][nextX] === gameConfig.NO_COLOR &&
        _board.board[Math.floor(rotatedChildY) + 1][nextX] !== gameConfig.NO_COLOR
      ) {
        // run aground upper-right puyo, next priority to moveleft
        rotatedPuyo.parentY = Math.floor(currentChildY) + 1;
        canRotate = true;
      } else {
        // stuck and cannot move
        // or quickturn?
        this._quickTurn.isPossible = true;
        // and do nothing here, rotate twice in eventlistener
        return;
      }
    } else if (rotatedPuyo.angle === 0) {
      // if there is something below, push up by one cell
      if (rotatedChildY >= gameConfig.BOARD_BOTTOM_EDGE - 1 || //<- is this ok? need to check
        _board.board[Math.floor(rotatedChildY) + 1][rotatedChildX] !== gameConfig.NO_COLOR // ||
        // _board.board[Math.floor(rotatedChildY) + 1][currentChildX] !== gameConfig.NO_COLOR
      ) {
        // TODO: some animation at push up?
        this._pushupDrawing.preChildX = rotatedPuyo.parentX; // same as child
        this._pushupDrawing.preChildY = rotatedPuyo.parentY; // same as child

        let upY = (rotatedPuyo.parentY < 2) ? 0.1 : 0.5;
        rotatedPuyo.parentY = Math.floor(rotatedPuyo.parentY) - upY; // for mawashi??

        this._pushupDrawing.isPushedUp = true;
        this._pushupDrawing.upY = this._pushupDrawing.preChildY - (rotatedPuyo.parentY + 1);
      }
      canRotate = true;
    }

    if (canRotate) {
      this.setRotateDrawing(changeAngle, this._current.currentPuyo.angle);
      this._current.currentPuyo = rotatedPuyo;
      if (this._quickTurn.isPossible) this._quickTurn.isPossible = false;
      return;
    }
  }

  private setRotateDrawing(changeAngle, prevAngle) {
    this._rotateDrawing.isRotating = true;
    this._rotateDrawing.changeAngle = changeAngle;
    this._rotateDrawing.prevAngle = prevAngle;
  }

  get quickTurn() { return this._quickTurn; }
  get rotateDrawing() { return this._rotateDrawing; }
  get pushupDrawing() { return this._pushupDrawing; }
}
