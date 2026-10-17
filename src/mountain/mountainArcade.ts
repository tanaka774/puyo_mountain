import { Board } from "src/board";
import { MountainBase } from "./mountainBase";
import { Chain } from "src/chain";
import { gameConfig } from "../config";
import lang from "../../locales";


export enum Difficulty {
  BEGINNER,
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

  public prepareSeedPuyos() {
    if (this.checkDifficulty(Difficulty.BEGINNER)) {
      console.log("=== BEGINNER MODE START ===");
      console.log("Target chain num:", this._currentTargetChainNum);

      let possibleChains = 0;
      let attempts = 9000;
      let patternIndex = 0;
      const pattern = [2, 3];
      while (possibleChains < this._currentTargetChainNum) {

        // console.log("attempts: ", attempts);
        attempts--;
        if (attempts <= 0) {
          break;
        }

        // console.log("Current chains:", possibleChains, "Target:", this._currentTargetChainNum);
        // add some seed puyos, and if you can succeed to increment chain number, go to next, if not go back and do it again
        const originalVirtualBoard = JSON.parse(JSON.stringify(this.getVirtualBoard()));
        const originalSeedPuyos = JSON.parse(JSON.stringify(this._seedPuyos));
        // console.log("virtual board: ", originalVirtualBoard);

        const expectedIncrement = pattern[patternIndex % 2];
        const remainingChains = this._currentTargetChainNum - possibleChains;
        const requiredIncrease = Math.min(expectedIncrement, remainingChains);

        let virtualBoardToBeAdded = this.addMoreSeedPuyos(requiredIncrease * (possibleChains < 6 ? 6 : 5), this.getVirtualBoard(), possibleChains);

        // Fix 4+ connected groups in the new board before checking improvement
        const savedVirtualBoard = this._virtualBoard;
        const savedSeedPuyos = this._seedPuyos;
        this._virtualBoard = JSON.parse(JSON.stringify(virtualBoardToBeAdded));
        this.updateSeedPuyosFromVirtualBoard();
        this.changeExcessPuyo();
        virtualBoardToBeAdded = this._virtualBoard; // get fixed board
        // Restore original state for now
        this._virtualBoard = savedVirtualBoard;
        this._seedPuyos = savedSeedPuyos;

        this._chain.detectPossibleChain(virtualBoardToBeAdded, null);

        if (this._chain.maxVirtualChainCount < possibleChains + requiredIncrease) {
          // reset chain instance status relating to virtual board
          this._virtualBoard = originalVirtualBoard;
          this._seedPuyos = originalSeedPuyos;
          continue;
        }

        // Accept the improved board (already fixed)
        this._virtualBoard = virtualBoardToBeAdded;
        this.updateSeedPuyosFromVirtualBoard(); // ensure seed puyos match
        possibleChains = this._chain.maxVirtualChainCount;
        patternIndex++;

      }


      // Final verification: ensure no 4+ connected groups
      let finalChainable = [];
      this._chain.findConnectedPuyos(this._virtualBoard, (savePuyos) => {
        finalChainable.push(savePuyos)
      }, 4, false);
      if (finalChainable.length > 0) {
        finalChainable.forEach((group, idx) => {
          console.error(`  group ${idx}: size ${group.length}`);
        });
      } else {
        console.log("Verified: No 4+ connected groups in final board.");
      }

      // set floating puyos manually here only with virtual board
      this.createFloatingPuyosFromVirtualBoard();
    } else {
      super.prepareSeedPuyos();
    }
  }

