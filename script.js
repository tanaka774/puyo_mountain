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

// const TETRIMINOS = [
//   [[1, 1]],
//   [[2, 1]],
//   [[3, 1]],
//   [[4, 2]],
// ];

const basePuyo = {
  parentX: 0,
  parentY: 0,
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
// let currentPuyo.parentX = 0;
// let currentPuyo.parentY = 0;
let gameOver = false;
const moveYDiff = 0.3;

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
  // newPuyo.parentColor = Math.round(Math.random() * 4);
  // newPuyo.childColor = Math.round(Math.random() * 4);
  newPuyo.parentColor = 1;
  newPuyo.childColor = 2;
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
  if (currentPuyo) { // <- is this condition necessary?
    ctx.fillStyle = TETRIMINO_COLORS[currentPuyo.parentColor];
    ctx.fillRect(currentPuyo.parentX * CELL_SIZE, currentPuyo.parentY * CELL_SIZE, CELL_SIZE, CELL_SIZE);

    const [childX, childY] = getChildPos(currentPuyo);
    ctx.fillStyle = TETRIMINO_COLORS[currentPuyo.childColor];
    ctx.fillRect(childX * CELL_SIZE, childY * CELL_SIZE, CELL_SIZE, CELL_SIZE);
  }
}

// Update the game state
async function update() {
  if (!gameOver) {
    if (canPuyoMoveDown()) {
      // currentPuyo.parentY++;
      currentPuyo.parentY = movePuyoDown(currentPuyo.parentY);
    } else {
      lockPuyo();
      // check chain instead of this
      // clearLines();
      if (isGameOver()) {
        gameOver = true;
        // alert('Game Over');
      } else {
        currentPuyo = getRandomPuyo();
        currentPuyo.parentX = Math.floor(BOARD_WIDTH / 2);
        currentPuyo.parentY = 0;
      }
    }
    // TODO? record previous pos and animate slide between old and new pos
    let drawCount = 1;
    while (drawCount < 60) {
      draw(drawCount);
      drawCount++;
      await sleep(100 / 1000);
    }
    // draw();
  }
  requestAnimationFrame(update);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Check if the current piece can move down
// TODO: ちぎりの確認ここでやる？
function canPuyoMoveDown() {
  const parentX = currentPuyo.parentX;
  const parentY = currentPuyo.parentY;
  const [childX, childY] = getChildPos(currentPuyo);
  const angle = currentPuyo.angle;

  if (parentY + moveYDiff < Math.round(parentY)) { return true; }

  if (angle === 0 || angle === 180) {
    const downY = angle === 0 ? childY : parentY;
    const nextY = Math.round(downY) + 1;
    if (nextY >= BOARD_HEIGHT || board[nextY][parentX] !== 0) {
      // fix Y position into integer
      currentPuyo.parentY = Math.round(parentY);
      return false;
    }
    return true;
  } else if (angle === 90 || angle === 270) {
    const nextY = Math.round(parentY) + 1;
    if (nextY >= BOARD_HEIGHT || (board[nextY][parentX] !== 0 && board[nextY][childX] !== 0)) {
      // ちぎり無（のはず）
      // fix Y position into integer
      currentPuyo.parentY = Math.round(parentY);
      return false;
    } else if (board[nextY][parentX] !== 0) {
      // TODO: 子側でちぎり（のはず）
      // fix Y position into integer
      currentPuyo.parentY = Math.round(parentY);
      return false;
    } else if (board[nextY][childX] !== 0) {
      // TODO: 親側でちぎり（のはず）
      // fix Y position into integer
      currentPuyo.parentY = Math.round(parentY);
      return false;
    } else if (nextY >= BOARD_HEIGHT) {
      // ちぎり無（のはず）
      // fix Y position into integer
      currentPuyo.parentY = Math.round(parentY);
      return false;
    }
    return true;
  }
}

// Lock the current piece in place
// TODO:ちぎり処理追加
function lockPuyo() {
  const [childX, childY] = getChildPos(currentPuyo);
  board[currentPuyo.parentY][currentPuyo.parentX] = currentPuyo.parentColor;
  board[childY][childX] = currentPuyo.childColor;
}

// Clear completed lines
function clearLines() {
  for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
    if (board[y].every(cell => cell !== 0)) {
      board.splice(y, 1);
      board.unshift(Array(BOARD_WIDTH).fill(0));
    }
  }
}

// Check if the game is over
function isGameOver() {
  // TODO: if the middle of top is filled
  return board[0].some(cell => cell !== 0);
}

// Handle keyboard input
document.addEventListener('keydown', e => {
  try {
    if (!gameOver) {
      if (e.key === 'ArrowLeft') {
        if (canPuyoMoveLeft()) {
          // currentPuyo.parentX--;
          currentPuyo.parentX = movePuyoHor(currentPuyo.parentX, -1.0);
        }
      } else if (e.key === 'ArrowRight') {
        if (canPuyoMoveRight()) {
          // currentPuyo.parentX++;
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
    if (!gameOver) {
      if (e.key === 'ArrowDown') {
        if (canPuyoMoveDown()) {
          // currentPuyo.parentY++;
          currentPuyo.parentY = movePuyoDown(currentPuyo.parentY);
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
    if (!gameOver) {
      if (e.key === 'ArrowUp' || e.key === 'z') {
        rotatePuyo(-90);
      } else if (e.key === 'x') {
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

function movePuyoDown(parentY) {
  return parentY + moveYDiff;
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
