import { gameConfig } from "./config.ts"
import { gameState } from "./state.ts"
import { Game } from "./game.ts"
import { Split } from "./split.ts"
import { Move } from "./move.ts"
import { Chain } from "./chain.ts"
import { Board } from "./board.ts"
import { Current } from "./current.ts"
import { Bounce } from "./bounce.ts"


export class DrawWithCanvas {
  // const canvas = document.getElementById('tetrisCanvas');
  // const ctx = canvas.getContext('2d');
  //
  // const nextPuyoCanvas = document.getElementById('nextPuyoCanvas');
  // const nextPuyoCtx = nextPuyoCanvas.getContext('2d');

  private mainCanvas: HTMLCanvasElement;
  // TODO: type should be nullable?
  private ctx: CanvasRenderingContext2D;
  private nextPuyoCanvas: HTMLCanvasElement;
  // TODO: type should be nullable?
  private nextPuyoCtx: CanvasRenderingContext2D;

  constructor(
    // private _game: Game,
    private _bounce: Bounce,
    private _board: Board,
    private _current: Current,
    private _move: Move,
    private _split: Split,
    private _chain: Chain,
    mainCanvasName: string,
    nextPuyoCanvasName: string,
  ) {
    this.mainCanvas = document.getElementById(mainCanvasName) as HTMLCanvasElement;
    this.ctx = this.mainCanvas.getContext('2d');
    this.nextPuyoCanvas = document.getElementById(nextPuyoCanvasName) as HTMLCanvasElement;
    this.nextPuyoCtx = this.nextPuyoCanvas.getContext('2d');
  }

  draw() {
    this.ctx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
    for (let y = gameConfig.BOARD_TOP_EDGE; y < gameConfig.BOARD_BOTTOM_EDGE; y++) {
      for (let x = gameConfig.BOARD_LEFT_EDGE; x < gameConfig.BOARD_RIGHT_EDGE; x++) {
        const cell = this._board.board[y][x];
        if (cell !== gameConfig.NO_COLOR) {
          this.drawPuyo(x, y, gameConfig.PUYO_COLORS[cell])
        }
      }
    }

    // this.draw puyo's connecting
    this.drawConnecting();

    // this.draw floating puyos
    // TODO: modify this condition (or remove)
    // if (currentState === gameState.FALLING_ABOVE_CHAIN) {
    //   if (chainInfo.chainVanishWaitCount >= gameConfig.VANISH_WAIT_TIME) {
    for (const floatingPuyo of this._chain.floatingPuyos) {
      this.drawPuyo(floatingPuyo.posX, floatingPuyo.posY, gameConfig.PUYO_COLORS[floatingPuyo.color]);
    }
    //   }
    // }

    // this.draw splittedPuyo
    // TODO: modify this condition (or remove)
    if (gameState.currentState === gameState.SPLITTING ||
      (gameState.currentState === gameState.JUST_DRAWING &&
        gameState.prevState === gameState.SPLITTING)
    ) {
      this.drawPuyo(this._split.splittedPuyo.posX, this._split.splittedPuyo.posY, gameConfig.PUYO_COLORS[this._split.splittedPuyo.color]);
      // TODO: is this necessary??? already should be locked on board
      // this.drawPuyo(splittedPuyo.unsplittedX, splittedPuyo.unsplittedY, gameConfig.PUYO_COLORS[splittedPuyo.unsplittedColor]);
    }

    // this.draw currentPuyo
    if (this._current.currentPuyo) {
      this.drawPuyo(this._current.currentPuyo.parentX, this._current.currentPuyo.parentY, gameConfig.PUYO_COLORS[this._current.currentPuyo.parentColor]);

      const [childX, childY] = this._current.getChildPos(this._current.currentPuyo);
      this.drawPuyo(childX, childY, gameConfig.PUYO_COLORS[this._current.currentPuyo.childColor]);
    }

    // this.draw nextPuyo and doubleNextPuyo on right-side to board
    if (this._current.nextPuyo && this._current.doubleNextPuyo) { // <- is this condition necessary?
      this.nextPuyoCtx.fillStyle = gameConfig.PUYO_COLORS[this._current.nextPuyo.parentColor];
      // nextPuyothis.ctx.fillRect((gameConfig.BOARD_WIDTH) * CELL_SIZE, 1 * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      this.nextPuyoCtx.fillRect(0.3 * gameConfig.CELL_SIZE, 1 * gameConfig.CELL_SIZE, gameConfig.CELL_SIZE, gameConfig.CELL_SIZE);
      this.nextPuyoCtx.fillStyle = gameConfig.PUYO_COLORS[this._current.nextPuyo.childColor];
      this.nextPuyoCtx.fillRect(0.3 * gameConfig.CELL_SIZE, 2 * gameConfig.CELL_SIZE, gameConfig.CELL_SIZE, gameConfig.CELL_SIZE);

      this.nextPuyoCtx.fillStyle = gameConfig.PUYO_COLORS[this._current.doubleNextPuyo.parentColor];
      this.nextPuyoCtx.fillRect(0.3 * gameConfig.CELL_SIZE, 4 * gameConfig.CELL_SIZE, gameConfig.CELL_SIZE, gameConfig.CELL_SIZE);
      this.nextPuyoCtx.fillStyle = gameConfig.PUYO_COLORS[this._current.doubleNextPuyo.childColor];
      this.nextPuyoCtx.fillRect(0.3 * gameConfig.CELL_SIZE, 5 * gameConfig.CELL_SIZE, gameConfig.CELL_SIZE, gameConfig.CELL_SIZE);
    }

    this.drawAfterimage();

    this.drawTriggerPuyos();
  }