  /**
   * unused but being simple is good
   */
  private decideVariabilitySimpler(seedPuyoNum: number) {
    // set this._seedPuyoVariability with all number of seedPuyoNum
    const boardWidth = gameConfig.BOARD_RIGHT_EDGE - gameConfig.BOARD_LEFT_EDGE;
    const basePuyosPerColumn = Math.floor(seedPuyoNum / boardWidth / 2);
    const leftPuyos = seedPuyoNum - basePuyosPerColumn * boardWidth;
    const getRandomNum = (num) => Math.floor(Math.random() * num)

    for (let index = 0; index < boardWidth; index++) {
      this._seedPuyoVariability[index] = basePuyosPerColumn;
    }

    for (let i = 0; i < leftPuyos; i++) {
      const index = getRandomNum(boardWidth);
      if (this._seedPuyoVariability[index] >= 11) {
        i--;

        continue;
      }
      this._seedPuyoVariability[index]++;
    }
  }

  /**
  * return new board adding seed puyos
  */
  private addMoreSeedPuyos(puyosToBeAdded: number, originalBoard: number[][], possibleChains: number): number[][] {
    const newBoard: number[][] = JSON.parse(JSON.stringify(originalBoard));
    const boardWidth = gameConfig.BOARD_RIGHT_EDGE - gameConfig.BOARD_LEFT_EDGE;
    const getRandomNum = (num: number) => Math.floor(Math.random() * num)
    const getLowestY = (x: number): number => {
      for (let y = gameConfig.BOARD_BOTTOM_EDGE - 1; y >= gameConfig.BOARD_TOP_EDGE; y--) {
        if (newBoard[y][x] === gameConfig.NO_COLOR) {
          return y;
        }
      }
      return gameConfig.BOARD_TOP_EDGE;
    }

    for (let i = 0; i < puyosToBeAdded; i++) {
      const x = getRandomNum(boardWidth) + gameConfig.BOARD_LEFT_EDGE;
      const y = getLowestY(x)

      const limitRow = (possibleChains < 6) ? gameConfig.BOARD_TOP_EDGE + 3 :
        ((possibleChains < 9) ? gameConfig.BOARD_TOP_EDGE + 1
          : ((x === gameConfig.PUYO_BIRTH_POSX) ? gameConfig.BOARD_TOP_EDGE : gameConfig.BOARD_TOP_EDGE - 2));
      if (y <= limitRow) {
        i--;
        continue;
      }
      newBoard[y][x] = Math.floor(Math.random() * 4) + 1  // set puyo color
    }

    return newBoard;
  }

  /**
   * Simple conversion from virtual board to floating puyos
   * Positions floating puyos directly above their final positions
   */
  private updateSeedPuyosFromVirtualBoard() {
    this._seedPuyos = [];
    for (let x = gameConfig.BOARD_LEFT_EDGE; x < gameConfig.BOARD_RIGHT_EDGE; x++) {
      for (let y = gameConfig.BOARD_TOP_EDGE; y < gameConfig.BOARD_BOTTOM_EDGE; y++) {
        if (this._virtualBoard[y][x] !== gameConfig.NO_COLOR) {
          this._seedPuyos.push({ posX: x, posY: y, color: this._virtualBoard[y][x] });
        }
      }
    }
  }

