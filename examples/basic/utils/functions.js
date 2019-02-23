import { Image } from 'react-native';
import { Asset, Font } from 'expo';

const cacheFonts = fonts => {
  const mappedFonts = fonts.map(font => Font.loadAsync(font));

  return mappedFonts;
};

const cacheImages = images => {
  const imagesArray = Object.values(images);

  return imagesArray.map(image => {
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
