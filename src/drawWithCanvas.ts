import { baseManiPuyo } from "./types"
import { PUYO_COLORS, gameConfig } from "./config"
import { GameState, stateHandle } from "./state"
import { Split } from "./split"
import { Move } from "./move"
import { Chain } from "./chain"
import { Board } from "./board"
import { Current } from "./current"
import { Bounce } from "./bounce"
import { Rotate } from "./rotate"
import { Mountain } from "./mountain/mountain"
import { FontHandle } from "./fontHandle"
import { Difficulty } from "./mountain/mountainArcade"
import lang from "../locales";

// palette shared with styles.css
const INK_PANEL = 'rgba(10, 14, 30, 0.86)';
const INK_PANEL_DEEP = 'rgba(6, 9, 20, 0.92)';
const BOARD = 'rgba(10, 14, 30, 0.93)';
const KEYLINE = 'rgba(244, 234, 216, 0.22)';
const PAPER = 'rgba(244, 234, 216, 1)';
const VERMILION = 'rgba(217, 72, 43, 1)';
const FONT = 'custom, sans-serif';

export class DrawWithCanvas {
  // TODO: add _
  private _mainCanvas: HTMLCanvasElement;
  // TODO: type should be nullable?
  private ctx: CanvasRenderingContext2D;
  private nextPuyoCanvas: HTMLCanvasElement;
  // TODO: type should be nullable?
  private nextPuyoCtx: CanvasRenderingContext2D;
  private VPuyoCanvas: HTMLCanvasElement;
  // TODO: type should be nullable?
  private VPuyoCtx: CanvasRenderingContext2D;


  constructor(
    private _fontHandle: FontHandle,
    private _bounce: Bounce,
    private _board: Board,
    private _current: Current,
    private _move: Move,
    private _rotate: Rotate,
    private _split: Split,
    private _chain: Chain,
    private _mountain: Mountain,
    mainCanvasName: string,
    nextPuyoCanvasName: string,
  ) {
    this._mainCanvas = document.getElementById(mainCanvasName) as HTMLCanvasElement;
    this.ctx = this._mainCanvas.getContext('2d');
    this.nextPuyoCanvas = document.getElementById(nextPuyoCanvasName) as HTMLCanvasElement;
    this.nextPuyoCtx = this.nextPuyoCanvas.getContext('2d');
    this.VPuyoCanvas = document.getElementById('VPuyoCanvas') as HTMLCanvasElement;
    this.VPuyoCtx = this.VPuyoCanvas.getContext('2d');
  }

  draw() {
    this.clear();

    this.drawBoardBackground();

    // in pause state, don't show current board
    if (stateHandle.checkCurrentState(GameState.PAUSING)) { return; }

    // glue goes underneath so puyo highlights stay on top
    this.drawConnecting();

    this.drawBoardPuyos();

    if (this._mountain.floatingSeedPuyos.length > 0) {
      for (const floatingSeedPuyo of this._mountain.floatingSeedPuyos) {
        this.drawPuyo(this.ctx, floatingSeedPuyo.posX, floatingSeedPuyo.posY, PUYO_COLORS[floatingSeedPuyo.color]);
      }
      this.showCurrentChainCount();
    }

    for (const floatingPuyo of this._chain.floatingPuyos) {
      this.drawPuyo(this.ctx, floatingPuyo.posX, floatingPuyo.posY, PUYO_COLORS[floatingPuyo.color]);
    }

    if (this._split.splittedPuyo) {
      this.drawPuyo(this.ctx, this._split.splittedPuyo.posX, this._split.splittedPuyo.posY, PUYO_COLORS[this._split.splittedPuyo.color]);
    }

    if (this._current.currentPuyo) {
      this.drawPuyo(this.ctx, this._current.currentPuyo.parentX, this._current.currentPuyo.parentY, PUYO_COLORS[this._current.currentPuyo.parentColor]);

      const [childX, childY] = this._current.getChildPos(this._current.currentPuyo);
      this.drawPuyo(this.ctx, childX, childY, PUYO_COLORS[this._current.currentPuyo.childColor]);
    }

    // this.drawAfterimageHor();
    this.drawAfterimageRotate();
    this.drawAfterimagePushedup();

    this.drawTriggerPuyos();

    if (this._chain.vanishPuyos.length > 0) {
      this.showChainCountAnim();
    }

    // this.drawNextBoard(this._current.nextPuyo, 1);
    // this.drawNextBoard(this._current.doubleNextPuyo, 4);
    // this.drawNextBoard(this._current.versatilePuyo, 9);
    this.drawNextBoard();
    this.drawVBoard();
  }

