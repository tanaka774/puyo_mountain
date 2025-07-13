

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
  prevState: null, // this couldn't be same state as current
  purePrevState: null, // this could be same state as current
  firstEnterFlag: true,
  setState: function (state: GameState) {
    this.purePrevState = this.currentState;
    if (this.currentState !== state) {
      this.prevState = this.currentState;
      this.currentState = state;
    }
    this.firstEnterFlag = true;
  },
  isEnter: function () {
    // const res = (this.purePrevState !== GameState.JUST_DRAWING) && (this.purePrevState !== this.currentState);
    const res: boolean = (this.purePrevState !== GameState.JUST_DRAWING) && this.firstEnterFlag;
    // this.purePrevState = this.currentState;
    this.firstEnterFlag = false;
    return res;
  },
  setPurePrevState: function () {
    this.purePrevState = this.currentState;
  },
  checkCurrentState: function (state: GameState) {
    return this.currentState === state;
  },
  checkPrevState: function (state: GameState) {
    return this.prevState === state;
  },
  duringGamePlay: function () {
    const res: boolean = this.duringGamePlayWithoutJustDrawing() ||
      this.checkCurrentState(GameState.JUST_DRAWING);
    ;
    return res;
  },
  duringGamePlayWithoutJustDrawing: function () {
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
  willShowGameResult: function () {
    const res: boolean = this.checkCurrentState(GameState.JUST_DRAWING) ||
      this.checkCurrentState(GameState.PAUSING) ||
      this.checkCurrentState(GameState.GAMEOVER) ||
      this.duringGamePlayWithoutJustDrawing();
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


