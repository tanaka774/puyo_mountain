import { gameConfig } from "../config";
import { Chain } from "../chain";
import { Move } from "../move";
import { baseSinglePuyo } from "../types";
import { Board } from "../board";
import { Difficulty } from "./mountainArcade";
import { EnduranceMode } from "./mountainEndurance";


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
    const getRandomNum = (num) => Math.floor(Math.random() * num)
    const boardWidth = gameConfig.BOARD_RIGHT_EDGE - gameConfig.BOARD_LEFT_EDGE;
    const baseRand = 4;
    const randModi = (getRandomNum(2) === 0) ? getRandomNum(baseRand) : (-1) * getRandomNum(baseRand);
    const meanPuyoHeight = 2;
    const seedPuyoNum = boardWidth * meanPuyoHeight + randModi;
    return seedPuyoNum;
  }

  protected decideDistributionNum(): number {
    const getRandomNum = (num) => Math.floor(Math.random() * num)
    const boardWidth = gameConfig.BOARD_RIGHT_EDGE - gameConfig.BOARD_LEFT_EDGE;
    const column = 3;
    const distributionNum = getRandomNum(column) + 1 + (boardWidth - column);
    return distributionNum;
  }

  decideVariability() {
    const getRandomNum = (num) => Math.floor(Math.random() * num)
    const boardWidth = gameConfig.BOARD_RIGHT_EDGE - gameConfig.BOARD_LEFT_EDGE;
    const boardHeight = gameConfig.BOARD_BOTTOM_EDGE - gameConfig.BOARD_TOP_EDGE;
    const meanPuyoHeight = 2;
    const seedPuyoNum = this.decideSeedPuyoNum();
    const distributionNum = this.decideDistributionNum();

    const heightLimit = boardHeight - 4;
    const setVariability = (index, val) => { this._seedPuyoVariability[index] = Math.min(val, heightLimit); }

    for (let n = 0; n < distributionNum; n++) {
      let randomIndex = getRandomNum(boardWidth);
      while (this._seedPuyoVariability[randomIndex] !== 0 && n > 0) {
        randomIndex = getRandomNum(boardWidth);
      }

      const currentSeedPuyoSum = this._seedPuyoVariability.reduce((acc, cur) => { return acc + cur; }, 0);
      if (currentSeedPuyoSum >= seedPuyoNum) break;
      if (n === distributionNum - 1) {
        setVariability(randomIndex, seedPuyoNum - currentSeedPuyoSum);
        break;
      }

      if (distributionNum === boardWidth) {
        let ran = 0;
        for (let n = 0; n < Math.floor(seedPuyoNum / meanPuyoHeight); n++)
          ran += getRandomNum(meanPuyoHeight * 1);
        setVariability(randomIndex, ran);
      } else {
        let ran = 0;
        for (let n = 0; n < Math.floor(seedPuyoNum / meanPuyoHeight / 2); n++)
          ran += getRandomNum(meanPuyoHeight * 2);
        setVariability(randomIndex, ran);
      }
      // setVariability(randomIndex, getRandomNum(meanPuyoHeight * 2) + getRandomNum(meanPuyoHeight * 2));
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

  // setEnduranceMode(mode: EnduranceMode) {/*child implements this*/}
  getEnduraceMode(): string { return 'child implements this'; }

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
