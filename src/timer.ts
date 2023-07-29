import { GameState, stateHandle } from "./state";

export class Timer {
  private _startTime: number;
  private _currentTime: number;
  private _timerStarted: boolean;
  private _formattedTime: string;
  constructor(
  ) {
    this.initTimer();
  }

  startTimer() {
    if (this._timerStarted) return;
    this._startTime = Date.now();
    this._currentTime = Date.now();
    setInterval(this.updateTimer.bind(this), 1000);
    this._timerStarted = true;
  }

  initTimer() {
    this._formattedTime = '00:00';
    this._startTime = Date.now();
    this._currentTime = Date.now();
    this._timerStarted = false;
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
    // const elapsedTime = this._currentTime - this._startTime;
    // const dateElapsed = new Date(elapsedTime);
    const dateCurrent = new Date(this._currentTime);
    const dateStart = new Date(this._startTime);

    // dealing with timezone difference
    // TODO: if hours is more than 24, this implementation collapses
    // TODO: be careful when surpassing each am/pm during game play
    // const hours = dateCurrent.getHours() - dateStart.getHours();   //.padStart(2, '0');
    // const minutes = dateElapsed.getMinutes();   //.padStart(2, '0');
    // const seconds = dateElapsed.getSeconds();   //.padStart(2, '0');


    const timeDiffInMs = dateCurrent.getTime() - dateStart.getTime();
    const timeDiffInSeconds = timeDiffInMs / 1000; // Convert milliseconds to seconds
    const roundedTimeDiffInSeconds = Math.round(timeDiffInSeconds);

    // Calculate hours, minutes, and seconds
    const hours = Math.floor(roundedTimeDiffInSeconds / 3600);
    const remainingSecondsAfterHours = roundedTimeDiffInSeconds % 3600;
    const minutes = Math.floor(remainingSecondsAfterHours / 60);
    const seconds = remainingSecondsAfterHours % 60;

    // // Format the time as 'hh:mm:ss'
    // const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    // console.log(formattedTime); // Output: '00:29:30'


    return [hours, minutes, seconds];
  }

  get formattedTime() { return this._formattedTime; }
}