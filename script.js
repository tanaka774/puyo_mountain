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

const TETRIMINOS = [
  // [[0, 0, 0, 0]],
  // [[1, 1], [1, 1]],
  // [[0, 2, 2], [2, 2, 0]],
  // [[3, 3, 0], [0, 3, 3]],
  [[0, 4, 0], [4, 4, 4]],
  [[5, 5, 5], [0, 5, 0]],
  // [[6, 6, 6, 6]],
];

// Game state
let board = [];
let currentPiece = null;
let currentPieceX = 0;
let currentPieceY = 0;
let gameOver = false;
const moveYDiff = 0.3;

// Initialize the game
function init() {
  board = createBoard();
  currentPiece = getRandomPiece();
  currentPieceX = Math.floor((BOARD_WIDTH - currentPiece[0].length) / 2);
  currentPieceY = 0;
  draw();
  update();
}

// Create an empty game board
function createBoard() {
  return Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0));
}

// Get a random Tetrimino piece
function getRandomPiece() {
  const index = Math.floor(Math.random() * (TETRIMINOS.length - 1)) + 1;
  return TETRIMINOS[index];
}

// Draw the game board and current piece
function draw(drawCount) {
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
  if (currentPiece) {
    for (let y = 0; y < currentPiece.length; y++) {
      for (let x = 0; x < currentPiece[y].length; x++) {
        const cell = currentPiece[y][x];
        if (cell !== 0) {
          const posX = (currentPieceX + x) * CELL_SIZE;
          const posY = (currentPieceY + y) * CELL_SIZE;
          ctx.fillStyle = TETRIMINO_COLORS[cell];
          ctx.fillRect(posX, posY, CELL_SIZE, CELL_SIZE);
        }
      }
    }
  }
}

// Update the game state
async function update() {
  if (!gameOver) {
    if (canPieceMoveDown()) {
      // currentPieceY++;
      currentPieceY = movePieceDown(currentPieceY);
    } else {
      lockPiece();
      clearLines();
      if (isGameOver()) {
        gameOver = true;
        // alert('Game Over');
      } else {
        currentPiece = getRandomPiece();
        currentPieceX = Math.floor((BOARD_WIDTH - currentPiece[0].length) / 2);
        currentPieceY = 0;
      }
    }
    // TODO? record previous pos and animate slide between old and new pos
    let drawCount = 1;
    while(drawCount < 30) {
      draw(drawCount);
      drawCount++;
      await sleep(100 / 30);
    }
    // draw();
  }
  requestAnimationFrame(update);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Check if the current piece can move down
function canPieceMoveDown() {
  for (let y = 0; y < currentPiece.length; y++) {
    for (let x = 0; x < currentPiece[y].length; x++) {
      if (currentPiece[y][x] !== 0) {
        if (currentPieceY + moveYDiff < Math.round(currentPieceY)) { continue; }
        // const nextY = currentPieceY + y + 1;
        // why need +1?
        const nextY = Math.round(currentPieceY) + y + 1;
        if (nextY >= BOARD_HEIGHT || board[nextY][currentPieceX + x] !== 0) {
            // fix Y position into integer
            currentPieceY = Math.round(currentPieceY);
          return false;
        }
      }
    }
  }
  return true;
}

// Lock the current piece in place
function lockPiece() {
  for (let y = 0; y < currentPiece.length; y++) {
    for (let x = 0; x < currentPiece[y].length; x++) {
      if (currentPiece[y][x] !== 0) {
        board[currentPieceY + y][currentPieceX + x] = currentPiece[y][x];
      }
    }
  }
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
  return board[0].some(cell => cell !== 0);
}

// Handle keyboard input
document.addEventListener('keydown', e => {
  if (!gameOver) {
    if (e.key === 'ArrowLeft') {
      if (canPieceMoveLeft()) {
        // currentPieceX--;
        currentPieceX = movePieceHor(currentPieceX, -1.0);
      }
    } else if (e.key === 'ArrowRight') {
      if (canPieceMoveRight()) {
        // currentPieceX++;
        currentPieceX = movePieceHor(currentPieceX, 1.0);
      }
    } else if (e.key === 'ArrowDown') {
      if (canPieceMoveDown()) {
        // currentPieceY++;
        currentPieceY = movePieceDown(currentPieceY);
      }
    } else if (e.key === 'ArrowUp' || e.key === 'z') {
      rotatePiece(-90);
    }  else if (e.key === 'x') {
      rotatePiece(90);
    } 
  }
});

function movePieceHor(currentPieceX, direciton) {
  return currentPieceX + direciton;
}

function movePieceDown(currentPieceY) {
  return currentPieceY + moveYDiff;
}

// Check if the current piece can move left
function canPieceMoveLeft() {
  for (let y = 0; y < currentPiece.length; y++) {
    for (let x = 0; x < currentPiece[y].length; x++) {
      if (currentPiece[y][x] !== 0) {
        const nextX = currentPieceX + x - 1;
        // if (nextX < 0 || board[currentPieceY + y][nextX] !== 0) {
        if (nextX < 0 || board[Math.floor(currentPieceY) + y][nextX] !== 0 || board[Math.round(currentPieceY) + y][nextX] !== 0) {
          return false;
        }
      }
    }
  }
  return true;
}

// Check if the current piece can move right
function canPieceMoveRight() {
  for (let y = 0; y < currentPiece.length; y++) {
    for (let x = 0; x < currentPiece[y].length; x++) {
      if (currentPiece[y][x] !== 0) {
        const nextX = currentPieceX + x + 1;
        // if (nextX >= BOARD_WIDTH || board[currentPieceY + y][nextX] !== 0) {
        if (nextX >= BOARD_WIDTH || board[Math.floor(currentPieceY) + y][nextX] !== 0 || board[Math.round(currentPieceY) + y][nextX] !== 0) {
          return false;
        }
      }
    }
  }
  return true;
}

// Rotate the current piece (actually turn into another piece)
// angle should be 90, -90?
function rotatePiece(angle) {
  // if puyo, logic would be simpler or different
  const rotatedPiece = [];
  if (angle === -90) {
    for (let x = currentPiece[0].length - 1; x >= 0; x--) {
      const newRow = [];
      for (let y = 0; y < currentPiece.length; y++) {
        newRow.push(currentPiece[y][x]);
      }
      rotatedPiece.push(newRow);
    }
  } else if (angle === 90) {
    for (let x = 0; x < currentPiece[0].length; x++) {
      const newRow = [];
      for (let y = currentPiece.length - 1; y >= 0; y--) {
        newRow.push(currentPiece[y][x]);
      }
      rotatedPiece.push(newRow);
    }
  } else {
    console.error("angle should be 90 or -90!");
  }

  if (canPieceRotate(rotatedPiece)) {
    currentPiece = rotatedPiece;
  }
}

// Check if the current piece can rotate
function canPieceRotate(rotatedPiece) {
  const nextX = currentPieceX;
  // const nextY = currentPieceY;
  const nextY = Math.round(currentPieceY);
  for (let y = 0; y < rotatedPiece.length; y++) {
    for (let x = 0; x < rotatedPiece[y].length; x++) {
      if (rotatedPiece[y][x] !== 0) {
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
