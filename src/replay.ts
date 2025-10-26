import { baseManiPuyo } from "./types";
import { recordPuyoSteps } from "./record";
import { stateHandle, GameState } from "./state";
import { DrawWithCanvas } from "./drawWithCanvas";
import { gameConfig } from "./config";
import { Board } from "./board";
import { Bounce } from "./bounce";
import { Chain } from "./chain";
import lang from "../locales";

export class Replay {
  private _replaySlider: HTMLInputElement;
  private _recordedPuyos: any[];
  private _replaySteps: any[];
  private _board: Board;
  private _styleElement: HTMLStyleElement;
  private _infoElement: HTMLDivElement;
  private _boundKeydownHandler: (e: KeyboardEvent) => void;
  private _debounceTimer: any;

  constructor(
    private _draw: DrawWithCanvas,
    private _chain: Chain
  ) {
    this._recordedPuyos = [];
    this._replaySteps = [];
    // A dummy bounce object for board creation
    const bounce = new Bounce();
    this._board = new Board(bounce);
  }

  public startReplay() {
    this._recordedPuyos = recordPuyoSteps.recordedPuyos;
    if (this._recordedPuyos.length === 0) {
      alert("No record data to replay.");
      return;
    }

    this._replaySteps = this.getReplaySteps();
    stateHandle.setState(GameState.REPLAY);
    this.createReplaySlider();
    this.drawStep(0);

    this._boundKeydownHandler = this.handleKeyDown.bind(this);
    document.addEventListener('keydown', this._boundKeydownHandler);
  }

  private createReplaySlider() {
    this._replaySlider = document.createElement('input');
    this._replaySlider.id = 'replay-slider';
    this._replaySlider.type = 'range';
    this._replaySlider.min = '0';
    this._replaySlider.max = String(this._replaySteps.length - 1);
    this._replaySlider.value = '0';

    this._infoElement = document.createElement('div');
    this._infoElement.id = 'replay-info';
    document.body.appendChild(this._infoElement);

    const styles = `
      @keyframes pulse {
        0% {
          box-shadow: 0 0 0 0 rgba(255, 140, 0, 0.4);
        }
        70% {
          box-shadow: 0 0 0 10px rgba(255, 140, 0, 0);
        }
        100% {
          box-shadow: 0 0 0 0 rgba(255, 140, 0, 0);
        }
      }

      #replay-slider {
        -webkit-appearance: none;
        appearance: none;
        width: 80%;
        height: 10px;
        background: #d3d3d3;
        outline: none;
        opacity: 0.7;
        -webkit-transition: .2s;
        transition: opacity .2s;
        position: fixed;
        bottom: 10px;
        left: 10%;
        z-index: 1000;
      }

      #replay-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 28px;
        height: 28px;
        background: #ff8c00;
        cursor: pointer;
        border-radius: 50%;
        border: 2px solid #fff;
        box-shadow: 0 0 5px rgba(0,0,0,0.5);
        animation: pulse 2s infinite;
      }

      #replay-slider::-moz-range-thumb {
        width: 28px;
        height: 28px;
        background: #ff8c00;
        cursor: pointer;
        border-radius: 50%;
        border: 2px solid #fff;
        box-shadow: 0 0 5px rgba(0,0,0,0.5);
      }

      #replay-info {
        position: fixed;
        bottom: 40px; /* Position above the slider */
        left: 10%;
        width: 80%;
        text-align: center;
        color: white;
        font-size: 16px;
        z-index: 1000;
      }
    `;
    this._styleElement = document.createElement("style");
    this._styleElement.innerText = styles;
    document.head.appendChild(this._styleElement);

    document.body.appendChild(this._replaySlider);

    this._replaySlider.addEventListener('input', (e) => {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(() => {
        const step = parseInt((e.target as HTMLInputElement).value);
        this.drawStep(step);
      }, 10);
    });
  }

  private getReplaySteps() {
    const replaySteps = [];
    let i = 0;
    while (i < this._recordedPuyos.length) {
      const record = this._recordedPuyos[i];
      const currentFlag = record[3];

      if (currentFlag === recordPuyoSteps.FLOAT_PUYO_REC_FLAG) {
        const floatStep = [];
        while (i < this._recordedPuyos.length && this._recordedPuyos[i][3] === recordPuyoSteps.FLOAT_PUYO_REC_FLAG) {
          floatStep.push(this._recordedPuyos[i]);
          i++;
        }

        // The next group should be DID_FLOAT records.
        if (i < this._recordedPuyos.length && this._recordedPuyos[i][3] === recordPuyoSteps.DID_FLOAT_PUYO_REC_FLAG) {
          const didFloatStep = [];
          while (i < this._recordedPuyos.length && this._recordedPuyos[i][3] === recordPuyoSteps.DID_FLOAT_PUYO_REC_FLAG) {
            didFloatStep.push(this._recordedPuyos[i]);
            i++;
          }
          // Merge them into one step
          replaySteps.push([...floatStep, ...didFloatStep]);
        } else {
          // Should not happen, but as a fallback, add floatStep as a separate step.
          replaySteps.push(floatStep);
        }
      } else if (currentFlag === recordPuyoSteps.MANIPULATE_PUYO_REC_FLAG) {
        if (i + 1 < this._recordedPuyos.length && this._recordedPuyos[i + 1][3] === recordPuyoSteps.MANIPULATE_PUYO_REC_FLAG) {
          replaySteps.push([this._recordedPuyos[i], this._recordedPuyos[i + 1]]);
          i += 2;
        } else {
          replaySteps.push([this._recordedPuyos[i]]);
          i++;
        }
      } else {
        const bulkStep = [];
        const bulkFlag = currentFlag;
        while (i < this._recordedPuyos.length && this._recordedPuyos[i][3] === bulkFlag) {
          bulkStep.push(this._recordedPuyos[i]);
          i++;
        }
        if (bulkStep.length > 0) {
          replaySteps.push(bulkStep);
        }
      }
    }
    return replaySteps;
  }

