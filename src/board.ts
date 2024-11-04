import { gameConfig } from "./config"
import { recordPuyoSteps } from "./record"
import { GameState } from "./state"
import { baseManiPuyo } from "./types"
import { Bounce } from "./bounce";

export class Board {
  private _board: number[][];
  // private _chain: Chain;
  private _lockWaitCount: number;

  constructor(
    private _bounce: Bounce,
  ) {
    // board = this.createBoard();
    this._board = null;
    this._lockWaitCount = 0;
  }

  createBoard() {
    // const WALL_NUMBER = 99;
    const board = Array.from(
      { length: (gameConfig.BOARD_BOTTOM_EDGE - gameConfig.BOARD_TOP_EDGE) + gameConfig.BOARD_HEIGHT_MARGIN },
      () => Array((gameConfig.BOARD_RIGHT_EDGE - gameConfig.BOARD_LEFT_EDGE) + gameConfig.BOARD_WIDTH_MARGIN).fill(gameConfig.NO_COLOR));
    for (let y = 0; y <= gameConfig.BOARD_BOTTOM_EDGE; y++) {
      board[y][gameConfig.BOARD_LEFT_EDGE - 1] = gameConfig.WALL_NUMBER;
      board[y][gameConfig.BOARD_RIGHT_EDGE] = gameConfig.WALL_NUMBER;
    }
    for (let x = gameConfig.BOARD_LEFT_EDGE - 1; x <= gameConfig.BOARD_RIGHT_EDGE; x++) {
      board[gameConfig.BOARD_BOTTOM_EDGE][x] = gameConfig.WALL_NUMBER;
    }
    // returning reference is okay?
    // return board;
    return board;
  }

  initBoard() {
    this._board = this.createBoard();
  }

  isBoardPlain() {
    for (let y = gameConfig.BOARD_BOTTOM_EDGE - 1; y >= gameConfig.BOARD_TOP_EDGE - 1; y--) {
      for (let x = gameConfig.BOARD_LEFT_EDGE; x < gameConfig.BOARD_RIGHT_EDGE; x++) {
        if (this.board[y][x] !== gameConfig.NO_COLOR) return false;
      }
    }
    return true;
  }

  lockPuyo(board, posX, posY, color, recordFlag) {
    // TODO make sure x, y comes as integer
    // TODO: remember x, y value here and use for chain process or something
    board[posY][posX] = color;
    // const bottomYs = this.getBottomPosYs()
    // if (bottomYs[posX - 1] < posY) board[posY - 1][posX] = color;
    // else board[posY][posX] = color;

    recordPuyoSteps.record(posX, posY, color, recordFlag);

    if (color !== gameConfig.NO_COLOR) {
      this._bounce.start(posX, posY);
    } else {
      // TODO: this dealing is temporary, you should revise these flow
      // TODO: ^ what is this temporary for????
      // bouncepuyos deleted by erasepuyos and enter chain state on the way of bouncing
      // this._bounce.delete(posX, posY);
    }
  }

  get board() { return this._board; }
  set board(board: number[][]) { this._board = board; }

  get lockWaitCount() { return this._lockWaitCount; }
  initLockWaitCount() { this._lockWaitCount = 0; }
  incrementLockWaitCount() { this._lockWaitCount++; }
  endLockWait() { this._lockWaitCount = gameConfig.LOCK_WAIT_TIME; }
  checkLockWaitCount(threshold: number) {
    if (this._lockWaitCount < threshold) {
      this.incrementLockWaitCount();
      return true;
    }
    return false;
  }

  /**
  * return Y positions of bottom without Puyos from left to right
  */
  getBottomPosYs(): number[] {
    const res: number[] = Array(gameConfig.BOARD_RIGHT_EDGE - gameConfig.BOARD_LEFT_EDGE).fill(0)
    for (let x = gameConfig.BOARD_LEFT_EDGE; x < gameConfig.BOARD_RIGHT_EDGE; x++) {
      for (let y = gameConfig.BOARD_BOTTOM_EDGE - 1; y >= gameConfig.BOARD_TOP_EDGE - 1; y--) {
        if (this.board[y][x] === gameConfig.NO_COLOR) {
          res[x - 1] = y
          break;
        }
      }
    }
    return res
  }
}

