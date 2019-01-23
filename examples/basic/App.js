import { ScreenOrientation } from 'expo';
import AssetUtils from 'expo-asset-utils';
import React from 'react';
import { View } from 'react-native';
import Assets from './Assets';
import Controls from './Controls';

export default class App extends React.Component {
  state = {
    loading: true,
  };

  get fonts() {
    let items = {};
    const keys = Object.keys(Assets.fonts || {});
    for (let key of keys) {
      const item = Assets.fonts[key];
      const name = key.substr(0, key.lastIndexOf('.'));
      items[name] = item;
    }
    return [items];
  }

  get files() {
    return [...AssetUtils.arrayFromObject(Assets.files || {})];
  }

  get audio() {
    return AssetUtils.arrayFromObject(Assets.audio);
  }

  async preloadAssets() {
    await AssetUtils.cacheAssetsAsync({
      // fonts: this.fonts,
      files: this.files,
      // audio: this.audio,
    });
    this.setState({ loading: false });
  }

  componentWillMount() {
    ScreenOrientation.allowAsync(ScreenOrientation.Orientation.PORTRAIT);
    this.preloadAssets();
  }

  get loading() {
    return <View />;
  }

  get screen() {
    return <Controls />;
  }

  render() {
    return this.state.loading ? this.loading : this.screen;
  }
}
