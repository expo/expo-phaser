import React from 'react';
import { AppLoading, ScreenOrientation } from 'expo';

import { func, images } from './utils/library';

import Controls from './Controls';

ScreenOrientation.allowAsync(ScreenOrientation.Orientation.PORTRAIT);

export default class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      isLoading: true
    };

    this.preloadAssetsAsync = this.preloadAssetsAsync.bind(this);
  }

  async preloadAssetsAsync() {
    const imageAssets = func.cacheImages(images.files);

    await Promise.all([...imageAssets]).then(() => {
      this.setState({ isLoading: false });
    });
  }

  render() {
    const { isLoading } = this.state;

    if (isLoading) {
      return (
        <AppLoading
          onFinish={() => this.setState({ isLoading: false })}
          startAsync={this.preloadAssetsAsync}
        />
      );
    }

    return <Controls />;
  }
}
