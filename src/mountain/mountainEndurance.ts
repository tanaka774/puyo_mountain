import { gameConfig } from "../config";
import { MountainBase } from "./mountainBase";
import { Board } from "src/board";
import { Move } from "src/move";
import { Chain } from "src/chain";

export class MountainEndurance extends MountainBase {
  private _enduranceTotalTargetChainNum: number;
  private _enduranceChainNum: number;
  private _enduranceChainVariablity: number[];
  private _enduranceMinTargetChainNum: number;
  private _enduranceMaxTargetChainNum: number;

  constructor(
    _board: Board,
    // _move: Move,
    _chain: Chain,
  ) {
    super(_board, _chain);

    this._enduranceTotalTargetChainNum = gameConfig.ENDURANCE_TOTAL;
    this._enduranceMinTargetChainNum = gameConfig.ENDURANCE_MIN_ONCE;
    this._enduranceMaxTargetChainNum = gameConfig.ENDURANCE_MAX_ONCE;
    // this.initEnduranceChainNums();
  }

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
    // TODO: be careful for infinite loop
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

  nextTargetChain() {
    // this._totalChainNum += this._currentTargetChainNum;
    // if (this._totalChainNum >= this._enduranceTotalTargetChainNum) {
    //   // or _enduranceChainVariablity.every((ele) => ele === 0)
    //   this._everyPhaseEnds = true;
    //   return;
    // }
    this._currentTargetChainNum = this.getNextEnduranceChainNum();
  }

  initTargetChain() {
    this.initEnduranceChainNums();
    this._currentTargetChainNum = this.getNextEnduranceChainNum();
    this._totalChainNum = 0;
  }

  isLastPhase() {
    return false; // always false
  }

  goNextLevel(setStateGeneSeed: () => void, setStateGameClear: () => void): void {
    this._totalChainNum += this._currentTargetChainNum;
    if (this._totalChainNum >= this._enduranceTotalTargetChainNum) {
      setStateGameClear();
    } else {
      setStateGeneSeed();
      this.addValidVanishPuyoNum(this.currentTargetChainNum * 4);
      this.nextTargetChain();
      this._chain.initConnectedPuyos();
    }
  }

  get enduranceTotalTargetChainNum() { return this._enduranceTotalTargetChainNum; }
}