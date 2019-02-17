import React from 'react';
import { View } from 'react-native';
import { AppLoading, Asset, ScreenOrientation } from 'expo';

import { func, images } from './utils/library';

import Controls from './Controls';

export default class App extends React.Component {
  state = {
    isLoading: true
  };

  async preloadAssetsAsync() {
    const imageAssets = func.cacheImages(images.files);

    await Promise.all([...imageAssets]).then(() => {
      this.setState({ isLoading: false });
    });
  }

  componentWillMount() {
    ScreenOrientation.allowAsync(ScreenOrientation.Orientation.PORTRAIT);
    this.preloadAssetsAsync();
  }

  render() {
    const { isLoading } = this.state;

    return isLoading ? <View /> : <Controls />;
  }
}
