import { gameConfig } from "./config.ts"
import { gameState } from "./state.ts"
import { Game } from "./game.ts"
import { baseManiPuyo, baseSinglePuyo } from "./puyo.ts"
import { Split } from "./split.ts"
import { Board } from "./board"
import { Current } from "./current"

export class Move {
  private _movingHorDrawing = {
    isMovingHor: false,
    targetX: 0,
    moveXDiff: 0,
    drawingX: 0,
    drawCount: 0,
  }

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

  private _setNextState: () => void;
  // private _onLandingSideways: () => boolean;
  private _setSplittedPuyo: (puyo: baseSinglePuyo) => void;
  private _setUnsplittedPuyo: (puyo: baseSinglePuyo) => void;

  constructor(
    // private _game: Game,
    private _board: Board,
    private _current: Current,
    private _split: Split,
  ) {
  }

  canPuyoMoveDown(
    // board: number[][],
    // currentPuyo: baseManiPuyo,
    // onLandingSideways,
    rate = 1.0,
    // setNextState = () => gameState.setState(gameState.SPLITTING),
  ) {
    const parentX = this._current.currentPuyo.parentX;
    const parentY = this._current.currentPuyo.parentY;
    const [childX, childY] = this._current.getChildPos(this._current.currentPuyo);
    const angle = this._current.currentPuyo.angle;

    if (parentY + gameConfig.moveYDiff * rate < Math.round(parentY)) { return true; }

    if (angle === 0 || angle === 180) {
      const downY = angle === 0 ? childY : parentY;
      // const nextY = Math.floor(downY) + 2;
      const nextY = Math.round(downY) + 1;
      if (nextY >= gameConfig.BOARD_BOTTOM_EDGE || this._board.board[nextY][parentX] !== gameConfig.NO_COLOR) {
        return false;
      }
      return true;
    } else if (angle === 90 || angle === 270) {
      // const nextY = Math.floor(parentY) + 2;
      const nextY = Math.round(parentY) + 1;

      // at first check lock-wait time on any condition
      if (nextY >= gameConfig.BOARD_BOTTOM_EDGE ||
        this._board.board[nextY][parentX] !== gameConfig.NO_COLOR ||
        this._board.board[nextY][childX] !== gameConfig.NO_COLOR
      ) {
        // must increment lockWaitCount to max in lockpuyo() not here
        // TODO: smarter logic this is shit!!!
        // if (lockWaitCount < gameConfig.LOCK_WAIT_TIME - 1) {
        //   incrementLockWaitCount();
        //   return false;
        // }

        // check lockwaitcount
        if (this._board.checkLockWaitCount(gameConfig.LOCK_WAIT_TIME - 1)) {
          return false;
        }
      } else {
        // none of those below conditions catches
        return true;
      }

      if (nextY >= gameConfig.BOARD_BOTTOM_EDGE ||
        (this._board.board[nextY][parentX] !== gameConfig.NO_COLOR && this._board.board[nextY][childX] !== gameConfig.NO_COLOR)
      ) {
        // ちぎり無（のはず）
        return false;
      } else if (this._board.board[nextY][parentX] !== gameConfig.NO_COLOR) {
        // 子側でちぎり（のはず）
        this._setNextState();
        const splittedPuyo: baseSinglePuyo = { posX: childX, posY: childY, color: this._current.currentPuyo.childColor };
        // this._split.setSplittedPuyo(splittedPuyo);
        this._split.setSplittedPuyo(splittedPuyo);
        const unsplittedPuyo: baseSinglePuyo = { posX: parentX, posY: Math.round(parentY), color: this._current.currentPuyo.parentColor };
        // this._split.setUnsplittedPuyo(unsplittedPuyo);
        this._split.setUnsplittedPuyo(unsplittedPuyo);
        // splittedPuyo.splittedX = childX;
        // splittedPuyo.splittedY = childY;
        // splittedPuyo.splittedColor = this._current.currentPuyo.childColor;
        // splittedPuyo.unsplittedX = parentX;
        // // splittedPuyo.unsplittedY = Math.floor(parentY) + 1;
        // splittedPuyo.unsplittedY = Math.round(parentY);
        // splittedPuyo.unsplittedColor = this._current.currentPuyo.parentColor;
        // TODO: unsplittedpuyo is locked in SPLITTING state
        // lockPuyo(this._board.board, splittedPuyo.unsplittedX, splittedPuyo.unsplittedY, splittedPuyo.unsplittedColor, recordPuyoSteps.MANIPULATE_PUYO_REC_FLAG);
        this._current.currentPuyo = null;

        return false;
      } else if (this._board.board[nextY][childX] !== gameConfig.NO_COLOR) {
        // 親側でちぎり（のはず）
        this._setNextState();
        const splittedPuyo: baseSinglePuyo = { posX: parentX, posY: parentY, color: this._current.currentPuyo.parentColor };
        // this._split.setSplittedPuyo(splittedPuyo);
        this._split.setSplittedPuyo(splittedPuyo);
        const unsplittedPuyo: baseSinglePuyo = { posX: childX, posY: Math.round(childY), color: this._current.currentPuyo.childColor };
        // this._split.setUnsplittedPuyo(unsplittedPuyo);
        this._split.setUnsplittedPuyo(unsplittedPuyo);
        // splittedPuyo.splittedX = parentX;
        // splittedPuyo.splittedY = parentY;
        // splittedPuyo.splittedColor = this._current.currentPuyo.parentColor;
        // splittedPuyo.unsplittedX = childX;
        // // splittedPuyo.unsplittedY = Math.floor(childY) + 1;
        // splittedPuyo.unsplittedY = Math.round(childY);
        // splittedPuyo.unsplittedColor = this._current.currentPuyo.childColor;
        // lockPuyo(this._board.board, splittedPuyo.unsplittedX, splittedPuyo.unsplittedY, splittedPuyo.unsplittedColor, recordPuyoSteps.MANIPULATE_PUYO_REC_FLAG);
        this._current.currentPuyo = null;

        return false;
      } else if (nextY >= gameConfig.BOARD_BOTTOM_EDGE) {
        // ちぎり無（のはず）
        return false;
      }
      return true;
    }
  }

