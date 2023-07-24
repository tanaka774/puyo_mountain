import { baseManiPuyo } from "./types"
import { gameConfig } from "./config"
import { recordPuyoSteps } from "./record"
import { GameState, stateHandle } from "./state"
import { Chain } from "./chain"
import { Menu, MenuSelect } from "./menu"
import { Move } from "./move"
import { Split } from "./split"
import { Current } from "./current"
import { Board } from "./board"
import { DrawWithCanvas } from "./drawWithCanvas"
import { Input } from "./input"
import { Bounce } from "./bounce"
import { Rotate } from "./rotate"
import { GameMode, Mountain } from "./mountain/mountain"
import { HtmlHandle } from "./htmlHandle"
import { DrawWithSVG } from "./drawWithSVG"
import { ApiHandle } from "./apiHandle"
import { Timer } from "./timer"

export class Game {
  constructor(
    private _menu: Menu,
    private _apiHandle: ApiHandle,
    private _timer: Timer,
    private _bounce: Bounce,
    private _board: Board,
    private _current: Current,
    private _move: Move,
    private _rotate: Rotate,
    private _split: Split,
    private _chain: Chain,
    private _input: Input,
    private _draw: DrawWithCanvas,
    // private _draw: DrawWithSVG,
    private _mountain: Mountain,
    private _htmlHandle: HtmlHandle,
  ) {
  }

  init(setNextState) {
    if (!this._board.board) this._board.board = this._board.createBoard();
    setNextState();
  }

  beforeNext(setNextState) {
    this._current.newPuyoSet();
    this._board.initLockWaitCount();
    this._rotate.quickTurn.isPossible = false;
    this._chain.initChainCount();

    // erase puyos more than above gameConfig.BOARD_TOP_EDGE-2
    // TODO: this implementaion is not officially right
    for (let y = 0; y < gameConfig.BOARD_TOP_EDGE - 1; y++) {
      for (let x = gameConfig.BOARD_LEFT_EDGE; x < gameConfig.BOARD_RIGHT_EDGE; x++) {
        this._board.board[y][x] = gameConfig.NO_COLOR;
      }
    }

    this._chain.detectPossibleChain(this._board.board, this._current.currentPuyo);

    setNextState();
  }

