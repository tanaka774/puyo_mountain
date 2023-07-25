import { Board } from "@/board";
import { MountainBase } from "./mountainBase";
import { Chain } from "@/chain";
import { gameConfig } from "../config";

// TODO: finish implementing!!!
export class MountainCustom extends MountainBase {
  private _selectedDivider: number | (() => number);
  private _selectedDistributionNum: number;
  private _selectedMinTargetChainNum: number;
  private _selectedMaxTargetChainNum: number;

  constructor(
    _board: Board,
    _chain: Chain,
  ) {
    super(_board, _chain);
  }

  setSelectedValue(puyoAmount: string, distribution: string, minChainNum: string, maxChainNum: string) {
    this._selectedDivider =
      (puyoAmount === 'nothing') ? 0 :
        (puyoAmount === 'pretty-small') ? 8 :
          (puyoAmount === 'small') ? 5 :
            (puyoAmount === 'normal') ? 3 :
              (puyoAmount === 'large') ? 2 :
                (puyoAmount === 'pretty-large') ? 1.25 :
                  (puyoAmount === 'random') ? () => { return Math.floor(Math.random() * 5) + 1.5; }
                    : 3;

    this._selectedDistributionNum =
      (distribution === 'narrow') ? 1 :
        (distribution === 'normal') ? 4 :
          (distribution === 'wide') ? 6 : 4;

    this._selectedMinTargetChainNum = Number(minChainNum);
    this._selectedMaxTargetChainNum = Number(maxChainNum);
  }

  protected decideSeedPuyoNum(): number {
    let divider;
    if (this._selectedDivider === 0) return 0;
    else if (typeof this._selectedDivider === 'number') divider = this._selectedDivider;
    else if (typeof this._selectedDivider === 'function') divider = this._selectedDivider();
    const seedPuyoNum = this._currentTargetChainNum * 4 / divider;
    return seedPuyoNum;
  }

  protected decideDistributionNum(): number {
    const getRandomNum = (num) => Math.floor(Math.random() * num);
    const boardWidth = gameConfig.BOARD_RIGHT_EDGE - gameConfig.BOARD_LEFT_EDGE;
    if (this._selectedDistributionNum === boardWidth) return boardWidth;
    else return getRandomNum(boardWidth - 4) + this._selectedDistributionNum;
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