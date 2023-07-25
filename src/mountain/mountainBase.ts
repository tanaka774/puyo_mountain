import { gameConfig } from "../config";
import { Chain } from "../chain";
import { Move } from "../move";
import { baseSinglePuyo } from "../types";
import { Board } from "../board";
import { Difficulty } from "./mountainArcade";


export enum GameMode {
  ARCADE, ENDURANCE,
}

export class MountainBase {
  protected _seedPuyos: baseSinglePuyo[];
  protected _floatingSeedPuyos: baseSinglePuyo[];
  protected _currentTargetChainNum: number;
  protected _currentTargetChainIndex: number;
  protected _targetChainNums: number[][];
  protected _validVanishPuyoNum: number;
  protected _unnecessaryVanishPuyoNum: number;
  protected _seedPuyoVariability: number[]; // rough seedpuyo numbers of each Column
  protected _currentLevel: number;
  protected _elapsedTime: number; // consider its type
  protected _virtualBoard: number[][];
  protected _phase: number;
  protected _totalChainNum: number;
  protected _unnecessaryChainNum: number;
  protected _everyPhaseEnds: boolean;
  protected _changeBackGround: (color: string) => void;
  private _currentMode: GameMode;

  constructor(
    protected _board: Board,
    // private _move: Move,
    protected _chain: Chain,
  ) {
    this.initInternalInfo();
    this.initGameResult();
    // this._phase = 1;
    // this._everyPhaseEnds = false;
    // this._validVanishPuyoNum = 0;
    // this._unnecessaryVanishPuyoNum = 0;
    // this.initTargetChain();
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

  protected decideSeedPuyoNum(): number {
    /* child implements this */
    const divider = 3;
    const seedPuyoNum = this._currentTargetChainNum * 4 / divider;
    return seedPuyoNum;
  }

  protected decideDistributionNum(): number {
    const getRandomNum = (num) => Math.floor(Math.random() * num);
    const boardWidth = gameConfig.BOARD_RIGHT_EDGE - gameConfig.BOARD_LEFT_EDGE;
    return getRandomNum(boardWidth - 4) + 4;
  }

  decideVariablilty() {
    // TODO: may change according to difficulty? this is test now!
    // need more randomness
    const getRandomNum = (num) => Math.floor(Math.random() * num)
    const seedPuyoNum = this.decideSeedPuyoNum();
    const boardWidth = gameConfig.BOARD_RIGHT_EDGE - gameConfig.BOARD_LEFT_EDGE;
    const boardHeight = gameConfig.BOARD_BOTTOM_EDGE - gameConfig.BOARD_TOP_EDGE;
    // TODO: need to limit side range
    // const distributionNum = Math.floor(Math.random() * (boardWidth - 2)) + 2;
    const distributionNum = this.decideDistributionNum();
    // const deviation = seedPuyoNum / distributionNum * 3 / 5; 
    const onceLimit = 2 / 3;
    const heightLimit = boardHeight - 5;
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

      setVariability(randomIndex, puyoNum);

      // if (currentSeedPuyoSum + puyoNum > seedPuyoNum - (distributionNum - n)) {
      //   // is this right???
      //   setVariability(randomIndex, Math.round(seedPuyoNum - (distributionNum - n) - currentSeedPuyoSum));
      // } else {
      //   setVariability(randomIndex, puyoNum);
      // }
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

  nextTargetChain() {/*child implements this*/ }

  initTargetChain() {/*child implements this*/ }

  initVariability() {
    this._seedPuyoVariability =
      Array.from({ length: gameConfig.BOARD_RIGHT_EDGE - gameConfig.BOARD_LEFT_EDGE }).fill(0) as number[];
  }
  initSeedPuyos() { this._seedPuyos = []; }
  initVirtualboard() { this._virtualBoard = this._board.createBoard(); }
  initFloatingSeedPuyos() { this._floatingSeedPuyos = []; }
  initInternalInfo() {
    this.initVariability();
    this.initSeedPuyos();
    this.initVirtualboard();
    this.initFloatingSeedPuyos();
  }

  initGameResult() {
    this._phase = 1;
    this._everyPhaseEnds = false;
    this._validVanishPuyoNum = 0;
    this._unnecessaryVanishPuyoNum = 0;
  }

  initAll() {
    this.initGameResult();
    this.initInternalInfo();
    this.initTargetChain();
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
  // isLastPhase() { /*child implements this*/  }

  get validVanishPuyoNum() { return this._validVanishPuyoNum; }
  get unnecessaryVanishPuyoNum() { return this._unnecessaryVanishPuyoNum; }
  addValidVanishPuyoNum(val: number) { this._validVanishPuyoNum += val; }
  addUnnecessaryVanishPuyoNum(val: number) { this._unnecessaryVanishPuyoNum += val; }

  get totalChainNum() { return this._totalChainNum; }

  goNextLevel(setStateGeneSeed: () => void, setStateGameClear: () => void) {/*child implements this*/ }

  setSelectedValue(puyoAmount: string, distribution: string, minChainNum: string, maxChainNum: string) {
    /*custom implements this*/
  }

  getGameStatus(): string { return 'child implements this'; }

  setCallback(changeBackground: (color: string) => void) {
    this._changeBackGround = changeBackground;
  }

  // unused??
  detectTargetChain() { }
  calculateTime() { }
  isLevelClear() { }
  calculateScore() { }
  isClearGame() { }
}
