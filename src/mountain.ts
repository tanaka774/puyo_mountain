import { gameConfig } from "./config";
import { Chain } from "./chain";
import { Move } from "./move";
import conso from "../sample/oldjs/test";
import { baseSinglePuyo } from "./types";
import { Board } from "./board";


export enum Difficulty {
  EASY,
  NORMAL,
  HARD
}

export class Mountain {
  private _seedPuyos: baseSinglePuyo[];
  private _floatingSeedPuyos: baseSinglePuyo[];
  // private _currentDifficulty: Difficulty;
  private _currentTargetChainNum: number;
  private _currentTargetChainIndex: number;
  private _targetChainNums: number[][];
  private _validVanishPuyoNum: number;
  private _unnecessaryVanishPuyoNum: number;
  private _variability: number[]; // rough seedpuyo numbers of each Column
  private _currentLevel: number;
  private _elapsedTime: number; // consider its type
  private _virtualBoard: number[][];
  private _phase: number;
  private _totalChainNum: number;
  private _unnecessaryChainNum: number;
  private _everyPhaseEnds: boolean;

  constructor(
    private _board: Board,
    private _move: Move,
    private _chain: Chain,
    // difficulty: Difficulty,
  ) {
    // this._currentDifficulty = difficulty;
    this.init();
    this._phase = 1;
    this._everyPhaseEnds = false;
    this._validVanishPuyoNum = 0;
    this._unnecessaryVanishPuyoNum = 0;
    this.initTargetChain();
  }

  generateSeedPuyos() {
    this._variability.forEach((puyoNum, index) => {
      if (puyoNum === 0) return;
      const x = index + gameConfig.BOARD_LEFT_EDGE;

      for (let n = 0; n < puyoNum; n++) {
        const y = gameConfig.BOARD_BOTTOM_EDGE - 1 - n;
        const seedPuyo: baseSinglePuyo = {
          posX: x, posY: y, color: Math.floor(Math.random() * 4) + 1
        }
        this._seedPuyos.push(seedPuyo);
      }
    });
  }

  decideVariablilty() {
    // TODO: may change according to difficulty? this is test now!
    const divider = 2 + (2 - this._phase / this._targetChainNums.length);
    const seedPuyoNum = this._currentTargetChainNum * 4 / divider;
    const boardWidth = gameConfig.BOARD_RIGHT_EDGE - gameConfig.BOARD_LEFT_EDGE;
    // TODO: need to limit side range
    const distributionNum = Math.floor(Math.random() * (boardWidth - 2)) + 2;
    // const deviation = seedPuyoNum / distributionNum * 3 / 5; 
    const onceLimit = 2 / 3;

    for (let n = 0; n < distributionNum; n++) {
      let randomIndex = Math.floor(Math.random() * (boardWidth));
      while (this._variability[randomIndex] !== 0 && n > 0) {
        randomIndex = Math.floor(Math.random() * (boardWidth));
      }

      const currentSeedPuyoSum = this._variability.reduce((acc, cur) => { return acc + cur; }, 0);
      if (n === distributionNum - 1) {
        this._variability[randomIndex] = Math.round(seedPuyoNum - currentSeedPuyoSum);
        break;
      }

      let puyoNum = Math.floor(Math.random() * seedPuyoNum * onceLimit);
      if (currentSeedPuyoSum + puyoNum > seedPuyoNum - (distributionNum - n)) {
        // is this right???
        this._variability[randomIndex] = Math.round(seedPuyoNum - (distributionNum - n) - currentSeedPuyoSum);
      } else {
        this._variability[randomIndex] = puyoNum;
      }

    }

    // prevent seedpuyo from filling birth puyo pos
    const birthX = gameConfig.PUYO_BIRTH_POSX - 1;
    const limitY = gameConfig.BOARD_BOTTOM_EDGE - gameConfig.PUYO_BIRTH_POSY - 5;
    if (this._variability[birthX] > limitY) {
      const diffY = this._variability[birthX] - limitY;

      const minIndex = this._variability.reduce((minIndex, curNum, curIndex, ori) => {
        if (curNum < ori[minIndex]) { return curIndex; }
        else { return minIndex; }
      }, 0);

      this._variability[minIndex] += diffY;
      this._variability[birthX] = limitY;
    }
  }

  changeExcessPuyo() {
    // don't use lockpuyo() here
    this._seedPuyos.forEach((puyo) => {
      this._virtualBoard[puyo.posY][puyo.posX] = puyo.color;
    })
    let chainablePuyos = [];
    this._chain.findConnectedPuyos(this._virtualBoard, (savePuyos) => {
      chainablePuyos.push(savePuyos)
    }, 4, false);

    if (chainablePuyos.length > 0) {
      this.subChangeExcessPuyo(chainablePuyos);
    }
  }

