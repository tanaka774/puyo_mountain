import Phaser from 'phaser';

let game: Phaser.Game | null = null;
let clock: Phaser.Time.Clock | null = null;

export function initializePhaserForFramerateControl(targetFPS: number): void {
  if (game) {
    console.warn('Phaser framerate control already initialized.');
    return;
  }

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.HEADLESS, // We don't need a renderer
    width: 1,             // Minimal width
    height: 1,            // Minimal height
    fps: {
      target: targetFPS,
      forceSetTimeOut: true // More precise timing
    },
    // autoStart: true,       // Start the game loop immediately
    scene: {
      create: function (this: Phaser.Scene) {
        clock = this.time; // Get access to the Phaser Clock
      },
      update: function (this: Phaser.Scene, time: number, delta: number) {
        // This update loop will now be governed by Phaser's FPS settings.
        // You likely won't do much *Phaser* related stuff here.
      }
    }
  };

  game = new Phaser.Game(config);
}

export function requestPhaserAnimationFrame(callback: FrameRequestCallback, callbackScope): void {
  if (clock) {
    clock.addEvent({
      delay: 0,
      repeat: 0,
      callback: callback,
      callbackScope: callbackScope // Or your desired scope
    });
  } else {
    requestAnimationFrame(callback); // Fallback if Phaser isn't initialized
    console.warn('Phaser clock not initialized, using requestAnimationFrame.');
  }
}

export function destroyPhaserFramerateControl(): void {
  if (game) {
    game.destroy(true);
    game = null;
    clock = null;
  }
}
