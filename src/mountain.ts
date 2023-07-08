import { gameConfig } from "./config";
import { Chain } from "./chain";
import { Move } from "./move";
import { baseSinglePuyo } from "./types";
import { Board } from "./board";


export enum Difficulty {
  EASY,
  NORMAL,
  HARD
}

export enum GameMode {
  ARCADE, ENDURANCE,
}

export class Mountain {
  private _seedPuyos: baseSinglePuyo[];
  private _floatingSeedPuyos: baseSinglePuyo[];
  private _currentDifficulty: Difficulty;
  private _currentTargetChainNum: number;
  private _currentTargetChainIndex: number;
  private _targetChainNums: number[][];
  private _validVanishPuyoNum: number;
  private _unnecessaryVanishPuyoNum: number;
  private _seedPuyoVariability: number[]; // rough seedpuyo numbers of each Column
  private _currentLevel: number;
  private _elapsedTime: number; // consider its type
  private _virtualBoard: number[][];
  private _phase: number;
  private _totalChainNum: number;
  private _unnecessaryChainNum: number;
  private _everyPhaseEnds: boolean;
  private _currentMode: GameMode;
  private _enduranceTotalTargetChainNum: number;
  private _enduranceChainNum: number;
  private _enduranceChainVariablity: number[];
  private _enduranceMinTargetChainNum: number;
  private _enduranceMaxTargetChainNum: number;

  initEnduranceChainNums() {
    // keep same probability of each chain num as possible as you can

    const target = this._enduranceTotalTargetChainNum;
    const minChainNum = this._enduranceMinTargetChainNum;
    const maxChainNum = this._enduranceMaxTargetChainNum;
    const range = maxChainNum - minChainNum + 1;
    const oneLoopSum = (maxChainNum + minChainNum) * range / 2;
    const maxFrequency = Math.floor(target / oneLoopSum);
    const frequencies = Array.from({ length: range }).fill(maxFrequency) as number[];
    let shortNum = target - oneLoopSum * maxFrequency;

    let addNum = minChainNum;
    while (true) {
      if (shortNum >= addNum) {
        shortNum -= addNum;
        frequencies[addNum - minChainNum]++;
      } else if (shortNum >= minChainNum && shortNum <= maxChainNum) {
        frequencies[shortNum - minChainNum]++;
        shortNum = 0;
        break;
      } else if (shortNum < minChainNum) {
        break;
      }

      if (addNum >= maxChainNum) addNum = minChainNum;
      else addNum++;
    }

    // if some margin to target exists, increment higher chain num 
    while (shortNum > 0) {
      for (let index = maxChainNum - minChainNum; index > 0; index--) {
        frequencies[index]++;
        frequencies[index - 1]--;
        if (--shortNum === 0) break;
      }
    }

    this._enduranceChainVariablity = [...frequencies];
  }

  getNextEnduranceChainNum() {
    const getRandomIndex = () => Math.floor(Math.random() * this._enduranceChainVariablity.length);
    let index = getRandomIndex();
    while (this._enduranceChainVariablity[index] === 0) { index = getRandomIndex(); }
    this._enduranceChainVariablity[index]--;
    return index + this._enduranceMinTargetChainNum;
  }

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
    // this.initTargetChain();

