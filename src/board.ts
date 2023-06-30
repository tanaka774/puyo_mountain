import { gameConfig } from "./config.ts"
import { recordPuyoSteps } from "./record.ts"
import { gameState } from "./state.ts"
import { baseManiPuyo } from "./puyo.ts"
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
    const WALL_NUMBER = 99;
    const board = Array.from(
      { length: (gameConfig.BOARD_BOTTOM_EDGE - gameConfig.BOARD_TOP_EDGE) + 5 },
      () => Array((gameConfig.BOARD_RIGHT_EDGE - gameConfig.BOARD_LEFT_EDGE) + 2).fill(gameConfig.NO_COLOR));
    for (let y = 0; y <= gameConfig.BOARD_BOTTOM_EDGE; y++) {
      board[y][gameConfig.BOARD_LEFT_EDGE - 1] = WALL_NUMBER;
      board[y][gameConfig.BOARD_RIGHT_EDGE] = WALL_NUMBER;
    }
    for (let x = gameConfig.BOARD_LEFT_EDGE - 1; x <= gameConfig.BOARD_RIGHT_EDGE; x++) {
      board[gameConfig.BOARD_BOTTOM_EDGE][x] = WALL_NUMBER;
    }
    // returning reference is okay?
    // return board;
    this._board = board;
  }

  lockPuyo(board, posX, posY, color, recordFlag) {
    // TODO: remember x, y value here and use for chain process or something
    board[posY][posX] = color;

    recordPuyoSteps.record(posX, posY, color, recordFlag);

    if (color !== gameConfig.NO_COLOR) {
      this._bounce.start(posX, posY);
    } else {
      // TODO: this dealing is temporary, you should revise these flow
      this._bounce.delete(posX, posY);
    }
  }

  get board() { return this._board; }

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
}

