// Constants
const canvas = document.getElementById('tetrisCanvas');
const ctx = canvas.getContext('2d');
const CELL_SIZE = 20;
const BOARD_WIDTH = canvas.width / CELL_SIZE;
const BOARD_HEIGHT = canvas.height / CELL_SIZE;
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
  parentX: 0,
  parentY: 0,
  parentColor: 1,
  childColor: 2,
  angle: 0,
  isBeingSplitted: false,
  splittedX: -1,
  splittedY: -1,
  splittedColor: 1,
  unsplittedX: -1,
  unsplittedY: -1,
  unsplittedColor: 2,
};

const getChildPos = (puyo) => {
  let childX, childY;
  // if (!puyo.isBeingSplitted) {
  if (true) { // temp
    // TODO: do smarter
    if (puyo.angle === 0) { childX = puyo.parentX; childY = puyo.parentY + 1; }
    else if (puyo.angle === 90) { childX = puyo.parentX - 1; childY = puyo.parentY; }
    else if (puyo.angle === 180) { childX = puyo.parentX; childY = puyo.parentY - 1; }
    else if (puyo.angle === 270) { childX = puyo.parentX + 1; childY = puyo.parentY; }
  } else {

  }
  return [childX, childY];
};


// Game state
let board = [];
let currentPuyo = null;
let gameOver = false;
const moveYDiff = 0.06;
const VANISH_WAIT_TIME = 30;

const floatingPuyo = {
  posX: -1,
  posY: -1,
  color: -1,
};

let floatingPuyos = [];
let vanishPuyos = [];
let temp_board = createBoard();


// TODO: put split-state and gameover (and game uninit?) into here
const gameState = {
  chainProcessing: false,
  chainVanishWaitCount: 0,
};

// Initialize the game
function init() {
  board = createBoard();
  currentPuyo = getRandomPuyo();
  currentPuyo.parentX = Math.floor(BOARD_WIDTH / 2);
  currentPuyo.parentY = 0;
  try {
    draw();
    update();
  } catch (err) {
    console.log(currentPuyo);
    console.error(err);
  }
}

// Create an empty game board
function createBoard() {
  return Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0));
}

// Get a random Tetrimino piece
function getRandomPuyo() {
  const newPuyo = { ...basePuyo };
  newPuyo.parentColor = Math.floor(Math.random() * 4) + 1;;
  newPuyo.childColor = Math.floor(Math.random() * 4) + 1;;
  return newPuyo;
}

