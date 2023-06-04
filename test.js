const board = [
  [0, 0, 2, 0],
  [2, 2, 2, 2],
  [3, 1, 1, 0],
  [3, 1, 1, 0],
];
const BOARD_HEIGHT = board.length;
const BOARD_WIDTH = board[0].length;

let recursiveCount = 0;

let connectedPuyos = 0;
const vanishPuyos = [];
const checkedCells = Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(false));
for (let y = 0; y < BOARD_HEIGHT; y++) {
  for (let x = 0; x < BOARD_WIDTH; x++) {
    const savePuyos = [];
    connectedPuyos = checkChain(x, y, checkedCells, board[y][x], savePuyos);
    if (connectedPuyos >= 4) {
      vanishPuyos.push(savePuyos);
    }
  }
}
console.log("vanish:", vanishPuyos);
console.log(recursiveCount);
const allvan = [];
handleChain(vanishPuyos);
const res = allvan
  .sort((a, b) => b[1] - a[1])
  .sort((a, b) => a[0] - b[0])
  .filter((_, index, ori) => (index === 0 || ori[index - 1][0] !== ori[index][0]));
console.log(res);

function handleChain(vanishPuyos) {
  for (const temp of vanishPuyos) {
    allvan.push(...temp);
    // for (const vanishPuyo of temp) {
    //   const [x, y] = [...vanishPuyo];
    //   console.log(x, y);
    // }
  }
}

function checkChain(x, y, checkedCells, prevCell, savePuyos) {
  recursiveCount++;
  if (checkedCells[y][x] === true) { return false; }

  let connectedPuyos = 0;
  const cell = board[y][x];
  if (cell === 0 || cell !== prevCell) {
    return false;
  } else if (cell === prevCell) {
    checkedCells[y][x] = true;
    // savePuyos.push(`${x},${y}`);
    savePuyos.push([x, y]);

    connectedPuyos++;
  }

  if (x - 1 >= 0) connectedPuyos += checkChain(x - 1, y, checkedCells, prevCell, savePuyos);
  if (x + 1 < BOARD_WIDTH) connectedPuyos += checkChain(x + 1, y, checkedCells, prevCell, savePuyos);
  if (y - 1 >= 0) connectedPuyos += checkChain(x, y - 1, checkedCells, prevCell, savePuyos);
  if (y + 1 < BOARD_HEIGHT) connectedPuyos += checkChain(x, y + 1, checkedCells, prevCell, savePuyos);

  return connectedPuyos;
}
