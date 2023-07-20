import { FontHandle } from "./fontHandle";
import { GameState, stateHandle } from "./state";

export enum MenuSelect {
  START_MENU,
  ARCADE_SELECT_1,
  ENDURANCE_SELECT_1,
  PAUSE,
  GAME_OVER,
  GAME_CLEAR,
}

export class Menu {
  private _buttons: NodeListOf<HTMLButtonElement>;
  // private _menuContainer: HTMLDivElement;
  private _menuContainer: HTMLDialogElement;
  private _selectedIndex: number;
  private arcadeEasy: () => void;
  private arcadeNormal: () => void;
  private arcadeHard: () => void;
  private enduranceMode1: () => void;
  private enduranceMode2: () => void;
  private watchHighScores: () => void;
  private backToGameInPause: () => void;
  private backToMenuInPause: () => void;
  private retryAfterGameOver: () => void;
  private retryAfterGameClear: () => void;
  private backToMenuAfterGameOver: () => void;
  private backToMenuAfterGameClear: () => void;
  private enterKeyUpCallback: () => void;


  constructor(
  private _fontHandle: FontHandle
  ) {
    // TODO: menu should be generated and shown here???
    this.generateButtons(MenuSelect.START_MENU);
    // this._menuContainer.showModal();

    this._buttons = this._menuContainer.querySelectorAll('button');
    // this._buttons = document.querySelectorAll('.menu-container button');
    this._selectedIndex = 0;

    this._buttons[this._selectedIndex].classList.add('selected');

    // TODO: I heard you don't need bind() in typescript
    this.handleArrowUp = this.handleArrowUp.bind(this);
    this.handleArrowDown = this.handleArrowDown.bind(this);
    this.handleMouseOver = this.handleMouseOver.bind(this);
    this.handleMouseClick = this.handleMouseClick.bind(this);

    document.addEventListener('keyup', e => {
      if (!stateHandle.menuButtonAppears()) return;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.handleArrowUp();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.handleArrowDown();
      }

      if (e.key === 'Enter') {
        console.log("I'm called mom!")
        e.preventDefault();
        this.enterKeyUpCallback();
      }
    })

    this.enterKeyUpCallback = () => this._buttons[this._selectedIndex].click();
  }

  selectButton(index) {
    this._buttons[this._selectedIndex].classList.remove('selected');
    this._selectedIndex = index;
    this._buttons[this._selectedIndex].classList.add('selected');

    this.enterKeyUpCallback = () => this._buttons[this._selectedIndex].click();
  }

  handleArrowUp() {
    let newIndex = this._selectedIndex - 1;
    if (newIndex < 0) {
      newIndex = this._buttons.length - 1;
    }
    this.selectButton(newIndex);
  }

  handleArrowDown() {
    let newIndex = this._selectedIndex + 1;
    if (newIndex >= this._buttons.length) {
      newIndex = 0;
    }
    this.selectButton(newIndex);
  }

  handleMouseOver(event) {
    let button = event.target;
    let index = Array.from(this._buttons).indexOf(button);
    this.selectButton(index);
  }

  handleMouseClick(event) {
    let button = event.target;
    let index = Array.from(this._buttons).indexOf(button);
    // Perform action based on selected button
    // this.executeAction(index);
  }

  deleteButtons() {
    this._menuContainer.innerHTML = "";
    // this._menuContainer.classList.remove('overlay');
  }

  closeModal() {this._menuContainer.close(); }
  generateButtons(menuSelect: MenuSelect) {
    // this._menuContainer = document.getElementById("menu") as HTMLDivElement;
    this._menuContainer = document.getElementById("menu") as HTMLDialogElement;
    // this._menuContainer.innerHTML = "";
    this.deleteButtons();
    // this._menuContainer.classList.add('overlay');
    if (!this._menuContainer.open) this._menuContainer.showModal();

    const geneButton = (showText: string, callback: () => void) => {
      const tempButton = document.createElement('button');
      tempButton.innerText = showText;
      // TODO: why css doesn't apply to these button???
      tempButton.style.fontFamily = this._fontHandle.fontName;
      tempButton.addEventListener('click', callback);
      tempButton.addEventListener('mouseover', this.handleMouseOver.bind(this));
      tempButton.addEventListener('click', this.handleMouseClick.bind(this));

      this._menuContainer.appendChild(tempButton);
    }

    switch (menuSelect) {
      case MenuSelect.START_MENU:
        geneButton('アーケードモード', () => this.generateButtons(MenuSelect.ARCADE_SELECT_1));
        geneButton('連鎖耐久モード', () => this.generateButtons(MenuSelect.ENDURANCE_SELECT_1));
        geneButton('カスタムモード', () => { });
        geneButton('せってい', () => { });
        break;
      case MenuSelect.ARCADE_SELECT_1:
        geneButton('EASY', () => { this.arcadeEasy(); this.closeModal(); });
        geneButton('NORMAL', () => { this.arcadeNormal(); this.closeModal(); });
        geneButton('HARD', () => { this.arcadeHard(); this.closeModal(); });
        geneButton('戻る', () => { this.generateButtons(MenuSelect.START_MENU) });
        break;
      case MenuSelect.ENDURANCE_SELECT_1:
        geneButton('モード1', () => { this.enduranceMode1(); this.closeModal(); });
        geneButton('モード2', () => { this.enduranceMode2(); this.closeModal(); });
        geneButton('きろくをみる', () => { this.watchHighScores(); });
        geneButton('戻る', () => { this.generateButtons(MenuSelect.START_MENU) });
        break;
      case MenuSelect.PAUSE:
        geneButton('ゲームに戻る', () => { this.backToGameInPause(); this.closeModal(); });
        geneButton('メニューに戻る', () => { this.backToMenuInPause(); this.generateButtons(MenuSelect.START_MENU) });
        break;
      case MenuSelect.GAME_OVER:
        geneButton('リトライする', () => { this.retryAfterGameOver(); this.closeModal(); });
        geneButton('メニューに戻る', () => { this.backToMenuAfterGameOver(); this.generateButtons(MenuSelect.START_MENU) });
        break;
      case MenuSelect.GAME_CLEAR:
        geneButton('もういちどのぼる', () => { this.retryAfterGameClear(); this.closeModal(); });
        geneButton('メニューに戻る', () => { this.backToMenuAfterGameClear(); this.generateButtons(MenuSelect.START_MENU) });
        break;

      default:
        break;
    }

    // is here ok???
    this._buttons = this._menuContainer.querySelectorAll('button');
    this._selectedIndex = 0;
    this._buttons[this._selectedIndex].classList.add('selected');
  }

  setCallback(arcadeEasy, arcadeNormal, arcadeHard, enduranceMode1, enduranceMode2, watchHighScores,
    backToGameInPause, backToMenuInPause, retryAfterGameOver, backToMenuAfterGameOver, retryAfterGameClear, backToMenuAfterGameClear) {
    this.arcadeEasy = arcadeEasy;
    this.arcadeNormal = arcadeNormal;
    this.arcadeHard = arcadeHard;
    this.enduranceMode1 = enduranceMode1;
    this.enduranceMode2 = enduranceMode2;
    this.watchHighScores = watchHighScores;
    this.backToGameInPause = backToGameInPause;
    this.backToMenuInPause = backToMenuInPause;
    this.retryAfterGameOver = retryAfterGameOver;
    this.backToMenuAfterGameOver = backToMenuAfterGameOver;
    this.retryAfterGameClear = retryAfterGameClear;
    this.backToMenuAfterGameClear = backToMenuAfterGameClear;
  }
}

