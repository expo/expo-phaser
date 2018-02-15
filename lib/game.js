import Phaser from './Phaser';
function game({
  context,
  width,
  height,
  title,
  renderer,
  preventLoop,
  onRender,
}): Phaser.Game {
  global.__context = context;
  global.document.readyState = 'complete';
  const game = new Phaser.Game(
    width || context.drawingBufferWidth,
    height || context.drawingBufferHeight,
    renderer || Phaser.WEBGL,
    title || 'expo-phaser-game',
  );
  game.context = context;

  const render = () => {
    requestAnimationFrame(render);
    onRender && onRender();
    context.endFrameEXP();
  };
  if (!preventLoop) {
    render();
  }

  return game;
}
export default game;
