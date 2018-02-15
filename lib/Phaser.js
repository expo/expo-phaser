import '@expo/browser-polyfill';

function initPhaser() {
  window.PIXI = window.PIXI || require('phaser-ce/build/custom/pixi');
  window.p2 = window.p2 || require('phaser-ce/build/custom/p2');
  window.Phaser =
    window.Phaser || require('phaser-ce/build/phaser');

  window.PIXI.WebGLRenderer.prototype.updateTexture = function(texture) {
    if (!texture.hasLoaded || texture.source.nodeName === 'CANVAS') {
      return false;
    }
    if (texture.source.compressionAlgorithm) {
      return this.updateCompressedTexture(texture);
    }

    var gl = this.gl;

    if (!texture._glTextures[gl.id]) {
      texture._glTextures[gl.id] = gl.createTexture();
    }
    gl.activeTexture(gl.TEXTURE0 + texture.textureIndex);

    gl.bindTexture(gl.TEXTURE_2D, texture._glTextures[gl.id]);

    gl.pixelStorei(
      gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,
      texture.premultipliedAlpha,
    );

    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      texture.source,
    );

    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MAG_FILTER,
      texture.scaleMode === PIXI.scaleModes.LINEAR ? gl.LINEAR : gl.NEAREST,
    );

    if (
      texture.mipmap &&
      Phaser.Math.isPowerOfTwo(texture.width, texture.height)
    ) {
      gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MIN_FILTER,
        texture.scaleMode === PIXI.scaleModes.LINEAR
          ? gl.LINEAR_MIPMAP_LINEAR
          : gl.NEAREST_MIPMAP_NEAREST,
      );
      gl.generateMipmap(gl.TEXTURE_2D);
    } else {
      gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MIN_FILTER,
        texture.scaleMode === PIXI.scaleModes.LINEAR ? gl.LINEAR : gl.NEAREST,
      );
    }

    if (!texture._powerOf2) {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    }

    texture._dirty[gl.id] = false;

    // return texture._glTextures[gl.id];
    return true;
  };
  return window.Phaser;
}
export default initPhaser();
