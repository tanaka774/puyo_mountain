import { Current } from "./current.ts"
import { Board } from "./board.ts"
import { gameConfig } from "./config.ts"
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
        _board.board[Math.floor(currentChildY)][nextX] == gameConfig.NO_COLOR &&
        // _board.board[Math.floor(currentChildY) + 1][nextX] == gameConfig.NO_COLOR &&
        _board.board[Math.floor(rotatedChildY)][nextX] == gameConfig.NO_COLOR &&
        _board.board[Math.floor(rotatedChildY) + 1][nextX] == gameConfig.NO_COLOR
      ) {
        canRotate = true;
      } else if (this._move.canPuyoMoveRight(_board, rotatedPuyo)) {
        // TODO: movestart instead of letting puyo actually move here?
        rotatedPuyo.parentX = this._move.movePuyoHor_ori(rotatedPuyo.parentX, 1.0);
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
        _board.board[Math.floor(rotatedChildY)][nextX] == gameConfig.NO_COLOR &&
        _board.board[Math.floor(rotatedChildY) + 1][nextX] == gameConfig.NO_COLOR &&
        _board.board[Math.floor(currentChildY)][nextX] == gameConfig.NO_COLOR
        // && _board.board[Math.floor(currentChildY) + 1][nextX] == gameConfig.NO_COLOR
      ) {
        canRotate = true;
      } else if (this._move.canPuyoMoveLeft(_board, rotatedPuyo)) {
        rotatedPuyo.parentX = this._move.movePuyoHor_ori(rotatedPuyo.parentX, -1.0);
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
        rotatedPuyo.parentY = Math.floor(rotatedPuyo.parentY) - 0.5; // for mawashi??
      }
      canRotate = true;
    }

    if (canRotate) {
      this.setRotateDrawing(changeAngle, this._current.currentPuyo.angle);
      this._current.currentPuyo = rotatedPuyo;
      return;
    }
  }

  setRotateDrawing(changeAngle, prevAngle) {
    this._rotateDrawing.isRotating = true;
    this._rotateDrawing.changeAngle = changeAngle;
    this._rotateDrawing.prevAngle = prevAngle;
  }

  get quickTurn() { return this._quickTurn; }
  get rotateDrawing() { return this._rotateDrawing; }
}
