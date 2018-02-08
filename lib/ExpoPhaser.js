// @flow
import './Phaser';
import { PixelRatio } from 'react-native';

/*
    A helper function to create a `PIXI.Application` from a WebGL context.
    EXGL knows to end a frame when the function: `endFrameEXP` is called on the GL context.

    `context` is the only required prop.
*/
export function game({ context }): Phaser.Game {
  global.__context = context;
  global.document.readyState = 'complete';
  const game = new Phaser.Game(
    context.drawingBufferWidth,
    context.drawingBufferHeight,
    Phaser.WEBGL,
    'phaser-example',
  );
  game.context = context;

  const render = () => {
    requestAnimationFrame(render);
    context.endFrameEXP();
  };
  render();
  return game;
}
