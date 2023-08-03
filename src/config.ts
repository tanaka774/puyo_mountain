import { LSHandle } from "./localStorageHandle";

const CELL_SIZE = 37;
const DRAW_TOOL: string = 'canvas'; // 'svg'
const MAIN_DRAW_WIDTH = CELL_SIZE * 6;
const MAIN_DRAW_HEIGHT = CELL_SIZE * 14;
const NEXT_DRAW_WIDTH = CELL_SIZE * 5;
const NEXT_DRAW_HEIGHT = CELL_SIZE * 7;
const VPUYO_DRAW_WIDTH = CELL_SIZE * 6;
const VPUYO_DRAW_HEIGHT = CELL_SIZE * 4;

if (DRAW_TOOL === 'canvas') {
  // TODO: temp, be careful about this
  const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
  canvas.width = MAIN_DRAW_WIDTH;
  canvas.height = MAIN_DRAW_HEIGHT;
  const nextPuyoCanvas = document.getElementById('nextPuyoCanvas') as HTMLCanvasElement;
  nextPuyoCanvas.width = NEXT_DRAW_WIDTH;
  nextPuyoCanvas.height = NEXT_DRAW_HEIGHT;
  const VPuyoCanvas = document.getElementById('VPuyoCanvas') as HTMLCanvasElement;
  VPuyoCanvas.width = VPUYO_DRAW_WIDTH;
  VPuyoCanvas.height = VPUYO_DRAW_HEIGHT;
}

// what is used as index are
// x:BOARD_LEFT_EDGE ~ BOARD_RIGHT_EDGE - 1
// y:BOARD_TOP_EDGE ~ BOARD_BOTTOM_EDGE - 1
const BOARD_HEIGHT_MARGIN = 6;
const BOARD_WIDTH_MARGIN = 2;
const BOARD_LEFT_EDGE = 1;
const BOARD_RIGHT_EDGE = BOARD_LEFT_EDGE + MAIN_DRAW_WIDTH / CELL_SIZE;// - 1;
const BOARD_GHOST_ZONE = 2; // transparent zone above top
const BOARD_TOP_EDGE = BOARD_HEIGHT_MARGIN - 1;
const BOARD_BOTTOM_EDGE = BOARD_TOP_EDGE + MAIN_DRAW_HEIGHT / CELL_SIZE - BOARD_GHOST_ZONE;// - 1;
const NO_COLOR = 0;
const WALL_NUMBER = 99;
const PUYO_BIRTH_POSX = Math.floor((BOARD_LEFT_EDGE + BOARD_RIGHT_EDGE) / 2) - 1;
const PUYO_BIRTH_POSY = BOARD_TOP_EDGE - 1;
const PUYO_COLOR_NUM = 4;
const moveYDiff = 0.015;
const KEY_MOVE_DOWN_RATE = 15;
const VANISH_WAIT_TIME = 23;
const LOCK_WAIT_TIME = 180;
const HOR_MOVING_TIME = 3;
const ROTATING_TIME = 3;
const PUSHEDUP_TIME = 6;
const NEXT_MOVING_TIME = 20;
const BOUNCING_TIME = 15;
const BOUNCING_PUYO_NUM = 3;
const FREEFALL_SPEED_RATE = 0.5;
const SEED_FALLING_SPEED = 15.0;
const SPLIT_FALLING_SPEED = 12.0;
const FLOAT_FALLING_SPEED = 12.0;
const PUYO_POOL_LOOP = 8;
// if you change this value, store previous value and add select so that user can watch previous score records
const ENDURANCE_TOTAL1 = 300;
const ENDURANCE_MIN_ONCE1 = 7;
const ENDURANCE_MAX_ONCE1 = 13;
const ENDURANCE_TOTAL2 = 8;
const ENDURANCE_MIN_ONCE2 = 4;
const ENDURANCE_MAX_ONCE2 = 8;
const BOTTOM_SCORE_RANK = 30;

export const gameConfig = Object.freeze({
  CELL_SIZE,
  DRAW_TOOL,
  MAIN_DRAW_WIDTH,
  MAIN_DRAW_HEIGHT,
  BOARD_LEFT_EDGE,
  BOARD_RIGHT_EDGE,
  BOARD_GHOST_ZONE,
  BOARD_TOP_EDGE,
  BOARD_BOTTOM_EDGE,
  BOARD_HEIGHT_MARGIN,
  BOARD_WIDTH_MARGIN,
  NO_COLOR,
  WALL_NUMBER,
  PUYO_BIRTH_POSX,
  PUYO_BIRTH_POSY,
  // PUYO_COLORS,
  PUYO_COLOR_NUM,
  moveYDiff,
  KEY_MOVE_DOWN_RATE,
  VANISH_WAIT_TIME,
  LOCK_WAIT_TIME,
  HOR_MOVING_TIME,
  ROTATING_TIME,
  PUSHEDUP_TIME,
  NEXT_MOVING_TIME,
  BOUNCING_TIME,
  BOUNCING_PUYO_NUM,
  FREEFALL_SPEED_RATE,
  SEED_FALLING_SPEED,
  SPLIT_FALLING_SPEED,
  FLOAT_FALLING_SPEED,
  PUYO_POOL_LOOP,
  ENDURANCE_TOTAL1,
  ENDURANCE_TOTAL2,
  ENDURANCE_MIN_ONCE1,
  ENDURANCE_MAX_ONCE1,
  ENDURANCE_MIN_ONCE2,
  ENDURANCE_MAX_ONCE2,
  BOTTOM_SCORE_RANK,
})


// TODO: separate into class or object
export let PUYO_COLORS;
const lSHandle = new LSHandle();
const defaultColors = lSHandle.getDefaultColors();
if (defaultColors) {
  PUYO_COLORS = [null, ...defaultColors];
} else {
  // non-user-setting
  PUYO_COLORS = [
    null,
    "rgba(255, 0, 0, 1)", 
    "rgba(0, 0, 255, 1)", 
    "rgba(0, 200, 0, 1)", 
    "rgba(255, 255, 0, 1)"
  ]
}
