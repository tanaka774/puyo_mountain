import throttle from "./util/throttle.js";
//
// Constants
const canvas = document.getElementById('tetrisCanvas');
const ctx = canvas.getContext('2d');
const CELL_SIZE = 20;
// what are used as index are 
// x:BOARD_LEFT_EDGE ~ BOARD_RIGHT_EDGE - 1
// y:BOARD_TOP_EDGE ~ BOARD_BOTTOM_EDGE - 1
const BOARD_LEFT_EDGE = 1;
const BOARD_RIGHT_EDGE = 1 + canvas.width / CELL_SIZE;// - 1;
const BOARD_TOP_EDGE = 2;
const BOARD_BOTTOM_EDGE = 2 + canvas.height / CELL_SIZE;// - 1;
const NO_COLOR = 0;
const PUYO_BIRTH_POSX = Math.floor((BOARD_LEFT_EDGE + BOARD_RIGHT_EDGE) / 2) - 1;
const PUYO_BIRTH_POSY = BOARD_TOP_EDGE - 1;
const TETRIMINO_COLORS = [
  null,
  '#FF0D72',
  '#0DC2FF',
  '#0DFF72',
  '#F538FF',
  '#FF8E0D',
  '#FFE138',
  '#3877FF'
];

const basePuyo = {
  parentX: PUYO_BIRTH_POSX,
  parentY: PUYO_BIRTH_POSY,
  parentColor: 1,
  childColor: 2,
  angle: 0,
};

