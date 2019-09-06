import React from 'react';
import PropTypes from 'prop-types';
import { GLView } from 'expo-gl';
import { Accelerometer } from 'expo-sensors';
import { MultiTouchView } from 'expo-multi-touch';

import Game from './Game';

export default class Controls extends React.Component {
  constructor(props) {
    super(props);

    this.onTouchesBegan = this.onTouchesBegan.bind(this);
    this.onTouchesEnded = this.onTouchesEnded.bind(this);
  }

  componentDidMount() {
    this.subscribe();
  }

  // shouldComponentUpdate() {
  //   return false;
  // }

  componentDidUpdate(prevProps) {
    const { gamePause } = this.props;

    if (prevProps.gamePause !== gamePause) {
      this.game.onTogglePause(gamePause);
    }
  }

  componentWillUnmount() {
    this.unsubscribe();
  }

  onTouchesBegan() {
    if (!this.game) {
      return false;
    }

    return this.game.onTouchesBegan();
  }

  onTouchesEnded() {
    if (!this.game) {
      return false;
    }

    return this.game.onTouchesEnded();
  }

  setupGame(context) {
    const { gamePause, updateStats } = this.props;

    this.game = new Game({ context, gamePause, updateStats });
  }

  subscribe() {
    Accelerometer.setUpdateInterval(16);

    this.subscription = Accelerometer.addListener(
      ({ x }) => this.game && this.game.updateControls(x)
    );
  }

  unsubscribe() {
    Accelerometer.removeAllListeners();

    if (this.subscription) {
      this.subscription.remove();
    }
    this.subscription = null;
  }

  render() {
    return (
      <MultiTouchView
        onTouchesBegan={this.onTouchesBegan}
        onTouchesCancelled={this.onTouchesEnded}
        onTouchesEnded={this.onTouchesEnded}
        style={{ flex: 1 }}
      >
        <GLView
          onContextCreate={context => this.setupGame(context)}
          style={{ backgroundColor: '#000', flex: 1 }}
        />
      </MultiTouchView>
    );
  }
}

Controls.propTypes = {
  // required
  gamePause: PropTypes.bool.isRequired,
  updateStats: PropTypes.func.isRequired
};
