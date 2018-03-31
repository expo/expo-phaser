import ExpoPhaser from 'expo-phaser';
import React from 'react';

import Playable from './states/Playable';

export default class Game {
  constructor({ context }) {
    const game = ExpoPhaser.game({ context });
    const playable = new Playable({ game, context });
    game.state.add('Playable', playable);
    game.state.start('Playable');
  }
}
