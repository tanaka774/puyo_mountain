import { gameConfig } from "./config.ts"
import { recordPuyoSteps } from "./record.ts"
import { GameState, stateHandle } from "./state.ts"
import { baseSinglePuyo } from "./types.ts"
import { Chain } from "./chain.ts"
import { Menu } from "./menu.js"
import { Move } from "./move.ts"
import { Split } from "./split.ts"
import { Game } from "./game.ts"
import { Input } from "./input.ts"
import { DrawWithCanvas } from "./drawWithCanvas"
import { Bounce } from "./bounce.ts"
import { Board } from "./board.ts"
import { Current } from "./current.ts"
import { Rotate } from "./rotate.ts"
import { Difficulty, GameMode, Mountain } from "./mountain"
import { HtmlHandle } from "./htmlHandle"
import { DrawWithSVG } from "./drawWithSVG"

function main() {
  const menu = new Menu();
  const bounce = new Bounce();
  const board = new Board(bounce);
  const current = new Current(board);
  const split = new Split(board);
  const chain = new Chain(board);
  const move = new Move(current, split);
  const rotate = new Rotate(current, move);
  const mountain = new Mountain(board, move, chain);
  const input = new Input(board, current, move, rotate);
  const draw = new DrawWithCanvas(bounce, board, current, move, rotate,
    split, chain, mountain, 'mainCanvas', 'nextPuyoCanvas');
  // const draw = new DrawWithSVG(bounce, board, current, move, rotate,
  //   split, chain, mountain);
  const htmlHandle = new HtmlHandle(chain, mountain);
  const game = new Game(menu, bounce, board, current, move, rotate,
    split, chain, input, draw, mountain, htmlHandle);

  setCallback();

  game.beforeLoop();
  stateHandle.setState(GameState.OPENING);
  game.gameLoop();

  function setCallback() {
    move.setCallback(
      () => stateHandle.setState(GameState.SPLITTING),
    );

    current.setCallback(
      () => chain.detectPossibleChain(board.board, current.currentPuyo)
    );

    const resetStatus = () => {
      board.initBoard();
      current.initManiPuyos();
      chain.initFloatingPuyos();
      chain.initConnectedPuyos();
      split.initSplittedPuyo();
      mountain.initAll();
    }

    menu.setCallback(
      () => {
        stateHandle.setState(GameState.GENE_SEED_PUYOS);
        mountain.setGameMode(GameMode.ARCADE);
        mountain.setDifficulty(Difficulty.EASY);
        mountain.initTargetChain();
      },
      () => {
        stateHandle.setState(GameState.GENE_SEED_PUYOS);
        mountain.setGameMode(GameMode.ARCADE);
        mountain.setDifficulty(Difficulty.NORMAL);
        mountain.initTargetChain();
      },
      () => {
        stateHandle.setState(GameState.GENE_SEED_PUYOS);
        mountain.setGameMode(GameMode.ARCADE);
        mountain.setDifficulty(Difficulty.HARD);
        mountain.initTargetChain();
      },
      () => {
        stateHandle.setState(GameState.GENE_SEED_PUYOS);
        mountain.setGameMode(GameMode.ENDURANCE);
        mountain.initTargetChain();
      },
      () => {
        stateHandle.setState(GameState.GENE_SEED_PUYOS);
        mountain.setGameMode(GameMode.ENDURANCE);
        mountain.initTargetChain();
      },
      () => {
        game.handlePause();
      },
      () => {
        resetStatus();
        stateHandle.setState(GameState.MENU);
      },
      () => {
        resetStatus();
        stateHandle.setState(GameState.GENE_SEED_PUYOS);
      },
      () => {
        resetStatus();
        stateHandle.setState(GameState.MENU);
      },
      () => {
        resetStatus();
        stateHandle.setState(GameState.GENE_SEED_PUYOS);
      },
      () => {
        resetStatus();
        stateHandle.setState(GameState.MENU);
      },
    );
  }
}

main();