  private subChangeExcessPuyo(chainablePuyos) {
    for (const temp of chainablePuyos) {
      for (let n = 0; n < temp.length; n++) {
        const chainablePuyo = temp[n];
        const x = chainablePuyo[0];
        const y = chainablePuyo[1];
        const currentColor = this._virtualBoard[y][x];
        const otherColor = ((currentColor + n) % 4) + 1;

        this._virtualBoard[y][x] = otherColor;

        const tempChainablePuyos = [];
        this._chain.findConnectedPuyos(this._virtualBoard, (savePuyos) => {
          tempChainablePuyos.push(savePuyos)
        }, 4, false);

        if (tempChainablePuyos.length === 0)
          break;
      }
    }

    const tempChainablePuyos = [];
    this._chain.findConnectedPuyos(this._virtualBoard, (savePuyos) => {
      tempChainablePuyos.push(savePuyos)
    }, 4, false);
    // still 4 connected puyos exist
    if (tempChainablePuyos.length > 0)
      this.subChangeExcessPuyo(tempChainablePuyos);
  }

  setFloatingSeedPuyos() {
    this._variability.forEach((puyoNum, index) => {
      if (puyoNum === 0) return;
      const x = index + gameConfig.BOARD_LEFT_EDGE;

      let lowestY: number;
      const lowestLine = gameConfig.BOARD_BOTTOM_EDGE / 2;
      if (puyoNum >= lowestLine) {
        lowestY = puyoNum;
      } else {
        lowestY = Math.floor(Math.random() * lowestLine) + puyoNum;
      }
      for (let n = 0; n < puyoNum; n++) {
        const y = lowestY - n;
        const color = this._virtualBoard[gameConfig.BOARD_BOTTOM_EDGE - 1 - n][x];
        const floatingSeedPuyo: baseSinglePuyo = {
          posX: x, posY: y, color: color
        }
        this._floatingSeedPuyos.push(floatingSeedPuyo);
      }
    });
  }



  detectTargetChain() { }

  calculateTime() { }

  isLevelClear() { }

  goNextLevel() { }

  calculateScore() { }

  isClearGame() { }

  initTargetChain() {
    this._targetChainNums =
      [[4, 5, 6, 7, 8], [5, 6, 7, 8, 9], [6, 7, 8, 9, 10]];
    this._currentTargetChainIndex = 0;
    this._currentTargetChainNum = this._targetChainNums[this._phase - 1][this._currentTargetChainIndex];
  }

  initVariability() {
    this._variability =
      Array.from({ length: gameConfig.BOARD_RIGHT_EDGE - gameConfig.BOARD_LEFT_EDGE }).fill(0) as number[];
  }
  initSeedPuyos() { this._seedPuyos = []; }
  initVirtualboard() { this._virtualBoard = this._board.createBoard(); }
  initFloatingSeedPuyos() { this._floatingSeedPuyos = []; }
  init() {
    this.initVariability();
    this.initSeedPuyos();
    this.initVirtualboard();
    this.initFloatingSeedPuyos();
  }

  get floatingSeedPuyos() { return this._floatingSeedPuyos; }
  set floatingSeedPuyos(puyos: baseSinglePuyo[]) { this._floatingSeedPuyos = puyos; }

  get currentTargetChainNum() { return this._currentTargetChainNum; }
  nextTargetChain() {
    if (this._targetChainNums[this._phase - 1].length - 1 === this._currentTargetChainIndex &&
      this._targetChainNums.length === this._phase
    ) {
      // this is the end of game
      this._currentTargetChainNum = 99;
      this._everyPhaseEnds = true;
      return;
    }
    if (this._targetChainNums[this._phase - 1].length - 1 === this._currentTargetChainIndex) {
      this._phase++;
      this._currentTargetChainIndex = 0;
    } else {
      this._currentTargetChainIndex++;
    }

    this._currentTargetChainNum = this._targetChainNums[this._phase - 1][this._currentTargetChainIndex];
  }

  get everyPhaseEnds() { return this._everyPhaseEnds; }

  get validVanishPuyoNum() { return this._validVanishPuyoNum; }
  get unnecessaryVanishPuyoNum() { return this._unnecessaryVanishPuyoNum; }
  addValidVanishPuyoNum(val: number) { this._validVanishPuyoNum += val; }
  addUnnecessaryVanishPuyoNum(val: number) { this._unnecessaryVanishPuyoNum += val; }
}
