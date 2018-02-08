import Expo from 'expo';
import React from 'react';
import * as glm from 'gl-matrix';

var parseColor = require('color-parser');
var stringFormat = require('string-format');

var earcut = require('earcut');
var bezierCubicPoints = require('adaptive-bezier-curve');
var bezierQuadraticPoints = require('adaptive-quadratic-curve');

var extrudePolyline = require('extrude-polyline');

const flatShaderTxt = {
  vert: `
        attribute vec2 aVertexPosition;
        uniform bool uSkipMVTransform;
        uniform mat4 uMVMatrix;
        uniform mat4 uPMatrix;
        void main(void) {
            if (uSkipMVTransform) {
                gl_Position = uPMatrix * vec4(aVertexPosition, 0.0, 1.0);
            } else {
                gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 0.0, 1.0);
            }
        }
    `,
  frag: `
        precision mediump float;
        uniform vec4 uColor;
        uniform float uGlobalAlpha;
        void main(void) {
            gl_FragColor = uColor * vec4(1, 1, 1, uGlobalAlpha);
        }
    `,
};

const linearGradShaderTxt = {
  vert: `
        precision mediump float;
        attribute vec2 aVertexPosition;
        varying vec2 vP2;
        uniform bool uSkipMVTransform;
        uniform mat4 uMVMatrix;
        uniform mat4 uPMatrix;
        uniform mat4 uiMVMatrix;
        void main(void) {
            if (uSkipMVTransform) {
                gl_Position = uPMatrix * vec4(aVertexPosition, 0.0, 1.0);
                vP2 = (uiMVMatrix * vec4(aVertexPosition, 0.0, 1.0)).xy;
            } else {
                gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 0.0, 1.0);
                vP2 = aVertexPosition.xy;
            }
        }
    `,
  frag: `
        precision mediump float;
        const int MAX_STOPS = {maxGradStops};
        uniform vec2 p0;
        uniform vec2 p1;
        varying vec2 vP2;
        uniform vec4 colors[MAX_STOPS];
        uniform float offsets[MAX_STOPS];
        uniform float uGlobalAlpha;
        void main() {
            // Project coordinate onto gradient spectrum
            vec2 p1p0 = p1 - p0;
            vec2 p2p0 = vP2 - p0;
            float t = dot(p2p0, p1p0) / dot(p1p0, p1p0);
            t = clamp(t, 0.0, 1.0);
            // Map to color
            gl_FragColor = colors[0];
            for(int i = 0; i < MAX_STOPS; i ++) {
                if (offsets[i+1] == -1.0) {
                    gl_FragColor = colors[i];
                    break;
                }
                if (t >= offsets[i] && t < offsets[i+1] ) {
                    float stopOffset = t-offsets[i];
                    stopOffset /= offsets[i+1] - offsets[i];
                    gl_FragColor = mix(colors[i], colors[i+1], stopOffset);
                    break;
                }
            }
            gl_FragColor *= vec4(1, 1, 1, uGlobalAlpha);
        }
    `,
};

const radialGradShaderTxt = {
  vert: `
        precision mediump float;
        attribute vec2 aVertexPosition;
        varying vec2 vP2;
        uniform bool uSkipMVTransform;
        uniform mat4 uMVMatrix;
        uniform mat4 uPMatrix;
        uniform mat4 uiMVMatrix;
        void main(void) {
            if (uSkipMVTransform) {
                gl_Position = uPMatrix * vec4(aVertexPosition, 0.0, 1.0);
                vP2 = (uiMVMatrix * vec4(aVertexPosition, 0.0, 1.0)).xy;
            } else {
                gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 0.0, 1.0);
                vP2 = aVertexPosition.xy;
            }
        }
    `,
  frag: `
        precision mediump float;
        const int MAX_STOPS = {maxGradStops};
        uniform vec2 p0;
        uniform float r0;
        uniform vec2 p1;
        uniform float r1;
        varying vec2 vP2;
        uniform vec4 colors[MAX_STOPS];
        uniform float offsets[MAX_STOPS];
        uniform float uGlobalAlpha;
        void main() {
            // Project coordinate onto gradient spectrum
            // TODO: deal with edge cases where r0 > r1, inner circle
            // lies outside of outter circle, etc
            float t;
            if (distance(vP2, p0) < r0) {
                t = 0.0;
            } else if (distance(vP2, p1) > r1) {
                t = 1.0;
            } else {
                vec2 p2p0 = vP2 - p0;
                float c0theta = atan(p2p0.y, p2p0.x);
                vec2 radialP0 = vec2(r0*cos(c0theta), r0*sin(c0theta)) + p0;
                //vec2 radialP1 = vec2(r1*cos(c0theta), r1*sin(c0theta)) + p0;
                vec2 e = normalize(radialP0 - vP2);
                vec2 h = p1 - radialP0;
                float lf = dot(e,h);
                float s = r1*r1-dot(h,h)+lf*lf;
                // TODO: if s < 0, no intersection pts, what to do?
                s = sqrt(s);
                vec2 radialP1;
                if (lf < s) {
                    if (lf + s >= 0.0) {
                        s = -s;
                        // TODO: tangent pt. wtf.
                    }
                    // TODO: else no intersection? wtf?
                } else {
                    radialP1 = e*(lf-s) + radialP0;
                }
                vec2 rp1p0 = radialP1 - radialP0;
                vec2 rp2p0 = vP2 - radialP0;
                t = dot(rp2p0, rp1p0) / dot(rp1p0, rp1p0);
            }
            t = clamp(t, 0.0, 1.0);
            // Map to color
            gl_FragColor = colors[0];
            for(int i = 0; i < MAX_STOPS; i ++) {
                if (offsets[i+1] == -1.0) {
                    gl_FragColor = colors[i];
                    break;
                }
                if (t >= offsets[i] && t < offsets[i+1] ) {
                    float stopOffset = t-offsets[i];
                    stopOffset /= offsets[i+1] - offsets[i];
                    gl_FragColor = mix(colors[i], colors[i+1], stopOffset);
                    break;
                }
            }
            gl_FragColor *= vec4(1, 1, 1, uGlobalAlpha);
        }
    `,
};

