import { gameConfig } from "./config"

export const recordPuyoSteps = {
  recordedPuyos: [], // [[x,y,color]]
  MANIPULATE_PUYO_REC_FLAG: 0, // freefall and splitting
  VANISH_PUYO_REC_FLAG: -1, // vanish with chain
  FLOAT_PUYO_REC_FLAG: -2, // about to fall after chain
  DID_FLOAT_PUYO_REC_FLAG: -3, // after falling
  SEED_PUYO_REC_FLAG: -4,
  record: function(x, y, color, recordFlag) {
    this.recordedPuyos.push([x, y, color, recordFlag]);
  },
}