  drawPuyo(x, y, color, willStorke = true) {
    const drawPosX = (x - gameConfig.BOARD_LEFT_EDGE) * gameConfig.CELL_SIZE;
    const drawPosY = (y - gameConfig.BOARD_TOP_EDGE) * gameConfig.CELL_SIZE;

    const radiusX = gameConfig.CELL_SIZE * 15 / 32;
    const radiusY = gameConfig.CELL_SIZE * 14 / 32;
    const elliX = drawPosX + radiusX + gameConfig.CELL_SIZE / 16;
    const elliY = drawPosY + radiusY + gameConfig.CELL_SIZE / 10;
    // this.drawEllipse(this.ctx, elliX, elliY, radiusX, radiusY, color, willStorke);
    // this.drawEyes(this.ctx, elliX, elliY);

    if (this._bounce.willBounce &&
      [...this._bounce.bouncePuyos].some((elem: string) => {
        const posX = parseInt(elem.split(',')[0], 10);
        const posY = parseInt(elem.split(',')[1], 10);
        return posX === x && posY === y
      })
    ) {
      this.drawBounce(x, y, radiusY, elliY, () => { this.drawEllipse(elliX, elliY, radiusX, radiusY, color, willStorke); });
    } else {
      this.drawEllipse(elliX, elliY, radiusX, radiusY, color, willStorke);
    }

  }

  drawBounce(oriX, oriY, radiusY, elliY, drawCallback) {
    // remove connecting first, is using x, y here okay?
    this._chain.deleteConnectedPuyo(oriX, oriY);

    // // this is an old way.
    // const bounceLimit = 4;
    // const changeRate = Math.sin(bounceEffect.bounceQuantities * Math.PI / 180) / bounceLimit;
    // const bounceRate = 1 - changeRate;
    // const yModifier = (gameConfig.BOARD_BOTTOM_EDGE - y) / 10 + 1;
    // this.ctx.transform(1, 0, 0, bounceRate, 0, (28) * changeRate * radiusY / yModifier);
    // this.drawCallback();
    // this.ctx.setTransform(1, 0, 0, 1, 0, 0);

    const changeRate = Math.sin(this._bounce.bounceQuantities * Math.PI / 180) / 5;
    this.ctx.save();
    // TODO: appropriate parameter not behaving differently according to Y
    this.ctx.translate(0, elliY + (radiusY / 2) * changeRate);
    this.ctx.scale(1, 1 - changeRate);
    this.ctx.translate(0, -elliY + radiusY * changeRate);
    drawCallback();
    this.ctx.restore();

    this._bounce.timeElapses(
      () => this._chain.findConnectedPuyos(this._board.board, (_) => { /*do nothing*/ }
      ));
  }

  drawConnecting() {
    this._chain.connectedPuyos.forEach(elem => {
      const [x, y, color] = elem.split(':')[0].split(',').map(str => Number.parseInt(str, 10));
      const [diffX, diffY] = elem.split(':')[1].split(',').map(str => Number.parseInt(str, 10));;

      // TODO: do not declare these variables here
      const radiusX = gameConfig.CELL_SIZE * 4 / 9;
      const radiusY = gameConfig.CELL_SIZE * 3 / 7;

      if (diffX === 0 && diffY === 1) {
        this.drawGlueToDown(gameConfig.CELL_SIZE, x, y, x, y + diffY, radiusX, radiusY, gameConfig.PUYO_COLORS[color]);
      } else if (diffX === 1 && diffY === 0) {
        this.drawGlueToRight(gameConfig.CELL_SIZE, x, y, x + diffX, y, radiusX, radiusY, gameConfig.PUYO_COLORS[color]);
      } else if (diffX === 0 && diffY === -1) {
        // need to verify
        this.drawGlueToDown(gameConfig.CELL_SIZE, x, y + diffY, x, y, radiusX, radiusY, gameConfig.PUYO_COLORS[color]);
      } else if (diffX === -1 && diffY === 0) {
        // need to verify
        this.drawGlueToRight(gameConfig.CELL_SIZE, x + diffX, y, x, y, radiusX, radiusY, gameConfig.PUYO_COLORS[color]);
      }
    })
  }

