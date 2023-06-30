// TODO: temp, be careful about this
const canvas = document.getElementById('tetrisCanvas') as HTMLCanvasElement;

// Constants
const CELL_SIZE = 20;
// what is used as index are
// x:BOARD_LEFT_EDGE ~ BOARD_RIGHT_EDGE - 1
// y:BOARD_TOP_EDGE ~ BOARD_BOTTOM_EDGE - 1
const BOARD_LEFT_EDGE = 1;
const BOARD_RIGHT_EDGE = BOARD_LEFT_EDGE + canvas.width / CELL_SIZE;// - 1;
const BOARD_TOP_EDGE = 4;
const BOARD_BOTTOM_EDGE = BOARD_TOP_EDGE + canvas.height / CELL_SIZE;// - 1;
const NO_COLOR = 0;
const PUYO_BIRTH_POSX = Math.floor((BOARD_LEFT_EDGE + BOARD_RIGHT_EDGE) / 2) - 1;
const PUYO_BIRTH_POSY = BOARD_TOP_EDGE - 1;
const PUYO_COLORS = [
  null,
  'rgba(255, 13, 114, 1)', // '#FF0D72' ->
  'rgba(13, 194, 255, 1)', // '#0DC2FF' ->
  'rgba(13, 255, 114, 1)', // '#0DFF72' ->
  'rgba(245, 56, 255, 1)', // '#F538FF' ->
  'rgba(255, 142, 13, 1)', // '#FF8E0D' ->
  'rgba(255, 225, 56, 1)', // '#FFE138' ->
  'rgba(56, 119, 255, 1)', // '#3877FF' ->
];
const moveYDiff = 0.015;
const VANISH_WAIT_TIME = 30;
const LOCK_WAIT_TIME = 120;
const HOR_MOVING_TIME = 3;
const ROTATING_TIME = 3;

export const gameConfig = Object.freeze({
  CELL_SIZE,
  BOARD_LEFT_EDGE,
  BOARD_RIGHT_EDGE,
  BOARD_TOP_EDGE,
  BOARD_BOTTOM_EDGE,
  NO_COLOR,
  PUYO_BIRTH_POSX,
  PUYO_BIRTH_POSY,
  PUYO_COLORS,
  moveYDiff,
  VANISH_WAIT_TIME,
  LOCK_WAIT_TIME,
  HOR_MOVING_TIME,
  ROTATING_TIME,
})


