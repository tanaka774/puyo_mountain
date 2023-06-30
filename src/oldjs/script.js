import { throttle, keyPressedTwice } from "./util.js";
import { drawEllipse, drawEyes, addAlpha, drawGlueToDown, drawGlueToRight } from "./draw.js";
import Menu from "./menu.js"
import { gameConfig } from "./config.ts"

import conso from "./test.ts";
conso();

const gameState = {
  OPENING: 'OPENING',
  MENU: 'MENU',
  UNINIT: 'UNINIT',
  PREPARE_NEXT: 'PREPARE_NEXT',
  MANIPULATING: 'MANIPULATING',
  SPLITTING: 'SPLITTING',
  LOCKING_MANIPUYO: 'LOCKING',
  CHAIN_FINDING: 'CHAIN_FINDING',
  CHAIN_VANISHING: 'CHAIN_VANISHING',
  FALLING_ABOVE_CHAIN: 'FALLING_ABOVE_CHAIN',
  GAMEOVER: 'GAMEOVER',
  PAUSING: 'PAUSING',
  JUST_DRAWING: 'JUST_DRAWING',
}
let currentState = '';
let prevState = '';
function setState(state) {
  if (currentState !== state) {
    prevState = currentState;
    currentState = state;
  }
}

const canvas = document.getElementById('tetrisCanvas');
const ctx = canvas.getContext('2d');
let board = [];
let currentPuyo = null;
let nextPuyo = null;
let doubleNextPuyo = null;
const nextPuyoCanvas = document.getElementById('nextPuyoCanvas');
const nextPuyoCtx = nextPuyoCanvas.getContext('2d');


const basePuyo = {
  parentX: gameConfig.PUYO_BIRTH_POSX,
  parentY: gameConfig.PUYO_BIRTH_POSY,
  parentColor: 1,
  childColor: 2,
  angle: 0,
};

const getChildPos = (puyo) => {
  // TODO: modify returning drawingX during rotating
  // const parentX = (movingHorDrawing.isMovingHor) ? movingHorDrawing.drawingX : puyo.parentX;
  const parentX = puyo.parentX;
  const diffs = [[0, 1], [-1, 0], [0, -1], [1, 0]];
  const childX = diffs[(puyo.angle / 90) % 4][0] + parentX;
  const childY = diffs[(puyo.angle / 90) % 4][1] + puyo.parentY;
  return [childX, childY];
};

const floatingPuyo = {
  posX: -1,
  posY: -1,
  color: -1,
};

const chainInfo = {
  floatingPuyos: [],
  vanishPuyos: [],
  chainVanishWaitCount: 0,
  chainCount: 0,
  virtualChainCount: 0,
  maxVirtualChainCount: 0,
  maxTriggerPuyos: [],
}

let splittedPuyo = {
  splittedX: -1,
  splittedY: -1,
  splittedColor: 1,
  unsplittedX: -1,
  unsplittedY: -1,
  unsplittedColor: 2,
};


const lockingInfo = {
  lockWaitCount: 0,
}

const keyInputState = {
  isRightKeyPressed: false,
  isLeftKeyPressed: false,
  isDownKeyPressed: false,
}

