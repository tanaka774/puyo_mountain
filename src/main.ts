import { gameConfig } from "./config.ts"
import { recordPuyoSteps } from "./record.ts"
import { gameState } from "./state.ts"
import { baseSinglePuyo } from "./types.ts"
import { Chain } from "./chain.ts"
import { Menu } from "./menu.js"
import { Move } from "./move.ts"
import { Split } from "./split.ts"
import { Game } from "./game.ts"
import { Input } from "./input.ts"
import { DrawWithCanvas } from "./draw.ts"
import { Bounce } from "./bounce.ts"
import { Board } from "./board.ts"
import { Current } from "./current.ts"
import { Rotate } from "./rotate.ts"
import { Difficulty, Mountain } from "./mountain"
import { HtmlHandle } from "./htmlHandle"

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
    split, chain, mountain, 'tetrisCanvas', 'nextPuyoCanvas');
  const htmlHandle = new HtmlHandle(chain, mountain);
  const game = new Game(menu, bounce, board, current, move, rotate,
    split, chain, input, draw, mountain, htmlHandle);

  setCallback();

  // this is official
  gameState.setState(gameState.OPENING);
  game.gameLoop();

  // // for debug
  // const mountain = new Mountain(board, move, chain, 12, Difficulty.EASY);
  // for (let n = 0; n < 10000; n++) {
  //   console.log(n);
  //   mountain.decideVariablilty();
  //   mountain.generateSeedPuyos();
  //   mountain.changeExcessPuyo();
  //   mountain.setFloatingSeedPuyos();
  //   mountain.initVariability();
  //   mountain.initSeedPuyos();
  //   mountain.initVirtualboard();
  //   mountain.initFloatingSeedPuyos();
  // }
  //
  function setCallback() {
    move.setCallback(
      () => gameState.setState(gameState.SPLITTING),
    );

    menu.setCallback(
      () => gameState.setState(gameState.UNINIT),
      () => gameState.setState(gameState.GENE_SEED_PUYOS),
    );
  }
}

main();