const getChildPos = (puyo) => {
  let childX, childY;
  // TODO: do smarter
  if (puyo.angle === 0) { childX = puyo.parentX; childY = puyo.parentY + 1; }
  else if (puyo.angle === 90) { childX = puyo.parentX - 1; childY = puyo.parentY; }
  else if (puyo.angle === 180) { childX = puyo.parentX; childY = puyo.parentY - 1; }
  else if (puyo.angle === 270) { childX = puyo.parentX + 1; childY = puyo.parentY; }
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
const LOCK_WAIT_TIME = 60;

const floatingPuyo = {
  posX: -1,
  posY: -1,
  color: -1,
};

let floatingPuyos = [];
let vanishPuyos = [];
// store board status temporarily when vanishing 
let temp_board = createBoard();

let splittedPuyo = {
  splittedX: -1,
  splittedY: -1,
  splittedColor: 1,
  unsplittedX: -1,
  unsplittedY: -1,
  unsplittedColor: 2,
};


// TODO: put split-state and gameover (and game uninit?) into here
const gameState = {
  isBeingSplitted: false,
  chainProcessing: false,
  chainVanishWaitCount: 0,
  lockWaitCount: 0,
  isLocked: false,
  isInitialized: false,
};

const keyInputState = {
  isRightKeyPressed: false,
  isLeftKeyPressed: false,
  isDownKeyPressed: false,
  willRotateCW: false, // clockwise, +90
  willRotateACW: false, // anti-clockwise, -90
}

// TODO: do smarter
// const downThrottleHandler = throttle(downKeyHandle, 10);
// const horThrottleHandler = throttle(horKeyhandle, 20);
// const rotateThrottleHandler = throttle(rotateKeyHandle, 80);

function throttleInitializer() {
  let downThrottleHandler;
  let horThrottleHandler;
  let rotateThrottleHandler;
  let initialized = false;
  return function() {
    if (!initialized) {
      downThrottleHandler = throttle(downKeyHandle, 10); // not affecting with value less than this(10)
      horThrottleHandler = throttle(horKeyhandle, 60);
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
  // currentPuyo = getRandomPuyo();
  beforeNext();
  draw();
  gameState.isInitialized = true;
  update();
}

// Create an empty game board
function createBoard() {
  // return Array.from(
  const board = Array.from(
    { length: (BOARD_BOTTOM_EDGE - BOARD_TOP_EDGE) + 3 },
    () => Array((BOARD_RIGHT_EDGE - BOARD_TOP_EDGE) + 2).fill(NO_COLOR));
  for (let y = 0; y <= BOARD_BOTTOM_EDGE; y++) {
    board[y][BOARD_LEFT_EDGE - 1] = 99;
    board[y][BOARD_RIGHT_EDGE] = 99;
  }
  for (let x = BOARD_LEFT_EDGE - 1; x <= BOARD_RIGHT_EDGE; x++) {
    board[BOARD_BOTTOM_EDGE][x] = 99;
  }
  // returning reference is okay?
  return board;
}

// Get a random Tetrimino piece
function getRandomPuyo() {
  const newPuyo = { ...basePuyo };
  newPuyo.parentColor = Math.floor(Math.random() * 4) + 1;
  newPuyo.childColor = Math.floor(Math.random() * 4) + 1;
  // newPuyo.parentX = Math.floor(BOARD_RIGHT_EDGE / 2) - 1;
  newPuyo.parentX = PUYO_BIRTH_POSX
  newPuyo.parentY = PUYO_BIRTH_POSY;
  return newPuyo;
}

function beforeNext() {
  currentPuyo = (gameState.isInitialized) ? nextPuyo : getRandomPuyo();
  nextPuyo = (nextPuyo !== null) ? doubleNextPuyo : getRandomPuyo();
  doubleNextPuyo = getRandomPuyo();
  gameState.lockWaitCount = 0;
  // keyInputInit();
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
        // ctx.fillStyle = TETRIMINO_COLORS[cell];
        // ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        drawPuyo(x, y, cell)
      }
    }
  }

  // draw floating puyos
  if (gameState.chainProcessing) {
    if (gameState.chainVanishWaitCount >= VANISH_WAIT_TIME) {
      for (const floatingPuyo of floatingPuyos) {
        // ctx.fillStyle = TETRIMINO_COLORS[floatingPuyo.color];
        // ctx.fillRect(floatingPuyo.posX * CELL_SIZE, floatingPuyo.posY * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        drawPuyo(floatingPuyo.posX, floatingPuyo.posY, floatingPuyo.color);
      }
    }
    return;
  }

  // draw splittedPuyo
  if (gameState.isBeingSplitted && splittedPuyo) {
    // ctx.fillStyle = TETRIMINO_COLORS[splittedPuyo.splittedColor];
    // ctx.fillRect(splittedPuyo.splittedX * CELL_SIZE, splittedPuyo.splittedY * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    drawPuyo(splittedPuyo.splittedX, splittedPuyo.splittedY, splittedPuyo.splittedColor);

    // ctx.fillStyle = TETRIMINO_COLORS[splittedPuyo.unsplittedColor];
    // ctx.fillRect(splittedPuyo.unsplittedX * CELL_SIZE, splittedPuyo.unsplittedY * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    drawPuyo(splittedPuyo.unsplittedX, splittedPuyo.unsplittedY, splittedPuyo.unsplittedColor);
  }

  // draw currentPuyo
  if (currentPuyo) { // <- is this condition necessary?
    // ctx.fillStyle = TETRIMINO_COLORS[currentPuyo.parentColor];
    // ctx.fillRect(currentPuyo.parentX * CELL_SIZE, currentPuyo.parentY * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    drawPuyo(currentPuyo.parentX, currentPuyo.parentY, currentPuyo.parentColor);

    const [childX, childY] = getChildPos(currentPuyo);
    // ctx.fillStyle = TETRIMINO_COLORS[currentPuyo.childColor];
    // ctx.fillRect(childX * CELL_SIZE, childY * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    drawPuyo(childX, childY, currentPuyo.childColor);
  }

  function drawPuyo(x, y, color) {
    ctx.fillStyle = TETRIMINO_COLORS[color];
    ctx.fillRect((x - BOARD_LEFT_EDGE) * CELL_SIZE, (y - BOARD_TOP_EDGE) * CELL_SIZE, CELL_SIZE, CELL_SIZE);
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
}


// Update the game state
function update() {
  if (!gameOver) {
    inputHandle();
    // throttleHandler();
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
    // TODO? record previous pos and animate slide between old and new pos
    draw();
  }
  requestAnimationFrame(update);
}

// Check if the current piece can move down
function canPuyoMoveDown(rate = 1.0) {
  const parentX = currentPuyo.parentX;
  const parentY = currentPuyo.parentY;
  const [childX, childY] = getChildPos(currentPuyo);
  const angle = currentPuyo.angle;

  // TODO: handle puyo falling on top properly
  // if (board[BOARD_TOP_EDGE + 1][parentX] !== NO_COLOR || board[BOARD_TOP_EDGE + 1][childX] !== NO_COLOR) { return false; }
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
      // TODO: smarter logic
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
      currentPuyo = null;

      return false;
    } else if (nextY >= BOARD_BOTTOM_EDGE) {
      // ちぎり無（のはず）
      return false;
    }
    return true;
  }
}

// Lock the current piece in place
function lockCurrentPuyo() {
  if (gameState.lockWaitCount < LOCK_WAIT_TIME) {
    gameState.lockWaitCount++;
    return false;
  }
  // fix Y position into integer
  currentPuyo.parentY = Math.round(currentPuyo.parentY);
  // currentPuyo.parentY = 1 + Math.floor(currentPuyo.parentY);

  const [childX, childY] = getChildPos(currentPuyo);
  board[currentPuyo.parentY][currentPuyo.parentX] = currentPuyo.parentColor;
  board[childY][childX] = currentPuyo.childColor;
  // gameState.lockWaitCount = 0;
  return true;
}

