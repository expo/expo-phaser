import { Dimensions, PixelRatio } from 'react-native';
import EventEmitter from 'EventEmitter';
const { width, height } = Dimensions.get('window');
/*
 Window Resize Stub
*/
window.emitter = window.emitter || new EventEmitter();
window.addEventListener = (eventName, listener) =>
  window.emitter.addListener(eventName, listener);
window.removeEventListener = (eventName, listener) =>
  window.emitter.removeListener(eventName, listener);

window.devicePixelRatio = PixelRatio.get();
window.innerWidth = window.clientWidth = width;
window.innerHeight = window.clientHeight = height;

window.screen = window.screen || {};
window.screen.orientation = 0;
Dimensions.addEventListener(
  'change',
  ({ screen: { width, height, scale } }) => {
    window.devicePixelRatio = scale;
    window.innerWidth = window.clientWidth = width;
    window.innerHeight = window.clientHeight = height;
    window.emitter.emit('resize');
    window.screen.orientation = width < height ? 0 : 90;
  },
);
