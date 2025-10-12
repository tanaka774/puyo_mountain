import { recordPuyoSteps } from "./record";
import { stateHandle, GameState } from "./state";
import { DrawWithCanvas } from "./drawWithCanvas";
import { gameConfig } from "./config";
import { Board } from "./board";
import { Bounce } from "./bounce";

export class Replay {
    private _replaySlider: HTMLInputElement;
    private _recordedPuyos: any[];
    private _replaySteps: any[];
    private _board: Board;

    constructor(
        private _draw: DrawWithCanvas
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
    }

    private createReplaySlider() {
        this._replaySlider = document.createElement('input');
        this._replaySlider.type = 'range';
        this._replaySlider.min = '0';
        this._replaySlider.max = String(this._replaySteps.length - 1);
        this._replaySlider.value = '0';
        this._replaySlider.style.position = 'fixed';
        this._replaySlider.style.bottom = '10px';
        this._replaySlider.style.width = '80%';
        this._replaySlider.style.left = '10%';
        this._replaySlider.style.zIndex = '1000';

        document.body.appendChild(this._replaySlider);

        this._replaySlider.addEventListener('input', (e) => {
            const step = parseInt((e.target as HTMLInputElement).value);
            this.drawStep(step);
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
                if (i + 1 < this._recordedPuyos.length && this._recordedPuyos[i+1][3] === recordPuyoSteps.MANIPULATE_PUYO_REC_FLAG) {
                    replaySteps.push([this._recordedPuyos[i], this._recordedPuyos[i+1]]);
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

        this._draw.clear();
        this._draw.drawBoardBackground();
        this.addReplayInfo(step);
        this._draw.drawBoardPuyos(boardState);
    }

    public endReplay() {
        if (this._replaySlider) {
            this._replaySlider.remove();
            this._replaySlider = null;
        }
        recordPuyoSteps.recordedPuyos = [];
        this._replaySteps = [];
        stateHandle.setState(GameState.MENU);
        this._draw.clear();
    }

    private addReplayInfo(step: number) {
        const ctx = this._draw.mainCanvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fillText(`Step: ${step + 1} / ${this._replaySteps.length}`, 10, 30);
        ctx.fillText(`Press 'q' to quit replay`, 10, 60);
    }
}