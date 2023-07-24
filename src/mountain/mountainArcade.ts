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
  private _currentDifficulty: Difficulty;
  private _backgroundColors: string[];

  constructor(
    _board: Board,
    // _move: Move,
    _chain: Chain,
  ) {
    super(_board, _chain);
    // same length as chainnums
    this._backgroundColors = ["rgb(44,125,76)", "rgb(188,135,62)",  "rgb(84,36,28)", "rgb(89,190,200)"]
  }

  protected decideSeedPuyoNum(): number {
    const modi = 
    (this.checkDifficulty(Difficulty.EASY)) ? 0.75 :
    (this.checkDifficulty(Difficulty.NORMAL)) ? 0 :
    (this.checkDifficulty(Difficulty.HARD)) ? -0.75 : 0;
    const divider = 2 + modi + (2 - this._phase / this._targetChainNums.length);
    const seedPuyoNum = this._currentTargetChainNum * 4 / divider;
    return seedPuyoNum;
  }

  nextTargetChain() {
    if (this._targetChainNums[this._phase - 1].length - 1 === this._currentTargetChainIndex &&
      this._targetChainNums.length === this._phase
    ) {
      // end of game
       // TODO: unused?
      this._everyPhaseEnds = true;
      return;
    }

    if (this._targetChainNums[this._phase - 1].length - 1 === this._currentTargetChainIndex) {
      // go to next phase
      this._phase++;
      this._currentTargetChainIndex = 0;
      this._changeBackGround(this._backgroundColors[this._phase - 2]);
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
      (this._currentDifficulty === Difficulty.EASY) ? [[2, 2], [2]] :
        (this._currentDifficulty === Difficulty.NORMAL) ? [[5, 6, 7, 8, 9], [6, 7, 8, 9, 10], [7, 8, 9, 10, 11], [12]] :
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
      this._changeBackGround(this._backgroundColors[this._backgroundColors.length - 1]);
    } else if(!this.isLastPhase()) {
      setStateGeneSeed();
      this.addValidVanishPuyoNum(this.currentTargetChainNum * 4);
      this.nextTargetChain();
      this._chain.initConnectedPuyos();
    }
  }

  setDifficulty(difficulty: Difficulty) { this._currentDifficulty = difficulty; }
  checkDifficulty(difficulty: Difficulty): boolean {
    return this._currentDifficulty === difficulty;
  }

  get resultGrade() { return this._resultGrade; }
}