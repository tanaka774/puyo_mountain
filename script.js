"use strict";

import throttle from "./util/throttle.js";
import keyPressedTwice from "./util/keyPressedTwice.js";
import { drawEllipse, drawEyes, addAlpha, drawGlueToDown, drawGlueToRight } from "./draw.js";
//
// Constants
const canvas = document.getElementById('tetrisCanvas');
const ctx = canvas.getContext('2d');
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
const TETRIMINO_COLORS = [
  null,
  'rgba(255, 13, 114, 1)', // '#FF0D72' -> 
  'rgba(13, 194, 255, 1)', // '#0DC2FF' -> 
  'rgba(13, 255, 114, 1)', // '#0DFF72' -> 
  'rgba(245, 56, 255, 1)', // '#F538FF' -> 
  'rgba(255, 142, 13, 1)', // '#FF8E0D' -> 
  'rgba(255, 225, 56, 1)', // '#FFE138' -> 
  'rgba(56, 119, 255, 1)', // '#3877FF' -> 
];

const basePuyo = {
  parentX: PUYO_BIRTH_POSX,
  parentY: PUYO_BIRTH_POSY,
  parentColor: 1,
  childColor: 2,
  angle: 0,
};

const getChildPos = (puyo) => {
  // TODO: modify returning drawingX during rotating
  // const parentX = (gameState.isMovingHor) ? movingHorState.drawingX : puyo.parentX;
  const parentX = puyo.parentX;
  const diffs = [[0, 1], [-1, 0], [0, -1], [1, 0]];
  const childX = diffs[(puyo.angle / 90) % 4][0] + parentX;
  const childY = diffs[(puyo.angle / 90) % 4][1] + puyo.parentY;
  return [childX, childY];
};


// Game state
let board = [];
let currentPuyo = null;
let nextPuyo = null;
let doubleNextPuyo = null;
const nextPuyoCanvas = document.getElementById('nextPuyoCanvas');
const nextPuyoCtx = nextPuyoCanvas.getContext('2d');
let gameOver = false;
const moveYDiff = 0.015;
const VANISH_WAIT_TIME = 30;
const LOCK_WAIT_TIME = 120;
const HOR_MOVING_TIME = 3;
const ROTATING_TIME = 2;

const floatingPuyo = {
  posX: -1,
  posY: -1,
  color: -1,
};

// store board status temporarily when vanishing 
let temp_board = createBoard();

const chainInfo = {
  floatingPuyos: [],
  vanishPuyos: [],
  chainVanishWaitCount: 0,
  chainCount: 0,
  virtualChainCount: 0,
  maxVirtualChainCount: 0,
}

let splittedPuyo = {
  splittedX: -1,
  splittedY: -1,
  splittedColor: 1,
  unsplittedX: -1,
  unsplittedY: -1,
  unsplittedColor: 2,
};


const gameState = {
  isPaused: false,
  isBeingSplitted: false,
  chainProcessing: false,
  // chainVanishWaitCount: 0,
  lockWaitCount: 0,
  isLocked: false,
  isInitialized: false,
  isMovingHor: false,
  isRotating: false,
};

const keyInputState = {
  isRightKeyPressed: false,
  isLeftKeyPressed: false,
  isDownKeyPressed: false,
  // willRotateCW: false, // clockwise, +90
  // willRotateACW: false, // anti-clockwise, -90
}

const movingHorDrawing = {
  targetX: 0,
  moveXDiff: 0,
  drawingX: 0,
  drawCount: 0,
}
const rotateDrawing = {
  changeAngle: 0,
  diffAngle: 0,
  prevAngle: 0,
  drawCount: 0,
}

const quickTurn = {
  isPossible: false,
  willExecute: false,
  turnCW: () => { rotatePuyo(90); rotatePuyo(90); },
  turnACW: () => { rotatePuyo(-90); rotatePuyo(-90); },
}

const connectDrawing = {
  connectedPuyos: new Set(),
  addConnectedPuyos: function(x, y, color, dx, dy) {
    this.connectedPuyos.add(`${x - BOARD_LEFT_EDGE},${y - BOARD_TOP_EDGE},${color}:${dx},${dy}`);
  },
  deleteConnectedPuyo: function(x, y) {
    const modX = x - BOARD_LEFT_EDGE;
    const modY = y - BOARD_TOP_EDGE;
    this.connectedPuyos.forEach((elem) => {
      if (elem.indexOf(`${modX},${modY}`) === 0) {
        this.connectedPuyos.delete(elem);
      }
      const [diffX, diffY] = elem.split(':')[1].split(',').map(str => Number.parseInt(str, 10));
      if (elem.indexOf(`${modX - diffX},${modY - diffY}`) === 0) {
        this.connectedPuyos.delete(elem);
      }
    })
  },
  initConnectedPuyos: function() {
    this.connectedPuyos.clear();
  },
}