  clear() {
    this.ctx.clearRect(0, 0, this._mainCanvas.width, this._mainCanvas.height);
    this.nextPuyoCtx.clearRect(0, 0, this.nextPuyoCanvas.width, this.nextPuyoCanvas.height);
    this.VPuyoCtx.clearRect(0, 0, this.VPuyoCanvas.width, this.VPuyoCanvas.height);
  }

  drawBoardBackground() {
    const cs = gameConfig.CELL_SIZE;
    const w = this._mainCanvas.width;
    const h = this._mainCanvas.height;
    const ghost = cs * gameConfig.BOARD_GHOST_ZONE;

    this.ctx.fillStyle = INK_PANEL_DEEP;
    this.ctx.fillRect(0, 0, w, ghost);
    this.ctx.fillStyle = BOARD;
    this.ctx.fillRect(0, ghost, w, h - ghost);

    // dotted grid on cell corners
    this.ctx.fillStyle = 'rgba(244, 234, 216, 0.13)';
    for (let y = ghost + cs; y < h; y += cs) {
      for (let x = cs; x < w; x += cs) {
        this.ctx.fillRect(x - 1, y - 1, 2, 2);
      }
    }

    // ceiling line between ghost zone and board
    this.ctx.strokeStyle = 'rgba(244, 234, 216, 0.18)';
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([4, 4]);
    this.ctx.beginPath();
    this.ctx.moveTo(0, ghost + 0.5);
    this.ctx.lineTo(w, ghost + 0.5);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // "x" on birth pos
    const birthX = (gameConfig.PUYO_BIRTH_POSX - 1) * cs;
    const birthY = (gameConfig.PUYO_BIRTH_POSY - 2) * cs;
    const modifier = cs * 0.3;
    this.ctx.strokeStyle = this.addAlpha(VERMILION, 0.55);
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(birthX + modifier, birthY + modifier);
    this.ctx.lineTo(birthX + cs - modifier, birthY + cs - modifier);
    this.ctx.moveTo(birthX + cs - modifier, birthY + modifier);
    this.ctx.lineTo(birthX + modifier, birthY + cs - modifier);
    this.ctx.stroke();
    this.ctx.lineCap = 'butt';
  }

  drawBoardPuyos(board = this._board.board) {
    if (board) {
      for (let y = gameConfig.BOARD_TOP_EDGE - 1; y < gameConfig.BOARD_BOTTOM_EDGE; y++) {
        for (let x = gameConfig.BOARD_LEFT_EDGE; x < gameConfig.BOARD_RIGHT_EDGE; x++) {
          const cell = board[y][x];
          if (cell !== gameConfig.NO_COLOR) {
            this.drawPuyo(this.ctx, x, y, PUYO_COLORS[cell])
          }
        }
      }
    }

  }