  movePuyoHor_ori(parentX, direction) {
    this._movingHorDrawing.isMovingHor = true;
    // movingHorState.moveXDiff = direction / HOR_MOVING_TIME;
    this._movingHorDrawing.targetX = parentX + direction;
    this._movingHorDrawing.drawingX = parentX;
    return parentX + direction;
  }

  movePuyoDown(posY, rate) {
    return posY + gameConfig.moveYDiff * rate;
  }

  // Check if the current piece can move left
  canPuyoMoveLeft(maniPuyo: baseManiPuyo) {
    const parentX = maniPuyo.parentX;
    const parentY = maniPuyo.parentY;
    const [childX, childY] = this._current.getChildPos(maniPuyo);
    const angle = maniPuyo.angle;

    if (angle === 90 || angle === 270) {
      const leftX = angle === 90 ? childX : parentX;
      const nextX = leftX - 1;
      // if (nextX < gameConfig.BOARD_LEFT_EDGE || this._board.board[Math.floor(parentY)][nextX] !== gameConfig.NO_COLOR || this._board.board[Math.round(parentY)][nextX] !== gameConfig.NO_COLOR) {
      if (nextX < gameConfig.BOARD_LEFT_EDGE ||
        this._board.board[Math.floor(parentY)][nextX] !== gameConfig.NO_COLOR ||
        this._board.board[Math.floor(parentY) + 1][nextX] !== gameConfig.NO_COLOR
      ) {
        return false;
      }
      return true;
    } else if (angle === 0 || angle === 180) {
      const nextX = Math.round(parentX) - 1;
      // **one condition below is unnecessary
      if (nextX < gameConfig.BOARD_LEFT_EDGE ||
        this._board.board[Math.floor(parentY)][nextX] !== gameConfig.NO_COLOR ||
        this._board.board[Math.floor(parentY) + 1][nextX] !== gameConfig.NO_COLOR ||
        this._board.board[Math.floor(childY)][nextX] !== gameConfig.NO_COLOR ||
        // TODO: if childY is integer this is bad
        this._board.board[Math.floor(childY) + 1][nextX] !== gameConfig.NO_COLOR
      ) {
        return false;
      }
      return true;
    }
  }