// Draw the game board and current piece
function draw() {
  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Draw the board
  for (let y = 0; y < BOARD_HEIGHT; y++) {
    for (let x = 0; x < BOARD_WIDTH; x++) {
      const cell = board[y][x];
      if (cell !== 0) {
        ctx.fillStyle = TETRIMINO_COLORS[cell];
        ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }
    }
  }
  // Draw the current piece
  if (gameState.chainProcessing) {
    if (gameState.chainVanishWaitCount >= VANISH_WAIT_TIME) {
      for (const floatingPuyo of floatingPuyos) {
        ctx.fillStyle = TETRIMINO_COLORS[floatingPuyo.color];
        ctx.fillRect(floatingPuyo.posX * CELL_SIZE, floatingPuyo.posY * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }
    }
    return;
  }
  if (currentPuyo) { // <- is this condition necessary?
    if (currentPuyo.isBeingSplitted) {
      ctx.fillStyle = TETRIMINO_COLORS[currentPuyo.splittedColor];
      ctx.fillRect(currentPuyo.splittedX * CELL_SIZE, currentPuyo.splittedY * CELL_SIZE, CELL_SIZE, CELL_SIZE);

      ctx.fillStyle = TETRIMINO_COLORS[currentPuyo.unsplittedColor];
      ctx.fillRect(currentPuyo.unsplittedX * CELL_SIZE, currentPuyo.unsplittedY * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    } else {
      ctx.fillStyle = TETRIMINO_COLORS[currentPuyo.parentColor];
      ctx.fillRect(currentPuyo.parentX * CELL_SIZE, currentPuyo.parentY * CELL_SIZE, CELL_SIZE, CELL_SIZE);

      const [childX, childY] = getChildPos(currentPuyo);
      ctx.fillStyle = TETRIMINO_COLORS[currentPuyo.childColor];
      ctx.fillRect(childX * CELL_SIZE, childY * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
  }
}

// Update the game state
function update() {
  if (!gameOver) {
    if (!currentPuyo.isBeingSplitted &&
      !gameState.chainProcessing &&
      canPuyoMoveDown()
    ) {
      currentPuyo.parentY = movePuyoDown(currentPuyo.parentY, 1.0);
    } else {
      try {
        if (currentPuyo.isBeingSplitted) {
          handleSplitting();

          if (!currentPuyo.isBeingSplitted) {
            handleChain();
          }
        } else {
          if (!gameState.chainProcessing) { lockPuyo(); }
          handleChain();
        }
      } catch (err) {
        console.log(currentPuyo);
        console.error(err);
      }
      if (!gameState.chainProcessing && isGameOver()) {
        gameOver = true;
        // alert('Game Over');
      } else if (!currentPuyo.isBeingSplitted && !gameState.chainProcessing) {
        currentPuyo = getRandomPuyo();
        currentPuyo.parentX = Math.floor(BOARD_WIDTH / 2);
        currentPuyo.parentY = 0;
      }
    }
    // TODO? record previous pos and animate slide between old and new pos
    draw();
  }
  requestAnimationFrame(update);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function makeDuration(count) {
  for (let n = count; n > 0; n--) {
    // meaningless
    let boo = false;
    boo = true;
  }
}

// Check if the current piece can move down
// TODO: ちぎりの確認ここでやる？
function canPuyoMoveDown() {
  // if (currentPuyo.isBeingSplitted || gameState.chainProcessing) { return false; }

  const parentX = currentPuyo.parentX;
  const parentY = currentPuyo.parentY;
  const [childX, childY] = getChildPos(currentPuyo);
  const angle = currentPuyo.angle;

  if (parentY + moveYDiff < Math.round(parentY)) { return true; }

  if (angle === 0 || angle === 180) {
    const downY = angle === 0 ? childY : parentY;
    const nextY = Math.round(downY) + 1;
    if (nextY >= BOARD_HEIGHT || board[nextY][parentX] !== 0) {
      return false;
    }
    return true;
  } else if (angle === 90 || angle === 270) {
    const nextY = Math.round(parentY) + 1;
    if (nextY >= BOARD_HEIGHT || (board[nextY][parentX] !== 0 && board[nextY][childX] !== 0)) {
      // ちぎり無（のはず）
      return false;
    } else if (board[nextY][parentX] !== 0) {
      // TODO: 子側でちぎり（のはず）
      currentPuyo.isBeingSplitted = true;
      currentPuyo.splittedX = childX;
      currentPuyo.splittedY = childY;
      currentPuyo.splittedColor = currentPuyo.childColor;
      currentPuyo.unsplittedX = parentX;
      currentPuyo.unsplittedY = Math.round(parentY);
      currentPuyo.unsplittedColor = currentPuyo.parentColor;

      return false;
    } else if (board[nextY][childX] !== 0) {
      // TODO: 親側でちぎり（のはず）
      currentPuyo.isBeingSplitted = true;
      currentPuyo.splittedX = parentX;
      currentPuyo.splittedY = parentY;
      currentPuyo.splittedColor = currentPuyo.parentColor;
      currentPuyo.unsplittedX = childX;
      currentPuyo.unsplittedY = Math.round(childY);
      currentPuyo.unsplittedColor = currentPuyo.childColor;

      return false;
    } else if (nextY >= BOARD_HEIGHT) {
      // ちぎり無（のはず）
      return false;
    }
    return true;
  }
}

// Lock the current piece in place
function lockPuyo() {
  // fix Y position into integer
  currentPuyo.parentY = Math.round(currentPuyo.parentY);
  // currentPuyo.parentY = 1 + Math.floor(currentPuyo.parentY);

  const [childX, childY] = getChildPos(currentPuyo);
  board[currentPuyo.parentY][currentPuyo.parentX] = currentPuyo.parentColor;
  board[childY][childX] = currentPuyo.childColor;
}

function handleChain() {
  if (!gameState.chainProcessing) {
    let connectedPuyos = 0;
    const checkedCells = Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(false));
    // TODO: don't want to check every cell
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
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
    findChainingPuyos();
  }

  // some duration
  if (gameState.chainVanishWaitCount < VANISH_WAIT_TIME) {
    gameState.chainVanishWaitCount++;
    return;
  } else if (gameState.chainVanishWaitCount === VANISH_WAIT_TIME) {
    board = JSON.parse(JSON.stringify(temp_board));
    temp_board = [];
    gameState.chainVanishWaitCount++;
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
  if (cell === 0 || cell !== prevCell) {
    return 0;
  } else if (cell === prevCell) {
    savePuyos.push([x, y]);
    checkedCells[y][x] = true;

    connectedPuyos++;
  }

  if (x - 1 >= 0) connectedPuyos += checkChain(x - 1, y, checkedCells, prevCell, savePuyos);
  if (x + 1 < BOARD_WIDTH) connectedPuyos += checkChain(x + 1, y, checkedCells, prevCell, savePuyos);
  if (y - 1 >= 0) connectedPuyos += checkChain(x, y - 1, checkedCells, prevCell, savePuyos);
  if (y + 1 < BOARD_HEIGHT) connectedPuyos += checkChain(x, y + 1, checkedCells, prevCell, savePuyos);

  return connectedPuyos;
}

function erasePuyos() {
  for (const temp of vanishPuyos) {
    for (const vanishPuyo of temp) {
      const [x, y] = [...vanishPuyo];

      //TODO: consider some effect in vanishing
      board[y][x] = 0;
    }
  }
}

// delete puyos connecting more than 4, and let puyos above those fall
function findChainingPuyos() {
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
    for (let aboveY = lowestY - 1; aboveY >= 0; aboveY--) {
      if (allVanishPuyos.some((cur) => cur[0] === lowestX && cur[1] === aboveY)) continue;
      if (board[aboveY][lowestX] === 0) break;

      floatingPuyo.posX = lowestX;
      floatingPuyo.posY = aboveY;
      floatingPuyo.color = board[aboveY][lowestX];
      // delegate drawing to floatingpuyo
      // board[aboveY][lowestX] = 0;
      temp_board[aboveY][lowestX] = 0;

      floatingPuyos.push({ ...floatingPuyo });
    }
  }
}

function letFloatingPuyosFall() {
  for (const floatingPuyo of floatingPuyos) {
    const nextY = movePuyoDown(floatingPuyo.posY, 3.0);
    if (nextY >= BOARD_HEIGHT - 1 || board[Math.floor(nextY) + 1][floatingPuyo.posX] !== 0) {
      // be careful
      // floatingPuyo.posY = Math.round(nextY);
      floatingPuyo.posY = Math.floor(nextY);

      board[floatingPuyo.posY][floatingPuyo.posX] = floatingPuyo.color;

      // remove from floatingPuyos(array)
      floatingPuyos =
        floatingPuyos.filter((cur) => cur["posX"] !== floatingPuyo.posX && cur["posY"] !== floatingPuyo.posY);
    } else {
      floatingPuyo.posY = nextY;
    }
  }
}

// splittedpuyo falls off until it hits some puyo or bottom and lock pos
function handleSplitting() {
  const splittedX = currentPuyo.splittedX;
  const splittedY = currentPuyo.splittedY;
  const nextY = movePuyoDown(splittedY, 2.0);

  // need to check this condition
  if (nextY >= BOARD_HEIGHT - 1 || board[Math.floor(nextY) + 1][splittedX] !== 0) {
    currentPuyo.splittedY = Math.floor(nextY);

    board[currentPuyo.splittedY][currentPuyo.splittedX] = currentPuyo.splittedColor;
    board[currentPuyo.unsplittedY][currentPuyo.unsplittedX] = currentPuyo.unsplittedColor;

    currentPuyo.isBeingSplitted = false;
  } else {
    currentPuyo.splittedY = nextY;
  }
}

// Check if the game is over
function isGameOver() {
  // TODO: if the middle of top is filled
  return board[0].some(cell => cell !== 0);
}

function takeInput() {
  return !gameOver && !currentPuyo.isBeingSplitted && !gameState.chainProcessing;
}

// Handle keyboard input
document.addEventListener('keydown', e => {
  try {
    if (takeInput()) {
      if (e.key === 'ArrowLeft') {
        if (canPuyoMoveLeft()) {
          currentPuyo.parentX = movePuyoHor(currentPuyo.parentX, -1.0);
        }
      } else if (e.key === 'ArrowRight') {
        if (canPuyoMoveRight()) {
          currentPuyo.parentX = movePuyoHor(currentPuyo.parentX, 1.0);
        }
      }
    }
  } catch (err) {
    console.log(currentPuyo);
    console.error(err);
  }
});

document.addEventListener('keydown', e => {
  try {
    if (takeInput()) {
      if (e.key === 'ArrowDown') {
        if (canPuyoMoveDown()) {
          currentPuyo.parentY = movePuyoDown(currentPuyo.parentY, 5.0);
        }
      }
    }
  } catch (err) {
    console.log(currentPuyo);
    console.error(err);
  }
});

document.addEventListener('keydown', e => {
  try {
    if (takeInput()) {
      if (e.key === 'ArrowUp' || e.key === 'x') {
        rotatePuyo(-90);
      } else if (e.key === 'z') {
        rotatePuyo(90);
      }
    }
  } catch (err) {
    console.log(currentPuyo);
    console.error(err);
  }
});


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
    if (nextX < 0 || board[Math.floor(parentY)][nextX] !== 0 || board[Math.round(parentY)][nextX] !== 0) {
      return false;
    }
    return true;
  } else if (angle === 0 || angle === 180) {
    const nextX = Math.round(parentX) - 1;
    // **one condition below is unnecessary
    if (nextX < 0 ||
      board[Math.floor(parentY)][nextX] !== 0 ||
      board[Math.round(parentY)][nextX] !== 0 ||
      board[Math.floor(childY)][nextX] !== 0 ||
      board[Math.round(childY)][nextX] !== 0) {
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
    if (nextX >= BOARD_WIDTH || board[Math.floor(parentY)][nextX] !== 0 || board[Math.round(parentY)][nextX] !== 0) {
      return false;
    }
    return true;
  } else if (angle === 0 || angle === 180) {
    const nextX = Math.round(parentX) + 1;
    // **one condition below is unnecessary
    if (nextX >= BOARD_WIDTH ||
      board[Math.floor(parentY)][nextX] !== 0 ||
      board[Math.round(parentY)][nextX] !== 0 ||
      board[Math.floor(childY)][nextX] !== 0 ||
      board[Math.round(childY)][nextX] !== 0) {
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
    if (nextX >= 0 &&
      board[Math.floor(currentChildY)][nextX] == 0 &&
      board[Math.round(currentChildY)][nextX] == 0 &&
      board[Math.floor(rotatedChildY)][nextX] == 0 &&
      board[Math.round(rotatedChildY)][nextX] == 0) {
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
    if (nextX < BOARD_WIDTH &&
      board[Math.floor(rotatedChildY)][nextX] == 0 &&
      board[Math.round(rotatedChildY)][nextX] == 0 &&
      board[Math.floor(currentChildY)][nextX] == 0 &&
      board[Math.round(currentChildY)][nextX] == 0) {
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
    if (rotatedChildY >= BOARD_HEIGHT - 2 || //<- is this ok? need to check
      board[Math.round(rotatedChildY) + 1][rotatedChildX] !== 0 ||
      board[Math.round(rotatedChildY) + 1][currentChildX] !== 0) {
      rotatedPuyo.parentY = Math.floor(rotatedPuyo.parentY);
    }
    currentPuyo = rotatedPuyo;
    return;
  }
}

// Check if the current piece can rotate
// TODO: 回し時の壁蹴り追加、クイックターンも？？？ この関数いる？？？
function canPuyoRotate(rotatedPuyo) {
  const nextX = currentPuyo.parentX;
  // const nextY = currentPuyo.parentY;
  const nextY = Math.round(currentPuyo.parentY);
  for (let y = 0; y < rotatedPuyo.length; y++) {
    for (let x = 0; x < rotatedPuyo[y].length; x++) {
      if (rotatedPuyo[y][x] !== 0) {
        const posX = nextX + x;
        const posY = nextY + y;
        if (
          posX < 0 ||
          posX >= BOARD_WIDTH ||
          posY >= BOARD_HEIGHT ||
          board[posY][posX] !== 0
        ) {
          return false;
        }
      }
    }
  }
  return true;
}

// Start the game
init();