  drawAfterimage() {
    // after other state than MANIP like SPLIT, it enters this in certain condition
    if (!this._current.currentPuyo) return;

    if (this._move.rotateDrawing.isRotating) {
      const devideNum = 3;
      for (let n = 1; n < devideNum; n++) {
        const angle = this._move.rotateDrawing.changeAngle * (3 / 5 + 2 / 5 * n / devideNum) + this._move.rotateDrawing.prevAngle;
        const rotatingX = this._current.currentPuyo.parentX + Math.cos((angle * (-1) + 270) * Math.PI / 180);
        const rotatingY = this._current.currentPuyo.parentY - Math.sin((angle * (-1) + 270) * Math.PI / 180);
        const alpha = 0.2 + 0.2 * n / devideNum;
        this.drawPuyo(rotatingX, rotatingY, this.addAlpha(gameConfig.PUYO_COLORS[this._current.currentPuyo.childColor], alpha), false);
      }

      this._move.rotateDrawing.drawCount--;
      if (this._move.rotateDrawing.drawCount <= 0) {
        this._move.rotateDrawing.isRotating = false;
        this._move.rotateDrawing.drawCount = gameConfig.ROTATING_TIME;
      }
    }
    // this.draw puyo moving horizontally
    if (this._move.movingHorDrawing.isMovingHor) {
      // TODO: if you do this, it needs more frames
      const diffX = this._move.movingHorDrawing.targetX - this._move.movingHorDrawing.drawingX;
      const [childX, childY] = this._current.getChildPos(this._current.currentPuyo);
      // only this.draw circle with color not stroke or eye
      const devideNum = 3;
      for (let n = 1; n < devideNum; n++) {
        const alpha = 0.2 + 0.1 * n / devideNum;
        if (!(diffX < 0 && this._current.currentPuyo.angle === 270))
          this.drawPuyo(this._current.currentPuyo.parentX - (diffX * (2 / 5 * n / devideNum)), this._current.currentPuyo.parentY, this.addAlpha(gameConfig.PUYO_COLORS[this._current.currentPuyo.parentColor], alpha), false);
        if (!(diffX > 0 && this._current.currentPuyo.angle === 90))
          this.drawPuyo(childX - (diffX * (2 / 5 * n / devideNum)), childY, this.addAlpha(gameConfig.PUYO_COLORS[this._current.currentPuyo.childColor], alpha), false);
      }

      this._move.movingHorDrawing.drawCount--;
      if (this._move.movingHorDrawing.drawCount <= 0) {
        this._move.movingHorDrawing.isMovingHor = false;
        this._move.movingHorDrawing.drawCount = gameConfig.HOR_MOVING_TIME;
      }
    }
  }

  drawTriggerPuyos() {
    if (this._chain.maxVirtualChainCount < 2 ||
      gameState.currentState !== gameState.MANIPULATING
    ) return;

    this._chain.maxTriggerPuyos.forEach((elem) => {
      const drawPosX = (elem[0] - gameConfig.BOARD_LEFT_EDGE) * gameConfig.CELL_SIZE;
      const drawPosY = (elem[1] - gameConfig.BOARD_TOP_EDGE) * gameConfig.CELL_SIZE;

      this.ctx.strokeStyle = "gray";
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(drawPosX, drawPosY, gameConfig.CELL_SIZE, gameConfig.CELL_SIZE);
    })
  }


  drawGlueToDown(cellSize, x1, y1, x2, y2, radiusX, radiusY, color) {
    x1 *= cellSize; x1 += cellSize / 2;
    x2 *= cellSize; x2 += cellSize / 2;
    y1 *= cellSize; y1 += cellSize / 2;
    y2 *= cellSize; y2 += cellSize / 2;
    const elliCenterX = (x1 + x2) / 2;
    const elliCenterY = (y1 + y2) / 2;
    const xElliMod = radiusX * 4 / 5;
    const yElliMod = radiusY / 3;
    const xContMod = radiusX / 5;

    const leftStartX = x1 - xElliMod;
    const leftStartY = y1 + yElliMod;
    const leftContX = elliCenterX - xContMod;
    const leftContY = elliCenterY;
    const leftEndX = x2 - xElliMod;
    const leftEndY = y2 - yElliMod;
    const rightStartX = x1 + xElliMod;
    const rightStartY = y1 + yElliMod;
    const rightContX = elliCenterX + xContMod;
    const rightContY = elliCenterY;
    const rightEndX = x2 + xElliMod;
    const rightEndY = y2 - yElliMod;

    this.ctx.beginPath();
    this.ctx.moveTo(leftStartX, leftStartY);
    this.ctx.quadraticCurveTo(leftContX, leftContY, leftEndX, leftEndY);
    this.ctx.lineTo(elliCenterX, leftEndY);
    this.ctx.lineTo(elliCenterX, leftStartY);
    // this.ctx.stroke();

    // this.ctx.beginPath();
    this.ctx.moveTo(rightStartX, rightStartY);
    this.ctx.quadraticCurveTo(rightContX, rightContY, rightEndX, rightEndY);
    this.ctx.lineTo(elliCenterX, rightEndY);
    this.ctx.lineTo(elliCenterX, rightStartY);
    // this.ctx.stroke();
    // this.ctx.closePath();

    this.ctx.fillStyle = color;
    this.ctx.fill();
  }

