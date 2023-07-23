import { baseManiPuyo } from "./types"
import { gameConfig } from "./config"
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


export class DrawWithCanvas {
  private mainCanvas: HTMLCanvasElement;
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
    this.mainCanvas = document.getElementById(mainCanvasName) as HTMLCanvasElement;
    this.ctx = this.mainCanvas.getContext('2d');
    this.nextPuyoCanvas = document.getElementById(nextPuyoCanvasName) as HTMLCanvasElement;
    this.nextPuyoCtx = this.nextPuyoCanvas.getContext('2d');
    this.VPuyoCanvas = document.getElementById('VPuyoCanvas') as HTMLCanvasElement;
    this.VPuyoCtx = this.VPuyoCanvas.getContext('2d');

    // call just once
    this.drawWholeBackground("rgb(102, 0, 204)");
    // this.drawUIInfo();
  }

  draw() {
    this.clear();

    this.drawBoardBackground();

    this.drawBoardPuyos();

    // draw first
    this.drawConnecting();

    if (this._mountain.floatingSeedPuyos.length > 0) {
      for (const floatingSeedPuyo of this._mountain.floatingSeedPuyos) {
        this.drawPuyo(this.ctx, floatingSeedPuyo.posX, floatingSeedPuyo.posY, gameConfig.PUYO_COLORS[floatingSeedPuyo.color]);
      }
      this.showCurrentChainCount();
    }

    for (const floatingPuyo of this._chain.floatingPuyos) {
      this.drawPuyo(this.ctx, floatingPuyo.posX, floatingPuyo.posY, gameConfig.PUYO_COLORS[floatingPuyo.color]);
    }

    if (this._split.splittedPuyo) {
      this.drawPuyo(this.ctx, this._split.splittedPuyo.posX, this._split.splittedPuyo.posY, gameConfig.PUYO_COLORS[this._split.splittedPuyo.color]);
    }

    if (this._current.currentPuyo) {
      this.drawPuyo(this.ctx, this._current.currentPuyo.parentX, this._current.currentPuyo.parentY, gameConfig.PUYO_COLORS[this._current.currentPuyo.parentColor]);

      const [childX, childY] = this._current.getChildPos(this._current.currentPuyo);
      this.drawPuyo(this.ctx, childX, childY, gameConfig.PUYO_COLORS[this._current.currentPuyo.childColor]);
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
    this.ctx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
    this.nextPuyoCtx.clearRect(0, 0, this.nextPuyoCanvas.width, this.nextPuyoCanvas.height);
    this.VPuyoCtx.clearRect(0, 0, this.VPuyoCanvas.width, this.VPuyoCanvas.height);
  }

  drawWholeBackground(upperColor: string) {
    const wholeCanvas = document.getElementById("canvasBackground") as HTMLCanvasElement;
    const wholeCtx = wholeCanvas.getContext("2d");
    wholeCanvas.width = window.innerWidth;
    wholeCanvas.height = window.innerHeight;

    const ww = wholeCanvas.width;
    const wh = wholeCanvas.height;
    const drawMountain = (cw, ch, color: string) => {
      wholeCtx.beginPath();
      wholeCtx.moveTo(cw, ch);
      cw = cw + ww / 10; ch = ch - wh / 15; wholeCtx.lineTo(cw, ch);
      cw = cw + ww / 16; ch = ch - wh / 10; wholeCtx.lineTo(cw, ch);
      cw = cw + ww / 10; ch = ch - wh / 6; wholeCtx.lineTo(cw, ch);
      cw = cw + ww / 16; ch = ch - wh / 25; wholeCtx.lineTo(cw, ch);
      cw = cw + ww / 20; ch = ch + wh / 20; wholeCtx.lineTo(cw, ch);
      cw = cw + ww / 16; ch = ch + wh / 16; wholeCtx.lineTo(cw, ch);
      cw = cw + ww / 16; ch = ch + wh / 6; wholeCtx.lineTo(cw, ch);
      cw = cw + ww / 16; ch = ch + wh / 16; wholeCtx.lineTo(cw, ch);
      cw = cw + ww / 16; ch = ch + wh / 20; wholeCtx.lineTo(cw, ch);
      cw = cw + ww / 20; ch = ch + wh / 32; wholeCtx.lineTo(cw, ch);
      cw = cw + ww / 16; ch = ch - wh / 25; wholeCtx.lineTo(cw, ch);
      cw = cw + ww / 16; ch = ch - wh / 8; wholeCtx.lineTo(cw, ch);
      cw = cw + ww / 16; ch = ch - wh / 20; wholeCtx.lineTo(cw, ch);
      cw = cw + ww / 20; ch = ch - wh / 40; wholeCtx.lineTo(cw, ch);
      cw = cw + ww / 20; ch = ch + wh / 32; wholeCtx.lineTo(cw, ch);
      cw = cw + ww / 20; ch = ch + wh / 20; wholeCtx.lineTo(cw, ch);
      wholeCtx.lineTo(ww, wh / 2);
      wholeCtx.lineTo(ww, wh);
      wholeCtx.lineTo(0, wh);
      wholeCtx.fillStyle = color;
      wholeCtx.fill();
      wholeCtx.closePath();
    }
    const createGradient = (x0, y0, x1, y1, upColor, downColor) => {
      const gradient = wholeCtx.createLinearGradient(0, 0, 0, wholeCanvas.height);
      gradient.addColorStop(0, upColor);
      gradient.addColorStop(1, downColor);
      wholeCtx.fillStyle = gradient;
      wholeCtx.fill();
    }

    // TODO: more investigating for better background, want to mix green on mountain
    // const upperColor = "rgb(102, 0, 204)";
    const color1 = 'black';
    const color2 = 'rgb(69, 69, 69)';
    const color3 = 'gray';
    wholeCtx.fillStyle = upperColor;
    wholeCtx.fillRect(0, 0, ww, wh);
    // let cw = 0; // current width
    // let ch = wh * 3 / 5; // current height
    drawMountain(0, wh * 4.5 / 10, color3);
    createGradient(0, 0, 0, wholeCanvas.height, upperColor, color3);
    drawMountain(0, wh * 5.5 / 10, color2);
    createGradient(0, 0, 0, wholeCanvas.height, upperColor, color2);
    drawMountain(0, wh * 6 / 10, color1);
    createGradient(0, 0, 0, wholeCanvas.height, upperColor, color1);

  }

  drawBoardBackground() {
    // TODO: use board size
    const cs = gameConfig.CELL_SIZE;
    const alpha = 0.7;
    this.ctx.fillStyle = `rgba(160,160,160,${alpha})`;
    this.ctx.fillRect(0, 0, this.mainCanvas.width, cs * 1);
    this.ctx.fillStyle = `rgba(200,200,200,${alpha})`;
    this.ctx.fillRect(0, cs * 1, this.mainCanvas.width, cs * 1);
    this.ctx.fillStyle = `rgba(240,240,240,${alpha})`;
    this.ctx.fillRect(0, cs * 2, this.mainCanvas.width, cs * 12);

    // draw "x" on birth pos
    const birthX = (gameConfig.PUYO_BIRTH_POSX - 1) * cs;
    const birthY = (gameConfig.PUYO_BIRTH_POSY - 2) * cs;
    const modifier = cs / 4;
    this.ctx.strokeStyle = `rgba(255, 82, 93, 0.4)`;
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.moveTo(birthX + modifier, birthY + modifier);
    this.ctx.lineTo(birthX + cs - modifier, birthY + cs - modifier);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.moveTo(birthX + cs - modifier, birthY + modifier);
    this.ctx.lineTo(birthX + modifier, birthY + cs - modifier);
    this.ctx.stroke();
  }

  drawBoardPuyos() {
    if (this._board.board) {
      for (let y = gameConfig.BOARD_TOP_EDGE - 1; y < gameConfig.BOARD_BOTTOM_EDGE; y++) {
        for (let x = gameConfig.BOARD_LEFT_EDGE; x < gameConfig.BOARD_RIGHT_EDGE; x++) {
          const cell = this._board.board[y][x];
          if (cell !== gameConfig.NO_COLOR) {
            this.drawPuyo(this.ctx, x, y, gameConfig.PUYO_COLORS[cell])
          }
        }
      }
    }

  }

  drawNextBoard() {
    // this.drawUIInfo();
    // TODO: move up a little??
    // UI
    const backColor = 'rgba(200,200,200,0.7)';
    const cs = gameConfig.CELL_SIZE;
    this.drawRoundedRect(this.nextPuyoCtx, 0, cs * 2, cs * 2, cs * 3, cs / 2, backColor);
    this.drawRoundedRect(this.nextPuyoCtx, cs * 1.5, cs * 4, cs * 2, cs * 3, cs / 2, backColor);

    // current puyo goes up from next pos
    const nextFixX = 0.5;
    const nextFixY = 2.5;
    const doubleNextFixX = 2;
    const doubleNextFixY = 4.5;
    const diffX = doubleNextFixX - nextFixX;
    const diffY = doubleNextFixY - nextFixY;
    const rate = this._current.nextMovingCount / gameConfig.NEXT_MOVING_TIME;

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

  drawVBoard() {
    const cs = gameConfig.CELL_SIZE;

    const startY = 0.5;
    this.drawRoundedRect(this.VPuyoCtx, 0, cs * (startY + 0.2), cs * 2, cs * 3, cs / 2, 'rgba(50,50,50,0.7)');
    if (this._current.versatilePuyo) {
      this.drawWaitingPuyo(this.VPuyoCtx, this._current.versatilePuyo, 0.5, 1);
    }
    this.VPuyoCtx.fillStyle = `rgba(151, 255, 151, 0.8)`;
    this.VPuyoCtx.font = "bold 18px Comic Sans MS";
    this.VPuyoCtx.fillText('Vぷよ', cs * 0.4, cs * startY);
    // this.nextPuyoCtx.strokeStyle = 'rgba(230,230,230,0.8)';
    // this.nextPuyoCtx.lineWidth = 0.001;
    // this.nextPuyoCtx.strokeText('Vぷよ', cs * 0.3, cs * 8.3);

    this.VPuyoCtx.font = "16px Comic Sans MS";
    this.VPuyoCtx.fillText('D: 使用', cs * 2.3, cs * (startY + 0.9));
    this.VPuyoCtx.fillText('C: 色変更', cs * 2.3, cs * (startY + 1.7));
    this.VPuyoCtx.fillText('P: ポーズ', cs * 2.3, cs * (startY + 2.7));
  }

  private drawWaitingPuyo(ctx: CanvasRenderingContext2D, puyo: baseManiPuyo, x, y) {
    this.drawPuyo(ctx, -0.05 + x + gameConfig.BOARD_LEFT_EDGE, y + gameConfig.BOARD_TOP_EDGE - gameConfig.BOARD_GHOST_ZONE, gameConfig.PUYO_COLORS[puyo.parentColor]);
    this.drawPuyo(ctx, -0.05 + x + gameConfig.BOARD_LEFT_EDGE, 1 + y + gameConfig.BOARD_TOP_EDGE - gameConfig.BOARD_GHOST_ZONE, gameConfig.PUYO_COLORS[puyo.childColor]);
  }

  // drawUIInfo() {
  //   const backColor = 'rgba(200,200,200,0.7)';
  //   const cs = gameConfig.CELL_SIZE;
  //   this.drawRoundedRect(this.nextPuyoCtx, 0, cs * 2, cs * 2, cs * 3, cs / 2, backColor);
  //   this.drawRoundedRect(this.nextPuyoCtx, cs * 1.5, cs * 4, cs * 2, cs * 3, cs / 2, backColor);
  // }

  private drawRoundedRect = (ctx, x, y, width, height, radius, color: string) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
    // ctx.stroke();
    ctx.fillStyle = color;
    ctx.fill();
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
    const drawPosX = (x - gameConfig.BOARD_LEFT_EDGE) * gameConfig.CELL_SIZE;
    const drawPosY = (y - gameConfig.BOARD_TOP_EDGE + gameConfig.BOARD_GHOST_ZONE) * gameConfig.CELL_SIZE;

    const radiusX = gameConfig.CELL_SIZE * 15 / 32;
    const radiusY = gameConfig.CELL_SIZE * 14 / 32;
    const elliX = drawPosX + radiusX + gameConfig.CELL_SIZE / 16;
    const elliY = drawPosY + radiusY + gameConfig.CELL_SIZE / 10;

    // if in ghost zone, add transparency
    if (y <= gameConfig.BOARD_TOP_EDGE - 0.5 && ctx === this.ctx) {
      color = this.addAlpha(color, 0.5);
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
        this.drawPuyo(this.ctx, rotatingX, rotatingY, this.addAlpha(gameConfig.PUYO_COLORS[this._current.currentPuyo.childColor], alpha), false);
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
        const drawX = this._rotate.pushupDrawing.preChildX;
        const drawY = this._rotate.pushupDrawing.preChildY - this._rotate.pushupDrawing.upY * (n / devideNum);
        this.drawPuyo(this.ctx, drawX, drawY, this.addAlpha(gameConfig.PUYO_COLORS[this._current.currentPuyo.childColor], alpha), false);
      }

      this._rotate.pushupDrawing.drawCount--;
      if (this._rotate.pushupDrawing.drawCount <= 0) {
        this._rotate.pushupDrawing.isPushedUp = false;
        this._rotate.pushupDrawing.drawCount = gameConfig.ROTATING_TIME;
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
          this.drawPuyo(this.ctx, this._current.currentPuyo.parentX - (diffX * (2 / 5 * n / devideNum)), this._current.currentPuyo.parentY, this.addAlpha(gameConfig.PUYO_COLORS[this._current.currentPuyo.parentColor], alpha), false);
        if (!(diffX > 0 && this._current.currentPuyo.angle === 90))
          this.drawPuyo(this.ctx, childX - (diffX * (2 / 5 * n / devideNum)), childY, this.addAlpha(gameConfig.PUYO_COLORS[this._current.currentPuyo.childColor], alpha), false);
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

      this.ctx.strokeStyle = "gray";
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(drawPosX, drawPosY, gameConfig.CELL_SIZE, gameConfig.CELL_SIZE);
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

  drawEllipse(ctx: CanvasRenderingContext2D, X, Y, radiusX, radiusY, color, willStorke = true) {
    // this.draw the ellipse
    ctx.beginPath();
    ctx.ellipse(X, Y, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,150,150,0.5)';
    ctx.lineWidth = 2;
    (willStorke) && ctx.stroke();
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
    const drawX = posX * cs;

    // TODO: use custom font of ultimate pop-style one
    const alpha = 1 - this._chain.chainVanishWaitCount / gameConfig.VANISH_WAIT_TIME;
    const chainRate = Math.min(chainCount / this._mountain.currentTargetChainNum, 1);
    // TODO: if you cant use custom font, try another with google font api (with link)
    this._fontHandle.fontFace.load()
      .then(() => {
        this.ctx.font = "bold 40px custom";
      })
      .catch((err) => {
        this.ctx.font = "bold 40px Comic Sans MS";
        console.error(err)
      })
    // this.ctx.font = "bold italic 40px Comic Sans MS";
    this.ctx.fillStyle = `rgba(${50 + 200 * chainRate},${250 - 90 * chainRate},${40 + 140 * chainRate},${alpha})`;
    this.ctx.fillText(`${chainCount}`, drawX, drawY);
    this.ctx.strokeStyle = `rgba(50, 50, 50, ${alpha})`;
    this.ctx.lineWidth = 2;
    this.ctx.strokeText(`${chainCount}`, drawX, drawY);
  }

  showCurrentChainCount() {
    // TODO: use custom font of ultimate pop-style one
    const chainCount = this._mountain.currentTargetChainNum;
    const drawY = (gameConfig.BOARD_TOP_EDGE + 1) * gameConfig.CELL_SIZE;
    const diffX = (chainCount >= 10) ? -1.5 : -0.5;
    const drawX = (gameConfig.BOARD_LEFT_EDGE + diffX) * gameConfig.CELL_SIZE;

    this._fontHandle.fontFace.load()
      .then(() => {
        this.ctx.font = "bold 26px custom";
      })
      .catch((err) => {
        this.ctx.font = "bold 26px Arial";
        console.error(err)
      })

    if (!this._mountain.isLastPhase()) {
      const text = `${chainCount} れんさすべし`;
      // const text = `12 れんさすべし`; //for debug
      this.ctx.fillStyle = `rgba(101, 67, 33, 0.8)`;
      this.ctx.fillText(`${text}`, drawX, drawY);
      // this.ctx.strokeStyle = `rgba(50, 50, 50, 0.8)`;
      // this.ctx.lineWidth = 1;
      // this.ctx.strokeText(`${text}`, drawX, drawY);
    } else {
      const text1 = `${chainCount} れんさ`;
      const text2 = 'ぜんけしすべし';
      this.ctx.fillStyle = `rgba(101, 67, 33, 0.8)`;
      this.ctx.fillText(`${text1}`, drawX + 1 * gameConfig.CELL_SIZE, drawY);
      this.ctx.fillText(`${text2}`, drawX, drawY + 1 * gameConfig.CELL_SIZE);
      // this.ctx.strokeStyle = `rgba(50, 50, 50, 0.8)`;
      // this.ctx.lineWidth = 1;
      // this.ctx.strokeText(`${text}`, drawX, drawY);
    }
  }

}
