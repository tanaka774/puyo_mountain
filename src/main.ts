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
import { GameMode, Mountain } from "./mountain/mountain"
import { HtmlHandle } from "./htmlHandle"
import { DrawWithSVG } from "./drawWithSVG"
import { ApiHandle } from "./apiHandle"
import { Timer } from "./timer"
import { FontHandle } from "./fontHandle"
import { Difficulty } from "./mountain/mountainArcade"

function main() {
  const fontHandle = new FontHandle();
  const menu = new Menu(fontHandle);
  const apiHandle = new ApiHandle();
  const timer = new Timer();
  const bounce = new Bounce();
  const board = new Board(bounce);
  const current = new Current(board);
  const split = new Split(board);
  const chain = new Chain(board);
  const move = new Move(current, split);
  const rotate = new Rotate(current, move);
  const mountain = new Mountain(board, chain);
  const input = new Input(board, current, move, rotate);
  const draw = new DrawWithCanvas(fontHandle, bounce, board, current, move, rotate,
    split, chain, mountain, 'mainCanvas', 'nextPuyoCanvas');
  // const draw = new DrawWithSVG(bounce, board, current, move, rotate,
  //   split, chain, mountain);
  const htmlHandle = new HtmlHandle(apiHandle, timer, chain, mountain);
  const game = new Game(menu, apiHandle, timer, bounce, board, current, move, rotate,
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
      timer.initTimer();
    }

    menu.setCallback(
      () => {
        // arcade easy
        stateHandle.setState(GameState.GENE_SEED_PUYOS);
        mountain.setGameMode(GameMode.ARCADE);
        mountain.setDifficulty(Difficulty.EASY);
        mountain.initTargetChain();
        // this must be after setGamemode
        mountain.setCallback((color: string) => draw.drawWholeBackground(color));
      },
      () => {
        // arcade normal
        stateHandle.setState(GameState.GENE_SEED_PUYOS);
        mountain.setGameMode(GameMode.ARCADE);
        mountain.setDifficulty(Difficulty.NORMAL);
        mountain.initTargetChain();
        mountain.setCallback((color: string) => draw.drawWholeBackground(color));
      },
      () => {
        // arcade hard
        stateHandle.setState(GameState.GENE_SEED_PUYOS);
        mountain.setGameMode(GameMode.ARCADE);
        mountain.setDifficulty(Difficulty.HARD);
        mountain.initTargetChain();
        mountain.setCallback((color: string) => draw.drawWholeBackground(color));
      },
      () => {
        // endurance mode1
        stateHandle.setState(GameState.GENE_SEED_PUYOS);
        mountain.setGameMode(GameMode.ENDURANCE);
        mountain.initTargetChain();
        mountain.setCallback((color: string) => draw.drawWholeBackground(color));
      },
      () => {
        // endurance mode2
        stateHandle.setState(GameState.GENE_SEED_PUYOS);
        mountain.setGameMode(GameMode.ENDURANCE);
        mountain.initTargetChain();
        mountain.setCallback((color: string) => draw.drawWholeBackground(color));
      },
      () => {
        // watch highscore
        htmlHandle.showHighScoresModal();
      },
      () => {
        // back to game in pause
        game.handlePause();
      },
      () => {
        // back to menu in pause
        resetStatus();
        stateHandle.setState(GameState.MENU);
      },
      () => {
        // retry after gameover
        resetStatus();
        stateHandle.setState(GameState.GENE_SEED_PUYOS);
      },
      () => {
        // back to menu after gameover
        resetStatus();
        stateHandle.setState(GameState.MENU);
      },
      () => {
        // retry after gameclear
        resetStatus();
        stateHandle.setState(GameState.GENE_SEED_PUYOS);
      },
      () => {
        // back to menu after gameclear
        resetStatus();
        stateHandle.setState(GameState.MENU);
      },
    );
  }
}

// TODO: remove these debug code
// const apiHandle = new ApiHandle();
// apiHandle.deleteTable();
// apiHandle.createTable();
// apiHandle.deleteAllData(); // this doesn't work?
// apiHandle.addManyDatas();
// apiHandle.addData('takeda', '2 hours 13 minutes');
// apiHandle.addData('まさし', '0 hours 45 minutes');
// apiHandle.addData('jonny', '13 hours 9 minutes');
// apiHandle.updateWholeRank();
// apiHandle.updateSeasonRank('2023', '10', '12');
// apiHandle.fetchData('2023', '10', '12', '10');
// apiHandle.fetchData('0', '0', '0', '10');
// apiHandle.getNextWholeRank('01 hours 59 minutes');
// apiHandle.getNextSeasonRank('2023', '10', '12', '2 hours 1 minutes');

main();