function handleChain() {
  if (!gameState.chainProcessing) {
    let connectedPuyos = 0;
    const checkedCells = Array.from({ length: BOARD_BOTTOM_EDGE }, () => Array(BOARD_RIGHT_EDGE).fill(false));
    // TODO: don't want to check every cell
    for (let y = BOARD_TOP_EDGE; y < BOARD_BOTTOM_EDGE; y++) {
      for (let x = BOARD_LEFT_EDGE; x < BOARD_RIGHT_EDGE; x++) {
        const savePuyos = [];
        connectedPuyos = checkChain(x, y, checkedCells, board[y][x], savePuyos);
        if (connectedPuyos >= 4) {
          vanishPuyos.push(savePuyos);
        }
      }
    }
  }
  if (vanishPuyos.length === 0) { return; }
  if (!gameState.chainProcessing) {
    gameState.chainProcessing = true;
    erasePuyos();
    findFloatingPuyos();
  }

  // some duration
  if (gameState.chainVanishWaitCount < VANISH_WAIT_TIME) {
    gameState.chainVanishWaitCount++;
    return;
  } else if (gameState.chainVanishWaitCount === VANISH_WAIT_TIME) {
    board = JSON.parse(JSON.stringify(temp_board));
    temp_board = [];
    gameState.chainVanishWaitCount++;
    return;
  }

  if (floatingPuyos.length > 0) {
    letFloatingPuyosFall();
  } else {
    gameState.chainProcessing = false;
    vanishPuyos = [];
    gameState.chainVanishWaitCount = 0;
    handleChain();
  }
}

// check whether there is chain and if so, save those puyos
function checkChain(x, y, checkedCells, prevCell, savePuyos) {
  if (checkedCells[y][x] === true) { return 0; }

  let connectedPuyos = 0;
  const cell = board[y][x];
  if (cell === NO_COLOR || cell !== prevCell) {
    return 0;
  } else if (cell === prevCell) {
    savePuyos.push([x, y]);
    checkedCells[y][x] = true;

    connectedPuyos++;
  }

  if (x - 1 >= BOARD_LEFT_EDGE) connectedPuyos += checkChain(x - 1, y, checkedCells, prevCell, savePuyos);
  if (x + 1 < BOARD_RIGHT_EDGE) connectedPuyos += checkChain(x + 1, y, checkedCells, prevCell, savePuyos);
  if (y - 1 >= BOARD_TOP_EDGE) connectedPuyos += checkChain(x, y - 1, checkedCells, prevCell, savePuyos);
  if (y + 1 < BOARD_BOTTOM_EDGE) connectedPuyos += checkChain(x, y + 1, checkedCells, prevCell, savePuyos);

  return connectedPuyos;
}

function erasePuyos() {
  for (const temp of vanishPuyos) {
    for (const vanishPuyo of temp) {
      const [x, y] = [...vanishPuyo];

      //TODO: consider some effect in vanishing
      board[y][x] = NO_COLOR;
    }
  }
}

// store puyos to fall after chain in order of lower puyo(y is high)
function findFloatingPuyos() {
  const allVanishPuyos = [];
  for (const temp of vanishPuyos) {
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
    for (let aboveY = lowestY - 1; aboveY >= BOARD_TOP_EDGE; aboveY--) {
      // ignore cells included in allVanishPuyos
      if (allVanishPuyos.some((cur) => cur[0] === lowestX && cur[1] === aboveY)) continue;
      // go check next lowestX
      if (board[aboveY][lowestX] === NO_COLOR) break;

      floatingPuyo.posX = lowestX;
      floatingPuyo.posY = aboveY;
      floatingPuyo.color = board[aboveY][lowestX];
      // delegate drawing to floatingpuyo
      // board[aboveY][lowestX] = NO_COLOR;
      temp_board[aboveY][lowestX] = NO_COLOR;

      floatingPuyos.push({ ...floatingPuyo });
    }
  }
}

function letFloatingPuyosFall() {
  for (const floatingPuyo of floatingPuyos) {
    const nextY = movePuyoDown(floatingPuyo.posY, 6.0);
    if (nextY >= BOARD_BOTTOM_EDGE - 1 || board[Math.floor(nextY) + 1][floatingPuyo.posX] !== NO_COLOR) {
      // be careful
      // floatingPuyo.posY = Math.round(nextY);
      floatingPuyo.posY = Math.floor(nextY);

      board[floatingPuyo.posY][floatingPuyo.posX] = floatingPuyo.color;

      // remove fixed puyo from floatingPuyos(array)
      floatingPuyos =
        floatingPuyos.filter((cur) => !(cur["posX"] === floatingPuyo.posX && cur["posY"] === floatingPuyo.posY));
    } else {
      floatingPuyo.posY = nextY;
    }
  }
}

