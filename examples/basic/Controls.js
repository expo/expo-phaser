import React from 'react';
import { Accelerometer, GLView } from 'expo';
import { MultiTouchView } from 'expo-multi-touch';

import Game from './Game';

export default class Controls extends React.Component {
  componentDidMount() {
    this._subscribe();
  }

  componentWillUnmount() {
    this._unsubscribe();
  }

  _subscribe = () => {
    Accelerometer.setUpdateInterval(16);
    this._subscription = Accelerometer.addListener(
      ({ x }) => this.game && this.game.updateControls(x)
    );
  };

  _unsubscribe = () => {
    Accelerometer.removeAllListeners();
    this._subscription && this._subscription.remove();
    this._subscription = null;
  };

  shouldComponentUpdate = () => false;

  onTouchesBegan = () => this.game && this.game.onTouchesBegan();
  onTouchesEnded = () => this.game && this.game.onTouchesEnded();
  render() {
    return (
      <MultiTouchView
        style={{ flex: 1 }}
        onTouchesBegan={this.onTouchesBegan}
        onTouchesEnded={this.onTouchesEnded}
        onTouchesCancelled={this.onTouchesEnded}
      >
        <GLView
          style={{ flex: 1 }}
          onContextCreate={context => (this.game = new Game({ context }))}
        />
      </MultiTouchView>
    );
  }
}
