import { Board } from "src/board";
import { MountainBase } from "./mountainBase";
import { Chain } from "src/chain";
import { gameConfig } from "../config";


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
    this._backgroundColors = ["rgb(44,125,76)", "rgb(188,135,62)", "rgb(84,36,28)", "rgb(89,190,200)"]
  }

  protected decideSeedPuyoNum(): number {
    // let modi =
    //   (this.checkDifficulty(Difficulty.EASY)) ? 0.75 :
    //     (this.checkDifficulty(Difficulty.NORMAL)) ? 0 :
    //       (this.checkDifficulty(Difficulty.HARD)) ? -0.75 : 0;
    // modi = (this.isLastPhase()) ? modi - 0.3 : modi;
    // const divider = 2 + modi + (2 - this._phase / this._targetChainNums.length);
    // const seedPuyoNum = this._currentTargetChainNum * 4 / divider;
    // return seedPuyoNum;

    let difficultyRate =
      (this.checkDifficulty(Difficulty.EASY)) ? 0.75 :
        (this.checkDifficulty(Difficulty.NORMAL)) ? 1 :
          (this.checkDifficulty(Difficulty.HARD)) ? 1.25 : 1;
    let phaseRate = 1 + (0.1 * this._phase)

    const getRandomNum = (num) => Math.floor(Math.random() * num)
    const boardWidth = gameConfig.BOARD_RIGHT_EDGE - gameConfig.BOARD_LEFT_EDGE;
    const baseRand = 4;
    const randModi = (getRandomNum(2) === 0) ? getRandomNum(baseRand) : (-1) * getRandomNum(baseRand);
    const meanPuyoHeight = 2;
    const seedPuyoNum = Math.round((boardWidth * meanPuyoHeight + randModi) * difficultyRate * phaseRate);
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
      (this._currentDifficulty === Difficulty.EASY) ? [[4, 5, 6, 7, 8], [5, 6, 7, 8, 9], [6, 7, 8, 9, 10], [12]] :
        (this._currentDifficulty === Difficulty.NORMAL) ? [[5, 6, 7, 8, 9], [6, 7, 8, 9, 10], [7, 8, 9, 10, 11], [13]] :
          (this._currentDifficulty === Difficulty.HARD) ? [[2, 2], [2, 2], [2, 2], [2]] :
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
    if ((this.checkDifficulty(Difficulty.HARD) && this.isLastPhase() && this._board.isBoardPlain()) ||
      ((this.checkDifficulty(Difficulty.EASY) || (this.checkDifficulty(Difficulty.NORMAL))) && this.isLastPhase())
    ) {
      setStateGameClear();
      this._changeBackGround(this._backgroundColors[this._backgroundColors.length - 1]);
    } else if (!this.isLastPhase()) {
      setStateGeneSeed();
      this.addValidVanishPuyoNum(this.currentTargetChainNum * 4);
      this.nextTargetChain();
      this._chain.initConnectedPuyos();
    }
  }

  decideGameResult(hours:number, minutes:number, seconds:number) {
    const totalMinutes = 60 * hours + minutes;
    const unne = this._unnecessaryVanishPuyoNum;
    const score = totalMinutes + unne / 20;
    if (score <= 14) this._resultGrade = 'S';
    else if (score <= 20) this._resultGrade = 'A';
    else if (score <= 30) this._resultGrade = 'B';
    else  this._resultGrade = 'C';
  }

  getGameStatus(): string {
    let res: string;
    if (this.isLastPhase() && this.checkDifficulty(Difficulty.HARD)) {
      res = `${this._currentTargetChainNum} 連鎖全消しすべし`
    } else if (this.isLastPhase()) {
      res = `${this._currentTargetChainNum} 連鎖すべし 最終フェーズ`
    } else {
      res = `${this._currentTargetChainNum} 連鎖すべし フェーズ ${this._phase}`
    }
    return res;
  }

  setDifficulty(difficulty: Difficulty) { this._currentDifficulty = difficulty; }
  checkDifficulty(difficulty: Difficulty): boolean {
    return this._currentDifficulty === difficulty;
  }

  get resultGrade() { return this._resultGrade; }
}