import { Asset } from 'expo';

export default (resource, debugTag) => {
  let asset = Asset.fromModule(resource);
  if (!asset.localUri) {
    console.error(
      'Provided resource is not downloaded. Please download this resource before attempting to load.',
      debugTag
    );
  } else {
    return asset.localUri;
  }
};
