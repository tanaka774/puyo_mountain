import { GameState, stateHandle } from "./state";

export class Timer {
  private _startTime: number;
  private _currentTime: number;
  private _timerStarted: boolean;
  private _formattedTime: string;
  constructor(
  ) {
    this._formattedTime = '00:00';
    this._timerStarted = false;
  }

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

  getElapsedTimeDigits() {
    const elapsedTime = this._currentTime - this._startTime;
    const dateElapsed =  new Date(elapsedTime); 
    const dateCurrent = new Date(this._currentTime);
    const dateStart = new Date(this._startTime);

    // dealing with timezone difference
    const hours = dateCurrent.getHours() - dateStart.getHours();   //.padStart(2, '0');
    const minutes = dateElapsed.getMinutes();   //.padStart(2, '0');
    const seconds = dateElapsed.getSeconds();   //.padStart(2, '0');

    return [hours, minutes, seconds];
  }

  get formattedTime() { return this._formattedTime; }
}