    this._enduranceTotalTargetChainNum = 500;
    this._enduranceMinTargetChainNum = 6;
    this._enduranceMaxTargetChainNum = 12;
    this.initEnduranceChainNums();
  }

  generateSeedPuyos() {
    this._seedPuyoVariability.forEach((puyoNum, index) => {
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
    // need more randomness
    const getRandomNum = (num) => Math.floor(Math.random() * num)
    const divider = (this._currentMode === GameMode.ARCADE)
      ? 2 + (2 - this._phase / this._targetChainNums.length)
      : 3;
    const seedPuyoNum = this._currentTargetChainNum * 4 / divider;
    const boardWidth = gameConfig.BOARD_RIGHT_EDGE - gameConfig.BOARD_LEFT_EDGE;
    const boardHeight = gameConfig.BOARD_BOTTOM_EDGE - gameConfig.BOARD_TOP_EDGE;
    // TODO: need to limit side range
    // const distributionNum = Math.floor(Math.random() * (boardWidth - 2)) + 2;
    const distributionNum = getRandomNum(boardWidth - 2) + 2;
    // const deviation = seedPuyoNum / distributionNum * 3 / 5; 
    const onceLimit = 2 / 3;
    const heightLimit = boardHeight - 3;
    const setVariability = (index, val) => { this._seedPuyoVariability[index] = Math.min(val, heightLimit); }

    for (let n = 0; n < distributionNum; n++) {
      let randomIndex = getRandomNum(boardWidth);
      while (this._seedPuyoVariability[randomIndex] !== 0 && n > 0) {
        randomIndex = getRandomNum(boardWidth);
      }

      const currentSeedPuyoSum = this._seedPuyoVariability.reduce((acc, cur) => { return acc + cur; }, 0);
      if (n === distributionNum - 1) {
        setVariability(randomIndex, Math.round(seedPuyoNum - currentSeedPuyoSum));
        break;
      }

      let puyoNum = getRandomNum(seedPuyoNum * onceLimit);

      if (currentSeedPuyoSum + puyoNum > seedPuyoNum - (distributionNum - n)) {
        // is this right???
        setVariability(randomIndex, Math.round(seedPuyoNum - (distributionNum - n) - currentSeedPuyoSum));
      } else {
        setVariability(randomIndex, puyoNum);
      }
    }

    // prevent seedpuyo from filling birth puyo pos
    const birthX = gameConfig.PUYO_BIRTH_POSX - 1;
    const limitY = gameConfig.BOARD_BOTTOM_EDGE - gameConfig.PUYO_BIRTH_POSY - 5;
    if (this._seedPuyoVariability[birthX] > limitY) {
      const diffY = this._seedPuyoVariability[birthX] - limitY;

      const minIndex = this._seedPuyoVariability.reduce((minIndex, curNum, curIndex, ori) => {
        if (curNum < ori[minIndex]) { return curIndex; }
        else { return minIndex; }
      }, 0);

      this._seedPuyoVariability[minIndex] += diffY;
      this._seedPuyoVariability[birthX] = limitY;
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
    this._seedPuyoVariability.forEach((puyoNum, index) => {
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

  nextTargetChain() {
    // TODO: separate function according to gamemode
    // temp, for endurance
    if (this._currentMode === GameMode.ENDURANCE) {
      this._totalChainNum += this._currentTargetChainNum;
      if (this._totalChainNum >= this._enduranceTotalTargetChainNum) {
        // or _enduranceChainVariablity.every((ele) => ele === 0)
        this._everyPhaseEnds = true;
        return;
      }
      // this._currentTargetChainNum = Math.floor(Math.random() * 7) + 6;
      this._currentTargetChainNum = this.getNextEnduranceChainNum();
    } else if (this._currentMode === GameMode.ARCADE) {
      // for ARCADE
      if (this._targetChainNums[this._phase - 1].length - 1 === this._currentTargetChainIndex &&
        this._targetChainNums.length === this._phase
      ) {
        // end of game
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
  }


  initTargetChain() {
    if (this._currentMode === GameMode.ARCADE) {
      this._targetChainNums = [[4, 5, 6, 7, 8], [5, 6, 7, 8, 9], [6, 7, 8, 9, 10]]
      this._currentTargetChainIndex = 0;
      this._currentTargetChainNum = this._targetChainNums[this._phase - 1][this._currentTargetChainIndex];
    } else if (this._currentMode === GameMode.ENDURANCE) {
      // this._targetChainNums = [[4, 5, 6, 7, 8], [5, 6, 7, 8, 9], [6, 7, 8, 9, 10]]
      // this._currentTargetChainIndex = 0;
      // TODO: temp,
      this._currentTargetChainNum = this.getNextEnduranceChainNum();
      // this._enduranceTotalTargetChainNum = 100;
    }
    //common
    this._totalChainNum = 0;
  }

  initVariability() {
    this._seedPuyoVariability =
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
  // TODO: make common method as floatingpuyo
  deleteFloatingSeedPuyos(floatingSeedPuyo: baseSinglePuyo) {
    this._floatingSeedPuyos =
      this._floatingSeedPuyos.filter(
        (cur) => !(cur["posX"] === floatingSeedPuyo.posX && cur["posY"] === floatingSeedPuyo.posY)
      );
  }

  get currentTargetChainNum() { return this._currentTargetChainNum; }

  get phase() { return this._phase; }
  get everyPhaseEnds() { return this._everyPhaseEnds; }

  get validVanishPuyoNum() { return this._validVanishPuyoNum; }
  get unnecessaryVanishPuyoNum() { return this._unnecessaryVanishPuyoNum; }
  addValidVanishPuyoNum(val: number) { this._validVanishPuyoNum += val; }
  addUnnecessaryVanishPuyoNum(val: number) { this._unnecessaryVanishPuyoNum += val; }

  setGameMode(mode: GameMode) { this._currentMode = mode; }
  get currentMode() { return this._currentMode; }

  get totalChainNum() { return this._totalChainNum; }
  get enduranceTotalTargetChainNum() { return this._enduranceTotalTargetChainNum; }

  setDifficulty(difficulty: Difficulty) { this._currentDifficulty = difficulty; }
}
