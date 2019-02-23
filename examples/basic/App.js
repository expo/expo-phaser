import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppLoading, Constants, ScreenOrientation } from 'expo';

import { func, images } from './utils/library';

import Controls from './Controls';

ScreenOrientation.allowAsync(ScreenOrientation.Orientation.PORTRAIT);

export default class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      gamePause: false,
      isLoading: true,
      kills: 0,
      score: 0,
      shotsFired: 0
    };

    this.preloadAssetsAsync = this.preloadAssetsAsync.bind(this);
    this.updateStats = this.updateStats.bind(this);
    this.handleTogglePause = this.handleTogglePause.bind(this);
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

  handleTogglePause() {
    this.setState(prevState => ({
      gamePause: !prevState.gamePause
    }));
  }

  render() {
    const { gamePause, isLoading, kills, score, shotsFired } = this.state;

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
        <Controls gamePause={gamePause} updateStats={this.updateStats} />

        <View style={styles.container}>
          <Text style={styles.text}>{`Score: ${score}`}</Text>
          <Text style={styles.text}>{`Kills: ${kills}`}</Text>
          <Text style={styles.text}>{`Shots Fired: ${shotsFired}`}</Text>
          {displayAccuracy && (
            <Text style={styles.text}>{displayAccuracy}</Text>
          )}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={this.handleTogglePause}
            style={styles.footerButton}
          >
            <Text style={styles.footerText}>
              {gamePause ? 'Play' : 'Pause'}
            </Text>
          </TouchableOpacity>
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
  },
  footer: {
    alignItems: 'center',
    bottom: 32,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    position: 'absolute',
    width: '100%'
  },
  footerButton: {
    backgroundColor: '#323031',
    borderRadius: 4,
    marginHorizontal: 16,
    padding: 16,
    width: 76
  },
  footerText: {
    color: '#fff',
    textAlign: 'center'
  }
});
