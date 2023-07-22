import { Board } from "src/board";
import { MountainBase } from "./mountainBase";
import { Move } from "src/move";
import { Chain } from "src/chain";


export enum Difficulty {
  EASY,
  NORMAL,
  HARD
}

export class MountainArcade extends MountainBase {
  private _resultGrade: string;
  protected _currentDifficulty: Difficulty;

  constructor(
    _board: Board,
    // _move: Move,
    _chain: Chain,
  ) {
    super(_board, _chain);
  }

  nextTargetChain() {
    if (this._targetChainNums[this._phase - 1].length - 1 === this._currentTargetChainIndex &&
      this._targetChainNums.length === this._phase
    ) {
      // end of game
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

  initTargetChain() {
    // this._targetChainNums =
    //   (this._currentDifficulty === Difficulty.EASY) ?  [[4, 5, 6, 7, 8], [5, 6, 7, 8, 9], [6, 7, 8, 9, 10]] :
    //     (this._currentDifficulty === Difficulty.NORMAL) ?  [[5, 6, 7, 8, 9], [6, 7, 8, 9, 10], [7, 8, 9, 10, 11]] :
    //       (this._currentDifficulty === Difficulty.HARD) ? [[6, 7, 8, 9, 10], [7, 8, 9, 10, 11], [8, 9, 10, 11, 12]] :
    //         [[]];
    this._targetChainNums =
      (this._currentDifficulty === Difficulty.EASY) ? [[4, 4], [2]] :
        (this._currentDifficulty === Difficulty.NORMAL) ? [[6, 6], [6, 6], [6, 6]] :
          (this._currentDifficulty === Difficulty.HARD) ? [[8, 8], [8, 8], [8, 8]] :
            [[]];

    this._currentTargetChainIndex = 0;
    this._currentTargetChainNum = this._targetChainNums[this._phase - 1][this._currentTargetChainIndex];

    //common
    this._totalChainNum = 0;
  }

  initGameResult() {
    this._phase = 1;
    this._everyPhaseEnds = false;
    this._validVanishPuyoNum = 0;
    this._unnecessaryVanishPuyoNum = 0;
    this._resultGrade = ''; // only in arcade
  }

  isLastPhase(): boolean {
    if (this._targetChainNums) return this._targetChainNums.length === this._phase;
    else return false;
  }

  goNextLevel(setStateGeneSeed: () => void, setStateGameClear: () => void): void {
    if (this.isLastPhase() && this._board.isBoardPlain()
    ) {
      setStateGameClear();
    } else if(!this.isLastPhase()) {
      setStateGeneSeed();
      this.addValidVanishPuyoNum(this.currentTargetChainNum * 4);
      this.nextTargetChain();
      this._chain.initConnectedPuyos();
    }
  }

  setDifficulty(difficulty: Difficulty) { this._currentDifficulty = difficulty; }

  get resultGrade() { return this._resultGrade; }
}