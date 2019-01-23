import { ScreenOrientation } from 'expo';
import ExpoPhaser from 'expo-phaser';
import React from 'react';

import Playable from './states/Playable';

export default class Game {
  constructor({ context }) {
    ScreenOrientation.allowAsync(ScreenOrientation.Orientation.PORTRAIT);

    const game = ExpoPhaser.game({ context });
    this.playable = new Playable({ game, context });
    game.state.add('Playable', this.playable);
    game.state.start('Playable');
  }

  updateControls = velocity => {
    if (this.playable) {
      this.playable.updateControls({ velocity });
    }
  };
  onTouchesBegan = () => this.playable && this.playable.onTouchesBegan();
  onTouchesEnded = () => this.playable && this.playable.onTouchesEnded();
}
