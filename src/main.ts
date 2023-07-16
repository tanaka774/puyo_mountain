import { gameConfig } from "./config"
import { recordPuyoSteps } from "./record"
import { GameState, stateHandle } from "./state"
import { baseSinglePuyo } from "./types"
import { Chain } from "./chain"
import { Menu } from "./menu.js"
import { Move } from "./move"
import { Split } from "./split"
import { Game } from "./game"
import { Input } from "./input"
import { DrawWithCanvas } from "./drawWithCanvas"
import { Bounce } from "./bounce"
import { Board } from "./board"
import { Current } from "./current"
import { Rotate } from "./rotate"
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
