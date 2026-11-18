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
import { showGuide } from "./htmlHandler/guideModal";
import { isTouchMode, setupTouchControls } from "./touchControls";


export class HtmlHandle {
  private _targetChainNumShow: HTMLElement;
  private _statusGoal: HTMLElement;
  private _statusProgress: HTMLElement;
  private _statusBar: HTMLElement;
  private _statusBarFill: HTMLElement;
  private _chainNumShow: HTMLElement;
  private _chainPuyoNumShow: HTMLElement;
  private _timerElement: HTMLElement;
  private _keyHint: HTMLElement;
  private _canvasContainer: HTMLElement;
  private _zoomInButton: HTMLButtonElement;
  private _zoomOutButton: HTMLButtonElement;
  private _currentScale: number;
  private _touchControls: HTMLElement;

  constructor(
    private _lSHandle: LSHandle,
    private _apiHandle: ApiHandle,
    private _timer: Timer,
    private _chain: Chain,
    private _mountain: Mountain,
    private _menu: Menu
  ) {
    this._targetChainNumShow = document.getElementById("targetChainCount");
    this._statusGoal = document.getElementById("statusGoal");
    this._statusProgress = document.getElementById("statusProgress");
    this._statusBar = document.getElementById("statusBar");
    this._statusBarFill = document.getElementById("statusBarFill");
    this._chainNumShow = document.getElementById("chainCount");
    this._chainPuyoNumShow = document.getElementById("chainPuyoNum");
    this._chainPuyoNumShow.style.display = 'none'; // unused??
    this._timerElement = document.getElementById('timer');
    this._keyHint = document.getElementById('keyHint');
    document.getElementById('keyHintText').textContent = lang.pauseAndControls;
    this._canvasContainer = document.getElementById('canvasContainer');
    this._zoomInButton = document.getElementById('zoom-in') as HTMLButtonElement;
    this._zoomOutButton = document.getElementById('zoom-out') as HTMLButtonElement;
    this._currentScale = this._lSHandle.getZoomRate() || gameConfig.DEFAULT_SCALE;
    this._touchControls = setupTouchControls();
    this.applyScale();
    // touch mode fits the game to the screen; refit whenever the viewport or the game's own size changes
    window.addEventListener('resize', () => this.applyScale());
    window.addEventListener('orientationchange', () => this.applyScale());
    new ResizeObserver(() => this.applyScale()).observe(this._canvasContainer);
    new ResizeObserver(() => this.applyScale()).observe(this._touchControls);

    // this._pauseButton.addEventListener('click', this.handlePause);
    // document.addEventListener('keydown', e => {
    //   if (e.key === 'p') this.handlePause();
    // })

    // blur so Enter/Space during play doesn't press the zoom button again
    this._zoomInButton.addEventListener('click', () => {
      this._zoomInButton.blur();
      this._currentScale += 0.1;
      this.applyScale();
      this._lSHandle.setZoomRate(this._currentScale);
    });

    this._zoomOutButton.addEventListener('click', () => {
      this._zoomOutButton.blur();
      this._currentScale = Math.max(0.1, this._currentScale - 0.1);
      this.applyScale();
      this._lSHandle.setZoomRate(this._currentScale);
    });

  }

  // desktop: the user's zoom. touch mode: the largest scale at which the whole game fits above the pad
  applyScale() {
    if (!isTouchMode()) {
      scaleAndSetFixedPosition(this._canvasContainer, this._currentScale);
      return;
    }
    // offsetWidth/Height are layout sizes, unaffected by the current transform
    const contentH = this._canvasContainer.offsetHeight;
    // the container spans the page width; measure its children for the real game width
    let gameW = 0;
    const gap = parseFloat(getComputedStyle(this._canvasContainer).columnGap) || 0;
    Array.from(this._canvasContainer.children).forEach((c, i) => {
      gameW += (c as HTMLElement).offsetWidth + (i > 0 ? gap : 0);
    });
    if (!gameW || !contentH) return;
    const viewW = window.visualViewport?.width ?? window.innerWidth;
    const viewH = window.visualViewport?.height ?? window.innerHeight;
    const margin = 8;
    let availW = viewW - margin * 2;
    let availH = viewH - margin;
    if (window.matchMedia('(orientation: landscape) and (max-height: 500px)').matches) {
      // landscape phone: the button clusters sit left and right of the board
      const clusters = Array.from(this._touchControls.children) as HTMLElement[];
      const sideW = Math.max(0, ...clusters.map(c => c.offsetWidth));
      availW -= (sideW + margin) * 2;
    } else {
      availH -= this._touchControls.offsetHeight;
    }
    const scale = Math.min(availW / gameW, availH / contentH);
    scaleAndSetFixedPosition(this._canvasContainer, Math.max(0.3, scale));
  }

  htmlUpdate() {
    if (!stateHandle.willShowGameResult()) {
      this._chainNumShow.style.display = 'none';
      // this._chainPuyoNumShow.style.display = 'none';
      this._targetChainNumShow.style.display = 'none';
      this._timerElement.style.display = 'none';
      this._keyHint.style.display = 'none';
    } else {
      this._chainNumShow.style.display = '';
      // this._chainPuyoNumShow.style.display = '';
      this._targetChainNumShow.style.display = '';
      this._timerElement.style.display = '';
      this._keyHint.style.display = '';
    }

    const status = this._mountain.getGameStatus();
    this._statusGoal.textContent = status.goal;
    this._statusProgress.textContent = status.progress;
    this._statusBar.style.display = status.ratio === undefined ? 'none' : '';
    this._statusBarFill.style.width = `${Math.min(1, status.ratio ?? 0) * 100}%`;
    // this._chainNumShow.textContent = ` 最大${this._chain.maxVirtualChainCount}連鎖可能`
    this._chainNumShow.textContent = `${this._chain.maxVirtualChainCount}`
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

  showGuide() {
    showGuide();
  }
}
