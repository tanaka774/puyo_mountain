import { gameConfig } from "./config.ts"
import { recordPuyoSteps } from "./record.ts"
import { gameState } from "./state.ts"
import { baseSinglePuyo } from "./puyo.ts"
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

function main() {
  const menu = new Menu();
  const bounce = new Bounce();
  const board = new Board(bounce);
  const current = new Current(board);
  const split = new Split(board);
  const chain = new Chain(board);
  const move = new Move(current, split);
  const rotate = new Rotate(current, move);
  const input = new Input(board, current, move, rotate);
  const draw = new DrawWithCanvas(bounce, board, current, move, rotate, split, chain, 'tetrisCanvas', 'nextPuyoCanvas');
  const game = new Game(menu, bounce, board, current, move, rotate, split, chain, input, draw);

  setCallback();

  gameState.setState(gameState.OPENING);
  game.gameLoop();

  function setCallback() {
    move.setCallback(
      () => gameState.setState(gameState.SPLITTING),
    )
    menu.setSetNextState(() => gameState.setState(gameState.UNINIT));
  }
}

main();
