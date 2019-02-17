import React from 'react';
import { View } from 'react-native';
import { AppLoading, Asset, ScreenOrientation } from 'expo';

import Assets from './Assets';
import Controls from './Controls';

export default class App extends React.Component {
  state = {
    isLoading: true,
  };

  get files() {
    const imagesArray = Object.values(Assets.files);

    return imagesArray.map(image => {
      if (typeof image === 'string') {
        return Image.prefetch(image);
      }

      return Asset.fromModule(image).downloadAsync();
    });
  }

  async preloadAssetsAsync() {
    const imageAssets = this.files;

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
