import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppLoading, Constants, ScreenOrientation } from 'expo';

import { func, images } from './utils/library';

import Controls from './Controls';

ScreenOrientation.allowAsync(ScreenOrientation.Orientation.PORTRAIT);

export default class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      isLoading: true,
      kills: 0,
      score: 0,
      shotsFired: 0
    };

    this.preloadAssetsAsync = this.preloadAssetsAsync.bind(this);
    this.updateStats = this.updateStats.bind(this);
  }

  async preloadAssetsAsync() {
    const imageAssets = func.cacheImages(images.files);

    await Promise.all([...imageAssets]).then(() => {
      this.setState({ isLoading: false });
    });
  }

  updateStats(data) {
    this.setState({
      kills: data.kills,
      score: data.score,
      shotsFired: data.shotsFired
    });
  }

  render() {
    const { isLoading, kills, score, shotsFired } = this.state;

    if (isLoading) {
      return (
        <AppLoading
          onFinish={() => this.setState({ isLoading: false })}
          startAsync={this.preloadAssetsAsync}
        />
      );
    }

    const accuracy = ((kills / shotsFired) * 100).toFixed(2);
    const displayAccuracy = shotsFired > 0 ? `Accuracy: ${accuracy}%` : null;

    return (
      <React.Fragment>
        <Controls updateStats={this.updateStats} />

        <View style={styles.container}>
          <Text style={styles.text}>{`Score: ${score}`}</Text>
          <Text style={styles.text}>{`Kills: ${kills}`}</Text>
          <Text style={styles.text}>{`Shots Fired: ${shotsFired}`}</Text>
          {displayAccuracy && (
            <Text style={styles.text}>{displayAccuracy}</Text>
          )}
        </View>
      </React.Fragment>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    left: 16,
    position: 'absolute',
    top: Constants.statusBarHeight,
    width: '100%'
  },
  text: {
    color: '#fff'
  }
});