const recordPuyoSteps = {
  recordedPuyos: [], // [[x,y,color]]
  vanishedPuyos: [], // stash vanishpuyos here when chain happens
  vanishCount: 0,
  MANIPULATE_PUYO_REC_FLAG: 0, // freefall and splitting
  VANISH_PUYO_REC_FLAG: -1, // vanish with chain
  FLOAT_PUYO_REC_FLAG: -2, // about to fall after chain
  DID_FLOAT_PUYO_REC_FLAG: -3, // after falling
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
    for (let y = BOARD_TOP_EDGE; y < BOARD_BOTTOM_EDGE; y++) {
      for (let x = BOARD_LEFT_EDGE; x < BOARD_RIGHT_EDGE; x++) {
        board[y][x] = NO_COLOR;
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

const bounceEffect = {
  willBounce: false,
  BOUNCING_TIME: 10,
  bouncePuyoNum: 3,
  bouncePuyos: new Set(), // ["x1,y1", "x2,y2", ...]
  bounceQuantities: 0, // increase by 180 / BOUNCING_TIME
  start: function(x, y) {
    this.willBounce = true;
    for (let n = 0; (n <= this.bouncePuyoNum) && (y + n < BOARD_BOTTOM_EDGE); n++) {
      this.bouncePuyos.add(`${x},${y + n}`);
    }
  },
  end: function() {
    this.willBounce = false;
    this.bounceQuantities = 0;
    this.bouncePuyos.clear();
    // TODO: this is shit (dealing with connecting glue not returning)
    findConnectedPuyos(board, (_) => { /*do nothing*/ });
  },
  delete: function(x, y) {
    [...bounceEffect.bouncePuyos].forEach((elem) => {
      const posX = parseInt(elem.split(',')[0], 10);
      const posY = parseInt(elem.split(',')[1], 10);
      if (x === posX && y === posY) {
        bounceEffect.bouncePuyos.delete(elem);
        this.willBounce = false;
      }
    })
  }
}

// TODO: do smarter
function throttleInitializer() {
  let downThrottleHandler;
  let horThrottleHandler;
  // let rotateThrottleHandler;
  let initialized = false;
  return function() {
    if (!initialized) {
      downThrottleHandler = throttle(downKeyHandle, 10); // not affecting with value less than this(10)
      horThrottleHandler = throttle(horKeyhandle, 90);
      // TODO: perhaps rotate doesn't need to do this(simple addevent is enough?)
      // rotateThrottleHandler = throttle(rotateKeyHandle, 100);
      initialized = true;
    }
    downThrottleHandler();
    horThrottleHandler();
    // rotateThrottleHandler();
  }
}

const throttleHandler = throttleInitializer();

// Initialize the game
function init() {
  board = createBoard();
  beforeNext();
  draw();
  gameState.isInitialized = true;
  update();
}

// Create an empty game board
function createBoard() {
  const WALL_NUMBER = 99;
  const board = Array.from(
    { length: (BOARD_BOTTOM_EDGE - BOARD_TOP_EDGE) + 5 },
    () => Array((BOARD_RIGHT_EDGE - BOARD_LEFT_EDGE) + 2).fill(NO_COLOR));
  for (let y = 0; y <= BOARD_BOTTOM_EDGE; y++) {
    board[y][BOARD_LEFT_EDGE - 1] = WALL_NUMBER;
    board[y][BOARD_RIGHT_EDGE] = WALL_NUMBER;
  }
  for (let x = BOARD_LEFT_EDGE - 1; x <= BOARD_RIGHT_EDGE; x++) {
    board[BOARD_BOTTOM_EDGE][x] = WALL_NUMBER;
  }
  // returning reference is okay?
  return board;
}

// Get a random Tetrimino piece
function getRandomPuyo() {
  const newPuyo = { ...basePuyo };
  newPuyo.parentColor = Math.floor(Math.random() * 4) + 1;
  newPuyo.childColor = Math.floor(Math.random() * 4) + 1;
  newPuyo.parentX = PUYO_BIRTH_POSX;
  newPuyo.parentY = PUYO_BIRTH_POSY;
  return newPuyo;
}

function beforeNext() {
  currentPuyo = (gameState.isInitialized) ? nextPuyo : getRandomPuyo();
  nextPuyo = (nextPuyo !== null) ? doubleNextPuyo : getRandomPuyo();
  doubleNextPuyo = getRandomPuyo();
  gameState.lockWaitCount = 0;
  quickTurn.isPossible = false;
  chainInfo.chainCount = 0;
  // TODO: this is for debug
  keyInputInit();
  // erase puyos more than above BOARD_TOP_EDGE-2
  // TODO: this implementaion is not officially right
  for (let y = 0; y < BOARD_TOP_EDGE - 1; y++) {
    for (let x = BOARD_LEFT_EDGE; x < BOARD_RIGHT_EDGE; x++) {
      board[y][x] = NO_COLOR;
    }
  }

  // temp
  detectPossibleChain();
}

// Draw the game board and current piece
function draw() {
  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Draw the board
  for (let y = BOARD_TOP_EDGE; y < BOARD_BOTTOM_EDGE; y++) {
    for (let x = BOARD_LEFT_EDGE; x < BOARD_RIGHT_EDGE; x++) {
      const cell = board[y][x];
      if (cell !== NO_COLOR) {
        drawPuyo(x, y, TETRIMINO_COLORS[cell])
      }
    }
  }

  // draw puyo's connecting
  drawConnecting();

  // draw floating puyos
  if (gameState.chainProcessing) {
    if (chainInfo.chainVanishWaitCount >= VANISH_WAIT_TIME) {
      for (const floatingPuyo of chainInfo.floatingPuyos) {
        drawPuyo(floatingPuyo.posX, floatingPuyo.posY, TETRIMINO_COLORS[floatingPuyo.color]);
      }
    }
    return; // <- is this necessary?
  }

  // draw splittedPuyo
  if (gameState.isBeingSplitted && splittedPuyo) {
    drawPuyo(splittedPuyo.splittedX, splittedPuyo.splittedY, TETRIMINO_COLORS[splittedPuyo.splittedColor]);

    drawPuyo(splittedPuyo.unsplittedX, splittedPuyo.unsplittedY, TETRIMINO_COLORS[splittedPuyo.unsplittedColor]);
  }

  // draw currentPuyo
  if (currentPuyo) { // <- is this condition necessary?
    drawPuyo(currentPuyo.parentX, currentPuyo.parentY, TETRIMINO_COLORS[currentPuyo.parentColor]);

    const [childX, childY] = getChildPos(currentPuyo);
    drawPuyo(childX, childY, TETRIMINO_COLORS[currentPuyo.childColor]);
  }

  // draw nextPuyo and doubleNextPuyo on right-side to board
  if (nextPuyo && doubleNextPuyo) { // <- is this condition necessary?
    nextPuyoCtx.fillStyle = TETRIMINO_COLORS[nextPuyo.parentColor];
    // nextPuyoCtx.fillRect((BOARD_WIDTH) * CELL_SIZE, 1 * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    nextPuyoCtx.fillRect(0.3 * CELL_SIZE, 1 * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    nextPuyoCtx.fillStyle = TETRIMINO_COLORS[nextPuyo.childColor];
    nextPuyoCtx.fillRect(0.3 * CELL_SIZE, 2 * CELL_SIZE, CELL_SIZE, CELL_SIZE);

    nextPuyoCtx.fillStyle = TETRIMINO_COLORS[doubleNextPuyo.parentColor];
    nextPuyoCtx.fillRect(0.3 * CELL_SIZE, 4 * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    nextPuyoCtx.fillStyle = TETRIMINO_COLORS[doubleNextPuyo.childColor];
    nextPuyoCtx.fillRect(0.3 * CELL_SIZE, 5 * CELL_SIZE, CELL_SIZE, CELL_SIZE);
  }

  drawAfterimage();

  function drawPuyo(x, y, color, willStorke = true) {
    const drawPosX = (x - BOARD_LEFT_EDGE) * CELL_SIZE;
    const drawPosY = (y - BOARD_TOP_EDGE) * CELL_SIZE;

    const radiusX = CELL_SIZE * 15 / 32;
    const radiusY = CELL_SIZE * 14 / 32;
    const elliX = drawPosX + radiusX + CELL_SIZE / 16;
    const elliY = drawPosY + radiusY + CELL_SIZE / 10;
    // drawEllipse(ctx, elliX, elliY, radiusX, radiusY, color, willStorke);
    // drawEyes(ctx, elliX, elliY);

    if (bounceEffect.willBounce &&
      [...bounceEffect.bouncePuyos].some((elem) => {
        const posX = parseInt(elem.split(',')[0], 10);
        const posY = parseInt(elem.split(',')[1], 10);
        return posX === x && posY === y
      })
    ) {
      drawBounce(radiusY, () => { drawEllipse(ctx, elliX, elliY, radiusX, radiusY, color, willStorke); });
    } else {
      drawEllipse(ctx, elliX, elliY, radiusX, radiusY, color, willStorke);
    }

    function drawBounce(radiusY, drawCallback) {
      // remove connecting first, is using x, y here okay?
      connectDrawing.deleteConnectedPuyo(x, y);

      // // this is an old way.
      // const bounceLimit = 4;
      // const changeRate = Math.sin(bounceEffect.bounceQuantities * Math.PI / 180) / bounceLimit;
      // const bounceRate = 1 - changeRate;
      // const yModifier = (BOARD_BOTTOM_EDGE - y) / 10 + 1;
      // ctx.transform(1, 0, 0, bounceRate, 0, (28) * changeRate * radiusY / yModifier);
      // drawCallback();
      // ctx.setTransform(1, 0, 0, 1, 0, 0);

      const changeRate = Math.sin(bounceEffect.bounceQuantities * Math.PI / 180) / 5;
      ctx.save();
      // TODO: appropriate parameter not behaving differently according to Y
      ctx.translate(0, elliY + (radiusY / 2) * changeRate);
      ctx.scale(1, 1 - changeRate);
      ctx.translate(0, -elliY + radiusY * changeRate);
      drawCallback();
      ctx.restore();

      bounceEffect.bounceQuantities = (bounceEffect.bounceQuantities > 180)
        ? 180
        : bounceEffect.bounceQuantities + 180 / bounceEffect.BOUNCING_TIME;

      if (bounceEffect.bounceQuantities >= 180) {
        bounceEffect.end();
      }
    }
  }

  function drawConnecting() {
    connectDrawing.connectedPuyos.forEach(elem => {
      const [x, y, color] = elem.split(':')[0].split(',').map(str => Number.parseInt(str, 10));
      const [diffX, diffY] = elem.split(':')[1].split(',').map(str => Number.parseInt(str, 10));;

      // TODO: do not declare these variables here
      const radiusX = CELL_SIZE * 4 / 9;
      const radiusY = CELL_SIZE * 3 / 7;

      if (diffX === 0 && diffY === 1) {
        drawGlueToDown(ctx, CELL_SIZE, x, y, x, y + diffY, radiusX, radiusY, TETRIMINO_COLORS[color]);
      } else if (diffX === 1 && diffY === 0) {
        drawGlueToRight(ctx, CELL_SIZE, x, y, x + diffX, y, radiusX, radiusY, TETRIMINO_COLORS[color]);
      } else if (diffX === 0 && diffY === -1) {
        // need to verify
        drawGlueToDown(ctx, CELL_SIZE, x, y + diffY, x, y, radiusX, radiusY, TETRIMINO_COLORS[color]);
      } else if (diffX === -1 && diffY === 0) {
        // need to verify
        drawGlueToRight(ctx, CELL_SIZE, x + diffX, y, x, y, radiusX, radiusY, TETRIMINO_COLORS[color]);
      }
    })
  }

  function drawAfterimage() {
    if (gameState.isRotating) {
      const devideNum = 5;
      for (let n = 1; n < devideNum; n++) {
        const angle = rotateDrawing.changeAngle * n / devideNum + rotateDrawing.prevAngle;
        const rotatingX = currentPuyo.parentX + Math.cos((angle * (-1) + 270) * Math.PI / 180);
        const rotatingY = currentPuyo.parentY - Math.sin((angle * (-1) + 270) * Math.PI / 180);
        drawPuyo(rotatingX, rotatingY, addAlpha(TETRIMINO_COLORS[currentPuyo.childColor], 0.2), false);
      }

      rotateDrawing.drawCount--;
      if (rotateDrawing.drawCount <= 0) {
        gameState.isRotating = false;
        rotateDrawing.drawCount = ROTATING_TIME;
      }
    }
    // draw puyo moving horizontally
    if (gameState.isMovingHor) {
      // drawPuyo(movingHorState.drawingX, currentPuyo.parentY, currentPuyo.parentColor);

      // TODO: if you do this, it needs more frames
      const diffX = movingHorDrawing.targetX - movingHorDrawing.drawingX;
      const alpha = 0.2;
      // only draw circle with color not stroke or eye
      drawPuyo(currentPuyo.parentX - (diffX / 3), currentPuyo.parentY, addAlpha(TETRIMINO_COLORS[currentPuyo.parentColor], alpha), false);
      drawPuyo(currentPuyo.parentX - (diffX * 2 / 3), currentPuyo.parentY, addAlpha(TETRIMINO_COLORS[currentPuyo.parentColor], alpha), false);

      const [childX, childY] = getChildPos(currentPuyo);

      drawPuyo(childX - (diffX / 3), childY, addAlpha(TETRIMINO_COLORS[currentPuyo.childColor], alpha), false);
      drawPuyo(childX - (diffX * 2 / 3), childY, addAlpha(TETRIMINO_COLORS[currentPuyo.childColor], alpha), false);

      movingHorDrawing.drawCount--;
      if (movingHorDrawing.drawCount <= 0) {
        gameState.isMovingHor = false;
        movingHorDrawing.drawCount = HOR_MOVING_TIME;
      }
    }
  }
}

function justLetDraw() {
  return gameState.isMovingHor || gameState.isRotating || bounceEffect.willBounce;
}

function waitPuyoFix() {
  // waiting room for posX or angle to reach proper position so that error doesn't happen
  // if (gameState.isMovingHor) movePuyoHor();
}


// Update the game state
function update() {
  if (!gameOver && !gameState.isPaused) {
    if (justLetDraw()) { waitPuyoFix(); }
    else {
      inputHandle();
      if (!gameState.isBeingSplitted &&
        !gameState.chainProcessing &&
        canPuyoMoveDown()
      ) {
        currentPuyo.parentY = movePuyoDown(currentPuyo.parentY, 1.0);
      } else {
        if (gameState.isBeingSplitted) {
          handleSplitting();

          if (!gameState.isBeingSplitted) { handleChain(); }
        } else {
          if (!gameState.chainProcessing) { gameState.isLocked = lockCurrentPuyo(); }
          if (gameState.isLocked) { handleChain(); }
        }
        if (!gameState.chainProcessing && isGameOver()) {
          gameOver = true;
          // alert('Game Over');
        } else if (gameState.isLocked && !gameState.isBeingSplitted && !gameState.chainProcessing) {
          beforeNext();
        }
      }
    }
    // TODO? record previous pos and animate slide between old and new pos
    draw();
  }

  // htmlUpdate();

  requestAnimationFrame(update);
}

// Check if the current piece can move down
function canPuyoMoveDown(rate = 1.0) {
  // // TODO: if possible consider other logic
  // if (!currentPuyo) return false;

  const parentX = currentPuyo.parentX;
  const parentY = currentPuyo.parentY;
  const [childX, childY] = getChildPos(currentPuyo);
  const angle = currentPuyo.angle;

  // TODO: handle puyo falling on top properly
  // if (parentY + moveYDiff * rate < Math.floor(parentY) + 1) { return true; }
  if (parentY + moveYDiff * rate < Math.round(parentY)) { return true; }

  if (angle === 0 || angle === 180) {
    const downY = angle === 0 ? childY : parentY;
    // const nextY = Math.floor(downY) + 2;
    const nextY = Math.round(downY) + 1;
    if (nextY >= BOARD_BOTTOM_EDGE || board[nextY][parentX] !== NO_COLOR) {
      return false;
    }
    return true;
  } else if (angle === 90 || angle === 270) {
    // const nextY = Math.floor(parentY) + 2;
    const nextY = Math.round(parentY) + 1;

    // at first check lock-wait time on any condition
    if (nextY >= BOARD_BOTTOM_EDGE || board[nextY][parentX] !== NO_COLOR || board[nextY][childX] !== NO_COLOR) {
      // must increment lockWaitCount to max in lockpuyo() not here
      // TODO: smarter logic this is shit!!!
      if (gameState.lockWaitCount < LOCK_WAIT_TIME - 1) {
        gameState.lockWaitCount++;
        return false;
      }
    } else {
      // none of those below conditions catches
      return true;
    }

    if (nextY >= BOARD_BOTTOM_EDGE || (board[nextY][parentX] !== NO_COLOR && board[nextY][childX] !== NO_COLOR)) {
      // ちぎり無（のはず）
      return false;
    } else if (board[nextY][parentX] !== NO_COLOR) {
      // 子側でちぎり（のはず）
      gameState.isBeingSplitted = true;
      splittedPuyo.splittedX = childX;
      splittedPuyo.splittedY = childY;
      splittedPuyo.splittedColor = currentPuyo.childColor;
      splittedPuyo.unsplittedX = parentX;
      // splittedPuyo.unsplittedY = Math.floor(parentY) + 1;
      splittedPuyo.unsplittedY = Math.round(parentY);
      splittedPuyo.unsplittedColor = currentPuyo.parentColor;
      // TODO: you can lock unsplittedpuyo here
      lockPuyo(board, splittedPuyo.unsplittedX, splittedPuyo.unsplittedY, splittedPuyo.unsplittedColor, recordPuyoSteps.MANIPULATE_PUYO_REC_FLAG);
      currentPuyo = null;

      return false;
    } else if (board[nextY][childX] !== NO_COLOR) {
      // 親側でちぎり（のはず）
      gameState.isBeingSplitted = true;
      splittedPuyo.splittedX = parentX;
      splittedPuyo.splittedY = parentY;
      splittedPuyo.splittedColor = currentPuyo.parentColor;
      splittedPuyo.unsplittedX = childX;
      // splittedPuyo.unsplittedY = Math.floor(childY) + 1;
      splittedPuyo.unsplittedY = Math.round(childY);
      splittedPuyo.unsplittedColor = currentPuyo.childColor;
      lockPuyo(board, splittedPuyo.unsplittedX, splittedPuyo.unsplittedY, splittedPuyo.unsplittedColor, recordPuyoSteps.MANIPULATE_PUYO_REC_FLAG);
      currentPuyo = null;

      return false;
    } else if (nextY >= BOARD_BOTTOM_EDGE) {
      // ちぎり無（のはず）
      return false;
    }
    return true;
  }
}

// Lock the current puyo, this is the case splitting not happening
function lockCurrentPuyo() {
  if (gameState.lockWaitCount < LOCK_WAIT_TIME) {
    gameState.lockWaitCount++;
    return false;
  }
  // fix Y position into integer
  currentPuyo.parentY = Math.round(currentPuyo.parentY);
  // currentPuyo.parentY = 1 + Math.floor(currentPuyo.parentY);

  const [childX, childY] = getChildPos(currentPuyo);
  // board[currentPuyo.parentY][currentPuyo.parentX] = currentPuyo.parentColor;
  // board[childY][childX] = currentPuyo.childColor;
  lockPuyo(board, currentPuyo.parentX, currentPuyo.parentY, currentPuyo.parentColor, recordPuyoSteps.MANIPULATE_PUYO_REC_FLAG);
  lockPuyo(board, childX, childY, currentPuyo.childColor, recordPuyoSteps.MANIPULATE_PUYO_REC_FLAG);
  return true;
}

function lockPuyo(board, posX, posY, color, recordFlag) {
  // TODO: remember x, y value here and use for chain process or something
  board[posY][posX] = color;

  recordPuyoSteps.record(posX, posY, color, recordFlag);

  if (color !== NO_COLOR) {
    bounceEffect.start(posX, posY);
  } else {
    // TODO: this dealing is temporary, you should revise these flow
    bounceEffect.delete(posX, posY);
  }
}

function handleChain() {
  if (!gameState.chainProcessing) {
    findConnectedPuyos(board, (savePuyos) => {
      chainInfo.vanishPuyos.push(savePuyos);
    });
    if (chainInfo.vanishPuyos.length !== 0) chainInfo.chainCount++;
  }
  if (chainInfo.vanishPuyos.length === 0) { return; }
  if (!gameState.chainProcessing) {
    gameState.chainProcessing = true;
    erasePuyos(board);
    // TODO: is it possible to call this function not here and not using temp_board?
    findFloatingPuyos(board);
  }

  // some duration
  if (chainInfo.chainVanishWaitCount < VANISH_WAIT_TIME) {
    chainInfo.chainVanishWaitCount++;
    return;
  } else if (chainInfo.chainVanishWaitCount === VANISH_WAIT_TIME) {
    board = JSON.parse(JSON.stringify(temp_board));
    temp_board = [];
    chainInfo.chainVanishWaitCount++;
    return;
  }

  if (chainInfo.floatingPuyos.length > 0) {
    letFloatingPuyosFall(board);
  } else {
    gameState.chainProcessing = false;
    chainInfo.vanishPuyos = [];
    chainInfo.chainVanishWaitCount = 0;
    handleChain();
  }
}

function findConnectedPuyos(board, foundCallback, connectNum = 4, willChangeConnect = true) {
  let connectedPuyoNums = 0;
  const checkedCells = Array.from(
    { length: (BOARD_BOTTOM_EDGE - BOARD_TOP_EDGE) + 5 },
    () => Array((BOARD_RIGHT_EDGE - BOARD_LEFT_EDGE) + 2).fill(false));

  if (willChangeConnect) connectDrawing.initConnectedPuyos();

  // TODO: don't want to check every cell, use currentlockpos from lockpuyo()
  // but, if ghost zone is enable, this way should be proper?
  // or just checking TOP_EDGE line is enough?
  // now connecting is involved with this function, so this is fine.
  for (let y = BOARD_TOP_EDGE; y < BOARD_BOTTOM_EDGE; y++) {
    for (let x = BOARD_LEFT_EDGE; x < BOARD_RIGHT_EDGE; x++) {
      if (board[y][x] === NO_COLOR) continue;
      const savePuyos = [];
      connectedPuyoNums = checkConnected(board, x, y, checkedCells, board[y][x], savePuyos, willChangeConnect);
      if (connectedPuyoNums >= connectNum) {
        // chainInfo.vanishPuyos.push(savePuyos);
        foundCallback(savePuyos);
      }
    }
  }
}

// check whether there is chain and if so, save those puyos
function checkConnected(board, x, y, checkedCells, prevCell, savePuyos, willAddConnect) {
  if (checkedCells[y][x] === true) { return 0; }

  let connectedPuyoNums = 0;
  const cell = board[y][x];
  if (cell === NO_COLOR || cell !== prevCell) {
    return 0;
  } else if (cell === prevCell) {
    savePuyos.push([x, y]);
    checkedCells[y][x] = true;

    connectedPuyoNums++;
  }
  let prevConnectedPuyoNums = connectedPuyoNums;

  // TODO: really? -> if you check board through from left to right and from top to bottom in every case, you don't need to check x-1 and y-1 here
  connectedPuyoNums += checkConnected(board, x + 1, y, checkedCells, prevCell, savePuyos, willAddConnect);
  if (willAddConnect && connectedPuyoNums - prevConnectedPuyoNums > 0) connectDrawing.addConnectedPuyos(x, y, cell, 1, 0);
  prevConnectedPuyoNums = connectedPuyoNums;

  connectedPuyoNums += checkConnected(board, x, y + 1, checkedCells, prevCell, savePuyos, willAddConnect);
  if (willAddConnect && connectedPuyoNums - prevConnectedPuyoNums > 0) connectDrawing.addConnectedPuyos(x, y, cell, 0, 1);
  prevConnectedPuyoNums = connectedPuyoNums;

  connectedPuyoNums += checkConnected(board, x - 1, y, checkedCells, prevCell, savePuyos, willAddConnect);
  if (willAddConnect && connectedPuyoNums - prevConnectedPuyoNums > 0) connectDrawing.addConnectedPuyos(x, y, cell, -1, 0);
  prevConnectedPuyoNums = connectedPuyoNums;

  // don't check invisible zone
  if (y - 1 >= BOARD_TOP_EDGE)
    connectedPuyoNums += checkConnected(board, x, y - 1, checkedCells, prevCell, savePuyos, willAddConnect);
  if (willAddConnect && connectedPuyoNums - prevConnectedPuyoNums > 0) connectDrawing.addConnectedPuyos(x, y, cell, 0, -1);

  return connectedPuyoNums;
}

function erasePuyos(board) {
  for (const temp of chainInfo.vanishPuyos) {
    for (const vanishPuyo of temp) {
      const [x, y] = [...vanishPuyo];

      //TODO: consider some effect in vanishing
      // board[y][x] = NO_COLOR;
      lockPuyo(board, x, y, NO_COLOR, recordPuyoSteps.VANISH_PUYO_REC_FLAG);

      // TODO: should do this with callbackl?
      connectDrawing.deleteConnectedPuyo(x, y);
    }
  }
}

// store puyos to fall after chain in order of lower puyo(y is high)
// what happens if ojama puyo exists???
function findFloatingPuyos(board) {
  const allVanishPuyos = [];
  for (const temp of chainInfo.vanishPuyos) {
    allVanishPuyos.push(...temp);
  }

  // extract only lowest ones
  const lowestPuyos = allVanishPuyos
    .sort((a, b) => b[1] - a[1])
    .sort((a, b) => a[0] - b[0])
    .filter((_, index, ori) => (index === 0 || ori[index - 1][0] !== ori[index][0]));

  temp_board = JSON.parse(JSON.stringify(board));

  // let puyo above vanished ones falls
  for (const lowestPuyo of lowestPuyos) {
    let [lowestX, lowestY] = [...lowestPuyo];
    for (let aboveY = lowestY - 1; aboveY >= BOARD_TOP_EDGE - 1; aboveY--) {
      // ignore cells included in allVanishPuyos
      if (allVanishPuyos.some((cur) => cur[0] === lowestX && cur[1] === aboveY)) continue;
      // go check next lowestX
      if (board[aboveY][lowestX] === NO_COLOR) break;

      floatingPuyo.posX = lowestX;
      floatingPuyo.posY = aboveY;
      floatingPuyo.color = board[aboveY][lowestX];
      // delegate drawing to floatingpuyo
      // temp_board[aboveY][lowestX] = NO_COLOR;
      lockPuyo(temp_board, lowestX, aboveY, NO_COLOR, recordPuyoSteps.FLOAT_PUYO_REC_FLAG);

      chainInfo.floatingPuyos.push({ ...floatingPuyo });

      // TODO: is this the right place? connecting animation is a bit weird
      connectDrawing.deleteConnectedPuyo(floatingPuyo.posX, floatingPuyo.posY);
    }
  }
}

function letFloatingPuyosFall(board) {
  for (const floatingPuyo of chainInfo.floatingPuyos) {
    const nextY = movePuyoDown(floatingPuyo.posY, 8.0);
    if (nextY >= BOARD_BOTTOM_EDGE - 1 || board[Math.floor(nextY) + 1][floatingPuyo.posX] !== NO_COLOR) {
      // be careful
      // floatingPuyo.posY = Math.round(nextY);
      floatingPuyo.posY = Math.floor(nextY);

      lockPuyo(board, floatingPuyo.posX, floatingPuyo.posY, floatingPuyo.color, recordPuyoSteps.DID_FLOAT_PUYO_REC_FLAG);

      // remove fixed puyo from floatingPuyos(array)
      chainInfo.floatingPuyos =
        chainInfo.floatingPuyos.filter((cur) => !(cur["posX"] === floatingPuyo.posX && cur["posY"] === floatingPuyo.posY));


    } else {
      floatingPuyo.posY = nextY;
    }
  }
}

function detectPossibleChain() {
  const threePuyoLumps = [];
  findConnectedPuyos(board, (savePuyos) => {
    threePuyoLumps.push(savePuyos);
  }, 3, false);

  for (const threePuyoLump of threePuyoLumps) {
    const isExposed = threePuyoLump.some((puyo) => {
      // TODO: add pattern puyo is surrounded by three each separated puyo
      const diffs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
      return diffs.some((diff) => board[puyo[1] + diff[1]][puyo[0] + diff[0]] === 0)
    })
    if (!isExposed) continue;

    const firstVanish = [threePuyoLump]; // turn into a form of vanishpuyos(double array)
    const virtualBoard = JSON.parse(JSON.stringify(board));
    letPuyosFallVirtually(virtualBoard, firstVanish);

    chainInfo.virtualChainCount = 1;
    chainInfo.virtualChainCount += triggerChainVirtually(virtualBoard);
    chainInfo.maxVirtualChainCount = Math.max(chainInfo.maxVirtualChainCount, chainInfo.virtualChainCount);
  }

  function triggerChainVirtually(virtualBoard) {
    const vanishPuyos = [];
    let chainCount = 0;
    findConnectedPuyos(virtualBoard, (savePuyos) => {
      vanishPuyos.push(savePuyos);
    }, 4, false);

    if (vanishPuyos.length === 0) return chainCount;
    else chainCount++;

    letPuyosFallVirtually(virtualBoard, vanishPuyos);

    chainCount += triggerChainVirtually(virtualBoard);
    return chainCount;
  }

  function letPuyosFallVirtually(board, vanishPuyos) {
    const allVanishPuyos = [];
    for (const temp of vanishPuyos) {
      allVanishPuyos.push(...temp);
      for (const vanishPuyo of temp) {
        const [x, y] = [...vanishPuyo];
        board[y][x] = 0;
      }
    }

    // extract only lowest ones
    const lowestPuyos = allVanishPuyos
      .sort((a, b) => b[1] - a[1])
      .sort((a, b) => a[0] - b[0])
      .filter((_, index, ori) => (index === 0 || ori[index - 1][0] !== ori[index][0]));

    for (const lowestPuyo of lowestPuyos) {
      let [lowestX, lowestY] = [...lowestPuyo];
      for (let aboveY = lowestY - 1; aboveY >= BOARD_TOP_EDGE - 1; aboveY--) {
        if (board[aboveY][lowestX] === 0) continue;
        for (let dy = 1; dy <= lowestY - aboveY; dy++) {
          if (board[aboveY + dy][lowestX] === 0) {
            board[aboveY + dy][lowestX] = board[aboveY + dy - 1][lowestX];
            board[aboveY + dy - 1][lowestX] = 0;
          }
        }
      }
    }
  }
}

// splittedpuyo falls off until it hits some puyo or bottom and lock pos
function handleSplitting() {
  // TODO: dont be stupid
  const splittedX = splittedPuyo.splittedX;
  const splittedY = splittedPuyo.splittedY;
  const nextY = movePuyoDown(splittedY, 8.0);

  // need to verify this condition
  if (nextY >= BOARD_BOTTOM_EDGE - 1 || board[Math.floor(nextY) + 1][splittedX] !== NO_COLOR) {

    // TODO: these should be done in lockpuyo(), I guess
    splittedPuyo.splittedY = Math.floor(nextY);

    // board[splittedPuyo.splittedY][splittedPuyo.splittedX] = splittedPuyo.splittedColor;
    // board[splittedPuyo.unsplittedY][splittedPuyo.unsplittedX] = splittedPuyo.unsplittedColor;
    lockPuyo(board, splittedPuyo.splittedX, splittedPuyo.splittedY, splittedPuyo.splittedColor, recordPuyoSteps.MANIPULATE_PUYO_REC_FLAG);

    gameState.isBeingSplitted = false;
    splittedPuyo = {};
    // for beforeNext()?
    gameState.isLocked = true;
  } else {
    splittedPuyo.splittedY = nextY;
  }
}

// Check if the game is over
function isGameOver() {
  return board[BOARD_TOP_EDGE][PUYO_BIRTH_POSX] !== NO_COLOR;
}

function canTakeInput() {
  return !gameOver && !gameState.isBeingSplitted && !gameState.chainProcessing;
  // return !gameOver && !gameState.isBeingSplitted && !gameState.chainProcessing && !gameState.isMovingHor;
}

function inputHandle() {
  if (canTakeInput()) throttleHandler();
}

function downKeyHandle() {
  // if (!canTakeInput()) return;

  if (keyInputState.isDownKeyPressed) {
    let keyMoveDownRate = 15.0;
    // I'm afraid of more than 0.5, which could get this world upside down
    if (keyMoveDownRate * moveYDiff >= 0.5) keyMoveDownRate = 0.5 / moveYDiff;
    if (canPuyoMoveDown(keyMoveDownRate)) {
      currentPuyo.parentY = movePuyoDown(currentPuyo.parentY, keyMoveDownRate);
    } else if (currentPuyo && canPuyoMoveDown(keyMoveDownRate / 2)) {
      currentPuyo.parentY = movePuyoDown(currentPuyo.parentY, keyMoveDownRate / 2);
    } else if (currentPuyo && canPuyoMoveDown(keyMoveDownRate / 4)) {
      currentPuyo.parentY = movePuyoDown(currentPuyo.parentY, keyMoveDownRate / 4);
    } else {
      // get puyo being able to lock immediately
      // TODO: find good timing or consider better logic
      gameState.lockWaitCount = LOCK_WAIT_TIME;
    }
  }
}
function horKeyhandle() {
  if (!canTakeInput()) return;

  if (keyInputState.isRightKeyPressed) {
    if (canPuyoMoveRight()) {
      currentPuyo.parentX = movePuyoHor_ori(currentPuyo.parentX, 1.0);
      // currentPuyo.parentX = moveHorStart(currentPuyo.parentX, 1.0);
    }
  }
  if (keyInputState.isLeftKeyPressed) {
    if (canPuyoMoveLeft()) {
      currentPuyo.parentX = movePuyoHor_ori(currentPuyo.parentX, -1.0);
      // currentPuyo.parentX = moveHorStart(currentPuyo.parentX, -1.0);
    }
  }
}

// Handle keyboard input
document.addEventListener('keydown', e => {
  // is this condition necessary? yes for rotation
  if (canTakeInput()) {
    if (e.key === 'ArrowLeft') {
      keyInputState.isLeftKeyPressed = true;
    }
    if (e.key === 'ArrowRight') {
      keyInputState.isRightKeyPressed = true;
    }
    if (e.key === 'ArrowDown') {
      keyInputState.isDownKeyPressed = true;
    }
    if (e.key === 'z') {
      // keyInputState.willRotateACW = true;
      rotatePuyo(-90);
    }
    if (e.key === 'x') {
      // keyInputState.willRotateCW = true;
      rotatePuyo(90);
    }
  } else {
    keyInputInit();
  }
});

// for quickturn
document.addEventListener('keydown', keyPressedTwice('x', () => {
  if (quickTurn.isPossible && currentPuyo) {
    quickTurn.willExecute = true;
    quickTurn.turnCW();
  }
}, () => { quickTurn.willExecute = false; }, 1000));

document.addEventListener('keydown', keyPressedTwice('z', () => {
  if (quickTurn.isPossible && currentPuyo) {
    quickTurn.willExecute = true;
    quickTurn.turnACW();
  }
}, () => { quickTurn.willExecute = false; }, 1000));

document.addEventListener('keyup', e => {
  // if (canTakeInput()) {
  if (e.key === 'ArrowLeft') {
    keyInputState.isLeftKeyPressed = false;
  }
  if (e.key === 'ArrowRight') {
    keyInputState.isRightKeyPressed = false;
  }
  if (e.key === 'ArrowDown') {
    keyInputState.isDownKeyPressed = false;
  }
  if (e.key === 'ArrowUp' || e.key === 'z') {
    // keyInputState.willRotateACW = false;
  }
  if (e.key === 'x') {
    // keyInputState.willRotateCW = false;
  }
  // }
});

function keyInputInit() {
  // keyInputState.willRotateCW = false;
  // keyInputState.willRotateACW = false;
  keyInputState.isDownKeyPressed = false;
  keyInputState.isRightKeyPressed = false;
  keyInputState.isLeftKeyPressed = false;
}

function moveHorStart(parentX, direction) {
  gameState.isMovingHor = true;
  movingHorDrawing.targetX = parentX + direction;
  movingHorDrawing.moveXDiff = direction / HOR_MOVING_TIME;
  movingHorDrawing.drawingX = parentX;

  return parentX + direction;
}

function movePuyoHor() {
  const targetX = movingHorDrawing.targetX;
  const diff = movingHorDrawing.moveXDiff;

  movingHorDrawing.drawingX += diff;
  if (Math.abs(targetX - movingHorDrawing.drawingX) < Math.abs(diff) * ((HOR_MOVING_TIME + 1) / HOR_MOVING_TIME)) {
    movingHorDrawing.drawingX = targetX; // is this necessary?
    gameState.isMovingHor = false;
  }
}
function movePuyoHor_ori(parentX, direction) {
  gameState.isMovingHor = true;
  // movingHorState.moveXDiff = direction / HOR_MOVING_TIME;
  movingHorDrawing.targetX = parentX + direction;
  movingHorDrawing.drawingX = parentX;
  return parentX + direction;
}

function movePuyoDown(parentY, rate) {
  return parentY + moveYDiff * rate;
}

// Check if the current piece can move left
function canPuyoMoveLeft(puyo = currentPuyo) {
  const parentX = puyo.parentX;
  const parentY = puyo.parentY;
  const [childX, childY] = getChildPos(puyo);
  const angle = puyo.angle;

  if (angle === 90 || angle === 270) {
    const leftX = angle === 90 ? childX : parentX;
    const nextX = leftX - 1;
    // if (nextX < BOARD_LEFT_EDGE || board[Math.floor(parentY)][nextX] !== NO_COLOR || board[Math.round(parentY)][nextX] !== NO_COLOR) {
    if (nextX < BOARD_LEFT_EDGE || board[Math.floor(parentY)][nextX] !== NO_COLOR || board[Math.floor(parentY) + 1][nextX] !== NO_COLOR) {
      return false;
    }
    return true;
  } else if (angle === 0 || angle === 180) {
    const nextX = Math.round(parentX) - 1;
    // **one condition below is unnecessary
    if (nextX < BOARD_LEFT_EDGE ||
      board[Math.floor(parentY)][nextX] !== NO_COLOR ||
      board[Math.floor(parentY) + 1][nextX] !== NO_COLOR ||
      board[Math.floor(childY)][nextX] !== NO_COLOR ||
      // TODO: if childY is integer this is bad
      board[Math.floor(childY) + 1][nextX] !== NO_COLOR
    ) {
      return false;
    }
    return true;
  }
}

// Check if the current piece can move right
function canPuyoMoveRight(puyo = currentPuyo) {
  const parentX = puyo.parentX;
  const parentY = puyo.parentY;
  const [childX, childY] = getChildPos(puyo);
  const angle = puyo.angle;

  if (angle === 90 || angle === 270) {
    const rightX = angle === 270 ? childX : parentX;
    const nextX = rightX + 1;
    // if (nextX >= BOARD_WIDTH || board[Math.floor(parentY)][nextX] !== NO_COLOR || board[Math.round(parentY)][nextX] !== NO_COLOR) {
    if (nextX >= BOARD_RIGHT_EDGE || board[Math.floor(parentY)][nextX] !== NO_COLOR || board[Math.floor(parentY) + 1][nextX] !== NO_COLOR) {
      return false;
    }
    return true;
  } else if (angle === 0 || angle === 180) {
    const nextX = Math.round(parentX) + 1;
    // **one condition below is unnecessary
    if (nextX >= BOARD_RIGHT_EDGE ||
      board[Math.floor(parentY)][nextX] !== NO_COLOR ||
      // board[Math.round(parentY)][nextX] !== NO_COLOR ||
      board[Math.floor(parentY) + 1][nextX] !== NO_COLOR ||
      board[Math.floor(childY)][nextX] !== NO_COLOR ||
      board[Math.floor(childY) + 1][nextX] !== NO_COLOR
    ) {
      return false;
    }
    return true;
  }
}

// Rotate the current piece
// angle should be 90, -90?
function rotatePuyo(changeAngle) {
  const rotatedPuyo = { ...currentPuyo };
  rotatedPuyo.angle += changeAngle;
  rotatedPuyo.angle = rotatedPuyo.angle === 360 ? 0 : (rotatedPuyo.angle === -90 ? 270 : rotatedPuyo.angle);
  const [rotatedChildX, rotatedChildY] = getChildPos(rotatedPuyo);
  const [currentChildX, currentChildY] = getChildPos(currentPuyo);
  let canRotate = false;

  // only skip when angle:90 or 270 in quickturn
  if (quickTurn.willExecute && (rotatedPuyo.angle === 90 || rotatedPuyo.angle === 270)) {
    setRotateDrawing(changeAngle, currentPuyo.angle);
    currentPuyo = rotatedPuyo;
    return;
  }

  // anytime puyo can rotate in this case
  if (rotatedPuyo.angle === 180) {
    // currentPuyo = rotatedPuyo;
    // return; // ok?
    canRotate = true;
  } else if (rotatedPuyo.angle === 90) {
    // left is empty? if not, can move right? if not, cannot rotate
    const nextX = rotatedChildX;
    if (nextX >= BOARD_LEFT_EDGE &&
      // currentChildY + 1 < BOARD_HEIGHT &&
      board[Math.floor(currentChildY)][nextX] == NO_COLOR &&
      // board[Math.floor(currentChildY) + 1][nextX] == NO_COLOR &&
      board[Math.floor(rotatedChildY)][nextX] == NO_COLOR &&
      board[Math.floor(rotatedChildY) + 1][nextX] == NO_COLOR
    ) {
      // currentPuyo = rotatedPuyo;
      // debug_puyoCheck();
      // return;
      canRotate = true;
    } else if (canPuyoMoveRight(rotatedPuyo)) {
      // TODO: movestart instead of letting puyo actually move here?
      rotatedPuyo.parentX = movePuyoHor_ori(rotatedPuyo.parentX, 1.0);
      // currentPuyo = rotatedPuyo;
      // // currentPuyo.parentX = moveHorStart(currentPuyo.parentX, 1.0);
      // return;
      canRotate = true;
    } else {
      // stuck and cannot move
      // or quickturn?
      quickTurn.isPossible = true;
      // and do nothing here, rotate twice in eventlistener
      return;
    }
  } else if (rotatedPuyo.angle === 270) {
    // right is empty? if not, can move left? if not, cannot rotate
    const nextX = rotatedChildX;
    if (nextX < BOARD_RIGHT_EDGE &&
      // currentChildY + 1 < BOARD_HEIGHT &&
      board[Math.floor(rotatedChildY)][nextX] == NO_COLOR &&
      board[Math.floor(rotatedChildY) + 1][nextX] == NO_COLOR &&
      board[Math.floor(currentChildY)][nextX] == NO_COLOR
      // && board[Math.floor(currentChildY) + 1][nextX] == NO_COLOR
    ) {
      // currentPuyo = rotatedPuyo;
      // debug_puyoCheck();
      // return;
      canRotate = true;
    } else if (canPuyoMoveLeft(rotatedPuyo)) {
      rotatedPuyo.parentX = movePuyoHor_ori(rotatedPuyo.parentX, -1.0);
      // currentPuyo = rotatedPuyo;
      // // currentPuyo.parentX = moveHorStart(currentPuyo.parentX, -1.0);
      // return;
      canRotate = true;
    } else {
      // stuck and cannot move
      // or quickturn?
      quickTurn.isPossible = true;
      // and do nothing here, rotate twice in eventlistener
      return;
    }
  } else if (rotatedPuyo.angle === 0) {
    // if there is something below, push up by one cell
    if (rotatedChildY >= BOARD_BOTTOM_EDGE - 1 || //<- is this ok? need to check
      board[Math.floor(rotatedChildY) + 1][rotatedChildX] !== NO_COLOR // ||
      // board[Math.floor(rotatedChildY) + 1][currentChildX] !== NO_COLOR
    ) {
      // TODO: some animation at push up?
      rotatedPuyo.parentY = Math.floor(rotatedPuyo.parentY) - 0.5; // for mawashi??
    }
    // currentPuyo = rotatedPuyo;
    // return;
    canRotate = true;
  }

  if (canRotate) {
    setRotateDrawing(changeAngle, currentPuyo.angle);
    currentPuyo = rotatedPuyo;
    return;
  }

  function setRotateDrawing(changeAngle, prevAngle) {
    gameState.isRotating = true;
    rotateDrawing.changeAngle = changeAngle;
    rotateDrawing.prevAngle = prevAngle;
  }
}

// Start the game
init();



addEventListener('keydown', e => {
  if (e.key === 'D') {
    console.log('debugdebudguedbuedueg');
  }
})

function htmlUpdate() {
  const chainNumShow = document.getElementById("chainCount");
  chainNumShow.textContent = `${chainInfo.chainCount} 連鎖    最大${chainInfo.maxVirtualChainCount}連鎖可能`
}

setInterval(1000, htmlUpdate);

const pauseButton = document.getElementById("pauseButton");
const undoButton = document.getElementById("undoButton");

pauseButton.addEventListener('click', e => {
  gameState.isPaused = !gameState.isPaused;
})

undoButton.addEventListener('click', e => {
  if (gameState.isPaused || gameOver) {
    recordPuyoSteps.undo(board);
  }
})
