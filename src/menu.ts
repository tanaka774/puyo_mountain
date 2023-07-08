import { gameState } from "./state";

enum MenuSelect {
  START_MENU,
  ARCADE_SELECT_1,
  ENDURANCE_SELECT_1,
  PAUSE,
  GAME_OVER,
  GAME_CLEAR,
}

export class Menu {
  private _buttons: NodeListOf<HTMLButtonElement>;
  private _menuContainer: HTMLDivElement;
  private _selectedIndex: number;
  private arcadeEasy: () => void;
  private arcadeNormal: () => void;
  private arcadeHard: () => void;
  private enduranceMode1: () => void;
  private enduranceMode2: () => void;
  private enterKeyUpCallback: () => void;


  constructor() {
    this.generateButtons(MenuSelect.START_MENU);

    this._buttons = this._menuContainer.querySelectorAll('button');
    // this._buttons = document.querySelectorAll('.menu-container button');
    this._selectedIndex = 0;

    this._buttons[this._selectedIndex].classList.add('selected');

    // TODO: I heard you don't need bind() in typescript
    this.handleArrowUp = this.handleArrowUp.bind(this);
    this.handleArrowDown = this.handleArrowDown.bind(this);
    this.handleMouseOver = this.handleMouseOver.bind(this);
    this.handleMouseClick = this.handleMouseClick.bind(this);

    // this._buttons.forEach(button => {
    //   button.addEventListener('mouseover', this.handleMouseOver);
    //   button.addEventListener('click', this.handleMouseClick);
    // });

    // document.addEventListener('keydown', event => {
    //   if (event.key === 'ArrowUp') {
    //     this.handleArrowUp();
    //   } else if (event.key === 'ArrowDown') {
    //     this.handleArrowDown();
    //   }
    // });

    document.addEventListener('keyup', e => {
      if (gameState.currentState !== gameState.MENU) return;

      if (e.key === 'ArrowUp') {
        this.handleArrowUp();
      } else if (e.key === 'ArrowDown') {
        this.handleArrowDown();
      }

      if (e.key === 'Enter') {
        console.log("I'm called mom!")
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

  private deleteButtons() {
    this._menuContainer.innerHTML = "";
  }

  generateButtons(menuSelect: MenuSelect) {
    this._menuContainer = document.getElementById("menu") as HTMLDivElement;
    // this._menuContainer.innerHTML = "";
    this.deleteButtons();

    const geneButton = (showText: string, callback: () => void) => {
      const tempButton = document.createElement('button');
      tempButton.innerText = showText;
      tempButton.addEventListener('click', callback);

      this._menuContainer.appendChild(tempButton);
    }

    switch (menuSelect) {
      case MenuSelect.START_MENU:
        geneButton('アーケードモード', () => this.generateButtons(MenuSelect.ARCADE_SELECT_1));
        geneButton('連鎖耐久モード', () => this.generateButtons(MenuSelect.ENDURANCE_SELECT_1));
        geneButton('カスタムモード', () => { });
        geneButton('きろくをみる', () => { });
        break;
      case MenuSelect.ARCADE_SELECT_1:
        geneButton('EASY', () => { this.arcadeEasy(); this.deleteButtons(); });
        geneButton('NORMAL', () => { this.arcadeNormal(); this.deleteButtons(); });
        geneButton('HARD', () => { this.arcadeHard(); this.deleteButtons(); });
        geneButton('戻る', () => { this.generateButtons(MenuSelect.START_MENU) });
        break;
      case MenuSelect.ENDURANCE_SELECT_1:
        geneButton('モード1', () => { this.enduranceMode1(); this.deleteButtons(); });
        geneButton('モード2', () => { this.enduranceMode2(); this.deleteButtons(); });
        geneButton('戻る', () => { this.generateButtons(MenuSelect.START_MENU) });
        break;
      case MenuSelect.PAUSE:
        geneButton('ゲームに戻る', () => { });
        geneButton('メニューに戻る', () => { this.generateButtons(MenuSelect.START_MENU) });
        break;
      case MenuSelect.GAME_OVER:
        // where should I let go back????
        geneButton('リトライ', () => { });
        geneButton('メニューに戻る', () => { this.generateButtons(MenuSelect.START_MENU) });
        break;
      case MenuSelect.GAME_CLEAR:
        geneButton('もういちど', () => { });
        geneButton('メニューに戻る', () => { this.generateButtons(MenuSelect.START_MENU) });
        break;

      default:
        break;
    }

    // is here ok???
    this._buttons = this._menuContainer.querySelectorAll('button');
    this._selectedIndex = 0;
    this._buttons[this._selectedIndex].classList.add('selected');
    this._buttons.forEach(button => {
      button.addEventListener('mouseover', this.handleMouseOver.bind(this));
      button.addEventListener('click', this.handleMouseClick.bind(this));
    });
  }

  // executeAction(index) {
  //   let willCloseMenu = false;
  //   switch (index) {
  //     case 0:
  //       willCloseMenu = true;
  //       this.setStateMode1();
  //       break;
  //     case 1:
  //       willCloseMenu = true;
  //       this.setStateMode2();
  //       break;
  //     case 2:
  //       willCloseMenu = true;
  //       this.setStateMode3();
  //       break;
  //     default:
  //       break;
  //   }
  //   if (willCloseMenu) {
  //
  //     const menuDiv = document.getElementById("menu") as HTMLDivElement;
  //     menuDiv.remove();
  //   }
  // }

  setCallback(arcadeEasy, arcadeNormal, arcadeHard, enduranceMode1, enduranceMode2) {
    this.arcadeEasy = arcadeEasy;
    this.arcadeNormal = arcadeNormal;
    this.arcadeHard = arcadeHard;
    this.enduranceMode1 = enduranceMode1;
    this.enduranceMode2 = enduranceMode2;
  }
}

