import { baseSinglePuyo } from "./puyo.ts"
import { gameConfig } from "./config.ts"
import { recordPuyoSteps } from "./record.ts"
import { Game } from "./game.ts"
import { Move } from "./move.ts"
import { Board } from "./board"


export class Chain {
  private floatingPuyo: baseSinglePuyo;
  private _floatingPuyos: baseSinglePuyo[];
  private _vanishPuyos: number[][];
  private _chainVanishWaitCount: number;
  private _chainCount: number;
  private _virtualChainCount: number;
  private _maxVirtualChainCount: number;
  private _maxTriggerPuyos: number[][];
  private _connectedPuyos: Set<String>;
  // private _lockPuyo: (board, x, y, color, recordFlag) => void;

  constructor(
    private _board: Board,
    // private _game: Game,
    // private _move: Move,
    // private _floatingPuyos: floatingPuyo[],
    // _floatingPuyos: baseSinglePuyo[],
    // private _vanishPuyos: number[][],
    // private _chainVanishWaitCount: number,
    // private _chainCount: number,
    // private _virtualChainCount: number,
    // private _maxVirtualChainCount: number,
    // private _maxTriggerPuyos: number[][],
    // private _connectedPuyos: Set<String>,
  ) {
    this._floatingPuyos = [];
    this._vanishPuyos = [];
    this._chainVanishWaitCount = 0;
    this._chainCount = 0;
    this._virtualChainCount = 0;
    this._maxVirtualChainCount = 0;
    this._maxTriggerPuyos = [];
    this._connectedPuyos = new Set();
  }

  findConnectedPuyos(board, foundCallback, connectNum = 4, willChangeConnect = true) {
    let connectedPuyoNums = 0;
    const checkedCells = Array.from(
      { length: (gameConfig.BOARD_BOTTOM_EDGE - gameConfig.BOARD_TOP_EDGE) + 5 },
      () => Array((gameConfig.BOARD_RIGHT_EDGE - gameConfig.BOARD_LEFT_EDGE) + 2).fill(false));

    if (willChangeConnect) this.initConnectedPuyos();

    // TODO: don't want to check every cell, use currentlockpos from lockpuyo()
    // but, if ghost zone is enable, this way should be proper?
    // or just checking TOP_EDGE line is enough?
    // now connecting is involved with this function, so this is fine.
    for (let y = gameConfig.BOARD_TOP_EDGE; y < gameConfig.BOARD_BOTTOM_EDGE; y++) {
      for (let x = gameConfig.BOARD_LEFT_EDGE; x < gameConfig.BOARD_RIGHT_EDGE; x++) {
        if (board[y][x] === gameConfig.NO_COLOR) continue;
        const savePuyos = [];
        connectedPuyoNums = this.checkConnected(board, x, y, checkedCells, board[y][x], savePuyos, willChangeConnect);
        if (connectedPuyoNums >= connectNum) {
          // this._vanishPuyos.push(savePuyos);
          foundCallback(savePuyos);
        }
      }
    }
  }

