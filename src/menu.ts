import { gameConfig } from "./config";
import { FontHandle } from "./fontHandle";
import { GameState, stateHandle } from "./state";
import lang from "../locales";

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
  private _titleElement: HTMLElement;
  private _selectedIndex: number;
  private arcadeEasy: () => void;
  private arcadeNormal: () => void;
  private arcadeHard: () => void;
  private enduranceMode1: () => void;
  private enduranceMode2: () => void;
  private customMode: () => void;
  private gameSetting: () => void;
  private watchHighScores: () => void;
  private backToGameInPause: () => void;
  private backToMenuInPause: () => void;
  private retryAfterGameOver: () => void;
  private retryAfterGameClear: () => void;
  private backToMenuAfterGameOver: () => void;
  private backToMenuAfterGameClear: () => void;
  private enterKeyUpCallback: () => void; // should use customevent?


  constructor(
    private _fontHandle: FontHandle
  ) {
    this._titleElement = document.getElementById("title");
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
        // console.log("I'm called mom!")
        e.preventDefault();
        this.enterKeyUpCallback();
      }
    })

    this.enterKeyUpCallback = () => this._buttons[this._selectedIndex].click();

  }

  selectButton(newIndex) {
    const descDivBefore = document.getElementById(`desc${this._selectedIndex}`) as HTMLElement;
    if (descDivBefore) { descDivBefore.style.display = 'none'; }
    const descDivAfter = document.getElementById(`desc${newIndex}`) as HTMLElement;
    if (descDivAfter) { descDivAfter.style.display = ''; }

    this._buttons[this._selectedIndex].classList.remove('selected');
    this._selectedIndex = newIndex;

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
    // unused?
    let button = event.target;
    let index = Array.from(this._buttons).indexOf(button);
    // Perform action based on selected button
    // this.executeAction(index);
  }

  deleteButtons() {
    this._menuContainer.innerHTML = "";
  }

  closeModal() {
    this._menuContainer.close();
    this._titleElement.style.display = 'none';
  }

  generateButtons(menuSelect: MenuSelect) {
    this._menuContainer = document.getElementById("menu") as HTMLDialogElement;
    this.deleteButtons();
    if (!this._menuContainer.open) this._menuContainer.showModal();
    this._titleElement.style.display = '';

    const geneButton = (showText: string, callback: () => void, description: string = undefined, index: number = -1) => {
      const tempButton = document.createElement('button');
      tempButton.innerText = showText;
      // TODO: why css doesn't apply to these button???
      tempButton.style.fontFamily = this._fontHandle.fontName;
      tempButton.addEventListener('click', callback);
      tempButton.addEventListener('mouseover', this.handleMouseOver.bind(this));
      tempButton.addEventListener('click', this.handleMouseClick.bind(this));

      this._menuContainer.appendChild(tempButton);

      if (description) {
        const descDiv = document.createElement('div');
        descDiv.style.display = 'none';
        descDiv.style.textAlign = 'center';
        descDiv.style.color = 'white';
        descDiv.style.fontSize = '16px';
        descDiv.innerHTML = `${description}`;
        // descDiv.style.marginTop = '3px';
        // descDiv.style.width = 'min-content'
        // descDiv.style.height = '20px'
        descDiv.id = `desc${index}`;
        this._menuContainer.appendChild(descDiv);
      }
    }

    switch (menuSelect) {
      case MenuSelect.START_MENU:
        geneButton(lang.arcadeMode,
          () => this.generateButtons(MenuSelect.ARCADE_SELECT_1),
          lang.arcadeModeDesc, 0
        );
        geneButton(lang.scoreMode,
          () => this.generateButtons(MenuSelect.ENDURANCE_SELECT_1),
          lang.scoreModeDesc, 1
        );
        geneButton(lang.customMode,
          () => { this.customMode(); },
          lang.customModeDesc, 2
        );
        geneButton(lang.setting,
          () => { this.gameSetting(); },
          lang.settingDesc, 3
        );
        break;
      case MenuSelect.ARCADE_SELECT_1:
        geneButton(lang.easyMountain,
          () => { this.arcadeEasy(); this.closeModal(); },
          lang.difficultyEasy, 0
        );
        geneButton(lang.normalMountain,
          () => { this.arcadeNormal(); this.closeModal(); },
          lang.difficultyNormal, 1
        );
        geneButton(lang.hardMountain,
          () => { this.arcadeHard(); this.closeModal(); },
          lang.difficultyHard, 2
        );
        geneButton(lang.back, () => { this.generateButtons(MenuSelect.START_MENU) });
        break;
      case MenuSelect.ENDURANCE_SELECT_1:
        geneButton(lang.k2,
          () => { this.enduranceMode1(); this.closeModal(); },
          lang.k2Desc(gameConfig.ENDURANCE_MIN_ONCE1, gameConfig.ENDURANCE_MAX_ONCE1, gameConfig.ENDURANCE_TOTAL1),
          0
        );
        // geneButton('モード2（テスト用）',
        //   () => { this.enduranceMode2(); this.closeModal(); },
        //   `${gameConfig.ENDURANCE_MIN_ONCE2}~${gameConfig.ENDURANCE_MAX_ONCE2}連鎖で計${gameConfig.ENDURANCE_TOTAL2}連鎖まで`,
        //   1
        // );
        geneButton(lang.watchRecords,
          () => { this.watchHighScores(); },
          lang.watchRecordsDesc,
          1
        );
        geneButton(lang.back, () => { this.generateButtons(MenuSelect.START_MENU) });
        break;
      case MenuSelect.PAUSE:
        geneButton(lang.backToGame, () => { this.backToGameInPause(); this.closeModal(); });
        geneButton(lang.retry, () => { this.retryAfterGameOver(); this.closeModal(); }); // this is not afterGameOver though
        geneButton(lang.backToMenu, () => { this.backToMenuInPause(); this.generateButtons(MenuSelect.START_MENU) });
        break;
      case MenuSelect.GAME_OVER:
        geneButton(lang.retry, () => { this.retryAfterGameOver(); this.closeModal(); });
        geneButton(lang.backToMenu, () => { this.backToMenuAfterGameOver(); this.generateButtons(MenuSelect.START_MENU) });
        break;
      case MenuSelect.GAME_CLEAR:
        geneButton(lang.climbAgain, () => { this.retryAfterGameClear(); this.closeModal(); });
        geneButton(lang.backToMenu, () => { this.backToMenuAfterGameClear(); this.generateButtons(MenuSelect.START_MENU) });
        break;

      default:
        break;
    }

    // is here ok???
    this._buttons = this._menuContainer.querySelectorAll('button');
    this._selectedIndex = 0;
    this._buttons[this._selectedIndex].classList.add('selected');

    const descDivFirst = document.getElementById(`desc0`) as HTMLElement;
    if (descDivFirst) descDivFirst.style.display = '';
  }

  setCallback(arcadeEasy, arcadeNormal, arcadeHard, enduranceMode1, enduranceMode2, customMode, gameSetting, watchHighScores,
    backToGameInPause, backToMenuInPause, retryAfterGameOver, backToMenuAfterGameOver, retryAfterGameClear, backToMenuAfterGameClear) {
    this.arcadeEasy = arcadeEasy;
    this.arcadeNormal = arcadeNormal;
    this.arcadeHard = arcadeHard;
    this.enduranceMode1 = enduranceMode1;
    this.enduranceMode2 = enduranceMode2;
    this.customMode = customMode;
    this.gameSetting = gameSetting;
    this.watchHighScores = watchHighScores;
    this.backToGameInPause = backToGameInPause;
    this.backToMenuInPause = backToMenuInPause;
    this.retryAfterGameOver = retryAfterGameOver;
    this.backToMenuAfterGameOver = backToMenuAfterGameOver;
    this.retryAfterGameClear = retryAfterGameClear;
    this.backToMenuAfterGameClear = backToMenuAfterGameClear;
  }
}