  drawGlueToRight(cellSize, x1, y1, x2, y2, radiusX, radiusY, color) {
    x1 *= cellSize; x1 += cellSize / 2;
    x2 *= cellSize; x2 += cellSize / 2;
    y1 *= cellSize; y1 += cellSize / 2;
    y2 *= cellSize; y2 += cellSize / 2;
    const ud_elliCenterX = (x1 + x2) / 2;
    const ud_elliCenterY = (y1 + y2) / 2;
    const ud_xElliMod = radiusX * 1 / 4;
    const ud_yElliMod = radiusY * 5 / 5;
    const ud_yContMod = radiusY / 5;

    const upperStartX = x2 + ud_xElliMod;
    const upperStartY = y2 - ud_yElliMod;
    const upperContX = ud_elliCenterX;
    const upperContY = ud_elliCenterY + ud_yContMod;
    const upperEndX = x1 - ud_xElliMod;
    const upperEndY = y1 - ud_yElliMod;
    const downStartX = x2 + ud_xElliMod;
    const downStartY = y2 + ud_yElliMod;
    const downContX = ud_elliCenterX;
    const downContY = ud_elliCenterY - ud_yContMod;
    const downEndX = x1 - ud_xElliMod;
    const downEndY = y1 + ud_yElliMod;

    this.ctx.beginPath();
    this.ctx.moveTo(upperStartX, upperStartY);
    this.ctx.quadraticCurveTo(upperContX, upperContY, upperEndX, upperEndY);
    this.ctx.lineTo(upperEndX, ud_elliCenterY);
    this.ctx.lineTo(upperStartX, ud_elliCenterY);
    // this.ctx.stroke();

    // this.ctx.beginPath();
    this.ctx.moveTo(downStartX, downStartY);
    this.ctx.quadraticCurveTo(downContX, downContY, downEndX, downEndY);
    this.ctx.lineTo(downEndX, ud_elliCenterY);
    this.ctx.lineTo(downStartX, ud_elliCenterY);

    this.ctx.fillStyle = color;
    this.ctx.fill();
  }

  drawEllipse(X, Y, radiusX, radiusY, color, willStorke = true) {
    // this.draw the ellipse
    this.ctx.beginPath();
    this.ctx.ellipse(X, Y, radiusX, radiusY, 0, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    this.ctx.fill();
    this.ctx.strokeStyle = 'rgba(150,150,150,0.5)';
    this.ctx.lineWidth = 2;
    (willStorke) && this.ctx.stroke();
  }

  drawEyes(X, Y) {
    // this.draw the eyes
    const rate = 1 / 4;
    const eyeRadiusX = 6 * rate;
    const eyeRadiusY = 4 * rate;
    const eyeOffsetX = 15 * rate;
    const eyeOffsetY = 10 * rate;
    const eyeColor = 'rgba(20,20,20,0.7)';

    // Left eye
    this.ctx.beginPath();
    this.ctx.ellipse(X - eyeOffsetX, Y - eyeOffsetY, eyeRadiusX, eyeRadiusY, (-1) * Math.PI / 4, 0, Math.PI * 2);
    this.ctx.fillStyle = eyeColor;
    this.ctx.fill();

    // Right eye
    this.ctx.beginPath();
    this.ctx.ellipse(X + eyeOffsetX, Y - eyeOffsetY, eyeRadiusX, eyeRadiusY, Math.PI / 4, 0, Math.PI * 2);
    this.ctx.fillStyle = eyeColor;
    this.ctx.fill();
  }

  addAlpha(rgbaCode: string, alpha) {
    const res = rgbaCode.split(',')[0] + ',' + rgbaCode.split(',')[1] + ',' + rgbaCode.split(',')[2] + ',' + ` ${alpha.toString()})`;
    return res;
  }

}