const patternShaderRepeatValues = {
  'no-repeat': 0,
  'repeat-x': 1,
  'repeat-y': 2,
  repeat: 3,
  'src-rect': 4, // Only used for drawImage()
};

const patternShaderTxt = {
  vert: stringFormat(
    `
        precision mediump float;
        precision lowp int;
        attribute vec2 aVertexPosition;
        attribute vec2 aTexCoord;
        uniform bool uSkipMVTransform;
        uniform mat4 uMVMatrix;
        uniform mat4 uPMatrix;
        uniform int uRepeatMode;
        uniform vec2 uTextureSize;
        varying vec2 vTexCoord;
        uniform mat4 uiMVMatrix;
        void main(void) {
            if (uSkipMVTransform) {
                gl_Position = uPMatrix * vec4(aVertexPosition, 0.0, 1.0);
                vTexCoord = (uiMVMatrix * vec4(aVertexPosition, 0.0, 1.0)).xy / uTextureSize;
            } else {
                gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 0.0, 1.0);
                vTexCoord = aVertexPosition / uTextureSize;
            }
            if (uRepeatMode == {src-rect}) {
                vTexCoord = aTexCoord;
            }
        }
    `,
    patternShaderRepeatValues,
  ),
  frag: stringFormat(
    `
        precision mediump float;
        precision lowp int;
        uniform int uRepeatMode;
        uniform sampler2D uTexture;
        varying vec2 vTexCoord;
        uniform float uGlobalAlpha;
        void main(void) {
            if ((uRepeatMode == {no-repeat} || uRepeatMode == {src-rect}) && (
                vTexCoord.x < 0.0 || vTexCoord.x > 1.0 ||
                vTexCoord.y < 0.0 || vTexCoord.y > 1.0))
            {
                gl_FragColor = vec4(0,0,0,0);
            } else if (uRepeatMode == {repeat-x} && (
                vTexCoord.y < 0.0 || vTexCoord.y > 1.0))
            {
                gl_FragColor = vec4(0,0,0,0);
            } else if (uRepeatMode == {repeat-y} && (
                vTexCoord.x < 0.0 || vTexCoord.x > 1.0))
            {
                gl_FragColor = vec4(0,0,0,0);
            } else {
                vec2 wrappedCoord = mod(vTexCoord, 1.0);
                gl_FragColor = texture2D(uTexture, wrappedCoord).rgba;
                gl_FragColor *= vec4(1, 1, 1, uGlobalAlpha);
            }
        }
    `,
    patternShaderRepeatValues,
  ),
};

function cssToGlColor(cssStr) {
  parsedColor = parseColor(cssStr);
  if (!parsedColor) {
    throw new SyntaxError('Bad color value');
  }
  if (!('a' in parsedColor)) {
    parsedColor['a'] = 1.0;
  }
  return [
    parsedColor['r'] / 255,
    parsedColor['g'] / 255,
    parsedColor['b'] / 255,
    parsedColor['a'],
  ];
}

function circleMod(rad) {
  if (rad < 0.0) {
    // TODO: what if it's, like, *very* negative?
    rad += 2 * Math.PI;
  }
  rad %= 2 * Math.PI;
  return rad;
}

export default class Expo2DContext {
  /**************************************************
   * Utility methods
   **************************************************/

  initShaderProgram(vertShaderTxt, fragShaderTxt) {
    let gl = this.gl;

    var vertShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertShader, vertShaderTxt);
    gl.compileShader(vertShader);

