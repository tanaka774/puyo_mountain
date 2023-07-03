import { Chain } from "./chain";
import { Mountain } from "./mountain";
import { gameState } from "./state";


export class HtmlHandle {
  private _targetChainNumShow: HTMLElement;
  private _chainNumShow: HTMLElement;
  private _chainPuyoNumShow: HTMLElement;
  private _timerElement: HTMLElement;
  private _startTime: number;
  private _currentTime: number;
  private _timerStarted: boolean;
  private _pauseButton: HTMLElement;

  constructor(
    private _chain: Chain,
    private _mountain: Mountain,
  ) {
    this._targetChainNumShow = document.getElementById("targetChainCount");
    this._chainNumShow = document.getElementById("chainCount");
    this._chainPuyoNumShow = document.getElementById("chainPuyoNum");
    this._timerElement = document.getElementById('timer');
    this._timerElement.textContent = '00:00';
    this._timerStarted = false;
    this._pauseButton = document.getElementById("pauseButton");

    this._pauseButton.addEventListener('click', e => {
      // TODO: temp, prevent infinte loop
      if (gameState.currentState === gameState.JUST_DRAWING) return;

      if (gameState.currentState !== gameState.PAUSING) gameState.setState(gameState.PAUSING);
      else gameState.setState(gameState.prevState);
    })
  }

  htmlUpdate() {
    this._targetChainNumShow.textContent = `${this._mountain.currentTargetChainNum} 連鎖せよ！`
    this._chainNumShow.textContent = `${this._chain.chainCount} 連鎖    最大${this._chain.maxVirtualChainCount}連鎖可能`
    this._chainPuyoNumShow.textContent = `有効連鎖ぷよ数: ${this._mountain.validVanishPuyoNum} 不要連鎖ぷよ数: ${this._mountain.unnecessaryVanishPuyoNum}`
    if (!this._timerStarted) {

    }
  }

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
    if (gameState.currentState === gameState.GAMEOVER) return;
    if (gameState.currentState === gameState.PAUSING) {
      this._startTime += Date.now() - this._currentTime;
    }

    this._currentTime = Date.now();

    const elapsedTimeInSeconds = Math.floor((this._currentTime - this._startTime) / 1000);
    const formattedTime = this.formatTime(elapsedTimeInSeconds);
    this._timerElement.textContent = formattedTime;
  }
}