const movingHorDrawing = {
  isMovingHor: false,
  targetX: 0,
  moveXDiff: 0,
  drawingX: 0,
  drawCount: 0,
}
const rotateDrawing = {
  isRotating: false,
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
    this.connectedPuyos.add(`${x - gameConfig.BOARD_LEFT_EDGE},${y - gameConfig.BOARD_TOP_EDGE},${color}:${dx},${dy}`);
  },
  deleteConnectedPuyo: function(x, y) {
    const modX = x - gameConfig.BOARD_LEFT_EDGE;
    const modY = y - gameConfig.BOARD_TOP_EDGE;
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

const bounceEffect = {
  willBounce: false,
  BOUNCING_TIME: 10,
  bouncePuyoNum: 3,
  bouncePuyos: new Set(), // ["x1,y1", "x2,y2", ...]
  bounceQuantities: 0, // increase by 180 / BOUNCING_TIME
  start: function(x, y) {
    this.willBounce = true;
    for (let n = 0; (n <= this.bouncePuyoNum) && (y + n < gameConfig.BOARD_BOTTOM_EDGE); n++) {
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

// TODO: do smarter and think again this function's necessity
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

function init(setNextState) {
  board = createBoard();
  // beforeNext();
  draw();
  setNextState();
  // there is something wrong with this
  // gameLoop();
}

function createBoard() {
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
  return board;
}

function getRandomPuyo() {
  const newPuyo = { ...basePuyo };
  newPuyo.parentColor = Math.floor(Math.random() * 4) + 1;
  newPuyo.childColor = Math.floor(Math.random() * 4) + 1;
  newPuyo.parentX = gameConfig.PUYO_BIRTH_POSX;
  newPuyo.parentY = gameConfig.PUYO_BIRTH_POSY;
  return newPuyo;
}

function beforeNext(setNextState) {
  currentPuyo = (prevState !== gameState.UNINIT) ? nextPuyo : getRandomPuyo();
  nextPuyo = (nextPuyo !== null) ? doubleNextPuyo : getRandomPuyo();
  doubleNextPuyo = getRandomPuyo();
  lockingInfo.lockWaitCount = 0;
  quickTurn.isPossible = false;
  chainInfo.chainCount = 0;
  // TODO: this is for debug
  keyInputInit();
  // erase puyos more than above gameConfig.BOARD_TOP_EDGE-2
  // TODO: this implementaion is not officially right
  for (let y = 0; y < gameConfig.BOARD_TOP_EDGE - 1; y++) {
    for (let x = gameConfig.BOARD_LEFT_EDGE; x < gameConfig.BOARD_RIGHT_EDGE; x++) {
      board[y][x] = gameConfig.NO_COLOR;
    }
  }

  detectPossibleChain();

  setNextState();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let y = gameConfig.BOARD_TOP_EDGE; y < gameConfig.BOARD_BOTTOM_EDGE; y++) {
    for (let x = gameConfig.BOARD_LEFT_EDGE; x < gameConfig.BOARD_RIGHT_EDGE; x++) {
      const cell = board[y][x];
      if (cell !== gameConfig.NO_COLOR) {
        drawPuyo(x, y, gameConfig.PUYO_COLORS[cell])
      }
    }
  }

  // draw puyo's connecting
  drawConnecting();

  // draw floating puyos
  // TODO: modify this condition (or remove)
  if (currentState === gameState.FALLING_ABOVE_CHAIN) {
    if (chainInfo.chainVanishWaitCount >= gameConfig.VANISH_WAIT_TIME) {
      for (const floatingPuyo of chainInfo.floatingPuyos) {
        drawPuyo(floatingPuyo.posX, floatingPuyo.posY, gameConfig.PUYO_COLORS[floatingPuyo.color]);
      }
    }
  }

  // draw splittedPuyo
  // TODO: modify this condition (or remove)
  if (currentState === gameState.SPLITTING ||
    (currentState === gameState.JUST_DRAWING && prevState === gameState.SPLITTING)
  ) {
    drawPuyo(splittedPuyo.splittedX, splittedPuyo.splittedY, gameConfig.PUYO_COLORS[splittedPuyo.splittedColor]);

    drawPuyo(splittedPuyo.unsplittedX, splittedPuyo.unsplittedY, gameConfig.PUYO_COLORS[splittedPuyo.unsplittedColor]);
  }

  // draw currentPuyo
  if (currentPuyo) {
    drawPuyo(currentPuyo.parentX, currentPuyo.parentY, gameConfig.PUYO_COLORS[currentPuyo.parentColor]);

    const [childX, childY] = getChildPos(currentPuyo);
    drawPuyo(childX, childY, gameConfig.PUYO_COLORS[currentPuyo.childColor]);
  }

  // draw nextPuyo and doubleNextPuyo on right-side to board
  if (nextPuyo && doubleNextPuyo) { // <- is this condition necessary?
    nextPuyoCtx.fillStyle = gameConfig.PUYO_COLORS[nextPuyo.parentColor];
    // nextPuyoCtx.fillRect((gameConfig.BOARD_WIDTH) * CELL_SIZE, 1 * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    nextPuyoCtx.fillRect(0.3 * gameConfig.CELL_SIZE, 1 * gameConfig.CELL_SIZE, gameConfig.CELL_SIZE, gameConfig.CELL_SIZE);
    nextPuyoCtx.fillStyle = gameConfig.PUYO_COLORS[nextPuyo.childColor];
    nextPuyoCtx.fillRect(0.3 * gameConfig.CELL_SIZE, 2 * gameConfig.CELL_SIZE, gameConfig.CELL_SIZE, gameConfig.CELL_SIZE);

    nextPuyoCtx.fillStyle = gameConfig.PUYO_COLORS[doubleNextPuyo.parentColor];
    nextPuyoCtx.fillRect(0.3 * gameConfig.CELL_SIZE, 4 * gameConfig.CELL_SIZE, gameConfig.CELL_SIZE, gameConfig.CELL_SIZE);
    nextPuyoCtx.fillStyle = gameConfig.PUYO_COLORS[doubleNextPuyo.childColor];
    nextPuyoCtx.fillRect(0.3 * gameConfig.CELL_SIZE, 5 * gameConfig.CELL_SIZE, gameConfig.CELL_SIZE, gameConfig.CELL_SIZE);
  }

  drawAfterimage();

  drawTriggerPuyos();



  function drawPuyo(x, y, color, willStorke = true) {
    const drawPosX = (x - gameConfig.BOARD_LEFT_EDGE) * gameConfig.CELL_SIZE;
    const drawPosY = (y - gameConfig.BOARD_TOP_EDGE) * gameConfig.CELL_SIZE;

    const radiusX = gameConfig.CELL_SIZE * 15 / 32;
    const radiusY = gameConfig.CELL_SIZE * 14 / 32;
    const elliX = drawPosX + radiusX + gameConfig.CELL_SIZE / 16;
    const elliY = drawPosY + radiusY + gameConfig.CELL_SIZE / 10;
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
      // const yModifier = (gameConfig.BOARD_BOTTOM_EDGE - y) / 10 + 1;
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
      const radiusX = gameConfig.CELL_SIZE * 4 / 9;
      const radiusY = gameConfig.CELL_SIZE * 3 / 7;

      if (diffX === 0 && diffY === 1) {
        drawGlueToDown(ctx, gameConfig.CELL_SIZE, x, y, x, y + diffY, radiusX, radiusY, gameConfig.PUYO_COLORS[color]);
      } else if (diffX === 1 && diffY === 0) {
        drawGlueToRight(ctx, gameConfig.CELL_SIZE, x, y, x + diffX, y, radiusX, radiusY, gameConfig.PUYO_COLORS[color]);
      } else if (diffX === 0 && diffY === -1) {
        // need to verify
        drawGlueToDown(ctx, gameConfig.CELL_SIZE, x, y + diffY, x, y, radiusX, radiusY, gameConfig.PUYO_COLORS[color]);
      } else if (diffX === -1 && diffY === 0) {
        // need to verify
        drawGlueToRight(ctx, gameConfig.CELL_SIZE, x + diffX, y, x, y, radiusX, radiusY, gameConfig.PUYO_COLORS[color]);
      }
    })
  }

  function drawAfterimage() {
    // after other state than MANIP like SPLIT, it enters this function in certain condition
    if (!currentPuyo) return;

    if (rotateDrawing.isRotating) {
      const devideNum = 3;
      for (let n = 1; n < devideNum; n++) {
        const angle = rotateDrawing.changeAngle * (3 / 5 + 2 / 5 * n / devideNum) + rotateDrawing.prevAngle;
        const rotatingX = currentPuyo.parentX + Math.cos((angle * (-1) + 270) * Math.PI / 180);
        const rotatingY = currentPuyo.parentY - Math.sin((angle * (-1) + 270) * Math.PI / 180);
        const alpha = 0.2 + 0.2 * n / devideNum;
        drawPuyo(rotatingX, rotatingY, addAlpha(gameConfig.PUYO_COLORS[currentPuyo.childColor], alpha), false);
      }

      rotateDrawing.drawCount--;
      if (rotateDrawing.drawCount <= 0) {
        rotateDrawing.isRotating = false;
        rotateDrawing.drawCount = gameConfig.ROTATING_TIME;
      }
    }
    // draw puyo moving horizontally
    if (movingHorDrawing.isMovingHor) {
      // TODO: if you do this, it needs more frames
      const diffX = movingHorDrawing.targetX - movingHorDrawing.drawingX;
      const [childX, childY] = getChildPos(currentPuyo);
      // only draw circle with color not stroke or eye
      const devideNum = 3;
      for (let n = 1; n < devideNum; n++) {
        const alpha = 0.2 + 0.1 * n / devideNum;
        if (!(diffX < 0 && currentPuyo.angle === 270))
          drawPuyo(currentPuyo.parentX - (diffX * (2 / 5 * n / devideNum)), currentPuyo.parentY, addAlpha(gameConfig.PUYO_COLORS[currentPuyo.parentColor], alpha), false);
        if (!(diffX > 0 && currentPuyo.angle === 90))
          drawPuyo(childX - (diffX * (2 / 5 * n / devideNum)), childY, addAlpha(gameConfig.PUYO_COLORS[currentPuyo.childColor], alpha), false);
      }

      movingHorDrawing.drawCount--;
      if (movingHorDrawing.drawCount <= 0) {
        movingHorDrawing.isMovingHor = false;
        movingHorDrawing.drawCount = gameConfig.HOR_MOVING_TIME;
      }
    }
  }

  function drawTriggerPuyos() {
    if (chainInfo.maxVirtualChainCount < 2 ||
      currentState !== gameState.MANIPULATING
    ) return;

    chainInfo.maxTriggerPuyos.forEach((elem) => {
      const drawPosX = (elem[0] - gameConfig.BOARD_LEFT_EDGE) * gameConfig.CELL_SIZE;
      const drawPosY = (elem[1] - gameConfig.BOARD_TOP_EDGE) * gameConfig.CELL_SIZE;

      ctx.strokeStyle = "gray";
      ctx.lineWidth = 2;
      ctx.strokeRect(drawPosX, drawPosY, gameConfig.CELL_SIZE, gameConfig.CELL_SIZE);
    })
  }
}


function gameLoop() {
  beforeStateCheck();

  switch (currentState) {
    case gameState.OPENING:
      // some opning animation?
      setState(gameState.MENU);
      // TODO: these should be called in MENU as enter function
      const menu = new Menu();
      menu.setSetNextState(() => setState(gameState.UNINIT));
      break;
    case gameState.MENU:
      // open menu
      // if game start is pressed, go UNINIT
      // const menu = new Menu();
      // menu.setSetNextState(() => setState(gameState.UNINIT))
      break;
    case gameState.UNINIT:
      // execute init()
      init(() => setState(gameState.PREPARE_NEXT));
      break;
    case gameState.PREPARE_NEXT:
      // prepare next puyo and init some on board
      beforeNext(() => setState(gameState.MANIPULATING));
      break;
    case gameState.MANIPULATING: // FREEFALL state should be made?
      // canPuyoMoveDown() takes default parameter of setState(splitting) callbackl
      // and that is also called in inputhandle()
      // TODO: deal with ugliness in this state
      inputHandle();
      if (currentState !== gameState.SPLITTING &&
        canPuyoMoveDown()
      ) {
        currentPuyo.parentY = movePuyoDown(currentPuyo.parentY, 1.0);
      } else {
        // TODO: I don't wanna do this! should be done in canMovePuyoDown()
        if (currentState !== gameState.SPLITTING) {
          // setState(gameState.LOCKING_MANIPUYO)

          if (lockCurrentPuyo()) setState(gameState.CHAIN_FINDING);
          // else this state again?
        }
      }
      break;
    case gameState.SPLITTING:
      handleSplitting(() => setState(gameState.CHAIN_FINDING));
      break;
    case gameState.LOCKING_MANIPUYO:
      // TODO: want to calc lockwaitcount here or isn't necessary?
      // lockPuyo(() => setState(gameState.CHAIN_FINDING));
      if (lockCurrentPuyo()) setState(gameState.CHAIN_FINDING);
      else setState(gameState.MANIPULATING);
      break;
    case gameState.CHAIN_FINDING:
      // TODO: these should go into function?
      findConnectedPuyos(board, (savePuyos) => {
        chainInfo.vanishPuyos.push(savePuyos);
      });
      if (chainInfo.vanishPuyos.length !== 0) {
        chainInfo.chainCount++;
        setState(gameState.CHAIN_VANISHING);
        erasePuyos(board); // temp here, should go into VANISHING
      } else {
        if (!isGameOver()) setState(gameState.PREPARE_NEXT);
        else setState(gameState.GAMEOVER);
      }

      // chainfindfunction(
      //   () => setState(gameState.CHAIN_VANISHING), // chain exists
      //   () => setState(gameState.PREPARE_NEXT), // no chain
      //   () => setState(gameState.GAMEOVER) // no chain and over
      // );
      break;
    case gameState.CHAIN_VANISHING:
      // TODO: this should be called just once as enter function
      // erasePuyos(board);

      if (chainInfo.chainVanishWaitCount < gameConfig.VANISH_WAIT_TIME) {
        chainInfo.chainVanishWaitCount++;
        // this state again
      } else if (chainInfo.chainVanishWaitCount === gameConfig.VANISH_WAIT_TIME) {
        chainInfo.chainVanishWaitCount++;
        findFloatingPuyos(board);
        setState(gameState.FALLING_ABOVE_CHAIN);
        // findFloatingPuyos(() => setState(gameState.FALLING_ABOVE_CHAIN));
      }
      break;
    case gameState.FALLING_ABOVE_CHAIN:
      // letFloaintgPuyosFall(() => setState(gameState.CHAIN_FINDING));

      if (chainInfo.floatingPuyos.length > 0) {
        letFloatingPuyosFall(board);
        // this state again
      } else {
        setState(gameState.CHAIN_FINDING);
        chainInfo.vanishPuyos = [];
        chainInfo.chainVanishWaitCount = 0;
      }
      break;
    case gameState.JUST_DRAWING:
      if (!bounceEffect.willBounce) setState(prevState);
      break;
    case gameState.GAMEOVER:
      // if no chain saves you, its over
      break;
    case gameState.PAUSING:
      // if you press pause
      // after this, go back to origianl state
      break;
  }

  // TODO: want to modify...
  if (!(currentState === gameState.OPENING ||
    currentState === gameState.MENU ||
    currentState === gameState.PAUSING
  ))
    draw();

  htmlUpdate();
  requestAnimationFrame(gameLoop);

  function beforeStateCheck() {
    if (bounceEffect.willBounce &&
      (currentState !== gameState.FALLING_ABOVE_CHAIN)
    ) setState(gameState.JUST_DRAWING);
  }
}

function canPuyoMoveDown(
  rate = 1.0,
  setNextState = () => setState(gameState.SPLITTING),
) {
  const parentX = currentPuyo.parentX;
  const parentY = currentPuyo.parentY;
  const [childX, childY] = getChildPos(currentPuyo);
  const angle = currentPuyo.angle;

  if (parentY + gameConfig.moveYDiff * rate < Math.round(parentY)) { return true; }

  if (angle === 0 || angle === 180) {
    const downY = angle === 0 ? childY : parentY;
    // const nextY = Math.floor(downY) + 2;
    const nextY = Math.round(downY) + 1;
    if (nextY >= gameConfig.BOARD_BOTTOM_EDGE || board[nextY][parentX] !== gameConfig.NO_COLOR) {
      return false;
    }
    return true;
  } else if (angle === 90 || angle === 270) {
    // const nextY = Math.floor(parentY) + 2;
    const nextY = Math.round(parentY) + 1;

    // at first check lock-wait time on any condition
    if (nextY >= gameConfig.BOARD_BOTTOM_EDGE || board[nextY][parentX] !== gameConfig.NO_COLOR || board[nextY][childX] !== gameConfig.NO_COLOR) {
      // must increment lockWaitCount to max in lockpuyo() not here
      // TODO: smarter logic this is shit!!!
      if (lockingInfo.lockWaitCount < gameConfig.LOCK_WAIT_TIME - 1) {
        lockingInfo.lockWaitCount++;
        return false;
      }
    } else {
      // none of those below conditions catches
      return true;
    }

    if (nextY >= gameConfig.BOARD_BOTTOM_EDGE || (board[nextY][parentX] !== gameConfig.NO_COLOR && board[nextY][childX] !== gameConfig.NO_COLOR)) {
      // ちぎり無（のはず）
      return false;
    } else if (board[nextY][parentX] !== gameConfig.NO_COLOR) {
      // 子側でちぎり（のはず）
      setNextState();
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
    } else if (board[nextY][childX] !== gameConfig.NO_COLOR) {
      // 親側でちぎり（のはず）
      setNextState();
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
    } else if (nextY >= gameConfig.BOARD_BOTTOM_EDGE) {
      // ちぎり無（のはず）
      return false;
    }
    return true;
  }
}

// Lock the current puyo, this is the case splitting not happening
function lockCurrentPuyo() {
  if (lockingInfo.lockWaitCount < gameConfig.LOCK_WAIT_TIME) {
    lockingInfo.lockWaitCount++;
    return false;
  }
  // fix Y position into integer
  currentPuyo.parentY = Math.round(currentPuyo.parentY);
  // currentPuyo.parentY = 1 + Math.floor(currentPuyo.parentY);

  const [childX, childY] = getChildPos(currentPuyo);
  lockPuyo(board, currentPuyo.parentX, currentPuyo.parentY, currentPuyo.parentColor, recordPuyoSteps.MANIPULATE_PUYO_REC_FLAG);
  lockPuyo(board, childX, childY, currentPuyo.childColor, recordPuyoSteps.MANIPULATE_PUYO_REC_FLAG);

  currentPuyo = null;

  return true;
}

function lockPuyo(board, posX, posY, color, recordFlag) {
  // TODO: remember x, y value here and use for chain process or something
  board[posY][posX] = color;

  recordPuyoSteps.record(posX, posY, color, recordFlag);

  if (color !== gameConfig.NO_COLOR) {
    bounceEffect.start(posX, posY);
  } else {
    // TODO: this dealing is temporary, you should revise these flow
    bounceEffect.delete(posX, posY);
  }
}

function findConnectedPuyos(board, foundCallback, connectNum = 4, willChangeConnect = true) {
  let connectedPuyoNums = 0;
  const checkedCells = Array.from(
    { length: (gameConfig.BOARD_BOTTOM_EDGE - gameConfig.BOARD_TOP_EDGE) + 5 },
    () => Array((gameConfig.BOARD_RIGHT_EDGE - gameConfig.BOARD_LEFT_EDGE) + 2).fill(false));

  if (willChangeConnect) connectDrawing.initConnectedPuyos();

  // TODO: don't want to check every cell, use currentlockpos from lockpuyo()
  // but, if ghost zone is enable, this way should be proper?
  // or just checking TOP_EDGE line is enough?
  // now connecting is involved with this function, so this is fine.
  for (let y = gameConfig.BOARD_TOP_EDGE; y < gameConfig.BOARD_BOTTOM_EDGE; y++) {
    for (let x = gameConfig.BOARD_LEFT_EDGE; x < gameConfig.BOARD_RIGHT_EDGE; x++) {
      if (board[y][x] === gameConfig.NO_COLOR) continue;
      const savePuyos = [];
      connectedPuyoNums = checkConnected(board, x, y, checkedCells, board[y][x], savePuyos, willChangeConnect);
      if (connectedPuyoNums >= connectNum) {
        // chainInfo.vanishPuyos.push(savePuyos);
        foundCallback(savePuyos);
      }
    }
  }
}

function checkConnected(board, x, y, checkedCells, prevCell, savePuyos, willAddConnect) {
  if (checkedCells[y][x] === true) { return 0; }

  let connectedPuyoNums = 0;
  const cell = board[y][x];
  if (cell === gameConfig.NO_COLOR || cell !== prevCell) {
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
  if (y - 1 >= gameConfig.BOARD_TOP_EDGE)
    connectedPuyoNums += checkConnected(board, x, y - 1, checkedCells, prevCell, savePuyos, willAddConnect);
  if (willAddConnect && connectedPuyoNums - prevConnectedPuyoNums > 0) connectDrawing.addConnectedPuyos(x, y, cell, 0, -1);

  return connectedPuyoNums;
}

function erasePuyos(board) {
  for (const temp of chainInfo.vanishPuyos) {
    for (const vanishPuyo of temp) {
      const [x, y] = [...vanishPuyo];

      // TODO: consider some effect in vanishing
      // and consider ojama puyo
      lockPuyo(board, x, y, gameConfig.NO_COLOR, recordPuyoSteps.VANISH_PUYO_REC_FLAG);

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

  // let puyo above vanished ones falls
  for (const lowestPuyo of lowestPuyos) {
    let [lowestX, lowestY] = [...lowestPuyo];
    for (let aboveY = lowestY - 1; aboveY >= gameConfig.BOARD_TOP_EDGE - 1; aboveY--) {
      // ignore cells included in allVanishPuyos
      if (allVanishPuyos.some((cur) => cur[0] === lowestX && cur[1] === aboveY)) continue;
      // go check next lowestX
      if (board[aboveY][lowestX] === gameConfig.NO_COLOR) break;

      floatingPuyo.posX = lowestX;
      floatingPuyo.posY = aboveY;
      floatingPuyo.color = board[aboveY][lowestX];
      // delegate drawing to floatingpuyo
      lockPuyo(board, lowestX, aboveY, gameConfig.NO_COLOR, recordPuyoSteps.FLOAT_PUYO_REC_FLAG);

      chainInfo.floatingPuyos.push({ ...floatingPuyo });

      // TODO: is this the right place? connecting animation is a bit weird
      connectDrawing.deleteConnectedPuyo(floatingPuyo.posX, floatingPuyo.posY);
    }
  }
}

function letFloatingPuyosFall(board) {
  for (const floatingPuyo of chainInfo.floatingPuyos) {
    const nextY = movePuyoDown(floatingPuyo.posY, 12.0);
    if (nextY >= gameConfig.BOARD_BOTTOM_EDGE - 1 || board[Math.floor(nextY) + 1][floatingPuyo.posX] !== gameConfig.NO_COLOR) {
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

// TODO: this function is incomplete
function detectPossibleChain() {
  // init maxcount first
  chainInfo.maxVirtualChainCount = 0;
  const triggerPuyosGroups = [];
  findConnectedPuyos(board, (savePuyos) => {
    const isExposed = savePuyos.some((puyo) => {
      const diffs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
      return diffs.some((diff) => board[puyo[1] + diff[1]][puyo[0] + diff[0]] === 0)
    })
    if (isExposed) triggerPuyosGroups.push(savePuyos);
  }, 3, false);

  searchBucketShape(board, triggerPuyosGroups);

  for (const triggerPuyos of triggerPuyosGroups) {
    const firstVanish = [triggerPuyos]; // turn into a form of vanishpuyos(double array)
    const virtualBoard = JSON.parse(JSON.stringify(board));
    letPuyosFallVirtually(virtualBoard, firstVanish);

    chainInfo.virtualChainCount = 1;
    chainInfo.virtualChainCount += triggerChainVirtually(virtualBoard);
    if (chainInfo.maxVirtualChainCount < chainInfo.virtualChainCount) {
      chainInfo.maxVirtualChainCount = chainInfo.virtualChainCount;
      chainInfo.maxTriggerPuyos = JSON.parse(JSON.stringify(triggerPuyos));
    }
  }

  function searchBucketShape(board, triggerPuyos) {
    // search puyos which can trigger chain not in threesome
    for (let x = gameConfig.BOARD_LEFT_EDGE; x < gameConfig.BOARD_RIGHT_EDGE; x++) {
      for (let y = gameConfig.BOARD_BOTTOM_EDGE - 1; y > gameConfig.BOARD_TOP_EDGE; y--) {
        if (board[y][x] !== 0 && board[y - 1][x] === 0) {
          // TODO: need more shape
          if (board[y - 1][x - 1] === board[y][x] && board[y][x] === board[y - 1][x + 1]) {
            triggerPuyos.push([[x - 1, y - 1], [x, y], [x + 1, y - 1]]);
          }
          else if (board[y - 1][x - 1] === board[y][x]) {
            if (board[y][x] === board[y][x + 1])
              triggerPuyos.push([[x - 1, y - 1], [x, y], [x + 1, y]]);
            if (x > gameConfig.BOARD_LEFT_EDGE && board[y][x] === board[y - 1][x - 2])
              triggerPuyos.push([[x - 1, y - 1], [x, y], [x - 2, y - 1]]);
            if (y < gameConfig.BOARD_BOTTOM_EDGE - 1 && board[y][x] === board[y + 1][x])
              triggerPuyos.push([[x - 1, y - 1], [x, y], [x, y + 1]]);
            if (y > gameConfig.BOARD_TOP_EDGE && board[y][x] === board[y - 2][x - 1])
              triggerPuyos.push([[x - 1, y - 1], [x, y], [x - 1, y - 2]]);
          }
          else if (board[y - 1][x + 1] === board[y][x]) {
            if (board[y][x] === board[y][x - 1])
              triggerPuyos.push([[x + 1, y - 1], [x, y], [x - 1, y]]);
            if (x < gameConfig.BOARD_RIGHT_EDGE - 1 && board[y][x] === board[y - 1][x + 2])
              triggerPuyos.push([[x + 1, y - 1], [x, y], [x + 2, y - 1]]);
            if (y < gameConfig.BOARD_BOTTOM_EDGE - 1 && board[y][x] === board[y + 1][x])
              triggerPuyos.push([[x + 1, y - 1], [x, y], [x, y + 1]]);
            if (y > gameConfig.BOARD_TOP_EDGE && board[y][x] === board[y - 2][x + 1])
              triggerPuyos.push([[x - 1, y - 1], [x, y], [x + 1, y - 2]]);
          }
          break;
        }
      }
    }
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
      for (let aboveY = lowestY - 1; aboveY >= gameConfig.BOARD_TOP_EDGE - 1; aboveY--) {
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
function handleSplitting(setNextState) {
  // TODO: dont be stupid
  const splittedX = splittedPuyo.splittedX;
  const splittedY = splittedPuyo.splittedY;
  const nextY = movePuyoDown(splittedY, 12.0);

  // need to verify this condition
  if (nextY >= gameConfig.BOARD_BOTTOM_EDGE - 1 || board[Math.floor(nextY) + 1][splittedX] !== gameConfig.NO_COLOR) {
    splittedPuyo.splittedY = Math.floor(nextY);

    lockPuyo(board, splittedPuyo.splittedX, splittedPuyo.splittedY, splittedPuyo.splittedColor, recordPuyoSteps.MANIPULATE_PUYO_REC_FLAG);

    splittedPuyo = {};
    setNextState();
  } else {
    splittedPuyo.splittedY = nextY;
  }
}

function isGameOver() {
  return board[gameConfig.BOARD_TOP_EDGE][gameConfig.PUYO_BIRTH_POSX] !== gameConfig.NO_COLOR;
}

function canTakeInput() {
  return (currentState === gameState.MANIPULATING)
}

function inputHandle() {
  throttleHandler();
}

function downKeyHandle() {
  // if (!canTakeInput()) return;

  if (keyInputState.isDownKeyPressed) {
    let keyMoveDownRate = 15.0;
    // I'm afraid of more than 0.5, which could get this world upside down
    if (keyMoveDownRate * gameConfig.moveYDiff >= 0.5) keyMoveDownRate = 0.5 / gameConfig.moveYDiff;
    if (canPuyoMoveDown(keyMoveDownRate)) {
      currentPuyo.parentY = movePuyoDown(currentPuyo.parentY, keyMoveDownRate);
    } else if (currentPuyo && canPuyoMoveDown(keyMoveDownRate / 2)) {
      currentPuyo.parentY = movePuyoDown(currentPuyo.parentY, keyMoveDownRate / 2);
    } else if (currentPuyo && canPuyoMoveDown(keyMoveDownRate / 4)) {
      currentPuyo.parentY = movePuyoDown(currentPuyo.parentY, keyMoveDownRate / 4);
    } else {
      // get puyo being able to lock immediately
      // TODO: find good timing or consider better logic
      lockingInfo.lockWaitCount = gameConfig.LOCK_WAIT_TIME;
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
    if (e.key === 'ArrowLeft') { keyInputState.isLeftKeyPressed = true; }
    if (e.key === 'ArrowRight') { keyInputState.isRightKeyPressed = true; }
    if (e.key === 'ArrowDown') { keyInputState.isDownKeyPressed = true; }
    if (e.key === 'z') { rotatePuyo(-90); }
    if (e.key === 'x') { rotatePuyo(90); }
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
  // }
});

function keyInputInit() {
  keyInputState.isDownKeyPressed = false;
  keyInputState.isRightKeyPressed = false;
  keyInputState.isLeftKeyPressed = false;
}

function moveHorStart(parentX, direction) {
  movingHorDrawing.isMovingHor = true;
  movingHorDrawing.targetX = parentX + direction;
  movingHorDrawing.moveXDiff = direction / gameConfig.HOR_MOVING_TIME;
  movingHorDrawing.drawingX = parentX;

  return parentX + direction;
}

function movePuyoHor() {
  const targetX = movingHorDrawing.targetX;
  const diff = movingHorDrawing.moveXDiff;

  movingHorDrawing.drawingX += diff;
  if (Math.abs(targetX - movingHorDrawing.drawingX) < Math.abs(diff) * ((gameConfig.HOR_MOVING_TIME + 1) / gameConfig.HOR_MOVING_TIME)) {
    movingHorDrawing.drawingX = targetX; // is this necessary?
    movingHorDrawing.isMovingHor = false;
  }
}
function movePuyoHor_ori(parentX, direction) {
  movingHorDrawing.isMovingHor = true;
  // movingHorState.moveXDiff = direction / HOR_MOVING_TIME;
  movingHorDrawing.targetX = parentX + direction;
  movingHorDrawing.drawingX = parentX;
  return parentX + direction;
}

function movePuyoDown(parentY, rate) {
  return parentY + gameConfig.moveYDiff * rate;
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
    // if (nextX < gameConfig.BOARD_LEFT_EDGE || board[Math.floor(parentY)][nextX] !== gameConfig.NO_COLOR || board[Math.round(parentY)][nextX] !== gameConfig.NO_COLOR) {
    if (nextX < gameConfig.BOARD_LEFT_EDGE || board[Math.floor(parentY)][nextX] !== gameConfig.NO_COLOR || board[Math.floor(parentY) + 1][nextX] !== gameConfig.NO_COLOR) {
      return false;
    }
    return true;
  } else if (angle === 0 || angle === 180) {
    const nextX = Math.round(parentX) - 1;
    // **one condition below is unnecessary
    if (nextX < gameConfig.BOARD_LEFT_EDGE ||
      board[Math.floor(parentY)][nextX] !== gameConfig.NO_COLOR ||
      board[Math.floor(parentY) + 1][nextX] !== gameConfig.NO_COLOR ||
      board[Math.floor(childY)][nextX] !== gameConfig.NO_COLOR ||
      // TODO: if childY is integer this is bad
      board[Math.floor(childY) + 1][nextX] !== gameConfig.NO_COLOR
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
    // if (nextX >= gameConfig.BOARD_WIDTH || board[Math.floor(parentY)][nextX] !== gameConfig.NO_COLOR || board[Math.round(parentY)][nextX] !== gameConfig.NO_COLOR) {
    if (nextX >= gameConfig.BOARD_RIGHT_EDGE || board[Math.floor(parentY)][nextX] !== gameConfig.NO_COLOR || board[Math.floor(parentY) + 1][nextX] !== gameConfig.NO_COLOR) {
      return false;
    }
    return true;
  } else if (angle === 0 || angle === 180) {
    const nextX = Math.round(parentX) + 1;
    // **one condition below is unnecessary
    if (nextX >= gameConfig.BOARD_RIGHT_EDGE ||
      board[Math.floor(parentY)][nextX] !== gameConfig.NO_COLOR ||
      // board[Math.round(parentY)][nextX] !== gameConfig.NO_COLOR ||
      board[Math.floor(parentY) + 1][nextX] !== gameConfig.NO_COLOR ||
      board[Math.floor(childY)][nextX] !== gameConfig.NO_COLOR ||
      board[Math.floor(childY) + 1][nextX] !== gameConfig.NO_COLOR
    ) {
      return false;
    }
    return true;
  }
}

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
    canRotate = true;
  } else if (rotatedPuyo.angle === 90) {
    // left is empty? if not, can move right? if not, cannot rotate
    const nextX = rotatedChildX;
    if (nextX >= gameConfig.BOARD_LEFT_EDGE &&
      // currentChildY + 1 < gameConfig.BOARD_HEIGHT &&
      board[Math.floor(currentChildY)][nextX] == gameConfig.NO_COLOR &&
      // board[Math.floor(currentChildY) + 1][nextX] == gameConfig.NO_COLOR &&
      board[Math.floor(rotatedChildY)][nextX] == gameConfig.NO_COLOR &&
      board[Math.floor(rotatedChildY) + 1][nextX] == gameConfig.NO_COLOR
    ) {
      canRotate = true;
    } else if (canPuyoMoveRight(rotatedPuyo)) {
      // TODO: movestart instead of letting puyo actually move here?
      rotatedPuyo.parentX = movePuyoHor_ori(rotatedPuyo.parentX, 1.0);
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
    if (nextX < gameConfig.BOARD_RIGHT_EDGE &&
      // currentChildY + 1 < gameConfig.BOARD_HEIGHT &&
      board[Math.floor(rotatedChildY)][nextX] == gameConfig.NO_COLOR &&
      board[Math.floor(rotatedChildY) + 1][nextX] == gameConfig.NO_COLOR &&
      board[Math.floor(currentChildY)][nextX] == gameConfig.NO_COLOR
      // && board[Math.floor(currentChildY) + 1][nextX] == gameConfig.NO_COLOR
    ) {
      canRotate = true;
    } else if (canPuyoMoveLeft(rotatedPuyo)) {
      rotatedPuyo.parentX = movePuyoHor_ori(rotatedPuyo.parentX, -1.0);
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
    if (rotatedChildY >= gameConfig.BOARD_BOTTOM_EDGE - 1 || //<- is this ok? need to check
      board[Math.floor(rotatedChildY) + 1][rotatedChildX] !== gameConfig.NO_COLOR // ||
      // board[Math.floor(rotatedChildY) + 1][currentChildX] !== gameConfig.NO_COLOR
    ) {
      // TODO: some animation at push up?
      rotatedPuyo.parentY = Math.floor(rotatedPuyo.parentY) - 0.5; // for mawashi??
    }
    canRotate = true;
  }

  if (canRotate) {
    setRotateDrawing(changeAngle, currentPuyo.angle);
    currentPuyo = rotatedPuyo;
    return;
  }

  function setRotateDrawing(changeAngle, prevAngle) {
    rotateDrawing.isRotating = true;
    rotateDrawing.changeAngle = changeAngle;
    rotateDrawing.prevAngle = prevAngle;
  }
}

// Start the game
setState(gameState.OPENING);
gameLoop();


addEventListener('keydown', e => {
  if (e.key === 'D') {
    console.log('debugdebudguedbuedueg');
  }
})

function htmlUpdate() {
  const chainNumShow = document.getElementById("chainCount");
  chainNumShow.textContent = `${chainInfo.chainCount} 連鎖    最大${chainInfo.maxVirtualChainCount}連鎖可能`
}

const pauseButton = document.getElementById("pauseButton");
const undoButton = document.getElementById("undoButton");

pauseButton.addEventListener('click', e => {
  if (currentState !== gameState.PAUSING) setState(gameState.PAUSING);
  else setState(prevState);
})
document.addEventListener('keydown', e => {
  if (e.key === 'P') {
    if (currentState !== gameState.PAUSING) setState(gameState.PAUSING);
    else setState(prevState);
  }
})

undoButton.addEventListener('click', e => {
  // if (gameState.isPaused || gameOver) {
  //   recordPuyoSteps.undo(board);
  // }
})