// splittedpuyo falls off until it hits some puyo or bottom and lock pos
function handleSplitting() {
  // TODO: dont be stupid
  const splittedX = splittedPuyo.splittedX;
  const splittedY = splittedPuyo.splittedY;
  const nextY = movePuyoDown(splittedY, 5.0);

  // need to verify this condition
  if (nextY >= BOARD_BOTTOM_EDGE - 1 || board[Math.floor(nextY) + 1][splittedX] !== NO_COLOR) {

    // TODO: these should be done in lockpuyo(), I guess
    splittedPuyo.splittedY = Math.floor(nextY);

    board[splittedPuyo.splittedY][splittedPuyo.splittedX] = splittedPuyo.splittedColor;
    board[splittedPuyo.unsplittedY][splittedPuyo.unsplittedX] = splittedPuyo.unsplittedColor;

    gameState.isBeingSplitted = false;
    splittedPuyo = {};
    gameState.isLocked = true;
  } else {
    splittedPuyo.splittedY = nextY;
  }
}

// Check if the game is over
function isGameOver() {
  // TODO: if the middle of top is filled
  // return board[BOARD_TOP_EDGE].some(cell => cell !== NO_COLOR);
  return board[BOARD_TOP_EDGE][PUYO_BIRTH_POSX] !== NO_COLOR;
}

function canTakeInput() {
  return !gameOver && !gameState.isBeingSplitted && !gameState.chainProcessing;
}

function inputHandle() {
  if (canTakeInput()) throttleHandler();
}

function downKeyHandle() {
  if (keyInputState.isDownKeyPressed) {
    let keyMoveDownRate = 10.0;
    // I'm afraid of more than 0.5, which could get this world upside down
    if (keyMoveDownRate * moveYDiff >= 0.5) keyMoveDownRate = 0.5 / moveYDiff;
    if (canPuyoMoveDown(keyMoveDownRate)) {
      currentPuyo.parentY = movePuyoDown(currentPuyo.parentY, keyMoveDownRate);
    } else {
      // get puyo being able to lock immediately
      gameState.lockWaitCount = LOCK_WAIT_TIME;
    }
  }
}
function horKeyhandle() {
  if (keyInputState.isRightKeyPressed) {
    if (canPuyoMoveRight()) {
      currentPuyo.parentX = movePuyoHor(currentPuyo.parentX, 1.0);
    }
  }
  if (keyInputState.isLeftKeyPressed) {
    if (canPuyoMoveLeft()) {
      currentPuyo.parentX = movePuyoHor(currentPuyo.parentX, -1.0);
    }
  }
}
// function rotateKeyHandle() {
//   if (keyInputState.willRotateCW) {
//     rotatePuyo(90);
//   }
//   if (keyInputState.willRotateACW) {
//     rotatePuyo(-90);
//   }
// }

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
    if (e.key === 'ArrowUp' || e.key === 'z') {
      // keyInputState.willRotateACW = true;
      rotatePuyo(-90);
    }
    if (e.key === 'x') {
      // keyInputState.willRotateCW = true;
      rotatePuyo(90);
    }
  } else {
    keyInputInit();
    // keyInputState.willRotateCW = false;
    // keyInputState.willRotateACW = false;
    // keyInputState.isDownKeyPressed = false;
    // keyInputState.isRightKeyPressed = false;
    // keyInputState.isLeftKeyPressed = false;
  }
});

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

function movePuyoHor(parentX, direciton) {
  return parentX + direciton;
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

  // anytime puyo can rotate in this case
  if (rotatedPuyo.angle === 180) {
    currentPuyo = rotatedPuyo;
    return; // ok?
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
      currentPuyo = rotatedPuyo;
      return;
    } else if (canPuyoMoveRight(rotatedPuyo)) {
      rotatedPuyo.parentX = movePuyoHor(rotatedPuyo.parentX, 1.0);
      currentPuyo = rotatedPuyo;
      return;
    } else {
      // stuck and cannot move
      // or quickturn?
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
      currentPuyo = rotatedPuyo;
      return;
    } else if (canPuyoMoveLeft(rotatedPuyo)) {
      rotatedPuyo.parentX = movePuyoHor(rotatedPuyo.parentX, -1.0);
      currentPuyo = rotatedPuyo;
      return;
    } else {
      // stuck and cannot move
      // or quickturn?
      return;
    }
  } else if (rotatedPuyo.angle === 0) {
    // if there is something below, push up by one cell
    if (rotatedChildY >= BOARD_BOTTOM_EDGE - 1 || //<- is this ok? need to check
      board[Math.floor(rotatedChildY) + 1][rotatedChildX] !== NO_COLOR // ||
      // board[Math.floor(rotatedChildY) + 1][currentChildX] !== NO_COLOR
    ) {
      rotatedPuyo.parentY = Math.floor(rotatedPuyo.parentY);
    }
    currentPuyo = rotatedPuyo;
    return;
  }
}

// Start the game
init();

