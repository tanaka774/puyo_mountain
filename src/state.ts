

export enum GameState {
  // TODO: add readonly
  OPENING,
  MENU,
  GENE_SEED_PUYOS,
  FALLING_SEED_PUYOS,
  UNINIT,
  PREPARE_NEXT,
  MANIPULATING,
  SPLITTING,
  LOCKING_MANIPUYO,
  CHAIN_FINDING,
  CHAIN_VANISHING,
  FALLING_ABOVE_CHAIN,
  GAMEOVER,
  GAMECLEAR,
  PAUSING,
  JUST_DRAWING,
}

export const stateHandle = {
  // is it okay here???
  currentState: null,
  prevState: null,
  setState: function (state: GameState) {
    if (this.currentState !== state) {
      this.prevState = this.currentState;
      this.currentState = state;
    }
  },
  checkCurrentState: function (state: GameState) {
    return this.currentState === state;
  },
  checkPrevState: function (state: GameState) {
    return this.prevState === state;
  },
  duringGamePlay: function () {
    // need to keep refreshing
    const res: boolean = this.checkCurrentState(GameState.GENE_SEED_PUYOS) ||
      this.checkCurrentState(GameState.FALLING_SEED_PUYOS) || 
      this.checkCurrentState(GameState.UNINIT) || 
      this.checkCurrentState(GameState.PREPARE_NEXT) || 
      this.checkCurrentState(GameState.MANIPULATING) || 
      this.checkCurrentState(GameState.SPLITTING) || 
      // this.checkCurrentState(GameState.LOCKING_MANIPUYO) || 
      this.checkCurrentState(GameState.CHAIN_FINDING) || 
      this.checkCurrentState(GameState.CHAIN_VANISHING) || 
      this.checkCurrentState(GameState.FALLING_ABOVE_CHAIN);
    return res;
  },
  menuButtonAppears: function () {
    const res: boolean = this.checkCurrentState(GameState.MENU) || 
    this.checkCurrentState(GameState.PAUSING) || 
    this.checkCurrentState(GameState.GAMEOVER) || 
    this.checkCurrentState(GameState.GAMECLEAR);
    return res;
  },
}


