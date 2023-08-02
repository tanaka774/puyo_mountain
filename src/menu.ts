import { gameConfig } from "./config";
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
        geneButton('アーケードモード',
          () => this.generateButtons(MenuSelect.ARCADE_SELECT_1),
          '連鎖を組んで頂上を目指そう', 0
        );
        geneButton('スコアモード',
          () => this.generateButtons(MenuSelect.ENDURANCE_SELECT_1),
          '最高峰の山を登るまでのタイムを競おう', 1
        );
        geneButton('カスタムモード',
          () => { this.customMode(); },
          'お好みの種ぷよ量・連鎖数でプレイできます', 2
        );
        geneButton('設定',
          () => { this.gameSetting(); },
          'ゲーム設定を行います', 3
        );
        break;
      case MenuSelect.ARCADE_SELECT_1:
        geneButton('　低山　',
          () => { this.arcadeEasy(); this.closeModal(); },
          '難易度:EASY', 0
        );
        geneButton('　中山　',
          () => { this.arcadeNormal(); this.closeModal(); },
          '難易度:NORMAL', 1
        );
        geneButton('　高山　',
          () => { this.arcadeHard(); this.closeModal(); },
          '難易度:HARD', 2
        );
        geneButton('戻る', () => { this.generateButtons(MenuSelect.START_MENU) });
        break;
      case MenuSelect.ENDURANCE_SELECT_1:
        geneButton('ケーツー',
          () => { this.enduranceMode1(); this.closeModal(); },
          `${gameConfig.ENDURANCE_MIN_ONCE1}~${gameConfig.ENDURANCE_MAX_ONCE1}連鎖で計${gameConfig.ENDURANCE_TOTAL1}連鎖まで`,
          0
        );
        geneButton('モード2（テスト用）',
          () => { this.enduranceMode2(); this.closeModal(); },
          `${gameConfig.ENDURANCE_MIN_ONCE2}~${gameConfig.ENDURANCE_MAX_ONCE2}連鎖で計${gameConfig.ENDURANCE_TOTAL2}連鎖まで`,
          1
        );
        geneButton('記録を見る',
          () => { this.watchHighScores(); },
          'ハイスコアを閲覧できます',
          2
        );
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
        geneButton('もう一度登る', () => { this.retryAfterGameClear(); this.closeModal(); });
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