  drawNextBoard(nextPuyo: baseManiPuyo = null, doubleNextPuyo: baseManiPuyo = null) {
    this.nextPuyoCtx.clearRect(0, 0, this.nextPuyoCanvas.width, this.nextPuyoCanvas.height);

    const cs = gameConfig.CELL_SIZE;
    this.drawRoundedRect(this.nextPuyoCtx, 0.5, cs * 2 + 0.5, cs * 2 - 1, cs * 3 - 1, 6, INK_PANEL, KEYLINE);
    this.drawRoundedRect(this.nextPuyoCtx, cs * 1.5 + 0.5, cs * 4 + 0.5, cs * 2 - 1, cs * 3 - 1, 6, INK_PANEL, KEYLINE);

    const nextFixX = 0.5;
    const nextFixY = 2.5;
    const doubleNextFixX = 2;
    const doubleNextFixY = 4.5;

    if (nextPuyo || doubleNextPuyo) {
      // Replay mode: draw statically
      if (nextPuyo) {
        this.drawWaitingPuyo(this.nextPuyoCtx, nextPuyo, nextFixX, nextFixY);
      }
      if (doubleNextPuyo) {
        this.drawWaitingPuyo(this.nextPuyoCtx, doubleNextPuyo, doubleNextFixX, doubleNextFixY);
      }
    } else {
      // Live game mode: draw with animation
      const rate = this._current.nextMovingCount / gameConfig.NEXT_MOVING_TIME;
      const diffX = doubleNextFixX - nextFixX;
      const diffY = doubleNextFixY - nextFixY;

      if (this._current.currentPuyo) {
        this.drawWaitingPuyo(this.nextPuyoCtx, this._current.currentPuyo, nextFixX, nextFixY - rate * 3 * (nextFixY));
      }
      if (this._current.nextPuyo) {
        this.drawWaitingPuyo(this.nextPuyoCtx, this._current.nextPuyo, nextFixX + (1 - rate) * diffX, nextFixY + (1 - rate) * diffY);
      }
      if (this._current.doubleNextPuyo) {
        this.drawWaitingPuyo(this.nextPuyoCtx, this._current.doubleNextPuyo, doubleNextFixX, doubleNextFixY + (1 - rate) * 3);
      }

      if (this._current.nextMovingCount < gameConfig.NEXT_MOVING_TIME) {
        this._current.incrementNextMovingCount();
      }
    }
  }

  drawVBoard() {
    const cs = gameConfig.CELL_SIZE;
    const ctx = this.VPuyoCtx;

    const startY = 0.5;
    this.drawRoundedRect(ctx, 0.5, cs * (startY + 0.2) + 0.5, cs * 2 - 1, cs * 3 - 1, 6,
      this._current.versatilePuyo ? INK_PANEL : INK_PANEL_DEEP, KEYLINE);
    if (this._current.versatilePuyo) {
      this.drawWaitingPuyo(ctx, this._current.versatilePuyo, 0.5, 1);
    }
    ctx.fillStyle = PAPER;
    ctx.font = `16px ${FONT}`;
    ctx.fillText(lang.vPuyo, cs * 0.3, cs * startY);
  }

  private drawWaitingPuyo(ctx: CanvasRenderingContext2D, puyo: baseManiPuyo, x, y) {
    this.drawPuyo(ctx, -0.05 + x + gameConfig.BOARD_LEFT_EDGE, y + gameConfig.BOARD_TOP_EDGE - gameConfig.BOARD_GHOST_ZONE, PUYO_COLORS[puyo.childColor]);
    this.drawPuyo(ctx, -0.05 + x + gameConfig.BOARD_LEFT_EDGE, 1 + y + gameConfig.BOARD_TOP_EDGE - gameConfig.BOARD_GHOST_ZONE, PUYO_COLORS[puyo.parentColor]);
  }

  // drawUIInfo() {
  //   const backColor = 'rgba(200,200,200,0.7)';
  //   const cs = gameConfig.CELL_SIZE;
  //   this.drawRoundedRect(this.nextPuyoCtx, 0, cs * 2, cs * 2, cs * 3, cs / 2, backColor);
  //   this.drawRoundedRect(this.nextPuyoCtx, cs * 1.5, cs * 4, cs * 2, cs * 3, cs / 2, backColor);
  // }

  private drawRoundedRect = (ctx, x, y, width, height, radius, color: string, strokeColor: string = null) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    if (strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }


  drawPuyo_v2(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, willStorke) {
    const drawPosX = (x - gameConfig.BOARD_LEFT_EDGE) * gameConfig.CELL_SIZE;
    const drawPosY = (y - gameConfig.BOARD_TOP_EDGE + gameConfig.BOARD_GHOST_ZONE) * gameConfig.CELL_SIZE;

    const radius = gameConfig.CELL_SIZE * 16 / 32;
    const centerX = drawPosX + radius// + gameConfig.CELL_SIZE / 16;
    const centerY = drawPosY + radius// + gameConfig.CELL_SIZE / 10;
    const strokeColor = 'rgba(50,50,50,0.3)';
    const shadow = 'rgba(50,50,50,0.3)';
    // const gloss = 'rgba(250,0,0,0.9)';
    const gloss = 'rgba(250,250,250,0.6)';
    const eyeColor = 'rgba(50,50,50,0.3)';

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    // gloss on upper left
    ctx.save();

    ctx.transform(1, 0, -1, 1, 0, 0);
    ctx.translate(
      centerX + centerY
      - gameConfig.CELL_SIZE * 3
      - (x - gameConfig.PUYO_BIRTH_POSX) * gameConfig.CELL_SIZE
      + radius / 3.2, 0)

    ctx.beginPath();
    ctx.arc(centerX - radius / 2, centerY - 2 / 3 * radius, radius / 4, 0, 2 * Math.PI);
    ctx.fillStyle = gloss;
    ctx.fill();
    ctx.restore();

    // shadow on lower right
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 5 / 6, 1 / 8 * Math.PI, 8 / 16 * Math.PI);
    ctx.strokeStyle = shadow;
    ctx.lineWidth = 2;
    ctx.stroke();