    if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
      alert('Error compiling vertShader: ' + gl.getShaderInfoLog(vertShader));
      return null;
    }

    var fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragShader, fragShaderTxt);
    gl.compileShader(fragShader);

    if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
      alert('Error compiling fragShader: ' + gl.getShaderInfoLog(fragShader));
      return null;
    }

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertShader);
    gl.attachShader(shaderProgram, fragShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      alert(
        'Error linking shader program: ' + gl.getProgramInfoLog(shaderProgram),
      );
      return null;
    }

    gl.useProgram(shaderProgram);

    shaderProgram.attributes = {};
    nAttributes = gl.getProgramParameter(shaderProgram, gl.ACTIVE_ATTRIBUTES);
    names = [];
    for (i = 0; i < nAttributes; i++) {
      attr = gl.getActiveAttrib(shaderProgram, i);
      names.push(attr.name);
      shaderProgram.attributes[attr.name] = gl.getAttribLocation(
        shaderProgram,
        attr.name,
      );
      gl.enableVertexAttribArray(shaderProgram.attributes[attr.name]);
    }

    shaderProgram.uniforms = {};
    nUniforms = gl.getProgramParameter(shaderProgram, gl.ACTIVE_UNIFORMS);
    names = [];
    for (i = 0; i < nUniforms; i++) {
      uniform = gl.getActiveUniform(shaderProgram, i);
      names.push(uniform.name);
      shaderProgram.uniforms[uniform.name] = gl.getUniformLocation(
        shaderProgram,
        uniform.name,
      );
    }

    return shaderProgram;
  }

  initDrawingState() {
    this.drawingState = {
      mvMatrix: glm.mat4.create(),

      fillStyle: '#000000',
      strokeStyle: '#000000',

      lineThickness: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
      miterLimit: 10,

      strokeDashes: [],
      strokeDashOffset: 0,

      globalAlpha: 1.0,
    };
    this.drawingStateStack = [];

    this.pMatrix = glm.mat4.create();
    this.activeStyle = null;

    this.strokeExtruder = extrudePolyline();
    this._updateStrokeExtruderState();

    this.beginPath();
  }

  _updateStrokeExtruderState() {
    // TODO: joins currently aren't placed at the beginning/end of
    // closed paths
    Object.assign(this.strokeExtruder, {
      thickness: this.drawingState.lineThickness,
      cap: this.drawingState.lineCap,
      join: this.drawingState.lineJoin,
      miterLimit: this.drawingState.miterLimit,
      closed: true,
    });
  }

  _updateMatrixUniforms() {
    let gl = this.gl;

    let invMvMatrix = glm.mat4.create();
    glm.mat4.invert(invMvMatrix, this.drawingState.mvMatrix);

    gl.uniformMatrix4fv(
      this.activeShaderProgram.uniforms['uPMatrix'],
      false,
      this.pMatrix,
    );
    gl.uniformMatrix4fv(
      this.activeShaderProgram.uniforms['uMVMatrix'],
      false,
      this.drawingState.mvMatrix,
    );
    if ('uiMVMatrix' in this.activeShaderProgram.uniforms) {
      gl.uniformMatrix4fv(
        this.activeShaderProgram.uniforms['uiMVMatrix'],
        false,
        invMvMatrix,
      );
    }
    gl.uniform1i(this.activeShaderProgram.uniforms['uSkipMVTransform'], false);
  }

  measureText(text) {
    return { width: 100, height: 60 };
  }

  fillText(text, x, y, maxWidth) {
    return {};
  }

  /**************************************************
   * Pixel data methods
   **************************************************/

  createImageData() {
    if (arguments.length == 1) {
      let oldData = arguments[0];
      return {
        width: oldData.width,
        height: oldData.height,
        data: new Uint8Array(oldData.data),
      };
    } else if (arguments.length == 2) {
      let sw = arguments[0];
      let sh = arguments[1];
      return {
        width: sw,
        height: sh,
        data: new Uint8Array(sw * sh),
      };
    } else {
      throw SyntaxError('Bad function signature');
    }
  }

  getImageData(sx, sy, sw, sh) {
    var imageDataObj = {
      width: sw,
      height: sh,
      data: new Uint8Array(),
    };
    this.gl.readPixels(
      sx,
      sy,
      sw,
      sh,
      this.gl.RGBA_INTEGER,
      this.gl.UNSIGNED_BYTE,
      imageDataObj.data,
    );
    return imageDataObj;
  }

  putImageData(imagedata, dx, dy, dirtyX, dirtyY, dirtyWidth, dirtyHeight) {
    if (!dirtyX) {
      dirtyX = 0;
    }
    if (!dirtyY) {
      dirtyY = 0;
    }
    if (!dirtyWidth) {
      dirtyWidth = imagedata.width;
    }
    if (!dirtyHeight) {
      dirtyHeight = imagedata.height;
    }
    if (dirtyWidth < 0) {
      dx += dirtyWidth;
      dirtyWidth = -dirtyWidth;
    }
    if (dirtyHeight < 0) {
      dx += dirtyHeight;
      dirtyHeight = -dirtyHeight;
    }
    if (dirtyX < 0) {
      dirtyWidth += dirtyX;
      dirtyX = 0;
    }
    if (dirtyY < 0) {
      dirtyHeight += dirtyY;
      dirtyY = 0;
    }
    if (dirtyX + dirtyWidth > imagedata.width) {
      dirtyWidth = imagedata.width - dirtyX;
    }
    if (dirtyY + dirtyHeight > imagedata.height) {
      dirtyHeight = imagedata.height - dirtyY;
    }
    if (dirtyWidth <= 0 || dirtyHeight <= 0) {
      return;
    }

    // TODO: dirty slicing the data array
    const { gl } = this;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      dirtyWidth,
      dirtyHeight,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      imagedata.data,
    );

    // TODO: figure out how to set these all correctly
    // gl.uniform2f(
    //   this.activeShaderProgram.uniforms["uTextureSize"],
    //   dirtyWidth,
    //   val.pattern.height
    // );
    // gl.uniform1i(this.activeShaderProgram.uniforms["uTexture"], texture);
    // gl.uniform1i(
    //   this.activeShaderProgram.uniforms["uRepeatMode"],
    //   patternShaderRepeatValues["src-rect"]
    // );

    // TODO: set blend mode to replace
    gl.uniform1f(this.activeShaderProgram.uniforms['uGlobalAlpha'], 1.0);

    gl.deleteTexture(texture);
  }

  /**************************************************
   * Image methods
   **************************************************/

  drawImage() {
    let gl = this.gl;

    var asset = arguments[0];

    var sx = 0;
    var sy = 0;
    var sw = 1;
    var sh = 1;
    if (arguments.length == 3) {
      var dx = arguments[1];
      var dy = arguments[2];
      var dw = asset.width;
      var dh = asset.height;
    } else if (arguments.length == 5) {
      var dx = arguments[1];
      var dy = arguments[2];
      var dw = arguments[3];
      var dh = arguments[4];
    } else if (arguments.length == 9) {
      sx = arguments[1] / asset.width;
      sy = arguments[2] / asset.height;
      sw = arguments[3] / asset.width;
      sh = arguments[4] / asset.height;
      var dx = arguments[5];
      var dy = arguments[6];
      var dw = arguments[7];
      var dh = arguments[8];
    } else {
      throw SyntaxError('Bad function signature');
    }

    if (sw == 0 || sh == 0) {
      return;
    }

    // TODO: the shader clipping method for source rectangles that are
    //  out of bounds relies on BlendFunc being set to SRC_ALPHA/SRC_ONE_MINUS_ALPHA
    //  if we can't rely on that, we'll have to clip beforehand by messing
    //  with rectangle dimensions

    dxmin = Math.min(dx, dx + dw);
    dxmax = Math.max(dx, dx + dw);
    dymin = Math.min(dy, dy + dh);
    dymax = Math.max(dy, dy + dh);

    var vertices = [
      dxmin,
      dymin,
      sx,
      sy,
      dxmin,
      dymax,
      sx,
      sy + sh,
      dxmax,
      dymin,
      sx + sw,
      sy,
      dxmax,
      dymax,
      sx + sw,
      sy + sh,
    ];

    var pattern = this.createPattern(asset, 'src-rect');
    this._applyStyle(pattern);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.vertexAttribPointer(
      this.activeShaderProgram.attributes['aVertexPosition'],
      2,
      gl.FLOAT,
      false,
      4 * 2 * 2,
      0,
    );
    gl.vertexAttribPointer(
      this.activeShaderProgram.attributes['aTexCoord'],
      2,
      gl.FLOAT,
      false,
      4 * 2 * 2,
      4 * 2,
    );

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /**************************************************
   * Rect methods
   **************************************************/

  clearRect(x, y, w, h) {
    let gl = this.gl;

    if (
      x <= 0.0 &&
      y <= 0.0 &&
      x + w >= gl.drawingBufferWidth &&
      y + h >= gl.drawingBufferHeight
    ) {
      this.gl.clear(
        this.gl.COLOR_BUFFER_BIT |
          this.gl.DEPTH_BUFFER_BIT |
          this.gl.STENCIL_BUFFER_BIT,
      );
    } else {
      var old_fill_style = this.drawingState.fillStyle;

      gl.blendFunc(gl.SRC_ALPHA, gl.ZERO);
      this.drawingState.fillStyle = 'rgba(0,0,0,0);';

      this.fillRect(x, y, w, h);

      this.drawingState.fillStyle = old_fill_style;
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }
  }

  fillRect(x, y, w, h) {
    let gl = this.gl;

    this._applyStyle(this.drawingState.fillStyle);

    var vertices = [x, y, x, y + h, x + w, y, x + w, y + h];

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.vertexAttribPointer(
      this.activeShaderProgram.attributes['aVertexPosition'],
      2,
      gl.FLOAT,
      false,
      0,
      0,
    );

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  strokeRect(x, y, w, h) {
    let gl = this.gl;

    this._applyStyle(this.drawingState.strokeStyle);

    var polyline = [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]];

    var mesh = this.strokeExtruder.build(polyline);

    var vertices = [];
    for (i = 0; i < mesh.cells.length; i++) {
      vertices.push(mesh.positions[mesh.cells[i][0]][0]);
      vertices.push(mesh.positions[mesh.cells[i][0]][1]);
      vertices.push(mesh.positions[mesh.cells[i][1]][0]);
      vertices.push(mesh.positions[mesh.cells[i][1]][1]);
      vertices.push(mesh.positions[mesh.cells[i][2]][0]);
      vertices.push(mesh.positions[mesh.cells[i][2]][1]);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.vertexAttribPointer(
      this.activeShaderProgram.attributes['aVertexPosition'],
      2,
      gl.FLOAT,
      false,
      0,
      0,
    );

    gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);
  }

  /**************************************************
   * Path methods
   **************************************************/

  beginPath() {
    this.subpaths = [[]];
    this.currentSubpath = this.subpaths[0];
  }

  closePath() {
    if (this.currentSubpath.length > 0) {
      this.currentSubpath.push(this.currentSubpath[0]);
      this.currentSubpath.push(this.currentSubpath[1]);
      this.currentSubpath = [];
      this.subpaths.push(this.currentSubpath);
    }
  }

  fill() {
    let gl = this.gl;

    this._applyStyle(this.drawingState.fillStyle);

    gl.uniform1i(this.activeShaderProgram.uniforms['uSkipMVTransform'], true);

    for (i = 0; i < this.subpaths.length; i++) {
      let subpath = this.subpaths[i];

      if (subpath.length == 0) {
        continue;
      }

      let triangles = earcut(subpath, null);
      let vertices = [];

      for (j = 0; j < triangles.length; j++) {
        vertices.push(subpath[triangles[j] * 2]);
        vertices.push(subpath[triangles[j] * 2 + 1]);
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(vertices),
        gl.STATIC_DRAW,
      );
      gl.vertexAttribPointer(
        this.activeShaderProgram.attributes['aVertexPosition'],
        2,
        gl.FLOAT,
        false,
        0,
        0,
      );
      gl.drawArrays(gl.TRIANGLES, 0, triangles.length);
    }

    gl.uniform1i(this.activeShaderProgram.uniforms['uSkipMVTransform'], false);
  }

  stroke() {
    let gl = this.gl;

    this._applyStyle(this.drawingState.strokeStyle);

    gl.uniform1i(this.activeShaderProgram.uniforms['uSkipMVTransform'], true);

    for (i = 0; i < this.subpaths.length; i++) {
      let subpath = this.subpaths[i];

      if (subpath.length == 0) {
        continue;
      }

      // TODO: we're going to have to branch the polyline extruder
      // anyway, so make it natively take our subpath format instead
      // of having to do this ):

      // TODO: fix polyline extruder so it doesn't choke when we have
      // the same vertex twice (probably just consists of moving this
      // dedup check into the extruder code)
      let polyline = [];
      let lastPt = null;
      let pt = null;
      for (j = 0; j < subpath.length; j += 2) {
        lastPt = pt;
        pt = [subpath[j], subpath[j + 1]];
        if (lastPt && lastPt[0] == pt[0] && lastPt[1] == pt[1]) continue;
        polyline.push([subpath[j], subpath[j + 1]]);
      }
      let mesh = this.strokeExtruder.build(polyline);

      let vertices = [];
      for (i = 0; i < mesh.cells.length; i++) {
        vertices.push(mesh.positions[mesh.cells[i][0]][0]);
        vertices.push(mesh.positions[mesh.cells[i][0]][1]);
        vertices.push(mesh.positions[mesh.cells[i][1]][0]);
        vertices.push(mesh.positions[mesh.cells[i][1]][1]);
        vertices.push(mesh.positions[mesh.cells[i][2]][0]);
        vertices.push(mesh.positions[mesh.cells[i][2]][1]);
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(vertices),
        gl.STATIC_DRAW,
      );
      gl.vertexAttribPointer(
        this.activeShaderProgram.attributes['aVertexPosition'],
        2,
        gl.FLOAT,
        false,
        0,
        0,
      );
      gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);
    }

    gl.uniform1i(this.activeShaderProgram.uniforms['uSkipMVTransform'], false);
  }

  moveTo(x, y) {
    this.currentSubpath = [];
    this.subpaths.push(this.currentSubpath);
    let tPt = this._getTransformedPt(x, y);
    this.currentSubpath.push(tPt[0]);
    this.currentSubpath.push(tPt[1]);
  }

  lineTo(x, y) {
    // TODO: ensure start path?
    let tPt = this._getTransformedPt(x, y);
    this.currentSubpath.push(tPt[0]);
    this.currentSubpath.push(tPt[1]);
  }

  quadraticCurveTo(cpx, cpy, x, y) {
    // TODO: ensure start path?
    var scale = 1; // TODO: ??
    var vertsLen = this.currentSubpath.length;
    var startPt = [
      this.currentSubpath[vertsLen - 2],
      this.currentSubpath[vertsLen - 1],
    ];
    var points = bezierQuadraticPoints(
      startPt,
      this._getTransformedPt(cpx, cpy),
      this._getTransformedPt(x, y),
      scale,
    );
    for (i = 0; i < points.length; i++) {
      this.currentSubpath.push(points[i][0]);
      this.currentSubpath.push(points[i][1]);
    }
  }

  bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) {
    // TODO: ensure start path?
    var scale = 1; // TODO: ??
    var vertsLen = this.currentSubpath.length;
    var startPt = [
      this.currentSubpath[vertsLen - 2],
      this.currentSubpath[vertsLen - 1],
    ];
    var points = bezierCubicPoints(
      startPt,
      this._getTransformedPt(cp1x, cp1y),
      this._getTransformedPt(cp2x, cp2y),
      this._getTransformedPt(x, y),
      scale,
    );
    for (i = 0; i < points.length; i++) {
      this.currentSubpath.push(points[i][0]);
      this.currentSubpath.push(points[i][1]);
    }
  }

  rect(x, y, w, h) {
    this.moveTo(x, y);
    this.lineTo(x + w, y);
    this.lineTo(x + w, y + h);
    this.lineTo(x, y + h);
    this.closePath();
  }

  arc(x, y, radius, startAngle, endAngle, counterclockwise) {
    // TODO: bounds check for radius?
    counterclockwise = counterclockwise || 0;
    centerPt = [x, y];

    // TODO: increment shouldn't be constant when arc has been scaled
    // to be non-circular
    let increment = Math.PI / 2;
    while (true) {
      let pt1 = this._getTransformedPt(radius, 0);
      let pt2 = this._getTransformedPt(
        radius * Math.cos(increment),
        radius * Math.sin(increment),
      );

      let accurate_midpt = this._getTransformedPt(
        radius * Math.cos(increment / 2),
        radius * Math.sin(increment / 2),
      );
      let actual_midpt = [
        pt1[0] + (pt2[0] - pt1[0]) / 2,
        pt1[1] + (pt2[1] - pt1[1]) / 2,
      ];
      let error = Math.sqrt(
        Math.pow(actual_midpt[0] - accurate_midpt[0], 2) +
          Math.pow(actual_midpt[1] - accurate_midpt[1], 2),
      );
      if (error > 0.5) {
        increment /= 2;
      } else {
        break;
      }
    }

    startAngle = circleMod(startAngle);
    endAngle = circleMod(endAngle);

    if (counterclockwise) {
      temp = startAngle;
      startAngle = endAngle;
      endAngle = temp;
    }

    let theta = startAngle;
    while (true) {
      let arcPt = this._getTransformedPt(
        centerPt[0] + radius * Math.cos(theta),
        centerPt[1] + radius * Math.sin(theta),
      );
      this.currentSubpath.push(arcPt[0]);
      this.currentSubpath.push(arcPt[1]);

      old_theta = theta;
      theta += increment;
      theta = circleMod(theta);
      if (theta < old_theta) {
        old_theta -= 2 * Math.PI;
      }
      if (old_theta < endAngle && theta >= endAngle) {
        break;
      }
    }

    let arcPt = this._getTransformedPt(
      centerPt[0] + radius * Math.cos(endAngle),
      centerPt[1] + radius * Math.sin(endAngle),
    );
    this.currentSubpath.push(arcPt[0]);
    this.currentSubpath.push(arcPt[1]);
  }

  arcTo(x1, y1, x2, y2, radius) {
    // TODO
    throw SyntaxError('Method not supported');
  }

  /**************************************************
   * Transformation methods
   **************************************************/

  save() {
    this.drawingStateStack.push(this.drawingState);
    this.drawingState = Object.assign({}, this.drawingState);
    this.drawingState.strokeDashes = this.drawingState.strokeDashes.slice();
    this.drawingState.mvMatrix = glm.mat4.clone(this.drawingState.mvMatrix);
    this.drawingState.fillStyle = this._cloneStyle(this.drawingState.fillStyle);
    this.drawingState.strokeStyle = this._cloneStyle(
      this.drawingState.strokeStyle,
    );
  }

  restore() {
    this.drawingState = this.drawingStateStack.pop();
    this._updateMatrixUniforms(); // TODO: batch this somehow
    this._updateStrokeExtruderState();
  }

  scale(x, y) {
    glm.mat4.scale(this.drawingState.mvMatrix, this.drawingState.mvMatrix, [
      x,
      y,
      1.0,
    ]);
    this._updateMatrixUniforms(); // TODO: batch this somehow
  }

  rotate(angle) {
    glm.mat4.rotateZ(
      this.drawingState.mvMatrix,
      this.drawingState.mvMatrix,
      angle,
    );
    this._updateMatrixUniforms(); // TODO: batch this somehow
  }

  translate(x, y) {
    glm.mat4.translate(this.drawingState.mvMatrix, this.drawingState.mvMatrix, [
      x,
      y,
      0.0,
    ]);
    this._updateMatrixUniforms(); // TODO: batch this somehow
  }

  transform(a, b, c, d, e, f) {
    // TODO: is this the right mult order?
    glm.mat4.multiply(
      this.drawingState.mvMatrix,
      glm.mat4.fromValues(a, b, 0, c, d, 0, e, f, 1),
    );
    this._updateMatrixUniforms(); // TODO: batch this somehow
  }

  setTransform(a, b, c, d, e, f) {
    glm.mat4.identity(this.drawingState.mvMatrix);
    this.transform(a, b, c, d, e, f);
  }

  _getTransformedPt(x, y) {
    // TODO: creating a new vec3 every time seems potentially inefficient
    var tPt = glm.vec3.create();
    glm.vec3.set(tPt, x, y, 0.0);
    glm.vec3.transformMat4(tPt, tPt, this.drawingState.mvMatrix);
    return [tPt[0], tPt[1]];
  }

  /**************************************************
   * Style methods
   **************************************************/

  set globalAlpha(val) {
    this.drawingState.globalAlpha = val;
    this.gl.uniform1f(
      this.activeShaderProgram.uniforms['uGlobalAlpha'],
      this.drawingState.globalAlpha,
    );
  }
  get globalAlpha() {
    return this.drawingState.globalAlpha;
  }

  // TODO: this compositing code is eons away from primetime,
  // so it seems like a good idea to just have references to the
  // property fail
  set globalCompositeOperation(val) {
    // throw SyntaxError("Property not supported");
  }
  get globalCompositeOperation() {
    // throw SyntaxError("Property not supported");
  }
  // set globalCompositeOperation(val) {
  //   let gl = this.gl;
  //   if (val == 'source-atop') {
  //     //gl.blendFunc(,);
  //   } else if (val == 'source-in') {
  //     //gl.blendFunc(,);
  //   } else if (val == 'source-out') {
  //     //gl.blendFunc(,);
  //   } else if (val == 'source-over') {
  //     gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  //   } else if (val == 'destination-atop') {
  //     //gl.blendFunc(,);
  //   } else if (val == 'destination-in') {
  //     //gl.blendFunc(,);
  //   } else if (val == 'destination-out') {
  //     //gl.blendFunc(,);
  //   } else if (val == 'destination-over') {
  //     gl.blendFunc(gl.ONE_MINUS_DST_ALPHA, gl.DST_ALPHA);
  //   } else if (val == 'lighter') {
  //     gl.blendFunc(gl.SRC_ALPHA, gl.DST_ALPHA);
  //   } else if (val == 'copy') {
  //     // TODO: it seems like the *whole* buffer is
  //     // supposed to be cleared beforehand with this?
  //     // weeeeeirrrddd
  //     gl.blendFunc(gl.ONE, gl.ZERO);
  //   } else if (val == 'xor') {
  //     //gl.blendFunc(,);
  //   } else {
  //     throw SyntaxError('Bad compositing mode');
  //   }
  // }

  set lineWidth(val) {
    this.strokeExtruder.thickness = val;
    this.drawingState.lineWidth = val;
  }
  get lineWidth() {
    return this.strokeExtruder.thickness;
  }

  set lineCap(val) {
    this.strokeExtruder.cap = val;
    this.drawingState.lineCap = val;
  }
  get lineCap() {
    return this.strokeExtruder.cap;
  }

  set lineJoin(val) {
    this.strokeExtruder.join = val;
    this.drawingState.lineJoin = val;
  }
  get lineJoin() {
    return this.strokeExtruder.join;
  }

  set miterLimit(val) {
    this.strokeExtruder.miterLimit = val;
    this.drawingState.miterLimit = val;
  }
  get miterLimit() {
    return this.strokeExtruder.miterLimit;
  }

  setLineDash(segments) {
    // TODO: sanitization
    this.drawingState.strokeDashes = segments.slice();
  }
  getLineDash() {
    return this.drawingState.strokeDashes.slice();
  }

  set lineDashOffset(val) {
    this.drawingState.strokeDashOffset = val;
  }
  get lineDashOffset() {
    return this.drawingState.strokeDashOffset;
  }

  set strokeStyle(val) {
    this.drawingState.strokeStyle = this._cloneStyle(val);
  }
  get strokeStyle() {
    return this._cloneStyle(this.drawingState.strokeStyle);
  }

  set fillStyle(val) {
    this.drawingState.fillStyle = this._cloneStyle(val);
  }
  get fillStyle() {
    return this._cloneStyle(this.drawingState.fillStyle);
  }

  _cloneStyle(val) {
    if (typeof val === 'string') {
      return val;
    } else if (val && typeof val === 'object' && 'gradient' in val) {
      return this._cloneGradient(val);
    } else if (val && typeof val === 'object' && 'pattern' in val) {
      return Object.assign({}, val);
    } else {
      throw SyntaxError('Bad color value');
    }
  }

  _applyStyle(val) {
    let gl = this.gl;

    if (this.activeStyle === val) return;

    // TODO: should style errors be ignored? raised immediately?

    if (typeof val === 'string') {
      this._setShaderProgram(this.flatShaderProgram);
      gl.uniform4fv(
        this.activeShaderProgram.uniforms['uColor'],
        cssToGlColor(val),
      );
      gl.uniform1f(
        this.activeShaderProgram.uniforms['uGlobalAlpha'],
        this.drawingState.globalAlpha,
      );
    } else if (val && typeof val === 'object' && 'gradient' in val) {
      if (val.stops.length > this.maxGradStops) {
        throw RangeError('Too many gradient stops');
      }

      if (val.gradient === 'linear') {
        this._setShaderProgram(this.linearGradShaderProgram);
      } else if (val.gradient === 'radial') {
        this._setShaderProgram(this.radialGradShaderProgram);

        gl.uniform1f(this.activeShaderProgram.uniforms['r0'], val.r0);
        gl.uniform1f(this.activeShaderProgram.uniforms['r1'], val.r1);
      } else {
        throw SyntaxError('Bad color value');
      }

      gl.uniform2fv(this.activeShaderProgram.uniforms['p0'], val.p0);
      gl.uniform2fv(this.activeShaderProgram.uniforms['p1'], val.p1);
      let color_arr = [];
      let offset_arr = [];
      let sortedStops = val.stops.slice();
      sortedStops.sort(function(a, b) {
        return a[1] - b[1];
      });
      for (i = 0; i < sortedStops.length; i++) {
        color_arr = color_arr.concat(sortedStops[i][0]);
        offset_arr.push(sortedStops[i][1]);
      }
      offset_arr.push(-1.0);

      // TODO: can we rely on uniform arrays always ending up with [0] in their retrieved names across all platforms?
      gl.uniform4fv(
        this.activeShaderProgram.uniforms['colors[0]'],
        new Float32Array(color_arr),
      );
      gl.uniform1fv(
        this.activeShaderProgram.uniforms['offsets[0]'],
        new Float32Array(offset_arr),
      );

      gl.uniform1f(
        this.activeShaderProgram.uniforms['uGlobalAlpha'],
        this.drawingState.globalAlpha,
      );
    } else if (val && typeof val === 'object' && 'pattern' in val) {
      this._setShaderProgram(this.patternShaderProgram);

      // TODO: cache asset textures
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        val.pattern.width,
        val.pattern.height,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        val.pattern,
      );
      gl.uniform2f(
        this.activeShaderProgram.uniforms['uTextureSize'],
        val.pattern.width,
        val.pattern.height,
      );
      gl.uniform1i(this.activeShaderProgram.uniforms['uTexture'], texture);
      gl.uniform1i(
        this.activeShaderProgram.uniforms['uRepeatMode'],
        patternShaderRepeatValues[val.repeat],
      );

      gl.uniform1f(
        this.activeShaderProgram.uniforms['uGlobalAlpha'],
        this.drawingState.globalAlpha,
      );
    } else {
      throw SyntaxError('Bad color value');
    }
  }

  createLinearGradient(x0, y0, x1, y1) {
    var gradObj = this._createGradient('linear');
    gradObj.p0 = [x0, y0];
    gradObj.p1 = [x1, y1];
    return gradObj;
  }

  createRadialGradient(x0, y0, r0, x1, y1, r1) {
    if (r0 < 0 || r1 < 0) {
      throw new IndexSizeError('Bad radius');
    }
    var gradObj = this._createGradient('radial');
    gradObj.p0 = [x0, y0];
    gradObj.r0 = r0;
    gradObj.p1 = [x1, y1];
    gradObj.r1 = r1;
    return gradObj;
  }

  _createGradient(type) {
    var gradObj = {
      gradient: type,
      stops: [],
      addColorStop: function(offset, color) {
        parsedColor = parseColor(color);
        if (!parsedColor) {
          throw new SyntaxError('Bad color value');
        }
        if (offset < 0 || offset > 1) {
          throw new IndexSizeError('Bad offset');
        }
        this.stops.push([cssToGlColor(color), offset]);
      },
    };
    return gradObj;
  }

  _cloneGradient(val) {
    let newGrad = this._createGradient('');
    // Deep copy all the gradient properties, including various
    // type-specific coordinates and the stop list, without
    // overwriting the instance-specific object methods created
    // by _createGradient
    Object.assign(newGrad, JSON.parse(JSON.stringify(val)));
    return newGrad;
  }

  createPattern(asset, repeat) {
    // TODO: make sure this doesn't pick up asset changes later on
    if (!repeat || repeat === '') {
      repeat = 'repeat';
    } else if (!(repeat in patternShaderRepeatValues)) {
      throw new SyntaxError('Bad repeat value');
    }
    var patternObj = {
      pattern: asset,
      repeat: repeat,
    };
    return patternObj;
  }

  _setShaderProgram(shaderProgram) {
    let gl = this.gl;
    if (this.activeShaderProgram != shaderProgram) {
      gl.useProgram(shaderProgram);
      this.activeShaderProgram = shaderProgram;
      this._updateMatrixUniforms();
    }
  }

  /**************************************************
   * Main
   **************************************************/

  constructor(gl) {
    // Paramters
    // TODO: how do we make these parameters more parameterizable?
    this.maxGradStops = 10;

    // Initialization

    this.gl = gl;
    this.activeShaderProgram = null;
    this.flatShaderProgram = this.initShaderProgram(
      flatShaderTxt['vert'],
      flatShaderTxt['frag'],
    );

    this.linearGradShaderProgram = this.initShaderProgram(
      linearGradShaderTxt['vert'],
      stringFormat(linearGradShaderTxt['frag'], {
        maxGradStops: this.maxGradStops,
      }),
    );

    this.radialGradShaderProgram = this.initShaderProgram(
      radialGradShaderTxt['vert'],
      stringFormat(radialGradShaderTxt['frag'], {
        maxGradStops: this.maxGradStops,
      }),
    );

    this.patternShaderProgram = this.initShaderProgram(
      patternShaderTxt['vert'],
      patternShaderTxt['frag'],
    );

    this.initDrawingState();
    this._setShaderProgram(this.flatShaderProgram);

    this.vertexBuffer = gl.createBuffer();

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.clearColor(0, 0, 0, 0.0);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    glm.mat4.ortho(
      this.pMatrix,
      0,
      gl.drawingBufferWidth,
      gl.drawingBufferHeight,
      0,
      -1,
      1,
    );
    glm.mat4.identity(this.drawingState.mvMatrix);
    this._updateMatrixUniforms();

    this.gl.clear(
      this.gl.COLOR_BUFFER_BIT |
        this.gl.DEPTH_BUFFER_BIT |
        this.gl.STENCIL_BUFFER_BIT,
    );
  }

  flush() {
    this.gl.endFrameEXP();
  }
}