  checkConnected(board, x, y, checkedCells, prevCell, savePuyos, willAddConnect) {
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
    connectedPuyoNums += this.checkConnected(board, x + 1, y, checkedCells, prevCell, savePuyos, willAddConnect);
    if (willAddConnect && connectedPuyoNums - prevConnectedPuyoNums > 0) this.addConnectedPuyos(x, y, cell, 1, 0);
    prevConnectedPuyoNums = connectedPuyoNums;

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

  erasePuyos(board) {
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
  findFloatingPuyos(board) {
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

  letFloatingPuyosFall(
    board: number[][],
    // movePuyoDown: (y: number, speed: number) => number,
  ) {
    for (const floatingPuyo of this._floatingPuyos) {
      // const nextY = this.moveFloatingPuyoDown(floatingPuyo.posY, 12.0);
      const nextY = this.moveFloatingPuyoDown(floatingPuyo.posY, 12.0);
      if (nextY >= gameConfig.BOARD_BOTTOM_EDGE - 1 || board[Math.floor(nextY) + 1][floatingPuyo.posX] !== gameConfig.NO_COLOR) {
        // be careful
        // floatingPuyo.posY = Math.round(nextY);
        floatingPuyo.posY = Math.floor(nextY);

        this._board.lockPuyo(board, floatingPuyo.posX, floatingPuyo.posY, floatingPuyo.color, recordPuyoSteps.DID_FLOAT_PUYO_REC_FLAG);

        // remove fixed puyo from _floatingPuyos(array)
        this._floatingPuyos =
          this._floatingPuyos.filter((cur) => !(cur["posX"] === floatingPuyo.posX && cur["posY"] === floatingPuyo.posY));
      } else {
        floatingPuyo.posY = nextY;
      }
    }
  }

  // TODO: this is incomplete
  detectPossibleChain(board) {
    // init maxcount first
    this._maxVirtualChainCount = 0;
    const triggerPuyosGroups = [];
    this.findConnectedPuyos(board, (savePuyos) => {
      const isExposed = savePuyos.some((puyo) => {
        const diffs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
        return diffs.some((diff) => board[puyo[1] + diff[1]][puyo[0] + diff[0]] === 0)
      })
      if (isExposed) triggerPuyosGroups.push(savePuyos);
    }, 3, false);

    this.searchBucketShape(board, triggerPuyosGroups);

    for (const triggerPuyos of triggerPuyosGroups) {
      const firstVanish = [triggerPuyos]; // turn into a form of vanishpuyos(double array)
      const virtualBoard = JSON.parse(JSON.stringify(board));
      this.letPuyosFallVirtually(virtualBoard, firstVanish);

      this._virtualChainCount = 1;
      this._virtualChainCount += this.triggerChainVirtually(virtualBoard);
      if (this._maxVirtualChainCount < this._virtualChainCount) {
        this._maxVirtualChainCount = this._virtualChainCount;
        this._maxTriggerPuyos = JSON.parse(JSON.stringify(triggerPuyos));
      }
    }

  }

  searchBucketShape(board, triggerPuyos) {
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

  triggerChainVirtually(virtualBoard) {
    const _vanishPuyos = [];
    let _chainCount = 0;
    this.findConnectedPuyos(virtualBoard, (savePuyos) => {
      _vanishPuyos.push(savePuyos);
    }, 4, false);

    if (_vanishPuyos.length === 0) return _chainCount;
    else _chainCount++;

    this.letPuyosFallVirtually(virtualBoard, _vanishPuyos);

    _chainCount += this.triggerChainVirtually(virtualBoard);
    return _chainCount;
  }

  letPuyosFallVirtually(board, _vanishPuyos) {
    const allVanishPuyos = [];
    for (const temp of _vanishPuyos) {
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

  moveFloatingPuyoDown(parentY, rate) {
    return parentY + gameConfig.moveYDiff * rate;
  }

  get connectedPuyos() { return this._connectedPuyos; }

  addConnectedPuyos(x, y, color, dx, dy) {
    this._connectedPuyos.add(`${x - gameConfig.BOARD_LEFT_EDGE},${y - gameConfig.BOARD_TOP_EDGE},${color}:${dx},${dy}`);
  }

  deleteConnectedPuyo(x, y) {
    const modX = x - gameConfig.BOARD_LEFT_EDGE;
    const modY = y - gameConfig.BOARD_TOP_EDGE;
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

  addVanishPuyos(savePuyos: number[]) { this._vanishPuyos.push(savePuyos); }
  get vanishPuyos() { return this._vanishPuyos; }
  initVanishPuyos() { this._vanishPuyos = []; }

  get floatingPuyos() { return this._floatingPuyos; }

  get maxVirtualChainCount() { return this._maxVirtualChainCount; }
  get maxTriggerPuyos() { return this._maxTriggerPuyos; }

  // setCallback(lockPuyo: (board, x, y, color, recordFlag) => void) {
  //   this._lockPuyo = lockPuyo;
  // }
}
