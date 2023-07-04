export class Menu {
  private buttons: NodeListOf<HTMLButtonElement>;
  private selectedIndex: number;
  private setStateMode1: () => void;
  private setStateMode2: () => void;
  private setStateMode3: () => void;

  constructor() {
    this.buttons = document.querySelectorAll('.menu-container button');
    this.selectedIndex = 0;

    // Set the initial selected button
    this.buttons[this.selectedIndex].classList.add('selected');

    // Bind event handlers
    // TODO: I heard you don't need bind() in typescript
    this.handleArrowUp = this.handleArrowUp.bind(this);
    this.handleArrowDown = this.handleArrowDown.bind(this);
    this.handleMouseOver = this.handleMouseOver.bind(this);
    this.handleMouseClick = this.handleMouseClick.bind(this);

    // Event handlers for button selection
    this.buttons.forEach(button => {
      button.addEventListener('mouseover', this.handleMouseOver);
      button.addEventListener('click', this.handleMouseClick);
    });

    // Event handler for keydown event
    document.addEventListener('keydown', event => {
      if (event.key === 'ArrowUp') {
        this.handleArrowUp();
      } else if (event.key === 'ArrowDown') {
        this.handleArrowDown();
      }
      else if (event.key === "Enter") {
        this.executeAction(this.selectedIndex);
      }
    });
  }

  selectButton(index) {
    this.buttons[this.selectedIndex].classList.remove('selected');
    this.selectedIndex = index;
    this.buttons[this.selectedIndex].classList.add('selected');
  }

  handleArrowUp() {
    let newIndex = this.selectedIndex - 1;
    if (newIndex < 0) {
      newIndex = this.buttons.length - 1;
    }
    this.selectButton(newIndex);
  }

  handleArrowDown() {
    let newIndex = this.selectedIndex + 1;
    if (newIndex >= this.buttons.length) {
      newIndex = 0;
    }
    this.selectButton(newIndex);
  }

  handleMouseOver(event) {
    let button = event.target;
    let index = Array.from(this.buttons).indexOf(button);
    this.selectButton(index);
  }

  handleMouseClick(event) {
    let button = event.target;
    let index = Array.from(this.buttons).indexOf(button);
    // Perform action based on selected button
    this.executeAction(index);
  }

  executeAction(index) {
    let willCloseMenu = false;
    switch (index) {
      case 0:
        willCloseMenu = true;
        this.setStateMode1();
        break;
      case 1:
        willCloseMenu = true;
        this.setStateMode2();
        break;
      case 2:
        willCloseMenu = true;
        this.setStateMode3();
        break;
      default:
        break;
    }
    if (willCloseMenu) {

      const menuDiv = document.getElementById("menu") as HTMLDivElement;
      menuDiv.remove();
    }
  }

  setCallback(setStateMode1, setStateMode2, setStateMode3) {
    this.setStateMode1 = setStateMode1;
    this.setStateMode2 = setStateMode2;
    this.setStateMode3 = setStateMode3;
  }
}

