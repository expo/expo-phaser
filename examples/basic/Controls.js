import React from 'react';
import { Accelerometer, GLView } from 'expo';
import PropTypes from 'prop-types';
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

  shouldComponentUpdate() {
    return false;
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
    const { updateStats } = this.props;

    this.game = new Game({ context, updateStats });
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
        style={{ flex: 1 }}
        onTouchesBegan={this.onTouchesBegan}
        onTouchesCancelled={this.onTouchesEnded}
        onTouchesEnded={this.onTouchesEnded}
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
  updateStats: PropTypes.func.isRequired
};
