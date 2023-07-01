import { gameConfig } from "./config.ts"

export const recordPuyoSteps = {
  recordedPuyos: [], // [[x,y,color]]
  vanishedPuyos: [], // stash vanishpuyos here when chain happens
  vanishCount: 0,
  MANIPULATE_PUYO_REC_FLAG: 0, // freefall and splitting
  VANISH_PUYO_REC_FLAG: -1, // vanish with chain
  FLOAT_PUYO_REC_FLAG: -2, // about to fall after chain
  DID_FLOAT_PUYO_REC_FLAG: -3, // after falling
  SEED_PUYO_REC_FLAG: -4,
  record: function(x, y, color, recordFlag) {
    this.recordedPuyos.push([x, y, color, recordFlag]);
  },
  undoPoint: 0,
  undo: function(board) {
    const recPuyo = this.recordedPuyos;
    // TODO: this should be done once after gameover or pause
    this.undoPoint = recPuyo.length - 1;
    while (recPuyo[this.undoPoint][3] !== this.MANIPULATE_PUYO_REC_FLAG) {
      this.undoPoint--;
    }
    if (recPuyo[this.undoPoint][3] === this.MANIPULATE_PUYO_REC_FLAG) {
      this.undoPoint -= (this.undoPoint > 1) ? 2 : 0;
    }

    // init board first
    for (let y = gameConfig.BOARD_TOP_EDGE; y < gameConfig.BOARD_BOTTOM_EDGE; y++) {
      for (let x = gameConfig.BOARD_LEFT_EDGE; x < gameConfig.BOARD_RIGHT_EDGE; x++) {
        board[y][x] = gameConfig.NO_COLOR;
      }
    }
    for (let n = this.undoPoint; n >= 0; n--) {
      board[recPuyo[n][1]][recPuyo[n][0]] = recPuyo[n][2];
    }
  },
  init: function() {
    // this.recordedPuyos = [];
    // this.vanishedPuyos = [];
    // this.vanishCount = 0;
  },
}


