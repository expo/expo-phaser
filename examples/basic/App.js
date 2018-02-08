import React from 'react';
import Expo from 'expo';
import ExpoPhaser from 'expo-phaser';

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

    return (
      <Expo.GLView
        style={{ flex: 1 }}
        onContextCreate={async context => {
          // const app = ExpoPixi.application({ context });
          const game = ExpoPhaser.game({ context });
          // const sprite = await ExpoPixi.spriteAsync('http://i.imgur.com/uwrbErh.png');
          // app.stage.addChild(sprite);

          game.state.add('Playable', {
            preload: function() {
              game.load.image('man', Expo.Asset.fromModule(Assets['man.json']).localUri);

            },
            create: function() {

            },
            update: function() {

            }
          });

          game.state.start('Playable');
        }}
      />
    );
  }
}