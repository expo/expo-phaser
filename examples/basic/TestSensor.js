import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Accelerometer } from 'expo';

const scale = 50;
const axis = 'x';

export default class TestSensor extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      [axis]: 0
    };
  }

  componentDidMount() {
    this.subscribe();
  }

  componentWillUnmount() {
    this.unsubscribe();
  }

  subscribe() {
    Accelerometer.setUpdateInterval(16);

    this.subscription = Accelerometer.addListener(data =>
      this.setState({ [axis]: data[axis] })
    );
  }

  unsubscribe() {
    this.subscription && this.subscription.remove();
    this.subscription = null;
  }

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
