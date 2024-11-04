import { baseManiPuyo, baseSinglePuyo } from "./types"
import { gameConfig } from "./config"
import { recordPuyoSteps } from "./record"
import { Board } from "./board"
import conso from "../sample/oldjs/test";


export class Chain {
  private _floatingPuyos: baseSinglePuyo[];
  private _vanishPuyos // : number[][]; // [][][]
  private _vanishPuyoNum: number;
  private _chainVanishWaitCount: number;
  private _chainCount: number;
  private _virtualChainCount: number;
  private _maxVirtualChainCount: number;
  private _maxTriggerPuyos: number[][];
  private _connectedPuyos: Set<String>;

  constructor(
    private _board: Board,
  ) {
    this._floatingPuyos = [];
    this._vanishPuyos = [];
    this._vanishPuyoNum = 0;
    this._chainVanishWaitCount = 0;
    this._chainCount = 0;
    this._virtualChainCount = 0;
    this._maxVirtualChainCount = 0;
    this._maxTriggerPuyos = [];
    this._connectedPuyos = new Set();
  }

  findConnectedPuyos(
    board: number[][],
    foundCallback: (puyos: number[][]) => void,
    connectNum = 4,
    willChangeConnect = true
  ) {
    let connectedPuyoNums = 0;
    const checkedCells = Array.from(
      { length: (gameConfig.BOARD_BOTTOM_EDGE - gameConfig.BOARD_TOP_EDGE) + gameConfig.BOARD_HEIGHT_MARGIN },
      () => Array((gameConfig.BOARD_RIGHT_EDGE - gameConfig.BOARD_LEFT_EDGE) + gameConfig.BOARD_WIDTH_MARGIN).fill(false));

    if (willChangeConnect) this.initConnectedPuyos();

    // TODO: don't want to check every cell, use currentlockpos from lockpuyo()
    // but, if ghost zone is enable, this way should be proper?
    // or just checking TOP_EDGE line is enough?
    // now connecting is involved with this function, so this is fine.
    for (let y = gameConfig.BOARD_TOP_EDGE; y < gameConfig.BOARD_BOTTOM_EDGE; y++) {
      for (let x = gameConfig.BOARD_LEFT_EDGE; x < gameConfig.BOARD_RIGHT_EDGE; x++) {
        if (board[y][x] === gameConfig.NO_COLOR) continue;
        const savePuyos: number[][] = [];
        connectedPuyoNums = this.checkConnected(board, x, y, checkedCells, board[y][x], savePuyos, willChangeConnect);
        if (connectedPuyoNums >= connectNum) {
          // this._vanishPuyos.push(savePuyos);
          foundCallback(savePuyos);
        }
      }
    }
  }

  checkConnected(
    board: number[][], x: number, y: number,
    checkedCells: boolean[][], prevCell: number, savePuyos: number[][], willAddConnect: boolean
  ) {
    if (checkedCells[y][x] === true) { return 0; }

    let connectedPuyoNums = 0;
    const cell = board[y][x];
    if (cell === gameConfig.NO_COLOR || cell !== prevCell) {
      return 0;
    } else if (cell === prevCell) {
      // if prevcell is board[y][x], enter this condition without fail and connectedPuyoNums becomes 1
      savePuyos.push([x, y]);
      checkedCells[y][x] = true;

      connectedPuyoNums++;
    }
    let prevConnectedPuyoNums = connectedPuyoNums;

    // TODO: really? -> if you check board through from left to right and from top to bottom in every case, you don't need to check x-1 and y-1 here
    connectedPuyoNums += this.checkConnected(board, x + 1, y, checkedCells, prevCell, savePuyos, willAddConnect);
    if (willAddConnect && connectedPuyoNums - prevConnectedPuyoNums > 0) this.addConnectedPuyos(x, y, cell, 1, 0);
    prevConnectedPuyoNums = connectedPuyoNums;

    if (y + 1 <= gameConfig.BOARD_BOTTOM_EDGE)
      connectedPuyoNums += this.checkConnected(board, x, y + 1, checkedCells, prevCell, savePuyos, willAddConnect);
    if (willAddConnect && connectedPuyoNums - prevConnectedPuyoNums > 0) this.addConnectedPuyos(x, y, cell, 0, 1);
    prevConnectedPuyoNums = connectedPuyoNums;

    connectedPuyoNums += this.checkConnected(board, x - 1, y, checkedCells, prevCell, savePuyos, willAddConnect);
    if (willAddConnect && connectedPuyoNums - prevConnectedPuyoNums > 0) this.addConnectedPuyos(x, y, cell, -1, 0);
    prevConnectedPuyoNums = connectedPuyoNums;

    // don't check invisible zone
    if (y - 1 >= gameConfig.BOARD_TOP_EDGE)
      connectedPuyoNums += this.checkConnected(board, x, y - 1, checkedCells, prevCell, savePuyos, willAddConnect);
    if (willAddConnect && connectedPuyoNums - prevConnectedPuyoNums > 0) this.addConnectedPuyos(x, y, cell, 0, -1);

    return connectedPuyoNums;
  }