  // Check if the current piece can move right
  canPuyoMoveRight(maniPuyo: baseManiPuyo) {
    const parentX = maniPuyo.parentX;
    const parentY = maniPuyo.parentY;
    const [childX, childY] = this._current.getChildPos(maniPuyo);
    const angle = maniPuyo.angle;

    if (angle === 90 || angle === 270) {
      const rightX = angle === 270 ? childX : parentX;
      const nextX = rightX + 1;
      // if (nextX >= gameConfig.BOARD_WIDTH || this._board.board[Math.floor(parentY)][nextX] !== gameConfig.NO_COLOR || this._board.board[Math.round(parentY)][nextX] !== gameConfig.NO_COLOR) {
      if (nextX >= gameConfig.BOARD_RIGHT_EDGE ||
        this._board.board[Math.floor(parentY)][nextX] !== gameConfig.NO_COLOR ||
        this._board.board[Math.floor(parentY) + 1][nextX] !== gameConfig.NO_COLOR
      ) {
        return false;
      }
      return true;
    } else if (angle === 0 || angle === 180) {
      const nextX = Math.round(parentX) + 1;
      // **one condition below is unnecessary
      if (nextX >= gameConfig.BOARD_RIGHT_EDGE ||
        this._board.board[Math.floor(parentY)][nextX] !== gameConfig.NO_COLOR ||
        // this._board.board[Math.round(parentY)][nextX] !== gameConfig.NO_COLOR ||
        this._board.board[Math.floor(parentY) + 1][nextX] !== gameConfig.NO_COLOR ||
        this._board.board[Math.floor(childY)][nextX] !== gameConfig.NO_COLOR ||
        this._board.board[Math.floor(childY) + 1][nextX] !== gameConfig.NO_COLOR
      ) {
        return false;
      }
      return true;
    }
  }

  rotatePuyo(changeAngle) {
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
        this._board.board[Math.floor(currentChildY)][nextX] == gameConfig.NO_COLOR &&
        // this._board.board[Math.floor(currentChildY) + 1][nextX] == gameConfig.NO_COLOR &&
        this._board.board[Math.floor(rotatedChildY)][nextX] == gameConfig.NO_COLOR &&
        this._board.board[Math.floor(rotatedChildY) + 1][nextX] == gameConfig.NO_COLOR
      ) {
        canRotate = true;
      } else if (this.canPuyoMoveRight(rotatedPuyo)) {
        // TODO: movestart instead of letting puyo actually move here?
        rotatedPuyo.parentX = this.movePuyoHor_ori(rotatedPuyo.parentX, 1.0);
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
        this._board.board[Math.floor(rotatedChildY)][nextX] == gameConfig.NO_COLOR &&
        this._board.board[Math.floor(rotatedChildY) + 1][nextX] == gameConfig.NO_COLOR &&
        this._board.board[Math.floor(currentChildY)][nextX] == gameConfig.NO_COLOR
        // && this._board.board[Math.floor(currentChildY) + 1][nextX] == gameConfig.NO_COLOR
      ) {
        canRotate = true;
      } else if (this.canPuyoMoveLeft(rotatedPuyo)) {
        rotatedPuyo.parentX = this.movePuyoHor_ori(rotatedPuyo.parentX, -1.0);
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
        this._board.board[Math.floor(rotatedChildY) + 1][rotatedChildX] !== gameConfig.NO_COLOR // ||
        // this._board.board[Math.floor(rotatedChildY) + 1][currentChildX] !== gameConfig.NO_COLOR
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
  get movingHorDrawing() { return this._movingHorDrawing; }

  setCallback(
    setNextState: () => void,
    // onLandingSideways: () => boolean,
    // setSplittedPuyo: (puyo: baseSinglePuyo) => void,
    // setUnsplittedPuyo: (puyo: baseSinglePuyo) => void,
  ) {
    this._setNextState = setNextState;
    // this._onLandingSideways = onLandingSideways;
    // this._setSplittedPuyo = setSplittedPuyo;
    // this._setUnsplittedPuyo = setUnsplittedPuyo;
  }

}
