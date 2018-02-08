import { Image, Dimensions } from 'react-native';
import EventEmitter from 'EventEmitter';
import Expo2DContext from '../Context2D';
const { width, height } = Dimensions.get('window');
import Expo from 'expo';
class DOMNode {
  style = {};
  emitter = new EventEmitter();
  localUri = (global.__localAsset || {}).localUri; //Expo.FileSystem.documentDirectory; //new Uint8Array([255, 0, 0, 255]); //
  constructor(nodeName) {
    this.nodeName = nodeName;
  }
  get ownerDocument() {
    return window.document;
  }
  appendChild() {}
  insertBefore() {}
  removeChild() {}
  getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    right: width,
    bottom: height,
    x: 0,
    y: 0,
    width,
    height,
  });

  // get compressionAlgorithm() {
  //   return true; //this.nodeName !== 'CANVAS';
  // }
}

class DOMElement extends DOMNode {
  constructor(tagName) {
    return super(tagName.toUpperCase());
  }
  getContext(type) {
    const stub = () => ({ data: [0, 0, 0] });

    if (type != '2d' && global.__context) {
      return global.__context;
    }
    if (type === '2d' && global.__context) {
      return new Expo2DContext(global.__context);
    }
    return {
      fillText: (text, x, y, maxWidth) => ({}),
      measureText: text => ({ width: text.split('').length * 6, height: 24 }),
      fillRect: stub,
      drawImage: stub,
      getImageData: stub,
      putImageData: stub,
      createImageData: stub,
      getContextAttributes: () => ({
        stencil: true,
      }),
      getExtension: () => ({
        loseContext: stub,
      }),
    };
  }
  addEventListener = (event, handler) =>
    this.emitter.on && this.emitter.on(event, handler);
  removeEventListener = (event, handler) => {
    this.emitter.off && this.emitter.off(event, handler);
  };

  get ontouchstart() {
    return {};
  }
}
global.__i = 0;
class DOMDocument extends DOMElement {
  body = new DOMElement('BODY');

  documentElement = new DOMElement('SOMETHING');

  constructor() {
    super('#document');
  }

  createElement(tagName) {
    return new DOMElement(tagName);
  }

  createElementNS(tagName) {
    const canvas = this.createElement(tagName);
    canvas.toDataURL = () => ({});
    return canvas;
  }

  getElementById() {
    return new DOMElement('div');
  }
}

window.addEventListener = window.addEventListener || (() => {});
window.removeEventListener = window.removeEventListener || (() => {});

window.document = new DOMDocument();
// window.focus = true;
global.userAgent = global.navigator.userAgent = 'iPhone'; // <- This could be made better, but I'm not sure if it'll matter for PIXI
global.navigator.appVersion = 'OS10';
global.navigator.maxTouchPoints = 5;
global.navigator.standalone = true;
///https://www.w3schools.com/js/js_window_location.asp
window.location = window.location || {
  href: '', //  window.location.href returns the href (URL) of the current page
  hostname: '', //window.location.hostname returns the domain name of the web host
  pathname: '', //window.location.pathname returns the path and filename of the current page
  protocol: 'https', //window.location.protocol returns the web protocol used (http: or https:)
  assign: null, //window.location.assign loads a new document
};

export class HTMLImageElement extends DOMElement {
  get src() {
    return this.localUri;
  }

  set src(value) {
    this.localUri = value;
    this._load();
  }

  _onload = () => {};

  get onload() {
    return this._onload;
  }
  set onload(value) {
    this._onload = value;
  }

  get complete() {
    return this._complete;
  }
  set complete(value) {
    this._complete = value;
    if (value) {
      this.emitter.emit('load', this);
      this.onload();
    }
  }

  constructor(props) {
    super('img');
    if (props) {
      const { localUri, width, height } = props || {};
      this.src = localUri;
      this.width = width;
      this.height = height;
      this._load();
    }
  }

  _load = () => {
    if (this.src) {
      if (!this.width || !this.height) {
        this.complete = false;
        this.emitter.emit('loading', this);
        Image.getSize(
          this.src,
          (width, height) => {
            this.width = width;
            this.height = height;
            this.complete = true;
          },
          error => {
            this.emitter.emit('error', { target: this });
          },
        );
      } else {
        this.complete = true;
      }
    }
  };
}
global.HTMLImageElement = global.Image = HTMLImageElement;

export class HTMLCanvasElement extends DOMElement {}

global.HTMLCanvasElement = HTMLCanvasElement;

export class HTMLVideoElement extends DOMElement {}

global.HTMLVideoElement = HTMLVideoElement;