  private drawStep(step: number) {
    let boardState = this._board.createBoard();
    const stepsToApply = this._replaySteps.slice(0, step + 1);

    for (const currentStep of stepsToApply) {
      const firstRecord = currentStep[0];
      if (firstRecord && firstRecord[3] === recordPuyoSteps.SEED_PUYO_REC_FLAG) {
        // New phase, clear the board before applying seed puyos
        boardState = this._board.createBoard();
      }

      for (const record of currentStep) {
        const [x, y, color] = record;
        if (x >= gameConfig.BOARD_LEFT_EDGE && x < gameConfig.BOARD_RIGHT_EDGE && y < gameConfig.BOARD_BOTTOM_EDGE) {
          boardState[y][x] = color;
        }
      }
    }

    // Find next and double next puyos for replay display
    let nextPuyo: baseManiPuyo = null;
    let doubleNextPuyo: baseManiPuyo = null;
    let foundNext = false;

    for (let i = step + 1; i < this._replaySteps.length; i++) {
      const futureStep = this._replaySteps[i];
      const firstRecord = futureStep[0];

      if (firstRecord && firstRecord[3] === recordPuyoSteps.MANIPULATE_PUYO_REC_FLAG) {
        if (!foundNext) {
          if (futureStep.length >= 2) {
            nextPuyo = {
              parentColor: futureStep[0][2],
              childColor: futureStep[1][2],
              parentX: 0, parentY: 0, angle: 180
            };
          }
          foundNext = true;
        } else {
          if (futureStep.length >= 2) {
            doubleNextPuyo = {
              parentColor: futureStep[0][2],
              childColor: futureStep[1][2],
              parentX: 0, parentY: 0, angle: 180
            };
          }
          break;
        }
      }
    }

    this._infoElement.innerText = `Step: ${step + 1} / ${this._replaySteps.length} | ${lang.replayStep} | ${lang.replayPhase} | ${lang.replayQuit}`;

    this._draw.clear();
    this._draw.drawBoardBackground();
    this._draw.drawNextBoard(nextPuyo, doubleNextPuyo);
    this._chain.findConnectedPuyos(boardState, () => { }, 2, true);
    this._draw.drawBoardPuyos(boardState);
    this._draw.drawConnecting();
    this.updateSliderTrack();
  }

  public endReplay() {
    if (this._replaySlider) {
      this._replaySlider.remove();
      this._replaySlider = null;
    }
    if (this._styleElement) {
      this._styleElement.remove();
      this._styleElement = null;
    }
    if (this._infoElement) {
        this._infoElement.remove();
        this._infoElement = null;
    }
    recordPuyoSteps.recordedPuyos = [];
    this._replaySteps = [];
    stateHandle.setState(GameState.MENU);
    this._draw.clear();

    document.removeEventListener('keydown', this._boundKeydownHandler);
  }

  private handleKeyDown(e: KeyboardEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (e.key === 'ArrowLeft') {
      this._replaySlider.value = String(Math.max(0, parseInt(this._replaySlider.value) - 1));
      this.drawStep(parseInt(this._replaySlider.value));
    } else if (e.key === 'ArrowRight') {
      this._replaySlider.value = String(Math.min(parseInt(this._replaySlider.max), parseInt(this._replaySlider.value) + 1));
      this.drawStep(parseInt(this._replaySlider.value));
    } else if (e.key === 'm') {
        const currentStep = parseInt(this._replaySlider.value);
        let nextPhaseStep = -1;
        for (let i = currentStep + 1; i < this._replaySteps.length; i++) {
            const step = this._replaySteps[i];
            const firstRecord = step[0];
            if (firstRecord && firstRecord[3] === recordPuyoSteps.SEED_PUYO_REC_FLAG) {
                nextPhaseStep = i;
                break;
            }
        }

        if (nextPhaseStep !== -1) {
            this._replaySlider.value = String(nextPhaseStep);
            this.drawStep(nextPhaseStep);
        }
    } else if (e.key === 'M') { // Shift + m
        const currentStep = parseInt(this._replaySlider.value);
        let prevPhaseStep = -1;
        for (let i = currentStep - 1; i >= 0; i--) {
            const step = this._replaySteps[i];
            const firstRecord = step[0];
            if (firstRecord && firstRecord[3] === recordPuyoSteps.SEED_PUYO_REC_FLAG) {
                prevPhaseStep = i;
                break;
            }
        }

        if (prevPhaseStep !== -1) {
            this._replaySlider.value = String(prevPhaseStep);
            this.drawStep(prevPhaseStep);
        } else {
            // If no previous seed puyo step is found, go to the beginning.
            this._replaySlider.value = '0';
            this.drawStep(0);
        }
    }
  }


  private updateSliderTrack() {
    const slider = this._replaySlider;
    if (!slider) return;
    const progress = (parseInt(slider.value) / parseInt(slider.max)) * 100;
    const color = '#ff8c00'; // DarkOrange
    const trackColor = '#d3d3d3'; // lightgray
    slider.style.background = `linear-gradient(to right, ${color} ${progress}%, ${trackColor} ${progress}%)`;
  }
}
