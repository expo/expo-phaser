import { ScreenOrientation } from 'expo';
import ExpoPhaser from 'expo-phaser';

import Playable from './states/Playable';

export default class Game {
  constructor({ context }) {
    ScreenOrientation.allowAsync(ScreenOrientation.Orientation.PORTRAIT);

    const game = ExpoPhaser.game({ context });
    this.playable = new Playable({ game, context });

    game.state.add('Playable', this.playable);
    game.state.start('Playable');

    this.onTouchesBegan = this.onTouchesBegan.bind(this);
    this.onTouchesEnded = this.onTouchesEnded.bind(this);
  }

  updateControls(velocity) {
    if (this.playable) {
      this.playable.updateControls({ velocity });
    }
  }

  onTouchesBegan() {
    if (!this.playable) {
      return false;
    }

    return this.playable.onTouchesBegan();
  }

  onTouchesEnded() {
    if (!this.playable) {
      return false;
    }

    return this.playable.onTouchesEnded();
  }
}
