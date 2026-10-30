import { gameConfig } from "./config";
import { FontHandle } from "./fontHandle";
import { GameState, stateHandle } from "./state";
import lang from "../locales";
import { createControlsList } from "./htmlHandler/utils";

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
  private _currentMenu: MenuSelect;
  // one description per button (empty when it has none), shown in a fixed panel under the buttons
  private _descriptions: string[] = [];
  private _descPanel: HTMLElement | null = null;
  private arcadeEasy: () => void;
  private arcadeNormal: () => void;
  private arcadeHard: () => void;
  private enduranceMode1: () => void;
  private enduranceMode2: () => void;
  private customMode: () => void;
  private gameSetting: () => void;
  private showGuide: () => void;
  private watchHighScores: () => void;
  private watchReplay: () => void;
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

    // ignore keys meant for a dialog opened over the menu (guide, settings...),
    // including the Enter keyup right after it closes, which would reopen it
    const isOtherDialogOpen = () => document.querySelector('dialog[open]:not(#menu)') !== null;
    let enterDownInMenu = false;
    // capture phase: check before the dialog's own Enter handler closes it
    document.addEventListener('keydown', e => {
      if (e.key === 'Enter') enterDownInMenu = !isOtherDialogOpen();
    }, true);

    // Escape would close the menu dialog natively; go back to the parent menu (or resume from pause) instead.
    // cancelling keydown (not the dialog's cancel event) keeps working on repeated presses
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape' || !this._menuContainer.open || isOtherDialogOpen()) return;
      e.preventDefault();
      if (this._currentMenu === MenuSelect.ARCADE_SELECT_1 ||
        this._currentMenu === MenuSelect.ENDURANCE_SELECT_1) {
        this.generateButtons(MenuSelect.START_MENU);
      } else if (this._currentMenu === MenuSelect.PAUSE) {
        this.backToGameInPause(); this.closeModal();
      }
    });

    document.addEventListener('keyup', e => {
      if (!stateHandle.menuButtonAppears() || isOtherDialogOpen()) return;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.handleArrowUp();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.handleArrowDown();
      }

      if (e.key === 'Enter' && enterDownInMenu) {
        // console.log("I'm called mom!")
        e.preventDefault();
        this.enterKeyUpCallback();
      }
    })

    this.enterKeyUpCallback = () => this._buttons[this._selectedIndex].click();

  }

  selectButton(newIndex) {
    this.showDescription(newIndex);

    this._buttons[this._selectedIndex].classList.remove('selected');
    this._selectedIndex = newIndex;

    this._buttons[this._selectedIndex].classList.add('selected');

    this.enterKeyUpCallback = () => this._buttons[this._selectedIndex].click();
  }

  private showDescription(index: number) {
    if (!this._descPanel) return;
    const text = this._descriptions[index] ?? '';
    if (this._descPanel.textContent === text) return;
    this._descPanel.textContent = text;
    this._descPanel.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: 'ease-out' });
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
    document.body.dataset.screen = 'game';
  }

  generateButtons(menuSelect: MenuSelect) {
    this._menuContainer = document.getElementById("menu") as HTMLDialogElement;
    this.deleteButtons();
    this._currentMenu = menuSelect;
    if (!this._menuContainer.open) this._menuContainer.showModal();
    this._titleElement.style.display = '';
    // the board is hidden behind title menus but stays visible behind pause/result menus
    const isTitleMenu = menuSelect === MenuSelect.START_MENU ||
      menuSelect === MenuSelect.ARCADE_SELECT_1 ||
      menuSelect === MenuSelect.ENDURANCE_SELECT_1;
    document.body.dataset.screen = isTitleMenu ? 'title' : 'game';

    this._descriptions = [];
    this._descPanel = null;

    const geneButton = (showText: string, callback: () => void, description: string = '') => {
      const tempButton = document.createElement('button');
      tempButton.innerText = showText;
      tempButton.addEventListener('click', callback);
      tempButton.addEventListener('mouseover', this.handleMouseOver.bind(this));
      tempButton.addEventListener('click', this.handleMouseClick.bind(this));

      this._menuContainer.appendChild(tempButton);
      this._descriptions.push(description);
    }

    switch (menuSelect) {
      case MenuSelect.START_MENU:
        geneButton(lang.arcadeMode,
          () => this.generateButtons(MenuSelect.ARCADE_SELECT_1),
          lang.arcadeModeDesc
        );
        geneButton(lang.scoreMode,
          () => this.generateButtons(MenuSelect.ENDURANCE_SELECT_1),
          lang.scoreModeDesc
        );
        geneButton(lang.customMode,
          () => { this.customMode(); },
          lang.customModeDesc
        );
        geneButton(lang.guide,
          () => { this.showGuide(); },
          lang.guideDesc
        );
        geneButton(lang.setting,
          () => { this.gameSetting(); },
          lang.settingDesc
        );
        break;
      case MenuSelect.ARCADE_SELECT_1:
        geneButton(lang.easyMountain,
          () => { this.arcadeEasy(); this.closeModal(); },
          lang.difficultyEasy
        );
        geneButton(lang.normalMountain,
          () => { this.arcadeNormal(); this.closeModal(); },
          lang.difficultyNormal
        );
        geneButton(lang.hardMountain,
          () => { this.arcadeHard(); this.closeModal(); },
          lang.difficultyHard
        );
        geneButton(lang.back, () => { this.generateButtons(MenuSelect.START_MENU) });
        break;
      case MenuSelect.ENDURANCE_SELECT_1:
        geneButton(lang.k2,
          () => { this.enduranceMode1(); this.closeModal(); },
          lang.k2Desc(gameConfig.ENDURANCE_MIN_ONCE1, gameConfig.ENDURANCE_MAX_ONCE1, gameConfig.ENDURANCE_TOTAL1)
        );
        // geneButton('モード2（テスト用）',
        //   () => { this.enduranceMode2(); this.closeModal(); },
        //   `${gameConfig.ENDURANCE_MIN_ONCE2}~${gameConfig.ENDURANCE_MAX_ONCE2}連鎖で計${gameConfig.ENDURANCE_TOTAL2}連鎖まで`,
        //   1
        // );
        geneButton(lang.watchRecords,
          () => { this.watchHighScores(); },
          lang.watchRecordsDesc
        );
        geneButton(lang.back, () => { this.generateButtons(MenuSelect.START_MENU) });
        break;
      case MenuSelect.PAUSE:
        geneButton(lang.backToGame, () => { this.backToGameInPause(); this.closeModal(); });
        geneButton(lang.retry, () => { this.retryAfterGameOver(); this.closeModal(); }); // this is not afterGameOver though
        geneButton(lang.backToMenu, () => { this.backToMenuInPause(); this.generateButtons(MenuSelect.START_MENU) });
        this._menuContainer.appendChild(createControlsList());
        break;
      case MenuSelect.GAME_OVER:
        geneButton(lang.retry, () => { this.retryAfterGameOver(); this.closeModal(); });
        geneButton(lang.replay, () => { this.watchReplay(); });
        geneButton(lang.backToMenu, () => { this.backToMenuAfterGameOver(); this.generateButtons(MenuSelect.START_MENU) });
        break;
      case MenuSelect.GAME_CLEAR:
        geneButton(lang.climbAgain, () => { this.retryAfterGameClear(); this.closeModal(); });
        geneButton(lang.replay, () => { this.watchReplay(); });
        geneButton(lang.backToMenu, () => { this.backToMenuAfterGameClear(); this.generateButtons(MenuSelect.START_MENU) });
        break;

      default:
        break;
    }

    if (this._descriptions.some(desc => desc)) {
      this._descPanel = document.createElement('div');
      this._descPanel.classList.add('menu-desc');
      this._menuContainer.appendChild(this._descPanel);
    }

    // is here ok???
    this._buttons = this._menuContainer.querySelectorAll('button');
    this._selectedIndex = 0;
    this._buttons[this._selectedIndex].classList.add('selected');
    this.showDescription(0);
  }

  setCallback(
    arcadeEasy,
    arcadeNormal,
    arcadeHard,
    enduranceMode1,
    enduranceMode2,
    customMode,
    gameSetting,
    watchHighScores,
    backToGameInPause,
    backToMenuInPause,
    retryAfterGameOver,
    backToMenuAfterGameOver,
    retryAfterGameClear,
    backToMenuAfterGameClear,
    watchReplay,
    showGuide,
  ) {
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
    this.watchReplay = watchReplay;
    this.showGuide = showGuide;
  }
}

