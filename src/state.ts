

export const gameState = {
  // TODO: add readonly
  OPENING: 'OPENING',
  MENU: 'MENU',
  UNINIT: 'UNINIT',
  PREPARE_NEXT: 'PREPARE_NEXT',
  MANIPULATING: 'MANIPULATING',
  SPLITTING: 'SPLITTING',
  LOCKING_MANIPUYO: 'LOCKING',
  CHAIN_FINDING: 'CHAIN_FINDING',
  CHAIN_VANISHING: 'CHAIN_VANISHING',
  FALLING_ABOVE_CHAIN: 'FALLING_ABOVE_CHAIN',
  GAMEOVER: 'GAMEOVER',
  PAUSING: 'PAUSING',
  JUST_DRAWING: 'JUST_DRAWING',
  // is it okay here???
  currentState: null,
  prevState: null,
  setState: function(state: typeof gameState) {
    if (this.currentState !== state) {
      this.prevState = this.currentState;
      this.currentState = state;
    }
  }
  // TODO: add function checkCurrentState()
}


