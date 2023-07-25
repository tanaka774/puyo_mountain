import { gameConfig } from "../config";
import { Chain } from "../chain";
import { Move } from "../move";
import { baseSinglePuyo } from "../types";
import { Board } from "../board";
import { MountainBase } from "./mountainBase";
import { Difficulty, MountainArcade } from "./mountainArcade";
import { MountainEndurance } from "./mountainEndurance";
import { MountainCustom } from "./mountainCustom";


export enum GameMode {
  ARCADE, ENDURANCE, CUSTOM
}

// TODO: make interface
export class Mountain {
  private _mountainBase: MountainBase;
  private _mountainArcade: MountainArcade;
  private _mountainEndurance: MountainEndurance;
  private _mountainCustom: MountainCustom
  private _currentMode: GameMode;

  constructor(
    _board: Board,
    // _move: Move,
    _chain: Chain,
    // difficulty: Difficulty,
  ) {
    this._mountainBase = new MountainBase(_board, _chain);
    this._mountainArcade = new MountainArcade(_board, _chain);
    this._mountainEndurance = new MountainEndurance(_board, _chain);
    this._mountainCustom = new MountainCustom(_board, _chain);
  }

  setGameMode(mode: GameMode) {
    this._currentMode = mode;
    if (mode === GameMode.ARCADE) {
      this._mountainBase = this._mountainArcade;
    } else if (mode === GameMode.ENDURANCE) {
      this._mountainBase = this._mountainEndurance;
    } else if (mode === GameMode.CUSTOM) {
      this._mountainBase = this._mountainCustom;
    }
  }
  get currentMode() { return this._currentMode; }

  initEnduranceChainNums() {
    if (this._mountainBase instanceof MountainEndurance) this._mountainBase.initEnduranceChainNums();
    else console.error(`${this._mountainBase.constructor.name} doesn\'t have this method`);
  }

  getNextEnduranceChainNum() {
    if (this._mountainBase instanceof MountainEndurance) this._mountainBase.getNextEnduranceChainNum();
    else console.error(`${this._mountainBase.constructor.name} doesn\'t have this method`);
  }

  generateSeedPuyos() {
    this._mountainBase.generateSeedPuyos();
  }

  decideVariablilty() {
    this._mountainBase.decideVariablilty();
  }

  changeExcessPuyo() {
    this._mountainBase.changeExcessPuyo();
  }

  // private subChangeExcessPuyo(chainablePuyos) {
  // 
  // }

  setFloatingSeedPuyos() {
    this._mountainBase.setFloatingSeedPuyos();
  }

  nextTargetChain() {
    this._mountainBase.nextTargetChain();
  }


  initTargetChain() {
    this._mountainBase.initTargetChain();
  }

  initVariability() { this._mountainBase.initVariability(); }
  initSeedPuyos() { this._mountainBase.initSeedPuyos(); }
  initVirtualboard() { this._mountainBase.initVirtualboard(); }
  initFloatingSeedPuyos() { this._mountainBase.initFloatingSeedPuyos(); }
  initInternalInfo() { this._mountainBase.initInternalInfo(); }

  initGameResult() { this._mountainBase.initGameResult(); }

  initAll() { this._mountainBase.initAll(); }

  get floatingSeedPuyos() { return this._mountainBase.floatingSeedPuyos; }
  // set floatingSeedPuyos(puyos: baseSinglePuyo[]) { this._floatingSeedPuyos = puyos; }
  // TODO: make common method as floatingpuyo
  deleteFloatingSeedPuyos(floatingSeedPuyo: baseSinglePuyo) {
    this._mountainBase.deleteFloatingSeedPuyos(floatingSeedPuyo);
  }

  get currentTargetChainNum() { return this._mountainBase.currentTargetChainNum; }

  get phase() { return this._mountainBase.phase; }
  get everyPhaseEnds() { return this._mountainBase.everyPhaseEnds; }
  isLastPhase() {
    if (this._mountainBase instanceof MountainEndurance || this._mountainBase instanceof MountainArcade)
      return this._mountainBase.isLastPhase();
  }


  get validVanishPuyoNum() { return this._mountainBase.validVanishPuyoNum; }
  get unnecessaryVanishPuyoNum() { return this._mountainBase.unnecessaryVanishPuyoNum; }
  addValidVanishPuyoNum(val: number) { this._mountainBase.addValidVanishPuyoNum(val); }
  addUnnecessaryVanishPuyoNum(val: number) { this._mountainBase.addUnnecessaryVanishPuyoNum(val); }


  get totalChainNum() { return this._mountainBase.totalChainNum; }
  get enduranceTotalTargetChainNum() {
    if (this._mountainBase instanceof MountainEndurance) return this._mountainBase.enduranceTotalTargetChainNum;
    else console.error(`${this._mountainBase.constructor.name} doesn\'t have this method`);
  }

  setDifficulty(difficulty: Difficulty) {
    if (this._mountainBase instanceof MountainArcade) this._mountainBase.setDifficulty(difficulty);
    else console.error(`${this._mountainBase.constructor.name} doesn\'t have this method`);
  }

  checkDifficulty(difficulty: Difficulty) {
    if (this._mountainBase instanceof MountainArcade) return this._mountainBase.checkDifficulty(difficulty);
    else console.error(`${this._mountainBase.constructor.name} doesn\'t have this method`);
  }

  get resultGrade() {
    if (this._mountainBase instanceof MountainArcade) return this._mountainBase.resultGrade;
    else console.error(`${this._mountainBase.constructor.name} doesn\'t have this method`);
  }

  goNextLevel(setStateGeneSeed: () => void, setStateGameClear: () => void) {
    this._mountainBase.goNextLevel(setStateGeneSeed, setStateGameClear);
  }

  setSelectedValue(puyoAmount: string, distribution: string, minChainNum: string, maxChainNum: string) {
    if (this._mountainBase instanceof MountainCustom)
      this._mountainBase.setSelectedValue(puyoAmount, distribution, minChainNum, maxChainNum);
    else console.error(`${this._mountainBase.constructor.name} doesn\'t have this method`);
  }

  getGameStatus(): string {
    return this._mountainBase.getGameStatus();
  }

  setCallback(changeBackground: (color: string) => void) {
    this._mountainBase.setCallback(changeBackground);
  }

  detectTargetChain() { }
  calculateTime() { }
  isLevelClear() { }
  calculateScore() { }
  isClearGame() { }
}