  // TODO: is this "this" ok?
  gameLoop(this) {
    this.beforeStateCheck();

    switch (stateHandle.currentState) {
      case GameState.OPENING:
        // some opning animation?
        stateHandle.setState(GameState.MENU);
        break;
      case GameState.MENU:
        // open menu
        break;
      case GameState.GENE_SEED_PUYOS:
        this._current.initPuyos();
        this._board.board = this._board.createBoard();
        this._mountain.decideVariablilty();
        this._mountain.generateSeedPuyos();
        this._mountain.changeExcessPuyo();
        this._mountain.setFloatingSeedPuyos();
        stateHandle.setState(GameState.FALLING_SEED_PUYOS);
        break;
      case GameState.FALLING_SEED_PUYOS:
        this._mountain.floatingSeedPuyos.forEach(floatingSeedPuyo => {
          this._move.letSinglePuyoFall(this._board,
            floatingSeedPuyo,
            recordPuyoSteps.SEED_PUYO_REC_FLAG,
            gameConfig.SEED_FALLING_SPEED,
            () => { this._mountain.deleteFloatingSeedPuyos(floatingSeedPuyo); }
          )
        });

        if (this._mountain.floatingSeedPuyos.length === 0) {
          stateHandle.setState(GameState.UNINIT);
          this._mountain.initInternalInfo();
          this._current.initVPuyo();
          this._timer.startTimer();
        }
        break;
      case GameState.UNINIT:
        this.init(() => stateHandle.setState(GameState.PREPARE_NEXT));
        break;
      case GameState.PREPARE_NEXT:
        this.beforeNext(() => stateHandle.setState(GameState.MANIPULATING));
        break;
      case GameState.MANIPULATING: // FREEFALL state should be made?
        // TODO: deal with ugliness in this state
        this._input.inputHandle();
        if (!stateHandle.checkCurrentState(GameState.SPLITTING) &&
          this._move.canPuyoMoveDown(this._board)
        ) {
          this._current.currentPuyo.parentY = this._move.movePuyoDown(this._current.currentPuyo.parentY, 1.0);

        } else {
          // TODO: I don't wanna do this! should be done in canMovePuyoDown()
          if (!stateHandle.checkCurrentState(GameState.SPLITTING)) {
            // stateHandle.setState(GameState.LOCKING_MANIPUYO)

            if (this._current.lockCurrentPuyo()) stateHandle.setState(GameState.CHAIN_FINDING);
            // else this state again?
          }
        }
        // TODO: this should be entry function of SPLITTING
        if (stateHandle.checkCurrentState(GameState.SPLITTING)) {
          this._split.lockUnsplittedPuyo();
        }
        break;
      case GameState.SPLITTING:
        // // splitted puyo is null from manip to here and disappears just in a brief moment
        // if (stateHandle.isEnter()) {
        //   this._split.lockUnsplittedPuyo();
        // }

        this._move.letSinglePuyoFall(
          this._board,
          this._split.splittedPuyo,
          recordPuyoSteps.MANIPULATE_PUYO_REC_FLAG,
          gameConfig.SPLIT_FALLING_SPEED,
          () => {
            this._split.splittedPuyo = null;
            stateHandle.setState(GameState.CHAIN_FINDING);
          }
        )
        break;
      case GameState.LOCKING_MANIPUYO: // unused
        // TODO: want to calc lockwaitcount here or isn't necessary?
        // lockPuyo(() => stateHandle.setState(GameState.CHAIN_FINDING));
        if (this._current.lockCurrentPuyo()) stateHandle.setState(GameState.CHAIN_FINDING);
        else stateHandle.setState(GameState.MANIPULATING);
        break;
      case GameState.CHAIN_FINDING:
        // if (stateHandle.isEnter()) {
        if (this._bounce.willBounce) {
          stateHandle.setState(GameState.JUST_DRAWING);
          break;
        }
        // }

        // TODO: these should go into function?
        this._chain.findConnectedPuyos(this._board.board, (savePuyos) => {
          this._chain.addVanishPuyos(savePuyos);
        });

        if (this._chain.vanishPuyos.length !== 0) {
          this._chain.incrementChainCount();
          stateHandle.setState(GameState.CHAIN_VANISHING);
        } else {
          if (!this.isGameOver()) {
            stateHandle.setState(GameState.PREPARE_NEXT);
          }
          else stateHandle.setState(GameState.GAMEOVER);

          // TODO: don't confuse mountain process like this
          if (this._chain.chainCount >= this._mountain.currentTargetChainNum) {
            this._mountain.goNextLevel(
              () => stateHandle.setState(GameState.GENE_SEED_PUYOS),
              () => stateHandle.setState(GameState.GAMECLEAR),
            )
          } else {
            // if no chain happens, just 0 is added
            this._mountain.addUnnecessaryVanishPuyoNum(this._chain.vanishPuyoNum);
          }
          this._chain.initVanishPuyoNum();
        }

        break;
      case GameState.CHAIN_VANISHING:
        if (stateHandle.isEnter()) {
          this._chain.erasePuyos(this._board.board);
        }

        if (this._chain.chainVanishWaitCount < gameConfig.VANISH_WAIT_TIME) {
          this._chain.incrementChainVanishWaitCount();
          // this state again
        } else if (this._chain.chainVanishWaitCount === gameConfig.VANISH_WAIT_TIME) {
          this._chain.incrementChainVanishWaitCount();
          this._chain.findFloatingPuyos(this._board.board);
          stateHandle.setState(GameState.FALLING_ABOVE_CHAIN);
        }
        break;
      case GameState.FALLING_ABOVE_CHAIN:
        this._chain.floatingPuyos.forEach(floatingPuyo => {
          this._move.letSinglePuyoFall(this._board,
            floatingPuyo,
            recordPuyoSteps.DID_FLOAT_PUYO_REC_FLAG,
            gameConfig.FLOAT_FALLING_SPEED,
            () => { this._chain.deleteFloatingPuyos(floatingPuyo); }
          )
        });

        if (this._chain.floatingPuyos.length === 0) {
          stateHandle.setState(GameState.CHAIN_FINDING);
          this._chain.initVanishPuyos();
          this._chain.initChainVanishWaitCount();
        }
        break;
      case GameState.JUST_DRAWING:
        if (!this._bounce.willBounce) stateHandle.setState(stateHandle.prevState);
        break;
      case GameState.GAMEOVER:
        // if no chain saves you, its over
        if (stateHandle.isEnter()) {
          this._menu.generateButtons(MenuSelect.GAME_OVER);
        }
        break;
      case GameState.GAMECLEAR:
        // conglats
        if (stateHandle.isEnter()) {
          this._menu.generateButtons(MenuSelect.GAME_CLEAR);

          this.afterGameClear();
        }
        break;
      case GameState.PAUSING:
        // if you press pause
        // after this, go back to origianl state
        break;
    }

    this._draw.draw();

    this._htmlHandle.htmlUpdate();

    requestAnimationFrame(() => this.gameLoop(this));
  }

  beforeStateCheck() {
    // if (this._bounce.willBounce
    //   // && (!stateHandle.checkCurrentState(GameState.FALLING_ABOVE_CHAIN))
    //   && (stateHandle.checkCurrentState(GameState.FALLING_ABOVE_CHAIN))
    // ) {
    //   // stateHandle.setState(GameState.JUST_DRAWING);
    // }
  }

  isGameOver() {
    return this._board.board[gameConfig.BOARD_TOP_EDGE][gameConfig.PUYO_BIRTH_POSX] !== gameConfig.NO_COLOR;
  }

  handlePause() {
    if (stateHandle.duringGamePlayWithoutJustDrawing()) {
      // go to pause
      stateHandle.setState(GameState.PAUSING);
      this._menu.generateButtons(MenuSelect.PAUSE);
    }
    else if (stateHandle.checkCurrentState(GameState.PAUSING)) {
      // back from pause
      stateHandle.setState(stateHandle.prevState);
      this._menu.closeModal();
    }
  }

  // just once called before entering loop
  beforeLoop() {
    // register pause button
    // const pauseButton = document.getElementById("pauseButton");
    // pauseButton.addEventListener('click', this.handlePause.bind(this));
    document.addEventListener('keydown', e => {
      if (e.key === 'p') this.handlePause();
    })
  }

  afterGameClear() {
    if (this._mountain.currentMode === GameMode.ENDURANCE) {
      this._htmlHandle.showRankInModal()
        .catch((err) => console.error(err));
    } else if (this._mountain.currentMode === GameMode.ARCADE) {
      this._htmlHandle.showArcadeResult();
    }
  }
}
