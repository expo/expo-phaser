import Expo from 'expo';
import ExpoPhaser from 'expo-phaser';
import React from 'react';

import Assets from './Assets';

export default class App extends React.Component {
  state = { loading: true };
  async componentWillMount() {
    const downloads = [];
    for (let key of Object.keys(Assets)) {
      const asset = Expo.Asset.fromModule(Assets[key]);
      downloads.push(asset.downloadAsync());
    }
    await Promise.all(downloads);
    this.setState({ loading: false });
  }
  render() {
    if (this.state.loading) {
      return <Expo.AppLoading />;
    }

    return <Expo.GLView style={{ flex: 1 }} onContextCreate={context => startGame({ context })} />;
  }
}

function startGame({ context }) {
  const game = ExpoPhaser.game({ context });

  game.state.add('Playable', {
    preload: function() {
      const atlas = Expo.Asset.fromModule(Assets['man.json']).localUri;
      const texture = Expo.Asset.fromModule(Assets['man.png']).localUri;
      game.load.atlasJSONHash('man', texture, atlas);
    },
    create: function() {
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
    },
    update: function() {},
  });

  game.state.start('Playable');
}
