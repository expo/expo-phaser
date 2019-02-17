import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Expo from 'expo';

const scale = 50;
const axis = 'x';
export default class TestSensor extends React.Component {
  state = {};

  componentDidMount() {
    this._subscribe();
  }
  componentWillUnmount() {
    this._unsubscribe();
  }

  _subscribe = () => {
    Expo.Accelerometer.setUpdateInterval(16);
    this._subscription = Expo.Accelerometer.addListener(data =>
      this.setState({ [axis]: data[axis] })
    );
  };

  _unsubscribe = () => {
    this._subscription && this._subscription.remove();
    this._subscription = null;
  };

  render() {
    const data = this.state[axis];
    const adjusted = Math.round(data * scale);
    return (
      <View style={styles.container}>
        <Text>{`${axis}: ${adjusted}`}</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#fff',
    flex: 1,
    justifyContent: 'center'
  }
});