  private createFloatingPuyosFromVirtualBoard() {
    const boardWidth = gameConfig.BOARD_RIGHT_EDGE - gameConfig.BOARD_LEFT_EDGE;

    // Clear any existing floating puyos
    this._floatingSeedPuyos = [];

    // For each column, create floating puyos from bottom to top
    for (let xIndex = 0; xIndex < boardWidth; xIndex++) {
      const x = xIndex + gameConfig.BOARD_LEFT_EDGE;
      let puyoCount = 0;

      // First pass: count puyos in this column
      for (let y = gameConfig.BOARD_BOTTOM_EDGE - 1; y >= gameConfig.BOARD_TOP_EDGE; y--) {
        if (this._virtualBoard[y][x] !== gameConfig.NO_COLOR) {
          puyoCount++;
        }
      }

      if (puyoCount === 0) continue;

      // Calculate lowestY similar to setFloatingSeedPuyos but with higher value
      let lowestY: number;
      const lowestLine = gameConfig.BOARD_BOTTOM_EDGE / 2;
      // Use higher base value to ensure puyos are placed within valid range
      const baseOffset = 8; // Additional offset to ensure higher position (higher than original)
      if (puyoCount >= lowestLine) {
        lowestY = puyoCount + baseOffset;
      } else {
        lowestY = Math.floor(Math.random() * lowestLine) + puyoCount + baseOffset;
      }

      // Ensure lowestY is within board bounds and high enough
      lowestY = Math.min(lowestY, gameConfig.BOARD_BOTTOM_EDGE - 1);
      // Also ensure the stack doesn't go below BOARD_TOP_EDGE
      if (lowestY - (puyoCount - 1) < gameConfig.BOARD_TOP_EDGE) {
        lowestY = gameConfig.BOARD_TOP_EDGE + (puyoCount - 1);
      }

      // Second pass: create floating puyos
      let currentPuyoIndex = 0;
      for (let y = gameConfig.BOARD_BOTTOM_EDGE - 1; y >= gameConfig.BOARD_TOP_EDGE; y--) {
        if (this._virtualBoard[y][x] !== gameConfig.NO_COLOR) {
          const floatingY = lowestY - currentPuyoIndex;
          const floatingSeedPuyo = {
            posX: x,
            posY: floatingY,
            color: this._virtualBoard[y][x]
          };
          this._floatingSeedPuyos.push(floatingSeedPuyo);
          currentPuyoIndex++;
        }
      }
    }
  }

  protected decideSeedPuyoNum(): number {
    let difficultyRate =
      (this.checkDifficulty(Difficulty.BEGINNER)) ? 2 :
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
    this._targetChainNums =
      (this._currentDifficulty === Difficulty.BEGINNER) ? [[7, 8, 9, 10, 11], [4, 5, 6, 7, 8], [5, 6, 7, 8, 9], [10]] :
        (this._currentDifficulty === Difficulty.EASY) ? [[4, 5, 6, 7, 8], [5, 6, 7, 8, 9], [6, 7, 8, 9, 10], [12]] :
          (this._currentDifficulty === Difficulty.NORMAL) ? [[5, 6, 7, 8, 9], [6, 7, 8, 9, 10], [7, 8, 9, 10, 11], [13]] :
            // (this._currentDifficulty === Difficulty.HARD) ? [[2, 2], [2, 2], [2, 2], [2]] :
            (this._currentDifficulty === Difficulty.HARD) ? [[6, 7, 8, 9, 10], [7, 8, 9, 10, 11], [8, 9, 10, 11, 12], [14]] :
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
      ((this.checkDifficulty(Difficulty.BEGINNER) || this.checkDifficulty(Difficulty.EASY) || (this.checkDifficulty(Difficulty.NORMAL))) && this.isLastPhase())
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

  decideGameResult(hours: number, minutes: number, seconds: number) {
    const totalMinutes = 60 * hours + minutes;
    const unne = this._unnecessaryVanishPuyoNum;
    const score = totalMinutes + unne / 20;
    if (score <= 14) this._resultGrade = 'S';
    else if (score <= 20) this._resultGrade = 'A';
    else if (score <= 30) this._resultGrade = 'B';
    else this._resultGrade = 'C';
  }

  getGameStatus(): string {
    let res: string;
    if (this.isLastPhase() && this.checkDifficulty(Difficulty.HARD)) {
      res = lang.chainAllClear(this._currentTargetChainNum);
    } else if (this.isLastPhase()) {
      res = lang.chainLastPhase(this._currentTargetChainNum);
    } else {
      res = lang.chainPhase(this._currentTargetChainNum, this._phase);
    }
    return res;
  }

  setDifficulty(difficulty: Difficulty) { this._currentDifficulty = difficulty; }
  checkDifficulty(difficulty: Difficulty): boolean {
    return this._currentDifficulty === difficulty;
  }

  get resultGrade() { return this._resultGrade; }
}
