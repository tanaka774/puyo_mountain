import { Chain } from "./chain";
import { GameMode, Mountain } from "./mountain";
import { GameState, stateHandle } from "./state";


export class HtmlHandle {
  private _targetChainNumShow: HTMLElement;
  private _chainNumShow: HTMLElement;
  private _chainPuyoNumShow: HTMLElement;
  private _timerElement: HTMLElement;
  private _startTime: number;
  private _currentTime: number;
  private _timerStarted: boolean;
  private _formattedTime: string;
  // private _pauseButton: HTMLElement;

  constructor(
    private _chain: Chain,
    private _mountain: Mountain,
  ) {
    this._targetChainNumShow = document.getElementById("targetChainCount");
    this._chainNumShow = document.getElementById("chainCount");
    this._chainPuyoNumShow = document.getElementById("chainPuyoNum");
    this._timerElement = document.getElementById('timer');
    this._formattedTime = '00:00';
    this._timerStarted = false;
    // this._pauseButton = document.getElementById("pauseButton");

    // this._pauseButton.addEventListener('click', this.handlePause);
    // document.addEventListener('keydown', e => {
    //   if (e.key === 'p') this.handlePause();
    // })
  }

  htmlUpdate() {
    if (!stateHandle.willShowGameResult()) {
      this._chainNumShow.style.display = 'none';
      this._chainPuyoNumShow.style.display = 'none';
      this._targetChainNumShow.style.display = 'none';
      this._timerElement.style.display = 'none';
    } else {
      this._chainNumShow.style.display = '';
      this._chainPuyoNumShow.style.display = '';
      this._targetChainNumShow.style.display = '';
      this._timerElement.style.display = '';
    }

    if (this._mountain.currentMode === GameMode.ARCADE) {
      this._targetChainNumShow.textContent = `**${this._mountain.currentTargetChainNum} 連鎖せよ！** 　 フェーズ ${this._mountain.phase}`
    } else if (this._mountain.currentMode === GameMode.ENDURANCE) {
      this._targetChainNumShow.textContent = `**${this._mountain.currentTargetChainNum} 連鎖せよ！** 現在 ${this._mountain.totalChainNum} / ${this._mountain.enduranceTotalTargetChainNum}`
    }
    this._chainNumShow.textContent = `${this._chain.chainCount} 連鎖    最大${this._chain.maxVirtualChainCount}連鎖可能`
    this._chainPuyoNumShow.textContent = `有効連鎖ぷよ数: ${this._mountain.validVanishPuyoNum} 不要連鎖ぷよ数: ${this._mountain.unnecessaryVanishPuyoNum}`
    this._timerElement.innerText = this._formattedTime;

    if (stateHandle.checkCurrentState(GameState.GAMECLEAR) || stateHandle.checkCurrentState(GameState.MENU)) {
      const resultTime: string = this._formattedTime;
      const mainCanvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
      const ctx = mainCanvas.getContext('2d');
      ctx.fillStyle = "lightblue";
      ctx.fillRect(0, 0, mainCanvas.width, mainCanvas.height);
      ctx.font = "24px Arial";
      ctx.fillStyle = "black";
      const resultScore = `　総合スコア　${this._mountain.resultGrade}`;
      const resultPlayTime = `　プレイ時間　${this._formattedTime}`
      const resultUnne = `　不要に消したぷよ数　${this._mountain.unnecessaryVanishPuyoNum}`
      ctx.fillText(resultScore, 0, 100, 160);
      ctx.fillText(resultPlayTime, 0, 200, 160);
      ctx.fillText(resultUnne, 0, 300, 160);
    }
  }

  // handlePause() {
  //   // TODO: temp, prevent infinte loop
  //   if (GameState.currentState === GameState.JUST_DRAWING) return;
  //
  //   if (GameState.currentState !== GameState.PAUSING) stateHandle.setState(GameState.PAUSING);
  //   else stateHandle.setState(stateHandle.prevState);
  // }

  // TODO: saparate and make timer class
  initTimer() {
    if (this._timerStarted) return;
    this._startTime = Date.now();
    this._currentTime = Date.now();
    setInterval(this.updateTimer.bind(this), 1000);
    this._timerStarted = true;
  }

  formatTime(time) {
    const minutes = Math.floor(time / 60).toString().padStart(2, '0');
    const seconds = (time % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  updateTimer() {
    if (stateHandle.checkCurrentState(GameState.GAMEOVER)) return;
    if (stateHandle.checkCurrentState(GameState.PAUSING)) {
      this._startTime += Date.now() - this._currentTime;
    }

    this._currentTime = Date.now();

    const elapsedTimeInSeconds = Math.floor((this._currentTime - this._startTime) / 1000);
    const formattedTime = this.formatTime(elapsedTimeInSeconds);
    // this._timerElement.textContent = formattedTime;
    this._formattedTime = formattedTime;
  }
}
