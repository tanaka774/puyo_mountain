import { ApiHandle } from "./apiHandle";
import { Chain } from "./chain";
import { PUYO_COLORS, gameConfig } from "./config";
import { LSHandle } from "./localStorageHandle";
import { Menu, MenuSelect } from "./menu";
import { GameMode, Mountain } from "./mountain/mountain";
import { Difficulty } from "./mountain/mountainArcade";
import { GameState, stateHandle } from "./state";
import { Timer } from "./timer";
import { getTurnstileToken } from "./captchaHandle.js"
import lang from "../locales";
import { scaleAndSetFixedPosition } from "./htmlHandler/utils";
import { showRankInModal } from "./htmlHandler/rankModal";
import { showHighScoresModal } from "./htmlHandler/highScoreModal";
import { showArcadeResult } from "./htmlHandler/arcadeResultModal";
import { showCustomConfig } from "./htmlHandler/customConfigModal";
import { showGameSetting } from "./htmlHandler/gameSettingModal";


export class HtmlHandle {
  private _targetChainNumShow: HTMLElement;
  private _chainNumShow: HTMLElement;
  private _chainPuyoNumShow: HTMLElement;
  private _timerElement: HTMLElement;
  private _canvasContainer: HTMLElement;
  private _zoomInButton: HTMLButtonElement;
  private _zoomOutButton: HTMLButtonElement;
  private _currentScale: number;

  constructor(
    private _lSHandle: LSHandle,
    private _apiHandle: ApiHandle,
    private _timer: Timer,
    private _chain: Chain,
    private _mountain: Mountain,
    private _menu: Menu
  ) {
    this._targetChainNumShow = document.getElementById("targetChainCount");
    this._chainNumShow = document.getElementById("chainCount");
    this._chainPuyoNumShow = document.getElementById("chainPuyoNum");
    this._chainPuyoNumShow.style.display = 'none'; // unused??
    this._timerElement = document.getElementById('timer');
    this._canvasContainer = document.getElementById('canvasContainer');
    this._zoomInButton = document.getElementById('zoom-in') as HTMLButtonElement;
    this._zoomOutButton = document.getElementById('zoom-out') as HTMLButtonElement;
    this._currentScale = this._lSHandle.getZoomRate() || gameConfig.DEFAULT_SCALE;
    scaleAndSetFixedPosition(this._canvasContainer, this._currentScale);

    // this._pauseButton.addEventListener('click', this.handlePause);
    // document.addEventListener('keydown', e => {
    //   if (e.key === 'p') this.handlePause();
    // })

    this._zoomInButton.addEventListener('click', () => {
      this._currentScale += 0.1;
      scaleAndSetFixedPosition(this._canvasContainer, this._currentScale);
      this._lSHandle.setZoomRate(this._currentScale);
    });

    this._zoomOutButton.addEventListener('click', () => {
      this._currentScale = Math.max(0.1, this._currentScale - 0.1);
      scaleAndSetFixedPosition(this._canvasContainer, this._currentScale);
      this._lSHandle.setZoomRate(this._currentScale);
    });

  }

  htmlUpdate() {
    if (!stateHandle.willShowGameResult()) {
      this._chainNumShow.style.display = 'none';
      // this._chainPuyoNumShow.style.display = 'none';
      this._targetChainNumShow.style.display = 'none';
      this._timerElement.style.display = 'none';
    } else {
      this._chainNumShow.style.display = '';
      // this._chainPuyoNumShow.style.display = '';
      this._targetChainNumShow.style.display = '';
      this._timerElement.style.display = '';
    }

    this._targetChainNumShow.textContent = this._mountain.getGameStatus();
    // this._chainNumShow.textContent = ` 最大${this._chain.maxVirtualChainCount}連鎖可能`
    this._chainNumShow.textContent = `MAX: ${this._chain.maxVirtualChainCount}`
    // this._chainPuyoNumShow.textContent = `有効連鎖ぷよ数: ${this._mountain.validVanishPuyoNum} 不要連鎖ぷよ数: ${this._mountain.unnecessaryVanishPuyoNum}`
    this._timerElement.innerText = this._timer.formattedTime;
  }

  async showRankInModal() {
    await showRankInModal(this._timer, this._apiHandle, this._mountain, this._menu);
  }


  async showHighScoresModal() {
    await showHighScoresModal(this._apiHandle);
  }

  showArcadeResult() {
    showArcadeResult(this._timer, this._mountain, this._menu);
  }

  showCustomConfig() {
    showCustomConfig(this._mountain);
  }

  showGameSetting() {
    showGameSetting(this._lSHandle);
  }
}