  erasePuyos(board: number[][]) {
    for (const temp of this._vanishPuyos) {
      for (const vanishPuyo of temp) {
        // const [x, y] = [...vanishPuyo];
        const x = vanishPuyo[0];
        const y = vanishPuyo[1];

        // TODO: consider some effect in vanishing
        // and consider ojama puyo
        this._board.lockPuyo(board, x, y, gameConfig.NO_COLOR, recordPuyoSteps.VANISH_PUYO_REC_FLAG);

        // TODO: should do this with callbackl?
        this.deleteConnectedPuyo(x, y);
      }
    }
  }

  // store puyos to fall after chain in order of lower puyo(y is high)
  // what happens if ojama puyo exists???
  findFloatingPuyos(board: number[][]) {
    const allVanishPuyos = [];
    for (const temp of this._vanishPuyos) {
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

        const floatingPuyo: baseSinglePuyo = {
          posX: lowestX,
          posY: aboveY,
          color: board[aboveY][lowestX],
        }

        // delegate drawing to floatingpuyo
        this._board.lockPuyo(board, lowestX, aboveY, gameConfig.NO_COLOR, recordPuyoSteps.FLOAT_PUYO_REC_FLAG);

        this._floatingPuyos.push({ ...floatingPuyo });

        // TODO: is this the right place? connecting animation is a bit weird
        this.deleteConnectedPuyo(floatingPuyo.posX, floatingPuyo.posY);
      }
    }
  }


  // TODO: this is incomplete
  detectPossibleChain(board: number[][], currentPuyo: baseManiPuyo) {
    // init maxcount first
    this._maxVirtualChainCount = 0;
    const triggerPuyosGroup = [];

    // find 3 connected and exposed
    this.findConnectedPuyos(board, (savePuyos) => {
      const isExposed = savePuyos.some((puyo) => {
        const diffs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
        return diffs.some((diff) => board[puyo[1] + diff[1]][puyo[0] + diff[0]] === 0)
      })
      if (isExposed) triggerPuyosGroup.push(savePuyos);
    }, 3, false);

    this.searchIgnitionHole(board, triggerPuyosGroup);
    this.searchWithCurrentPuyo(board, triggerPuyosGroup, currentPuyo);

    for (let triggerPuyos of triggerPuyosGroup) {
      const virtualBoard = JSON.parse(JSON.stringify(board));
      triggerPuyos.forEach(triggerPuyo => {
        if (triggerPuyo.length > 2) {
          // this is related to currentpuyo search, write on virtualBoard and delete
          virtualBoard[triggerPuyo[1]][triggerPuyo[0]] = triggerPuyo[2];
          triggerPuyos = triggerPuyos.filter((puyo) => !(puyo[0] === triggerPuyo[0] && puyo[1] === triggerPuyo[1]));
        }
      });

      const firstVanish = [triggerPuyos]; // turn into a form of vanishpuyos(double array)
      this.letPuyosFallVirtually(virtualBoard, firstVanish);

      this._virtualChainCount = 1;
      this._virtualChainCount += this.triggerChainVirtually(virtualBoard);
      if (this._maxVirtualChainCount < this._virtualChainCount) {
        this._maxVirtualChainCount = this._virtualChainCount;
        this._maxTriggerPuyos = JSON.parse(JSON.stringify(triggerPuyos));
      }
    }
  }

  searchWithCurrentPuyo(board: number[][], triggerPuyosGroup/*: number[][] | number[][][]*/, currentPuyo: baseManiPuyo) {
    const lowestPoss = [];
    for (let x = gameConfig.BOARD_LEFT_EDGE; x < gameConfig.BOARD_RIGHT_EDGE; x++) {
      for (let y = gameConfig.BOARD_BOTTOM_EDGE - 1; y >= gameConfig.BOARD_TOP_EDGE; y--) {
        if (board[y][x] !== 0) continue;
        lowestPoss.push([x, y]);
        break;
      }
    }

    lowestPoss.forEach((curLowestPos, index, ori) => {
      const lx = curLowestPos[0];
      const ly = curLowestPos[1];
      // put on puyo vertically
      this.putOnCurrentPuyoVirtually(board, triggerPuyosGroup,
        lx, ly, currentPuyo.parentColor, lx, ly - 1, currentPuyo.childColor);

      if (currentPuyo.parentColor !== currentPuyo.childColor)
        this.putOnCurrentPuyoVirtually(board, triggerPuyosGroup,
          lx, ly, currentPuyo.childColor, lx, ly - 1, currentPuyo.parentColor);

      // put on puyo horizontally
      if (index === lowestPoss.length - 1) return;
      const nextlx = ori[index + 1][0];
      const nextly = ori[index + 1][1];

      this.putOnCurrentPuyoVirtually(board, triggerPuyosGroup,
        lx, ly, currentPuyo.parentColor, nextlx, nextly, currentPuyo.childColor);

      if (currentPuyo.parentColor !== currentPuyo.childColor)
        this.putOnCurrentPuyoVirtually(board, triggerPuyosGroup,
          lx, ly, currentPuyo.childColor, nextlx, nextly, currentPuyo.parentColor);
    })
  }

  private putOnCurrentPuyoVirtually(board: number[][], triggerPuyosGroup,
    x1, y1, color1, x2, y2, color2
  ) {
    let tempBoard = JSON.parse(JSON.stringify(board));

    tempBoard[y1][x1] = color1;
    tempBoard[y2][x2] = color2;

    this.findConnectedPuyos(tempBoard, (savePuyos) => {
      const existsPuyo1 = savePuyos.some((puyo) => puyo[0] === x1 && puyo[1] === y1);
      const existsPuyo2 = savePuyos.some((puyo) => puyo[0] === x2 && puyo[1] === y2);

      if (existsPuyo1 && existsPuyo2) {
        savePuyos = savePuyos.filter((puyo) => !(puyo[0] === x1 && puyo[1] === y1));
        savePuyos = savePuyos.filter((puyo) => !(puyo[0] === x2 && puyo[1] === y2));
        savePuyos.push([x1, y1, color1]);
        savePuyos.push([x2, y2, color2]);
      } else if (existsPuyo1) {
        savePuyos = savePuyos.filter((puyo) => !(puyo[0] === x1 && puyo[1] === y1));
        savePuyos.push([x2, y2, color2]);
      } else if (existsPuyo2) {
        savePuyos = savePuyos.filter((puyo) => !(puyo[0] === x2 && puyo[1] === y2));
        savePuyos.push([x1, y1, color1]);
      }
      triggerPuyosGroup.push(savePuyos);
    }, 4, false);
  }

  // TODO: give it on some thoughts for doing recursively. and need unittest for this.
  searchIgnitionHole(board: number[][], triggerPuyosGroup: number[][][]) {
    // search puyos which can trigger chain not in threesome
    for (let x = gameConfig.BOARD_LEFT_EDGE; x < gameConfig.BOARD_RIGHT_EDGE; x++) {
      for (let y = gameConfig.BOARD_BOTTOM_EDGE - 1; y > gameConfig.BOARD_TOP_EDGE; y--) {
        if (board[y][x] === 0 &&
          board[y + 1][x] !== 0
        ) {
          const sameColorCells = [];
          if (board[y][x - 1] !== 0 && board[y][x - 1] === board[y][x + 1] && board[y][x + 1] === board[y + 1][x]) {
            // only these are enough for chain
            sameColorCells.push([x - 1, y], [x + 1, y], [x, y + 1]);
          }
          else if (board[y][x - 1] !== 0 && board[y][x - 1] === board[y][x + 1]) {
            sameColorCells.push([x - 1, y], [x + 1, y]);
          }
          else if (board[y][x - 1] !== 0 && board[y][x - 1] === board[y + 1][x] && board[y + 1][x] !== gameConfig.WALL_NUMBER) {
            sameColorCells.push([x - 1, y], [x, y + 1]);
          }
          else if (board[y + 1][x] !== 0 && board[y + 1][x] === board[y][x + 1] && board[y + 1][x] !== gameConfig.WALL_NUMBER) {
            sameColorCells.push([x + 1, y], [x, y + 1]);
          }

          const checkedCells = Array.from(
            { length: (gameConfig.BOARD_BOTTOM_EDGE - gameConfig.BOARD_TOP_EDGE) + gameConfig.BOARD_HEIGHT_MARGIN },
            () => Array((gameConfig.BOARD_RIGHT_EDGE - gameConfig.BOARD_LEFT_EDGE) + gameConfig.BOARD_WIDTH_MARGIN).fill(false));
          const sameColorCellsAfter = [];

          sameColorCells.forEach((sameColorCell) => {
            const [x, y] = [...sameColorCell];
            let connectedPuyoNum = 0;
            const savePuyos: number[][] = [];
            connectedPuyoNum = this.checkConnected(board, x, y, checkedCells, board[y][x], savePuyos, false);
            // if (connectedPuyoNum >= 3) {
            //   // don't want to store 3 connected puyos here
            //   return;
            // } else {
            if (connectedPuyoNum >= 1) {
              savePuyos.forEach((savePuyo) => sameColorCellsAfter.push(savePuyo));
            }
          })
          if (sameColorCellsAfter.length >= 3) {
            triggerPuyosGroup.push(sameColorCellsAfter);
          }
          break;
        }

      }
    }
  }

  triggerChainVirtually(virtualBoard: number[][]) {
    const vanishPuyos = [];
    let chainCount = 0;
    this.findConnectedPuyos(virtualBoard, (savePuyos) => {
      vanishPuyos.push(savePuyos);
    }, 4, false);

    if (vanishPuyos.length === 0) return chainCount;
    else chainCount++;

    this.letPuyosFallVirtually(virtualBoard, vanishPuyos);

    chainCount += this.triggerChainVirtually(virtualBoard);
    return chainCount;
  }

  letPuyosFallVirtually(board: number[][], vanishPuyos: number[][]) {
    const allVanishPuyos = [];
    for (const temp of vanishPuyos) {
      allVanishPuyos.push(...temp);
      for (const vanishPuyo of temp) {
        // const [x, y] = [...vanishPuyo];
        const x = vanishPuyo[0];
        const y = vanishPuyo[1];
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

  get connectedPuyos() { return this._connectedPuyos; }

  addConnectedPuyos(x, y, color, dx, dy) {
    this._connectedPuyos.add(`${x},${y},${color}:${dx},${dy}`);
  }

  deleteConnectedPuyo(x, y) {
    const modX = x;
    const modY = y;
    this._connectedPuyos.forEach((elem) => {
      if (elem.indexOf(`${modX},${modY}`) === 0) {
        this._connectedPuyos.delete(elem);
      }
      const [diffX, diffY] = elem.split(':')[1].split(',').map(str => Number.parseInt(str, 10));
      if (elem.indexOf(`${modX - diffX},${modY - diffY}`) === 0) {
        this._connectedPuyos.delete(elem);
      }
    })
  }

  initConnectedPuyos() {
    this._connectedPuyos.clear();
  }

  set chainCount(value: number) { this._chainCount = value; }
  get chainCount() { return this._chainCount; }
  incrementChainCount() { this._chainCount++; }
  initChainCount() { this._chainCount = 0; }

  get chainVanishWaitCount() { return this._chainVanishWaitCount; }
  incrementChainVanishWaitCount() { this._chainVanishWaitCount++; }
  initChainVanishWaitCount() { this._chainVanishWaitCount = 0; }

  addVanishPuyos(savePuyos: number[]) {
    this._vanishPuyos.push(savePuyos);
    this._vanishPuyoNum += savePuyos.length;
  }
  get vanishPuyos() { return this._vanishPuyos; }
  initVanishPuyos() { this._vanishPuyos = []; }
  get vanishPuyoNum() { return this._vanishPuyoNum; }
  initVanishPuyoNum() { this._vanishPuyoNum = 0; }

  get floatingPuyos() { return this._floatingPuyos; }
  set floatingPuyos(puyos: baseSinglePuyo[]) { this._floatingPuyos = puyos; }
  initFloatingPuyos() { this._floatingPuyos = []; }
  deleteFloatingPuyos(floatingPuyo: baseSinglePuyo) {
    this._floatingPuyos =
      this._floatingPuyos.filter(
        (cur) => !(cur["posX"] === floatingPuyo.posX && cur["posY"] === floatingPuyo.posY)
      );
  }

  get maxVirtualChainCount() { return this._maxVirtualChainCount; }
  get maxTriggerPuyos() { return this._maxTriggerPuyos; }

}
