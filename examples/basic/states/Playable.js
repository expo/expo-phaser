import React from 'react';

import Assets from '../Assets';
import uri from '../utils/uri';

export default class Playable {
  constructor({ game, context }) {
    this.game = game;
    this.context = context;
  }

  preload = () => {
    const atlas = uri(Assets.files['man.json']);
    const texture = uri(Assets.files['man.png']);
    this.game.load.atlasJSONHash('man', texture, atlas);
  };

  create = () => {
    const { game } = this;
    game.stage.backgroundColor = '#4488AA';

    game.physics.startSystem(Phaser.Physics.ARCADE);

    //  Set the world (global) gravity
    game.physics.arcade.gravity.y = 100;

    const man = game.add.sprite(200, 200, 'man');
    game.physics.enable([man], Phaser.Physics.ARCADE);

    //  Here we add a new animation called 'run'
    //  We haven't specified any frames because it's using every frame in the texture atlas

    man.animations.add('run');
    man.body.collideWorldBounds = true;
    man.body.bounce.y = 0.8;
    man.body.gravity.y = 200;

    //  And this starts the animation playing by using its key ("run")
    //  15 is the frame rate (15fps)
    //  true means it will loop when it finishes
    man.animations.play('run', 15, true);
  };

  update = () => {};
}