    // eye
    ctx.beginPath();
    ctx.fillStyle = eyeColor;
    ctx.fillRect(centerX - radius / 2, centerY - radius / 3, radius / 6, radius / 3);
    ctx.fill();
    ctx.fillStyle = eyeColor;
    ctx.fillRect(centerX + radius / 3, centerY - radius / 3, radius / 6, radius / 3);
    ctx.fill();
  }

  drawPuyo(ctx: CanvasRenderingContext2D, x, y, color: string, willStorke = true) {
    // if(stateHandle.checkCurrentState(GameState.PAUSING)) {return;}

    const drawPosX = (x - gameConfig.BOARD_LEFT_EDGE) * gameConfig.CELL_SIZE;
    const drawPosY = (y - gameConfig.BOARD_TOP_EDGE + gameConfig.BOARD_GHOST_ZONE) * gameConfig.CELL_SIZE;

    const radiusX = gameConfig.CELL_SIZE * 15 / 32;
    const radiusY = gameConfig.CELL_SIZE * 14 / 32;
    const elliX = drawPosX + radiusX + gameConfig.CELL_SIZE / 16;
    const elliY = drawPosY + radiusY + gameConfig.CELL_SIZE / 10;

    // if in ghost zone, add transparency
    if (y <= gameConfig.BOARD_TOP_EDGE - 0.5 && ctx === this.ctx) {
      color = this.addAlpha(color, 0.6);
    }

    if (this._bounce.willBounce &&
      this._bounce.searchBouncePuyo(x, y)
    ) {
      this.drawBounce(x, y, radiusY, elliY,
        () => { this.drawEllipse(ctx, elliX, elliY, radiusX, radiusY, color, willStorke); }
        // () => {this.drawPuyo_v2(this.ctx, x, y, color, willStorke);}
      );
    } else {
      this.drawEllipse(ctx, elliX, elliY, radiusX, radiusY, color, willStorke);
      // this.drawPuyo_pixel(this.ctx, x, y, color, willStorke);
      // this.drawPuyo_v2(this.ctx, x, y, color, willStorke);
    }
  }

  drawBounce(oriX, oriY, radiusY, elliY, drawCallback: () => void) {
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

    const changeRate = Math.sin(this._bounce.getBounceQuantities(oriX, oriY) * Math.PI / 180) / 2;
    this.ctx.save();
    // TODO: appropriate parameter not behaving differently according to Y
    this.ctx.translate(0, elliY + (radiusY / 2) * changeRate);
    this.ctx.scale(1, 1 - changeRate);
    this.ctx.translate(0, -elliY + radiusY * changeRate);
    drawCallback();
    this.ctx.restore();

    this._bounce.timeElapses(oriX, oriY,
      () => this._chain.findConnectedPuyos(this._board.board, (_) => { /*do nothing*/ })
    );
  }

  drawConnecting() {
    this._chain.connectedPuyos.forEach(elem => {
      const [oriX, oriY, color] = elem.split(':')[0].split(',').map(str => Number.parseInt(str, 10));
      const [diffX, diffY] = elem.split(':')[1].split(',').map(str => Number.parseInt(str, 10));;

      const x = oriX - gameConfig.BOARD_LEFT_EDGE;
      const y = oriY - gameConfig.BOARD_TOP_EDGE + gameConfig.BOARD_GHOST_ZONE;

      // TODO: do not declare these variables here
      const radiusX = gameConfig.CELL_SIZE * 4 / 9;
      const radiusY = gameConfig.CELL_SIZE * 3 / 7;

      if (diffX === 0 && diffY === 1) {
        this.drawGlueToDown(gameConfig.CELL_SIZE, x, y, x, y + diffY, radiusX, radiusY, PUYO_COLORS[color]);
      } else if (diffX === 1 && diffY === 0) {
        this.drawGlueToRight(gameConfig.CELL_SIZE, x, y, x + diffX, y, radiusX, radiusY, PUYO_COLORS[color]);
      } else if (diffX === 0 && diffY === -1) {
        // need to verify
        this.drawGlueToDown(gameConfig.CELL_SIZE, x, y + diffY, x, y, radiusX, radiusY, PUYO_COLORS[color]);
      } else if (diffX === -1 && diffY === 0) {
        // need to verify
        this.drawGlueToRight(gameConfig.CELL_SIZE, x + diffX, y, x, y, radiusX, radiusY, PUYO_COLORS[color]);
      }
    })
  }

  drawAfterimageRotate() {
    // after other state than MANIP like SPLIT, it enters this in certain condition
    if (!this._current.currentPuyo) {
      // only do init
      this._rotate.rotateDrawing.isRotating = false;
      this._rotate.rotateDrawing.drawCount = gameConfig.ROTATING_TIME;
      return;
    }

    if (this._rotate.rotateDrawing.isRotating) {
      const devideNum = 3;
      for (let n = 1; n < devideNum; n++) {
        const angle = this._rotate.rotateDrawing.changeAngle * (3 / 5 + 2 / 5 * n / devideNum) + this._rotate.rotateDrawing.prevAngle;
        const rotatingX = this._current.currentPuyo.parentX + Math.cos((angle * (-1) + 270) * Math.PI / 180);
        const rotatingY = this._current.currentPuyo.parentY - Math.sin((angle * (-1) + 270) * Math.PI / 180);
        const alpha = 0.2 + 0.2 * n / devideNum;
        this.drawPuyo(this.ctx, rotatingX, rotatingY, this.addAlpha(PUYO_COLORS[this._current.currentPuyo.childColor], alpha), false);
      }

      this._rotate.rotateDrawing.drawCount--;
      if (this._rotate.rotateDrawing.drawCount <= 0) {
        this._rotate.rotateDrawing.isRotating = false;
        this._rotate.rotateDrawing.drawCount = gameConfig.ROTATING_TIME;
      }
    }
  }

  drawAfterimagePushedup() {
    if (!this._current.currentPuyo) {
      // only init
      this._rotate.pushupDrawing.isPushedUp = false;
      this._rotate.pushupDrawing.drawCount = gameConfig.ROTATING_TIME;
      return;
    }

    if (this._rotate.pushupDrawing.isPushedUp) {

      // TODO: more recognizable animation
      const devideNum = 3;
      for (let n = 1; n < devideNum; n++) {
        const alpha = 0.2 + 0.2 * n / devideNum;
        const posX = this._rotate.pushupDrawing.preChildX;
        const posY = this._rotate.pushupDrawing.preChildY - this._rotate.pushupDrawing.upY * ((n * 2 - 1) / 5);
        // this.drawPuyo(this.ctx, drawX, drawY, this.addAlpha(PUYO_COLORS[this._current.currentPuyo.childColor], alpha), false);

        const radius = gameConfig.CELL_SIZE / 2;
        const drawX = (posX - gameConfig.BOARD_LEFT_EDGE) * gameConfig.CELL_SIZE + radius;
        const drawY = (posY - gameConfig.BOARD_TOP_EDGE + gameConfig.BOARD_GHOST_ZONE) * gameConfig.CELL_SIZE + radius;

        this.ctx.lineWidth = 5;
        this.ctx.strokeStyle = this.addAlpha(PUYO_COLORS[this._current.currentPuyo.childColor], 0.4);
        // this.ctx.strokeStyle = 'black';

        const startAngle = Math.PI * 7 / 24;
        const endAngle = (17 / 24) * Math.PI;

        this.ctx.beginPath();
        this.ctx.arc(drawX, drawY, radius, startAngle, endAngle);

        this.ctx.stroke();
      }

      this._rotate.pushupDrawing.drawCount--;
      if (this._rotate.pushupDrawing.drawCount <= 0) {
        this._rotate.pushupDrawing.isPushedUp = false;
        this._rotate.pushupDrawing.drawCount = gameConfig.PUSHEDUP_TIME;
      }
    }
  }

  drawAfterimageHor() {
    if (this._move.movingHorDrawing.isMovingHor) {
      // TODO: if you do this, it needs more frames
      const diffX = this._move.movingHorDrawing.targetX - this._move.movingHorDrawing.drawingX;
      const [childX, childY] = this._current.getChildPos(this._current.currentPuyo);
      // only this.draw circle with color not stroke or eye
      const devideNum = 3;
      for (let n = 1; n < devideNum; n++) {
        const alpha = 0.2 + 0.1 * n / devideNum;
        if (!(diffX < 0 && this._current.currentPuyo.angle === 270))
          this.drawPuyo(this.ctx, this._current.currentPuyo.parentX - (diffX * (2 / 5 * n / devideNum)), this._current.currentPuyo.parentY, this.addAlpha(PUYO_COLORS[this._current.currentPuyo.parentColor], alpha), false);
        if (!(diffX > 0 && this._current.currentPuyo.angle === 90))
          this.drawPuyo(this.ctx, childX - (diffX * (2 / 5 * n / devideNum)), childY, this.addAlpha(PUYO_COLORS[this._current.currentPuyo.childColor], alpha), false);
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
      !stateHandle.checkCurrentState(GameState.MANIPULATING)
    ) return;

    this._chain.maxTriggerPuyos.forEach((elem) => {
      const drawPosX = (elem[0] - gameConfig.BOARD_LEFT_EDGE) * gameConfig.CELL_SIZE;
      const drawPosY = (elem[1] - gameConfig.BOARD_TOP_EDGE + gameConfig.BOARD_GHOST_ZONE) * gameConfig.CELL_SIZE;

      // corner brackets around the cell
      const cs = gameConfig.CELL_SIZE;
      const l = cs * 0.18;
      const x0 = drawPosX + 4, y0 = drawPosY + 4, x1 = drawPosX + cs - 4, y1 = drawPosY + cs - 4;
      this.ctx.strokeStyle = 'rgba(244, 234, 216, 0.6)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(x0, y0 + l); this.ctx.lineTo(x0, y0); this.ctx.lineTo(x0 + l, y0);
      this.ctx.moveTo(x1 - l, y0); this.ctx.lineTo(x1, y0); this.ctx.lineTo(x1, y0 + l);
      this.ctx.moveTo(x1, y1 - l); this.ctx.lineTo(x1, y1); this.ctx.lineTo(x1 - l, y1);
      this.ctx.moveTo(x0 + l, y1); this.ctx.lineTo(x0, y1); this.ctx.lineTo(x0, y1 - l);
      this.ctx.stroke();
    })
  }


  drawGlueToDown(cellSize, x1, y1, x2, y2, radiusX, radiusY, color) {
    // color = 'white'; //temp
    x1 *= cellSize; x1 += cellSize / 2;
    x2 *= cellSize; x2 += cellSize / 2;
    y1 *= cellSize; y1 += cellSize / 2;
    y2 *= cellSize; y2 += cellSize / 2;
    const elliCenterX = (x1 + x2) / 2 + radiusX / 8;
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
    // color = 'white'; //temp
    x1 *= cellSize; x1 += cellSize / 2;
    x2 *= cellSize; x2 += cellSize / 2;
    y1 *= cellSize; y1 += cellSize / 2;
    y2 *= cellSize; y2 += cellSize / 2;
    const ud_elliCenterX = (x1 + x2) / 2;
    const ud_elliCenterY = (y1 + y2) / 2;
    const ud_xElliMod = radiusX * 1 / 4;
    const ud_yElliMod = radiusY * 4 / 5;
    const ud_yContMod = (-1) * radiusY / 16;

    const upperStartX = x1 + ud_xElliMod;
    const upperStartY = y1 - ud_yElliMod;
    const upperContX = ud_elliCenterX;
    const upperContY = ud_elliCenterY + ud_yContMod;
    const upperEndX = x2 - ud_xElliMod;
    const upperEndY = y2 - ud_yElliMod;
    const downStartX = x1 + ud_xElliMod;
    const downStartY = y1 + ud_yElliMod;
    const downContX = ud_elliCenterX;
    const downContY = ud_elliCenterY - ud_yContMod;
    const downEndX = x2 - ud_xElliMod;
    const downEndY = y2 + ud_yElliMod;

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

  drawEllipse(ctx: CanvasRenderingContext2D, X, Y, radiusX, radiusY, color, withShine = true) {
    ctx.beginPath();
    ctx.ellipse(X, Y, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    if (!withShine) return;

    // gloss on upper left, faded along with the body color
    const alpha = Number(color.match(/([\d.]+)\s*\)\s*$/)?.[1] ?? 1);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.26 * alpha})`;
    ctx.beginPath();
    ctx.ellipse(X - radiusX * 0.36, Y - radiusY * 0.44, radiusX * 0.26, radiusY * 0.14, -0.55, 0, Math.PI * 2);
    ctx.fill();
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

  // TODO:  absolute heavy process!!!
  drawPuyo_pixel(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, willStroke) {
    const drawPosX = (x - gameConfig.BOARD_LEFT_EDGE) * gameConfig.CELL_SIZE;
    const drawPosY = (y - gameConfig.BOARD_TOP_EDGE + gameConfig.BOARD_GHOST_ZONE) * gameConfig.CELL_SIZE;
    const radius = gameConfig.CELL_SIZE * 16 / 32;
    const centerX = drawPosX + radius// + gameConfig.CELL_SIZE / 16;
    const centerY = drawPosY + radius// + gameConfig.CELL_SIZE / 10;
    const rectSize = radius / 5;
    const numRectangles = Math.floor(2 * Math.PI * radius / rectSize);
    const rectColor = 'rgba(50,50,50,1.0)';
    const gloss = 'rgba(50,50,50,0.5)';
    const shadow = 'rgba(250,250,250,0.8)';

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();

    for (let i = 0; i < numRectangles; i++) {
      const angle = (2 * Math.PI * i) / numRectangles;
      console.log(i, angle);
      const getRectX = (centerX, radius) => centerX + Math.cos(angle) * radius - rectSize / 2;
      const getRectY = (centerY, radius) => centerY + Math.sin(angle) * radius - rectSize / 2;

      const rectX = getRectX(centerX, radius);
      const rectY = getRectY(centerY, radius);

      ctx.fillStyle = rectColor;
      ctx.fillRect(rectX, rectY, rectSize, rectSize);

      if (angle > Math.PI * 17 / 16 && angle <= Math.PI * 22 / 16) {
        const rectX2 = getRectX(centerX, radius * 8 / 10);
        const rectY2 = getRectY(centerY, radius * 8 / 10);
        ctx.fillStyle = gloss;
        ctx.fillRect(rectX2, rectY2, rectSize, rectSize);

        ctx.fillStyle = gloss;
        ctx.fillRect(getRectX(centerX, radius * 7 / 10), getRectY(centerY, radius * 7 / 10), rectSize * 3 / 4, rectSize * 3 / 4);
      }

      if (angle > Math.PI * 1 / 16 && angle <= Math.PI * 8 / 16) {
        const rectX2 = getRectX(centerX, radius * 9 / 10);
        const rectY2 = getRectY(centerY, radius * 9 / 10);
        ctx.fillStyle = shadow;
        ctx.fillRect(rectX2, rectY2, rectSize, rectSize);
      }
    }

  }

  showChainCountAnim() {
    const vanishPuyos = this._chain.vanishPuyos;
    const chainCount = this._chain.chainCount;

    // thanks chatgpt
    const result = vanishPuyos.reduce((acc, innerArray) => {
      const minY = Math.min(acc.minY, ...innerArray.map(([_, y]) => y));
      const sumX = acc.sumX + innerArray.reduce((sum, [x, _]) => sum + x, 0);
      const countX = acc.countX + innerArray.length;
      return { minY, sumX, countX };
    }, { minY: Infinity, sumX: 0, countX: 0 });

    const cs = gameConfig.CELL_SIZE;
    const upLimit = gameConfig.BOARD_TOP_EDGE + 2;

    const posY = (result.minY - 2 <= upLimit) ? upLimit : (result.minY - 2);
    const drawY = posY * cs;
    const meanX = result.sumX / result.countX;
    const posX = (meanX - 1 <= gameConfig.BOARD_LEFT_EDGE)
      ? gameConfig.BOARD_LEFT_EDGE + 1
      : ((meanX + 1 >= gameConfig.BOARD_RIGHT_EDGE - 1)
        ? gameConfig.BOARD_RIGHT_EDGE - 2
        : meanX);
    const drawX = (posX - gameConfig.BOARD_LEFT_EDGE + 0.5) * cs;

    const alpha = 1 - this._chain.chainVanishWaitCount / gameConfig.VANISH_WAIT_TIME;
    const reached = chainCount >= this._mountain.currentTargetChainNum;
    // pop up a little while fading in
    const size = Math.round(34 + 10 * Math.min(1, alpha * 1.5));
    this.ctx.save();
    this.ctx.font = `${size}px ${FONT}`;
    this.ctx.textAlign = 'center';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = `rgba(6, 9, 20, ${alpha})`;
    this.ctx.lineWidth = 6;
    this.ctx.strokeText(`${chainCount}`, drawX, drawY);
    this.ctx.fillStyle = reached ? `rgba(255, 196, 77, ${alpha})` : `rgba(244, 234, 216, ${alpha})`;
    this.ctx.fillText(`${chainCount}`, drawX, drawY);
    this.ctx.restore();
  }

  showCurrentChainCount() {
    const chainCount = this._mountain.currentTargetChainNum;
    const cs = gameConfig.CELL_SIZE;
    const centerX = this._mainCanvas.width / 2;
    const drawY = (gameConfig.BOARD_TOP_EDGE + 1) * cs;
    const lines = (this._mountain.isLastPhase() && this._mountain.checkDifficulty(Difficulty.HARD))
      ? [`${chainCount} ${lang.chain}`, lang.chainAllClearStr]
      : [lang.chainMust(chainCount)];

    this.ctx.save();
    this.ctx.font = `26px ${FONT}`;
    this.ctx.textAlign = 'center';
    this.ctx.lineJoin = 'round';
    this.ctx.lineWidth = 5;
    this.ctx.strokeStyle = 'rgba(6, 9, 20, 0.85)';
    this.ctx.fillStyle = PAPER;
    lines.forEach((text, i) => {
      this.ctx.strokeText(text, centerX, drawY + i * cs);
      this.ctx.fillText(text, centerX, drawY + i * cs);
    });
    this.ctx.restore();
  }

  get mainCanvas() { return this._mainCanvas; }
}
