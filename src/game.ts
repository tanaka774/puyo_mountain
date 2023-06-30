import { baseManiPuyo } from "./puyo.ts"
import { gameConfig } from "./config.ts"
import { recordPuyoSteps } from "./record.ts"
import { gameState } from "./state.ts"
import { Chain } from "./chain.ts"
import { Menu } from "./menu.ts"
import { Move } from "./move.ts"
import { Split } from "./split.ts"
import { Current } from "./current.ts"
import { Board } from "./board.ts"
import { DrawWithCanvas } from "./draw.ts"
import { Input } from "./input"
import { Bounce } from "./bounce"

export class Game {
  constructor(
    private _menu: Menu,
    private _bounce: Bounce,
    private _board: Board,
    private _current: Current,
    private _move: Move,
    private _split: Split,
    private _chain: Chain,
    private _input: Input,
    private _draw: DrawWithCanvas,
  ) {
  }

  init(setNextState) {
    this._board.createBoard();
    // beforeNext();
    this._draw.draw();
    setNextState();
  }

  beforeNext(setNextState) {
    this._current.newPuyoSet();
    this._board.initLockWaitCount();
    this._move.quickTurn.isPossible = false;
    this._chain.initChainCount();
    // TODO: this is for debug
    this._input.keyInputInit();
    // erase puyos more than above gameConfig.BOARD_TOP_EDGE-2
    // TODO: this implementaion is not officially right
    for (let y = 0; y < gameConfig.BOARD_TOP_EDGE - 1; y++) {
      for (let x = gameConfig.BOARD_LEFT_EDGE; x < gameConfig.BOARD_RIGHT_EDGE; x++) {
        this._board.board[y][x] = gameConfig.NO_COLOR;
      }
    }

    this._chain.detectPossibleChain(this._board.board);

    setNextState();
  }

  // TODO: is this "this" ok?
  gameLoop(this) {
    this.beforeStateCheck();

    switch (gameState.currentState) {
      case gameState.OPENING:
        // some opning animation?
        // gameState.setState(gameState.MENU);
        break;
      case gameState.MENU:
        // open menu
        // if game start is pressed, go UNINIT
        break;
      case gameState.UNINIT:
        this.init(() => gameState.setState(gameState.PREPARE_NEXT));
        break;
      case gameState.PREPARE_NEXT:
        this.beforeNext(() => gameState.setState(gameState.MANIPULATING));
        break;
      case gameState.MANIPULATING: // FREEFALL state should be made?
        // TODO: deal with ugliness in this state
        this._input.inputHandle();
        if (gameState.currentState !== gameState.SPLITTING &&
          this._move.canPuyoMoveDown()
        ) {
          this._current.currentPuyo.parentY = this._move.movePuyoDown(this._current.currentPuyo.parentY, 1.0);
        } else {
          // TODO: I don't wanna do this! should be done in canMovePuyoDown()
          if (gameState.currentState !== gameState.SPLITTING) {
            // gameState.setState(gameState.LOCKING_MANIPUYO)

            if (this._current.lockCurrentPuyo()) gameState.setState(gameState.CHAIN_FINDING);
            // else this state again?
          }
        }
        // TODO: this should be entry function of SPLITTING
        if (gameState.currentState === gameState.SPLITTING) {
          this._split.lockUnsplittedPuyo();
        }
        break;
      case gameState.SPLITTING:
        this._split.letSplittedPuyoFall(
          () => gameState.setState(gameState.CHAIN_FINDING)
        );
        break;
      case gameState.LOCKING_MANIPUYO: // unused
        // TODO: want to calc lockwaitcount here or isn't necessary?
        // lockPuyo(() => gameState.setState(gameState.CHAIN_FINDING));
        if (this._current.lockCurrentPuyo()) gameState.setState(gameState.CHAIN_FINDING);
        else gameState.setState(gameState.MANIPULATING);
        break;
      case gameState.CHAIN_FINDING:
        // TODO: these should go into function?
        this._chain.findConnectedPuyos(this._board.board, (savePuyos) => {
          this._chain.addVanishPuyos(savePuyos);
        });

        if (this._chain.vanishPuyos.length !== 0) {
          this._chain.incrementChainCount();
          gameState.setState(gameState.CHAIN_VANISHING);
          this._chain.erasePuyos(this._board.board); // temp here, should go into VANISHING
        } else {
          if (!this.isGameOver()) gameState.setState(gameState.PREPARE_NEXT);
          else gameState.setState(gameState.GAMEOVER);
        }

        // chainfindfunction(
        //   () => gameState.setState(gameState.CHAIN_VANISHING), // chain exists
        //   () => gameState.setState(gameState.PREPARE_NEXT), // no chain
        //   () => gameState.setState(gameState.GAMEOVER) // no chain and over
        // );
        break;
      case gameState.CHAIN_VANISHING:
        // TODO: this should be called just once as enter function
        // erasePuyos(board);

        if (this._chain.chainVanishWaitCount < gameConfig.VANISH_WAIT_TIME) {
          this._chain.incrementChainVanishWaitCount();
          // this state again
        } else if (this._chain.chainVanishWaitCount === gameConfig.VANISH_WAIT_TIME) {
          this._chain.incrementChainVanishWaitCount();
          this._chain.findFloatingPuyos(this._board.board);
          gameState.setState(gameState.FALLING_ABOVE_CHAIN);
          // findFloatingPuyos(() => gameState.setState(gameState.FALLING_ABOVE_CHAIN));
        }
        break;
      case gameState.FALLING_ABOVE_CHAIN:
        // letFloaintgPuyosFall(() => gameState.setState(gameState.CHAIN_FINDING));

        if (this._chain.floatingPuyos.length > 0) {
          this._chain.letFloatingPuyosFall(this._board.board);
          // this state again
        } else {
          gameState.setState(gameState.CHAIN_FINDING);
          this._chain.initVanishPuyos();
          this._chain.initChainVanishWaitCount();
        }
        break;
      case gameState.JUST_DRAWING:
        if (!this._bounce.willBounce) gameState.setState(gameState.prevState);
        break;
      case gameState.GAMEOVER:
        // if no chain saves you, its over
        break;
      case gameState.PAUSING:
        // if you press pause
        // after this, go back to origianl state
        break;
    }

    // TODO: want to modify...
    if (!(gameState.currentState === gameState.OPENING ||
      gameState.currentState === gameState.MENU ||
      gameState.currentState === gameState.UNINIT ||
      gameState.currentState === gameState.PAUSING
    ))
      this._draw.draw();

    this.htmlUpdate();
    requestAnimationFrame(() => this.gameLoop(this));

  }

  beforeStateCheck() {
    if (this._bounce.willBounce &&
      (gameState.currentState !== gameState.FALLING_ABOVE_CHAIN)
    ) gameState.setState(gameState.JUST_DRAWING);
  }

  htmlUpdate() {
    const chainNumShow = document.getElementById("chainCount");
    chainNumShow.textContent = `${this._chain.chainCount} 連鎖    最大${this._chain.maxVirtualChainCount}連鎖可能`
  }

  isGameOver() {
    return this._board.board[gameConfig.BOARD_TOP_EDGE][gameConfig.PUYO_BIRTH_POSX] !== gameConfig.NO_COLOR;
  }
}
