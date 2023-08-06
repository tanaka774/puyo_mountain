import { Board } from "@/board";
import { MountainBase } from "./mountainBase";
import { Chain } from "@/chain";
import { gameConfig } from "../config";

// TODO: finish implementing!!!
export class MountainCustom extends MountainBase {
  private _selectedAmountRate: number | (() => number); // TODO: rename amount rate?
  private _selectedDistributionNum: string;
  private _selectedMinTargetChainNum: number;
  private _selectedMaxTargetChainNum: number;

  constructor(
    _board: Board,
    _chain: Chain,
  ) {
    super(_board, _chain);
  }

  setSelectedValue(puyoAmount: string, distribution: string, minChainNum: string, maxChainNum: string) {
    this._selectedAmountRate =
      (puyoAmount === 'nothing') ? 0 :
        (puyoAmount === 'pretty-small') ? 0.3 :
          (puyoAmount === 'small') ? 0.6 :
            (puyoAmount === 'normal') ? 1 :
              (puyoAmount === 'large') ? 1.5 :
                (puyoAmount === 'pretty-large') ? 2 :
                  (puyoAmount === 'random') ? () => { return (Math.random() * 2); }
                    : 1;

    // this._selectedDistributionNum =
    //   (distribution === 'narrow') ? 1 :
    //     (distribution === 'normal') ? 4 :
    //       (distribution === 'wide') ? 6 : 4;
    this._selectedDistributionNum = distribution;

    this._selectedMinTargetChainNum = Number(minChainNum);
    this._selectedMaxTargetChainNum = Number(maxChainNum);
  }

  protected decideSeedPuyoNum(): number {
    const getRandomNum = (num) => Math.floor(Math.random() * num)
    const boardWidth = gameConfig.BOARD_RIGHT_EDGE - gameConfig.BOARD_LEFT_EDGE;
    const baseRand = 4;
    const randModi = (getRandomNum(2) === 0) ? getRandomNum(baseRand) : (-1) * getRandomNum(baseRand);
    const meanPuyoHeight = 2;
    let selectedRate: number;
    if (typeof this._selectedAmountRate === 'number') selectedRate = this._selectedAmountRate;
    else if (typeof this._selectedAmountRate === 'function') selectedRate = this._selectedAmountRate();
    const seedPuyoNum = Math.round((boardWidth * meanPuyoHeight + randModi) * selectedRate);
    return seedPuyoNum;
  }

  protected decideDistributionNum(): number {
    const getRandomNum = (num) => Math.floor(Math.random() * num)
    const boardWidth = gameConfig.BOARD_RIGHT_EDGE - gameConfig.BOARD_LEFT_EDGE;
    if (this._selectedDistributionNum === 'narrow') {
      return getRandomNum(2) + 1;
    } else if (this._selectedDistributionNum === 'normal') {
      const column = 3;
      const distributionNum = getRandomNum(column) + 1 + (boardWidth - column);
      return distributionNum;
    } else if (this._selectedDistributionNum === 'wide') {
      return gameConfig.BOARD_RIGHT_EDGE - gameConfig.BOARD_LEFT_EDGE;
    }
  }

  initTargetChain(): void {
    this.setTargetChainNum();
    this._totalChainNum = 0;
  }

  nextTargetChain() {
    this.setTargetChainNum();
  }

  private setTargetChainNum() {
    const minNum = this._selectedMinTargetChainNum;
    const maxNum = this._selectedMaxTargetChainNum;
    this._currentTargetChainNum = minNum + Math.floor(Math.random() * (maxNum - minNum + 1));
  }

  goNextLevel(setStateGeneSeed: () => void, setStateGameClear: () => void): void {
    setStateGeneSeed();
    this._totalChainNum += this._currentTargetChainNum;
    this.nextTargetChain();
    this._chain.initConnectedPuyos();
  }

  getGameStatus(): string {
    return `${this._currentTargetChainNum} 連鎖すべし　計 ${this._totalChainNum} 連鎖`;
  }
}