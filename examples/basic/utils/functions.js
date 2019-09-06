import { Image } from 'react-native';
import { Font } from 'expo';
import { Asset } from 'expo-asset';

const cacheFonts = fonts => fonts.map(font => Font.loadAsync(font));

const cacheImages = images => {
  return Object.values(images).map(image => {
    if (typeof image === 'string') {
      return Image.prefetch(image);
    }

    return Asset.fromModule(image).downloadAsync();
  });
};

const uri = (resource, debugTag) => {
  const asset = Asset.fromModule(resource);
  if (!asset.localUri) {
    console.error(
      'Provided resource is not downloaded. Please download this resource before attempting to load.',
      debugTag
    );
    return false;
  }

  return asset.localUri;
};

export default {
  cacheFonts,
  cacheImages,
  uri
};
