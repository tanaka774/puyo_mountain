import { gameConfig } from "./config.ts"
import { gameState } from "./state.ts"
import { Game } from "./game.ts"
import { baseManiPuyo, baseSinglePuyo } from "./types.ts"
import { Split } from "./split.ts"
import { Current } from "./current.ts"
import { Board } from "./board.ts"

export class Move {
  private _movingHorDrawing = {
    isMovingHor: false,
    targetX: 0,
    moveXDiff: 0,
    drawingX: 0,
    drawCount: 0,
  }
  private _setNextState: () => void;

  constructor(
    private _current: Current,
    private _split: Split,
  ) {
  }

  canPuyoMoveDown(
    _board: Board,
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
      if (nextY >= gameConfig.BOARD_BOTTOM_EDGE || _board.board[nextY][parentX] !== gameConfig.NO_COLOR) {
        return false;
      }
      return true;
    } else if (angle === 90 || angle === 270) {
      // const nextY = Math.floor(parentY) + 2;
      const nextY = Math.round(parentY) + 1;

      // at first check lock-wait time on any condition
      if (nextY >= gameConfig.BOARD_BOTTOM_EDGE ||
        _board.board[nextY][parentX] !== gameConfig.NO_COLOR ||
        _board.board[nextY][childX] !== gameConfig.NO_COLOR
      ) {
        // must increment lockWaitCount to max in lockpuyo() not here
        // check lockwaitcount
        if (_board.checkLockWaitCount(gameConfig.LOCK_WAIT_TIME - 1)) {
          // _board.incrementLockWaitCount();
          return false;
        }
      } else {
        // none of those below conditions catches
        return true;
      }

      if (nextY >= gameConfig.BOARD_BOTTOM_EDGE ||
        (_board.board[nextY][parentX] !== gameConfig.NO_COLOR && _board.board[nextY][childX] !== gameConfig.NO_COLOR)
      ) {
        // ちぎり無（のはず）
        return false;
      } else if (_board.board[nextY][parentX] !== gameConfig.NO_COLOR) {
        // 子側でちぎり（のはず）
        this._setNextState();
        const splittedPuyo: baseSinglePuyo = { posX: childX, posY: childY, color: this._current.currentPuyo.childColor };
        this._split.setSplittedPuyo(splittedPuyo);
        const unsplittedPuyo: baseSinglePuyo = { posX: parentX, posY: Math.round(parentY), color: this._current.currentPuyo.parentColor };
        this._split.setUnsplittedPuyo(unsplittedPuyo);
        this._current.currentPuyo = null;

        return false;
      } else if (_board.board[nextY][childX] !== gameConfig.NO_COLOR) {
        // 親側でちぎり（のはず）
        this._setNextState();
        const splittedPuyo: baseSinglePuyo = { posX: parentX, posY: parentY, color: this._current.currentPuyo.parentColor };
        this._split.setSplittedPuyo(splittedPuyo);
        const unsplittedPuyo: baseSinglePuyo = { posX: childX, posY: Math.round(childY), color: this._current.currentPuyo.childColor };
        this._split.setUnsplittedPuyo(unsplittedPuyo);
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
  canPuyoMoveLeft(_board: Board, maniPuyo: baseManiPuyo) {
    const parentX = maniPuyo.parentX;
    const parentY = maniPuyo.parentY;
    const [childX, childY] = this._current.getChildPos(maniPuyo);
    const angle = maniPuyo.angle;

    if (angle === 90 || angle === 270) {
      const leftX = angle === 90 ? childX : parentX;
      const nextX = leftX - 1;
      // if (nextX < gameConfig.BOARD_LEFT_EDGE || _board.board[Math.floor(parentY)][nextX] !== gameConfig.NO_COLOR || _board.board[Math.round(parentY)][nextX] !== gameConfig.NO_COLOR) {
      if (nextX < gameConfig.BOARD_LEFT_EDGE ||
        _board.board[Math.floor(parentY)][nextX] !== gameConfig.NO_COLOR ||
        _board.board[Math.floor(parentY) + 1][nextX] !== gameConfig.NO_COLOR
      ) {
        return false;
      }
      return true;
    } else if (angle === 0 || angle === 180) {
      const nextX = Math.round(parentX) - 1;
      // **one condition below is unnecessary
      if (nextX < gameConfig.BOARD_LEFT_EDGE ||
        _board.board[Math.floor(parentY)][nextX] !== gameConfig.NO_COLOR ||
        _board.board[Math.floor(parentY) + 1][nextX] !== gameConfig.NO_COLOR ||
        _board.board[Math.floor(childY)][nextX] !== gameConfig.NO_COLOR ||
        // TODO: if childY is integer this is bad
        _board.board[Math.floor(childY) + 1][nextX] !== gameConfig.NO_COLOR
      ) {
        return false;
      }
      return true;
    }
  }

  // Check if the current piece can move right
  canPuyoMoveRight(_board: Board, maniPuyo: baseManiPuyo) {
    const parentX = maniPuyo.parentX;
    const parentY = maniPuyo.parentY;
    const [childX, childY] = this._current.getChildPos(maniPuyo);
    const angle = maniPuyo.angle;

    if (angle === 90 || angle === 270) {
      const rightX = angle === 270 ? childX : parentX;
      const nextX = rightX + 1;
      // if (nextX >= gameConfig.BOARD_WIDTH || _board.board[Math.floor(parentY)][nextX] !== gameConfig.NO_COLOR || _board.board[Math.round(parentY)][nextX] !== gameConfig.NO_COLOR) {
      if (nextX >= gameConfig.BOARD_RIGHT_EDGE ||
        _board.board[Math.floor(parentY)][nextX] !== gameConfig.NO_COLOR ||
        _board.board[Math.floor(parentY) + 1][nextX] !== gameConfig.NO_COLOR
      ) {
        return false;
      }
      return true;
    } else if (angle === 0 || angle === 180) {
      const nextX = Math.round(parentX) + 1;
      // **one condition below is unnecessary
      if (nextX >= gameConfig.BOARD_RIGHT_EDGE ||
        _board.board[Math.floor(parentY)][nextX] !== gameConfig.NO_COLOR ||
        // _board.board[Math.round(parentY)][nextX] !== gameConfig.NO_COLOR ||
        _board.board[Math.floor(parentY) + 1][nextX] !== gameConfig.NO_COLOR ||
        _board.board[Math.floor(childY)][nextX] !== gameConfig.NO_COLOR ||
        _board.board[Math.floor(childY) + 1][nextX] !== gameConfig.NO_COLOR
      ) {
        return false;
      }
      return true;
    }
  }

  // TODO: really? -> this should be separated, so that this returns true or false of canfall
  letSinglePuyoFall(
    _board: Board,
    singlePuyo: baseSinglePuyo,
    recordPuyoFlag: number,
    speedRate: number,
    afterLocking: () => void,
  ) {
    const nextY = this.movePuyoDown(singlePuyo.posY, speedRate);
    if (nextY >= gameConfig.BOARD_BOTTOM_EDGE - 1 ||
      _board.board[Math.floor(nextY) + 1][singlePuyo.posX] !== gameConfig.NO_COLOR
    ) {
      // be careful
      // singlePuyo.posY = Math.round(nextY);
      singlePuyo.posY = Math.floor(nextY);

      _board.lockPuyo(_board.board,
        singlePuyo.posX, singlePuyo.posY, singlePuyo.color,
        recordPuyoFlag);

      afterLocking();
    } else {
      singlePuyo.posY = nextY;
    }
  }

  get movingHorDrawing() { return this._movingHorDrawing; }

  setCallback(
    setNextState: () => void,
  ) {
    this._setNextState = setNextState;
  }

}
